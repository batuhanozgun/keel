import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildState } from '../lib/status.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEKFAZ = path.join(__dirname, 'fixtures/tekfaz');
const IKIFAZ = path.join(__dirname, 'fixtures/ikifaz');
// Gerçek-vault regresyonu: yalnız env verilirse koşar; yoksa atlanır (paket makineden bağımsız).
const REAL = process.env.KOKPIT_VAULT || null;

async function exists(p) { if (!p) return false; try { await fs.access(p); return true; } catch { return false; } }

test('fixture (tek-faz): durum şekli + jenerik roller', async () => {
  const s = await buildState(TEKFAZ);
  assert.ok(s.saglik.lights, 'ışıklar okunmalı');
  assert.equal(s.saglik.lights.find((l) => l.ad === 'AKIŞ').deger, 'YEŞİL');
  assert.equal(s.saglik.lights.find((l) => l.ad === 'DAVRANIŞ').deger, 'VERİ-YOK');
  assert.equal(typeof s.saglik.runNo, 'number');
  assert.equal(s.roller.length, 3, 'jenerik 3 rol (koordinator/uygulayici/denetci)');
  assert.ok(s.yargi.siradakiRol, 'sıradaki rol okunmalı');
  assert.ok(s.kutular.some((b) => b.aktif && b.id === 'KT-001'));
  assert.equal(s.warnings.length, 0, 'temiz fixture 0 uyarı');
});

test('fixture (iki-faz): ışık çelişkisiz, kapı yalnız Faz A', async () => {
  const s = await buildState(IKIFAZ);
  assert.equal(s.saglik.lights.find((l) => l.ad === 'DOSYA').deger, 'SARI');
  assert.deepEqual(s.kutu.gates.map((g) => g.id).sort(), ['G-07', 'G-08']);
  assert.equal(s.warnings.length, 0);
});

// --- Soğuk-denetim yamaları (2026-07-16): B1 taban-iyimserlik · B2 gelecekteki damga ·
// --- B5 çoklu açık kutu · A3 rakamlı slug · A2 rolToreni config geçişi ---

function stamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

async function tempVault({ saglikIsiklar = 'AKIŞ=YEŞİL', damga = stamp(new Date()), siradaki = 'uygulayici — iş' } = {}) {
  const kok = await fs.mkdtemp(path.join(os.tmpdir(), 'kokpit-durum-'));
  await fs.mkdir(path.join(kok, '00_pano'), { recursive: true });
  await fs.writeFile(path.join(kok, '00_pano', 'SAGLIK.md'),
    '# SAĞLIK\nson koşu: ' + damga + ' (koşu #3)\n\n**Işıklar:** ' + saglikIsiklar + '\n');
  await fs.writeFile(path.join(kok, '00_pano', 'PANO.md'),
    '# Pano\n- **Aktif kutu:** KT-001\n- **SIRADAKİ OTURUM:** ' + siradaki + '\n');
  return kok;
}

test('B1: hiç ÖLÇÜLMÜŞ ışık yokken (hepsi VERİ-YOK) sistem geneli YEŞİL değil VERI-YOK (dürüst gri)', async () => {
  const kok = await tempVault({ saglikIsiklar: 'AKIŞ=VERİ-YOK · DOSYA=VERİ-YOK' });
  const s = await buildState(kok);
  assert.equal(s.saglik.stale, false, 'taze damga: bayatlık değil, taban-iyimserlik sınanıyor');
  assert.equal(s.saglik.sistemGenel, 'VERI-YOK');
});

test('B1 sınır korunur: tek ölçülmüş YEŞİL varsa genel yine YEŞİL (davranış değişmedi)', async () => {
  const kok = await tempVault({ saglikIsiklar: 'AKIŞ=YEŞİL · DAVRANIŞ=VERİ-YOK' });
  const s = await buildState(kok);
  assert.equal(s.saglik.sistemGenel, 'YEŞİL');
});

test('B2: GELECEKTEKİ sağlık damgası bayat sayılır → sistem KIRMIZI (tazelik maskelenemez)', async () => {
  const gelecek = new Date(); gelecek.setDate(gelecek.getDate() + 3);
  const kok = await tempVault({ damga: stamp(gelecek) });
  const s = await buildState(kok);
  assert.equal(s.saglik.stale, true);
  assert.match(s.saglik.staleReason, /GELECEKTE/);
  assert.equal(s.saglik.sistemGenel, 'KIRMIZI');
});

test('B5: birden fazla açık kutu → uyarı basılır, ayrıntı paneli ada göre İLKİNİ gösterir', async () => {
  const kok = await tempVault({});
  for (const ad of ['KT-002-ikinci', 'KT-001-birinci']) {
    await fs.mkdir(path.join(kok, '01_kutular', ad), { recursive: true });
    await fs.writeFile(path.join(kok, '01_kutular', ad, 'KUTU.md'), '# ' + ad + '\n## Kapılar\n');
  }
  const s = await buildState(kok);
  assert.equal(s.kutu.id, 'KT-001', 'deterministik: ada göre ilk');
  assert.ok(s.warnings.some((w) => w.includes('birden fazla açık kutu')), 'uyarı basılmalı: ' + JSON.stringify(s.warnings));
});

test('A3: rakam içeren slug (po2) SIRADAKİ ayrıştırıcısında bütün okunur', async () => {
  const kok = await tempVault({ siradaki: 'po2 — veri modeli' });
  const s = await buildState(kok);
  assert.equal(s.yargi.siradakiRol, 'po2');
});

test('A2: rolToreni + koordinatorRol config\'ten geçer; alan yoksa rolToreni=false (geri-uyum)', async () => {
  const acik = await buildState(TEKFAZ, { rolToreni: true, koordinatorRol: 'koordinator' });
  assert.equal(acik.config.rolToreni, true);
  assert.equal(acik.config.koordinatorRol, 'koordinator');
  const eski = await buildState(TEKFAZ);
  assert.equal(eski.config.rolToreni, false);
  assert.equal(eski.config.koordinatorRol, 'koordinator');
});

test('gerçek vault regresyonu: 0 uyarı + şekil (KOKPIT_VAULT verilirse)', async (t) => {
  if (!(await exists(REAL))) { t.skip('gerçek vault yok'); return; }
  const s = await buildState(REAL, { koordinatorRol: 'koordinator' });
  assert.equal(s.warnings.length, 0, 'gerçek vault 0 uyarı (format sözleşmesi tutar)');
  assert.ok(s.saglik.lights && s.saglik.lights.length >= 1, 'ışık okunmalı');
  for (const lt of s.saglik.lights) {
    assert.ok(['YEŞİL', 'SARI', 'KIRMIZI', 'VERİ-YOK'].includes(lt.deger), 'geçerli ciddiyet: ' + lt.deger);
  }
  assert.ok(s.kutu && s.kutu.gates.length >= 1, 'aktif kutu + en az 1 kapı');
  assert.ok(s.roller.length >= 1, 'en az 1 rol');
  assert.ok(typeof s.yargi.siradakiStale === 'boolean', 'bayatlık alanı hesaplanır');
});
