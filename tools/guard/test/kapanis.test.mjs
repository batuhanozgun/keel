import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KAPANIS = join(BURASI, '..', 'kapanis.sh');

function kurulum({ pano = true, damga = null, bekci = null } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'kapanis-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  if (pano) mkdirSync(join(kok, '00_pano'), { recursive: true });
  if (damga) writeFileSync(join(kok, 'tools', 'guard', '.aktif-rol'), damga);
  if (bekci != null) {
    mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
    writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'),
      '#!/bin/bash\ntouch "$(dirname "$0")/kostu.izi"\nexit ' + bekci + '\n');
    chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  }
  return kok;
}

const gunluk = (kok) => join(kok, '00_pano', 'oturum-gunlugu.jsonl');

function kos(kok, stdinIcerik) {
  return spawnSync('bash', [KAPANIS], {
    encoding: 'utf8',
    input: stdinIcerik,
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
}

// Fiilî gözlem (2026-07-13, gerçek transcript): AYNI message.id parça parça tekrar düşer
// (67 usage satırı / 20 benzersiz id). Fixture bu tuzağı bilerek içerir — SON kazanmalı.
function transkriptYaz(kok) {
  const yol = join(kok, 'transkript.jsonl');
  const satirlar = [
    { type: 'user', timestamp: '2026-07-13T10:00:00.000Z' },
    { type: 'assistant', timestamp: '2026-07-13T10:01:00.000Z', message: { id: 'm1', usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 } } },
    { type: 'assistant', timestamp: '2026-07-13T10:02:00.000Z', message: { id: 'm1', usage: { input_tokens: 100, output_tokens: 25, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 } } },
    { type: 'assistant', timestamp: '2026-07-13T10:05:00.000Z', message: { id: 'm2', usage: { input_tokens: 200, output_tokens: 30, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 } } },
  ];
  writeFileSync(yol, satirlar.map((s) => JSON.stringify(s)).join('\n') + '\n');
  return yol;
}

const stdinJson = (kok, ekstra = {}) => JSON.stringify({
  session_id: 'test-oturum-1', transcript_path: join(kok, 'yok.jsonl'),
  cwd: kok, hook_event_name: 'SessionEnd', reason: 'other', ...ekstra,
});

test('vault değilse (00_pano yok) sessiz çıkar: exit 0, hiçbir dosya doğmaz', () => {
  const kok = kurulum({ pano: false });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  assert.equal(existsSync(join(kok, '00_pano')), false);
});

test('tam akış: satır düşer — oturum/neden stdin\'den, rol damgadan, bekçi yokken "yok"', () => {
  const kok = kurulum({ damga: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  const satirlar = readFileSync(gunluk(kok), 'utf8').trim().split('\n');
  assert.equal(satirlar.length, 1);
  const j = JSON.parse(satirlar[0]);
  assert.equal(j.surum, 1);
  assert.equal(j.oturum, 'test-oturum-1');
  assert.equal(j.neden, 'other');
  assert.equal(j.rol, 'denetci');
  assert.equal(j.bekci, 'yok');
});

test('token sayacı: message.id tekilleştirilir (SON kazanır), toplamlar + süre doğru', () => {
  const kok = kurulum();
  const t = transkriptYaz(kok);
  const r = kos(kok, stdinJson(kok, { transcript_path: t }));
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.girdi_token, 300);
  assert.equal(j.cikti_token, 55);
  assert.equal(j.cache_okuma, 3000);
  assert.equal(j.cache_yazma, 50);
  assert.equal(j.sure_dk, 5);
});

test('transcript yok: token alanları null + not dolu, satır YİNE düşer (fail-open)', () => {
  const kok = kurulum();
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.girdi_token, null);
  assert.equal(j.sure_dk, null);
  assert.ok(j.not, 'not alanı sebebi söylemeli');
});

test('bozuk stdin (JSON değil): satır yine düşer, oturum null, exit 0', () => {
  const kok = kurulum();
  const r = kos(kok, 'bu json değil');
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.oturum, null);
});

test('bekçi tamam (exit 0): bekci="tamam" + bekçi FİİLEN koştu (iz dosyası)', () => {
  const kok = kurulum({ bekci: 0 });
  kos(kok, stdinJson(kok));
  assert.ok(existsSync(join(kok, 'tools', 'bekci', 'kostu.izi')), 'bekçi koşmalı');
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'tamam');
});

test('bekçi kırmızı (exit 1): bekci="kirmizi", kanca yine exit 0 (fail-open)', () => {
  const kok = kurulum({ bekci: 1 });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'kirmizi');
});

test('bekçi iç-hata (exit 2): bekci="hata"', () => {
  const kok = kurulum({ bekci: 2 });
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'hata');
});

test('append-only: iki kapanış = iki satır; ilk satır bayt-bayt korunur', () => {
  const kok = kurulum();
  kos(kok, stdinJson(kok));
  const ilk = readFileSync(gunluk(kok), 'utf8');
  kos(kok, stdinJson(kok, { session_id: 'test-oturum-2' }));
  const hepsi = readFileSync(gunluk(kok), 'utf8');
  assert.ok(hepsi.startsWith(ilk), 'ilk satır değişmemeli');
  assert.equal(hepsi.trim().split('\n').length, 2);
});

test('damga yok: rol null', () => {
  const kok = kurulum();
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).rol, null);
});

test('bozuk damga (ASCII-dışı slug): rol null düşer, satır ölmez', () => {
  const kok = kurulum({ damga: 'anlamsız içerik\n' });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).rol, null);
});

test('damga yaşı: bekçi taze damga yazınca damga_yasi_dk ≤ 1 (plan kararı 12)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), [
    '#!/bin/bash',
    'D="$(cd "$(dirname "$0")/../.." && pwd)"',
    'printf "# SAGLIK\\n\\nson koşu: %s (koşu #7)\\n" "$(date \'+%Y-%m-%d %H:%M\')" > "$D/00_pano/SAGLIK.md"',
    'exit 0',
  ].join('\n'));
  chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'tamam');
  assert.ok(j.damga_yasi_dk !== null && j.damga_yasi_dk <= 1, 'taze damga: yaş ≤ 1 dk');
});

test('damga yaşı: SAGLIK yok → damga_yasi_dk null', () => {
  const kok = kurulum();
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).damga_yasi_dk, null);
});

test('damga yaşı: bekçisiz eski damga → büyük yaş (bayatlık olay anında kaydedilir)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '00_pano', 'SAGLIK.md'), '# SAĞLIK\n\nson koşu: 2026-01-01 00:00 (koşu #3)\n');
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.ok(j.damga_yasi_dk > 1000, 'aylar önceki damga büyük yaş vermeli');
});
