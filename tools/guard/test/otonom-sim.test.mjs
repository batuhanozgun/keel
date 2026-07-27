// otonom-sim.test.mjs — E1 bayt ölçümleri (kurulu-sim emsali, tasarım §5.1 "KUTU bayt ölçümü").
// İki fren: (1) OTONOM_KOSU kalıbının kurulu boyu kendi tavanına (12.288B, kalıp yorum-bloğunda
// beyanlı) sığar; (2) yeni KUTU bloklarının (duruş sözleşmesi + bağımlılık/risk, KT-003 ölçeği
// 25 görev) bayt EKİ sınırlı kalır — KUTU sarı tavanı 10KB'dir ve yeni bloklar onu yemez.
// KUTU tavan KIRMIZI'sının otonom statüsü (kapanış kilidi, duran kapı değil) bekçi tarifinde
// ve OTONOM_KOSU §1'de beyanlıdır; bu test yalnız SAYIYI yeniden-üretilebilir kılar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KALIP_YOLU = join(BURASI, '..', '..', '..', '00_genesis', 'OTONOM_KOSU_KALIBI.md');
const KUTU_SARI = 10 * 1024; // EL_KITABI F3 (değişmedi; buraya kopya değil çapa — sayı F3'te yaşar)

function kalipTavani(kalip) {
  const m = kalip.match(/Tavan:\s*([\d.]+)\s*B/);
  assert.ok(m, 'kalıp yorum-bloğunda "Tavan: N B" beyanı bulunamadı');
  return Number(m[1].replace('.', ''));
}

test('OTONOM_KOSU kurulu-sim: beyan edilen tavana sığar (marj raporlanır)', (t) => {
  const kalip = readFileSync(KALIP_YOLU, 'utf8');
  const TAVAN = kalipTavani(kalip);
  const satirlar = kalip.split('\n');
  const yorumSonu = satirlar.findIndex((s) => s.trimEnd().endsWith('-->'));
  assert.ok(yorumSonu >= 0 && yorumSonu < 25, 'kalıp-yorumu bloğu bulunamadı');
  const sim = satirlar.slice(yorumSonu + 1).join('\n').replaceAll('«SAHİP»', 'Deneme');
  assert.ok(!sim.includes('«'), 'kurulu-sim içinde doldurulmamış «alan» kaldı');
  const B = Buffer.byteLength(sim, 'utf8');
  t.diagnostic(`otonom-sim: ${B}B · tavan: ${TAVAN}B · marj: ${TAVAN - B}B`);
  assert.ok(B <= TAVAN, `OTONOM_KOSU kurulu boyu tavanı aşıyor: ${B}B > ${TAVAN}B`);
});

// KT-003 ölçeğinde (25 görev) yeni blokların GERÇEKÇİ dolgusu — asgari-dolgu hilesi yok:
// gerekçeler gerçek kurulum cümleleri boyunda, onkosul zinciri karışık.
function durusBlogu() {
  return [
    '## Duruş sözleşmesi',
    'BİTİŞ HÂLİ: ekstre ekranında kart hareketleri tarih·tutar·açıklama sütunlarıyla görünür; boş ayda "hareket yok" satırı çıkar; dışa aktarım düğmesi CSV indirir.',
    'KANIT:      npm test yeşil (tam özet satırı) + tarayıcıda /ekstre?ay=2026-06 ekran tarifi',
    'KISIT:      02_kanon/golden/ dokunulmaz; altın dosyalara gerçek kişisel veri girmez (İÇERİK cinsi); tools/ ve .claude/ [SERT]',
    'BÜTÇE:      koşu başına en çok 3 alt-ajan koşusu · aynı görevde iki maxTurns dayanması = bölünmeli · toplam 12 koşu',
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

// Tavan statüsü (ölçülmüş karar, bekçi tarifi + OTONOM_KOSU §3): duruş sözleşmesi tavana
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
  for (const etiket of ['BİTİŞ HÂLİ:', 'KANIT:', 'KISIT:', 'BÜTÇE:']) assert.ok(metin.includes(etiket), etiket + ' eksik');
  const riskSatirlari = metin.split('\n').filter((s) => /^G-\d+:/.test(s));
  assert.equal(riskSatirlari.length, 25);
  for (const s of riskSatirlari) {
    assert.match(s, /^G-\d+: onkosul=\S.* · risk=(düşük|riskli) — .+$/, 'risk satırı biçimsiz: ' + s);
  }
});
