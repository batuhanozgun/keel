import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const ROLAC = join(BURASI, '..', 'rol-ac.sh');

function kurulum() {
  const kok = mkdtempSync(join(tmpdir(), 'rolac-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  // Tören yalnız KAYITLI rollere damga basar (soğuk-denetim E3) — test kadrosu:
  for (const r of ['denetci', 'uygulayici', 'koordinator']) {
    mkdirSync(join(kok, '03_roller', r), { recursive: true });
  }
  return kok;
}
const damga = (kok) => join(kok, 'tools', 'guard', '.aktif-rol');
function kos(kok, args) {
  return spawnSync('bash', [ROLAC, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
}

test('tören: denetci yazamaz → damga doğar (slug\\tmod\\tev; ev türetilir), çıktıda "ROL AÇIK"', () => {
  const kok = kurulum();
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ROL AÇIK: denetci/);
  assert.equal(readFileSync(damga(kok), 'utf8'), 'denetci\tyazamaz\t03_roller/denetci/\n');
});

test('tören: tam mod → ev yine slug\'dan türetilir', () => {
  const kok = kurulum();
  const r = kos(kok, ['uygulayici', 'tam']);
  assert.equal(r.status, 0);
  assert.equal(readFileSync(damga(kok), 'utf8'), 'uygulayici\ttam\t03_roller/uygulayici/\n');
});

test('bozuk mod → exit 1, damga doğmaz', () => {
  const kok = kurulum();
  const r = kos(kok, ['denetci', 'okur-yazar']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ROL AÇILAMADI/);
  assert.equal(existsSync(damga(kok)), false);
});

test('argümansız → exit 1, damga doğmaz', () => {
  const kok = kurulum();
  assert.equal(kos(kok, []).status, 1);
  assert.equal(existsSync(damga(kok)), false);
});

test('geçersiz slug (ASCII-dışı/büyük harf) → exit 1, damga doğmaz', () => {
  const kok = kurulum();
  const r = kos(kok, ['Denetçi', 'yazamaz']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /slug/);
  assert.equal(existsSync(damga(kok)), false);
});

test('rol değişimi reddi: koordinator açıkken denetci töreni → exit 1, damga DEĞİŞMEZ', () => {
  const kok = kurulum();
  kos(kok, ['koordinator', 'tam']);
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /YENİ oturum/);
  assert.match(readFileSync(damga(kok), 'utf8'), /^koordinator\t/);
});

test('aynı rol aynı profil → no-op idempotent (exit 0, damga birebir aynı kalır)', () => {
  const kok = kurulum();
  kos(kok, ['denetci', 'yazamaz']);
  const once = readFileSync(damga(kok), 'utf8');
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ROL AÇIK: denetci/);
  assert.equal(readFileSync(damga(kok), 'utf8'), once);
});

test('mod-yükseltme kapalı: denetci yazamaz açıkken "denetci tam" → exit 1, damga DEĞİŞMEZ', () => {
  const kok = kurulum();
  kos(kok, ['denetci', 'yazamaz']);
  const r = kos(kok, ['denetci', 'tam']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /profil/);
  assert.equal(readFileSync(damga(kok), 'utf8'), 'denetci\tyazamaz\t03_roller/denetci/\n');
});

test('bozuk damga varken tören → exit 1 (belirsiz durumda üstüne yazılmaz; çözüm yolu söylenir)', () => {
  const kok = kurulum();
  writeFileSync(damga(kok), 'anlamsız içerik\n');
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bozuk/);
});

// --- Soğuk-denetim yamaları (2026-07-16): E3 kayıtlı-rol şartı · A3 slug hizası ---

test('E3: kayıtsız rol (03_roller/ altında yok) → exit 1, damga doğmaz (uydurma ada damga yok)', () => {
  const kok = kurulum();
  const r = kos(kok, ['ghost', 'tam']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /rol tanımsız/);
  assert.equal(existsSync(damga(kok)), false);
});

test('A3: tireli/alt-çizgili slug artık reddedilir (GENESIS G3.3c tek-token kuralıyla hizalı)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', 'denetci-alt'), { recursive: true });
  const r = kos(kok, ['denetci-alt', 'tam']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /slug/);
  assert.equal(existsSync(damga(kok)), false);
});
