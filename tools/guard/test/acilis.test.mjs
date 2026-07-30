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

// --- Kurulum nerede kaldı (F1-2f + F1-1) --------------------------------------------
// Durum artık MAKİNE BLOĞUNDAN okunur (`## KURULUM DURUMU` → `Durum:`), insan cümlesinden
// DEĞİL (F1-1, 2026-07-29). Eski hâl insan cümlesini satır-çapalı arıyordu ve iki ölçülmüş
// kusuru vardı: (a) aynı cümlenin bir KOPYASI dosyanın başka bir yerinde satır başında geçerse
// hatırlatma KALICI SUSUYORDU, (b) cümlenin biçimi azıcık kayarsa taze şablonda YANLIŞ ALARM
// doğuyordu. Aynı olguyu iki yerde yazmak drift kapısıdır — tek kaynak makine bloğudur.
// Üç hâl, iki cümle: başlamadı → "henüz başlamadı" · açık/bekliyor/bozuk → "yarım kalmış".
// KEEL'in KENDİ kopyalarında hiçbiri doğmaz: `.keel-kaynak` susturur (o işaret DAĞITILMAZ).

function durumKur(kok, icerik) {
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), icerik);
}
// Gerçek dosya biçimini taklit eder: makine bloğu + insan gövdesi.
const durum = (makineDurum, adim = 'G2', tamamlanan = 'G0, G1', insanCumle = null) =>
  '<!-- yazar: genesis -->\n# GENESIS DURUM\n\n' +
  '## KURULUM DURUMU — makine okur\n```\n' +
  `Adım: ${adim}\nDurum: ${makineDurum}\nTamamlanan: ${tamamlanan}\n` +
  '```\n\n' +
  `**Durum:** ${insanCumle ?? (makineDurum === 'başlamadı' ? 'kurulum başlamadı.' : adim + ' sürüyor.')}\n\n` +
  `## Tamamlanan adımlar\n${tamamlanan}\n\n## Bekleyen adım\n${adim}\n`;

test('kurulum hiç başlamadı: sahibe "henüz başlamadı" satırı çıkar', () => {
  // Bugüne kadar bu hâlde HİÇBİR yüzey konuşmuyordu: taze bir KEEL klasörünü açan sahip
  // hiçbir yönlendirme görmüyordu. Şablonun KENDİ kökünde bu satır `.keel-kaynak` ile susar.
  const kok = kurulum();
  durumKur(kok, durum('başlamadı', '—', '—'));
  const r = kos(kok);
  assert.equal(r.stdout.trim().split('\n').length, 1, 'tek satır (ısrar yok)');
  assert.match(r.stdout, /Bu klasörde kurulum henüz başlamadı — "selam" yazarsan başlar\./);
});

test('"henüz başlamadı" cümlesi README kurulum adımıyla çelişmez', () => {
  // Sahibin gördüğü İLK cümle bu; kılavuzundan farklı bir iş söylerse ya gereksiz bir iş yapar
  // ya "yanlış yerde açtım" diye geri döner. İlk yazım "00_genesis klasöründe oturum açarsan"
  // diyordu, README ise "o klasörü Claude Code'da aç ve selam yaz" (hasım turu 2026-07-29).
  const a = readFileSync(ACILIS, 'utf8');
  const readme = readFileSync(join(BURASI, '..', '..', '..', 'README.md'), 'utf8');
  const m = a.match(/kurulum henüz başlamadı — (.*?)\\n/);
  assert.ok(m, 'başlamadı cümlesi bulunamadı');
  assert.match(m[1], /selam/, 'eylem cümlesi README ile aynı fiili söylemiyor');
  assert.match(readme, /\*\*"selam"\*\*|"selam"/, 'README artık "selam" demiyor — iki yüzey ayrıştı');
});

test('KEEL kendi kopyası (.keel-kaynak): kurulum satırı DOĞMAZ', () => {
  const kok = kurulum();
  durumKur(kok, durum('başlamadı', '—', '—'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'guard', '.keel-kaynak'), 'bakimci\n');
  assert.ok(!/kurulum/i.test(kos(kok).stdout), 'bakımcının kopyasında kurulum satırı basıldı');
});

test('yarım kurulum: tek bilgi satırı, sade cümle', () => {
  const kok = kurulum();
  durumKur(kok, durum('açık'));
  const r = kos(kok);
  const satirlar = r.stdout.trim().split('\n');
  assert.equal(satirlar.length, 1, 'tek satır (ısrar yok)');
  assert.match(r.stdout, /Kurulum yarım kalmış — "devam" yazarsan kaldığımız yerden sürer\./);
  assert.ok(!/KIRMIZI|SARI|UYARI|!/.test(r.stdout), 'bilgi satırı uyarı değildir');
});

test('sahip bekleniyor hâli de "yarım kalmış" sayılır', () => {
  const kok = kurulum();
  durumKur(kok, durum('bekliyor'));
  assert.match(kos(kok).stdout, /Kurulum yarım kalmış/);
});

test('TERS YÖN: kurulum işareti var ama kayıt yarım → tek satır bilgi', () => {
  // İşaret koruma rejiminin anahtarıdır: erken doğduysa sıra denetimi, bu blok ve çekilme
  // kapısının kurulum kipi BİRLİKTE susar. Bugüne kadar hiçbir yüzey bu çelişkiyi söylemiyordu
  // (hasım turu 2026-07-29).
  for (const d of ['açık', 'bekliyor', 'başlamadı']) {
    const kok = kurulum();
    durumKur(kok, durum(d));
    writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-29\n');
    const r = kos(kok);
    assert.match(r.stdout, /işareti var ama kurulum kaydı yarım/, `${d}: çelişki söylenmedi`);
  }
});

test('NEGATİF: işaret + son adım bitti → hiçbir kurulum satırı doğmaz', () => {
  const kok = kurulum();
  durumKur(kok, durum('bitti', 'G5', 'G0, G1, G2, G3a, G3b, G4, G4.5'));
  writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-29\n');
  assert.ok(!/kurulum/i.test(kos(kok).stdout), 'kurulu projede kurulum satırı basıldı');
});

test('sahip yüzeyi HAM KLASÖR ADI taşımaz (jargon yasağı)', () => {
  // İlk yazım iki cümlede de "00_genesis klasöründe oturum aç" diyordu: sahibin sözlüğünde
  // olmayan ham bir klasör adı + kılavuzundan farklı bir iş. Nereye gidileceği makinenin işi.
  const kok = kurulum();
  for (const d of ['başlamadı', 'açık', 'bekliyor']) {
    durumKur(kok, durum(d));
    const cikti = kos(kok).stdout;
    assert.ok(!/00_genesis|GENESIS_DURUM|adimlar/.test(cikti), `${d}: ham ad sızdı → ${cikti}`);
  }
});

// Hasım turu 2026-07-29: ilk sürüm "bekleyen adım" etiketini de basıyordu. Sahibin sözlüğünde
// olmayan hiçbir etiket bu satıra giremez — jargon yasağı bu satırda da geçerli.
test('sahip satırı ham GENESIS etiketi taşımaz (jargon yasağı)', () => {
  const kok = kurulum();
  durumKur(kok, durum('açık', 'G0', '—'));
  const r = kos(kok);
  assert.ok(!/G0|kadran|bekleyen adım:/.test(r.stdout), `etiket sızdı: ${r.stdout}`);
});

test('ÖLÇÜLMÜŞ ESKİ KUSUR: blok içindeki kopya insan cümlesi artık SUSTURMUYOR', () => {
  // Eski çapa dosyadaki İLK eşleşmeyle susuyordu ve bayrağı hiç sıfırlanmıyordu: makine
  // bloğunun içine satır başında birebir kopya yazmak hatırlatmayı KALICI olarak öldürüyordu.
  const kok = kurulum();
  durumKur(
    kok,
    '<!-- yazar: genesis -->\n# GENESIS DURUM\n\n## KURULUM DURUMU — makine okur\n```\n' +
      'Adım: G2\nDurum: açık\nTamamlanan: G0, G1\n**Durum:** kurulum başlamadı.\n```\n\n' +
      '**Durum:** G2 sürüyor.\n'
  );
  assert.match(kos(kok).stdout, /Kurulum yarım kalmış/, 'kopya satır hatırlatmayı öldürdü');
});

test('makine bloğu YOK: sessiz geçmez, "yarım kalmış" basar', () => {
  const kok = kurulum();
  durumKur(kok, '<!-- yazar: genesis -->\n# GENESIS DURUM\n\n**Durum:** G4 tamamlandı.\n');
  assert.match(kos(kok).stdout, /Kurulum yarım kalmış/);
});

test('boş "Bekleyen adım" bölümü: sonraki başlık cümleye SIZMAZ', () => {
  const kok = kurulum();
  durumKur(
    kok,
    '<!-- yazar: genesis -->\n# GENESIS DURUM\n\n## KURULUM DURUMU — makine okur\n```\n' +
      'Adım: G4\nDurum: açık\nTamamlanan: G0, G1, G2, G3a, G3b\n```\n\n' +
      "**Durum:** G4 tamamlandı.\n\n## Bekleyen adım\n\n## Format spec (G3'te doldurulur)\n(henüz yok)\n"
  );
  const r = kos(kok);
  assert.ok(!r.stdout.includes('Format spec'), `markdown başlığı sahibe basıldı: ${r.stdout}`);
  assert.match(r.stdout, /Kurulum yarım kalmış/);
});

test('CRLF satır sonlu durum dosyası: "başlamadı" yine okunur (sahte "yarım" alarmı yok)', () => {
  const kok = kurulum();
  durumKur(kok, durum('başlamadı', '—', '—').replace(/\n/g, '\r\n'));
  assert.match(kos(kok).stdout, /henüz başlamadı/);
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
