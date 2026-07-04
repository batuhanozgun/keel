import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildState } from '../lib/status.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEKFAZ = path.join(__dirname, 'fixtures/tekfaz');
const IKIFAZ = path.join(__dirname, 'fixtures/ikifaz');

// Deterministik mtime kur (Date.now yok): koordinator eski, siradaki rol yeni.
async function setMtimes(root, map) {
  for (const [rel, epochSec] of Object.entries(map)) {
    await fs.utimes(path.join(root, rel), epochSec, epochSec);
  }
}

test('bayat: SIRADAKİ rolü koordinatörden yeni hareket ettiyse tespit', async () => {
  // tekfaz: SIRADAKİ=uygulayici. uygulayici DURUM'u koordinatörden yeni yap.
  await setMtimes(TEKFAZ, {
    '03_roller/koordinator/DURUM.md': 1783115000,
    '03_roller/uygulayici/DURUM.md': 1783118000, // daha yeni
  });
  const s = await buildState(TEKFAZ, { koordinatorRol: 'koordinator' });
  assert.equal(s.yargi.siradakiRol, 'uygulayici');
  assert.equal(s.yargi.siradakiStale, true, 'bayat tespit edilmeli');
  assert.equal(s.yargi.sonHareketRol, 'uygulayici');
});

test('taze: SIRADAKİ rolü henüz hareket etmediyse bayat değil', async () => {
  // koordinator DURUM'u siradaki rolden yeni (sevk taze).
  await setMtimes(TEKFAZ, {
    '03_roller/uygulayici/DURUM.md': 1783115000,
    '03_roller/koordinator/DURUM.md': 1783118000, // koordinator daha yeni = taze sevk
  });
  const s = await buildState(TEKFAZ, { koordinatorRol: 'koordinator' });
  assert.equal(s.yargi.siradakiStale, false, 'taze sevk bayat sayılmamalı');
  assert.equal(s.yargi.sonHareketRol, null);
});

test('SIRADAKİ koordinatörün kendisiyse bayat mantığı çalışmaz', async () => {
  // ikifaz SIRADAKİ=analiz; koordinatorRol'ü 'analiz' verirsek eşleşir → stale değil
  const s = await buildState(IKIFAZ, { koordinatorRol: 'analiz' });
  assert.equal(s.yargi.siradakiStale, false);
});
