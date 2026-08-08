// Çıktı yüzeyleri: makine satırı sözleşmesi (§1) · çıkış kodları (§2) · SAGLIK/PANO biçimi
// (PANO_SOZLESMESI, kırmızı çizgi) · arıza hattı. Oracle makine satırının ALANLARIDIR,
// warnings sayısı değil (sözleşme §8/2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { kurulum, kos, temizle } from './yardimci.mjs';

test('temiz kurulum: çıkış 0, makine satırı son satır ve alanları temiz', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.equal(r.rc, 0, 'stdout:\n' + r.stdout + '\nstderr:\n' + r.stderr);
  assert.ok(r.alanlar, 'makine satırı çözülemedi: ' + r.makine);
  assert.equal(r.alanlar.durduran, 0);
  assert.equal(r.alanlar.kilit, 0);
  assert.equal(r.alanlar.uyari, 0);
  assert.equal(r.alanlar.ariza, 0);
  assert.equal(r.alanlar.kadran, 'tam');
  assert.equal(r.alanlar.pencere, 'isletim');
  temizle(kok);
});

test('stdout hiçbir ciddiyet kelimesi taşımaz (sevk metin taraması geri dönmesin — §1)', () => {
  const kok = kurulum();
  rmSync(join(kok, '02_kanon', 'EL_KITABI.md')); // durduran üret: bulgu metinleri de tarama-temiz olmalı
  const r = kos(kok);
  assert.equal(r.alanlar.pencere, 'isletim');
  assert.ok(r.alanlar.durduran > 0);
  for (const kelime of ['KIRMIZI', 'SARI', 'YEŞİL', 'sari']) {
    assert.ok(!r.stdout.includes(kelime), "stdout '" + kelime + "' içeriyor:\n" + r.stdout);
  }
  temizle(kok);
});

test('durduran → çıkış 1; kilit/uyari çıkış kodunu değiştirmez (§2)', () => {
  const kok = kurulum();
  rmSync(join(kok, '02_kanon', 'EL_KITABI.md'));
  const r1 = kos(kok);
  assert.equal(r1.rc, 1);
  temizle(kok);

  const kok2 = kurulum();
  // KUTU'yu 1,5× üstüne şişir → KİLİT; durduran yok → çıkış 0. Dolgu risk bloğunun ÖNÜNE
  // konur: blok tavandan düşülür, sona eklenen dolgu bloğun içine düşer ve ölçülmezdi.
  const kutuYolu = join(kok2, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8').replace('## Bağımlılık ve risk', 'x'.repeat(16000) + '\n## Bağımlılık ve risk'));
  const r2 = kos(kok2);
  assert.ok(r2.alanlar.kilit >= 1, r2.stdout);
  assert.equal(r2.alanlar.durduran, 0);
  assert.equal(r2.rc, 0, 'kilit duran kapı değildir (OTONOM_DONEM §1): ' + r2.makine);
  temizle(kok2);
});

test('bekci.conf yok → arıza hattı: çıkış 2, ariza alanı dolu, makine satırı YİNE basılır', () => {
  const kok = kurulum();
  rmSync(join(kok, 'tools', 'bekci', 'bekci.conf'));
  const r = kos(kok);
  assert.equal(r.rc, 2);
  assert.ok(r.alanlar, 'arızada bile makine satırı basılır (fail-closed ölçülebilirlik): ' + r.makine);
  assert.ok(r.alanlar.ariza >= 1);
  temizle(kok);
});

test('bekci.conf biçimsiz satır → arıza (çıkış 2)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.conf'), 'kadran=tam\nBOZUK SATIR\n');
  const r = kos(kok);
  assert.equal(r.rc, 2);
  assert.ok(r.alanlar.ariza >= 1);
  temizle(kok);
});

test('SAGLIK: kanonik damga + kokpit desenleriyle bayt-uyum (kırmızı çizgi)', () => {
  const kok = kurulum();
  kos(kok);
  const saglik = readFileSync(join(kok, '00_pano', 'SAGLIK.md'), 'utf8');
  // status.mjs:94 damga deseni — yeni kurulum KANONİK yazımı üretir (PANO_SOZLESMESI:63-66)
  const damga = saglik.match(/son (?:denetim|koşu):\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\((?:denetim|koşu) #(\d+)\)/);
  assert.ok(damga, saglik);
  assert.ok(saglik.includes('son denetim:'), 'eski yazım üretilmez');
  // status.mjs:101 ışık deseni
  assert.ok(/\*\*Işıklar:\*\*\s*AKIŞ=YEŞİL · DOSYA=YEŞİL/.test(saglik), saglik);
  // status.mjs:104 kalem deseni
  assert.ok(/^-\s*\[i\]\s*.+$/m.test(saglik), saglik);
  temizle(kok);
});

test('SAGLIK: denetim sayacı her koşuda artar', () => {
  const kok = kurulum();
  kos(kok);
  kos(kok);
  const saglik = readFileSync(join(kok, '00_pano', 'SAGLIK.md'), 'utf8');
  assert.ok(saglik.includes('(denetim #2)'), saglik);
  temizle(kok);
});

test('PANO: mekanik blok kokpit biçiminde, YARGI bloğu korunur, sayaç satırı yazılır', () => {
  const kok = kurulum();
  kos(kok);
  const pano = readFileSync(join(kok, '00_pano', 'PANO.md'), 'utf8');
  const blok = pano.match(/## MEKANİK BLOK[^\n]*\n```\n([\s\S]*?)\n```/); // status.mjs:50 deseni
  assert.ok(blok, pano);
  assert.ok(/Son denetim:\s*\d{4}-\d{2}-\d{2} \d{2}:\d{2}\s*\(denetim #\d+\)/.test(blok[1]), blok[1]);
  assert.ok(/Işıklar: AKIŞ=YEŞİL · DOSYA=YEŞİL/.test(blok[1]), blok[1]);
  assert.ok(/Görevler: G-01=açık · G-02=açık/.test(blok[1]), blok[1]);
  assert.ok(/Kırmızı:\s*0 · Sarı:\s*0/.test(blok[1]), blok[1]); // status.mjs:76 deseni
  // PANO sayacı (BEKCI_TARIFI md.18/1): açık madde sayısı; kokpit tanımadığı satırı atlar
  assert.ok(blok[1].includes('Sahipte bekleyen: 1'), blok[1]);
  // YARGI bloğu koordinatörün — bekçi ezmez (F1 istisna 1)
  assert.ok(pano.includes('- **SIRADAKİ OTURUM:** koordinator — plan'), pano);
  temizle(kok);
});

// ── Sıra kimde? (U17) ──────────────────────────────────────────────────────────────────
// Kokpitin sahibe "sıra sende" mi yoksa "sistem kendi başına çalışıyor" mu diyeceğini
// belirleyen TEK makine değeri. Kokpit tahmin etmez; burada yazılanı okur.
// Üç hâlin ÜÇÜ de ölçülür: değer yazılmasaydı kokpit eskisi gibi her hâlde sahibi davet
// ederdi — koşan işin üstüne.
const donemGosterge = (kok, icerik) => {
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), icerik);
};
const mekanikBlok = (kok) => readFileSync(join(kok, '00_pano', 'PANO.md'), 'utf8')
  .match(/## MEKANİK BLOK[^\n]*\n```\n([\s\S]*?)\n```/)[1];

test('Sıra: dönem göstergesi yokken sahiptedir (el-sürüşlü günlük döngü)', () => {
  const kok = kurulum();
  kos(kok);
  assert.match(mekanikBlok(kok), /^Sıra: sahip$/m, mekanikBlok(kok));
  temizle(kok);
});

test('Sıra: gösterge varken sistemdedir — sahip oturum açmaya davet EDİLMEZ', () => {
  const kok = kurulum();
  donemGosterge(kok, 'DONEM-7\tKT-001-proje-plani\tyapim\tgercek\ndamga\t2026-08-08T10:00:00Z\n');
  kos(kok);
  assert.match(mekanikBlok(kok), /^Sıra: sistem$/m, mekanikBlok(kok));
  temizle(kok);
});

test('Sıra: gösterge var ama kimliksizse "bilinmiyor" — bilmediğimize "sıra sende" denmez', () => {
  const kok = kurulum();
  donemGosterge(kok, '\n'); // dosya var, ilk alan boş: bozuk gösterge
  kos(kok);
  assert.match(mekanikBlok(kok), /^Sıra: bilinmiyor$/m, mekanikBlok(kok));
  temizle(kok);
});

test('DOSYA ışığı: kilit → KIRMIZI (kapanış kilidi sahibin ezberinde görünür); uyari → SARI', () => {
  const kok = kurulum();
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8').replace('## Bağımlılık ve risk', 'x'.repeat(16000) + '\n## Bağımlılık ve risk'));
  kos(kok);
  const saglik = readFileSync(join(kok, '00_pano', 'SAGLIK.md'), 'utf8');
  assert.ok(saglik.includes('AKIŞ=YEŞİL · DOSYA=KIRMIZI'), saglik);
  temizle(kok);
});

test('kurulum penceresi: pencere=kurulum ilan edilir; göz BİLGİye düşer; kablo TAM kalır (§3)', () => {
  const kok = kurulum({ kurulumTamam: false });
  // [SERT] kirlilik üret: işletimde DURDURAN olurdu, pencerede BİLGİ
  writeFileSync(join(kok, 'tools', 'guard', 'yeni-dosya.txt'), 'kirli\n');
  const r = kos(kok);
  assert.equal(r.alanlar.pencere, 'kurulum');
  assert.equal(r.alanlar.durduran, 0, 'pencerede kirlilik BİLGİdir: ' + r.stdout);
  assert.equal(r.rc, 0);
  temizle(kok);

  // kablo denetimi pencerede de tamdır: settings.json bozuk → DURDURAN
  const kok2 = kurulum({ kurulumTamam: false });
  writeFileSync(join(kok2, '.claude', 'settings.json'), '{bozuk');
  const r2 = kos(kok2);
  assert.equal(r2.alanlar.pencere, 'kurulum');
  assert.ok(r2.alanlar.durduran >= 1, 'kablo her zaman tamdır: ' + r2.stdout);
  assert.equal(r2.rc, 1);
  temizle(kok2);
});

test('K24: ayar okunamayınca kapsam izi "tarandı" DEMEZ (sahte-yeşilin en ucuz biçimi)', () => {
  // Kapsam izi `if (conf)` bloğunun DIŞINDAydı: bekci.conf okunamayınca 28 gözün hiçbiri
  // koşmuyor ama sahip yüzeyi dört kategori için "tarandı" diyordu. Arıza satırı ayrıca
  // düşüyordu — o satır bu cümleyi YALANLAMIYOR, yanında duruyordu.
  const kok = kurulum();
  rmSync(join(kok, 'tools', 'bekci', 'bekci.conf'));
  const r = kos(kok);
  assert.equal(r.rc, 2);
  assert.ok(!/kapsam: tarandı/.test(r.stdout),
    'gözler hiç koşmadan "tarandı" basıldı: ' + r.stdout);
  for (const kat of ['tavan', 'şema', 'koruma-hattı', 'bağ-varlık']) {
    assert.ok(r.stdout.includes('[' + kat + '] kapsam: TARANMADI'),
      kat + ' kategorisi taranmadığını SÖYLEMİYOR: ' + r.stdout);
  }
  temizle(kok);
});

test('K24 TERS YÖN: ayar yerindeyken kapsam izi yine "tarandı" der (yanlış-pozitif kapısı)', () => {
  const kok = kurulum();
  const r = kos(kok);
  for (const kat of ['tavan', 'şema', 'koruma-hattı', 'bağ-varlık']) {
    assert.ok(r.stdout.includes('[' + kat + '] kapsam: tarandı'),
      kat + ' taranmış olmasına rağmen izi yok: ' + r.stdout);
  }
  temizle(kok);
});
