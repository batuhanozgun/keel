// kanal-e5.test.mjs — E5: haber kanalı · gönderim-öncesi süzgeç · DUR üç hat · watchdog/nabız ·
// şişme alarmı · sabah yüzeyi · canlılık denetimi.
// Sözleşme: docs/superpowers/plans/2026-07-28-e5-kanal-nabiz-sabah-tasarisi.md
// AĞA ÇIKILMAZ: gönderim testleri `--prova` kipinde koşar, yoklama `--sig` kipinde. Gerçek
// gönderim yalnız T6 tatbikatındadır (sahibin kendi adresine) — testin girdisi ağ olamaz.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const BETIKLER = ['ortak.sh', 'kilit.sh', 'zarf-ekle.sh', 'haber.sh', 'kanal-yokla.sh',
                  'nabiz.sh', 'watchdog-kur.sh', 'devir-kapisi.sh', 'zarf-bicim-kapisi.sh',
                  'catal-kuyruk.sh', 'karar-alani.sh'];

// SENTETİK DEĞER ÜRETİLİR, YAZILMAZ (E2 dersi): kapı redi alan ajan koruma betiklerini OKUYOR;
// testte duran gerçekçi bir literal, desen-tabanlı gözleri kirletir. Luhn kuralından üretiyoruz.
function luhnKart() {
  const govde = '42' + '1'.repeat(13);            // 15 hane, kontrol hanesi eklenecek
  let toplam = 0, ikile = true;
  for (let i = govde.length - 1; i >= 0; i--) {
    let d = Number(govde[i]);
    if (ikile) { d *= 2; if (d > 9) d -= 9; }
    ikile = !ikile; toplam += d;
  }
  return govde + String((10 - (toplam % 10)) % 10);
}

function kurulum({ kanal = true, donem = null, pano = true } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'e5-test-'));
  mkdirSync(join(kok, 'tools', 'sevk', 'damgalar'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  if (pano) mkdirSync(join(kok, '00_pano'), { recursive: true });
  for (const b of BETIKLER) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  // gorev-durumlari.txt VERI dosyasidir ve sevk onu FAIL-CLOSED arar (K5 tek evi; kume
  // bekci ile ORTAK): kurulu projede her zaman vardir, simulasyon da tasimak zorunda.
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'bekci', 'gorev-durumlari.txt'),
               join(kok, 'tools', 'bekci', 'gorev-durumlari.txt'));
  }
  for (const g of ['icerik-suzgeci.sh', 'gercek-veri-isaretleri.txt']) {
    copyFileSync(join(KOK_REPO, 'tools', 'guard', g), join(kok, 'tools', 'guard', g));
  }
  if (kanal) {
    writeFileSync(join(kok, 'tools', 'sevk', 'kanal.conf'),
      'SMTP_SUNUCU=smtp.ornek.gecersiz\nSMTP_PORT=587\nHESAP=deneme@ornek.gecersiz\n' +
      'ALICI=deneme@ornek.gecersiz\nKEYCHAIN_SERVIS=keel-test-yok\n' +
      'IMAP_SUNUCU=imap.ornek.gecersiz\nDUR_KONU=KEEL DUR\nSESSIZLIK_ESIK_DK=30\n');
  }
  if (donem) writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), donem);
  return kok;
}
const kos = (kok, ad, args = [], girdi = undefined) =>
  spawnSync('bash', [join(kok, 'tools', 'sevk', ad), ...args],
    { encoding: 'utf8', input: girdi, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
const haber = (kok, args) => kos(kok, 'haber.sh', args);
const gunluk = (kok) => {
  const y = join(kok, '00_pano', 'zarf-gunlugu.jsonl');
  return existsSync(y) ? readFileSync(y, 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s)) : [];
};
const DONEM_SATIRI = (damga) => `DONEM-E5\tKT-900\tyapim\tbassiz\ttatbikat\ndamga\t${damga}\n`;

// ── 1 · Serbest-metin yasağı: KURAL DEĞİL, ARAYÜZ ─────────────────────────────────────────
test('haber: serbest gövde argümanı YOKTUR (yasak arayüze gömülü)', () => {
  const kok = kurulum();
  for (const kotu of ['--govde', '--body', '--metin']) {
    const r = haber(kok, ['--olay', 'alarm', '--cins', 'kanal', kotu, 'ne istersem yazarım', '--prova']);
    assert.equal(r.status, 1, kotu + ' kabul edilmemeli');
    assert.match(r.stderr, /tanınmayan argüman/);
  }
  // Betikte gerçekten yok: kaynak taraması (arayüz sözleşmesinin ikinci hattı)
  const kaynak = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'haber.sh'), 'utf8');
  assert.ok(!/--govde\)/.test(kaynak), 'haber.sh içinde gövde argümanı dalı olmamalı');
});

test('haber: tanınmayan olay reddedilir; alarm --cins zorunludur', () => {
  const kok = kurulum();
  assert.match(haber(kok, ['--olay', 'uydurma', '--prova']).stderr, /tanınmayan olay/);
  assert.match(haber(kok, ['--olay', 'alarm', '--prova']).stderr, /--cins ister/);
});

// ── 2 · Dört olay ─────────────────────────────────────────────────────────────────────────
test('haber: dört olayın gövdesi şablondan kurulur (prova)', () => {
  const kok = kurulum();
  // --kip argümanı F1-5e ile KALKTI: haber.sh onu artık tanımaz (bilinmeyen argüman = hata).
  const a = haber(kok, ['--olay', 'donem-basladi', '--donem', 'K1', '--kutu', 'KT-900',
                        '--tur', 'yapim', '--sinif', 'gercek', '--prova']);
  assert.equal(a.status, 0);
  assert.match(a.stdout, /PROVA\tdonem-basladi\tTEMIZ/);
  assert.match(a.stdout, /Dönem açıldı: K1/);
  assert.match(a.stdout, /KEEL DUR/, 'durdurma yolu ilk postada yazılı olmalı');

  const b = haber(kok, ['--olay', 'donem-bitti', '--donem', 'K1', '--kutu', 'KT-900',
                        '--blok1', 'iki dönem', '--blok2', 'kuyruk boş', '--blok3', 'durdu', '--prova']);
  assert.match(b.stdout, /GECE NE OLDU\niki dönem/);
  assert.match(b.stdout, /SENDE BEKLEYEN\nkuyruk boş/);
  assert.match(b.stdout, /ŞİMDİ NE YAPIYOR\ndurdu/);

  const c = haber(kok, ['--olay', 'catal-bekliyor', '--donem', 'K1', '--kutu', 'KT-900',
                        '--catal', 'Ç-01', '--ceviri', 'soru metni', '--etki', 'etki metni',
                        '--bekletir', 'G-02', '--prova']);
  assert.match(c.stdout, /Ç-01/);
  assert.match(c.stdout, /soru metni/);
  assert.match(c.stdout, /SENDE_BEKLEYEN\.md/, 'cevap yolu bilgisayardadır — uzaktan cevap yok');

  const d = haber(kok, ['--olay', 'alarm', '--cins', 'sisme', '--donem', 'K1', '--kutu', 'KT-900',
                        '--detay', 'kutu büyüdü', '--prova']);
  assert.match(d.stdout, /ALARM \(sisme\)/);
  assert.match(d.stdout, /kutu büyüdü/);
});

// ── 3 · Gönderim-öncesi ZORUNLU süzgeç (paketin en kritik güvencesi) ──────────────────────
test('haber: süzgeç eşleşmesi postayı DURDURUR; değer sansürlü şablona SIZMAZ', () => {
  const kok = kurulum();
  const kart = luhnKart();
  const r = haber(kok, ['--olay', 'alarm', '--cins', 'kirmizi', '--donem', 'K1', '--kutu', 'KT-900',
                        '--detay', 'müşteri kaydı ' + kart + ' yazıldı', '--prova']);
  assert.equal(r.status, 3, 'süzgeç redi 3 ile bildirilir');
  assert.match(r.stdout, /SANSURLU/);
  assert.match(r.stdout, /önleme süzgecinde DURDU \(kart\)/);
  assert.ok(!r.stdout.includes(kart), 'DEĞER hiçbir kanala sızmamalı');
  assert.ok(!r.stdout.includes('müşteri kaydı'), 'özgün metnin kendisi de taşınmamalı');
  assert.ok(!r.stderr.includes(kart));
});

test('haber: süzgeç KOŞAMAZSA da temiz sayılmaz (fail-closed)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'), '#!/bin/bash\nexit 90\n');
  const r = haber(kok, ['--olay', 'alarm', '--cins', 'kanal', '--donem', 'K1', '--kutu', 'KT-900',
                        '--detay', 'sıradan metin', '--prova']);
  assert.equal(r.status, 3);
  assert.match(r.stdout, /süzgeç koşamadı/);
  assert.ok(!r.stdout.includes('sıradan metin'), 'tarayamadığı metni taşımaz');
});

test('haber: alan tavanı aşılırsa KESİLDİĞİ yazılır (sessiz kırpma yok)', () => {
  const kok = kurulum();
  const r = haber(kok, ['--olay', 'alarm', '--cins', 'kanal', '--donem', 'K1', '--kutu', 'KT-900',
                        '--detay', 'x'.repeat(2000), '--prova']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /karakter kesildi/);
});

// ── 4 · Kanal yoklaması (fail-closed) ─────────────────────────────────────────────────────
test('kanal-yokla: conf yok / eksik / Keychain yok → HAZIR DEĞİL + sebep', () => {
  const yok = kurulum({ kanal: false });
  const r0 = kos(yok, 'kanal-yokla.sh', ['--sig']);
  assert.equal(r0.status, 1);
  assert.match(r0.stdout, /HAZIR DEĞİL · kanal\.conf yok/);

  const eksik = kurulum({ kanal: false });
  writeFileSync(join(eksik, 'tools', 'sevk', 'kanal.conf'), 'SMTP_PORT=587\n');
  assert.match(kos(eksik, 'kanal-yokla.sh', ['--sig']).stdout, /eksik alan.*SMTP_SUNUCU/);

  const tam = kurulum();
  const r = kos(tam, 'kanal-yokla.sh', ['--sig']);
  assert.equal(r.status, 1, 'Keychain kaydı olmayan kanal HAZIR olamaz');
  assert.match(r.stdout, /Keychain kaydı yok/);
  assert.match(r.stdout, /add-generic-password/, 'sebep, düzeltme komutunu da söyler');
});

test('kanal.conf SOURCE edilmez: kabuk enjeksiyonu ve kontrol karakteri geçmez', () => {
  const kok = kurulum({ kanal: false });
  writeFileSync(join(kok, 'tools', 'sevk', 'kanal.conf'),
    'SMTP_SUNUCU=$(touch ' + join(kok, 'SIZDI') + ')\nHESAP=a@b.c\nALICI=a@b.c\n');
  kos(kok, 'kanal-yokla.sh', ['--sig']);
  assert.ok(!existsSync(join(kok, 'SIZDI')), 'conf değeri komut olarak KOŞMAMALI');
});

// ── 5 · DUR üç hat ────────────────────────────────────────────────────────────────────────
test('DUR hat-1: .dur varken yeni alt-ajan AÇILMAZ (frenleme hattı)', () => {
  const kok = kurulum({ donem: DONEM_SATIRI(new Date().toISOString()) });
  writeFileSync(join(kok, 'tools', 'sevk', '.dur'), 'uzaktan · posta · deneme\n');
  const r = kos(kok, 'devir-kapisi.sh', [], JSON.stringify({
    tool_name: 'Agent', tool_input: { subagent_type: 'uretici', prompt: 'gorev: G-01' } }));
  assert.equal(r.status, 2, 'DUR varken çağrı kesilmeli');
  assert.match(r.stderr, /DUR işareti var/);
  assert.match(r.stderr, /Yeni alt-ajan AÇILMAZ/);
});

test('DUR hat-1 negatif: .dur yokken çağrı bu kapıdan DUR sebebiyle geçmez', () => {
  const kok = kurulum({ donem: DONEM_SATIRI(new Date().toISOString()) });
  const r = kos(kok, 'devir-kapisi.sh', [], JSON.stringify({
    tool_name: 'Agent', tool_input: { subagent_type: 'uretici', prompt: 'gorev: G-01' } }));
  assert.ok(!/DUR işareti/.test(r.stderr), 'DUR yokken DUR gerekçesi üretilmemeli');
});

test('DUR hat-2: SubagentStop dönüşünde dur-alindi kaydı düşer (görülme anı)', () => {
  const kok = kurulum({ donem: DONEM_SATIRI(new Date().toISOString()) });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  writeFileSync(join(kok, '.claude', 'agents', 'uretici.md'), '---\nname: uretici\n---\n');
  writeFileSync(join(kok, 'tools', 'sevk', '.dur'), 'elle · sahip durdurdu\n');
  kos(kok, 'zarf-bicim-kapisi.sh', [], JSON.stringify({
    agent_type: 'uretici',
    last_assistant_message: ['BİTEN: G-01 — iş · kanıt: 00_pano/PANO.md:1', 'ÇATAL: yok',
      'DEĞERLENDİRMEDİKLERİM: yok', 'SIRADAKİ: kapalı', 'TÜRETME-İZİ: yok', 'GERİ-ÇEKİLEN: yok'].join('\n') }));
  const kayitlar = gunluk(kok).filter((j) => j.tip === 'dur-alindi');
  assert.equal(kayitlar.length, 1, 'DUR görülme anı günlüğe geçmeli');
  assert.equal(kayitlar[0].kaynak, 'isaret');
});

// ── 6 · Watchdog / nabız ──────────────────────────────────────────────────────────────────
test('nabız: dönem yokken SESSİZ (sıradan günler etkilenmez) ama canlılık damgası basar', () => {
  const kok = kurulum();
  const r = kos(kok, 'nabiz.sh');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '', 'dönem yoksa hiçbir şey söylemez');
  assert.ok(existsSync(join(kok, 'tools', 'sevk', '.nabiz-son')), 'canlılık damgası her turda basılır');
  assert.equal(gunluk(kok).length, 0, 'dönem yokken günlüğe satır düşmez');
});

test('nabız durum (b): dönem AÇIK ama HİÇ nabız yok → sessizlik alarmı', () => {
  const eski = new Date(Date.now() - 90 * 60000).toISOString();
  const kok = kurulum({ donem: DONEM_SATIRI(eski) });
  appendFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'),
    JSON.stringify({ surum: 1, ts: eski, donem: 'DONEM-E5', tip: 'donem-acilis' }) + '\n');
  kos(kok, 'nabiz.sh');
  const a = gunluk(kok).filter((j) => j.tip === 'alarm');
  assert.equal(a.length, 1, 'açılıştan başka kayıt yoksa alarm düşmeli');
  assert.equal(a[0].durum, 'SESSIZ_B');
  assert.ok(existsSync(join(kok, 'tools', 'sevk', '.donem-acik')), 'watchdog dönemi DİRİLTMEZ ve göstergeyi silmez');
});

test('nabız durum (a): nabız var ama eşik aşıldı → sessizlik alarmı', () => {
  const eski = new Date(Date.now() - 90 * 60000).toISOString();
  const kok = kurulum({ donem: DONEM_SATIRI(eski) });
  const y = join(kok, '00_pano', 'zarf-gunlugu.jsonl');
  appendFileSync(y, JSON.stringify({ surum: 1, ts: eski, donem: 'DONEM-E5', tip: 'donem-acilis' }) + '\n');
  appendFileSync(y, JSON.stringify({ surum: 1, ts: eski, donem: 'DONEM-E5', tip: 'nabiz' }) + '\n');
  kos(kok, 'nabiz.sh');
  const a = gunluk(kok).filter((j) => j.tip === 'alarm');
  assert.equal(a.length, 1);
  assert.equal(a[0].durum, 'SESSIZ_A');
});

test('nabız: eşik içindeki taze dönemde alarm YOK (yanlış-pozitif freni)', () => {
  const simdi = new Date().toISOString();
  const kok = kurulum({ donem: DONEM_SATIRI(simdi) });
  appendFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'),
    JSON.stringify({ surum: 1, ts: simdi, donem: 'DONEM-E5', tip: 'nabiz' }) + '\n');
  kos(kok, 'nabiz.sh');
  assert.equal(gunluk(kok).filter((j) => j.tip === 'alarm').length, 0);
});

test('nabız: dönem kapandıysa uyanık-tutma savı BIRAKILIR (sav sızıntısı ayrı arızadır)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'tools', 'sevk', '.caffeinate-pid'), '999999999\n');
  kos(kok, 'nabiz.sh');
  assert.ok(!existsSync(join(kok, 'tools', 'sevk', '.caffeinate-pid')), 'dönem yokken sav kaydı temizlenir');
});

// ── 7 · Canlılık: işaret dosyası YETMEZ ───────────────────────────────────────────────────
test('canlılık: watchdog işareti şekilsiz / iş yüklü değil → gerçek kutu şartı DÜŞER', () => {
  const kok = kurulum();
  const eksikler = (yaz) => {
    if (yaz !== null) writeFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'), yaz);
    const r = spawnSync('bash', ['-c',
      '. "$1/tools/sevk/ortak.sh"; CLAUDE_PROJECT_DIR="$1" gercek_kutu_eksikleri "$1/tools/sevk"', '_', kok],
      { encoding: 'utf8' });
    return r.stdout;
  };
  assert.match(eksikler(null), /watchdog-kaydi/, 'işaret yokken eksik');
  assert.match(eksikler('launchd: var gibi\n'), /watchdog-kaydinda-etiket-yok/, 'şekilsiz işaret yetmez');
  assert.match(eksikler('etiket=dev.keel.nabiz.olmayan-' + process.pid + '\n'), /watchdog-isi-YUKLU-DEGIL/,
    'yüklü olmayan iş yetmez — dosyada duran ölü kural');
});

test('canlılık: kanal yoklaması yoksa gerçek kutu şartı DÜŞER', () => {
  const kok = kurulum({ kanal: false });
  const r = spawnSync('bash', ['-c',
    'rm -f "$1/tools/sevk/kanal-yokla.sh"; . "$1/tools/sevk/ortak.sh"; CLAUDE_PROJECT_DIR="$1" gercek_kutu_eksikleri "$1/tools/sevk"', '_', kok],
    { encoding: 'utf8' });
  assert.match(r.stdout, /kanal-yoklamasi-yok/);
});

// ── 8 · file-guard kanal dikişi ───────────────────────────────────────────────────────────
test('file-guard: ajan haber/nabız betiklerini çağıramaz; sıradan komutlar serbest', () => {
  const g = (komut) => spawnSync('bash', [join(KOK_REPO, 'tools', 'guard', 'file-guard.sh')], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: KOK_REPO },
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: komut } }) });
  for (const k of ['bash tools/sevk/haber.sh --olay alarm', 'sh ./tools/sevk/nabiz.sh',
                   'echo x && bash tools/sevk/haber.sh --olay donem-bitti']) {
    const r = g(k);
    assert.equal(r.status, 2, 'engellenmeli: ' + k);
    assert.match(r.stderr, /haber kanalı ajan eliyle çağrılamaz/);
  }
  for (const k of ['ls -la', 'grep -rn haber docs/', 'git status']) {
    assert.equal(g(k).status, 0, 'serbest kalmalı: ' + k);
  }
});

// ── 9 · Günlük şeması: yeni tipler ────────────────────────────────────────────────────────
test('zarf-ekle: E5 tipleri kabul edilir, uydurma tip REDDEDİLİR (beyaz liste fail-closed)', () => {
  const kok = kurulum();
  const yaz = (tip) => spawnSync('bash', [join(kok, 'tools', 'sevk', 'zarf-ekle.sh')], {
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
    input: JSON.stringify({ surum: 1, ts: '2026-07-28T10:00:00Z', donem: 'K1', tip }) });
  for (const t of ['haber', 'dur-alindi', 'gorev-sayaci', 'alarm']) {
    assert.equal(yaz(t).status, 0, t + ' kabul edilmeli');
  }
  const kotu = yaz('uydurma-tip');
  assert.equal(kotu.status, 1);
  assert.match(kotu.stderr, /bilinmeyen/);
});

// ═════════════════════════════════════════════════════════════════════════════════════════
// K11 · E5 hüküm turunun üç sert arızası (U26 · U27 · U28). Üçünün ortak kökeni:
// "ÖLÇEMEDİM"i ölçülmüş bir değere çevirmek — sentinel sayı, yalan etiket, sessiz atlama.
// ═════════════════════════════════════════════════════════════════════════════════════════

// ── U28 · Değeri eksik seçenek: `shift 2` sonsuz döngüsü ──────────────────────────────────
test('haber/U28: değersiz kalan seçenek HATA verir; süreç ASILMAZ', () => {
  const kok = kurulum();
  // Seçenek listesi KAYNAKTAN okunur: elle tutulan bir kopya bayatlar ve yeni seçenek
  // testsiz doğar. Kapsam kendini seçer (bekçi madde 24 emsali).
  const kaynak = readFileSync(join(KOK_REPO, 'tools', 'sevk', 'haber.sh'), 'utf8');
  const es = kaynak.match(/^DEGERLI_SECENEKLER='([^']+)'/m);
  assert.ok(es, 'değerli seçenekler TEK listede olmalı — test o çapadan okur');
  const secenekler = es[1].trim().split(/\s+/);
  assert.ok(secenekler.length >= 15, 'liste beklenenden kısa: ' + secenekler.length);

  // KAPSAM KENDİNİ SEÇERKEN KÜÇÜLEBİLİR: liste kaynaktan okunduğu için bir seçenek listeden
  // DÜŞERSE test de onunla birlikte küçülür ve düşüşü göremez (kasıtlı bozmada ölçüldü —
  // bozma YEŞİL kalmıştı). İki bağımsız yüzey karşılıklı sınanır: beyaz liste ve ATAMA dalları.
  // Hangisi kayarsa kümeler ayrışır; tek yönlü bir çapa bu sınıfı hiç göremezdi.
  const atananlar = [...kaynak.matchAll(/^ {4}(--[a-z0-9]+)\) [A-Z0-9_]+="\$DEGER" ;;$/gm)].map((m) => m[1]);
  assert.deepEqual([...secenekler].sort(), [...atananlar].sort(),
    'beyaz liste ile atama dalları AYRIŞTI — biri diğerine sessizce ekleniyor/düşüyor');
  // Ayrışma çalışma anında da SESLİ olmalı: iç tutarsızlık dalı arayüzün ikinci hattıdır.
  assert.match(kaynak, /\*\) hata "iç tutarsızlık: \$SEC beyaz listede ama atanmıyor/,
    'atama case\'inin fail-closed dalı kalkmış');

  for (const s of secenekler) {
    const r = spawnSync('bash', [join(kok, 'tools', 'sevk', 'haber.sh'), s],
      { encoding: 'utf8', timeout: 10000, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
    assert.equal(r.signal, null, s + ': süreç zaman aşımıyla ÖLDÜRÜLDÜ — sonsuz döngü yaşıyor');
    assert.equal(r.status, 1, s + ': değersiz seçenek 1 dönmeli');
    assert.match(r.stderr, /değersiz kaldı/, s + ': sebep söylenmeli');
  }
  // Beyaz liste ile atama listesi AYRIŞMAZ: her seçenek değeriyle verildiğinde atanır.
  for (const s of secenekler) {
    const r = haber(kok, ['--olay', 'alarm', '--cins', 'kanal', s, 'x', '--prova']);
    assert.doesNotMatch(r.stderr || '', /iç tutarsızlık/, s + ' beyaz listede ama atanmıyor');
  }
  // Değersiz bayraklar listeye SIZMAZ (sızsalardı `--prova` değer isterdi).
  for (const bayrak of ['--prova', '--sayacsiz']) {
    assert.ok(!secenekler.includes(bayrak), bayrak + ' değer isteyen seçenek değildir');
  }
  // Tanınmayan argüman hâlâ KENDİ sebebini söyler (değersizlik mesajının arkasına saklanmaz).
  const t = spawnSync('bash', [join(kok, 'tools', 'sevk', 'haber.sh'), '--govde'],
    { encoding: 'utf8', timeout: 10000, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
  assert.match(t.stderr, /tanınmayan argüman/);
});

// ── U26 · "Ölçemedim" ile "ölçtüm, kötü" ayrımı ───────────────────────────────────────────
const zehirliBin = (kok) => {                 // PATH'e çıplak `node` çağrısını ÖLDÜREN bir shim
  const d = join(kok, 'zehirli-bin');
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'node'), '#!/bin/sh\nexit 66\n');
  chmodSync(join(d, 'node'), 0o755);
  return d;
};
const kabukta = (kok, govde, env = {}) => spawnSync('bash', ['-c',
  '. "$1/tools/sevk/ortak.sh"; ' + govde, '_', kok],
  { encoding: 'utf8', env: { ...process.env, ...env } });

test('ortak/U26: nabız yaşı ÖLÇÜLEMEYİNCE sayı basmaz — 999 sentineli kalktı', () => {
  const kok = kurulum();
  const damga = join(kok, 'tools', 'sevk', '.nabiz-son');
  const olc = (env = {}, on = '') => {
    const r = kabukta(kok, on + 'nabiz_yasi_dk "$1/tools/sevk/.nabiz-son"; printf "|%s" "$?"', env);
    const [cikti, kod] = r.stdout.split('|');
    return { cikti, kod };
  };

  writeFileSync(damga, new Date(Date.now() - 5 * 60000).toISOString() + '\n');
  const a = olc();
  assert.equal(a.kod, '0', 'taze damga ÖLÇÜLEBİLMELİ');
  assert.ok(Number(a.cikti) >= 4 && Number(a.cikti) <= 7, 'yaş ~5 dk olmalı, ölçülen: ' + a.cikti);

  // node HİÇ bulunamıyor → 2 (ölçülemedi) ve çıktı BOŞ. Eskiden burası 999 basıyordu ve
  // 999 dakikalık bir "yaş" gibi karşılaştırmaya giriyordu.
  const b = olc({}, 'node_bul() { return 1; }; NODE_BIN=""; ');
  assert.equal(b.kod, '2', 'node yoksa ölçülemedi (2) dönmeli');
  assert.equal(b.cikti, '', 'ölçülemeyen yaş SAYI basmaz');

  // Damga çözülemiyor → 3 (ayrı sınıf: dosya var ama tarih değil)
  writeFileSync(damga, 'bu bir tarih değil\n');
  assert.equal(olc().kod, '3', 'bozuk damga ayrı sınıftır');

  // ÇIPLAK `node` ÇAĞRISI KALKTI: PATH'teki node zehirliyken NODE_BIN'den ölçer.
  // Arızanın canlı hâli tam buydu — launchd/GUI oturumunun PATH'i dardır.
  writeFileSync(damga, new Date(Date.now() - 7 * 60000).toISOString() + '\n');
  const d = olc({ PATH: zehirliBin(kok) + ':' + process.env.PATH, NODE_BIN: process.execPath });
  assert.equal(d.kod, '0', 'NODE_BIN verilmişken PATH zehirli olsa da ölçmeli');
  assert.ok(Number(d.cikti) >= 6 && Number(d.cikti) <= 9, 'yaş ~7 dk olmalı, ölçülen: ' + d.cikti);
});

test('ortak/U26: gerçek kutu şartı, ölçemediğinde "BAYAT" DEMEZ', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'), 'etiket=dev.keel.nabiz.k11-test\n');
  writeFileSync(join(kok, 'tools', 'sevk', '.nabiz-son'), new Date().toISOString() + '\n');
  // launchctl dalı testte HİÇ koşmuyordu (kapının kör kipi): yükleme sorgusu artık kendi
  // fonksiyonunda, böylece kuyruğun tamamı ölçülebiliyor.
  const YUKLU = 'watchdog_isi_yuklu() { return 0; }; ';
  const eksik = (on = '') => kabukta(kok, YUKLU + on +
    'CLAUDE_PROJECT_DIR="$1" gercek_kutu_eksikleri "$1/tools/sevk"').stdout;

  assert.doesNotMatch(eksik(), /watchdog-nabzi/, 'taze damga + yüklü iş → nabız kalemi eksik değil');

  const kor = eksik('node_bul() { return 1; }; NODE_BIN=""; ');
  assert.match(kor, /watchdog-nabzi-OLCULEMEDI/, 'ölçülemeyen nabız ADIYLA söylenir');
  assert.doesNotMatch(kor, /BAYAT/, 'ölçülemeyene BAYAT denmez');
  assert.doesNotMatch(kor, /999/, '999 sentineli sahip yüzeyine sızmaz');

  writeFileSync(join(kok, 'tools', 'sevk', '.nabiz-son'),
    new Date(Date.now() - 120 * 60000).toISOString() + '\n');
  assert.match(eksik(), /watchdog-nabzi-BAYAT\(1[12][0-9]dk\)/, 'GERÇEKTEN bayat nabız hâlâ bayattır');
});

// ── U27 · Uzaktan DUR: SAHTE IMAP TAŞIYICISI ──────────────────────────────────────────────
// E5 kendi sınırını ilan etmişti: "canlı IMAP hiç koşulmadığı için hiçbir test bunu göremezdi".
// U27 tam o sınırın faturasıydı. Taşıyıcı (curl) ve parola kaynağı (security) PATH'te
// sahtelenir; DUR hattının TAMAMI ağsız koşar ve gönderilen IMAP isteği ölçülebilir hâle gelir.
// Sahte sunucu curl'ün ÖLÇÜLMÜŞ sınırını da taklit eder: BODY.PEEK üretilemediği için
// ÇEKİLEN İLETİ \Seen İŞARETLENİR. Kendini körleştirme ancak bu taklitle görünür.
const SAHTE_CURL = `
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
const KUTU = process.env.SAHTE_KUTU, LOG = process.env.SAHTE_LOG;
let konf = ""; try { konf = readFileSync(0, "utf8"); } catch {}
appendFileSync(LOG, konf + "\\n--- ---\\n");
const kutu = JSON.parse(readFileSync(KUTU, "utf8"));
const url = (konf.match(/^url = "([^"]*)"/m) || [])[1] || "";
const istekHam = (konf.match(/^request = "(.*)"$/m) || [])[1] || "";
if (istekHam) {
  const istek = istekHam.replace(/\\\\/g, "");
  let aday = kutu;
  if (/\\bUNSEEN\\b/.test(istek)) aday = aday.filter((m) => !m.seen);
  const kEs = istek.match(/HEADER Subject "([^"]*)"/);
  if (kEs) { const k = kEs[1].toLowerCase(); aday = aday.filter((m) => (m.subject || "").toLowerCase().includes(k)); }
  const sEs = istek.match(/\\bSINCE ([0-9]{1,2}-[A-Za-z]{3}-[0-9]{4})\\b/);
  if (sEs) { const t = Date.parse(sEs[1].replace(/-/g, " ") + " 00:00:00Z"); aday = aday.filter((m) => Date.parse(m.date) >= t); }
  process.stdout.write("* SEARCH " + aday.map((m) => m.uid).join(" ") + "\\r\\n");
  process.exit(0);
}
const uEs = url.match(/;UID=(\\d+)/);
if (uEs) {
  const m = kutu.find((x) => String(x.uid) === uEs[1]);
  if (!m) process.exit(0);
  const ilkti = !m.seen;
  m.seen = true;                                  // curl BODY.PEEK ÜRETEMEZ (ölçülmüş sınır)
  writeFileSync(KUTU, JSON.stringify(kutu));
  if (m.bozukIlkCekim && ilkti) process.exit(0);  // ağ tökezlemesi: sunucu işaretledi, yanıt geldi sayılmaz
  process.stdout.write("From: " + m.from + "\\r\\nDate: " + m.date + "\\r\\n\\r\\n");
}
`;
function sahteImap(kok, iletiler) {
  const bin = join(kok, 'sahte-bin');
  mkdirSync(bin, { recursive: true });
  const kutuYolu = join(kok, 'sahte-imap-kutu.json');
  const logYolu = join(kok, 'sahte-imap-istek.log');
  writeFileSync(kutuYolu, JSON.stringify(iletiler));
  writeFileSync(logYolu, '');
  const js = join(kok, 'sahte-curl.mjs');
  writeFileSync(js, SAHTE_CURL);
  writeFileSync(join(bin, 'curl'),
    `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(js)} "$@"\n`);
  chmodSync(join(bin, 'curl'), 0o755);
  writeFileSync(join(bin, 'security'), '#!/bin/sh\nprintf "sahte-parola\\n"\n');
  chmodSync(join(bin, 'security'), 0o755);
  return {
    env: { PATH: bin + ':' + process.env.PATH, SAHTE_KUTU: kutuYolu, SAHTE_LOG: logYolu },
    kutu: () => JSON.parse(readFileSync(kutuYolu, 'utf8')),
    istekler: () => readFileSync(logYolu, 'utf8'),
  };
}
const ALICI = 'deneme@ornek.gecersiz';
const durKurulum = (damgaMs) => {
  const damga = new Date(damgaMs).toISOString();
  const kok = kurulum({ donem: DONEM_SATIRI(damga) });
  appendFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'),
    JSON.stringify({ surum: 1, ts: new Date().toISOString(), donem: 'DONEM-E5', tip: 'nabiz' }) + '\n');
  return kok;
};
const nabizKos = (kok, imap) => spawnSync('bash', [join(kok, 'tools', 'sevk', 'nabiz.sh')],
  { encoding: 'utf8', timeout: 30000, env: { ...process.env, ...imap.env, CLAUDE_PROJECT_DIR: kok } });

test('nabız/U27: DUR araması OKUNDU-BAYRAĞINA bağlı değil — çekim yarıda kalsa da ikinci tur bulur', () => {
  const kok = durKurulum(Date.now() - 60 * 60000);
  const imap = sahteImap(kok, [{
    uid: 7, subject: 'KEEL DUR', from: ALICI, date: new Date().toUTCString(),
    seen: false, bozukIlkCekim: true,
  }]);
  const durYolu = join(kok, 'tools', 'sevk', '.dur');

  nabizKos(kok, imap);                       // 1. tur: çekim yarıda kalır, sunucu \Seen işaretler
  assert.ok(!existsSync(durYolu), 'yarım çekimde DUR yazılmaz');
  assert.equal(imap.kutu()[0].seen, true, 'sahte sunucu curl sınırını taklit etmeli (\\Seen)');

  nabizKos(kok, imap);                       // 2. tur: ileti ARTIK Seen — arama onu hâlâ bulmalı
  assert.ok(existsSync(durYolu), 'ikinci turda DUR bulunmalı: arama kendini kör etmez');
  assert.match(readFileSync(durYolu, 'utf8'), /uzaktan · posta/);
  assert.ok(gunluk(kok).some((j) => j.tip === 'dur-alindi'), 'DUR günlüğe düşer');
  assert.doesNotMatch(imap.istekler(), /UNSEEN/, 'arama UNSEEN ile daraltılmaz');
});

test('nabız/U27: dönem açılışından ESKİ bir DUR postası bu koşuyu durdurmaz', () => {
  // İKİ KADEME ayrı ayrı ölçülür: SINCE bir GÜN çözünürlüğünde KABA ön-elemedir, hükmü
  // iletinin kendi Date başlığı verir. Tek bir örnekle ikisi ayırt edilemezdi.
  // (a) Kaba eleme — üç gün önceki posta sunucudan hiç dönmez.
  const eski = durKurulum(Date.now() - 60 * 60000);          // dönem 1 saat önce açıldı
  const imapEski = sahteImap(eski, [{
    uid: 3, subject: 'KEEL DUR', from: ALICI, seen: false,
    date: new Date(Date.now() - 3 * 24 * 3600000).toUTCString(),
  }]);
  nabizKos(eski, imapEski);
  assert.ok(!existsSync(join(eski, 'tools', 'sevk', '.dur')), 'üç gün önceki posta bu koşuyu durduramaz');
  assert.match(imapEski.istekler(), /SINCE [0-9]{2}-[A-Z][a-z]{2}-[0-9]{4}/, 'arama zamanla sınırlanır');

  // (b) İNCE hüküm — SINCE penceresinden GEÇEN ama dönem açılmadan ÖNCE yazılmış posta.
  // Gerçek hâli: bir önceki koşudan kalmış, sahibin bu gece için yazmadığı bir DUR.
  const once = durKurulum(Date.now() - 60 * 60000);
  const imapOnce = sahteImap(once, [{
    uid: 4, subject: 'KEEL DUR', from: ALICI, seen: false,
    date: new Date(Date.now() - 3 * 3600000).toUTCString(),   // dönemden 2 saat önce
  }]);
  nabizKos(once, imapOnce);
  assert.ok(!existsSync(join(once, 'tools', 'sevk', '.dur')), 'koşu başlamadan önceki posta bu koşuyu durduramaz');
  assert.ok(gunluk(once).some((j) => j.cins === 'dur-postasi-eski'), 'eleme İZ BIRAKIR, sessiz değildir');
});

test('nabız/U27: taze DUR postası ateşler; sahte gönderen REDDEDİLİR', () => {
  const taze = () => new Date().toUTCString();
  const k1 = durKurulum(Date.now() - 60 * 60000);
  nabizKos(k1, sahteImap(k1, [{ uid: 5, subject: 'KEEL DUR', from: ALICI, date: taze(), seen: false }]));
  assert.ok(existsSync(join(k1, 'tools', 'sevk', '.dur')), 'taze ve doğru gönderen DUR yazar');

  const k2 = durKurulum(Date.now() - 60 * 60000);
  nabizKos(k2, sahteImap(k2, [{ uid: 5, subject: 'KEEL DUR', from: 'saldirgan@kotu.gecersiz', date: taze(), seen: false }]));
  assert.ok(!existsSync(join(k2, 'tools', 'sevk', '.dur')), 'başka adresten gelen DUR yazmaz');
});

test('nabız/U27: IMAP ucu doldurulmamışsa uzaktan DUR SESSİZCE atlanmaz', () => {
  const kok = durKurulum(Date.now() - 60 * 60000);
  writeFileSync(join(kok, 'tools', 'sevk', 'kanal.conf'),
    'SMTP_SUNUCU=smtp.ornek.gecersiz\nHESAP=' + ALICI + '\nALICI=' + ALICI + '\nDUR_KONU=KEEL DUR\n');
  const imap = sahteImap(kok, []);
  nabizKos(kok, imap);
  const b = gunluk(kok).filter((j) => j.cins === 'uzaktan-dur-kapali');
  assert.equal(b.length, 1, 'eksik IMAP ucu ADIYLA bildirilir');
  assert.match(b[0].detay, /IMAP_SUNUCU/);
  nabizKos(kok, imap);
  assert.equal(gunluk(kok).filter((j) => j.cins === 'uzaktan-dur-kapali').length, 1,
    'dönem başına BİR iz — 15 dakikada bir tekrarlayan bulgu günlüğü boğar');
});

// ── U48 · U49 · KOŞUDA BULUNDU: aynı kökenin nabiz.sh içindeki iki kardeşi ─────────────────
// U26 kapanırken köken turu iki ikizini buldu. U26 "okuyamadım"ı bir SAYIYA çeviriyordu;
// bunlar aynı hatanın iki yarısı: (U48) sentinel yine bir ölçümmüş gibi karşılaştırmaya girer
// ve GERİ ALINAMAZ bir sonuç doğurur · (U49) üçüncü hâl DOĞRU üretilir ama HİÇBİR tüketiciye
// bağlanmamıştır — üretmek yetmez, bağlamak gerekir.
const capaSatiri = (ts) => JSON.stringify({
  kod: 'K7MN2', msgid: '<keel-K7MN2@ornek.gecersiz>', catal: 'Ç-04', donem: 'DONEM-E5',
  kutu: 'KT-900', ts, durum: 'acik', alarm: '', bicimsiz: 0,
  secenekler: ['evet', 'hayir'], gorulen: [],
}) + '\n';
const cevapKurulum = (ts) => {
  const kok = durKurulum(Date.now() - 60 * 60000);
  writeFileSync(join(kok, 'tools', 'sevk', 'kanal.conf'),
    'SMTP_SUNUCU=smtp.ornek.gecersiz\nHESAP=' + ALICI + '\nALICI=' + ALICI + '\n' +
    'IMAP_SUNUCU=imap.ornek.gecersiz\nDUR_KONU=KEEL DUR\nCEVAP_KANALI=acik\n');
  writeFileSync(join(kok, 'tools', 'sevk', '.cevap-capa'), capaSatiri(ts));
  return kok;
};
const capa = (kok) => JSON.parse(readFileSync(join(kok, 'tools', 'sevk', '.cevap-capa'), 'utf8')
  .split('\n').filter(Boolean)[0]);

test('nabız/U48: ÇÖZÜLEMEYEN damga "ömrü doldu" sayılmaz — canlı kod düşürülmez', () => {
  // Geri alınamazlık bu satırın tamamı: kod düşerse sahip telefondan ARTIK cevaplayamaz ve
  // üstüne "cevap süren doldu" postası alır. Belirsizlikte pahalı olan taraf DÜŞÜRMEKTİR.
  const kok = cevapKurulum('BU-BIR-TARIH-DEGIL');
  nabizKos(kok, sahteImap(kok, []));
  assert.equal(capa(kok).durum, 'acik', 'ölçülemeyen yaş yüzünden kod DÜŞÜRÜLMEMELİ');
  const b = gunluk(kok).filter((j) => j.cins === 'cevap-yasi-olculemedi');
  assert.equal(b.length, 1, 'ölçülemeyen yaş ADIYLA bildirilir');
  nabizKos(kok, sahteImap(kok, []));
  assert.equal(gunluk(kok).filter((j) => j.cins === 'cevap-yasi-olculemedi').length, 1,
    'kod başına BİR iz — her turda tekrarlayan bulgu günlüğü boğar');

  // Karşı örnek: GERÇEKTEN ömrü dolmuş kod hâlâ düşer (fren körelmedi).
  const eski = cevapKurulum(new Date(Date.now() - 100 * 3600000).toISOString());
  nabizKos(eski, sahteImap(eski, []));
  assert.equal(capa(eski).durum, 'suresi-doldu', 'gerçekten dolan ömür hâlâ düşer');
});

test('nabız/U49: ölçülemeyen sessizlik durumu SESSİZ geçmez (üçüncü hâl bağlandı)', () => {
  // Gösterge damgasız + günlük yok ⇒ "yapı sustu mu?" sorusu ÖLÇÜLEMEZ. Watchdog'un tek işi
  // sessizliği bildirmektir; onu ölçemediğini bildirmemek, tam da var oluş sebebinde kör olmaktır.
  const kok = kurulum({ donem: 'DONEM-E5\tKT-900\tyapim\tgercek\n' });   // ikinci satır YOK
  const r = nabizKos(kok, sahteImap(kok, []));
  assert.equal(r.status, 0);
  const b = gunluk(kok).filter((j) => j.cins === 'nabiz-olculemedi');
  assert.equal(b.length, 1, 'ölçülemeyen durum ADIYLA günlüğe düşer');
  assert.ok(gunluk(kok).some((j) => j.tip === 'alarm' && j.cins === 'nabiz-olculemedi'),
    'sahibe de gider: ölçemediğini söylemeyen watchdog yeşil basıyor demektir');
  // GÜNLÜK SATIRI POSTAYI ÖLÇMEZ: o satır haber çağrısından ÖNCE düşer, yani cins beyaz
  // listeden çıksa bile yeşil kalırdı (kasıtlı bozmada ölçüldü). Postanın arayüzden GEÇTİĞİNİ
  // ölçen tek mekanik iz, haber.sh'ın program-kusuru bulgusunun DÜŞMEMİŞ olmasıdır.
  assert.ok(!gunluk(kok).some((j) => j.cins === 'haber-cagrisi-gecersiz'),
    'alarm cinsi haber.sh beyaz listesinde yok — posta izsiz düşüyor');
});
