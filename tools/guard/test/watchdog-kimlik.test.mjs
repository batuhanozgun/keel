// watchdog-kimlik.test.mjs — U33: launchd kimliği ve plist'in XML bütünlüğü.
//
// DOĞUŞ: `watchdog-kur.sh` bu depoda HİÇ KOŞULMAMIŞ bir betikti. Test kurulumları onu
// kopyalıyor ama çağırmıyordu; yani "hangi kipte hiç koşmuyor?" sorusunun bu evdeki cevabı
// "hepsinde"ydi. Arıza tam orada yaşıyordu: etiket YALNIZ klasör adından üretiliyordu
// (`dev.keel.nabiz.$(basename "$KOK")`) ve kurulum yüklemeden önce koşulsuz `bootout`
// çağırıyordu — aynı adlı ikinci bir kurulum BİRİNCİNİN WATCHDOG'UNU SÖKÜYORDU. Bu üründe
// tam olarak öyle iki kopya var (~/Dev/agent-os-template ve ~/Desktop/keel değil ama aynı
// sınıf: aynı adlı iki klasör her kullanıcıda olağandır).
//
// AĞA VE GERÇEK launchd'ye ÇIKILMAZ: `launchctl` PATH'te sahtelenir ve yüklü iş kümesini bir
// dosyada tutar. Sahte, ölçülecek davranışı taklit eder — kim kimi söküyor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');

// Sahte launchctl: yüklü etiketleri $LAUNCHD_YUKLU dosyasında tutar.
//   bootstrap gui/<uid> <plist>  → plist adından etiketi çıkarır, kümeye ekler
//   bootout   gui/<uid>/<etiket> → kümeden çıkarır (yoksa 1 döner, gerçeği gibi)
//   print     gui/<uid>/<etiket> → kümedeyse 0
function sahteLaunchctl(ust) {
  const d = join(ust, 'sahte-bin');
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, 'launchctl'), [
    '#!/bin/bash',
    'Y="${LAUNCHD_YUKLU:?}"; touch "$Y"',
    'printf "%s\\n" "$*" >> "${LAUNCHD_LOG:-/dev/null}"',
    'case "$1" in',
    '  bootstrap|load)',
    '    P="$3"; [ "$1" = "load" ] && P="$2"',
    '    E="$(basename "$P" .plist)"',
    '    grep -Fqx "$E" "$Y" || printf "%s\\n" "$E" >> "$Y"; exit 0 ;;',
    '  bootout)',
    '    E="${2##*/}"',
    '    grep -Fqx "$E" "$Y" || exit 1',
    '    grep -Fvx "$E" "$Y" > "$Y.yeni" || true; mv "$Y.yeni" "$Y"; exit 0 ;;',
    '  print)',
    '    E="${2##*/}"; grep -Fqx "$E" "$Y" && exit 0 || exit 113 ;;',
    'esac',
    'exit 0',
  ].join('\n'));
  chmodSync(join(d, 'launchctl'), 0o755);
  return d;
}

// Bir KEEL kurulumu: <ust>/<ara>/<ad>/tools/sevk/{watchdog-kur.sh,nabiz.sh}
function kurulum(ust, ara, ad = 'keel') {
  const kok = join(ust, ara, ad);
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  for (const b of ['watchdog-kur.sh', 'nabiz.sh']) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  return kok;
}

function ortam(ust, ek = {}) {
  return {
    ...process.env,
    HOME: join(ust, 'ev'),
    LAUNCHD_YUKLU: join(ust, 'yuklu.txt'),
    LAUNCHD_LOG: join(ust, 'launchctl.log'),
    PATH: sahteLaunchctl(ust) + ':' + process.env.PATH,
    ...ek,
  };
}
const kur = (kok, ust, args = [], ek = {}) =>
  spawnSync('bash', [join(kok, 'tools', 'sevk', 'watchdog-kur.sh'), ...args],
    { encoding: 'utf8', env: { ...ortam(ust, ek), CLAUDE_PROJECT_DIR: kok } });

const yeniUst = () => {
  const u = mkdtempSync(join(tmpdir(), 'u33-'));
  mkdirSync(join(u, 'ev', 'Library', 'LaunchAgents'), { recursive: true });
  writeFileSync(join(u, 'yuklu.txt'), '');
  return u;
};
const etiketOku = (kok) =>
  (readFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'), 'utf8')
    .split('\n').find((s) => s.startsWith('etiket=')) || '').slice('etiket='.length).trim();
const plistOku = (kok) =>
  (readFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'), 'utf8')
    .split('\n').find((s) => s.startsWith('plist=')) || '').slice('plist='.length).trim();

test('U33: aynı ADLI iki kurulum AYNI etiketi üretmez (kimlik klasör adından değil)', () => {
  const ust = yeniUst();
  const a = kurulum(ust, 'birinci');            // <ust>/birinci/keel
  const b = kurulum(ust, 'ikinci');             // <ust>/ikinci/keel — AYNI klasör adı
  assert.equal(kur(a, ust).status, 0);
  assert.equal(kur(b, ust).status, 0);
  const ea = etiketOku(a), eb = etiketOku(b);
  assert.notEqual(ea, eb, 'aynı adlı iki kurulum aynı launchd etiketini aldı: ' + ea);
  assert.match(ea, /^dev\.keel\.nabiz\.keel-[0-9a-f]{8}$/, 'okunur ad + yol özeti: ' + ea);
});

test('U33: ikinci kurulum BİRİNCİNİN watchdog\'unu SÖKMEZ (arızanın kendisi)', () => {
  const ust = yeniUst();
  const a = kurulum(ust, 'birinci');
  const b = kurulum(ust, 'ikinci');
  kur(a, ust);
  const ea = etiketOku(a);
  kur(b, ust);

  const yuklu = readFileSync(join(ust, 'yuklu.txt'), 'utf8').split('\n').filter(Boolean);
  assert.ok(yuklu.includes(ea), 'birincinin işi ikinci kurulumdan sonra YÜKLÜ kalmalı: ' + yuklu.join(','));
  assert.equal(yuklu.length, 2, 'iki kurulum, iki ayrı iş: ' + yuklu.join(','));

  // ve birincinin plist'i hâlâ BİRİNCİYİ gösteriyor (üzerine yazılmadı)
  const p = readFileSync(plistOku(a), 'utf8');
  assert.ok(p.includes(join(a, 'tools', 'sevk', 'nabiz.sh')), 'birincinin plist\'i ikinciye kaydırıldı');
});

test('U33: birinin --kaldir\'ı ötekinin işine dokunmaz', () => {
  const ust = yeniUst();
  const a = kurulum(ust, 'birinci');
  const b = kurulum(ust, 'ikinci');
  kur(a, ust); kur(b, ust);
  kur(b, ust, ['--kaldir']);
  const yuklu = readFileSync(join(ust, 'yuklu.txt'), 'utf8').split('\n').filter(Boolean);
  assert.deepEqual(yuklu, [etiketOku(a)], 'yalnız ikincinin işi sökülmeliydi: ' + yuklu.join(','));
});

test('U33: plist XML KAÇIŞLIDIR — `&` taşıyan yol geçerli XML üretir', () => {
  const ust = yeniUst();
  const kok = kurulum(ust, 'A & B');            // yol içinde XML'i bozan karakter
  const r = kur(kok, ust);
  assert.equal(r.status, 0, r.stderr);
  const ham = readFileSync(plistOku(kok), 'utf8');
  assert.ok(ham.includes('&amp;'), 'ham `&` kaçırılmadan gömülmüş: ' + ham);
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(ham), 'kaçışsız & kaldı');
  // Ölçüm okumayla bitmez: XML'i FİİLEN ayrıştıran bir araca sorulur.
  const p = spawnSync('plutil', ['-lint', plistOku(kok)], { encoding: 'utf8' });
  if (p.error && p.error.code === 'ENOENT') return;   // plutil yoksa ilan: bu kol ölçülmedi
  assert.equal(p.status, 0, 'plutil plist\'i geçersiz buldu: ' + p.stdout + p.stderr);
});

test('U33: özet aracı hiç yoksa kurulum REDDEDİLİR (çakışabilen eski ada DÜŞÜLMEZ)', () => {
  const ust = yeniUst();
  const kok = kurulum(ust, 'tek');
  // Üç özet aracını da PATH'in başında öldür: fail-closed dalı ancak böyle koşar.
  const olu = join(ust, 'olu-bin');
  mkdirSync(olu, { recursive: true });
  for (const ad of ['shasum', 'md5', 'openssl']) {
    writeFileSync(join(olu, ad), '#!/bin/sh\nexit 1\n');
    chmodSync(join(olu, ad), 0o755);
  }
  const r = kur(kok, ust, [], { PATH: olu + ':' + sahteLaunchctl(ust) + ':' + process.env.PATH });
  assert.equal(r.status, 1, 'özet üretilemeyince kurulum sürmemeli');
  assert.match(r.stderr, /kimlik özeti üretilemedi/);
  assert.ok(!existsSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu')), 'reddedilen kurulum işaret bırakmaz');
});

test('U33: kırık shasum çalışan md5\'i devre dışı bırakmaz (araç VAR ≠ araç ÇALIŞIYOR)', () => {
  const ust = yeniUst();
  const kok = kurulum(ust, 'ara', 'tek');
  const kirik = join(ust, 'kirik-bin');
  mkdirSync(kirik, { recursive: true });
  writeFileSync(join(kirik, 'shasum'), '#!/bin/sh\nexit 1\n');
  chmodSync(join(kirik, 'shasum'), 0o755);
  const r = kur(kok, ust, [], { PATH: kirik + ':' + sahteLaunchctl(ust) + ':' + process.env.PATH });
  assert.equal(r.status, 0, r.stderr);
  assert.match(etiketOku(kok), /^dev\.keel\.nabiz\.tek-[0-9a-f]{8}$/);
});

test('U33 devralma: ESKİ adlı iş BİZİMSE sökülür, BAŞKASININSA dokunulmaz', () => {
  const ust = yeniUst();
  const kok = kurulum(ust, 'birinci');
  // ESKİ ad BİREBİR eski formülün ürettiğidir: `basename` satırsonu `tr -c` ile tireye
  // dönüştüğü için sondan tirelidir. Devralma diskte DURAN adı arar, olması gerekeni değil.
  const eski = 'dev.keel.nabiz.keel-';
  const eskiPlist = join(ust, 'ev', 'Library', 'LaunchAgents', eski + '.plist');

  // (a) BİZİM: eski plist bu kurulumun nabiz.sh'ını gösteriyor → devralınır ve sökülür.
  writeFileSync(eskiPlist, '<string>' + join(kok, 'tools', 'sevk', 'nabiz.sh') + '</string>\n');
  writeFileSync(join(ust, 'yuklu.txt'), eski + '\n');
  const r = kur(kok, ust);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /eski adlı iş devralındı ve söküldü/);
  assert.ok(!existsSync(eskiPlist), 'devralınan eski plist silinmeli');
  let yuklu = readFileSync(join(ust, 'yuklu.txt'), 'utf8').split('\n').filter(Boolean);
  assert.ok(!yuklu.includes(eski), 'eski ad hâlâ yüklü: ' + yuklu.join(','));

  // (b) BAŞKASININ: eski plist BAŞKA bir kurulumu gösteriyor → DOKUNULMAZ, sahibe söylenir.
  writeFileSync(eskiPlist, '<string>/baska/bir/kurulum/tools/sevk/nabiz.sh</string>\n');
  writeFileSync(join(ust, 'yuklu.txt'), eski + '\n');
  const r2 = kur(kok, ust);
  assert.equal(r2.status, 0, r2.stderr);
  assert.match(r2.stderr, /BAŞKA bir kurulumun/);
  assert.ok(existsSync(eskiPlist), 'başkasının plist\'i silindi — kapatılan arıza geri geldi');
  yuklu = readFileSync(join(ust, 'yuklu.txt'), 'utf8').split('\n').filter(Boolean);
  assert.ok(yuklu.includes(eski), 'başkasının işi sökülmüş: ' + yuklu.join(','));
});
