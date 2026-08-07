// klasor-hazirligi.test.mjs — kurulum girişi (F1-2b · GENESIS G0.1).
// Bu betik KEEL'in TEK geri alınamaz kurulum adımını içerir (`rm -rf <kök>/.git`). Buradaki
// testlerin çoğu "doğru çalışıyor mu"dan çok "YANLIŞ yerde çalışmıyor mu" sorusuna bakar:
// yanlış kök · kurulu proje · sahibin kendi deposu · doğrulanmamış yedek. Sıra kilidi de
// test edilir: yedek alınamadıysa bağ KOPARILMAMIŞ olmalı.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const BETIK = join(BURASI, '..', 'klasor-hazirligi.sh');
const KOK_DEPO = join(BURASI, '..', '..', '..');

// Kurulmamış bir KEEL klasörünün emniyet-kemeri izleri (betik bu üçünü arar).
function keelKlasoru(ust, ad = 'proje') {
  const kok = join(ust, ad);
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  writeFileSync(join(kok, 'GENESIS.md'), '# GENESIS\n\nsabit kurulum planı\n');
  writeFileSync(join(kok, 'tools', 'guard', 'file-guard.sh'), '#!/bin/bash\nexit 0\n');
  writeFileSync(join(kok, '00_genesis', 'GENESIS_DURUM.md'), '# GENESIS DURUM\n\n**Durum:** kurulum başlamadı.\n');
  return kok;
}
const ustKlasor = () => mkdtempSync(join(tmpdir(), 'khaz-test-'));
const kos = (kok, ...args) =>
  spawnSync('bash', [BETIK, ...args], { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
const git = (kok, ...args) => spawnSync('git', ['-C', kok, ...args], { encoding: 'utf8' });

const KEEL_URL = 'https://github.com/batuhanozgun/keel.git';

function depoAc(kok, uzak = null) {
  assert.equal(git(kok, 'init', '-q').status, 0, 'test kurulumu: git init başarısız');
  if (uzak) assert.equal(git(kok, 'remote', 'add', 'origin', uzak).status, 0);
}

// ── Emniyet kemerleri: betiğin ÇALIŞMAMASI gereken yerler ─────────────────────────────────

test('kök bir KEEL klasörü değilse: çıkış 2, hiçbir şey ölçülmez', () => {
  const ust = ustKlasor();
  const kok = join(ust, 'rastgele');
  mkdirSync(kok, { recursive: true });
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /KEEL klasörü değil/);
  assert.equal(r.stdout.trim(), '', 'yanlış klasör hakkında rapor da üretilmez');
});

// Üç çapanın ÜÇÜ de listede kalmalı: biri düşerse yarı-silinmiş bir klasörde betik işe girişir.
for (const iz of ['00_genesis', 'GENESIS.md', 'tools/guard/file-guard.sh']) {
  test(`KEEL izlerinden biri eksikse (${iz} yok): çıkış 2`, () => {
    const ust = ustKlasor();
    const kok = keelKlasoru(ust);
    rmSync(join(kok, iz), { recursive: true, force: true });
    depoAc(kok, KEEL_URL);
    const r = kos(kok, '--rapor');
    assert.equal(r.status, 2);
    assert.ok(r.stderr.includes(iz), `stderr eksik izi söylemeli: ${r.stderr}`);
  });
}

test('proje zaten kuruluysa (.kurulum-tamam var): çıkış 2 — hazırlık kurulumdan ÖNCE koşar', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  writeFileSync(join(kok, '.kurulum-tamam'), '2026-07-29\n');
  depoAc(kok, KEEL_URL);
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /kurulum başlamış ya da bitmiş/);
  assert.ok(existsSync(join(kok, '.git')), 'kurulu projenin git kaydına DOKUNULMAZ');
  assert.match(git(kok, 'remote', '-v').stdout, /batuhanozgun\/keel/);
});

// Hasım turu 2026-07-29: `.kurulum-tamam` ancak G5'te doğuyor, yani G1..G5 arası bütün
// pencerede betik kurulumun KENDİ git kaydını (ve kilitli-tarih çapasını) siliyordu.
for (const iz of ['02_kanon', '00_pano', '01_kutular', '03_roller']) {
  test(`kurulum ortasında (${iz} var): çıkış 2 — kurulumun kendi kaydı silinmez`, () => {
    const ust = ustKlasor();
    const kok = keelKlasoru(ust);
    mkdirSync(join(kok, iz), { recursive: true });
    depoAc(kok, KEEL_URL);
    const r = kos(kok, '--uygula');
    assert.equal(r.status, 2);
    assert.match(r.stderr, new RegExp(`kurulum başlamış ya da bitmiş \\(var: ${iz}\\)`));
    assert.ok(existsSync(join(kok, '.git')));
  });
}

test('KEEL\'in kendi kopyası (tools/guard/.keel-kaynak): çıkış 2 — buraya kurulum yapılmaz', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  writeFileSync(join(kok, 'tools', 'guard', '.keel-kaynak'), 'bu klasör KEEL\'in kendisidir\n');
  depoAc(kok, KEEL_URL);
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /KEEL'in kendi kopyası/);
  assert.ok(existsSync(join(kok, '.git')));
  assert.equal(readdirSync(ust).length, 1, 'yedek de alınmaz');
});

test('bilinmeyen argüman: çıkış 2, kullanım satırı', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  const r = kos(kok, '--simdi');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /bilinmeyen argüman/);
  assert.match(r.stderr, /kullanım/);
});

// ── Sınıflama ─────────────────────────────────────────────────────────────────────────────

test('DEPOSUZ (ZIP ile indirilmiş): rapor çıkış 1 der ve HİÇBİR ŞEY yazmaz', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Koparılacak bir bağ yok/);
  assert.match(r.stdout, /SONUÇ: Hazırlık gerekli\./);
  assert.ok(!existsSync(join(kok, '.git')), 'rapor kipi SALT-OKURDUR: git kaydı açmaz');
});

test('DEPOSUZ + --uygula: yalnız boş kayıt açılır, yedek alınmaz (kaybedilecek bir şey yok)', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 0);
  assert.ok(existsSync(join(kok, '.git')), 'git kaydı açılmalı');
  assert.match(r.stdout, /SONUÇ: Klasör hazır/);
  assert.equal(readdirSync(ust).length, 1, 'yan klasöre yedek KOPYALANMAZ (bağ yoktu)');
});

test('KENDİ deposu (KEEL olmayan uzak adres): rapor çıkış 0, dokunulmaz', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'https://github.com/batu/market-uygulamam.git');
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /SONUÇ: Hazırlık gerekmiyor\./);
});

test('KENDİ deposu + --uygula: git kaydına ve uzak adrese DOKUNULMAZ', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'https://github.com/batu/market-uygulamam.git');
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /dokunulmadı/);
  assert.match(git(kok, 'remote', '-v').stdout, /batu\/market-uygulamam/);
});

test('ad benzerliği yanlış-pozitif üretmez: başkasının "keel" adlı deposu KENDİ sayılır', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'https://github.com/ahmet/keel.git');
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 0, 'desen DARdır: eşleşme depo sahibiyle birlikte aranır');
});

// Hasım turu 2026-07-29: eşleşme alt-dizeydi, yani SAĞDAN sınırsızdı. `batuhanozgun/keel-oyun`
// hem burada yedekli bir `rm -rf`i tetikliyor hem de çekilme kapısına KALICI yanlış KIRMIZI
// bastırıyordu (Batu'nun fiilî adlandırması tam bu biçimde: keel-tatbikat-faz1 …).
for (const uzak of [
  'https://github.com/batuhanozgun/keel-oyun.git',
  'git@github.com:batuhanozgun/keel-tatbikat-faz1.git',
  'https://github.com/batuhanozgun/keelbase.git',
]) {
  test(`sağdan çapa: ${uzak.replace(/.*batuhanozgun\//, 'batuhanozgun/')} KEEL sayılmaz`, () => {
    const ust = ustKlasor();
    const kok = keelKlasoru(ust);
    depoAc(kok, uzak);
    assert.equal(kos(kok, '--rapor').status, 0);
  });
}

test('uzak adres .git son eki olmadan yazılmışsa da yakalanır', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'https://github.com/batuhanozgun/keel');
  assert.equal(kos(kok, '--rapor').status, 1);
});

// FAIL-CLOSED: "ölçemedim" ile "bağ yok" ayrı hükümlerdir. Eski hâlde `|| true` vardı ve
// bozuk bir `.git` sessizce KENDİ sayılıyordu — bağ duruyorken "hazırlık gerekmiyor".
test('git kaydı bozuksa: çıkış 2 — KENDİ sayılmaz, sessiz yeşil yok', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  rmSync(join(kok, '.git', 'HEAD'));
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ÖLÇÜLEMEDİ/);
  assert.ok(existsSync(join(kok, '.git')), 'ölçemediğimizde hiçbir şeye dokunulmaz');
});

test('büyük/küçük harfli KEEL adresi de yakalanır (GitHub adresleri harf duyarsızdır)', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'https://github.com/BatuhanOzgun/KEEL.git');
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /KEEL'in indirildiği yere bağlı/);
});

test('ssh biçimli KEEL adresi de yakalanır', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'git@github.com:batuhanozgun/keel.git');
  assert.equal(kos(kok, '--rapor').status, 1);
});

test('origin olmayan ikinci bir uzak adres de sayılır (yalnız origine bakmak yetmez)', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, 'https://github.com/batu/market-uygulamam.git');
  git(kok, 'remote', 'add', 'sablon', KEEL_URL);
  assert.equal(kos(kok, '--rapor').status, 1);
});

test('üst klasör bir depo, kendi .git yok: iç içe durum RAPORDA söylenir', () => {
  const ust = ustKlasor();
  depoAc(ust);
  const kok = keelKlasoru(ust);
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 1, 'üst deponun uzak adresine bakıp yanlış sınıflamaz');
  assert.match(r.stdout, /başka bir değişiklik geçmişinin içinde/);
});

// ── BAĞLI: asıl iş ────────────────────────────────────────────────────────────────────────

test('BAĞLI + --rapor: SALT-OKUR — ne yedek açılır ne bağ koparılır', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  const r = kos(kok, '--rapor');
  assert.equal(r.status, 1);
  assert.ok(existsSync(join(kok, '.git')), 'rapor kipi bağı koparmaz');
  assert.equal(readdirSync(ust).length, 1, 'rapor kipi yedek klasörü açmaz');
});

test('BAĞLI + --uygula: yedek alınır, bağ kopar, boş kayıt açılır', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 0, r.stdout + r.stderr);

  const yedek = join(ust, 'proje-KEEL-yedek');
  assert.ok(existsSync(yedek), 'yedek yan klasörde olmalı');
  assert.ok(existsSync(join(yedek, '.git')), 'yedek git kaydını da içermeli (geri dönüş budur)');
  assert.match(git(yedek, 'remote', '-v').stdout, /batuhanozgun\/keel/, 'yedekteki KEEL bağı DURUR');
  assert.equal(readFileSync(join(yedek, 'GENESIS.md'), 'utf8'), readFileSync(join(kok, 'GENESIS.md'), 'utf8'));

  assert.ok(existsSync(join(kok, '.git')), 'projede yeni ve boş bir kayıt olmalı');
  assert.equal(git(kok, 'remote', '-v').stdout.trim(), '', 'projede hiçbir uzak adres kalmamalı');
  assert.notEqual(git(kok, 'rev-parse', 'HEAD').status, 0, 'yeni kayıt boştur (betik commit atmaz)');
  assert.match(r.stdout, /SONUÇ: Klasör hazır/);
  assert.ok(r.stdout.includes(yedek), 'yedeğin yeri sahibe söylenir');
});

test('BAĞLI + --uygula: yedek adı doluysa -2 kullanılır, eskisinin üstüne YAZILMAZ', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  const eski = join(ust, 'proje-KEEL-yedek');
  mkdirSync(eski);
  writeFileSync(join(eski, 'onemli.txt'), 'dokunma\n');

  const r = kos(kok, '--uygula');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(readFileSync(join(eski, 'onemli.txt'), 'utf8'), 'dokunma\n', 'eski yedek bozulmaz');
  assert.ok(existsSync(join(ust, 'proje-KEEL-yedek-2')));
});

test('SIRA KİLİDİ: yedek alınamıyorsa bağ KOPARILMAZ (üst klasör yazılamıyor)', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  chmodSync(ust, 0o555);
  try {
    const r = kos(kok, '--uygula');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /DOKUNULMADI/);
    assert.ok(existsSync(join(kok, '.git')), 'yedek yoksa bağ duruyor olmalı');
    assert.match(git(kok, 'remote', '-v').stdout, /batuhanozgun\/keel/);
  } finally {
    chmodSync(ust, 0o755);
  }
});

test('BAĞLI + --uygula: `.git` DIŞINDA hiçbir şey silinmez/değişmez', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  writeFileSync(join(kok, 'LICENSE'), 'telif\n');
  depoAc(kok, KEEL_URL);
  const envanter = (d) => readdirSync(d, { recursive: true }).filter((y) => !String(y).startsWith('.git')).sort().join('|');
  const once = envanter(kok);
  assert.equal(kos(kok, '--uygula').status, 0);
  assert.equal(envanter(kok), once, 'silme kapsamı yalnız .git olmalı');
});

test('SIRA KİLİDİ: yedek DOĞRULAMASI düşerse bağ KOPARILMAZ (eksik kopya)', (t) => {
  // `cp -Rp` bazı girdileri atlayıp yine de 0 döner (ör. unix soketi) — rc'ye güvenmenin
  // yetmediği yer burası ve doğrulama bloğunun tek varlık sebebi bu. Soket yolu 104 baytı
  // aşamaz, o yüzden kısa bir kök kullanılır.
  let ust, sunucu;
  try {
    ust = mkdtempSync('/tmp/khz-');
  } catch {
    return t.skip('kısa geçici yol açılamadı');
  }
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  try {
    sunucu = createServer();
    sunucu.listen(join(kok, 's'));
  } catch {
    return t.skip('unix soketi kurulamadı');
  }
  try {
    if (!existsSync(join(kok, 's'))) return t.skip('unix soketi doğmadı');
    const r = kos(kok, '--uygula');
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /yedek eksik/);
    assert.match(r.stdout, /DOKUNULMADI/);
    assert.ok(existsSync(join(kok, '.git')), 'doğrulanmamış yedekten sonra bağ koparılamaz');
  } finally {
    sunucu.close();
  }
});

test('KOPUK HÂL: bağ koparıldıktan sonraki hata "dokunulmadı" DEMEZ, yedeğin yerini söyler', () => {
  // Hasım turu 2026-07-29 (üç mercek): `git init` patladığında `.git` silinmiş hâldeyken
  // ekranda "Klasöre DOKUNULMADI" yazıyordu. Sahibe söylenen cümle olguyla ters olamaz.
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  const sahte = mkdtempSync(join(tmpdir(), 'sahte-git-'));
  const gercekGit = spawnSync('command', ['-v', 'git'], { shell: true, encoding: 'utf8' }).stdout.trim();
  writeFileSync(
    join(sahte, 'git'),
    `#!/bin/bash\nfor a in "$@"; do [ "$a" = "init" ] && exit 1; done\nexec ${gercekGit} "$@"\n`
  );
  chmodSync(join(sahte, 'git'), 0o755);

  const r = spawnSync('bash', [BETIK, '--uygula'], {
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok, PATH: `${sahte}:${process.env.PATH}` },
  });
  assert.equal(r.status, 1);
  assert.ok(!existsSync(join(kok, '.git')), 'senaryonun ön şartı: bağ gerçekten koparılmış olmalı');
  assert.ok(!r.stdout.includes('DOKUNULMADI'), 'silinmişken "dokunulmadı" denemez');
  assert.match(r.stdout, /ESKİ değişiklik geçmişi zaten kaldırıldı/);
  assert.ok(r.stdout.includes(join(ust, 'proje-KEEL-yedek')), 'kurtarma için yedeğin yeri yazılır');
  assert.match(r.stdout, /Kurtarma:/);
});

test('SIRA KİLİDİ: dokuz yedek adı da doluysa hazırlık yapılmaz, klasör el değmemiş kalır', () => {
  const ust = ustKlasor();
  const kok = keelKlasoru(ust);
  depoAc(kok, KEEL_URL);
  mkdirSync(join(ust, 'proje-KEEL-yedek'));
  for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) mkdirSync(join(ust, `proje-KEEL-yedek-${n}`));
  const r = kos(kok, '--uygula');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /yedek için boş bir ad kalmamış/);
  assert.ok(existsSync(join(kok, '.git')));
});

// ── Ayrışma bekçileri ─────────────────────────────────────────────────────────────────────

test('KEEL adres deseni iki betikte AYNI (kurulum girişi ↔ çekilme kapısı)', () => {
  const giris = readFileSync(BETIK, 'utf8');
  const cikis = readFileSync(join(BURASI, '..', 'kurulum-denetimi.sh'), 'utf8');
  const oku = (m, ad) => {
    const e = m.match(/^KEEL_DEPO='([^']+)'$/m);
    assert.ok(e, `${ad}: KEEL_DEPO satırı bulunamadı`);
    return e[1];
  };
  assert.equal(
    oku(giris, 'klasor-hazirligi.sh'),
    oku(cikis, 'kurulum-denetimi.sh'),
    'iki desen ayrıştı: giriş bağı koparır ama çıkış kapısı başka adrese bakar (ya da tersi)'
  );
});

test('canlı yüzeyde eski kopya-işareti dosyasına hiçbir gönderme kalmadı', () => {
  // Bitti ölçütü (Faz 2 sıra 3). `docs/` tarihli KAYITTIR ve bilerek dokunulmaz (D-27 ③):
  // geçmiş bir kararın metnini değiştirmek izi bozar. Canlı yüzey ise kopuk işaretçi taşımaz.
  // Arama dizesi parçalardan kurulur: bütün hâlde yazılırsa BU DOSYA kendi aramasına takılır.
  const IZ = 'template' + '-source';
  const ara = () =>
    spawnSync('grep', ['-rln', IZ, '--exclude-dir=.git', '--exclude-dir=docs', '--exclude-dir=node_modules', '.'], {
      cwd: KOK_DEPO,
      encoding: 'utf8',
    });
  const r = ara();
  // rc 1 = "arandı, bulunamadı". rc 2 = "arama çalışamadı" — boş çıktıyı temizlik sanmak, bu
  // projenin yasakladığı sessiz yeşilin ta kendisi olurdu.
  assert.equal(r.status, 1, `arama çalışmadı (rc=${r.status}): ${r.stderr}`);
  assert.equal(r.stdout.trim(), '', `canlı yüzeyde kalan gönderme:\n${r.stdout}`);

  // Pozitif kontrol: arama gerçekten bulabiliyor mu (yoksa test hep yeşil kalır).
  const yem = join(KOK_DEPO, 'tools', 'guard', '.arama-yemi-gecici');
  writeFileSync(yem, `${IZ}\n`);
  try {
    const k = ara();
    assert.equal(k.status, 0, 'pozitif kontrol: arama var olan izi bulamadı');
    assert.match(k.stdout, /arama-yemi-gecici/);
  } finally {
    rmSync(yem, { force: true });
  }
});
