#!/bin/bash
# zarf-ekle — zarf günlüğünün TEK append-aracı (E1, tasarım §9: "tek yazar = append-aracı").
# 00_pano/zarf-gunlugu.jsonl'e append eden BAŞKA HİÇBİR yol meşru değildir; kancalar/betikler
# doğrudan yazmaz, bu betiği çağırır (F1'in süreç-düzeyi karşılığı). Güvence katmanları AYRIK
# ve beyanlı (hasım bulgusu A2/A4): günlük araç katmanında [SERT] (Edit/Write kesilir; bu betik
# kanca bash sürecinde koşar, o engelden geçmez) · BOZUK/yarım satır bekçide KIRMIZI · şema-GEÇERLİ
# sahte satıra karşı mekanik yakalayıcı YOK — o sınır süreç disiplinidir (bilinen sınır, E2+ adayı).
# Girdi: stdin'de TEK satır JSON. Şema (surum:1): zorunlu alanlar surum=1 · ts (ISO) · tip
#   (bilinen liste) · kosu (dize ya da null). Tip listesi: kosu-acilis · kosu-kapanis · nabiz ·
#   zarf · bicim · sevk-karar · catal-suzgec · sahip-temas · izin-engel · bulgu.
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

# node keşfi (guard ailesiyle aynı: GUI oturumunda PATH dardır — Faz-1 bulgusu)
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi
[ -n "$NODE_BIN" ] || hata "node bulunamadi — sema denetimi yapilamiyor (fail-closed)"

# Şema denetimi + normalizasyon: geçerliyse TEK satıra serileştirilmiş JSON basar (gömülü
# satırsonu JSON.stringify ile fiziken imkânsızlaşır), geçersizse HATA\t<sebep>.
SATIR="$(printf '%s' "$GIRDI" | "$NODE_BIN" --input-type=module -e '
import { readFileSync } from "node:fs";
const TIPLER = new Set(["kosu-acilis","kosu-kapanis","nabiz","zarf","bicim","sevk-karar","catal-suzgec","sahip-temas","izin-engel","bulgu"]);
let ham = "";
try { ham = readFileSync(0, "utf8"); } catch { console.log("HATA\tstdin okunamadi"); process.exit(0); }
if (ham.trim().split("\n").length !== 1) { console.log("HATA\tgirdi tek satir degil"); process.exit(0); }
let j;
try { j = JSON.parse(ham); } catch { console.log("HATA\tgecerli JSON degil"); process.exit(0); }
if (j === null || typeof j !== "object" || Array.isArray(j)) { console.log("HATA\tJSON nesne degil"); process.exit(0); }
if (j.surum !== 1) { console.log("HATA\tsurum 1 degil"); process.exit(0); }
if (typeof j.ts !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(j.ts)) { console.log("HATA\tts eksik/bicimsiz (ISO bekleniyor)"); process.exit(0); }
if (typeof j.tip !== "string" || !TIPLER.has(j.tip)) { console.log("HATA\ttip eksik ya da bilinmeyen: " + String(j.tip)); process.exit(0); }
if (!("kosu" in j) || (j.kosu !== null && typeof j.kosu !== "string")) { console.log("HATA\tkosu alani eksik (dize ya da null olmali)"); process.exit(0); }
console.log("TAMAM\t" + JSON.stringify(j));
')" || hata "sema denetleyicisi kosamadi (fail-closed)"

DURUM="${SATIR%%$'\t'*}"
GOVDE="${SATIR#*$'\t'}"
[ "$DURUM" = "TAMAM" ] || hata "sema: $GOVDE"

# mkdir kilidi: 50×0,1 sn; bayat kilit kırılır; alınamazsa fail-closed.
# Bayat tespiti İKİ dallı (hasım bulguları A11+D2): PID okunuyorsa ölü-PID kırılır; PID yoksa/
# bozuksa (crash penceresi: mkdir ile pid-yazımı arası ölüm, ya da elle kalmış dizin) kilit
# YAŞLA kırılır (mtime > 30 sn) — pid'siz taze kilit kırılmaz (fail-closed bekler). KIRMA
# ATOMİKTİR: rm -rf değil `mv` (rename) — iki süreç aynı anda bayat görüp ikisi de rm yapsaydı
# biri ötekinin TAZE kilidini silebilirdi (D2 yarış deliği); mv'yi yalnız biri kazanır.
KILIT_BIZDE=0
temizlik() { [ "$KILIT_BIZDE" = "1" ] && rm -rf "$KILIT" 2>/dev/null; }
trap 'temizlik; hata "ic hata (fail-closed): arac beklenmedik durdu, satir YAZILMADI"' ERR
kilit_kir() { # atomik: mv'yi tek süreç kazanır; kaybeden sessizce döngüye döner
  local COP="$KILIT.kirik.$$"
  if mv "$KILIT" "$COP" 2>/dev/null; then rm -rf "$COP" 2>/dev/null || true; fi
}
DENEME=0
while ! mkdir "$KILIT" 2>/dev/null; do
  DENEME=$((DENEME + 1))
  if [ "$DENEME" -ge 50 ]; then
    ESKI_PID="$(cat "$KILIT/pid" 2>/dev/null || true)"
    case "$ESKI_PID" in
      *[!0-9]*|'')
        KILIT_ZAMAN="$(stat -f %m "$KILIT" 2>/dev/null || stat -c %Y "$KILIT" 2>/dev/null || echo 0)"
        case "$KILIT_ZAMAN" in *[!0-9]*|'') KILIT_ZAMAN=0;; esac
        if [ "$KILIT_ZAMAN" -gt 0 ] && [ $(( $(date +%s) - KILIT_ZAMAN )) -gt 30 ]; then
          kilit_kir; DENEME=0; continue
        fi
        hata "kilit alinamadi ($KILIT): sahibi okunamadi ve kilit taze — yazim yigilmis olabilir, elle bak" ;;
      *) if kill -0 "$ESKI_PID" 2>/dev/null; then
           hata "kilit alinamadi ($KILIT, sahibi PID $ESKI_PID yasiyor) — yazim yigilmis olabilir"
         else
           kilit_kir; DENEME=0; continue
         fi ;;
    esac
  fi
  sleep 0.1
done
KILIT_BIZDE=1
printf '%s\n' "$$" > "$KILIT/pid" 2>/dev/null || true

printf '%s\n' "$GOVDE" >> "$GUNLUK" || { temizlik; hata "gunluge yazilamadi: $GUNLUK"; }
rm -rf "$KILIT" 2>/dev/null; KILIT_BIZDE=0
exit 0
