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
  const a = haber(kok, ['--olay', 'donem-basladi', '--donem', 'K1', '--kutu', 'KT-900',
                        '--tur', 'yapim', '--kip', 'bassiz', '--sinif', 'gercek', '--prova']);
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
