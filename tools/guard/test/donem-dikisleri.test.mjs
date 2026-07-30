// donem-dikisleri.test.mjs — Faz 2 sıra 7 · dönem dikişleri (F1-5a…f, F1-5h).
// Sözleşme: Araştırmalar/…/36_Otonom KEEL — Faz 1 tasarımı.md §P3 + …/28 planı Faz 2 satır 7.
//
// Ölçülen dört iddia:
//   (a) Üretim bitince kapanış denetimi KENDİLİĞİNDEN başlar — sahip ikinci komut yazmaz.
//   (b) Kapanış karnesi KIRMIZI ise dönem kilitlenmez; bulgu sevk edilir (en çok 2 gidiş-dönüş).
//   (c) Dış göz brifingi DÖNEM İÇİNDE üretilir — koltuk yazamaz kalır, dosyayı kapı yazar.
//   (f) Otonom dönemde izin penceresi açılmaz; kutunun İZİN satırı sözleşmedir.
// Ayrıca: kip bayrağı kalktı (e) · kutu adı seçimli (d) · prova fişi kapısı kalktı (h).
//
// FIXTURE DÜRÜSTLÜĞÜ (sıra 5-6 dersi): kutu metni gerçek şemayı taşır (duruş sözleşmesi beş
// satır + İZİN), kadro `03_roller/` ve `.claude/agents/` olarak AYRI kurulur, gösterge DÖRT
// alandır. Ölçülen çapaların hiçbiri, ölçtüğü tarafın kendi yazdığı satırdan okunmaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, appendFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const GOSTERGE = (kok) => join(kok, 'tools', 'sevk', '.donem-acik');
const GUNLUK = (kok) => join(kok, '00_pano', 'zarf-gunlugu.jsonl');
const KUTU_ADI = 'KT-901-dikis';

const SEVK_BETIKLERI = ['ortak.sh', 'kilit.sh', 'zarf-ekle.sh', 'zarf-bicim-kapisi.sh',
                        'karar-alani.sh', 'catal-kuyruk.sh', 'donem-ac.sh', 'sevk.sh',
                        'devir-kapisi.sh', 'kurulum-kapisi.sh'];

const KARAR_KALIP = readFileSync(join(KOK_REPO, '00_genesis', 'KARAR_ALANI_KALIBI.md'), 'utf8');
const KARAR_GOVDE = [
  '- Kahve dükkânının günlük nakit akışını yalnız ben bilirim.',
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

function kutuMetni({ gorevler = [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' }],
                     butce = '3', izin = 'yok' } = {}) {
  const l = ['# ' + KUTU_ADI + ' — dikiş kutusu', '', '## Görevler',
             '| Görev | İş | Sahip | Durum | Kanıt |', '|---|---|---|---|---|'];
  for (const k of gorevler) l.push(`| ${k.id} | ${k.is} | ${k.sahip} | ${k.durum} | ${k.kanit} |`);
  l.push('', '## Duruş sözleşmesi',
    'BİTİŞ HÂLİ: ekranda iki satır görünür',
    'KANIT:      npm test yeşil (tam özet satırı)',
    'KISIT:      02_kanon/golden/ dokunulmaz',
    `BÜTÇE:      dönem başına en çok ${butce} ÜRETİM çağrısı · toplam 12 dönem`,
    `İZİN:       ${izin}`);
  l.push('', '## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)');
  for (const k of gorevler) l.push(`${k.id}: onkosul=yok · risk=düşük — tek satır gerekçe`);
  return l.join('\n') + '\n';
}

function kurulum({ donem = 'yapim', kutu = kutuMetni(), kadro = ['uretici'],
                   koltuk = ['dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi', 'disgoz'] } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'dikis-test-'));
  for (const d of [['00_pano'], ['02_kanon'], ['01_kutular', KUTU_ADI], ['tools', 'sevk'],
                   ['tools', 'guard'], ['.claude', 'agents'], ['03_roller', 'disgoz']]) {
    mkdirSync(join(kok, ...d), { recursive: true });
  }
  for (const b of SEVK_BETIKLERI) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'gercek-veri-isaretleri.txt'), join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  for (const a of [...kadro, ...koltuk]) writeFileSync(join(kok, '.claude', 'agents', a + '.md'), `---\nname: ${a}\ntools: Read\n---\n# ajan\n`);
  for (const r of kadro) {
    mkdirSync(join(kok, '03_roller', r), { recursive: true });
    writeFileSync(join(kok, '03_roller', r, 'ROL.md'), `# ROL — ${r}\n\nMod: **tam**.\n`);
  }
  writeFileSync(join(kok, '03_roller', 'disgoz', 'ROL.md'), '# ROL — Dış göz\n\nMod: **yazamaz**.\n');
  writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), '<!-- yazar: disgoz -->\n# DIŞ GÖZ — brifing\nTarih: 2026-01-01\n');
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  writeFileSync(join(kok, '01_kutular', KUTU_ADI, 'KUTU.md'), kutu);
  writeFileSync(join(kok, '02_kanon', 'KARAR_ALANI.md'), kararAlaniMetni());
  writeFileSync(join(kok, '02_kanon', 'OTONOM_DONEM.md'), '# OTONOM DÖNEM\n');
  // Bekçi: dönem-içi tazeleme (yeni karne düşen turda) onu çağırır — yoksa duran kapı olur.
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), "#!/bin/bash\nprintf '[sema] YEŞİL\\n'\n");
  chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-30\n');
  if (donem) {
    writeFileSync(GOSTERGE(kok), `DONEM-S7\t${KUTU_ADI}\t${donem}\ttatbikat\ndamga\t${new Date().toISOString()}\n`);
    // İzin/bütçe ÇAPASI (hasım turu 2026-07-30): gerçek akışta bunu açılış töreni yazar ve
    // kanca/sevk YALNIZ bunu okur. Fikstür de aynı dünyayı taklit etmeli — değerler kutunun
    // duruş sözleşmesinden AYRIŞTIRILARAK alınır, kapının kendi deseninden türetilerek değil.
    const durus = (kutu.split('## Duruş sözleşmesi')[1] || '');
    const izinS = (durus.split('\n').find((s) => /^\s*İZİN\s*:/.test(s)) || '').replace(/^\s*İZİN\s*:/, '').trim();
    const butceS = (durus.split('\n').find((s) => /^\s*BÜTÇE\s*:/.test(s)) || '').match(/(\d+)/);
    const jetonlar = /^yok\b/.test(izinS) ? '' : izinS.split(/[\s,·]+/).filter(Boolean).join(' ');
    writeFileSync(join(kok, 'tools', 'sevk', '.donem-capa'),
      `izin\t${jetonlar}\nbutce\t${butceS ? butceS[1] : 3}\nkutu\t${KUTU_ADI}\ndonem\tDONEM-S7\n`);
  }
  return kok;
}

const kos = (kok, ad, args = [], girdi = undefined) =>
  spawnSync('bash', [join(kok, 'tools', 'sevk', ad), ...args],
    { encoding: 'utf8', input: girdi, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
const sevk = (kok) => kos(kok, 'sevk.sh', [], JSON.stringify({ session_id: 'S1', hook_event_name: 'Stop' }));
const kapi = (kok, girdi) => kos(kok, 'zarf-bicim-kapisi.sh', [], JSON.stringify(girdi));
const gunluk = (kok) => existsSync(GUNLUK(kok))
  ? readFileSync(GUNLUK(kok), 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];
const ekle = (kok, o) => appendFileSync(GUNLUK(kok), JSON.stringify({ surum: 1, ts: new Date().toISOString(), donem: 'DONEM-S7', ...o }) + '\n');
const evre = (kok) => readFileSync(GOSTERGE(kok), 'utf8').split('\n')[0].split('\t')[2];

// Standart altı alanlı zarf + ek satırlar
function zarf({ biten = 'G-01 — iş bitti · kanıt: 00_pano/PANO.md:1', ek = [] } = {}) {
  return [`BİTEN: ${biten}`, 'ÇATAL: yok', 'DEĞERLENDİRMEDİKLERİM: yok', 'SIRADAKİ: kapalı',
          'TÜRETME-İZİ: yok', 'GERİ-ÇEKİLEN: yok', ...ek].join('\n') + '\n';
}
const brifingZarfi = (satirlar) => ({
  agent_type: 'disgoz',
  last_assistant_message: zarf({ biten: 'BRIFING — durum okundu · kanıt: 00_pano/PANO.md:1', ek: satirlar }),
});
const BES_SATIR = [
  'BRIFING-1: Kahve dükkânının stok ekranı yapılıyor; sırada raporlar var.',
  'BRIFING-2: Kutunun bitiş hâli stok ekranını istiyor, ekip ona çalışıyor.',
  'BRIFING-3: normal — sapma görmedim.',
  'BRIFING-4: Sıradaki kutu için senden fiyat listesini isteyecekler.',
  'BRIFING-5: Testlerin gerçekten koştuğunu göremedim; çalıştırma yetkim yok.',
];
const karneZarfi = ({ gorev = 'KAPANIS', hukum = 'YEŞİL', bulgu = null } = {}) => ({
  agent_type: 'dogrulayici',
  last_assistant_message: zarf({
    biten: 'G-01 — karne verildi · kanıt: 00_pano/PANO.md:1',
    ek: [`KARNE-GOREV: ${gorev}`, `HÜKÜM: ${hukum}`, 'MADDELER: kanıt=DOĞRU',
         ...(bulgu ? [`BULGU-GOREV: ${bulgu}`] : [])],
  }),
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F1-5a · üretim bitince kapanış evresi kendiliğinden açılır
// ══════════════════════════════════════════════════════════════════════════════════════════

test('F1-5a: açık üretim görevi kalmayınca evre KAPANIS olur ve dış göz sevk edilir (ikinci komut YOK)', () => {
  const kok = kurulum();
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'dönem sürmeli (kapanış evresi): ' + r.stdout);
  assert.match(r.stderr, /subagent_type: disgoz/);
  assert.match(r.stderr, /^gorev: BRIFING$/m);
  assert.equal(evre(kok), 'kapanis', 'gösterge evresi yerinde değişmeli');
  const g = gunluk(kok);
  assert.ok(g.some((j) => j.tip === 'evre-gecis' && j.hedef === 'kapanis'), 'evre geçişi izsiz kalmamalı');
  // Dönem KİMLİĞİ ve açılış damgası korunur: bu yeni bir dönem değil, aynı dönemin evresi.
  assert.equal(readFileSync(GOSTERGE(kok), 'utf8').split('\n')[0].split('\t')[0], 'DONEM-S7');
  assert.match(readFileSync(GOSTERGE(kok), 'utf8'), /^damga\t/m);
});

test('F1-5a: brifing düştükten sonra kapanış karnesi istenir; TAZE YEŞİL karne dönemi kapatır', () => {
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400, sapma: 'yok' });
  const r1 = sevk(kok);
  assert.equal(r1.status, 2);
  assert.match(r1.stderr, /subagent_type: dogrulayici/);
  assert.match(r1.stderr, /^gorev: KAPANIS$/m);

  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r2 = sevk(kok);
  assert.equal(r2.status, 0, 'YEŞİL kapanış karnesi dönemi bitirmeli');
  assert.match(r2.stdout, /DÖNEM KAPANDI/);
  assert.match(r2.stdout, /muhur paketinin dordu/);
  assert.match(r2.stdout, /BRIFING\.md/, 'sahibe mühür paketinin dört parçası işaretçiyle verilmeli');
  assert.ok(!existsSync(GOSTERGE(kok)), 'gösterge silinmeli');
});

test('F1-5a: kapanış karnesi BAYATSA (sonra iş zarfı geldi) yeniden denetim istenir', () => {
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'bayat karne dönemi kapatmamalı: ' + r.stdout);
  assert.match(r.stderr, /gorev: KAPANIS/);
  assert.ok(gunluk(kok).some((j) => j.tip === 'bulgu' && j.cins === 'bayat-karne' && j.gorev === 'KAPANIS'));
});

test('F1-5a: BRİFİNG zarfı İŞ zarfı SAYILMAZ — kapanış karnesini bayatlatmaz', () => {
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  // Dış gözün KENDİ zarfı karneden SONRA düşer (gerçek sırayla): iş sayılsaydı karne bayat
  // görünür ve dönem sonsuza dek yeniden denetim isterdi.
  ekle(kok, { tip: 'zarf', ajan: 'disgoz', gorev: 'BRIFING', sinif: 'brifing', alanlar: { catal: 'yok' } });
  const r = sevk(kok);
  assert.equal(r.status, 0, 'dönem kapanmalıydı: ' + r.stdout + r.stderr);
  assert.match(r.stdout, /DÖNEM KAPANDI/);
});

test('F1-5a/bütçe: doğrulama çağrıları bütçeyi YEMEZ — kutu kapanabilir (eski mekanikte kapanamıyordu)', () => {
  // Eski sayım HER sevk kararını sayıyordu: bütçe 2 olan bir kutuda 1 üretim + 1 karne çağrısı
  // bütçeyi doldurup dönemi durduruyordu — kutu mekanik olarak kapanamıyordu.
  const kok = kurulum({ kutu: kutuMetni({ butce: '2' }) });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'dogrulayici', is_tipi: 'dogrulama' });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'bütçe dolmuş sayılmamalı: ' + r.stdout);
  assert.equal(evre(kok), 'kapanis');
});

test('F1-5a/bütçe: ÜRETİM tavanı dolunca yeni iş kurulmaz (fren yerinde duruyor)', () => {
  const kok = kurulum({
    kutu: kutuMetni({ butce: '1', gorevler: [{ id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'açık', kanit: 'test: t' }] }),
  });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-09', rol: 'uretici', is_tipi: 'uretim' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-09', sinif: 'is', alanlar: { catal: 'yok' } });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /butce tavani doldu/);
  assert.match(r.stdout, /uretim cagrisi/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F1-5b · kırmızı kapanış karnesi üçüncü komut istemez
// ══════════════════════════════════════════════════════════════════════════════════════════

test('F1-5b: KIRMIZI kapanış karnesi evreyi YAPIM"a döndürür ve bulguyu sevk eder', () => {
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'KIRMIZI',
              maddeler: 'ekran boş=YANLIŞ', bulgu_gorev: 'G-01' });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'dönem kilitlenmemeli: ' + r.stdout);
  assert.equal(evre(kok), 'yapim', 'evre üretime dönmeli');
  assert.match(r.stderr, /subagent_type: uretici/);
  assert.match(r.stderr, /^gorev: G-01$/m);
  assert.match(r.stderr, /ek-okuma: 00_pano\/kapanis-bulgulari\.txt/);
  const bulgu = readFileSync(join(kok, '00_pano', 'kapanis-bulgulari.txt'), 'utf8');
  assert.match(bulgu, /HUKUM: KIRMIZI/);
  assert.match(bulgu, /ekran boş=YANLIŞ/, 'bulgu metni KARNE kaydından gelmeli (sevkin kalemi değil)');
  assert.match(bulgu, /YENIDEN ACILMAZ/, 'düzeltme kuralı işaretçide yazılı olmalı');
  assert.ok(gunluk(kok).some((j) => j.tip === 'evre-gecis' && j.hedef === 'yapim'));
});

test('F1-5b: gidiş-dönüş tavanı 2 — üçüncüsünde dönem kapanır (sonsuz sarkaç yok)', () => {
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'evre-gecis', hedef: 'yapim', sebep: 'birinci' });
  ekle(kok, { tip: 'evre-gecis', hedef: 'yapim', sebep: 'ikinci' });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'KIRMIZI',
              maddeler: 'x=YANLIŞ', bulgu_gorev: 'G-01' });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /gidis-donusu doldu/);
  assert.ok(!existsSync(GOSTERGE(kok)));
});

test('F1-5b: BULGU-GOREV çözülmeyen KIRMIZI karne duran kapıdır (sevk görev İCAT ETMEZ)', () => {
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', yol: '03_roller/disgoz/BRIFING.md', bayt: 400 });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'KIRMIZI', maddeler: 'x=YANLIŞ' });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /duzeltilecek gorev cozulmuyor/);
});

test('F1-5b kapı: KAPANIS + KIRMIZI karnede BULGU-GOREV satırı ZORUNLU; uydurma numara geçmez', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const eksik = kapi(kok, karneZarfi({ hukum: 'KIRMIZI' }));
  assert.equal(eksik.status, 2, 'BULGU-GOREV yoksa karne dönüşü geri dönmeli');
  assert.match(eksik.stderr, /BULGU-GOREV/);

  const uydurma = kapi(kok, karneZarfi({ hukum: 'KIRMIZI', bulgu: 'G-77' }));
  assert.equal(uydurma.status, 2, 'kutuda olmayan görev geçmemeli');
  assert.match(uydurma.stderr, /kutuda olmayan gorev/);

  const dogru = kapi(kok, karneZarfi({ hukum: 'KIRMIZI', bulgu: 'G-01' }));
  assert.equal(dogru.status, 0, dogru.stderr);
  const k = gunluk(kok).find((j) => j.tip === 'karne');
  assert.equal(k.bulgu_gorev, 'G-01', 'bulgu görevi karne kaydına geçmeli (sevk oradan okur)');

  // YEŞİL karnede satır aranmaz (yalnız kırmızı dalın şartı).
  const yesil = kapi(kok, karneZarfi({ hukum: 'YEŞİL' }));
  assert.equal(yesil.status, 0, yesil.stderr);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F1-5c · dış göz brifingi dönem içinde üretilir (koltuk YAZAMAZ kalır)
// ══════════════════════════════════════════════════════════════════════════════════════════

test('F1-5c: beş başlıklı brifing zarfı → BRIFING.md kapı eliyle yazılır + brifing kaydı düşer', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const r = kapi(kok, brifingZarfi(BES_SATIR));
  assert.equal(r.status, 0, r.stderr);
  const b = readFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), 'utf8');
  assert.match(b, /^Tarih: \d{4}-\d{2}-\d{2}$/m, 'açılış hatırlatmasının okuduğu makine-okur tarih satırı');
  assert.match(b, /## 1 · Ne yapılıyor/);
  assert.match(b, /## 5 · Bakamadığım\/bilmediğim/);
  assert.match(b, /stok ekranı/, 'gövde koltuğun kendi cümlesi olmalı');
  assert.match(b, /koltuk yazamaz/, 'dosyanın kim tarafından yazıldığı dosyada yazılı olmalı');
  const g = gunluk(kok);
  const kayit = g.find((j) => j.tip === 'brifing');
  assert.ok(kayit, 'brifing kaydı düşmeli (sevk bunu okur)');
  assert.equal(kayit.sapma, 'yok');
  assert.equal(g.find((j) => j.tip === 'zarf').sinif, 'brifing', 'zarf sınıfı iş DEĞİL');
});

test('F1-5c: sapma sayan brifingde KANIT zorunlu; eksik başlık ve tavan aşımı geri döner', () => {
  const kok = kurulum({ donem: 'kapanis' });
  // Beyansız serbest cümle: artık BEYAN kapısında durur (eskiden kanıt kapısında dururdu).
  const beyansiz = [...BES_SATIR];
  beyansiz[2] = 'BRIFING-3: Kabul ölçütü değişmiş gibi duruyor, üç madde saydım.';
  const r1 = kapi(kok, brifingZarfi(beyansiz));
  assert.equal(r1.status, 2, 'beyansız serbest cümle geçmemeli');
  assert.match(r1.stderr, /sapma beyanı çözülmüyor/);

  // Beyan VAR, kanıt YOK → kanıt kapısı.
  const kanitsiz = [...BES_SATIR];
  kanitsiz[2] = 'BRIFING-3: sapma var — kabul ölçütü değişmiş gibi duruyor, üç madde saydım.';
  const r1b = kapi(kok, brifingZarfi(kanitsiz));
  assert.equal(r1b.status, 2, 'kanıtsız sapma geçmemeli');
  assert.match(r1b.stderr, /kanıt/);

  const kanitli = [...BES_SATIR];
  kanitli[2] = 'BRIFING-3: sapma var — kabul ölçütü değişmiş: 01_kutular/KT-901-dikis/KUTU.md:12 satırında yeni cümle var.';
  assert.equal(kapi(kok, brifingZarfi(kanitli)).status, 0, 'kanıt işaretçisi taşıyan sapma geçmeli');
  assert.equal(gunluk(kok).find((j) => j.tip === 'brifing').sapma, 'var');

  const eksik = kapi(kok, brifingZarfi(BES_SATIR.slice(0, 4)));
  assert.equal(eksik.status, 2);
  assert.match(eksik.stderr, /brifing eksik/);

  const uzun = [...BES_SATIR];
  uzun[0] = 'BRIFING-1: ' + 'çok uzun bir anlatım '.repeat(200);
  const r2 = kapi(kok, brifingZarfi(uzun));
  assert.equal(r2.status, 2, 'tavan aşan brifing kırpılmaz, geri döner');
  assert.match(r2.stderr, /tavanı aşıldı/);
});

// ── Hasım turu 2026-07-30 · brifing kapısının dört deliği ───────────────────────────────────

test('hasım-1: «Normal değil …» sapma İLAN EDER — kanıtsız geçemez, günlüğe «yok» yazılamaz', () => {
  const kok = kurulum({ donem: 'kapanis' });
  // Eski desen (/^normal\b/i) bu satırı «normal» sayıyordu: kanıt kapısı hiç aranmıyor,
  // günlüğe `sapma: "yok"` düşüyordu — yani sapma ilan eden brifing, tüm gözlerin okuduğu
  // veri katmanına «sapma yok» diye geçiyordu. Türkçede en doğal ifade budur.
  const olumsuz = [...BES_SATIR];
  olumsuz[2] = 'BRIFING-3: Normal değil — kabul ölçütü kutuda değişmiş görünüyor.';
  const r = kapi(kok, brifingZarfi(olumsuz));
  assert.equal(r.status, 2, '«Normal değil» kanıtsız geçmemeli: ' + r.stdout);
  assert.match(r.stderr, /kanıt/);

  const kanitli = [...BES_SATIR];
  kanitli[2] = 'BRIFING-3: Normal değil — kabul ölçütü değişmiş: 01_kutular/KT-901-dikis/KUTU.md:12';
  assert.equal(kapi(kok, brifingZarfi(kanitli)).status, 0, 'kanıtlı olumsuz beyan geçmeli');
  assert.equal(gunluk(kok).find((j) => j.tip === 'brifing').sapma, 'var', 'olumsuz beyan günlüğe «var» düşmeli');
});

test('hasım-2: BRIFING başlıkları ÇOK SATIRLI olabilir — kanıt devam satırındayken de sayılır', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const cok = [...BES_SATIR];
  cok[2] = 'BRIFING-3: sapma var — üç madde:\n- kabul ölçütü değişmiş\n  kanıt: 01_kutular/KT-901-dikis/KUTU.md:12\n- ikinci madde';
  const r = kapi(kok, brifingZarfi(cok));
  assert.equal(r.status, 0, 'sözleşmenin istediği çok maddeli brifing geri çevrilmemeli: ' + r.stderr);
  const b = readFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), 'utf8');
  assert.match(b, /ikinci madde/, 'devam satırları sessizce kırpılmamalı');
});

test('hasım-3: kanıt işaretçisinin VARLIĞI denetlenir; hex görünümlü sözcük commit sayılmaz', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const kopuk = [...BES_SATIR];
  kopuk[2] = 'BRIFING-3: sapma var — 01_kutular/OLMAYAN-KUTU/KUTU.md:12 satırında değişiklik.';
  const r1 = kapi(kok, brifingZarfi(kopuk));
  assert.equal(r1.status, 2, 'kopuk işaretçi kanıt sayılmamalı');
  assert.match(r1.stderr, /işaretçi kopuk|ÇÖZÜLEN kanıt yok/);

  const sahteHex = [...BES_SATIR];
  // "defaced" yalnız a-f harflerinden oluşur ve 7 hanedir — eski desen onu commit sayıyordu.
  sahteHex[2] = 'BRIFING-3: sapma var — kabul defaced gibi duruyor.';
  const r2 = kapi(kok, brifingZarfi(sahteHex));
  assert.equal(r2.status, 2, 'yalnız harflerden oluşan sözcük commit kanıtı sayılmamalı');
});

test('hasım-4: brifing yolu sembolik bağsa kapı YAZMAZ (kanca korunan yollara araç olamaz)', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const hedef = join(kok, 'tools', 'sevk', 'kurban.txt');
  writeFileSync(hedef, 'dokunulmamalı\n');
  const yol = join(kok, '03_roller', 'disgoz', 'BRIFING.md');
  rmSync(yol, { force: true });
  symlinkSync(hedef, yol);
  const r = kapi(kok, brifingZarfi(BES_SATIR));
  assert.equal(r.status, 2, 'bağ üzerinden yazım engellenmeli: ' + r.stdout);
  assert.match(r.stderr, /sembolik bağ/);
  assert.equal(readFileSync(hedef, 'utf8'), 'dokunulmamalı\n', 'bağın hedefi DEĞİŞMEMELİ');
});

test('F1-5c: dış gözün BİTEN jetonu BRIFING olabilir; üretim rolünde G-NN şartı SÜRER', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const uretici = kapi(kok, {
    agent_type: 'uretici',
    last_assistant_message: zarf({ biten: 'BRIFING — iş bitti · kanıt: 00_pano/PANO.md:1' }),
  });
  assert.equal(uretici.status, 2, 'üretim rolü görev numarası yazmak zorunda');
  assert.match(uretici.stderr, /görev numarası yok/);
});

test('F1-5c: dış göz koltuğu kadroda yoksa kapanış duran kapıdır (brifingsiz mühür yok)', () => {
  const kok = kurulum({ donem: 'kapanis', koltuk: ['dogrulayici', 'catal-denetcisi', 'kurulum-denetcisi'] });
  const r = sevk(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /kapılanma eksik/, 'koltuksuz dönem zaten açılmamalı');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F1-5d/e · kutu adı seçimli · kip bayrağı kalktı
// ══════════════════════════════════════════════════════════════════════════════════════════

test('F1-5d: /donem kutu adı verilmezse tek açık kutuyu seçer; iki kutuda DURUR', () => {
  const kok = kurulum({ donem: null });
  const r = kos(kok, 'donem-ac.sh', ['', 'yapim', 'tatbikat']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp('kutu : ' + KUTU_ADI));

  kos(kok, 'donem-ac.sh', ['kapat']);
  mkdirSync(join(kok, '01_kutular', 'KT-902-ikinci'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', 'KT-902-ikinci', 'KUTU.md'), kutuMetni());
  const r2 = kos(kok, 'donem-ac.sh', ['', 'yapim', 'tatbikat']);
  assert.equal(r2.status, 1, 'iki kutuda tahmin edilmemeli');
  assert.match(r2.stderr, /birden çok açık kutu/);
  assert.match(r2.stderr, /KT-902-ikinci/, 'adaylar sayılmalı');
});

test('F1-5e: gösterge DÖRT alan (kip yok); eski beş alanlı gösterge geri-uyumla okunur', () => {
  const kok = kurulum({ donem: null });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 0, r.stderr);
  const alanlar = readFileSync(GOSTERGE(kok), 'utf8').split('\n')[0].split('\t');
  assert.equal(alanlar.length, 4);
  assert.equal(alanlar[3], 'tatbikat');
  assert.ok(!/kip/.test(r.stdout), 'sahip yüzeyinde kip satırı kalmamalı');

  // Eski biçim (kimlik·kutu·tür·KİP·sınıf): sınıf 5. alandan okunmalı — `gercek` sanılıp
  // watchdog şartına takılmamalı (tatbikat muafiyeti kaybolursa eski dönemler kilitlenirdi).
  writeFileSync(GOSTERGE(kok), `DONEM-ESKI\t${KUTU_ADI}\tyapim\tbassiz\ttatbikat\ndamga\t${new Date().toISOString()}\n`);
  ekle(kok, { tip: 'zarf', donem: 'DONEM-ESKI', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', donem: 'DONEM-ESKI', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r2 = sevk(kok);
  assert.equal(r2.status, 2, 'eski gösterge dönemi öldürmemeli: ' + r2.stdout);
  assert.match(r2.stderr, /disgoz/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// F1-5f · izin satırı kutu şemasının parçası (kapı tarafı guard.test.mjs'de)
// ══════════════════════════════════════════════════════════════════════════════════════════

test('F1-5f: kurulum kapısı İZİN satırını ZORUNLU tutar ve sözlük dışı jetonu keser', () => {
  const yok = kurulum({ kutu: kutuMetni().split('\n').filter((s) => !/^İZİN:/.test(s)).join('\n') });
  const r1 = kos(yok, 'kurulum-kapisi.sh', [KUTU_ADI, yok]);
  assert.equal(r1.status, 1);
  assert.match(r1.stdout, /İZİN satiri yok/);

  const uydurma = kurulum({ kutu: kutuMetni({ izin: 'hepsi' }) });
  const r2 = kos(uydurma, 'kurulum-kapisi.sh', [KUTU_ADI, uydurma]);
  assert.equal(r2.status, 1);
  assert.match(r2.stdout, /sozluk disi jeton: hepsi/);

  const dogru = kurulum({ kutu: kutuMetni({ izin: 'git-obje kutu-ciktilari' }) });
  const r3 = kos(dogru, 'kurulum-kapisi.sh', [KUTU_ADI, dogru]);
  assert.match(r3.stdout, /geçti\s+· İZİN: git-obje kutu-ciktilari/);
});

test('F1-5f: izin engeli sahibin kuyruğuna SABİT cümleyle düşer (ajan kalemi geçmez)', () => {
  const kok = kurulum();
  ekle(kok, { tip: 'izin-engel', ajan: 'uretici', gorev: 'G-01', kaynak: ['kanca'], beyan: 'git push engellendi' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  const r = sevk(kok);
  assert.equal(r.status, 2, r.stdout);
  const kuyruk = readFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), 'utf8');
  assert.match(kuyruk, /izin kapısına takıldı ve ATLANDI \(G-01\)/);
  assert.match(kuyruk, /kaynak: izin-engeli G-01/);
  assert.ok(!/git push engellendi/.test(kuyruk), 'ajanın beyanı sahip yüzeyine kopyalanmamalı');

  // İkinci turda tekrar YAZILMAZ (tekilleştirme kaynak imzasıyla).
  sevk(kok);
  const ikinci = readFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), 'utf8');
  assert.equal(ikinci.match(/izin-engeli G-01/g).length, 1);
});

test('F1-5f: çekilme kapısı ilk kutunun İZİN satırında kutu-ciktilari ARAR (değer eşlenir)', () => {
  // Kapı LİSTE emsalini izler: "dolu mu" değil, DEĞER eşlenir. Satır sessizce `yok`a dönerse
  // ekip kutunun dört çıktısının ikisini (BITTI_TANIMI · KUTU_PLANI) hiç yazamaz ve bu kurulum
  // denetiminde YEŞİL görünürdü — kutu bitirilemez hâlde teslim edilirdi.
  const kalip = readFileSync(join(KOK_REPO, '00_genesis', 'ILK_KUTU_KALIBI.md'), 'utf8');
  const govde = kalip.split('\n');
  const yorumSonu = govde.findIndex((l) => l.trimEnd().endsWith('-->'));
  const kabuk = govde.slice(yorumSonu + 1).join('\n').replaceAll('«KOORDİNATÖR-SLUG»', 'koordinator');
  assert.match(kabuk, /^İZİN:\s+kutu-ciktilari/m, 'kalıbın kendisi doğru değeri taşımalı');

  const denetim = readFileSync(join(KOK_REPO, 'tools', 'guard', 'kurulum-denetimi.sh'), 'utf8');
  assert.match(denetim, /İZİN\[\[:space:\]\]\*:\.\*kutu-ciktilari/,
    'çekilme kapısı İZİN değerini eşlemeli (yalnız varlığını değil)');
  assert.match(denetim, /"BİTİŞ HÂLİ" "KANIT" "KISIT" "BÜTÇE" "İZİN" "LİSTE"/,
    'duruş sözleşmesinin ALTI satırı da kapıda aranmalı');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// Hasım turu 2026-07-30 · kapanış dalının süzgeçleri, bütçesi ve dürüstlüğü
// ══════════════════════════════════════════════════════════════════════════════════════════

test('hasım-5: kapanış karnesi PAS görevi adresliyorsa üretim AÇILMAZ (duran kapı)', () => {
  // Delik: hedef seçiminin TEK koşulu numaranın tabloda bulunmasıydı. Yapım dalının beş engeli
  // (pas · mühür-bekliyor · önkoşul · BEKLETİR · dönmemiş çağrı) bu evrede hiç sorulmuyordu.
  // `pas` otomatik yolda ULAŞILABİLİR: acikVar pas'ı saymaz, yani pas görevli kutu kapanış
  // evresine geçer ve karne o numarayı gösterince "pas görevde iş yapılmaz" kuralı deliniyordu.
  const kok = kurulum({ kutu: kutuMetni({ gorevler: [
    { id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'kapalı', kanit: '00_pano/PANO.md' },
    { id: 'G-02', is: 'vazgeçildi', sahip: 'uretici', durum: 'pas', kanit: '—' },
  ] }) });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', donem: 'DONEM-S7', yol: '03_roller/disgoz/BRIFING.md' });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'KIRMIZI', maddeler: 'y=YANLIŞ', bulgu_gorev: 'G-02' });
  const r = sevk(kok);
  assert.equal(r.status, 0, 'duran kapı olmalı, sevk değil: ' + r.stdout);
  assert.match(r.stdout, /uygun degil|PAS/i, 'sebep adıyla söylenmeli: ' + r.stdout);
  assert.doesNotMatch(r.stdout, /AC: Agent araciyla/, 'pas göreve üretim koltuğu sürülmemeli');
});

test('hasım-6: kapanış düzeltmesi BÜTÇEYE tabidir (dolu bütçeyle ikinci tavan açılmaz)', () => {
  const kok = kurulum({ kutu: kutuMetni({ butce: '1' }) });
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim', donem: 'DONEM-S7' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'yok' } });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'G-01', hukum: 'YEŞİL', maddeler: 'x=DOĞRU' });
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', donem: 'DONEM-S7', yol: '03_roller/disgoz/BRIFING.md' });
  ekle(kok, { tip: 'karne', ajan: 'dogrulayici', gorev: 'KAPANIS', hukum: 'KIRMIZI', maddeler: 'y=YANLIŞ', bulgu_gorev: 'G-01' });
  const r = sevk(kok);
  assert.equal(r.status, 0, 'bütçesi dolu dönemde düzeltme açılmamalı: ' + r.stdout);
  assert.match(r.stdout, /butcesi doldu/);
  // ve sahibin yönlendirildiği dosya BU turun bulgularını taşımalı (bayat değil).
  const bulgu = readFileSync(join(kok, '00_pano', 'kapanis-bulgulari.txt'), 'utf8');
  assert.match(bulgu, /HUKUM: KIRMIZI/);
  assert.match(bulgu, /GIDIS-DONUS: 0\/2/);
});

test('hasım-7: DOĞRULANAMADI adres İSTEMEZ — karne düşer, dönem sahibe kalır', () => {
  const kok = kurulum({ donem: 'kapanis' });
  // Kapı: adres satırı olmadan da zarf GEÇMELİ (eskiden `!== YEŞİL` şartı adres istiyordu ve
  // göz ya adres uyduracak ya karne kaydı hiç düşmeyecekti).
  const r1 = kapi(kok, karneZarfi({ gorev: 'KAPANIS', hukum: 'DOĞRULANAMADI' }));
  assert.equal(r1.status, 0, 'DOĞRULANAMADI zarfı geri çevrilmemeli: ' + r1.stderr);
  const k = gunluk(kok).find((j) => j.tip === 'karne' && j.gorev === 'KAPANIS');
  assert.ok(k, 'hüküm kaybolmamalı — karne kaydı düşmeli');
  assert.equal(k.hukum, 'DOĞRULANAMADI');
  // Sevk: üretim açmaz, sahibe bırakır.
  ekle(kok, { tip: 'brifing', ajan: 'disgoz', donem: 'DONEM-S7', yol: '03_roller/disgoz/BRIFING.md' });
  const r2 = sevk(kok);
  assert.equal(r2.status, 0, 'duran kapı olmalı: ' + r2.stdout);
  assert.match(r2.stdout, /DOĞRULANAMADI/);
  assert.doesNotMatch(r2.stdout, /AC: Agent araciyla/, 'adres yokken üretim açılmamalı');
});

test('hasım-8: KIRMIZI karnede adres ZORUNLU kalır (DOĞRULANAMADI kaçış yolu değil)', () => {
  const kok = kurulum({ donem: 'kapanis' });
  const r = kapi(kok, karneZarfi({ gorev: 'KAPANIS', hukum: 'KIRMIZI' }));
  assert.equal(r.status, 2, 'adressiz KIRMIZI geçmemeli');
  assert.match(r.stderr, /BULGU-GOREV/);
  assert.match(r.stderr, /DOĞRULANAMADI/, 'gözü doğru hükme yönlendirmeli — adres uydurmaya değil');
});

test('hasım-12: çatal süzgeci KAPANIŞ evresinde de koşar (evreden bağımsız)', () => {
  // Delik: süzgeç bloğu `if (TUR === "kapanis") kapanisDali()` çağrısının ALTINDAYDI ve
  // kapanisDali her dalında süreci bitiriyor — kapanış evresinde doğan çatal hiçbir zaman
  // süzgeçten geçmiyor, karne YEŞİL gelirse kuyruğa da hiç düşmüyordu.
  const kok = kurulum({ donem: 'kapanis' });
  ekle(kok, { tip: 'zarf', ajan: 'uretici', gorev: 'G-01', sinif: 'is', alanlar: { catal: 'dolu' } });
  const r = sevk(kok);
  assert.equal(r.status, 2, 'dönem sürmeli (sevk talimatı)');
  assert.match(r.stderr, /catal-denetcisi/, 'kapanış evresinde de süzgeç açılmalı: ' + r.stderr);
});

test('hasım-13: KURULUM dönemi kapanırken "kapanış denetimi" adı KULLANILMAZ', () => {
  // Delik: KAPAT kararı iki dal tarafından paylaşılıyor ve kabuk sabit metin basıyordu —
  // kurulum dönemi kapanınca hiç koşmamış bir kapanış denetiminin YEŞİLİ hem sahip ekranına
  // hem günlüğe (`J_sinif=kapanis-denetimi-yesil`) yazılıyordu.
  const kok = kurulum({ donem: 'kurulum' });
  ekle(kok, { tip: 'karne', ajan: 'kurulum-denetcisi', gorev: 'KURULUM', hukum: 'YEŞİL', maddeler: 'x=DOĞRU', donem: 'DONEM-S7' });
  const r = sevk(kok);
  assert.equal(r.status, 0, 'kurulum dönemi kapanmalı: ' + r.stdout);
  assert.match(r.stdout, /kurulum denetimi YEŞİL/, 'doğru denetimin adı yazılmalı');
  assert.doesNotMatch(r.stdout, /kapanış denetimi YEŞİL/, 'koşmamış denetimin yeşili yazılamaz');
});

// ── Hasım turu 2026-07-30 · açılış töreni çapayı KATI SÖZLÜKLE üretir ────────────────────

test('hasım-16: tören İZİN satırını kapalı sözlükle ayrıştırır ve çapayı yazar', () => {
  const kok = kurulum({ donem: false, kutu: kutuMetni({ izin: 'mcp git-obje', butce: '4' }) });
  const r = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r.status, 0, 'dönem açılmalı: ' + r.stderr);
  const capa = readFileSync(join(kok, 'tools', 'sevk', '.donem-capa'), 'utf8');
  assert.match(capa, /^izin\tmcp git-obje$/m, 'çapa jetonları taşımalı: ' + capa);
  assert.match(capa, /^butce\t4$/m, 'bütçe de çapaya inmeli (kutuya değil çapaya bakılır)');
  // Kapatma çapayı da siler: eski dönemin izni diskte kalmaz.
  kos(kok, 'donem-ac.sh', ['kapat']);
  assert.equal(existsSync(join(kok, 'tools', 'sevk', '.donem-capa')), false, 'çapa göstergeyle birlikte ölmeli');
});

test('hasım-17: sözlük dışı jeton ve «yok (…)» tuzağı dönemi AÇTIRMAZ', () => {
  // Eski ayrıştırıcı TOPLAYICIYDI: «İZİN: yok (disa gerekmiyor)» satırı `disa` sınıfını
  // fiilen VERİYORDU — cümlenin anlamının tam tersi. Ve sözlük dışı jeton sessizce
  // "izin yok"a düşüyordu, yani yazım hatası sessiz daralma üretiyordu.
  const tuzak = kurulum({ donem: false, kutu: kutuMetni({ izin: 'yok (disa gerekmiyor)' }) });
  const r1 = kos(tuzak, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r1.status, 0, '«yok» ile başlayan satır geçerli olmalı: ' + r1.stderr);
  const capa = readFileSync(join(tuzak, 'tools', 'sevk', '.donem-capa'), 'utf8');
  assert.match(capa, /^izin\t$/m, '«yok (…)» hiçbir sınıf VERMEMELİ: ' + capa);

  const hatali = kurulum({ donem: false, kutu: kutuMetni({ izin: 'disaa' }) });
  const r2 = kos(hatali, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(r2.status, 1, 'sözlük dışı jeton dönemi açtırmamalı');
  assert.match(r2.stderr, /sözlük dışı jeton/);
  assert.equal(existsSync(join(hatali, 'tools', 'sevk', '.donem-acik')), false, 'gösterge yazılmamalı');
});

test('hasım-18 (uçtan uca): tören çapayı yazar; kutu SONRADAN değişse de sevk çapayı dinler', () => {
  // Deliğin tam senaryosu: dönem içinde ajan KUTU.md yazar (tasarımın kendi gereği — görev
  // listesini G-01 doğurur). Eski mekanikte o yazımla üretim tavanını ve izin listesini de
  // değiştirebiliyordu. Zincir: tören → çapa → sevk. Kutu artık sevkin okuduğu yer değil.
  const kok = kurulum({ donem: false, kutu: kutuMetni({ butce: '1' }) });
  const acilis = kos(kok, 'donem-ac.sh', [KUTU_ADI, 'yapim', 'tatbikat']);
  assert.equal(acilis.status, 0, 'dönem açılmalı: ' + acilis.stderr);

  // Ajan kutuyu yeniden yazıyor: bütçeyi 99 yapıyor, kendine `yazim` izni veriyor.
  writeFileSync(join(kok, '01_kutular', KUTU_ADI, 'KUTU.md'),
    kutuMetni({ butce: '99', izin: 'yazim disa', gorevler: [
      { id: 'G-01', is: 'iş', sahip: 'uretici', durum: 'açık', kanit: '00_pano/PANO.md' },
      { id: 'G-02', is: 'iş', sahip: 'uretici', durum: 'açık', kanit: '00_pano/PANO.md' },
    ] }));
  // Bir üretim çağrısı zaten açılmış olsun (çapadaki bütçe 1).
  ekle(kok, { tip: 'sevk-karar', gorev: 'G-01', rol: 'uretici', is_tipi: 'uretim',
              donem: readFileSync(GOSTERGE(kok), 'utf8').split('\t')[0] });
  const r = sevk(kok);
  assert.match(r.stdout + r.stderr, /butce tavani doldu/,
    'sevk kutunun yeni 99luk bütçesini DEĞİL, çapadaki 1i uygulamalı: ' + r.stdout + r.stderr);
});
