// ilk-kutu.test.mjs — Faz 2 sıra 5 (F1-2c + F1-2d + F1-3): GENESIS'in bıraktığı KABUK.
//
// Sıra 5'in bitti ölçütü üç bacaklıdır; bu dosya ikisini mekanik olarak kapatır:
//   (a) "Kurulum sonrası kabuk var"  → çekilme kapısı kabuğu ADIYLA ve ŞEMASIYLA arıyor mu
//   (b) "koordinatör rol başına görev doğurabiliyor" → kabuk büyüdüğünde sevk onu doğru okuyor
//       mu; şişme çapası plan doğmadan çakılmıyor mu (B-11); mutlak görev tavanı görüyor mu
// Üçüncü bacak (`/donem` "DÖNEM AÇIK" der) sıra 6-7'nin dosyalarına bağlıdır (KARAR_ALANI ·
// OTONOM_DONEM · T6) ve BURADA SİMÜLE EDİLİR: o dosyalar kum havuzunda elle konur, böylece
// kabuğun kendisinin dönem açmaya engel OLMADIĞI ölçülür. Gerçek kurulumdan açılan dönem
// Faz 3'ün işidir (F3-2) — bu test onun yerine geçmez.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync,
         chmodSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const GUARD = join(BURASI, '..');
const KOK_REPO = join(GUARD, '..', '..');
const DENETIM = join(GUARD, 'kurulum-denetimi.sh');
const KALIP_YOLU = join(KOK_REPO, '00_genesis', 'ILK_KUTU_KALIBI.md');
const KABUK_AD = 'KT-001-proje-plani';

// ── Kalıbın kurulu hâli: kalıp-yorumu silinir, tek alan dolar (kurulu-sim emsali) ─────────
function kabukMetni({ slug = 'koordinator' } = {}) {
  const satirlar = readFileSync(KALIP_YOLU, 'utf8').split('\n');
  const yorumSonu = satirlar.findIndex((s) => s.trimEnd().endsWith('-->'));
  assert.ok(yorumSonu >= 0 && yorumSonu < 30, 'kalıp-yorumu bloğu bulunamadı');
  const g = satirlar.slice(yorumSonu + 1).join('\n').replaceAll('«KOORDİNATÖR-SLUG»', slug);
  assert.ok(!g.includes('«'), 'kurulu kabukta doldurulmamış «alan» kaldı');
  return g;
}

// ── 1 · Kalıbın kendisi: sabit metin, tek alan, makine-okur blokların hepsi yerinde ───────

test('kalıpta TEK alan var ve o da koordinatör slug\'ı', () => {
  const k = readFileSync(KALIP_YOLU, 'utf8');
  const alanlar = [...k.matchAll(/«([^»]+)»/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(alanlar)], ['KOORDİNATÖR-SLUG'],
    'kalıpta beklenmeyen alan var — "sabit metin, tek alan" sözleşmesi bozuldu');
});

test('kurulu kabuk makine-okur blokların hepsini taşıyor', () => {
  const m = kabukMetni();
  assert.match(m, /^\| G-01 \|/m, 'G-01 görev satırı yok (sevk görev tablosunu göremez)');
  assert.match(m, /^## Görevler$/m, 'kokpitin okuduğu `## Görevler` başlığı yok');
  assert.match(m, /^## Duruş sözleşmesi$/m);
  assert.match(m, /^## Bağımlılık ve risk/m);
  for (const s of ['BİTİŞ HÂLİ', 'KANIT', 'KISIT', 'BÜTÇE', 'LİSTE']) {
    assert.match(m, new RegExp('^' + s + ':\\s*\\S', 'm'), `duruş sözleşmesi satırı boş/yok: ${s}`);
  }
  // Risk satırı: kurulum-kapisi.sh'ın BİREBİR aradığı biçim (onkosul= · risk=<düşük|riskli> — gerekçe)
  assert.match(m, /^G-01: onkosul=yok · risk=(düşük|riskli) — .+$/m, 'risk satırı biçimsiz');
  // "Göreceklerin" bloğu: EL_KITABI kutu-döngüsü 1 üç somut iddia ister; açılış mührü bunun üstünden verilir.
  const gor = m.split('## Bu kutu bitince gözünle göreceklerin')[1] || '';
  assert.equal((gor.split('## ')[0].match(/^\d\. /gm) || []).length, 3,
    '"göreceklerin" bloğunda üç madde olmalı (mühür bu blok üstünden verilir)');
});

test('kabuğun BÜTÇE sayısı planlama kutusunun görev sayısını taşır (kadro + 1)', () => {
  // GEREKÇE 2026-07-30 hasım turunda DÜZELTİLDİ. Eski gerekçe eski bütçe anlamını kodluyordu
  // ("bir görev İKİ çağrı yer" → 2×3=6) ve o anlam bu paketle değişmişti: bütçe artık YALNIZ
  // üretim çağrılarını sayar. Testin sayısı doğruydu ama sebebi yanlıştı — sayıyı değiştiren
  // bir sonraki paket, yanlış sebebi okuyup yanlış karar verirdi.
  // Doğru kısıt: planlama kutusu iş zincirindeki HER role bir görev doğurur, artı G-01 →
  // görev sayısı `kadro + 1`. Bütçe bundan küçükse kutu mekanik olarak bitirilemez.
  const b = kabukMetni().match(/^BÜTÇE:\s*.*?(\d+)/m);
  assert.ok(b, 'BÜTÇE satırında sayı yok — sevk fail-closed 3 varsayar');
  assert.ok(Number(b[1]) >= 6, `BÜTÇE ${b[1]}: G-01 + beş rollük iş zinciri bir döneme sığmalı (kadro+1)`);
  assert.match(kabukMetni(), /^BÜTÇE:.*ÜRETİM/m, 'satır bütçenin NE saydığını söylemeli (üretim çağrısı)');
});

// NOT: "BÜTÇE < kadro+1 ise çekilme kapısı KIRMIZI" kuralının testi BURADA DEĞİL,
// kurulum-denetimi.test.mjs içindedir (`hasım-14` / `hasım-14b`) ve kapıyı KOŞTURUR.
// Buraya betiğin kaynak metnini grepleyen bir test yazmak, hasım turunun kendi bulgusunu
// tekrarlamak olurdu: kural silinse test yeşil kalırdı.

test('LİSTE satırı sevkin aradığı dizeyi taşıyor (iki fren tek satıra bağlı)', () => {
  const l = kabukMetni().split('\n').find((s) => /^LİSTE:/.test(s));
  assert.match(l, /dönem\s+içinde\s+doğar/,
    'sevk bu dizeyi arar: şişme çapasının ertelenmesi ve kadroya bağlı görev tavanı buna bağlı');
});

// ── 2 · Çekilme kapısı (kurulum-denetimi.sh 8b/8c) ────────────────────────────────────────
// Kum havuzu: kapı çok şey denetler ve eksik fixture'da toplamda KIRMIZI'dır; testler
// KENDİ satırlarını arar (genesis-iskelet.test.mjs emsali).

function kuruluFixture(bozma = () => {}) {
  const kok = mkdtempSync(join(tmpdir(), 'ilk-kutu-'));
  cpSync(join(KOK_REPO, '00_genesis'), join(kok, '00_genesis'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'GENESIS.md'), join(kok, 'GENESIS.md'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '01_kutular', KABUK_AD), { recursive: true });
  mkdirSync(join(kok, '02_kanon', 'kilitli'), { recursive: true });
  mkdirSync(join(kok, '03_roller', 'koordinator'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  writeFileSync(join(kok, '01_kutular', KABUK_AD, 'KUTU.md'), kabukMetni());
  // G-01 sahibinin kadroda karşılığı + G4'ün ikinci ürünü (kilitli-tarih çapası) + korunan
  // yollar listesi: kapı üçünü de arıyor (hasım turu 2026-07-30).
  writeFileSync(join(kok, '03_roller', 'koordinator', 'ROL.md'), '# ROL — Koordinatör\nMod: **tam**.\n');
  writeFileSync(join(kok, '02_kanon', 'kilitli', '.taban-ref'), '0123456789abcdef0123456789abcdef01234567\n');
  copyFileSync(join(GUARD, 'korunan-yollar.txt'), join(kok, 'tools', 'guard', 'korunan-yollar.txt'));
  writeFileSync(join(kok, '02_kanon', 'BITTI_TANIMI.md'),
    '<!-- yazar: koordinator -->\n# BİTTİ TANIMI — bu proje ne zaman biter\n(iskelet — ilk kutu doldurur: KT-001-proje-plani)\n');
  writeFileSync(join(kok, '02_kanon', 'KUTU_PLANI.md'),
    '<!-- yazar: koordinator -->\n# KUTU PLANI — sıradaki kutular\n(iskelet — ilk kutu doldurur: KT-001-proje-plani)\n');
  bozma(kok);
  return kok;
}
const kapi = (kok) => spawnSync('bash', [DENETIM, kok], { encoding: 'utf8' });
const kabukYolu = (kok) => join(kok, '01_kutular', KABUK_AD, 'KUTU.md');

test('NEGATİF: tam kabuk + iki iskelet, kapı kendi satırlarında yeşil', () => {
  const r = kapi(kuruluFixture());
  for (const bekle of [/geçti\s+· ilk kutu kabuğu: mandat metni yerinde/,
                       /geçti\s+· ilk kutu kabuğu: doldurulmamış alan yok/,
                       /geçti\s+· ilk kutu kabuğu: G-01 görev satırı yerinde/,
                       /geçti\s+· ilk kutu kabuğu: bağımlılık\/risk satırı biçimli/,
                       /geçti\s+· kanon iskeleti yerinde: 02_kanon\/BITTI_TANIMI\.md/,
                       /geçti\s+· kanon iskeleti yerinde: 02_kanon\/KUTU_PLANI\.md/]) {
    assert.match(r.stdout, bekle, `yanlış KIRMIZI: ${bekle}`);
  }
  assert.ok(!/ilk kutu kabuğunda/.test(r.stdout), `tam kabukta eksik raporlandı:\n${r.stdout}`);
});

test('kabuk YOKSA kapı KIRMIZI (sayma değil, ADIYLA arama)', () => {
  const r = kapi(kuruluFixture((k) => rmSync(join(k, '01_kutular', KABUK_AD), { recursive: true })));
  assert.match(r.stdout, /ilk kutu kabuğu yok: 01_kutular\/KT-001-proje-plani\/KUTU\.md/);
});

test('BAŞKA adlı bir kutu kabuğun yerini TUTMAZ (eski "en az bir kutu" sayımının kör noktası)', () => {
  // Eski denetim `01_kutular/KT-*/KUTU.md` SAYIYORDU: bomboş bir KT-999 sayıyı 1 yapar ve kapı
  // yeşil basardı. Kabuk sabit metinli olduğu için artık kimlikle ölçülebiliyor.
  const r = kapi(kuruluFixture((k) => {
    rmSync(join(k, '01_kutular', KABUK_AD), { recursive: true });
    mkdirSync(join(k, '01_kutular', 'KT-999-baska'), { recursive: true });
    writeFileSync(join(k, '01_kutular', 'KT-999-baska', 'KUTU.md'), '# KT-999\n');
  }));
  assert.match(r.stdout, /ilk kutu kabuğu yok/);
});

test('mandat metni silinmişse KIRMIZI (kalıp yeniden yazılmış)', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8')
      .replace('Bu kutunun işi, bu projenin nasıl yürütüleceğini çıkarmaktır', 'Serbestçe yazdım'));
  }));
  assert.match(r.stdout, /mandat metni yok — kalıp kopyalanmamış\/yeniden yazılmış/);
});

test('doldurulmamış «alan» kalmışsa KIRMIZI', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').replace('koordinator', '«KOORDİNATÖR-SLUG»'));
  }));
  assert.match(r.stdout, /ilk kutu kabuğunda doldurulmamış «alan» var/);
});

test('G-01 satırı yoksa KIRMIZI (sevk görev tablosunu göremez)', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').split('\n').filter((s) => !/^\| G-01 \|/.test(s)).join('\n'));
  }));
  assert.match(r.stdout, /G-01 görev satırı yok/);
});

test('duruş sözleşmesinin HER satırı ayrı ayrı aranıyor (LİSTE dâhil)', () => {
  for (const s of ['BİTİŞ HÂLİ', 'KANIT', 'KISIT', 'BÜTÇE', 'LİSTE']) {
    const r = kapi(kuruluFixture((k) => {
      const y = kabukYolu(k);
      writeFileSync(y, readFileSync(y, 'utf8').split('\n')
        .filter((x) => !new RegExp('^' + s + ':').test(x)).join('\n'));
    }));
    assert.match(r.stdout, new RegExp(`duruş sözleşmesi satırı eksik/boş \\(blok İÇİNDE aranır\\): ${s}`),
      `${s} sessiz geçti`);
  }
});

test('risk satırı silinmişse KIRMIZI', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').split('\n').filter((s) => !/^G-01: onkosul=/.test(s)).join('\n'));
  }));
  assert.match(r.stdout, /bağımlılık\/risk satırı yok\/biçimsiz/);
});

test('iki kanon iskeleti ayrı ayrı aranıyor; yanlış başlık da KIRMIZI', () => {
  for (const ad of ['BITTI_TANIMI.md', 'KUTU_PLANI.md']) {
    const yok = kapi(kuruluFixture((k) => rmSync(join(k, '02_kanon', ad))));
    assert.match(yok.stdout, new RegExp(`kanon iskeleti yok: 02_kanon/${ad.replace('.', '\\.')}`));
    const bozuk = kapi(kuruluFixture((k) =>
      writeFileSync(join(k, '02_kanon', ad), '# başka bir başlık\n')));
    assert.match(bozuk.stdout, new RegExp(`kanon iskeletinin başlığı yanlış/çapasız: 02_kanon/${ad.replace('.', '\\.')}`));
  }
});

test('ARŞİV DALI KAÇIŞ YOLU DEĞİL: sıfır baytlık dosya "tamamlanmış" saydırmaz', () => {
  // Hasım turu: `-f` tek başına yeterdi; boş bir `_arsiv/KT-001-proje-plani/KUTU.md` ile kapı
  // SONUÇ: YEŞİL basıp çekilme izini bırakıyordu. `01_kutular` korunan-yollarda da yok.
  const r = kapi(kuruluFixture((k) => {
    mkdirSync(join(k, '01_kutular', '_arsiv', KABUK_AD), { recursive: true });
    writeFileSync(join(k, '01_kutular', '_arsiv', KABUK_AD, 'KUTU.md'), '');
    rmSync(join(k, '01_kutular', KABUK_AD), { recursive: true });
  }));
  assert.match(r.stdout, /arşivdeki KT-001-proje-plani kabuk değil \(mandat metni yok\)/);
  assert.ok(!/geçti\s+· ilk kutu kabuğu arşivde/.test(r.stdout), 'boş dosya "tamamlanmış" saydırdı');
  assert.equal(r.status, 2, 'kapı KIRMIZI basmadı — çekilme izi düşerdi');
});

test('taşıyıcı başlıklar tek tek aranıyor (biri silinirse ilk dönem baştan ölü)', () => {
  for (const h of ['## Görevler', '## Duruş sözleşmesi', '## Bağımlılık ve risk',
                   '## Bu kutu bitince gözünle göreceklerin', '## Kabul kriterleri']) {
    const r = kapi(kuruluFixture((k) => {
      const y = kabukYolu(k);
      writeFileSync(y, readFileSync(y, 'utf8').replace(h, h.replace('## ', '')));
    }));
    assert.match(r.stdout, new RegExp(`taşıyıcı başlık yok: '${h}'`), `${h} sessiz geçti`);
  }
});

test('duruş satırı bloğun DIŞINA kayarsa kapı KIRMIZI (iki göz ayrışmasın)', () => {
  // Dosya genelinde arayan denetim burada YEŞİL basıyordu; sevk ise bloğu okuyup kutuyu
  // sıradan kutu sayıyordu — plan doğar doğmaz yanlış şişme alarmı (hasım turu 2026-07-30).
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    const m = readFileSync(y, 'utf8');
    const satir = m.split('\n').find((x) => /^LİSTE:/.test(x));
    writeFileSync(y, m.replace(satir + '\n', '') + '\n' + satir + '\n');
  }));
  assert.match(r.stdout, /duruş sözleşmesi satırı eksik\/boş \(blok İÇİNDE aranır\): LİSTE/);
});

test('LİSTE DEĞERİ değişirse KIRMIZI (planlama kutusu muafiyeti sessizce düşmesin)', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').replace(/^LİSTE:.*$/m, 'LİSTE:      koordinatör belirler'));
  }));
  assert.match(r.stdout, /LİSTE satırı sevkin tanıdığı değeri taşımıyor/);
});

test('G-01 sahip hücresinin kadroda karşılığı aranıyor (yanlış slug sessiz geçmesin)', () => {
  const yanlis = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').replace('| koordinator |', '| yokboyle |'));
  }));
  assert.match(yanlis.stdout, /G-01 sahibi kadroda yok: 03_roller\/yokboyle\/ROL\.md/);
  const slugsuz = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').replace('| koordinator |', '| Proje Koordinatörü |'));
  }));
  assert.match(slugsuz.stdout, /G-01 sahip hücresi slug değil/);
});

test('kilitli-tarih çapası kapıda denetleniyor (G4\'ün ikinci ürünü)', () => {
  const yok = kapi(kuruluFixture((k) => rmSync(join(k, '02_kanon', 'kilitli', '.taban-ref'))));
  assert.match(yok.stdout, /kilitli-tarih çapası yok/);
  const sembolik = kapi(kuruluFixture((k) =>
    writeFileSync(join(k, '02_kanon', 'kilitli', '.taban-ref'), 'HEAD\n')));
  assert.match(sembolik.stdout, /40'lık commit-hash değil/);
});

test('korunan-yollar [SORULUR] kalemi kapıda denetleniyor', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = join(k, 'tools', 'guard', 'korunan-yollar.txt');
    writeFileSync(y, readFileSync(y, 'utf8').split('\n').filter((x) => x !== '02_kanon/KUTU_PLANI.md').join('\n'));
  }));
  assert.match(r.stdout, /korunan-yollar \[SORULUR\] bölümünde eksik: 02_kanon\/KUTU_PLANI\.md/);
});

test('"göreceklerin" bloğu üç maddeden azsa KIRMIZI (sahip mührünün yüzeyi)', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = kabukYolu(k);
    writeFileSync(y, readFileSync(y, 'utf8').replace(/^3\. .*$/m, ''));
  }));
  assert.match(r.stdout, /'göreceklerin' bloğunda 2 madde var \(en az 3\)/);
});

test('kanon iskeleti başlığı ÇAPALI aranıyor (yorum içindeki dize yeşil bastırmasın)', () => {
  const r = kapi(kuruluFixture((k) =>
    writeFileSync(join(k, '02_kanon', 'BITTI_TANIMI.md'), '<!-- # BİTTİ TANIMI -->\n# başka\n')));
  assert.match(r.stdout, /kanon iskeletinin başlığı yanlış\/çapasız: 02_kanon\/BITTI_TANIMI\.md/);
});

test('kabuk ARŞİVE gitmişse kapı geriye dönük KIRMIZI basmaz', () => {
  // Kapı elle yeniden koşturulabilir bir betiktir; tamamlanmış bir kurulumu kutunun arşive
  // gitmesi yüzünden kırmızıya düşürmek yanlış rapordur (hasım turu 2026-07-16 emsali).
  const r = kapi(kuruluFixture((k) => {
    mkdirSync(join(k, '01_kutular', '_arsiv', KABUK_AD), { recursive: true });
    writeFileSync(join(k, '01_kutular', '_arsiv', KABUK_AD, 'KUTU.md'), kabukMetni());
    rmSync(join(k, '01_kutular', KABUK_AD), { recursive: true });
  }));
  assert.match(r.stdout, /ilk kutu kabuğu arşivde/);
  assert.ok(!/ilk kutu kabuğu yok/.test(r.stdout));
});

// ── 3 · Kabuk büyüdüğünde sevk: şişme çapası + mutlak görev tavanı ────────────────────────

const SEVK_BETIKLERI = ['ortak.sh', 'kilit.sh', 'zarf-ekle.sh', 'zarf-bicim-kapisi.sh',
                        'karar-alani.sh', 'catal-kuyruk.sh', 'donem-ac.sh', 'sevk.sh',
                        'devir-kapisi.sh', 'kurulum-kapisi.sh'];
const KARAR_KALIP = readFileSync(join(KOK_REPO, '00_genesis', 'KARAR_ALANI_KALIBI.md'), 'utf8');
// DÖRT GÖVDE FARKLI (kalıp-dolgu freni, hasım turu 2026-07-30): dört başlığa aynı metni yazan
// profil kapıdan döner — aynı cümle, profilin sahiple konuşulmadığının işaretidir. Fixture da
// dürüst olmak zorunda: eskiden dördüne de tek jenerik cümle yazılıyordu.
const KARAR_GOVDE = [
  '- Kahve dükkânının günlük nakit akışını ve hangi ürünün kaç sattığını yalnız ben bilirim.',
  '- Kodun nasıl yazıldığı, dosya adları ve karar numaraları beni ilgilendirmiyor; sorulmasın.',
  '- Fiyat değişikliği ve müşteriye görünen her yazı benim kararım; teknik sıralama değil.',
  '- Soruları tek tek getir, önerini de yaz; uzun döküm gönderirsen kaçırıyorum.',
];
function kararAlaniMetni() {
  const s = KARAR_KALIP.split('\n');
  const yorumSonu = s.findIndex((l) => l.trimEnd().endsWith('-->'));
  let i = 0;
  return s.slice(yorumSonu + 1).join('\n').replaceAll('«SAHİP»', 'Deneme')
    .replace(/«[^»]*»/gs, () => KARAR_GOVDE[i++ % KARAR_GOVDE.length]);
}

// Koordinatörün G-01 altında doğurduğu görevler: her rol bir satır + bir risk satırı.
function gorevEkle(metin, idler, { durum = 'açık' } = {}) {
  const satirlar = metin.split('\n');
  const sonGorev = satirlar.map((s, i) => (/^\| G-\d+ \|/.test(s) ? i : -1)).filter((i) => i >= 0).pop();
  const sonRisk = satirlar.map((s, i) => (/^G-\d+: onkosul=/.test(s) ? i : -1)).filter((i) => i >= 0).pop();
  const gorevSatir = idler.map((id) => `| ${id} | rol görüşü | uretici | ${durum} | demo: gorus-${id}.md |`);
  const riskSatir = idler.map((id) => `${id}: onkosul=G-01 · risk=düşük — süreç işi, ürün riski yok`);
  satirlar.splice(sonRisk + 1, 0, ...riskSatir);
  satirlar.splice(sonGorev + 1, 0, ...gorevSatir);
  return satirlar.join('\n');
}

// GERÇEK kurulumun evleri: kadro rolleri `03_roller/<slug>/` (ROL.md `Mod:` satırı yazma
// yetkisini söyler) · yazamaz koltuklar `.claude/agents/` (dogrulayici · catal-denetcisi ·
// kurulum-denetcisi) + `03_roller/disgoz/`. Fixture ikisini AYIRIR: ilk yazımda kadro yalnız
// `.claude/agents/` altında kuruluyordu ve sayım kör noktasını (hasım turu 2026-07-30) test
// göremiyordu — fixture olmayan bir dünyayı taklit ediyordu.
function sevkFixture({ kutu = kabukMetni(), kadro = ['koordinator', 'uretici'],
                       koltuk = ['dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi'] } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'ilk-kutu-sevk-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '01_kutular', KABUK_AD), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  mkdirSync(join(kok, '03_roller', 'disgoz'), { recursive: true });
  for (const b of SEVK_BETIKLERI) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  // gorev-durumlari.txt VERI dosyasidir ve sevk onu FAIL-CLOSED arar (K5 tek evi; kume
  // bekci ile ORTAK): kurulu projede her zaman vardir, simulasyon da tasimak zorunda.
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'bekci', 'gorev-durumlari.txt'),
               join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'));
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'gercek-veri-isaretleri.txt'),
               join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  for (const a of [...kadro, ...koltuk, 'disgoz']) writeFileSync(join(kok, '.claude', 'agents', a + '.md'), `---\nname: ${a}\ntools: Read\n---\n# ajan\n`);
  for (const r of kadro) {
    mkdirSync(join(kok, '03_roller', r), { recursive: true });
    writeFileSync(join(kok, '03_roller', r, 'ROL.md'), `# ROL — ${r}\n\n## Yazma yetkisi (beyaz-liste)\nMod: **tam**.\n`);
  }
  writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), '# DIŞ GÖZ — brifing\n');
  // Dış göz kadroda DEĞİLDİR: iş zincirinin dışındadır ve görev alamaz (G2.1.5) — sayımdan düşer.
  writeFileSync(join(kok, '03_roller', 'disgoz', 'ROL.md'), '# ROL — Dış göz\n\n## Yazma yetkisi (beyaz-liste)\nMod: **yazamaz**.\n');
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  writeFileSync(join(kok, '01_kutular', KABUK_AD, 'KUTU.md'), kutu);
  writeFileSync(join(kok, '02_kanon', 'KARAR_ALANI.md'), kararAlaniMetni());
  writeFileSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'), '# OTONOM DÖNEM\n');
  writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-30\n');
  writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'),
    `DONEM-S5\t${KABUK_AD}\tyapim\ttatbikat\ndamga\t${new Date().toISOString()}\n`);
  return kok;
}
const sevkKos = (kok) => spawnSync('bash', [join(kok, 'tools', 'sevk', 'sevk.sh')], {
  encoding: 'utf8', input: JSON.stringify({ session_id: 'S1', hook_event_name: 'Stop' }),
  env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
});
const gunluk = (kok) => {
  const y = join(kok, '00_pano', 'zarf-gunlugu.jsonl');
  return existsSync(y) ? readFileSync(y, 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];
};

test('KABUK MÜHÜRSÜZ DOĞAR: /donem töreni tam da mühürde durur (K3, 2026-08-07)', () => {
  // SÖZLEŞME DEĞİŞTİ. Eskiden bu test "kabuk tören önünde engel değil" diyordu ve kabuk hiçbir
  // şeye takılmadan dönem açıyordu — mühür yalnız düzyazıda yaşadığı için. K3 mührü mekanik
  // yaptı: GENESIS'in ürettiği kabuk MÜHÜRSÜZ doğar (mührü GENESIS vermez, sahip verir), yani
  // tören onun önünde ARTIK BİLEREK durur. Ölçülen şey: durduran şey MÜHÜR, başka bir yapısal
  // eksik değil — kabuk tören ve motorun okuduğu her şemayı taşımaya devam ediyor.
  const kok = sevkFixture();
  rmSync(join(kok, 'tools', 'sevk', '.donem-acik'));
  const r = spawnSync('bash', [join(kok, 'tools', 'sevk', 'donem-ac.sh'), KABUK_AD, 'yapim', 'tatbikat'],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
  assert.equal(r.status, 1, `mühürsüz kabukta tören açtı:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /kutu MÜHÜRSÜZ/, `durduran şey mühür değil:\n${r.stderr}`);
});

test('DÖNEM AÇILIYOR: mühür damgalanınca kabuk töreni geçiriyor (kabuk şemayı taşıyor)', () => {
  // Testin ASIL niyeti buydu ve korunuyor: sıra 5'in payı, kabuğun tören ve motorun okuduğu her
  // şemayı taşıması. Sıra 6-7'ye ait ön koşullar (KARAR_ALANI · OTONOM_DONEM · dış göz koltuğu)
  // burada elle kondu — ölçülen "kabuk şemayı taşıyor", "taze kurulumdan dönem açılıyor" DEĞİL.
  // Mühür damgası sahibin işidir; burada onun yerine geçiyoruz, tören kabuğu bundan sonra
  // hiçbir yerde takılmamalı. Bu satır aynı zamanda mühür kapısının aşırı sıkı OLMADIĞININ
  // kanıtıdır: meşru bir damga geçer.
  const kok = sevkFixture();
  rmSync(join(kok, 'tools', 'sevk', '.donem-acik'));
  const y = join(kok, '01_kutular', KABUK_AD, 'KUTU.md');
  const muhurlu = readFileSync(y, 'utf8').replace(/^\*\*Açılış mührü:\*\*.*$/m, '**Açılış mührü:** Deneme Sahip · 2026-08-07');
  assert.match(muhurlu, /\*\*Açılış mührü:\*\* Deneme Sahip/, 'mühür damgası kabuğa inmedi — test kendi arızası');
  writeFileSync(y, muhurlu);
  const r = spawnSync('bash', [join(kok, 'tools', 'sevk', 'donem-ac.sh'), KABUK_AD, 'yapim', 'tatbikat'],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
  assert.match(r.stdout, /DÖNEM AÇIK/, `tören açmadı:\n${r.stdout}\n${r.stderr}`);
  assert.match(r.stdout, new RegExp(`kutu : ${KABUK_AD}`));
});

test('kurulum kapısı: açılış mührü satırı yoksa EKSIK (iki kapı ayrışmasın — K3 hasım turu)', () => {
  // Hasım bulgusu: donem-ac mührü HER kutuda ön koşul sayıyordu, kutu-kurulum kapısı ise onu
  // hiç sormuyordu. Bir KT-002 kutusu buradan YEŞİL geçip dönem açarken exit 1 yiyordu; iki
  // denetim aynı dosya hakkında zıt hüküm veriyordu. Kapı burada satırın VARLIĞINI ölçer.
  const kok = sevkFixture();
  const y = join(kok, '01_kutular', KABUK_AD, 'KUTU.md');
  const eksik = readFileSync(y, 'utf8').replace(/^\*\*Açılış mührü:\*\*.*$/m, '');
  assert.ok(!/\*\*Açılış mührü:\*\*/.test(eksik), 'mutasyon inmedi — test kendi arızası');
  writeFileSync(y, eksik);
  const r = spawnSync('bash', [join(kok, 'tools', 'sevk', 'kurulum-kapisi.sh'), KABUK_AD, kok],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
  assert.match(r.stdout, /EKSİK\s+· acilis muhru satiri yok/, r.stdout);
});

test('kurulum kapısı kabuğu mekanik olarak geçiriyor (duruş · risk · kadro)', () => {
  const kok = sevkFixture();
  const r = spawnSync('bash', [join(kok, 'tools', 'sevk', 'kurulum-kapisi.sh'), KABUK_AD, kok],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
  assert.match(r.stdout, /geçti\s+· durus: BÜTÇE/);
  assert.match(r.stdout, /geçti\s+· bagimlilik\/risk blogu 1 gorevin hepsini kapsiyor/);
  assert.ok(!/sahibi kadroda yok/.test(r.stdout), `koordinatör slug\'ı kadroyla eşleşmedi:\n${r.stdout}`);
});

test('B-11: plan kutusunda şişme çapası KABUK HÂLİNDE çakılmıyor', () => {
  // Çapa ilk turda 1'e çakılsaydı, koordinatör görevleri doğurur doğurmaz alarm çalardı:
  // alarm "plan yapıldı" demiş olurdu. Kabuk `LİSTE: dönem içinde doğar` diyor.
  const kok = sevkFixture();
  sevkKos(kok);
  assert.equal(gunluk(kok).filter((j) => j.tip === 'gorev-sayaci').length, 0,
    'çapa erken çakıldı — plan doğar doğmaz şişme alarmı çalar');
  assert.ok(!gunluk(kok).some((j) => j.cins === 'sisme'), 'kabuk hâlinde şişme alarmı çaldı');
});

test('plan kutusunda çapa, LİSTE DOĞDUĞU turda çakılıyor (listeyi kim doğurduysa ona)', () => {
  // İlk yazım yalnız KAPANMIŞ göreve bakıyordu; kalıp gereği G-01 EN SON kapanır, yani hiçbir
  // görev kapanmadan biten bir plan kutusunda oransal fren ömür boyu ölü kalırdı (hasım turu).
  const kok = sevkFixture();
  const y = join(kok, '01_kutular', KABUK_AD, 'KUTU.md');
  writeFileSync(y, gorevEkle(readFileSync(y, 'utf8'), ['G-02', 'G-03', 'G-04']));
  sevkKos(kok);
  const c = gunluk(kok).filter((j) => j.tip === 'gorev-sayaci');
  assert.equal(c.length, 1, `çapa çakılmadı:\n${JSON.stringify(gunluk(kok).slice(-6), null, 1)}`);
  assert.equal(c[0].cins, 'capa-plan-sonrasi');
  assert.equal(c[0].gorev_sayisi, 4, 'çapa kabuktaki 1 göreve çakıldı — plandan sonrası olmalı');
  assert.ok(!gunluk(kok).some((j) => j.cins === 'sisme'), 'çapa doğduğu turda şişme alarmı çaldı');
});

test('plan kutusunda çapa, HİÇ GÖREV DOĞMASA da ilk görev kapanınca çakılıyor', () => {
  const kok = sevkFixture();
  const y = join(kok, '01_kutular', KABUK_AD, 'KUTU.md');
  writeFileSync(y, readFileSync(y, 'utf8').replace(/^(\| G-01 \|[^|]*\|[^|]*\|) açık \|/m, '$1 pas |'));
  sevkKos(kok);
  const c = gunluk(kok).filter((j) => j.tip === 'gorev-sayaci');
  assert.equal(c.length, 1, 'kutu bitti ama çapa hiç çakılmadı — oransal fren ömür boyu ölü');
});

test('NEGATİF: LİSTE satırı olmayan sıradan kutuda çapa ESKİSİ GİBİ ilk turda çakılıyor', () => {
  const sade = kabukMetni().split('\n').filter((s) => !/^LİSTE:/.test(s)).join('\n');
  const kok = sevkFixture({ kutu: sade });
  sevkKos(kok);
  const c = gunluk(kok).filter((j) => j.tip === 'gorev-sayaci');
  assert.equal(c.length, 1, 'sıradan kutuda çapa çakılmadı — davranış değişmemeliydi');
  assert.equal(c[0].cins, 'capa');
  assert.equal(c[0].gorev_sayisi, 1);
});

test('F1-7: mutlak görev tavanı artık SAYILIYOR (sıradan kutu, 6 > 5)', () => {
  // Oransal alarm bu kör noktayı GÖREMEZ: 40 görevle açılan kutuda çapa da 40 olurdu.
  const sade = gorevEkle(kabukMetni().split('\n').filter((s) => !/^LİSTE:/.test(s)).join('\n'),
                         ['G-02', 'G-03', 'G-04', 'G-05', 'G-06']);
  const kok = sevkFixture({ kutu: sade });
  const r = sevkKos(kok);
  const b = gunluk(kok).find((j) => j.cins === 'gorev-tavani');
  assert.ok(b, `tavan bulgusu düşmedi:\n${r.stdout}`);
  assert.match(b.detay, /gorev sayisi 6 > tavan 5/);
  assert.match(b.detay, /EL_KITABI/);
});

test('NEGATİF: tavana eşit kutu (5) alarm üretmiyor', () => {
  const sade = gorevEkle(kabukMetni().split('\n').filter((s) => !/^LİSTE:/.test(s)).join('\n'),
                         ['G-02', 'G-03', 'G-04', 'G-05']);
  const kok = sevkFixture({ kutu: sade });
  sevkKos(kok);
  assert.ok(!gunluk(kok).some((j) => j.cins === 'gorev-tavani'), 'yanlış alarm');
});

test('plan kutusunun tavanı KADRODAN sayılıyor — yazamaz koltuklar ve dış göz sayılmıyor', () => {
  // Hasım turunun en sert bulgusu: sayım `.claude/agents/` üzerindendi ve orada kadro DEĞİL,
  // yazamaz koltuklar yaşıyor. 8 ajan + 9 görev sessiz geçiyordu; 3 ajan + 6 görev yanlış
  // alarm veriyordu. Kadronun evi `03_roller/` ve yazamaz koltuk ROL.md'sinden okunuyor.
  const kadro = ['koordinator', 'uretici', 'testci', 'denetci', 'analiz'];  // 5 kadro
  const sigan = sevkFixture({ kutu: gorevEkle(kabukMetni(), ['G-02', 'G-03', 'G-04', 'G-05', 'G-06']), kadro });
  sevkKos(sigan);
  assert.ok(!gunluk(sigan).some((j) => j.cins === 'gorev-tavani'),
    'kadro 5 → tavan 6; 6 görev (kadro başına bir + toplama) alarm üretmemeliydi');

  const tasan = sevkFixture({ kutu: gorevEkle(kabukMetni(), ['G-02', 'G-03', 'G-04', 'G-05', 'G-06', 'G-07']), kadro });
  sevkKos(tasan);
  const b = gunluk(tasan).find((j) => j.cins === 'gorev-tavani');
  assert.ok(b, 'kadro 5 → tavan 6; 7 görev alarm üretmeliydi');
  assert.match(b.detay, /planlama kutusu: kadro 5 \+ toplama/);
});

test('yazamaz koltuklar sayıya GİRMİYOR (eski sayım onları kadro sanıyordu)', () => {
  // Fixture 2 kadro + 3 yazamaz koltuk + dış göz kuruyor. Eski sayım (.claude/agents) 5 görürdü
  // ve tavanı 6 yapardı; doğru sayım kadroyu 2 görür ve tavanı 3 yapar.
  const kadro = ['koordinator', 'uretici'];
  const sigan = sevkFixture({ kutu: gorevEkle(kabukMetni(), ['G-02', 'G-03']), kadro });   // 3 görev
  sevkKos(sigan);
  assert.ok(!gunluk(sigan).some((j) => j.cins === 'gorev-tavani'), 'kadro 2 → tavan 3; 3 görev sığmalıydı');

  const tasan = sevkFixture({ kutu: gorevEkle(kabukMetni(), ['G-02', 'G-03', 'G-04']), kadro }); // 4 görev
  sevkKos(tasan);
  const b = gunluk(tasan).find((j) => j.cins === 'gorev-tavani');
  assert.ok(b, 'kadro 2 → tavan 3; 4 görev alarm üretmeliydi (eski sayım 6 der, susardı)');
  assert.match(b.detay, /planlama kutusu: kadro 2 \+ toplama/);
});

test('FAIL-CLOSED: kadro ölçülemiyorsa tavan 5 kalır ve ÖLÇÜLEMEDİĞİ söylenir', () => {
  const kok = sevkFixture({ kutu: gorevEkle(kabukMetni(), ['G-02', 'G-03', 'G-04', 'G-05', 'G-06']) });
  // Yalnız KADRO klasörleri kaldırılır; `03_roller/disgoz` durur (yoksa sevk daha kapılanma
  // adımında dönemi kapatır ve tavan koduna hiç gelinmez — testin ölçtüğü şey kaybolurdu).
  for (const r of ['koordinator', 'uretici']) rmSync(join(kok, '03_roller', r), { recursive: true });
  sevkKos(kok);
  const b = gunluk(kok).find((j) => j.cins === 'gorev-tavani');
  assert.ok(b, 'kadro ölçülemezken tavan sessizce sınırsız oldu');
  assert.match(b.detay, /> tavan 5/);
  assert.match(b.detay, /OLCULEMEDI/, '"ölçemedim" ile "ölçtüm" ayırt edilemiyor');
  assert.ok(gunluk(kok).some((j) => j.cins === 'kadro-olculemedi'), 'ölçüm arızasının kendi izi yok');
});

test('tavan alarmının CİNSİ haber kanalının beyaz listesinde (sessiz ölmüyor)', () => {
  // Kritik bulgu: cins `gorev-tavani` idi; haber.sh yalnız sessizlik|sisme|kirmizi|kanal|tavan
  // kabul ediyor, dışını reddedip exit 1 veriyor ve sevk gönderimi `|| true` ile yutuyordu —
  // alarm günlüğe düşüp sahibe HİÇ ulaşmıyordu.
  const s = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'sevk.sh'), 'utf8');
  const m = s.match(/alarmlar\.push\("([a-z-]+)\\tKutuda /);
  assert.ok(m, 'tavan alarmı bulunamadı');
  const h = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'haber.sh'), 'utf8');
  const beyaz = h.match(/^\s*([a-z|]+)\)\s*:\s*;;\s*$/m);
  assert.ok(h.includes(m[1] + '|') || h.includes('|' + m[1]),
    `alarm cinsi "${m[1]}" haber.sh beyaz listesinde yok — alarm sahibe ulaşmaz`);
});

// ── 4 · İki ev, tek doğru: tavan sayısı ↔ EL_KITABI ───────────────────────────────────────

test('sevkin GOREV_TAVANI sabiti ↔ EL_KITABI kutu-döngüsü tavanı EŞ', () => {
  // WF-2 sınıfı uyumsuzluğa kapı: kural bir yerde yazılı, sayı başka yerde. Emsali
  // kurulu-sim.test.mjs'in "F3 metnindeki tavan ↔ kurulum-denetimi sabiti" testidir.
  const ek = readFileSync(join(KOK_REPO, '00_genesis', 'EL_KITABI_KALIBI.md'), 'utf8');
  const m = ek.match(/≤(\d+) görev/);
  assert.ok(m, 'EL_KITABI kalıbında "≤N görev" tavanı bulunamadı');
  const s = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'sevk.sh'), 'utf8').match(/^const GOREV_TAVANI = (\d+);/m);
  assert.ok(s, 'sevk.sh içinde GOREV_TAVANI sabiti bulunamadı');
  assert.equal(Number(s[1]), Number(m[1]), 'yazılı tavan ile koddaki sayı ayrışmış');
});

// ── 5 · Tarif metni: G4 mühür almıyor, çekilme üç çapaya bağlı ────────────────────────────

test('G4 artık mühür kapısı DEĞİL (indeks + adım dosyası aynı şeyi söylüyor)', () => {
  const i = readFileSync(join(KOK_REPO, 'GENESIS.md'), 'utf8');
  assert.ok(!/G4\.3/.test(i), 'indeks hâlâ G4.3 mührünü sayıyor');
  assert.match(i, /\*\*Eşik = planda "Mühür" yazan kapılar\*\* \(G0\.3 · G2\.5\)/);
  const g4 = readFileSync(join(KOK_REPO, '00_genesis', 'adimlar', 'G4.md'), 'utf8');
  assert.match(g4, /MÜHÜR YOK/);
  assert.match(g4, /ILK_KUTU_KALIBI\.md/, 'G4 kalıbı işaretlemiyor');
  assert.ok(!/ince dilim.{0,40}öner/i.test(g4.replace(/ÖNERMİYORSUN/, '')), 'G4 hâlâ dilim önerdiriyor');
});

test('ÇEKİLME üç çapaya bağlı, mühre bağlı DEĞİL; yeşil denetim İŞARETTEN ÖNCE', () => {
  const g5 = readFileSync(join(KOK_REPO, '00_genesis', 'adimlar', 'G5.md'), 'utf8');
  assert.match(g5, /ÜÇ ÇAPA/);
  assert.match(g5, /mühür alınmış olsun ya da olmasın/);
  // G4.5 eski çekilme tanımını tekrarlıyordu; iki kopya ayrışırsa hangisi doğru bilinmez.
  const g45 = readFileSync(join(KOK_REPO, '00_genesis', 'adimlar', 'G4.5.md'), 'utf8');
  assert.ok(!/G5\.2'deki tek olay/.test(g45), 'G4.5 eski çekilme tanımını taşıyor');
  // SIRA: 3.c bekçi yeşili, 3.d işaret. Ters sırada KIRMIZI bir denetim işaretten sonra kalır
  // ve bir daha kimse zorlamaz — sürücü de susar (hasım turu 2026-07-30).
  const c = g5.indexOf('son bekçi denetimi YEŞİL');
  const d = g5.indexOf('`.kurulum-tamam`** işaretini bırak');
  assert.ok(c > 0 && d > 0 && c < d, 'çekilme sırası ters: işaret, yeşil denetimden önce düşüyor');
  // Sürücünün talimatı da AYNI sırayı söylemeli (iki metin ayrışırsa hangisi doğru bilinmez).
  const su = readFileSync(join(GUARD, 'kurulum-surucu.sh'), 'utf8');
  assert.match(su, /temizlik → hijyen commit →/);
  assert.match(su, /son bekçi denetimi yeşil → kurulum işareti → son commit/);
});

test('G5.1 erteleme dalı kör bırakmıyor: pano satırı + kalıcı kuyruk', () => {
  // Erteleme dalı SIRADAKİ OTURUM satırını yazmıyordu (sahibin öğrendiği tek giriş noktası) ve
  // kalem hiçbir kuyruğa düşmüyordu — açılış hatırlatması da bu yüzden susuyordu.
  const g5 = readFileSync(join(KOK_REPO, '00_genesis', 'adimlar', 'G5.md'), 'utf8');
  const m = g5.split('\n').find((x) => /^1\. \*\*Kabuğu sahibe göster/.test(x));
  assert.ok(m, 'G5.1 bulunamadı');
  assert.match(m, /İKİ DALDA DA panoya aynı satır/, 'erteleme dalında pano satırı yok');
  assert.match(m, /SENDE_BEKLEYEN\.md/, 'ertelenen mühür kalıcı kuyruğa düşmüyor');
  assert.match(m, /mühür gelmezse ekip başlamaz/, 'mührün ETKİSİ sahibe söylenmiyor');
});

test('sahip kılavuzunda "ilk işin" kalemi var (kurulumdan çıkan sahip ne yapacağını bilsin)', () => {
  // Kalemin evi 2026-07-30'da (Faz 2 sıra 6) `adimlar/G5.md`'nin içinden `KILAVUZ_KALIBI.md`'ye
  // taşındı: bir ADIM dosyası, ÜRETİLEN bir dosyanın içerik sözleşmesini taşıyordu ve tarif
  // tavanının asıl büyüme sebebiydi. Kalem aynı, evi farklı — bu test onu yeni evinde arar
  // (kalıbın tam kalem listesi: tools/guard/test/otonom-dosyalar.test.mjs).
  const kilavuz = readFileSync(join(KOK_REPO, '00_genesis', 'KILAVUZ_KALIBI.md'), 'utf8');
  assert.match(kilavuz, /^## İlk işin$/m, 'sahip kılavuzu kalıbında "İlk işin" bölümü yok');
  assert.match(kilavuz, /bir \*\*plan\*\* çıkaracak/, 'ilk işin bir PLAN olduğu yazılı değil');
});

test('G1 ilk dilimi SEÇTİRMİYOR (indeksin "Sınır" bölümüyle çelişki kapandı)', () => {
  const g1 = readFileSync(join(KOK_REPO, '00_genesis', 'adimlar', 'G1.md'), 'utf8');
  assert.ok(!/ilk dilim şu alt-sistemden, çünkü/.test(g1), 'G1 hâlâ ilk dilimi seçtiriyor');
  assert.match(g1, /KARAR DEĞİL/, 'G1 çıktısının karar olmadığı yazılı değil');
});

test('planlama kutusu istisnası TEK KURAL KAYNAĞINDA da yazılı (F6)', () => {
  // İstisnayı yalnız istisnanın kendisi (kalıp) ilan ediyordu; EL_KITABI ≤5 diyor ve ilk kutu
  // ona uymuyor. Kural kaynağı ile uygulama ayrışırsa denetçi hangisine bakacağını bilemez.
  const ek = readFileSync(join(KOK_REPO, '00_genesis', 'EL_KITABI_KALIBI.md'), 'utf8');
  assert.match(ek, /planlama kutusu/, 'EL_KITABI kutu-döngüsünde planlama kutusu istisnası yok');
  assert.match(ek, /LİSTE/, 'EL_KITABI istisnayı işaretle bağlamıyor');
  // Yaşayan bekçiler de tanımalı: kutu açılışında kurulum kapısı, her kapanışta bekçi.
  const kk = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'kurulum-kapisi.sh'), 'utf8');
  assert.match(kk, /LİSTE satiri sevkin tanidigi degeri tasimiyor/, 'kurulum kapısı LİSTE değerini eşlemiyor');
  const bt = readFileSync(join(KOK_REPO, '00_genesis', 'BEKCI_TARIFI.md'), 'utf8');
  assert.match(bt, /LİSTE:` satırı MEVCUTSA/, 'bekçi kontratı LİSTE satırını tanımıyor');
  const od = readFileSync(join(KOK_REPO, '00_genesis', 'OTONOM_DONEM_KALIBI.md'), 'utf8');
  assert.match(od, /LİSTE/, 'otonom kural evi LİSTE satırını hiç anmıyor');
});

test('depoda silinmiş G4.3 mührüne CANLI atıf kalmadı', () => {
  // Süpürme `00_genesis/` ağacının tamamını + guard/sevk betiklerini kapsar (ilk yazım yalnız
  // indekse bakıyordu ve BEKCI_TARIFI'ndeki atıf gözden kaçmıştı — hasım turu 2026-07-30).
  const r = spawnSync('grep', ['-rn', 'G4.3', '--include=*.md', '--include=*.sh', '.'],
    { cwd: KOK_REPO, encoding: 'utf8' });
  const canli = (r.stdout || '').split('\n').filter(Boolean)
    .filter((l) => !l.startsWith('./docs/superpowers/'))          // tarihî kayıt
    .filter((l) => !/adimlar\/G4\.md:.*eski G4\.3 mührü/.test(l)); // "kalktı" beyanı meşru
  assert.equal(canli.length, 0, `canlı G4.3 atfı kaldı:\n${canli.join('\n')}`);
});

test('iki kanon dosyası korunan-yollar [SORULUR] bölümünde geliyor', () => {
  const k = readFileSync(join(GUARD, 'korunan-yollar.txt'), 'utf8');
  // BÖLÜM başlığı, dosyanın tepesindeki yorumda da GEÇİYOR: ilk eşleşmeye bakan bir test
  // yolları hiç görmez ve yanlış KIRMIZI basardı — bölüm SON eşleşmeden sonra başlar.
  const sorulur = k.slice(k.lastIndexOf('[SORULUR]'));
  for (const y of ['02_kanon/BITTI_TANIMI.md', '02_kanon/KUTU_PLANI.md']) {
    assert.ok(sorulur.includes(y), `${y} [SORULUR] bölümünde yok`);
  }
});

test('kök CLAUDE.md ajanı KÖKE yönlendiriyor (README ile çelişki kapandı)', () => {
  // Sıra 4'ün açık kalemi: kök CLAUDE.md "00_genesis klasöründe oturum aç" diyordu, README ise
  // proje klasörünü. Alt klasörde açılan oturumda `.claude/` kablosu ve $CLAUDE_PROJECT_DIR
  // yolları kurulmaz — yani bütün koruma sessizce yüklenmez.
  const c = readFileSync(join(KOK_REPO, 'CLAUDE.md'), 'utf8');
  assert.ok(!/`00_genesis\/`\*\* klasöründe oturum aç/.test(c), 'eski cümle duruyor');
  assert.match(c, /proje \*\*KÖKÜNDE\*\*|\*\*proje KÖKÜNDE\*\*/);
  const gc = readFileSync(join(KOK_REPO, '00_genesis', 'CLAUDE.md'), 'utf8');
  assert.match(gc, /proje kökünde açılır/);
  // U12'nin İKİNCİ yarısı (K2, 2026-08-07): çelişkinin ölçülen kısmı "oturum nerede açılır"dı
  // ve kapandı; ÖLÇÜLMEYEN kısmı YÜZEY KİMLİĞİydi — kök CLAUDE.md "İşletim disiplini şablonu",
  // README "KEEL" diye açıyordu, yani aynı ürüne iki ad. Üstelik CLAUDE.md README'yi "sahibin
  // kılavuzu" diye anıyordu, README ise sahip kılavuzunu NASIL_KULLANILIR.md ilan ediyordu:
  // üç yüzey, iki iddia. ÖLÇÜLDÜ: `.claude/` kablosunun CLAUDE.md içeriğine mekanik bağı SIFIR
  // (settings.json'daki dokuz kancanın hiçbiri onu okumaz); tek bağ bekçinin varlık denetimidir.
  // Yani riskin tamamı "ajanın okuduğu ilk cümle"dir ve çare de oradadır.
  assert.match(c, /^# KEEL/, 'kök CLAUDE.md ürüne README\'den farklı bir ad veriyor');
  assert.ok(!/Sahibin kılavuzu da bunu söyler/.test(c),
    'kök CLAUDE.md README\'yi sahip kılavuzu sanıyor — sahip kılavuzu NASIL_KULLANILIR.md\'dir');
  const rd = readFileSync(join(KOK_REPO, 'README.md'), 'utf8');
  assert.match(rd, /`NASIL_KULLANILIR\.md`.*sahip kılavuzu|sahip kılavuzu.*NASIL_KULLANILIR/s,
    'README sahip kılavuzunu adıyla göstermiyor — üç yüzey ayrışır');
});
