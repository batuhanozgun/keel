// catal.test.mjs — E3: soru kanalı (karar alanı · çatal kuyruğu · biçim kapısının E3 hattı).
// Sözleşme: docs/superpowers/plans/2026-07-27-e3-soru-kanali-tasarisi.md
//   §2 karar alanı · §3 denetçi dönüşü · §4 kapının beş adımı · §5 kuyruk mekaniği.
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
const KUYRUK = (kok) => join(kok, '00_pano', 'SENDE_BEKLEYEN.md');
const KARAR = (kok) => join(kok, '02_kanon', 'KARAR_ALANI.md');

// ── Karar alanı: kalıptan kurulu-sim üretimi (Bölüm A aynen, Bölüm B doldurulmuş) ──────────
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
  if (!profil) return s;                                   // «alanlar» duruyor → profil BOŞ
  let i = 0;
  return s.replace(/«[^»]*»/gs, () => KARAR_GOVDE[i++ % KARAR_GOVDE.length]);
}

function kurulum({ donem = true, kadro = ['po', 'catal-denetcisi'], profil = true, kararAlani = true } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'catal-test-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '01_kutular', 'KT-001'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  for (const b of ['ortak.sh', 'kilit.sh', 'zarf-ekle.sh', 'zarf-bicim-kapisi.sh', 'karar-alani.sh', 'catal-kuyruk.sh']) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  // cevap-sozlugu.txt VERİ dosyasıdır ve catal-kuyruk.sh onu FAIL-CLOSED arar: kurulu bir
  // projede her zaman vardır, o yüzden simülasyon da onu taşımak zorunda (F1-5g).
  try { copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'cevap-sozlugu.txt'), join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt')); } catch {}
  for (const a of kadro) writeFileSync(join(kok, '.claude', 'agents', a + '.md'), '# test ajanı\n');
  if (donem) writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), 'DONEM-TEST\tKT-001\t2026-07-27T10:00:00Z\n');
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  writeFileSync(join(kok, '01_kutular', 'KT-001', 'KUTU.md'), '# KUTU\n');
  if (kararAlani) writeFileSync(KARAR(kok), kararAlaniMetni({ profil }));
  return kok;
}

const kos = (kok, ad, args = [], girdi = undefined) =>
  spawnSync('bash', [BETIK(kok, ad), ...args], {
    encoding: 'utf8', input: girdi,
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
const kapi = (kok, girdi) => kos(kok, 'zarf-bicim-kapisi.sh', [], typeof girdi === 'string' ? girdi : JSON.stringify(girdi));
const gunluk = (kok) =>
  existsSync(GUNLUK(kok)) ? readFileSync(GUNLUK(kok), 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];

// Zarf metni kurucu: 6 üst alan + isteğe bağlı ekler. Etiketler AYRI satır başında (§4 kuralı).
function zarf({ biten = 'G-20 — iş bitti · kanıt: 00_pano/PANO.md:1', catal = 'yok', ceviri, etki, bekletir,
                degerlendirmediklerim = 'yok', siradaki = 'kapalı', turetme = 'yok', geri = 'yok', ek = '' } = {}) {
  const l = [`BİTEN: ${biten}`, `ÇATAL: ${catal}`];
  if (ceviri !== undefined) l.push(`ÇEVİRİ: ${ceviri}`);
  if (etki !== undefined) l.push(`ETKİ: ${etki}`);
  if (bekletir !== undefined) l.push(`BEKLETİR: ${bekletir}`);
  l.push(`DEĞERLENDİRMEDİKLERİM: ${degerlendirmediklerim}`, `SIRADAKİ: ${siradaki}`,
         `TÜRETME-İZİ: ${turetme}`, `GERİ-ÇEKİLEN: ${geri}`);
  return l.join('\n') + (ek ? '\n' + ek : '') + '\n';
}
const donus = (tip, metin) => ({ agent_type: tip, last_assistant_message: metin });
const denetciZarfi = ({ kaynak = 'G-12', hukum = 'GEÇTİ', kalemler = '1=geçti 2=geçti 3=geçti 4=geçti 5=geçti' } = {}) =>
  zarf({ biten: 'G-90 — çatal hükmü verildi · kanıt: 00_pano/PANO.md:1',
         ek: [`ÇATAL-KAYNAK: ${kaynak}`, `HÜKÜM: ${hukum}`, `KALEMLER: ${kalemler}`].join('\n') });

// Günlüğe gerçek bir "ÇATAL dolu" zarf kaydı düşür (kuyruk yazıcısının kaynağı).
function catalKaydi(kok, { gorev = 'G-12', ceviri = 'Puanlar ekstrede ayrı satır olarak görünsün mü?',
                           etki = 'Görünürse her ay tek bakışta görürsün; görünmezse ekstre sade kalır. Geri dönüşü: tek ayar.',
                           bekletir = 'G-14 ve G-15 bu cevaba bağlı', ajan = 'po' } = {}) {
  appendFileSync(GUNLUK(kok), JSON.stringify({
    surum: 1, ts: '2026-07-27T10:05:00Z', donem: 'DONEM-TEST', tip: 'zarf', ajan, gorev,
    alanlar: { biten: `${gorev} — x · kanıt: 00_pano/PANO.md:1`, catal: 'dolu', ceviri, etki, bekletir,
               degerlendirmediklerim: 'yok', siradaki: 'kapalı', turetme_izi: 'yok', geri_cekilen: 'yok', izin_engeli: null },
    dikis: 'atlandi', ham: '...',
  }) + '\n');
}

// ══════════════════════════════════════════════════════════════════════════════════════════
// 1 · karar-alani.sh — soru kanalının ön koşulu
// ══════════════════════════════════════════════════════════════════════════════════════════

test('karar-alani: dosya yoksa HAZIR DEĞİL (fail-closed)', () => {
  const kok = kurulum({ kararAlani: false });
  const r = kos(kok, 'karar-alani.sh', [kok]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /HAZIR DEĞİL/);
  assert.match(r.stdout, /KARAR_ALANI\.md yok/);
});

test('karar-alani: profil «alanlı» ise HAZIR DEĞİL — dört başlığın dördü de raporlanır', () => {
  const kok = kurulum({ profil: false });
  const r = kos(kok, 'karar-alani.sh', [kok]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /sahip profili doldurulmamış/);
  for (const b of ['Ne bilir', 'Ne bilmez', 'Neye karar vermek ister', 'Soru sorma tarzı']) {
    assert.ok(r.stdout.includes(b), 'eksik başlık raporlanmadı: ' + b);
  }
});

test('karar-alani: profil dolu → HAZIR', () => {
  const kok = kurulum();
  const r = kos(kok, 'karar-alani.sh', [kok]);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /^HAZIR/);
});

test('karar-alani: Bölüm A çapası silinmişse "çizgi aşınmış" (profil dolu olsa bile)', () => {
  const kok = kurulum();
  writeFileSync(KARAR(kok), kararAlaniMetni().replace('Sahip hiçbir alanın bilgi kaynağı değildir.', 'Sahip her şeyi bilir.'));
  const r = kos(kok, 'karar-alani.sh', [kok]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /soru çizgisi aşınmış/);
});

test('karar-alani: 8. madde eksikse HAZIR DEĞİL', () => {
  const kok = kurulum();
  writeFileSync(KARAR(kok), kararAlaniMetni().replace(/^8\. .*$/m, ''));
  const r = kos(kok, 'karar-alani.sh', [kok]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /8\. madde yok/);
});

test('karar-alani: başlık var ama gövde tek kelime → çok kısa (dolgu hilesi tutmaz)', () => {
  const kok = kurulum();
  writeFileSync(KARAR(kok), kararAlaniMetni().replace(/(### Ne bilir[^\n]*\n)[^#]*/s, '$1- yok\n\n'));
  const r = kos(kok, 'karar-alani.sh', [kok]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /gövde çok kısa/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 2 · catal-kuyruk.sh --durum — "[x] tek başına cevap değildir"
// ══════════════════════════════════════════════════════════════════════════════════════════

const kuyrukYaz = (kok, satirlar) =>
  writeFileSync(KUYRUK(kok), '# SENDE BEKLEYEN — sahipte bekleyen maddeler\n\n' + satirlar.join('\n') + '\n');
const durum = (kok) => kos(kok, 'catal-kuyruk.sh', ['--durum']).stdout.trim().split('\n').filter(Boolean).map((s) => s.split('\t'));

test('kuyruk --durum: kuyruk yoksa çıktı boş, hata yok', () => {
  const kok = kurulum();
  const r = kos(kok, 'catal-kuyruk.sh', ['--durum']);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('kuyruk --durum: işaretlenmemiş madde CEVAP-BEKLİYOR + bekletir görevleri çıkarılır', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 G-15 · kaynak: zarf-günlüğü satır 2']);
  assert.deepEqual(durum(kok), [['Ç-01', 'CEVAP-BEKLIYOR', 'G-14 G-15', 'isaretlenmemis']]);
});

test('kuyruk --durum: dört cevap dalı — gerçek cevap / anlamadım / boş / yankı', () => {
  const kok = kurulum();
  const soru = 'Puan görünsün mü?';
  const taban = (cevap) =>
    `- [x] 2026-07-27 · po · ÇATAL Ç-01 · "${soru}" · bekletir: G-14 · cevap: "${cevap}" · 2026-07-28`;
  const vakalar = [
    ['evet, ayrı satır olsun', 'CEVAPLANDI', '—'],
    ['anlamadım', 'CEVIRI-KUSURU', 'anlamadim-sinifi'],
    ['', 'CEVAP-BEKLIYOR', 'bos-cevap'],
    [soru, 'CEVAP-BEKLIYOR', 'yanki'],
    ['Anlamıyorum, ne demek bu?', 'CEVIRI-KUSURU', 'anlamadim-sinifi'],
  ];
  for (const [cevap, beklenenDurum, beklenenSebep] of vakalar) {
    kuyrukYaz(kok, [taban(cevap)]);
    const [satir] = durum(kok);
    assert.equal(satir[1], beklenenDurum, `cevap "${cevap}" → ${satir[1]} (beklenen ${beklenenDurum})`);
    assert.equal(satir[3], beklenenSebep, `sebep: ${satir[3]}`);
  }
});

test('kuyruk --durum: ÇATAL olmayan D-21 maddeleri sayılmaz (kuyruk ortak, sınıf ayrı)', () => {
  const kok = kurulum();
  kuyrukYaz(kok, [
    '- [ ] 2026-07-27 · koordinator · "Sunum tarihini onaylar mısın?" · kaynak: oturum ab12',
    '- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 · kaynak: zarf-günlüğü satır 2',
  ]);
  const d = durum(kok);
  assert.equal(d.length, 1, 'yalnız ÇATAL sınıfı madde sayılmalı');
  assert.equal(d[0][0], 'Ç-01');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 3 · catal-kuyruk.sh --ekle — sahip-yüzeyi metni KAYITTAN gelir
// ══════════════════════════════════════════════════════════════════════════════════════════

test('kuyruk --ekle: günlükte çatal yoksa ARIZA (teslimat başarısızlığı ≠ meşru atlama)', () => {
  // Hasım bulgusu: eskiden bu da "ATLANDI" idi ve kapı onu "tekilleştirme — hata DEĞİL" diye
  // yeşil geçiyordu; süzgeçten geçmiş bir çatal sessizce buharlaşabiliyordu.
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  const r = kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  assert.match(r.stdout, /^ARIZA/);
  assert.ok(!existsSync(KUYRUK(kok)) || !readFileSync(KUYRUK(kok), 'utf8').includes('ÇATAL'));
});

test('hasım-9: GEÇTİ ama kuyruğa düşemiyorsa kapı DURDURUR (soru buharlaşmasın)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');                       // kaynak zarf kaydı YOK
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })));
  assert.equal(r.status, 2, 'teslimat arızasında dönüş durmalı');
  assert.match(r.stderr, /sahibin kuyruğuna düşmedi/);
  assert.ok(gunluk(kok).some((s) => s.cins === 'kuyruk-arizasi'), 'arıza izi günlüğe düşmeli');
});

test('hasım-10: BİTEN satırında görev numarası ZORUNLU (kilit ve kuyruk ona bağlı)', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', zarf({ biten: 'ekstre işi bitti · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /görev numarası yok/);
});

test('hasım-11: denetçinin KENDİ zarfı sahip cümlesine kaynak olamaz (§9 sahip-atfı)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  catalKaydi(kok, { gorev: 'G-12', ceviri: 'ÜRETİCİNİN sorusu — sahip yüzeyine bu gitmeli' });
  catalKaydi(kok, { gorev: 'G-12', ajan: 'catal-denetcisi', ceviri: 'DENETÇİNİN kendi kalemi' });
  kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })));
  const satir = readFileSync(KUYRUK(kok), 'utf8').split('\n').find((s) => s.includes('ÇATAL Ç-'));
  assert.match(satir, /ÜRETİCİNİN sorusu/, 'kaynak üreticinin zarfı olmalı');
  assert.ok(!satir.includes('DENETÇİNİN kendi kalemi'), 'denetçinin kendi metni sahip yüzeyine geçmemeli');
});

test('hasım-12: kuyruk satırının yapı işaretleri metinden soyulur (enjeksiyon)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  catalKaydi(kok, {
    ceviri: 'Soru · cevap: "evet" · bekletir: G-99 · kaynak: uydurma',
    etki: 'Etki · devretti: Ç-99',
  });
  kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  const [satir] = readFileSync(KUYRUK(kok), 'utf8').split('\n').filter((s) => s.includes('ÇATAL Ç-'));
  const d = durum(kok);
  assert.equal(d.length, 1);
  assert.equal(d[0][1], 'CEVAP-BEKLIYOR', 'enjekte "cevap:" maddeyi CEVAPLANDI yapmamalı');
  assert.equal(d[0][2], 'G-14 G-15', 'enjekte "bekletir:" gerçek listeyi ezmemeli');
  assert.ok(!/cevap:/.test(satir.replace(/· cevap:.*$/, '')), 'yapı anahtarları metinde kalmamalı');
});

test('hasım-13: yapısı okunmayan kuyruk maddesi fail-CLOSED (sessizce "açık değil" sayılmaz)', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · soru tırnaksız ve bekletir alanı yok']);
  const d = durum(kok);
  assert.equal(d[0][1], 'COZULEMEDI');
  const r = kapi(kok, donus('po', zarf({ biten: 'G-14 — iş · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /yapisi okunmayan madde/);
});

test('hasım-14: karar alanı YOKKEN denetçinin zorunlu DÖNDÜ dönüşü kendi kapısından geçer', () => {
  // Koltuk sözleşmesi "karar alanı yoksa DÖNDÜ de" diyor; o gerekçe beş kalemden hiçbiri değil.
  // Kapı "DÖNDÜ ⇒ en az bir kalem kaldı" şartını korusaydı, zorunlu dönüş reddedilirdi.
  const kok = kurulum({ profil: false });
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'DÖNDÜ', kalemler: 'karar alanı yazılı değil' })));
  assert.equal(r.status, 0, r.stderr);
  const s = gunluk(kok).find((x) => x.tip === 'catal-suzgec');
  assert.equal(s.hukum, 'DONDU');
});

test('kuyruk --ekle: kayıttan madde üretilir — çeviri/etki/bekletir zarftan, imza satır no', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  catalKaydi(kok);
  const r = kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^EKLENDI\tÇ-01/);
  const satir = readFileSync(KUYRUK(kok), 'utf8').split('\n').find((s) => s.includes('ÇATAL'));
  assert.match(satir, /^- \[ \] \d{4}-\d{2}-\d{2} · po · ÇATAL Ç-01 · "Puanlar ekstrede ayrı satır olarak görünsün mü\?"/);
  assert.match(satir, /etki: Görünürse/);
  assert.match(satir, /bekletir: G-14 G-15/, 'bekletir yalnız G-NN jetonlarına indirgenmeli');
  assert.match(satir, /kaynak: zarf-günlüğü satır 1/);
  assert.equal(satir.split('\n').length, 1, 'madde TEK satır olmalı (F3)');
});

test('kuyruk --ekle: aynı kaynak iki kez eklenmez (tekilleştirme imzayla)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  catalKaydi(kok);
  kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  const r = kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  assert.match(r.stdout, /^ATLANDI\tayni kaynak/);
  const n = readFileSync(KUYRUK(kok), 'utf8').split('\n').filter((s) => s.includes('ÇATAL Ç-')).length;
  assert.equal(n, 1);
});

test('kuyruk --ekle: Ç-NN kuyruktaki en büyükten türetilir', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  catalKaydi(kok, { gorev: 'G-12' });
  catalKaydi(kok, { gorev: 'G-40', ceviri: 'Aylık özet e-postası gelsin mi?', bekletir: 'G-41' });
  kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  const r = kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-40']);
  assert.match(r.stdout, /^EKLENDI\tÇ-02/);
});

test('kuyruk --ekle: geçersiz görev argümanı → exit 1 (fail-closed)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  const r = kos(kok, 'catal-kuyruk.sh', ['--ekle', 'rm -rf /']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /gecerli gorev gerekli/);
});

test('kuyruk: bilinmeyen kip → exit 1', () => {
  const kok = kurulum();
  const r = kos(kok, 'catal-kuyruk.sh', ['--hepsini-sil']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bilinmeyen kip/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 4 · Biçim kapısı — jargon · TÜRETME-İZİ · BEKLETİR kilidi
// ══════════════════════════════════════════════════════════════════════════════════════════

const catalliZarf = (ceviri) => zarf({
  catal: 'dolu', ceviri,
  etki: 'Ertesi sabah ekstre farklı görünür; yanlışsa tek ayarla geri alınır.',
  bekletir: 'G-21',
});

test('kapı/jargon: ÇEVİRİ satırında karar-görev numarası, dosya adı ya da yol → red', () => {
  const kok = kurulum();
  const vakalar = [
    ['K-07 kararına göre alan açılsın mı?', 'karar/görev numarası'],
    ['G-12 sonucunda liste değişsin mi?', 'karar/görev numarası'],
    ['PANO.md dosyasında görünsün mü?', 'dosya adı'],
    ['02_kanon/golden/ altında tutulsun mu?', 'dosya yolu'],
  ];
  for (const [ceviri, sinif] of vakalar) {
    const r = kapi(kok, donus('po', catalliZarf(ceviri)));
    assert.equal(r.status, 2, 'red bekleniyordu: ' + ceviri);
    assert.match(r.stderr, /bilmediği kelime taşıyor/);
    assert.ok(r.stderr.includes(sinif), `sınıf raporlanmadı (${sinif}): ${r.stderr}`);
  }
});

test('kapı/jargon: sahip dilinde çeviri geçer (yanlış-pozitif yok)', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', catalliZarf('Puan kazanımların ekstrede ayrı satır olarak görünsün mü?')));
  assert.equal(r.status, 0, r.stderr);
});

test('kapı/jargon: ÇATAL yokken çeviri denetimi çalışmaz (alan zaten yok)', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', zarf({ biten: 'G-20 — K-07 uygulandı · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 0, r.stderr);
});

test('kapı/TÜRETME-İZİ: çapasız serbest metin → red', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', zarf({ turetme: 'sormadım çünkü zaten belliydi' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /TÜRETME-İZİ çözülmüyor/);
});

test('kapı/TÜRETME-İZİ: kopuk dosya yolu → red; gerçek yol ve K-NN çapası → geçer', () => {
  const kok = kurulum();
  const kopuk = kapi(kok, donus('po', zarf({ turetme: 'sormadım çünkü 02_kanon/OLMAYAN.md:12 diyor' })));
  assert.equal(kopuk.status, 2);
  assert.match(kopuk.stderr, /işaretçisi kopuk/);
  for (const iz of ['sormadım çünkü 00_pano/PANO.md:1 diyor', 'sormadım çünkü K-04 kararı bunu kapatıyor', 'sormadım çünkü VIZYON bunu söylüyor']) {
    const r = kapi(kok, donus('po', zarf({ turetme: iz })));
    assert.equal(r.status, 0, `geçmeliydi: ${iz} — ${r.stderr}`);
  }
});

test('kapı/TÜRETME-İZİ: "yok" denetlenmez', () => {
  const kok = kurulum();
  assert.equal(kapi(kok, donus('po', zarf({ turetme: 'yok' }))).status, 0);
});

test('kapı/BEKLETİR kilidi: cevapsız çatala bağlı görevin dönüşü red + bulgu', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 G-15 · kaynak: zarf-günlüğü satır 2']);
  const r = kapi(kok, donus('po', zarf({ biten: 'G-14 — iş bitti · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cevapsız çatala bağlı iş/);
  assert.match(r.stderr, /Ç-01/);
  const b = gunluk(kok).filter((s) => s.cins === 'bekletir-ihlali');
  assert.equal(b.length, 1, 'bulgu günlüğe düşmeli');
  assert.equal(b[0].gorev, 'G-14');
});

test('kapı/BEKLETİR kilidi: "anlamadım" cevabı da kilidi AÇMAZ (madde hâlâ açık)', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [x] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 · cevap: "anlamadım" · 2026-07-28']);
  const r = kapi(kok, donus('po', zarf({ biten: 'G-14 — iş bitti · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cevapsız çatala bağlı iş/);
});

test('kapı/BEKLETİR kilidi: cevaplanmış çatalın görevi SERBEST (kilit yapışkan değil)', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [x] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 · cevap: "evet olsun" · 2026-07-28']);
  const r = kapi(kok, donus('po', zarf({ biten: 'G-14 — iş bitti · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 0, r.stderr);
});

test('kapı/BEKLETİR kilidi: listede olmayan görev serbest', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 · kaynak: zarf-günlüğü satır 2']);
  assert.equal(kapi(kok, donus('po', zarf({ biten: 'G-99 — iş bitti · kanıt: 00_pano/PANO.md:1' }))).status, 0);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 5 · Biçim kapısı — çatal denetçisi sözleşmesi + karar alanı ön koşulu
// ══════════════════════════════════════════════════════════════════════════════════════════

test('kapı/denetçi: üç ek satır eksikse red', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('catal-denetcisi', zarf({ biten: 'G-90 — hüküm · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /denetçi dönüşünde eksik alan/);
  for (const a of ['ÇATAL-KAYNAK', 'HÜKÜM', 'KALEMLER']) assert.ok(r.stderr.includes(a));
});

test('kapı/denetçi: HÜKÜM yalnız GEÇTİ|DÖNDÜ; ÇATAL-KAYNAK görev taşımalı', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  const bozukHukum = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'belki' })));
  assert.equal(bozukHukum.status, 2);
  assert.match(bozukHukum.stderr, /HÜKÜM okunmuyor/);
  const kaynaksiz = kapi(kok, donus('catal-denetcisi', denetciZarfi({ kaynak: 'bilmiyorum' })));
  assert.equal(kaynaksiz.status, 2);
  assert.match(kaynaksiz.stderr, /ÇATAL-KAYNAK görev taşımıyor/);
});

test('kapı/denetçi: DÖNDÜ ama hiçbir kalem "kaldı" değilse red (tutarsız hüküm)', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'DÖNDÜ' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /hiçbir kalem/);
});

test('kapı/denetçi: DÖNDÜ geçerli → geçer, catal-suzgec kaydı düşer, kuyruğa madde DÜŞMEZ', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'DÖNDÜ', kalemler: '1=geçti 2=geçti 3=geçti 4=kaldı 5=geçti' })));
  assert.equal(r.status, 0, r.stderr);
  const s = gunluk(kok).filter((x) => x.tip === 'catal-suzgec');
  assert.equal(s.length, 1);
  assert.equal(s[0].hukum, 'DONDU');
  assert.equal(s[0].gorev, 'G-12');
  assert.ok(!existsSync(KUYRUK(kok)), 'DÖNDÜ hükmü kuyruğa madde düşürmemeli');
});

test('kapı/denetçi: GEÇTİ + profil DOLU → geçer ve madde kuyruğa mekanik düşer', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })));
  assert.equal(r.status, 0, r.stderr);
  const satir = readFileSync(KUYRUK(kok), 'utf8').split('\n').find((s) => s.includes('ÇATAL Ç-'));
  assert.ok(satir, 'kuyruğa madde düşmeliydi');
  assert.match(satir, /Puanlar ekstrede ayrı satır/, 'metin ZARF kaydından gelmeli (denetçinin kaleminden değil)');
  const b = gunluk(kok).filter((x) => x.cins === 'kuyruk-eklendi');
  assert.equal(b.length, 1);
  assert.equal(b[0].detay, 'Ç-01');
});

test('kapı/denetçi: GEÇTİ + profil BOŞ → red (çatal sahibe gidemez)', () => {
  const kok = kurulum({ profil: false });
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /karar alanı yazılı değil/);
  assert.ok(!existsSync(KUYRUK(kok)), 'profil boşken kuyruğa madde düşmemeli');
  const s = gunluk(kok).filter((x) => x.tip === 'catal-suzgec');
  assert.equal(s[0].hukum, 'GECTI-ENGEL', 'engel izi günlüğe düşmeli');
});

test('kapı/denetçi: karar-alani betiği hiç yoksa GEÇTİ yine red (fail-closed, boş HAZIR sayılmaz)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  writeFileSync(BETIK(kok, 'karar-alani.sh'), '#!/bin/bash\nexit 9\n');   // koşamaz hâle getir
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /karar alanı yazılı değil/);
});

test('kapı/denetçi: BEKLETİR kilidinden muaf (hüküm iş değildir)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-90 · kaynak: zarf-günlüğü satır 9']);
  const r = kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'DÖNDÜ', kalemler: '1=kaldı 2=geçti 3=geçti 4=geçti 5=geçti' })));
  assert.equal(r.status, 0, r.stderr);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 6 · Sınır davranışları: dönem kapalı · döngü emniyeti · el-sürüşlü etkisizlik
// ══════════════════════════════════════════════════════════════════════════════════════════

test('dönem KAPALIYKEN E3 kapılarının hiçbiri çalışmaz (el-sürüşlü döngü etkilenmez)', () => {
  const kok = kurulum({ donem: false, profil: false });
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "x" · bekletir: G-14 · kaynak: zarf-günlüğü satır 2']);
  for (const g of [donus('po', zarf({ biten: 'G-14 — x · kanıt: 00_pano/PANO.md:1' })),
                   donus('po', catalliZarf('K-07 alanı açılsın mı?')),
                   donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' }))]) {
    assert.equal(kapi(kok, g).status, 0, 'dönem kapalıyken kapı sessiz geçmeli');
  }
  assert.equal(gunluk(kok).length, 0, 'dönem kapalıyken günlüğe satır düşmemeli');
});

test('döngü emniyeti: stop_hook_active=true iken E3 dalları ENGELLEMEZ, iz düşer', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "Puan görünsün mü?" · bekletir: G-14 · kaynak: zarf-günlüğü satır 2']);
  const r = kapi(kok, { ...donus('po', zarf({ biten: 'G-14 — x · kanıt: 00_pano/PANO.md:1' })), stop_hook_active: true });
  assert.equal(r.status, 0, 'ikinci turda engellememeli');
  const kayitlar = gunluk(kok);
  assert.ok(kayitlar.some((s) => s.cins === 'bekletir-ihlali'), 'bulgu yine de düşmeli');
  assert.ok(kayitlar.some((s) => s.tip === 'bicim' && s.sonuc === 'kirmizi-devam'), 'kırmızı-devam izi düşmeli');
});

test('stop_hook_active turunda da GEÇTİ kuyruğa DÜŞER — soru yutulmaz (hasım bulgusu)', () => {
  // Eski davranış "!SHA" şartıyla ikinci turda yazımı atlıyordu. Ön koşulu T3a sahada gösterdi:
  // denetçi bir kez BİÇİM redi yerse ikinci tur SHA olur — ve sahibin sorusu SESSİZCE kaybolurdu.
  // Doğrusu: yaz. Çift-yazım riski tekilleştirmeyle (kaynak imzası) kapanır — altta kanıtı.
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  kapi(kok, { ...donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })), stop_hook_active: true });
  const satirlar = readFileSync(KUYRUK(kok), 'utf8').split('\n').filter((s) => s.includes('ÇATAL Ç-'));
  assert.equal(satirlar.length, 1, 'SHA turunda soru kuyruğa düşmeliydi');
});

test('kuyruk tekilleştirmesi: aynı çatal iki kapı turunda da tek madde kalır', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })));
  kapi(kok, { ...donus('catal-denetcisi', denetciZarfi({ hukum: 'GEÇTİ' })), stop_hook_active: true });
  const satirlar = readFileSync(KUYRUK(kok), 'utf8').split('\n').filter((s) => s.includes('ÇATAL Ç-'));
  assert.equal(satirlar.length, 1, 'aynı kaynak iki kez yazılmamalı');
});

test('beyaz liste: kadroda olmayan ajan tipi E3 kapılarına da girmez', () => {
  const kok = kurulum({ kadro: ['po'] });
  const r = kapi(kok, donus('catal-denetcisi', 'zarf falan yok'));
  assert.equal(r.status, 0);
  assert.equal(gunluk(kok).length, 0);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 7 · T3 CANLI ölçümünden doğan kalibrasyonlar (2026-07-28) — sahada görülen yanlış-pozitifler
// ══════════════════════════════════════════════════════════════════════════════════════════

test('kalibrasyon-1: kanıt işaretçisi virgüllü satır listesi taşıyabilir (dosya.md:43,46)', () => {
  // T3a canlı: denetçi kanıtı "02_kanon/KARAR_ALANI.md:43,46" yazdı; dar desen ":43,46"yı
  // satır eki saymadı ve GEÇERLİ kanıtı "kopuk" ilan etti (yanlış-pozitif, kapı reddi).
  const kok = kurulum();
  for (const k of ['00_pano/PANO.md:1', '00_pano/PANO.md:43,46', '00_pano/PANO.md:43-46', '00_pano/PANO.md:1, 3']) {
    const r = kapi(kok, donus('po', zarf({ biten: `G-20 — iş bitti · kanıt: ${k}` })));
    assert.equal(r.status, 0, `kanıt biçimi geçmeliydi: ${k} — ${r.stderr}`);
  }
  const kopuk = kapi(kok, donus('po', zarf({ biten: 'G-20 — iş · kanıt: 00_pano/OLMAYAN.md:43,46' })));
  assert.equal(kopuk.status, 2, 'gerçekten kopuk işaretçi hâlâ yakalanmalı');
});

test('kalibrasyon-1b: TÜRETME-İZİ işaretçisi de virgüllü satır listesi taşıyabilir', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', zarf({ turetme: 'sormadım çünkü 02_kanon/KARAR_ALANI.md:43,46 diyor' })));
  assert.equal(r.status, 0, r.stderr);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 8 · Hasım turunun kapattığı delikler (2026-07-28) — her biri kapanmadan önce sahada delikti
// ══════════════════════════════════════════════════════════════════════════════════════════

test('hasım-1: ETKİ satırı da jargon taranır (kuyruğa AYNEN yazılan ikinci metin)', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', zarf({
    catal: 'dolu', ceviri: 'Puanlar ekstrede görünsün mü?',
    etki: 'K-07 kararına göre ertesi sabah ekran değişir', bekletir: 'G-21',
  })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ETKİ satırı sahibin bilmediği kelime taşıyor/);
});

test('hasım-2: BEKLETİR görev numarası taşımalı — sahip dilinde liste kilidi izsiz öldürüyordu', () => {
  const kok = kurulum();
  const temiz = { catal: 'dolu', ceviri: 'Puanlar görünsün mü?', etki: 'Ertesi sabah ekstre değişir; geri alınır.' };
  const r = kapi(kok, donus('po', zarf({ ...temiz, bekletir: 'ekstre işleri bekler' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BEKLETİR görev numarası taşımıyor/);
  assert.equal(kapi(kok, donus('po', zarf({ ...temiz, bekletir: 'G-32 G-33' }))).status, 0);
  assert.equal(kapi(kok, donus('po', zarf({ ...temiz, bekletir: 'yok' }))).status, 0, 'bağlı iş yoksa «yok» meşru');
});

test('hasım-3: TÜRETME-İZİ boş bırakılamaz (hiç yazmayan yeşil geçiyordu)', () => {
  const kok = kurulum();
  const r = kapi(kok, donus('po', zarf({ turetme: '' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /TÜRETME-İZİ boş bırakılamaz/);
});

test('hasım-4: kuyruk okuyucusu patlarsa BEKLETİR kilidi fail-CLOSED (sessizce devre dışı kalmaz)', () => {
  const kok = kurulum();
  kuyrukYaz(kok, ['- [ ] 2026-07-27 · po · ÇATAL Ç-01 · "x" · bekletir: G-14 · kaynak: zarf-günlüğü satır 2']);
  writeFileSync(BETIK(kok, 'catal-kuyruk.sh'), '#!/bin/bash\nexit 9\n');
  const r = kapi(kok, donus('po', zarf({ biten: 'G-14 — iş · kanıt: 00_pano/PANO.md:1' })));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /kuyrugu okunamadi/);
  assert.ok(gunluk(kok).some((s) => s.cins === 'kuyruk-okunamadi'), 'iz düşmeli — sessiz olmamalı');
});

test('hasım-5: catal-suzgec kaydı çatalın METNİNİ taşır (dış gözün ④ merceği verisiz kalmasın)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  kapi(kok, donus('catal-denetcisi', denetciZarfi({ hukum: 'DÖNDÜ', kalemler: '1=geçti 2=geçti 3=geçti 4=kaldı 5=geçti' })));
  const s = gunluk(kok).find((x) => x.tip === 'catal-suzgec');
  assert.match(s.ceviri, /Puanlar ekstrede ayrı satır/, 'çeviri metni kayda geçmeli');
  assert.ok(s.etki && s.bekletir, 'etki ve bekletir de kayda geçmeli');
});

test('hasım-6: "anlamadım" maddesi DEVREDİLİNCE kilit açılır (kalıcı kilitlenme yoktu artık)', () => {
  const kok = kurulum();
  kuyrukYaz(kok, [
    '- [x] 2026-07-27 · po · ÇATAL Ç-01 · "eski soru" · bekletir: G-14 · cevap: "anlamadım" · devretti: Ç-02 · 2026-07-28',
    '- [ ] 2026-07-28 · po · ÇATAL Ç-02 · "daha sade soru" · bekletir: G-15 · kaynak: zarf-günlüğü satır 9',
  ]);
  const d = durum(kok);
  assert.equal(d.find((x) => x[0] === 'Ç-01')[1], 'DEVREDILDI');
  assert.equal(d.find((x) => x[0] === 'Ç-02')[1], 'CEVAP-BEKLIYOR');
  assert.equal(kapi(kok, donus('po', zarf({ biten: 'G-14 — iş · kanıt: 00_pano/PANO.md:1' }))).status, 0,
    'devredilen maddenin görevi serbest kalmalı');
  assert.equal(kapi(kok, donus('po', zarf({ biten: 'G-15 — iş · kanıt: 00_pano/PANO.md:1' }))).status, 2,
    'yeni maddenin görevi kilitli olmalı');
});

test('hasım-7: kuyruk maddesi tek satır ve makul boyda (SENDE_BEKLEYEN tavanı 2KB)', () => {
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), '');
  catalKaydi(kok, {
    ceviri: 'Ç'.repeat(400), etki: 'E'.repeat(600), bekletir: 'G-14 G-15 G-16 G-17 G-18',
  });
  kos(kok, 'catal-kuyruk.sh', ['--ekle', 'G-12']);
  const satirlar = readFileSync(KUYRUK(kok), 'utf8').split('\n').filter((s) => s.includes('ÇATAL Ç-'));
  assert.equal(satirlar.length, 1);
  const B = Buffer.byteLength(satirlar[0], 'utf8');
  assert.ok(B <= 1024, `madde satırı 1KB'ı aşıyor: ${B}B — 2KB tavanına iki madde bile sığmaz`);
});

test('kalibrasyon-2: çatal denetçisi çatal-iz şüphesinden MUAF (işi zaten çatal değerlendirmek)', () => {
  // T3a canlı: denetçinin transkriptinde doğal olarak "ÇATAL" geçiyor; muafiyet olmadan her
  // denetçi çağrısı catal-iz-suphesi üretiyordu. Üretici rolde denetim AYNEN sürer (altta).
  const kok = kurulum();
  writeFileSync(GUNLUK(kok), ''); catalKaydi(kok);
  const trans = join(kok, 'transkript-denetci.jsonl');
  const ajanMesaji = (t) => JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: t }] } });
  writeFileSync(trans, [
    ajanMesaji('Bu bir ÇATAL mı diye baktım; sahibe sormalı mı diye tarttım.'),
    ajanMesaji('hüküm hazır'),
  ].join('\n') + '\n');
  const denetciR = kapi(kok, {
    ...donus('catal-denetcisi', denetciZarfi({ hukum: 'DÖNDÜ', kalemler: '1=geçti 2=geçti 3=geçti 4=kaldı 5=geçti' })),
    agent_transcript_path: trans,
  });
  assert.equal(denetciR.status, 0, 'denetçi muaf olmalı: ' + denetciR.stderr);
  assert.ok(!gunluk(kok).some((s) => s.cins === 'catal-iz-suphesi'), 'denetçiye çatal-iz şüphesi düşmemeli');

  const ureticiR = kapi(kok, { ...donus('po', zarf({ biten: 'G-20 — iş · kanıt: 00_pano/PANO.md:1' })), agent_transcript_path: trans });
  assert.equal(ureticiR.status, 2, 'üretici rolde çatal-iz denetimi AYNEN sürmeli');
  assert.match(ureticiR.stderr, /catal-degerlendirme izi/);
});

test('hasım-8: dönem-AÇIK iken kuyruğa yazım ENGEL — CEVAPLANDI dönemin kendi eliyle üretilemez', () => {
  // §6.1 kilidi mekanik karşılığını burada bulur: dönem içinde bir rol "[x] cevap: evet" yazamaz.
  // El-sürüşlü oturumda (dönem kapalı) D-21 akışı AYNEN sürer — rol kapanış işaretini koyabilir.
  const kok = kurulum();
  writeFileSync(KUYRUK(kok), '# SENDE BEKLEYEN\n');
  const gir = (donemAcikMi) => {
    if (!donemAcikMi) rmSync(join(kok, 'tools', 'sevk', '.donem-acik'), { force: true });
    return spawnSync('bash', [join(kok, 'tools', 'guard', 'file-guard.sh')], {
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
      input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), new_string: 'cevap: evet' } }),
    });
  };
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  for (const b of ['file-guard.sh', 'icerik-suzgeci.sh', 'korunan-yollar.txt', 'gercek-veri-isaretleri.txt']) {
    copyFileSync(join(KOK_REPO, 'tools', 'guard', b), join(kok, 'tools', 'guard', b));
  }
  writeFileSync(join(kok, '.kurulum-tamam'), 'kuruldu\n');
  const acik = gir(true);
  assert.equal(acik.status, 2, 'dönem-AÇIK iken kuyruğa yazım engellenmeli');
  assert.match(acik.stderr, /sahibin kuyruğuna/);
  const kapali = gir(false);
  assert.equal(kapali.status, 0, 'el-sürüşlü oturumda engel OLMAMALI (D-21 akışı sürer)');
});
