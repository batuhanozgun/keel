import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const ROLAC = join(BURASI, '..', 'rol-ac.sh');

function kurulum() {
  const kok = mkdtempSync(join(tmpdir(), 'rolac-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  // Tören yalnız KAYITLI rollere damga basar (soğuk-denetim E3) — test kadrosu:
  for (const r of ['denetci', 'uygulayici', 'koordinator']) {
    mkdirSync(join(kok, '03_roller', r), { recursive: true });
  }
  return kok;
}
const damga = (kok) => join(kok, 'tools', 'guard', '.aktif-rol');
// Damga 1. satırı kimliktir (file-guard yalnız onu okur); 2. satır porcelain dikişidir
// ve YALNIZ yazamaz profilde doğar.
const ilkSatir = (kok) => readFileSync(damga(kok), 'utf8').split('\n')[0] + '\n';
const porcelainSatiri = (kok) => readFileSync(damga(kok), 'utf8').split('\n')[1] || '';
function kos(kok, args) {
  return spawnSync('bash', [ROLAC, ...args], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });
}

test('tören: denetci yazamaz → damga doğar (slug\\tmod\\tev; ev türetilir), çıktıda "ROL AÇIK"', () => {
  const kok = kurulum();
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ROL AÇIK: denetci/);
  assert.equal(ilkSatir(kok), 'denetci\tyazamaz\t03_roller/denetci/\n');
});

test('tören: tam mod → ev yine slug\'dan türetilir', () => {
  const kok = kurulum();
  const r = kos(kok, ['uygulayici', 'tam']);
  assert.equal(r.status, 0);
  assert.equal(readFileSync(damga(kok), 'utf8'), 'uygulayici\ttam\t03_roller/uygulayici/\n');
});

test('bozuk mod → exit 1, damga doğmaz', () => {
  const kok = kurulum();
  const r = kos(kok, ['denetci', 'okur-yazar']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /ROL AÇILAMADI/);
  assert.equal(existsSync(damga(kok)), false);
});

test('argümansız → exit 1, damga doğmaz', () => {
  const kok = kurulum();
  assert.equal(kos(kok, []).status, 1);
  assert.equal(existsSync(damga(kok)), false);
});

test('geçersiz slug (ASCII-dışı/büyük harf) → exit 1, damga doğmaz', () => {
  const kok = kurulum();
  const r = kos(kok, ['Denetçi', 'yazamaz']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /slug/);
  assert.equal(existsSync(damga(kok)), false);
});

test('rol değişimi reddi: koordinator açıkken denetci töreni → exit 1, damga DEĞİŞMEZ', () => {
  const kok = kurulum();
  kos(kok, ['koordinator', 'tam']);
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /YENİ oturum/);
  assert.match(readFileSync(damga(kok), 'utf8'), /^koordinator\t/);
});

test('aynı rol aynı profil → no-op idempotent (exit 0, damga birebir aynı kalır)', () => {
  const kok = kurulum();
  kos(kok, ['denetci', 'yazamaz']);
  const once = readFileSync(damga(kok), 'utf8');
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ROL AÇIK: denetci/);
  assert.equal(readFileSync(damga(kok), 'utf8'), once);
});

test('mod-yükseltme kapalı: denetci yazamaz açıkken "denetci tam" → exit 1, damga DEĞİŞMEZ', () => {
  const kok = kurulum();
  kos(kok, ['denetci', 'yazamaz']);
  const r = kos(kok, ['denetci', 'tam']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /profil/);
  assert.equal(ilkSatir(kok), 'denetci\tyazamaz\t03_roller/denetci/\n');
});

test('bozuk damga varken tören → exit 1 (belirsiz durumda üstüne yazılmaz; çözüm yolu söylenir)', () => {
  const kok = kurulum();
  writeFileSync(damga(kok), 'anlamsız içerik\n');
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /bozuk/);
});

// --- Soğuk-denetim yamaları (2026-07-16): E3 kayıtlı-rol şartı · A3 slug hizası ---

test('E3: kayıtsız rol (03_roller/ altında yok) → exit 1, damga doğmaz (uydurma ada damga yok)', () => {
  const kok = kurulum();
  const r = kos(kok, ['ghost', 'tam']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /rol tanımsız/);
  assert.equal(existsSync(damga(kok)), false);
});

test('A3: tireli/alt-çizgili slug artık reddedilir (GENESIS G3.3c tek-token kuralıyla hizalı)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', 'denetci-alt'), { recursive: true });
  const r = kos(kok, ['denetci-alt', 'tam']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /slug/);
  assert.equal(existsSync(damga(kok)), false);
});

// --- Porcelain dikişi (dış göz paketi, D-20 parça 2, 2026-07-25) -------------------
// Kafes Edit/Write'ı keser, KABUK yazımını kesmez; dikiş oturum başındaki kirlilik özetini
// damganın 2. SATIRINA yazar. Kimlik satırı (1.) hiçbir koşulda değişmez — file-guard onu okur.

function gitKurulum() {
  const kok = kurulum();
  const g = (...a) => spawnSync('git', a, { cwd: kok, encoding: 'utf8' });
  g('init', '-q');
  g('config', 'user.email', 'tatbikat@ornek');
  g('config', 'user.name', 'Tatbikat');
  writeFileSync(join(kok, 'dosya.txt'), 'ilk\n');
  g('add', '-A');
  g('commit', '-qm', 'ilk');
  return kok;
}

test('porcelain: yazamaz profilde 2. satır doğar (git deposunda sayısal özet), kimlik satırı DEĞİŞMEZ', () => {
  const kok = gitKurulum();
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 0);
  assert.equal(ilkSatir(kok), 'denetci\tyazamaz\t03_roller/denetci/\n', 'file-guard yalnız 1. satırı okur');
  assert.match(porcelainSatiri(kok), /^porcelain\t[0-9]+$/);
});

test('porcelain: tam profilde 2. satır DOĞMAZ (dikiş yazamaz koltuklar içindir)', () => {
  const kok = gitKurulum();
  kos(kok, ['uygulayici', 'tam']);
  assert.equal(readFileSync(damga(kok), 'utf8'), 'uygulayici\ttam\t03_roller/uygulayici/\n');
});

test('porcelain: git deposu değilse özet "yok" — tören YİNE açılır (fail-open)', () => {
  const kok = kurulum();
  const r = kos(kok, ['denetci', 'yazamaz']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ROL AÇIK/);
  assert.equal(porcelainSatiri(kok), 'porcelain\tyok');
});

test('porcelain: kendi evi ve bekçi çıktıları özete GİRMEZ (yanlış-SARI freni)', () => {
  const kok = gitKurulum();
  kos(kok, ['denetci', 'yazamaz']);
  const once = porcelainSatiri(kok);
  // Kafesin izin verdiği yazımlar + bekçinin her denetimde tazelediği damga dosyaları:
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  writeFileSync(join(kok, '03_roller', 'denetci', 'NOTLAR.md'), 'gözlem\n');
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# PANO\nson denetim: bugün\n');
  writeFileSync(join(kok, '00_pano', 'SAGLIK.md'), '# SAĞLIK\n');
  const r = spawnSync('bash', ['-c', `. "${join(BURASI, '..', 'porcelain.sh')}"; porcelain_ozet "${kok}" denetci`], { encoding: 'utf8' });
  assert.equal('porcelain\t' + r.stdout.trim(), once, 'dışlanan yollara yazım özeti değiştirmemeli');
});

test('porcelain: kafes DIŞINA kabukla yazım özeti DEĞİŞTİRİR (dikişin asıl işi)', () => {
  const kok = gitKurulum();
  kos(kok, ['denetci', 'yazamaz']);
  const once = porcelainSatiri(kok);
  writeFileSync(join(kok, 'dosya.txt'), 'kabukla değiştirildi\n'); // iş dosyası, kafes dışı
  const r = spawnSync('bash', ['-c', `. "${join(BURASI, '..', 'porcelain.sh')}"; porcelain_ozet "${kok}" denetci`], { encoding: 'utf8' });
  assert.notEqual('porcelain\t' + r.stdout.trim(), once);
});
