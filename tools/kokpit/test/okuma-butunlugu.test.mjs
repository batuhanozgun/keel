// okuma-butunlugu.test.mjs — K13: kokpit okuyamadığını SÖYLER ve okuyamadığına YEŞİL demez.
//
// DOĞUŞ (ölçüm, 2026-08-05 · yeniden ölçüldü 2026-08-08): kokpit dört bozmada SIFIR uyarı
// bastı ve genel durumu YEŞİL gösterdi — sayaç-kalem çelişkisi · ışığa açıklama eklenmesi ·
// damga tek harf sapması · ışık satırının tamamen silinmesi. Kusur tek satırda değil, bir
// ALIŞKANLIKTAYDI: "eşleşirse oku, eşleşmezse yok say". Sözleşme (PANO_SOZLESMESI) bunun
// tersini vaat ediyordu: *"söz dizimi bozulursa kokpit okuma notu basar (asla sessiz
// maskeleme)."* Kapı o vaadi ölçer.
//
// Bu dosya UÇTAN UCA ölçer: gerçek dosyalardan vault kurulur → buildState → app.js sanal
// kabukta gerçek ekranı çizer. Oracle "uyarı sayısı sıfır" DEĞİLDİR (kokpit.md'nin doğrudan
// sonucu); her bozma için BEKLENEN uyarının varlığı ve rozetin rengi ayrı ayrı ölçülür.
//
// FREN: taban ve gerçek-kırmızı halleri de burada. Kapı yanlış-kırmızı üretirse ilk düzeltme
// "kapıyı sustur" olurdu — kapıyı öldüren tam budur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildState } from '../lib/status.mjs';
import { sandbox } from './ekran-kabuk.mjs';

const p = (n) => String(n).padStart(2, '0');
const damgala = (d) => d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
// 5 dk önce: taze (24 saat eşiğinin çok altında) ve gelecek değil (5 dk toleransının dışında).
const TAZE = damgala(new Date(Date.now() - 5 * 60 * 1000));

// Sözleşmeye BİREBİR uyan vault; her alan tek tek bozulabilsin diye parça parça yazılır.
async function vault(o = {}) {
  const kok = await fs.mkdtemp(path.join(os.tmpdir(), 'kokpit-k13-'));
  await fs.mkdir(path.join(kok, '00_pano'), { recursive: true });
  await fs.mkdir(path.join(kok, '01_kutular/KT-001-ilk'), { recursive: true });
  await fs.mkdir(path.join(kok, '03_roller/koordinator'), { recursive: true });
  await fs.mkdir(path.join(kok, '03_roller/uygulayici'), { recursive: true });

  await fs.writeFile(path.join(kok, '00_pano/PANO.md'),
    '# PANO\n\n## MEKANİK BLOK — yalnız bekçi yazar\n```\n'
    + (o.panoDamga ?? 'Son denetim: ' + TAZE + ' (denetim #3)') + '\n'
    + (o.panoIsik ?? 'Işıklar: AKIŞ=YEŞİL · DOSYA=YEŞİL · DAVRANIŞ=VERİ-YOK') + '\n'
    + 'Görevler: G-01=açık\n'
    + (o.sira ? 'Sıra: ' + o.sira + '\n' : '')
    + (o.panoSayac ?? 'Kırmızı: 0 · Sarı: 0') + '\n```\n\n'
    + '## YARGI BLOĞU — yazar: koordinator\n'
    + '- **Aktif kutu:** KT-001 — **AÇIK.**\n'
    + '- **SIRADAKİ OTURUM:** uygulayici — ilk üretim.\n'
    + '- **Blokaj:** yok\n');

  await fs.writeFile(path.join(kok, '00_pano/SAGLIK.md'),
    '# SAĞLIK\n\n'
    + (o.sagDamga ?? 'son denetim: ' + TAZE + ' (denetim #3)') + '\n\n'
    + (o.sagIsik ?? '**Işıklar:** AKIŞ=YEŞİL · DOSYA=YEŞİL · DAVRANIŞ=VERİ-YOK') + '\n\n'
    + (o.sagKalem ?? '- [i] davranış ölçümü iş kapanınca dolar') + '\n');

  await fs.writeFile(path.join(kok, '01_kutular/KT-001-ilk/KUTU.md'),
    '# İlk iş\n\n## Görevler\n\n| Görev | İş | Sahip | Durum | Kanıt |\n|---|---|---|---|---|\n| G-01 | zemin | uygulayici | açık | test: t |\n');
  // Yazım sırası sözleşmede load-bearing: önce diğer roller, sonra koordinatör.
  await fs.writeFile(path.join(kok, '03_roller/uygulayici/DURUM.md'), '# DURUM — Uygulayıcı\n\n**Son oturum:** zemin (2026-08-07)\n');
  await new Promise((r) => setTimeout(r, 12));
  await fs.writeFile(path.join(kok, '03_roller/koordinator/DURUM.md'), '# DURUM — Koordinatör\n\n**Son oturum:** sevk (2026-08-07)\n');

  // Drift radarını sustur: ölçülen şey TAZELİK değil OKUMA BÜTÜNLÜĞÜ. Dosyalar damgadan
  // eski görünmezse radar kendi SARI şeridini basar ve ölçüm bulanır.
  const eski = new Date(Date.now() - 30 * 60 * 1000);
  for (const rel of ['00_pano/PANO.md', '00_pano/SAGLIK.md', '01_kutular/KT-001-ilk/KUTU.md',
                     '03_roller/uygulayici/DURUM.md', '03_roller/koordinator/DURUM.md']) {
    await fs.utimes(path.join(kok, rel), eski, eski);
  }
  if (o.sagYok) await fs.rm(path.join(kok, '00_pano/SAGLIK.md'));
  return kok;
}

async function durum(o = {}) {
  const kok = await vault(o);
  try {
    return await buildState(kok, { koordinatorRol: 'koordinator', rolToreni: true });
  } finally {
    await fs.rm(kok, { recursive: true, force: true });
  }
}

// Sahibin gerçekten gördüğü ekran (app.js çizer; değişken adı değil GÖRÜNEN metin ölçülür).
function ciz(state) {
  const { ctx, ekran } = sandbox();
  ctx.state = state;
  ctx.renderTopbar();
  ctx.renderPano();
  const metin = ['sys-light', 'stamp', 'ribbon', 'pano-view']
    .map((id) => (ekran[id] ? (ekran[id].innerHTML || '') + ' ' + (ekran[id].textContent || '') : ''))
    .join('\n').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  return { metin, rozet: ekran['sys-light'].className, seritGizli: ekran.ribbon.hidden };
}

const uyariVar = (s, parca) => s.warnings.some((w) => w.includes(parca));

// ── FREN: taban temiz ve gerçek kırmızı hâlâ kırmızı ─────────────────────────────────────

test('taban: sözleşmeye uyan vault 0 uyarı basar ve genel durum YEŞİL kalır', async () => {
  const s = await durum();
  assert.deepEqual(s.warnings, [], 'temiz vault uyarı üretmemeli');
  assert.equal(s.saglik.okumaBoslugu, false);
  assert.equal(s.saglik.sistemGenel, 'YEŞİL');
  assert.equal(ciz(s).rozet, 'sys-pill green');
});

test('fren: gerçek KIRMIZI ışık uyarısız KIRMIZI basar (kapı gerçek kırmızıyı bulandırmaz)', async () => {
  const s = await durum({
    panoIsik: 'Işıklar: AKIŞ=KIRMIZI · DOSYA=YEŞİL',
    sagIsik: '**Işıklar:** AKIŞ=KIRMIZI · DOSYA=YEŞİL',
  });
  assert.deepEqual(s.warnings, []);
  assert.equal(s.saglik.sistemGenel, 'KIRMIZI');
  assert.equal(ciz(s).rozet, 'sys-pill red');
});

// ── BOZMA 1: sayaç ile kalem çelişiyor ───────────────────────────────────────────────────

test('bozma 1 · PANO "Kırmızı: 0" derken SAGLIK\'ta KIRMIZI kalem var → uyarı + rozet KIRMIZI', async () => {
  const s = await durum({ sagKalem: '- [KIRMIZI] kayıt dosyası kayıp' });
  assert.ok(uyariVar(s, 'kırmızı kalem sayısı uyuşmuyor'), JSON.stringify(s.warnings));
  // Asıl zarar sayının kendisi değildi: ekranda KIRMIZI kalem dururken rozet YEŞİL basıyordu.
  assert.equal(s.saglik.sistemGenel, 'KIRMIZI');
  assert.equal(ciz(s).rozet, 'sys-pill red');
});

test('bozma 1b · sarı sayaç ile sarı kalem ayrışırsa da uyarı düşer', async () => {
  const s = await durum({ sagKalem: '- [SARI] dosya tavanına yaklaşıldı' });
  assert.ok(uyariVar(s, 'sarı kalem sayısı uyuşmuyor'), JSON.stringify(s.warnings));
  assert.notEqual(s.saglik.sistemGenel, 'YEŞİL');
});

// ── BOZMA 2: ışığa açıklama eklendi ──────────────────────────────────────────────────────

test('bozma 2 · ışığa açıklama eklenince ışık KAYBOLMAZ, değeri okunur ve not düşer', async () => {
  const s = await durum({
    panoIsik: 'Işıklar: AKIŞ=KIRMIZI (3 kalem) · DOSYA=YEŞİL · DAVRANIŞ=VERİ-YOK',
    sagIsik: '**Işıklar:** AKIŞ=KIRMIZI (3 kalem) · DOSYA=YEŞİL · DAVRANIŞ=VERİ-YOK',
  });
  assert.ok(uyariVar(s, 'fazladan açıklama'), JSON.stringify(s.warnings));
  assert.equal(s.saglik.lights.length, 3, 'üç ışığın üçü de durmalı — eski desen AKIŞ\'ı düşürüyordu');
  assert.equal(s.saglik.lights.find((l) => l.ad === 'AKIŞ').deger, 'KIRMIZI');
  assert.equal(s.saglik.sistemGenel, 'KIRMIZI', 'kaybolan ışık KIRMIZI\'yı da götürüyordu');
});

test('bozma 2b · hiç çözülemeyen ışık parçası (ad=değer değil) → uyarı + YEŞİL basılmaz', async () => {
  const s = await durum({
    panoIsik: 'Işıklar: AKIŞ · DOSYA=YEŞİL',
    sagIsik: '**Işıklar:** AKIŞ · DOSYA=YEŞİL',
  });
  assert.ok(uyariVar(s, 'ışık parçası çözümlenemedi'), JSON.stringify(s.warnings));
  assert.equal(s.saglik.okumaBoslugu, true);
  assert.notEqual(s.saglik.sistemGenel, 'YEŞİL');
});

test('bozma 2c · sözlük dışı ışık değeri (ASCII YESIL) boşluktur — sessizce nötre düşemez', async () => {
  const s = await durum({
    panoIsik: 'Işıklar: AKIŞ=YESIL · DOSYA=YEŞİL',
    sagIsik: '**Işıklar:** AKIŞ=YESIL · DOSYA=YEŞİL',
  });
  assert.ok(uyariVar(s, 'tanınmayan ışık seviyesi'), JSON.stringify(s.warnings));
  assert.equal(s.saglik.okumaBoslugu, true);
  assert.notEqual(s.saglik.sistemGenel, 'YEŞİL');
});

// ── BOZMA 3: damga tek harf saptı ────────────────────────────────────────────────────────

test('bozma 3 · PANO damgası tek harf sapınca uyarı düşer (eskiden tamamen sessizdi)', async () => {
  const s = await durum({ panoDamga: 'Son Denetim: ' + TAZE + ' (denetim #3)' });
  assert.ok(uyariVar(s, 'PANO son denetim damgası okunamadı'), JSON.stringify(s.warnings));
});

test('bozma 3b · SAGLIK damgası sapınca sistem KIRMIZI kalır (eski davranış korunuyor)', async () => {
  const s = await durum({ sagDamga: 'son Denetim: ' + TAZE + ' (denetim #3)' });
  assert.equal(s.saglik.stale, true);
  assert.equal(s.saglik.sistemGenel, 'KIRMIZI');
});

test('bozma 3c · iki blok ayrı denetimden gelirse uyarı düşer (biri eski koşudan kalmış)', async () => {
  const s = await durum({ panoDamga: 'Son denetim: ' + TAZE + ' (denetim #2)' });
  assert.ok(uyariVar(s, 'ayrı denetimden'), JSON.stringify(s.warnings));
});

// ── BOZMA 4: ışık satırı silindi ─────────────────────────────────────────────────────────

test('bozma 4 · SAGLIK ışık satırı silinince uyarı düşer ve kokpit YEŞİL BASMAZ', async () => {
  const s = await durum({ sagIsik: '' });
  assert.ok(uyariVar(s, 'SAGLIK Işıklar satırı okunamadı'), JSON.stringify(s.warnings));
  assert.equal(s.saglik.okumaBoslugu, true);
  assert.notEqual(s.saglik.sistemGenel, 'YEŞİL', 'K13 kabul ölçütü: silinen ışık satırı yeşil basamaz');
  assert.notEqual(ciz(s).rozet, 'sys-pill green');
});

test('bozma 4b · PANO ışık satırı silinince de YEŞİL basılmaz (tek kaynak = kötümser birleştirme kapalı)', async () => {
  const s = await durum({ panoIsik: '' });
  assert.ok(uyariVar(s, 'PANO Işıklar satırı okunamadı'), JSON.stringify(s.warnings));
  assert.notEqual(s.saglik.sistemGenel, 'YEŞİL');
});

// Bu testin doğuşu bozma koşusudur: mergeLights'ın SAGLIK-yok dalını geri almak hiçbir testi
// kırmızıya döndürmüyordu (kör kapı). Sebebi mekanik — SAGLIK dosyası VARKEN eksik ışık
// satırını parseSaglik zaten yakalıyor, o dala hiç gelinmiyordu. Dalın TEK ulaşılan yolu
// SAGLIK.md'nin tamamen yokluğudur; ölçüm oraya taşındı.
test('bozma 4d · SAGLIK dosyası hiç yokken tek kaynakla çalışıldığı SÖYLENİR', async () => {
  const s = await durum({ sagYok: true });
  assert.ok(uyariVar(s, 'SAGLIK ışıkları okunamadı'), JSON.stringify(s.warnings));
  assert.equal(s.saglik.okumaBoslugu, true);
  assert.notEqual(s.saglik.sistemGenel, 'YEŞİL');
});

test('bozma 4c · iki taraf da silinince ışık hiç okunmaz → dürüst gri, yeşil değil', async () => {
  const s = await durum({ panoIsik: '', sagIsik: '' });
  assert.ok(uyariVar(s, 'ışıklar hiçbir kaynaktan okunamadı'), JSON.stringify(s.warnings));
  assert.equal(s.saglik.sistemGenel, 'VERI-YOK');
  assert.notEqual(ciz(s).rozet, 'sys-pill green');
});

test('birebir tekrar eden okuma notu bir kez basılır (aynı yazım iki dosyada da bozuk)', async () => {
  const s = await durum({
    panoIsik: 'Işıklar: AKIŞ=YEŞİL (3 kalem) · DOSYA=YEŞİL',
    sagIsik: '**Işıklar:** AKIŞ=YEŞİL (3 kalem) · DOSYA=YEŞİL',
  });
  const tekrar = s.warnings.filter((w) => w.includes('fazladan açıklama'));
  assert.equal(tekrar.length, 1, 'aynı not iki kez basılmamalı: ' + JSON.stringify(s.warnings));
});

// ── EKRAN: sahip sebebi görüyor mu ───────────────────────────────────────────────────────

test('ekran · okuma boşluğunda SEBEP şeridi görünür (sebepsiz sarı gizleme kaygısı üretir)', async () => {
  const s = await durum({ sagIsik: '' });
  const e = ciz(s);
  assert.equal(e.seritGizli, false, 'şerit görünmeli');
  assert.match(e.metin, /Sağlık dosyası tam okunamadı/);
  assert.match(e.metin, /okuma notu:/, 'ayrıntı da ekranda olmalı');
});

// ── U17: sıra sende DEĞİL ────────────────────────────────────────────────────────────────

test('U17 · Sıra satırı yoksa bugünkü davranış korunur (geri-uyum, uyarı yok)', async () => {
  const s = await durum();
  assert.equal(s.yargi.siraKimde, null);
  assert.match(ciz(s).metin, /sıra sende/);
});

test('U17 · Sıra: sistem → ekran "sıra sende" DEMEZ, sistemin çalıştığını söyler', async () => {
  const s = await durum({ sira: 'sistem' });
  assert.equal(s.yargi.siraKimde, 'sistem');
  const metin = ciz(s).metin;
  assert.match(metin, /sıra sende değil/);
  assert.match(metin, /kendi başına çalışıyor/);
  assert.equal(/Bu senin sıran/.test(metin), false, 'çalışan koşunun üstüne davet çıkmamalı');
});

test('U17 · Sıra: bilinmiyor → yine "sıra sende" denmez (fail-safe yön)', async () => {
  const s = await durum({ sira: 'bilinmiyor' });
  assert.equal(s.yargi.siraKimde, 'bilinmiyor');
  const metin = ciz(s).metin;
  assert.equal(/Bu senin sıran/.test(metin), false);
  assert.match(metin, /okunamadı|okunamıyor/);
});

test('U17 · tanınmayan Sıra değeri sessiz geçmez: uyarı + bilinmiyor', async () => {
  const s = await durum({ sira: 'belki' });
  assert.ok(uyariVar(s, 'Sıra satırı tanınmayan değer'), JSON.stringify(s.warnings));
  assert.equal(s.yargi.siraKimde, 'bilinmiyor');
});
