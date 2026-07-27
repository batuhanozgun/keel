// sevk.test.mjs — E1: zarf günlüğü append-aracı + SubagentStop biçim kapısı.
// Sözleşme: docs/superpowers/plans/2026-07-27-e1-durus-zarf-tasarisi.md (§2 şema · §4 kapı).
// Kapı yalnız koşu-AÇIK + beyaz-listeli dönüşlerde çalışır; hayalet (E0 §6.1) günlüğe GİRMEZ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync, chmodSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');
const EKLE = (kok) => join(kok, 'tools', 'sevk', 'zarf-ekle.sh');
const KAPI = (kok) => join(kok, 'tools', 'sevk', 'zarf-bicim-kapisi.sh');
const GUNLUK = (kok) => join(kok, '00_pano', 'zarf-gunlugu.jsonl');

function kurulum({ kosu = true, kadro = ['e1test'] } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'sevk-test-'));
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, '.claude', 'agents'), { recursive: true });
  for (const b of ['kilit.sh', 'zarf-ekle.sh', 'zarf-bicim-kapisi.sh']) {
    copyFileSync(join(KOK_REPO, 'tools', 'sevk', b), join(kok, 'tools', 'sevk', b));
    chmodSync(join(kok, 'tools', 'sevk', b), 0o755);
  }
  for (const a of kadro) writeFileSync(join(kok, '.claude', 'agents', a + '.md'), '# test ajanı\n');
  const marker = join(kok, 'tools', 'sevk', '.kosu-acik');
  if (kosu === true) writeFileSync(marker, 'KOSU-TEST\t2026-07-27T10:00:00Z\n');
  else if (kosu === 'dizin') mkdirSync(marker);
  else if (kosu === 'bos') writeFileSync(marker, '\n');
  else if (typeof kosu === 'string') writeFileSync(marker, kosu);
  writeFileSync(join(kok, '00_pano', 'PANO.md'), '# pano\n');
  return kok;
}

const kosEkle = (kok, girdi) =>
  spawnSync('bash', [EKLE(kok)], { encoding: 'utf8', input: girdi, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
const kosKapi = (kok, girdi) =>
  spawnSync('bash', [KAPI(kok)], {
    encoding: 'utf8',
    input: typeof girdi === 'string' ? girdi : JSON.stringify(girdi),
    env: { ...process.env, CLAUDE_PROJECT_DIR: kok },
  });

const gunlukSatirlari = (kok) =>
  existsSync(GUNLUK(kok))
    ? readFileSync(GUNLUK(kok), 'utf8').split('\n').filter(Boolean).map((s) => JSON.parse(s))
    : [];

const gecerli = (ek = {}) =>
  JSON.stringify({ surum: 1, ts: '2026-07-27T10:00:00Z', tip: 'bulgu', kosu: 'KOSU-TEST', ...ek });

// ---------- zarf-ekle: şema + kilit ----------

test('zarf-ekle: geçerli satır günlüğe düşer (normalize, tek satır)', () => {
  const kok = kurulum();
  const r = kosEkle(kok, gecerli({ detay: 'deneme' }));
  assert.equal(r.status, 0, r.stderr);
  const satirlar = gunlukSatirlari(kok);
  assert.equal(satirlar.length, 1);
  assert.equal(satirlar[0].tip, 'bulgu');
  assert.equal(satirlar[0].kosu, 'KOSU-TEST');
});

test('zarf-ekle: geçersiz JSON / bilinmeyen tip / yanlış sürüm / kosu eksik / çok satır → exit 1, satır düşmez', () => {
  const kok = kurulum();
  const vakalar = [
    ['bozuk{', 'gecerli JSON degil'],
    [JSON.stringify({ surum: 1, ts: '2026-07-27T10:00:00Z', tip: 'uydurma', kosu: null }), 'bilinmeyen'],
    [JSON.stringify({ surum: 2, ts: '2026-07-27T10:00:00Z', tip: 'bulgu', kosu: null }), 'surum'],
    [JSON.stringify({ surum: 1, ts: '2026-07-27T10:00:00Z', tip: 'bulgu' }), 'kosu'],
    [gecerli() + '\n' + gecerli(), 'tek satir degil'],
    [JSON.stringify({ surum: 1, ts: 'dun', tip: 'bulgu', kosu: null }), 'ts'],
  ];
  for (const [girdi, beklenen] of vakalar) {
    const r = kosEkle(kok, girdi);
    assert.equal(r.status, 1, 'exit 1 bekleniyordu: ' + girdi);
    assert.match(r.stderr, new RegExp(beklenen), 'gerekçe eksik: ' + r.stderr);
  }
  assert.equal(gunlukSatirlari(kok).length, 0, 'geçersiz girdiden satır düşmemeli');
});

test('zarf-ekle: eşzamanlı-bitiş yarışı — 20 paralel append, satır bütünlüğü tam', async () => {
  const kok = kurulum();
  const isler = [];
  for (let i = 0; i < 20; i++) {
    isler.push(
      new Promise((coz) => {
        const p = spawn('bash', [EKLE(kok)], { env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
        p.stdin.write(gecerli({ detay: 'yaris-' + i + '-' + 'x'.repeat(500) }));
        p.stdin.end();
        p.on('close', (kod) => coz(kod));
      })
    );
  }
  const kodlar = await Promise.all(isler);
  assert.deepEqual(kodlar, Array(20).fill(0), 'her append başarılı olmalı');
  const satirlar = gunlukSatirlari(kok); // JSON.parse başarısızsa burada patlar = karışmış satır
  assert.equal(satirlar.length, 20, 'yirmi satır, kayıpsız ve karışmasız');
  const gorulen = new Set(satirlar.map((s) => s.detay.split('-')[1]));
  assert.equal(gorulen.size, 20, 'her yazarın satırı ayrı ve tam');
});

// ---------- kapı: koşu şartı + beyaz liste ----------

const zarfMetni = ({ gorev = 'G-07', kanit = '00_pano/PANO.md:1', catal = 'yok', deger = 'yok', siradaki = 'kapalı', turetme = 'yok', geri = 'yok', izin = null, altlar = true } = {}) => {
  const s = [`BİTEN: ${gorev} — iş bitti · kanıt: ${kanit}`, `ÇATAL: ${catal}`];
  if (catal !== 'yok' && altlar) s.push('ÇEVİRİ: ekstrede detay görünsün mü', 'ETKİ: cevaba göre sabah ekran değişir · geri alınabilir', 'BEKLETİR: G-08 G-09');
  s.push(`DEĞERLENDİRMEDİKLERİM: ${deger}`, `SIRADAKİ: ${siradaki}`, `TÜRETME-İZİ: ${turetme}`, `GERİ-ÇEKİLEN: ${geri}`);
  if (izin) s.push(`İZİN-ENGELİ: ${izin}`);
  return s.join('\n');
};

function transkript(kok, metinler, ad = 'ajan-transkript.jsonl') {
  const yol = join(kok, ad);
  const satirlar = [{ type: 'user', message: { content: 'görev' } }];
  for (const m of metinler) {
    if (typeof m === 'object' && m.hata) {
      // araç-hata sonucu: izin desenleri YALNIZ is_error:true satırlarında aranır (T1b daraltması)
      satirlar.push({ type: 'user', message: { content: [{ type: 'tool_result', is_error: true, content: m.hata }] } });
    } else {
      satirlar.push({ type: 'assistant', message: { id: 'a', content: [{ type: 'text', text: m }] } });
    }
  }
  writeFileSync(yol, satirlar.map((s) => JSON.stringify(s)).join('\n') + '\n');
  return yol;
}

const girdi = (kok, { tip = 'e1test', zarf = zarfMetni(), sha = false, transkriptYolu = null } = {}) => ({
  session_id: 's1', agent_id: 'a1', agent_type: tip,
  agent_transcript_path: transkriptYolu || join(kok, 'olmayan-transkript.jsonl'),
  last_assistant_message: zarf, stop_hook_active: sha,
});

test('kapı: koşu-AÇIK yokken sessiz geçer, günlük doğmaz (el-sürüşlü kullanım etkilenmez)', () => {
  const kok = kurulum({ kosu: false });
  const r = kosKapi(kok, girdi(kok, { zarf: 'zarf falan yok' }));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, '');
  assert.ok(!existsSync(GUNLUK(kok)));
});

test('kapı: hayalet (agent_type boş) ve kadro-dışı tip sessiz geçer, günlüğe satır DÜŞMEZ (E0 §6.1)', () => {
  const kok = kurulum();
  for (const tip of ['', 'yabanci']) {
    const r = kosKapi(kok, girdi(kok, { tip, zarf: 'zarf yok — yine de sorulmamalı' }));
    assert.equal(r.status, 0, 'tip=' + tip + ': ' + r.stderr);
    assert.equal(r.stderr, '');
  }
  assert.ok(!existsSync(GUNLUK(kok)), 'hayalet satırı karneyi bozar — günlük boş kalmalı');
});

// ---------- kapı: zarf biçimi ----------

test('kapı: tam zarf geçer; günlüğe zarf + biçim-geçti satırları düşer', () => {
  const kok = kurulum();
  const r = kosKapi(kok, girdi(kok));
  assert.equal(r.status, 0, r.stderr);
  const s = gunlukSatirlari(kok);
  const zarf = s.find((x) => x.tip === 'zarf');
  const bicim = s.find((x) => x.tip === 'bicim');
  assert.ok(zarf && bicim, 'zarf + bicim kayıtları düşmeli');
  assert.equal(zarf.gorev, 'G-07');
  assert.equal(zarf.ajan, 'e1test');
  assert.equal(zarf.dikis, 'atlandi'); // sevk-karar yok — E4 öncesi beyanlı atlama
  assert.equal(bicim.sonuc, 'gecti');
});

test('kapı: zarf hiç yok → exit 2 + OTONOM_KOSU işaretçili gerekçe; biçim-red izi düşer', () => {
  const kok = kurulum();
  const r = kosKapi(kok, girdi(kok, { zarf: 'iş bitti, rapor: her şey yolunda' }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /donus zarfi yok/);
  assert.match(r.stderr, /OTONOM_KOSU/);
  const s = gunlukSatirlari(kok);
  assert.equal(s.filter((x) => x.tip === 'bicim' && x.sonuc === 'red').length, 1);
});

test('kapı: eksik alan adıyla geri döner (SIRADAKİ + GERİ-ÇEKİLEN çıkarıldı)', () => {
  const kok = kurulum();
  const eksikZarf = zarfMetni().split('\n').filter((l) => !l.startsWith('SIRADAKİ') && !l.startsWith('GERİ-ÇEKİLEN')).join('\n');
  const r = kosKapi(kok, girdi(kok, { zarf: eksikZarf }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /SIRADAKİ/);
  assert.match(r.stderr, /GERİ-ÇEKİLEN/);
});

test('kapı: ÇATAL dolu + alt-alan eksik → exit 2; alt-alanlar tamsa geçer', () => {
  const kok = kurulum();
  const r1 = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ catal: 'dolu — ParaPuan sorusu', altlar: false }) }));
  assert.equal(r1.status, 2);
  assert.match(r1.stderr, /ÇEVİRİ|ETKİ|BEKLETİR/);
  const r2 = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ catal: 'dolu — ParaPuan sorusu' }) }));
  assert.equal(r2.status, 0, r2.stderr);
});

test('kapı: DEĞERLENDİRMEDİKLERİM boş bırakılamaz ("yok" açık yazılır)', () => {
  const kok = kurulum();
  const r = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ deger: '' }) }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /DEĞERLENDİRMEDİKLERİM/);
});

test('kapı: kanıt yok → exit 2; kopuk vault-yolu → exit 2; var olan dosya:satır geçer', () => {
  const kok = kurulum();
  const kanitYok = zarfMetni().replace(' · kanıt: 00_pano/PANO.md:1', '');
  assert.equal(kosKapi(kok, girdi(kok, { zarf: kanitYok })).status, 2);
  const kopuk = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ kanit: '00_pano/OLMAYAN.md:3' }) }));
  assert.equal(kopuk.status, 2);
  assert.match(kopuk.stderr, /kopuk/);
  assert.equal(kosKapi(kok, girdi(kok)).status, 0);
  // T1b canlı ölçümü: ajan kanıtın sonuna ")" bulaştırdı — kuyruk noktalaması işaretçiyi koparmamalı
  const parantezli = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ kanit: '00_pano/PANO.md:1)' }) }));
  assert.equal(parantezli.status, 0, 'kuyruk noktalaması soyulmalı: ' + parantezli.stderr);
});

test('kapı: riskli görevde commit-kanıtı reddedilir, dosya:satır geçer (Hat-3 / ortak nesne deposu)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '01_kutular', 'KT-100-test'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', 'KT-100-test', 'KUTU.md'), [
    '# KUTU — test', '', '## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)',
    'G-07: onkosul=yok · risk=riskli — sentetik kişisel veri işleniyor',
    'G-08: onkosul=G-07 · risk=düşük — salt rapor', '', '## Kapılar', ''].join('\n'));
  const commitli = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ kanit: 'abc1234' }) }));
  assert.equal(commitli.status, 2);
  assert.match(commitli.stderr, /commit-kanit yasak/);
  assert.equal(kosKapi(kok, girdi(kok)).status, 0, 'riskli görevde dosya:satır kanıtı meşru');
  const dusuk = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ gorev: 'G-08', kanit: 'abc1234' }) }));
  assert.equal(dusuk.status, 0, 'düşük-risk görevde commit-kanıt biçim kapısını geçer (freni doğrulayıcıda)');
});

test('kapı: izin-engeli çift-kaynak çaprazı — izi var + beyanı yok → exit 2; beyanlıysa geçer + izin-engel kaydı', () => {
  const kok = kurulum();
  const t = transkript(kok, [{ hata: 'file-guard ENGEL: bu yol korumalı ([SERT] sınıfı: 02_kanon/kilitli/)' }, zarfMetni()]);
  const beyansiz = kosKapi(kok, girdi(kok, { transkriptYolu: t }));
  assert.equal(beyansiz.status, 2);
  assert.match(beyansiz.stderr, /İZİN-ENGELİ/);
  const beyanli = kosKapi(kok, girdi(kok, { transkriptYolu: t, zarf: zarfMetni({ izin: 'kilitli yazım engellendi' }) }));
  assert.equal(beyanli.status, 0, beyanli.stderr);
  const kayit = gunlukSatirlari(kok).find((x) => x.tip === 'izin-engel');
  assert.ok(kayit, 'izin-engel kaydı düşmeli');
  assert.ok(kayit.kaynak.includes('kanca'));
});

test('kapı: GERİ-ÇEKİLEN transkript-izi — koşu içinde ÇATAL izi + zarf yok/yok → exit 2 (dar desen)', () => {
  const kok = kurulum();
  const t = transkript(kok, ['Bu bir ÇATAL olabilir mi diye düşündüm, sahibe sormalı mıyım?', 'vazgeçtim, türetilebilir', zarfMetni()]);
  const r = kosKapi(kok, girdi(kok, { transkriptYolu: t }));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /GERİ-ÇEKİLEN|catal/i);
  const temiz = transkript(kok, ['işi yaptım, dosyayı yazdım', zarfMetni()], 'temiz.jsonl');
  assert.equal(kosKapi(kok, girdi(kok, { transkriptYolu: temiz })).status, 0, 'iz yoksa çapraz susmalı');
  // T1 canlı ölçümü: red-düzeltme döngüsünde ilk zarfın ÇATAL: etiketi ara-mesajda kalır — desen tetiklememeli
  const dongulu = transkript(kok, [zarfMetni(), zarfMetni()], 'dongulu.jsonl');
  assert.equal(kosKapi(kok, girdi(kok, { transkriptYolu: dongulu })).status, 0, 'zarf-etiket satırı çatal izi sayılmamalı');
});

test('kapı: izin desenleri yalnız araç-hatası satırlarında — koruma betiğini OKUMAK iz sayılmaz (T1b)', () => {
  const kok = kurulum();
  // ajan, kapı betiğini Read ile açmış gibi: betik metni "file-guard ENGEL" ve red-metni desenlerini içerir
  const okuma = 'betiği okudum: if (hataSatirlari.includes("file-guard ENGEL")) … Permission for this tool use was denied … requested permissions to / granted it';
  const t = transkript(kok, [okuma, zarfMetni()]);
  const r = kosKapi(kok, girdi(kok, { transkriptYolu: t }));
  assert.equal(r.status, 0, 'is_error taşımayan desen izi İZİN-ENGELİ şartı doğurmamalı: ' + r.stderr);
  assert.ok(!gunlukSatirlari(kok).find((x) => x.tip === 'izin-engel'), 'sahte kaynak kaydı düşmemeli');
});

test('kapı: bozuk gösterge fail-closed — dizin ya da boş kimlik exit 2, SHA dalında sessiz (A12)', () => {
  const dizinli = kurulum({ kosu: 'dizin' });
  const r1 = kosKapi(dizinli, girdi(dizinli));
  assert.equal(r1.status, 2);
  assert.match(r1.stderr, /dosya değil/);
  const bos = kurulum({ kosu: 'bos' });
  const r2 = kosKapi(bos, girdi(bos));
  assert.equal(r2.status, 2);
  assert.match(r2.stderr, /koşu kimliği yok|boş/);
  const r3 = kosKapi(bos, girdi(bos, { sha: true }));
  assert.equal(r3.status, 0, 'döngü emniyeti bozuk-marker dalında da tutmalı');
});

test('kapı: risk taraması koşunun kutusuna hedefli — komşu kutunun riskli G-07si yanlış red üretmez (A7)', () => {
  const kok = kurulum({ kosu: 'KOSU-TEST\tKT-901-aktif\t2026-07-27T10:00:00Z\n' });
  mkdirSync(join(kok, '01_kutular', 'KT-100-eski'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', 'KT-100-eski', 'KUTU.md'),
    '# eski\n\n## Bağımlılık ve risk\nG-07: onkosul=yok · risk=riskli — eski kutunun sır işi\n');
  mkdirSync(join(kok, '01_kutular', 'KT-901-aktif'), { recursive: true });
  writeFileSync(join(kok, '01_kutular', 'KT-901-aktif', 'KUTU.md'),
    '# aktif\n\n## Bağımlılık ve risk\nG-07: onkosul=yok · risk=düşük — salt rapor\n');
  const r = kosKapi(kok, girdi(kok, { zarf: zarfMetni({ kanit: 'abc1234' }) }));
  assert.equal(r.status, 0, 'aktif kutuda düşük-risk: komşunun riskli G-07si karışmamalı — ' + r.stderr);
  // kutu alanı YOKKEN aynı yerleşim kaba taramaya düşer: komşunun riskli satırı reddeder + iz bırakır
  const kaba = kurulum();
  mkdirSync(join(kaba, '01_kutular', 'KT-100-eski'), { recursive: true });
  writeFileSync(join(kaba, '01_kutular', 'KT-100-eski', 'KUTU.md'),
    '# eski\n\n## Bağımlılık ve risk\nG-07: onkosul=yok · risk=riskli — eski kutunun sır işi\n');
  mkdirSync(join(kaba, '01_kutular', 'KT-901-aktif'), { recursive: true });
  writeFileSync(join(kaba, '01_kutular', 'KT-901-aktif', 'KUTU.md'), '# aktif\n');
  const r2 = kosKapi(kaba, girdi(kaba, { zarf: zarfMetni({ kanit: 'abc1234' }) }));
  assert.equal(r2.status, 2, 'kutusuz gösterge = kaba tarama, riskli bulur');
  assert.ok(gunlukSatirlari(kaba).find((x) => x.tip === 'bulgu' && x.cins === 'risk-kaba-tarama'), 'kabalık izli olmalı');
});

test('kapı: izin-engeli settings-ask deseni — boş-dizi bastırması düzeltildi (A8/A10)', () => {
  const kok = kurulum();
  const t = join(kok, 'sa.jsonl');
  writeFileSync(t, [
    JSON.stringify({ type: 'user', message: { content: 'görev' } }),
    '{"type":"system","permission_denials":[]}',
    '{"type":"system","permission_denials":[{"tool":"Write","yol":"x"}]}',
    JSON.stringify({ type: 'assistant', message: { id: 'a', content: [{ type: 'text', text: zarfMetni() }] } }),
  ].join('\n') + '\n');
  const beyansiz = kosKapi(kok, girdi(kok, { transkriptYolu: t }));
  assert.equal(beyansiz.status, 2, 'boş-dizi satırı dolu-dizi tespitini örtmemeli');
  const beyanli = kosKapi(kok, girdi(kok, { transkriptYolu: t, zarf: zarfMetni({ izin: 'Write reddedildi' }) }));
  assert.equal(beyanli.status, 0, beyanli.stderr);
  assert.ok(gunlukSatirlari(kok).find((x) => x.tip === 'izin-engel' && x.kaynak.includes('settings-ask')));
});

test('kapı: izin-engeli zemin-red deseni — T1a canlı ölçümünün gerçek baytları', () => {
  const kok = kurulum();
  // birebir T1a ajan-transkriptinden (2026-07-27): başsız kipte izin-zemini reddinin tek izi bu metin
  const t = transkript(kok, [{ hata: 'Claude requested permissions to write to /x/00_pano/rapor-g08.md, but you haven’t granted it yet.' }, zarfMetni()]);
  const beyansiz = kosKapi(kok, girdi(kok, { transkriptYolu: t }));
  assert.equal(beyansiz.status, 2, 'zemin-red izi + beyansız zarf geri dönmeli');
  const r = kosKapi(kok, girdi(kok, { transkriptYolu: t, zarf: zarfMetni({ izin: 'Write izni verilmedi' }) }));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(gunlukSatirlari(kok).find((x) => x.tip === 'izin-engel' && x.kaynak.includes('zemin-red')));
});

test('kapı: izin-engeli red-metni deseni sınanır (A10)', () => {
  const kok = kurulum();
  const t = transkript(kok, [{ hata: 'Permission for this tool use was denied.' }, zarfMetni({ izin: 'yazım reddedildi' })]);
  const beyansiz = kosKapi(kok, girdi(kok, { transkriptYolu: t }));
  assert.equal(beyansiz.status, 2, 'red-metni izi + beyansız zarf geri dönmeli');
  const r = kosKapi(kok, girdi(kok, { transkriptYolu: t, zarf: zarfMetni({ izin: 'yazım reddedildi' }) }));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(gunlukSatirlari(kok).find((x) => x.tip === 'izin-engel' && x.kaynak.includes('red-metni')));
});

test('kapı: transkript-yedeği hattı — last_assistant_message yokken zarf transkriptten okunur (A9)', () => {
  const kok = kurulum();
  const t = transkript(kok, ['işi yaptım', zarfMetni()]);
  const g = girdi(kok, { transkriptYolu: t });
  delete g.last_assistant_message;
  const r = kosKapi(kok, g);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(gunlukSatirlari(kok).find((x) => x.tip === 'zarf' && x.gorev === 'G-07'), 'zarf yedek hattan okunmalı');
});

test('zarf-ekle: bayat kilit — pidsiz ESKİ kilit kırılır, pidsiz TAZE kilit fail-closed bekler (A11)', () => {
  const kok = kurulum();
  const kilit = join(kok, '00_pano', 'zarf-gunlugu.jsonl.kilit');
  mkdirSync(kilit);
  spawnSync('touch', ['-t', '202601010000', kilit]); // mtime geçmişe: bayat
  const r1 = kosEkle(kok, gecerli({ detay: 'bayat-sonrasi' }));
  assert.equal(r1.status, 0, 'bayat pidsiz kilit yaşla kırılmalı: ' + r1.stderr);
  assert.equal(gunlukSatirlari(kok).length, 1);
  mkdirSync(kilit); // taze pidsiz kilit
  const r2 = kosEkle(kok, gecerli({ detay: 'taze-kilit' }));
  assert.equal(r2.status, 1, 'taze pidsiz kilit kırılmamalı (fail-closed)');
  assert.match(r2.stderr, /kilit alinamadi/);
});

test('kapı: stop_hook_active — bir daha engellemez; zarf yoksa tur-tavanı şüphesi + kirmizi-devam izi', () => {
  const kok = kurulum();
  const r = kosKapi(kok, girdi(kok, { zarf: 'yarım kaldı', sha: true }));
  assert.equal(r.status, 0, r.stderr);
  const s = gunlukSatirlari(kok);
  assert.ok(s.find((x) => x.tip === 'bulgu' && x.cins === 'tur-tavani-suphesi'));
  assert.ok(s.find((x) => x.tip === 'bicim' && x.sonuc === 'kirmizi-devam'));
});

test('kapı: talimat↔fiil dikişi — sevk-karar varken yabancı görev sapma izi düşürür (engellemez; duran kapı E4)', () => {
  const kok = kurulum();
  const ekle = kosEkle(kok, gecerli({ tip: 'sevk-karar', gorev: 'G-99', rol: 'e1test' }));
  assert.equal(ekle.status, 0, ekle.stderr);
  const r = kosKapi(kok, girdi(kok)); // zarf G-07, sevk yalnız G-99 açtı
  assert.equal(r.status, 0, r.stderr);
  const s = gunlukSatirlari(kok);
  assert.ok(s.find((x) => x.tip === 'bulgu' && x.cins === 'dikis-sapma'));
  assert.equal(s.find((x) => x.tip === 'zarf').dikis, 'sapma');
});

// ---------- kablo (şablon gerçeği) ----------

test('kablo: settings.json SubagentStop girdisi + korunan-yollar tools/sevk [SERT] + OTONOM_KOSU [SORULUR] + .gitignore .kosu-acik', () => {
  const ayar = JSON.parse(readFileSync(join(KOK_REPO, '.claude', 'settings.json'), 'utf8'));
  // Zayıf dosya-adı regex'i yetmez (hasım A13): komutun TAM yolu + type:command doğrulanır —
  // yanlış dizine bağlanmış aynı-adlı komut şablondan her kuruluma kopyalanırdı.
  const girdiler = (ayar.hooks.SubagentStop || []).flatMap((b) => b.hooks || []);
  assert.ok(
    girdiler.some((h) => h.type === 'command' && h.command === 'bash "$CLAUDE_PROJECT_DIR/tools/sevk/zarf-bicim-kapisi.sh"'),
    'SubagentStop kancası tam yoluyla (tools/sevk/) bağlı olmalı'
  );
  // Bölüm ayrıştırması file-guard'ın kendi kuralıyla: yorum satırları atlanır, başlık TAM satırdır
  // ("[SORULUR]" kelimesi dosyanın açıklama yorumunda da geçer — düz split oraya takılır).
  const bolumler = { '': [] };
  let bolum = '';
  for (const ham of readFileSync(join(KOK_REPO, 'tools', 'guard', 'korunan-yollar.txt'), 'utf8').split('\n')) {
    const satir = ham.trimEnd();
    if (!satir || satir.trimStart().startsWith('#')) continue;
    if (satir === '[SERT]' || satir === '[SORULUR]') { bolum = satir; bolumler[bolum] = []; continue; }
    bolumler[bolum].push(satir);
  }
  assert.ok(bolumler['[SERT]'].includes('tools/sevk/'), 'tools/sevk/ [SERT] olmalı');
  assert.ok(bolumler['[SORULUR]'].includes('02_kanon/OTONOM_KOSU.md'), 'OTONOM_KOSU [SORULUR] olmalı');
  assert.ok(bolumler['[SERT]'].includes('00_pano/zarf-gunlugu.jsonl'), 'zarf günlüğü [SERT] olmalı (A4)');
  assert.match(readFileSync(join(KOK_REPO, '.gitignore'), 'utf8'), /tools\/sevk\/\.kosu-acik/);
  assert.ok(existsSync(join(KOK_REPO, 'tools', 'sevk', 'damgalar', 'T0')), 'T0 damgası düşmüş olmalı');
});

// ---------- file-guard E1 dikişleri (koşu-dikişi + kurulum çekirdeği + günlük [SERT]) ----------

const GUARD = join(KOK_REPO, 'tools', 'guard', 'file-guard.sh');

function guardKurulum({ kurulumTamam = true } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'sevk-guard-test-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  mkdirSync(join(kok, '00_pano'), { recursive: true });
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'korunan-yollar.txt'), join(kok, 'tools', 'guard', 'korunan-yollar.txt'));
  // E2 Hat-1: içerik süzgeci kurulu dokuda file-guard'ın ön şartıdır (yokluğu fail-closed engel).
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'icerik-suzgeci.sh'), join(kok, 'tools', 'guard', 'icerik-suzgeci.sh'));
  copyFileSync(join(KOK_REPO, 'tools', 'guard', 'gercek-veri-isaretleri.txt'), join(kok, 'tools', 'guard', 'gercek-veri-isaretleri.txt'));
  if (kurulumTamam) writeFileSync(join(kok, '.kurulum-tamam'), 'kuruldu\n');
  return kok;
}
const kosGuard = (kok, girdi) =>
  spawnSync('bash', [GUARD], { encoding: 'utf8', input: JSON.stringify(girdi), env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });

test('file-guard koşu-dikişi: .kosu-acik dokunan Bash komutu sahibe SORULUR (A3)', () => {
  const kok = guardKurulum();
  const r = kosGuard(kok, { tool_name: 'Bash', tool_input: { command: 'rm -f tools/sevk/.kosu-acik' } });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /"permissionDecision":"ask"/, 'SOR beklenirdi: ' + r.stdout + r.stderr);
  assert.match(r.stdout, /kosu-acik/);
});

test('file-guard kurulum çekirdeği: kurulum sürerken tools/sevk yazımı ENGEL (A5); günlük [SERT] (A4)', () => {
  const suruyor = guardKurulum({ kurulumTamam: false });
  const r1 = kosGuard(suruyor, { tool_name: 'Write', tool_input: { file_path: join(suruyor, 'tools', 'sevk', 'damgalar', 'T2'), content: 'sahte damga' } });
  assert.equal(r1.status, 2, 'kurulum penceresinde sahte damga yazılamamalı: ' + r1.stderr);
  const tamam = guardKurulum();
  const r2 = kosGuard(tamam, { tool_name: 'Write', tool_input: { file_path: join(tamam, '00_pano', 'zarf-gunlugu.jsonl'), content: '{"surum":1}' } });
  assert.equal(r2.status, 2, 'günlüğe araç-katmanı yazımı kesilmeli: ' + r2.stderr);
  const r3 = kosGuard(tamam, { tool_name: 'Write', tool_input: { file_path: join(tamam, '00_pano', 'PANO.md'), content: 'x' } });
  assert.equal(r3.status, 0, 'komşu 00_pano dosyaları serbest kalmalı');
});
