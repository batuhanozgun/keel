#!/usr/bin/env node
// cekirdek.mjs — bekçi SABİT ÇEKİRDEĞİ [SERT]. Sözleşme: tools/bekci/README.md (bu dizin).
// # kategoriler: tavan şema koruma-hattı bağ-varlık golden-tazelik
//   (kurulum denetiminin grep'lediği asıl ilan satırı sarmalayıcıdadır: tools/bekci/bekci.sh —
//    .mjs dosyası satır başında '#' taşıyamaz; buradaki kopya insan içindir.)
// Üç dosya modeli: cekirdek.mjs [SERT] · bekci.sh [SERT, ince sarmalayıcı] · bekci.conf [SORULUR].
// Çıktı sözleşmesi: insan satırları + SON satır makine satırı (BEKCI v1 …); çıkış 0/1/2.
// Makine satırında ciddiyet kelimesi GEÇMEZ; insan satırları da KIRMIZI/SARI kelimesi taşımaz
// (sevk'in eski metin taraması bir açıklama cümlesiyle dönem durdurmasın — sözleşme §1).
// Türkçe harf güvenliği: bütün eşleştirmeler dönüşümsüz birebirdir (BEKCI_TARIFI madde 1).

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
const KOK = process.argv[2]
  ? resolve(process.argv[2])
  : (process.env.CLAUDE_PROJECT_DIR ? resolve(process.env.CLAUDE_PROJECT_DIR) : resolve(BURASI, '..', '..'));

// ── durum ─────────────────────────────────────────────────────────────────────
// hal iç temsili ASCII: DURDURAN | KILIT | UYARI | BILGI. İnsan görünümü aşağıdaki sözlükten.
const HAL_GORUNUM = { DURDURAN: 'DURDURAN', KILIT: 'KİLİT', UYARI: 'UYARI', BILGI: 'BİLGİ' };
const bulgular = [];   // {hal, kategori, goz, metin}
const arizalar = [];   // bekçinin KENDİ hataları — ayrı hat, ciddiyet değil (sözleşme §2)
const PENCERE = existsSync(join(KOK, '.kurulum-tamam')) ? 'isletim' : 'kurulum';

function bulgu(hal, kategori, goz, metin) { bulgular.push({ hal, kategori, goz, metin }); }
// Pencere düşürücüsü: kurulum penceresinde göz BİLGİ'ye düşer (sözleşme §3 kural 2).
// Kablo denetimi bu fonksiyonu KULLANMAZ — o her zaman tamdır (§3 kural 1).
function dusur(hal) { return PENCERE === 'kurulum' ? 'BILGI' : hal; }
function goz(kategori, ad, fn) {
  try { fn(); } catch (e) { arizalar.push('[' + kategori + '] ' + ad + ': ' + (e && e.message ? e.message : String(e))); }
}

function oku(yol) { try { return readFileSync(yol, 'utf8'); } catch { return null; } }
function dizin(yol) { try { return readdirSync(yol); } catch { return null; } }
function dosyaMi(yol) { try { return statSync(yol).isFile(); } catch { return false; } }
function dizinMi(yol) { try { return statSync(yol).isDirectory(); } catch { return false; } }

function git(args) { return execFileSync('git', args, { cwd: KOK, encoding: 'utf8' }); }
function gitDene(args) { try { return { ok: true, cikti: git(args) }; } catch { return { ok: false, cikti: '' }; } }
const GIT_VAR = dizinMi(join(KOK, '.git'));

// ── ayar (bekci.conf [SORULUR]) ───────────────────────────────────────────────
// Biçim kanal.conf emsali: ANAHTAR=değer · '#' yorum · tırnak yok (VERİ dosyası, source edilmez).
const TAVAN_ANAHTARLARI = ['tavan_pano', 'tavan_saglik', 'tavan_durum', 'tavan_kutu', 'tavan_ertelenenler',
  'tavan_sende_bekleyen', 'tavan_brifing', 'tavan_notlar', 'tavan_el_kitabi'];
function confOku() {
  const yol = join(KOK, 'tools', 'bekci', 'bekci.conf');
  const metin = oku(yol);
  if (metin === null) throw new Error('bekci.conf okunamadı: tools/bekci/bekci.conf — ölçemedim, temiz sayamam (fail-closed)');
  const conf = {};
  metin.split('\n').forEach((ham, i) => {
    const satir = ham.replace(/\r$/, '');
    if (!satir.trim() || satir.trimStart().startsWith('#')) return;
    const m = satir.match(/^([a-z_]+)=(.*)$/);
    if (!m) throw new Error('bekci.conf biçimsiz (satır ' + (i + 1) + '): ' + satir);
    conf[m[1]] = m[2].trim();
  });
  if (conf.kadran !== 'tam' && conf.kadran !== 'kucuk') {
    throw new Error("bekci.conf kadran değeri tanınmadı: '" + (conf.kadran || '') + "' (tam|kucuk beklenir)");
  }
  for (const a of TAVAN_ANAHTARLARI) {
    if (!/^\d+$/.test(conf[a] || '')) throw new Error('bekci.conf tavan sayısı eksik/bozuk: ' + a + ' (birim BAYT, sözleşme §5④)');
    conf[a] = Number(conf[a]);
  }
  conf.urun_yollari = (conf.urun_yollari || '').split(/\s+/).filter(Boolean);
  conf.golden_dizini = conf.golden_dizini || '02_kanon/golden';
  conf.kok_izinli_ek = (conf.kok_izinli_ek || '').split(/\s+/).filter(Boolean);
  conf.pano_izinli_ek = (conf.pano_izinli_ek || '').split(/\s+/).filter(Boolean);
  // GENESIS.md hiçbir yoldan izinli olamaz — ayardan gelse bile reddedilir (sözleşme §0, G3a.md:8).
  if (conf.kok_izinli_ek.includes('GENESIS.md')) {
    conf.kok_izinli_ek = conf.kok_izinli_ek.filter((x) => x !== 'GENESIS.md');
    bulgu(dusur('UYARI'), 'şema', 'ayar', 'GENESIS.md izinli kümeye alınamaz (G3a yasağı) — ayar kalemi yok sayıldı');
  }
  return conf;
}

// ── ortak ayrıştırıcılar ─────────────────────────────────────────────────────
// KUTU görev tablosu: yalnız AKTİF faz (ikinci '### ' başlığında toplama durur — BEKCI_TARIFI md.17).
function gorevleriOku(kutuMetin) {
  const sonuc = [];
  let fazSayisi = 0;
  const satirlar = kutuMetin.split('\n');
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i];
    if (/^### /.test(s)) { fazSayisi++; if (fazSayisi >= 2) break; continue; }
    if (!/^\|\s*G-\d+\b/.test(s)) continue;
    const hucreler = s.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((h) => h.trim());
    const durum = (hucreler[3] || '').split(/[—–]/)[0].trim();
    sonuc.push({ id: (hucreler[0] || '').trim(), durum, kanit: hucreler.length >= 5 ? hucreler[4] : undefined, satir: i + 1, hucreSayisi: hucreler.length });
  }
  return sonuc;
}

function blokKes(metin, baslikOnek) {
  const satirlar = metin.split('\n');
  const bas = satirlar.findIndex((s) => s.startsWith(baslikOnek));
  if (bas === -1) return null;
  let son = satirlar.length;
  for (let i = bas + 1; i < satirlar.length; i++) if (/^## /.test(satirlar[i])) { son = i; break; }
  return { bas, son, satirlar: satirlar.slice(bas, son) };
}

function aktifKutular() {
  const kok = join(KOK, '01_kutular');
  const girdiler = dizin(kok) || [];
  return girdiler
    .filter((ad) => ad !== '_arsiv' && ad.startsWith('KT-') && dizinMi(join(kok, ad)))
    .sort()
    .map((ad) => ({ ad, kutuMd: join(kok, ad, 'KUTU.md'), rel: '01_kutular/' + ad + '/KUTU.md' }));
}

// ── ana akış ─────────────────────────────────────────────────────────────────
let conf = null;
let kadran = 'tam'; // fail-closed varsayılan: ayar okunamazsa dar değil GENİŞ ölçülür
try { conf = confOku(); kadran = conf.kadran; } catch (e) { arizalar.push('[ayar] bekci.conf: ' + e.message); }

const EK_YOL = join(KOK, '02_kanon', 'EL_KITABI.md');
const EK_METIN = oku(EK_YOL);
let bosBacklog = false;

if (conf) {
  // ═══ kategori: tavan ═══════════════════════════════════════════════════════
  goz('tavan', 'tavan-asimi', () => {
    const kalemler = [];
    const tek = (rel, tavan, etiket) => { if (dosyaMi(join(KOK, rel))) kalemler.push({ rel, tavan, etiket }); };
    tek('00_pano/PANO.md', conf.tavan_pano, 'PANO');
    tek('00_pano/SAGLIK.md', conf.tavan_saglik, 'SAGLIK');
    tek('00_pano/ERTELENENLER.md', conf.tavan_ertelenenler, 'ERTELENENLER');
    tek('00_pano/SENDE_BEKLEYEN.md', conf.tavan_sende_bekleyen, 'SENDE_BEKLEYEN');
    tek('02_kanon/EL_KITABI.md', conf.tavan_el_kitabi, 'EL_KITABI');
    tek('03_roller/disgoz/BRIFING.md', conf.tavan_brifing, 'BRIFING');
    for (const rol of dizin(join(KOK, '03_roller')) || []) {
      tek('03_roller/' + rol + '/DURUM.md', conf.tavan_durum, '03_roller/' + rol + '/DURUM.md');
      tek('03_roller/' + rol + '/NOTLAR.md', conf.tavan_notlar, '03_roller/' + rol + '/NOTLAR.md');
    }
    for (const k of aktifKutular()) if (dosyaMi(k.kutuMd)) kalemler.push({ rel: k.rel, tavan: conf.tavan_kutu, etiket: k.rel, kutu: true });
    for (const kalem of kalemler) {
      let bayt = Buffer.byteLength(readFileSync(join(KOK, kalem.rel)));
      if (kalem.kutu) {
        // '## Bağımlılık ve risk' MAKİNE-OKUR bloktur, KUTU tavanından DÜŞÜLÜR (BEKCI_TARIFI md.19).
        // Beyan: düşüme başlık satırı DAHİLDİR (blok bir bütün; testte çapalı).
        const metin = readFileSync(join(KOK, kalem.rel), 'utf8');
        const blok = blokKes(metin, '## Bağımlılık ve risk');
        if (blok) bayt -= Buffer.byteLength(blok.satirlar.join('\n'));
      }
      const kirmiziEsik = Math.floor(kalem.tavan * 3 / 2);
      if (bayt > kirmiziEsik) {
        bulgu(dusur('KILIT'), 'tavan', 'tavan-asimi', kalem.etiket + ' ' + bayt + 'B > 1,5x esik ' + kirmiziEsik + 'B — kutu kapanisi kilitli');
      } else if (bayt > kalem.tavan) {
        bulgu(dusur('UYARI'), 'tavan', 'tavan-asimi', kalem.etiket + ' ' + bayt + 'B > esik ' + kalem.tavan + 'B');
      }
    }
    // EL_KITABI'daki tavan satırı ile ayar ayrışırsa UYARI (sözleşme §5④; bölüm NUMARASINA çapa yok).
    if (EK_METIN) {
      const capa = '**Tavanlar (sarı eşik):**';
      const yer = EK_METIN.indexOf(capa);
      if (yer !== -1) {
        const parca = EK_METIN.slice(yer + capa.length, yer + capa.length + 600).split('Sarı = uyarı')[0].replace(/\n/g, ' ');
        const esle = { PANO: 'tavan_pano', SAGLIK: 'tavan_saglik', DURUM: 'tavan_durum', KUTU: 'tavan_kutu', ERTELENENLER: 'tavan_ertelenenler', SENDE_BEKLEYEN: 'tavan_sende_bekleyen', BRIFING: 'tavan_brifing', NOTLAR: 'tavan_notlar', EL_KITABI: 'tavan_el_kitabi' };
        for (const kalem of parca.split(' · ')) {
          const m = kalem.trim().match(/^([A-ZÇĞİÖŞÜ_]+)\s+(\d+)KB/);
          if (!m || !esle[m[1]]) continue;
          const elKitabiDegeri = Number(m[2]) * 1024;
          if (conf[esle[m[1]]] !== elKitabiDegeri) {
            bulgu(dusur('UYARI'), 'tavan', 'tavan-ayar-ayrismasi', m[1] + ': EL_KITABI ' + elKitabiDegeri + 'B, ayar ' + conf[esle[m[1]]] + 'B — sahibin kalibrasyonu ile ayar tek doğrultuda değil');
          }
        }
      }
    }
  });

  goz('tavan', 'icerik-sinifi-kural-atif', () => {
    // EL_KITABI gövdesinden ≥200 bayt BİREBİR tekrar → UYARI, tavandan bağımsız (sözleşme §5⑤).
    // Beyan: tekrar, ardışık SATIR dizisi düzeyinde ölçülür; kapsam tavan haritasının insan-okur
    // dosyalarıdır (EL_KITABI'nın kendisi ve bekçinin yazdığı SAGLIK hariç; KUTU'da risk bloğu
    // muaftır — muafiyet artık gerçek bir denetime bağlı, sözleşme §6③).
    if (!EK_METIN) return;
    const ekSatirlar = EK_METIN.split('\n');
    const konum = new Map();
    ekSatirlar.forEach((s, i) => { if (s.trim().length >= 10) { if (!konum.has(s)) konum.set(s, []); konum.get(s).push(i); } });
    const hedefler = ['00_pano/PANO.md', '00_pano/ERTELENENLER.md', '00_pano/SENDE_BEKLEYEN.md', '03_roller/disgoz/BRIFING.md'];
    for (const rol of dizin(join(KOK, '03_roller')) || []) { hedefler.push('03_roller/' + rol + '/DURUM.md', '03_roller/' + rol + '/NOTLAR.md'); }
    for (const k of aktifKutular()) hedefler.push(k.rel);
    for (const rel of [...new Set(hedefler)]) {
      let metin = oku(join(KOK, rel));
      if (metin === null) continue;
      if (rel.endsWith('/KUTU.md')) {
        const blok = blokKes(metin, '## Bağımlılık ve risk');
        if (blok) { const s = metin.split('\n'); s.splice(blok.bas, blok.son - blok.bas); metin = s.join('\n'); }
      }
      const satirlar = metin.split('\n');
      let i = 0;
      while (i < satirlar.length) {
        const yerler = konum.get(satirlar[i]);
        if (!yerler) { i++; continue; }
        let enUzun = 0;
        for (const p of yerler) {
          let n = 0;
          while (i + n < satirlar.length && p + n < ekSatirlar.length && satirlar[i + n] === ekSatirlar[p + n]) n++;
          if (n > enUzun) enUzun = n;
        }
        const parcaBayt = Buffer.byteLength(satirlar.slice(i, i + enUzun).join('\n'));
        if (parcaBayt >= 200) {
          bulgu(dusur('UYARI'), 'tavan', 'icerik-sinifi', 'kural-atıf kopyası: ' + rel + ' satır ' + (i + 1) + ' — EL_KITABI gövdesinden ' + parcaBayt + 'B birebir tekrar (işaretçi yaz, kopyalama)');
          i += enUzun;
        } else i++;
      }
    }
  });

  goz('tavan', 'icerik-sinifi-kuyruk-maddesi', () => {
    // Çok-satırlı kuyruk maddesi → UYARI; yalnız kuyruk biçimi tanımlı iki dosya (sözleşme §5⑤).
    for (const rel of ['00_pano/SENDE_BEKLEYEN.md', '00_pano/ERTELENENLER.md']) {
      const metin = oku(join(KOK, rel));
      if (metin === null) continue;
      const satirlar = metin.split('\n');
      for (let i = 0; i < satirlar.length - 1; i++) {
        if (!satirlar[i].startsWith('- [')) continue;
        const sonraki = satirlar[i + 1];
        if (sonraki.trim() === '' || sonraki.startsWith('- ') || sonraki.startsWith('#') || sonraki.startsWith('<!--') || sonraki.startsWith('|') || sonraki.startsWith('```')) continue;
        bulgu(dusur('UYARI'), 'tavan', 'icerik-sinifi', 'çok-satırlı kuyruk maddesi: ' + rel + ' satır ' + (i + 1) + ' — madde başına TEK satır');
      }
    }
  });

  // ═══ kategori: şema ════════════════════════════════════════════════════════
  goz('şema', 'kok-semasi', () => {
    // İki küme AYRIDIR (sözleşme §5③): zorunlu [SERT] — yokluk DURDURAN; izinli — dışı UYARI.
    const zorunluDizin = ['00_pano', '01_kutular', '02_kanon', '03_roller', 'tools', '.claude'];
    const zorunluDosya = ['CLAUDE.md', '.gitignore'];
    if (PENCERE === 'isletim') zorunluDosya.push('NASIL_KULLANILIR.md');
    for (const d of zorunluDizin) if (!dizinMi(join(KOK, d))) bulgu(dusur('DURDURAN'), 'şema', 'kok-zorunlu', 'kök zorunlu dizin yok: ' + d + '/');
    for (const f of zorunluDosya) if (!dosyaMi(join(KOK, f))) bulgu(dusur('DURDURAN'), 'şema', 'kok-zorunlu', 'kök zorunlu dosya yok: ' + f);
    const izinli = new Set([...zorunluDizin, ...zorunluDosya, 'NASIL_KULLANILIR.md', 'README.md', 'LICENSE', '.kurulum-tamam', '.git', '00_genesis', ...conf.kok_izinli_ek, ...conf.urun_yollari.map((y) => y.split('/')[0])]);
    for (const ad of dizin(KOK) || []) {
      if (ad === 'GENESIS.md') continue; // kendi gözü var (aşağıda); çift bulgu üretilmez
      if (!izinli.has(ad)) bulgu(dusur('UYARI'), 'şema', 'kok-izinli', 'şema-dışı kök girdisi: ' + ad);
    }
    if (PENCERE === 'isletim' && dosyaMi(join(KOK, 'GENESIS.md'))) {
      bulgu('UYARI', 'şema', 'genesis-artigi', 'GENESIS.md kökte — kurulum artığı (G5 taşır; şemaya kalıcı whitelist yasak)');
    }
  });

  goz('şema', 'kadran-taniklari', () => {
    // Kadran ayardan okunur, EL_KITABI dizesi İKİNCİ TANIKTIR; ayrışma DURDURAN (sözleşme §5③).
    if (!EK_METIN) return; // EL_KITABI yokluğunu bütünlük gözü basar — çift alarm yok
    let ekKadran = null;
    if (EK_METIN.includes('Ağırlık kadranı: **TAM')) ekKadran = 'tam';
    else if (EK_METIN.includes('Ağırlık kadranı: **KÜÇÜK')) ekKadran = 'kucuk';
    if (ekKadran === null) bulgu(dusur('DURDURAN'), 'şema', 'kadran-taniklari', 'EL_KITABI kadran dizesi okunamadı — tek tanık, tanık değildir (fail-closed)');
    else if (ekKadran !== kadran) bulgu(dusur('DURDURAN'), 'şema', 'kadran-taniklari', 'kadran tanıkları ayrışıyor: ayar=' + kadran + ' · EL_KITABI=' + ekKadran + ' — kayan kadran sessiz ölçüm kaydırır');
  });

  goz('şema', 'el-kitabi-butunlugu', () => {
    // Zorunlu kümenin tek evi: tools/bekci/el-kitabi-zorunlu.txt (sözleşme §5①).
    const listeYolu = dosyaMi(join(KOK, 'tools', 'bekci', 'el-kitabi-zorunlu.txt'))
      ? join(KOK, 'tools', 'bekci', 'el-kitabi-zorunlu.txt') : join(BURASI, 'el-kitabi-zorunlu.txt');
    const liste = oku(listeYolu);
    if (liste === null) throw new Error('el-kitabi-zorunlu.txt okunamadı — bütünlük kümesi evsiz');
    if (EK_METIN === null) { bulgu(dusur('DURDURAN'), 'şema', 'el-kitabi-butunlugu', '02_kanon/EL_KITABI.md yok'); return; }
    const ekSatirlar = EK_METIN.split('\n');
    for (const ham of liste.split('\n')) {
      const satir = ham.trim();
      if (!satir || satir.startsWith('#')) continue;
      const m = satir.match(/^(baslik|ibare|kural):(.+)$/);
      if (!m) throw new Error('el-kitabi-zorunlu.txt biçimsiz kalem: ' + satir);
      const kalem = m[2];
      const var_ = m[1] === 'baslik' ? ekSatirlar.some((s) => s.startsWith(kalem)) : EK_METIN.includes(kalem);
      if (!var_) bulgu(dusur('DURDURAN'), 'şema', 'el-kitabi-butunlugu', 'EL_KITABI zorunlu ' + (m[1] === 'kural' ? 'kural' : 'başlık') + ' eksik: ' + kalem);
    }
  });

  goz('şema', 'pano-semasi', () => {
    const izinli = new Set(['PANO.md', 'SAGLIK.md', 'ERTELENENLER.md', 'SENDE_BEKLEYEN.md', 'oturum-gunlugu.jsonl', 'zarf-gunlugu.jsonl', ...conf.pano_izinli_ek]);
    for (const ad of dizin(join(KOK, '00_pano')) || []) {
      if (!izinli.has(ad)) bulgu(dusur('UYARI'), 'şema', 'pano-semasi', '00_pano içinde beklenmeyen girdi: ' + ad);
    }
  });

  goz('şema', 'kutu-adlandirma', () => {
    const kok = join(KOK, '01_kutular');
    for (const ad of dizin(kok) || []) {
      if (ad === '_arsiv' || ad === '.DS_Store') continue;
      if (!dizinMi(join(kok, ad))) { bulgu(dusur('UYARI'), 'şema', 'kutu-adlandirma', '01_kutular altında serbest dosya: ' + ad); continue; }
      if (!ad.startsWith('KT-')) bulgu(dusur('UYARI'), 'şema', 'kutu-adlandirma', 'kutu dizini KT- önekiyle başlamıyor: ' + ad);
    }
  });

  goz('şema', 'rol-evi', () => {
    const kok = join(KOK, '03_roller');
    for (const ad of dizin(kok) || []) {
      if (ad === '.DS_Store') continue;
      if (!dizinMi(join(kok, ad))) { bulgu(dusur('UYARI'), 'şema', 'rol-evi', '03_roller altında serbest dosya: ' + ad); continue; }
      if (!dosyaMi(join(kok, ad, 'ROL.md'))) bulgu(dusur('UYARI'), 'şema', 'rol-evi', ad + '/ROL.md (sözleşme) yok');
      const durum = oku(join(kok, ad, 'DURUM.md'));
      if (durum === null) { bulgu(dusur('UYARI'), 'şema', 'rol-evi', ad + '/DURUM.md yok'); continue; }
      const ilkBaslik = durum.split('\n').find((s) => s.startsWith('#'));
      if (!ilkBaslik || !ilkBaslik.startsWith('# DURUM — ')) bulgu(dusur('UYARI'), 'şema', 'rol-evi', ad + "/DURUM.md ilk başlık '# DURUM — <Ad>' biçiminde değil — kokpit okuyamaz");
      else if (!durum.includes('**Son oturum:**') && !durum.includes('Henüz oturum açılmadı')) {
        bulgu(dusur('UYARI'), 'şema', 'rol-evi', ad + "/DURUM.md ne '**Son oturum:**' ne 'Henüz oturum açılmadı' taşıyor");
      }
    }
  });

  goz('şema', 'sahip-kuyrugu', () => {
    // Kuyruk şeması (BEKCI_TARIFI md.18/2): ilk başlık '# SENDE BEKLEYEN', her '- [' satırı
    // '- [ ]'/'- [x]' + YYYY-AA-GG + ' · ' taşır.
    const metin = oku(join(KOK, '00_pano', 'SENDE_BEKLEYEN.md'));
    if (metin === null) return;
    const satirlar = metin.split('\n');
    const ilkBaslik = satirlar.find((s) => s.startsWith('#'));
    if (!ilkBaslik || !ilkBaslik.startsWith('# SENDE BEKLEYEN')) {
      bulgu(dusur('UYARI'), 'şema', 'sahip-kuyrugu', "kuyruk şeması bozuk: ilk başlık '# SENDE BEKLEYEN' değil");
    }
    satirlar.forEach((s, i) => {
      if (!s.startsWith('- [')) return;
      if (!/^- \[( |x)\] \d{4}-\d{2}-\d{2}/.test(s) || !s.includes(' · ')) {
        bulgu(dusur('UYARI'), 'şema', 'sahip-kuyrugu', 'kuyruk şeması bozuk: satır ' + (i + 1));
      }
    });
  });

  goz('şema', 'kapanis-blogu', () => {
    // Kapanış kancası geçirir: var|yok|bicimsiz|bilinmiyor. Değişken yoksa DENETLENMEZ (dırdır yok).
    if (PENCERE === 'kurulum') return;
    const blok = process.env.KAPANIS_BLOK;
    if (blok === undefined || blok === '') return;
    if (blok !== 'var') bulgu('UYARI', 'şema', 'kapanis-blogu', 'kapanışta SENDE BEKLEYEN satırı yok/biçimsiz (' + blok + ') — D2 ihlali');
  });

  goz('şema', 'porcelain-dikisi', () => {
    if (process.env.KAPANIS_PORCELAIN === 'fark') {
      bulgu(dusur('UYARI'), 'şema', 'porcelain-dikisi', "yazamaz koltuk kafes dışına kabukla yazdı — 'git status' ile bak");
    }
  });

  goz('şema', 'zarf-gunlugu', () => {
    // Otonom kapıların OKUDUĞU tek veri katmanı; bozuk satır bütün gözleri köreltir (BEKCI_TARIFI md.19).
    const metin = oku(join(KOK, '00_pano', 'zarf-gunlugu.jsonl'));
    if (metin === null) return;
    metin.split('\n').forEach((satir, i) => {
      if (!satir.trim()) return;
      let j = null;
      try { j = JSON.parse(satir); } catch { }
      if (!j || typeof j !== 'object' || !('surum' in j) || !('tip' in j)) {
        bulgu(dusur('DURDURAN'), 'şema', 'zarf-gunlugu', 'zarf günlüğü bozuk: satır ' + (i + 1));
      }
    });
  });

  goz('şema', 'durus-ve-risk', () => {
    // Bloklar MEVCUTSA biçimli olmalı; YOKLUK denetlenmez (BEKCI_TARIFI md.19/2).
    for (const k of aktifKutular()) {
      const metin = oku(k.kutuMd);
      if (metin === null) continue;
      const durus = blokKes(metin, '## Duruş sözleşmesi');
      if (durus) {
        for (const alan of ['BİTİŞ HÂLİ', 'KANIT', 'KISIT', 'BÜTÇE']) {
          const satir = durus.satirlar.find((s) => new RegExp('^\\s*' + alan + '\\s*:').test(s));
          const deger = satir ? satir.slice(satir.indexOf(':') + 1).trim() : '';
          if (!satir || !deger || deger.includes('«')) {
            bulgu(dusur('UYARI'), 'şema', 'durus-ve-risk', 'duruş/risk bloğu biçimsiz: ' + k.rel + " '" + alan + ":' satırı yok/boş");
          }
        }
        const liste = durus.satirlar.find((s) => /^\s*LİSTE\s*:/.test(s));
        if (liste && !/dönem\s+içinde\s+doğar/.test(liste)) {
          bulgu(dusur('UYARI'), 'şema', 'durus-ve-risk', 'duruş/risk bloğu biçimsiz: ' + k.rel + " LİSTE değeri birebir 'dönem içinde doğar' değil");
        }
      }
      const risk = blokKes(metin, '## Bağımlılık ve risk');
      if (risk) {
        risk.satirlar.slice(1).forEach((s, i) => {
          if (!s.trim() || s.startsWith('<!--') || s.startsWith('#')) return;
          if (!/^\s*(G-\d+)\s*:\s*onkosul=([^·]*)·\s*risk=(düşük|riskli)\s*—\s*(.+)$/.test(s)) {
            bulgu(dusur('UYARI'), 'şema', 'durus-ve-risk', 'duruş/risk bloğu biçimsiz: ' + k.rel + ' satır ' + (risk.bas + 1 + i + 1));
          }
        });
      }
    }
  });

  goz('şema', 'dis-goz-brifingi', () => {
    // Evre çapası (tasarı düzeltmesi): dönem açıksa yalnız evre 'kapanis'te ölçülür; dönem yoksa
    // görev-durumu tetikler (BEKCI_TARIFI md.20). Sınıf KAPANIŞ KİLİDİdir, duran kapı değil.
    if (PENCERE === 'kurulum') { return; }
    const brifingRel = '03_roller/disgoz/BRIFING.md';
    let kapanista = false;
    let donemId = null;
    const gosterge = oku(join(KOK, 'tools', 'sevk', '.donem-acik'));
    if (gosterge !== null) {
      const alanlar = (gosterge.split('\n')[0] || '').split('\t');
      donemId = alanlar[0] || null;
      const evre = alanlar[2] || 'yapim';
      if (evre !== 'kapanis') { bulgu('BILGI', 'şema', 'dis-goz-brifingi', 'evre ' + evre + ' — brifing gözü yalnız kapanış evresinde ölçer'); return; }
      kapanista = true;
    } else {
      for (const k of aktifKutular()) {
        const metin = oku(k.kutuMd);
        if (metin === null) continue;
        const gorevler = gorevleriOku(metin);
        if (gorevler.length && gorevler.every((g) => ['kapalı', 'mühür-bekliyor', 'pas'].includes(g.durum))) kapanista = true;
        if (gorevler.some((g) => ['açık', 'sürüyor'].includes(g.durum))) { kapanista = false; break; }
      }
    }
    if (!kapanista) return;
    // Taze sayılan üç hâl: bu döneme ait brifing zarf kaydı · taban'dan sonra commit · şu an kirli.
    if (donemId !== null) {
      const gunluk = oku(join(KOK, '00_pano', 'zarf-gunlugu.jsonl')) || '';
      const kayitVar = gunluk.split('\n').some((s) => {
        try { const j = JSON.parse(s); return j.tip === 'brifing' && j.donem === donemId; } catch { return false; }
      });
      if (kayitVar) return;
    }
    const taban = (oku(join(KOK, '02_kanon', 'kilitli', '.taban-ref')) || '').trim();
    if (!/^[0-9a-f]{40}$/.test(taban)) {
      bulgu('BILGI', 'şema', 'dis-goz-brifingi', 'kilitli-tarih çapası yok/bozuk — brifing tazeliği ölçülemedi (çift alarm üretilmez, kilitli-tarih gözü basar)');
      return;
    }
    const yeni = gitDene(['log', '--format=%h', taban + '..HEAD', '--', brifingRel]);
    const kirli = gitDene(['status', '--porcelain', '--', brifingRel]);
    if ((yeni.ok && yeni.cikti.trim()) || (kirli.ok && kirli.cikti.trim())) return;
    bulgu('KILIT', 'şema', 'dis-goz-brifingi', 'dış göz brifingi bayat/yok — kutu kapanışı kilitli (D7 dördüncüsü)');
  });

  goz('şema', 'kanal', () => {
    // Yokluk denetlenmez; MEVCUTSA --sig yoklaması HAZIR demeli (BEKCI_TARIFI md.21/1). Ağa çıkılmaz.
    if (PENCERE === 'kurulum') return;
    if (!dosyaMi(join(KOK, 'tools', 'sevk', 'kanal.conf'))) return;
    const yoklayici = join(KOK, 'tools', 'sevk', 'kanal-yokla.sh');
    if (!dosyaMi(yoklayici)) { bulgu('UYARI', 'şema', 'kanal', 'haber kanalı yapılandırılmış ama hazır değil: kanal-yokla.sh yok'); return; }
    let cikti = ''; let kod = 0;
    try { cikti = execFileSync('bash', [yoklayici, '--sig'], { cwd: KOK, encoding: 'utf8' }); }
    catch (e) { kod = e.status === null || e.status === undefined ? 1 : e.status; cikti = (e.stdout || '') + ''; }
    const ilk = (cikti.split('\n')[0] || '').trim();
    if (kod !== 0 || ilk !== 'HAZIR') {
      bulgu('UYARI', 'şema', 'kanal', 'haber kanalı yapılandırılmış ama hazır değil: ' + (ilk || 'yoklama çıktı vermedi'));
    }
  });

  goz('şema', 'watchdog', () => {
    // Dosyada duran ölü kural bu ailenin en pahalı ders sınıfıdır (BEKCI_TARIFI md.21/2).
    if (PENCERE === 'kurulum') return;
    const isaret = oku(join(KOK, 'tools', 'sevk', 'watchdog-kurulu'));
    if (isaret === null) return;
    const etiket = (isaret.split('\n').find((s) => s.startsWith('etiket=')) || '').slice('etiket='.length).trim();
    if (!etiket) { bulgu('DURDURAN', 'şema', 'watchdog', 'watchdog işaretinde etiket= satırı yok — koruma kâğıt üstünde'); return; }
    let launchctlVar = true;
    try { execFileSync('launchctl', ['print', 'gui/' + process.getuid() + '/' + etiket], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
    catch (e) {
      if (e.code === 'ENOENT') { launchctlVar = false; }
      else { bulgu('DURDURAN', 'şema', 'watchdog', 'watchdog işareti var ama iş yüklü değil (' + etiket + ') — koruma kâğıt üstünde'); return; }
    }
    if (!launchctlVar) { bulgu('BILGI', 'şema', 'watchdog', 'launchctl yok — watchdog gözü bu ortamda ölçülemedi (ilan; sözleşme §7)'); return; }
    const damga = oku(join(KOK, 'tools', 'sevk', '.nabiz-son'));
    const yasDk = damga === null ? Infinity : (Date.now() - new Date(damga.trim()).getTime()) / 60000;
    if (!(yasDk <= 20)) bulgu('DURDURAN', 'şema', 'watchdog', 'watchdog işareti var ama nabız bayat/yok — koruma kâğıt üstünde');
  });

  if (kadran === 'tam') {
    goz('şema', 'olcut-diff', () => {
      // Ölçüt dokunulmazlığı (EL_KITABI Kutu döngüsü 4): taban = 02_kanon/kilitli/.taban-ref
      // (ölçüt-diff taban ref'iyle AYNI çapa — BEKCI_TARIFI md.16). Çapa bozuksa kilitli-tarih basar.
      const taban = (oku(join(KOK, '02_kanon', 'kilitli', '.taban-ref')) || '').trim();
      if (!/^[0-9a-f]{40}$/.test(taban) || !GIT_VAR) return;
      for (const k of aktifKutular()) {
        const simdiki = oku(k.kutuMd);
        if (simdiki === null) continue;
        const eskiDene = gitDene(['show', taban + ':' + k.rel]);
        if (!eskiDene.ok) continue; // kutu taban'dan sonra doğdu — diff tabanı yok
        const kes = (metin) => { const b = blokKes(metin, '## Kabul kriterleri'); return b ? b.satirlar.join('\n') : null; };
        const eski = kes(eskiDene.cikti);
        const yeni = kes(simdiki);
        if (eski !== null && eski !== yeni) {
          bulgu(dusur('UYARI'), 'şema', 'olcut-diff', 'kabul ölçütü açılıştan beri değişmiş: ' + k.rel + ' — mühürlü değişiklik mi? sahibe not');
        }
      }
    });

    goz('şema', 'kapanis-disi-el-kitabi', () => {
      // F6: EL_KITABI yalnız retro + sahip onayı + tek commit'te değişir. Git yoksa kilitli-tarih
      // gözü zaten fail-closed basar — çift alarm üretilmez.
      if (!GIT_VAR || EK_METIN === null) return;
      const kirli = gitDene(['status', '--porcelain', '--', '02_kanon/EL_KITABI.md']);
      if (kirli.ok && kirli.cikti.trim()) {
        bulgu(dusur('DURDURAN'), 'şema', 'kapanis-disi-el-kitabi', 'EL_KITABI commit-dışı değişmiş (F6: yalnız retro + sahip onayı + tek commit)');
        return;
      }
      if (PENCERE !== 'isletim') return;
      const son = gitDene(['log', '-1', '--format=%s', '--', '02_kanon/EL_KITABI.md']);
      const konu = son.ok ? son.cikti.trim() : '';
      if (konu && !konu.includes('retro') && !konu.includes('genesis')) {
        bulgu('DURDURAN', 'şema', 'kapanis-disi-el-kitabi', "EL_KITABI son değişikliği retro-commit'i değil: '" + konu + "' (F6)");
      }
    });

    goz('şema', 'arsiv-kutulari', () => {
      const arsiv = join(KOK, '01_kutular', '_arsiv');
      for (const ad of (dizin(arsiv) || []).filter((a) => a.startsWith('KT-')).sort()) {
        const metin = oku(join(arsiv, ad, 'KUTU.md'));
        if (metin === null) continue;
        const rel = '01_kutular/_arsiv/' + ad + '/KUTU.md';
        // Arşivde faz ayrımı yapılmaz: kapanmış kutuda HER satır kapanmış olmalı (beyan).
        for (const s of metin.split('\n')) {
          const m = s.match(/^\|\s*(G-\d+)\b/);
          if (!m) continue;
          const hucreler = s.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((h) => h.trim());
          const durum = (hucreler[3] || '').split(/[—–]/)[0].trim();
          if (durum === 'açık' || durum === 'sürüyor') {
            bulgu(dusur('UYARI'), 'şema', 'arsiv-kutulari', 'arşive giden kutuda açık görev: ' + rel + ' ' + m[1]);
          }
        }
        const retro = blokKes(metin, '## Retro');
        if (!retro) { bulgu(dusur('UYARI'), 'şema', 'arsiv-kutulari', 'arşivde retro bloğu yok: ' + rel); continue; }
        const icerik = retro.satirlar.filter((s) => s.trim() && !s.startsWith('#')).length;
        if (icerik === 0) bulgu(dusur('UYARI'), 'şema', 'arsiv-kutulari', 'arşivde retro bloğu boş: ' + rel);
      }
    });
  } else {
    bulgu('BILGI', 'şema', 'kadran', 'TAM gözleri (ölçüt-diff · kapanış-dışı EL_KITABI · arşiv · golden-tazelik) bu kadranda kapalı');
  }

  goz('şema', 'bos-backlog', () => {
    if (aktifKutular().length === 0) {
      bosBacklog = true;
      bulgu('BILGI', 'şema', 'bos-backlog', 'aktif kutu yok — insan girdisi bekleniyor (D9)');
    }
  });

  // ═══ kategori: koruma-hattı ════════════════════════════════════════════════
  goz('koruma-hattı', 'kablo', () => {
    // HER ZAMAN TAM — kurulum penceresinde de (sözleşme §3 kural 1; BEKCI_TARIFI md.16 i).
    const ayarMetin = oku(join(KOK, '.claude', 'settings.json'));
    let ayarlar = null;
    if (ayarMetin !== null) { try { ayarlar = JSON.parse(ayarMetin); } catch { } }
    if (!ayarlar) bulgu('DURDURAN', 'koruma-hattı', 'kablo', '.claude/settings.json yok/bozuk');
    else {
      const kanca = ayarlar.hooks || {};
      const s = (x) => JSON.stringify(x || '');
      if (!s(kanca.PreToolUse).includes('file-guard.sh')) bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'PreToolUse file-guard girdisi yok');
      const devir = (Array.isArray(kanca.PreToolUse) ? kanca.PreToolUse : []).some((e) => e && e.matcher === 'Task|Agent' && s(e).includes('devir-kapisi.sh'));
      if (!devir) bulgu('DURDURAN', 'koruma-hattı', 'kablo', "PreToolUse 'Task|Agent' devir kapısı girdisi yok");
      if (!s(kanca.Stop).includes('sevk.sh')) bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'Stop sevk.sh girdisi yok');
      if (!s(kanca.Stop).includes('kurulum-surucu.sh')) bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'Stop kurulum-surucu.sh girdisi yok');
      const ss = Array.isArray(kanca.SessionStart) ? kanca.SessionStart : [];
      for (const eslesme of ['startup', 'clear']) {
        const girdi = ss.find((e) => e && e.matcher === eslesme);
        if (!girdi || !s(girdi).includes('.aktif-rol') || !s(girdi).includes('acilis.sh')) {
          bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'SessionStart ' + eslesme + ' girdisi eksik (rol-temizliği + acilis.sh)');
        }
      }
      if (!s(kanca.SessionEnd).includes('kapanis.sh')) bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'SessionEnd kapanış girdisi yok');
      if (!s(kanca.SubagentStop).includes('zarf-bicim-kapisi.sh')) bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'SubagentStop zarf-biçim girdisi yok');
    }
    for (const f of ['tools/guard/file-guard.sh', 'tools/guard/rol-ac.sh', 'tools/guard/kapanis.sh', 'tools/guard/acilis.sh',
      'tools/guard/kurulum-surucu.sh', 'tools/guard/porcelain.sh', 'tools/guard/korunan-yollar.txt',
      'tools/guard/icerik-suzgeci.sh', 'tools/guard/gercek-veri-isaretleri.txt',
      'tools/sevk/sevk.sh', 'tools/sevk/zarf-ekle.sh', 'tools/sevk/zarf-bicim-kapisi.sh']) {
      if (oku(join(KOK, f)) === null) bulgu('DURDURAN', 'koruma-hattı', 'kablo', 'kablo eksik: ' + f);
    }
  });

  goz('koruma-hattı', 'korunan-yol-kirliligi', () => {
    // file-guard grameriyle AYNI okuma (file-guard.sh:220-232): '#' yorum · [SERT]/[SORULUR] bölüm ·
    // sondaki '/' dizin-öneki. Durum harfi ayırt edilmez: dokunan HER porcelain satırı kirliliktir.
    const liste = oku(join(KOK, 'tools', 'guard', 'korunan-yollar.txt'));
    if (liste === null) return; // yokluğu kablo gözü DURDURAN basar — çift alarm üretilmez
    let bolum = '';
    const kurallar = [];
    for (const ham of liste.split('\n')) {
      const satir = ham.replace(/\r$/, '').trimEnd();
      if (!satir || satir.trimStart().startsWith('#')) continue;
      if (satir === '[SERT]' || satir === '[SORULUR]') { bolum = satir; continue; }
      if (bolum) kurallar.push({ bolum, yol: satir });
    }
    if (!kurallar.length) return;
    const durum = gitDene(['status', '--porcelain']);
    if (!durum.ok) { bulgu(dusur('DURDURAN'), 'koruma-hattı', 'korunan-yol-kirliligi', 'git status koşamadı — kirlilik denetlenemedi (fail-closed)'); return; }
    for (const satir of durum.cikti.split('\n')) {
      if (!satir) continue;
      const ham = satir.slice(3);
      for (let y of (ham.includes(' -> ') ? ham.split(' -> ') : [ham])) {
        y = y.trim().replace(/^"|"$/g, '');
        if (y.startsWith('.claude/worktrees/')) continue; // meşru riskli-görev worktree'si (E2 notu)
        for (const k of kurallar) {
          const dizinKurali = k.yol.endsWith('/');
          const vurdu = dizinKurali ? (y === k.yol.slice(0, -1) || y.startsWith(k.yol)) : y === k.yol;
          if (!vurdu) continue;
          if (k.bolum === '[SERT]') bulgu(dusur('DURDURAN'), 'koruma-hattı', 'korunan-yol-kirliligi', '[SERT] yolda commit-dışı değişim: ' + y);
          else bulgu(dusur('UYARI'), 'koruma-hattı', 'korunan-yol-kirliligi', '[SORULUR] yolda commit-dışı değişim (meşru olabilir; sahibe not): ' + y);
          break;
        }
      }
    }
  });

  goz('koruma-hattı', 'kilitli-tarih', () => {
    // Araç hattı kabuk-yazımını görmez; bu göz git TARİHİNİ izletir (BEKCI_TARIFI md.16 iii).
    // Sinyal sahip taban-ref'i ilerletene kadar HER denetimde basılır — KALICIDIR.
    const tabanYolu = join(KOK, '02_kanon', 'kilitli', '.taban-ref');
    const ham = oku(tabanYolu);
    if (ham === null || !ham.trim()) {
      bulgu(dusur('DURDURAN'), 'koruma-hattı', 'kilitli-tarih', PENCERE === 'kurulum'
        ? "taban-ref henüz yok (G4'te doğar)" : 'taban-ref yok/boş (02_kanon/kilitli/.taban-ref) — göz çapasız (fail-closed)');
      return;
    }
    const taban = ham.split('\n')[0].trim();
    if (!/^[0-9a-f]{40}$/.test(taban)) {
      bulgu(dusur('DURDURAN'), 'koruma-hattı', 'kilitli-tarih', "taban-ref 40'lık commit-hash değil ('" + taban + "') — sembolik ref kendini izleyen çapadır (fail-closed)");
      return;
    }
    if (!GIT_VAR || !gitDene(['cat-file', '-e', taban + '^{commit}']).ok) {
      bulgu(dusur('DURDURAN'), 'koruma-hattı', 'kilitli-tarih', 'taban-ref geçersiz commit (' + taban + ') ya da git yok — fail-closed');
      return;
    }
    const ihlal = gitDene(['log', '--format=%h', '--diff-filter=MDRT', taban + '..HEAD', '--', '02_kanon/kilitli/', ':(exclude)02_kanon/kilitli/.taban-ref']);
    const ekleme = gitDene(['log', '--format=%h', '--diff-filter=A', taban + '..HEAD', '--', '02_kanon/kilitli/', ':(exclude)02_kanon/kilitli/.taban-ref']);
    if (!ihlal.ok || !ekleme.ok) { bulgu(dusur('DURDURAN'), 'koruma-hattı', 'kilitli-tarih', 'git-log koşamadı — fail-closed'); return; }
    const ihlalListe = ihlal.cikti.trim().split('\n').filter(Boolean);
    const eklemeListe = ekleme.cikti.trim().split('\n').filter(Boolean);
    if (ihlalListe.length) bulgu(dusur('DURDURAN'), 'koruma-hattı', 'kilitli-tarih', 'kilitli karar DEĞİŞTİRİLMİŞ/SİLİNMİŞ (' + ihlalListe.slice(0, 3).join(' ') + ') — kilitli düzenlenmez; sahip kararı + taban-ref ilerletmesi gerekir');
    if (eklemeListe.length) bulgu(dusur('UYARI'), 'koruma-hattı', 'kilitli-tarih', 'kilitliye YENİ dosya eklendi (' + eklemeListe.slice(0, 3).join(' ') + ') — mühürlü mü? onaylıysa taban-ref sahip onayıyla ilerletilir');
  });

  // ═══ kategori: bağ-varlık ══════════════════════════════════════════════════
  goz('bağ-varlık', 'kanit-isaretcisi', () => {
    // Dar ve mekanik yol tespiti (BEKCI_TARIFI md.17): test:/demo: serbest işaretçi (önek sonrası
    // en az bir sözcük) · boşluksuz + bilinen kök → vault-yolu (varlık denetimi) · kalan serbest
    // metin yol SANILMAZ (yanlış bulgu üretilmez — bekçi yalnız BAĞI denetler). Kanon-fakir
    // esneme bağ-varlığa uygulanmaz. Kanıt sütunsuz eski tablo bulgu üretmez (geri-uyum).
    const kokler = ['00_pano/', '01_kutular/', '02_kanon/', '03_roller/', 'tools/',
      ...conf.urun_yollari.map((y) => (y.includes('.') ? y : y.replace(/\/$/, '') + '/'))];
    for (const k of aktifKutular()) {
      const metin = oku(k.kutuMd);
      if (metin === null) continue;
      for (const g of gorevleriOku(metin)) {
        if (g.hucreSayisi < 5) continue;
        const kanit = (g.kanit || '').trim();
        if (!kanit || kanit === '—') { bulgu(dusur('UYARI'), 'bağ-varlık', 'kanit-isaretcisi', 'işaretçisiz görev: ' + g.id + ' (' + k.rel + ')'); continue; }
        if (kanit === 'test:' || kanit === 'demo:') { bulgu(dusur('UYARI'), 'bağ-varlık', 'kanit-isaretcisi', 'boş işaretçi (yalnız önek): ' + g.id + ' (' + k.rel + ')'); continue; }
        if (kanit.startsWith('test:') || kanit.startsWith('demo:')) continue;
        if (kanit.includes(' ')) continue;
        const vaultYolu = kokler.some((kk) => kanit === kk.replace(/\/$/, '') || kanit.startsWith(kk));
        if (!vaultYolu) continue;
        if (!existsSync(join(KOK, kanit))) {
          bulgu(dusur('UYARI'), 'bağ-varlık', 'kanit-isaretcisi', 'kanıt-işaretçisi kopuk: ' + g.id + ' → ' + kanit);
        }
      }
    }
  });

  // ═══ kategori: golden-tazelik (yalnız TAM kadran) ═════════════════════════
  if (kadran === 'tam') {
    goz('golden-tazelik', 'golden-tazeligi', () => {
      const goldenRel = conf.golden_dizini;
      const goldenYolu = join(KOK, goldenRel);
      const icerik = (dizin(goldenYolu) || []).filter((a) => !a.startsWith('README') && a !== '.DS_Store');
      if (!dizinMi(goldenYolu) || icerik.length === 0) {
        bulgu('BILGI', 'golden-tazelik', 'golden-tazeligi', 'golden henüz yok/boş — kanon-fakir, içerik denetimi kutu kapanışında (EL_KITABI_KALIBI kanon-fakir esnemesi)');
        return;
      }
      if (!GIT_VAR) { bulgu(dusur('DURDURAN'), 'golden-tazelik', 'golden-tazeligi', 'git yok — golden tazeliği ölçülemedi (fail-closed)'); return; }
      const goldenZaman = gitDene(['log', '-1', '--format=%ct', '--', goldenRel]);
      if (!goldenZaman.ok) { bulgu(dusur('DURDURAN'), 'golden-tazelik', 'golden-tazeligi', 'git log hatası — golden tazeliği ölçülemedi (fail-closed)'); return; }
      if (!goldenZaman.cikti.trim()) { bulgu(dusur('DURDURAN'), 'golden-tazelik', 'golden-tazeligi', "golden git'te izlenmiyor — tazelik ölçülemedi (fail-closed)"); return; }
      if (!conf.urun_yollari.length) {
        bulgu('BILGI', 'golden-tazelik', 'golden-tazeligi', 'ürün yolları ilan edilmemiş (bekci.conf urun_yollari) — karşılaştırma tabanı yok (K-01 ilanı bekleniyor)');
        return;
      }
      let urunZaman = 0;
      for (const yol of conf.urun_yollari) {
        const z = gitDene(['log', '-1', '--format=%ct', '--', yol]);
        if (!z.ok) { bulgu(dusur('DURDURAN'), 'golden-tazelik', 'golden-tazeligi', 'git log hatası (' + yol + ') — ölçülemedi (fail-closed)'); return; }
        if (z.cikti.trim()) urunZaman = Math.max(urunZaman, Number(z.cikti.trim()));
      }
      if (urunZaman === 0) { bulgu('BILGI', 'golden-tazelik', 'golden-tazeligi', 'ürün yollarında commit yok — golden bayatlayamaz (kanon-fakir)'); return; }
      if (Number(goldenZaman.cikti.trim()) < urunZaman) {
        bulgu(dusur('UYARI'), 'golden-tazelik', 'golden-tazeligi', 'golden, ürün kodundan eski — golden güncellemesi sahip mührü ister (F4)');
      }
    });

    goz('golden-tazelik', 'golden-import', () => {
      // 'Kod kendi oracle'ı olamaz' (G3a): golden dizinindeki test/kod dosyasında ürün modülü
      // import'u DURDURAN. Beyan: dosya kümesi = golden dizini altındaki .mjs/.js/.cjs/.ts;
      // 'üretim modülü' = çözülen yolun bekci.conf urun_yollari altına düşmesi.
      const goldenYolu = join(KOK, conf.golden_dizini);
      if (!dizinMi(goldenYolu) || !conf.urun_yollari.length) return;
      const yigin = [conf.golden_dizini];
      while (yigin.length) {
        const rel = yigin.pop();
        for (const ad of dizin(join(KOK, rel)) || []) {
          const altRel = rel + '/' + ad;
          if (dizinMi(join(KOK, altRel))) { yigin.push(altRel); continue; }
          if (!/\.(mjs|js|cjs|ts)$/.test(ad)) continue;
          const metin = oku(join(KOK, altRel)) || '';
          const desen = /(?:from\s+['"]([^'"]+)['"])|(?:require\(\s*['"]([^'"]+)['"]\s*\))|(?:import\(\s*['"]([^'"]+)['"]\s*\))/g;
          for (const m of metin.matchAll(desen)) {
            const belirtec = m[1] || m[2] || m[3];
            if (!belirtec || (!belirtec.startsWith('.') && !belirtec.startsWith('/'))) continue;
            const cozulen = belirtec.startsWith('/') ? belirtec : relative(KOK, resolve(KOK, dirname(altRel), belirtec));
            if (conf.urun_yollari.some((y) => cozulen === y || cozulen.startsWith(y.replace(/\/$/, '') + '/'))) {
              bulgu(dusur('DURDURAN'), 'golden-tazelik', 'golden-import', "golden testinde üretim modülü import'u: " + altRel + ' → ' + belirtec + " (kod kendi oracle'ı olamaz)");
            }
          }
        }
      }
    });
  }
}

// ── kapsama izi: her kategori için tek BİLGİ (SAGLIK'ta görünür kapsam — saha emsali) ──
for (const kat of ['tavan', 'şema', 'koruma-hattı', 'bağ-varlık']) bulgu('BILGI', kat, 'kapsam', 'tarandı');
if (kadran === 'tam' && conf) bulgu('BILGI', 'golden-tazelik', 'kapsam', 'tarandı');

// ── sayaçlar ─────────────────────────────────────────────────────────────────
const sayac = { DURDURAN: 0, KILIT: 0, UYARI: 0, BILGI: 0 };
for (const b of bulgular) sayac[b.hal]++;

// ── çıktı yüzeyleri: SAGLIK + PANO (biçim = PANO_SOZLESMESI, kırmızı çizgi) ──
// Işık eşlemesi (beyan): AKIŞ kırmızısı yalnız DURDURAN'dan doğar (duran kapı); DOSYA kırmızısı
// DURDURAN ya da KİLİT'ten (kapanış kilidi de sahibin tek ezberinde görünmeli).
const AKIS = sayac.DURDURAN > 0 ? 'KIRMIZI' : (bosBacklog ? 'BEKLEME' : 'YEŞİL');
const DOSYA = (sayac.DURDURAN > 0 || sayac.KILIT > 0) ? 'KIRMIZI' : (sayac.UYARI > 0 ? 'SARI' : 'YEŞİL');
const panoDizini = join(KOK, '00_pano');
const saglikYolu = join(panoDizini, 'SAGLIK.md');
const SEV = { DURDURAN: 'KIRMIZI', KILIT: 'KIRMIZI', UYARI: 'SARI', BILGI: 'i' };

function damgala() {
  const s = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return s.getFullYear() + '-' + p(s.getMonth() + 1) + '-' + p(s.getDate()) + ' ' + p(s.getHours()) + ':' + p(s.getMinutes());
}

if (dizinMi(panoDizini)) {
  try {
    const eskiSaglik = oku(saglikYolu) || '';
    const eskiSayi = eskiSaglik.match(/\((?:denetim|koşu) #(\d+)\)/);
    const denetimNo = eskiSayi ? Number(eskiSayi[1]) + 1 : 1;
    const damga = damgala();
    const kalemSatiri = (b) => '- [' + SEV[b.hal] + '] [' + b.kategori + '] ' + b.goz + ': ' + b.metin;
    const sirali = ['DURDURAN', 'KILIT', 'UYARI', 'BILGI'].flatMap((h) => bulgular.filter((b) => b.hal === h));
    const saglik = '<!-- yazar: bekci-betigi — elle dokunma -->\n'
      + '# SAGLIK — son denetim: ' + damga + ' (denetim #' + denetimNo + ')\n\n'
      + '**Işıklar:** AKIŞ=' + AKIS + ' · DOSYA=' + DOSYA + '\n\n## Kalemler\n'
      + sirali.map(kalemSatiri).join('\n') + '\n'
      + (arizalar.length ? arizalar.map((a) => '- [KIRMIZI] arıza: ' + a).join('\n') + '\n' : '')
      + '\nKural: bu dosyada TAZE tarih damgası yoksa sistem KIRMIZI sayılır (sahibin tek ezberi).\n';
    writeFileSync(saglikYolu, saglik);

    // PANO mekanik blok — yalnız bekçi yazar; YARGI bloğu korunur (F1 istisna 1).
    const panoYolu = join(panoDizini, 'PANO.md');
    const eskiPano = oku(panoYolu) || '';
    let yargi = '';
    const yargiBas = eskiPano.indexOf('## YARGI BLOĞU');
    if (yargiBas !== -1) yargi = eskiPano.slice(yargiBas).replace(/\s+$/, '');
    if (!yargi) yargi = '## YARGI BLOĞU — yazar: koordinator\n- **Aktif kutu:** —\n- **SIRADAKİ OTURUM:** —\n- **Blokaj:** yok';
    let gorevler = '—';
    const ciftler = [];
    for (const k of aktifKutular()) {
      const metin = oku(k.kutuMd);
      if (metin === null) continue;
      for (const g of gorevleriOku(metin)) ciftler.push(g.id + '=' + g.durum);
    }
    if (ciftler.length) gorevler = ciftler.join(' · ');
    let bekleyen = 0;
    const kuyruk = oku(join(panoDizini, 'SENDE_BEKLEYEN.md'));
    if (kuyruk !== null) bekleyen = kuyruk.split('\n').filter((s) => s.startsWith('- [ ]')).length;
    const pano = '<!-- yazar: bekci-betigi (MEKANİK BLOK) + koordinator (YARGI BLOĞU) -->\n# PANO\n\n'
      + '## MEKANİK BLOK — yalnız bekçi yazar\n```\n'
      + 'Son denetim: ' + damga + ' (denetim #' + denetimNo + ')\n'
      + 'Işıklar: AKIŞ=' + AKIS + ' · DOSYA=' + DOSYA + '\n'
      + 'Görevler: ' + gorevler + '\n'
      + 'Bekleyen sorular: —\n'
      + 'Sahipte bekleyen: ' + bekleyen + '\n'
      + (bosBacklog ? 'Durak: insan girdisi bekleniyor (D9)\n' : '')
      + 'Kırmızı: ' + (sayac.DURDURAN + sayac.KILIT) + ' · Sarı: ' + sayac.UYARI + '\n```\n\n'
      + yargi + '\n';
    writeFileSync(panoYolu, pano);
  } catch (e) {
    arizalar.push('[yüzey] SAGLIK/PANO yazılamadı: ' + (e && e.message ? e.message : String(e)));
  }
}

// ── stdout: insan satırları + SON satır makine satırı ────────────────────────
for (const b of bulgular) {
  process.stdout.write(HAL_GORUNUM[b.hal] + ' [' + b.kategori + '] ' + b.goz + ': ' + b.metin + '\n');
}
for (const a of arizalar) process.stdout.write('ARIZA ' + a + '\n');
process.stdout.write('BEKCI v1'
  + ' durduran=' + sayac.DURDURAN + ' kilit=' + sayac.KILIT + ' uyari=' + sayac.UYARI
  + ' bilgi=' + sayac.BILGI + ' ariza=' + arizalar.length
  + ' kadran=' + kadran + ' pencere=' + PENCERE + '\n');

process.exit(arizalar.length > 0 ? 2 : (sayac.DURDURAN > 0 ? 1 : 0));
