import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const BETIK = join(BURASI, '..', 'kurulum-denetimi.sh');

const EK_TAM = `# EL KİTABI — işletim disiplini
Bu belge ekibin çalışma anayasasıdır. Ağırlık kadranı: **TAM RİTÜEL**.
**Değer aksiyomu:** İşi bitiren en küçük çıktı en iyisidir.
## D-kuralları
- D7 · Mühür paketi. SANA KALAN satırı zorunlu.
- D9 · İş-icat yasağı.
## F-kuralları
- F6 · Kural-evrim kilidi.
## Üslup hükmü
## Kutu döngüsü
## Mühür ritüeli
Muğlak mesaj onay sayılmaz; yorumla onay üretme yasak.
## Domain-rol disiplin iskeleti
## Kanon-fakir dünya
## Kişisel-veri süzgeci
## Kadro + kapsam
`;

function kurulum({ ek = EK_TAM, defo = true, retro = true, bekci = '#!/bin/bash\n# kategoriler: tavan şema koruma-hattı bağ-varlık tazelik\nexit 0\n', skillIlk = '---', skillKilit = true, slug = 'denetci', acikAlan = false, rolmd = true, durum = true, pano = true, kutu = true } = {}) {
  const kok = mkdtempSync(join(tmpdir(), 'kurden-test-'));
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  mkdirSync(join(kok, '03_roller', slug), { recursive: true });
  mkdirSync(join(kok, '.claude', 'skills', 'rol-' + slug.replace(/[^a-z0-9-]/g, '')), { recursive: true });
  if (ek != null) writeFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), ek);
  if (defo) writeFileSync(join(kok, '00_genesis', 'DEFO_MODELI.md'), '# DEFO\n## On defo — itki\n');
  if (retro) writeFileSync(join(kok, '00_genesis', 'RETRO_KALIBI.md'), '# RETRO\n1. **Tavan kalibrasyonu:** soru.\n');
  if (bekci != null) {
    mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
    writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), bekci);
    chmodSync(join(kok, 'tools', 'bekci', 'bekci.sh'), 0o755);
  }
  writeFileSync(
    join(kok, '.claude', 'skills', 'rol-' + slug.replace(/[^a-z0-9-]/g, ''), 'SKILL.md'),
    skillIlk + '\ndescription: t\n' + (skillKilit ? 'disable-model-invocation: true\n' : '') + '---\ntören\n'
  );
  // İşletim yüzeyi (soğuk-denetim C1): rol sözleşmesi + başlangıç DURUM'u + pano + ilk kutu.
  if (acikAlan) writeFileSync(join(kok, '03_roller', slug, 'ROL.md'), '# «ROL-ADI» doldurulmamış\n');
  else if (rolmd) writeFileSync(join(kok, '03_roller', slug, 'ROL.md'), '# ROL — Denetçi\nSınırlar: dolu.\n');
  if (durum) writeFileSync(join(kok, '03_roller', slug, 'DURUM.md'), '# DURUM — Denetçi\nHenüz oturum açılmadı\n');
  if (pano) {
    mkdirSync(join(kok, '00_pano'), { recursive: true });
    writeFileSync(join(kok, '00_pano', 'PANO.md'), '# Pano\n- **Aktif kutu:** KT-001\n');
  }
  if (kutu) {
    mkdirSync(join(kok, '01_kutular', 'KT-001-cekirdek'), { recursive: true });
    writeFileSync(join(kok, '01_kutular', 'KT-001-cekirdek', 'KUTU.md'), '# KT-001 — Çekirdek\n## Kapılar\n');
  }
  return kok;
}

const kos = (kok) => spawnSync('bash', [BETIK, kok], { encoding: 'utf8' });

test('tam kurulum: YEŞİL, exit 0', () => {
  const r = kos(kurulum());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /SONUÇ: YEŞİL/);
});

test('EL_KITABI eksik başlık (Üslup hükmü silinmiş) → KIRMIZI exit 2', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('## Üslup hükmü\n', '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu başlık eksik: ## Üslup hükmü/);
});

test('zorunlu kural eksik (Mühür paketi yok) → KIRMIZI', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('Mühür paketi. SANA KALAN satırı zorunlu.', 'SANA KALAN satırı zorunlu.') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu kural eksik: Mühür paketi/);
});

test('zorunlu kural eksik (yorumla onay üretme yok — MA-01) → KIRMIZI', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('Muğlak mesaj onay sayılmaz; yorumla onay üretme yasak.\n', '') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu kural eksik: yorumla onay üretme/);
});

test('doldurulmamış «alan» → KIRMIZI', () => {
  const r = kos(kurulum({ acikAlan: true }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /doldurulmamış «alan»/);
});

test('DEFO_MODELI kopyalanmamış → KIRMIZI (bilinç katmanı inmemiş)', () => {
  const r = kos(kurulum({ defo: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /DEFO_MODELI\.md yok/);
});

test('TAM kadranda bekçi ilanında kategori eksikse → KIRMIZI; KÜÇÜK kadranda aynı bekçi YEŞİL', () => {
  const darBekci = '#!/bin/bash\n# kategoriler: tavan şema\nexit 0\n';
  const tam = kos(kurulum({ bekci: darBekci }));
  assert.equal(tam.status, 2);
  assert.match(tam.stdout, /zorunlu kategori eksik: koruma-hattı/);
  const kucuk = kos(kurulum({ bekci: darBekci, ek: EK_TAM.replace('**TAM RİTÜEL**', '**KÜÇÜK** (tek kişilik)') }));
  assert.equal(kucuk.status, 0, kucuk.stdout);
});

test('bekçide ilan satırı hiç yok → KIRMIZI', () => {
  const r = kos(kurulum({ bekci: '#!/bin/bash\nexit 0\n' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /'# kategoriler:' ilan satırı yok/);
});

test('SKILL ilk satırı --- değil → KIRMIZI (yaşanmış kırılma)', () => {
  const r = kos(kurulum({ skillIlk: '<!-- yorum -->' }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /SKILL ilk satırı/);
});

test('tireli rol slug → KIRMIZI; _arsiv muaf', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', 'baş-tasarımcı'), { recursive: true });
  mkdirSync(join(kok, '03_roller', '_arsiv'), { recursive: true });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /tek-token ASCII değil: baş-tasarımcı/);
  assert.doesNotMatch(r.stdout, /_arsiv/);
});

test('EL_KITABI kendi tavanını aşarsa → KIRMIZI', () => {
  const r = kos(kurulum({ ek: EK_TAM + 'x'.repeat(15000) }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kendi tavanını aşıyor/);
});

test('fail-closed: EL_KITABI hiç yoksa KIRMIZI (sessiz yeşil yok)', () => {
  const r = kos(kurulum({ ek: null }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /EL_KITABI\.md yok/);
});

test('fail-closed: okunamayan dosya «alan» taramasını sessiz geçemez → KIRMIZI', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '03_roller', 'denetci', 'kilitli.md'), 'x');
  chmodSync(join(kok, '03_roller', 'denetci', 'kilitli.md'), 0o000);
  const r = kos(kok);
  assert.equal(r.status, 2, r.stdout);
  assert.match(r.stdout, /«alan» taraması hata verdi/);
});

test('_arsiv içindeki «alan» muaf: arşivlenmiş taslak çekilmeyi kilitlemez', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', '_arsiv', 'eski'), { recursive: true });
  writeFileSync(join(kok, '03_roller', '_arsiv', 'eski', 'ROL.md'), '# «ROL-ADI»\n');
  const r = kos(kok);
  assert.equal(r.status, 0, r.stdout);
});

test('kadran çapalı okunur: KÜÇÜK gerekçesinde "TAM RİTÜEL gerekmiyor" geçse de kucuk okunur', () => {
  const darBekci = '#!/bin/bash\n# kategoriler: tavan şema\nexit 0\n';
  const ek = EK_TAM.replace('**TAM RİTÜEL**', '**KÜÇÜK** (tek kişilik; TAM RİTÜEL gerekmiyor)');
  const r = kos(kurulum({ ek, bekci: darBekci }));
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /kadran okundu: kucuk/);
});

test('tanınmayan kadran → KIRMIZI (fail-closed, tam küme aranır)', () => {
  const r = kos(kurulum({ ek: EK_TAM.replace('**TAM RİTÜEL**', '**Tam Ritüel**') }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /kadran okunamadı/);
});

test('rol var ama becerisi silinmiş → KIRMIZI (yokluk körlüğü kapalı)', () => {
  const kok = kurulum();
  mkdirSync(join(kok, '03_roller', 'po'), { recursive: true });
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /rol becerisi eksik: .*rol-po/);
});

test('hiç rol yoksa → KIRMIZI (G4.5 rollerden sonra koşar)', () => {
  const kok = mkdtempSync(join(tmpdir(), 'kurden-bos-'));
  mkdirSync(join(kok, '02_kanon'), { recursive: true });
  mkdirSync(join(kok, '00_genesis'), { recursive: true });
  writeFileSync(join(kok, '02_kanon', 'EL_KITABI.md'), EK_TAM);
  writeFileSync(join(kok, '00_genesis', 'DEFO_MODELI.md'), '## On defo\n');
  writeFileSync(join(kok, '00_genesis', 'RETRO_KALIBI.md'), '**Tavan kalibrasyonu:**\n');
  mkdirSync(join(kok, 'tools', 'bekci'), { recursive: true });
  writeFileSync(join(kok, 'tools', 'bekci', 'bekci.sh'), '#!/bin/bash\n# kategoriler: tavan şema koruma-hattı bağ-varlık tazelik\nexit 0\n');
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /hiç rol yok/);
});

// --- Soğuk-denetim yamaları (2026-07-16): C1 işletim yüzeyi · C3 beceri kilidi · C4 çapalı başlık ---

test('C1: 00_pano/PANO.md yoksa → KIRMIZI (pano bağlanmadan çekilme serbest denemez)', () => {
  const r = kos(kurulum({ pano: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /00_pano\/PANO\.md yok/);
});

test('C1: hiç kutu yoksa → KIRMIZI (ilk kutu G4\'te kurulmuş olmalı)', () => {
  const r = kos(kurulum({ kutu: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /hiç kutu yok/);
});

test('C1: rol sözleşmesi (ROL.md) yoksa → KIRMIZI', () => {
  const r = kos(kurulum({ rolmd: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /rol sözleşmesi eksik: 03_roller\/denetci\/ROL\.md/);
});

test('C1: rol başlangıç DURUM.md yoksa → KIRMIZI (tatbikat-v2\'de sahada görülen eksik)', () => {
  const r = kos(kurulum({ durum: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /rol durum dosyası eksik: 03_roller\/denetci\/DURUM\.md/);
});

test('C3: beceri insan-tetikleme kilidi (disable-model-invocation) yoksa → KIRMIZI', () => {
  const r = kos(kurulum({ skillKilit: false }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /insan-tetikleme kilidi eksik/);
});

test('C3 hasım: kilit yalnız GÖVDEDE geçiyorsa (frontmatter\'da yok) kilit sayılmaz → KIRMIZI (çapalı arama)', () => {
  const kok = kurulum({ skillKilit: false });
  writeFileSync(
    join(kok, '.claude', 'skills', 'rol-denetci', 'SKILL.md'),
    '---\ndescription: t\n---\nNot: disable-model-invocation: true olarak ayarlanmalı (ama değil).\n'
  );
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /insan-tetikleme kilidi/);
});

test('C1 hasım: DURUM.md var ama biçimsiz (# DURUM başlığı yok) → KIRMIZI (yalnız varlık yetmez)', () => {
  const kok = kurulum();
  writeFileSync(join(kok, '03_roller', 'denetci', 'DURUM.md'), 'başlıksız içerik\n');
  const r = kos(kok);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /durum dosyası biçimsiz/);
});

test('C4: zorunlu başlık yalnız paragraf İÇİNDE geçiyorsa başlık sayılmaz → KIRMIZI (çapalı arama)', () => {
  const ek = EK_TAM.replace('## Üslup hükmü\n', 'metinde ## Üslup hükmü sözü geçiyor ama başlık değil\n');
  const r = kos(kurulum({ ek }));
  assert.equal(r.status, 2);
  assert.match(r.stdout, /zorunlu başlık eksik: ## Üslup hükmü/);
});
