// icerik-suzgeci.sh birim testleri (E2 Hat-1).
// KURAL: hiçbir test LITERAL gerçekçi değer taşımaz — TCKN/IBAN/kart değerleri çalışma anında
// checksum kuralından ÜRETİLİR (tasarı §2: betikte ve testte örnek değer bulunmaz; kapı redi
// alan ajan koruma dosyalarını okuyor — E1 ölçümü — literal değer desen-gözlerini kirletir).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const SUZGEC_KAYNAK = join(BURASI, '..', 'icerik-suzgeci.sh');
const ISARET_KAYNAK = join(BURASI, '..', 'gercek-veri-isaretleri.txt');

// ---- üreticiler (checksum kuralının kendisi — değer değil) ----
function tcknUret(on9) {
  const d = on9.split('').map(Number);
  const t10 = ((((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10) + 10) % 10;
  const t11 = (d.reduce((a, b) => a + b, 0) + t10) % 10;
  return on9 + String(t10) + String(t11);
}
function luhnTamamla(hane) {
  const d = hane.split('').map(Number);
  let top = 0;
  const r = [...d].reverse();
  for (let i = 0; i < r.length; i++) { let x = r[i]; if (i % 2 === 0) { x *= 2; if (x > 9) x -= 9; } top += x; }
  return hane + String((10 - (top % 10)) % 10);
}
function ibanUret(bban22) {
  const cev = bban22 + '2927' + '00';
  let m = 0n;
  for (const ch of cev) m = (m * 10n + BigInt(ch)) % 97n;
  return 'TR' + String(98n - m).padStart(2, '0') + bban22;
}
const TCKN = tcknUret('372615948');
const KART16 = luhnTamamla('421111111111111');
const KART15 = luhnTamamla('37828224631000');
const IBAN = ibanUret('3312300000000000000000');

function kurulum({ isaret = null } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'suzgec-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  copyFileSync(SUZGEC_KAYNAK, join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'));
  copyFileSync(join(BURASI, '..', 'yazim-kalibi.txt'), join(kok, 'tools', 'guard', 'yazim-kalibi.txt'));
  if (isaret === null) copyFileSync(ISARET_KAYNAK, join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  else writeFileSync(join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'), isaret);
  return kok;
}
function kos(kok, args, girdi = '') {
  return spawnSync('bash', [join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'), ...args], {
    input: girdi, encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
}
// Değer sızdırmama: eşleşme çıktısının hiçbir kanalında üretilen değer geçmez.
function sizdirmaz(r, deger) {
  assert.ok(!r.stdout.includes(deger), 'stdout değeri sızdırdı');
  assert.ok(!r.stderr.includes(deger), 'stderr değeri sızdırdı');
}

test('süzgeç: üretilmiş TCKN metinde yakalanır; değer çıktıya sızmaz', () => {
  const kok = kurulum();
  const r = kos(kok, ['--metin'], `kayıt no ${TCKN} dosyada`);
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stdout, /^ESLESME\ttckn\tmetin$/m);
  sizdirmaz(r, TCKN);
});

test('süzgeç: kontrol-hanesi tutmayan 11 hane SERBEST (yanlış-pozitif budaması)', () => {
  const kok = kurulum();
  const bozuk = TCKN.slice(0, 10) + String((Number(TCKN[10]) + 1) % 10);
  assert.equal(kos(kok, ['--metin'], `sipariş ${bozuk} tamam`).status, 0);
});

test('süzgeç: TR IBAN bitişik ve boşluklu yakalanır; mod-97 bozuk serbest', () => {
  const kok = kurulum();
  assert.equal(kos(kok, ['--metin'], `hesap ${IBAN} aktarım`).status, 3);
  const bosluklu = IBAN.replace(/(.{4})/g, '$1 ').trim();
  const r = kos(kok, ['--metin'], `hesap ${bosluklu} aktarım`);
  assert.equal(r.status, 3);
  sizdirmaz(r, IBAN);
  const bozuk = 'TR' + String((Number(IBAN.slice(2, 4)) + 1) % 100).padStart(2, '0') + IBAN.slice(4);
  assert.equal(kos(kok, ['--metin'], `hesap ${bozuk} aktarım`).status, 0);
});

test('süzgeç: kart 16 hane bitişik + 4-4-4-4 gruplu yakalanır; Luhn bozuk serbest', () => {
  const kok = kurulum();
  assert.equal(kos(kok, ['--metin'], `kart ${KART16} işlem`).status, 3);
  const gruplu = KART16.replace(/(.{4})/g, '$1 ').trim();
  assert.equal(kos(kok, ['--metin'], `kart ${gruplu} işlem`).status, 3);
  const bozuk = KART16.slice(0, 15) + String((Number(KART16[15]) + 5) % 10);
  assert.equal(kos(kok, ['--metin'], `kart ${bozuk} işlem`).status, 0);
});

test('süzgeç: 15 haneli (4-6-5 gruplu) kart yakalanır', () => {
  const kok = kurulum();
  const gruplu = KART15.slice(0, 4) + ' ' + KART15.slice(4, 10) + ' ' + KART15.slice(10);
  assert.equal(kos(kok, ['--metin'], `kart ${gruplu} islem`).status, 3);
});

test('süzgeç: sayı tablosu yanlış-pozitif üretmez (dar aday kuralı)', () => {
  const kok = kurulum();
  const tablo = 'tutarlar: 12 34 56 78 90 12 34 56 78 90 12 34 56 78 90\nsatır: 4123 12 99';
  assert.equal(kos(kok, ['--metin'], tablo).status, 0);
});

test('süzgeç: işaret listesi birebir bayt eşleşir; kısa satır ve yorum yok sayılır', () => {
  const kok = kurulum({ isaret: '# yorum satırı\nab\nProje-Gizli-Kayit\n' });
  const r = kos(kok, ['--metin'], 'dosyada Proje-Gizli-Kayit geçiyor');
  assert.equal(r.status, 3);
  assert.match(r.stdout, /^ESLESME\tisaret\tmetin$/m);
  assert.equal(kos(kok, ['--metin'], 'kısa ab geçiyor ama sayılmaz').status, 0);
  assert.equal(kos(kok, ['--metin'], 'yorum satırı metinde geçse de kural değildir').status, 0);
});

test('süzgeç --arac-json: Edit yeni içeriği taranır, ESKİ içerik taranmaz (silme engellenmez)', () => {
  const kok = kurulum();
  const kirli = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '/tmp/a', old_string: 'x', new_string: `no ${TCKN}` } });
  assert.equal(kos(kok, ['--arac-json'], kirli).status, 3);
  const temizleyen = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: '/tmp/a', old_string: `no ${TCKN}`, new_string: 'temizlendi' } });
  assert.equal(kos(kok, ['--arac-json'], temizleyen).status, 0);
});

test('süzgeç --arac-json: MultiEdit ve NotebookEdit alanları taranır', () => {
  const kok = kurulum();
  const me = JSON.stringify({ tool_name: 'MultiEdit', tool_input: { file_path: '/tmp/a', edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: `iban ${IBAN}` }] } });
  const r = kos(kok, ['--arac-json'], me);
  assert.equal(r.status, 3);
  assert.match(r.stdout, /MultiEdit\.edits\[1\]/);
  const ne = JSON.stringify({ tool_name: 'NotebookEdit', tool_input: { notebook_path: '/tmp/n', new_source: `kart ${KART16}` } });
  assert.equal(kos(kok, ['--arac-json'], ne).status, 3);
});

test('süzgeç --arac-json: Bash yalnız yazım-kalıplıysa taranır', () => {
  const kok = kurulum();
  const yazimsiz = JSON.stringify({ tool_name: 'Bash', tool_input: { command: `grep ${TCKN} dosya.txt` } });
  assert.equal(kos(kok, ['--arac-json'], yazimsiz).status, 0, 'yazımsız komut taranmaz (meşru arama/temizlik)');
  const fd = JSON.stringify({ tool_name: 'Bash', tool_input: { command: `grep ${TCKN} dosya.txt 2>&1` } });
  assert.equal(kos(kok, ['--arac-json'], fd).status, 0, 'fd-yönlendirme yazım sayılmaz');
  const yonlendirme = JSON.stringify({ tool_name: 'Bash', tool_input: { command: `echo ${TCKN} > not.txt` } });
  assert.equal(kos(kok, ['--arac-json'], yonlendirme).status, 3);
  const heredoc = JSON.stringify({ tool_name: 'Bash', tool_input: { command: `cat <<EOF\n${TCKN}\nEOF` } });
  assert.equal(kos(kok, ['--arac-json'], heredoc).status, 3);
  const kopya = JSON.stringify({ tool_name: 'Bash', tool_input: { command: `cp ${TCKN}.pdf hedef/` } });
  assert.equal(kos(kok, ['--arac-json'], kopya).status, 3, 'komut-konumu cp yazım-kalıplıdır');
});

test('süzgeç --dosya: dosya içeriği taranır; satır konumu değil sınıf raporlanır', () => {
  const kok = kurulum();
  const yol = join(kok, 'veri.md');
  writeFileSync(yol, `başlık\nhesap ${IBAN}\n`);
  const r = kos(kok, ['--dosya', yol]);
  assert.equal(r.status, 3);
  assert.match(r.stdout, /^ESLESME\tiban\tdosya$/m);
  sizdirmaz(r, IBAN);
});

test('süzgeç: hata sözleşmesi — bozuk JSON ve eksik dosya 1 döner (çağıran fail-closed)', () => {
  const kok = kurulum();
  assert.equal(kos(kok, ['--arac-json'], 'bu json değil {').status, 1);
  assert.equal(kos(kok, ['--dosya', join(kok, 'yok.md')]).status, 1);
  assert.equal(kos(kok, ['--bilinmeyen-kip']).status, 1);
});

test('süzgeç: temiz metin 0 döner, çıktı boş', () => {
  const kok = kurulum();
  const r = kos(kok, ['--metin'], 'sıradan bir not; hiçbir hassas cins yok');
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// ── U37 · ANAHTAR ve JETON SINIFLARI ──────────────────────────────────────────────────────
// Kusur: engel metni kapsamını "gerçek kişisel veri/sır" diye GENELLİYORDU ama fiilî kapsam
// TCKN + IBAN + kart + işaret listesiydi. API anahtarı ve jeton uçtan uca TEMİZ geçiyordu —
// ölçüldü. Kapının okunan ilanı ile yaptığı iş arasındaki fark, kapının kendisinden daha
// tehlikelidir: ajan "bu kapı sırları tutuyor" varsayımıyla çalışır. Kök 4 hükmü: ilan,
// kapsamı ADIYLA söyler.
// DEĞER ÜRETİLİR, YAZILMAZ: aşağıdaki dizeler desen KURALINDAN kurulur; hiçbiri gerçek
// bir anahtar değildir ve dosyada duran bir literal de değildir.
const SK = 'sk-' + 'A'.repeat(24);
const GHP = 'ghp_' + 'b'.repeat(36);
const AKIA = 'AKIA' + 'C'.repeat(16);
const AIZA = 'AIza' + 'd'.repeat(35);
const XOX = 'xoxb-' + '1'.repeat(12);
const JWT = 'eyJ' + 'a'.repeat(12) + '.eyJ' + 'b'.repeat(12) + '.' + 'c'.repeat(12);
const PEM = '-----BEGIN RSA PRIVATE KEY-----';

test('U37: API anahtarı · JWT jetonu · PEM özel anahtar YAKALANIR (eskiden temiz geçiyordu)', () => {
  const kok = kurulum();
  for (const [deger, sinif] of [[SK, 'api-anahtari'], [GHP, 'api-anahtari'], [AKIA, 'api-anahtari'],
                                [AIZA, 'api-anahtari'], [XOX, 'api-anahtari'],
                                [JWT, 'jeton'], [PEM, 'ozel-anahtar']]) {
    const r = kos(kok, ['--metin'], `ayar dosyası: ${deger} son`);
    assert.equal(r.status, 3, deger.slice(0, 6) + '… yakalanmadı: ' + r.stdout);
    assert.match(r.stdout, new RegExp('^ESLESME\\t' + sinif + '\\tmetin$', 'm'));
    sizdirmaz(r, deger);          // DEĞER SIZDIRMAMA kuralı yeni sınıflarda da geçerli
  }
});

test('U37: yeni sınıflar araç JSON kipinde de koşar (yalnız --metin değil)', () => {
  const kok = kurulum();
  const r = kos(kok, ['--arac-json'], JSON.stringify({
    tool_name: 'Write', tool_input: { file_path: '/x/y.env', content: 'API=' + SK + '\n' } }));
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /^ESLESME\tapi-anahtari\tWrite\.content$/m);
});

test('U37 TERS YÖN: sağlayıcı öneki taşımayan uzun dize SERBEST (yanlış-pozitif kapısı)', () => {
  // Bu süzgeç HER araç çağrısında koşar; genel "yüksek entropili dize" avı meşru işi
  // durdururdu. Sınır BİLEREK dardır ve dosyanın başında İLAN EDİLİR — bu test o ilanın
  // doğru olduğunu ölçer, yoksa ilan yine gerçekten geniş olurdu.
  const kok = kurulum();
  for (const temiz of ['x'.repeat(40), 'sk' + 'A'.repeat(24), 'ghp_' + 'b'.repeat(10),
                       'AKIA' + 'c'.repeat(16), 'eyJ' + 'a'.repeat(30)]) {
    const r = kos(kok, ['--metin'], 'sıradan metin ' + temiz + ' devam');
    assert.equal(r.status, 0, temiz.slice(0, 8) + '… yanlış-pozitif üretti: ' + r.stdout);
  }
});

// ── U59 · U65 · yazım-kalıbı tanımının TEK EVİ (K25) ────────────────────────────────────
// Tanım eskiden İKİ dosyada elle yazılıydı ve iki dosya da "tanım aynıdır" diye ilan ediyordu;
// ölçüldü, ayrışmışlardı. Aşağıdaki üç test tanımın kendisini değil, TEK EV İDDİASINI ölçer.

function bashJson(komut) {
  return JSON.stringify({ tool_name: 'Bash', tool_input: { command: komut } });
}

test('U59: alt-kabuk · fonksiyon gövdesi · then-dalı da yazım-kalıplıdır (komut konumu gizlenemez)', () => {
  const kok = kurulum();
  // Üçü de komut KONUMUNDA `cp` taşıyor; eskiden üçü de süzgeçten SESSİZCE kaçıyordu.
  for (const k of [
    `(cp ${TCKN}.pdf hedef/)`,
    `f() { cp ${TCKN}.pdf hedef/; }; f`,
    `if true; then cp ${TCKN}.pdf hedef/; fi`,
  ]) {
    const r = kos(kok, ['--arac-json'], bashJson(k));
    assert.equal(r.status, 3, 'yazım-kalıbı kaçtı: ' + k);
    assert.match(r.stdout, /^ESLESME\ttckn\tBash\.command$/m);
    sizdirmaz(r, TCKN);
  }
  // TERS YÖN: yazımsız komut hâlâ taranmıyor — bu genişleme her komutu taramaya çevirmedi.
  assert.equal(kos(kok, ['--arac-json'], bashJson(`grep ${TCKN} dosya.txt`)).status, 0);
  assert.equal(kos(kok, ['--arac-json'], bashJson(`cat ${TCKN}.txt`)).status, 0);
});

test('U65: ters-eğik çizgili heredoc (<<\\EOF) yakalanır; öteki biçimler kaçmaz', () => {
  const kok = kurulum();
  for (const ayrac of ['<<\\EOF', '<<-\\EOF', '<<EOF', '<<"EOF"', "<< 'EOF'"]) {
    const k = `psql db ${ayrac}\n${TCKN}\nEOF`;
    assert.equal(kos(kok, ['--arac-json'], bashJson(k)).status, 3, 'heredoc kaçtı: ' + ayrac);
  }
  // TERS YÖN: karşılaştırma operatörü heredoc değildir (yanlış-pozitif açılmadı).
  assert.equal(kos(kok, ['--arac-json'], bashJson(`test ${TCKN} < b`)).status, 0);
});

// TEK EV DİKİŞİ (U40 emsali). İLK HÂLİ SAHTE-YEŞİLDİ ve kasıtlı bozma onu yakaladı: test
// yalnız `FIIL` anahtarını düşürüyordu, bu yüzden bölütleyiciyi KODA GÖMEN bir tüketici
// testten geçiyordu. Dikiş artık HER anahtar için ayrı bir hüküm dönüşü istiyor — bir anahtarı
// koda gömen tüketici, o anahtarın satırında kırmızıya döner.
const TEK_EV_VAKALARI = [
  { anahtar: 'BOLUT_AYRAC', yeni: '[;&|`\\n]|\\$\\(', komut: (t) => `(cp ${t}.pdf hedef/)` },
  { anahtar: 'ANAHTAR_SOZCUK', yeni: 'zzhicbirzaman', komut: (t) => `if true; then cp ${t}.pdf hedef/; fi` },
  { anahtar: 'SARMALAYICI', yeni: 'zzhicbirzaman', komut: (t) => `env -i cp ${t}.pdf hedef/` },
  { anahtar: 'YONLENDIRME', yeni: 'zzhicbirzaman', komut: (t) => `echo ${t} > not.txt` },
  { anahtar: 'HEREDOC', yeni: '<<-?\\s*["\']?\\w', komut: (t) => `psql db <<\\EOF\n${t}\nEOF` },
  { anahtar: 'FIIL', yeni: 'tee|mv|dd|rsync|install|truncate', komut: (t) => `cp ${t}.pdf hedef/` },
  { anahtar: 'FIIL_BAYRAKLI', yeni: 'sed:(^|\\s)--asla-boyle-bir-bayrak\\b', komut: (t) => `sed -i s/x/y/ ${t}.txt` },
];

test('U59 TEK EV: tanım dosyasındaki HER anahtar düşünce süzgecin hükmü DÖNER', () => {
  for (const vaka of TEK_EV_VAKALARI) {
    const kok = kurulum();
    const yol = join(kok, 'tools', 'guard', 'yazim-kalibi.txt');
    const k = vaka.komut(TCKN);
    assert.equal(kos(kok, ['--arac-json'], bashJson(k)).status, 3,
      'taban: ' + vaka.anahtar + ' vakası yazım-kalıplı olmalı — ' + k);
    const metin = readFileSync(yol, 'utf8').replace(new RegExp('^' + vaka.anahtar + '=.*$', 'm'), vaka.anahtar + '=' + vaka.yeni);
    writeFileSync(yol, metin);
    assert.equal(kos(kok, ['--arac-json'], bashJson(k)).status, 0,
      vaka.anahtar + ' değişti ama hüküm DÖNMEDİ — bu anahtar tek evden okunmuyor, koda gömülü');
  }
});

test('U59 TEK EV: eksik anahtar FAIL-CLOSED (ölçemedim serbest bırakma değildir)', () => {
  const kok = kurulum();
  const yol = join(kok, 'tools', 'guard', 'yazim-kalibi.txt');
  writeFileSync(yol, readFileSync(yol, 'utf8').replace(/^HEREDOC=.*$/m, ''));
  const r = kos(kok, ['--arac-json'], bashJson(`cp ${TCKN}.pdf hedef/`));
  assert.equal(r.status, 1, 'eksik anahtar 1 dönmeli (çağıran fail-closed)');
  assert.match(r.stderr, /eksik anahtar/);
});

test('U59 TEK EV: tanım dosyası YOKSA süzgeç hata döner (çağıran fail-closed davranır)', () => {
  const kok = kurulum();
  rmSync(join(kok, 'tools', 'guard', 'yazim-kalibi.txt'));
  const r = kos(kok, ['--arac-json'], bashJson(`cp ${TCKN}.pdf hedef/`));
  assert.notEqual(r.status, 0, 'tanım yokken 0 dönmemeli');
  assert.notEqual(r.status, 3, 'tanım yokken eşleşme iddiası da edilmemeli');
  assert.match(r.stderr, /yazım-kalıbı tanımı okunamadı/);
});

test('U64: Mastercard 2-serisi kart yakalanır (ilk hane sınıfı 2-6); sayı tablosu hâlâ temiz', () => {
  const kok = kurulum();
  const kart2 = luhnTamamla('222100123456789');   // 2-serisi, 16 hane
  assert.equal(kos(kok, ['--metin'], `kart ${kart2} islem`).status, 3, 'bitişik 2-serisi kaçtı');
  const gruplu = kart2.replace(/(.{4})/g, '$1 ').trim();
  assert.equal(kos(kok, ['--metin'], `kart ${gruplu} islem`).status, 3, '4-4-4-4 gruplu 2-serisi kaçtı');
  // TERS YÖN: ilan edilmiş yanlış-pozitif freni açılmadı — Luhn tutmayan 2-serisi ve sayı tablosu serbest.
  const bozuk = kart2.slice(0, 15) + String((Number(kart2[15]) + 5) % 10);
  assert.equal(kos(kok, ['--metin'], `kart ${bozuk} islem`).status, 0, 'Luhn bozuk 2-serisi serbest kalmalı');
  assert.equal(kos(kok, ['--metin'], 'tutarlar: 12 34 56 78 90 12 34 56 78 90 12 34 56 78 90').status, 0);
});
