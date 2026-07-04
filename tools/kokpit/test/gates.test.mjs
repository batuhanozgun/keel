import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildState } from '../lib/status.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEKFAZ = path.join(__dirname, 'fixtures/tekfaz');
const IKIFAZ = path.join(__dirname, 'fixtures/ikifaz');

test('tek-faz: Faz başlığı yokken tüm kapılar toplanır', async () => {
  const s = await buildState(TEKFAZ);
  assert.ok(s.kutu, 'aktif kutu olmalı');
  assert.equal(s.kutu.gates.length, 5, 'tek-faz 5 kapı');
  const ids = s.kutu.gates.map((g) => g.id).sort();
  assert.deepEqual(ids, ['G-01', 'G-02', 'G-03', 'G-04', 'G-05']);
  const g05 = s.kutu.gates.find((g) => g.id === 'G-05');
  assert.equal(g05.sahip, 'denetci');
  assert.equal(g05.durum, 'açık');
});

test('iki-faz: yalnız Faz A kapıları toplanır (Faz B hariç)', async () => {
  const s = await buildState(IKIFAZ);
  assert.ok(s.kutu);
  const ids = s.kutu.gates.map((g) => g.id).sort();
  assert.deepEqual(ids, ['G-07', 'G-08'], 'yalnız Faz A; G-12 (Faz B) yok');
});

test('iki-faz: Faz A durum DASH öncesi alınır (açık — sevkte → açık)', async () => {
  const s = await buildState(IKIFAZ);
  const g07 = s.kutu.gates.find((g) => g.id === 'G-07');
  assert.equal(g07.durum, 'açık', 'em-dash sonrası atılır');
  assert.equal(g07.sahip, 'analiz');
});
