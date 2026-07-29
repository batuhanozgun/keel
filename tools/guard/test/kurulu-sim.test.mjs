// kurulu-sim.test.mjs — EL_KITABI kalıbının kurulu-boy ölçümü, YENİDEN-ÜRETİLEBİLİR (WF-2/WF-3).
// "Sığıyor" çıplak beyanla bitti (2026-07-21): sayı her test çalıştırmasında kalıptan yeniden üretilir ve
// TAP diagnostiğine basılır; marj 500B altına inen şablon eki bu testi KIRMIZI yapar —
// tavan sorusu sahibe gitmeden ek giremez (kalıp yorum-bloğundaki "Şablon-eki freni").
// Dolgu seti GERÇEK kurulumdan (tatbikat-v2, 2026-07-15) birebir — asgari-dolgu hilesine
// karşı gerçekçilik bekçisi ayrı test. Tavan sayısının tek kaynağı kurulum-denetimi.sh'tır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KALIP_YOLU = join(BURASI, '..', '..', '..', '00_genesis', 'EL_KITABI_KALIBI.md');
const BETIK_YOLU = join(BURASI, '..', 'kurulum-denetimi.sh');
const MARJ_FRENI = 500; // bayt — altına inen ek tavan sorusunu sahibe getirmek zorunda

// Gerçek kurulum dolguları (tatbikat-v2 02_kanon/EL_KITABI.md'den birebir; kadran TEK-CÜMLE
// GEREKÇELİ — kalıbın yorum-bloğu zorunlu kılar, asgari "TAM RİTÜEL" dolgusu gerçekçi değil).
const DOLGU = {
  yazarSatiri:
    '<!-- yazar: genesis (G3, 2026-07-15 tatbikat) — bakım: koordinator; içerik değişikliği sahip (Deneme) mührü ister (F6). -->',
  kadran: 'TAM RİTÜEL (tatbikat: tam yüzey doğrulaması)',
  sahip: 'Deneme',
  urunYolu: '04_urun/',
};

function kuruluSim() {
  const kalip = readFileSync(KALIP_YOLU, 'utf8');
  const satirlar = kalip.split('\n');
  // Kurulum dönüşümü (GENESIS G3.1): baştaki kalıp-yorumu silinir, yerine yazar satırı gelir.
  // Yorum sonu dinamik aranır (blok satır sayısı sabit varsayılmaz).
  const yorumSonu = satirlar.findIndex((s) => s.trimEnd().endsWith('-->'));
  assert.ok(yorumSonu >= 0 && yorumSonu < 25, 'kalıp-yorumu bloğu bulunamadı (--> ilk 25 satırda yok)');
  const govde = satirlar.slice(yorumSonu + 1).join('\n');
  const sim = (DOLGU.yazarSatiri + '\n' + govde)
    .replaceAll('«KADRAN»', DOLGU.kadran)
    .replaceAll('«SAHİP»', DOLGU.sahip)
    .replaceAll('«ÜRÜN-YOLU»', DOLGU.urunYolu);
  assert.ok(!sim.includes('«'), 'kurulu-sim içinde doldurulmamış «alan» kaldı');
  return Buffer.byteLength(sim, 'utf8');
}

function tavanOku() {
  const betik = readFileSync(BETIK_YOLU, 'utf8');
  const m = betik.match(/"\$BOYUT" -gt (\d+)/);
  assert.ok(m, 'kurulum-denetimi.sh içinde tavan koşulu bulunamadı');
  return Number(m[1]);
}

test('kurulu-sim tavana sığar ve marj-freni (≥500B) korunur', (t) => {
  const B = kuruluSim();
  const TAVAN = tavanOku();
  t.diagnostic(`kurulu-sim: ${B}B · tavan: ${TAVAN}B · marj: ${TAVAN - B}B`);
  assert.ok(B <= TAVAN, `kurulu-sim tavanı aşıyor: ${B}B > ${TAVAN}B`);
  assert.ok(
    TAVAN - B >= MARJ_FRENI,
    `marj-freni ihlali: marj ${TAVAN - B}B < ${MARJ_FRENI}B — şablon eki tavan sorusu sahibe gitmeden giremez`
  );
});

test('dolgu seti gerçekçi (asgari-dolgu hilesi teste giremez)', () => {
  assert.match(DOLGU.kadran, /^(TAM RİTÜEL|KÜÇÜK) \(.+\)$/, 'kadran tek-cümle gerekçesiz');
  assert.ok(DOLGU.sahip.length >= 4, 'sahip adı gerçekçi değil');
  assert.match(DOLGU.urunYolu, /\//, 'ürün-yolu dizin biçiminde değil');
  assert.ok(Buffer.byteLength(DOLGU.yazarSatiri, 'utf8') >= 100, 'yazar satırı gerçek kurulum boyunda değil');
});

test('F3 metnindeki tavan ↔ kurulum-denetimi sabiti eş (WF-2 sınıfı uyumsuzluğa kapı)', () => {
  const kalip = readFileSync(KALIP_YOLU, 'utf8');
  const m = kalip.match(/EL_KITABI (\d+)KB/);
  assert.ok(m, 'kalıp F3 satırında "EL_KITABI NKB" bulunamadı');
  assert.equal(Number(m[1]) * 1024, tavanOku(), 'F3 metni ile kurulum-denetimi tavanı ayrışmış');
});
