// Kategori `bağ-varlık` (2 göz) + `golden-tazelik` (4 göz). BEKCI_TARIFI md.17 + sözleşme §5②.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { kurulum, kos, temizle, commitEt } from './yardimci.mjs';

function kanitla(kok, kanit) {
  const yol = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(yol, readFileSync(yol, 'utf8').replace('test: fixture koşusu yeşil', kanit));
}

test('bağ-varlık pozitif: test:/demo: işaretçili görevler bulgu üretmez', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.ok(!/kanit-isaretcisi/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('Kanıt hücresi boş ya da — → UYARI işaretçisiz görev', () => {
  const kok = kurulum();
  kanitla(kok, '—');
  const r = kos(kok);
  assert.ok(/UYARI \[bağ-varlık\] kanit-isaretcisi: işaretçisiz görev: G-01/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('yalnız önek (test:) = boş işaretçi → UYARI (asgari biçim — BEKCI_TARIFI md.17)', () => {
  const kok = kurulum();
  kanitla(kok, 'test:');
  const r = kos(kok);
  assert.ok(/UYARI \[bağ-varlık\] kanit-isaretcisi: boş işaretçi \(yalnız önek\): G-01/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('vault-yolu kopuk → UYARI; var olan yol → sessiz', () => {
  const kok = kurulum();
  kanitla(kok, '02_kanon/olmayan-dosya.md');
  const r = kos(kok);
  assert.ok(/UYARI \[bağ-varlık\] kanit-isaretcisi: kanıt-işaretçisi kopuk: G-01 → 02_kanon\/olmayan-dosya\.md/.test(r.stdout), r.stdout);
  temizle(kok);
  const kok2 = kurulum();
  kanitla(kok2, '02_kanon/EL_KITABI.md');
  const r2 = kos(kok2);
  assert.ok(!/kanit-isaretcisi/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('serbest metin yol SANILMAZ — yanlış bulgu üretilmez (bekçi yalnız BAĞI denetler)', () => {
  const kok = kurulum();
  kanitla(kok, 'bkz. tartışma kaydı b/12');
  const r = kos(kok);
  assert.ok(!/kanit-isaretcisi/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('Kanıt sütunsuz eski tablo ve pasif Faz-B bloğu bulgu üretmez (geri-uyum + faz filtresi)', () => {
  const kok = kurulum();
  const yol = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  const metin = readFileSync(yol, 'utf8').replace('## Duruş sözleşmesi',
    '### Faz B — iskelet\n| Görev | İş | Sahip | Durum |\n|---|---|---|---|\n| G-90 | sonra | koordinator | açık |\n\n## Duruş sözleşmesi');
  // aktif fazı da başlıkla aç ki Faz-B pasifliği ölçülsün
  writeFileSync(yol, metin.replace('| Görev | İş | Sahip | Durum | Kanıt |', '| Görev | İş | Sahip | Durum | Kanıt |')
    .replace('## Görevler\n', '## Görevler\n### Faz A — üretim\n'));
  const r = kos(kok);
  assert.ok(!/kanit-isaretcisi.*G-90/.test(r.stdout), 'pasif faz satırı toplanmaz: ' + r.stdout);
  temizle(kok);
});

test('golden yok/boş → BİLGİ (kanon-fakir esnemesi; KIRMIZI değil)', () => {
  const kok = kurulum(); // fixture golden'ı yalnız README taşır
  const r = kos(kok);
  assert.ok(/BİLGİ \[golden-tazelik\] golden-tazeligi: golden henüz yok\/boş — kanon-fakir/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.durduran, 0);
  temizle(kok);
});

test('golden, ürün kodundan eskiyse UYARI (git %ct karşılaştırması — §5②)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '02_kanon', 'golden', 'akis-ornegi.md'), 'donmuş çıktı v1\n');
  commitEt(kok, 'golden dondu', '2026-08-02T10:00:00');
  mkdirSync(join(kok, '04_urun'), { recursive: true });
  writeFileSync(join(kok, '04_urun', 'hesap.mjs'), 'export const bir = 1;\n');
  commitEt(kok, 'urun ilerledi', '2026-08-03T10:00:00');
  const r = kos(kok);
  assert.ok(/UYARI \[golden-tazelik\] golden-tazeligi: golden, ürün kodundan eski/.test(r.stdout), r.stdout);

  // golden güncellenince UYARI düşer
  writeFileSync(join(kok, '02_kanon', 'golden', 'akis-ornegi.md'), 'donmuş çıktı v2\n');
  commitEt(kok, 'golden guncellendi (sahip muhru)', '2026-08-04T10:00:00');
  const r2 = kos(kok);
  assert.ok(!/golden, ürün kodundan eski/.test(r2.stdout), r2.stdout);
  temizle(kok);
});

test('golden dolu ama git izlemiyor / git yok → DURDURAN (ölçemedim ≠ taze, fail-closed)', () => {
  // Ayar başka bir golden dizini ilan ediyor; dizin dolu ama yolu HİÇ commit görmemiş →
  // git log boş → tazelik ölçülemez. (Fixture'ın kendi golden'ı README'siyle commit'lidir,
  // o yüzden "izlenmiyor" hâli ancak commit'siz bir yolda ölçülebilir.)
  const kok = kurulum({ conf: { golden_dizini: '02_kanon/golden-v2' } });
  mkdirSync(join(kok, '02_kanon', 'golden-v2'), { recursive: true });
  writeFileSync(join(kok, '02_kanon', 'golden-v2', 'izsiz.md'), 'commit edilmemiş golden\n');
  const r = kos(kok);
  assert.ok(/DURDURAN \[golden-tazelik\] golden-tazeligi: golden git'te izlenmiyor/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum({ gitli: false, kurulumTamam: true });
  writeFileSync(join(kok2, '02_kanon', 'golden', 'ornek.md'), 'golden\n');
  const r2 = kos(kok2);
  assert.ok(/DURDURAN \[golden-tazelik\] golden-tazeligi: git yok — golden tazeliği ölçülemedi \(fail-closed\)/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('ürün yolları ilan edilmemişse karşılaştırma tabanı yok → BİLGİ (K-01 ilanı bekleniyor)', () => {
  const kok = kurulum({ conf: { urun_yollari: '' } });
  writeFileSync(join(kok, '02_kanon', 'golden', 'ornek.md'), 'golden\n');
  commitEt(kok, 'golden dondu');
  const r = kos(kok);
  assert.ok(/BİLGİ \[golden-tazelik\] golden-tazeligi: ürün yolları ilan edilmemiş/.test(r.stdout), r.stdout);
  temizle(kok);
});

test("golden testinde üretim modülü import'u → DURDURAN (kod kendi oracle'ı olamaz — G3a)", () => {
  const kok = kurulum();
  mkdirSync(join(kok, '04_urun'), { recursive: true });
  writeFileSync(join(kok, '04_urun', 'hesap.mjs'), 'export const topla = (a, b) => a + b;\n');
  writeFileSync(join(kok, '02_kanon', 'golden', 'akis.test.mjs'),
    "import { topla } from '../../04_urun/hesap.mjs';\nexport const beklenen = topla(1, 2);\n");
  commitEt(kok, 'golden testi eklendi');
  const r = kos(kok);
  assert.ok(/DURDURAN \[golden-tazelik\] golden-import: golden testinde üretim modülü import'u: 02_kanon\/golden\/akis\.test\.mjs → \.\.\/\.\.\/04_urun\/hesap\.mjs/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 1);

  // üretim-dışı import (node: / paket) serbesttir
  writeFileSync(join(kok, '02_kanon', 'golden', 'akis.test.mjs'),
    "import assert from 'node:assert';\nexport const beklenen = 3;\n");
  commitEt(kok, 'golden testi temizlendi');
  const r2 = kos(kok);
  assert.ok(!/golden-import/.test(r2.stdout), r2.stdout);
  temizle(kok);
});
