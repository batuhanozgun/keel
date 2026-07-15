import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
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

test('kanıt sütunu: tekfaz 5. hücre kanit alanına düşer', async () => {
  const s = await buildState(TEKFAZ);
  const g02 = s.kutu.gates.find((g) => g.id === 'G-02');
  assert.equal(g02.kanit, 'test: model.test.mjs');
  const g05 = s.kutu.gates.find((g) => g.id === 'G-05');
  assert.equal(g05.kanit, '02_kanon/golden/akis-ornegi.md');
});

test('kanıt sütunu: ikifaz Faz A kanit okunur', async () => {
  const s = await buildState(IKIFAZ);
  const g08 = s.kutu.gates.find((g) => g.id === 'G-08');
  assert.equal(g08.kanit, 'test: matris.test.mjs');
});

test('geri-uyum: 4 sütunlu eski tablo kanit=null ile okunur (eski vault kırılmaz)', async () => {
  const kok = await fs.mkdtemp(path.join(os.tmpdir(), 'kokpit-4sutun-'));
  await fs.mkdir(path.join(kok, '01_kutular', 'KT-009-eski'), { recursive: true });
  await fs.writeFile(path.join(kok, '01_kutular', 'KT-009-eski', 'KUTU.md'),
    '# KT-009 — Eski biçim\n\n## Kapılar\n| Kapı | İş | Sahip | Durum |\n|---|---|---|---|\n| G-01 | Eski iş | uygulayici | açık |\n');
  const s = await buildState(kok);
  assert.equal(s.kutu.gates.length, 1);
  assert.equal(s.kutu.gates[0].kanit, null);
  assert.equal(s.kutu.gates[0].durum, 'açık');
});

test('B4 (soğuk-denetim): hücredeki `a|b` satır-içi kodu sütunları KAYDIRMAZ (markdown.mjs ile ortak bölücü)', async () => {
  const kok = await fs.mkdtemp(path.join(os.tmpdir(), 'kokpit-pipe-'));
  await fs.mkdir(path.join(kok, '01_kutular', 'KT-011-kod'), { recursive: true });
  await fs.writeFile(path.join(kok, '01_kutular', 'KT-011-kod', 'KUTU.md'),
    '# KT-011 — Kod\n\n## Kapılar\n| Kapı | İş | Sahip | Durum | Kanıt |\n|---|---|---|---|---|\n| G-01 | kod `a|b` üret | uygulayici | açık | test: x |\n');
  const s = await buildState(kok);
  const g = s.kutu.gates[0];
  assert.equal(g.is, 'kod `a|b` üret', 'iş hücresi bütün kalmalı');
  assert.equal(g.sahip, 'uygulayici');
  assert.equal(g.durum, 'açık');
  assert.equal(g.kanit, 'test: x');
});

test('— hücresi işaretçisiz sayılır: kanit=null (bekçiyle aynı dil; UI "kanıt: —" basmaz)', async () => {
  const kok = await fs.mkdtemp(path.join(os.tmpdir(), 'kokpit-tire-'));
  await fs.mkdir(path.join(kok, '01_kutular', 'KT-010-tire'), { recursive: true });
  await fs.writeFile(path.join(kok, '01_kutular', 'KT-010-tire', 'KUTU.md'),
    '# KT-010 — Tire\n\n## Kapılar\n| Kapı | İş | Sahip | Durum | Kanıt |\n|---|---|---|---|---|\n| G-01 | İş | uygulayici | açık | — |\n');
  const s = await buildState(kok);
  assert.equal(s.kutu.gates[0].kanit, null);
});
