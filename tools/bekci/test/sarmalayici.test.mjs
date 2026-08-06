// Adım 4: ince sarmalayıcı (bekci.sh) + şablon ayarı (bekci.conf) + korunan-yollar kaydı.
// Sarmalayıcının işi DARDIR: node'u bul, çekirdeği koştur, çıkış kodunu AYNEN geçir; kategori
// ilan satırını taşı (kurulum denetimi onu SARMALAYICIDA arar, kurulum-denetimi.sh:395-402).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { kurulum, temizle } from './yardimci.mjs';

const BURASI = dirname(fileURLToPath(import.meta.url));
const SARMALAYICI = join(BURASI, '..', 'bekci.sh');
const SABLON_CONF = join(BURASI, '..', 'bekci.conf');

function sarKos(kok, env = {}) {
  const r = spawnSync('bash', [SARMALAYICI], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok, ...env } });
  const satirlar = (r.stdout || '').trimEnd().split('\n');
  return { rc: r.status, stdout: r.stdout || '', stderr: r.stderr || '', makine: satirlar[satirlar.length - 1] || '' };
}

test('sözdizimi + kategori ilanı: bash -n temiz; ^# kategoriler: satırı iki kadranın zorunlularını karşılar', () => {
  const n = spawnSync('bash', ['-n', SARMALAYICI], { encoding: 'utf8' });
  assert.equal(n.status, 0, n.stderr);
  const metin = readFileSync(SARMALAYICI, 'utf8');
  const ilan = metin.split('\n').find((s) => s.startsWith('# kategoriler:'));
  assert.ok(ilan, 'ilan satırı yok (tarif G3.2 / kurulum-denetimi.sh:397)');
  // kurulum-denetimi GEREKLI kümeleri grep -qF ile arar: KÜÇÜK "tavan şema" · TAM "+koruma-hattı
  // bağ-varlık tazelik" — golden-tazelik, tazelik'i alt dize olarak içerir (sözleşme §3).
  for (const k of ['tavan', 'şema', 'koruma-hattı', 'bağ-varlık', 'tazelik']) {
    assert.ok(ilan.includes(k), 'ilanda zorunlu kategori eksik: ' + k);
  }
});

test('çıkış kodu geçişi: temiz kurulum 0 · durduran 1 · arıza 2 — sarmalayıcı koda dokunmaz', () => {
  const kok = kurulum();
  const r0 = sarKos(kok);
  assert.equal(r0.rc, 0, r0.stdout + r0.stderr);
  assert.match(r0.makine, /^BEKCI v1 /, 'makine satırı sarmalayıcıdan da SON satır çıkar');

  rmSync(join(kok, '02_kanon', 'EL_KITABI.md'));
  const r1 = sarKos(kok);
  assert.equal(r1.rc, 1, r1.stdout);
  temizle(kok);

  const kok2 = kurulum();
  rmSync(join(kok2, 'tools', 'bekci', 'bekci.conf'));
  const r2 = sarKos(kok2);
  assert.equal(r2.rc, 2, r2.stdout);
  assert.match(r2.makine, /ariza=[1-9]/, r2.makine);
  temizle(kok2);
});

test('node bulunamazsa arıza: çıkış 2, ARIZA satırı, makine satırı UYDURULMAZ (fail-closed)', () => {
  const kok = kurulum();
  const r = sarKos(kok, { BEKCI_NODE: '/olmayan/yol/node' });
  assert.equal(r.rc, 2);
  assert.match(r.stdout, /^ARIZA \[sarmalayici\] node bulunamadı/m, r.stdout);
  assert.ok(!r.stdout.includes('BEKCI v1'), 'sarmalayıcı çekirdek adına makine satırı basamaz: ' + r.stdout);
  temizle(kok);
});

test('şablon bekci.conf çekirdeğin anahtar şemasıyla uyumlu: aynen kopyalanınca temiz koşar', () => {
  const kok = kurulum();
  copyFileSync(SABLON_CONF, join(kok, 'tools', 'bekci', 'bekci.conf'));
  const r = sarKos(kok);
  assert.equal(r.rc, 0, r.stdout + r.stderr);
  assert.match(r.makine, /ariza=0/, r.makine);
  assert.match(r.makine, /kadran=tam/, 'şablon varsayılanı fail-closed geniş kadran: ' + r.makine);
  temizle(kok);
});

test('korunan-yollar kaydı: tools/bekci/ [SERT] bölümünde, bekci.conf [SORULUR] bölümünde', () => {
  // Bölüm-farkında okuma (ilk-kutu testinin dersi: başlık tepedeki yorumda da geçebilir).
  const metin = readFileSync(join(BURASI, '..', '..', 'guard', 'korunan-yollar.txt'), 'utf8');
  const sorulurBasi = metin.lastIndexOf('[SORULUR]');
  const sert = metin.slice(metin.indexOf('\n[SERT]'), sorulurBasi).split('\n').filter((s) => !s.trimStart().startsWith('#'));
  const sorulur = metin.slice(sorulurBasi).split('\n').filter((s) => !s.trimStart().startsWith('#'));
  assert.ok(sert.includes('tools/bekci/'), 'SERT bölümünde tools/bekci/ yok');
  assert.ok(sorulur.includes('tools/bekci/bekci.conf'), 'SORULUR bölümünde bekci.conf yok');
  assert.ok(!sorulur.includes('tools/bekci/'), 'dizin kuralı yanlış bölümde');
});
