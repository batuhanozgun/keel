// betik-hijyeni.test.mjs — kabuk betiklerinin YAPISAL sağlığı (E3, 2026-07-28).
// Doğuş hikâyesi: E3 uygulamasında AYNI SINIF kusur iki kez çıktı — tek-tırnakla açılan node
// bloğunun İÇİNDE Türkçe apostrof ("E1'in", "KALEMLER'de") bash dizesini erken kapatıyor.
// Tek sayıda apostrof → sözdizimi hatası (gürültülü, yakalanır). ÇİFT sayıda apostrof → hata
// YOK: bash aradaki parçayı tırnak DIŞINDA sayar, orada $degisken genişler ve `komut` koşar —
// SESSİZ ve tehlikeli. Ayrıca macOS bash 3.2'de ASCII olmayan karaktere bitişik $degisken
// («$capa») değişken adına o karakterin baytını katar ve dal "unbound variable" ile ölür
// (E3 karar-alani.sh'ta yaşandı: aşınma denetimi hiç koşmuyormuş).
// Bu üç denetim, kapsam-tabanlı testlerin AKSİNE, kod yolu hiç koşulmasa da yakalar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK = join(BURASI, '..', '..', '..');

function betikler(dizin, biriken = []) {
  for (const ad of readdirSync(dizin)) {
    const y = join(dizin, ad);
    if (statSync(y).isDirectory()) {
      if (ad === 'node_modules' || ad === '.git') continue;
      betikler(y, biriken);
    } else if (ad.endsWith('.sh')) biriken.push(y);
  }
  return biriken;
}
const HEPSI = betikler(join(KOK, 'tools'));

test('betik hijyeni: tools altındaki her .sh sözdizimi geçerli (bash -n)', () => {
  assert.ok(HEPSI.length >= 8, `beklenenden az betik bulundu: ${HEPSI.length}`);
  for (const y of HEPSI) {
    const r = spawnSync('bash', ['-n', y], { encoding: 'utf8' });
    assert.equal(r.status, 0, `sözdizimi hatası: ${relative(KOK, y)}\n${r.stderr}`);
  }
});

test('betik hijyeni: tek-tırnaklı gömülü blokların içinde apostrof YOK (sessiz tırnak kırılması)', () => {
  // Kaba ama etkili tarama: `-e '` ile açılan bloğun ilk satırından, satır başında `'` ile
  // kapanan satıra kadar olan aralıkta apostrof aranır. Yanlış-pozitif olursa blok yeniden
  // yazılmalıdır (apostrofu kaçırmak yerine kelimeyi değiştirmek KURALDIR — okunur kalsın).
  for (const y of HEPSI) {
    const satirlar = readFileSync(y, 'utf8').split('\n');
    let icinde = false, basSatir = 0;
    for (let i = 0; i < satirlar.length; i++) {
      const s = satirlar[i];
      if (!icinde) {
        if (/-e\s+'\s*$/.test(s)) { icinde = true; basSatir = i + 1; }
        continue;
      }
      if (/^'/.test(s)) { icinde = false; continue; }   // blok kapandı
      // BİLİNÇLİ kaçış idiomu muaf: '\'' (kapat–kaçır–aç) doğru bash'tir ve file-guard'da
      // fiilen kullanılır. Muafiyet dar: yalnız bu birebir dizi soyulur, kalan apostrof kusurdur.
      const kalan = s.split("'\\''").join('');
      assert.ok(!kalan.includes("'"),
        `${relative(KOK, y)}:${i + 1} — tek-tırnaklı gömülü blok içinde apostrof var (blok ${basSatir}. satırda açıldı).\n` +
        `Bu, bash dizesini erken kapatır; çift sayıda olursa SESSİZCE genişletme/komut koşturur.\n` +
        `Satır: ${s.trim().slice(0, 120)}`);
    }
  }
});

test('betik hijyeni: kabuk betiklerinde NUL baytı YOK (görünmez düzenleme kazası)', () => {
  // Doğuş (E4, 2026-07-28): düzenleme sırasında iki ayrı yerde `" "` dizesi NUL baytına
  // dönüştü. `bash -n` bunu YAKALAMAZ (NUL'u sessizce atar), gözle de görünmez, ama gömülü
  // node bloğunda ayraç olarak kullanılan dize bozulur ve karşılaştırma sessizce başarısız
  // olur. Bu, "kapsam-tabanlı test kod yolu koşulmazsa yakalamaz" sınıfının bir üyesidir.
  for (const y of HEPSI) {
    const b = readFileSync(y);
    assert.ok(!b.includes(0),
      `${relative(KOK, y)} — dosyada NUL baytı var (düzenleme kazası; bash -n bunu yakalamaz).\n` +
      `Muhtemelen bir dize ayracı bozulmuş: dosyayı aç ve NUL'u doğru karakterle değiştir.`);
  }
});

test('betik hijyeni: ASCII olmayan karaktere bitişik $degisken süslü parantezli (bash 3.2)', () => {
  // «$capa» → bash 3.2 değişken adına »'in baytını katar: "unbound variable", dal sessiz ölür.
  // Doğrusu «${capa}». Tarama yalnız açık tehlikeyi arar: $ad hemen ardından ASCII-dışı bayt.
  const desen = /\$[A-Za-z_][A-Za-z0-9_]*(?=[^\x00-\x7F])/;
  for (const y of HEPSI) {
    const satirlar = readFileSync(y, 'utf8').split('\n');
    for (let i = 0; i < satirlar.length; i++) {
      const s = satirlar[i];
      if (s.trimStart().startsWith('#')) continue;      // yorumda zararsız
      assert.ok(!desen.test(s),
        `${relative(KOK, y)}:${i + 1} — ASCII olmayan karaktere bitişik $degisken (macOS bash 3.2 değişken adına o baytı katar).\n` +
        `Süslü parantez kullan: \${degisken}.\nSatır: ${s.trim().slice(0, 120)}`);
    }
  }
});
