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

KIP="${1:-}"

case "$KIP" in
  --durum)
    KUYRUK_YOL="$KUYRUK" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
const yol = process.env.KUYRUK_YOL;
if (!existsSync(yol)) process.exit(0);           // kuyruk yoksa açık çatal da yok
const metin = readFileSync(yol, "utf8");
// "anlamadım" sınıfı — çeviri kusuru bulgusudur: soru sahibe DEĞİL, getirene döner (§7.1.2).
// Birebir bayt listesi; Türkçe harf dönüşümü yapılmaz, yalnız ASCII küçültme uygulanır.
const ANLAMADIM = ["anlamadım", "anlamadim", "anlamıyorum", "anlamiyorum", "ne demek",
                   "anlaşılmadı", "anlasilmadi", "tekrar sor", "anlamadım?"];
const asciiKucuk = (s) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());
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

    CIKTI="$(EKLE_GOREV="$GOREV" EKLE_HARIC="${3:-}" EKLE_GUNLUK="$GUNLUK" EKLE_KUYRUK="$KUYRUK" "$NODE_BIN" --input-type=module -e '
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
const bayt = (s) => Buffer.byteLength(s, "utf8");
const kis = (s, n) => {
  let t = String(s || "").replace(/[`*"\n]/g, " ").replace(/·/g, "-")
    .replace(/\b(cevap|bekletir|kaynak|devretti)\s*:/gi, "$1 -")
    .replace(/ÇATAL\s+Ç-\d+/g, "çatal").replace(/\s+/g, " ").trim();
  if (bayt(t) <= n) return t;
  while (bayt(t) > n - 3 && t.length) t = t.slice(0, -1);
  return t + "…";
};
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
appendFileSync(ky, satir + "\n");
bitir("EKLENDI", id);
')" || { kilit_birak; hata "kuyruk yazici kosamadi (fail-closed)"; }
    kilit_birak
    printf '%s\n' "$CIKTI"
    exit 0
    ;;

  *)
    hata "bilinmeyen kip: '${KIP}' (--durum | --ekle <G-NN>)"
    ;;
esac
