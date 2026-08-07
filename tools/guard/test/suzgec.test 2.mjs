// icerik-suzgeci.sh birim testleri (E2 Hat-1).
// KURAL: hiçbir test LITERAL gerçekçi değer taşımaz — TCKN/IBAN/kart değerleri çalışma anında
// checksum kuralından ÜRETİLİR (tasarı §2: betikte ve testte örnek değer bulunmaz; kapı redi
// alan ajan koruma dosyalarını okuyor — E1 ölçümü — literal değer desen-gözlerini kirletir).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
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
