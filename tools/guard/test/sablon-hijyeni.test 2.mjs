// sablon-hijyeni.test.mjs — şablonun çalışma ağacı temiz mi (K7 / U22, 2026-08-07).
//
// DOĞUŞ: şablon deposunun çalışma ağacında `tools/sevk/kanal.conf` on gün durdu ve o dosya
// SAHİBİN E-POSTA ADRESİNİ taşır. Yanında iki dönem durumu daha vardı (`.haber-durum`
// içinde `TEST-SIZMA-103643 / alarm:kirmizi`, `.nabiz-son`). Üçü de `.gitignore`'daydı, yani
// git onları GÖREMEZ: `git status` tertemizdi, `git log --all` boştu. Kusuru gören tek göz
// ürünün DIŞINDAydı. Bu dosya, kapının ölü olmadığının kanıtıdır.
//
// İKİ KATMAN: (1) fixture'lar — kapının her dalı ayrı ayrı kırmızıya döner; (2) GERÇEK depo
// kökü — bu ağacın bugün temiz olduğunu ölçer. (2) olmadan kapı "doğru çalışıyor ama kimse
// koşturmuyor" olurdu; (1) olmadan kapı sınanmamış olurdu.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const BETIK = join(BURASI, '..', 'sablon-hijyeni.sh');
const KOK_REPO = join(BURASI, '..', '..', '..');

const kos = (kok) => spawnSync('bash', [BETIK, kok], { encoding: 'utf8' });

// Fixture SIFIRDAN kurulur, gerçek ağaçtan KOPYALANMAZ: kapının deseninden beslenen bir
// fixture, kapının kör noktasını teste de taşır.
function sablon({ isaret = true, blok = true, kalemler = true, kirli = [] } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'keel-hijyen-'));
  mkdirSync(join(kok, 'tools', 'guard'), { recursive: true });
  mkdirSync(join(kok, 'tools', 'sevk'), { recursive: true });
  if (isaret) writeFileSync(join(kok, 'tools', 'guard', '.keel-kaynak'), 'bakimci\n');

  const govde = kalemler
    ? [
        '# yorum satiri blok icinde — atlanmali',
        'tools/guard/.aktif-rol',
        'tools/sevk/kanal.conf',
        'tools/sevk/.haber-durum',
        'tools/sevk/.nabiz-son',
        'tools/sevk/.cevap-capa*',
      ]
    : ['# blok var ama icinde tek bir yol yok'];

  const satirlar = ['.DS_Store', 'tools/guard/.keel-kaynak'];
  if (blok) {
    satirlar.push('# === KUTU-DURUMU-BASLANGIC ===', ...govde, '# === KUTU-DURUMU-SON ===');
  } else {
    satirlar.push(...govde);
  }
  satirlar.push('.claude/worktrees/');
  writeFileSync(join(kok, '.gitignore'), satirlar.join('\n') + '\n');

  for (const y of kirli) {
    mkdirSync(join(kok, dirname(y)), { recursive: true });
    writeFileSync(join(kok, y), 'deneme icerik\n');
  }
  return kok;
}

test('temiz şablon ağacı → YEŞİL exit 0', () => {
  const r = kos(sablon());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /SONUÇ: YEŞİL/);
  assert.match(r.stdout, /5 desen tarandi, 0 bulundu/);
});

test('kanal.conf şablon ağacında → KIRMIZI exit 2, dosya adıyla anılır', () => {
  const r = kos(sablon({ kirli: ['tools/sevk/kanal.conf'] }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /KIRMIZI · kurulu-kutu durum dosyasi sablon agacinda: tools\/sevk\/kanal\.conf/);
  assert.match(r.stdout, /SONUÇ: KIRMIZI/);
});

test('nabız/haber durum dosyaları → KIRMIZI, ikisi de ayrı ayrı sayılır', () => {
  const r = kos(sablon({ kirli: ['tools/sevk/.haber-durum', 'tools/sevk/.nabiz-son'] }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /tools\/sevk\/\.haber-durum/);
  assert.match(r.stdout, /tools\/sevk\/\.nabiz-son/);
  assert.match(r.stdout, /KIRMIZI · 2 dosya bulundu/);
});

test('yıldızlı desen de tutar (.cevap-capa* → .cevap-capa.yeni)', () => {
  // Bu dal önemlidir: cevap çapasının GEÇİCİ dosyası da sırrı taşır. Desen yıldızlıysa
  // kapı adı tek tek saymak yerine aileyi tutmalı — saymak bir sonraki geçici dosyada kaçırır.
  const r = kos(sablon({ kirli: ['tools/sevk/.cevap-capa.yeni'] }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /tools\/sevk\/\.cevap-capa\.yeni/);
});

test('TERS YÖN: bakımcı işareti yoksa ölçmez ve bunu ADIYLA söyler (kurulu kutu meşrudur)', () => {
  // Kurulu bir kutuda kanal.conf MEŞRUDUR. Kapı orada kırmızı basarsa yanlış-pozitiftir ve
  // yanlış-pozitif basan kapıya kimse bakmaz — kapı fiilen ölür.
  const r = kos(sablon({ isaret: false, kirli: ['tools/sevk/kanal.conf'] }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /ÖLÇÜLMEDİ · burası şablon ağacı değil/);
  assert.doesNotMatch(r.stdout, /KIRMIZI/);
});

test('FAIL-CLOSED: .gitignore yoksa KIRMIZI (sessiz yeşil yok)', () => {
  const kok = sablon();
  rmSync(join(kok, '.gitignore'));
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /\.gitignore yok/);
});

test('FAIL-CLOSED: blok imi silinince KIRMIZI — liste okunamıyorsa temiz DENMEZ', () => {
  const r = kos(sablon({ blok: false, kirli: ['tools/sevk/kanal.conf'] }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /KUTU-DURUMU-BASLANGIC.*imi yok/);
});

test('FAIL-CLOSED: blok boşalırsa KIRMIZI — hiçbir şey ölçmeyen kapı yeşil basamaz', () => {
  const r = kos(sablon({ kalemler: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /blogu BOS/);
});

test('kök yoksa KIRMIZI (fail-closed)', () => {
  const r = kos(join(tmpdir(), 'hic-olmayan-keel-koku-9f2a'));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kök yok/);
});

// ─────────────────────────────────────────────────────────────────────────────
// GERÇEK AĞAÇ. Yukarıdaki fixture'lar kapının doğru çalıştığını gösterir; bu test
// kapının BU depoya fiilen uygulandığını gösterir. U22'nin tekrarı buradan kırmızıya döner.
test('GERÇEK DEPO: bu ağacın çalışma kopyası temiz', () => {
  const r = kos(KOK_REPO);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /SONUÇ: YEŞİL|ÖLÇÜLMEDİ/);
});

test('GERÇEK DEPO: .gitignore kutu-durumu bloğu yerinde ve dolu', () => {
  // Blok kaybolursa yukarıdaki test "ÖLÇÜLMEDİ" ile de geçebilirdi. Bu test o kaçışı kapatır:
  // liste bu depoda VAR ve içinde en az on yol olmak zorunda (bugün 16).
  const r = spawnSync('bash', ['-c',
    `awk '/^# === KUTU-DURUMU-BASLANGIC ===/{i=1;next} /^# === KUTU-DURUMU-SON ===/{i=0;next} ` +
    `i && $0 !~ /^[[:space:]]*#/ && $0 !~ /^[[:space:]]*$/ {n++} END{print n+0}' "$1"`,
    'sh', join(KOK_REPO, '.gitignore')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const n = Number(r.stdout.trim());
  assert.ok(n >= 10, `kutu-durumu blogunda yalniz ${n} yol var — liste budanmis olabilir`);
});
