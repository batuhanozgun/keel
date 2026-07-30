#!/bin/bash
# zarf-ekle — zarf günlüğünün TEK append-aracı (E1, tasarım §9: "tek yazar = append-aracı").
# 00_pano/zarf-gunlugu.jsonl'e append eden BAŞKA HİÇBİR yol meşru değildir; kancalar/betikler
# doğrudan yazmaz, bu betiği çağırır (F1'in süreç-düzeyi karşılığı). Güvence katmanları AYRIK
# ve beyanlı (hasım bulgusu A2/A4): günlük araç katmanında [SERT] (Edit/Write kesilir; bu betik
# kanca bash sürecinde koşar, o engelden geçmez) · BOZUK/yarım satır bekçide KIRMIZI · şema-GEÇERLİ
# sahte satıra karşı mekanik yakalayıcı YOK — o sınır süreç disiplinidir (bilinen sınır, E2+ adayı).
# Girdi: stdin'de TEK satır JSON. Şema (surum:1): zorunlu alanlar surum=1 · ts (ISO) · tip
#   (bilinen liste) · donem (dize ya da null). Tip listesi: donem-acilis · donem-kapanis · nabiz ·
#   zarf · bicim · sevk-karar · catal-suzgec · sahip-temas · izin-engel · bulgu · karne · devir ·
#   bekci · haber · dur-alindi · gorev-sayaci (E5) · evre-gecis · brifing (F1-5).
# FAIL-CLOSED: geçersiz girdi / kilit alınamadı / yazım hatası → exit 1 + stderr gerekçe;
#   satır SESSİZCE düşmez (bozuk satır bütün gözleri köreltir — günlük tek-nokta veri katmanı).
# Kilit: mkdir kilidi (macOS tabanında flock yok) + tek printf-append. Bayat kilit (PID ölü)
#   kırılır. Eşzamanlı-bitiş yarışının kanıtı: tools/guard/test/sevk.test.mjs.
# Türkçe harf güvenliği: eşleştirme birebir bayt; harf dönüşümü yok.
set -euo pipefail
export LC_ALL=C.UTF-8

hata() { printf 'zarf-ekle HATA: %s\n' "$1" >&2; exit 1; }
trap 'hata "ic hata (fail-closed): arac beklenmedik durdu, satir YAZILMADI"' ERR

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[ -d "$KOK/00_pano" ] || hata "vault degil (00_pano yok): $KOK"
GUNLUK="$KOK/00_pano/zarf-gunlugu.jsonl"
KILIT="$GUNLUK.kilit"

GIRDI="$(cat)"
[ -n "$GIRDI" ] || hata "stdin bos — yazilacak satir yok"

# node keşfi ORTAK KİTAPLIKTAN (E4: tools/sevk/ortak.sh — beş betikteki aynı blok tek eve alındı;
# D-02 dersi. Kitaplık yoksa fail-closed: denetimsiz yazım yok.)
ORTAK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ortak.sh"
[ -r "$ORTAK" ] || hata "ortak kitaplik yok ($ORTAK) — sevk ailesi eksik (fail-closed)"
# shellcheck source=/dev/null
. "$ORTAK"
node_bul || hata "node bulunamadi — sema denetimi yapilamiyor (fail-closed)"

# Şema denetimi + normalizasyon: geçerliyse TEK satıra serileştirilmiş JSON basar (gömülü
# satırsonu JSON.stringify ile fiziken imkânsızlaşır), geçersizse HATA\t<sebep>.
SATIR="$(printf '%s' "$GIRDI" | "$NODE_BIN" --input-type=module -e '
import { readFileSync } from "node:fs";
const TIPLER = new Set(["donem-acilis","donem-kapanis","nabiz","zarf","bicim","sevk-karar","catal-suzgec","sahip-temas","izin-engel","bulgu",
                        "karne","devir","bekci",
                        // E5 (kanal + nabiz): haber = disa giden posta sonucu · dur-alindi = DUR
                        // isaretinin gorulme ani (kaynak: isaret|posta) · gorev-sayaci = sisme
                        // alarminin capasi. Beyaz liste FAIL-CLOSED: listede olmayan tip
                        // reddedilir ve sevkin uc freni gunlukten sayildigi icin donem KAPANIR.
                        "haber","dur-alindi","gorev-sayaci","alarm",
                        // F1-5a/c: evre-gecis = donemin uretim<->kapanis evre degisimi (gidis-donus
                        // freni bu kayittan sayilir) · brifing = dis gozun kapanis brifinginin
                        // diske yazildigi an (sevk "bu donemde brifing var mi" sorusunu buradan okur).
                        "evre-gecis","brifing",
                        // F1-5g (cevap kanali): cevap-alindi = uzaktan gelen secimin UYGULANDIGI an
                        // (uid + msgid tasir; sahip-atfinin gelen yondeki kaniti, §9 karsiligi) ·
                        // cevap-reddedildi = kimlik/bicim/durum kapisindan donen cevap denemesi.
                        // Beyaz liste FAIL-CLOSED oldugu icin bu iki tip EKLENMEDEN cevap hattinin
                        // TEK denetim izi sessizce kaybolurdu (hasim bulgusu, dort mercek).
                        "cevap-alindi","cevap-reddedildi"]);
let ham = "";
try { ham = readFileSync(0, "utf8"); } catch { console.log("HATA\tstdin okunamadi"); process.exit(0); }
if (ham.trim().split("\n").length !== 1) { console.log("HATA\tgirdi tek satir degil"); process.exit(0); }
let j;
try { j = JSON.parse(ham); } catch { console.log("HATA\tgecerli JSON degil"); process.exit(0); }
if (j === null || typeof j !== "object" || Array.isArray(j)) { console.log("HATA\tJSON nesne degil"); process.exit(0); }
if (j.surum !== 1) { console.log("HATA\tsurum 1 degil"); process.exit(0); }
if (typeof j.ts !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(j.ts)) { console.log("HATA\tts eksik/bicimsiz (ISO bekleniyor)"); process.exit(0); }
if (typeof j.tip !== "string" || !TIPLER.has(j.tip)) { console.log("HATA\ttip eksik ya da bilinmeyen: " + String(j.tip)); process.exit(0); }
if (!("donem" in j) || (j.donem !== null && typeof j.donem !== "string")) { console.log("HATA\tdonem alani eksik (dize ya da null olmali)"); process.exit(0); }
console.log("TAMAM\t" + JSON.stringify(j));
')" || hata "sema denetleyicisi kosamadi (fail-closed)"

DURUM="${SATIR%%$'\t'*}"
GOVDE="${SATIR#*$'\t'}"
[ "$DURUM" = "TAMAM" ] || hata "sema: $GOVDE"

# Kilit ORTAK KİTAPLIKTAN gelir (E3: tools/sevk/kilit.sh — catal-kuyruk.sh ile aynı mekanik;
# iki kopya = sürüklenme, D-02 dersi). Semantik değişmedi: mkdir · 50×0,1 sn · bayat kilit iki
# dallı kırılır (ölü PID / pid'siz + 30 sn) · kırma `mv` ile ATOMİK · alınamazsa fail-closed.
# shellcheck source=/dev/null
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/kilit.sh"
trap 'kilit_birak; hata "ic hata (fail-closed): arac beklenmedik durdu, satir YAZILMADI"' ERR
kilit_al "$KILIT" || hata "kilit alinamadi: $KILIT_HATA"

printf '%s\n' "$GOVDE" >> "$GUNLUK" || { kilit_birak; hata "gunluge yazilamadi: $GUNLUK"; }
kilit_birak
exit 0
