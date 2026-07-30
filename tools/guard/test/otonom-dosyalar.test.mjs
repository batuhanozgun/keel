// otonom-dosyalar.test.mjs — Faz 2 sıra 6 (F1-2e): otonom tarafın dosyaları KURULUMDAN çıkar.
//
// Sıra 6'nın bitti ölçütü: "kurulum sonrası OTONOM_DONEM.md · KARAR_ALANI.md ·
// .claude/agents/<slug>.md ELLE DOKUNULMADAN var." Bu dosya o ölçütü üç hattan kapatır:
//   (a) KALIP     — kurulumun kopyalayacağı metin var, ölçülü ve doldurulabilir mi
//   (b) YOL AÇIK  — koruma kancası kurulum penceresinde bu dosyaların yazımına izin veriyor mu
//                   (bugüne dek KAPALIYDI: .claude/agents ve tools/sevk çekirdekte SERT'ti)
//   (c) KAPI      — çekilme kapısı yokluklarını KIRMIZI basıyor mu (ilan ↔ kod eşliği)
// Üç hattan biri eksikse "kurulum bu dosyaları bırakıyor" cümlesi ilan olur, güvence olmaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync,
         cpSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const GUARD = join(BURASI, '..');
const KOK_REPO = join(GUARD, '..', '..');
const KANCA = join(GUARD, 'file-guard.sh');
const DENETIM = join(GUARD, 'kurulum-denetimi.sh');
const GEN = join(KOK_REPO, '00_genesis');

// TAVAN SAYILARI BURADA SABİTTİR (otonom-sim emsali, hasım bulgusu 2026-07-28): tavanı ölçtüğü
// dosyanın kendi yorumundan okumak, metni büyüten kişi aynı düzenlemede sayıyı da büyütünce
// freni fren olmaktan çıkarıyordu. Tavan değişikliği İKİ dosyada bilinçli edim ister.
const TAVANLAR = { KILAVUZ: 5632, ROL_ALT_AJAN: 2560 };
const MARJ_FRENI = 500;

function kalipTavani(metin, ad) {
  const m = metin.match(/Tavan:\s*([\d.]+)\s*B/);
  assert.ok(m, `${ad}: kalıp yorumunda "Tavan: N B" beyanı yok`);
  const beyan = Number(m[1].replace('.', ''));
  assert.equal(beyan, TAVANLAR[ad],
    `${ad}: kalıptaki tavan beyanı (${beyan}B) testteki sabitle (${TAVANLAR[ad]}B) uyuşmuyor`);
  return beyan;
}

// Kurulu-sim: kalıp yorumu atılır, «alanlar» doldurulur (otonom-sim emsali).
function kuruluSim(metin, alanlar) {
  const satirlar = metin.split('\n');
  const yorumSonu = satirlar.findIndex((s) => s.trimEnd().endsWith('-->'));
  assert.ok(yorumSonu >= 0 && yorumSonu < 40, 'kalıp-yorumu bloğu bulunamadı');
  let sim = satirlar.slice(yorumSonu + 1).join('\n');
  for (const [a, d] of Object.entries(alanlar)) sim = sim.replaceAll(a, d);
  return sim;
}

const KILAVUZ = () => readFileSync(join(GEN, 'KILAVUZ_KALIBI.md'), 'utf8');
const AJAN_KALIP = () => readFileSync(join(GEN, 'ROL_ALT_AJAN_KALIBI.md'), 'utf8');

const kilavuzSim = () => kuruluSim(KILAVUZ(), {
  '«PROJE-ADI»': 'Deneme Projesi', '«PO-SLUG»': 'po',
  '«KOORDİNATÖR-SLUG»': 'koordinator', '«KOKPIT-PORT»': '4173',
  '«EKİP-LİSTESİ»': [
    '- **Ürün sahibi** — ne yapılacağına karar verir, demoyu izler · `/rol-po`',
    '- **Koordinatör** — sırayı ve akışı yürütür · `/rol-koordinator`',
    '- **Uygulayıcı** — kodu yazar · `/rol-uygulayici`',
    '- **Denetleyen** — işin doğru yapıldığını kanıtlar · `/rol-denetci`',
    '- **Dış göz** — sana durum brifingi yazar · `/rol-disgoz`',
  ].join('\n'),
});

const ajanSim = ({ slug = 'denetci', mod = 'yazamaz', arac = 'Read, Grep, Glob' } = {}) =>
  kuruluSim(AJAN_KALIP(), {
    '«SLUG»': slug, '«ROL-ADI»': 'Denetçi', '«MOD»': mod, '«ARAÇLAR»': arac,
    '«BİR-SATIR-İŞ»': 'işin doğru yapıldığını kanıtla.',
  });

// ══ (a) KALIP HATTI ═══════════════════════════════════════════════════════════════════════

test('KILAVUZ_KALIBI: kurulu-sim tavana sığar + marj freni korunur', (t) => {
  const TAVAN = kalipTavani(KILAVUZ(), 'KILAVUZ');
  const sim = kilavuzSim();
  assert.ok(!sim.includes('«'), 'kurulu kılavuzda doldurulmamış «alan» kaldı');
  const B = Buffer.byteLength(sim, 'utf8');
  t.diagnostic(`kilavuz-sim: ${B}B · tavan ${TAVAN}B · marj ${TAVAN - B}B`);
  assert.ok(B <= TAVAN, `KILAVUZ kurulu boyu tavanı aşıyor: ${B}B > ${TAVAN}B`);
  assert.ok(TAVAN - B >= MARJ_FRENI,
    `KILAVUZ marjı frenin altında: ${TAVAN - B}B < ${MARJ_FRENI}B — sıkıştır ya da tavanı beyanla yeniden al`);
});

test('KILAVUZ_KALIBI sahibin zorunlu kalemlerinin hepsini taşıyor', () => {
  // Bu liste eskiden `adimlar/G5.md`'nin İÇİNDEydi ve tek bekçisi oradaki düzyazıydı.
  // İçerik kalıba taşındı; ölçen artık burası (taşımada kalem düşmesin).
  const sim = kilavuzSim();
  for (const baslik of ['## Ekibin', '## Günlük döngü', '## İlk işin', '## Nerede sen dahilsin',
                        '## Sonunda önüne gelecek paket', '## Her kapanışın üç başlığı',
                        '## Dış göz', '## İş verirken 4 soru kartı',
                        // 12. bölüm ilk yazımda listede YOKTU (hasım bulgusu): silinse hiçbir test
                        // kırmızı olmuyordu ve tam da davranış-kalkanına ait kalem korumasızdı.
                        '## Ara sıra sana iki kontrol sorusu gelebilir', '## Tek ezberin',
                        '## Tek ekrandan izleme', '## Düşman-gözü incelemesi']) {
    assert.ok(sim.includes(baslik), `sahip kılavuzunda zorunlu bölüm eksik: ${baslik}`);
  }
  assert.match(sim, /BİTEN · SENDE BEKLEYEN · SIRADAKİ/, 'kapanışın üç başlığı yazılı değil');
  assert.match(sim, /taze tarih damgası yoksa sistem KIRMIZI/, '"tek ezber" kalemi düşmüş');
  assert.match(sim, /Dördünden biri eksikse onaylamayın/, 'eksik paket kuralı düşmüş');
  assert.match(sim, /Sahte seçenek menüsü gördün mü/, 'iki kontrol sorusundan biri düşmüş');
  assert.match(sim, /sana taşınan karar gerçekten senin miydi/, 'iki kontrol sorusundan biri düşmüş');
  // BÖLÜM SAYISI SABİT: yeni bölüm eklenip zorunlu listeye yazılmazsa bu satır KIRMIZI olur
  // (11'e 12 kalem sığdıran ilk yazımın kör noktası buydu).
  assert.equal((sim.match(/^## /gm) || []).length, 12,
    'kılavuz bölüm sayısı değişti — zorunlu kalem listesini de güncelle');
});

test('KILAVUZ_KALIBI ilanı ↔ gövdesi EŞ: ilan edilen her alan gövdede geçer', () => {
  // «SAHİP» ilan edilmişti ama gövdede yeri yoktu; testin doldurması NO-OP olduğu için
  // hiçbir kalem bunu göremiyordu (hasım bulgusu 2026-07-30).
  const k = KILAVUZ();
  const yorumSonu = k.split('\n').findIndex((s) => s.trimEnd().endsWith('-->'));
  const yorum = k.split('\n').slice(0, yorumSonu + 1).join('\n');
  const govde = k.split('\n').slice(yorumSonu + 1).join('\n');
  // Alan adı büyük harflidir («alanları doldur» gibi düzyazı ibare alan DEĞİL).
  const ad = (s) => /^[A-ZÇĞİÖŞÜ0-9-]+$/.test(s);
  const ilan = [...new Set([...yorum.matchAll(/«([^»]+)»/g)].map((m) => m[1]).filter(ad))];
  const kullanilan = [...new Set([...govde.matchAll(/«([^»]+)»/g)].map((m) => m[1]).filter(ad))];
  assert.deepEqual(ilan.slice().sort(), kullanilan.slice().sort(),
    `ilan ile gövde ayrışmış — ilan: ${ilan} · gövde: ${kullanilan}`);
});

test('KILAVUZ_KALIBI sabit gövdesinde çevrilmemiş kısaltma yok', () => {
  // "Arada PO ile sohbet" dondu: sahip kılavuzu, sahibin KEEL'i öğrenmeden okuduğu tek dosya.
  const govde = kilavuzSim().replace(/«[^»]+»/g, '');
  assert.ok(!/\bPO\b/.test(govde), 'sahip kılavuzunda çevrilmemiş "PO" kısaltması var');
});

test('KILAVUZ_KALIBI SAHİP YÜZEYİDİR: KEEL sözlüğünden kelime geçmez', () => {
  // Sahip kılavuzu, sahibin KEEL'i öğrenmeden okuduğu tek dosyadır. Jargon buraya sızarsa
  // sahip anlamadığı bir tarifi izler (feedback-gercek-dosya-adi dersinin ürün tarafı).
  const sim = kilavuzSim().toLocaleLowerCase('tr');
  for (const k of ['kadran', 'kanon', 'çapa', 'sevk', 'dönem', 'zarf', 'karne', 'mühür',
                   'bekçi', 'kadro', 'kutu']) {
    assert.ok(!sim.includes(k), `sahip kılavuzunda KEEL sözlüğü var: "${k}"`);
  }
});

test('ROL_ALT_AJAN_KALIBI: kurulu-sim tavana sığar + marj freni korunur', (t) => {
  const TAVAN = kalipTavani(AJAN_KALIP(), 'ROL_ALT_AJAN');
  const sim = ajanSim();
  assert.ok(!sim.includes('«'), 'kurulu koltukta doldurulmamış «alan» kaldı');
  const B = Buffer.byteLength(sim, 'utf8');
  t.diagnostic(`ajan-sim: ${B}B · tavan ${TAVAN}B · marj ${TAVAN - B}B`);
  assert.ok(B <= TAVAN, `alt-ajan koltuğu tavanı aşıyor: ${B}B > ${TAVAN}B`);
  assert.ok(TAVAN - B >= MARJ_FRENI, `marj freni: ${TAVAN - B}B < ${MARJ_FRENI}B`);
});

test('ROL_ALT_AJAN kurulu-sim: frontmatter geçerli, memory alanı YOK', () => {
  const sim = ajanSim();
  assert.equal(sim.split('\n')[0], '---', 'ilk satır `---` değil — frontmatter yenirse koltuk sessiz ölür');
  assert.match(sim, /^name: denetci$/m, 'name alanı slug\'la eşleşmiyor');
  assert.match(sim, /^tools: Read, Grep, Glob$/m, 'tools satırı satır başında değil');
  assert.ok(!/^\s*memory\s*:/m.test(sim), 'memory alanı var — zorunlu unutmanın ölüm noktası');
});

test('ROL_ALT_AJAN kalıbı iki araç dizesini BİREBİR ilan ediyor', () => {
  // Kapı, `yazamaz` koltukta yazma aracı arar; kalıp o iki dizeyi ilan etmiyorsa kurulumcu
  // araç listesini kendi uydurur ve "yazamayan koltuk" güvencesi kurulum başına değişir.
  const k = AJAN_KALIP();
  assert.ok(k.includes('yazamaz → Read, Grep, Glob'), 'yazamaz araç dizesi ilan edilmemiş');
  assert.ok(k.includes('tam     → Read, Grep, Glob, Edit, Write, Bash'), 'tam araç dizesi ilan edilmemiş');
  assert.match(k, /[Rr]ol kafesi \(file-guard\)[\s\S]{0,200}tören/,
    'kafesin otonom dönemde sustuğu gerekçesi kalıpta yazılı değil — (iii) kalemi gerekçesiz kalır');
});

// ══ TARİF ↔ KAPI EŞLİĞİ ═══════════════════════════════════════════════════════════════════

const adim = (ad) => readFileSync(join(GEN, 'adimlar', ad), 'utf8');

test('G3b tarifi iki yeni maddeyi ve dört hedefi adıyla taşıyor', () => {
  const g = adim('G3b.md');
  assert.match(g, /^3e\. /m, 'G3.3e (kadronun alt-ajanları) maddesi yok');
  assert.match(g, /^3f\. /m, 'G3.3f (otonom kipin dosyaları) maddesi yok');
  for (const c of ['ROL_ALT_AJAN_KALIBI.md', '.claude/agents/<slug>.md',
                   'OTONOM_DONEM_KALIBI.md', '02_kanon/OTONOM_DONEM.md',
                   'KARAR_ALANI_KALIBI.md', '02_kanon/KARAR_ALANI.md',
                   'karar-alani.sh']) {
    assert.ok(g.includes(c), `G3b tarifinde eksik hedef: ${c}`);
  }
  // SIRALAMA TUZAĞI (hasım bulgusu): işaret listesi doldurma G3'ten G5'e TAŞINDI. G3b'de kalırsa
  // liste, kokpit ve kanal yazımlarını (G5.0b/0c) kendi kurulumunda ENGEL'e çevirir.
  assert.ok(!g.includes('gercek-veri-isaretleri.txt'),
    'işaret listesi doldurma G3b\'de geri belirmiş — sıralama tuzağı yeniden açılır');
  // Bölüm B artık sahibe SORULUYOR + teyit damgası zorunlu
  assert.match(g, /Bölüm B'yi SEN YAZMAZSIN, SAHİBE SORARSIN/, 'karar alanı hâlâ ajanın kalemine bırakılmış');
  assert.ok(g.includes('Karar alanı teyidi:'), 'teyit damgası tarifte yok');
  assert.match(g, /İLK SATIRI `---`/, 'frontmatter kanıtı tarifte yok');
  assert.match(g, /REZERVE/, 'rezerve ad kuralı tarifte yok');
  // Kalemin en kritik parçası: yazamaz koltukta yazma aracı yasağı TARİFTE de yazılı olmalı,
  // yoksa kurulumcu kapıya çarpar ama sebebini bilmez.
  assert.match(g, /İKİ dizeden biriyle \*\*BİREBİR\*\* aynı/, 'araç listesi birebir eşleme şartı tarifte yok');
});

test('G5 tarifi otonom kipin makine ayarını taşıyor ve kılavuzu kalıba devretti', () => {
  const g = adim('G5.md');
  assert.match(g, /^0c\. /m, 'G5.0c (haber kanalı + watchdog) maddesi yok');
  for (const c of ['KILAVUZ_KALIBI.md', 'kanal.conf.ornek', 'tools/sevk/kanal.conf',
                   'kanal-yokla.sh', 'watchdog-kur.sh', 'SENDE_BEKLEYEN.md']) {
    assert.ok(g.includes(c), `G5 tarifinde eksik hedef: ${c}`);
  }
  // GERİ-KAYMA ÇAPASI: kılavuzun METNİ artık kalıpta yaşıyor. Adım dosyası onu yeniden
  // taşımaya başlarsa iki kaynak doğar, biri sessizce eskir ve tarif tavanı yine şişer.
  for (const sizinti of ['Tek ezberin', 'BİTEN · SENDE BEKLEYEN · SIRADAKİ', '4 soru kartı']) {
    assert.ok(!g.includes(sizinti), `kılavuz metni G5'e geri sızmış: "${sizinti}"`);
  }
  // Parola kuralı: kurulum parolayı ne yazar ne görür.
  assert.match(g, /PAROLAYI SEN NE YAZARSIN NE GÖRÜRSÜN/, 'parola sınırı G5.0c\'de yazılı değil');
  // Kılavuz kalıptan doğduğu için ilk kez «alan» taşıyabilir; ama G4.5 kapısı G5'ten ÖNCE
  // koşar ve o dosyayı hiç göremez. Bu paket ilk yazımında "G4.5'te KIRMIZI'dır" diyordu —
  // yanlıştı (ilan abartması). Tek gerçek denetim adımın KENDİ kanıt satırıdır.
  assert.match(g, /grep -c '«' NASIL_KULLANILIR\.md/,
    'kılavuzun «alan» denetimi hiçbir yerde yok — G4.5 o dosyayı göremez');
  assert.ok(!/Kalan «alan» G4\.5/.test(g), 'G4.5 kılavuzu göremez; bu ilan yanlış');
});

test('«alan» taraması kadro koltuklarını KAPSIYOR — davranışla ölçülür', () => {
  // İlk yazımda bu kalemin tek testi betiğin KENDİ kaynak satırını grep'liyordu (hasım bulgusu):
  // kaynak doğru, davranış ölçülmemişti. Artık yarım doldurulmuş bir koltuk kuruluyor.
  const r = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    kuruluSim(AJAN_KALIP(), { '«SLUG»': 'disgoz', '«ROL-ADI»': 'Dış göz', '«MOD»': 'yazamaz',
                              '«BİR-SATIR-İŞ»': 'brifing yaz.' }))));   // «ARAÇLAR» BİLEREK doldurulmadı
  assert.match(r.stdout, /KIRMIZI · doldurulmamış «alan» var:.*agents\/disgoz\.md/);
});

test('«alan» taraması kökteki sahip kılavuzunu da görüyor (varsa)', () => {
  // G4.5 koşusunda kılavuz henüz YOKTUR; G5.3.c'nin ikinci koşusunda vardır. Doldurulmamış
  // «PROJE-ADI» sahibin kokpit panelinde basılır — kalem bu yüzden var.
  const r = kapi(fixture((k) => writeFileSync(join(k, 'NASIL_KULLANILIR.md'), '# «PROJE-ADI» — nasıl kullanılır\n')));
  assert.match(r.stdout, /KIRMIZI · doldurulmamış «alan» var:.*NASIL_KULLANILIR\.md/);
  const temiz = kapi(fixture((k) => writeFileSync(join(k, 'NASIL_KULLANILIR.md'), '# Deneme — nasıl kullanılır\n')));
  assert.ok(!/NASIL_KULLANILIR/.test(temiz.stdout), 'dolu kılavuzda yanlış KIRMIZI');
});

test('G5.3.c kapıyı pencerenin KAPANIŞINDA ikinci kez koşturuyor', () => {
  // Kurulum-penceresi istisnaları `.kurulum-tamam` düşene kadar açık; onları ölçen tek göz
  // G4.5'te, yani pencerenin ORTASINDA koşuyordu (hasım bulgusu).
  const g = adim('G5.md');
  assert.match(g, /kurulum-denetimi\.sh` YENİDEN koşup yeşil vermeli/,
    'çekilme öncesi ikinci kapı koşusu tarifte yok');
});

test('kanal.conf.ornek başlığı yeni davranışla ÇELİŞMİYOR', () => {
  // G5.0c alan anlamlarını bu dosyanın başlığına DEVREDİYOR; başlık bayat kalırsa kurulum ajanı
  // yazılı kuralı yanlış bilir ya da adımı sessizce atlar (hasım bulgusu).
  const o = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'kanal.conf.ornek'), 'utf8');
  assert.ok(!o.includes('sahibin kendi eliyle doldurulur'), 'bayat cümle: artık kurulum dolduruyor');
  assert.ok(!/hiçbir ajan bu dosyayı araç katmanından okuyamaz\/yazamaz/.test(o),
    'bayat cümle: kurulum penceresinde YAZABİLİYOR, okuma da hiç engellenmiyordu');
  assert.ok(o.includes('G5.0c'), 'başlık kurulum adımını anmıyor');
});

test('kurulum penceresi: kanal ayarına BASH yazımı da ölçülüyor (yalnız Write değil)', () => {
  // Tarif "kopyala" diyordu ve doğal yol `cp`; ama Bash yazımı çekirdek-anıldı dikişine takılıp
  // sahibe soru düşürüyor. Delik değil, ama ölçülmemiş bir kanaldı (hasım bulgusu).
  const kok = kancaKurulum();
  const r = spawnSync('bash', [KANCA], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'cp tools/sevk/kanal.conf.ornek tools/sevk/kanal.conf' } }),
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
  assert.equal(r.status, 0, 'Bash kanalı engellenmemeli (soru meşru)');
  assert.match(r.stdout + r.stderr, /permissionDecision|ask|SOR/i,
    'kabuk yazımı sahibe sorulmuyor — tarif "yazma aracıyla yap" derken bunu varsayıyor');
  assert.match(adim('G5.md'), /Kopyalamayı ve doldurmayı YAZMA aracıyla yap/,
    'tarif kabuk yazımı yerine yazma aracını söylemiyor');
});

test('SYMLINK istisnayı YAYMIYOR: .claude/agents bir bağ ise istisna yok', () => {
  // kanonik() hem hedefi hem referansı çözdüğü için tek bir sembolik bağ, istisnayı bağın
  // işaret ettiği BÜTÜN ağaca yayıyordu (hasım bulgusu — koruma kodunun tamamı yazılabilir).
  const kok = kancaKurulum();
  rmSync(join(kok, '.claude', 'agents'), { recursive: true });
  symlinkSync(join(kok, 'tools', 'guard'), join(kok, '.claude', 'agents'));
  const r = yaz(kok, '.claude/agents/file-guard.sh');
  assert.equal(r.status, 2, 'bağ üzerinden koruma koduna yazım GEÇTİ — istisna bağa yayılmış');
});

test('ROL KAFESİ muaf yolda da koşuyor (öncelik: [SERT] > rol-kafesi > [SORULUR])', () => {
  // Muaf dal eskiden doğrudan GEC basıp çıkıyordu; `yazamaz` damgalı bir oturum sıradan bir iş
  // dosyasını yazamazken alt-ajan koltuğunu ve haber kanalını yazabiliyordu (hasım bulgusu).
  const kok = kancaKurulum();
  writeFileSync(join(kok, 'tools', 'guard', '.aktif-rol'), 'denetci\tyazamaz\t03_roller/denetci/\n');
  for (const yol of ['.claude/agents/uygulayici.md', 'tools/sevk/kanal.conf']) {
    const r = yaz(kok, yol);
    assert.equal(r.status, 2, `yazamaz rol muaf yola yazabildi: ${yol}`);
    assert.match(r.stderr, /rol kafesi/, 'engel rol kafesinden gelmiyor');
  }
});

test('G4.5 ilanı yeni iki kalemi sayıyor (ilan ↔ kod eşliği)', () => {
  const g = adim('G4.5.md');
  assert.ok(g.includes('alt-ajan koltuğu'), 'G4.5 ilanında kadro alt-ajan kalemi yok');
  assert.ok(g.includes('otonom kipin iki kanon dosyası'), 'G4.5 ilanında otonom kanon kalemi yok');
});

test('indeks kalıpları toplu adla anıyor ve G3b satırı yeni maddeleri sayıyor', () => {
  const i = readFileSync(join(KOK_REPO, 'GENESIS.md'), 'utf8');
  assert.ok(i.includes('00_genesis/*_KALIBI.md'), 'indeks kalıpları toplu adla anmıyor');
  assert.match(i, /G3b\.md.*3\.3e.*3\.3f/, 'indeksin G3b satırı yeni maddeleri saymıyor');
  // Tüm kalıplar gerçekten *_KALIBI.md deseniyle bitiyor mu (toplu ad yalan olmasın)
  const kaliplar = readdirSync(GEN).filter((f) => f.endsWith('_KALIBI.md'));
  assert.ok(kaliplar.includes('KILAVUZ_KALIBI.md') && kaliplar.includes('ROL_ALT_AJAN_KALIBI.md'),
    'yeni kalıplar desene uymuyor');
  assert.ok(kaliplar.length >= 9, `kalıp sayısı beklenenden az: ${kaliplar.length}`);
});

// ══ (b) YOL AÇIK — koruma kancası kurulum penceresinde izin veriyor mu ════════════════════

const SABIT_KOLTUKLAR = ['dogrulayici.md', 'catal-denetcisi.md', 'kurulum-denetcisi.md'];

function kancaKurulum({ kurulumTamam = false } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'oto-dosya-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'skills'), { recursive: true });
  mkdirSync(join(kok, '02_kanon', 'kilitli'), { recursive: true });
  copyFileSync(join(GUARD, 'korunan-yollar.txt'), join(kok, 'tools', 'guard', 'korunan-yollar.txt'));
  copyFileSync(join(GUARD, 'icerik-suzgeci.sh'), join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'));
  copyFileSync(join(GUARD, 'gercek-veri-isaretleri.txt'), join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  writeFileSync(join(kok, 'tools', 'sevk', 'sevk.sh'), '#!/bin/bash\n');
  for (const k of SABIT_KOLTUKLAR) writeFileSync(join(kok, '.claude', 'agents', k), '---\nname: x\n---\n');
  if (kurulumTamam) writeFileSync(join(kok, '.kurulum-tamam'), 'kuruldu\n');
  return kok;
}
const yaz = (kok, yol) => spawnSync('bash', [KANCA], {
  input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: join(kok, yol), content: 'x' } }),
  encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
});

test('kurulum penceresi: kadro alt-ajan dosyası YAZILABİLİR', () => {
  const r = yaz(kancaKurulum(), '.claude/agents/uygulayici.md');
  assert.equal(r.status, 0, `kadro koltuğu yazımı engellendi (GENESIS G3.3e'yi uygulayamaz):\n${r.stderr}`);
});

test('kurulum penceresi: ŞABLONUN SABİT ÜÇ KOLTUĞU yazılamaz', () => {
  const kok = kancaKurulum();
  for (const k of SABIT_KOLTUKLAR) {
    const r = yaz(kok, '.claude/agents/' + k);
    assert.equal(r.status, 2, `sabit koltuk yazıma açık: ${k} — bağımsız gözün araç listesi kuran ajana bırakılamaz`);
    assert.match(r.stderr, /ENGEL/);
  }
});

test('kurulum penceresi: haber kanalı ayarı yazılabilir, sevk KODU yazılamaz', () => {
  const kok = kancaKurulum();
  assert.equal(yaz(kok, 'tools/sevk/kanal.conf').status, 0, 'kanal.conf yazımı engellendi (G5.0c uygulanamaz)');
  assert.equal(yaz(kok, 'tools/sevk/sevk.sh').status, 2, 'sevk KODU kurulum penceresinde yazıma açık — çekirdek delinmiş');
});

test('istisna YALNIZ kurulum penceresinde: kurulum bitince kadro alanı kapanır', () => {
  const kok = kancaKurulum({ kurulumTamam: true });
  assert.equal(yaz(kok, '.claude/agents/uygulayici.md').status, 2,
    'kurulu projede alt-ajan dosyası yazıma açık — .claude/ [SERT] güvencesi delinmiş');
  assert.equal(yaz(kok, 'tools/sevk/kanal.conf').status, 2,
    'kurulu projede kanal.conf yazıma açık — tools/sevk [SERT] güvencesi delinmiş');
});

test('sabit koltuk listesi diskteki gerçekle EŞ (yeni koltuk eklenip listeye yazılmazsa KIRMIZI)', () => {
  const diskte = readdirSync(join(KOK_REPO, '.claude', 'agents')).filter((f) => f.endsWith('.md')).sort();
  assert.deepEqual(diskte, [...SABIT_KOLTUKLAR].sort(),
    'şablonun sabit koltukları ile file-guard/test listesi ayrışmış — yeni koltuk kuran ajana açık kalır');
  const k = readFileSync(KANCA, 'utf8');
  for (const s of SABIT_KOLTUKLAR) {
    assert.ok(k.includes('"' + s.replace('.md', '') + '"'), `file-guard SABIT_KOLTUKLAR listesinde yok: ${s}`);
  }
});

// ══ (c) KAPI — çekilme kapısı yoklukları KIRMIZI basıyor mu ═══════════════════════════════

const ROLLER = [
  { slug: 'koordinator', mod: 'tam', arac: 'Read, Grep, Glob, Edit, Write, Bash' },
  { slug: 'disgoz', mod: 'yazamaz', arac: 'Read, Grep, Glob' },
];

// DÖRT GÖVDE FARKLI olmak zorunda (kalıp-dolgu freni). İlk yazımda dördüne de aynı jenerik
// cümle yazılıyordu ve kapı HAZIR diyordu — yani fixture, profilin sahiple hiç konuşulmadığı bir
// dünyayı "tam kurulum" diye modelliyordu. Fren yazıldığı gün kendi fixture'ını yakaladı.
const KARAR_GOVDE = [
  '- Kahve dükkânının günlük nakit akışını ve hangi ürünün kaç sattığını yalnız ben bilirim.',
  '- Kodun nasıl yazıldığı, dosya adları ve karar numaraları beni ilgilendirmiyor; sorulmasın.',
  '- Fiyat değişikliği ve müşteriye görünen her yazı benim kararım; teknik sıralama değil.',
  '- Soruları tek tek getir, önerini de yaz; uzun döküm gönderirsen kaçırıyorum.',
];
function karrarAlaniMetni() {
  let m = kuruluSim(readFileSync(join(GEN, 'KARAR_ALANI_KALIBI.md'), 'utf8'), { '«SAHİP»': 'Deneme' });
  let i = 0;
  m = m.replace(/«[^»]+»/gs, () => KARAR_GOVDE[i++ % KARAR_GOVDE.length]);
  assert.ok(!m.includes('«'), 'karar alanı fixture\'ında doldurulmamış alan kaldı');
  return m;
}

function fixture(bozma = () => {}) {
  const kok = mkdtempSync(join(tmpdir(), 'oto-kapi-'));
  cpSync(GEN, join(kok, '00_genesis'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'karar-alani.sh'), join(kok, 'tools', 'sevk', 'karar-alani.sh'));
  for (const r of ROLLER) {
    mkdirSync(join(kok, '03_roller', r.slug), { recursive: true });
    writeFileSync(join(kok, '03_roller', r.slug, 'ROL.md'), `# ROL\nMod: **${r.mod}**.\n`);
    writeFileSync(join(kok, '.claude', 'agents', r.slug + '.md'),
      ajanSim({ slug: r.slug, mod: r.mod, arac: r.arac }));
  }
  writeFileSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'),
    kuruluSim(readFileSync(join(GEN, 'OTONOM_DONEM_KALIBI.md'), 'utf8'), { '«SAHİP»': 'Deneme' }));
  writeFileSync(join(kok, '02_kanon', 'KARAR_ALANI.md'), karrarAlaniMetni());
  writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'),
    readFileSync(join(GEN, 'GENESIS_DURUM.md'), 'utf8') + '\nKarar alanı teyidi: Deneme · 2026-07-30\n');
  bozma(kok);
  return kok;
}
const kapi = (kok) => spawnSync('bash', [DENETIM, kok], { encoding: 'utf8' });

test('NEGATİF: tam fixture → 7c/7d kalemleri yeşil, yanlış KIRMIZI yok', () => {
  const r = kapi(fixture());
  for (const bekle of [/geçti\s+· alt-ajan koltuğu: koordinator/,
                       /geçti\s+· alt-ajan koltuğu: disgoz \(yazamaz — araç listesi kalıbın ilan ettiği dize\)/,
                       /geçti\s+· otonom kipin kural evi yerinde/,
                       /geçti\s+· sahibin karar alanı HAZIR/]) {
    assert.match(r.stdout, bekle, `yanlış KIRMIZI beklenen satırda:\n${r.stdout}`);
  }
  assert.ok(!/KIRMIZI · (kadro rolünün|alt-ajan koltuğu|yazamaz rolün|02_kanon\/OTONOM_DONEM|sahibin karar)/.test(r.stdout),
    `tam fixture'da yanlış KIRMIZI:\n${r.stdout}`);
});

test('alt-ajan koltuğu eksikse KIRMIZI (sevk o rolün görevini sevk edemez)', () => {
  const r = kapi(fixture((k) => spawnSync('rm', ['-f', join(k, '.claude', 'agents', 'disgoz.md')])));
  assert.match(r.stdout, /KIRMIZI · kadro rolünün alt-ajan koltuğu yok: \.claude\/agents\/disgoz\.md/);
  assert.equal(r.status, 2);
});

test('name alanı slug\'la eşleşmezse KIRMIZI (dosya bulunur, çağrı hedefi bulunmaz)', () => {
  const r = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    ajanSim({ slug: 'baskabirsey', mod: 'yazamaz' }))));
  assert.match(r.stdout, /KIRMIZI · alt-ajan koltuğunun name alanı slug'la eşleşmiyor/);
});

test('yazamaz rolün koltuğunda yazma aracı varsa KIRMIZI (bu paketin en kritik kalemi)', () => {
  const r = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    ajanSim({ slug: 'disgoz', mod: 'yazamaz', arac: 'Read, Grep, Glob, Write' }))));
  assert.match(r.stdout, /KIRMIZI · yazamaz rolün alt-ajan koltuğunda araç listesi kalıbın dizesi DEĞİL/);
});

test('araç listesi kalıbın dizesinden SAPARSA KIRMIZI (alt-dize taraması değil, birebir eşleme)', () => {
  // Eski kalem regex ile "yazma aracı var mı" arıyordu: TodoWrite/BashOutput yanlış KIRMIZI,
  // Task/Agent ise hiç kapsanmıyordu. Kalıp iki dizeyi BİREBİR ilan ediyor; kapı onu eşler.
  const r = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'koordinator.md'),
    ajanSim({ slug: 'koordinator', mod: 'tam', arac: 'Read, Grep, Glob, Edit, Write, Bash, WebFetch' }))));
  assert.match(r.stdout, /KIRMIZI · alt-ajan koltuğunun araç listesi kalıbın dizesi DEĞİL/);
});

test('kapıdaki iki araç dizesi kalıbın ilanıyla EŞ (iki dosyada bilinçli edim)', () => {
  const d = readFileSync(DENETIM, 'utf8');
  const k = AJAN_KALIP();
  for (const dize of ['Read, Grep, Glob', 'Read, Grep, Glob, Edit, Write, Bash']) {
    assert.ok(d.includes('"' + dize + '"'), `kapıda eksik araç dizesi: ${dize}`);
    assert.ok(k.includes(dize), `kalıpta eksik araç dizesi: ${dize}`);
  }
});

test('ROL.md modu sözlükte değilse/yoksa KIRMIZI — fail-closed (eskiden sessiz geçti)', () => {
  const yok = kapi(fixture((k) => writeFileSync(join(k, '03_roller', 'disgoz', 'ROL.md'), '# ROL\nSınır: yok.\n')));
  assert.match(yok.stdout, /KIRMIZI · rolün araç-profili okunamadı: 03_roller\/disgoz\/ROL\.md/);
  const sapmis = kapi(fixture((k) => writeFileSync(join(k, '03_roller', 'disgoz', 'ROL.md'), '# ROL\nMod: **yazar**.\n')));
  assert.match(sapmis.stdout, /KIRMIZI · rolün araç-profili okunamadı/);
});

test('dış gözün modu yazamaz DEĞİLSE KIRMIZI (tarifte sabit olan tek moda çapa)', () => {
  const r = kapi(fixture((k) => {
    writeFileSync(join(k, '03_roller', 'disgoz', 'ROL.md'), '# ROL\nMod: **tam**.\n');
    writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
      ajanSim({ slug: 'disgoz', mod: 'tam', arac: 'Read, Grep, Glob, Edit, Write, Bash' }));
  }));
  assert.match(r.stdout, /KIRMIZI · dış göz koltuğunun modu 'yazamaz' değil/);
});

test('koltuğun ilk satırı --- değilse KIRMIZI (kalıp-yorumu artığı)', () => {
  // Tepede tek boş satır bile frontmatter'ı ayrıştırılamaz yapar; eski kalemler name/tools'u
  // dosyanın HER YERİNDE arıyordu ve kapı YEŞİL basıyordu.
  const bosluk = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    '\n' + ajanSim({ slug: 'disgoz', mod: 'yazamaz' }))));
  assert.match(bosluk.stdout, /KIRMIZI · alt-ajan koltuğunun ilk satırı '---' değil/);
  const artik = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    '<!-- kalıp yorumu artığı\n     son satır. -->\n' + ajanSim({ slug: 'disgoz', mod: 'yazamaz' }))));
  assert.match(artik.stdout, /KIRMIZI · alt-ajan koltuğunun ilk satırı '---' değil/);
});

test('gövdeye kaymış tools satırı kapıyı YANILTMIYOR (yalnız frontmatter okunur)', () => {
  const r = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    '---\nname: disgoz\n---\ngövde\ntools: Read, Grep, Glob\n')));
  assert.match(r.stdout, /KIRMIZI · alt-ajan koltuğunda araç listesi yok/);
});

test('kadroda karşılığı olmayan FAZLA koltuk KIRMIZI (ters yönlü sayım)', () => {
  const fazla = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'hayalet.md'),
    ajanSim({ slug: 'hayalet', mod: 'tam', arac: 'Read, Grep, Glob, Edit, Write, Bash' }))));
  assert.match(fazla.stdout, /KIRMIZI · kadroda karşılığı olmayan alt-ajan koltuğu var:.*hayalet\.md/);
  const altDizin = kapi(fixture((k) => {
    mkdirSync(join(k, '.claude', 'agents', 'alt'), { recursive: true });
    writeFileSync(join(k, '.claude', 'agents', 'alt', 'disgoz.md'), ajanSim({ slug: 'disgoz' }));
  }));
  assert.match(altDizin.stdout, /KIRMIZI · kadroda karşılığı olmayan alt-ajan koltuğu var:.*alt\/disgoz\.md/);
});

test('kadro slug\'ı şablonun sabit koltuğuyla çakışırsa KIRMIZI (ad rezervasyonu)', () => {
  const r = kapi(fixture((k) => {
    mkdirSync(join(k, '03_roller', 'dogrulayici'), { recursive: true });
    writeFileSync(join(k, '03_roller', 'dogrulayici', 'ROL.md'), '# ROL\nMod: **tam**.\n');
  }));
  assert.match(r.stdout, /KIRMIZI · kadro slug'ı şablonun SABİT koltuğuyla çakışıyor/);
});

test('karar alanı teyit damgası yoksa KIRMIZI (provenans çapası)', () => {
  const r = kapi(fixture((k) => writeFileSync(join(k, '00_genesis', 'GENESIS_DURUM.md'),
    readFileSync(join(GEN, 'GENESIS_DURUM.md'), 'utf8'))));   // damga satırı YOK
  assert.match(r.stdout, /KIRMIZI · karar alanı teyit damgası yok/);
});

test('ŞABLONUN kendi GENESIS_DURUM.md\'si damga kontrolünü GEÇMEZ (yer-tutucu sahte-yeşil yapmıyor)', () => {
  const gd = readFileSync(join(GEN, 'GENESIS_DURUM.md'), 'utf8');
  assert.ok(gd.includes('## Karar alanı teyidi'), 'damganın evi şablonda yok');
  assert.ok(!/^Karar alanı teyidi:[ \t]*[^ \t]/m.test(gd),
    'şablonun yer-tutucusu satır başında damga dizesiyle başlıyor — şablon kendi kapısını sahte-yeşile çeviriyor');
});

test('karar alanı: dört gövde AYNIYSA kanal kapalı (kalıp-dolgu freni)', () => {
  const r = kapi(fixture((k) => {
    const s = kuruluSim(readFileSync(join(GEN, 'KARAR_ALANI_KALIBI.md'), 'utf8'), { '«SAHİP»': 'Deneme' });
    writeFileSync(join(k, '02_kanon', 'KARAR_ALANI.md'),
      s.replace(/«[^»]+»/gs, 'Sahibin kendi hayatından gelen tercihler burada yaşar, yeterince uzun bir cümle.'));
  }));
  assert.match(r.stdout, /iki başlığın gövdesi BİREBİR aynı/);
});

test('tools satırı yoksa KIRMIZI', () => {
  const r = kapi(fixture((k) => writeFileSync(join(k, '.claude', 'agents', 'disgoz.md'),
    '---\nname: disgoz\n---\ngövde\n')));
  assert.match(r.stdout, /KIRMIZI · alt-ajan koltuğunda araç listesi yok/);
});

test('03_roller boşsa "ölçemedim" KIRMIZI\'sı basılır (yokluk körlüğü yok)', () => {
  const r = kapi(fixture((k) => spawnSync('rm', ['-rf', join(k, '03_roller')])));
  assert.match(r.stdout, /KIRMIZI · kadro sayılamadı/);
});

test('OTONOM_DONEM.md yoksa KIRMIZI', () => {
  const r = kapi(fixture((k) => spawnSync('rm', ['-f', join(k, '02_kanon', 'OTONOM_DONEM.md')])));
  assert.match(r.stdout, /KIRMIZI · 02_kanon\/OTONOM_DONEM\.md yok/);
});

test('OTONOM_DONEM.md doldurulmamış alan ya da kalıp-yorumu taşıyorsa KIRMIZI', () => {
  const a = kapi(fixture((k) => writeFileSync(join(k, '02_kanon', 'OTONOM_DONEM.md'),
    readFileSync(join(GEN, 'OTONOM_DONEM_KALIBI.md'), 'utf8'))));  // ham kalıp: hem «alan» hem yorum
  assert.match(a.stdout, /KIRMIZI · 02_kanon\/OTONOM_DONEM\.md doldurulmamış «alan» taşıyor/);
  assert.match(a.stdout, /KIRMIZI · 02_kanon\/OTONOM_DONEM\.md kalıp-yorumunu hâlâ taşıyor/);
});

test('OTONOM_DONEM.md taşıyıcı bölümü eksikse KIRMIZI (yarım kopya)', () => {
  const r = kapi(fixture((k) => {
    const y = join(k, '02_kanon', 'OTONOM_DONEM.md');
    writeFileSync(y, readFileSync(y, 'utf8').replace('Dönüş zarfı', 'Bir şey'));
  }));
  assert.match(r.stdout, /KIRMIZI · 02_kanon\/OTONOM_DONEM\.md taşıyıcı bölümü eksik: Dönüş zarfı/);
});

test('karar alanı yoksa/profili boşsa KIRMIZI — denetim DEVREDİLMİŞ, kopyalanmamış', () => {
  const yok = kapi(fixture((k) => spawnSync('rm', ['-f', join(k, '02_kanon', 'KARAR_ALANI.md')])));
  assert.match(yok.stdout, /KIRMIZI · sahibin karar alanı hazır değil: HAZIR DEĞİL · 02_kanon\/KARAR_ALANI\.md yok/);
  // Delegasyonun kanıtı: hüküm metni karar-alani.sh'ın kendi cümlesidir (ikinci kopya yok)
  const bos = kapi(fixture((k) => writeFileSync(join(k, '02_kanon', 'KARAR_ALANI.md'),
    kuruluSim(readFileSync(join(GEN, 'KARAR_ALANI_KALIBI.md'), 'utf8'), { '«SAHİP»': 'Deneme' }))));
  assert.match(bos.stdout, /KIRMIZI · sahibin karar alanı hazır değil: HAZIR DEĞİL · sahip profili doldurulmamış/);
});

test('betik yoksa "ölçülemedi" KIRMIZI\'sı (fail-closed, sessiz yeşil yok)', () => {
  const r = kapi(fixture((k) => spawnSync('rm', ['-f', join(k, 'tools', 'sevk', 'karar-alani.sh')])));
  assert.match(r.stdout, /KIRMIZI · tools\/sevk\/karar-alani\.sh yok\/okunamıyor/);
});
