#!/bin/bash
# kosu-ac — otonom koşunun AÇILIŞ TÖRENİ (E4, K3 tetiği). Meşru tetik: /kosu becerisinin
# ön-işleme satırı, yani fiilen İNSANIN yazdığı komut (rol-ac.sh emsali; beceride
# disable-model-invocation kilidi var — ajan kendi koşusunu açamaz).
#
# Kullanım: kosu-ac.sh <kutu> [yapim|kurulum|kapanis] [interaktif|bassiz]
#           kosu-ac.sh kapat
#
# Yazdığı: tools/sevk/.kosu-acik
#   1. satır: "<koşu-id>\t<kutu>\t<tür>\t<kip>"   (biçim kapısı 1. ve 2. alanı okur — E1 uyumu)
#   2. satır: "damga\t<ISO>"
# Ayrıca zarf günlüğüne BAĞIMSIZ bir "kosu-acilis" kaydı düşürür — sevkten ve Stop kancasından
# bağımsız (tasarım §2.1): koşu ilk adımda ölse bile "açıldı ama nabız gelmedi" kaydı VAR olur;
# E5 watchdog'unun okuyacağı çapa budur.
#
# DAMGA-DEĞİŞTİRMEZ: açık koşu varken ikincisi açılmaz (rol töreni emsali; kapatma ayrı komut).
# FAIL-CLOSED: kapılanma çapalarından biri eksikse koşu HİÇ AÇILMAZ ("kalkansız motor yok" —
#   tasarım §8; sevk aynı kontrolü her turda tekrarlar = çift hat).
set -uo pipefail
export LC_ALL=C.UTF-8

hata() { printf 'KOŞU AÇILAMADI: %s\n' "$1" >&2; exit 1; }
trap 'hata "tören betiği kendi içinde durdu (satır $LINENO) — fail-closed"' ERR

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOSTERGE="$DIZIN/.kosu-acik"

[ -r "$DIZIN/ortak.sh" ] || hata "ortak kitaplık yok ($DIZIN/ortak.sh) — sevk ailesi eksik (fail-closed)"
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

# ── kapat ─────────────────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "kapat" ]; then
  if [ ! -e "$GOSTERGE" ]; then printf 'KOŞU YOK: kapatılacak açık koşu bulunmadı.\n'; exit 0; fi
  kosu_oku "$KOK" || true
  rm -f "$GOSTERGE"
  # Uyanık-tutma savını BIRAK (E5): sızan sav Mac'i hiç uyutmaz — ayrı bir arızadır.
  if [ -f "$DIZIN/.caffeinate-pid" ]; then
    kill "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)" 2>/dev/null || true
    rm -f "$DIZIN/.caffeinate-pid"
  fi
  J_tip=kosu-kapanis J_kosu="${KOSU_ID:-bilinmiyor}" J_kutu="${KOSU_KUTU:-}" \
    J_sebep="sahip kapattı (/kosu kapat)" json_kur 2>/dev/null | gunluge_yaz "$KOK" || true
  printf 'KOŞU KAPANDI: %s (sahip kararı).\n' "${KOSU_ID:-bilinmiyor}"
  exit 0
fi

KUTU_ARG="${1:-}"; TUR="${2:-yapim}"; KIP="${3:-interaktif}"; SINIF="${4:-gercek}"

# ── 1 · Argüman doğrulama (uydurma ada damga basılmaz) ────────────────────────────────────
[ -n "$KUTU_ARG" ] || hata "kutu verilmedi. Kullanım: /kosu <kutu> [yapim|kurulum|kapanis] [interaktif|bassiz]"
KUTU="$(basename "$KUTU_ARG")"
case "$KUTU" in
  ""|*[!A-Za-z0-9._-]*) hata "kutu adı geçersiz: '$KUTU' (izinli: A-Z a-z 0-9 . _ -)" ;;
esac
[ -f "$KOK/01_kutular/$KUTU/KUTU.md" ] || hata "kutu bulunamadı: 01_kutular/$KUTU/KUTU.md yok — koşu var olmayan kutuya açılmaz"
case "$TUR" in kurulum|yapim|kapanis) : ;; *) hata "tür 'kurulum', 'yapim' ya da 'kapanis' olmalı (gelen: '$TUR')" ;; esac
case "$KIP" in interaktif|bassiz) : ;; *) hata "kip 'interaktif' ya da 'bassiz' olmalı (gelen: '$KIP')" ;; esac
case "$SINIF" in gercek|tatbikat) : ;; *) hata "sınıf 'gercek' ya da 'tatbikat' olmalı (gelen: '$SINIF')" ;; esac

# ── 2 · Açık koşu varsa ikincisi açılmaz (bayat gösterge ayrıca raporlanır) ────────────────
if [ -e "$GOSTERGE" ]; then
  kosu_oku "$KOK" || true
  YAS=""
  if [ -n "${KOSU_DAMGA:-}" ]; then
    YAS=" · damga: ${KOSU_DAMGA}"
  fi
  hata "bu depoda zaten açık bir koşu var (${KOSU_ID:-okunamadı} · kutu ${KOSU_KUTU:-?}${YAS}). Koşu anormal bittiyse gösterge BAYAT kalmış olabilir: '/kosu kapat' ile temizle. Damga üstüne YAZILMAZ."
fi

# ── 3 · Kurulum bitmiş mi ─────────────────────────────────────────────────────────────────
[ -e "$KOK/.kurulum-tamam" ] || hata "kurulum işareti yok (.kurulum-tamam) — GENESIS çekilmeden otonom koşu açılmaz"

# ── 4 · Kapılanma çapaları: "kalkansız motor yok" (tasarım §8) ────────────────────────────
EKSIK=""
[ -d "$KOK/03_roller/disgoz" ] || EKSIK="$EKSIK dış-göz-koltuğu(03_roller/disgoz/)"
[ -f "$KOK/03_roller/disgoz/BRIFING.md" ] || EKSIK="$EKSIK dış-göz-brifing-iskeleti"
for D in T0 T1 T2 T3; do
  [ -s "$DIZIN/damgalar/$D" ] || EKSIK="$EKSIK ${D}-tatbikat-damgası"
done
[ -z "$EKSIK" ] || hata "kapılanma eksik —$EKSIK. Tatbikat damgası düşmeden otonom koşu YOKTUR (D-25 ②③; OTONOM_KOSU §10)."
# GERÇEK-KUTU ek iki şartı (OTONOM_KOSU §10): T6 damgası + watchdog fiilen kurulu.
# Tatbikat koşuları MUAF (tasarımın bilinçli istisnası: E4/E5 tatbikatları döngüsel bağımlılığa
# girmesin). Varsayılan `gercek`tir — muafiyet açıkça istenir, sessizce verilmez.
if [ "$SINIF" = "gercek" ]; then
  GERCEK_EKSIK="$(gercek_kutu_eksikleri "$DIZIN")"
  [ -z "$GERCEK_EKSIK" ] || hata "gerçek kutu koşusunun ek şartları eksik —$GERCEK_EKSIK. Haber kanalı ve watchdog kurulmadan (E5) gerçek bir kutu sahipsiz koşturulmaz; tatbikat için 4. argümanı 'tatbikat' ver."
fi

# ── 5 · Soru kanalı ön koşulu (D-25 ③) ────────────────────────────────────────────────────
# Gerekçe: koşunun olağan işi çatal üretmektir; kanalı kapalı bir koşu, sorusunu sessizce
# yutan koşudur. Kanal denetçisi fail-closed'dur (kendi hatası da "hazır değil"dir).
if [ -r "$DIZIN/karar-alani.sh" ]; then
  KANAL="$(bash "$DIZIN/karar-alani.sh" "$KOK" 2>/dev/null | head -n1 || true)"
else
  KANAL="HAZIR DEĞİL · tools/sevk/karar-alani.sh yok"
fi
[ "$KANAL" = "HAZIR" ] || hata "soru kanalı kapalı — $KANAL. Sahibin karar alanı yazılmadan otonom koşu açılmaz (D-25 ③)."

# ── 5b · Haber kanalı DERİN yoklaması (E5; yalnız gerçek sınıf) ───────────────────────────
# Neden burada ve neden SERT: kanalın kırık olduğunu öğrenmenin en ucuz anı, sahibin klavyede
# olduğu tek andır. Gece yarısı keşfedilen kırık kanal = haber alınmayan bir gecedir.
# Derin yoklama ağa çıkar (SMTP kimlik doğrulaması — POSTA GÖNDERMEZ); sevkin her Stop turunda
# yaptığı ucuz yoklamadan farkı budur.
if [ "$SINIF" = "gercek" ]; then
  if [ -r "$DIZIN/kanal-yokla.sh" ]; then
    HKANAL="$(CLAUDE_PROJECT_DIR="$KOK" bash "$DIZIN/kanal-yokla.sh" 2>/dev/null | head -n1 || true)"
  else
    HKANAL="HAZIR DEĞİL · tools/sevk/kanal-yokla.sh yok"
  fi
  [ "$HKANAL" = "HAZIR" ] || hata "haber kanalı kapalı — $HKANAL. Haber gitmeyen bir gece, gözetimsiz değil KÖRDÜR (tasarı §3.3)."
fi

# ── 5c · Uyanık tutma (E5; ölçüme dayalı) ─────────────────────────────────────────────────
# Bu makinede `pmset -g` uyku eşiğini dakikayla ölçtü: boşta kalan Mac uyur, uyuyan Mac'te ne
# koşu sürer ne watchdog ateşler — yani sessiz-ölüm alarmının KENDİSİ sessizce ölür. Sav koşu
# boyunca tutulur; sevk kapanışta, nabız bayat koşuda bırakır (sızan sav = Mac hiç uyumaz).
UYKU_NOT=""
if [ "$SINIF" = "gercek" ] && command -v caffeinate >/dev/null 2>&1; then
  # `-w $$` KULLANILMAZ: tören betiği hemen biter, sav da onunla ölürdü. Sav koşu boyunca
  # yaşamalı — bu yüzden bağımsız süreç olarak başlar, PID diske yazılır, üç yerden bırakılır
  # (sevk kapanışı · nabız bayat-koşu turu · /kosu kapat).
  nohup caffeinate -dimsu >/dev/null 2>&1 &
  CAFF_PID=$!
  disown "$CAFF_PID" 2>/dev/null || true
  printf '%s\n' "$CAFF_PID" > "$DIZIN/.caffeinate-pid" 2>/dev/null || true
  UYKU_ESIK="$(pmset -g 2>/dev/null | sed -n 's/^ *sleep *\([0-9][0-9]*\).*/\1/p' | head -n1)"
  UYKU_NOT="uyanık tutma: AÇIK (sistem uyku eşiği ${UYKU_ESIK:-?} dk; sav pid $CAFF_PID)"
elif [ "$SINIF" = "gercek" ]; then
  UYKU_NOT="uyanık tutma: YOK (caffeinate bulunamadı) — makine uyursa koşu durur ve haber GELMEZ"
fi

# ── 6 · Damga ─────────────────────────────────────────────────────────────────────────────
SIMDI="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
KOSU="K$(date -u '+%Y%m%d-%H%M%S')-$$"
printf '%s\t%s\t%s\t%s\t%s\ndamga\t%s\n' "$KOSU" "$KUTU" "$TUR" "$KIP" "$SINIF" "$SIMDI" > "$GOSTERGE" \
  || hata "gösterge yazılamadı: $GOSTERGE"

# ── 7 · İzin zemini (E1 ölçümünün kararı — tasarı §4) ─────────────────────────────────────
# settings.json'a `allow` listesi YAZILMAZ: başsız alt-ajanda ÖLÜ olduğu ölçüldü (E1 §3) ve
# dosyada duran ölü kural "var olmayan mekanik güvence" sınıfıdır. Zemin koşu komutunun
# bayrağıdır; burada METİN olarak üretilir ve günlüğe damgalanır (sonradan okunabilsin).
ZEMIN='--allowedTools "Read,Write,Edit,Grep,Glob,Bash,Agent"'
if [ "$KIP" = "bassiz" ]; then
  ZEMIN_NOT="başsız kip: izin reddi = anında red + iz (koşu sürer)"
else
  ZEMIN_NOT="interaktif kip: izin reddi = DURAN KAPI; cevapsız kalırsa koşu ASILI kalır (tek çıkış: DUR / watchdog — E5)"
fi

J_tip=kosu-acilis J_kosu="$KOSU" J_kutu="$KUTU" J_tur="$TUR" J_kip="$KIP" J_sinif="$SINIF" \
  J_izin_zemini="$ZEMIN" J_not="$ZEMIN_NOT" json_kur 2>/dev/null | gunluge_yaz "$KOK" \
  || printf 'UYARI: açılış kaydı günlüğe yazılamadı (zarf-ekle.sh) — koşu açık ama izsiz başladı.\n' >&2

# ── 7b · İLK HABER: kanalın canlı kanıtı (E5) ─────────────────────────────────────────────
# Gerçek sınıfta bu gönderim BİR KAPIDIR: gidemezse koşu açılmaz ve gösterge geri alınır.
# Derin yoklama (§5b) kimlik doğrulamasını sınadı; bu satır tesliminin fiilen olduğunu sınar —
# ikisi ayrı arızalardır (kimlik doğru olup kota/engel yüzünden teslim edilmeyen posta).
# Koşu İÇİNDEKİ sonraki gönderimler fail-OPEN'dır (tasarı §3.3): geceyi bir yönlendirici
# arızasına rehin vermeyiz. Asimetri bilinçlidir.
geri_al() {
  rm -f "$GOSTERGE"
  [ -f "$DIZIN/.caffeinate-pid" ] && { kill "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)" 2>/dev/null || true; rm -f "$DIZIN/.caffeinate-pid"; }
  hata "$1"
}
if [ "$SINIF" = "gercek" ]; then
  CLAUDE_PROJECT_DIR="$KOK" haber_at --olay kosu-basladi --kosu "$KOSU" --kutu "$KUTU" \
    --tur "$TUR" --kip "$KIP" --sinif "$SINIF" --uyku "$UYKU_NOT" \
    || geri_al "koşu-başladı haberi GÖNDERİLEMEDİ — kanal ayakta görünüyor ama teslim olmuyor. Gözü olmayan koşu açılmaz; gösterge geri alındı. Elle dene: bash tools/sevk/haber.sh --olay kosu-basladi --kosu deneme --kutu $KUTU"
fi

# ── 8 · Sahip yüzeyi ──────────────────────────────────────────────────────────────────────
cat <<TOREN
KOŞU AÇIK: $KOSU
  kutu : $KUTU   ·   tür: $TUR   ·   kip: $KIP   ·   sınıf: $SINIF
  izin zemini : $ZEMIN
  $ZEMIN_NOT
${UYKU_NOT:+  $UYKU_NOT
}${HKANAL:+  haber kanalı: HAZIR — koşu başladı postası gönderildi
}
Bundan sonrası yapının işi: sevk (Stop kancası) sıradaki görevi seçer, alt-ajan koşusunu
açtırır, kapıyı bağımsız karne olmadan kapatmaz. Sen yalnız duran kapıda çağrılırsın.
Koşuyu elle bitirmek: /kosu kapat
TOREN
