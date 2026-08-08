// kuyruk-yazicilari.test.mjs — U60 · U69: sahibin kuyruğuna (00_pano/SENDE_BEKLEYEN.md) yazan
// HER kol tek evden geçer (tools/sevk/kuyruk-ortak.mjs): içerik süzgeci + BAYT tabanlı kırpma.
//
// NEDEN AYRI DOSYA: kollar iki pakete dağılmış (sevk ailesi + kapanış kancası) ve arıza tam da
// "her kol kendi temizliğini yazmış" olmasıydı. Kolları AYRI AYRI sınayan bir test dosyası aynı
// hatayı tekrar eder; buradaki testler kolları YAN YANA koyar ve aynı invaryantı hepsine sorar.
//
// SENTETİK DEĞER ÜRETİLİR, YAZILMAZ (E2 dersi): kapı redi alan ajan koruma betiklerini OKUYOR;
// kaynakta duran gerçekçi bir literal desen-tabanlı gözleri kirletir. Anahtar öneki parçalardan
// kurulur, gövdesi tek karakterin tekrarıdır.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync,
         chmodSync, appendFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kuyrukBagimliliklariKur } from './kuyruk-bagimliligi.mjs';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const KAPANIS = join(BURASI, '..', 'kapanis.sh');
const KUYRUK = (kok) => join(kok, '00_pano', 'SENDE_BEKLEYEN.md');
const GUNLUK = (kok) => join(kok, '00_pano', 'zarf-gunlugu.jsonl');
const OTURUM_GUNLUK = (kok) => join(kok, '00_pano', 'oturum-gunlugu.jsonl');

// Sağlayıcı öneki parçadan kurulur (bkz. dosya başlığı).
const SAHTE_ANAHTAR = ['s', 'k'].join('') + '-' + 'A'.repeat(28);

function kurulum() {
  const kok = mkdtempSync(join(tmpdir(), 'kuyruk-yazici-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  for (const b of ['ortak.sh', 'kilit.sh', 'catal-kuyruk.sh']) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  copyFileSync(join(KOK_REPO, 'tools', 'sevk', 'cevap-sozlugu.txt'),
               join(kok, 'tools', 'sevk', 'cevap-sozlugu.txt'));
  kuyrukBagimliliklariKur(kok, KOK_REPO);
  writeFileSync(GUNLUK(kok), '');
  return kok;
}

const kos = (kok, ...args) =>
  spawnSync('bash', [join(kok, 'tools', 'sevk', 'catal-kuyruk.sh'), ...args],
            { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });

function catalKaydi(kok, { gorev = 'G-12', ceviri = 'Puanlar ekstrede ayrı satır olsun mu?',
                           etki = 'Görünürse tek bakışta görürsün. Geri dönüşü: tek ayar.' } = {}) {
  appendFileSync(GUNLUK(kok), JSON.stringify({
    surum: 1, ts: '2026-07-27T10:05:00Z', donem: 'DONEM-TEST', tip: 'zarf', ajan: 'po', gorev,
    alanlar: { biten: gorev + ' — x · kanıt: 00_pano/PANO.md:1', catal: 'dolu', ceviri, etki,
               bekletir: 'G-14 bu cevaba bağlı', degerlendirmediklerim: 'yok', siradaki: 'kapalı',
               turetme_izi: 'yok', geri_cekilen: 'yok', izin_engeli: null },
    dikis: 'atlandi', ham: '...',
  }) + '\n');
}

const kuyrukMetni = (kok) => (existsSync(KUYRUK(kok)) ? readFileSync(KUYRUK(kok), 'utf8') : '');
// Kuyruk dosyasının BAŞLIĞI biçim örneği taşır ("- [ ] <tarih> …", "cevap: …"): madde
// denetleyen bir ölçüm başlığı okursa kendi kendini kandırır. Yalnız MADDE satırları alınır.
const maddeSatirlari = (kok) => kuyrukMetni(kok).split('\n').filter((s) => /^- \[[ x]\] /.test(s));

// ══════════════════════════════════════════════════════════════════════════════════════════
// 1 · --ekle: ajanın ÇEVİRİ/ETKİ metni süzgeçten geçer
// ══════════════════════════════════════════════════════════════════════════════════════════

test('U60 --ekle: ÇEVİRİ anahtar taşıyorsa madde YAZILMAZ ve ARIZA döner', () => {
  const kok = kurulum();
  catalKaydi(kok, { ceviri: 'Şu anahtarı kullanalım mı: ' + SAHTE_ANAHTAR });
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^ARIZA\t/, 'teslimat arızası bildirilmeli');
  assert.match(r.stdout, /api-anahtari/, 'sebep SINIFI söylemeli');
  assert.ok(!kuyrukMetni(kok).includes(SAHTE_ANAHTAR), 'anahtar sahip yüzeyine DÜŞMEMELİ');
  assert.ok(!kuyrukMetni(kok).includes('ÇATAL'), 'madde hiç yazılmamalı');
});

test('U60 --ekle: ETKİ alanı da taranır (yalnız ÇEVİRİ değil)', () => {
  const kok = kurulum();
  catalKaydi(kok, { etki: 'Değişirse şu anahtar döner: ' + SAHTE_ANAHTAR });
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^ARIZA\t/);
  assert.ok(!kuyrukMetni(kok).includes(SAHTE_ANAHTAR));
});

test('U60 --ekle: sahibin İŞARET listesindeki dize de kesilir (jenerik desen değil)', () => {
  const kok = kurulum();
  // İşaret listesi kuruluma özel VERİdir; sahibin gerçek dizesi buraya yazılır.
  appendFileSync(join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'), 'Zeytinburnu-Sube-Kasa\n');
  catalKaydi(kok, { ceviri: 'Zeytinburnu-Sube-Kasa hesabını kapatalım mı?' });
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^ARIZA\t/);
  assert.match(r.stdout, /isaret/);
  assert.ok(!kuyrukMetni(kok).includes('Zeytinburnu'));
});

test('U60 --ekle: temiz metin normal akar (süzgeç meşru işi durdurmaz)', () => {
  const kok = kurulum();
  catalKaydi(kok);
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^EKLENDI\tÇ-01/);
  assert.match(kuyrukMetni(kok), /ÇATAL Ç-01/);
});

test('U60 --ekle: süzgeç KOŞAMAZSA da yazılmaz (fail-closed — "ölçemedim" ≠ "temiz")', () => {
  const kok = kurulum();
  catalKaydi(kok);
  renameSync(join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'),
             join(kok, 'tools', 'guard', 'icerik-suzgeci.sh.yok'));
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^ARIZA\t/);
  assert.match(r.stdout, /olculemedi|yok/);
  assert.ok(!kuyrukMetni(kok).includes('ÇATAL'));
});

test('U60 --ekle: süzgecin VERİ dosyası okunamıyorsa da yazılmaz (fail-closed)', () => {
  const kok = kurulum();
  catalKaydi(kok);
  renameSync(join(kok, 'tools', 'guard', 'yazim-kalibi.txt'),
             join(kok, 'tools', 'guard', 'yazim-kalibi.txt.yok'));
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^ARIZA\t/);
  assert.ok(!kuyrukMetni(kok).includes('ÇATAL'));
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 2 · --cevapla: uzaktan gelen seçim metni ve İMZA da süzgeçten geçer
// ══════════════════════════════════════════════════════════════════════════════════════════

function acikMadde(kok) {
  catalKaydi(kok);
  const r = kos(kok, '--ekle', 'G-12');
  assert.match(r.stdout, /^EKLENDI/, 'ön koşul: temiz madde eklenmiş olmalı');
  return readFileSync(KUYRUK(kok), 'utf8');
}

test('U60 --cevapla: seçim metni anahtar taşıyorsa kuyruk BAYT-EŞ kalır', () => {
  const kok = kurulum();
  const once = acikMadde(kok);
  const r = kos(kok, '--cevapla', 'Ç-01', 'Şununla dene: ' + SAHTE_ANAHTAR, 'uzaktan-posta uid:7');
  assert.match(r.stdout, /^ARIZA\t/);
  assert.equal(readFileSync(KUYRUK(kok), 'utf8'), once, 'dosyaya DOKUNULMAMALI');
});

test('U60 --cevapla: İMZA alanı da taranır (dar karakter kümesi öneki elemiyor)', () => {
  const kok = kurulum();
  const once = acikMadde(kok);
  // İmza doğrulaması harf/rakam/`:._-@`+boşluk kabul eder — bir sağlayıcı öneki bu kümeye SIĞAR.
  const r = kos(kok, '--cevapla', 'Ç-01', 'Yenisine geç', 'uzaktan-posta ' + SAHTE_ANAHTAR);
  assert.match(r.stdout, /^ARIZA\t/);
  assert.equal(readFileSync(KUYRUK(kok), 'utf8'), once);
});

test('U60 --cevapla: temiz seçim normal yazılır (süzgeç kanalı kilitlemiyor)', () => {
  const kok = kurulum();
  acikMadde(kok);
  const r = kos(kok, '--cevapla', 'Ç-01', 'Yenisine geç', 'uzaktan-posta uid:7');
  assert.match(r.stdout, /^CEVAPLANDI\tÇ-01/);
  assert.match(kos(kok, '--durum').stdout, /Ç-01\tCEVAPLANDI/);
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 3 · --not: sabit şablon da süzgeçten geçer; sinyali ÇIKIŞ KODUDUR
// ══════════════════════════════════════════════════════════════════════════════════════════

test('U60 --not: temiz şablon yazılır ve 0 döner', () => {
  const kok = kurulum();
  const r = kos(kok, '--not', 'izin', 'G-12', 'DONEM-1');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /^EKLENDI/);
  assert.match(kuyrukMetni(kok), /izin kapısına takıldı/);
});

test('U60 --not: süzgeç koşamazsa not YAZILMAZ ve çıkış kodu 0 DEĞİL', () => {
  // Tek tüketici (sevk.sh 8c) stdout okumaz, yalnız koda bakar: 0 dönmek "not düştü" derdi.
  const kok = kurulum();
  renameSync(join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'),
             join(kok, 'tools', 'guard', 'icerik-suzgeci.sh.yok'));
  const r = kos(kok, '--not', 'izin', 'G-12', 'DONEM-1');
  assert.notEqual(r.status, 0, 'sevk bunu bulgu olarak görmeli');
  assert.ok(!kuyrukMetni(kok).includes('izin kapısına takıldı'));
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 4 · kapanış kancası — kuyruğun dördüncü kolu
// ══════════════════════════════════════════════════════════════════════════════════════════

function kapanisKok() {
  const kok = mkdtempSync(join(tmpdir(), 'kuyruk-kapanis-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  kuyrukBagimliliklariKur(kok, KOK_REPO);
  return kok;
}

function kapanisKos(kok, maddeler) {
  const govde = ['**BİTEN:** iş bitti.', '**SENDE BEKLEYEN:** ' + maddeler.length + ' madde',
                 ...maddeler.map((m, i) => (i + 1) + '. ' + m), '**SIRADAKİ:** prova.'].join('\n');
  const tp = join(kok, 'transkript.jsonl');
  writeFileSync(tp, [
    { type: 'user', timestamp: '2026-07-24T10:00:00.000Z' },
    { type: 'assistant', timestamp: '2026-07-24T10:09:00.000Z', message: { id: 'a2', content: [{ type: 'text', text: govde }] } },
  ].map((s) => JSON.stringify(s)).join('\n') + '\n');
  const r = spawnSync('bash', [KAPANIS], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
    input: JSON.stringify({ session_id: 'oturum01', reason: 'clear', transcript_path: tp }),
  });
  const satirlar = readFileSync(OTURUM_GUNLUK(kok), 'utf8').split('\n').filter(Boolean);
  return { r, meta: JSON.parse(satirlar[satirlar.length - 1]) };
}

test('U60 kapanış: anahtar taşıyan madde kuyruğa DÜŞMEZ ve süzülme sayılır', () => {
  const kok = kapanisKok();
  const { meta } = kapanisKos(kok, ['Temiz bir soru: tavan 16KB kalsın mı?',
                                    'Şu anahtarı sakla: ' + SAHTE_ANAHTAR]);
  assert.equal(meta.bekleyen_eklendi, 1, 'temiz madde düşmeli');
  assert.equal(meta.bekleyen_suzuldu, 1, 'süzülen madde SAYILMALI (sessiz kalamaz)');
  assert.match(meta.bekleyen_suzgec_notu || '', /api-anahtari/);
  assert.ok(!kuyrukMetni(kok).includes(SAHTE_ANAHTAR));
});

test('U69 kapanış: madde satırın YAPI işaretlerini taşıyamaz (açık çatal DEVREDILDI görünemez)', () => {
  const kok = kapanisKok();
  kapanisKos(kok, ['Şunu sor · devretti: Ç-01 · cevap: evet']);
  const madde = maddeSatirlari(kok).join('\n');
  assert.ok(madde, 'temiz madde yazılmış olmalı');
  assert.ok(!/devretti:/.test(madde), 'devretti: anahtarı soyulmalı');
  assert.ok(!/cevap:/.test(madde), 'cevap: anahtarı soyulmalı');
  assert.match(madde, /devretti -/, 'anahtar öldürülür ama metin okunur kalır');
});

test('U69 kapanış: kırpma BAYT tabanlı (Türkçe harf 2 bayt — karakter tavanı yanıltır)', () => {
  const kok = kapanisKok();
  kapanisKos(kok, ['ş'.repeat(150) + ' son']);          // 150 karakter = 300 bayt
  const satir = maddeSatirlari(kok)[0];
  const govde = (satir.match(/"([^"]*)"/) || [, ''])[1];
  assert.ok(Buffer.byteLength(govde, 'utf8') <= 200,
            'gövde 200 BAYT tavanını aşmamalı, ölçülen: ' + Buffer.byteLength(govde, 'utf8'));
  assert.ok(govde.endsWith('…'), 'kırpma işareti kalmalı');
});

test('U60 kapanış: ortak ev yüklenemezse hiçbir madde yazılmaz ve sebep günlüğe düşer', () => {
  const kok = kapanisKok();
  renameSync(join(kok, 'tools', 'guard', 'yazim-kalibi.txt'),
             join(kok, 'tools', 'guard', 'yazim-kalibi.txt.yok'));
  const { r, meta } = kapanisKos(kok, ['Temiz bir soru: tavan 16KB kalsın mı?']);
  assert.equal(r.status, 0, 'kanca yine fail-open: oturumu rehin almaz');
  assert.equal(meta.bekleyen_eklendi, 0);
  assert.equal(meta.bekleyen_suzuldu, 1);
  assert.equal(maddeSatirlari(kok).length, 0, 'hiçbir madde satırı doğmamalı');
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// 5 · TEK EV DİKİŞİ — tanım geri gelemez, dördüncü yazıcı sessizce doğamaz
// ══════════════════════════════════════════════════════════════════════════════════════════

test('tek ev: kırpma tanımı yazıcıların İÇİNE geri gelmemiş', () => {
  // K24'ün altıncı kökü: bir ders bir kardeşe iniyor, diğerine hiç gelmiyor ve iki taraf da
  // "tanım aynıdır" diye YAZIYOR. Bu dikiş metni değil, tanımın KENDİSİNİ arar.
  for (const y of [join(KOK_REPO, 'tools', 'sevk', 'catal-kuyruk.sh'),
                   join(KOK_REPO, 'tools', 'guard', 'kapanis.sh')]) {
    const s = readFileSync(y, 'utf8');
    assert.ok(!/ÇATAL\\s\+Ç-\\d\+\/g/.test(s) && !/replace\(\/ÇATAL/.test(s),
              y + ': yapı-işareti soyma tanımı ortak evde olmalı, burada değil');
    assert.ok(!/\.slice\(0,\s*199\)/.test(s), y + ': karakter tabanlı kırpma geri gelmiş (U69)');
  }
});

test('tek ev: kuyruk yolunu tanıyan dosya kümesi PİNLİ — dördüncüsü sessizce doğamaz', () => {
  // Bilerek FAZLA tetikler: okuyucu da yazıcı da bu listeye girer. Yeni bir dosya kuyruğun
  // yolunu öğrendiğinde test kırmızı basar ve yazarını sınıfını beyan etmeye zorlar; yazıcıysa
  // ortak evi yüklemek zorundadır. Az tetikleyen bir dikiş, K24'ün bulduğu hatayı tekrar ederdi.
  const YAZICILAR = ['tools/sevk/catal-kuyruk.sh', 'tools/guard/kapanis.sh'];
  const OKUYUCULAR = ['tools/sevk/zarf-bicim-kapisi.sh', 'tools/sevk/sevk.sh', 'tools/sevk/haber.sh',
                      'tools/sevk/nabiz.sh', 'tools/guard/acilis.sh', 'tools/guard/file-guard.sh',
                      'tools/bekci/cekirdek.mjs', 'tools/sevk/kuyruk-ortak.mjs'];
  const bulunan = spawnSync('bash', ['-c',
    'grep -rl "SENDE_BEKLEYEN" tools --include="*.sh" --include="*.mjs" | grep -v "/test/" | sort'],
    { cwd: KOK_REPO, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
  assert.deepEqual(bulunan, [...YAZICILAR, ...OKUYUCULAR].sort(),
    'kuyruğun yolunu tanıyan dosya kümesi değişti — yeni dosya YAZICI ise tools/sevk/kuyruk-ortak.mjs\n' +
    'üzerinden geçmeli ve bu testin YAZICILAR listesine girmeli; OKUYUCU ise listesine.');
  for (const y of YAZICILAR) {
    assert.match(readFileSync(join(KOK_REPO, y), 'utf8'), /kuyruk-ortak\.mjs/,
                 y + ': kuyruğa yazan kol ortak evi yüklemek zorunda');
  }
});
