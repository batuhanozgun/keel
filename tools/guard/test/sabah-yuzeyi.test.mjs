// sabah-yuzeyi.test.mjs — E5 SABAH YÜZEYİ: gözetimsiz gecenin tek köprüsü.
// Sözleşme: docs/superpowers/plans/2026-07-28-e5-kanal-nabiz-sabah-tasarisi.md · D-21 (ısrar yok).
//
// NEDEN AYRI DOSYA — ölçülen VAAT nedir: D-21'in kapanış bloğu bir SOHBET yüzeyidir; gece
// döneminin sonunda sohbet YOKTUR. Sabah bilgisayarı açan sahibi üç bloğa götüren tek şey
// `00_pano/SABAH.md` ve onu gösteren açılış satırıdır. Bu yüzey yanlış konuşursa sahip
// "her şey bitmiş" sanır — sevk.sh'ın kendi yorumunun sözüyle: *"pas gorevde IS YAPILMADI;
// onu kapali diye raporlamak sahip yuzeyinde YALAN olur"* (sevk.sh, üretim-bitti dalı).
//
// BUGÜNE KADAR ÖLÇÜLMEMİŞTİ (U18 değil, U13): `grep -rl SABAH tools/*/test/` → 0 dosya.
// Üç blok yalnız e-posta gövdesinde (kanal-e5) sınanıyordu; DOSYA yüzeyinde ve İÇERİK
// ayrımında hiç sınanmamıştı. Bu dosyanın ölçtüğü tek soru: **"iş bitti" ile "iş düştü"
// sahibin okuduğu dosyada birbirinden ayırt edilebiliyor mu?**
//
// Kırmızıya dönebilirlik: son iki test, fixture'ın KENDİ sevk.sh kopyasını bozar (kaynak
// ağaca dokunulmaz) ve ayrımın çöktüğünü ölçer — yeşil test kanıt değildir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kuyrukBagimliliklariKur } from './kuyruk-bagimliligi.mjs';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const GOSTERGE = (kok) => join(kok, 'tools', 'sevk', '.donem-acik');
const GUNLUK = (kok) => join(kok, '00_pano', 'zarf-gunlugu.jsonl');
const SABAH = (kok) => join(kok, '00_pano', 'SABAH.md');
const KUTU_ADI = 'KT-900-sabah';
const DONEM_ID = 'DONEM-SABAH';

const SEVK_BETIKLERI = ['ortak.sh', 'kilit.sh', 'zarf-ekle.sh', 'zarf-bicim-kapisi.sh',
                        'karar-alani.sh', 'catal-kuyruk.sh', 'sevk.sh'];

// Karar alanı: sevk kapılanmada bu dosyayı arar. Dört gövde FARKLI olmak zorunda (kalıp-dolgu
// freni) — aynı cümle profilin sahiple konuşulmadığının işaretidir.
const KARAR_KALIP = readFileSync(join(KOK_REPO, '00_genesis', 'KARAR_ALANI_KALIBI.md'), 'utf8');
const KARAR_GOVDE = [
  '- Dükkânın günlük nakit akışını ve hangi ürünün kaç sattığını yalnız ben bilirim.',
  '- Dosya adları ve karar numaraları beni ilgilendirmiyor; sorulmasın.',
  '- Fiyat değişikliği ve müşteriye görünen her yazı benim kararım.',
  '- Soruları tek tek getir, önerini de yaz; uzun döküm gönderirsen kaçırıyorum.',
];
function kararAlaniMetni() {
  let s = KARAR_KALIP.split('\n');
  const yorumSonu = s.findIndex((l) => l.trimEnd().endsWith('-->'));
  s = s.slice(yorumSonu + 1).join('\n').replaceAll('«SAHİP»', 'Deneme');
  let i = 0;
  return s.replace(/«[^»]*»/gs, () => KARAR_GOVDE[i++ % KARAR_GOVDE.length]);
}

function kutuMetni(gorevler, onkosul) {
  const l = ['# ' + KUTU_ADI + ' — tatbikat kutusu', '', '**Açılış mührü:** Deneme Sahip · 2026-08-01', '',
             '## Görevler', '| Görev | İş | Sahip | Durum | Kanıt |', '|---|---|---|---|---|'];
  for (const k of gorevler) l.push(`| ${k.id} | ${k.is} | uretici | ${k.durum} | ${k.kanit || 'test: t.mjs'} |`);
  l.push('', '## Duruş sözleşmesi',
    'BİTİŞ HÂLİ: ekranda iki satır görünür',
    'KANIT:      npm test yeşil (tam özet satırı)',
    'KISIT:      02_kanon/golden/ dokunulmaz',
    'BÜTÇE:      dönem başına en çok 3 ÜRETİM çağrısı · toplam 12 dönem',
    'İZİN:       yok',
    '', '## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)');
  for (const k of gorevler) l.push(`${k.id}: onkosul=${onkosul[k.id] || 'yok'} · risk=düşük — tek satır gerekçe`);
  return l.join('\n') + '\n';
}

function kurulum({ gorevler, onkosul = {}, evre = 'yapim', gosterge = null } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'sabah-test-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '01_kutular', KUTU_ADI), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  mkdirSync(join(kok, '03_roller', 'disgoz'), { recursive: true });
  for (const b of SEVK_BETIKLERI) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'cevap-sozlugu.txt'), join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt'));
  // gorev-durumlari.txt VERI dosyasidir ve sevk onu FAIL-CLOSED arar (K5 tek evi; kume
  // bekci ile ORTAK): kurulu projede her zaman vardir, simulasyon da tasimak zorunda.
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'bekci', 'gorev-durumlari.txt'),
               join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'));
  // zarf-jetonlari.txt de VERI dosyasidir ve IKI UC (sevk + zarf-bicim-kapisi) onu
  // FAIL-CLOSED arar (U40 tek evi): kurulu projede hep vardir, simulasyon da tasir.
  copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'zarf-jetonlari.txt'),
               join(kok, 'tools', 'sevk', 'zarf-jetonlari.txt'));
  // Kuyruga yazan kollar icerik suzgecini FAIL-CLOSED arar (U60): kod betigin yanindan,
  // VERI projenin kokunden gelir. Kurulu projede ikisi de vardir; simulasyon da tasir.
  kuyrukBagimliliklariKur(kok, KOK_REPO);
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'gercek-veri-isaretleri.txt'), join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  for (const a of ['uretici', 'dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi', 'disgoz']) {
    writeFileSync(join(kok, '.claude', 'agents', a + '.md'), '---\nname: ' + a + '\ntools: Read\n---\n# test ajanı\n');
  }
  writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), '# DIŞ GÖZ — brifing\n');
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  writeFileSync(join(kok, '01_kutular', KUTU_ADI, 'KUTU.md'), kutuMetni(gorevler, onkosul));
  writeFileSync(join(kok, '02_kanon', 'KARAR_ALANI.md'), kararAlaniMetni());
  writeFileSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'), '# OTONOM DÖNEM\n\ntatbikat kopyası\n');
  writeFileSync(join(kok, '.kurulum-tamam'), '');
  // Bekçi vekili: sevk dönem içinde ışığı kendisi tazeler; yoksa duran kapı basar.
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'),
    "#!/bin/bash\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n");
  chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  writeFileSync(GOSTERGE(kok),
    gosterge !== null ? gosterge
      : `${DONEM_ID}\t${KUTU_ADI}\t${evre}\ttatbikat\ndamga\t${new Date().toISOString()}\n`);
  return kok;
}

const sevk = (kok) => spawnSync('bash', [join(kok, 'tools', 'sevk', 'sevk.sh')], {
  encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  input: JSON.stringify({ session_id: 'S1', hook_event_name: 'Stop', stop_hook_active: false }),
});
const ekle = (kok, o) => appendFileSync(GUNLUK(kok),
  JSON.stringify({ surum: 1, ts: '2026-07-28T10:00:00Z', donem: DONEM_ID, ...o }) + '\n');
const sabah = (kok) => readFileSync(SABAH(kok), 'utf8');
// Blok gövdesi: '## <BAŞLIK>' satırından sonraki, bir sonraki '## ' gelene kadarki metin.
function blok(metin, baslik) {
  const s = metin.split('\n');
  const i = s.findIndex((l) => l === '## ' + baslik);
  assert.ok(i >= 0, `'${baslik}' bloğu yok:\n${metin}`);
  const govde = [];
  for (let k = i + 1; k < s.length && !s[k].startsWith('## '); k++) govde.push(s[k]);
  return govde.join('\n').trim();
}

// İki hâlin fixture'ı: aynı kutu, tek fark görevlerin durumu.
const BITTI_GOREVLER = [{ id: 'G-01', is: 'ilk iş', durum: 'kapalı', kanit: '00_pano/PANO.md' },
                        { id: 'G-02', is: 'ikinci iş', durum: 'kapalı', kanit: '00_pano/PANO.md' }];
const DUSTU_GOREVLER = [{ id: 'G-01', is: 'ilk iş', durum: 'pas' },
                        { id: 'G-02', is: 'ikinci iş', durum: 'açık' }];

// "İş bitti" hâli: kapanış evresi + dış göz brifingi + TAZE YEŞİL kapanış karnesi → KAPAT.
function bittiKurulumu() {
  const kok = kurulum({ gorevler: BITTI_GOREVLER, onkosul: { 'G-01': 'yok', 'G-02': 'yok' }, evre: 'kapanis' });
  for (const g of ['G-01', 'G-02']) {
    ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: g, sinif: 'is', alanlar: { catal: 'yok' } });
    ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: g, hukum: 'YEŞİL', maddeler: 'kanıt=DOĞRU' });
  }
  ekle(kok, { tip: 'brifing', ajan: 'disgoz' });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'YEŞİL', maddeler: 'bitis=DOĞRU' });
  return kok;
}
// "İş düştü" hâli: bir görev PAS, kalan görev onun ön koşuluna bağlı → duran kapı.
const dustuKurulumu = () =>
  kurulum({ gorevler: DUSTU_GOREVLER, onkosul: { 'G-01': 'yok', 'G-02': 'G-03' } });

// ── 1 · Yüzey doğuyor mu ──────────────────────────────────────────────────────────────────

test('sabah: dönem kapanınca SABAH.md doğar — künye + ÜÇ blok, sırayla', () => {
  const kok = dustuKurulumu();
  const r = sevk(kok);
  assert.equal(r.status, 0, 'dönem kapanmalı: ' + r.stdout + r.stderr);
  assert.ok(existsSync(SABAH(kok)), 'gecenin tek köprüsü doğmadı');
  const m = sabah(kok);
  const satirlar = m.split('\n');
  assert.match(satirlar[0], new RegExp(`^# SABAH — ${KUTU_ADI} · ${DONEM_ID} · \\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}$`),
    'künye kutu · dönem · tarih taşımalı: ' + satirlar[0]);
  const bas = ['## GECE NE OLDU', '## SENDE BEKLEYEN', '## ŞİMDİ NE YAPIYOR'];
  assert.deepEqual(satirlar.filter((l) => l.startsWith('## ')), bas, 'üç blok, bu sırayla');
  for (const b of bas) assert.ok(blok(m, b.slice(3)).length > 0, b + ' bloğu boş');
});

// ── 2 · AYRIM: "iş bitti" ile "iş düştü" ──────────────────────────────────────────────────

test('sabah/İŞ BİTTİ: kapanan görev sayısı 1. blokta; hiçbir yerde "YAPILMADI" geçmez', () => {
  const kok = bittiKurulumu();
  const r = sevk(kok);
  assert.equal(r.status, 0, 'kapanış denetimi YEŞİL dönemi kapatmalı: ' + r.stdout + r.stderr);
  const m = sabah(kok);
  assert.match(blok(m, 'GECE NE OLDU'), /2\/2 gorev karneyle kapali/, 'biten iş sayısı sahibe gitmeli');
  assert.ok(!/YAPILMADI/.test(m), 'iş bittiğinde düşme uyarısı üretilmemeli (yanlış-pozitif freni):\n' + m);
  assert.match(blok(m, 'ŞİMDİ NE YAPIYOR'), /kapanis denetimi YESIL/, 'sahibin sırası: mühür');
});

test('sabah/İŞ DÜŞTÜ: PAS görev 3. blokta ADIYLA ve "is YAPILMADI" diye geçer', () => {
  const kok = dustuKurulumu();
  assert.equal(sevk(kok).status, 0);
  const m = sabah(kok);
  const b3 = blok(m, 'ŞİMDİ NE YAPIYOR');
  assert.match(b3, /1 gorev PAS \(is YAPILMADI: G-01\)/, 'düşen iş adıyla sahibe gitmeli: ' + b3);
});

test('sabah/İŞ DÜŞTÜ: PAS görev 1. blokta "kapali" SAYILMAZ (sahip yüzeyinde yalan olurdu)', () => {
  const kok = dustuKurulumu();
  assert.equal(sevk(kok).status, 0);
  const b1 = blok(sabah(kok), 'GECE NE OLDU');
  assert.match(b1, /0\/2 gorev karneyle kapali/, 'pas görev kapanmış gibi sayılmamalı: ' + b1);
});

test('sabah/İŞ DÜŞTÜ: duran kapı 3. bloğa "durdu — " ile yazılır (sessiz "bitti" yok)', () => {
  const kok = dustuKurulumu();
  assert.equal(sevk(kok).status, 0);
  assert.match(blok(sabah(kok), 'ŞİMDİ NE YAPIYOR'), /^durdu — /, 'duran kapı sahibe açıkça söylenmeli');
});

test('sabah/İŞ DÜŞTÜ: sebep özeti ASILI KALMAZ — iki nokta + boş liste yok, kırpma izi var', () => {
  // U13'ün ölçümü bunu buldu: duran kapının sebebi çok satırlıdır, sahip yüzeyine yalnız İLK
  // satır gidiyordu ve o satır iki noktayla bitiyordu → "…acilamiyor:; 1 gorev PAS".
  const kok = dustuKurulumu();
  assert.equal(sevk(kok).status, 0);
  const b3 = blok(sabah(kok), 'ŞİMDİ NE YAPIYOR');
  assert.ok(!/:\s*;/.test(b3), 'iki nokta bir liste vaat edip boş kalıyor: ' + b3);
  assert.ok(!/:\s*$/.test(b3.split(';')[0]), 'özet iki noktayla asılı bitiyor: ' + b3);
  assert.match(b3, /\(\d+ sebep\)/, 'kırpılan satırların izi düşmeli (EL_KITABI üslup hükmü): ' + b3);
  // Kırpılan satırlar KAYBOLMUYOR: tamamı günlükteki duran-kapı bulgusunda duruyor.
  const bulgu = readFileSync(GUNLUK(kok), 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s))
    .find((j) => j.cins === 'duran-kapi');
  assert.ok(bulgu && /\n {2}- /.test(String(bulgu.detay)), 'ayrıntı günlükte tam durmalı');
});

test('sabah/AYRIM: iki hâlin dosyası sahibin okuduğu işaretlerde AYRIŞIR', () => {
  // U13'ün asıl sorusu bu: aynı kutunun iki gecesi, sahip yüzeyinde birbirine benzemiyor mu?
  const bitti = sabah((() => { const k = bittiKurulumu(); assert.equal(sevk(k).status, 0); return k; })());
  const dustu = sabah((() => { const k = dustuKurulumu(); assert.equal(sevk(k).status, 0); return k; })());
  assert.ok(/YAPILMADI/.test(dustu) && !/YAPILMADI/.test(bitti), 'düşme işareti yalnız düşen gecede olmalı');
  assert.ok(/2\/2 gorev karneyle kapali/.test(bitti) && !/2\/2 gorev karneyle kapali/.test(dustu),
    'bitiş sayısı yalnız biten gecede olmalı');
});

// ── 3 · Yüzeyin kendi disiplini ───────────────────────────────────────────────────────────

test('sabah: F2 yerinde yeniden yazım — ikinci gece birincinin izini TAŞIMAZ', () => {
  const kok = dustuKurulumu();
  assert.equal(sevk(kok).status, 0);
  assert.match(sabah(kok), /YAPILMADI/);
  // İkinci gece: aynı kutu, bu kez düşen iş yok (kapanış denetimi yeşil).
  const ikinci = bittiKurulumu();
  copyFileSync(SABAH(kok), SABAH(ikinci));            // eski gecenin dosyası yerinde duruyor
  assert.equal(sevk(ikinci).status, 0);
  const m = sabah(ikinci);
  assert.ok(!/YAPILMADI/.test(m), 'append edilmiş: dünün düşen işi bugünün yüzeyinde duruyor:\n' + m);
  assert.equal(m.split('# SABAH — ').length, 2, 'tek künye olmalı (yerinde yeniden yazım)');
});

test('sabah: bloklar hiç üretilemese bile üç blok DÜŞER (fail-open; iz kaybolmaz)', () => {
  // Gösterge bozuk → sevk çözümleyiciye HİÇ gelmez; kapanış yüzeyi yine yazılmak zorunda,
  // yoksa sabah eden sahip gecenin öldüğünü hiçbir yerden göremez.
  const kok = kurulum({ gorevler: DUSTU_GOREVLER, gosterge: `\t${KUTU_ADI}\tyapim\ttatbikat\n` });
  assert.equal(sevk(kok).status, 0);
  const m = sabah(kok);
  assert.match(blok(m, 'GECE NE OLDU'), /sayaçlar okunamadı/);
  assert.match(blok(m, 'SENDE BEKLEYEN'), /kuyruk durumu okunamadı/);
  assert.match(blok(m, 'ŞİMDİ NE YAPIYOR'), /^durdu — /);
});

// ── 4 · Açılış köprüsü — dosyayı sahibe gösteren tek satır ────────────────────────────────

test('açılış: bugünün sabah yüzeyi varsa köprü satırı basılır; eskisi TARİHİYLE basılır', () => {
  const kok = mkdtempSync(join(tmpdir(), 'sabah-acilis-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'acilis.sh'), join(kok, 'tools', 'guard', 'acilis.sh'));
  const kos = () => spawnSync('bash', [join(kok, 'tools', 'guard', 'acilis.sh')],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } }).stdout;

  assert.ok(!/SABAH\.md/.test(kos()), 'dosya yokken satır hiç doğmamalı (ısrar yok — D-21)');

  // YEREL gün, UTC değil (2026-08-08 koşusunda kırmızı bulundu): `acilis.sh` günü
  // `date '+%Y-%m-%d'` ile YEREL okur, `sevk.sh` künyeyi yine yerel `date` ile yazar.
  // `toISOString()` UTC verir — UTC+3'te gece 00:00-03:00 arasında iki gün AYRIŞIR ve bu
  // test saatin kendisine bağlı olarak kızarırdı (test kusuru; ürün doğruydu). Yeşilliği
  // duvar saatine bağlı test, kanıt değildir.
  const g = new Date(); const iki = (n) => String(n).padStart(2, '0');
  const bugun = `${g.getFullYear()}-${iki(g.getMonth() + 1)}-${iki(g.getDate())}`;
  writeFileSync(SABAH(kok), `# SABAH — ${KUTU_ADI} · ${DONEM_ID} · ${bugun} 03:14\n`);
  assert.match(kos(), /Bu gece bir dönem oldu — üç blok hazır: 00_pano\/SABAH\.md/);

  writeFileSync(SABAH(kok), `# SABAH — ${KUTU_ADI} · ${DONEM_ID} · 2026-01-02 03:14\n`);
  const eski = kos();
  assert.match(eski, /Son dönemin sabah yüzeyi 2026-01-02 tarihli/);
  assert.ok(!/Bu gece bir dönem oldu/.test(eski), 'eski yüzey "bu gece" diye tanıtılmamalı');
});

// ── 5 · KIRMIZIYA DÖNÜYOR MU — fixture'ın kendi sevk.sh kopyası bozulur ───────────────────

test('bozma 1 · PAS uyarısı 3. bloktan çıkarılırsa ayrım ÇÖKER (yukarıdaki testler kırmızı)', () => {
  const kok = dustuKurulumu();
  const yol = join(kok, 'tools', 'sevk', 'sevk.sh');
  const kaynak = readFileSync(yol, 'utf8');
  // ÇAPA K5'TE GÜNCELLENDİ: PAS cümlesi artık deyimi BİTİRMİYOR — ardından mühür bekleyen
  // görevlerin cümlesi geliyor, `;` oraya taşındı. Eski çapa sondaki `;`e bağlıydı ve testin
  // kendisi "bozma çapası bulunamadı" diyerek kızardı; çapanın bayatlaması sessiz geçmedi.
  const bozuk = kaynak.replace(
    /\+ \(OZET\.pas\.length \? "; " \+ OZET\.pas\.length \+ " gorev PAS \(is YAPILMADI: " \+ OZET\.pas\.join\(" "\) \+ "\)" : ""\)/,
    '+ ""');
  assert.notEqual(bozuk, kaynak, 'bozma çapası kaynakta bulunamadı — test bayatladı');
  writeFileSync(yol, bozuk);
  assert.equal(sevk(kok).status, 0);
  const m = sabah(kok);
  assert.ok(!/YAPILMADI/.test(m), 'bozma tutmadı');
  assert.match(blok(m, 'GECE NE OLDU'), /0\/2 gorev karneyle kapali/);
  // Sahip yüzeyi artık "0 iş kapandı" diyor ama İŞİN DÜŞTÜĞÜNÜ söylemiyor: ayrımın taşıyıcısı
  // tam olarak bu ek cümledir ve testi olmadan sessizce silinebilirdi (U13'ün özü).
});

test('bozma 2 · özet yeniden "yalnız ilk satır" olursa ASILI CÜMLE geri gelir', () => {
  const kok = dustuKurulumu();
  const yol = join(kok, 'tools', 'sevk', 'sevk.sh');
  const kaynak = readFileSync(yol, 'utf8');
  const bozuk = kaynak.replace(
    /    OZET\.simdi = "durdu — " \+ satirlar\[0\]\.replace\(\/\[\\s:\]\+\$\/, ""\) \+ \(kalan \? " \(" \+ kalan \+ " sebep\)" : ""\);/,
    '    OZET.simdi = "durdu — " + satirlar[0];');
  assert.notEqual(bozuk, kaynak, 'bozma çapası kaynakta bulunamadı — test bayatladı');
  writeFileSync(yol, bozuk);
  assert.equal(sevk(kok).status, 0);
  const b3 = blok(sabah(kok), 'ŞİMDİ NE YAPIYOR');
  assert.match(b3, /:\s*;/, 'bozma tutmadı — asılı cümle geri gelmeliydi');
});

test('bozma 3 · SABAH.md yazımı kaldırılırsa gecenin köprüsü YOK OLUR', () => {
  const kok = dustuKurulumu();
  const yol = join(kok, 'tools', 'sevk', 'sevk.sh');
  const kaynak = readFileSync(yol, 'utf8');
  const bozuk = kaynak.replace('> "$KOK/00_pano/SABAH.md"', '> /dev/null');
  assert.notEqual(bozuk, kaynak, 'bozma çapası kaynakta bulunamadı — test bayatladı');
  writeFileSync(yol, bozuk);
  assert.equal(sevk(kok).status, 0, 'dönem yine kapanmalı (yüzey fail-open)');
  assert.ok(!existsSync(SABAH(kok)), 'bozma tutmadı');
});
