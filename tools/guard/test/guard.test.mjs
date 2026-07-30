import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, copyFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const GUARD = join(BURASI, '..', 'file-guard.sh');

const VARSAYILAN_LISTE = `# test listesi
[SERT]
tools/guard/
.claude/
.kurulum-tamam
02_kanon/kilitli/

[SORULUR]
02_kanon/golden/
00_genesis/
`;

function kurulum({ liste = VARSAYILAN_LISTE, kurulumTamam = true, aktifRol = null } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'guard-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, '02_kanon', 'kilitli'), { recursive: true });
  mkdirSync(join(kok, '02_kanon', 'golden'), { recursive: true });
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  mkdirSync(join(kok, '.claude'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'guard', 'korunan-yollar.txt'), liste);
  // E2 Hat-1: içerik süzgeci kurulu dokuda file-guard'ın ön şartıdır (yokluğu fail-closed engel).
  copyFileSync(join(BURASI, '..', 'icerik-suzgeci.sh'), join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'));
  copyFileSync(join(BURASI, '..', 'gercek-veri-isaretleri.txt'), join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  writeFileSync(join(kok, '.claude', 'settings.json'), '{}\n');
  writeFileSync(join(kok, '02_kanon', 'kilitli', 'K-01.md'), '# kilitli karar\n');
  if (kurulumTamam) writeFileSync(join(kok, '.kurulum-tamam'), 'kuruldu\n');
  if (aktifRol) writeFileSync(join(kok, 'tools', 'guard', '.aktif-rol'), aktifRol);
  return kok;
}

function kos(kok, girdi) {
  return spawnSync('bash', [GUARD], {
    input: typeof girdi === 'string' ? girdi : JSON.stringify(girdi),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
}

// F1-5f · dönem fixture'ı: gösterge + kutunun `İZİN:` satırı. İzin listesi KUTUDAN okunur;
// kutu yoksa ya da satır yoksa liste BOŞTUR (fail-closed) — "okuyamadım" ile "serbest" ayrı şeydir.
function donemAc(kok, { kutu = 'KT-900', izin = null } = {}) {
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), `DONEM-1\t${kutu}\tyapim\ttatbikat\ndamga\t2026-07-30T10:00:00Z\n`);
  if (izin !== null) {
    mkdirSync(join(kok, '01_kutular', kutu), { recursive: true });
    writeFileSync(join(kok, '01_kutular', kutu, 'KUTU.md'),
      `# ${kutu}\n\n## Duruş sözleşmesi\nBİTİŞ HÂLİ: x\nKANIT: y\nKISIT: z\nBÜTÇE: 3 ÜRETİM çağrısı\nİZİN:       ${izin}\n`);
  }
}

const edit = (kok, yol) => ({ tool_name: 'Edit', tool_input: { file_path: join(kok, yol) } });
const write = (kok, yol) => ({ tool_name: 'Write', tool_input: { file_path: join(kok, yol), content: 'x' } });

test('SERT: kilitli karara Edit → exit 2 + gerekçeli stderr', () => {
  const kok = kurulum();
  const r = kos(kok, edit(kok, '02_kanon/kilitli/K-01.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ENGEL/);
  assert.match(r.stderr, /02_kanon\/kilitli\//);
});

test('öz-koruma: file-guard.sh kendisine Edit → exit 2', () => {
  const kok = kurulum();
  const r = kos(kok, edit(kok, 'tools/guard/file-guard.sh'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ENGEL/);
});

test('öz-koruma: .claude/settings.json → exit 2', () => {
  const kok = kurulum();
  assert.equal(kos(kok, edit(kok, '.claude/settings.json')).status, 2);
});

test('SORULUR: golden dosyasına Edit → exit 0 + permissionDecision "ask" + gerekçe', () => {
  const kok = kurulum();
  const r = kos(kok, edit(kok, '02_kanon/golden/ornek-cikti.md'));
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(j.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /sahip/);
});

test('öncelik: iki bölüm de eşleşirse SERT kazanır', () => {
  const kok = kurulum({ liste: '[SERT]\n02_kanon/kilitli/\n\n[SORULUR]\n02_kanon/\n' });
  assert.equal(kos(kok, write(kok, '02_kanon/kilitli/K-02.md')).status, 2);
});

test('serbest yol → exit 0, çıktısız (kanon geneli dahil — karışma)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '01_kutular'), { recursive: true });
  const r1 = kos(kok, edit(kok, '01_kutular/KT-001/KUTU.md'));
  assert.equal(r1.status, 0);
  assert.equal(r1.stdout.trim(), '');
  const r2 = kos(kok, edit(kok, '02_kanon/KARAR_INDEKSI.md'));
  assert.equal(r2.status, 0);
  assert.equal(r2.stdout.trim(), '');
});

test('Write ile korunan dizinde YENİ dosya (henüz diskte yok) → exit 2', () => {
  const kok = kurulum();
  assert.equal(kos(kok, write(kok, 'tools/guard/yeni-script.sh')).status, 2);
});

test('NotebookEdit: notebook_path da yakalanır', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(kok, '02_kanon/kilitli/K-01.ipynb') } });
  assert.equal(r.status, 2);
});

test('dosya-yolu taşımayan araç çağrısı → karışmaz (exit 0, çıktısız; geniş matcher güvenliği)', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('koruma YAZMAYA karşıdır: Read korunan dosyada bile serbest (demo dersi)', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Read', tool_input: { file_path: join(kok, '02_kanon/kilitli/K-01.md') } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('MultiEdit de yazma sınıfı → exit 2', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'MultiEdit', tool_input: { file_path: join(kok, '02_kanon/kilitli/K-01.md') } });
  assert.equal(r.status, 2);
});

test('tanınmayan araç file_path taşısa bile karışılmaz (bilinçli sınır — ikinci hat bekçidedir)', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'YeniBirArac', tool_input: { file_path: join(kok, '02_kanon/kilitli/K-01.md') } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('dar PATH (GUI oturumu simülasyonu): aday-keşif node bulur, koruma çalışır', () => {
  const kok = kurulum();
  const r = spawnSync('bash', [GUARD], {
    input: JSON.stringify(edit(kok, '02_kanon/kilitli/K-01.md')),
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin', CLAUDE_PROJECT_DIR: kok, LC_ALL: 'C.UTF-8' },
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /\[SERT\]/, 'engel node-yokluğundan değil koruma kuralından gelmeli (aday-keşif kanıtı)');
});

test('göreli file_path proje köküne göre çözülür', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Edit', tool_input: { file_path: '02_kanon/kilitli/K-01.md' } });
  assert.equal(r.status, 2);
});

test('kurulum istisnası: .kurulum-tamam YOKKEN korunan-yollar.txt yazılabilir', () => {
  const kok = kurulum({ kurulumTamam: false });
  const r = kos(kok, write(kok, 'tools/guard/korunan-yollar.txt'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('kurulum istisnası: .kurulum-tamam işareti yazılabilir; SORULUR susarak geçer', () => {
  const kok = kurulum({ kurulumTamam: false });
  assert.equal(kos(kok, write(kok, '.kurulum-tamam')).status, 0);
  const r = kos(kok, write(kok, '00_genesis/GENESIS_DURUM.md'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('kurulum istisnası ÇEKİRDEKLİ: kurulum sürerken bile file-guard.sh ve .claude SERT kalır', () => {
  const kok = kurulum({ kurulumTamam: false });
  assert.equal(kos(kok, edit(kok, 'tools/guard/file-guard.sh')).status, 2);
  assert.equal(kos(kok, edit(kok, '.claude/settings.json')).status, 2);
});

test('kurulum istisnası ÇEVREDE GENİŞ: kurulum sürerken çekirdek-dışı SERT (kilitli, bekçi yolu) susarak geçer', () => {
  const kok = kurulum({ kurulumTamam: false, liste: VARSAYILAN_LISTE + '03_roller/bekci/bekci.sh\n' });
  const r1 = kos(kok, write(kok, '02_kanon/kilitli/K-01.md'));
  assert.equal(r1.status, 0);
  assert.equal(r1.stdout.trim(), '');
  const r2 = kos(kok, write(kok, '03_roller/bekci/bekci.sh'));
  assert.equal(r2.status, 0);
  assert.equal(r2.stdout.trim(), '');
});

test('kurulum bitince istisna kapanır: korunan-yollar.txt → exit 2', () => {
  const kok = kurulum();
  assert.equal(kos(kok, write(kok, 'tools/guard/korunan-yollar.txt')).status, 2);
});

test('fail-closed: liste dosyası yok → exit 2', () => {
  const kok = mkdtempSync(join(tmpdir(), 'guard-test-'));
  writeFileSync(join(kok, '.kurulum-tamam'), 'x\n');
  const r = kos(kok, { tool_name: 'Edit', tool_input: { file_path: join(kok, 'a.md') } });
  assert.equal(r.status, 2);
});

test('fail-closed KAPSAMLI DOĞRU: bozuk girdi yazma-izi taşıyorsa kilitler, taşımıyorsa karışmaz', () => {
  const kok = kurulum();
  // Yazma-aracı izi taşıyan bozuk JSON → karar verilemez → fail-closed engel.
  assert.equal(kos(kok, 'bozuk { "tool_name":"Edit" ...').status, 2);
  // Hiç yazma izi olmayan çöp girdi → yazma çağrısı olamaz → oturumu kilitleme (demo dersi).
  const r = kos(kok, 'bu json değil {');
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('fail-closed: bölüm başlıksız/boş liste → exit 2', () => {
  const kok = kurulum({ liste: '# sadece yorum\n' });
  assert.equal(kos(kok, edit(kok, 'herhangi.md')).status, 2);
});

test('Türkçe/harf disiplini: kanca KENDİSİ harf dönüşümü yapmaz — disk gerçeği belirler', () => {
  const kok = kurulum();
  // Bu makinenin dosya sistemi harfe duyarsızsa "02_KANON" diskteki 02_kanon'a çözülür → ENGEL doğru.
  // Duyarlıysa böyle bir yol yoktur → SERBEST doğru. Her iki dünyada da kanca case-folding YAPMAZ.
  const duyarsizFs = existsSync(join(kok, '02_KANON'));
  const r = kos(kok, edit(kok, '02_KANON/kilitli/K-01.md'));
  if (duyarsizFs) {
    assert.equal(r.status, 2, 'harfe duyarsız diskte gerçek dosya korunmalı');
  } else {
    assert.equal(r.status, 0, 'harfe duyarlı diskte bu ayrı (var olmayan) bir yoldur');
    assert.equal(r.stdout.trim(), '');
  }
});

test('boşluklu yol: "02_kanon/kilitli/karar 01.md" → exit 2', () => {
  const kok = kurulum();
  assert.equal(kos(kok, write(kok, '02_kanon/kilitli/karar 01.md')).status, 2);
});

test('../ kaçışı: kök içine geri çözülen HAM yol yine yakalanır', () => {
  const kok = kurulum();
  // join KULLANMA — join ".."yu testin içinde normalize eder, kancaya temiz yol gider (kanıt değeri kalmaz).
  const r = kos(kok, { tool_name: 'Edit', tool_input: { file_path: kok + '/01_x/../02_kanon/kilitli/K-01.md' } });
  assert.equal(r.status, 2);
});

test('rol kafesi: denetci (yazamaz) açıkken serbest yola Edit → exit 2 + "rol kafesi" gerekçesi', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  mkdirSync(join(kok, '01_kutular'), { recursive: true });
  const r = kos(kok, edit(kok, '01_kutular/KT-001.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /rol kafesi/);
  assert.match(r.stderr, /denetci/);
});

test('rol kafesi: Write ile de kesilir (kapı ölçütü b — iki yazma aracı ayrı kanıt)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  mkdirSync(join(kok, '01_kutular'), { recursive: true });
  assert.equal(kos(kok, write(kok, '01_kutular/deneme.md')).status, 2);
});

test('rol kafesi İSTİSNA: rolün kendi klasörü yazılabilir (DURUM.md kapanışı)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  mkdirSync(join(kok, '03_roller', 'denetci'), { recursive: true });
  const r = kos(kok, write(kok, '03_roller/denetci/DURUM.md'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('istisna SÖZLEŞMEYE işlemez: kendi ROL.md\'sine Write → exit 2 (rol kendi sözleşmesini yazamaz)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  mkdirSync(join(kok, '03_roller', 'denetci'), { recursive: true });
  const r = kos(kok, write(kok, '03_roller/denetci/ROL.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /rol kafesi/);
});

test('sahte ev damgası (köke çözülen "ev") → istisnasız kilit (savunma-derinliği)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t.\n' });
  mkdirSync(join(kok, '01_kutular'), { recursive: true });
  assert.equal(kos(kok, edit(kok, '01_kutular/KT-001.md')).status, 2);
});

test('rol kafesi: SERT yine önce — kilitli karara Edit denetci modunda da [SERT] gerekçesiyle engellenir', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, edit(kok, '02_kanon/kilitli/K-01.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /\[SERT\]/);
});

test('rol kafesi SORULUR\'u da keser: yazamaz rolde golden\'a Edit → exit 2 (ask düşmez)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, edit(kok, '02_kanon/golden/ornek.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /rol kafesi/);
});

test('rol kafesi: mod tam → davranış değişmez (serbest serbest, golden yine sorulur)', () => {
  const kok = kurulum({ aktifRol: 'uygulayici\ttam\t03_roller/uygulayici/\n' });
  mkdirSync(join(kok, '01_kutular'), { recursive: true });
  assert.equal(kos(kok, edit(kok, '01_kutular/KT-001.md')).status, 0);
  const r = kos(kok, edit(kok, '02_kanon/golden/ornek.md'));
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision, 'ask');
});

test('rol kafesi fail-closed: bozuk damga → yazma engellenir, gerekçede çözüm yolu', () => {
  const kok = kurulum({ aktifRol: 'anlamsız içerik\n' });
  const r = kos(kok, edit(kok, 'herhangi.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /aktif-rol/);
});

test('rol kafesi okumaya karışmaz: Read yazamaz rolde bile serbest (demo dersi sürer)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, { tool_name: 'Read', tool_input: { file_path: join(kok, '02_kanon/kilitli/K-01.md') } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('damga-dikişi: .aktif-rol\'e dokunan Bash komutu → sahibe sor (kabuk-kaçağının tek dikişi)', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'rm -f tools/guard/.aktif-rol' } });
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /damga/);
});

test('damga-dikişi okumayı kilitlemez: Read .aktif-rol → serbest, çıktısız', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const r = kos(kok, { tool_name: 'Read', tool_input: { file_path: join(kok, 'tools/guard/.aktif-rol') } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// --- Soğuk-denetim yaması (2026-07-16, E2): işaret-dikişi ---

test('işaret-dikişi: .kurulum-tamam MEVCUTKEN ona dokunan Bash → sahibe sor (koruma-rejimi anahtarı)', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'rm -f .kurulum-tamam' } });
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /kurulum işareti/);
});

test('işaret-dikişi kurulumda susar: işaret YOKKEN ona dokunan Bash serbest (GENESIS doğumu sürtünmesiz)', () => {
  const kok = kurulum({ kurulumTamam: false });
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'printf "kuruldu" > .kurulum-tamam' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('işaret araç hattında [SERT]: kurulumdan sonra .kurulum-tamam\'a Write → exit 2', () => {
  const kok = kurulum();
  assert.equal(kos(kok, write(kok, '.kurulum-tamam')).status, 2);
});

test('işaret-dikişi GLOB (hasım turu): işaret varken "rm -f .kurulum-*" → sahibe sor (literal olmayan da yakalanır)', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'rm -f .kurulum-*' } });
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /kurulum işareti/);
});

test('kurulum istisnası (faz-2): .kurulum-tamam YOKKEN .claude/skills/ yazılabilir (GENESIS beceri kurar)', () => {
  const kok = kurulum({ kurulumTamam: false });
  const r = kos(kok, write(kok, '.claude/skills/rol-denetci/SKILL.md'));
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('kurulum bitince .claude/skills/ SERT geri (beceri = kafes tanımı, ajan değiştiremez)', () => {
  const kok = kurulum();
  assert.equal(kos(kok, write(kok, '.claude/skills/rol-denetci/SKILL.md')).status, 2);
});

// --- Çapa-dikişi (V2 Öbek-1 düzeltmesi, 2026-07-23 — hasım bulgusu wf_e35b1e11) ---

test('çapa-dikişi: .taban-ref içeren Bash komutu kurulum bitmişken → sahibe sor', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git rev-parse HEAD > 02_kanon/kilitli/.taban-ref' } });
  assert.equal(r.status, 0);
  const j = JSON.parse(r.stdout);
  assert.equal(j.hookSpecificOutput.permissionDecision, 'ask');
  assert.match(j.hookSpecificOutput.permissionDecisionReason, /taban-ref/);
});

test('çapa-dikişi: kurulum sürerken .taban-ref komutu sorulmaz (çapanın G4\'te doğuşu sürtünmesiz)', () => {
  const kok = kurulum({ kurulumTamam: false });
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git rev-parse HEAD > 02_kanon/kilitli/.taban-ref' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// --- E2 önleme katmanı (2026-07-27; tasarı docs/superpowers/plans/2026-07-27-e2-onleme-tasarisi.md) ---
// Değerler ÜRETİLİR, literal saklanmaz (suzgec.test.mjs ile aynı kural).

function e2TcknUret(on9) {
  const d = on9.split('').map(Number);
  const t10 = ((((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10) + 10) % 10;
  const t11 = (d.reduce((a, b) => a + b, 0) + t10) % 10;
  return on9 + String(t10) + String(t11);
}
const E2_TCKN = e2TcknUret('581436729');
const askJson = (r) => JSON.parse(r.stdout).hookSpecificOutput;

test('E2 Hat-1: serbest yola bile TCKN içerikli Write → ENGEL (önleme bulgusu; yol değil içerik)', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Write', tool_input: { file_path: join(kok, '01_kutular/not.md'), content: `no ${E2_TCKN}` } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /önleme bulgusu \(tckn\)/);
  assert.ok(!r.stderr.includes(E2_TCKN), 'engel metni değeri sızdırmamalı');
});

test('E2 Hat-1: Edit yeni-içerik taranır; hassas ESKİYİ silen düzeltme serbest', () => {
  const kok = kurulum();
  const kirli = { tool_name: 'Edit', tool_input: { file_path: join(kok, 'a.md'), old_string: 'x', new_string: `tc ${E2_TCKN}` } };
  assert.equal(kos(kok, kirli).status, 2);
  const temizleyen = { tool_name: 'Edit', tool_input: { file_path: join(kok, 'a.md'), old_string: `tc ${E2_TCKN}`, new_string: 'temiz' } };
  assert.equal(kos(kok, temizleyen).status, 0);
});

test('E2 Hat-1 Bash yazım dikişi: yönlendirmeli komutta TCKN → ENGEL; yazımsız aynı komut serbest', () => {
  const kok = kurulum();
  assert.equal(kos(kok, { tool_name: 'Bash', tool_input: { command: `echo ${E2_TCKN} > not.txt` } }).status, 2);
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: `grep -r ${E2_TCKN} .` } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('E2 Hat-1 fail-closed: süzgeç dosyası yoksa yazma engellenir, Bash yaşar', () => {
  const kok = kurulum();
  rmSync(join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'));
  const r = kos(kok, write(kok, '01_kutular/x.md'));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /içerik süzgeci yok/);
  assert.equal(kos(kok, { tool_name: 'Bash', tool_input: { command: 'ls' } }).status, 0);
});

test('E2 Hat-2 dışa-giden: git push → sahibe sor; bileşik komutta da (settings-öneki göremez, dikiş görür)', () => {
  const kok = kurulum();
  for (const komut of ['git push origin main', 'cd /tmp && git push', 'echo bitti | mail -s rapor a@b.c']) {
    const r = kos(kok, { tool_name: 'Bash', tool_input: { command: komut } });
    assert.equal(r.status, 0, komut);
    assert.match(askJson(r).permissionDecisionReason, /DIŞARI çıkan/, komut);
  }
});

test('E2 Hat-2 dışa-giden komut-konumu: gömülü kelime yakalanmaz (alt-dize değil)', () => {
  const kok = kurulum();
  for (const komut of ['echo "high grade"', 'ls sshdir', 'git log --oneline', 'echo curl-benzeri-metin']) {
    const r = kos(kok, { tool_name: 'Bash', tool_input: { command: komut } });
    assert.equal(r.status, 0, komut);
    assert.equal(r.stdout.trim(), '', komut);
  }
});

test('F1-5f MCP dikişi: dönem-AÇIK iken izin penceresi AÇILMAZ — listede yoksa ENGEL, varsa serbest', () => {
  const kok = kurulum();
  const cagri = { tool_name: 'mcp__ornek__gonder', tool_input: { x: 'y' } };
  const kapali = kos(kok, cagri);
  assert.equal(kapali.status, 0);
  assert.equal(kapali.stdout.trim(), '', 'dönem yokken el-sürüşlü davranış değişmez');

  // Kutunun İZİN satırı yok → sınıf önceden serbest bırakılmamış → ENGEL (pencere YOK).
  donemAc(kok, { izin: 'yok' });
  const engel = kos(kok, cagri);
  assert.equal(engel.status, 2, 'dönemde ask penceresi açılmamalı: ' + engel.stdout);
  assert.match(engel.stderr, /izin penceresi AÇILMAZ/);
  assert.match(engel.stderr, /mcp/);
  assert.match(engel.stderr, /İZİN-ENGELİ/, 'ajana ne yapacağı söylenmeli (adımı atla + zarfa yaz)');

  // Sahip kutu açılışında sınıfı önceden serbest bıraktıysa çağrı GEÇER.
  donemAc(kok, { izin: 'mcp git-obje' });
  const serbest = kos(kok, cagri);
  assert.equal(serbest.status, 0);
  assert.equal(serbest.stdout.trim(), '', 'önceden izinli sınıfta soru da engel de olmamalı');
});

test('E2 git-obje dikişi: dönem-AÇIK iken commit sorulur; worktree bağlamında ENGEL; dönem yokken serbest', () => {
  const kok = kurulum();
  const commit = { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } };
  assert.equal(kos(kok, commit).status, 0);
  assert.equal(kos(kok, commit).stdout.trim(), '', 'dönem yokken dikiş yok');
  donemAc(kok, { izin: 'yok' });
  const engel = kos(kok, commit);
  assert.equal(engel.status, 2, 'dönemde commit sorusu pencere açmamalı: ' + engel.stdout);
  assert.match(engel.stderr, /git-obje/);
  donemAc(kok, { izin: 'git-obje' });
  assert.equal(kos(kok, commit).status, 0, 'İZİN listesindeki sınıf serbest geçmeli');
  donemAc(kok, { izin: 'yok' });
  const wtKomut = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git -C .claude/worktrees/ag-1 add .' } });
  assert.equal(wtKomut.status, 2);
  assert.match(wtKomut.stderr, /nesne veritabanını paylaşır/);
  const wtCwd = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git add .' }, cwd: join(kok, '.claude/worktrees/ag-1') });
  assert.equal(wtCwd.status, 2, 'çıplak git add worktree cwd üzerinden yakalanmalı');
});

test('E2 yazım+korumalı-yol dikişi: cp → golden sorulur; goldensiz yazım serbest', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'cp /tmp/a.md 02_kanon/golden/a.md' } });
  assert.equal(r.status, 0);
  assert.match(askJson(r).permissionDecisionReason, /korumalı yolu/);
  const serbest = kos(kok, { tool_name: 'Bash', tool_input: { command: 'echo x > 01_kutular/n.md' } });
  assert.equal(serbest.stdout.trim(), '');
});

test('E2 yazım dikişi kurulum penceresi: çekirdek-dışı susar, çekirdek yine sorulur (A5 ruhu)', () => {
  const kok = kurulum({ kurulumTamam: false });
  const golden = kos(kok, { tool_name: 'Bash', tool_input: { command: 'cp /tmp/a.md 02_kanon/golden/a.md' } });
  assert.equal(golden.stdout.trim(), '', 'GENESIS doğumu sürtünmesiz');
  const cekirdek = kos(kok, { tool_name: 'Bash', tool_input: { command: 'echo hile > tools/guard/file-guard.sh' } });
  assert.match(askJson(cekirdek).permissionDecisionReason, /korumalı yolu/);
});

// Worktree sanal kökü: kurulu projenin checkout'unu temsil eden GERÇEK worktree kur.
// `git worktree add`in bıraktığı `.git` DOSYASI zorunlu (hasım bulgusu: sanal kök yalnız gerçek
// worktree'de kurulur; uydurma .claude/worktrees/<x>/ yolu sanal kök AÇMAZ).
function worktreeKur(kok, ajan = 'ag-1') {
  const wt = join(kok, '.claude', 'worktrees', ajan);
  for (const d of ['01_kutular', 'tools/guard', '02_kanon/kilitli', '02_kanon/golden', '03_roller/denetci']) {
    mkdirSync(join(wt, d), { recursive: true });
  }
  writeFileSync(join(wt, '.git'), 'gitdir: ' + join(kok, '.git', 'worktrees', ajan) + '\n');
  writeFileSync(join(wt, '.kurulum-tamam'), 'kuruldu\n');
  return wt;
}

test('E2 worktree sanal kökü: iş alanı serbest, worktree içi çekirdek/kilitli yine SERT, golden yine sorulur', () => {
  const kok = kurulum();
  const wt = worktreeKur(kok);
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '01_kutular/KUTU.md'), content: 'iş' } }).status, 0, 'E0 çarpışması çözülmeli: iş alanı yazılabilir');
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, 'tools/guard/h.sh'), content: 'x' } }).status, 2);
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '02_kanon/kilitli/K.md'), content: 'x' } }).status, 2);
  const golden = kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '02_kanon/golden/g.md'), content: 'x' } });
  assert.equal(golden.status, 0);
  assert.equal(askJson(golden).permissionDecision, 'ask');
});

test('E2 worktree kaçakları: tek-parça dosya ve iç-içe worktree SERT kalır; .. kaçışı gerçek köke döner', () => {
  const kok = kurulum();
  const wt = worktreeKur(kok);
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(kok, '.claude/worktrees/basit.md'), content: 'x' } }).status, 2, 'worktrees köküne dosya .claude/ SERT');
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '.claude/worktrees/ic/n.md'), content: 'x' } }).status, 2, 'iç-içe eşleme tek seviye');
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '01_kutular/../../../settings.json'), content: 'x' } }).status, 2, '.. kaçışı kanonikle gerçek kök .claude/ SERT');
});

test('E2 worktree + rol kafesi: yazamaz rol worktree iş alanında da kesilir; worktree içi kendi evi serbest', () => {
  const kok = kurulum({ aktifRol: 'denetci\tyazamaz\t03_roller/denetci/\n' });
  const wt = worktreeKur(kok);
  const dis = kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '01_kutular/n.md'), content: 'x' } });
  assert.equal(dis.status, 2);
  assert.match(dis.stderr, /rol kafesi/);
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '03_roller/denetci/DURUM.md'), content: 'x' } }).status, 0);
});

test('E2 settings kablosu: dışa-giden ask kuralları şablon ayarında duruyor', () => {
  const ayar = JSON.parse(readFileSync(join(BURASI, '..', '..', '..', '.claude', 'settings.json'), 'utf8'));
  for (const kural of ['Bash(git push:*)', 'Bash(curl:*)', 'Bash(gh:*)']) {
    assert.ok(ayar.permissions.ask.includes(kural), kural + ' şablon ask listesinde olmalı');
  }
});

// --- E2 hasım incelemesi düzeltmeleri (2026-07-27; dönem wf_1fea1dba) ---

test('E2 hasım/dışa-giden: git -C push, mutlak yol, çok-satır, npm publish HEPSİ SOR-DISA', () => {
  const kok = kurulum();
  const kacaklar = [
    'git -C /some/dir push origin main',
    'git --no-pager push',
    '/usr/bin/curl https://x',
    'sudo scp a b:c',
    'cd /tmp\ngit push origin main',       // çok-satır: satırsonu ayraç
    'ls; git push',                          // ; sonrası komut-konumu
    'nohup wget http://x &',
    'npm publish --access public',
  ];
  for (const komut of kacaklar) {
    const r = kos(kok, { tool_name: 'Bash', tool_input: { command: komut } });
    assert.equal(r.status, 0, komut);
    assert.match(askJson(r).permissionDecisionReason, /DIŞARI çıkan/, komut);
  }
});

test('E2 hasım/dışa-giden negatif: git log, npm test, ssh-içeren-yol GEC', () => {
  const kok = kurulum();
  for (const komut of ['git log --oneline', 'npm test', 'git status', 'ls sshkeys/', 'cat wgetrc']) {
    const r = kos(kok, { tool_name: 'Bash', tool_input: { command: komut } });
    assert.equal(r.status, 0, komut);
    assert.equal(r.stdout.trim(), '', komut);
  }
});

test('E2 hasım/git-obje: dönem-AÇIK git -C commit worktree bağlamında ENGEL, dışında SOR-GIT', () => {
  const kok = kurulum();
  donemAc(kok, { izin: 'git-obje' });
  // İZİN listesinde git-obje OLSA BİLE worktree bağlamı ENGEL kalır: ortak nesne deposu
  // sır-cinsi için geri alınamaz (E0 ölçümü) — bu sınıf önceden verilebilir olan değildir.
  const wt = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git -C .claude/worktrees/ag-1 commit -m x' } });
  assert.equal(wt.status, 2);
  assert.match(wt.stderr, /nesne veritabanını paylaşır/);
  const dis = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git -C /elsewhere commit -m y' } });
  assert.equal(dis.status, 0, 'izinli sınıf worktree dışında serbest geçmeli');
});

test('E2 hasım/yazım-kalıbı: sed -i korumalı yolda SOR-YAZIM; sed (yerinde-değil) serbest', () => {
  const kok = kurulum();
  const inplace = kos(kok, { tool_name: 'Bash', tool_input: { command: 'sed -i s/a/b/ 02_kanon/golden/x.md' } });
  assert.match(askJson(inplace).permissionDecisionReason, /korumalı yolu/);
  const okuma = kos(kok, { tool_name: 'Bash', tool_input: { command: 'sed -n 1p 02_kanon/golden/x.md' } });
  assert.equal(okuma.stdout.trim(), '', 'sed -n (yerinde-değil) yazım sayılmaz');
});

test('E2 hasım/2>/dev/null: korumalı yolu OKUYAN komut (stderr /dev/null) yanlış SOR-YAZIM üretmez', () => {
  const kok = kurulum();
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'cat 02_kanon/golden/x.md 2>/dev/null' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '', 'okuma komutu 2>/dev/null ile yazıma dönüşmemeli');
});

test('E2 hasım/sahte-worktree: .git YOKKEN .claude/worktrees/<x>/ [SERT] delinmez (uydurma yol ENGEL)', () => {
  const kok = kurulum();
  // gerçek worktree marker YOK → sanal kök kurulmaz → .claude/ [SERT] uygulanır
  for (const yol of [
    '.claude/worktrees/hayalet/01_kutular/gizli.md',
    '.claude/worktrees/hayalet/02_kanon/kilitli/K.md',
    '.claude/worktrees/hayalet/.kurulum-tamam',
  ]) {
    const r = kos(kok, { tool_name: 'Write', tool_input: { file_path: join(kok, yol), content: 'x' } });
    assert.equal(r.status, 2, yol + ' — sahte worktree [SERT] delmemeli');
  }
});

test('E2 hasım/gerçek-worktree: .git VARKEN iş alanı serbest, çekirdek+kilitli SERT, golden ask', () => {
  const kok = kurulum();
  const wt = worktreeKur(kok); // artık .git dosyası yazıyor
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '01_kutular/K.md'), content: 'iş' } }).status, 0);
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, 'tools/guard/h.sh'), content: 'x' } }).status, 2);
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '02_kanon/kilitli/K.md'), content: 'x' } }).status, 2);
  assert.equal(askJson(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '02_kanon/golden/g.md'), content: 'x' } })).permissionDecision, 'ask');
});

test('E2 hasım/worktree symlink kaçağı: worktree içinden .. ile gerçek köke çıkış SERT kalır', () => {
  const kok = kurulum();
  const wt = worktreeKur(kok);
  // worktree iş-alanından .. ile gerçek kök .claude/settings.json (SERT) hedefi
  const r = kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, '01_kutular/../../../../.claude/settings.json'), content: 'x' } });
  assert.equal(r.status, 2, '.. kaçışı kanonikle gerçek kök .claude/ SERT');
});

test('E2 hasım/MCP içerik: mcp__ tool_input TCKN taşıyorsa her kipte ENGEL (içerik fail-closed)', () => {
  const kok = kurulum();
  const tckn = e2TcknUret('134679258');
  const derin = { tool_name: 'mcp__x__send', tool_input: { body: 'merhaba', nested: { list: ['ek: ' + tckn] } } };
  const r = kos(kok, derin);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /önleme bulgusu \(tckn\)/);
  assert.ok(!r.stderr.includes(tckn), 'MCP engel metni değeri sızdırmamalı');
  // temiz MCP dönem-KAPALI serbest
  assert.equal(kos(kok, { tool_name: 'mcp__x__send', tool_input: { body: 'selam' } }).status, 0);
});

test('E2 hasım/süzgeç-hata degrade: bozuk süzgeç (rc=1) → YAZMA engel, Bash serbest', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'), '#!/bin/bash\nexit 1\n');
  const yazma = kos(kok, write(kok, '01_kutular/x.md'));
  assert.equal(yazma.status, 2);
  assert.match(yazma.stderr, /içerik süzgeci koşamadı/);
  const bash = kos(kok, { tool_name: 'Bash', tool_input: { command: 'echo x > 01_kutular/y.md' } });
  assert.equal(bash.status, 0, 'süzgeç bozukken Bash pre-E2 tabanına düşer (komut serbest)');
});

test('E2 hasım/MultiEdit ve NotebookEdit file-guard ÜZERİNDEN içerik taranır', () => {
  const kok = kurulum();
  const tckn = e2TcknUret('246813579');
  const me = { tool_name: 'MultiEdit', tool_input: { file_path: join(kok, '01_kutular/a.md'), edits: [{ old_string: 'a', new_string: 'b' }, { old_string: 'c', new_string: 'tc ' + tckn }] } };
  assert.equal(kos(kok, me).status, 2);
  const ne = { tool_name: 'NotebookEdit', tool_input: { notebook_path: join(kok, '01_kutular/n.ipynb'), new_source: 'kart ' + e2CardUret() } };
  assert.equal(kos(kok, ne).status, 2);
});

test('E2 hasım/dışa-giden liste genişliği: 11 fiilin HEPSİ dikişte SOR-DISA', () => {
  const kok = kurulum();
  const fiiller = {
    'git push': 'git push origin main', 'curl': 'curl http://x', 'wget': 'wget http://x',
    'ssh': 'ssh host ls', 'scp': 'scp a h:b', 'sftp': 'sftp h', 'rsync': 'rsync -a a h:b',
    'mail': 'mail -s x a@b.c', 'sendmail': 'sendmail a@b.c', 'gh': 'gh pr create', 'npm publish': 'npm publish',
  };
  for (const [ad, komut] of Object.entries(fiiller)) {
    const r = kos(kok, { tool_name: 'Bash', tool_input: { command: komut } });
    assert.equal(r.status, 0, ad);
    assert.match(askJson(r).permissionDecisionReason, /DIŞARI çıkan/, ad);
  }
});

test('E2 hasım/settings kablosu: 11 dışa-giden ask kuralının HEPSİ şablonda', () => {
  const ayar = JSON.parse(readFileSync(join(BURASI, '..', '..', '..', '.claude', 'settings.json'), 'utf8'));
  for (const k of ['Bash(git push:*)', 'Bash(curl:*)', 'Bash(wget:*)', 'Bash(ssh:*)', 'Bash(scp:*)', 'Bash(sftp:*)', 'Bash(rsync:*)', 'Bash(mail:*)', 'Bash(sendmail:*)', 'Bash(gh:*)', 'Bash(npm publish:*)']) {
    assert.ok(ayar.permissions.ask.includes(k), k + ' şablon ask listesinde olmalı');
  }
});

test('E2 hasım/worktree × kurulum-penceresi: kurulum sürerken bile gerçek worktree çekirdeği SERT', () => {
  const kok = kurulum({ kurulumTamam: false });   // ana proje kurulum sürüyor
  const wt = join(kok, '.claude', 'worktrees', 'ag-1');
  mkdirSync(join(wt, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(wt, '01_kutular'), { recursive: true });
  writeFileSync(join(wt, '.git'), 'gitdir: x\n');
  // worktree checkout'unda .kurulum-tamam YOK (ana proje henüz kurulmamış) → kurulum penceresi;
  // ama çekirdek (tools/guard) kurulumda da SERT kalır (A5 ruhu)
  assert.equal(kos(kok, { tool_name: 'Write', tool_input: { file_path: join(wt, 'tools/guard/h.sh'), content: 'x' } }).status, 2);
});

function e2CardUret() {
  const hane = '478213456789012';
  const d = hane.split('').map(Number);
  let top = 0; const r = [...d].reverse();
  for (let i = 0; i < r.length; i++) { let x = r[i]; if (i % 2 === 0) { x *= 2; if (x > 9) x -= 9; } top += x; }
  return hane + String((10 - (top % 10)) % 10);
}
