// YALANCI-YEŞİL AVI — sözleşme §8/2: en az SEKİZ kasıtlı bozma, sekizi de kırmızı.
// Oracle makine satırının ALANLARIDIR (durduran/kilit) + çıkış kodu; warnings sayısı DEĞİL —
// kokpit gerçek bozulmada sıfır uyarı basabiliyor (ölçülmüş).
// Her vaka: temiz kurulum ÖNCE yeşil doğrulanır, bozulur, kırmızıya DÖNDÜĞÜ ölçülür —
// kırmızıya dönebilen test kanıttır (calisma-disiplini).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { kurulum, kos, temizle, commitEt } from './yardimci.mjs';

function yesilBasla(kok) {
  const r = kos(kok);
  assert.equal(r.rc, 0, 'bozma öncesi kurulum yeşil olmalı:\n' + r.stdout + r.stderr);
  assert.equal(r.alanlar.durduran, 0);
  assert.equal(r.alanlar.kilit, 0);
  return r;
}

test('bozma 1 · koruma kablosu kesilir (Stop sevk.sh) → durduran, çıkış 1', () => {
  const kok = kurulum();
  yesilBasla(kok);
  const ayarYolu = join(kok, '.claude', 'settings.json');
  const ayar = JSON.parse(readFileSync(ayarYolu, 'utf8'));
  ayar.hooks.Stop = ayar.hooks.Stop.filter((e) => !JSON.stringify(e).includes('sevk.sh'));
  writeFileSync(ayarYolu, JSON.stringify(ayar, null, 2));
  commitEt(kok, 'bozma: kablo kesildi');
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 2 · zarf günlüğüne yarım satır yazılır → durduran, çıkış 1', () => {
  const kok = kurulum();
  yesilBasla(kok);
  appendFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'), '{"surum":1,"tip":"zarf","yarim\n');
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 3 · kök zorunlu kümesinden dizin silinir (03_roller) → durduran, çıkış 1', () => {
  const kok = kurulum();
  yesilBasla(kok);
  rmSync(join(kok, '03_roller'), { recursive: true });
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 4 · kilitli karara dokunan commit atılır → durduran, çıkış 1 (commit alarmı düşürmez)', () => {
  const kok = kurulum();
  yesilBasla(kok);
  writeFileSync(join(kok, '02_kanon', 'kilitli', 'K-001-ornek.md'), '# K-001 — sessizce değişti\n');
  commitEt(kok, 'bozma: kilitli oynandi');
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 5 · taban-ref sembolik ref yapılır (HEAD) → durduran, çıkış 1 (kendini izleyen çapa)', () => {
  const kok = kurulum();
  yesilBasla(kok);
  writeFileSync(join(kok, '02_kanon', 'kilitli', '.taban-ref'), 'HEAD\n');
  commitEt(kok, 'bozma: sembolik capa');
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 6 · EL_KITABI zorunlu başlığı silinir → durduran, çıkış 1', () => {
  const kok = kurulum();
  yesilBasla(kok);
  const ekYolu = join(kok, '02_kanon', 'EL_KITABI.md');
  writeFileSync(ekYolu, readFileSync(ekYolu, 'utf8').replace('## Kutu döngüsü\n', ''));
  commitEt(kok, 'retro: basligi kirpan sozde-temizlik'); // retro-commit süsü kapanış-dışı gözünü susturur; bütünlük yine yakalar
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 7 · KUTU 1,5× tavanı aşırılır → kilit (kapanış kilidi; dönem durmaz, çıkış 0)', () => {
  const kok = kurulum();
  yesilBasla(kok);
  const yol = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  const metin = readFileSync(yol, 'utf8');
  writeFileSync(yol, metin.replace('## Bağımlılık ve risk', 'x'.repeat(16000) + '\n## Bağımlılık ve risk'));
  const r = kos(kok);
  assert.ok(r.alanlar.kilit >= 1, r.makine);
  assert.equal(r.alanlar.durduran, 0, r.makine);
  assert.equal(r.rc, 0, 'tavan kırmızısı duran kapı DEĞİLDİR (OTONOM_DONEM §1): ' + r.makine);
  const saglik = readFileSync(join(kok, '00_pano', 'SAGLIK.md'), 'utf8');
  assert.ok(saglik.includes('DOSYA=KIRMIZI'), 'kilit sahibin ışığında görünür: ' + saglik);
  temizle(kok);
});

test('bozma 8 · kadran tanıkları ayrıştırılır (ayar=kucuk, EL_KITABI=TAM) → durduran, çıkış 1', () => {
  const kok = kurulum();
  yesilBasla(kok);
  const confYolu = join(kok, 'tools', 'bekci', 'bekci.conf');
  writeFileSync(confYolu, readFileSync(confYolu, 'utf8').replace('kadran=tam', 'kadran=kucuk'));
  commitEt(kok, 'bozma: kadran kaydirildi');
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('bozma 9 · [SERT] yola commit-dışı dosya bırakılır → durduran, çıkış 1', () => {
  const kok = kurulum();
  yesilBasla(kok);
  writeFileSync(join(kok, '.claude', 'kacak-ayar.json'), '{}\n');
  const r = kos(kok);
  assert.ok(r.alanlar.durduran >= 1, r.makine);
  assert.equal(r.rc, 1);
  temizle(kok);
});
