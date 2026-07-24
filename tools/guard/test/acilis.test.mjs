// acilis.test.mjs — oturum-açılış hatırlatması (V2 Öbek-2, sahip yüzeyi).
// Sahip kararı 2026-07-24: hatırlatma açılışta + panoda, ISRAR YOK — yaş BİLGİdir.
// Bu testler o kararın mekanik sınırlarını korur: tek satır · kapalı madde sayılmaz ·
// kuyruk yoksa SESSİZ · dosyaya asla yazmaz (kuyruğun tek mekanik yazarı kapanis.sh).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const ACILIS = join(BURASI, '..', 'acilis.sh');

const BASLIK = '<!-- yazar: kapanış kancası -->\n# SENDE BEKLEYEN — sahipte bekleyen maddeler\n\n';

function kurulum(kuyrukIcerik = null) {
  const kok = mkdtempSync(join(tmpdir(), 'acilis-test-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  if (kuyrukIcerik != null) writeFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), kuyrukIcerik);
  return kok;
}

const kos = (kok) => spawnSync('bash', [ACILIS], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });

function gunOnce(n) {
  const d = new Date(Date.now() - n * 86400000);
  const p2 = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
const bugun = gunOnce(0);

test('kuyruk dosyası yok: sessiz çıkar (exit 0, çıktı yok) — şablon kökü kirletilmez', () => {
  const r = kos(kurulum());
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('açık madde yok (hepsi kapalı): satır BASILMAZ — dırdır yok', () => {
  const kok = kurulum(BASLIK + `- [x] ${gunOnce(3)} · po · "eski" · kaynak: oturum abc · cevap: "evet" · ${bugun}\n`);
  const r = kos(kok);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('bugünkü iki açık madde: tek satır, sayı doğru, yaş cümlesi YOK', () => {
  const kok = kurulum(BASLIK + `- [ ] ${bugun} · po · "soru 1" · kaynak: oturum a1\n- [ ] ${bugun} · koordinator · "soru 2" · kaynak: oturum a2\n`);
  const r = kos(kok);
  const satirlar = r.stdout.trim().split('\n');
  assert.equal(satirlar.length, 1, 'tek satır (ısrar yok)');
  assert.match(r.stdout, /Sende bekleyen 2 madde — "bekleyenleri göster" de\./);
  assert.ok(!r.stdout.includes('en eskisi'), 'aynı gün eklenen maddede yaş cümlesi olmaz');
});

test('eski madde: "en eskisi N gündür" bilgisi (uyarı değil, ünlem/KIRMIZI yok)', () => {
  const kok = kurulum(BASLIK + `- [ ] ${gunOnce(15)} · po · "eski soru" · kaynak: oturum a1\n- [ ] ${bugun} · po · "yeni soru" · kaynak: oturum a2\n`);
  const r = kos(kok);
  assert.match(r.stdout, /Sende bekleyen 2 madde \(en eskisi 15 gündür\)/);
  assert.ok(!/KIRMIZI|SARI|UYARI/.test(r.stdout), 'yaş uyarı değil bilgidir');
});

test('kapalı madde sayıma girmez (yalnız "- [ ]" satırları)', () => {
  const kok = kurulum(BASLIK + `- [x] ${gunOnce(9)} · po · "kapandı" · kaynak: oturum a0 · cevap: "oldu" · ${bugun}\n- [ ] ${gunOnce(2)} · po · "açık" · kaynak: oturum a1\n`);
  const r = kos(kok);
  assert.match(r.stdout, /Sende bekleyen 1 madde \(en eskisi 2 gündür\)/);
});

test('tarihsiz/bozuk satır: patlamaz, madde sayılır, yaş cümlesi düşer', () => {
  const kok = kurulum(BASLIK + '- [ ] tarihsiz bozuk satır\n');
  const r = kos(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Sende bekleyen 1 madde — /);
});

test('SALT-OKUR: kanca kuyruğu bayt-bayt değiştirmez', () => {
  const icerik = BASLIK + `- [ ] ${gunOnce(4)} · po · "soru" · kaynak: oturum a1\n`;
  const kok = kurulum(icerik);
  kos(kok);
  assert.equal(readFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), 'utf8'), icerik);
});
