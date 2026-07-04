import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildState } from '../lib/status.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEKFAZ = path.join(__dirname, 'fixtures/tekfaz');
const IKIFAZ = path.join(__dirname, 'fixtures/ikifaz');
// Gerçek-vault regresyonu: yalnız env verilirse koşar; yoksa atlanır (paket makineden bağımsız).
const REAL = process.env.KOKPIT_VAULT || null;

async function exists(p) { if (!p) return false; try { await fs.access(p); return true; } catch { return false; } }

test('fixture (tek-faz): durum şekli + jenerik roller', async () => {
  const s = await buildState(TEKFAZ);
  assert.ok(s.saglik.lights, 'ışıklar okunmalı');
  assert.equal(s.saglik.lights.find((l) => l.ad === 'AKIŞ').deger, 'YEŞİL');
  assert.equal(s.saglik.lights.find((l) => l.ad === 'DAVRANIŞ').deger, 'VERİ-YOK');
  assert.equal(typeof s.saglik.runNo, 'number');
  assert.equal(s.roller.length, 3, 'jenerik 3 rol (koordinator/uygulayici/denetci)');
  assert.ok(s.yargi.siradakiRol, 'sıradaki rol okunmalı');
  assert.ok(s.kutular.some((b) => b.aktif && b.id === 'KT-001'));
  assert.equal(s.warnings.length, 0, 'temiz fixture 0 uyarı');
});

test('fixture (iki-faz): ışık çelişkisiz, kapı yalnız Faz A', async () => {
  const s = await buildState(IKIFAZ);
  assert.equal(s.saglik.lights.find((l) => l.ad === 'DOSYA').deger, 'SARI');
  assert.deepEqual(s.kutu.gates.map((g) => g.id).sort(), ['G-07', 'G-08']);
  assert.equal(s.warnings.length, 0);
});

test('gerçek vault regresyonu: 0 uyarı + şekil (KOKPIT_VAULT verilirse)', async (t) => {
  if (!(await exists(REAL))) { t.skip('gerçek vault yok'); return; }
  const s = await buildState(REAL, { koordinatorRol: 'koordinator' });
  assert.equal(s.warnings.length, 0, 'gerçek vault 0 uyarı (format sözleşmesi tutar)');
  assert.ok(s.saglik.lights && s.saglik.lights.length >= 1, 'ışık okunmalı');
  for (const lt of s.saglik.lights) {
    assert.ok(['YEŞİL', 'SARI', 'KIRMIZI', 'VERİ-YOK'].includes(lt.deger), 'geçerli ciddiyet: ' + lt.deger);
  }
  assert.ok(s.kutu && s.kutu.gates.length >= 1, 'aktif kutu + en az 1 kapı');
  assert.ok(s.roller.length >= 1, 'en az 1 rol');
  assert.ok(typeof s.yargi.siradakiStale === 'boolean', 'bayatlık alanı hesaplanır');
});
