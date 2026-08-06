// Kategori `şema` (21 tablo satırı): kök kümeleri · GENESIS artığı · pano/kutu/rol şeması ·
// sahip kuyruğu · kapanış bloğu · porcelain · zarf günlüğü · duruş/risk · dış göz brifingi ·
// kanal · watchdog · ölçüt-diff · kapanış-dışı EL_KITABI · EL_KITABI bütünlüğü · arşiv gözleri ·
// boş-backlog · kadran tanıkları.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, appendFileSync, rmSync, mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { kurulum, kos, temizle, commitEt, EK_TAM, KUTU_METNI } from './yardimci.mjs';

test('kök zorunlu küme: eksik dizin → DURDURAN (whitelist eksiği görmezdi — §5③)', () => {
  const kok = kurulum();
  rmSync(join(kok, '02_kanon'), { recursive: true });
  const r = kos(kok);
  assert.ok(/DURDURAN \[şema\] kok-zorunlu: kök zorunlu dizin yok: 02_kanon\//.test(r.stdout), r.stdout);
  assert.equal(r.rc, 1);
  temizle(kok);
});

test('kök izinli küme: şema-dışı girdi → UYARI; ayar eki izinli sayılır', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'basibos.txt'), 'x\n');
  mkdirSync(join(kok, '.obsidian'), { recursive: true }); // conf kok_izinli_ek'te
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] kok-izinli: şema-dışı kök girdisi: basibos\.txt/.test(r.stdout), r.stdout);
  assert.ok(!/kok-izinli: şema-dışı kök girdisi: \.obsidian/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('GENESIS.md kökte: işletimde UYARI; kurulum penceresinde denetlenmez', () => {
  const kok = kurulum();
  writeFileSync(join(kok, 'GENESIS.md'), '# genesis artığı\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] genesis-artigi: GENESIS\.md kökte/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum({ kurulumTamam: false });
  writeFileSync(join(kok2, 'GENESIS.md'), '# genesis\n');
  const r2 = kos(kok2);
  assert.ok(!/genesis-artigi/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('ayar GENESIS.md izinli kümeye alamaz — reddedilir ve UYARI basılır (§0)', () => {
  const kok = kurulum({ conf: { kok_izinli_ek: '.DS_Store GENESIS.md' } });
  writeFileSync(join(kok, 'GENESIS.md'), '# genesis\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] ayar: GENESIS\.md izinli kümeye alınamaz/.test(r.stdout), r.stdout);
  assert.ok(/genesis-artigi/.test(r.stdout), 'whitelist reddedildiği için göz yine basar: ' + r.stdout);
  temizle(kok);
});

test('00_pano şeması: beklenmeyen girdi → UYARI; meşru altı dosya + ayar eki serbest', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '00_pano', 'yabanci.md'), 'x\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] pano-semasi: 00_pano içinde beklenmeyen girdi: yabanci\.md/.test(r.stdout), r.stdout);
  assert.ok(!/beklenmeyen girdi: zarf-gunlugu\.jsonl/.test(r.stdout), 'zarf günlüğü meşru makine dosyasıdır');
  temizle(kok);
});

test('kutu adlandırma: KT- öneksiz dizin ve serbest dosya → UYARI; _arsiv muaf', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '01_kutular', 'XX-yanlis'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', 'serbest.md'), 'x\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] kutu-adlandirma: kutu dizini KT- önekiyle başlamıyor: XX-yanlis/.test(r.stdout), r.stdout);
  assert.ok(/UYARI \[şema\] kutu-adlandirma: 01_kutular altında serbest dosya: serbest\.md/.test(r.stdout), r.stdout);
  assert.ok(!/kutu-adlandirma: .*_arsiv/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('rol evi: ROL.md/DURUM.md eksik ya da biçimsiz → UYARI', () => {
  const kok = kurulum();
  rmSync(join(kok, '03_roller', 'koordinator', 'ROL.md'));
  writeFileSync(join(kok, '03_roller', 'disgoz', 'DURUM.md'), '# YANLIŞ BAŞLIK\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] rol-evi: koordinator\/ROL\.md \(sözleşme\) yok/.test(r.stdout), r.stdout);
  assert.ok(/UYARI \[şema\] rol-evi: disgoz\/DURUM\.md ilk başlık/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('kadran tanıkları: ayar ile EL_KITABI ayrışırsa DURDURAN (tek tanık, tanık değildir)', () => {
  const kok = kurulum({ conf: { kadran: 'kucuk' } }); // EL_KITABI TAM kalır → çelişki
  const r = kos(kok);
  assert.ok(/DURDURAN \[şema\] kadran-taniklari: kadran tanıkları ayrışıyor: ayar=kucuk · EL_KITABI=tam/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 1);
  temizle(kok);

  const kok2 = kurulum({ kadran: 'kucuk' }); // ikisi birlikte kucuk → uyum
  const r2 = kos(kok2);
  assert.ok(!/kadran-taniklari/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('EL_KITABI bütünlüğü: zorunlu başlık/kural eksik → DURDURAN (tek ev: el-kitabi-zorunlu.txt)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), EK_TAM.replace('## Mühür ritüeli\n', ''));
  const r = kos(kok);
  assert.ok(/DURDURAN \[şema\] el-kitabi-butunlugu: EL_KITABI zorunlu başlık eksik: ## Mühür ritüeli/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum();
  writeFileSync(join(kok2, '02_kanon', 'EL_KITABI.md'), EK_TAM.replace('yorumla onay üretme yasak', 'onay konusu serbest'));
  const r2 = kos(kok2);
  assert.ok(/DURDURAN \[şema\] el-kitabi-butunlugu: EL_KITABI zorunlu kural eksik: yorumla onay üretme/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('sahip kuyruğu şeması: tarih/ayraçsız madde → UYARI satır numarasıyla', () => {
  const kok = kurulum();
  appendFileSync(join(kok, '00_pano', 'SENDE_BEKLEYEN.md'), '- [ ] tarihsiz madde\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] sahip-kuyrugu: kuyruk şeması bozuk: satır 4/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum();
  writeFileSync(join(kok2, '00_pano', 'SENDE_BEKLEYEN.md'), '# YANLIŞ BAŞLIK\n- [ ] 2026-08-01 · a · b\n');
  const r2 = kos(kok2);
  assert.ok(/kuyruk şeması bozuk: ilk başlık/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('kapanış bloğu: KAPANIS_BLOK != var → UYARI; var ya da değişken yok → denetlenmez', () => {
  const kok = kurulum();
  const r = kos(kok, { KAPANIS_BLOK: 'yok' });
  assert.ok(/UYARI \[şema\] kapanis-blogu: kapanışta SENDE BEKLEYEN satırı yok\/biçimsiz \(yok\) — D2 ihlali/.test(r.stdout), r.stdout);
  const r2 = kos(kok, { KAPANIS_BLOK: 'var' });
  assert.ok(!/kapanis-blogu/.test(r2.stdout), r2.stdout);
  const r3 = kos(kok);
  assert.ok(!/kapanis-blogu/.test(r3.stdout), 'değişken yokken dırdır yok: ' + r3.stdout);
  temizle(kok);
});

test('porcelain dikişi: KAPANIS_PORCELAIN=fark → UYARI; es → sessiz', () => {
  const kok = kurulum();
  const r = kos(kok, { KAPANIS_PORCELAIN: 'fark' });
  assert.ok(/UYARI \[şema\] porcelain-dikisi: yazamaz koltuk kafes dışına kabukla yazdı/.test(r.stdout), r.stdout);
  const r2 = kos(kok, { KAPANIS_PORCELAIN: 'es' });
  assert.ok(!/porcelain-dikisi/.test(r2.stdout), r2.stdout);
  temizle(kok);
});

test('zarf günlüğü bütünlüğü: bozuk/alan-eksik satır → DURDURAN (otonom kapıların tek veri katmanı)', () => {
  const kok = kurulum();
  appendFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'), '{"yarim\n');
  const r = kos(kok);
  assert.ok(/DURDURAN \[şema\] zarf-gunlugu: zarf günlüğü bozuk: satır 3/.test(r.stdout), r.stdout);
  assert.equal(r.rc, 1);
  temizle(kok);

  const kok2 = kurulum();
  appendFileSync(join(kok2, '00_pano', 'zarf-gunlugu.jsonl'), '{"surum":1,"ts":"2026-08-01T11:00:00Z"}\n'); // tip alanı yok
  const r2 = kos(kok2);
  assert.ok(/zarf günlüğü bozuk: satır 3/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('duruş/risk blokları: MEVCUTSA biçimli olmalı; yokluk denetlenmez (BEKCI_TARIFI md.19/2)', () => {
  const kok = kurulum();
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8')
    .replace('KANIT:      node --test çıktısı temiz\n', '')
    .replace('G-01: onkosul=yok · risk=düşük — süreç işi; geri dönüşü dosya silmektir', 'G-01 riskli iş serbest metin'));
  const r = kos(kok);
  assert.ok(/duruş\/risk bloğu biçimsiz: .*'KANIT:' satırı yok\/boş/.test(r.stdout), r.stdout);
  assert.ok(/duruş\/risk bloğu biçimsiz: .*satır \d+/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum();
  const metin2 = readFileSync(join(kok2, '01_kutular', 'KT-001-proje-plani', 'KUTU.md'), 'utf8');
  writeFileSync(join(kok2, '01_kutular', 'KT-001-proje-plani', 'KUTU.md'),
    metin2.split('## Duruş sözleşmesi')[0]); // iki blok da yok → denetlenmez
  const r2 = kos(kok2);
  assert.ok(!/durus-ve-risk/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('LİSTE satırı: değeri birebir "dönem içinde doğar" değilse UYARI (planlama kutusu işareti)', () => {
  const kok = kurulum();
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8')
    .replace('BÜTÇE:      dönem başına 5 üretim çağrısı', 'BÜTÇE:      dönem başına 5 üretim çağrısı\nLİSTE:      sonra bakarız'));
  const r = kos(kok);
  assert.ok(/LİSTE değeri birebir 'dönem içinde doğar' değil/.test(r.stdout), r.stdout);
  temizle(kok);
});

test('dış göz brifingi: açık görev varken göz susar; kapanışa gelmiş kutuda bayat brifing → KİLİT', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.ok(!/dis-goz-brifingi/.test(r.stdout), 'açık görev varken susar: ' + r.stdout);

  // kutuyu kapanışa getir (görevler kapalı) — brifing taban'dan beri dokunulmamış → KİLİT
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8').replaceAll('| açık |', '| kapalı |'));
  commitEt(kok, 'gorevler kapandi');
  const r2 = kos(kok);
  assert.ok(/KİLİT \[şema\] dis-goz-brifingi: dış göz brifingi bayat\/yok — kutu kapanışı kilitli \(D7 dördüncüsü\)/.test(r2.stdout), r2.stdout);
  assert.equal(r2.alanlar.kilit >= 1, true);
  assert.equal(r2.rc, 0, 'kapanış kilidi duran kapı değildir');

  // brifing şu an commit-dışı tazelenmiş → taze sayılır (F8 commit'i kapanışta zaten ister)
  appendFileSync(join(kok, '03_roller', 'disgoz', 'BRIFING.md'), 'Tarih: 2026-08-06 — tazelendi\n');
  const r3 = kos(kok);
  assert.ok(!/dis-goz-brifingi.*bayat/.test(r3.stdout), r3.stdout);
  temizle(kok);
});

test('dış göz brifingi — evre çapası: dönem açıkken yalnız kapanis evresinde ölçer (tasarı düzeltmesi)', () => {
  const kok = kurulum();
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8').replaceAll('| açık |', '| kapalı |'));
  commitEt(kok, 'gorevler kapandi');

  // yapim evresi: görevler kapalı olsa da göz ölçmez (her gidiş-dönüşte yeniden kilitleme arızası)
  writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), 'd1\tKT-001-proje-plani\tyapim\tnormal\n2026-08-06T10:00:00Z\n');
  const r = kos(kok);
  assert.ok(/BİLGİ \[şema\] dis-goz-brifingi: evre yapim/.test(r.stdout), r.stdout);
  assert.equal(r.alanlar.kilit, 0, r.stdout);

  // kapanis evresi + bu döneme ait brifing zarf kaydı → taze
  writeFileSync(join(kok, 'tools', 'sevk', '.donem-acik'), 'd1\tKT-001-proje-plani\tkapanis\tnormal\n2026-08-06T10:00:00Z\n');
  appendFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'),
    '{"surum":1,"ts":"2026-08-06T10:30:00Z","tip":"brifing","donem":"d1","yol":"03_roller/disgoz/BRIFING.md"}\n');
  const r2 = kos(kok);
  assert.equal(r2.alanlar.kilit, 0, r2.stdout);

  // kapanis evresi + kayıt başka döneme ait → bayat → KİLİT
  const gunluk = readFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'), 'utf8');
  writeFileSync(join(kok, '00_pano', 'zarf-gunlugu.jsonl'), gunluk.replace('"donem":"d1","yol"', '"donem":"d0","yol"'));
  const r3 = kos(kok);
  assert.ok(r3.alanlar.kilit >= 1, r3.stdout);
  temizle(kok);
});

test('kanal: conf yokken denetlenmez; varsa --sig yoklaması HAZIR demeli', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.ok(!/\[şema\] kanal:/.test(r.stdout), r.stdout);

  writeFileSync(join(kok, 'tools', 'sevk', 'kanal.conf'), 'SMTP_SUNUCU=x\nHESAP=y\nALICI=z\n');
  writeFileSync(join(kok, 'tools', 'sevk', 'kanal-yokla.sh'), '#!/bin/bash\nprintf \'HAZIR DEĞİL · Keychain kaydı yok\\n\'\nexit 1\n');
  chmodSync(join(kok, 'tools', 'sevk', 'kanal-yokla.sh'), 0o755);
  const r2 = kos(kok);
  assert.ok(/UYARI \[şema\] kanal: haber kanalı yapılandırılmış ama hazır değil: HAZIR DEĞİL · Keychain kaydı yok/.test(r2.stdout), r2.stdout);

  writeFileSync(join(kok, 'tools', 'sevk', 'kanal-yokla.sh'), '#!/bin/bash\nprintf \'HAZIR\\n\'\nexit 0\n');
  const r3 = kos(kok);
  assert.ok(!/\[şema\] kanal:/.test(r3.stdout), r3.stdout);
  temizle(kok);
});

test('watchdog: işaret yokken denetlenmez; işaret var + iş yüklü değil → DURDURAN (kâğıt koruma)', () => {
  const kok = kurulum();
  const r = kos(kok);
  assert.ok(!/watchdog/.test(r.stdout), r.stdout);

  writeFileSync(join(kok, 'tools', 'sevk', 'watchdog-kurulu'),
    'etiket=dev.keel.nabiz.bekci-cekirdek-test-olmayan-is\nplist=/tmp/yok.plist\naralik_sn=300\n');
  const r2 = kos(kok);
  // launchctl olan makinede sahte etiket "iş yüklü değil" DURDURAN'dır; launchctl yoksa
  // ölçülemeyen göz ADIYLA ilan edilir (sözleşme §7) — iki meşru hâl, ikisi de sessiz değil.
  const durduran = /DURDURAN \[şema\] watchdog: watchdog işareti var ama iş yüklü değil/.test(r2.stdout);
  const ilan = /BİLGİ \[şema\] watchdog: launchctl yok/.test(r2.stdout);
  assert.ok(durduran || ilan, r2.stdout);
  temizle(kok);
});

test('ölçüt-diff (TAM): Kabul kriterleri taban ref\'ten sapmışsa UYARI', () => {
  const kok = kurulum();
  const kutuYolu = join(kok, '01_kutular', 'KT-001-proje-plani', 'KUTU.md');
  writeFileSync(kutuYolu, readFileSync(kutuYolu, 'utf8')
    .replace('- ölçüt 1: dört çıktı dosyası açılıp sahibe okunur', '- ölçüt 1: tek dosya yeter (gevşetildi)'));
  commitEt(kok, 'olcut oynandi');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] olcut-diff: kabul ölçütü açılıştan beri değişmiş: 01_kutular\/KT-001-proje-plani\/KUTU\.md/.test(r.stdout), r.stdout);
  temizle(kok);

  const kok2 = kurulum();
  const r2 = kos(kok2);
  assert.ok(!/olcut-diff/.test(r2.stdout), r2.stdout);
  temizle(kok2);
});

test('kapanış-dışı EL_KITABI (TAM): commit-dışı değişim → DURDURAN; retro-dışı commit → DURDURAN', () => {
  const kok = kurulum();
  appendFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), 'kaçak satır\n');
  const r = kos(kok);
  assert.ok(/DURDURAN \[şema\] kapanis-disi-el-kitabi: EL_KITABI commit-dışı değişmiş \(F6/.test(r.stdout), r.stdout);

  commitEt(kok, 'duzenleme: kacak satir'); // retro/genesis içermeyen konu
  const r2 = kos(kok);
  assert.ok(/DURDURAN \[şema\] kapanis-disi-el-kitabi: EL_KITABI son değişikliği retro-commit'i değil/.test(r2.stdout), r2.stdout);

  appendFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), 'retro satırı\n');
  commitEt(kok, 'retro: F6 hattindan kural evrimi');
  const r3 = kos(kok);
  assert.ok(!/kapanis-disi-el-kitabi/.test(r3.stdout), r3.stdout);
  temizle(kok);
});

test('arşiv gözleri (TAM): açık görev + boş/eksik retro → UYARI; dolu retro + kapalı → sessiz', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '01_kutular', '_arsiv', 'KT-000-eski'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', '_arsiv', 'KT-000-eski', 'KUTU.md'),
    '# KUTU — eski\n## Görevler\n| Görev | İş | Sahip | Durum | Kanıt |\n|---|---|---|---|---|\n'
    + '| G-01 | iş | koordinator | açık | test: x |\n## Retro\n');
  const r = kos(kok);
  assert.ok(/UYARI \[şema\] arsiv-kutulari: arşive giden kutuda açık görev: 01_kutular\/_arsiv\/KT-000-eski\/KUTU\.md G-01/.test(r.stdout), r.stdout);
  assert.ok(/UYARI \[şema\] arsiv-kutulari: arşivde retro bloğu boş/.test(r.stdout), r.stdout);

  writeFileSync(join(kok, '01_kutular', '_arsiv', 'KT-000-eski', 'KUTU.md'),
    '# KUTU — eski\n## Görevler\n| Görev | İş | Sahip | Durum | Kanıt |\n|---|---|---|---|---|\n'
    + '| G-01 | iş | koordinator | kapalı | test: x |\n## Retro\n- ders: tavan kalibrasyonu ölçüldü\n');
  const r2 = kos(kok);
  assert.ok(!/arsiv-kutulari/.test(r2.stdout), r2.stdout);
  temizle(kok);
});

test('KÜÇÜK kadran: TAM gözleri hiç koşmaz ve kapalı oldukları İLAN edilir', () => {
  const kok = kurulum({ kadran: 'kucuk' });
  mkdirSync(join(kok, '01_kutular', '_arsiv', 'KT-000-eski'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', '_arsiv', 'KT-000-eski', 'KUTU.md'),
    '# KUTU — eski\n## Görevler\n| Görev | İş | Sahip | Durum | Kanıt |\n|---|---|---|---|---|\n'
    + '| G-01 | iş | koordinator | açık | test: x |\n');
  const r = kos(kok);
  assert.equal(r.alanlar.kadran, 'kucuk');
  assert.ok(!/arsiv-kutulari/.test(r.stdout), 'TAM gözü KÜÇÜK kadranda koşmaz: ' + r.stdout);
  assert.ok(/BİLGİ \[şema\] kadran: TAM gözleri .* bu kadranda kapalı/.test(r.stdout), 'kapsam dışılık ilan edilir: ' + r.stdout);
  temizle(kok);
});

test('boş-backlog durağı: aktif kutu yoksa BİLGİ + AKIŞ=VERİ-YOK + pano durak satırı (D9)', () => {
  // AKIŞ değeri sözlük İÇİNDEN (hasım #6): BEKLEME kokpitte 'tanınmayan ışık' uyarısı üretiyordu
  // ve o alarm tipo yakalamak için var — kasıtlı sözlük-dışı değer alarmı normalleştirir.
  const kok = kurulum();
  rmSync(join(kok, '01_kutular', 'KT-001-proje-plani'), { recursive: true });
  const r = kos(kok);
  assert.ok(/BİLGİ \[şema\] bos-backlog: aktif kutu yok — insan girdisi bekleniyor \(D9\)/.test(r.stdout), r.stdout);
  const saglik = readFileSync(join(kok, '00_pano', 'SAGLIK.md'), 'utf8');
  assert.ok(saglik.includes('AKIŞ=VERİ-YOK'), saglik);
  assert.ok(!saglik.includes('BEKLEME'), 'sözlük dışı değer geri dönmemeli: ' + saglik);
  const pano = readFileSync(join(kok, '00_pano', 'PANO.md'), 'utf8');
  assert.ok(pano.includes('Durak: insan girdisi bekleniyor (D9)'), pano);
  assert.ok(pano.includes('Görevler: —'), pano);
  temizle(kok);
});
