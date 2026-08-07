// otonom-sim.test.mjs — E1 bayt ölçümleri (kurulu-sim emsali, tasarım §5.1 "KUTU bayt ölçümü").
// İki fren: (1) OTONOM_DONEM kalıbının kurulu boyu tavanına sığar (sayı bu dosyada SABİT,
// kalıptaki beyanla eşleşmesi ayrıca denetlenir — hasım bulgusu 2026-07-28); (2) yeni KUTU bloklarının (duruş sözleşmesi + bağımlılık/risk, KT-003 ölçeği
// 25 görev) bayt EKİ sınırlı kalır — KUTU sarı tavanı 10KB'dir ve yeni bloklar onu yemez.
// KUTU tavan KIRMIZI'sının otonom statüsü (kapanış kilidi, duran kapı değil) bekçi tarifinde
// ve OTONOM_DONEM §1'de beyanlıdır; bu test yalnız SAYIYI yeniden-üretilebilir kılar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KALIP_YOLU = join(BURASI, '..', '..', '..', '00_genesis', 'OTONOM_DONEM_KALIBI.md');
const KUTU_SARI = 10 * 1024; // EL_KITABI F3 (değişmedi; buraya kopya değil çapa — sayı F3'te yaşar)

// TAVAN SAYILARI BURADA SABİTTİR (hasım bulgusu 2026-07-28): eskiden test, tavanı ölçtüğü
// dosyanın KENDİ yorum satırından okuyordu — metni büyüten kişi aynı düzenlemede sayıyı da
// büyütünce hem tavan testi hem marj freni yeşil kalıyordu, yani fren fren değildi.
// Artık tavanı değiştirmek İKİ ayrı dosyada bilinçli edim ister ve diff'te görünür.
// OTONOM_DONEM 17.664 -> 17.920 (K3 hasım turu, 2026-08-07). BEYAN — ölçülen, tahmin değil:
// açılış mührü her kutunun zorunlusu oldu ve sözleşmede yazılı olmak ZORUNDA (kapı her kutuya
// işlerken satırın evi yalnız ilk kutunun kalıbıydı — KT-002 duvara çarpardı). Metin asgariye
// indirildi (700 -> ~200 B) ama dosya zaten marjın dibindeydi (495 B): herhangi bir ekleme
// beyan istiyordu. SONRAKİ ARTIŞ YİNE BEYAN İSTER.
const TAVANLAR = { OTONOM_DONEM: 17920, KARAR_ALANI: 8192 };

function kalipTavani(kalip, ad) {
  const m = kalip.match(/Tavan:\s*([\d.]+)\s*B/);
  assert.ok(m, 'kalıp yorum-bloğunda "Tavan: N B" beyanı bulunamadı');
  const beyan = Number(m[1].replace('.', ''));
  assert.equal(beyan, TAVANLAR[ad],
    `kalıptaki tavan beyanı (${beyan}B) testteki sabitle (${TAVANLAR[ad]}B) uyuşmuyor — tavan değişikliği İKİ dosyada birden, bilinçli olarak yapılır`);
  return beyan;
}

// Kurulu-sim üretici: kalıp yorum bloğu atılır, «alanlar» doldurulur.
function kuruluSim(kalip, alanlar = { '«SAHİP»': 'Deneme' }) {
  const satirlar = kalip.split('\n');
  const yorumSonu = satirlar.findIndex((s) => s.trimEnd().endsWith('-->'));
  assert.ok(yorumSonu >= 0 && yorumSonu < 40, 'kalıp-yorumu bloğu bulunamadı');
  let sim = satirlar.slice(yorumSonu + 1).join('\n');
  for (const [a, d] of Object.entries(alanlar)) sim = sim.replaceAll(a, d);
  return sim;
}

test('OTONOM_DONEM kurulu-sim: beyan edilen tavana sığar (marj raporlanır)', (t) => {
  const kalip = readFileSync(KALIP_YOLU, 'utf8');
  const TAVAN = kalipTavani(kalip, "OTONOM_DONEM");
  const sim = kuruluSim(kalip);
  assert.ok(!sim.includes('«'), 'kurulu-sim içinde doldurulmamış «alan» kaldı');
  const B = Buffer.byteLength(sim, 'utf8');
  t.diagnostic(`otonom-sim: ${B}B · tavan: ${TAVAN}B · marj: ${TAVAN - B}B`);
  assert.ok(B <= TAVAN, `OTONOM_DONEM kurulu boyu tavanı aşıyor: ${B}B > ${TAVAN}B`);
});

// MARJ FRENİ (E3, 2026-07-27): kurulu-sim/EL_KITABI emsali. Tavanın kendisi bir TAHMİNDİR;
// fren, tavanın "yeni metin sığmadı" baskısıyla sessizce büyütülmesini engeller — marj 500B'nin
// altına inen ek, tavan kararını YENİDEN aldırır (E1'in 12.288'i dört evreye 658B pay bırakmıştı
// ve E3'te fark edildi; o gecikme bu frenin doğuş sebebidir).
const OTONOM_MARJ_FRENI = 500;
test('OTONOM_DONEM marj freni: tavana 500B kalmadan ek giremez', (t) => {
  const kalip = readFileSync(KALIP_YOLU, 'utf8');
  const TAVAN = kalipTavani(kalip, "OTONOM_DONEM");
  const B = Buffer.byteLength(kuruluSim(kalip), 'utf8');
  const marj = TAVAN - B;
  t.diagnostic(`otonom-sim marj: ${marj}B (fren: ${OTONOM_MARJ_FRENI}B)`);
  assert.ok(marj >= OTONOM_MARJ_FRENI,
    `OTONOM_DONEM marjı frenin altında: ${marj}B < ${OTONOM_MARJ_FRENI}B — metni sıkıştır ya da tavan kararını yeniden al (kalıp yorum bloğunda beyanla)`);
});

// KARAR ALANI kalıbı (E3): kendi tavanı + Bölüm A'nın bütünlüğü. Bölüm A KEEL-geneldir ve
// kurulumda DOLDURULMAZ — kopyalanır; aşınması karar-alanı denetçisinin KIRMIZI'sıdır.
const KARAR_KALIP_YOLU = join(BURASI, '..', '..', '..', '00_genesis', 'KARAR_ALANI_KALIBI.md');
test('KARAR_ALANI kurulu-sim: tavana sığar + Bölüm A sekiz madde', (t) => {
  const kalip = readFileSync(KARAR_KALIP_YOLU, 'utf8');
  const TAVAN = kalipTavani(kalip, "KARAR_ALANI");
  const sim = kuruluSim(kalip, {
    '«SAHİP»': 'Deneme',
    '«BİLİR — yalnız sahipte olan ham bilgi ve tercih: hayatı/işi/parası, ürünün amacı ve "bu kadarı\nyeter" hissi, kapsam tercihi, karar verme tarzı. Madde madde, her madde tek satır.»': '- doldurulmuş örnek',
  });
  const B = Buffer.byteLength(sim, 'utf8');
  t.diagnostic(`karar-alani-sim: ${B}B · tavan: ${TAVAN}B · marj: ${TAVAN - B}B`);
  assert.ok(B <= TAVAN, `KARAR_ALANI kalıbı tavanı aşıyor: ${B}B > ${TAVAN}B`);
  // Bölüm A'nın 8 maddesi + üç çapa (karar-alani.sh bunları arar — desen ile metin birlikte yaşar)
  for (let i = 1; i <= 8; i++) {
    assert.ok(new RegExp(`^${i}\\. `, 'm').test(kalip), `Bölüm A ${i}. madde yok`);
  }
  for (const capa of ['bilgi kaynağı değildir', 'Türetilebilen sorulmaz', 'eşleşmeyen cevap']) {
    assert.ok(kalip.includes(capa), `Bölüm A çapası kalıpta yok: ${capa}`);
  }
  assert.ok(kalip.includes('## Bölüm A') && kalip.includes('## Bölüm B'), 'iki bölüm başlığı da olmalı');
});

// KT-003 ölçeğinde (25 görev) yeni blokların GERÇEKÇİ dolgusu — asgari-dolgu hilesi yok:
// gerekçeler gerçek kurulum cümleleri boyunda, onkosul zinciri karışık.
function durusBlogu() {
  return [
    '## Duruş sözleşmesi',
    'BİTİŞ HÂLİ: ekstre ekranında kart hareketleri tarih·tutar·açıklama sütunlarıyla görünür; boş ayda "hareket yok" satırı çıkar; dışa aktarım düğmesi CSV indirir.',
    'KANIT:      npm test yeşil (tam özet satırı) + tarayıcıda /ekstre?ay=2026-06 ekran tarifi',
    'KISIT:      02_kanon/golden/ dokunulmaz; altın dosyalara gerçek kişisel veri girmez (İÇERİK cinsi); tools/ ve .claude/ [SERT]',
    'BÜTÇE:      dönem başına en çok 3 ÜRETİM çağrısı · aynı görevde iki maxTurns dayanması = bölünmeli · toplam 12 dönem',
    'İZİN:       git-obje korumali-yol',
    '',
  ].join('\n');
}
function riskBlogu(gorevSayisi) {
  const risk = ['## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)'];
  for (let i = 1; i <= gorevSayisi; i++) {
    const on = i <= 2 ? 'yok' : `G-${String(i - 1).padStart(2, '0')}${i % 4 === 0 ? ` G-${String(i - 2).padStart(2, '0')}` : ''}`;
    const riskli = i % 5 === 0;
    risk.push(
      `G-${String(i).padStart(2, '0')}: onkosul=${on} · risk=${riskli ? 'riskli' : 'düşük'} — ${
        riskli ? 'gerçek ekstre verisiyle çalışır, sentetik kopya zorunlu' : 'yalnız iskelet/rapor üretir, geri alınabilir'
      }`
    );
  }
  return risk.join('\n') + '\n';
}
const yeniBloklar = (n) => durusBlogu() + riskBlogu(n);

// Tavan statüsü (ölçülmüş karar, bekçi tarifi + OTONOM_DONEM §3): duruş sözleşmesi tavana
// DAHİL (insan da okur) ve küçük kalmalı; risk bloğu MAKİNE-OKUR, tavan ölçümünden DÜŞÜLÜR —
// ilk ölçüm 25 görevde ~2,9KB = sarı tavanın ~%29'u çıktı, dahil sayılsaydı tavanı yerdi.
test('KUTU-sim (25 görev): duruş tavana dahil ve küçük; risk bloğu tavan-dışı (sayı raporlanır)', (t) => {
  const durus = Buffer.byteLength(durusBlogu(), 'utf8');
  const risk = Buffer.byteLength(riskBlogu(25), 'utf8');
  t.diagnostic(`duruş (tavana DAHİL): ${durus}B · risk bloğu (tavan-DIŞI, makine-okur): ${risk}B · KUTU sarı tavanı: ${KUTU_SARI}B`);
  assert.ok(durus <= 1024, `duruş sözleşmesi tavanı yiyor: ${durus}B > 1024B — tavan sorusu sahibe gitmeden bu şema giremez`);
  assert.ok(risk >= 2000, 'risk-bloğu dolgusu gerçekçiliğini yitirmiş (asgari-dolgu hilesi?) — ölçümün anlamı kaybolur');
});

test('KUTU-sim şeması bekçi tarifinin aradığı biçimle eş (satır desenleri)', () => {
  const metin = yeniBloklar(25);
  for (const etiket of ['BİTİŞ HÂLİ:', 'KANIT:', 'KISIT:', 'BÜTÇE:', 'İZİN:']) assert.ok(metin.includes(etiket), etiket + ' eksik');
  const riskSatirlari = metin.split('\n').filter((s) => /^G-\d+:/.test(s));
  assert.equal(riskSatirlari.length, 25);
  for (const s of riskSatirlari) {
    assert.match(s, /^G-\d+: onkosul=\S.* · risk=(düşük|riskli) — .+$/, 'risk satırı biçimsiz: ' + s);
  }
});
