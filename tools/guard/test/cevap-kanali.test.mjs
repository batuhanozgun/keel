// cevap-kanali.test.mjs — F1-5g: haber kanalının GELEN yönü (Faz 2 · sıra 8).
// Sözleşme: OS Architect/Araştırmalar/…/37_Otonom KEEL — cevap kanalı tasarısı (sıra 8).md
//   §3 kimlik (Message-ID/In-Reply-To) · §3.1 MIME-farkında gövde · §4 sözleşme genişlemeleri ·
//   §5 mekanik akış · §6 kırılma tablosu · §8 bitti ölçütü.
//
// AĞA ÇIKILMAZ. Gönderim `--prova` kipinde; IMAP hattının kendisi burada koşmaz (canlı prova
// Faz 3'ün işi ve tasarının ilan edilmiş sınırı). Buradaki testler o hattın AYRIŞTIRICILARINI
// ve karar mantığını ölçer — hasım turunun en pahalı iki bulgusu (curl BODY.PEEK · çok parçalı
// MIME) sahte IMAP çıktısıyla DEĞİL, gerçek bir iOS Mail yanıtının ham metniyle sınanır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const BETIKLER = ['ortak.sh', 'kilit.sh', 'zarf-ekle.sh', 'haber.sh', 'nabiz.sh', 'catal-kuyruk.sh'];

function kurulum({ cevapKanali = 'acik', jeton = '' } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'cevap-test-'));
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  for (const b of BETIKLER) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'cevap-sozlugu.txt'), join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt'));
  for (const g of ['icerik-suzgeci.sh', 'gercek-veri-isaretleri.txt']) {
    copyFileSync(join(KOK_REPO, 'tools', 'guard', g), join(kok, 'tools', 'guard', g));
  }
  writeFileSync(join(kok, 'tools', 'sevk', 'kanal.conf'),
    'SMTP_SUNUCU=smtp.ornek.gecersiz\nHESAP=deneme@ornek.gecersiz\nALICI=deneme@ornek.gecersiz\n' +
    'IMAP_SUNUCU=imap.ornek.gecersiz\nKEYCHAIN_SERVIS=keel-test-yok\n' +
    (cevapKanali ? `CEVAP_KANALI=${cevapKanali}\n` : '') + (jeton ? `CEVAP_JETON=${jeton}\n` : ''));
  return kok;
}
const kos = (kok, ad, args = [], girdi = undefined) =>
  spawnSync('bash', [join(kok, 'tools', 'sevk', ad), ...args],
    { encoding: 'utf8', input: girdi, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
const KUYRUK = (kok) => join(kok, '00_pano', 'SENDE_BEKLEYEN.md');

function kuyrukKur(kok, satirlar) {
  writeFileSync(KUYRUK(kok), '# SENDE BEKLEYEN\n\n' + satirlar.join('\n') + '\n');
}
const ACIK = (id, gorev = 'G-12') =>
  `- [ ] 2026-07-30 · po · ÇATAL ${id} · "Hangisi olsun?" · etki: sabah farkı · bekletir: ${gorev} · kaynak: zarf-günlüğü satır 4`;

// nabiz.sh'ın JS yardımcılarını KAYNAĞINDAN çıkarıp koştururuz: ikinci bir kopya yazmak
// (D-02) tam da bu paketin düzelttiği sürüklenme sınıfını yeniden doğururdu.
function jsCikar(ad) {
  const s = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'nabiz.sh'), 'utf8');
  const bas = s.indexOf(ad + "='");
  assert.ok(bas > 0, `${ad} nabiz.sh içinde bulunamadı`);
  const i = bas + ad.length + 2;
  const j = s.indexOf("\n'\n", i);
  return s.slice(i, j);
}
const jsKos = (ad, girdi, env = {}) =>
  spawnSync(process.execPath, ['--input-type=module', '-e', jsCikar(ad)],
    { encoding: 'utf8', input: girdi, env: { ...process.env, ...env } });

// ── 1 · Kimlik: Message-ID tek üreticiden çıkar (bitti ölçütü 4-5) ────────────────────────
test('kodlu çatal postası Message-ID taşır; konu kodu TAŞIMAZ', () => {
  const kok = kurulum();
  const r = kos(kok, 'haber.sh', ['--prova', '--olay', 'catal-bekliyor', '--kutu', 'KT-001',
    '--donem', 'D1', '--catal', 'Ç-03', '--ceviri', 'Hangisi olsun?', '--etki', 'x', '--bekletir', 'G-12',
    '--kod', 'R4T7QM2F', '--secenekler', '1) Yerinde kal\n2) Yenisine geç']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^Message-ID: <keel-R4T7QM2F@ornek\.gecersiz>$/m,
    'Message-ID başlığı yok — kimlik çapası kurulmuyor');
  const konu = r.stdout.split('\n').find((l) => l.startsWith('Subject:'));
  assert.ok(!konu.includes('R4T7QM2F'),
    'kod KONUDA görünüyor — kilitli telefon bildiriminde okunur ve Fwd: ile taşınır (§3)');
  assert.match(r.stdout, /1\) Yerinde kal/, 'seçenek listesi gövdede yok');
  assert.match(r.stdout, /YANITLA/, 'nasıl cevap verileceği yazmıyor');
});

test('kodsuz çatal postası "uzaktan cevaplanamaz" der (geri uyum)', () => {
  const kok = kurulum({ cevapKanali: '' });
  const r = kos(kok, 'haber.sh', ['--prova', '--olay', 'catal-bekliyor', '--kutu', 'KT-001',
    '--catal', 'Ç-03', '--ceviri', 'Hangisi?', '--etki', 'x', '--bekletir', 'G-12']);
  assert.equal(r.status, 0);
  assert.ok(!/Message-ID/.test(r.stdout), 'kodsuz postada Message-ID doğmamalı');
  assert.match(r.stdout, /uzaktan cevaplanamaz/, 'sahibe yolun kapalı olduğu söylenmiyor');
});

test('geçersiz kod biçimi reddedilir (arama anahtarı saf ASCII olmak zorunda)', () => {
  const kok = kurulum();
  for (const kod of ['abc', 'R4T7-QM', 'R4T7QM2İ', '']) {
    const r = kos(kok, 'haber.sh', ['--prova', '--olay', 'catal-bekliyor', '--kutu', 'K',
      '--catal', 'Ç-1', '--ceviri', 'x', '--etki', 'x', '--bekletir', 'G-1', '--kod', kod,
      '--secenekler', '1) a\n2) b']);
    if (kod === '') { assert.equal(r.status, 0, 'boş kod yalnız "kod yok" demektir'); continue; }
    assert.equal(r.status, 1, `geçersiz kod kabul edildi: ${kod}`);
  }
});

// ── 2 · Kapalı beyaz listeler (bitti ölçütü 11 · hasım bulgusu L9) ────────────────────────
test('cevapsiz ve cevap-okunamadi alarm cinsleri TANINIR; uydurma cins reddedilir', () => {
  const kok = kurulum();
  for (const c of ['cevapsiz', 'cevap-okunamadi']) {
    const r = kos(kok, 'haber.sh', ['--prova', '--olay', 'alarm', '--cins', c, '--kutu', 'K', '--detay', 'x']);
    assert.equal(r.status, 0, `${c} cinsi reddedildi — yükseltme hattı izsiz ölürdü`);
  }
  const r = kos(kok, 'haber.sh', ['--prova', '--olay', 'alarm', '--cins', 'uydurma', '--kutu', 'K']);
  assert.equal(r.status, 1, 'beyaz liste açıldı — kapalı liste güvencesi kayboldu');
});

test('cevap-alindi ve cevap-reddedildi günlük tipleri kabul edilir', () => {
  const kok = kurulum();
  for (const tip of ['cevap-alindi', 'cevap-reddedildi']) {
    const r = kos(kok, 'zarf-ekle.sh', [],
      JSON.stringify({ surum: 1, ts: new Date().toISOString(), donem: 'D1', tip, catal: 'Ç-03' }));
    assert.equal(r.status, 0, `${tip} tipi reddedildi — cevabın TEK denetim izi kaybolurdu`);
  }
  const r = kos(kok, 'zarf-ekle.sh', [],
    JSON.stringify({ surum: 1, ts: new Date().toISOString(), donem: 'D1', tip: 'uydurma-tip' }));
  assert.notEqual(r.status, 0, 'beyaz liste açıldı');
});

test('--sayacsiz alarm .haber-durum dosyasına DOKUNMAZ (canlı dönemin sayacı silinmez)', () => {
  const kok = kurulum();
  const durum = join(kok, 'tools', 'sevk', '.haber-durum');
  writeFileSync(durum, 'CANLI-DONEM\ndonem-basladi\n');
  const oncesi = readFileSync(durum, 'utf8');
  // Gönderim ağa çıkamayacağı için exit 1/4 olur; ölçtüğümüz şey dosyaya dokunulmaması.
  kos(kok, 'haber.sh', ['--olay', 'alarm', '--cins', 'cevapsiz', '--sayacsiz',
    '--anahtar', 'esik-XX', '--kutu', 'K', '--detay', 'x']);
  assert.equal(readFileSync(durum, 'utf8'), oncesi,
    '--sayacsiz sayaç dosyasını yeniden yazdı — dönem-dışı bir alarm canlı dönemin frenini siler');
});

// ── 3 · MIME-farkında gövde çözümleyici (bitti ölçütü 8 · hasım bulgusu L5) ───────────────
// Fixture GERÇEK bir iOS Mail yanıtının BODY[TEXT] yapısıdır: çok parçalı + quoted-printable.
// v1'in "alıntıdan önceki ilk boş olmayan satır" kuralı bu girdide sahibin DOĞRU cevabını
// reddediyordu — sınır çizgisi rakamdan önce gelir.
const IOS_YANIT = [
  '--Apple-Mail-9C1B2A3D-4E5F',
  'Content-Transfer-Encoding: quoted-printable',
  'Content-Type: text/plain;',
  '\tcharset=utf-8',
  '',
  '2',
  '',
  '> 30 Tem 2026 22:12 tarihinde KEEL <deneme@ornek.gecersiz> =C5=9Funlar=C4=B1 yazd=C4=B1:',
  '> SORU',
  '--Apple-Mail-9C1B2A3D-4E5F',
  'Content-Type: text/html; charset=utf-8',
  '',
  '<html><body>2</body></html>',
  '--Apple-Mail-9C1B2A3D-4E5F--',
].join('\r\n');

test('gerçek iOS Mail yanıtı (multipart + quoted-printable) doğru çözülür', () => {
  const r = jsKos('CEVAP_JS_SECIM', IOS_YANIT);
  assert.equal(r.stdout.trim(), 'SECIM\t2', 'sahibin doğru cevabı reddedildi (' + r.stdout.trim() + ')');
});

test('base64 gövde ve düz metin gövde de çözülür', () => {
  const b64 = ['Content-Transfer-Encoding: base64', 'Content-Type: text/plain; charset=utf-8', '',
    Buffer.from('3\n\n> alinti\n').toString('base64')].join('\r\n');
  assert.equal(jsKos('CEVAP_JS_SECIM', b64).stdout.trim(), 'SECIM\t3');
  // Düz metin: parça BAŞLIĞI YOKTUR. Koşulsuz "ilk boş satıra kadar atla" kuralı burada
  // sahibin yazdığı rakamı atlıyordu (uygulama sırasında fixture'ın yakaladığı kusur).
  assert.equal(jsKos('CEVAP_JS_SECIM', '1\n\n> alinti\n').stdout.trim(), 'SECIM\t1');
});

test('cevap OLMAYAN gövdeler reddedilir (tatil yanıtı · yalnız alıntı · iki hane · boş)', () => {
  const olumsuz = [
    ['Ofis disindayim, 5 Agustosta donecegim.\n', 'tatil yanıtı'],
    ['> 2\n', 'yalnız alıntı'],
    ['12\n', 'iki haneli'],
    ['', 'boş gövde'],
    ['iki\n', 'yazıyla'],
  ];
  for (const [govde, ad] of olumsuz) {
    const r = jsKos('CEVAP_JS_SECIM', govde);
    assert.match(r.stdout, /^YOK\t/, `${ad} CEVAP SAYILDI — kanal kendi kendine karar basıyor`);
  }
});

test('jeton açıksa rakam TEK BAŞINA yetmez (ikinci etken gövdededir)', () => {
  assert.match(jsKos('CEVAP_JS_SECIM', '2\n', { SEC_JETON: 'gizli' }).stdout, /^YOK\tjeton/);
  assert.equal(jsKos('CEVAP_JS_SECIM', '2 gizli\n', { SEC_JETON: 'gizli' }).stdout.trim(), 'SECIM\t2');
  assert.match(jsKos('CEVAP_JS_SECIM', '2 yanlis\n', { SEC_JETON: 'gizli' }).stdout, /^YOK\tjeton/);
});

// ── 4 · Gönderen kimliği: zarf adresi BİREBİR (hasım bulgusu L17) ─────────────────────────
test('görünen ada yazılmış adres From denetimini GEÇEMEZ', () => {
  const sahte = 'Date: x\nFrom: "deneme@ornek.gecersiz" <saldirgan@kotu.com>\n';
  assert.equal(jsKos('CEVAP_JS_ADRES', sahte).stdout.trim(), 'saldirgan@kotu.com',
    'görünen ad zarf adresi sanıldı — alt-dize denetimi sahteciliği geçirirdi');
  assert.equal(jsKos('CEVAP_JS_ADRES', 'From: Batu <Deneme@Ornek.Gecersiz>\n').stdout.trim(),
    'deneme@ornek.gecersiz', 'meşru gönderen tanınmıyor (büyük/küçük harf)');
});

// ── 5 · Çapa: fail-closed okuma (hasım bulgusu L11) ───────────────────────────────────────
test('bozuk çapa "açık kod yok" ile AYNI dala düşmez (fail-closed)', () => {
  const kok = kurulum();
  const capa = join(kok, 'tools', 'sevk', '.cevap-capa');
  writeFileSync(capa, '{"kod":"AAA","durum":"acik","ts":"' + new Date().toISOString() + '"}\n{ yarim satir\n');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', jsCikar('CEVAP_JS_OKU')],
    { encoding: 'utf8', env: { ...process.env, CAPA_YOL: capa } });
  assert.equal(r.status, 1, 'bozuk çapa sessizce "kod yok" sayıldı — sahibin sorusu kaybolurdu');
});

test('açık kodlar yaşıyla birlikte dökülür; tüketilmiş kod dökülmez', () => {
  const kok = kurulum();
  const capa = join(kok, 'tools', 'sevk', '.cevap-capa');
  const eski = new Date(Date.now() - 30 * 3600000).toISOString();
  writeFileSync(capa,
    JSON.stringify({ kod: 'AAAA1111', msgid: '<keel-AAAA1111@x>', catal: 'Ç-01', donem: 'D1', kutu: 'K',
      ts: eski, secenekler: ['bir', 'iki'], durum: 'acik', bicimsiz: 0, alarm: '' }) + '\n' +
    JSON.stringify({ kod: 'BBBB2222', catal: 'Ç-02', ts: eski, durum: 'tuketildi' }) + '\n');
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', jsCikar('CEVAP_JS_OKU')],
    { encoding: 'utf8', env: { ...process.env, CAPA_YOL: capa } });
  assert.equal(r.status, 0, r.stderr);
  const satirlar = r.stdout.trim().split('\n');
  assert.equal(satirlar.length, 1, 'tüketilmiş kod hâlâ aranıyor');
  const a = satirlar[0].split('\t');
  assert.equal(a[0], 'AAAA1111');
  assert.ok(Number(a[5]) >= 29, 'yaş saati yanlış hesaplandı: ' + a[5]);
  assert.equal(a[8], 'biriki', 'seçenek metinleri taşınmıyor — cevap uygulanamaz');
});

// ── 6 · Kuyruğa yazan TEK betik: --cevapla (bitti ölçütü 9-10 · hasım bulgusu L6/L7) ──────
test('geçerli cevap uygulanır ve --durum CEVAPLANDI okur', () => {
  const kok = kurulum();
  kuyrukKur(kok, [ACIK('Ç-01')]);
  const r = kos(kok, 'catal-kuyruk.sh', ['--cevapla', 'Ç-01', 'Yenisine geç', 'uzaktan-posta uid:1841']);
  assert.equal(r.stdout.trim(), 'CEVAPLANDI\tÇ-01', r.stdout + r.stderr);
  const d = kos(kok, 'catal-kuyruk.sh', ['--durum']).stdout;
  assert.match(d, /Ç-01\tCEVAPLANDI/, 'yazıldı ama cevap sayılmıyor');
  assert.match(readFileSync(KUYRUK(kok), 'utf8'), /uzaktan-posta uid:1841/, 'kaynak izi yok');
});

test('yapı işareti taşıyan seçenek metni KALICI KİLİT üretmez (v1 kusuru)', () => {
  // Hasım turunun canlı ölçtüğü senaryo: tırnaklı/ayraçlı bir seçenek metni kuyruk
  // ayrıştırıcısını "boş cevap"a düşürüyor, kod tükeniyor, iş sonsuza dek kilitli kalıyordu.
  const kok = kurulum();
  kuyrukKur(kok, [ACIK('Ç-01')]);
  const r = kos(kok, 'catal-kuyruk.sh', ['--cevapla', 'Ç-01', '"kalın" modda · bırak · cevap: evet', 'uzaktan-posta uid:9']);
  assert.equal(r.stdout.trim(), 'CEVAPLANDI\tÇ-01', r.stdout + r.stderr);
  assert.match(kos(kok, 'catal-kuyruk.sh', ['--durum']).stdout, /Ç-01\tCEVAPLANDI/);
});

test('"anlamadım" sınıfı seçenek metni yazılmaz (ARIZA — kod tüketilmez)', () => {
  const kok = kurulum();
  kuyrukKur(kok, [ACIK('Ç-01')]);
  const r = kos(kok, 'catal-kuyruk.sh', ['--cevapla', 'Ç-01', 'Ne demek istediğini sor', 'uzaktan-posta uid:9']);
  assert.match(r.stdout, /^ARIZA\t/, 'çeviri kusuru okutacak metin yazıldı — kilit hiç açılmazdı');
  assert.match(kos(kok, 'catal-kuyruk.sh', ['--durum']).stdout, /Ç-01\tCEVAP-BEKLIYOR/);
});

test('cevaplanmış · devretmiş · olmayan madde: yazma YOK (ATLANDI)', () => {
  const kok = kurulum();
  kuyrukKur(kok, [
    ACIK('Ç-01').replace('- [ ]', '- [x]') + ' · cevap: "sahibin kendi cevabı" · 2026-07-30',
    ACIK('Ç-02') + ' · devretti: Ç-03',
    ACIK('Ç-03'),
  ]);
  const oncesi = readFileSync(KUYRUK(kok), 'utf8');
  for (const id of ['Ç-01', 'Ç-02', 'Ç-99']) {
    const r = kos(kok, 'catal-kuyruk.sh', ['--cevapla', id, 'baska bir yol', 'uzaktan-posta uid:9']);
    assert.match(r.stdout, /^ATLANDI\t/, `${id} için yazma yapıldı`);
  }
  assert.equal(readFileSync(KUYRUK(kok), 'utf8'), oncesi,
    'kuyruk değişti — sahibin KENDİ cevabı yapının metniyle ezilebilirdi (D-21 ihlali)');
});

test('geçersiz argümanlar fail-closed (kimlik · boş metin · imzada yapı işareti)', () => {
  const kok = kurulum();
  kuyrukKur(kok, [ACIK('Ç-01')]);
  const kotu = [['G-01', 'x', 'imza'], ['Ç-01', '', 'imza'], ['Ç-01', 'x', 'imza · cevap: evet'], ['Ç-01', 'x', '']];
  for (const a of kotu) {
    assert.notEqual(kos(kok, 'catal-kuyruk.sh', ['--cevapla', ...a]).status, 0,
      'geçersiz argüman kabul edildi: ' + JSON.stringify(a));
  }
});

// ── 7 · Sözlük tek evde (D-02) ────────────────────────────────────────────────────────────
test('cevap sözlüğü yoksa --durum FAIL-CLOSED durur ("anlamadım" tanınamaz)', () => {
  const kok = kurulum();
  kuyrukKur(kok, [ACIK('Ç-01')]);
  spawnSync('rm', ['-f', join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt')]);
  const r = kos(kok, 'catal-kuyruk.sh', ['--durum']);
  assert.notEqual(r.status, 0, 'sözlüksüz koştu — "anlamadım" cevap sayılır ve kilit yanlış açılır');
});

test('sözlük TEK evdedir: kapı ve kuyruk aynı dosyayı okur', () => {
  const kapi = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'zarf-bicim-kapisi.sh'), 'utf8');
  const kuyruk = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'catal-kuyruk.sh'), 'utf8');
  assert.match(kapi, /KAPI_SOZLUK/, 'biçim kapısı sözlüğü okumuyor');
  assert.match(kuyruk, /cevap-sozlugu\.txt/, 'kuyruk sözlüğü okumuyor');
  for (const s of [kapi, kuyruk]) {
    assert.ok(!/anlam[ıi]yorum"/.test(s), 'sözlük listesi koda geri kopyalanmış (D-02 ihlali)');
  }
});

// ── 8 · Geri uyum: kanal kapalıyken hiçbir şey değişmez (bitti ölçütü 12) ─────────────────
test('CEVAP_KANALI boşken kanal KAPALI sayılır; tanınmayan değer de AÇMAZ', () => {
  const oku = (deger) => {
    const kok = kurulum({ cevapKanali: deger });
    const r = spawnSync('bash', ['-c',
      `. "${join(kok, 'tools', 'sevk', 'ortak.sh')}"; kanal_oku "${kok}" >/dev/null 2>&1; printf '%s' "$KANAL_CEVAP_KANALI"`],
      { encoding: 'utf8' });
    return r.stdout;
  };
  assert.equal(oku(''), '', 'boş alan kanalı açtı');
  assert.equal(oku('evet'), '', 'tanınmayan değer kanalı açtı — yazım hatası karar kanalı açardı');
  assert.equal(oku('1'), '', 'tanınmayan değer kanalı açtı');
  assert.equal(oku('acik'), 'acik', 'açık kanal tanınmıyor');
});

// ── 9 · DUR hattının onarımı (bitti ölçütü 1 · §0.1) ──────────────────────────────────────
test('nabız IMAP aramaları UID SEARCH kullanır (düz SEARCH sıra numarası döndürür)', () => {
  const s = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'nabiz.sh'), 'utf8');
  const aramalar = s.match(/request = "[^"]*SEARCH[^"]*"/g) || [];
  assert.ok(aramalar.length >= 1, 'IMAP araması bulunamadı');
  for (const a of aramalar) {
    assert.match(a, /UID SEARCH/,
      `düz SEARCH kullanılıyor (${a}) — dönen SIRA numarası ;UID= olarak verilirse YANLIŞ mesaj çekilir`);
  }
});

test('cevap bloğu dönem kapısının ÖNÜNDEDİR (kapanmış dönemde de koşar)', () => {
  const s = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'nabiz.sh'), 'utf8');
  const cevap = s.indexOf('cevap_hatti\n');
  const donemKapisi = s.indexOf('DONEM_RC=0; donem_oku');
  assert.ok(cevap > 0 && donemKapisi > 0, 'çağrılar bulunamadı');
  assert.ok(cevap < donemKapisi,
    'cevap hattı dönem dalının ARKASINDA — dönem kapandığında hiç koşmaz, yani tam da var oluş sebebindeki durumda çalışmaz');
});

// ── 10 · Koruma: çapa dikişi hem ön-elemede hem kararda (hasım bulgusu) ───────────────────
test('.cevap-capa hem ön-eleme listesinde hem dikişte var (biri eksikse dikiş hiç koşmaz)', () => {
  const s = readFileSync(join(KOK_REPO, 'tools', 'guard', 'file-guard.sh'), 'utf8');
  assert.match(s, /\*'\.cevap-'\*/, 'ön-eleme listesinde yok — dikiş HİÇ koşmaz (sessiz delik)');
  assert.match(s, /komut\.includes\("\.cevap-capa"\)/, 'dikiş kararı yok');
});
