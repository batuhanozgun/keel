// acilis.test.mjs — oturum-açılış hatırlatması (V2 Öbek-2, sahip yüzeyi).
// Sahip kararı 2026-07-24: hatırlatma açılışta + panoda, ISRAR YOK — yaş BİLGİdir.
// Bu testler o kararın mekanik sınırlarını korur: tek satır · kapalı madde sayılmaz ·
// kuyruk yoksa SESSİZ · dosyaya asla yazmaz (kuyruğun tek mekanik yazarı kapanis.sh).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const ACILIS = join(BURASI, '..', 'acilis.sh');

const BASLIK = '<!-- yazar: kapanış kancası -->\n# SENDE BEKLEYEN — sahipte bekleyen maddeler\n\n';

function kurulum(kuyrukIcerik = null) {
  const kok = mkdtempSync(join(tmpdir(), 'acilis-test-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  if (kuyrukIcerik != null) writeFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), kuyrukIcerik);
  return kok;
}

const kos = (kok) => spawnSync('bash', [ACILIS], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });

function gunOnce(n) {
  const d = new Date(Date.now() - n * 86400000);
  const p2 = (x) => String(x).padStart(2, '0');
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
const bugun = gunOnce(0);

test('kuyruk dosyası yok: sessiz çıkar (exit 0, çıktı yok) — şablon kökü kirletilmez', () => {
  const r = kos(kurulum());
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('açık madde yok (hepsi kapalı): satır BASILMAZ — dırdır yok', () => {
  const kok = kurulum(BASLIK + `- [x] ${gunOnce(3)} · po · "eski" · kaynak: oturum abc · cevap: "evet" · ${bugun}\n`);
  const r = kos(kok);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('bugünkü iki açık madde: tek satır, sayı doğru, yaş cümlesi YOK', () => {
  const kok = kurulum(BASLIK + `- [ ] ${bugun} · po · "soru 1" · kaynak: oturum a1\n- [ ] ${bugun} · koordinator · "soru 2" · kaynak: oturum a2\n`);
  const r = kos(kok);
  const satirlar = r.stdout.trim().split('\n');
  assert.equal(satirlar.length, 1, 'tek satır (ısrar yok)');
  assert.match(r.stdout, /Sende bekleyen 2 madde — "bekleyenleri göster" de\./);
  assert.ok(!r.stdout.includes('en eskisi'), 'aynı gün eklenen maddede yaş cümlesi olmaz');
});

test('eski madde: "en eskisi N gündür" bilgisi (uyarı değil, ünlem/KIRMIZI yok)', () => {
  const kok = kurulum(BASLIK + `- [ ] ${gunOnce(15)} · po · "eski soru" · kaynak: oturum a1\n- [ ] ${bugun} · po · "yeni soru" · kaynak: oturum a2\n`);
  const r = kos(kok);
  assert.match(r.stdout, /Sende bekleyen 2 madde \(en eskisi 15 gündür\)/);
  assert.ok(!/KIRMIZI|SARI|UYARI/.test(r.stdout), 'yaş uyarı değil bilgidir');
});

test('kapalı madde sayıma girmez (yalnız "- [ ]" satırları)', () => {
  const kok = kurulum(BASLIK + `- [x] ${gunOnce(9)} · po · "kapandı" · kaynak: oturum a0 · cevap: "oldu" · ${bugun}\n- [ ] ${gunOnce(2)} · po · "açık" · kaynak: oturum a1\n`);
  const r = kos(kok);
  assert.match(r.stdout, /Sende bekleyen 1 madde \(en eskisi 2 gündür\)/);
});

test('tarihsiz/bozuk satır: patlamaz, madde sayılır, yaş cümlesi düşer', () => {
  const kok = kurulum(BASLIK + '- [ ] tarihsiz bozuk satır\n');
  const r = kos(kok);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Sende bekleyen 1 madde — /);
});

test('SALT-OKUR: kanca kuyruğu bayt-bayt değiştirmez', () => {
  const icerik = BASLIK + `- [ ] ${gunOnce(4)} · po · "soru" · kaynak: oturum a1\n`;
  const kok = kurulum(icerik);
  kos(kok);
  assert.equal(readFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), 'utf8'), icerik);
});

// --- Dış göz brifingi hatırlatması (D-20 parça 2) -----------------------------------
// YUMUŞAK hatırlatma: eşik 7 gün, tek satır, ısrar yok. Kapanış kilidi AYRIDIR (bekçide,
// git tarihine bakar) — bu satır onun yerine geçmez.

function brifingKur(kok, icerik) {
  mkdirSync(join(kok, '03_roller', 'disgoz'), { recursive: true });
  if (icerik != null) writeFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), icerik);
}
const brifing = (tarih) => `<!-- yazar: disgoz -->\n# DIŞ GÖZ — brifing\n\nTarih: ${tarih}\n\n## 1 · Ne yapılıyor\n`;

test('dış göz koltuğu yoksa brifing satırı HİÇ doğmaz (koltuksuz projeye dırdır yok)', () => {
  const r = kos(kurulum());
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

test('taze brifing (bugün): satır BASILMAZ — eşik 7 gün', () => {
  const kok = kurulum();
  brifingKur(kok, brifing(bugun));
  assert.equal(kos(kok).stdout.trim(), '');
});

test('6 günlük brifing: hâlâ sessiz (eşik sınırı: 7)', () => {
  const kok = kurulum();
  brifingKur(kok, brifing(gunOnce(6)));
  assert.equal(kos(kok).stdout.trim(), '');
});

test('9 günlük brifing: tek bilgi satırı, sayı doğru, uyarı sözcüğü YOK', () => {
  const kok = kurulum();
  brifingKur(kok, brifing(gunOnce(9)));
  const r = kos(kok);
  assert.match(r.stdout, /Son dış göz brifingi 9 gündür tazelenmedi — "durumu anlat" diyebilirsin\./);
  assert.ok(!/KIRMIZI|SARI|UYARI/.test(r.stdout), 'yaş uyarı değil bilgidir');
  assert.equal(r.stdout.trim().split('\n').length, 1);
});

test('koltuk var ama brifing dosyası yok → "brifingi yok" satırı', () => {
  const kok = kurulum();
  brifingKur(kok, null);
  assert.match(kos(kok).stdout, /Dış göz brifingi yok — "durumu anlat" diyebilirsin\./);
});

test('brifing var ama tarihsiz → "tarihsiz" satırı (sessiz geçilmez)', () => {
  const kok = kurulum();
  brifingKur(kok, '# DIŞ GÖZ — brifing\n\n## 1 · Ne yapılıyor\n');
  assert.match(kos(kok).stdout, /Dış göz brifingi tarihsiz/);
});

test('iki göz birlikte: kuyruk satırı + brifing satırı (sırayla, ikisi de tek satır)', () => {
  const kok = kurulum(BASLIK + `- [ ] ${gunOnce(3)} · po · "soru" · kaynak: oturum a1\n`);
  brifingKur(kok, brifing(gunOnce(20)));
  const satirlar = kos(kok).stdout.trim().split('\n');
  assert.equal(satirlar.length, 2);
  assert.match(satirlar[0], /Sende bekleyen 1 madde/);
  assert.match(satirlar[1], /Son dış göz brifingi 20 gündür/);
});

test('SALT-OKUR: kanca brifingi bayt-bayt değiştirmez', () => {
  const kok = kurulum();
  const icerik = brifing(gunOnce(30));
  brifingKur(kok, icerik);
  kos(kok);
  assert.equal(readFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), 'utf8'), icerik);
});

// --- Yarım kalan kurulum (F1-2f) ----------------------------------------------------
// Koşul İKİ parçalı: kurulum işareti YOK **ve** durum "başlamadı" DEĞİL. Hiç başlamamış
// kurulumu "yarım" sanmak yanlış alarmdır; şablonun kendi kökünde satır DOĞMAMALIDIR.

function durumKur(kok, icerik) {
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), icerik);
}
const durum = (durumSatiri, adim = 'G2 · Rol türetme + çapraz-kontrol', baslik = 'Bekleyen adım') =>
  `<!-- yazar: genesis -->\n# GENESIS DURUM\n\n**Durum:** ${durumSatiri}\n\n## Tamamlanan adımlar\nG0, G1\n\n## ${baslik}\n${adim}\n`;

test('kurulum hiç başlamadı (şablonun kendi kökü): satır DOĞMAZ', () => {
  const kok = kurulum();
  durumKur(kok, durum('kurulum başlamadı.', 'G0 · Yönlendirme + ağırlık kadranı'));
  assert.equal(kos(kok).stdout.trim(), '');
});

test('yarım kurulum: tek bilgi satırı, sade cümle', () => {
  const kok = kurulum();
  durumKur(kok, durum('G2 sürüyor.'));
  const r = kos(kok);
  const satirlar = r.stdout.trim().split('\n');
  assert.equal(satirlar.length, 1, 'tek satır (ısrar yok)');
  assert.match(r.stdout, /Kurulum yarım kalmış — 00_genesis klasöründe oturum açıp kaldığın yerden devam edebilirsin\./);
  assert.ok(!/KIRMIZI|SARI|UYARI|!/.test(r.stdout), 'bilgi satırı uyarı değildir');
});

// Hasım turu 2026-07-29: ilk sürüm "bekleyen adım" etiketini de basıyordu. Sahibin sözlüğünde
// olmayan hiçbir etiket bu satıra giremez — jargon yasağı bu satırda da geçerli.
test('sahip satırı ham GENESIS etiketi taşımaz (jargon yasağı)', () => {
  const kok = kurulum();
  durumKur(kok, durum('G0 sürüyor.', 'G0 · Yönlendirme + ağırlık kadranı'));
  const r = kos(kok);
  assert.ok(!/G0|kadran|bekleyen adım:/.test(r.stdout), `etiket sızdı: ${r.stdout}`);
});

test('boş "Bekleyen adım" bölümü: sonraki başlık cümleye SIZMAZ', () => {
  const kok = kurulum();
  durumKur(
    kok,
    '<!-- yazar: genesis -->\n# GENESIS DURUM\n\n**Durum:** G4 tamamlandı.\n\n## Bekleyen adım\n\n## Format spec (G3\'te doldurulur)\n(henüz yok)\n'
  );
  const r = kos(kok);
  assert.ok(!r.stdout.includes('Format spec'), `markdown başlığı sahibe basıldı: ${r.stdout}`);
  assert.match(r.stdout, /Kurulum yarım kalmış/);
});

test('CRLF satır sonlu durum dosyası: susturma yine çalışır (sahte "yarım" alarmı yok)', () => {
  const kok = kurulum();
  durumKur(kok, durum('kurulum başlamadı.', 'G0 · Yönlendirme').replace(/\n/g, '\r\n'));
  assert.equal(kos(kok).stdout.trim(), '');
});

test('"G3 başlamadı." gibi bir cümle satırı SUSTURMAZ (çapalı eşleşme)', () => {
  const kok = kurulum();
  durumKur(kok, durum('G3 başlamadı; G2 sürüyor.'));
  assert.match(kos(kok).stdout, /Kurulum yarım kalmış/);
});

test('kurulum bitmiş (.kurulum-tamam var): durum ne derse desin satır DOĞMAZ', () => {
  const kok = kurulum();
  durumKur(kok, durum('kurulum TAMAM.', 'yok'));
  writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-29 · sahip mührü\n');
  assert.equal(kos(kok).stdout.trim(), '');
});

test('durum dosyası hiç yoksa: sessiz (KEEL klasörü olmayabilir)', () => {
  assert.equal(kos(kurulum()).stdout.trim(), '');
});

test('durum satırı bozuk/eksikse: SESSİZ GEÇİLMEZ — satır basılır', () => {
  const kok = kurulum();
  durumKur(kok, '# GENESIS DURUM\n\nburada bir durum satırı yok\n\n## Bekleyen adım\nG3 · Kanon\n');
  assert.match(kos(kok).stdout, /Kurulum yarım kalmış/);
});

test('SALT-OKUR: kanca durum dosyasını bayt-bayt değiştirmez', () => {
  const kok = kurulum();
  const icerik = durum('G4 sürüyor.');
  durumKur(kok, icerik);
  kos(kok);
  assert.equal(readFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), 'utf8'), icerik);
});
