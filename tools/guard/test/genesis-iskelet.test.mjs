// genesis-iskelet.test.mjs — GENESIS iskeleti (Faz 2 sıra 4 · F1-1): bölünmüş tarif + makine
// bloğu + kurulum sürücüsü.
//
// Faz 2 sıra 4'ün BİTTİ ÖLÇÜTÜ: "sürücü testinde G0 bitmeden G1 açılamıyor."
// O ölçütün karşılığı bu dosyadaki "sıra kilidi" bölümüdür ve üç yönden sınanır
// (tamamlanan boş · eksik · araya boşluk girmiş).
//
// TAVAN SAYILARININ EVİ: tools/guard/kurulum-denetimi.sh. Test onları BETİKTEN okur; ölçülen
// dosyalar `00_genesis/adimlar/` altındadır, yani sayı ölçtüğü metnin İÇİNDE durmuyor —
// otonom-sim'in 2026-07-28 hasım bulgusundaki YOZLAŞMIŞ hâl (tavanı kendi dosyasından okuyan
// test) burada yok. AMA "aynı düzenlemede sayıyı da büyütmek" hâlâ MÜMKÜNDÜR ve bu ölçüldü
// (hasım turu 2026-07-30: `ADIM_TOPLAM`ı büyütmek testi yeşile döndürüyor). Frenin kapattığı
// şey gizli büyüme değil, SESSİZ büyümedir: sayıyı büyütmek bir guard betiğinde görünür,
// beyan gerektiren ve hasım turunun okuduğu bir düzenlemedir. Fren mekanik bir kilit değil,
// karar zorlayıcıdır — abartmıyoruz.
//
// MARJ FRENİ: kurulu-sim/otonom-sim emsali, 500 B. Tavana 500 B kalmadan yeni metin giremez;
// giremezse karar sahibe götürülür (tavanı büyütmek beyanlı bir karardır, sessiz bir refleks değil).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const GUARD = join(BURASI, '..');
const KOK = join(GUARD, '..', '..');
const SURUCU = join(GUARD, 'kurulum-surucu.sh');
const DENETIM = join(GUARD, 'kurulum-denetimi.sh');
const ADIM_DIZIN = join(KOK, '00_genesis', 'adimlar');
const MARJ_FRENI = 500;

function tavanOku(ad) {
  const b = readFileSync(DENETIM, 'utf8');
  const m = b.match(new RegExp(`^${ad}=(\\d+)`, 'm'));
  assert.ok(m, `kurulum-denetimi.sh içinde ${ad} sabiti bulunamadı`);
  return Number(m[1]);
}

const siraSatirlari = () =>
  readFileSync(join(ADIM_DIZIN, 'SIRA.txt'), 'utf8')
    .split('\n')
    .filter((s) => s.trim() && !s.startsWith('#'))
    .map((s) => {
      const [kimlik, dosya, cumle] = s.split('\t');
      return { kimlik, dosya, cumle };
    });

// ── 1 · Bölünmüş tarif: sıra verisi ↔ adım dosyaları ─────────────────────────────────────

test('sıra verisi ↔ adım dosyaları ÇİFT YÖNLÜ eşleşiyor', () => {
  const sira = siraSatirlari();
  assert.ok(sira.length >= 2, 'sıra en az iki adım taşımalı');
  const diskte = readdirSync(ADIM_DIZIN).filter((a) => a.endsWith('.md')).sort();
  for (const s of sira) {
    assert.ok(s.dosya, `sıra satırında dosya adı yok: ${s.kimlik}`);
    assert.ok(existsSync(join(ADIM_DIZIN, s.dosya)), `listede var, diskte yok: ${s.dosya}`);
    assert.ok(s.cumle && s.cumle.trim().length > 10, `sahip cümlesi eksik/kısa: ${s.kimlik}`);
  }
  // Ters yön ayrı bir sessiz kusurdur: sürücü listede olmayan dosyayı hiç açmaz.
  for (const d of diskte) {
    assert.ok(sira.some((s) => s.dosya === d), `diskte var, sırada kayıtlı değil: ${d}`);
  }
});

test('sahip cümleleri KEEL sözlüğü taşımaz (sürücünün talimatına girer, sahibe dolaylı ulaşır)', () => {
  // Gerekçe: sürücü durduğunda üçüncü alanı TALİMATINA koyar; talimat modele gider ve model
  // sahiple onun üzerinden konuşur. O an sahip KEEL'i henüz öğrenmemiştir.
  const yasak = ['kadran', 'kanon', 'çapa', 'mühür', 'kutu', 'dönem', 'sevk', 'bekçi', 'ölçüt'];
  for (const s of siraSatirlari()) {
    for (const k of yasak) {
      assert.ok(!s.cumle.toLocaleLowerCase('tr').includes(k),
        `sıra cümlesinde KEEL sözlüğü var: ${s.kimlik} → "${k}"`);
    }
  }
});

test('her adım dosyası kendi tavanına sığar (marj raporlanır)', (t) => {
  const TAVAN = tavanOku('ADIM_TAVANI');
  const olcum = siraSatirlari().map((s) => ({
    ad: s.dosya,
    b: Buffer.byteLength(readFileSync(join(ADIM_DIZIN, s.dosya)), 'utf8'),
  }));
  for (const o of olcum) t.diagnostic(`${o.ad}: ${o.b}B · marj ${TAVAN - o.b}B`);
  for (const o of olcum) {
    assert.ok(o.b <= TAVAN, `adım dosyası tavanı aşıyor: ${o.ad} ${o.b}B > ${TAVAN}B`);
  }
});

test('tarif TOPLAM tavanına sığar ve marj-freni (≥500B) korunur', (t) => {
  const TAVAN = tavanOku('ADIM_TOPLAM');
  let toplam = Buffer.byteLength(readFileSync(join(KOK, 'GENESIS.md')), 'utf8');
  toplam += Buffer.byteLength(readFileSync(join(KOK, '00_genesis', 'BEKCI_TARIFI.md')), 'utf8');
  for (const s of siraSatirlari()) toplam += Buffer.byteLength(readFileSync(join(ADIM_DIZIN, s.dosya)), 'utf8');
  const marj = TAVAN - toplam;
  t.diagnostic(`tarif toplamı: ${toplam}B · tavan: ${TAVAN}B · marj: ${marj}B`);
  assert.ok(toplam <= TAVAN, `tarif toplam tavanını aşıyor: ${toplam}B > ${TAVAN}B`);
  assert.ok(marj >= MARJ_FRENI,
    `marj-freni ihlali: ${marj}B < ${MARJ_FRENI}B — metni sıkıştır ya da tavan kararını beyanla yeniden al`);
});

test('indeks adım METNİNİ taşımaz, YERİNİ gösterir', () => {
  const i = readFileSync(join(KOK, 'GENESIS.md'), 'utf8');
  for (const s of siraSatirlari()) {
    assert.ok(i.includes(`00_genesis/adimlar/${s.dosya}`), `indeks ${s.dosya} işaretçisini taşımıyor`);
  }
  // Adım gövdesi indekste kalmamalı: kalırsa iki kopya doğar ve biri sessizce eskir.
  assert.ok(!/^### G0 · /m.test(i), 'adım gövdesi (### G0) hâlâ indekste — iki kopya drift kapısıdır');
  assert.ok(!i.includes('Bekçi-tarifi kontratı ('), 'bekçi kontratı hâlâ indekste');
});

test('kökteki dosya adı GENESIS.md kalmalı (kurulum girişinin KEEL izi)', () => {
  // klasor-hazirligi.sh:87 bu ADI iz olarak arar; kalkarsa kurulum girişi hiç koşmaz.
  assert.ok(existsSync(join(KOK, 'GENESIS.md')));
  const kh = readFileSync(join(GUARD, 'klasor-hazirligi.sh'), 'utf8');
  assert.match(kh, /for iz in "GENESIS\.md"/, 'kurulum girişinin iz listesi değişmiş — bağ kopmuş olabilir');
});

test('bekçi kablo listesi İKİ Stop kancasını da sayar (koparsa göz kör kalmasın)', () => {
  const t = readFileSync(join(KOK, '00_genesis', 'BEKCI_TARIFI.md'), 'utf8');
  assert.ok(t.includes('tools/sevk/sevk.sh'), 'kablo listesinde Stop→sevk yok');
  assert.ok(t.includes('tools/guard/kurulum-surucu.sh'), 'kablo listesinde Stop→kurulum sürücüsü yok');
  assert.ok(t.includes('devir-kapisi.sh'), 'kablo listesinde PreToolUse Task|Agent devir kapısı yok');
});

test('Stop kablosu şablonla bağlı gelir: iki girdi, ikisi de tam yolla', () => {
  const s = JSON.parse(readFileSync(join(KOK, '.claude', 'settings.json'), 'utf8'));
  const komutlar = (s.hooks.Stop || []).flatMap((g) => g.hooks || []).map((h) => h.command);
  assert.ok(komutlar.some((k) => k === 'bash "$CLAUDE_PROJECT_DIR/tools/sevk/sevk.sh"'), 'sevk kablosu yok');
  assert.ok(komutlar.some((k) => k === 'bash "$CLAUDE_PROJECT_DIR/tools/guard/kurulum-surucu.sh"'),
    'kurulum sürücüsü kablosu yok — GENESIS onu kurulumda BAĞLAYAMAZ (.claude kurulum penceresinde de [SERT])');
});

test('sürücünün fren sayacı izlenmez (makine durumu)', () => {
  const gi = readFileSync(join(KOK, '.gitignore'), 'utf8');
  assert.match(gi, /^tools\/guard\/\.kurulum-surucu-durum$/m);
});

// ── 2 · Sürücü: kum havuzu ───────────────────────────────────────────────────────────────

function kur({ durum = 'açık', adim = 'G0', tamamlanan = '—', kurulumTamam = false,
               keelKaynak = false, donemAcik = false, blokSil = false, siraSil = false,
               adimSil = null, kapiIzi = false } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'genesis-iskelet-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  cpSync(join(KOK, '00_genesis'), join(kok, '00_genesis'), { recursive: true });
  cpSync(SURUCU, join(kok, 'tools', 'guard', 'kurulum-surucu.sh'));
  let g = readFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), 'utf8');
  if (blokSil) {
    g = g.replace(/## KURULUM DURUMU[^\n]*\n```\n[\s\S]*?\n```\n/, '');
  } else {
    g = g.replace(/(## KURULUM DURUMU[^\n]*\n```\n)[\s\S]*?(\n```)/,
      `$1Adım: ${adim}\nDurum: ${durum}\nTamamlanan: ${tamamlanan}$2`);
  }
  writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), g);
  if (kurulumTamam) writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-29\n');
  if (keelKaynak) writeFileSync(join(kok, 'tools', 'guard', '.keel-kaynak'), 'bakimci\n');
  if (donemAcik) writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), 'DONEM-1\n');
  // Çekilme kapısının YEŞİL izi. Son adımı ilgilendiren senaryolarda kurulur; izin KENDİ kapısı
  // ayrı testlerde sınanıyor.
  if (kapiIzi) writeFileSync(join(kok, 'tools', 'guard', '.kurulum-denetimi-son'), '2026-07-30 03:00\n');
  if (siraSil) rmSync(join(kok, '00_genesis', 'adimlar', 'SIRA.txt'));
  if (adimSil) rmSync(join(kok, '00_genesis', 'adimlar', adimSil));
  return kok;
}

const kos = (kok) =>
  spawnSync('bash', [join(kok, 'tools', 'guard', 'kurulum-surucu.sh')], {
    encoding: 'utf8',
    input: '{"hook_event_name":"Stop"}',
    env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: kok, LC_ALL: 'C.UTF-8' },
  });

const blokOku = (kok) => {
  const g = readFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), 'utf8');
  const m = g.match(/## KURULUM DURUMU[^\n]*\n```\n([\s\S]*?)\n```/);
  const alan = (ad) => (m ? (m[1].match(new RegExp(`^${ad}:\\s*(.*)$`, 'm')) || [, ''])[1].trim() : '');
  return { adim: alan('Adım'), durum: alan('Durum'), tamamlanan: alan('Tamamlanan') };
};

test('sürücü sözdizimi (bash -n) ve saf kabuk (node çağırmaz)', () => {
  assert.equal(spawnSync('bash', ['-n', SURUCU], { encoding: 'utf8' }).status, 0);
  const k = readFileSync(SURUCU, 'utf8');
  // Kanca her oturum kapanışında koşar ve node'un varlığını G0.0 ölçer — sıra sürücüsü o
  // ölçümün sonucuna bağlı olamaz (ortam-kontrol.sh ile aynı gerekçe).
  assert.ok(!/\bnode\b/.test(k.replace(/^#.*$/gm, '')), 'sürücü node çağırıyor — saf kabuk kalmalı');
});

test('sessiz geçtiği dört hâl: kurulum bitti · KEEL kopyası · dönem açık · başlamadı', () => {
  const sira = siraSatirlari().map((s) => s.kimlik);
  for (const [ad, opt] of [
    // "Kurulum bitti" MEŞRU hâli: işaret + son adım + bitti. İşaretin tek başına susturucu
    // olmadığı ayrı testte sınanıyor (erken işaret).
    ['kurulum bitti', { kurulumTamam: true, durum: 'bitti', adim: sira[sira.length - 1], tamamlanan: sira.slice(0, -1).join(', ') }],
    // KEEL'in kendi kopyası MEŞRU hâli: işaret + blok "başlamadı" (şablonun kendi durumu).
    // İşaretin tek başına susturucu OLMADIĞI ayrı testte sınanıyor.
    ['KEEL kopyası', { keelKaynak: true, durum: 'başlamadı', adim: '—' }],
    ['dönem açık', { donemAcik: true }],
    ['başlamadı', { durum: 'başlamadı', adim: '—' }],
  ]) {
    const r = kos(kur(opt));
    assert.equal(r.status, 0, `${ad}: exit ${r.status}\n${r.stderr}`);
    assert.equal(r.stdout.trim(), '', `${ad}: stdout boş olmalı`);
    assert.equal(r.stderr.trim(), '', `${ad}: stderr boş olmalı`);
  }
});

test('BAKIMCI işareti de sessiz kapatma düğmesi OLAMAZ (.keel-kaynak)', () => {
  // Bu, kapatılan `.kurulum-tamam` yolundan DAHA UCUZ bir susturmaydı: tek `touch` ile sıra
  // denetimi + açılış hatırlatması + çekilme kapısı birlikte ve iz bırakmadan susuyordu.
  // Gerekçe üç satır yukarıda komşusu için yazılıydı, buna uygulanmamıştı (hasım turu 2026-07-30).
  const r = kos(kur({ keelKaynak: true, durum: 'açık', adim: 'G1', tamamlanan: 'G0' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Bakımcı işareti .* var ama bu klasörde kurulum sürüyor/);
});

test('bakımcı işareti DİZİN hâlinde geçerli sayılmaz', () => {
  const kok = kur({ durum: 'açık', adim: 'G1', tamamlanan: 'G0' });
  mkdirSync(join(kok, 'tools', 'guard', '.keel-kaynak'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Açık adım: G1/, 'dizin hâli sürücüyü susturdu');
});

test('ERKEN kurulum işareti sessiz kapatma düğmesi OLAMAZ', () => {
  // İşaret kurulum penceresinde file-guard'ın çekirdek istisnasının DIŞINDADIR: kuran ajan ya da
  // bir `touch` onu ortada yaratabilir. Yaratırsa sürücü + açılış hatırlatması + G4.5'in kurulum
  // kipi AYNI ANDA susardı — sessiz yeşilin en pahalı biçimi (hasım turu 2026-07-29).
  const r = kos(kur({ kurulumTamam: true, durum: 'açık', adim: 'G2', tamamlanan: 'G0, G1' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Kurulum işareti .* var ama kurulum kaydı bitmiş görünmüyor/);
});

test('BAYAT "başlamadı": kurulum ilerlemişken blok güncellenmemişse ENGEL', () => {
  // "başlamadı" sürücüyü susturur; blok hiç güncellenmezse sürücü kurulumun TAMAMI boyunca
  // konuşmaz ve sahibin ekranına yanlış cümle basılır. Ayırt eden: kurulumun ürettiği klasörler.
  const kok = kur({ durum: 'başlamadı', adim: '—' });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /kurulum fiilen ilerlemiş/);
});

test('NEGATİF: dokunulmamış indirmede "başlamadı" yanlış alarm vermez', () => {
  const r = kos(kur({ durum: 'başlamadı', adim: '—' }));
  assert.equal(r.status, 0);
  assert.equal(r.stderr.trim(), '');
});

test('tek yazımda sıra atlama: liste bir turda çok adım büyürse ENGEL', () => {
  // Kilidin üçüncü atlama biçimi: kuran ajan G1-G4'ü hiç açmadan tek Edit ile hepsini
  // "tamamlandı" ilan ederse, iç tutarlılık denetimi bunu meşru görüyordu.
  const kok = kur({ durum: 'açık', adim: 'G0' });
  kos(kok); // sayaç çapası doğsun (Tamamlanan sayısı 0)
  const y = join(kok, '00_genesis', 'GENESIS_DURUM.md');
  writeFileSync(y, readFileSync(y, 'utf8')
    .replace('Adım: G0', 'Adım: G4')
    .replace('Tamamlanan: —', 'Tamamlanan: G0, G1, G2, G3a, G3b'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /bir turda .* atladı/);
});

test('NEGATİF: sürücünün kendi tekil artışı freni tetiklemez', () => {
  const kok = kur({ durum: 'açık', adim: 'G0' });
  kos(kok);
  const y = join(kok, '00_genesis', 'GENESIS_DURUM.md');
  writeFileSync(y, readFileSync(y, 'utf8').replace('Durum: açık', 'Durum: bitti'));
  const r = kos(kok);
  assert.match(r.stderr, /Sıradaki adım AÇILDI: G1/);
  assert.ok(!/atladı/.test(r.stderr), 'sürücünün kendi artışı atlama sayıldı');
});

test('blokta aynı alan iki kez yazılıysa ENGEL (sessiz ayrışma)', () => {
  const kok = kur({ durum: 'açık', adim: 'G0' });
  const y = join(kok, '00_genesis', 'GENESIS_DURUM.md');
  writeFileSync(y, readFileSync(y, 'utf8').replace('Durum: açık', 'Durum: açık\nDurum: bitti'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /alanı 2 kez yazılmış/);
});

test('Tamamlanan listesi FAZLA ise teşhis doğru yönü gösterir', () => {
  // Tek yönlü cümle ("hepsi tamamlanmamış") düzeltmeye çalışan tarafı listeye adım EKLEMEYE
  // yönlendiriyordu — gerçek hata fazlalıkken.
  const r = kos(kur({ durum: 'açık', adim: 'G1', tamamlanan: 'G0, G1' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /gerekenden FAZLA adım sayıyor/);
});

test('Tamamlanan alanında joker karakter dosya adı genişletmez', () => {
  // `for t in $TAMAMLANAN` kotelenmemişken `*` kökteki dosya adlarını listeye sokuyor ve rapor
  // dosyada YAZMAYAN bir kimliği suçluyordu (yanlış rapor).
  const r = kos(kur({ durum: 'açık', adim: 'G1', tamamlanan: '*' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /tanınmayan adım: '\*'/);
});

test('SIRA.txt tekrarlı kimlik: konumdan bağımsız ENGEL', () => {
  // Tekrar, `sira_indeks`i belirsiz ve `sira_sonraki`yi çok satırlı yapar. Denetim YÜKLEME
  // sırasında olmalı: tekrar SONDA olduğunda çok satırlı değer doğmuyordu, yani "sıradaki tek mi"
  // kontrolü tek başına bu hâli kaçırıyordu (ilk yazımın kusuru, kendi testi yakaladı).
  for (const yer of ['son', 'orta']) {
    const kok = kur({ durum: 'bitti', adim: 'G0' });
    const y = join(kok, '00_genesis', 'adimlar', 'SIRA.txt');
    const satirlar = readFileSync(y, 'utf8').split('\n');
    const kopya = 'G0\tG0.md\tikinci kez';
    if (yer === 'son') satirlar.push(kopya);
    else satirlar.splice(satirlar.findIndex((s) => s.startsWith('G2\t')), 0, kopya);
    writeFileSync(y, satirlar.join('\n'));
    const r = kos(kok);
    assert.equal(r.status, 2, `${yer}: engellenmedi`);
    assert.match(r.stderr, /birden fazla kez geçiyor/, `${yer}: yanlış teşhis`);
  }
});

test('açık adım oturumu kapattırmaz ve adım dosyasını ADIYLA söyler', () => {
  const r = kos(kur({ durum: 'açık', adim: 'G0' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /00_genesis\/adimlar\/G0\.md/);
  assert.match(r.stderr, /AÇMADAN uygulama/, 'indeks özetiyle yetinme kuralı talimatta olmalı');
});

test('sahip bekleniyorsa oturum KAPANABİLİR (mühür anında sahibi hapsetme)', () => {
  const r = kos(kur({ durum: 'bekliyor', adim: 'G2', tamamlanan: 'G0, G1' }));
  assert.equal(r.status, 0);
  assert.equal(r.stderr.trim(), '');
});

test('adım bitince sürücü SIRADAKİNİ açar ve bloğu yerinde yeniden yazar', () => {
  const kok = kur({ durum: 'bitti', adim: 'G0' });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Sıradaki adım AÇILDI: G1/);
  const b = blokOku(kok);
  assert.deepEqual(b, { adim: 'G1', durum: 'açık', tamamlanan: 'G0' });
});

// ── 3 · SIRA KİLİDİ — Faz 2 sıra 4'ün bitti ölçütü ───────────────────────────────────────

test('BİTTİ ÖLÇÜTÜ: G0 bitmeden G1 açılamıyor', () => {
  const r = kos(kur({ durum: 'açık', adim: 'G1', tamamlanan: '—' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Sıra atlandı/);
});

test('sıra kilidi: eksik tamamlanan (G2 açık ama yalnız G0 bitmiş) → ENGEL', () => {
  const r = kos(kur({ durum: 'açık', adim: 'G2', tamamlanan: 'G0' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Sıra atlandı/);
});

test('sıra kilidi: araya boşluk girmiş liste (G0, G2) → ENGEL', () => {
  const r = kos(kur({ durum: 'açık', adim: 'G3a', tamamlanan: 'G0, G2' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Sıra bozuk/);
});

test('sıra kilidi NEGATİF: sırası gelmiş adım engellenmez (yanlış alarm yok)', () => {
  const r = kos(kur({ durum: 'açık', adim: 'G2', tamamlanan: 'G0, G1' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Açık adım: G2/);
  assert.ok(!/Sıra atlandı|Sıra bozuk/.test(r.stderr), 'meşru sırada "atlandı" denmemeli');
});

test('boşluklu yazım meşru: "G0, G1" ile "G0,G1" aynı sayılır', () => {
  for (const t of ['G0, G1', 'G0,G1', ' G0 , G1 ']) {
    const r = kos(kur({ durum: 'açık', adim: 'G2', tamamlanan: t }));
    assert.match(r.stderr, /Açık adım: G2/, `"${t}" okunamadı`);
  }
});

test('tam sıra: sekiz turda G0→G5 yürür ve tamamlanan listesi birikir', () => {
  const kok = kur({ durum: 'açık', adim: 'G0', kapiIzi: true });
  const sira = siraSatirlari().map((s) => s.kimlik);
  for (let i = 0; i < sira.length; i++) {
    const g = readFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), 'utf8');
    writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), g.replace('Durum: açık', 'Durum: bitti'));
    kos(kok);
  }
  const b = blokOku(kok);
  assert.equal(b.adim, sira[sira.length - 1], 'son adımda durmalı (kurulum işareti yok)');
  assert.equal(b.tamamlanan, sira.slice(0, -1).join(', '));
});

// ── 4 · Fail-closed: sessiz yeşil yok ────────────────────────────────────────────────────

test('makine bloğu yok → SESSİZ GEÇMEZ (ölçemedim ≠ kurulum yok)', () => {
  const r = kos(kur({ blokSil: true }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /makine bloğu okunamadı/);
});

test('tanınmayan Durum değeri → ENGEL (fail-closed)', () => {
  const r = kos(kur({ durum: 'yolunda' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Durum alanı tanınmadı/);
});

test('tanınmayan Adım kimliği → ENGEL', () => {
  const r = kos(kur({ adim: 'G9' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Adım kimliği sırada yok/);
});

test('Durum açık ama Adım boş → ENGEL', () => {
  const r = kos(kur({ adim: '—' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Adım alanı boş/);
});

test('sıra dosyası yok → ENGEL', () => {
  const r = kos(kur({ siraSil: true }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Sıra dosyası okunamıyor/);
});

test('adım dosyası yok → ENGEL (listede var, diskte yok)', () => {
  const r = kos(kur({ adim: 'G0', adimSil: 'G0.md' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Adım dosyası okunamıyor/);
});

test('CRLF satır sonlu SIRA.txt: dosya adına \\r yapışmaz', () => {
  // Kabuk yolları awk gibi CR yutmaz: "G0.md\r" diye bir dosya yoktur ve kanca yanlış yere
  // "adım dosyası okunamıyor" derdi. Bu ailenin yerleşik dersi (CRLF'in cümleye sızması).
  const kok = kur({ durum: 'açık', adim: 'G0' });
  const y = join(kok, '00_genesis', 'adimlar', 'SIRA.txt');
  writeFileSync(y, readFileSync(y, 'utf8').replace(/\n/g, '\r\n'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Açık adım: G0/);
  assert.ok(!/\r/.test(r.stderr), 'CR sahibin ekranına sızdı');
  assert.ok(!/okunamıyor/.test(r.stderr), 'CR dosya adına yapıştı');
});

test('sıra satırında üçüncü alan boş olsa da kapı yanlış alarm vermez', () => {
  // Ters yön denetimi ham grep ile yazılırsa (sondaki TAB'ı arayarak) üçüncü alanı boş bir
  // satırda "listede yok" der. Kapı SIRA'dan toplanan dosya adları listesine bakar.
  const kok = mkdtempSync(join(tmpdir(), 'genesis-kapi-bos-'));
  cpSync(join(KOK, '00_genesis'), join(kok, '00_genesis'), { recursive: true });
  cpSync(join(KOK, 'GENESIS.md'), join(kok, 'GENESIS.md'));
  const y = join(kok, '00_genesis', 'adimlar', 'SIRA.txt');
  writeFileSync(y, readFileSync(y, 'utf8').replace(/^G0\t(G0\.md)\t.*$/m, 'G0\t$1'));
  const r = spawnSync('bash', [DENETIM, kok], { encoding: 'utf8' });
  assert.ok(!/diskte var, listede yok/.test(r.stdout), `yanlış alarm: ${r.stdout}`);
});

test("kapı 'G' ile başlamayan adım dosyasını da görür (ters yön kör noktası)", () => {
  // Desen 'G*.md' olsaydı ileride adı değişen bir adım dosyası sırada kayıtsız kalıp
  // görünmez olurdu — sessiz kusur.
  const r = kapi(kuruluFixture((k) =>
    writeFileSync(join(k, '00_genesis', 'adimlar', 'HAZIRLIK.md'), '### kaçak adım\n')));
  assert.match(r.stdout, /sırada kayıtlı değil: HAZIRLIK\.md/);
});

test('son adım bitti ama kurulum işareti yok → ENGEL (çekilme yarım)', () => {
  const sira = siraSatirlari().map((s) => s.kimlik);
  const r = kos(kur({ durum: 'bitti', adim: sira[sira.length - 1], tamamlanan: sira.slice(0, -1).join(', '), kapiIzi: true }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Çekilme dizisi tamamlanmamış/);
});

// ── 5 · Döngü freni ──────────────────────────────────────────────────────────────────────

test('döngü freni: aynı hâlde 3 kez durdurur, 4.te çekilir, sonra sayaç sıfırlanır', () => {
  const kok = kur({ durum: 'açık', adim: 'G0' });
  for (let i = 1; i <= 3; i++) {
    assert.equal(kos(kok).status, 2, `${i}. tur engellemeliydi`);
  }
  const dorduncu = kos(kok);
  assert.equal(dorduncu.status, 0, 'fren devreye girmedi — oturum hapsedilir');
  assert.match(dorduncu.stdout, /ÇEKİLDİ/);
  // Kalıcı ölüm YOK: sayaç sıfırlanır, sonraki oturumda yeniden üç şans.
  assert.equal(kos(kok).status, 2, 'fren kalıcı ölmüş — sürücü bir daha hiç konuşmaz');
});

test('ilerleme sayacı sıfırlar: adım değişince fren baştan sayar', () => {
  const kok = kur({ durum: 'açık', adim: 'G0' });
  kos(kok); kos(kok); kos(kok);
  const g = readFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), 'utf8');
  writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), g.replace('Durum: açık', 'Durum: bitti'));
  assert.equal(kos(kok).status, 2, 'ilerleme oldu, fren yine de çekildi');
  assert.equal(kos(kok).status, 2, 'yeni adımda fren baştan saymalı');
});

test('stop_hook_active fren OLARAK kullanılmaz (sürücü çok turludur)', () => {
  const kok = kur({ durum: 'açık', adim: 'G0' });
  const r = spawnSync('bash', [join(kok, 'tools', 'guard', 'kurulum-surucu.sh')], {
    encoding: 'utf8',
    input: '{"hook_event_name":"Stop","stop_hook_active":true}',
    env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: kok, LC_ALL: 'C.UTF-8' },
  });
  assert.equal(r.status, 2, 'stop_hook_active sürücüyü susturuyor — normal işleyişi (her adımda bir tur) ölür');
});

// ── 6 · Çekilme kapısı (G4.5) — yeni 4d/4e denetimleri ───────────────────────────────────
// Not: tam kurulum senaryosunun kendisi kurulum-denetimi.test.mjs'te yaşar; burada yalnız yeni
// iki kapının NEGATİF kanıtı var (kapının fiilen kırmızı bastığı).

function kuruluFixture(bozma = (kok) => {}) {
  const kok = mkdtempSync(join(tmpdir(), 'genesis-kapi-'));
  cpSync(join(KOK, '00_genesis'), join(kok, '00_genesis'), { recursive: true });
  cpSync(join(KOK, 'GENESIS.md'), join(kok, 'GENESIS.md'));
  bozma(kok);
  return kok;
}

const kapi = (kok) => spawnSync('bash', [DENETIM, kok], { encoding: 'utf8' });

test('4d: adım dosyası eksikse çekilme kapısı KIRMIZI', () => {
  const r = kapi(kuruluFixture((k) => rmSync(join(k, '00_genesis', 'adimlar', 'G3a.md'))));
  assert.match(r.stdout, /listede var, diskte yok/);
});

test('4d: sırada kayıtsız adım dosyası KIRMIZI (ters yön)', () => {
  const r = kapi(kuruluFixture((k) =>
    writeFileSync(join(k, '00_genesis', 'adimlar', 'G7.md'), '### G7 · kaçak adım\n')));
  assert.match(r.stdout, /diskte var, listede yok/);
});

test('4d: tavanı aşan adım dosyası KIRMIZI', () => {
  const TAVAN = tavanOku('ADIM_TAVANI');
  const r = kapi(kuruluFixture((k) =>
    writeFileSync(join(k, '00_genesis', 'adimlar', 'G1.md'), 'x'.repeat(TAVAN + 1))));
  assert.match(r.stdout, /kendi tavanını aşıyor/);
});

test('4d: bekçi kontratı eksikse KIRMIZI', () => {
  const r = kapi(kuruluFixture((k) => rmSync(join(k, '00_genesis', 'BEKCI_TARIFI.md'))));
  assert.match(r.stdout, /BEKCI_TARIFI\.md yok/);
});

test('4d: indeks 00_genesis/ altına TAŞINMIŞ olsa da kapı geçer (G5.3.a zamanlaması)', () => {
  const r = kapi(kuruluFixture((k) => {
    cpSync(join(k, 'GENESIS.md'), join(k, '00_genesis', 'GENESIS.md'));
    rmSync(join(k, 'GENESIS.md'));
  }));
  assert.ok(!/GENESIS indeksi yok/.test(r.stdout), 'taşınmış indeks bulunamadı — kapı kalıcı kırmızıya düşer');
  assert.match(r.stdout, /kurulum tarifi: \d+ adım/);
});

test('4e: makine bloğu "başlamadı" iken çekilme KIRMIZI (sürücü hiç devreye girmemiş)', () => {
  const r = kapi(kuruluFixture(() => {}));
  assert.match(r.stdout, /blok hiç güncellenmemiş/);
});

test('4e: makine bloğu silinmişse KIRMIZI', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = join(k, '00_genesis', 'GENESIS_DURUM.md');
    writeFileSync(y, readFileSync(y, 'utf8').replace(/## KURULUM DURUMU[^\n]*\n```\n[\s\S]*?\n```\n/, ''));
  }));
  assert.match(r.stdout, /makine bloğu okunamadı/);
});

test('makine bloğunda alan EKSİKSE de ENGEL (yokluk da fail-closed)', () => {
  // Tekrar denetleniyordu, yokluk sessiz geçiyordu: yazıcı awk yalnız VAR OLAN satırı ikame eder,
  // eksik alanı yaratamaz — `Tamamlanan` silinmişse sürücü "AÇILDI" der, biten adımın kaydı
  // kalıcı kaybolur ve sonraki tur haksız "sıra atlandı" basar (hasım turu 2026-07-30).
  const kok = kur({ durum: 'bitti', adim: 'G0' });
  const y = join(kok, '00_genesis', 'GENESIS_DURUM.md');
  writeFileSync(y, readFileSync(y, 'utf8').replace(/^Tamamlanan:.*$/m, ''));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /'Tamamlanan' alanı yok/);
});

test('ÇİFT HATTIN TERS YÖNÜ: çekilme kapısı koşmadan SON adım açılmaz', () => {
  // Kapı hiçbir kancada değil ve kendi başına koşmaz; izi yoksa hiç koşmamış olabilir — ve
  // "ama kapı yakalar" savına yaslanan bütün güvenceler boşa düşer (hasım turu 2026-07-30).
  const sira = siraSatirlari().map((s) => s.kimlik);
  const sondanBir = sira[sira.length - 2];
  const kok = kur({ durum: 'bitti', adim: sondanBir, tamamlanan: sira.slice(0, -2).join(', ') });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /YEŞİL koşmadan/);
  assert.match(r.stderr, /kurulum-denetimi\.sh/, 'çare komutu verilmemiş');
});

test('kapı izi kapısı TEK ATIMLIK DEĞİL: son adım açıkken de her turda durdurur', () => {
  // İlk yazımda kontrol bloğu 'açık'a yazdıktan SONRA geliyordu: bir tur engelledikten sonra
  // kayıt zaten `açık` olduğu için `açık` yolu o satıra hiç gelmiyordu ve çekilmenin TAMAMI
  // denetimsiz tamamlanabiliyordu — "kapı değil, bir kere çalan zil" (hasım turu 2026-07-30).
  const sira = siraSatirlari().map((s) => s.kimlik);
  const kok = kur({ durum: 'açık', adim: sira[sira.length - 1], tamamlanan: sira.slice(0, -1).join(', ') });
  for (let i = 1; i <= 3; i++) {
    const r = kos(kok);
    assert.equal(r.status, 2, `${i}. tur susmuş — kapı tek atımlık`);
    assert.match(r.stderr, /YEŞİL koşmadan/, `${i}. tur başka sebeple durdu`);
  }
});

test('kapı izi DİZİN hâlinde geçerli sayılmaz (mkdir ile uydurulamaz)', () => {
  // Aynı ders `.donem-acik` için betiğin 74. satırında yazılıydı; yeni kodda uygulanmamıştı.
  // Dizin hâli ayrıca kalıcıdır: KIRMIZI kapı bile onu silemez.
  const sira = siraSatirlari().map((s) => s.kimlik);
  const kok = kur({ durum: 'açık', adim: sira[sira.length - 1], tamamlanan: sira.slice(0, -1).join(', ') });
  mkdirSync(join(kok, 'tools', 'guard', '.kurulum-denetimi-son'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /YEŞİL koşmadan/);
});

test('NEGATİF: kapı izi varken son adım açılır', () => {
  const sira = siraSatirlari().map((s) => s.kimlik);
  const sondanBir = sira[sira.length - 2];
  const kok = kur({ durum: 'bitti', adim: sondanBir, tamamlanan: sira.slice(0, -2).join(', '), kapiIzi: true });
  const r = kos(kok);
  assert.match(r.stderr, new RegExp(`Sıradaki adım AÇILDI: ${sira[sira.length - 1]}`));
});

test('çekilme kapısı YEŞİL iken iz bırakır, KIRMIZI iken siler', () => {
  const kok = kuruluFixture(() => {});
  const iz = join(kok, 'tools', 'guard', '.kurulum-denetimi-son');
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  writeFileSync(iz, 'eski\n');
  const r = kapi(kok); // fixture eksik → KIRMIZI
  assert.equal(r.status, 2);
  assert.ok(!existsSync(iz), 'KIRMIZI sonrası eski iz silinmedi — bayat iz son adımı açardı');
});

test('SIRA.txt kendi tavanını taşır (her Stop turunda okunan dosya)', () => {
  const TAVAN = tavanOku('SIRA_TAVANI');
  const b = Buffer.byteLength(readFileSync(join(ADIM_DIZIN, 'SIRA.txt')), 'utf8');
  assert.ok(b <= TAVAN, `SIRA.txt tavanı aşıyor: ${b}B > ${TAVAN}B`);
  const r = kapi(kuruluFixture((k) =>
    writeFileSync(join(k, '00_genesis', 'adimlar', 'SIRA.txt'),
      readFileSync(join(ADIM_DIZIN, 'SIRA.txt'), 'utf8') + '# '.padEnd(TAVAN + 10, 'x') + '\n')));
  assert.match(r.stdout, /sıra verisi kendi tavanını aşıyor/);
});

test('4e: tekrarlı Durum alanına kapı da KIRMIZI basar (iki göz aynı hüküm)', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = join(k, '00_genesis', 'GENESIS_DURUM.md');
    writeFileSync(y, readFileSync(y, 'utf8').replace('Durum: başlamadı', 'Durum: açık\nDurum: bitti'));
  }));
  assert.match(r.stdout, /'Durum' alanı 2 kez yazılmış/);
});

test("G5 tarifi bloğun dilbilgisiyle çarpışmaz ('kurulum TAMAM' Durum değeri değildir)", () => {
  // Tarif harfiyen uygulanınca kurulumun SON oturumu engel döngüsüne giriyordu.
  const g5 = readFileSync(join(ADIM_DIZIN, 'G5.md'), 'utf8');
  assert.match(g5, /Durum: bitti/, 'G5 son hâli söylemiyor');
  assert.match(g5, /serbest metin YAZILMAZ|serbest metin.*YAZILMAZ/, 'serbest metin yasağı yazılı değil');
  assert.ok(!/`GENESIS_DURUM`a "kurulum TAMAM" yaz/.test(g5), 'çarpışan eski tarif duruyor');
});

test('G0 sırayı açma emrini taşır (bootstrap penceresi)', () => {
  // Blok hiç kurulmazsa sürücü G0 boyunca sessiz kalır ve sahip ekranı yanlış cümle basar.
  const g0 = readFileSync(join(ADIM_DIZIN, 'G0.md'), 'utf8');
  assert.match(g0, /Sırayı aç/, 'G0 bloğu açma emrini taşımıyor');
  assert.match(g0, /Adım: G0/, 'kurulacak değerler yazılı değil');
});

test('4d FAIL-CLOSED: ölçülemeyen boyut sessiz geçmez ve 4d\'nin gerisi koşmaya devam eder', () => {
  // `$(( T + $(wc -c < x) ))` biçimi, iç komut patladığında ARİTMETİK SÖZDİZİMİ HATASI üretir;
  // o hata ERR trap'i TETİKLEMEZ ve `set -e` betiği DURDURMAZ — yalnız bileşik komutu iptal eder.
  // Sonuç: 4d'nin geri kalanı sessizce atlanır ve SONUÇ YEŞİL basılır; betiğin 6. satırındaki
  // "kendi hatası da KIRMIZI'dır" ilanının tersi (hasım turu 2026-07-30, kritik).
  const r = kapi(kuruluFixture((k) => {
    rmSync(join(k, 'GENESIS.md'));
    mkdirSync(join(k, 'GENESIS.md')); // okunabilir ama ölçülemez
  }));
  assert.match(r.stdout, /boyutu ÖLÇÜLEMEDİ/);
  assert.match(r.stdout, /sırada olup indekste GEÇMEYEN adım/, '4d\'nin gerisi atlandı — sessiz yeşil yolu açık');
  assert.equal(r.status, 2);
});

test('4d: İKİ indeks birden varsa KIRMIZI (G5.3.a taşı der, kopyalamaz)', () => {
  const r = kapi(kuruluFixture((k) =>
    cpSync(join(k, 'GENESIS.md'), join(k, '00_genesis', 'GENESIS.md'))));
  assert.match(r.stdout, /İKİ indeks var/);
});

test('4d: TAŞINMIŞ indeksin kısa işaretçileri yanlış KIRMIZI üretmez', () => {
  // G5.3.a taşımayla birlikte işaretçileri kısaltmayı EMREDİYOR (`adimlar/G0.md` — aynı klasör).
  // Yalnız uzun biçimi aramak, çekilme SONRASI her koşuşta kalıcı yanlış KIRMIZI üretiyordu ve
  // teşhis yanlıştı: "okuyan onu bulamaz" derken indeks doğruydu (hasım turu 2026-07-30).
  const r = kapi(kuruluFixture((k) => {
    const i = readFileSync(join(k, 'GENESIS.md'), 'utf8').replaceAll('00_genesis/adimlar/', 'adimlar/');
    writeFileSync(join(k, '00_genesis', 'GENESIS.md'), i);
    rmSync(join(k, 'GENESIS.md'));
  }));
  assert.ok(!/indekste GEÇMEYEN|SIRADA olmayan/.test(r.stdout), `yanlış KIRMIZI: ${r.stdout}`);
  assert.match(r.stdout, /indeks ↔ sıra eşliği/);
});

test('4d ters yön: alt dizindeki ve sembolik bağ hâlindeki adım dosyası da görülür', () => {
  for (const [ad, kur2] of [
    ['alt dizin', (k) => {
      mkdirSync(join(k, '00_genesis', 'adimlar', 'alt'));
      writeFileSync(join(k, '00_genesis', 'adimlar', 'alt', 'G9.md'), '### G9\n');
    }],
    ['sembolik bağ', (k) => {
      symlinkSync(join(k, '00_genesis', 'adimlar', 'G0.md'), join(k, '00_genesis', 'adimlar', 'G9.md'));
    }],
  ]) {
    const r = kapi(kuruluFixture(kur2));
    assert.match(r.stdout, /sırada kayıtlı değil:.*G9\.md/, `${ad}: kör nokta açık`);
  }
});

test('4d: hiç alt-ajan dosyası yoksa "geçti" demez (yokluk körlüğü)', () => {
  const r = kapi(kuruluFixture(() => {}));
  assert.match(r.stdout, /hiç alt-ajan dosyası yok/);
});

test('4d ikinci tanık: sıra kırpılmışsa indeks onu ele verir', () => {
  // SIRA.txt ve adım dosyaları kurulum penceresinde YAZILABİLİR: sırayı atlamak isteyen taraf
  // ikisini birden kırpıp tutarlı bir yalan kurabilirdi — ve o yolla bu kapının KENDİSİ (G4.5)
  // sıradan çıkarılabiliyordu. İndeks üçüncü, bağımsız kayıttır (hasım turu 2026-07-29).
  const r = kapi(kuruluFixture((k) => {
    const y = join(k, '00_genesis', 'adimlar', 'SIRA.txt');
    writeFileSync(y, readFileSync(y, 'utf8').split('\n').filter((s) => !s.startsWith('G4.5\t')).join('\n'));
    rmSync(join(k, '00_genesis', 'adimlar', 'G4.5.md'));
  }));
  assert.match(r.stdout, /indekste yazılı olup SIRADA olmayan adım:.*G4\.5\.md/);
});

test('4d ikinci tanık ters yön: indekste geçmeyen adım KIRMIZI', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = join(k, '00_genesis', 'adimlar', 'SIRA.txt');
    writeFileSync(y, readFileSync(y, 'utf8') + 'GX\tGX.md\tKimsenin bilmediği bir iş\n');
    writeFileSync(join(k, '00_genesis', 'adimlar', 'GX.md'), '### GX\n');
  }));
  assert.match(r.stdout, /sırada olup indekste GEÇMEYEN adım:.*GX\.md/);
});

test('tanınmayan Durum değeri mesajı BAYT sayısı taşır (görünmeyen yazım farkı)', () => {
  // Türkçe harfler ayrık birleşen işaretlerle yazıldığında ekranda geçerli değerden ayırt
  // edilemez: "X tanınmadı, geçerli değerler: X" gibi onarılamaz görünen bir mesaj çıkar.
  const kok = kur({ durum: 'açık'.normalize('NFD'), adim: 'G0' });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /okuduğum değer 7 bayt/, 'bayt sayısı yok — fark görünmez kalıyor');
  assert.match(r.stderr, /açık \(6\)/, 'beklenen bayt sayısı yok');
});

test('4e NEGATİF: blok "açık" iken bu kapı susar', () => {
  const r = kapi(kuruluFixture((k) => {
    const y = join(k, '00_genesis', 'GENESIS_DURUM.md');
    writeFileSync(y, readFileSync(y, 'utf8').replace('Durum: başlamadı', 'Durum: açık'));
  }));
  assert.match(r.stdout, /kurulum durumu makine-okur \(Durum: açık\)/);
});
