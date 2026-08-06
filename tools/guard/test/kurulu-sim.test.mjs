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

test('hasım #13: şablon bekci.conf tavanları ↔ kalıp F3 kalemleri bire bir eş (kuruluş günü UYARI doğmasın)', () => {
  // Çekirdeğin tavan-ayar-ayrismasi gözü kurulu projede ikisini karşılaştırır; şablonun kendi
  // içinde ayrışırsa her yeni kurulum ilk koşuda UYARI ile doğar. Eşliği burada tartıyoruz.
  const conf = readFileSync(join(BURASI, '..', '..', 'bekci', 'bekci.conf'), 'utf8');
  const confDeger = {};
  for (const m of conf.matchAll(/^tavan_([a-z_]+)=(\d+)$/gm)) confDeger[m[1]] = Number(m[2]);
  const kalip = readFileSync(KALIP_YOLU, 'utf8');
  const capa = '**Tavanlar (sarı eşik):**';
  const yer = kalip.indexOf(capa);
  assert.ok(yer > 0, 'kalıpta Tavanlar çapası yok');
  const parca = kalip.slice(yer + capa.length, yer + capa.length + 600).split('Sarı = uyarı')[0].replace(/\n/g, ' ');
  const esle = { PANO: 'pano', SAGLIK: 'saglik', DURUM: 'durum', KUTU: 'kutu', ERTELENENLER: 'ertelenenler', SENDE_BEKLEYEN: 'sende_bekleyen', BRIFING: 'brifing', NOTLAR: 'notlar', EL_KITABI: 'el_kitabi' };
  let sayilan = 0;
  for (const kalem of parca.split(' · ')) {
    const m = kalem.trim().match(/^([A-ZÇĞİÖŞÜ_]+)\s+(\d+)KB/);
    if (!m || !esle[m[1]]) continue;
    sayilan += 1;
    assert.equal(confDeger[esle[m[1]]], Number(m[2]) * 1024, m[1] + ': conf ile F3 ayrışmış');
  }
  assert.equal(sayilan, 9, 'F3 satırında 9 kalemin 9\'u da çözülmeli (çözülmeyen kalem sessiz kaçak olur)');
});
