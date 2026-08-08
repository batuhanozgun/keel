import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, chmodSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const BETIK = join(BURASI, '..', 'kurulum-denetimi.sh');
const KOK_REPO = join(BURASI, '..', '..', '..');

// İlk kutu KABUĞU (Faz 2 sıra 5): kapı onu SAYMAZ, ADIYLA ve ŞEMASIYLA arar. Fixture kabuğu
// GERÇEK kalıptan üretir — uydurma bir kutu metni, kapının gerçekte gördüğü şeyi sınamazdı.
const KABUK_AD = 'KT-001-proje-plani';
function kabukMetni(slug = 'koordinator') {
  const satirlar = readFileSync(join(KOK_REPO, '00_genesis', 'ILK_KUTU_KALIBI.md'), 'utf8').split('\n');
  const yorumSonu = satirlar.findIndex((x) => x.trimEnd().endsWith('-->'));
  return satirlar.slice(yorumSonu + 1).join('\n').replaceAll('«KOORDİNATÖR-SLUG»', slug);
}

const EK_TAM = `# EL KİTABI — işletim disiplini
Bu belge ekibin çalışma anayasasıdır. Ağırlık kadranı: **TAM RİTÜEL**.
**Değer aksiyomu:** İşi bitiren en küçük çıktı en iyisidir.
## D-kuralları
- D7 · Mühür paketi. SENDE BEKLEYEN satırı zorunlu; dördüncüsü dış göz brifingi işaretçisidir.
- D9 · İş-icat yasağı.
## F-kuralları
- F6 · Kural-evrim kilidi.
## Üslup hükmü
## Kutu döngüsü
## Mühür ritüeli
Muğlak mesaj onay sayılmaz; yorumla onay üretme yasak.
## Domain-rol disiplin iskeleti
## Kanon-fakir dünya
## Kişisel-veri süzgeci
## Kadro + kapsam
`;

// Zorunlu koltuk (G2.1.5): dış göz her kadranda kurulur — fixture onu da doğurur, yoksa
// "tam kurulum" senaryosu gerçeği yansıtmaz.
function disGozKur(kok, { koltuk = true, brifing = true, skill = '---\ndescription: t\ndisable-model-invocation: true\n---\ntören\n' } = {}) {
  if (!koltuk) return;
  mkdirSync(join(kok, '03_roller', 'disgoz'), { recursive: true });
  writeFileSync(join(kok, '03_roller', 'disgoz', 'ROL.md'), '# ROL — Dış göz\nMod: **yazamaz**.\nSınırlar: iş yapmam.\n');
  writeFileSync(join(kok, '03_roller', 'disgoz', 'DURUM.md'), '# DURUM — Dış göz\nHenüz oturum açılmadı\n');
  if (brifing) writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), '# DIŞ GÖZ — brifing\nTarih: 2026-07-25\n');
  mkdirSync(join(kok, '.claude', 'skills', 'rol-disgoz'), { recursive: true });
  writeFileSync(join(kok, '.claude', 'skills', 'rol-disgoz', 'SKILL.md'), skill);
}

// Kurulum TARİFİ (F1-1): indeks + adım dosyaları + sıra verisi + bekçi kontratı + makine bloğu.
// Kurulu bir projede bunların hepsi bulunur (şablonla gelir; GENESIS onları YAZMAZ, okur).
// Fixture bunu yansıtmazsa 4d/4e kapıları gerçek dünyada hiç görülmeyecek bir hâl üzerinden
// sınanmış olur. SIRA listesi bilerek KISA (iki adım): kapı sayıya değil EŞLİĞE bakar; kısa
// liste onu yeterince sınar ve testi gerçek adım metinlerine bağlamaz.
function tarifKur(kok, { adimlar = true, kontrat = true, indeks = true, gdurum = 'açık', teyit = true } = {}) {
  mkdirSync(join(kok, '00_genesis', 'adimlar'), { recursive: true });
  // İndeks, sıradaki HER adımın işaretçisini taşır (4d ikinci tanık): iki liste ayrışırsa
  // çekilme kilitlenir. Fixture bunu yansıtmazsa o kapı hiç sınanmamış olur.
  if (indeks) writeFileSync(join(kok, 'GENESIS.md'),
    '# GENESIS — indeks\n- `00_genesis/adimlar/G0.md`\n- `00_genesis/adimlar/G5.md`\n');
  if (kontrat) writeFileSync(join(kok, '00_genesis', 'BEKCI_TARIFI.md'), '# BEKÇİ-TARİFİ KONTRATI\n- madde\n');
  if (adimlar) {
    writeFileSync(join(kok, '00_genesis', 'adimlar', 'SIRA.txt'),
      '# sıra\nG0\tG0.md\tSeni tanıyorum\nG5\tG5.md\tÇekiliyorum\n');
    writeFileSync(join(kok, '00_genesis', 'adimlar', 'G0.md'), '### G0 · başlangıç\n');
    writeFileSync(join(kok, '00_genesis', 'adimlar', 'G5.md'), '### G5 · çekilme\n');
  }
  if (gdurum != null) {
    writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'),
      '# GENESIS DURUM\n\n## KURULUM DURUMU — makine okur\n```\n' +
      `Adım: G5\nDurum: ${gdurum}\nTamamlanan: G0\n` + '```\n' +
      // Karar alanı teyit damgası (7d2): kurulu bir projede VARDIR; fixture bunu yansıtmazsa
      // "tam kurulum YEŞİL" senaryosu gerçeği yansıtmaz.
      (teyit ? '\n## Karar alanı teyidi\nKarar alanı teyidi: Deneme · 2026-07-30\n' : ''));
  }
}

// SAHTE BEKÇİ ÜRETİCİSİ (U5/U6 kapıları, K16 · 2026-08-07). Eskiden `exit 0` yazan tek satırlık
// bir kabuktu: kategorileri İLAN ediyor, hiçbirini ÜRETMİYOR ve bozuk ağaçta bile 0 dönüyordu —
// yani fixture'ın kendisi, U5/U6'nın tarif ettiği "ilan var, davranış yok" kusurunun canlı
// örneğiydi ve kapılar doğduğu an onu yakaladı. Artık üretici çekirdeğin SÖZLEŞMESİNİ taklit
// ediyor: bozuk ağaçta DURDURAN + makine satırı + çıkış 1; sağlam ağaçta ilan ettiği her
// kategoriyi basıp 0. Fixture kapının deseninden değil, sözleşmeden besleniyor.
const bekciSahte = (kategoriler) => [
  '#!/bin/bash',
  '# kategoriler: ' + kategoriler,
  'K="${CLAUDE_PROJECT_DIR:-.}"',
  'if [ ! -f "$K/02_kanon/EL_KITABI.md" ]; then',
  "  printf 'DURDURAN [şema] kok-zorunlu: bozuk ağaç\\n'",
  "  printf 'BEKCI v1 durduran=1 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'",
  '  exit 1',
  'fi',
  ...kategoriler.split(' ').filter(Boolean).map((k) => `printf 'BİLGİ [${k}] kapsam: tarandı\\n'`),
  "printf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'",
  'exit 0',
].join('\n') + '\n';
const BEKCI_SAHTE = bekciSahte('tavan şema koruma-hattı bağ-varlık tazelik');

function kurulum({ ek = EK_TAM, defo = true, retro = true, bekci = BEKCI_SAHTE, liste = true, skillIlk = '---', skillKilit = true, slug = 'denetci', acikAlan = false, rolmd = true, durum = true, pano = true, kutu = true, kanon = true, kabukSahip = 'koordinator', capa = '0123456789abcdef0123456789abcdef01234567\n',
                  korunanYollar = true, disgoz = {}, ortam = true, gitKaydi = true, uzak = null, tarif = {}, altAjan = true, kadroAjan = true, otonom = true,
                  kabuk = null } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'kurden-test-'));
  // Kurulu bir KEEL projesi her zaman bir git deposudur (G0.1 klasör hazırlığı bunu garanti
  // eder; tarih çapası, koruma-hattı ve geri-alma güvencesi buna dayanır). Fixture bunu
  // yansıtmazsa 4c kapısı gerçek dünyada hiç görülmeyecek bir hâl üzerinden sınanmış olur.
  if (gitKaydi) {
    assert.equal(spawnSync('git', ['init', '-q', kok], { encoding: 'utf8' }).status, 0, 'test kurulumu: git init');
    if (uzak) spawnSync('git', ['-C', kok, 'remote', 'add', 'origin', uzak], { encoding: 'utf8' });
  }
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  mkdirSync(join(kok, '03_roller', slug), { recursive: true });
  mkdirSync(join(kok, '.claude', 'skills', 'rol-' + slug.replace(/[^a-z0-9-]/g, '')), { recursive: true });
  // Ortam denetimi ikilisi (F1-2a): şablonla SABİT gelir; eksikse aktarım öz-denetimi KIRMIZI basar.
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  if (ortam) {
    writeFileSync(join(kok, 'tools', 'guard', 'ortam-kontrol.sh'), '#!/bin/bash\nexit 0\n');
    writeFileSync(join(kok, 'tools', 'guard', 'ortam-kalemleri.txt'), '[node]\n');
  }
  // Cevap sözlüğü (F1-5g) de şablonla SABİT gelir; yokluğu çatal kuyruğunun tüm kiplerini
  // öldürdüğü için aktarım öz-denetimi onu da arar (4b2).
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt'), '# sözlük\nanlamadım\n');
  disGozKur(kok, disgoz);
  tarifKur(kok, tarif);
  // Alt-ajan dosyaları şablonla SABİT gelir (üç tane); yoklukları aktarım eksiğidir ve kapı onu
  // KIRMIZI basar. Fixture bunu yansıtmazsa "tam kurulum" senaryosu gerçeği yansıtmaz.
  if (altAjan) {
    mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
    writeFileSync(join(kok, '.claude', 'agents', 'dogrulayici.md'), '---\nname: dogrulayici\ntools: Read\n---\nsen\n');
  }
  if (ek != null) writeFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), ek);
  if (defo) writeFileSync(join(kok, '00_genesis', 'DEFO_MODELI.md'), '# DEFO\n## On defo — itki\n');
  if (retro) writeFileSync(join(kok, '00_genesis', 'RETRO_KALIBI.md'), '# RETRO\n1. **Tavan kalibrasyonu:** soru.\n');
  if (bekci != null) {
    mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
    writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), bekci);
    chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  }
  // EL_KITABI bütünlük kümesinin tek evi şablonla gelir (K1 adım 5): kurulu projede her zaman
  // vardır — denetim onu KOK'tan okur, yokluğu fail-closed KIRMIZI'dır (ayrı testte sınanır).
  if (liste != null) {
    mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
    writeFileSync(join(kok, 'tools', 'bekci', 'el-kitabi-zorunlu.txt'),
      liste === true ? readFileSync(join(KOK_REPO, 'tools', 'bekci', 'el-kitabi-zorunlu.txt'), 'utf8') : liste);
  }
  writeFileSync(
    join(kok, '.claude', 'skills', 'rol-' + slug.replace(/[^a-z0-9-]/g, ''), 'SKILL.md'),
    skillIlk + '\ndescription: t\n' + (skillKilit ? 'disable-model-invocation: true\n' : '') + '---\ntören\n'
  );
  // İşletim yüzeyi (soğuk-denetim C1): rol sözleşmesi + başlangıç DURUM'u + pano + ilk kutu.
  if (acikAlan) writeFileSync(join(kok, '03_roller', slug, 'ROL.md'), '# «ROL-ADI» doldurulmamış\n');
  else if (rolmd) writeFileSync(join(kok, '03_roller', slug, 'ROL.md'), '# ROL — Denetçi\nMod: **tam**.\nSınırlar: dolu.\n');
  if (durum) writeFileSync(join(kok, '03_roller', slug, 'DURUM.md'), '# DURUM — Denetçi\nHenüz oturum açılmadı\n');
  if (pano) {
    mkdirSync(join(kok, '00_pano'), { recursive: true });
    writeFileSync(join(kok, '00_pano', 'PANO.md'), '# Pano\n- **Aktif kutu:** KT-001\n');
  }
  if (kutu) {
    mkdirSync(join(kok, '01_kutular', KABUK_AD), { recursive: true });
    // `kabuk` verilirse kabuk metni OLDUĞU GİBİ yazılır — mühür satırını silen bozma bunu kullanır.
    writeFileSync(join(kok, '01_kutular', KABUK_AD, 'KUTU.md'), kabuk ?? kabukMetni(kabukSahip));
    // Kabuğun G-01 sahibinin kadroda karşılığı olmalı (kapı bunu arar).
    mkdirSync(join(kok, '03_roller', kabukSahip), { recursive: true });
    writeFileSync(join(kok, '03_roller', kabukSahip, 'ROL.md'), '# ROL — Koordinatör\nMod: **tam**.\n');
    // Rol taraması her `03_roller/<slug>` için beceri + DURUM da arar (G3.3c/G3.4).
    writeFileSync(join(kok, '03_roller', kabukSahip, 'DURUM.md'), '# DURUM — Koordinatör\nHenüz oturum açılmadı\n');
    mkdirSync(join(kok, '.claude', 'skills', 'rol-' + kabukSahip), { recursive: true });
    writeFileSync(join(kok, '.claude', 'skills', 'rol-' + kabukSahip, 'SKILL.md'),
      '---\ndescription: t\ndisable-model-invocation: true\n---\ntören\n');
  }
  // G4'ün ikinci ürünü: kilitli-tarih çapası (40'lık commit-hash, tek satır).
  if (capa) {
    mkdirSync(join(kok, '02_kanon', 'kilitli'), { recursive: true });
    writeFileSync(join(kok, '02_kanon', 'kilitli', '.taban-ref'), capa);
  }
  // Korunan yollar listesi şablonla gelir; kapı iki kanon dosyasını [SORULUR]'da arar.
  if (korunanYollar) {
    copyFileSync(join(BURASI, '..', 'korunan-yollar.txt'), join(kok, 'tools', 'guard', 'korunan-yollar.txt'));
  }
  // Node sürüm tabanı da ŞABLONLA gelir (U39): kapı onu okuyup koşan sürümle karşılaştırır;
  // yoksa KIRMIZI basar — ilan edilmemiş taban, "eski Node'da ne olur" sorusunu cevapsız bırakır.
  copyFileSync(join(BURASI, '..', 'node-tabani.txt'), join(kok, 'tools', 'guard', 'node-tabani.txt'));
  // İleriye bakan iki kanon iskeleti (G3.3d) — ilk kutunun dört çıktısından ikisinin evi.
  if (kanon) {
    writeFileSync(join(kok, '02_kanon', 'BITTI_TANIMI.md'),
      '<!-- yazar: koordinator -->\n# BİTTİ TANIMI — bu proje ne zaman biter\n(iskelet)\n');
    writeFileSync(join(kok, '02_kanon', 'KUTU_PLANI.md'),
      '<!-- yazar: koordinator -->\n# KUTU PLANI — sıradaki kutular\n(iskelet)\n');
  }
  // Otonom tarafın dosyaları (Faz 2 sıra 6 · G3.3e/G3.3f) — kurulumdan ÇIKAR, elle konmaz.
  // En SONA yazılır: kadro koltukları 03_roller'ın tamamı doğduktan sonra taranmalı, yoksa
  // fixture kapının gerçekte gördüğü dünyayı taklit etmez (sıra 5'in fixture dersi).
  if (kadroAjan) kadroAjanKur(kok);
  if (otonom) otonomDosyalarKur(kok);
  return kok;
}

// Her `03_roller/<slug>` için alt-ajan koltuğu.
// MOD, KAPININ REGEX'İYLE TÜRETİLMİYOR (hasım bulgusu 2026-07-30): ilk yazımda fixture modu
// ROL.md'den kapının kendi deseniyle okuyordu — desen bozulsa fixture da onunla birlikte bozulur
// ve "tam kurulum YEŞİL" senaryosu kilidin KAPALI olduğu bir dünyayı modellemeye devam ederdi.
// Artık mod AÇIK BİR TABLODAN gelir; kapı ile fixture aynı kaynağa bakmaz.
const YAZAMAZ_ROLLER = new Set(['disgoz']);   // dış göz her kadranda yazamaz (G2.1.5)
const ARAC = { yazamaz: 'Read, Grep, Glob', tam: 'Read, Grep, Glob, Edit, Write, Bash' };
function kadroAjanKur(kok) {
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  for (const e of readdirSync(join(kok, '03_roller'), { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('_')) continue;
    const mod = YAZAMAZ_ROLLER.has(e.name) ? 'yazamaz' : 'tam';
    writeFileSync(join(kok, '.claude', 'agents', e.name + '.md'),
      `---\nname: ${e.name}\ntools: ${ARAC[mod]}\n---\nsen ${e.name}sin\n`);
  }
}

// Otonom kipin kural evi + sahibin karar alanı: ikisi de GERÇEK kalıptan üretilir (uydurma bir
// metin, kapının ve karar-alani.sh'ın gerçekte aradığı çapaları sınamazdı). karar-alani.sh de
// kopyalanır: kapı o denetimi DEVREDER, kopyalamaz — betik yokken hüküm "ölçülemedi"dir.
const KARAR_GOVDE = [
  '- Kahve dükkânının günlük nakit akışını ve hangi ürünün kaç sattığını yalnız ben bilirim.',
  '- Kodun nasıl yazıldığı, dosya adları ve karar numaraları beni ilgilendirmiyor; sorulmasın.',
  '- Fiyat değişikliği ve müşteriye görünen her yazı benim kararım; teknik sıralama değil.',
  '- Soruları tek tek getir, önerini de yaz; uzun döküm gönderirsen kaçırıyorum.',
];
function otonomDosyalarKur(kok) {
  const kalipSim = (ad) => {
    const s = readFileSync(join(KOK_REPO, '00_genesis', ad), 'utf8').split('\n');
    const y = s.findIndex((x) => x.trimEnd().endsWith('-->'));
    return s.slice(y + 1).join('\n').replaceAll('«SAHİP»', 'Deneme');
  };
  writeFileSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'), kalipSim('OTONOM_DONEM_KALIBI.md'));
  // DÖRT GÖVDE FARKLI (kalıp-dolgu freni, hasım bulgusu 2026-07-30): ilk yazımda dördüne de aynı
  // jenerik cümle yazılıyordu ve kapı HAZIR diyordu — yani fixture, profilin sahiple hiç
  // konuşulmadığı bir dünyayı "tam kurulum" diye modelliyordu.
  let ka = kalipSim('KARAR_ALANI_KALIBI.md');
  let i = 0;
  ka = ka.replace(/«[^»]+»/gs, () => KARAR_GOVDE[i++ % KARAR_GOVDE.length]);
  writeFileSync(join(kok, '02_kanon', 'KARAR_ALANI.md'), ka);
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'karar-alani.sh'), join(kok, 'tools', 'sevk', 'karar-alani.sh'));
}

const kos = (kok) => spawnSync('bash', [BETIK, kok], { encoding: 'utf8' });

test('tam kurulum: YEŞİL, exit 0', () => {
  const r = kos(kurulum());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /SONUÇ: YEŞİL/);
});

test('ilk kutu kabuğunda açılış mührü satırı yoksa → KIRMIZI exit 2 (K3)', () => {
  // Mühür mekaniğinin evi bu satırdır: donem-ac.sh onu okur ve mühürsüz kutuya dönem açmaz.
  // Satır kurulumda doğmazsa kutu ilerde duvara çarpar ve sebebi kurulumda aranmaz.
  const r = kos(kurulum({ kabuk: kabukMetni().replace(/^\*\*Açılış mührü:\*\*.*$/m, '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /Açılış mührü.*satırı yok/);
});

test('ilk kutu kabuğunda mühür satırı BEKLİYOR iken kapı geçirir (mührü sahip verir)', () => {
  // Ters yön: GENESIS mühür vermez. Kurulum bittiğinde `bekliyor` MEŞRUDUR — kapı burada
  // satırın varlığını ölçer, değerini değil. Değeri ölçseydi kurulum sahibin mührüne
  // rehin olurdu ve G5'in "ısrar etme" hükmüyle çelişirdi.
  const r = kos(kurulum());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /açılış mührü satırı yerinde/);
});

test('EL_KITABI eksik başlık (Üslup hükmü silinmiş) → KIRMIZI exit 2', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('## Üslup hükmü\n', '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu başlık eksik: ## Üslup hükmü/);
});

test('zorunlu kural eksik (Mühür paketi yok) → KIRMIZI', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('Mühür paketi. SENDE', 'SENDE') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu kural eksik: Mühür paketi/);
});

test('zorunlu kural eksik (yorumla onay üretme yok — MA-01) → KIRMIZI', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('Muğlak mesaj onay sayılmaz; yorumla onay üretme yasak.\n', '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu kural eksik: yorumla onay üretme/);
});

// K1 adım 5 kasıtlı bozmaları: zorunlu küme artık tek evden (tools/bekci/el-kitabi-zorunlu.txt)
// okunur — evsiz ya da biçimsiz küme "geçti" basamaz (fail-closed).
test('el-kitabi-zorunlu.txt YOK → KIRMIZI (bütünlük kümesi evsiz, fail-closed)', () => {
  const r = kos(kurulum({ liste: null }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /el-kitabi-zorunlu\.txt yok/);
});

test('el-kitabi-zorunlu.txt biçimsiz kalem (öneksiz satır) → KIRMIZI (fail-closed)', () => {
  const r = kos(kurulum({ liste: 'baslik:## D-kuralları\nonek-yok-bozuk-kalem\n' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /biçimsiz kalem: onek-yok-bozuk-kalem/);
});

test('hasım #4: boş gövdeli `baslik:` kalemi sessiz GEÇMEZ — biçimsiz KIRMIZI (eski kod her şeyi eşleştirirdi)', () => {
  const r = kos(kurulum({ liste: 'baslik:\n' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /biçimsiz kalem: baslik:/);
});

test('hasım #11: gramer çekirdekle eş — kalem kırpılır (kenar boşluğu eşleşmeyi bozmaz), ters-bölü fail-closed', () => {
  const temiz = kos(kurulum({ liste: '  baslik:## D-kuralları  \n' }));
  assert.ok(!/zorunlu başlık eksik/.test(temiz.stdout), temiz.stdout);
  const tersBolu = kos(kurulum({ liste: 'baslik:## D\\.kuralları\n' }));
  assert.equal(tersBolu.status, 2);
  assert.match(tersBolu.stdout, /ters-bölü taşıyor/);
});

test('zorunlu ibare eksik (Değer aksiyomu silinmiş) → KIRMIZI (ibare kendi adıyla raporlanır)', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('**Değer aksiyomu:** İşi bitiren en küçük çıktı en iyisidir.\n', '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu ibare eksik: Değer aksiyomu/);
});

test('doldurulmamış «alan» → KIRMIZI', () => {
  const r = kos(kurulum({ acikAlan: true }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /doldurulmamış «alan»/);
});

test('DEFO_MODELI kopyalanmamış → KIRMIZI (bilinç katmanı inmemiş)', () => {
  const r = kos(kurulum({ defo: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /DEFO_MODELI\.md yok/);
});

// Kardeş kapının negatif kanıtı bugüne kadar YOKTU (fixture `retro` anahtarını taşıyordu ama
// hiçbir test onu false yapmıyordu) — kapı sessizce ölebilirdi. Tek satırla kapatıldı.
test('RETRO_KALIBI kopyalanmamış → KIRMIZI', () => {
  const r = kos(kurulum({ retro: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /RETRO_KALIBI\.md yok/);
});

// ── Kurulum tarifi (4d) ve kurulum durumu (4e) — TAM kurulum bağlamında ─────────────────
// genesis-iskelet.test.mjs bu iki kapıyı asgari bir fixture'la sınar; burada aynı kapılar
// gerçek bir "her şeyi tamam" kurulumun içinde ölçülür: tek eksik onları KIRMIZI yapıyor mu.

test('4d: adım dosyaları eksikse → KIRMIZI (tarif yarım aktarılmış)', () => {
  const r = kos(kurulum({ tarif: { adimlar: false } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /SIRA\.txt yok/);
});

test('4d: bekçi kontratı eksikse → KIRMIZI', () => {
  const r = kos(kurulum({ tarif: { kontrat: false } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /BEKCI_TARIFI\.md yok/);
});

test('4d: indeks hiç yoksa → KIRMIZI', () => {
  const r = kos(kurulum({ tarif: { indeks: false } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /GENESIS indeksi yok/);
});

test('4e: makine bloğu yoksa → KIRMIZI (sürücü hiç devreye girmemiş)', () => {
  const r = kos(kurulum({ tarif: { gdurum: null } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /GENESIS_DURUM\.md yok/);
});

test('4e: blok "başlamadı" diyorsa → KIRMIZI', () => {
  const r = kos(kurulum({ tarif: { gdurum: 'başlamadı' } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /blok hiç güncellenmemiş/);
});

test('4e: tanınmayan Durum değeri → KIRMIZI (fail-closed)', () => {
  const r = kos(kurulum({ tarif: { gdurum: 'yolunda' } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /tanınmayan Durum değeri/);
});

test('6b: hiç alt-ajan dosyası yoksa → KIRMIZI (yokluk körlüğü yok)', () => {
  // `nullglob` altında döngü hiç koşmuyor, altındaki "geçti" koşulsuz basıyordu: "ölçemedim"
  // ile "hepsi yerinde" karışıyordu (hasım turu 2026-07-30). Betiğin kendi ilkesi zaten
  // "sıfır rol = KIRMIZI" diyor; aynı ilke burada uygulanmamıştı.
  // kadroAjan da kapatılır: 7c koltukları da .claude/agents/ altına yazıyor, açık kalırsa
  // dizin boş olmaz ve bu testin ölçtüğü YOKLUK hâli hiç oluşmaz.
  const r = kos(kurulum({ altAjan: false, kadroAjan: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /hiç alt-ajan dosyası yok/);
});

test('TAM kadranda bekçi ilanında kategori eksikse → KIRMIZI; KÜÇÜK kadranda aynı bekçi YEŞİL', () => {
  const darBekci = bekciSahte('tavan şema');
  const tam = kos(kurulum({ bekci: darBekci }));
  assert.equal(tam.status, 2);
  assert.match(tam.stdout, /zorunlu kategori eksik: koruma-hattı/);
  const kucuk = kos(kurulum({ bekci: darBekci, ek: EK_TAM.replace('**TAM RİTÜEL**', '**KÜÇÜK** (tek kişilik)') }));
  assert.equal(kucuk.status, 0, kucuk.stdout);
});

test('U6: bekçi bozuk ağaçta 0 dönüyorsa → KIRMIZI (fail-closed beyan düzeyinde kalamaz)', () => {
  // Doğuş: kapı yalnız varlık ve `bash -n` ölçüyordu; bekçinin FİİLEN kırmızı basabildiği hiç
  // koşturulmuyordu. Sözdizimi geçerli ama hiçbir şey yapmayan bir bekçi kapıdan geçerdi.
  const uyuyan = ["#!/bin/bash", "# kategoriler: tavan şema koruma-hattı bağ-varlık tazelik",
    "printf 'BİLGİ [tavan] x\\n'", "printf 'BİLGİ [şema] x\\n'", "printf 'BİLGİ [koruma-hattı] x\\n'",
    "printf 'BİLGİ [bağ-varlık] x\\n'", "printf 'BİLGİ [tazelik] x\\n'",
    "printf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=5 ariza=0 kadran=tam pencere=isletim\\n'",
    "exit 0"].join('\n') + '\n';
  const r = kos(kurulum({ bekci: uyuyan }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /BOZUK bir ağaçta bile 0 döndü/);
});

test('U6: bekçi kırmızı verir ama MAKİNE SATIRI basmazsa → KIRMIZI (tüketici onu okuyamaz)', () => {
  const satirsiz = ["#!/bin/bash", "# kategoriler: tavan şema koruma-hattı bağ-varlık tazelik",
    "printf 'BİLGİ [tavan] x\\n'", "printf 'BİLGİ [şema] x\\n'", "printf 'BİLGİ [koruma-hattı] x\\n'",
    "printf 'BİLGİ [bağ-varlık] x\\n'", "printf 'BİLGİ [tazelik] x\\n'",
    "exit 1"].join('\n') + '\n';
  const r = kos(kurulum({ bekci: satirsiz }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /MAKİNE SATIRI basmadı/);
});

test('U5: ilan edilen kategorinin KODDA karşılığı yoksa → KIRMIZI (ilan tartılır)', () => {
  // Beş kategori ilan edip hiçbirini üretmeyen bekçi, U5'in tam olarak tarif ettiği kusurdur.
  // Fail-closed davranışı DOĞRU olsa bile ilan karşılıksızsa kapı geçirmez.
  const ilanci = ["#!/bin/bash", "# kategoriler: tavan şema koruma-hattı bağ-varlık tazelik",
    'K="${CLAUDE_PROJECT_DIR:-.}"',
    'if [ ! -f "$K/02_kanon/EL_KITABI.md" ]; then',
    "  printf 'BEKCI v1 durduran=1 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'",
    "  exit 1", "fi",
    "printf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'",
    "exit 0"].join('\n') + '\n';
  const r = kos(kurulum({ bekci: ilanci }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kategorisinin KODDA karşılığı yok/);
});

test('bekçide ilan satırı hiç yok → KIRMIZI', () => {
  const r = kos(kurulum({ bekci: '#!/bin/bash\nexit 0\n' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /'# kategoriler:' ilan satırı yok/);
});

test('SKILL ilk satırı --- değil → KIRMIZI (yaşanmış kırılma)', () => {
  const r = kos(kurulum({ skillIlk: '<!-- yorum -->' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /SKILL ilk satırı/);
});

test('tireli rol slug → KIRMIZI; _arsiv muaf', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', 'baş-tasarımcı'), { recursive: true });
  mkdirSync(join(kok, '03_roller', '_arsiv'), { recursive: true });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /tek-token ASCII değil: baş-tasarımcı/);
  assert.doesNotMatch(r.stdout, /_arsiv/);
});

test('EL_KITABI kendi tavanını aşarsa → KIRMIZI', () => {
  const r = kos(kurulum({ ek: EK_TAM + 'x'.repeat(17000) }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kendi tavanını aşıyor/);
});

test('fail-closed: EL_KITABI hiç yoksa KIRMIZI (sessiz yeşil yok)', () => {
  const r = kos(kurulum({ ek: null }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /EL_KITABI\.md yok/);
});

test('fail-closed: okunamayan dosya «alan» taramasını sessiz geçemez → KIRMIZI', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '03_roller', 'denetci', 'kilitli.md'), 'x');
  chmodSync(join(kok, '03_roller', 'denetci', 'kilitli.md'), 0o000);
  const r = kos(kok);
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stdout, /«alan» taraması hata verdi/);
});

test('_arsiv içindeki «alan» muaf: arşivlenmiş taslak çekilmeyi kilitlemez', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', '_arsiv', 'eski'), { recursive: true });
  writeFileSync(join(kok, '03_roller', '_arsiv', 'eski', 'ROL.md'), '# «ROL-ADI»\n');
  const r = kos(kok);
  assert.equal(r.status, 0, r.stdout);
});

test('kadran çapalı okunur: KÜÇÜK gerekçesinde "TAM RİTÜEL gerekmiyor" geçse de kucuk okunur', () => {
  const darBekci = bekciSahte('tavan şema');
  const ek = EK_TAM.replace('**TAM RİTÜEL**', '**KÜÇÜK** (tek kişilik; TAM RİTÜEL gerekmiyor)');
  const r = kos(kurulum({ ek, bekci: darBekci }));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /kadran okundu: kucuk/);
});

test('tanınmayan kadran → KIRMIZI (fail-closed, tam küme aranır)', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('**TAM RİTÜEL**', '**Tam Ritüel**') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kadran okunamadı/);
});

test('rol var ama becerisi silinmiş → KIRMIZI (yokluk körlüğü kapalı)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', 'po'), { recursive: true });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /rol becerisi eksik: .*rol-po/);
});

test('hiç rol yoksa → KIRMIZI (G4.5 rollerden sonra koşar)', () => {
  const kok = mkdtempSync(join(tmpdir(), 'kurden-bos-'));
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  writeFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), EK_TAM);
  writeFileSync(join(kok, '00_genesis', 'DEFO_MODELI.md'), '## On defo\n');
  writeFileSync(join(kok, '00_genesis', 'RETRO_KALIBI.md'), '**Tavan kalibrasyonu:**\n');
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), '#!/bin/bash\n# kategoriler: tavan şema koruma-hattı bağ-varlık tazelik\nexit 0\n');
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /hiç rol yok/);
});

// --- Soğuk-denetim yamaları (2026-07-16): C1 işletim yüzeyi · C3 beceri kilidi · C4 çapalı başlık ---

test('C1: 00_pano/PANO.md yoksa → KIRMIZI (pano bağlanmadan çekilme serbest denemez)', () => {
  const r = kos(kurulum({ pano: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /00_pano\/PANO\.md yok/);
});

test('C1: ilk kutu KABUĞU yoksa → KIRMIZI (G4 kalıbı kopyalanmamış)', () => {
  const r = kos(kurulum({ kutu: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /ilk kutu kabuğu yok: 01_kutular\/KT-001-proje-plani\/KUTU\.md/);
});

test('C1: ileriye bakan iki kanon iskeleti yoksa → KIRMIZI (ilk kutunun çıktısı evsiz kalır)', () => {
  const r = kos(kurulum({ kanon: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kanon iskeleti yok: 02_kanon\/BITTI_TANIMI\.md/);
  assert.match(r.stdout, /kanon iskeleti yok: 02_kanon\/KUTU_PLANI\.md/);
});

test('C1: rol sözleşmesi (ROL.md) yoksa → KIRMIZI', () => {
  const r = kos(kurulum({ rolmd: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /rol sözleşmesi eksik: 03_roller\/denetci\/ROL\.md/);
});

test('C1: rol başlangıç DURUM.md yoksa → KIRMIZI (tatbikat-v2\'de sahada görülen eksik)', () => {
  const r = kos(kurulum({ durum: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /rol durum dosyası eksik: 03_roller\/denetci\/DURUM\.md/);
});

test('C3: beceri insan-tetikleme kilidi (disable-model-invocation) yoksa → KIRMIZI', () => {
  const r = kos(kurulum({ skillKilit: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /insan-tetikleme kilidi eksik/);
});

test('C3 hasım: kilit yalnız GÖVDEDE geçiyorsa (frontmatter\'da yok) kilit sayılmaz → KIRMIZI (çapalı arama)', () => {
  const kok = kurulum({ skillKilit: false });
  writeFileSync(
    join(kok, '.claude', 'skills', 'rol-denetci', 'SKILL.md'),
    '---\ndescription: t\n---\nNot: disable-model-invocation: true olarak ayarlanmalı (ama değil).\n'
  );
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /insan-tetikleme kilidi/);
});

test('C1 hasım: DURUM.md var ama biçimsiz (# DURUM başlığı yok) → KIRMIZI (yalnız varlık yetmez)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '03_roller', 'denetci', 'DURUM.md'), 'başlıksız içerik\n');
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /durum dosyası biçimsiz/);
});

test('C4: zorunlu başlık yalnız paragraf İÇİNDE geçiyorsa başlık sayılmaz → KIRMIZI (çapalı arama)', () => {
  const ek = EK_TAM.replace('## Üslup hükmü\n', 'metinde ## Üslup hükmü sözü geçiyor ama başlık değil\n');
  const r = kos(kurulum({ ek }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu başlık eksik: ## Üslup hükmü/);
});

// --- Dış göz zorunlu koltuğu (D-20 parça 2): "zorunlu" sözünün mekanik karşılığı ---

test('dış göz koltuğu hiç yoksa → KIRMIZI (her kadranda zorunlu — G2.1.5)', () => {
  const r = kos(kurulum({ disgoz: { koltuk: false } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu koltuk eksik: 03_roller\/disgoz\//);
});

test('koltuk var ama BRIFING.md iskeleti yoksa → KIRMIZI (bekçinin kapanış kilidi çapasız kalır)', () => {
  const r = kos(kurulum({ disgoz: { brifing: false } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /brifing iskeleti eksik/);
});

test('D7 dördüncü parçası EL_KITABI\'ndan silinirse → KIRMIZI (kural aşındırılamaz)', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('; dördüncüsü dış göz brifingi işaretçisidir', '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu kural eksik: dış göz brifingi/);
});

test('dış göz becerisi kilitsizse → KIRMIZI (koltuk da genel kilide tabidir)', () => {
  const r = kos(kurulum({ disgoz: { skill: '---\ndescription: t\n---\ntören\n' } }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /insan-tetikleme kilidi.*rol-disgoz/s);
});

// F1-2a: ortam denetimi ikilisi aktarımda düşerse açılış kancası FAIL-OPEN olduğu için sessiz
// kalır — aktarım öz-denetiminin görmesi gereken sınıf tam olarak budur.
test('ortam denetimi ikilisi kopyalanmamış → KIRMIZI', () => {
  const r = kos(kurulum({ ortam: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /ortam-kontrol\.sh/);
});

// F1-2b: kurulum GİRİŞİNİN çıkış kapısı. Giriş adımı (G0.1) atlanmış ya da geri alınmışsa
// proje hâlâ KEEL deposuna bağlıdır ve sahip kendi deposuna gönderdiğinde KEEL'in bütün
// geçmişi de gider (D-03). Tek yönlü bir kaza; çekilmeden ÖNCE yakalanmak zorunda.
// Kapı FAIL-CLOSED'dır: "ölçemedim" ile "bağ yok" ayrı hükümlerdir (hasım turu 2026-07-29).

test('uzak adres yok → geçer', () => {
  const r = kos(kurulum());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /geçti.*KEEL bağı yok/);
});

test('sahibin kendi uzak adresi → geçer', () => {
  const r = kos(kurulum({ uzak: 'https://github.com/batu/market-uygulamam.git' }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /geçti.*KEEL bağı yok/);
});

test('proje hâlâ KEEL deposuna bağlı → KIRMIZI, çekilme YOK', () => {
  const r = kos(kurulum({ uzak: 'https://github.com/batuhanozgun/keel.git' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /hâlâ KEEL deposuna bağlı/);
  assert.match(r.stdout, /git remote remove/, 'sahibe çare cümlesi verilir');
});

test('büyük harfli KEEL adresi de yakalanır (harf-duyarsızlık testsizdi)', () => {
  const r = kos(kurulum({ uzak: 'https://github.com/BatuhanOzgun/KEEL.git' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /hâlâ KEEL deposuna bağlı/);
});

test('ad benzeri ayrı depo (batuhanozgun/keel-oyun) → KIRMIZI DEĞİL (sağdan çapalı desen)', () => {
  const r = kos(kurulum({ uzak: 'https://github.com/batuhanozgun/keel-oyun.git' }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /geçti.*KEEL bağı yok/);
});

test('projenin git kaydı hiç yok → KIRMIZI (ölçemedim ≠ bağ yok)', () => {
  const r = kos(kurulum({ gitKaydi: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /git kaydı yok/);
});

test('git kaydı bozuk (okunamıyor) → KIRMIZI, sessiz yeşil yok', () => {
  const kok = kurulum({ uzak: 'https://github.com/batuhanozgun/keel.git' });
  // `.git/HEAD` düşerse `git remote -v` rc≠0 verir; eski hâlde bu "geçti" oluyordu.
  rmSync(join(kok, '.git', 'HEAD'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /ÖLÇÜLEMEDİ/);
});

test('git PATH\'te yokken → KIRMIZI (giriş betiğiyle aynı hüküm)', () => {
  const kok = kurulum({ uzak: 'https://github.com/batuhanozgun/keel.git' });
  // git'SİZ bir PATH: betiğin kullandığı öteki araçlar bağlanır, yalnız git dışarıda kalır.
  const gitsiz = mkdtempSync(join(tmpdir(), 'gitsiz-'));
  for (const arac of ['grep', 'wc', 'tr', 'basename', 'head', 'bash', 'cat', 'sed']) {
    const kaynak = spawnSync('command', ['-v', arac], { shell: true, encoding: 'utf8' }).stdout.trim();
    if (kaynak) symlinkSync(kaynak, join(gitsiz, arac));
  }
  const r = spawnSync(join(gitsiz, 'bash'), [BETIK, kok], { encoding: 'utf8', env: { ...process.env, PATH: gitsiz } });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stdout, /git bulunamadı/);
});

// ── Hasım turu 2026-07-30 · BÜTÇE ile kadro karşılaştırması (DAVRANIŞSAL) ─────────────────
// Bulgu iki katmanlıydı: (1) kabuğun SABİT bütçesi (6) değişken görev sayısıyla (kadro+1) hiç
// karşılaştırılmıyordu; (2) bu paketin İZİN kapısı yalnız betiğin KENDİ KAYNAK METNİNE regex
// eşlemesiyle "test" edilmişti — kural silinse test yeşil kalırdı. İkisi de burada kapanır:
// aşağıdaki iki test kapıyı KOŞTURUR ve çıktısına bakar.

test('hasım-14: BÜTÇE kadroya yetmiyorsa çekilme kapısı KIRMIZI (davranışsal)', () => {
  const kok = kurulum();
  // Kadroyu büyüt: yedi yazar koltuk → planlama kutusu 8 üretim çağrısı ister, kabuğun bütçesi 6.
  for (const ad of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7']) {
    mkdirSync(join(kok, '03_roller', ad), { recursive: true });
    writeFileSync(join(kok, '03_roller', ad, 'ROL.md'), `# ROL — ${ad}\n\nMod: **tam**.\n`);
    writeFileSync(join(kok, '03_roller', ad, 'DURUM.md'), `# DURUM — ${ad}\n`);
    writeFileSync(join(kok, '.claude', 'agents', ad + '.md'), `---\nname: ${ad}\ntools: Read, Write, Edit, Bash\n---\n# ${ad}\n`);
  }
  const r = kos(kok);
  assert.match(r.stdout, /BÜTÇE değeri \(6\) kadroya yetmiyor/,
    'kutu mekanik olarak bitirilemez hâlde teslim edilmemeli: ' + r.stdout.slice(-600));
});

test('hasım-14b: kadro kabuğun bütçesine sığıyorsa kapı GEÇER (yanlış-pozitif yok)', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.doesNotMatch(r.stdout, /BÜTÇE değeri .* kadroya yetmiyor/, 'varsayılan kadroda alarm çalmamalı');
  assert.match(r.stdout, /BÜTÇE \(6\) kadro\+1/, 'kapı ölçtüğünü söylemeli: ' + r.stdout.slice(-400));
});
