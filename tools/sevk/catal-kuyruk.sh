#!/bin/bash
# catal-kuyruk — sahibe giden çatalın kuyruk mekaniği (E3): CEVAP-BEKLİYOR durumu + mekanik ekleme.
# Kaynağı: tasarım §7.1 ("sessizlik onay değildir" üç mekaniği) + D-21 kalıcı kuyruğu.
# Kuyruk dosyası 00_pano/SENDE_BEKLEYEN.md'dir — AYRI kuyruk açılmaz (D-21: madde SİLİNMEZ,
# tavan 2KB, madde başına TEK satır). ÇATAL maddesi o kuyruğun bir SINIFIDIR:
#   - [ ] <tarih> · <rol> · ÇATAL Ç-NN · "<çeviri>" · etki: <etki> · bekletir: G-.. · kaynak: zarf-günlüğü satır N
# Cevaplanınca aynı satır: "- [x] … · cevap: "<sahip cevabı>" · <tarih>" (D-21 biçimi korunur).
#
# İki kip:
#   --durum            → her ÇATAL maddesi için TSV: Ç-NN <tab> DURUM <tab> bekletir <tab> sebep
#                        DURUM ∈ CEVAP-BEKLIYOR | CEVAPLANDI | CEVIRI-KUSURU
#   --ekle <G-NN>      → zarf günlüğünden o görevin SON "ÇATAL dolu" zarfını okur, sahip-yüzeyi
#                        metnini ORADAN alır (denetçinin kaleminden değil — §9 sahip-atfı kuralı),
#                        Ç-NN türetir, tekilleştirir, kuyruğa tek satır ekler.
#                        stdout: "EKLENDI\tÇ-NN" | "ATLANDI\t<sebep>"
#   --not izin <G-NN> <dönem> → ÇATAL DEĞİL, bilgi maddesi (F1-5f): otonom dönemde izin kapısına
#                        takılıp ATLANAN adımı sahibin kuyruğuna düşürür. Cümle SABİT ŞABLONDUR
#                        (serbest metin yasağı: ajanın kalemi sahip yüzeyine geçmez); tekilleştirme
#                        kaynak imzasıyla. Bu madde ÇATAL sınıfı olmadığı için hiçbir işi KİLİTLEMEZ
#                        — sahibin görmesi gereken bir haberdir, cevap beklenen bir soru değil.
# FAIL-CLOSED: geçersiz girdi / okunamayan günlük / yazım hatası → exit 1 + stderr gerekçe.
# Türkçe harf güvenliği: eşleştirme birebir bayt; küçük-harfe indirgeme YALNIZ ASCII üzerinde
#   (tr komutu İ/ı bozmasın diye node tarafında ve yalnız desen listesinde yapılır).
set -uo pipefail
export LC_ALL=C.UTF-8

hata() { printf 'catal-kuyruk HATA: %s\n' "$1" >&2; exit 1; }
trap 'hata "ic hata (fail-closed): arac beklenmedik durdu (satir $LINENO)"' ERR

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[ -d "$KOK/00_pano" ] || hata "vault degil (00_pano yok): $KOK"
KUYRUK="$KOK/00_pano/SENDE_BEKLEYEN.md"
GUNLUK="$KOK/00_pano/zarf-gunlugu.jsonl"

# node keşfi ORTAK KİTAPLIKTAN (E4: tools/sevk/ortak.sh; D-02 dersi — tek ev)
ORTAK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ortak.sh"
[ -r "$ORTAK" ] || hata "ortak kitaplik yok ($ORTAK) — sevk ailesi eksik (fail-closed)"
# shellcheck source=/dev/null
. "$ORTAK"
node_bul || hata "node bulunamadi (fail-closed)"

# ── ORTAK JS ÖNEKİ (tek ev — D-02) ────────────────────────────────────────────────────────
# Üç şey burada TEK kez tanımlanır ve her node bloğuna önekelenir:
#   kis()        → sahip-yüzeyi metnini kuyruk satırının KENDİ yapı işaretlerinden arındırır
#                  (· ayracı · tırnak · cevap:/bekletir:/kaynak:/devretti: anahtarları) ve
#                  BAYT tabanlı kırpar (Türkçe harf UTF-8'de 2 bayt; karakter sayısı yanıltır).
#   asciiKucuk() → yalnız ASCII küçültme (tr komutu İ/ı bozar)
#   ANLAMADIM    → "anlamadım" sınıfı, VERİ dosyasından (tools/sevk/cevap-sozlugu.txt)
# GEREKÇE (hasım bulgusu, dört mercek — F1-5g): kis() eskiden yalnız `--ekle` bloğunun içinde
# yaşıyordu. Uzaktan cevap yolu ikinci bir yazıcı doğurunca aynı temizlik orada KOŞMUYORDU ve
# tırnak içeren olağan bir seçenek metni maddeyi "boş cevap" yapıp işi KALICI olarak
# kilitliyordu — kanalın var oluş sebebinin tam tersi.
SOZLUK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/cevap-sozlugu.txt"
[ -r "$SOZLUK" ] || hata "cevap sozlugu yok ($SOZLUK) — 'anlamadim' sinifi taninamaz (fail-closed)"
JS_ORTAK='
import { readFileSync as _oku } from "node:fs";
const bayt = (s) => Buffer.byteLength(s, "utf8");
const kis = (s, n) => {
  let t = String(s || "").replace(/[`*"\n]/g, " ").replace(/·/g, "-")
    .replace(/\b(cevap|bekletir|kaynak|devretti)\s*:/gi, "$1 -")
    .replace(/ÇATAL\s+Ç-\d+/g, "çatal").replace(/\s+/g, " ").trim();
  if (bayt(t) <= n) return t;
  while (bayt(t) > n - 3 && t.length) t = t.slice(0, -1);
  return t + "…";
};
const asciiKucuk = (s) => String(s).replace(/[A-Z]/g, (c) => c.toLowerCase());
const ANLAMADIM = _oku(process.env.SOZLUK_YOL, "utf8").split("\n")
  .map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map(asciiKucuk);
if (!ANLAMADIM.length) { console.error("cevap sozlugu bos"); process.exit(1); }
'

KIP="${1:-}"

case "$KIP" in
  --durum)
    KUYRUK_YOL="$KUYRUK" SOZLUK_YOL="$SOZLUK" "$NODE_BIN" --input-type=module -e "$JS_ORTAK"'
import { readFileSync, existsSync } from "node:fs";
const yol = process.env.KUYRUK_YOL;
if (!existsSync(yol)) process.exit(0);           // kuyruk yoksa açık çatal da yok
const metin = readFileSync(yol, "utf8");
// "anlamadım" sınıfı — çeviri kusuru bulgusudur: soru sahibe DEĞİL, getirene döner (§7.1.2).
// Birebir bayt listesi; Türkçe harf dönüşümü yapılmaz, yalnız ASCII küçültme uygulanır.
for (const satir of metin.split("\n")) {
  const m = satir.match(/^\s*-\s*\[( |x|X)\]\s.*?ÇATAL\s+(Ç-\d+)\b(.*)$/);
  if (!m) continue;
  const kapali = m[1].toLowerCase() === "x";
  const id = m[2];
  const kuyruk = m[3];
  // DEVİR (hasim bulgusu): "anlamadım" cevabi maddeyi KALICI acik birakiyordu — rol soruyu daha
  // sade ceviriyle yeniden getirdiginde eski madde silinmedigi icin (D-21) bagli isler sonsuza
  // dek kilitli kaliyordu. Cozum silme DEGIL devir: eski satira "devretti: Ç-NN" yazilir; madde
  // izde kalir ama kilidi YENI maddeye gecer. Devreden madde kilit uretmez.
  const devir = kuyruk.match(/devretti:\s*(Ç-\d+)/);
  if (devir) { console.log([id, "DEVREDILDI", "—", "devretti: " + devir[1]].join("\t")); continue; }
  const bek = (kuyruk.match(/bekletir:\s*([^·]*)/) || [, ""])[1];
  const gorevler = (bek.match(/G-\d+/g) || []).join(" ") || "—";
  const soruEs = kuyruk.match(/"([^"]*)"/);
  const soru = soruEs ? soruEs[1].trim() : "";
  // ÇÖZÜLEMEDİ (hasim bulgusu): kuyruk sahibin ELLE duzenledigi markdown yuzeyidir; ayristirici
  // katiysa ve cozemedigini SESSIZCE atliyorsa "acik catal yok" ile "okuyamadim" ayni sey olur —
  // ve kilit acilir. Yapisal alanlari eksik ÇATAL maddesi artik AYRI sinif olarak raporlanir;
  // kapi bunu fail-closed okur (acik olabilecek catal, cozulemedigi icin yok sayilamaz).
  if (!soru || !/bekletir:/.test(kuyruk)) {
    console.log([id, "COZULEMEDI", gorevler, "madde yapisi okunmuyor (soru/bekletir alani eksik)"].join("\t"));
    continue;
  }
  if (!kapali) { console.log([id, "CEVAP-BEKLIYOR", gorevler, "isaretlenmemis"].join("\t")); continue; }
  // [x] TEK BASINA cevap degildir (§7.1.1): cevap alani okunur ve üç kaba dal denetlenir.
  const cevapEs = kuyruk.match(/cevap:\s*"?([^"·]*)"?/);
  const cevap = cevapEs ? cevapEs[1].trim() : "";
  if (!cevap) { console.log([id, "CEVAP-BEKLIYOR", gorevler, "bos-cevap"].join("\t")); continue; }
  const c = asciiKucuk(cevap);
  if (ANLAMADIM.some((k) => c.includes(k))) { console.log([id, "CEVIRI-KUSURU", gorevler, "anlamadim-sinifi"].join("\t")); continue; }
  if (soru && asciiKucuk(soru) === c) { console.log([id, "CEVAP-BEKLIYOR", gorevler, "yanki"].join("\t")); continue; }
  console.log([id, "CEVAPLANDI", gorevler, "—"].join("\t"));
}
'
    exit 0
    ;;

  --ekle)
    GOREV="${2:-}"
    case "$GOREV" in
      G-[0-9]*) : ;;
      *) hata "--ekle icin gecerli gorev gerekli (ornek: G-12), gelen: '${GOREV}'" ;;
    esac
    [ -f "$GUNLUK" ] || hata "zarf gunlugu yok: $GUNLUK (catal kaydi olmadan kuyruga yazilmaz)"

    # KİLİT (hasım bulgusu + 4-paralel yeniden üretim, 2026-07-28): --ekle bir OKU-DEĞİŞTİR-YAZ
    # dizisidir (Ç-NN türetimi + tekilleştirme + append). Kilitsiz hâlde eşzamanlı SubagentStop
    # üç ayrı soruya aynı Ç-01'i verdi. Kilit ortak kitaplıktan gelir (zarf-ekle.sh ile aynı).
    . "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/kilit.sh"
    trap 'kilit_birak; hata "ic hata (fail-closed): kuyruk yazici beklenmedik durdu"' ERR
    kilit_al "$KUYRUK.kilit" || hata "kuyruk kilidi alinamadi: $KILIT_HATA"

    CIKTI="$(EKLE_GOREV="$GOREV" EKLE_HARIC="${3:-}" EKLE_GUNLUK="$GUNLUK" EKLE_KUYRUK="$KUYRUK" SOZLUK_YOL="$SOZLUK" "$NODE_BIN" --input-type=module -e "$JS_ORTAK"'
import { readFileSync, existsSync, writeFileSync, appendFileSync } from "node:fs";
const GOREV = process.env.EKLE_GOREV;
const gy = process.env.EKLE_GUNLUK, ky = process.env.EKLE_KUYRUK;
const bitir = (durum, deger) => { console.log(durum + "\t" + deger); process.exit(0); };

// 1 · Gunlukten SON "CATAL dolu" zarfini bul (satir no = sahip-atfi isaretcisi, §9).
// HARİÇ AJAN (hasim bulgusu): denetci kendi zarfina ÇATAL koyarsa, o kayit "SON ÇATAL dolu
// kayit" olur ve sahip cumlesi DENETCININ kaleminden yazilir — §9 vaadinin tam tersi. Hukmu
// isteyen ajanin kendi zarfi kaynak olarak DISLANIR.
const HARIC = process.env.EKLE_HARIC || "";
let kayit = null, satirNo = 0;
const satirlar = readFileSync(gy, "utf8").split("\n");
for (let i = 0; i < satirlar.length; i++) {
  const l = satirlar[i];
  if (!l) continue;
  let j; try { j = JSON.parse(l); } catch { continue; }
  if (j.tip !== "zarf" || j.gorev !== GOREV) continue;
  if (!j.alanlar || j.alanlar.catal !== "dolu") continue;
  if (HARIC && j.ajan === HARIC) continue;
  kayit = j; satirNo = i + 1;
}
// TESLİMAT ARIZASI ≠ MEŞRU ATLAMA (hasim bulgusu): kaydin bulunamamasi, sahibe gidecek sorunun
// KAYBOLMASI demektir. Tekillestirme atlamasiyla ayni sinifa konamaz — cagiran fail-closed okur.
if (!kayit) bitir("ARIZA", "gunlukte " + GOREV + " icin ÇATAL dolu zarf yok (sahip-yuzeyi metni uretilemez)");

const a = kayit.alanlar;
// GÜVENLİ KIRPMA (hasim bulgusu): metin, kuyruk satirinin KENDİ yapi isaretlerini tasiyabilir —
// "·" ayraci ve "cevap:/bekletir:/kaynak:/devretti:" anahtarlari. Ajanin yazdigi bir cumle bu
// isaretleri icerirse --durum ayristiricisi kandirilir ([x] olmadan "CEVAPLANDI" gorunmek,
// bekletir listesini bozmak, tekillestirmeyi delmek). Yapi isaretleri metinden SOYULUR.
// Kirpma BAYT tabanlidir: Turkce harf UTF-8 kodlamasinda 2 bayt; karakter sayisi tavani yaniltir
// (SENDE_BEKLEYEN tavani 2KB ve madde SİLİNMEZ — birkac catal dosyayi sariya itebiliyordu).
const ceviri = kis(a.ceviri, 260);
const etki = kis(a.etki, 300);
if (!ceviri) bitir("ARIZA", "zarfta ÇEVİRİ bos — sahip yuzeyi metni uretilemez");
const bekletir = (String(a.bekletir || "").match(/G-\d+/g) || []).join(" ") || "—";
const rol = /^[a-z0-9_-]+$/.test(String(kayit.ajan || "")) ? kayit.ajan : "—";
const imza = "kaynak: zarf-günlüğü satır " + satirNo;

// 2 · Kuyrugu hazirla (yoksa D-21 basligiyla dogar — kapanis kancasiyla AYNI baslik).
const BASLIK = [
  "<!-- yazar: kapanış kancası (mekanik ekleme) + cevabı alan rol (kapanış işareti) — EL_KITABI F1 istisna 2.",
  "     Biçim: \"- [ ] <tarih> · <rol> · tek cümle · kaynak: oturum <id>\"; cevaplanınca aynı satır",
  "     \"- [x] … · cevap: … · <tarih>\" olur. MADDE SİLİNMEZ (tavan 2KB; taşmada en eski KAPALI izler kırpılır). -->",
  "# SENDE BEKLEYEN — sahipte bekleyen maddeler",
  "",
  "",
].join("\n");
if (!existsSync(ky)) writeFileSync(ky, BASLIK);
const mevcut = readFileSync(ky, "utf8");

// 3 · Tekillestirme: ayni kaynak imzasi kuyrukta varsa yeniden EKLENMEZ (kapanis kancasi emsali).
if (mevcut.includes(imza)) bitir("ATLANDI", "ayni kaynak zaten kuyrukta (" + imza + ")");

// 4 · Ç-NN: kuyruktaki en buyuk numaradan turetilir (elle duzenlemede tekrar edebilir —
//     tekillestirme numarayla DEGIL kaynak imzasiyladir; beyanli sinir, tasari §10.6).
let enBuyuk = 0;
for (const m of mevcut.matchAll(/ÇATAL\s+Ç-(\d+)/g)) enBuyuk = Math.max(enBuyuk, Number(m[1]));
const id = "Ç-" + String(enBuyuk + 1).padStart(2, "0");

const d = new Date(), p2 = (n) => String(n).padStart(2, "0");
const bugun = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
const satir = "- [ ] " + bugun + " · " + rol + " · ÇATAL " + id + " · \"" + ceviri + "\""
  + (etki ? " · etki: " + etki : "") + " · bekletir: " + bekletir + " · " + imza;
// SON BAYT SATIRSONU DEĞİLSE ÖNCE O EKLENİR (hasım bulgusu): satırsonu yutulmuş bir dosyaya
// append, iki maddeyi TEK satırda birleştirir ve --durum yalnız ilkini görür — ikincisinin
// kilidi SESSİZCE açılırdı.
if (mevcut && !mevcut.endsWith("\n")) appendFileSync(ky, "\n");
appendFileSync(ky, satir + "\n");
bitir("EKLENDI", id);
')" || { kilit_birak; hata "kuyruk yazici kosamadi (fail-closed)"; }
    kilit_birak
    printf '%s\n' "$CIKTI"
    exit 0
    ;;

  --not)
    SINIF="${2:-}"; GOREV="${3:-}"; DONEM="${4:-}"
    [ "$SINIF" = "izin" ] || hata "--not yalnız 'izin' sınıfını tanır (gelen: '${SINIF}') — serbest metin kuyruğa girmez"
    case "$GOREV" in G-[0-9]*|KAPANIS|KURULUM) : ;; *) hata "--not icin gecerli gorev gerekli (ornek: G-12), gelen: '${GOREV}'" ;; esac
    case "$DONEM" in ''|*[!A-Za-z0-9._-]*) hata "--not icin gecerli donem kimligi gerekli, gelen: '${DONEM}'" ;; esac

    . "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/kilit.sh"
    trap 'kilit_birak; hata "ic hata (fail-closed): kuyruk yazici beklenmedik durdu"' ERR
    kilit_al "$KUYRUK.kilit" || hata "kuyruk kilidi alinamadi: $KILIT_HATA"

    CIKTI="$(NOT_GOREV="$GOREV" NOT_DONEM="$DONEM" NOT_KUYRUK="$KUYRUK" SOZLUK_YOL="$SOZLUK" "$NODE_BIN" --input-type=module -e "$JS_ORTAK"'
import { readFileSync, existsSync, writeFileSync, appendFileSync } from "node:fs";
const ky = process.env.NOT_KUYRUK;
const gorev = process.env.NOT_GOREV, donem = process.env.NOT_DONEM;
const bitir = (durum, deger) => { console.log(durum + "\t" + deger); process.exit(0); };
const BASLIK = [
  "<!-- yazar: kapanış kancası (mekanik ekleme) + cevabı alan rol (kapanış işareti) — EL_KITABI F1 istisna 2.",
  "     Biçim: \"- [ ] <tarih> · <rol> · tek cümle · kaynak: oturum <id>\"; cevaplanınca aynı satır",
  "     \"- [x] … · cevap: … · <tarih>\" olur. MADDE SİLİNMEZ (tavan 2KB; taşmada en eski KAPALI izler kırpılır). -->",
  "# SENDE BEKLEYEN — sahipte bekleyen maddeler",
  "",
  "",
].join("\n");
if (!existsSync(ky)) writeFileSync(ky, BASLIK);
const mevcut = readFileSync(ky, "utf8");
const imza = "kaynak: izin-engeli " + gorev + " · dönem " + donem;
if (mevcut.includes(imza)) bitir("ATLANDI", "ayni izin notu zaten kuyrukta (" + imza + ")");
const d = new Date(), p2 = (n) => String(n).padStart(2, "0");
const bugun = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
// SABİT CÜMLE: değişken yalnız görev numarasıdır. Sahibin kuyruğuna ajan kalemi girmez.
const satir = "- [ ] " + bugun + " · yapı · Gece bir adım izin kapısına takıldı ve ATLANDI (" + gorev +
  "); iş sürdü. Bu adımın yapılmasını istiyorsan kutunun İZİN satırına ilgili sınıfı ekle. · " + imza;
if (mevcut && !mevcut.endsWith("\n")) appendFileSync(ky, "\n");
appendFileSync(ky, satir + "\n");
bitir("EKLENDI", gorev);
')" || { kilit_birak; hata "kuyruk yazici kosamadi (fail-closed)"; }
    kilit_birak
    printf '%s\n' "$CIKTI"
    exit 0
    ;;

  --cevapla)
    # F1-5g · UZAKTAN GELEN SEÇİMİN UYGULANDIĞI TEK YER. Kuyruğa yazan betik yine budur:
    # ikinci bir yazıcı doğsaydı kis() süzgeci o yolda koşmaz ve olağan bir seçenek metni
    # maddeyi kalıcı olarak kilitlerdi (hasım bulgusu, dört mercek; biri canlı ölçtü).
    #
    # Argümanlar: <Ç-NN> <seçenek metni> <kaynak imzası>
    # Çıktı: CEVAPLANDI\t<Ç-NN> | ATLANDI\t<sebep> | ARIZA\t<sebep>
    #   ATLANDI = madde artık CEVAP-BEKLIYOR değil (cevaplanmış · devretmiş · çözülemiyor).
    #             Çağıran kodu TÜKETİR — soru başka bir yoldan kapanmıştır, tekrar denemek
    #             sahibin kendi cevabını yapının metniyle EZERDİ (D-21 ihlali).
    #   ARIZA   = yazım yapılamadı ya da yazımdan sonra madde hâlâ CEVAPLANDI okunmuyor.
    #             Çağıran kodu TÜKETMEZ ve alarm düşürür.
    ID="${2:-}"; METIN="${3:-}"; IMZA="${4:-}"
    case "$ID" in Ç-[0-9]*) : ;; *) hata "--cevapla icin gecerli catal kimligi gerekli (ornek: Ç-03), gelen: '${ID}'" ;; esac
    [ -n "$METIN" ] || hata "--cevapla icin secenek metni gerekli (bos metin cevap degildir)"
    # İmza DAR: yalnız harf/rakam/`:._-@` ve boşluk. Kuyruk satırının yapı ayracı (·) ve
    # tırnak buraya giremez — imza sahip yüzeyine yazılan tek serbest alandır.
    case "$IMZA" in ''|*[!A-Za-z0-9:.@_\ -]*) hata "--cevapla icin gecerli kaynak imzasi gerekli (ornek: 'uzaktan-posta uid:1841')" ;; esac
    [ -f "$KUYRUK" ] || hata "kuyruk yok: $KUYRUK (cevaplanacak madde bulunamaz)"

    BEN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
    . "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/kilit.sh"
    trap 'kilit_birak; hata "ic hata (fail-closed): cevap yazici beklenmedik durdu"' ERR
    kilit_al "$KUYRUK.kilit" || hata "kuyruk kilidi alinamadi: $KILIT_HATA"

    # (1) ÖN-OKUMA — maddenin O ANKİ durumu. Tek ayrıştırıcı: kendi --durum kipimiz.
    ONCE="$(CLAUDE_PROJECT_DIR="$KOK" bash "$BEN" --durum 2>/dev/null | grep -F "$ID	" | head -n1 || true)"
    ONCE_DURUM="$(printf '%s' "$ONCE" | cut -f2)"
    if [ "$ONCE_DURUM" != "CEVAP-BEKLIYOR" ]; then
      kilit_birak
      printf 'ATLANDI\t%s\n' "madde CEVAP-BEKLIYOR degil (${ONCE_DURUM:-madde yok})"
      exit 0
    fi

    # Geri alma için BAYT-EŞ yedek: komut ikamesi ($(cat)) sondaki satırsonunu YUTAR ve
    # geri alınan dosya orijinalinden farklı olurdu (D-12in kendi dersi: JSON-roundtrip
    # satırsonu düşürüp yanlış KIRMIZI üretmişti). Yedek dosyaya alınır, bayt-eş döner.
    YEDEK="$KUYRUK.yedek"
    cp "$KUYRUK" "$YEDEK" || { kilit_birak; hata "kuyruk yedegi alinamadi (fail-closed)"; }
    CIKTI="$(CEV_ID="$ID" CEV_METIN="$METIN" CEV_IMZA="$IMZA" CEV_KUYRUK="$KUYRUK" SOZLUK_YOL="$SOZLUK" "$NODE_BIN" --input-type=module -e "$JS_ORTAK"'
import { readFileSync, writeFileSync, renameSync } from "node:fs";
const ky = process.env.CEV_KUYRUK, id = process.env.CEV_ID;
const bitir = (d, v) => { console.log(d + "\t" + v); process.exit(0); };
// Seçenek metni AYNI süzgeçten geçer (kis): yapı işaretleri soyulur, bayt tabanlı kırpılır.
// "anlamadım" sınıfı bir seçenek metni buraya HİÇ gelmemeli (zarf kapısı reddeder) — ama
// ikinci hat burada: geldiyse yazma YAPILMAZ, yoksa madde CEVIRI-KUSURU okunup kilit açılmaz.
const metin = kis(process.env.CEV_METIN, 160);
if (!metin) bitir("ARIZA", "secenek metni suzgecten sonra bos kaldi");
if (ANLAMADIM.some((k) => asciiKucuk(metin).includes(k))) bitir("ARIZA", "secenek metni anlamadim-sinifi tasiyor");
const imza = kis(process.env.CEV_IMZA, 80);
const satirlar = readFileSync(ky, "utf8").split("\n");
const d = new Date(), p2 = (n) => String(n).padStart(2, "0");
const bugun = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
let yazildi = 0;
for (let i = 0; i < satirlar.length; i++) {
  const m = satirlar[i].match(/^(\s*-\s*\[) (\]\s.*?ÇATAL\s+)(Ç-\d+)\b(.*)$/);
  if (!m || m[3] !== id) continue;
  satirlar[i] = m[1] + "x" + m[2] + m[3] + m[4] + " · cevap: \"" + metin + "\" · " + bugun + " · " + imza;
  yazildi++;
}
if (yazildi !== 1) bitir("ARIZA", "acik madde tam olarak bir kez bulunamadi (" + yazildi + ")");
// Atomik yazım: yarım yazılmış bir sahip yüzeyi, ayrıştırıcıyı COZULEMEDI dalına düşürür.
const gecici = ky + ".yeni";
writeFileSync(gecici, satirlar.join("\n"));
renameSync(gecici, ky);
bitir("YAZILDI", id);
')" || { kilit_birak; hata "cevap yazici kosamadi (fail-closed)"; }

    if [ "${CIKTI%%	*}" != "YAZILDI" ]; then
      rm -f "$YEDEK"
      kilit_birak
      printf '%s\n' "$CIKTI"
      exit 0
    fi

    # (2) YAZIM SONRASI DOĞRULAMA — beyan değil ÖLÇÜM. Yazdığımız satırı kendi ayrıştırıcımız
    # CEVAPLANDI okumuyorsa yazım BAŞARISIZDIR: dosya geri alınır, kod tüketilmez, çağıran
    # alarm düşürür. (Hasım bulgusu: seçenek metni ayrıştırıcıyı bozup maddeyi sessizce
    # kilitli bırakabiliyordu; "yazdım" ile "cevap oldu" AYNI ŞEY DEĞİLDİR.)
    SONRA="$(CLAUDE_PROJECT_DIR="$KOK" bash "$BEN" --durum 2>/dev/null | grep -F "$ID	" | head -n1 || true)"
    if [ "$(printf '%s' "$SONRA" | cut -f2)" != "CEVAPLANDI" ]; then
      cp "$YEDEK" "$KUYRUK" 2>/dev/null || true
      rm -f "$YEDEK"
      kilit_birak
      printf 'ARIZA\t%s\n' "yazim sonrasi madde CEVAPLANDI okunmuyor ($(printf '%s' "$SONRA" | cut -f2)) — kuyruk geri alindi"
      exit 0
    fi
    rm -f "$YEDEK"
    kilit_birak
    printf 'CEVAPLANDI\t%s\n' "$ID"
    exit 0
    ;;

  *)
    hata "bilinmeyen kip: '${KIP}' (--durum | --ekle <G-NN> | --not izin <G-NN> <dönem> | --cevapla <Ç-NN> <metin> <imza>)"
    ;;
esac
