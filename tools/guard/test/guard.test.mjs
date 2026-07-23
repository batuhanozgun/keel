import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
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

test('çapa-dikişi: kurulum sürerken .taban-ref komutu sorulmaz (G4.3 doğumu sürtünmesiz)', () => {
  const kok = kurulum({ kurulumTamam: false });
  const r = kos(kok, { tool_name: 'Bash', tool_input: { command: 'git rev-parse HEAD > 02_kanon/kilitli/.taban-ref' } });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});
