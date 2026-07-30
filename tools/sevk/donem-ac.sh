#!/bin/bash
# donem-ac — otonom dönemin AÇILIŞ TÖRENİ (E4, K3 tetiği). Meşru tetik: /donem becerisinin
# ön-işleme satırı, yani fiilen İNSANIN yazdığı komut (rol-ac.sh emsali; beceride
# disable-model-invocation kilidi var — ajan kendi dönemini açamaz).
#
# Kullanım: donem-ac.sh [kutu] [yapim|kurulum|kapanis] [gercek|tatbikat]
#           donem-ac.sh kapat
# KUTU ADI SEÇİMLİ (F1-5d): verilmezse açık kutu ARANIR; tam bir tane varsa o seçilir.
#
# Yazdığı: tools/sevk/.donem-acik
#   1. satır: "<dönem-id>\t<kutu>\t<tür>\t<sınıf>"  (biçim kapısı 1. ve 2. alanı okur — E1 uyumu)
#   2. satır: "damga\t<ISO>"
# Ayrıca zarf günlüğüne BAĞIMSIZ bir "donem-acilis" kaydı düşürür — sevkten ve Stop kancasından
# bağımsız (tasarım §2.1): dönem ilk adımda ölse bile "açıldı ama nabız gelmedi" kaydı VAR olur;
# E5 watchdog'unun okuyacağı çapa budur.
#
# DAMGA-DEĞİŞTİRMEZ: açık dönem varken ikincisi açılmaz (rol töreni emsali; kapatma ayrı komut).
# FAIL-CLOSED: kapılanma çapalarından biri eksikse dönem HİÇ AÇILMAZ ("kalkansız motor yok" —
#   tasarım §8; sevk aynı kontrolü her turda tekrarlar = çift hat).
set -uo pipefail
export LC_ALL=C.UTF-8

hata() { printf 'DÖNEM AÇILAMADI: %s\n' "$1" >&2; exit 1; }
trap 'hata "tören betiği kendi içinde durdu (satır $LINENO) — fail-closed"' ERR

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOSTERGE="$DIZIN/.donem-acik"
# İzin/bütçe ÇAPASI (hasım turu 2026-07-30): kancanın ve sevkin okuduğu izin listesi ile bütçe
# tavanı, eskiden doğrudan `01_kutular/<kutu>/KUTU.md`den okunuyordu. O dosya korunan-yolların
# hiçbir bölümünde değil ve dönem içinde ajanın ona yazması tasarımın kendi gereğidir (görev
# listesini G-01 doğurur) — yani kafesteki taraf kendi anahtarını ve kendi tavanını
# yazabiliyordu. Değerler artık BURADA, sahip klavyedeyken, kapalı sözlükle ayrıştırılır ve
# `tools/sevk/` altına (yani [SERT] + Bash dikişi arkasına) yazılır.
CAPA="$DIZIN/.donem-capa"

[ -r "$DIZIN/ortak.sh" ] || hata "ortak kitaplık yok ($DIZIN/ortak.sh) — sevk ailesi eksik (fail-closed)"
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

# ── kapat ─────────────────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "kapat" ]; then
  if [ ! -e "$GOSTERGE" ]; then printf 'DÖNEM YOK: kapatılacak açık dönem bulunmadı.\n'; exit 0; fi
  donem_oku "$KOK" || true
  rm -f "$GOSTERGE"
  # Çapa göstergeyle BİRLİKTE ölür: dönemi bitmiş bir izin listesinin diskte kalması,
  # bir sonraki dönemin kendi çapasını yazana kadar eski izinle koşması demek olurdu.
  rm -f "$CAPA"
  # Uyanık-tutma savını BIRAK (E5): sızan sav Mac'i hiç uyutmaz — ayrı bir arızadır.
  if [ -f "$DIZIN/.caffeinate-pid" ]; then
    kill "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)" 2>/dev/null || true
    rm -f "$DIZIN/.caffeinate-pid"
  fi
  J_tip=donem-kapanis J_donem="${DONEM_ID:-bilinmiyor}" J_kutu="${DONEM_KUTU:-}" \
    J_sebep="sahip kapattı (/donem kapat)" json_kur 2>/dev/null | gunluge_yaz "$KOK" || true
  printf 'DÖNEM KAPANDI: %s (sahip kararı).\n' "${DONEM_ID:-bilinmiyor}"
  exit 0
fi

KUTU_ARG="${1:-}"; TUR="${2:-yapim}"; SINIF="${3:-gercek}"

# ── 1 · Argüman doğrulama (uydurma ada damga basılmaz) ────────────────────────────────────
# KUTU ADI SEÇİMLİ (F1-5d): sahibin sıradaki kutunun DİZİN ADINI ezberlemesi gereken bir yerde
# duruyordu; oysa ad diskte yazılı. Argüman yoksa 01_kutular/ altındaki kutular sayılır (arşiv ve
# "_" önekli dizinler hariç). TAM BİR TANE varsa o seçilir; sıfır ya da birden çoksa tören DURUR
# ve adları sayar — "tahmin ederek aç" yoktur (fail-closed: yanlış kutuya dönem açmak sessiz zarardır).
if [ -z "$KUTU_ARG" ]; then
  ADAYLAR=""; SAYI=0
  for D in "$KOK"/01_kutular/*/; do
    [ -f "$D/KUTU.md" ] || continue
    AD="$(basename "$D")"
    case "$AD" in _*) continue ;; esac
    ADAYLAR="$ADAYLAR $AD"; SAYI=$((SAYI + 1))
  done
  [ "$SAYI" != "0" ] || hata "01_kutular/ altında kutu yok — dönem açılacak kutu bulunamadı (arşiv hariç bakıldı)"
  [ "$SAYI" = "1" ] || hata "birden çok açık kutu var —$ADAYLAR. Hangisi olduğunu yaz: /donem <kutu>"
  KUTU_ARG="$(printf '%s' "$ADAYLAR" | tr -d ' ')"
fi
KUTU="$(basename "$KUTU_ARG")"
case "$KUTU" in
  ""|*[!A-Za-z0-9._-]*) hata "kutu adı geçersiz: '$KUTU' (izinli: A-Z a-z 0-9 . _ -)" ;;
esac
[ -f "$KOK/01_kutular/$KUTU/KUTU.md" ] || hata "kutu bulunamadı: 01_kutular/$KUTU/KUTU.md yok — dönem var olmayan kutuya açılmaz"
case "$TUR" in kurulum|yapim|kapanis) : ;; *) hata "tür 'kurulum', 'yapim' ya da 'kapanis' olmalı (gelen: '$TUR')" ;; esac
case "$SINIF" in gercek|tatbikat) : ;; *) hata "sınıf 'gercek' ya da 'tatbikat' olmalı (gelen: '$SINIF')" ;; esac

# ── 2 · Açık dönem varsa ikincisi açılmaz (bayat gösterge ayrıca raporlanır) ────────────────
if [ -e "$GOSTERGE" ]; then
  donem_oku "$KOK" || true
  YAS=""
  if [ -n "${DONEM_DAMGA:-}" ]; then
    YAS=" · damga: ${DONEM_DAMGA}"
  fi
  hata "bu depoda zaten açık bir dönem var (${DONEM_ID:-okunamadı} · kutu ${DONEM_KUTU:-?}${YAS}). Dönem anormal bittiyse gösterge BAYAT kalmış olabilir: '/donem kapat' ile temizle. Damga üstüne YAZILMAZ."
fi

# ── 2b · İzin ve bütçe: KAPALI SÖZLÜKLE ayrıştır (hasım turu 2026-07-30) ──────────────────
# Neden BURADA: bu satırların okunacağı tek güvenli an, sahibin klavyede olduğu andır. Dönem
# içinde okunurlarsa ölçtükleri tarafın yazabildiği bir dosyadan okunmuş olurlar.
# Neden SERT: sözlük dışı jeton eskiden sessizce "izin yok"a düşüyordu (yazım hatası = sessiz
# daralma) ve toplayıcı ayrıştırıcı yüzünden «İZİN: yok (disa gerekmiyor)» satırı `disa`yı
# fiilen VERİYORDU — cümlenin anlamının tam tersi. Burada ikisi de dönemin açılmasını durdurur.
# Blok SINIRI: satır YALNIZ «## Duruş sözleşmesi» bloğunun içinde aranır — kurulum kapısı da
# orada arıyordu; kanca ise dosyanın TAMAMINDA arıyordu, yani blok dışına konan bir İZİN satırı
# iki denetimden de görünmeden kancayı eziyordu (aynı bulgunun ikinci yüzü).
KUTU_MD="$KOK/01_kutular/$KUTU/KUTU.md"
DURUS="$(awk '/^##[[:space:]]/{ic=0} /^##[[:space:]]*Duruş sözleşmesi/{ic=1;next} ic' "$KUTU_MD" 2>/dev/null || true)"
[ -n "$DURUS" ] || hata "kutunun duruş sözleşmesi bloğu yok ya da boş (## Duruş sözleşmesi · 01_kutular/$KUTU/KUTU.md) — izin ve bütçe okunamadan dönem açılmaz (fail-closed)"

IZIN_HAM="$(printf '%s\n' "$DURUS" | sed -n 's/^[[:space:]]*İZİN[[:space:]]*:[[:space:]]*//p' | head -n1)"
[ -n "$IZIN_HAM" ] || hata "duruş sözleşmesinde İZİN satırı yok (01_kutular/$KUTU/KUTU.md) — otonom dönemde izin penceresi açılmaz; hiçbir sınıf serbest değilse «İZİN: yok» yaz"
case "$IZIN_HAM" in *«*) hata "İZİN satırı doldurulmamış (yer tutucu «…» duruyor) — serbest sınıf yoksa «İZİN: yok» yaz" ;; esac
IZIN_JETONLARI=""
case "$IZIN_HAM" in
  yok|yok\ *)  : ;;   # kapalı değer: hiçbir sınıf önceden serbest değil
  *)
    for JETON in $(printf '%s' "$IZIN_HAM" | tr ',·' '  '); do
      case "$JETON" in
        git-obje|disa|mcp|yazim|korumali-yol|kutu-ciktilari) IZIN_JETONLARI="$IZIN_JETONLARI $JETON" ;;
        *) hata "İZİN satırında sözlük dışı jeton: '$JETON' (izinli: git-obje · disa · mcp · yazim · korumali-yol · kutu-ciktilari; hiçbiri istenmiyorsa «İZİN: yok»). Sessizce yok sayılmaz — yazım hatası izin sanılmaz." ;;
      esac
    done ;;
esac
IZIN_JETONLARI="$(printf '%s' "$IZIN_JETONLARI" | sed 's/^ *//')"

# BÜTÇE aynı bloktan okunur ve çapaya yazılır; sevk dönem içinde KUTU.md'ye bir daha bakmaz.
# Satır yoksa sevkin bugünkü fail-closed varsayılanı (3) çapaya yazılır — davranış değişmez,
# yalnız değerin evi ajanın yazamayacağı yere taşınır.
BUTCE_HAM="$(printf '%s\n' "$DURUS" | sed -n 's/^[[:space:]]*BÜTÇE[[:space:]]*:[[:space:]]*//p' | head -n1)"
BUTCE_SAYI="$(printf '%s' "$BUTCE_HAM" | sed -n 's/[^0-9]*\([0-9][0-9]*\).*/\1/p' | head -n1)"
BUTCE_NOT=""
if [ -z "$BUTCE_SAYI" ]; then
  BUTCE_SAYI=3
  BUTCE_NOT="UYARI: duruş sözleşmesinde sayılı BÜTÇE satırı yok — fail-closed varsayılan 3 kullanılıyor."
fi

# ── 3 · Kurulum bitmiş mi ─────────────────────────────────────────────────────────────────
[ -e "$KOK/.kurulum-tamam" ] || hata "kurulum işareti yok (.kurulum-tamam) — GENESIS çekilmeden otonom dönem açılmaz"

# ── 4 · Kapılanma çapaları: "kalkansız motor yok" (tasarım §8) ────────────────────────────
# PROVA FİŞLERİ ÇIKTI (F1-5h, 2026-07-30): T0-T3 damgaları KEEL sürümünün provasını kanıtlıyordu,
# BU kurulumun hazırlığını değil — ve şablonla DOLU geldikleri için kapı baştan mühürlü geçiyordu.
# Yerlerini bu kurulumda ÖLÇÜLEBİLEN dört çapa aldı: dış göz koltuğu (klasör + brifing iskeleti +
# alt-ajan koltuğu) ve otonom kipin kural evi. Dördü de "bu projede kurulmuş mu" sorusunu sorar.
EKSIK=""
[ -d "$KOK/03_roller/disgoz" ] || EKSIK="$EKSIK dış-göz-koltuğu(03_roller/disgoz/)"
[ -f "$KOK/03_roller/disgoz/BRIFING.md" ] || EKSIK="$EKSIK dış-göz-brifing-iskeleti"
[ -f "$KOK/.claude/agents/disgoz.md" ] || EKSIK="$EKSIK dış-göz-alt-ajan-koltuğu(.claude/agents/disgoz.md)"
[ -f "$KOK/02_kanon/OTONOM_DONEM.md" ] || EKSIK="$EKSIK otonom-kural-evi(02_kanon/OTONOM_DONEM.md)"
[ -z "$EKSIK" ] || hata "kapılanma eksik —$EKSIK. Kalkansız motor yok (OTONOM_DONEM §10); eksikler kurulumda doğar (G3.3e/G3.3f)."
# GERÇEK-KUTU ek şartları (OTONOM_DONEM §10): watchdog fiilen yüklü + nabzı taze + haber kanalı
# hazır. Tatbikat dönemleri MUAF (tasarımın bilinçli istisnası: E4/E5 tatbikatları döngüsel
# bağımlılığa girmesin). Varsayılan `gercek`tir — muafiyet açıkça istenir, sessizce verilmez.
if [ "$SINIF" = "gercek" ]; then
  GERCEK_EKSIK="$(gercek_kutu_eksikleri "$DIZIN")"
  [ -z "$GERCEK_EKSIK" ] || hata "gerçek kutu döneminin ek şartları eksik —$GERCEK_EKSIK. Haber kanalı ve watchdog kurulmadan (E5) gerçek bir kutu sahipsiz koşturulmaz; tatbikat için 3. argümanı 'tatbikat' ver."
fi

# ── 5 · Soru kanalı ön koşulu (D-25 ③) ────────────────────────────────────────────────────
# Gerekçe: dönemin olağan işi çatal üretmektir; kanalı kapalı bir dönem, sorusunu sessizce
# yutan dönemdir. Kanal denetçisi fail-closed'dur (kendi hatası da "hazır değil"dir).
if [ -r "$DIZIN/karar-alani.sh" ]; then
  KANAL="$(bash "$DIZIN/karar-alani.sh" "$KOK" 2>/dev/null | head -n1 || true)"
else
  KANAL="HAZIR DEĞİL · tools/sevk/karar-alani.sh yok"
fi
[ "$KANAL" = "HAZIR" ] || hata "soru kanalı kapalı — $KANAL. Sahibin karar alanı yazılmadan otonom dönem açılmaz (D-25 ③)."

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
# dönem sürer ne watchdog ateşler — yani sessiz-ölüm alarmının KENDİSİ sessizce ölür. Sav dönem
# boyunca tutulur; sevk kapanışta, nabız bayat dönemde bırakır (sızan sav = Mac hiç uyumaz).
UYKU_NOT=""
if [ "$SINIF" = "gercek" ] && command -v caffeinate >/dev/null 2>&1; then
  # `-w $$` KULLANILMAZ: tören betiği hemen biter, sav da onunla ölürdü. Sav dönem boyunca
  # yaşamalı — bu yüzden bağımsız süreç olarak başlar, PID diske yazılır, üç yerden bırakılır
  # (sevk kapanışı · nabız bayat-dönem turu · /donem kapat).
  nohup caffeinate -dimsu >/dev/null 2>&1 &
  CAFF_PID=$!
  disown "$CAFF_PID" 2>/dev/null || true
  printf '%s\n' "$CAFF_PID" > "$DIZIN/.caffeinate-pid" 2>/dev/null || true
  UYKU_ESIK="$(pmset -g 2>/dev/null | sed -n 's/^ *sleep *\([0-9][0-9]*\).*/\1/p' | head -n1)"
  UYKU_NOT="uyanık tutma: AÇIK (sistem uyku eşiği ${UYKU_ESIK:-?} dk; sav pid $CAFF_PID)"
elif [ "$SINIF" = "gercek" ]; then
  UYKU_NOT="uyanık tutma: YOK (caffeinate bulunamadı) — makine uyursa dönem durur ve haber GELMEZ"
fi

# ── 6 · Damga ─────────────────────────────────────────────────────────────────────────────
SIMDI="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
DONEM="K$(date -u '+%Y%m%d-%H%M%S')-$$"
printf '%s\t%s\t%s\t%s\ndamga\t%s\n' "$DONEM" "$KUTU" "$TUR" "$SINIF" "$SIMDI" > "$GOSTERGE" \
  || hata "gösterge yazılamadı: $GOSTERGE"
# ÇAPA: kancanın izin listesi + sevkin bütçe tavanı. Göstergeyle aynı dizinde ([SERT]) ve aynı
# Bash dikişinin arkasında. Yazılamazsa dönem AÇILMAZ ve gösterge geri alınır — çapasız dönem,
# izin listesi boş (fail-closed) ama bütçesi kutudan okunan bir dönem olurdu; yarım güvence
# ilan edilmiş güvenceden beterdir.
printf 'izin\t%s\nbutce\t%s\nkutu\t%s\ndonem\t%s\n' \
  "$IZIN_JETONLARI" "$BUTCE_SAYI" "$KUTU" "$DONEM" > "$CAPA" \
  || { rm -f "$GOSTERGE"; hata "izin/bütçe çapası yazılamadı: $CAPA — dönem açılmadı"; }

# ── 7 · İzin zemini (E1 ölçümünün kararı — tasarı §4) ─────────────────────────────────────
# settings.json'a `allow` listesi YAZILMAZ: başsız alt-ajanda ÖLÜ olduğu ölçüldü (E1 §3) ve
# dosyada duran ölü kural "var olmayan mekanik güvence" sınıfıdır. Zemin dönem komutunun
# bayrağıdır; burada METİN olarak üretilir ve günlüğe damgalanır (sonradan okunabilsin).
# KİP BAYRAĞI KALKTI (F1-5e): bayrak yalnız aşağıdaki NOT dizesini değiştiriyordu, davranışı
# değil. İzin penceresi artık hiçbir kipte açılmaz (F1-5f) — not da tek ve doğru hâline indi.
ZEMIN='--allowedTools "Read,Write,Edit,Grep,Glob,Bash,Agent"'
# Sahip yüzeyine basılan değer, kancanın FİİLEN okuyacağı çapadan gelir — «ekranda gördüğüm»
# ile «kapının uyguladığı» ayrı iki şey olamaz (hasım turu dersi: ilan ≠ kod).
IZIN_SATIRI="${IZIN_JETONLARI:-yok}"
ZEMIN_NOT="izin penceresi AÇILMAZ: çapada yazmayan sınıf engellenir, adım atlanır ve kuyruğa not düşer (dönem sürer). Bu dönemin serbest sınıfları: ${IZIN_JETONLARI:-YOK — hiçbir sınıf önceden serbest değil}"

J_tip=donem-acilis J_donem="$DONEM" J_kutu="$KUTU" J_tur="$TUR" J_sinif="$SINIF" \
  J_izin="${IZIN_SATIRI:-yok}" \
  J_izin_zemini="$ZEMIN" J_not="$ZEMIN_NOT" json_kur 2>/dev/null | gunluge_yaz "$KOK" \
  || printf 'UYARI: açılış kaydı günlüğe yazılamadı (zarf-ekle.sh) — dönem açık ama izsiz başladı.\n' >&2

# ── 7b · İLK HABER: kanalın canlı kanıtı (E5) ─────────────────────────────────────────────
# Gerçek sınıfta bu gönderim BİR KAPIDIR: gidemezse dönem açılmaz ve gösterge geri alınır.
# Derin yoklama (§5b) kimlik doğrulamasını sınadı; bu satır tesliminin fiilen olduğunu sınar —
# ikisi ayrı arızalardır (kimlik doğru olup kota/engel yüzünden teslim edilmeyen posta).
# Dönem İÇİNDEKİ sonraki gönderimler fail-OPEN'dır (tasarı §3.3): geceyi bir yönlendirici
# arızasına rehin vermeyiz. Asimetri bilinçlidir.
geri_al() {
  rm -f "$GOSTERGE" "$CAPA"
  [ -f "$DIZIN/.caffeinate-pid" ] && { kill "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)" 2>/dev/null || true; rm -f "$DIZIN/.caffeinate-pid"; }
  hata "$1"
}
if [ "$SINIF" = "gercek" ]; then
  CLAUDE_PROJECT_DIR="$KOK" haber_at --olay donem-basladi --donem "$DONEM" --kutu "$KUTU" \
    --tur "$TUR" --sinif "$SINIF" --uyku "$UYKU_NOT" \
    || geri_al "dönem-başladı haberi GÖNDERİLEMEDİ — kanal ayakta görünüyor ama teslim olmuyor. Gözü olmayan dönem açılmaz; gösterge geri alındı. Elle dene: bash tools/sevk/haber.sh --olay donem-basladi --donem deneme --kutu $KUTU"
fi

# ── 8 · Sahip yüzeyi ──────────────────────────────────────────────────────────────────────
cat <<TOREN
DÖNEM AÇIK: $DONEM
  kutu : $KUTU   ·   evre: $TUR   ·   sınıf: $SINIF
  izin zemini : $ZEMIN
  $ZEMIN_NOT
${UYKU_NOT:+  $UYKU_NOT
}${HKANAL:+  haber kanalı: HAZIR — dönem başladı postası gönderildi
}
Bundan sonrası yapının işi: sevk (Stop kancası) sıradaki görevi seçer, alt-ajan çağrısını
açtırır, görevi bağımsız karne olmadan kapatmaz. Üretim bitince dönem KENDİ KENDİNE kapanış
evresine geçer (dış göz brifingi + bağımsız kapanış denetimi); sen yalnız duran kapıda ve
kapanış mühründe çağrılırsın.
Dönemi elle bitirmek: /donem kapat
TOREN
