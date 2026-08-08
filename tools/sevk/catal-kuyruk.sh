#!/bin/bash
# catal-kuyruk — sahibe giden çatalın kuyruk mekaniği (E3): CEVAP-BEKLİYOR durumu + mekanik ekleme.
# Kaynağı: tasarım §7.1 ("sessizlik onay değildir" üç mekaniği) + D-21 kalıcı kuyruğu.
# Kuyruk dosyası 00_pano/SENDE_BEKLEYEN.md'dir — AYRI kuyruk açılmaz (D-21: madde SİLİNMEZ,
# tavan 10KB [K1 sözleşmesi §6①], madde başına TEK satır). ÇATAL maddesi o kuyruğun bir SINIFIDIR:
#   - [ ] <tarih> · <rol> · ÇATAL Ç-NN · "<çeviri>" · etki: <etki> · bekletir: G-.. · kaynak: zarf-günlüğü satır N
# Cevaplanınca aynı satır: "- [x] … · cevap: "<sahip cevabı>" · <tarih>" (D-21 biçimi korunur).
#
# İki kip:
#   --durum            → her ÇATAL maddesi için TSV: Ç-NN <tab> DURUM <tab> bekletir <tab> sebep
#                        DURUM ∈ CEVAP-BEKLIYOR | CEVAPLANDI | CEVIRI-KUSURU
#   --ekle <G-NN>      → zarf günlüğünden o görevin SON "ÇATAL dolu" zarfını okur, sahip-yüzeyi
#                        metnini ORADAN alır (denetçinin kaleminden değil — §9 sahip-atfı kuralı),
#                        Ç-NN türetir, tekilleştirir, kuyruğa tek satır ekler.
#                        stdout: "EKLENDI\tÇ-NN" | "ATLANDI\t<sebep>" | "ARIZA\t<sebep>"
#                        ATLANDI = tekilleştirme, TEK meşru atlama sınıfı. ARIZA = soru sahibe
#                        ULAŞMADI (kayıt yok · süzgeç eşleşti · süzgeç ölçülemedi) — çağıran
#                        bunu fail-closed okur ve dönüşü durdurur. Jeton kümesi ÜÇ'tür ve
#                        büyümez: tüketici (zarf-bicim-kapisi.sh) bilmediği jetonu da engele
#                        çevirir, ama iki ad aynı hükmü anlatırsa vokabüler sessizce çatallanır.
#   --not izin <G-NN> <dönem> → ÇATAL DEĞİL, bilgi maddesi (F1-5f): otonom dönemde izin kapısına
#                        takılıp ATLANAN adımı sahibin kuyruğuna düşürür. Cümle SABİT ŞABLONDUR
#                        (serbest metin yasağı: ajanın kalemi sahip yüzeyine geçmez); tekilleştirme
#                        kaynak imzasıyla. Bu madde ÇATAL sınıfı olmadığı için hiçbir işi KİLİTLEMEZ
#                        — sahibin görmesi gereken bir haberdir, cevap beklenen bir soru değil.
# FAIL-CLOSED: geçersiz girdi / okunamayan günlük / yazım hatası → exit 1 + stderr gerekçe.
# İÇERİK SÜZGECİ (U60): kuyruğa yazan ÜÇ kol da (--ekle · --not · --cevapla) yazımdan ÖNCE
#   tools/sevk/kuyruk-ortak.mjs üzerinden tools/guard/icerik-suzgeci.sh'ten geçer. Eşleşmede ya
#   da ölçülememede satır YAZILMAZ. Sinyal kola göre değişir çünkü tüketiciler farklı okur:
#   --ekle/--cevapla ARIZA jetonu basar (tüketici stdout okur), --not ise EXIT 1 döner (tek
#   tüketicisi sevk.sh yalnız çıkış koduna bakar).
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
# Tanımların kendisi ARTIK BU DOSYADA DEĞİL: tools/sevk/kuyruk-ortak.mjs — kuyruğa yazan HER
# kolun (buradaki üç kip + tools/guard/kapanis.sh) ortak evi. Burada yalnız o ev yüklenir:
#   kis()             → sahip-yüzeyi metnini satırın KENDİ yapı işaretlerinden arındırır ve
#                       BAYT tabanlı kırpar (Türkçe harf UTF-8'de 2 bayt; karakter yanıltır)
#   asciiKucuk()      → yalnız ASCII küçültme (tr komutu İ/ı bozar)
#   suzgectenGecir()  → içerik süzgeci (U60): sahip yüzeyine yazılacak metin, dış kapıdaki
#                       taramanın AYNISINDAN geçer; eşleşmede satır YAZILMAZ (fail-closed)
#   ANLAMADIM         → "anlamadım" sınıfı, VERİ dosyasından (tools/sevk/cevap-sozlugu.txt)
# GEREKÇE (hasım bulgusu, dört mercek — F1-5g): kis() eskiden yalnız `--ekle` bloğunun içinde
# yaşıyordu. Uzaktan cevap yolu ikinci bir yazıcı doğurunca aynı temizlik orada KOŞMUYORDU ve
# tırnak içeren olağan bir seçenek metni maddeyi "boş cevap" yapıp işi KALICI olarak
# kilitliyordu — kanalın var oluş sebebinin tam tersi. U69 aynı dersin DÖRDÜNCÜ kopyasını
# gösterdi (kapanış kancası kendi kırpmasını yazmıştı): tanım artık ortak evde, ve yazıcıların
# oradan geçtiğini test mekanik olarak sayar (test/kuyruk-yazicilari.test.mjs).
SOZLUK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/cevap-sozlugu.txt"
[ -r "$SOZLUK" ] || hata "cevap sozlugu yok ($SOZLUK) — 'anlamadim' sinifi taninamaz (fail-closed)"
KUYRUK_ORTAK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/kuyruk-ortak.mjs"
[ -r "$KUYRUK_ORTAK" ] || hata "kuyruk ortak evi yok ($KUYRUK_ORTAK) — sevk ailesi eksik (fail-closed)"
export KUYRUK_ORTAK_YOL="$KUYRUK_ORTAK"
export KUYRUK_KOK="$KOK"
JS_ORTAK='
const _KO = await import(process.env.KUYRUK_ORTAK_YOL);
const { bayt, kis, asciiKucuk, suzgectenGecir } = _KO;
const ANLAMADIM = _KO.anlamadimOku(process.env.SOZLUK_YOL);
const suzgecKapisi = (parcalar) => suzgectenGecir(parcalar, { kok: process.env.KUYRUK_KOK });
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
// Kirpma BAYT tabanlidir: Turkce harf UTF-8 kodlamasinda 2 bayt; karakter sayisi tavani yaniltir.
// SENDE_BEKLEYEN tavani 10KB (K1 sozlesmesi §6① — 2KB iken birkac catal dosyayi sariya
// itebiliyordu, celiski 10KB lehine kapandi). Madde SİLİNMEZ; kirpma yine gerekli — tavan
// buyudu diye satir sismesi mesru olmaz (madde basina TEK satir, F3).
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
  "     \"- [x] … · cevap: … · <tarih>\" olur. MADDE SİLİNMEZ ve KIRPILMAZ (tavan 10KB; aşarsa bekçi SARI basar,",
  "     iş durmaz — çözüm satırı kırpmak değil, sade ve kısa yazmaktır). -->",
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
// İÇERİK SÜZGECİ (U60) — sahibin kuyruğu bir YAZIM hedefidir ve ajanın kalemi oraya değiyor.
// Aynı metin dış kapıda (file-guard) sansürleniyordu, burada HİÇ taranmıyordu: ölçüldü, `sk-`
// önekli anahtar ve sahibin işaret listesindeki dize kuyruğa aynen düştü. HAM alanlar da
// taranır: kırpma bir sırrı ikiye bölüp desenden kaçırabilir. Eşleşme ya da ölçülememe
// TESLİMAT ARIZASIDIR — satır YAZILMAZ ve çağıran (zarf kapısı) dönüşü durdurur; rol metni
// sırsız yeniden yazar. Sessizce yazmak dış kapının hükmünü delerdi.
const sz = suzgecKapisi([String(a.ceviri || ""), String(a.etki || ""), satir]);
if (!sz.temiz) bitir("ARIZA", sz.sebep + " — sahip yuzeyine yazilmadi");
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
  "     \"- [x] … · cevap: … · <tarih>\" olur. MADDE SİLİNMEZ ve KIRPILMAZ (tavan 10KB; aşarsa bekçi SARI basar,",
  "     iş durmaz — çözüm satırı kırpmak değil, sade ve kısa yazmaktır). -->",
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
// İÇERİK SÜZGECİ (U60) — bu kolun cümlesi SABİT şablondur, değişkeni yalnız görev numarasıdır;
// yine de süzgeçten geçer. Sebep: kuralın kapsamı "kuyruğa yazan HER kol"dur. Şablonu bir gün
// serbest metne açan değişiklik, kapıyı kaldırmayı da ayrıca yazmak zorunda kalsın.
const sz = suzgecKapisi([satir]);
if (!sz.temiz) bitir("ARIZA", sz.sebep + " — izin notu yazilmadi");
if (mevcut && !mevcut.endsWith("\n")) appendFileSync(ky, "\n");
appendFileSync(ky, satir + "\n");
bitir("EKLENDI", gorev);
')" || { kilit_birak; hata "kuyruk yazici kosamadi (fail-closed)"; }
    kilit_birak
    # ÇIKIŞ KODU BU KOLUN TEK SİNYALİDİR: tek tüketici (sevk.sh 8c) stdout'u okumaz, yalnız
    # koda bakar. Süzgeç notu yazdırmadıysa 0 dönmek, sevkin "not düştü" saymasına yol açardı.
    case "${CIKTI%%	*}" in
      ARIZA) hata "izin notu kuyruga yazilmadi: ${CIKTI#*	}" ;;
    esac
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
let yazildi = 0, yeni = null, hedef = -1;
for (let i = 0; i < satirlar.length; i++) {
  const m = satirlar[i].match(/^(\s*-\s*\[) (\]\s.*?ÇATAL\s+)(Ç-\d+)\b(.*)$/);
  if (!m || m[3] !== id) continue;
  yeni = m[1] + "x" + m[2] + m[3] + m[4] + " · cevap: \"" + metin + "\" · " + bugun + " · " + imza;
  hedef = i; yazildi++;
}
if (yazildi !== 1) bitir("ARIZA", "acik madde tam olarak bir kez bulunamadi (" + yazildi + ")");
// İÇERİK SÜZGECİ (U60) — bu kolun metni UZAKTAN gelir (postayla dönen seçim) ve imza alanı
// serbest bir dizedir: dar karakter kümesi bir sağlayıcı önekini ELEMİYOR. Ham metin, kırpılmış
// metin, imza ve kurulan satır birlikte taranır; eşleşmede dosyaya DOKUNULMAZ ve kod tüketilmez
// (çağıran ARIZA dalını okur: sahip yeniden yanıtlayabilir).
const sz = suzgecKapisi([String(process.env.CEV_METIN || ""), metin, imza, yeni]);
if (!sz.temiz) bitir("ARIZA", sz.sebep + " — cevap yazilmadi");
satirlar[hedef] = yeni;
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
