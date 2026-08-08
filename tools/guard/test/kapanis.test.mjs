import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kuyrukBagimliliklariKur } from './kuyruk-bagimliligi.mjs';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KAPANIS = join(BURASI, '..', 'kapanis.sh');
const KOK_REPO = join(BURASI, '..', '..', '..');

function kurulum({ pano = true, damga = null, bekci = null, bekciIcerik = null } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'kapanis-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  // Kanca kuyruğa yazarken içerik süzgecini FAIL-CLOSED arar (U60): VERİ dosyaları projenin
  // kökünden gelir. Kurulu projede hep vardır; simülasyon da taşımak zorunda.
  kuyrukBagimliliklariKur(kok, KOK_REPO);
  if (pano) mkdirSync(join(kok, '00_pano'), { recursive: true });
  if (damga) writeFileSync(join(kok, 'tools', 'guard', '.aktif-rol'), damga);
  if (bekci != null || bekciIcerik != null) {
    mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
    writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'),
      bekciIcerik != null
        ? bekciIcerik
        : '#!/bin/bash\ntouch "$(dirname "$0")/kostu.izi"\nexit ' + bekci + '\n');
    chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  }
  return kok;
}

// --- V2 Öbek-2 (sahip yüzeyi) yardımcıları ---
const KUYRUK = (kok) => join(kok, '00_pano', 'SENDE_BEKLEYEN.md');

// Son asistan mesajı = kapanış özeti; kanca çapayı ORADAN süzer.
function transkriptMesaj(kok, metin, ad = 'kapanis.jsonl') {
  const yol = join(kok, ad);
  const satirlar = [
    { type: 'user', timestamp: '2026-07-24T10:00:00.000Z' },
    { type: 'assistant', timestamp: '2026-07-24T10:01:00.000Z', message: { id: 'a1', content: [{ type: 'text', text: 'ara mesaj — burada blok yok' }] } },
    { type: 'assistant', timestamp: '2026-07-24T10:09:00.000Z', message: { id: 'a2', content: [{ type: 'text', text: metin }] } },
  ];
  writeFileSync(yol, satirlar.map((s) => JSON.stringify(s)).join('\n') + '\n');
  return yol;
}

const BLOK_IKI = [
  '**BİTEN:** kanca yazıldı.',
  '**SENDE BEKLEYEN:** 2 madde',
  '1. Tavan sorusu: EL_KITABI 16KB kalsın mı? · muhatap: sahip',
  '2. Push kararı: gönderelim mi?',
  '**SIRADAKİ:** prova.',
  '3. bu satır SIRADAKİ sonrası — maddeye GİRMEMELİ',
].join('\n');

const acikMaddeler = (kok) =>
  readFileSync(KUYRUK(kok), 'utf8').split('\n').filter((s) => s.startsWith('- [ ]'));

const gunluk = (kok) => join(kok, '00_pano', 'oturum-gunlugu.jsonl');

function kos(kok, stdinIcerik) {
  return spawnSync('bash', [KAPANIS], {
    encoding: 'utf8',
    input: stdinIcerik,
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
}

// Fiilî gözlem (2026-07-13, gerçek transcript): AYNI message.id parça parça tekrar düşer
// (67 usage satırı / 20 benzersiz id). Fixture bu tuzağı bilerek içerir — SON kazanmalı.
function transkriptYaz(kok) {
  const yol = join(kok, 'transkript.jsonl');
  const satirlar = [
    { type: 'user', timestamp: '2026-07-13T10:00:00.000Z' },
    { type: 'assistant', timestamp: '2026-07-13T10:01:00.000Z', message: { id: 'm1', usage: { input_tokens: 100, output_tokens: 10, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 } } },
    { type: 'assistant', timestamp: '2026-07-13T10:02:00.000Z', message: { id: 'm1', usage: { input_tokens: 100, output_tokens: 25, cache_read_input_tokens: 1000, cache_creation_input_tokens: 50 } } },
    { type: 'assistant', timestamp: '2026-07-13T10:05:00.000Z', message: { id: 'm2', usage: { input_tokens: 200, output_tokens: 30, cache_read_input_tokens: 2000, cache_creation_input_tokens: 0 } } },
  ];
  writeFileSync(yol, satirlar.map((s) => JSON.stringify(s)).join('\n') + '\n');
  return yol;
}

const stdinJson = (kok, ekstra = {}) => JSON.stringify({
  session_id: 'test-oturum-1', transcript_path: join(kok, 'yok.jsonl'),
  cwd: kok, hook_event_name: 'SessionEnd', reason: 'other', ...ekstra,
});

test('vault değilse (00_pano yok) sessiz çıkar: exit 0, hiçbir dosya doğmaz', () => {
  const kok = kurulum({ pano: false });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  assert.equal(existsSync(join(kok, '00_pano')), false);
});

test('tam akış: satır düşer — oturum/neden stdin\'den, rol damgadan, bekçi yokken "yok"', () => {
  const kok = kurulum({ damga: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  const satirlar = readFileSync(gunluk(kok), 'utf8').trim().split('\n');
  assert.equal(satirlar.length, 1);
  const j = JSON.parse(satirlar[0]);
  assert.equal(j.surum, 4); // Öbek-2: blok + bekleyen_eklendi · dış göz: porcelain · U60: bekleyen_suzuldu
  assert.equal(j.oturum, 'test-oturum-1');
  assert.equal(j.neden, 'other');
  assert.equal(j.rol, 'denetci');
  assert.equal(j.bekci, 'yok');
});

test('token sayacı: message.id tekilleştirilir (SON kazanır), toplamlar + süre doğru', () => {
  const kok = kurulum();
  const t = transkriptYaz(kok);
  const r = kos(kok, stdinJson(kok, { transcript_path: t }));
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.girdi_token, 300);
  assert.equal(j.cikti_token, 55);
  assert.equal(j.cache_okuma, 3000);
  assert.equal(j.cache_yazma, 50);
  assert.equal(j.sure_dk, 5);
});

test('transcript yok: token alanları null + not dolu, satır YİNE düşer (fail-open)', () => {
  const kok = kurulum();
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.girdi_token, null);
  assert.equal(j.sure_dk, null);
  assert.ok(j.not, 'not alanı sebebi söylemeli');
});

test('bozuk stdin (JSON değil): satır yine düşer, oturum null, exit 0', () => {
  const kok = kurulum();
  const r = kos(kok, 'bu json değil');
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.oturum, null);
});

test('bekçi tamam (exit 0): bekci="tamam" + bekçi FİİLEN koştu (iz dosyası)', () => {
  const kok = kurulum({ bekci: 0 });
  kos(kok, stdinJson(kok));
  assert.ok(existsSync(join(kok, 'tools', 'bekci', 'kostu.izi')), 'bekçi koşmalı');
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'tamam');
});

test('bekçi kırmızı (exit 1): bekci="kirmizi", kanca yine exit 0 (fail-open)', () => {
  const kok = kurulum({ bekci: 1 });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'kirmizi');
});

test('bekçi iç-hata (exit 2): bekci="hata"', () => {
  const kok = kurulum({ bekci: 2 });
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'hata');
});

test('append-only: iki kapanış = iki satır; ilk satır bayt-bayt korunur', () => {
  const kok = kurulum();
  kos(kok, stdinJson(kok));
  const ilk = readFileSync(gunluk(kok), 'utf8');
  kos(kok, stdinJson(kok, { session_id: 'test-oturum-2' }));
  const hepsi = readFileSync(gunluk(kok), 'utf8');
  assert.ok(hepsi.startsWith(ilk), 'ilk satır değişmemeli');
  assert.equal(hepsi.trim().split('\n').length, 2);
});

test('damga yok: rol null', () => {
  const kok = kurulum();
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).rol, null);
});

test('bozuk damga (ASCII-dışı slug): rol null düşer, satır ölmez', () => {
  const kok = kurulum({ damga: 'anlamsız içerik\n' });
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).rol, null);
});

test('damga yaşı: bekçi taze damga yazınca damga_yasi_dk ≤ 1 (plan kararı 12)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), [
    '#!/bin/bash',
    'D="$(cd "$(dirname "$0")/../.." && pwd)"',
    'printf "# SAGLIK\\n\\nson denetim: %s (denetim #7)\\n" "$(date \'+%Y-%m-%d %H:%M\')" > "$D/00_pano/SAGLIK.md"',
    'exit 0',
  ].join('\n'));
  chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekci, 'tamam');
  assert.ok(j.damga_yasi_dk !== null && j.damga_yasi_dk <= 1, 'taze damga: yaş ≤ 1 dk');
});

test('damga yaşı: SAGLIK yok → damga_yasi_dk null', () => {
  const kok = kurulum();
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).damga_yasi_dk, null);
});

test('damga yaşı: bekçisiz eski damga → büyük yaş (bayatlık olay anında kaydedilir)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '00_pano', 'SAGLIK.md'), '# SAĞLIK\n\nson denetim: 2026-01-01 00:00 (denetim #3)\n');
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.ok(j.damga_yasi_dk > 1000, 'aylar önceki damga büyük yaş vermeli');
});

// Dil paketi geri uyumu (2026-07-29): damga satırının kanonik yazımı "son denetim:" oldu.
// Eski KEEL sürümüyle kurulmuş bir projenin bekçisi hâlâ eski yazımı üretebilir; okunmazsa
// damga-yaşı ölçümü sessizce null düşer (fail-open olduğu için kimse fark etmez).
test('geri uyum: ESKİ damga yazımı ("son koşu:") hâlâ okunur — eski kurulumda ölçüm kaybolmaz', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '00_pano', 'SAGLIK.md'), '# SAĞLIK\n\nson koşu: 2026-01-01 00:00 (koşu #3)\n');
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.ok(j.damga_yasi_dk > 1000, 'eski yazımlı damga okunamadı — ölçüm sessizce null düştü');
});

// ─── V2 Öbek-2 · SENDE BEKLEYEN süzmesi + kalıcı kuyruk ───────────────────────

test('N madde: kuyruk doğar, maddeler düşer, SIRADAKİ sonrası satır GİRMEZ', () => {
  const kok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n' });
  const t = transkriptMesaj(kok, BLOK_IKI);
  const r = kos(kok, stdinJson(kok, { transcript_path: t }));
  assert.equal(r.status, 0);
  const acik = acikMaddeler(kok);
  assert.equal(acik.length, 2, 'iki madde düşmeli — üçüncü satır blok dışıdır');
  assert.match(acik[0], /^- \[ \] \d{4}-\d{2}-\d{2} · koordinator · "Tavan sorusu/);
  assert.match(acik[0], /kaynak: oturum test-otu$/, 'kaynak = oturum kimliğinin ilk 8 hanesi');
  assert.ok(!readFileSync(KUYRUK(kok), 'utf8').includes('maddeye GİRMEMELİ'), 'SIRADAKİ sonrası satır kuyruğa girmemeli');
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.blok, 'var');
  assert.equal(j.bekleyen_eklendi, 2);
});

test('tekilleştirme: aynı oturum + aynı madde ikinci kapanışta TEKRAR eklenmez', () => {
  const kok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n' });
  const t = transkriptMesaj(kok, BLOK_IKI);
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const ilk = readFileSync(KUYRUK(kok), 'utf8');
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const sonra = readFileSync(KUYRUK(kok), 'utf8');
  assert.equal(sonra, ilk, 'kuyruk bayt-bayt aynı kalmalı');
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim().split('\n').pop());
  assert.equal(j.bekleyen_eklendi, 0);
});

test('YOK: kuyruğa DOKUNULMAZ (dosya bile doğmaz), blok=var', () => {
  const kok = kurulum({ damga: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const t = transkriptMesaj(kok, '**BİTEN:** x\n**SENDE BEKLEYEN:** YOK\n**SIRADAKİ:** y');
  kos(kok, stdinJson(kok, { transcript_path: t }));
  assert.equal(existsSync(KUYRUK(kok)), false, 'YOK kapanışı kuyruk dosyası doğurmaz');
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.blok, 'var');
  assert.equal(j.bekleyen_eklendi, 0);
});

test('blok satırı hiç yok → blok="yok" (bekçinin SARI sinyali buradan doğar)', () => {
  const kok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n' });
  const t = transkriptMesaj(kok, 'İşi bitirdim, kapanış bloğu yazmadım.');
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.blok, 'yok');
  assert.equal(existsSync(KUYRUK(kok)), false);
});

test('satır var ama madde yok → blok="bicimsiz" (sahte doluluk yakalanır)', () => {
  const kok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n' });
  const t = transkriptMesaj(kok, '**SENDE BEKLEYEN:** birkaç şey var\n(numaralı madde yazmadım)');
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.blok, 'bicimsiz');
  assert.equal(existsSync(KUYRUK(kok)), false);
});

test('mevcut kuyruk: başlık ve eski satırlar bayt-bayt korunur, yeni madde SONA eklenir', () => {
  const kok = kurulum({ damga: 'uygulayici\ttam\t03_roller/uygulayici/\n' });
  const eski = '<!-- yazar: kapanış kancası -->\n# SENDE BEKLEYEN — sahipte bekleyen maddeler\n\n- [x] 2026-07-01 · po · "eski soru" · kaynak: oturum eskioturum · cevap: "evet" · 2026-07-02\n';
  writeFileSync(KUYRUK(kok), eski);
  const t = transkriptMesaj(kok, '**SENDE BEKLEYEN:** 1 madde\n1. Yeni soru: bunu yapalım mı?');
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const sonra = readFileSync(KUYRUK(kok), 'utf8');
  assert.ok(sonra.startsWith(eski), 'eski içerik bayt-bayt korunmalı (silme yasak)');
  assert.match(sonra, /- \[ \] \d{4}-\d{2}-\d{2} · uygulayici · "Yeni soru: bunu yapalım mı\?"/);
});

test('bekçiye KAPANIS_BLOK yalnız ROL damgası varken geçer (rolsüz oturumda denetlenmez)', () => {
  const izYaz = '#!/bin/bash\nprintf "%s" "${KAPANIS_BLOK:-DEGISKEN-YOK}" > "$(dirname "$0")/blok.izi"\nexit 0\n';
  const t1 = (kok) => transkriptMesaj(kok, 'blok yazmadım');

  const rolluKok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n', bekciIcerik: izYaz });
  kos(rolluKok, stdinJson(rolluKok, { transcript_path: t1(rolluKok) }));
  assert.equal(readFileSync(join(rolluKok, 'tools', 'bekci', 'blok.izi'), 'utf8'), 'yok');

  const rolsuzKok = kurulum({ bekciIcerik: izYaz });
  kos(rolsuzKok, stdinJson(rolsuzKok, { transcript_path: t1(rolsuzKok) }));
  assert.equal(readFileSync(join(rolsuzKok, 'tools', 'bekci', 'blok.izi'), 'utf8'), 'DEGISKEN-YOK');
});

test('kuyruk bekçiden ÖNCE yazılır (PANO sayacı taze olsun — sıra kanıtı)', () => {
  const sayanBekci = '#!/bin/bash\nD="$(cd "$(dirname "$0")/../.." && pwd)"\ngrep -c "^- \\[ \\]" "$D/00_pano/SENDE_BEKLEYEN.md" > "$(dirname "$0")/sayi.izi" 2>/dev/null || printf 0 > "$(dirname "$0")/sayi.izi"\nexit 0\n';
  const kok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n', bekciIcerik: sayanBekci });
  const t = transkriptMesaj(kok, BLOK_IKI);
  kos(kok, stdinJson(kok, { transcript_path: t }));
  assert.equal(readFileSync(join(kok, 'tools', 'bekci', 'sayi.izi'), 'utf8').trim(), '2',
    'bekçi kendi denetiminde bu oturumun maddelerini görmeli');
});

test('transcript yok: blok="bilinmiyor" (yanlış SARI üretilmez — fail-open)', () => {
  const kok = kurulum({ damga: 'koordinator\ttam\t03_roller/koordinator/\n' });
  kos(kok, stdinJson(kok));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.blok, 'bilinmiyor');
});

// ─── Porcelain dikişi (dış göz paketi, D-20 parça 2) ─────────────────────────
// Açılış özeti damganın 2. satırındadır (rol-ac.sh yazar). Kapanışta AYNI kitaplıkla
// yeniden alınır; sonuç günlüğe düşer ve bekçiye KAPANIS_PORCELAIN ile geçer.

function gitKok(opts = {}) {
  const kok = kurulum(opts);
  const g = (...a) => spawnSync('git', a, { cwd: kok, encoding: 'utf8' });
  g('init', '-q');
  g('config', 'user.email', 'tatbikat@ornek');
  g('config', 'user.name', 'Tatbikat');
  writeFileSync(join(kok, 'is-dosyasi.txt'), 'ilk\n');
  g('add', '-A');
  g('commit', '-qm', 'ilk');
  return kok;
}
const ozetAl = (kok, slug) =>
  spawnSync('bash', ['-c', `. "${join(BURASI, '..', 'porcelain.sh')}"; porcelain_ozet "${kok}" ${slug}`], { encoding: 'utf8' })
    .stdout.trim();
const damgaYaz = (kok, slug, ozet) =>
  writeFileSync(join(kok, 'tools', 'guard', '.aktif-rol'), `${slug}\tyazamaz\t03_roller/${slug}/\nporcelain\t${ozet}\n`);

test('porcelain: dikiş yoksa (tam profil damgası) günlükte "yok" — karşılaştırma yapılmaz', () => {
  const kok = gitKok({ damga: 'koordinator\ttam\t03_roller/koordinator/\n' });
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).porcelain, 'yok');
});

test('porcelain: kafes dışı yazım yoksa "es"', () => {
  const kok = gitKok();
  damgaYaz(kok, 'disgoz', ozetAl(kok, 'disgoz'));
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).porcelain, 'es');
});

test('porcelain: iş dosyasına kabukla yazım → "fark" (dikişin asıl işi)', () => {
  const kok = gitKok();
  damgaYaz(kok, 'disgoz', ozetAl(kok, 'disgoz'));
  writeFileSync(join(kok, 'is-dosyasi.txt'), 'yazamaz koltuk kabukla değiştirdi\n');
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).porcelain, 'fark');
});

test('porcelain: KANCANIN KENDİ yazımları "fark" ÜRETMEZ (kuyruk + bekçi + günlük) — yanlış-SARI freni', () => {
  // Bekçi PANO/SAGLIK yazar, kanca kuyruğa madde ekler ve jsonl'e satır düşer;
  // özet kancanın kendi yazımlarından ÖNCE alınmazsa bu kapanış "fark" basardı.
  const bekciIcerik = [
    '#!/bin/bash',
    'D="$(cd "$(dirname "$0")/../.." && pwd)"',
    'mkdir -p "$D/00_pano"',
    'printf "# PANO\\nson denetim: %s\\n" "$(date)" > "$D/00_pano/PANO.md"',
    'printf "# SAĞLIK\\nson denetim: %s\\n" "$(date)" > "$D/00_pano/SAGLIK.md"',
    'exit 0',
  ].join('\n');
  const kok = gitKok({ bekciIcerik });
  const t = transkriptMesaj(kok, BLOK_IKI); // fixture artığı: gerçekte transcript depo DIŞINDA yaşar
  damgaYaz(kok, 'disgoz', ozetAl(kok, 'disgoz'));
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const j = JSON.parse(readFileSync(gunluk(kok), 'utf8').trim());
  assert.equal(j.bekleyen_eklendi, 2, 'kuyruk fiilen yazılmış olmalı');
  assert.equal(j.porcelain, 'es', 'kancanın kendi izi dikişi tetiklememeli');
});

test('porcelain: kendi evine yazan yazamaz koltuk "es" kalır (kafesin izin verdiği alan)', () => {
  const kok = gitKok();
  mkdirSync(join(kok, '03_roller', 'disgoz'), { recursive: true });
  damgaYaz(kok, 'disgoz', ozetAl(kok, 'disgoz'));
  writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), '# DIŞ GÖZ — brifing\nTarih: 2026-07-25\n');
  kos(kok, stdinJson(kok));
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).porcelain, 'es');
});

test('porcelain: bekçiye KAPANIS_PORCELAIN yalnız dikiş VARKEN geçer', () => {
  const izYaz = '#!/bin/bash\nprintf "%s" "${KAPANIS_PORCELAIN:-DEGISKEN-YOK}" > "$(dirname "$0")/porc.izi"\nexit 0\n';
  const dikisli = gitKok({ bekciIcerik: izYaz });
  damgaYaz(dikisli, 'disgoz', ozetAl(dikisli, 'disgoz'));
  writeFileSync(join(dikisli, 'is-dosyasi.txt'), 'değişti\n');
  kos(dikisli, stdinJson(dikisli));
  assert.equal(readFileSync(join(dikisli, 'tools', 'bekci', 'porc.izi'), 'utf8'), 'fark');

  const dikissiz = gitKok({ damga: 'koordinator\ttam\t03_roller/koordinator/\n', bekciIcerik: izYaz });
  kos(dikissiz, stdinJson(dikissiz));
  assert.equal(readFileSync(join(dikissiz, 'tools', 'bekci', 'porc.izi'), 'utf8'), 'DEGISKEN-YOK');
});

test('porcelain: AYNI damgayla ikinci kapanış (--resume) sahte "fark" basmaz — tatbikat bulgusu T6b', () => {
  // Kancanın kendi append-only günlüğü dışlanmazsa ilk kapanışın izi ikinci kapanışta
  // "fark" sanılırdı (2026-07-25 tatbikatında sahada görüldü).
  const kok = gitKok();
  spawnSync('git', ['add', '-A'], { cwd: kok });          // günlük dosyası izlensin diye
  spawnSync('git', ['commit', '-qm', 'temiz'], { cwd: kok });
  damgaYaz(kok, 'disgoz', ozetAl(kok, 'disgoz'));
  kos(kok, stdinJson(kok));
  kos(kok, stdinJson(kok, { session_id: 'ikinci' }));
  const satirlar = readFileSync(gunluk(kok), 'utf8').trim().split('\n').map((s) => JSON.parse(s));
  assert.equal(satirlar[0].porcelain, 'es');
  assert.equal(satirlar[1].porcelain, 'es', 'ikinci kapanış da temiz olmalı');
});

test('porcelain: bozuk 2. satır karşılaştırmayı tetiklemez ("yok"), kanca ölmez', () => {
  const kok = gitKok();
  writeFileSync(join(kok, 'tools', 'guard', '.aktif-rol'), 'disgoz\tyazamaz\t03_roller/disgoz/\nporcelain\tbozuk-içerik\n');
  const r = kos(kok, stdinJson(kok));
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(readFileSync(gunluk(kok), 'utf8').trim()).porcelain, 'yok');
});

test('uzun madde 200 karakterde kırpılır (kuyruk içerik-sınıfı: tek satır)', () => {
  const kok = kurulum({ damga: 'po\ttam\t03_roller/po/\n' });
  const uzun = 'x'.repeat(400);
  const t = transkriptMesaj(kok, '**SENDE BEKLEYEN:** 1 madde\n1. ' + uzun);
  kos(kok, stdinJson(kok, { transcript_path: t }));
  const satir = acikMaddeler(kok)[0];
  assert.ok(satir.length < 300, 'satır kırpılmalı: ' + satir.length);
  assert.ok(satir.includes('…'), 'kırpma izi (…) görünmeli');
});
