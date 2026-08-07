// sahip-ekrani.test.mjs — U24: KOKPİTİN ÇİZDİĞİ EKRAN sahip dilinde mi?
//
// NEDEN İKİNCİ BİR KAPI: kardeşi `sahip-dili.test.mjs` KAYNAĞI tarar ve bu yüzden BEYANLI bir
// kapsam sınırı taşımak zorunda kaldı — yalnız K18'in beş terimini ölçüyor. Sebebi mekanik:
// `kutu` · `sevk` · `faz` aynı dosyada hem SAHİBİN CÜMLESİ hem DEĞİŞKEN ADIdır
// (`state.kutu` · `k.fazA` · `var sevkte`). Kaynağı tarayan bir kapı ikisini ayıramaz; listeye
// eklemek yanlış-kırmızı üretir, eklememek de kapıyı kör bırakır. U24 tam bu boşlukta yaşadı.
//
// ÇÖZÜM YÖNÜ DEĞİŞTİ: kaynağı değil ÇIKTIYI ölçüyoruz. app.js bir sanal kabuğun (node:vm)
// içinde gerçek haliyle koşturulur, sahte bir DOM'a gerçek ekranını çizer, sonra o ekranın
// GÖRÜNEN METNİ taranır. Değişken adı ekrana çıkmaz, yani yanlış-kırmızı mekanik olarak
// imkânsızdır ve liste artık tam olabilir.
//
// KAPSAM SINIRI — BEYANLI: taranan yüzey sahibin PANOSUdur (üst şerit + pano sütunları).
// Dosya ağacı taranmaz ve bu bilinçlidir: ağaç vault'un GERÇEK klasör adlarını gösteren bir
// dosya gezginidir (`02_kanon` orada bir olgudur, kokpitin uydurduğu bir kelime değil).
// `<code>` blokları da taranmaz: onlar yol ve komuttur, cümle değil — sahip onları kopyalar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.join(__dirname, '..');

// ── sahte DOM: app.js'in dokunduğu her şey, fazlası değil ────────────────────────────────
function sandbox() {
  const ekran = {};
  const el = (id) => (ekran[id] ||= { id, innerHTML: '', textContent: '', className: '', hidden: false });
  const ctx = {
    document: {
      getElementById: el,
      querySelector: () => el('wm-sub'),
      querySelectorAll: () => [],
      addEventListener: () => {},
      set title(v) { el('__title').textContent = v; },
      get title() { return el('__title').textContent; },
    },
    // fetch: app.js yüklenirken kendiliğinden çağrılır. Hiç çözülmeyen bir söz veriyoruz ki
    // testin çizdiği ekranı ağdan gelen bir cevap EZMESİN (belirlenimsizlik yok).
    fetch: () => new Promise(() => {}),
    requestAnimationFrame: () => {},
    setInterval: () => 0,
    console,
    Promise, Date, String, Number, Object, Array, JSON, RegExp, Math,
  };
  createContext(ctx);
  runInContext(readFileSync(path.join(KOK, 'public', 'app.js'), 'utf8'), ctx, { filename: 'app.js' });
  return { ctx, ekran };
}

// Gerçekçi durum: kokpitin fixture'larından değil, PANO_SOZLESMESI'nin tanımladığı şekilden.
const DURUM = {
  config: { baslik: 'deneme', altBaslik: 'panosu', koordinatorRol: 'koordinator', rolToreni: true,
            isikIpuclari: { AKIŞ: 'işin akışı', DOSYA: 'dosya düzeni' } },
  saglik: { sistemGenel: 'SARI', stale: false, driftAfterRun: true, driftCount: 3,
            lastRun: '2026-08-07 09:00', runNo: 12, red: 0, yellow: 2,
            lights: [{ ad: 'AKIŞ', deger: 'YEŞİL' }, { ad: 'DOSYA', deger: 'SARI' }],
            items: [{ level: 'SARI', text: 'örnek bulgu' }, { level: 'BILGI', text: 'örnek bilgi' }] },
  yargi: { blokaj: 'yok', siradakiOturum: 'plan yazılacak', siradakiRol: 'koordinator',
           siradakiStale: false, sonHareketRol: null },
  kutu: { id: 'KT-001', title: 'proje planı', path: '01_kutular/KT-001/KUTU.md',
          fazA: { sevkte: true },
          gates: [{ id: 'G-01', is: 'ilk iş', sahip: 'koordinator', durum: 'açık', kanit: 'test: t' }] },
  kutular: [{ id: 'KT-001', aktif: true, path: '01_kutular/KT-001/KUTU.md' }],
  roller: [{ ad: 'Koordinatör', path: '03_roller/koordinator/DURUM.md', ozet: 'plan yazıyor', sonOturum: '2026-08-06', bos: false }],
  ertelenenler: [{ kalem: 'sonraya kalan iş', sahip: 'koordinator' }],
  warnings: [],
};

// Sahibin PANOSUNDA gördüğü metin: `<code>` gövdeleri ve etiketler atılır, kalan yazı döner.
function ekranMetni(ekran) {
  const parcalar = ['sys-light', 'stamp', 'updated', 'ribbon', 'pano-view']
    .map((id) => (ekran[id] ? (ekran[id].innerHTML || '') + ' ' + (ekran[id].textContent || '') : ''))
    .join('\n');
  return arindir(parcalar
    .replace(/<code>[\s\S]*?<\/code>/g, ' ')   // yol ve komut — cümle değil (beyanlı sınır)
    .replace(/<[^>]*>/g, ' ')                   // etiketler ve öznitelikler (data-open yolları)
    .replace(/\s+/g, ' '));
}

// NUMARALI KLASÖR ADI YOL'DUR, KELİME DEĞİL (beyanlı sınır — ölçümle konuldu).
// U24 `02_kanon`ı sahip yüzeyinde jargon sayıyordu; ölçüm bunu ÇÜRÜTTÜ: o ad ekrana yalnız
// dosya ağacında (gerçek klasör) ve `shouldCollapse` sabitinde geçiyor, cümle içinde değil.
// Kalan yerlerde (okuma notları) yol PARANTEZ İÇİNDE, sade kelimenin ardından verilir —
// "işlerin klasörü okunamadı (01_kutular)" — ve kılavuz da sahibe klasör adı öğretir
// ("00_pano/PANO.md'yi aç"). Yolu yasaklamak, sahibin bakacağı yeri gizlemek olurdu.
// Sınır DAR: yalnız `NN_ad` kalıbı düşer; başka hiçbir şey muaf değildir.
const arindir = (s) => s.replace(/\b\d{2}_[A-Za-zçğıöşüÇĞİÖŞÜ_]+/g, ' ');

function ciz(durum = DURUM) {
  const { ctx, ekran } = sandbox();
  ctx.state = durum;
  ctx.renderTopbar();
  ctx.renderPano();
  return ekranMetni(ekran);
}

// TERİMLER KÖK HÂLİNDE (kardeş kapının ölçtüğü Türkçe ek kuralı burada da geçerli:
// 'kutular'.includes('kutu') DOĞRU olsa da 'iş paketleri'.includes('iş paketi') YANLIŞtır).
const YASAK = [
  // U24'ün saydıkları (`02_kanon` listede YOK — yukarıdaki `arindir` notu: ölçüm onu çürüttü)
  'kutu', 'sevk', 'faz ', 'bekçi',
  // K18'in beşi — kaynak kapısı onları zaten tutuyor; burada İKİNCİ hat
  'iş paket', 'bağımsız denetleyen', 'gösterge', 'taze', 'mercek',
  // sözlükte yaşayan ama sahibin bilmediği kardeşler (U24 saymamıştı; kapı tamsa hepsi girer)
  'kanon', 'mühür', 'kadran', 'dönem', 'karne', 'zarf',
];

const bul = (metin) => YASAK.filter((k) => arindir(metin).toLocaleLowerCase('tr').includes(k.toLocaleLowerCase('tr')));

test('sahip panosu: çizilen ekranda KEEL sözlüğü GEÇMEZ', () => {
  const metin = ciz();
  assert.deepEqual(bul(metin), [], 'sahibin ekranına jargon basılıyor:\n' + metin);
});

test('sahip panosu: "açık iş yok" hâlinde de temiz (boş pano ayrı bir metin yolu)', () => {
  const bos = { ...DURUM, kutu: null, kutular: [], roller: [], ertelenenler: [],
                yargi: { blokaj: 'yok', siradakiOturum: null, siradakiRol: null, siradakiStale: false, sonHareketRol: null } };
  const metin = ciz(bos);
  assert.deepEqual(bul(metin), [], 'boş panoda jargon:\n' + metin);
  assert.match(metin, /şu an açık iş yok/);
});

test('sahip panosu: "sıra koordinatörde" hâlinde de temiz (üçüncü metin yolu)', () => {
  const bayat = { ...DURUM, yargi: { ...DURUM.yargi, siradakiStale: true, sonHareketRol: 'uygulayici' } };
  assert.deepEqual(bul(ciz(bayat)), [], 'bayat-sıra metninde jargon');
});

test('sahip panosu: damga eski hâlinde de temiz (şerit ayrı metin yolu)', () => {
  const eski = { ...DURUM, saglik: { ...DURUM.saglik, stale: true, driftAfterRun: false,
                                     staleReason: 'son sağlık denetimi 3 gün önce — otomatik sağlık kontrolü güncel değil' } };
  const metin = ciz(eski);
  assert.deepEqual(bul(metin), [], 'eski-damga şeridinde jargon:\n' + metin);
  assert.match(metin, /otomatik sağlık kontrolü güncel değil/);
});

test('sahip panosu: okuma notları da sahip dilinde (status.mjs uyarıları ekrana basılır)', () => {
  // Uyarılar sunucudan gelir ve panonun "ana plan" bölümüne basılır; kaynağı ayrı dosya
  // olduğu için kolayca gözden kaçar — ölçüm burada, ekranda. Dizeler status.mjs'ten BİREBİR
  // alındı; ayrışırlarsa bir alttaki kaynak testi kırmızı basar.
  const uyarilar = [
    'işlerin klasörü okunamadı (01_kutular)',
    'birden fazla açık iş var (KT-001, KT-002) — normalde tek iş açık olur; ayrıntı paneli ada göre ilkini gösteriyor',
    'ekibin klasörü okunamadı (03_roller)',
  ];
  const metin = ciz({ ...DURUM, warnings: uyarilar });
  assert.deepEqual(bul(metin), [], 'okuma notunda jargon:\n' + metin);
  assert.match(metin, /okuma notu:/, 'uyarılar ekrana gerçekten basılmalı (yoksa test hiçbir şey ölçmez)');
});

test('KAYNAK ile EKRAN aynı fikirde: status.mjs uyarı metinleri jargon taşımıyor', () => {
  // Ekran kapısı yalnız TETİKLENEN uyarıyı görür; bu satır kaynaktaki TÜM uyarı dizelerini
  // sayar. İkisi birlikte: biri kapsamı, öteki gerçekliği tutar.
  const kaynak = readFileSync(path.join(KOK, 'lib', 'status.mjs'), 'utf8');
  const dizeler = [...kaynak.matchAll(/warnings\.push\(\s*'([^']*)'/g)].map((m) => m[1]);
  assert.ok(dizeler.length >= 10, 'uyarı dizeleri okunamadı — test bayatladı: ' + dizeler.length);
  for (const d of dizeler) {
    assert.deepEqual(bul(d), [], 'status.mjs uyarısında jargon: ' + d);
  }
});

// ── KIRMIZIYA DÖNÜYOR MU ─────────────────────────────────────────────────────────────────

test('bozma · ekrana jargon sızarsa kapı KIRMIZI (her yasak terim tek tek)', () => {
  // Enjeksiyon durumdan değil, GERÇEK ÇİZİMDEN geçer: sahibin göreceği bir alana yazılır.
  for (const k of YASAK) {
    const temiz = ciz();
    assert.ok(!bul(temiz).includes(k), 'ön koşul: taban ekran zaten temiz olmalı (' + k + ')');
    const metin = ciz({ ...DURUM, yargi: { ...DURUM.yargi, siradakiOturum: 'burada ' + k + ' geçiyor' } });
    assert.ok(bul(metin).includes(k), 'yasak terim ekranda yakalanmadı: "' + k + '"');
  }
});

test('bozma · kapı DOSYA AĞACINI ölçmez: `02_kanon` klasör adı yanlış-kırmızı üretmez', () => {
  // Fren. Ağacı da tarasaydı ilk düzeltme "kapıyı sustur" olurdu — kapıyı öldüren tam da budur.
  const { ctx, ekran } = sandbox();
  ctx.treeData = { children: [{ type: 'dir', name: '02_kanon', path: '02_kanon', children: [] }] };
  ctx.renderTree();
  assert.match(ekran.tree.innerHTML, /02_kanon/, 'ağaç gerçek klasör adını göstermeli');
  ctx.state = DURUM; ctx.renderTopbar(); ctx.renderPano();
  assert.deepEqual(bul(ekranMetni(ekran)), [], 'ağaçtaki klasör adı pano taramasına karışmamalı');
});

test('bozma · `<code>` gövdesi cümle sayılmaz ama METİN sayılır (sınır iki yönlü)', () => {
  // (a) <code> İÇİ: rol açma tarifi `/rol-<slug>` komutunu <code> ile basar — komut, cümle değil.
  const { ctx, ekran } = sandbox();
  ctx.state = { ...DURUM, config: { ...DURUM.config, rolToreni: false } };  // klasörde-aç tarifi
  ctx.renderTopbar(); ctx.renderPano();
  assert.match(ekran['pano-view'].innerHTML, /<code>03_roller\/koordinator\/<\/code>/,
    'yol gerçekten <code> içinde basılmalı (yoksa muafiyet hiçbir şeyi ölçmüyor)');
  assert.deepEqual(bul(ekranMetni(ekran)), [], '<code> içindeki yol cümle sayıldı');
  // (b) <code> DIŞI: aynı kelime düz metinde yakalanır.
  assert.ok(bul(ciz({ ...DURUM, yargi: { ...DURUM.yargi, siradakiOturum: 'kutu açılacak' } })).includes('kutu'));
});
