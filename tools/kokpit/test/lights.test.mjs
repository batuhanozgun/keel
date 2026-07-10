import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLights, worstLight, parseLights } from '../lib/status.mjs';
import { readFile, readdir } from 'node:fs/promises';

test('parseLights: NAME=val çiftlerini sıralı diziye çevirir', () => {
  const L = parseLights('AKIŞ=YEŞİL · DOSYA=SARI · DAVRANIŞ=VERİ-YOK');
  assert.deepEqual(L, [
    { ad: 'AKIŞ', deger: 'YEŞİL' },
    { ad: 'DOSYA', deger: 'SARI' },
    { ad: 'DAVRANIŞ', deger: 'VERİ-YOK' },
  ]);
});

test('parseLights: jenerik ad (farklı boyut adları) da okunur', () => {
  const L = parseLights('HIZ=YEŞİL · KALİTE=KIRMIZI');
  assert.deepEqual(L, [
    { ad: 'HIZ', deger: 'YEŞİL' },
    { ad: 'KALİTE', deger: 'KIRMIZI' },
  ]);
});

test('parseLights: boş/çöp girdi → null', () => {
  assert.equal(parseLights(''), null);
  assert.equal(parseLights('  '), null);
});

test('worstLight: en kötü ışık genele yansır (dizi)', () => {
  assert.equal(worstLight([{ ad: 'A', deger: 'YEŞİL' }, { ad: 'B', deger: 'KIRMIZI' }]), 'KIRMIZI');
});

test('worstLight: VERİ-YOK nötr, en kötü YEŞİL kalır', () => {
  assert.equal(worstLight([{ ad: 'A', deger: 'YEŞİL' }, { ad: 'B', deger: 'VERİ-YOK' }]), 'YEŞİL');
});

test('worstLight: boş dizi → null', () => {
  assert.equal(worstLight([]), null);
  assert.equal(worstLight(null), null);
});

test('mergeLights: çelişkide kötümser seçilir (kırmızı maskelenmez)', () => {
  const w = [];
  const merged = mergeLights(
    [{ ad: 'AKIŞ', deger: 'YEŞİL' }, { ad: 'DOSYA', deger: 'KIRMIZI' }],
    [{ ad: 'AKIŞ', deger: 'YEŞİL' }, { ad: 'DOSYA', deger: 'YEŞİL' }],
    w
  );
  const dosya = merged.find((l) => l.ad === 'DOSYA');
  assert.equal(dosya.deger, 'KIRMIZI', 'kötümser (kırmızı) kazanmalı');
  assert.ok(w.some((m) => m.includes('çelişiyor')), 'çelişki uyarısı düşmeli');
});

test('mergeLights: PANO yoksa SAGLIK kullanılır + uyarı', () => {
  const w = [];
  const merged = mergeLights(null, [{ ad: 'AKIŞ', deger: 'SARI' }], w);
  assert.equal(merged.find((l) => l.ad === 'AKIŞ').deger, 'SARI');
  assert.ok(w.some((m) => m.includes('SAGLIK')), 'yedek uyarısı düşmeli');
});

test('mergeLights: ikisi de yoksa null + uyarı', () => {
  const w = [];
  assert.equal(mergeLights(null, null, w), null);
  assert.ok(w.length >= 1);
});

test('mergeLights: bir kaynakta olmayan ışık kaybolmaz (birleşim)', () => {
  const merged = mergeLights(
    [{ ad: 'AKIŞ', deger: 'YEŞİL' }],
    [{ ad: 'DOSYA', deger: 'SARI' }],
    []
  );
  assert.equal(merged.length, 2);
  assert.ok(merged.find((l) => l.ad === 'DOSYA'));
});

// --- Görünüm disiplini (Faz 0b): insan-görünümü tr-locale, makine-eşleştirme birebir ---
// Kokpit istemcisi (app.js) tarayıcıda koşar; birim test oraya ulaşamaz. Disiplin
// kapısı bu yüzden KAYNAK taramasıdır: çıplak toLowerCase/toUpperCase = kırmızı.
// server.mjs bilerek kapsam dışı (uzantı eşleme ASCII-teknik, doğru kullanım).

test('görünüm disiplini: app.js + lib içinde çıplak toLowerCase/toUpperCase yok', async () => {
  const libDir = new URL('../lib/', import.meta.url);
  const libs = (await readdir(libDir)).filter((f) => f.endsWith('.mjs')).map((f) => '../lib/' + f);
  for (const rel of ['../public/app.js', ...libs]) {
    const src = await readFile(new URL(rel, import.meta.url), 'utf8');
    assert.equal(/\.toLowerCase\(/.test(src), false, rel + ": çıplak .toLowerCase( yasak — insan-görünümü toLocaleLowerCase('tr') ister (İ/ı), makine-eşleştirme dönüşümsüz birebirdir");
    assert.equal(/\.toUpperCase\(/.test(src), false, rel + ': çıplak .toUpperCase( yasak');
  }
});

test('görünüm disiplini: sağlık kalemi etiketi tr-locale küçültür (KIRMIZI→kırmızı, SARI→sarı)', async () => {
  const src = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(src.includes("it.level.toLocaleLowerCase('tr')"), "sağlık kalemi etiketi toLocaleLowerCase('tr') ile küçültülmeli (73. satırdaki rozet emsali)");
  // Çalışma-zamanı güvencesi: Node ICU'su tr kurallarını gerçekten uyguluyor
  assert.equal('KIRMIZI'.toLocaleLowerCase('tr'), 'kırmızı');
  assert.equal('SARI'.toLocaleLowerCase('tr'), 'sarı');
  // BILGI özel durumu bilinçlidir: tr küçültme 'bılgı' üretir; kod 'bilgi' sabitler
  assert.equal('BILGI'.toLocaleLowerCase('tr'), 'bılgı');
});
