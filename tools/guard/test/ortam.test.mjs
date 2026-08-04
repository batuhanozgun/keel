// ortam.test.mjs — ortam kontrolü (F1-2a / G0.0). Faz 2 sıra 2'nin bitti ölçütü:
// "PATH'ten node gizlenerek koşulan testte bilgi satırı çıkıyor, varken çıkmıyor; git için aynısı."
//
// YOKLUK NASIL TAKLİT EDİLİR — ve ölçütten neden bir adım sapıldığı:
// Yazılı ölçüt "PATH'ten node gizlenerek" diyor. Yalnız PATH daraltmak YETMEZ, çünkü betik GUI
// oturumunu düşünüp bilinen kurulum yollarına da bakar (`aday:`) — bakmasaydı gerçek bir makinede
// yanlış alarm verirdi ve ölçütün asıl amacı ("varken çıkmıyor") çökerdi. Bu yüzden yokluk İKİ
// şeyle kurulur: dar PATH (guard.test.mjs emsali) + aday yolları sahte olan bir kalem dosyası.
// Ölçütün lafzı değil, ölçtüğü şey karşılanıyor: yok → satır çıkıyor, var → çıkmıyor, git için de.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, mkdirSync, cpSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const GUARD_DIZIN = join(BURASI, '..');
const BETIK = join(GUARD_DIZIN, 'ortam-kontrol.sh');
const KALEMLER = join(GUARD_DIZIN, 'ortam-kalemleri.txt');
const ACILIS = join(GUARD_DIZIN, 'acilis.sh');

// Dar PATH: /bin var (bash orada), /usr/bin YOK → node da git de PATH'te görünmez.
const DAR_PATH = '/bin';

// HOME VERİLİR: fixture'ın taklit ettiği şey DAR PATH'tir, "HOME'suz makine" değil — KEEL hiçbir
// zaman HOME'suz koşmaz (kanca da, kurulum oturumu da HOME ile gelir). HOME düşünce `git config`
// kullanıcı ayarını okuyamaz ve git ayarlı bir makinede bile AYARSIZ görünür; yani HOME'suz
// fixture, var olmayan bir dünyayı ölçerdi. (Ders: fixture kapının değil GERÇEĞİN taklidi olmalı.)
function kos(argv, { path = process.env.PATH } = {}) {
  return spawnSync('/bin/bash', [BETIK, ...argv], {
    encoding: 'utf8',
    env: { PATH: path, LC_ALL: 'C.UTF-8', HOME: process.env.HOME },
  });
}

// Aday yollarını sahteleyen kalem dosyası üretir; hangi araçların "yok" sayılacağını seçer.
function kalemDosyasi(yokOlanlar) {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-'));
  const ham = readFileSync(KALEMLER, 'utf8');
  let aktif = null;
  const satirlar = ham.split('\n').map((s) => {
    const m = s.match(/^\[(.+)\]$/);
    if (m) { aktif = m[1]; return s; }
    if (s.startsWith('aday: ') && yokOlanlar.includes(aktif)) return 'aday: /keel-yok/bir/yer';
    return s;
  });
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol, satirlar.join('\n'));
  return yol;
}

// ── Bitti ölçütü: zorunlu araç yokken bilgi satırı ÇIKAR, varken ÇIKMAZ ────────────────────

test('node PATH\'ten gizlenince bilgi satırı çıkar', () => {
  const r = kos(['--satir', '--kalemler', kalemDosyasi(['node'])], { path: DAR_PATH });
  assert.equal(r.status, 0, 'satır kipi HER ZAMAN 0 döner (açılış kancası kilitlenmez)');
  assert.match(r.stdout, /Ortam eksiği/);
  assert.match(r.stdout, /node/);
  assert.ok(!/\bgit\b/.test(r.stdout), 'git yerindeyken adı geçmemeli: ' + r.stdout);
});

test('node varken bilgi satırı ÇIKMAZ (yanlış alarm yok)', () => {
  const r = kos(['--satir']);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '', 'ortam tamken açılış satırı doğmaz: ' + r.stdout);
});

test('git PATH\'ten gizlenince bilgi satırı çıkar', () => {
  const r = kos(['--satir', '--kalemler', kalemDosyasi(['git'])], { path: DAR_PATH });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Ortam eksiği/);
  assert.match(r.stdout, /git/);
  assert.ok(!/\bnode\b/.test(r.stdout), 'node yerindeyken adı geçmemeli: ' + r.stdout);
});

test('iki zorunlu birden yoksa ikisi de tek satırda anılır', () => {
  const r = kos(['--satir', '--kalemler', kalemDosyasi(['node', 'git'])], { path: DAR_PATH });
  assert.equal(r.stdout.split('\n').filter((s) => s.trim()).length, 1, 'tek satır (ısrar yok)');
  assert.match(r.stdout, /node · git/);
});

// ── Seçimli kalem: eksikliği ASLA zorunlu gibi davranmaz ───────────────────────────────────

test('seçimli eksik açılış satırında SUSAR ve çıkışı kırmızıya çevirmez', () => {
  const kalem = kalemDosyasi(['curl', 'caffeinate', 'security', 'launchctl']);
  const satir = kos(['--satir', '--kalemler', kalem], { path: DAR_PATH });
  assert.equal(satir.stdout.trim(), '', 'seçimli eksik her oturumda dırdır etmez: ' + satir.stdout);
  const rapor = kos(['--rapor', '--kalemler', kalem], { path: DAR_PATH });
  assert.equal(rapor.status, 0, 'seçimli eksik kuruluma engel DEĞİLDİR');
  assert.match(rapor.stdout, /Seçimli eksik:/);
});

// ── Rapor kipi: dört cevap + çıkış kodu sözleşmesi ─────────────────────────────────────────

test('rapor: eksik kalemin DÖRT cevabı basılır, var olanınki basılmaz', () => {
  const r = kos(['--rapor', '--kalemler', kalemDosyasi(['node'])], { path: DAR_PATH });
  assert.equal(r.status, 1, 'zorunlu eksikte exit 1 — GENESIS buna bakıp kuruluma başlamaz');
  for (const baslik of ['Bu nedir', 'KEEL neden istiyor', 'Kurmazsan ne olmaz', 'Nereden gelir']) {
    assert.ok(r.stdout.includes(baslik), 'eksik kalemde başlık yok: ' + baslik);
  }
  assert.match(r.stdout, /nodejs\.org/, 'kaynağı söylenmeli (KEEL kurmaz, nereden alınacağını söyler)');
  const dortluSayisi = (r.stdout.match(/Bu nedir/g) || []).length;
  assert.equal(dortluSayisi, 1, 'yalnız EKSİK kalemin cevapları basılır (şişme freni)');
});

test('rapor: hepsi yerindeyse exit 0 ve tek satır sonuç', () => {
  const r = kos(['--rapor']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SONUÇ: hepsi yerinde\./);
  assert.ok(!/Bu nedir/.test(r.stdout), 'her şey yerindeyken açıklama metni basılmaz');
});

test('kalem listesindeki HER kaydın dört cevabı ve sınıfı tam', () => {
  const ham = readFileSync(KALEMLER, 'utf8');
  const kayitlar = ham.split(/^\[/m).slice(1);
  assert.ok(kayitlar.length >= 6, 'en az altı kalem bekleniyor, bulunan: ' + kayitlar.length);
  for (const k of kayitlar) {
    const ad = k.split(']')[0];
    for (const alan of ['sinif:', 'arama:', 'nedir:', 'neden:', 'yoksa:', 'nereden:']) {
      assert.ok(new RegExp('^' + alan, 'm').test(k), `${ad}: "${alan}" alanı eksik`);
    }
    const sinif = (k.match(/^sinif: (.+)$/m) || [])[1];
    assert.ok(['zorunlu', 'secimli'].includes(sinif), `${ad}: sınıf tanınmıyor: ${sinif}`);
    if (sinif === 'secimli') {
      assert.ok(/^ozellik: .+$/m.test(k), `${ad}: seçimli kalem hangi özelliğe bağlı olduğunu söylemeli`);
    }
  }
});

test('eksik alanlı kayıt SESSİZ geçmez — kalem listesi kusuru raporda görünür', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-bozuk-'));
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol, '[node]\nsinif: zorunlu\narama: node\nnedir: bir şey\n');
  const r = kos(['--rapor', '--kalemler', yol]);
  assert.match(r.stdout, /KALEM LİSTESİ KUSURU/);
  assert.match(r.stdout, /node/);
});

// ── Betiğin kendi dayanıklılığı: ölçtüğü şeye bağlı olamaz ─────────────────────────────────

test('betik node OLMADAN koşar (yokluğunu bildiren şey ona bağlı olamaz)', () => {
  const r = kos(['--rapor'], { path: DAR_PATH });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /ORTAM KONTROLÜ/);
  assert.equal(r.stderr.trim(), '', 'dar PATH\'te dış komut arayıp hata basmamalı: ' + r.stderr);
});

test('dar PATH\'te kendi veri dosyasını bulur (dirname gibi dış komuta bağlı değil)', () => {
  // Betik başka bir dizinden çağrılır: kendi yolunu yerleşiklerle çözmek zorunda.
  const r = spawnSync('/bin/bash', [BETIK, '--rapor'], {
    cwd: tmpdir(), encoding: 'utf8', env: { PATH: DAR_PATH, LC_ALL: 'C.UTF-8', HOME: process.env.HOME },
  });
  assert.equal(r.stderr.trim(), '', 'stderr temiz olmalı: ' + r.stderr);
  assert.match(r.stdout, /ZORUNLU/);
});

test('bilinmeyen argüman sessizce yutulmaz', () => {
  const r = kos(['--boyle-bir-kip-yok']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /bilinmeyen argüman/);
});

// Hasım bulgusu (altı mercekten altısı): `shift 2` tek argüman kalmışken başarısız olur ve
// döngü sonsuza girer — betik dönmez, CPU yakar, açılış kancası asılır.
test('--kalemler değersiz verilince DONMAZ, hata verir', () => {
  const r = spawnSync('/bin/bash', [BETIK, '--kalemler'], {
    encoding: 'utf8', env: { PATH: process.env.PATH, LC_ALL: 'C.UTF-8' }, timeout: 5000,
  });
  assert.notEqual(r.signal, 'SIGTERM', 'zaman aşımına düştü = sonsuz döngü');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--kalemler bir yol ister/);
});

// Hasım bulgusu (dört mercek, YÜKSEK): hiç kayıt okunamayan dosyada "SONUÇ: hepsi yerinde"
// diyordu. "Ölçemedim" ile "hepsi yerinde" aynı şey değildir — paketin varlık sebebi bu ayrım.
test('hiç kayıt çözülemezse "hepsi yerinde" DEMEZ', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-bos-'));
  for (const [ad, icerik] of [['bos.txt', ''], ['yorum.txt', '# yalnız yorum\n'], ['bozuk.txt', 'node\nsinif zorunlu\n']]) {
    const yol = join(dizin, ad);
    writeFileSync(yol, icerik);
    const rapor = kos(['--rapor', '--kalemler', yol]);
    assert.equal(rapor.status, 2, `${ad}: sessiz yeşil vermemeli`);
    assert.ok(!/hepsi yerinde/.test(rapor.stdout), `${ad}: "hepsi yerinde" basılmamalı`);
    const satir = kos(['--satir', '--kalemler', yol]);
    assert.equal(satir.status, 0, `${ad}: açılış kancası kilitlenmez`);
    assert.match(satir.stdout, /Ortam denetimi çalışamadı/, `${ad}: sessiz de kalmamalı`);
  }
});

// Hasım bulgusu (beş mercek, YÜKSEK): tek harflik yazım hatası (`sinif: zorunlu ` ya da
// `sinif: zorunul`) zorunlu aracı SESSİZCE seçimliye düşürüyordu — denetimi kapatan kusur.
test('tanınmayan sınıf değeri fail-closed: ZORUNLU sayılır ve kusur olarak bildirilir', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-sinif-'));
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol,
    '[node]\nsinif: zorunul\narama: node\naday: /keel-yok/node\nnedir: a\nneden: b\nyoksa: c\nnereden: d\n');
  const r = kos(['--rapor', '--kalemler', yol], { path: DAR_PATH });
  assert.equal(r.status, 1, 'tanınmayan sınıf seçimliye DÜŞMEZ; zorunlu sayılır');
  assert.match(r.stdout, /KALEM LİSTESİ KUSURU/);
  assert.match(r.stdout, /sınıf/);
});

test('seçimli kalem özelliğini söylemek zorunda (yoksa kusur)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-ozelliksiz-'));
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol, '[curl]\nsinif: secimli\narama: curl\nnedir: a\nneden: b\nyoksa: c\nnereden: d\n');
  const r = kos(['--rapor', '--kalemler', yol]);
  assert.match(r.stdout, /KALEM LİSTESİ KUSURU/);
  assert.match(r.stdout, /özelliksiz/);
});

// Hasım bulgusu (üç mercek, YÜKSEK): macOS'ta Xcode araçları kurulu değilken /usr/bin/git
// YİNE DE durur ama her çağrıda hata verir. Yalnız varlığa bakan denetim orada yanlış yeşil basar.
test('VAR ama ÇALIŞMAYAN araç eksik sayılır (macOS git vekil dosyası sınıfı)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-bozukarac-'));
  const sahte = join(dizin, 'git');
  writeFileSync(sahte, '#!/bin/sh\nexit 1\n');
  chmodSync(sahte, 0o755);
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol,
    `[git]\nsinif: zorunlu\narama: git\naday: ${sahte}\ndene: --version\nnedir: a\nneden: b\nyoksa: c\nnereden: d\n`);
  const r = kos(['--rapor', '--kalemler', yol], { path: DAR_PATH });
  assert.equal(r.status, 1, 'çalışmayan zorunlu araç YEŞİL sayılamaz');
  assert.match(r.stdout, /VAR AMA ÇALIŞMIYOR/);
});

test('çalışan araç yoklamadan geçer (yoklama yanlış alarm üretmiyor)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-saglam-'));
  const sahte = join(dizin, 'git');
  writeFileSync(sahte, '#!/bin/sh\nexit 0\n');
  chmodSync(sahte, 0o755);
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol,
    `[git]\nsinif: zorunlu\narama: git\naday: ${sahte}\ndene: --version\nnedir: a\nneden: b\nyoksa: c\nnereden: d\n`);
  const r = kos(['--rapor', '--kalemler', yol], { path: DAR_PATH });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SONUÇ: hepsi yerinde/);
});

// ── ÜÇÜNCÜ HÂL: araç VAR, ÇALIŞIYOR, ama AYARSIZ ─────────────────────────────────────────
// Kanıt: git kurulu ve `--version` veriyor olabilir, ama user.name/user.email ayarlı değilse
// kurulum İLK COMMIT'te durur. Varlığa+çalışırlığa bakan denetim "✔ git" der ve GENESIS ölür.
// Sahte araç: `--version` sıfır döner (çalışıyor), `config` çıktısı boş ya da dolu (ayar).
function ayarliArac(dizin, { name = '', email = '' } = {}) {
  const sahte = join(dizin, 'git');
  writeFileSync(sahte,
    '#!/bin/sh\n' +
    'case "$1" in\n' +
    '  --version) echo "git version 0.0-sahte"; exit 0 ;;\n' +
    '  config) case "$3" in\n' +
    `    user.name)  printf '%s' "${name}" ;;\n` +
    `    user.email) printf '%s' "${email}" ;;\n` +
    '  esac; exit 0 ;;\n' +
    'esac\nexit 0\n');
  chmodSync(sahte, 0o755);
  return sahte;
}
function ayarliKalem(dizin, sahte, { ayarsiz = 'DÜZELTME CÜMLESİ: git config --global user.name "Ad"' } = {}) {
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol,
    `[git]\nsinif: zorunlu\narama: git\naday: ${sahte}\ndene: --version\n` +
    'ayar: config --get user.name\nayar: config --get user.email\n' +
    (ayarsiz === null ? '' : `ayarsiz: ${ayarsiz}\n`) +
    'nedir: a\nneden: b\nyoksa: c\nnereden: NEREDEN-CEVABI\n');
  return yol;
}

test('AYARSIZ araç eksik sayılır — kurulu ama kullanılamaz (git kimliği sınıfı)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-ayarsiz-'));
  const r = kos(['--rapor', '--kalemler', ayarliKalem(dizin, ayarliArac(dizin))], { path: DAR_PATH });
  assert.equal(r.status, 1, 'ayarsız zorunlu araç YEŞİL sayılamaz — kurulum ilk kayıtta durur');
  assert.match(r.stdout, /AYARSIZ/);
  assert.match(r.stdout, /DÜZELTME CÜMLESİ/, 'sahibe ne yapacağı söylenir');
  assert.ok(!/NEREDEN-CEVABI/.test(r.stdout),
    '"nereden gelir" AYARSIZ hâlinde YANLIŞ yönlendirmedir — araç zaten kurulu: ' + r.stdout);
});

test('ayarları tam olan araç geçer (ayar yoklaması yanlış alarm üretmiyor)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-ayarli-'));
  const sahte = ayarliArac(dizin, { name: 'Ad Soyad', email: 'a@b.c' });
  const r = kos(['--rapor', '--kalemler', ayarliKalem(dizin, sahte)], { path: DAR_PATH });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SONUÇ: hepsi yerinde/);
});

// En sinsi kusur: iki `ayar` satırından ikincisi birincisini EZERSE denetim yarım ölçer ve
// "adı var ama e-postası yok" hâli sessizce yeşile döner. Biriktirme bu testle bağlanır.
test('iki ayardan BİRİ eksikse yine AYARSIZ (ayar satırları birikiyor, üzerine yazmıyor)', () => {
  for (const [ad, eposta] of [['Ad Soyad', ''], ['', 'a@b.c']]) {
    const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-yarim-'));
    const sahte = ayarliArac(dizin, { name: ad, email: eposta });
    const r = kos(['--rapor', '--kalemler', ayarliKalem(dizin, sahte)], { path: DAR_PATH });
    assert.equal(r.status, 1, `yarım ayar (ad='${ad}' eposta='${eposta}') YEŞİL sayılamaz`);
    assert.match(r.stdout, /AYARSIZ/);
  }
});

test('ayar yazılıp ayarsiz cevabı yazılmayan kayıt SESSİZ geçmez', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-cevapsiz-'));
  const sahte = ayarliArac(dizin, { name: 'Ad', email: 'a@b.c' });
  const r = kos(['--rapor', '--kalemler', ayarliKalem(dizin, sahte, { ayarsiz: null })], { path: DAR_PATH });
  assert.match(r.stdout, /KALEM LİSTESİ KUSURU/);
  assert.match(r.stdout, /ayarsız-cevapsız/);
});

// `dene` ile aynı sınır: açılış kancasında aracı çağırmak macOS'ta kurulum penceresi açtırabilir.
test('--satir kipi ayar yoklaması KOŞMAZ (açılışta pencere riski yok)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-satirayar-'));
  const r = kos(['--satir', '--kalemler', ayarliKalem(dizin, ayarliArac(dizin))], { path: DAR_PATH });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '', 'ayarsızlık açılış satırında konuşmaz: ' + r.stdout);
});

// Mutasyon freni: canlı kalem listesinde git kaydı gerçekten iki ayar satırı + cevabını taşımalı.
test('canlı kalem listesinde git kimliği ölçülüyor (iki ayar + düzeltme cümlesi)', () => {
  const veri = readFileSync(KALEMLER, 'utf8');
  const kayit = veri.split(/^\[/m).find((k) => k.startsWith('git]'));
  const ayarlar = kayit.match(/^ayar: (.+)$/gm) || [];
  assert.equal(ayarlar.length, 2, 'git kimliği iki alandır: user.name VE user.email');
  assert.match(kayit, /^ayar: config --get user\.name$/m);
  assert.match(kayit, /^ayar: config --get user\.email$/m);
  assert.match(kayit, /^ayarsiz: .*git config --global user\.name/m, 'düzeltme komutu cevapta olmalı');
  assert.match(kayit, /^ayarsiz: .*git config --global user\.email/m);
});

test('kalem listesi okunamazsa: rapor DURUR, satır kipi haber verip GEÇER', () => {
  const rapor = kos(['--rapor', '--kalemler', '/keel-yok/kalemler.txt']);
  assert.equal(rapor.status, 2, 'rapor sessizce "hepsi yerinde" DEMEZ');
  const satir = kos(['--satir', '--kalemler', '/keel-yok/kalemler.txt']);
  assert.equal(satir.status, 0, 'açılış kancası hiçbir koşulda kilitlenmez');
  assert.match(satir.stdout, /Ortam denetimi çalışamadı/, 'ölçemediğini SÖYLER');
});

test('kalem yolu dizin olursa ham kabuk hatasıyla ölmez', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-dizin-'));
  const r = kos(['--rapor', '--kalemler', dizin]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /dosya değil|okunamıyor/);
});

// Aday listesi beş dosyada kopya (bu paketten ÖNCE de dört kopyaydı). Bu liste ötekilerden
// GENİŞ olursa "node var" deriz ama koruma kancası bulamaz — yanlış yeşil. Drift = KIRMIZI.
test('node aday listesi koruma betikleriyle BİREBİR aynı (ayrışırsa yanlış yeşil doğar)', () => {
  const veri = readFileSync(KALEMLER, 'utf8');
  const kayit = veri.split(/^\[/m).find((k) => k.startsWith('node]'));
  const listem = (kayit.match(/^aday: (.+)$/m) || [])[1].trim();
  const betikler = ['file-guard.sh', 'kapanis.sh', 'icerik-suzgeci.sh', '../sevk/ortak.sh'];
  for (const b of betikler) {
    const m = readFileSync(join(GUARD_DIZIN, b), 'utf8').match(/for aday in (.+?); do/);
    assert.ok(m, `${b}: aday listesi bulunamadı`);
    assert.equal(m[1].trim(), listem, `${b}: aday listesi ortam-kalemleri.txt ile ayrışmış`);
  }
});

// Sahibe GÖRÜNEN metin sınanmazsa, dört cevabı boşaltan bir mutasyon testlerden geçer.
test('rapor sahibe görünen metni fiilen taşıyor (mutasyon freni)', () => {
  const r = kos(['--rapor']);
  assert.match(r.stdout, /^ZORUNLU/m);
  assert.match(r.stdout, /^SEÇİMLİ/m);
  for (const ad of ['node', 'git', 'curl', 'caffeinate', 'security', 'launchctl']) {
    assert.match(r.stdout, new RegExp('✔ ' + ad + '\\s'), `raporda kalem yok: ${ad}`);
  }
  assert.match(r.stdout, /→ e-posta haberi/, 'seçimli kalem hangi özelliğe bağlı olduğunu söylemeli');
});

// Hasım bulgusu: tek bozuk başlık (`[git] ` — sonda boşluk) yalnız o kaydı düşürmüyor; sonraki
// alanlar BİR ÖNCEKİ kaydın üstüne yazıyor ve rapor "✔ node /usr/bin/git" gibi YANLIŞ bir şey
// söylüyordu. Yanlış rapor, raporsuzluktan beterdir → okuma güvenilmezse fail-closed.
test('tek tanınmayan satır bile raporu durdurur (yanlış rapor üretmez)', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-tanınmayan-'));
  const yol = join(dizin, 'kalemler.txt');
  const ham = readFileSync(KALEMLER, 'utf8').replace(/^\[git\]$/m, '[git] ');
  writeFileSync(yol, ham);
  const r = kos(['--rapor', '--kalemler', yol]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /satır tanınmadı/);
  assert.ok(!/✔ node\s+\S*git/.test(r.stdout), 'yanlış eşleşmiş satır basılmamalı');
  const satir = kos(['--satir', '--kalemler', yol]);
  assert.equal(satir.status, 0);
  assert.match(satir.stdout, /Ortam denetimi çalışamadı/);
});

// CRLF (Windows satır sonu) tek başına BÜTÜN kayıtları buharlaştırıyordu → "hepsi yerinde".
test('CRLF satır sonlu kalem dosyası doğru okunur', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-crlf-'));
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol, readFileSync(KALEMLER, 'utf8').replace(/\n/g, '\r\n'));
  const r = kos(['--rapor', '--kalemler', yol]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✔ node/);
  assert.match(r.stdout, /✔ git/);
});

// Hasım bulgusu: "yedi mutasyondan beşi 17/17 yeşil geçti" — sahibe GÖRÜNEN sonuç metni
// sınanmadığı için raporu boşaltan bir değişiklik testlerden geçiyordu.
test('sonuç metinleri birebir sınanır (mutasyon freni)', () => {
  const eksik = kos(['--rapor', '--kalemler', kalemDosyasi(['node'])], { path: DAR_PATH });
  assert.match(eksik.stdout, /SONUÇ: zorunlu araç eksik — node\./);
  assert.match(eksik.stdout, /Kuruluma başlanmaz\./);
  assert.ok(!/hepsi yerinde/.test(eksik.stdout), 'zorunlu eksikken "hepsi yerinde" geçmemeli');

  const secimli = kos(['--rapor', '--kalemler', kalemDosyasi(['curl'])], { path: DAR_PATH });
  assert.equal(secimli.status, 0);
  assert.match(secimli.stdout, /✘ curl\s+BULUNAMADI\s+→ "e-posta haberi" çalışmaz/);
  assert.match(secimli.stdout, /SONUÇ: zorunluların hepsi var\. Seçimli eksik: curl/);
});

test('kalem dosyasındaki metin printf biçim dizesi olarak yorumlanmaz', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'keel-ortam-printf-'));
  const yol = join(dizin, 'kalemler.txt');
  writeFileSync(yol,
    '[node]\nsinif: zorunlu\narama: node\naday: /keel-yok/node\nnedir: %s %d %%\nneden: b\nyoksa: c\nnereden: d\n');
  const r = kos(['--rapor', '--kalemler', yol], { path: DAR_PATH });
  assert.match(r.stdout, /Bu nedir\s+: %s %d %%/, 'veri, biçim dizesi olarak işlenmemeli');
});

// ── Kanca dikişi: acilis.sh gerçekten çağırıyor mu ────────────────────────────────────────

test('acilis.sh ortam satırını basar (kablo canlı)', () => {
  const kok = mkdtempSync(join(tmpdir(), 'keel-acilis-ortam-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  cpSync(BETIK, join(kok, 'tools', 'guard', 'ortam-kontrol.sh'));
  // Kurulu projede kalem dosyası betiğin YANINDADIR; sahte adaylarla node'u yok göster.
  cpSync(kalemDosyasi(['node']), join(kok, 'tools', 'guard', 'ortam-kalemleri.txt'));
  const r = spawnSync('/bin/bash', [ACILIS], {
    encoding: 'utf8',
    env: { PATH: DAR_PATH, CLAUDE_PROJECT_DIR: kok, LC_ALL: 'C.UTF-8' },
  });
  assert.equal(r.status, 0, 'açılış kancası her zaman 0');
  assert.match(r.stdout, /Ortam eksiği: node/);
});

test('acilis.sh: ortam betiği YOKSA sessizce geçer (fail-open)', () => {
  const kok = mkdtempSync(join(tmpdir(), 'keel-acilis-ortamsiz-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  const r = spawnSync('/bin/bash', [ACILIS], {
    encoding: 'utf8',
    env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: kok, LC_ALL: 'C.UTF-8' },
  });
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), '');
});

// ── Sözleşme: README ve GENESIS ile kod ayrışmasın ────────────────────────────────────────

// GENESIS tarifi 2026-07-29'da indeks + adım dosyalarına bölündü (F1-1). Bu sözleşme testi
// TARİFİN TAMAMINA bakar (indeks + bütün adımlar birlikte), tek dosyaya değil: amacı "kod ile
// GENESIS metni ayrışmasın" olduğu için metnin hangi adım dosyasında durduğu onu ilgilendirmez.
// Böylece ileride bir adım bölünse ya da taşınsa tanık susmaz — genişleyen tek şey okuma yolu.
function genesisTarifi() {
  const kok = join(GUARD_DIZIN, '..', '..');
  const adimDizin = join(kok, '00_genesis', 'adimlar');
  const adimlar = readdirSync(adimDizin).filter((a) => a.endsWith('.md')).sort();
  assert.ok(adimlar.length > 0, '00_genesis/adimlar/ altında adım dosyası yok — tarif bölünmüş ama boş');
  return [readFileSync(join(kok, 'GENESIS.md'), 'utf8')]
    .concat(adimlar.map((a) => readFileSync(join(adimDizin, a), 'utf8')))
    .join('\n');
}

test('GENESIS G0.0: betiği çağırıyor · üç çıkış kodunu da tanımlıyor · sahte çatal kurmuyor', () => {
  const g = genesisTarifi();
  assert.match(g, /tools\/guard\/ortam-kontrol\.sh/, 'GENESIS betiği adıyla çağırmalı');
  assert.match(g, /KURULUMA BAŞLAMA/, 'zorunlu eksikte (kod 1) durma kuralı yazılı olmalı');
  assert.match(g, /Çıkış kodu 2/, 'denetimin kendisi çalışamazsa ne olacağı yazılı olmalı');
  assert.match(g, /SORU SORMA/, 'her şey yerindeyken onay istemek sahte çataldır — kural yazılı olmalı');
  assert.match(g, /VAR AMA ÇALIŞMIYOR/, 'var-ama-çalışmayan araç hâli GENESIS metninde tanımlı olmalı');
});

test('README zorunlu araçları tam sayar (git dahil — F1-2a bulgusu)', () => {
  const r = readFileSync(join(GUARD_DIZIN, '..', '..', 'README.md'), 'utf8');
  assert.match(r, /\*\*Node\.js\*\*/);
  assert.match(r, /\*\*Git\*\*/, 'git bugüne kadar "Gerekenler" listesinde hiç yoktu');
  assert.match(r, /ortam-kontrol\.sh/, 'okuyucuya ölçüm komutu verilmeli');
});
