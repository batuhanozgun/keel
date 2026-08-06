// Tek-ev eşliği (sözleşme §5①): EL_KITABI zorunlu kümesi tools/bekci/el-kitabi-zorunlu.txt'de
// yaşar. Bu test üç şeyi tartar: (1) kalıbın gövdesi listeyi karşılıyor — bugüne kadar hiçbir
// şey ölçmüyordu; (2) kurulum-denetimi.sh'ın (adım 5'e kadar duran) kopyası listeyle bayt-eş;
// (3) test fixture'ının EK_TAM'ı da listeyi karşılıyor (üçüncü kopya fixture'a taşınmadı,
// fixture listeden türetilebilir kaldı).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EK_TAM } from './yardimci.mjs';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK_REPO = join(BURASI, '..', '..', '..');

function listeyiOku() {
  const kalemler = [];
  for (const ham of readFileSync(join(BURASI, '..', 'el-kitabi-zorunlu.txt'), 'utf8').split('\n')) {
    const satir = ham.trim();
    if (!satir || satir.startsWith('#')) continue;
    const m = satir.match(/^(baslik|ibare|kural):(.+)$/);
    assert.ok(m, 'liste kalemi biçimsiz: ' + satir);
    kalemler.push({ tur: m[1], kalem: m[2] });
  }
  return kalemler;
}

test('liste 9 başlık + 1 ibare + 6 kural taşır (tasarının tek-ev sayımı)', () => {
  const kalemler = listeyiOku();
  assert.equal(kalemler.filter((k) => k.tur === 'baslik').length, 9);
  assert.equal(kalemler.filter((k) => k.tur === 'ibare').length, 1);
  assert.equal(kalemler.filter((k) => k.tur === 'kural').length, 6);
});

test('EL_KITABI_KALIBI gövdesi listenin her kalemini karşılıyor', () => {
  const kalip = readFileSync(join(KOK_REPO, '00_genesis', 'EL_KITABI_KALIBI.md'), 'utf8');
  const kalipSatirlari = kalip.split('\n');
  for (const { tur, kalem } of listeyiOku()) {
    const var_ = tur === 'baslik'
      ? kalipSatirlari.some((s) => s.startsWith(kalem))
      : kalip.includes(kalem);
    assert.ok(var_, 'kalıp karşılamıyor: ' + tur + ':' + kalem);
  }
});

test('kurulum-denetimi.sh kopya taşımaz, kümeyi TEK EVDEN okur (adım 5 dikişi)', () => {
  // Adım 5'e kadar bu test betikteki gömülü kopyanın listeyle eşliğini tartıyordu; dikiş
  // atıldı — artık ölçülen şey kopyanın GERİ DÖNMEMESİ ve okumanın dosyaya bağlı kalması.
  const betik = readFileSync(join(KOK_REPO, 'tools', 'guard', 'kurulum-denetimi.sh'), 'utf8');
  assert.match(betik, /tools\/bekci\/el-kitabi-zorunlu\.txt/, 'betik tek evi okumalı');
  assert.ok(!/for baslik in "## /.test(betik), 'gömülü başlık kopyası geri dönmüş — tek ev delik');
  assert.ok(!/for kural in "/.test(betik), 'gömülü kural kopyası geri dönmüş — tek ev delik');
  // Fail-closed dalları da yazılı olmalı: evsiz küme ve biçimsiz kalem "geçti" basamaz.
  assert.match(betik, /el-kitabi-zorunlu\.txt yok/, 'liste-yok dalı fail-closed olmalı');
  assert.match(betik, /biçimsiz kalem/, 'biçimsiz-kalem dalı fail-closed olmalı');
});

test('test fixture\'ının EL_KITABI\'sı da listeyi karşılıyor (fixture bayatlarsa burada kızarır)', () => {
  const satirlar = EK_TAM.split('\n');
  for (const { tur, kalem } of listeyiOku()) {
    const var_ = tur === 'baslik' ? satirlar.some((s) => s.startsWith(kalem)) : EK_TAM.includes(kalem);
    assert.ok(var_, 'fixture karşılamıyor: ' + tur + ':' + kalem);
  }
});
