// KOKPİT SAHİP YÜZEYİDİR — ekrana basılan dizeler sahip dilinde olmak zorundadır (K18).
//
// NEDEN AYRI BİR KAPI: sahip kılavuzu (00_genesis/KILAVUZ_KALIBI.md) BİR KEZ okunur, kokpit
// HER GÜN bakılır. Aynı tanımsız terim burada daha çok zarar verir. K2'nin vekil okuru altı
// tanımsız terim saymıştı; beşinin sahip dilinde karşılığı vardı ve çıkarıldı. Bu kapı o
// beşinin kokpite geri sızmasını ölçer.
//
// `oturum` BU LİSTEDE YOK ve bu bilinçli: çıkarılmadı, TANIMLANDI (kılavuz §Günlük döngü —
// "yeni bir sohbet penceresi (oturum)"). Sahip kokpite kılavuzdan sonra bakar; kokpitin
// içindeki "nasıl kullanılır" düğmesi de o dosyayı gösterir.
//
// KAPSAM SINIRI — BEYANLI, ve artık KÖR NOKTASI KAPALI (U24, 2026-08-07): bu kapı YALNIZ
// K18'in beş terimini ölçer ve daha fazlasını ölçEMEZ, çünkü `kutu` · `sevk` · `faz` aynı
// dosyada hem sahibin cümlesi hem DEĞİŞKEN ADIdır (`state.kutu` · `k.fazA` · `var sevkte`);
// kaynağı tarayan bir kapı ikisini ayıramaz. Kalan sözlüğü ölçen kardeş kapı ayrı dosyada ve
// başka yönden bakıyor: `sahip-ekrani.test.mjs` app.js'i sanal bir kabukta KOŞTURUP ÇİZİLEN
// EKRANIN metnini tarar — değişken adı ekrana çıkmadığı için orada liste tam olabiliyor.
// İki kapı bilerek ayrı: bu kapı fixture'ın uğramadığı dizeyi de görür, öteki gerçeği görür.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.join(__dirname, '..');

// DİZE AYRIŞTIRMA DENENDİ VE ÇÜRÜDÜ (ölçüm, 2026-08-07). İlk yazım "sahibin gördüğü metin =
// tek tırnaklı dizeler" varsayıp /'((?:[^'\\]|\\.)*)'/g ile ayrıştırıyordu. Ölçüm: app.js'te
// tek tırnak sayısı 575 — TEK sayı, çünkü Türkçe YORUMLAR apostrof taşıyor (config'ten ·
// vault'a · ad'lar · md'yi). Sayı tek olunca eşleşmeler KAYIYOR ve kaynağın sonuna eklenen
// enjeksiyon "dize dışı" bölgeye düşüyordu: kapı yeşil basıyordu ama HİÇBİR ŞEY ölçmüyordu.
// Bozma testi bunu yakaladı — yeşil test kanıt değildir.
//
// Ayrıştırma yerine SATIR BAZLI ve FAIL-CLOSED tarama: yalnız TAM SATIR yorumları atılır,
// kalan satırın tamamı taranır. Yön bilinçli — fazladan yakalayabilir (satır sonu yorumuna
// yazılmış terim), ama KAÇIRMAZ. Yanlış-kırmızı çıkarsa çözüm yorumu tam satıra almaktır,
// kapıyı gevşetmek değil.
const EKRAN_DOSYALARI = ['public/app.js', 'lib/status.mjs'];
// TERİMLER KÖK HÂLİNDE YAZILIR — ölçüm 2026-08-07: `'iş paketleri'.includes('iş paketi')`
// FALSE döner, çünkü Türkçe çoğul eki iyelik ekinin yerine geçer (paket-ler-i ≠ paket-i).
// "iş paketi" yazılı bir kapı, "iş paketleri" yazan ekranı HİÇ GÖRMÜYORDU. Kök yazılınca
// çekimli hâllerin hepsi (paketi · paketleri · paketinin) tek dizeyle yakalanır. Kardeşleri
// zaten kök: gösterge→göstergeler · taze→tazelik · mercek→mercekler.
const K18_YASAGI = ['iş paket', 'bağımsız denetleyen', 'gösterge', 'taze', 'mercek'];

const kodSatirlari = (kaynak) => kaynak.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));
const tara = (kaynak) => {
  const bulgu = [];
  for (const l of kodSatirlari(kaynak)) {
    const s = l.toLocaleLowerCase('tr');
    for (const k of K18_YASAGI) if (s.includes(k)) bulgu.push({ terim: k, satir: l.trim() });
  }
  return bulgu;
};

test('kokpit ekran dizelerinde K18 terimleri geçmez', () => {
  for (const yol of EKRAN_DOSYALARI) {
    const bulgu = tara(readFileSync(path.join(KOK, yol), 'utf8'));
    assert.deepEqual(bulgu, [],
      `${yol}: sahibin ekranına tanımsız terim basılıyor — ` +
      bulgu.map((b) => `"${b.terim}" → ${b.satir.slice(0, 70)}`).join(' · '));
  }
});

test('sahip dili kapısı KIRMIZIYA DÖNÜYOR: her terim tek tek yakalanıyor', () => {
  // Yeşil test kanıt değildir; kırmızıya dönebilen test kanıttır. Enjeksiyon gerçek kaynağın
  // ÜSTÜNE yapılır — böylece hem tarayıcı hem taban metin birlikte sınanır.
  const taban = readFileSync(path.join(KOK, 'public/app.js'), 'utf8');
  assert.deepEqual(tara(taban), [], 'ön koşul: taban kaynak zaten temiz olmalı');
  for (const k of K18_YASAGI) {
    const bozuk = taban + `\nvar bozma = '${k} burada';\n`;
    assert.deepEqual(tara(bozuk).map((b) => b.terim), [k], `yasak terim yakalanmadı: "${k}"`);
  }
});

test('kapı TAM SATIR yorumunu ölçmez: yanlış-kırmızı üretmez', () => {
  // Yanlış-pozitif freni. Kapı yorumları da tarasaydı, bu dosyanın kendi açıklaması bile
  // kırmızı basardı ve ilk düzeltme "kapıyı sustur" olurdu — kapıyı öldüren tam da budur.
  const taban = readFileSync(path.join(KOK, 'public/app.js'), 'utf8');
  assert.deepEqual(tara(taban + '\n// taze gösterge mercek iş paketi\n'), [],
    'tam satır yorumundaki terim ekran metni sayıldı');
});
