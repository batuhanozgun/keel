// Kategori `tavan` (4 göz): sarı eşik · 1,5× KİLİT · içerik-sınıfı (kural-atıf kopyası ·
// çok-satırlı kuyruk maddesi) + EL_KITABI/ayar tavan ayrışması UYARI'sı (sözleşme §5④⑤).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { kurulum, kos, temizle, EK_TAM } from './yardimci.mjs';

test('pozitif: temiz kurulumda tavan bulgusu yok', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.ok(!/\[tavan\] tavan-asimi/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.uyari, 0);
  temizle(kok);
});

test('sarı eşik: tavanı aşan PANO → UYARI (iş durmaz)', () => {
  const kok = kurulum();
  appendFileSync(join(kok, '00_pano', 'PANO.md'), 'x'.repeat(2100) + '\n');
  const r = kos(kok);
  assert.ok(r.alanlar.uyari >= 1, r.stdout);
  assert.ok(/UYARI \[tavan\] tavan-asimi: PANO \d+B > esik 2048B/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 0);
  temizle(kok);
});

test('1,5× eşik: KİLİT — dönem durmaz, kapanış kilitlenir', () => {
  const kok = kurulum();
  appendFileSync(join(kok, '00_pano', 'PANO.md'), 'x'.repeat(3200) + '\n');
  const r = kos(kok);
  assert.ok(r.alanlar.kilit >= 1, r.stdout);
  assert.ok(/KİLİT \[tavan\] tavan-asimi: PANO \d+B > 1,5x esik 3072B/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 0);
  temizle(kok);
});

test('KUTU ölçümünden Bağımlılık-ve-risk bloğu DÜŞÜLÜR (BEKCI_TARIFI md.19)', () => {
  const kok = kurulum();
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  const metin = readFileSync(kutuYolu, 'utf8');
  // Gövdeyi tavanın hemen ALTINA getir, sonra risk bloğunu tavanı aşacak kadar büyüt:
  // düşme uygulanmazsa KİLİT/UYARI doğar; uygulanırsa doğmaz.
  const govdeDolgusu = '\n<!-- dolgu -->\n' + 'g'.repeat(9000) + '\n';
  const riskSatirlari = Array.from({ length: 40 }, (_, i) => 'G-' + String(i + 10) + ': onkosul=yok · risk=düşük — ' + 'r'.repeat(60)).join('\n');
  writeFileSync(kutuYolu, metin.replace('## Bağımlılık ve risk', govdeDolgusu + '## Bağımlılık ve risk') + riskSatirlari + '\n');
  const r = kos(kok);
  assert.ok(!/tavan-asimi: 01_kutular/.test(r.stdout), 'risk bloğu düşülmeliydi:\n' + r.stdout);
  // aynı içerik risk bloğu OLMADAN yazılırsa tavan bulgusu DOĞAR (düşmenin tanığı)
  writeFileSync(kutuYolu, metin.replace('## Bağımlılık ve risk', '## Sıradan blok') + govdeDolgusu + riskSatirlari + '\n');
  const r2 = kos(kok);
  assert.ok(/tavan-asimi: 01_kutular/.test(r2.stdout), r2.stdout);
  temizle(kok);
});

test('EL_KITABI tavan satırı ile ayar ayrışırsa UYARI (sayılar ayardan okunur — §5④)', () => {
  const kok = kurulum();
  const ekYolu = join(kok, '02_kanon', 'EL_KITABI.md');
  writeFileSync(ekYolu, EK_TAM.replace('PANO 2KB', 'PANO 4KB'));
  const r = kos(kok);
  assert.ok(/UYARI \[tavan\] tavan-ayar-ayrismasi: PANO: EL_KITABI 4096B, ayar 2048B/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('içerik-sınıfı: EL_KITABI gövdesinden ≥200B birebir kopya → UYARI; altı → bulgu yok', () => {
  const kok = kurulum();
  // EL_KITABI'nın D-kuralları bloğunu (≥200B ardışık satır dizisi) NOTLAR'a kopyala
  const kopya = EK_TAM.split('\n').slice(3, 9).join('\n');
  assert.ok(Buffer.byteLength(kopya) >= 200, 'fixture kopyası 200B üstü olmalı: ' + Buffer.byteLength(kopya));
  writeFileSync(join(kok, '03_roller', 'koordinator', 'NOTLAR.md'), '# NOTLAR\n' + kopya + '\n');
  const r = kos(kok);
  assert.ok(/UYARI \[tavan\] icerik-sinifi: kural-atıf kopyası: 03_roller\/koordinator\/NOTLAR\.md/.test(r.stdout), r.stdout);

  // 200B altı tek satır alıntı serbesttir (işaretçi/kısa atıf yanlış bulgu üretmez)
  writeFileSync(join(kok, '03_roller', 'koordinator', 'NOTLAR.md'), '# NOTLAR\n## D-kuralları\n');
  const r2 = kos(kok);
  assert.ok(!/kural-atıf kopyası/.test(r2.stdout), r2.stdout);
  temizle(kok);
});

test('içerik-sınıfı: çok-satırlı kuyruk maddesi → UYARI; tek satır → bulgu yok', () => {
  const kok = kurulum();
  appendFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'),
    '- [ ] 2026-08-05 · koordinator · uzun soru · kaynak: oturum 9\n  devam satırı — maddeye taşan anlatı\n');
  const r = kos(kok);
  assert.ok(/UYARI \[tavan\] icerik-sinifi: çok-satırlı kuyruk maddesi: 00_pano\/SENDE_BEKLEYEN\.md satır 4/.test(r.stdout), r.stdout);

  const kok2 = kurulum();
  const r2 = kos(kok2);
  assert.ok(!/çok-satırlı kuyruk maddesi/.test(r2.stdout), r2.stdout);
  temizle(kok);
  temizle(kok2);
});
