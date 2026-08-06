// Kategori `koruma-hattı` (6 göz): kablo (her pencerede TAM) · [SERT]/[SORULUR] kirlilik ·
// kilitli-tarih (MDRT · yeni dosya A · taban-ref fail-closed). BEKCI_TARIFI md.16.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { kurulum, kos, temizle, commitEt, git } from './yardimci.mjs';

test('kablo pozitif: tam kablolu kurulumda koruma-hattı bulgusu yok', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.ok(!/\[koruma-hattı\] kablo:/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.durduran, 0);
  temizle(kok);
});

test('kablo: Stop girdilerinin İKİSİ birden aranır (tarihî kör nokta — BEKCI_TARIFI md.16)', () => {
  const kok = kurulum();
  const ayarYolu = join(kok, '.claude', 'settings.json');
  const ayar = JSON.parse(readFileSync(ayarYolu, 'utf8'));
  ayar.hooks.Stop = ayar.hooks.Stop.filter((e) => !JSON.stringify(e).includes('sevk.sh'));
  writeFileSync(ayarYolu, JSON.stringify(ayar, null, 2));
  commitEt(kok, 'kablo kesildi'); // kirlilik gözü ayrı sinyal üretmesin — kablo tek başına ölçülsün
  const r = kos(kok);
  assert.ok(/DURDURAN \[koruma-hattı\] kablo: Stop sevk\.sh girdisi yok/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('kablo: devir kapısı ve SubagentStop girdileri de kablodur (liste BEKCI_TARIFI md.16 i)', () => {
  const kok = kurulum();
  const ayarYolu = join(kok, '.claude', 'settings.json');
  const ayar = JSON.parse(readFileSync(ayarYolu, 'utf8'));
  ayar.hooks.PreToolUse = ayar.hooks.PreToolUse.filter((e) => e.matcher !== 'Task|Agent');
  delete ayar.hooks.SubagentStop;
  writeFileSync(ayarYolu, JSON.stringify(ayar, null, 2));
  commitEt(kok, 'kablolar kesildi');
  const r = kos(kok);
  assert.ok(/DURDURAN \[koruma-hattı\] kablo: PreToolUse 'Task\|Agent' devir kapısı girdisi yok/.test(r.stdout), r.stdout);
  assert.ok(/DURDURAN \[koruma-hattı\] kablo: SubagentStop zarf-biçim girdisi yok/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('kablo: diskteki betik eksikse DURDURAN (porcelain.sh yoksa dikiş sessiz susar — o yüzden kablo)', () => {
  const kok = kurulum();
  rmSync(join(kok, 'tools', 'guard', 'porcelain.sh'));
  commitEt(kok, 'betik silindi');
  const r = kos(kok);
  assert.ok(/DURDURAN \[koruma-hattı\] kablo: kablo eksik: tools\/guard\/porcelain\.sh/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('[SERT] yolda commit-dışı değişim → DURDURAN; işaretin kaynağı korunan-yollar.txt grameri', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'tools', 'guard', 'kacak.txt'), 'kirli\n');
  const r = kos(kok);
  assert.ok(/DURDURAN \[koruma-hattı\] korunan-yol-kirliligi: \[SERT\] yolda commit-dışı değişim: tools\/guard\/kacak\.txt/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('[SORULUR] yolda commit-dışı değişim → UYARI (meşru olabilir; sahibe not)', () => {
  const kok = kurulum();
  const r0 = kos(kok);
  assert.ok(!/korunan-yol-kirliligi/.test(r0.stdout), r0.stdout);
  writeFileSync(join(kok, '02_kanon', 'golden', 'yeni-golden.md'), 'aday çıktı\n');
  const r = kos(kok);
  assert.ok(/UYARI \[koruma-hattı\] korunan-yol-kirliligi: \[SORULUR\] yolda commit-dışı değişim \(meşru olabilir; sahibe not\): 02_kanon\/golden\/yeni-golden\.md/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('kurulum penceresinde kirlilik BİLGİye düşer, kablo denetimi TAM kalır', () => {
  const kok = kurulum({ kurulumTamam: false });
  writeFileSync(join(kok, 'tools', 'guard', 'kacak.txt'), 'kirli\n');
  const r = kos(kok);
  assert.equal(r.alanlar.pencere, 'kurulum');
  assert.ok(/BİLGİ \[koruma-hattı\] korunan-yol-kirliligi: \[SERT\] yolda commit-dışı değişim/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.durduran, 0, r.stdout);
  temizle(kok);
});

test('kilitli-tarih: kilitliye dokunan MDRT commit → DURDURAN; sinyal commit atmakla düşmez (KALICI)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '02_kanon', 'kilitli', 'K-001-ornek.md'), '# K-001 — DEĞİŞTİRİLDİ\n');
  commitEt(kok, 'kilitli oynandi');
  const r = kos(kok);
  assert.ok(/DURDURAN \[koruma-hattı\] kilitli-tarih: kilitli karar DEĞİŞTİRİLMİŞ\/SİLİNMİŞ/.test(r.stdout), r.stdout);
  commitEt(kok, 'alakasiz is'); // araya commit girmesi alarmı düşürmez
  const r2 = kos(kok);
  assert.ok(/kilitli karar DEĞİŞTİRİLMİŞ\/SİLİNMİŞ/.test(r2.stdout), r2.stdout);
  temizle(kok);
});

test('kilitli-tarih: kilitliye YENİ dosya (A) → UYARI (L3 yenisi-yazılır meşru yolu)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '02_kanon', 'kilitli', 'K-002-yeni.md'), '# K-002 — yeni karar\n');
  commitEt(kok, 'K-002 eklendi');
  const r = kos(kok);
  assert.ok(/UYARI \[koruma-hattı\] kilitli-tarih: kilitliye YENİ dosya eklendi .* mühürlü mü\?/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.durduran, 0, r.stdout);
  temizle(kok);
});

test('kilitli-tarih fail-closed: taban-ref yok/sembolik/geçersiz → DURDURAN', () => {
  const kok = kurulum();
  rmSync(join(kok, '02_kanon', 'kilitli', '.taban-ref'));
  commitEt(kok, 'taban-ref silindi');
  const r = kos(kok);
  assert.ok(/DURDURAN \[koruma-hattı\] kilitli-tarih: taban-ref yok\/boş/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum();
  writeFileSync(join(kok2, '02_kanon', 'kilitli', '.taban-ref'), 'HEAD\n'); // kendini izleyen çapa
  git(kok2, 'add', '-A'); commitEt(kok2, 'sembolik ref');
  const r2 = kos(kok2);
  assert.ok(/DURDURAN \[koruma-hattı\] kilitli-tarih: taban-ref 40'lık commit-hash değil \('HEAD'\)/.test(r2.stdout), r2.stdout);
  temizle(kok2);

  const kok3 = kurulum();
  writeFileSync(join(kok3, '02_kanon', 'kilitli', '.taban-ref'), 'a'.repeat(40) + '\n'); // 40'lık ama repoda yok
  commitEt(kok3, 'gecersiz taban');
  const r3 = kos(kok3);
  assert.ok(/DURDURAN \[koruma-hattı\] kilitli-tarih: taban-ref geçersiz commit/.test(r3.stdout), r3.stdout);
  temizle(kok3);
});

test('kilitli-tarih kurulum penceresinde: sinyallerin TAMAMI BİLGİ (kilitliye yazım kurulumda normal)', () => {
  const kok = kurulum({ kurulumTamam: false });
  writeFileSync(join(kok, '02_kanon', 'kilitli', 'K-001-ornek.md'), '# K-001 — kurulum doldurur\n');
  commitEt(kok, 'kurulumda kilitli yazimi');
  const r = kos(kok);
  assert.ok(/BİLGİ \[koruma-hattı\] kilitli-tarih: kilitli karar DEĞİŞTİRİLMİŞ\/SİLİNMİŞ/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.durduran, 0, r.stdout);
  temizle(kok);
});
