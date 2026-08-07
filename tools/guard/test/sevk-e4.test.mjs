// sevk-e4.test.mjs — E4: tetik (/donem töreni) · sevk (Stop kancası) · devir-şema kapısı ·
// karne sözleşmesi (K2) · kurulum kapısı.
// Sözleşme: docs/superpowers/plans/2026-07-28-e4-sevk-tetik-kurulum-tasarisi.md
//   §2 tetik · §3 sevk turu · §5 karne şartı · §6 kurulum kapısı · §7 devir kapısı.
// Hepsi dönem-AÇIK şartının ARDINDADIR: el-sürüşlü günlük döngüde bu kapılar yok hükmündedir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const BETIK = (kok, ad) => join(kok, 'tools', 'sevk', ad);
const GUNLUK = (kok) => join(kok, '00_pano', 'zarf-gunlugu.jsonl');
const GOSTERGE = (kok) => join(kok, 'tools', 'sevk', '.donem-acik');

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
function kararAlaniMetni({ profil = true } = {}) {
  let s = KARAR_KALIP.split('\n');
  const yorumSonu = s.findIndex((l) => l.trimEnd().endsWith('-->'));
  s = s.slice(yorumSonu + 1).join('\n').replaceAll('«SAHİP»', 'Deneme');
  if (!profil) return s;
  let i = 0;
  return s.replace(/«[^»]*»/gs, () => KARAR_GOVDE[i++ % KARAR_GOVDE.length]);
}

const KUTU_ADI = 'KT-900-e4';
function kutuMetni({ gorevler = [
  { id: 'G-01', is: 'ilk iş', sahip: 'uretici', durum: 'açık', kanit: 'test: t.mjs' },
  { id: 'G-02', is: 'ikinci iş', sahip: 'uretici', durum: 'açık', kanit: 'test: t.mjs' },
], onkosul = { 'G-01': 'yok', 'G-02': 'G-01' }, risk = {}, butce = '3', durus = true, riskBloku = true, izin = 'yok',
   muhur = 'Deneme Sahip · 2026-08-01' } = {}) {
  // AÇILIŞ MÜHRÜ (K3, 2026-08-07): dönemin ön koşulu; fixture mühürlü doğar ki mühür
  // bozmalarının ölçüsü olsun. `muhur: null` satırı hiç doğurmaz.
  const l = ['# ' + KUTU_ADI + ' — tatbikat kutusu', ''];
  if (muhur !== null) l.push('**Açılış mührü:** ' + muhur, '');
  l.push('## Görevler', '| Görev | İş | Sahip | Durum | Kanıt |', '|---|---|---|---|---|');
  for (const k of gorevler) l.push(`| ${k.id} | ${k.is} | ${k.sahip} | ${k.durum} | ${k.kanit} |`);
  if (durus) {
    l.push('', '## Duruş sözleşmesi',
      'BİTİŞ HÂLİ: ekranda iki satır görünür',
      'KANIT:      npm test yeşil (tam özet satırı)',
      'KISIT:      02_kanon/golden/ dokunulmaz; altın dosyalara gerçek veri girmez',
      `BÜTÇE:      dönem başına en çok ${butce} ÜRETİM çağrısı · toplam 12 dönem`,
      `İZİN:       ${izin}`);
  }
  if (riskBloku) {
    l.push('', '## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)');
    for (const k of gorevler) {
      if (!(k.id in onkosul)) continue;
      l.push(`${k.id}: onkosul=${onkosul[k.id]} · risk=${risk[k.id] || 'düşük'} — tek satır gerekçe`);
    }
  }
  return l.join('\n') + '\n';
}

function kurulum({ donem = null, kadro = ['uretici', 'dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi', 'disgoz'],
                   disgoz = true, profil = true, kurulumTamam = true, kuralEvi = true,
                   kutu = kutuMetni() } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'e4-test-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '01_kutular', KUTU_ADI), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  for (const b of SEVK_BETIKLERI) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  // cevap-sozlugu.txt VERİ dosyasıdır ve catal-kuyruk.sh onu FAIL-CLOSED arar: kurulu bir
  // projede her zaman vardır, o yüzden simülasyon da onu taşımak zorunda (F1-5g).
  try { copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'cevap-sozlugu.txt'), join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt')); } catch {}
  // gorev-durumlari.txt VERI dosyasidir ve sevk onu FAIL-CLOSED arar (K5 tek evi; kume
  // bekci ile ORTAK): kurulu projede her zaman vardir, simulasyon da tasimak zorunda.
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'bekci', 'gorev-durumlari.txt'),
               join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'));
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'gercek-veri-isaretleri.txt'), join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  for (const a of kadro) writeFileSync(join(kok, '.claude', 'agents', a + '.md'), '---\nname: ' + a + '\ntools: Read\n---\n# test ajanı\n');
  mkdirSync(join(kok, '03_roller', 'uretici'), { recursive: true });
  writeFileSync(join(kok, '03_roller', 'uretici', 'ROL.md'), '# ROL — Üretici\n');
  if (disgoz) {
    mkdirSync(join(kok, '03_roller', 'disgoz'), { recursive: true });
    writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), '# DIŞ GÖZ — brifing\n');
  }
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  writeFileSync(join(kok, '01_kutular', KUTU_ADI, 'KUTU.md'), kutu);
  writeFileSync(join(kok, '02_kanon', 'KARAR_ALANI.md'), kararAlaniMetni({ profil }));
  if (kuralEvi) writeFileSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'), '# OTONOM DÖNEM\n\ntatbikat kopyası\n');
  if (kurulumTamam) writeFileSync(join(kok, '.kurulum-tamam'), '');
  if (donem) writeFileSync(GOSTERGE(kok), donem === true ? `DONEM-E4\t${KUTU_ADI}\tyapim\ttatbikat\ndamga\t${new Date().toISOString()}\n` : donem);
  return kok;
}

const kos = (kok, ad, args = [], girdi = undefined) =>
  spawnSync('bash', [BETIK(kok, ad), ...args], {
    encoding: 'utf8', input: girdi, env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
const sevk = (kok, { sha = false } = {}) =>
  kos(kok, 'sevk.sh', [], JSON.stringify({ session_id: 'S1', hook_event_name: 'Stop', stop_hook_active: sha }));
const devir = (kok, girdi) => kos(kok, 'devir-kapisi.sh', [], JSON.stringify(girdi));
const kapi = (kok, girdi) => kos(kok, 'zarf-bicim-kapisi.sh', [], JSON.stringify(girdi));
const gunluk = (kok) =>
  existsSync(GUNLUK(kok)) ? readFileSync(GUNLUK(kok), 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];
const ekle = (kok, o) => appendFileSync(GUNLUK(kok), JSON.stringify({ surum: 1, ts: '2026-07-28T10:00:00Z', donem: 'DONEM-E4', ...o }) + '\n');
// Makine satırı sözleşmesi (tools/bekci/README.md §1-§2): sevk kararı `BEKCI v1 …` satırından
// ve çıkış kodundan okur — kelime taraması yok. KIRMIZI'yı koruma-hattından basar (kilit=0;
// KUTU tavan KİLİDİ kanonen dönemi DURDURMAZ, ayrı testte sınanır).
const bekciKur = (kok, isik) => {
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  const govde = isik === 'KIRMIZI'
    ? "#!/bin/bash\nprintf 'DURDURAN [koruma-hattı] kablo-denetimi: test bozması\\n'\nprintf 'BEKCI v1 durduran=1 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 1\n"
    : "#!/bin/bash\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n";
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), govde);
  chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
};

// Standart 6 alanlı zarf + ekler (OTONOM_DONEM §4 biçimi)
function zarf({ biten = 'G-01 — iş bitti · kanıt: 00_pano/PANO.md:1', catal = 'yok', ek = '' } = {}) {
  const l = [`BİTEN: ${biten}`, `ÇATAL: ${catal}`,
             'DEĞERLENDİRMEDİKLERİM: yok', 'SIRADAKİ: kapalı', 'TÜRETME-İZİ: yok', 'GERİ-ÇEKİLEN: yok'];
  return l.join('\n') + (ek ? '\n' + ek : '') + '\n';
}
const karneZarfi = ({ ajan = 'dogrulayici', gorevAd = 'G-01', hukum = 'YEŞİL', maddeler = 'kanıt=DOĞRU çapa=DOĞRU' } = {}) => ({
  agent_type: ajan,
  last_assistant_message: zarf({
    biten: 'G-01 — karne verildi · kanıt: 00_pano/PANO.md:1',
    ek: [`KARNE-GOREV: ${gorevAd}`, `HÜKÜM: ${hukum}`, `MADDELER: ${maddeler}`].join('\n'),
  }),
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 1 · /donem töreni (K3 tetiği) — donem-ac.sh
// ══════════════════════════════════════════════════════════════════════════════════════════

test('donem-ac: temiz kurulumda DÖNEM AÇIK — gösterge dört alan + bağımsız donem-acilis kaydı', () => {
  const kok = kurulum();
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DÖNEM AÇIK/);
  const satir = readFileSync(GOSTERGE(kok), 'utf8').split('\n')[0].split('\t');
  // KİP ALANI KALKTI (F1-5e): gösterge DÖRT alandır — kimlik · kutu · evre · sınıf.
  assert.equal(satir.length, 4, 'gösterge dört alan taşımalı: ' + satir.join('|'));
  assert.equal(satir[1], KUTU_ADI);
  assert.equal(satir[2], 'yapim');
  assert.equal(satir[3], 'tatbikat');
  const a = gunluk(kok).filter((j) => j.tip === 'donem-acilis');
  assert.equal(a.length, 1, 'açılış kaydı sevkten bağımsız düşmeli (E5 watchdog çapası)');
  assert.match(String(a[0].izin_zemini), /--allowedTools/, 'izin zemini kayda damgalanmalı');
});

test('donem-ac: kapılanma eksikse dönem HİÇ açılmaz (kalkansız motor yok)', () => {
  // Çapalar F1-5h ile değişti: prova fişleri yerine BU kurulumda ölçülebilen üç şey —
  // dış göz klasörü · dış gözün alt-ajan koltuğu · otonom kural evi.
  for (const eksik of [{ disgoz: false }, { kadro: ['uretici', 'dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi'] }, { kuralEvi: false }]) {
    const kok = kurulum(eksik);
    const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
    assert.equal(r.status, 1, 'eksik kalkanda tören geçmemeli');
    assert.match(r.stderr, /kapılanma eksik/);
    assert.ok(!existsSync(GOSTERGE(kok)), 'gösterge yazılmamalı');
  }
});

// ── AÇILIŞ MÜHRÜ (K3 / U9, 2026-08-07) ───────────────────────────────────────────────────
// DOĞUŞ: EL_KITABI "mühürsüz eşik = süreç ihlali" der, G5 töreni "**Açılış mührü:** satırına
// ad + tarih damgala" der — ama o satır HİÇBİR KALIPTA YOKTU ve mührü okuyan tek bir betik
// bile yoktu (`git grep -l "Açılış mührü" -- tools/` → 0). Yani sahibin mührü olmadan dönem
// açılıyordu. Aşağıdaki dört bozma, kapının ölmediğinin kanıtıdır; sonuncusu ters yönü tutar.

test('donem-ac: MÜHÜRSÜZ kutuya dönem AÇILMAZ (mühür bekliyor)', () => {
  const kok = kurulum({ kutu: kutuMetni({ muhur: 'bekliyor' }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1, 'mühürsüz kutuda tören geçmemeli');
  assert.match(r.stderr, /kutu MÜHÜRSÜZ/);
  assert.ok(!existsSync(GOSTERGE(kok)), 'gösterge yazılmamalı');
});

test('donem-ac: mühür SATIRI YOKSA da açılmaz — ölçemedim ≠ mühürlü (fail-closed)', () => {
  // En sinsi kip: satırı silmek. Kapı "satır dolu mu" diye sorsaydı, silmek onu susturur ve
  // mühürsüz kutu sessizce açılırdı — tam da 2026-08-07 öncesinin hâli.
  const kok = kurulum({ kutu: kutuMetni({ muhur: null }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Açılış mührü.*satırı yok/);
  assert.ok(!existsSync(GOSTERGE(kok)));
});

test('donem-ac: doldurulmamış yer tutucu mühür sayılmaz', () => {
  const kok = kurulum({ kutu: kutuMetni({ muhur: '«SAHİP» · «TARİH»' }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /kutu MÜHÜRSÜZ/);
});

test('donem-ac: TARİHSİZ damga mühür sayılmaz (biçim ölçülür, doluluk değil)', () => {
  // Biçim ölçülmezse kapı fiilen "satır dolu mu"ya iner: 'evet' yazan bir satır mühür olurdu.
  const kok = kurulum({ kutu: kutuMetni({ muhur: 'Batu onayladi' }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /tarihi yok/);
  assert.ok(!existsSync(GOSTERGE(kok)));
});

test('donem-ac: TERS YÖN — mühürlü kutu açılır (aşırı sıkı kapı da kusurdur)', () => {
  const kok = kurulum({ kutu: kutuMetni({ muhur: 'Batu · 2026-08-07' }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /DÖNEM AÇIK/);
});

test('donem-ac: mühür ön koşuldur — mühürsüz kutuda İZİN satırı doğru olsa da açılmaz', () => {
  // Sıra hükmü: mühürsüz bir kutunun izin satırının doğru olması hiçbir şey ifade etmez.
  const kok = kurulum({ kutu: kutuMetni({ muhur: 'bekliyor', izin: 'kutu-ciktilari' }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /kutu MÜHÜRSÜZ/);
});

test('donem-ac: sahibin karar alanı boşsa dönem açılmaz (D-25 ③ ön koşulu)', () => {
  const kok = kurulum({ profil: false });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /soru kanalı kapalı/);
  assert.ok(!existsSync(GOSTERGE(kok)));
});

test('donem-ac: geçersiz kutu / tür / kip → red (uydurma ada damga basılmaz)', () => {
  const kok = kurulum();
  for (const arg of [['KT-YOK'], [KUTU_ADI, 'uydurma'], [KUTU_ADI, 'yapim', 'yarimsinif']]) {
    const r = kos(kok, 'donem-ac.sh', arg);
    assert.equal(r.status, 1, 'geçersiz argüman geçti: ' + arg.join(' '));
    assert.ok(!existsSync(GOSTERGE(kok)));
  }
});

test('donem-ac: kurulum işareti yoksa açılmaz; açık dönem varken ikincisi açılmaz', () => {
  const yok = kurulum({ kurulumTamam: false });
  assert.match(kos(yok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']).stderr, /kurulum işareti yok/);

  const kok = kurulum();
  assert.equal(kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']).status, 0);
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /zaten açık bir dönem var/);
});

test('donem-ac kapat: gösterge silinir + donem-kapanis kaydı düşer', () => {
  const kok = kurulum();
  kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  const r = kos(kok, 'donem-ac.sh', ['kapat']);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!existsSync(GOSTERGE(kok)));
  assert.ok(gunluk(kok).some((j) => j.tip === 'donem-kapanis'), 'kapanış kaydı yok');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 2 · sevk.sh — Stop kancası
// ══════════════════════════════════════════════════════════════════════════════════════════

test('sevk: dönem yokken TAM sessizlik (el-sürüşlü oturum etkilenmez)', () => {
  const kok = kurulum();
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
  assert.equal(r.stderr.trim(), '');
  assert.equal(gunluk(kok).length, 0);
});

test('sevk: açık görev varsa exit 2 + işaretçi şemalı talimat + sevk-karar/nabiz kaydı', () => {
  const kok = kurulum({ donem: true });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'durmayı engellemeli: ' + r.stdout);
  assert.match(r.stderr, /^SEVK · DONEM-E4 · tur 1\//m);
  assert.match(r.stderr, /subagent_type: uretici/);
  assert.match(r.stderr, /^gorev: G-01$/m);
  assert.match(r.stderr, /^kutu: 01_kutular\/KT-900-e4\/KUTU\.md$/m);
  const g = gunluk(kok);
  const sk = g.find((j) => j.tip === 'sevk-karar');
  assert.ok(sk, 'sevk-karar kaydı düşmeli');
  assert.equal(sk.gorev, 'G-01');
  assert.equal(sk.rol, 'uretici');
  assert.ok(g.some((j) => j.tip === 'nabiz'), 'nabız damgası düşmeli');
});

test('sevk: gösterge bozuk / kapılanma eksik → dönem KAPANIR (fail-closed, sessiz sürmez)', () => {
  const bozuk = kurulum({ donem: '\tKT-900-e4\tyapim\ttatbikat\n' });
  const r1 = sevk(bozuk);
  assert.equal(r1.status, 0);
  assert.match(r1.stdout, /DÖNEM KAPANDI/);
  assert.ok(!existsSync(GOSTERGE(bozuk)));

  const kalkansiz = kurulum({ donem: true, kuralEvi: false });
  const r2 = sevk(kalkansiz);
  assert.match(r2.stdout, /kapılanma eksik/);
  assert.ok(!existsSync(GOSTERGE(kalkansiz)));
});

test('sevk: DUR işareti duran kapıdır (2. hat)', () => {
  const kok = kurulum({ donem: true });
  writeFileSync(join(kok, 'tools', 'sevk', '.dur'), 'sahip telefondan durdurdu\n');
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /DUR işareti var/);
  assert.match(r.stdout, /sahip telefondan durdurdu/);
});

test('sevk: günlükte bozuk satır → duran kapı (bütün gözler aynı anda körelir)', () => {
  const kok = kurulum({ donem: true });
  appendFileSync(GUNLUK(kok), '{yarim satir\n');
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /zarf gunlugu bozuk/);
});

test('sevk/karne şartı: kapalı ama karnesiz görev → doğrulayıcı talimatı (görev kapanmaz)', () => {
  const kok = kurulum({
    donem: true,
    kutu: kutuMetni({ gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' }], onkosul: { 'G-01': 'yok' } }),
  });
  bekciKur(kok, 'YEŞİL');
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  const r = sevk(kok);
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stderr, /subagent_type: dogrulayici/);
  assert.match(r.stderr, /karne sarti: G-01/);
  const sk = gunluk(kok).find((j) => j.tip === 'sevk-karar');
  assert.equal(sk.is_tipi, 'dogrulama');
});

test('sevk/karne şartı: taze YEŞİL karne görevi kapatır; KIRMIZI karne duran kapıdır', () => {
  const tek = { gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' }], onkosul: { 'G-01': 'yok' } };
  const yesil = kurulum({ donem: true, kutu: kutuMetni(tek) });
  bekciKur(yesil, 'YEŞİL');
  ekle(yesil, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(yesil, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r1 = sevk(yesil);
  // F1-5a: açık üretim görevi kalmayınca dönem KAPANMAZ — evre `kapanis` olur ve sevk kapanış
  // evresinin ilk gözünü (dış göz brifingi) açtırır. "Kapanış için ikinci komut yaz" devri bitti.
  assert.equal(r1.status, 2, 'kapanış evresi sevk üretmeli: ' + r1.stdout);
  assert.match(r1.stderr, /subagent_type: disgoz/);
  assert.equal(readFileSync(GOSTERGE(yesil), 'utf8').split('\n')[0].split('\t')[2], 'kapanis',
    'göstergenin evre alanı yerinde değişmeli (kimlik ve damga korunur)');
  const eg = gunluk(yesil).find((j) => j.tip === 'evre-gecis');
  assert.ok(eg && eg.hedef === 'kapanis', 'evre geçişi günlüğe düşmeli');

  const kirmizi = kurulum({ donem: true, kutu: kutuMetni(tek) });
  bekciKur(kirmizi, 'YEŞİL');
  ekle(kirmizi, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kirmizi, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'KIRMIZI', maddeler: 'x=YANLIŞ' });
  const r2 = sevk(kirmizi);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /karnesi KIRMIZI/);
});

// ── K5 · `mühür-bekliyor` cinsi: sevk ile bekçi AYNI kümeden okur ─────────────────────────
// DOĞUŞ (U2 · U3, ölçüldü 2026-08-08): `acikVar` satırı `mühür-bekliyor`u AÇIK üretim görevi
// sayıyordu. Sonucu, yalnız mühür bekleyen görevi kalan kutunun kapanış evresine HİÇ
// girmemesiydi: sevk "açık görev var ama hiçbiri açılamıyor" deyip dönemi DURAN KAPIda
// kapatıyor, aynı anda bekçi o kutuyu kapanışta sayıp kapanış kilidini basıyordu. Aynı görev,
// iki makinede iki hâl — ve "üretimden mühre tek tuş" vaadi tam da vaadin işlemesi gereken
// kolda mekanik olarak kırık. Ayrım artık TEK EVDE: `tools/bekci/gorev-durumlari.txt`.
// Bekçi ayağı ve onun bozmaları: tools/bekci/test/gorev-durum-tek-ev.test.mjs.
const DURUM_EVI = (kok) => join(kok, 'tools', 'bekci', 'gorev-durumlari.txt');
const muhurBekleyenDonem = () => {
  const kok = kurulum({ donem: true, kutu: kutuMetni({
    gorevler: [
      { id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' },
      { id: 'G-02', is: 'sahip mührünü bekleyen iş', sahip: 'uretici', durum: 'mühür-bekliyor', kanit: '00_pano/PANO.md' },
    ],
    onkosul: { 'G-01': 'yok', 'G-02': 'yok' },
  }) });
  bekciKur(kok, 'YEŞİL');
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  return kok;
};

test('K5: yalnız mühür bekleyen görev kalınca dönem KAPANIŞ evresine geçer (duran kapı DEĞİL)', () => {
  const kok = muhurBekleyenDonem();
  const r = sevk(kok);
  assert.equal(r.status, 2, 'duran kapı basıldı — üretimden mühre tek tuş bu kolda kırık: ' + r.stdout);
  assert.match(r.stderr, /subagent_type: disgoz/, 'kapanış evresinin ilk gözü açılmalı');
  assert.equal(readFileSync(GOSTERGE(kok), 'utf8').split('\n')[0].split('\t')[2], 'kapanis',
    'göstergenin evre alanı kapanis olmalı');
  assert.ok(!/muhur bekliyor/.test(r.stdout),
    'mühür bekleyen görev dönemi DURDURMAMALI (sahip mührü kapanış paketiyle birlikte gelir): ' + r.stdout);
});

test('K5: mühür bekleyen görev sahip yüzeyinde ADIYLA geçer (kırık vaat sessiz vaade dönmez)', () => {
  // Hasım turu bulgusu (kendi değişikliğimize): `mühür-bekliyor` artık üretimi durdurmuyor,
  // yani kutu onunla birlikte kapanışa gidiyor. Sahibe "kapanış denetimi YEŞİL, mühür sende"
  // deyip o görevin de mühür beklediğini SÖYLEMEMEK, kırık vaadi sessiz vaade çevirirdi.
  const kok = muhurBekleyenDonem();
  assert.equal(sevk(kok).status, 2, 'ön koşul: kapanış evresine geçilmeli');
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r = sevk(kok);
  assert.equal(r.status, 0, 'YEŞİL kapanış karnesi dönemi bitirmeli: ' + r.stdout);
  assert.match(r.stdout, /DÖNEM KAPANDI/);
  assert.match(r.stdout, /SENIN MUHRUNU bekliyor: G-02/,
    'mühür bekleyen görev üç blokta adıyla geçmeli: ' + r.stdout);
});

test('K5/BOZMA · sahip yüzeyindeki mühür cümlesi silinirse ad KAYBOLUR (cümle taşıyıcıdır)', () => {
  // Fixture'ın KENDİ sevk.sh kopyası bozulur; kaynak ağaca dokunulmaz (sabah-yüzeyi emsali).
  const kok = muhurBekleyenDonem();
  const yol = join(kok, 'tools', 'sevk', 'sevk.sh');
  const kaynak = readFileSync(yol, 'utf8');
  const bozuk = kaynak.replace(
    /\+ \(OZET\.muhur\.length \? "; " \+ OZET\.muhur\.length \+ " gorev SENIN MUHRUNU bekliyor: " \+ OZET\.muhur\.join\(" "\) : ""\);/,
    '+ "";');
  assert.notEqual(bozuk, kaynak, 'bozma çapası kaynakta bulunamadı — test bayatladı');
  writeFileSync(yol, bozuk);
  assert.equal(sevk(kok).status, 2);
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.ok(!/MUHRUNU bekliyor/.test(r.stdout),
    'bozma tutmadı — cümle silindiği hâlde ad hâlâ geçiyor, yani ölçtüğümüz şey bu cümle değil');
});

test('K5/BOZMA · tek evde mühür-bekliyor ÜRETİM tarafına alınırsa karar DURAN KAPIya döner', () => {
  // Tek evin yük taşıdığının kanıtı. Gömülü kopyası olan bir sevk burada kızarır: dosya
  // değişti, karar değişmedi demektir. Kaynak ağaca dokunulmaz — bozma fixture kopyasındadır.
  const kok = muhurBekleyenDonem();
  writeFileSync(DURUM_EVI(kok),
    readFileSync(DURUM_EVI(kok), 'utf8').replace('kapanista:mühür-bekliyor', 'uretimde:mühür-bekliyor'));
  const r = sevk(kok);
  assert.equal(r.status, 0, 'ayrım tek evden okunmuyor (dosya değişti, karar değişmedi): ' + r.stdout);
  assert.match(r.stdout, /muhur bekliyor \(sahip\)/);
});

test('K5/BOZMA · tek ev YOKSA sevk fail-closed durur — sözlük evsiz kalamaz', () => {
  const kok = muhurBekleyenDonem();
  rmSync(DURUM_EVI(kok));
  const r = sevk(kok);
  assert.equal(r.status, 0, 'evsiz kümeyle dönem sürmemeli');
  assert.match(r.stdout, /gorev durum sozlugu yok/);
});

test('K5/BOZMA · biçimsiz kalem sevkte de fail-closed (ölçemedim ile temiz aynı şey değildir)', () => {
  const kok = muhurBekleyenDonem();
  writeFileSync(DURUM_EVI(kok), 'bicimsiz satir\n');
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /bicimsiz kalem/);
});

test('sevk/karne tazeliği: karneden SONRA iş zarfı gelirse karne düşer (yeniden doğrulanır)', () => {
  const kok = kurulum({
    donem: true,
    kutu: kutuMetni({ gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' }], onkosul: { 'G-01': 'yok' } }),
  });
  bekciKur(kok, 'YEŞİL');
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'bayat karne görevi kapatmamalı');
  assert.match(r.stderr, /karnesi bayat/);
  assert.ok(gunluk(kok).some((j) => j.cins === 'bayat-karne'));
});

test('sevk/BEKLETİR birincil hattı: cevapsız çatalın görevi HİÇ açılmaz', () => {
  const kok = kurulum({
    donem: true,
    kutu: kutuMetni({ gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'açık', kanit: 'test: t' }], onkosul: { 'G-01': 'yok' } }),
  });
  writeFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'),
    '# SENDE BEKLEYEN\n\n- [ ] 2026-07-28 · po · ÇATAL Ç-01 · "Puanlar ayrı satır görünsün mü?" · bekletir: G-01 · kaynak: zarf-günlüğü satır 2\n');
  const r = sevk(kok);
  assert.equal(r.status, 0, 'görev açılmamalı');
  assert.match(r.stdout, /BEKLETIR listesinde/);
  assert.ok(!gunluk(kok).some((j) => j.tip === 'sevk-karar'), 'hiç sevk kararı düşmemeli');
});

test('sevk/çatal süzgeci: ÇATAL dolu zarfın hükmü yoksa catal-denetcisi ZORUNLU açılır', () => {
  const kok = kurulum({ donem: true, kutu: kutuMetni({ onkosul: { 'G-01': 'yok', 'G-02': 'yok' } }) });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'dolu', ceviri: 'x', etki: 'y', bekletir: 'G-02' } });
  const r = sevk(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /subagent_type: catal-denetcisi/);
  assert.match(r.stderr, /^gorev: G-01$/m);

  // Hüküm düştükten sonra süzgeç tekrar açılmaz
  ekle(kok, { tip: 'catal-suzgec', ajan: 'catal-denetcisi', gorev: 'G-01', hukum: 'DONDU' });
  const r2 = sevk(kok);
  assert.equal(r2.status, 2);
  assert.match(r2.stderr, /subagent_type: uretici/, 'süzgeç hükmü verilince üretim sırası gelmeli');
  assert.match(r2.stderr, /^gorev: G-02$/m, 'dönüşü gelmiş G-01 tekrar açılmamalı');
});

test('sevk/önkoşul: çözülmemiş bağımlılık görevi açtırmaz (duran kapı, sessiz "bitti" DEĞİL)', () => {
  const kok = kurulum({
    donem: true,
    kutu: kutuMetni({ gorevler: [{ id: 'G-02', is: 'ikinci', sahip: 'uretici', durum: 'açık', kanit: 'test: t' }], onkosul: { 'G-02': 'G-01' } }),
  });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /onkosul cozulmedi/);
  assert.match(r.stdout, /duran-kapi/);
});

test('sevk/yeniden-sevk: dönüşü gelmeyen görev BİR KEZ yeniden açılır, ikincide duran kapı', () => {
  // T4 ön-ölçümünün düşürdüğü kusur: tek düşen alt-ajan çağrısı görevi dönem boyunca
  // kilitliyor ve bütün dönemi duran kapıya sokuyordu (canlı görüldü 2026-07-28).
  const tek = { gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'açık', kanit: 'test: t' }], onkosul: { 'G-01': 'yok' } };
  const bir = kurulum({ donem: true, kutu: kutuMetni(tek) });
  ekle(bir, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  const r1 = sevk(bir);
  assert.equal(r1.status, 2, 'ilk düşen çağrı yeniden sevk edilmeli: ' + r1.stdout);
  assert.match(r1.stderr, /YENIDEN sevk/);

  const iki = kurulum({ donem: true, kutu: kutuMetni(tek) });
  ekle(iki, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  ekle(iki, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  const r2 = sevk(iki);
  assert.equal(r2.status, 0, 'ikinci düşen çağrıdan sonra sessiz tekrar OLMAMALI');
  assert.match(r2.stdout, /iki kez sevk edildi/);

  // Dönüşü gelmiş ama kapanmamış görev TEKRAR SEVK EDİLMEZ (aynı iş iki kez yapılmaz);
  // sessiz de geçilmez — gorev-kapatilmadi bulgusu düşer ve dönem duran kapıya gider.
  const donen = kurulum({ donem: true, kutu: kutuMetni(tek) });
  ekle(donen, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  ekle(donen, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  const r3 = sevk(donen);
  assert.equal(r3.status, 0, 'dönmüş görev yeniden açılmamalı: ' + r3.stderr);
  assert.match(r3.stdout, /gorev satiri hala açık/);
  assert.ok(gunluk(donen).some((j) => j.cins === 'gorev-kapatilmadi'), 'kusur izsiz kalmamalı');
});

test('sevk/frenler: bütçe dolunca ve ilerleme yokken duran kapı', () => {
  const dolu = kurulum({ donem: true, kutu: kutuMetni({ butce: '2' }) });
  ekle(dolu, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  ekle(dolu, { tip: 'sevk-karar', gorev: 'G-02', rol: 'uretici', is_tipi: 'uretim' });
  const r1 = sevk(dolu);
  assert.equal(r1.status, 0);
  assert.match(r1.stdout, /butce tavani doldu/);

  const durgun = kurulum({ donem: true });
  ekle(durgun, { tip: 'nabiz', tur_no: 1, zarf_sayisi: 0 });
  ekle(durgun, { tip: 'nabiz', tur_no: 2, zarf_sayisi: 0 });
  const r2 = sevk(durgun);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /ilerleme yok/);
});

test('sevk/şema: görev durumu sözlük dışıysa ve sahibi kadroda yoksa duran kapı', () => {
  const sozluk = kurulum({ donem: true, kutu: kutuMetni({ gorevler: [{ id: 'G-01', is: 'x', sahip: 'uretici', durum: 'yarım', kanit: 't' }], onkosul: { 'G-01': 'yok' } }) });
  assert.match(sevk(sozluk).stdout, /gorev durumu sozlukte yok/);

  const kadro = kurulum({ donem: true, kadro: ['dogrulayici', 'disgoz'], kutu: kutuMetni({ gorevler: [{ id: 'G-01', is: 'x', sahip: 'hayalet', durum: 'açık', kanit: 't' }], onkosul: { 'G-01': 'yok' } }) });
  assert.match(sevk(kadro).stdout, /sahibi kadroda yok/);
});

test('sevk/bekçi dönem-içi: yeni karne düştüğü turda bekçi koşar; KIRMIZI duran kapıdır', () => {
  const tek = { gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' }], onkosul: { 'G-01': 'yok' } };
  const kok = kurulum({ donem: true, kutu: kutuMetni(tek) });
  bekciKur(kok, 'KIRMIZI');
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  const b = gunluk(kok).find((j) => j.tip === 'bekci');
  assert.ok(b && b.isik === 'KIRMIZI', 'bekçi ışığı günlüğe damgalanmalı');

  // Bekçi hiç yoksa: dönem-içi ışık tazelenemiyor → duran kapı (sessiz geçmez)
  const bekcisiz = kurulum({ donem: true, kutu: kutuMetni(tek) });
  ekle(bekcisiz, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(bekcisiz, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  assert.match(sevk(bekcisiz).stdout, /bekçi yok/);
});

test('sevk/kurulum türü: kurulum-denetcisi ZORUNLU açılır; YEŞİL karnesiz kapanmaz', () => {
  const kok = kurulum({ donem: `DONEM-E4\t${KUTU_ADI}\tkurulum\ttatbikat\ndamga\t${new Date().toISOString()}\n` });
  bekciKur(kok, 'YEŞİL');
  const r = sevk(kok);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /subagent_type: kurulum-denetcisi/);
  assert.match(r.stderr, /^gorev: KURULUM$/m);

  ekle(kok, { tip: 'karne', ajan: 'kurulum-denetcisi', gorev: 'KURULUM', hukum: 'YEŞİL', maddeler: '1=geçti' });
  const r2 = sevk(kok);
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /kurulum denetimi YESIL/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 3 · devir-şema kapısı — çağrı ucu (talimat↔fiil + iç içe alt-ajan)
// ══════════════════════════════════════════════════════════════════════════════════════════

const DEVIR_METNI = `gorev: G-01\nkutu: 01_kutular/${KUTU_ADI}/KUTU.md\nsozlesme: 03_roller/uretici/ROL.md\nkural: 02_kanon/OTONOM_DONEM.md`;
const cagri = (metin = DEVIR_METNI, rol = 'uretici') => ({ tool_name: 'Agent', tool_input: { subagent_type: rol, prompt: metin } });

test('devir kapısı: dönem yokken hiç çalışmaz (el-sürüşlü alt-ajan serbest)', () => {
  const kok = kurulum();
  const r = devir(kok, cagri('ne istersen yaz, serbest metin'));
  assert.equal(r.status, 0);
  assert.equal(gunluk(kok).length, 0);
});

test('devir kapısı: sevk kararıyla eşleşen şemalı devir GEÇER + devir kaydı düşer', () => {
  const kok = kurulum({ donem: true });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  const r = devir(kok, cagri());
  assert.equal(r.status, 0, r.stderr);
  const d = gunluk(kok).find((j) => j.tip === 'devir');
  assert.ok(d && d.sonuc === 'gecti', 'geçen devir de izli olmalı');
});

test('devir kapısı: serbest düzyazı / tavan aşımı / memory alanı → ENGEL', () => {
  const kok = kurulum({ donem: true });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });

  const duzyazi = devir(kok, cagri(DEVIR_METNI + '\nBu işi yaparken şuna dikkat et: ekstre satırları hizalı olsun.'));
  assert.equal(duzyazi.status, 2);
  assert.match(duzyazi.stderr, /sema disi satir/);

  const buyuk = devir(kok, cagri(DEVIR_METNI + '\nek-okuma: ' + 'x'.repeat(900)));
  assert.equal(buyuk.status, 2);
  assert.match(buyuk.stderr, /tavani asiyor/);

  const mem = devir(kok, { tool_name: 'Agent', tool_input: { subagent_type: 'uretici', prompt: DEVIR_METNI, memory: 'kalsın' } });
  assert.equal(mem.status, 2);
  assert.match(mem.stderr, /memory alani gecemez/);
});

test('devir kapısı: sevkin açmadığı (rol, görev) ikilisi ENGEL + dikis-sapma izi (iç içe ajan dahil)', () => {
  const kok = kurulum({ donem: true });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });

  const baskaRol = devir(kok, cagri(DEVIR_METNI, 'dogrulayici'));
  assert.equal(baskaRol.status, 2, 'aynı görev başka role açılamaz');
  assert.match(baskaRol.stderr, /sevkin acmadigi donem/);

  const baskaGorev = devir(kok, cagri(DEVIR_METNI.replace('G-01', 'G-02')));
  assert.equal(baskaGorev.status, 2);
  assert.ok(gunluk(kok).filter((j) => j.cins === 'dikis-sapma').length >= 2, 'her sapma izli olmalı');
});

test('devir kapısı: görev satırı yoksa ve sevk kararı hiç yoksa ENGEL (fail-closed)', () => {
  const kok = kurulum({ donem: true });
  assert.match(devir(kok, cagri('kutu: 01_kutular/x/KUTU.md')).stderr, /gorev satiri yok/);
  const temiz = kurulum({ donem: true });
  assert.match(devir(temiz, cagri()).stderr, /zarf gunlugu yok|henuz hic sevk karari yok/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 4 · Karne sözleşmesi (K2) — biçim kapısı
// ══════════════════════════════════════════════════════════════════════════════════════════

test('karne: üç ek satırdan biri eksikse dönüş reddedilir', () => {
  const kok = kurulum({ donem: true });
  const eksik = { agent_type: 'dogrulayici', last_assistant_message: zarf({ biten: 'G-01 — karne · kanıt: 00_pano/PANO.md:1' }) };
  const r = kapi(kok, eksik);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /karne dönüşünde eksik alan/);
});

test('karne: HÜKÜM ve KARNE-GOREV birebir okunur (uydurma jeton geçmez)', () => {
  const kok = kurulum({ donem: true });
  assert.match(kapi(kok, karneZarfi({ hukum: 'yesil' })).stderr, /HÜKÜM okunmuyor/);
  assert.match(kapi(kok, karneZarfi({ gorevAd: 'birinci-gorev' })).stderr, /KARNE-GOREV çözülmüyor/);
});

test('karne: geçerli karne → günlüğe `karne` kaydı + zarf sınıfı "karne"', () => {
  const kok = kurulum({ donem: true });
  const r = kapi(kok, karneZarfi());
  assert.equal(r.status, 0, r.stderr);
  const g = gunluk(kok);
  const k = g.find((j) => j.tip === 'karne');
  assert.ok(k, 'karne kaydı düşmeli');
  assert.equal(k.gorev, 'G-01');
  assert.equal(k.hukum, 'YEŞİL');
  const z = g.find((j) => j.tip === 'zarf');
  assert.equal(z.sinif, 'karne', 'karneci zarfı iş zarfı sayılmamalı (tazelik ölçümü)');
  assert.ok(g.findIndex((j) => j.tip === 'karne') > g.findIndex((j) => j.tip === 'zarf'), 'karne zarftan SONRA düşmeli');
});

test('karne: ÖZ-KARNE yasağı — işi yapan koltuk kendi karnesini yazamaz', () => {
  const kok = kurulum({ donem: true, kadro: ['dogrulayici', 'uretici'] });
  ekle(kok, { tip: 'zarf', ajan: 'dogrulayici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  const r = kapi(kok, karneZarfi({ ajan: 'dogrulayici' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /öz-karne yasak/);
  assert.ok(gunluk(kok).some((j) => j.cins === 'oz-karne'), 'öz-karne izi düşmeli');
});

test('karne: karneci BEKLETİR kilidinden muaf (hüküm iş değildir)', () => {
  const kok = kurulum({ donem: true });
  writeFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'),
    '# SENDE BEKLEYEN\n\n- [ ] 2026-07-28 · po · ÇATAL Ç-01 · "soru?" · bekletir: G-01 · kaynak: zarf-günlüğü satır 2\n');
  const r = kapi(kok, karneZarfi());
  assert.equal(r.status, 0, 'karneci dönüşü BEKLETİR kilidine takılmamalı: ' + r.stderr);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 5 · Kurulum kapısı (mekanik kalemler)
// ══════════════════════════════════════════════════════════════════════════════════════════

test('kurulum kapısı: tam kutu YEŞİL (mekanik kalemler)', () => {
  const kok = kurulum();
  const r = kos(kok, 'kurulum-kapisi.sh', [KUTU_ADI, kok]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /MEKANİK KALEMLER YEŞİL/);
});

test('kurulum kapısı: duruş sözleşmesi/BÜTÇE eksikse EKSİK', () => {
  const durussuz = kurulum({ kutu: kutuMetni({ durus: false }) });
  const r1 = kos(durussuz, 'kurulum-kapisi.sh', [KUTU_ADI, durussuz]);
  assert.equal(r1.status, 1);
  assert.match(r1.stdout, /durus sozlesmesi blogu yok/);

  const sayisiz = kurulum({ kutu: kutuMetni().replace(/BÜTÇE:.*/, 'BÜTÇE:      bol bol') });
  const r2 = kos(sayisiz, 'kurulum-kapisi.sh', [KUTU_ADI, sayisiz]);
  assert.equal(r2.status, 1);
  assert.match(r2.stdout, /BÜTÇE satirinda sayi yok/);
});

test('kurulum kapısı: risk satırı olmayan görev + var olmayan/döngüsel önkoşul yakalanır', () => {
  const eksik = kurulum({ kutu: kutuMetni({ onkosul: { 'G-01': 'yok' } }) });   // G-02 satırı yok
  const r1 = kos(eksik, 'kurulum-kapisi.sh', [KUTU_ADI, eksik]);
  assert.equal(r1.status, 1);
  assert.match(r1.stdout, /risk satiri olmayan gorev/);

  const hayalet = kurulum({ kutu: kutuMetni({ onkosul: { 'G-01': 'G-99', 'G-02': 'G-02' } }) });
  const r2 = kos(hayalet, 'kurulum-kapisi.sh', [KUTU_ADI, hayalet]);
  assert.equal(r2.status, 1);
  assert.match(r2.stdout, /var olmayan goreve bagimli: G-99/);
  assert.match(r2.stdout, /kendine bagimli/);
});

test('kurulum kapısı: memory alanı ve kadro dışı sahip EKSİK; karar alanı boşsa EKSİK', () => {
  const mem = kurulum();
  writeFileSync(join(mem, '.claude', 'agents', 'uretici.md'), '---\nname: uretici\nmemory: kalsın\n---\n');
  const r1 = kos(mem, 'kurulum-kapisi.sh', [KUTU_ADI, mem]);
  assert.equal(r1.status, 1);
  assert.match(r1.stdout, /memory alanı VAR/);

  const profilsiz = kurulum({ profil: false });
  const r2 = kos(profilsiz, 'kurulum-kapisi.sh', [KUTU_ADI, profilsiz]);
  assert.equal(r2.status, 1);
  assert.match(r2.stdout, /karar alanı: HAZIR DEĞİL/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 6 · Kurulum öz-denetimi (GENESIS G4.5) — memory yasağı
// ══════════════════════════════════════════════════════════════════════════════════════════

test('kurulum-denetimi: alt-ajan dosyasında memory alanı KIRMIZI (zorunlu unutmanın ölüm noktası)', () => {
  const kok = kurulum();
  const r0 = spawnSync('bash', [join(KOK_REPO, 'tools', 'guard', 'kurulum-denetimi.sh'), kok], { encoding: 'utf8' });
  assert.ok(!/memory alanı var/.test(r0.stdout), 'temiz kadro memory KIRMIZI:si vermemeli');
  assert.match(r0.stdout, /alt-ajan memory yasağı/);

  writeFileSync(join(kok, '.claude', 'agents', 'uretici.md'), '---\nname: uretici\nmemory: kalsın\n---\n');
  const r1 = spawnSync('bash', [join(KOK_REPO, 'tools', 'guard', 'kurulum-denetimi.sh'), kok], { encoding: 'utf8' });
  assert.match(r1.stdout, /memory alanı var/);
  assert.equal(r1.status, 2, 'memory alanı çekilmeyi kilitlemeli');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 7 · Hasım turunun açtığı görevler (2026-07-28) — kablo · daraltma · istisna · fren
// ══════════════════════════════════════════════════════════════════════════════════════════

test('kablo: settings.json Stop ve Task|Agent kancalarını FİİLEN bağlıyor (kopan kablo sessiz kalmasın)', () => {
  // Hasım bulgusu: E4 iki YENİ kanca ekliyordu ama hiçbir test kablonun varlığını aramıyordu —
  // kanca silinse 309/309 yeşil kalırdı. Emsal: SubagentStop kablosu E1'de böyle sınanmıştı.
  const s = JSON.parse(readFileSync(join(KOK_REPO, '.claude', 'settings.json'), 'utf8'));
  const stop = (s.hooks.Stop || []).flatMap((g) => g.hooks || []).map((h) => h.command).join(' ');
  assert.match(stop, /tools\/sevk\/sevk\.sh/, 'Stop kancası sevk.sh e bağlı olmalı');
  const pre = (s.hooks.PreToolUse || []);
  const devirKablo = pre.find((g) => String(g.matcher) === 'Task|Agent');
  assert.ok(devirKablo, 'PreToolUse içinde "Task|Agent" matcherlı grup olmalı (araç adı sürüme göre değişir — E0 kalem 7)');
  assert.match((devirKablo.hooks || []).map((h) => h.command).join(' '), /tools\/sevk\/devir-kapisi\.sh/);
  const genel = pre.find((g) => String(g.matcher) === '*');
  assert.match((genel.hooks || []).map((h) => h.command).join(' '), /tools\/guard\/file-guard\.sh/, 'file-guard hattı bozulmamalı');
});

// Aşağıdaki bekçi vakaları K1 makine-satırı kapısının kasıtlı bozmalarıdır: her dal (kilit ·
// satır-yok · çelişki · arıza · uyarı · bozuk satır · kelime-taraması-emekli) ayrı sınanır.
const bekciYaz = (kok, govde) => {
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), govde);
  chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
};
const bekciliDonem = () => {
  const tek = { gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' }], onkosul: { 'G-01': 'yok' } };
  const kok = kurulum({ donem: true, kutu: kutuMetni(tek) });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  return kok;
};

test('bekçi: kilit>0 dönemi DURDURMAZ (kanonun iki yerde yazdığı istisna — kapanış kilidi)', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'KİLİT [tavan] tavan-asimi: KUTU 21KB > 1,5x esik\\n'\nprintf 'BEKCI v1 durduran=0 kilit=1 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n");
  const r = sevk(kok);
  // Dönem sürer (F1-5a ile artık kapanış evresine geçerek sürer): kilit duran kapı değil.
  assert.equal(r.status, 2, r.stdout);
  assert.ok(!/bekçi KIRMIZI/.test(r.stdout + r.stderr), 'kilit duran kapı DEĞİLDİR (kapanış kilididir): ' + r.stdout);
  const b = gunluk(kok).find((j) => j.tip === 'bekci');
  assert.equal(b.isik, 'KILIT', 'ışık ayrı sınıflanmalı ki iz kaybolmasın');
});

test('bekçi: çıkış kodu fail-CLOSED — makine satırı basmadan çöken bekçi YEŞİL sayılmaz', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'yarim cikti\\n'\nexit 3\n");
  const r = sevk(kok);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  assert.match(r.stdout, /makine satırı yok/);
  assert.match(r.stdout, /çıkış kodu 3/);
});

test('bekçi: temiz çıkış AMA makine satırı yok → fail-closed duran kapı (eski kod YEŞİL sayardı)', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'her sey yolunda gibi\\n'\nexit 0\n");
  const r = sevk(kok);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  assert.match(r.stdout, /makine satırı yok/);
});

test('bekçi: kelime taraması EMEKLİ — açıklamada geçen KIRMIZI kelimesi dönemi durduramaz', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'BİLGİ [şema] not: gecen hafta KIRMIZI ve SARI cok tartisildi\\n'\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=1 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n");
  const r = sevk(kok);
  assert.equal(r.status, 2, 'temiz bekçiyle dönem kapanış evresine geçmeli: ' + r.stdout);
  assert.ok(!/bekçi KIRMIZI/.test(r.stdout + r.stderr), 'metindeki kelime karara girmemeli: ' + r.stdout);
  const b = gunluk(kok).find((j) => j.tip === 'bekci');
  assert.equal(b.isik, 'YEŞİL', 'SARI kelimesi de ışığı boyamamalı');
});

test('bekçi: çıkış kodu ile makine satırı çelişirse fail-closed duran kapı', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 1\n");
  const r = sevk(kok);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  assert.match(r.stdout, /çelişiyor/);
});

test('bekçi: arıza (çıkış 2) duran kapıdır — makine satırı temiz görünse bile', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'ARIZA [tavan] glob patladi\\n'\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=1 kadran=tam pencere=isletim\\n'\nexit 2\n");
  const r = sevk(kok);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  assert.match(r.stdout, /çıkış kodu 2/);
});

test('bekçi: ariza>0 + temiz çıkış kodu (bozuk üretici) sessiz YEŞİL olamaz — duran kapı (hasım #5/#12)', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'ARIZA [tavan] glob patladi ama cikis kodu unutuldu\\n'\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=0 bilgi=0 ariza=1 kadran=tam pencere=isletim\\n'\nexit 0\n");
  const r = sevk(kok);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  assert.match(r.stdout, /arıza hattı sessiz geçemez/);
});

test('bekçi: bozuk makine satırı (sayı olmayan alan) fail-closed duran kapıdır', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'BEKCI v1 durduran=x kilit=0 uyari=0 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n");
  const r = sevk(kok);
  assert.match(r.stdout, /bekçi KIRMIZI/);
  assert.match(r.stdout, /çözümlenemedi/);
});

test('bekçi: uyari>0 dönemi durdurmaz, ışık SARI olarak günlüğe damgalanır', () => {
  const kok = bekciliDonem();
  bekciYaz(kok, "#!/bin/bash\nprintf 'UYARI [şema] kok-izinli-kume: fazladan dosya\\n'\nprintf 'BEKCI v1 durduran=0 kilit=1 uyari=2 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n");
  // kilit=1 uyari=2: kilit uyarıdan ÖNCE gelir (öncelik sırası testin ikinci yarısı)
  const r = sevk(kok);
  assert.equal(r.status, 2, r.stdout);
  assert.equal(gunluk(kok).find((j) => j.tip === 'bekci').isik, 'KILIT', 'kilit varken SARI basılmaz');

  const kok2 = bekciliDonem();
  bekciYaz(kok2, "#!/bin/bash\nprintf 'UYARI [şema] kok-izinli-kume: fazladan dosya\\n'\nprintf 'BEKCI v1 durduran=0 kilit=0 uyari=2 bilgi=0 ariza=0 kadran=tam pencere=isletim\\n'\nexit 0\n");
  const r2 = sevk(kok2);
  assert.equal(r2.status, 2, r2.stdout);
  assert.equal(gunluk(kok2).find((j) => j.tip === 'bekci').isik, 'SARI', 'uyarı ışığı iz bırakmalı');
});

test('gerçek-kutu şartı: watchdog CANLI değilse `gercek` dönem AÇILMAZ (tatbikat muaf)', () => {
  const kok = kurulum();
  const g = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim']);   // varsayılan sınıf: gercek
  assert.equal(g.status, 1, 'varsayılan gerçek dönem, E5 kurulmadan açılmamalı');
  // T6 PROVA FİŞİ ŞARTI KALKTI (F1-5h): o dosya KEEL sürümünün provasını kanıtlıyordu, bu
  // kurulumun hazırlığını değil — ve şablonla dolu geldiği için kapıyı baştan açıyordu.
  // Kalan şartların hepsi BU makinede ÖLÇÜLÜR.
  assert.doesNotMatch(g.stderr, /T6/, 'T6 prova fişi artık şart olmamalı');
  assert.match(g.stderr, /watchdog-kaydi/);
  assert.ok(!existsSync(GOSTERGE(kok)));

  // E5 SERTLEŞTİRMESİ (2026-07-28): bu test eskiden buraya SAHTE bir watchdog işareti yazıp
  // dönemin açılmasını bekliyordu — yani "dosya var" ile "iş fiilen koşuyor" aynı sayılıyordu.
  // E5'in canlılık denetimi (ortak.sh · gercek_kutu_eksikleri) o kabulü kaldırdı: işaretin
  // gösterdiği launchd işi `launchctl print` ile aranır, son nabız damgasının tazeliği ölçülür.
  // Sahte işaret ARTIK YETMEZ — kâğıt üstünde korunan bir gece, korunmayan gecedir (E4'ün
  // "dosyada duran ölü kural" dersinin E5'teki karşılığı). Gerçek yol T6e'de canlı sınanır.
  writeFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'), 'launchd: test\n');
  const g2 = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim']);
  assert.equal(g2.status, 1, 'ŞEKİLSİZ (etiketsiz) watchdog işareti gerçek dönemi AÇMAMALI');
  assert.match(g2.stderr, /watchdog-kaydinda-etiket-yok/);

  // Etiketi olan ama launchd'ye YÜKLENMEMİŞ işaret de yetmez (T6e'nin birim karşılığı).
  writeFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'),
    'etiket=dev.keel.nabiz.olmayan-is-' + process.pid + '\nplist=/yok\n');
  const g3 = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim']);
  assert.equal(g3.status, 1, 'yüklü OLMAYAN launchd işi gerçek dönemi AÇMAMALI');
  assert.match(g3.stderr, /watchdog-isi-YUKLU-DEGIL/);
  assert.ok(!existsSync(GOSTERGE(kok)));

  // Tatbikat sınıfı muafiyeti korunur (E4/E5 tatbikatları döngüsel bağımlılığa girmesin).
  const g4 = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(g4.status, 0, 'tatbikat sınıfı bu şartlardan muaf olmalı: ' + g4.stderr);
});

test('bayat gösterge: 12 saatten eski dönem duran kapıdır (watchdogun 2. hattı)', () => {
  const eski = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
  const kok = kurulum({ donem: `DONEM-E4\t${KUTU_ADI}\tyapim\ttatbikat\ndamga\t${eski}\n` });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /BAYAT/);
  assert.ok(!existsSync(GOSTERGE(kok)), 'bayat gösterge temizlenmeli');
});

test('devir kapısı: TÜKETİLMİŞ sevk kararı ikinci kez açılamaz (açık-karar semantiği)', () => {
  const kok = kurulum({ donem: true });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  const r = devir(kok, cagri());
  assert.equal(r.status, 2, 'dönüşü gelmiş görev yeniden açılamaz');
  assert.match(r.stderr, /TUKETILMIS/);
});

test('dönüş dikişi: aynı görevi BAŞKA rol döndürürse sapma (E4 rol daraltması)', () => {
  const kok = kurulum({ donem: true, kadro: ['uretici', 'dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi', 'baskarol'] });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  const r = kapi(kok, { agent_type: 'baskarol', last_assistant_message: zarf({ biten: 'G-01 — iş · kanıt: 00_pano/PANO.md:1' }) });
  assert.equal(r.status, 0, 'dikiş ENGELLEMEZ, iz düşürür: ' + r.stderr);
  assert.ok(gunluk(kok).some((j) => j.cins === 'dikis-sapma'), 'rol uyuşmazlığı sapma izi bırakmalı');
  const z = gunluk(kok).find((j) => j.tip === 'zarf');
  assert.equal(z.dikis, 'sapma');
});

test('dönüş dikişi: BAŞKA dönemin sevk kararı bugünkü sapmayı örtmez (dönem süzgeci)', () => {
  const kok = kurulum({ donem: true });
  appendFileSync(GUNLUK(kok), JSON.stringify({ surum: 1, ts: '2026-07-27T10:00:00Z', donem: 'ESKI-DONEM', tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici' }) + '\n');
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-02', rol: 'uretici', is_tipi: 'uretim' });
  const r = kapi(kok, { agent_type: 'uretici', last_assistant_message: zarf({ biten: 'G-01 — iş · kanıt: 00_pano/PANO.md:1' }) });
  assert.equal(r.status, 0);
  const z = gunluk(kok).find((j) => j.tip === 'zarf');
  assert.equal(z.dikis, 'sapma', 'eski dönemin kararı bu dönemdeki sapmayı örtmemeli');
});

test('mutlak tur tavanı ERİŞİLEBİLİR: sevk-kararsız nabız yığını dönemi durdurur', () => {
  // Hasım bulgusu: fren ilan ediliyordu ama testi yoktu ve normal akışta bütçe hep önce
  // dolduğu için "ölü kod" şüphesi vardı.
  // Tavan = 3×BÜTÇE + 5 + KAPANIS_TUR_PAYI (2 + 3×2 = 8); bütçe 3 → 22 tur. Pay 2026-07-30
  // hasım turunda eklendi: kapanış evresinin turları hesaba katılmıyordu, yani küçük kutuda
  // "en çok iki gidiş-dönüş" ilanı kâğıtta vardı, kodda ULAŞILAMIYORDU.
  const kok = kurulum({ donem: true, kutu: kutuMetni({ butce: '3' }) });
  for (let i = 1; i <= 23; i++) ekle(kok, { tip: 'nabiz', tur_no: i, zarf_sayisi: i });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /mutlak tur tavani asildi/);
});

test('kurulum kapısı: otonom kural evi (02_kanon/OTONOM_DONEM.md) yoksa EKSİK', () => {
  const kok = kurulum();
  rmSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'));
  const r = kos(kok, 'kurulum-kapisi.sh', [KUTU_ADI, kok]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /kural evi kurulmamış/);
});

test('miras görev: dönemden önce kapanmış görev yeniden doğrulanmaz ama izsiz de kalmaz', () => {
  const kok = kurulum({
    donem: true,
    kutu: kutuMetni({
      gorevler: [{ id: 'G-01', is: 'eski iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' },
                { id: 'G-02', is: 'yeni iş', sahip: 'uretici', durum: 'açık', kanit: 'test: t' }],
      onkosul: { 'G-01': 'yok', 'G-02': 'G-01' },
    }),
  });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'miras görev G-02yi kilitlememeli: ' + r.stdout);
  assert.match(r.stderr, /^gorev: G-02$/m);
  assert.ok(gunluk(kok).some((j) => j.cins === 'miras-gorev'), 'miras görev izsiz geçmemeli');
});
