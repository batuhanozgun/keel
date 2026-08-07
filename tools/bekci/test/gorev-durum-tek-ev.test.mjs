// gorev-durum-tek-ev.test.mjs — görev durum sözlüğünün ve ÜRETİM/KAPANIŞ ayrımının TEK EVİ
// (tools/bekci/gorev-durumlari.txt) fiilen tek ev mi? (K5 · U2 · U3, 2026-08-08)
//
// ÖLÇÜLEN VAAT: `mühür-bekliyor` cinsi sevk ile bekçide AYNI anlama gelir. Doğuş, ölçülmüş bir
// çelişkiydi: sevk onu AÇIK üretim görevi sayıyordu (`acikVar`) ve yalnız mühür bekleyen görevi
// kalan kutu kapanış evresine hiç girmeden DURAN KAPIda ölüyordu; bekçi ise aynı görevi kapanış
// tarafında sayıp kapanış kilidini sevkten bir tur ÖNCE ateşliyordu. Aynı görev, iki makinede
// iki hâl.
//
// KIRMIZIYA DÖNEBİLİRLİK — bu dosyanın ekseni: gömülü kopyayı METİN TARAMASIYLA aramak kırılgan
// bir kapıdır (aynı durum dizeleri sevkin sevk-edilebilirlik dallarında meşru olarak geçer).
// Bunun yerine tek evin YÜK TAŞIDIĞI ölçülür: fixture'ın KENDİ kopyasında ayrım ters çevrilir ve
// bekçinin hükmünün onunla birlikte döndüğü görülür. Gömülü kopyası olan bir çekirdek bu testte
// kızarır. Sevk ayağının aynası: tools/guard/test/sevk-e4.test.mjs (K5 blokları).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kurulum, kos, temizle, KUTU_METNI } from './yardimci.mjs';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const EV = join(BURASI, '..', 'gorev-durumlari.txt');
const KUTU_REL = '01_kutular/KT-001-proje-plani/KUTU.md';

function evOku(metin) {
  const kume = { uretimde: [], kapanista: [] };
  for (const ham of metin.split('\n')) {
    const satir = ham.trim();
    if (!satir || satir.startsWith('#')) continue;
    const m = satir.match(/^(uretimde|kapanista):(.+)$/);
    assert.ok(m, 'biçimsiz kalem: ' + satir);
    kume[m[1]].push(m[2].trim());
  }
  return kume;
}

// Kutu metnini görev durumlarıyla yeniden kurar; `## Kabul kriterleri` bloğu DEĞİŞMEZ
// (ölçüt-diff gözü taban'a diff'liyor — fixture oradan yanlış bulgu üretmemeli).
function kutuDurumlarla(durumlar) {
  const satirlar = KUTU_METNI.split('\n');
  let i = 0;
  return satirlar.map((s) => {
    if (!/^\|\s*G-\d+\b/.test(s)) return s;
    const h = s.split('|');
    h[4] = ' ' + durumlar[i++] + ' ';
    return h.join('|');
  }).join('\n');
}

// ── 1 · Tek evin kendisi ─────────────────────────────────────────────────────────────────

test('tek ev iki sınıfa bölünmüş beş durum taşır ve sözlük ikisinin BİRLEŞİMİDİR', () => {
  const kume = evOku(readFileSync(EV, 'utf8'));
  assert.deepEqual(kume.uretimde, ['açık', 'sürüyor']);
  assert.deepEqual(kume.kapanista, ['mühür-bekliyor', 'kapalı', 'pas']);
  const sozluk = [...kume.uretimde, ...kume.kapanista];
  assert.equal(new Set(sozluk).size, 5, 'aynı durum iki sınıfta birden olamaz');
});

test('sahip yüzeyindeki sözlük (EL_KITABI kalıbı) tek evle EŞ — üçüncü kopya bayatlarsa kızarır', () => {
  // Sözlüğün sahibe anlatılan hâli kalıptadır; makine hâli tek evdedir. İkisini test eşler:
  // el-kitabi-zorunlu.txt emsali (sözleşme §5①).
  const kume = evOku(readFileSync(EV, 'utf8'));
  const kalip = readFileSync(join(KOK_REPO, '00_genesis', 'EL_KITABI_KALIBI.md'), 'utf8');
  const satir = kalip.split('\n').find((s) => s.startsWith('**Görev durum sözlüğü'));
  assert.ok(satir, 'kalıpta görev durum sözlüğü satırı yok — sahip yüzeyi evsiz kaldı');
  const kalipKume = (satir.match(/`([^`]+)`/g) || []).map((x) => x.slice(1, -1));
  assert.deepEqual(kalipKume, [...kume.uretimde, ...kume.kapanista],
    'kalıptaki sözlük tek evle aynı sırada ve aynı kalemlerle olmalı');
});

test('çekirdek sözlüğü TEK EVDEN okur (gömülü küme geri dönmemiş)', () => {
  const kaynak = readFileSync(join(BURASI, '..', 'cekirdek.mjs'), 'utf8');
  assert.match(kaynak, /tools', 'bekci', 'gorev-durumlari\.txt/, 'çekirdek tek evi okumalı');
  assert.ok(!/\['kapalı', 'mühür-bekliyor', 'pas'\]/.test(kaynak),
    'gömülü kapanış kümesi geri dönmüş — tek ev delik');
  assert.ok(!/\['açık', 'sürüyor'\]/.test(kaynak),
    'gömülü üretim kümesi geri dönmüş — tek ev delik');
});

test('sevk sözlüğü TEK EVDEN okur (gömülü DURUM_SOZ geri dönmemiş)', () => {
  const kaynak = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'sevk.sh'), 'utf8');
  assert.match(kaynak, /tools", "bekci", "gorev-durumlari\.txt/, 'sevk tek evi okumalı');
  assert.ok(!/new Set\(\["açık", "sürüyor"/.test(kaynak),
    'sevkin gömülü DURUM_SOZ kopyası geri dönmüş — tek ev delik');
});

// ── 2 · Bekçinin hükmü tek evi DİNLİYOR mu (yük taşıyor mu) ──────────────────────────────

test('mühür-bekliyor görevli kutu KAPANIŞTA sayılır: bayat brifing kapanış KİLİDİ basar', () => {
  const kok = kurulum();
  try {
    writeFileSync(join(kok, KUTU_REL), kutuDurumlarla(['kapalı', 'mühür-bekliyor']));
    const r = kos(kok);
    assert.equal(r.alanlar.kilit, 1, 'kapanış kilidi bekleniyordu:\n' + r.stdout);
    assert.match(r.stdout, /dış göz brifingi bayat\/yok/);
    assert.equal(r.rc, 0, 'kapanış kilidi duran kapı DEĞİLDİR (çıkış kodunu değiştirmez)');
  } finally { temizle(kok); }
});

test('açık görev varken kilit BASMAZ — göz gerçekten görev durumuna bakıyor', () => {
  const kok = kurulum();
  try {
    writeFileSync(join(kok, KUTU_REL), kutuDurumlarla(['açık', 'mühür-bekliyor']));
    const r = kos(kok);
    assert.equal(r.alanlar.kilit, 0, 'üretim sürerken kapanış kilidi doğmamalı:\n' + r.stdout);
  } finally { temizle(kok); }
});

test('BOZMA · tek evde mühür-bekliyor ÜRETİM tarafına alınırsa bekçinin hükmü DÖNER', () => {
  // Tek evin yük taşıdığının kanıtı: gömülü kopyası olan bir çekirdek burada kızarmaz, çünkü
  // dosya değişse de hükmü değişmezdi. Kaynak ağaca dokunulmaz — bozma fixture kopyasındadır.
  const kok = kurulum();
  try {
    writeFileSync(join(kok, KUTU_REL), kutuDurumlarla(['kapalı', 'mühür-bekliyor']));
    assert.equal(kos(kok).alanlar.kilit, 1, 'ön koşul: bozmadan önce kilit basmalı');
    writeFileSync(join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'),
      readFileSync(EV, 'utf8').replace('kapanista:mühür-bekliyor', 'uretimde:mühür-bekliyor'));
    const r = kos(kok);
    assert.equal(r.alanlar.kilit, 0,
      'ayrım tek evden okunmuyor: dosya değişti, hüküm değişmedi (gömülü kopya var):\n' + r.stdout);
  } finally { temizle(kok); }
});

test('BOZMA · tek ev yoksa göz ARIZA basar — ölçemedim ile temiz aynı şey değildir', () => {
  const kok = kurulum();
  try {
    writeFileSync(join(kok, KUTU_REL), kutuDurumlarla(['kapalı', 'mühür-bekliyor']));
    // Çekirdeğin kendi dizini yedek evdir; kurulu ağacın kopyası da, yedek de yok sayılmalı ki
    // fail-closed dal ölçülebilsin. Kurulu kopya fixture'da zaten yok — burada çekirdeğin
    // gördüğü KOK kopyasını yaratıp silmek yerine, biçimsiz kalem yazarak aynı dalı ölçüyoruz.
    writeFileSync(join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'), 'bicimsiz satir\n');
    const r = kos(kok);
    assert.equal(r.alanlar.ariza, 1, 'biçimsiz küme arıza hattına düşmeli:\n' + r.stdout);
    assert.equal(r.rc, 2, 'arıza çıkış kodu 2 olmalı (sözleşme §2)');
    assert.match(r.stdout, /gorev-durumlari\.txt biçimsiz kalem/);
  } finally { temizle(kok); }
});

test('BOZMA · KURULUM penceresinde de arıza basar — eksik küme ilk gerçek döneme ertelenmez', () => {
  // Hasım turu bulgusu: göz kurulum penceresinde erken dönüyordu; sözlük okuması o dönüşün
  // ARDINDA kalsaydı, evsiz küme kurulumda hiç görünmez, ilk gerçek dönemde sevki fail-closed
  // durdururdu. Küme bir KABLODUR; kablo denetimi kurulum penceresinde de tamdır.
  const kok = kurulum({ kurulumTamam: false });
  try {
    writeFileSync(join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'), 'bicimsiz satir\n');
    const r = kos(kok);
    assert.equal(r.alanlar.pencere, 'kurulum', 'ön koşul: kurulum penceresi');
    assert.equal(r.alanlar.ariza, 1, 'kurulum penceresinde de arıza basmalı:\n' + r.stdout);
    assert.equal(r.rc, 2);
  } finally { temizle(kok); }
});

test('BOZMA · iki sınıftan biri boşsa küme reddedilir (yarım ayrım kabul edilmez)', () => {
  const kok = kurulum();
  try {
    writeFileSync(join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'),
      'kapanista:mühür-bekliyor\nkapanista:kapalı\nkapanista:pas\n');
    const r = kos(kok);
    assert.equal(r.alanlar.ariza, 1, 'yarım küme arıza basmalı:\n' + r.stdout);
    assert.match(r.stdout, /İKİSİ de dolu olmalı/);
  } finally { temizle(kok); }
});

// ── 3 · Korunma: tek ev [SERT] alanda yaşıyor (kafesin anahtarı ajanda kalmasın) ──────────

test('gorev-durumlari.txt korunan-yollar [SERT] bölümünün altında (ajan yazamaz)', () => {
  // Ayrım bir VERİ dosyasına taşındı; o dosya ajanın yazabildiği bir yerde olsaydı, kafesin
  // anahtarı ajanın yazdığı dosyada olurdu (bu ailenin en pahalı dersi).
  const liste = readFileSync(join(KOK_REPO, 'tools', 'guard', 'korunan-yollar.txt'), 'utf8');
  // Bölüm başlığı SATIR BAŞINDA aranır: başlıktan söz eden yorum satırı bölme yeri değildir.
  const bolumler = liste.split(/^\[SORULUR\]$/m);
  assert.equal(bolumler.length, 2, 'korunan-yollar tek bir [SORULUR] bölümü taşımalı');
  const [sert, sorulur] = bolumler;
  assert.match(sert, /^tools\/bekci\/$/m, 'tools/bekci/ [SERT] bölümünde olmalı');
  assert.ok(!/gorev-durumlari\.txt/.test(sorulur),
    'sözlük [SORULUR] istisnasına alınmış — ajan ayrımı değiştirebilir hâle gelir');
});
