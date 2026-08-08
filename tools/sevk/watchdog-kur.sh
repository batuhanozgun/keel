#!/bin/bash
# watchdog-kur — nabiz.sh'ı launchd'ye bağlar/söker (E5). Sahibin ya da kurulumun elinden koşar.
#
# Kullanım:  bash tools/sevk/watchdog-kur.sh            → kurar ve yükler
#            bash tools/sevk/watchdog-kur.sh --kaldir   → söker
#            bash tools/sevk/watchdog-kur.sh --durum    → canlılık raporu
#
# NEDEN launchd: watchdog'un Claude'dan bağımsız yaşaması gerekir (tasarım §8). launchd işi
# makine açık olduğu sürece diriltir; Claude'un ölümü onu etkilemez.
#
# İŞARET DEĞİL CANLILIK: bu betik `tools/sevk/watchdog-kurulu` dosyasını yazar ama o dosya
# yalnız NEREYE bakılacağını söyler. Koşu açılışındaki denetim işin fiilen YÜKLÜ olduğunu
# `launchctl print` ile ve son nabız damgasının tazeliğiyle doğrular — E4'ün en pahalı ders
# sınıfı buydu: dosyada duran ölü kural.
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"
ARALIK=300

hata() { printf 'watchdog-kur HATA: %s\n' "$1" >&2; exit 1; }

# ── U33 · KİMLİK YEREL ADDAN ÜRETİLMEZ ────────────────────────────────────────────────────
# Etiket eskiden YALNIZ klasör adındandı: `dev.keel.nabiz.$(basename "$KOK")`. İki ayrı yerde
# aynı adla duran iki kurulum (ör. ~/Dev/keel ve ~/Desktop/keel — bu üründe TAM OLARAK böyle
# iki kopya var) AYNI launchd etiketini üretiyordu. Kurulum betiği yüklemeden önce koşulsuz
# `launchctl bootout` çağırdığı için ikinci kurulum BİRİNCİNİN WATCHDOG'UNU SÖKÜYORDU: sahip
# hiçbir uyarı görmeden gece bekçisiz kalıyordu. Hüküm (Kök 5): kimlik ÇAKIŞAMAYACAK bir
# kaynaktan üretilir. Kaynak burada kurulumun MUTLAK YOLUdur; okunabilirlik için klasör adı
# önde kalır, tekillik özetten gelir.
#
# Özet aracı FAIL-CLOSED aranır: bulunamazsa çakışabilen eski ada geri DÜŞMEYİZ, kurulumu
# reddederiz. Sessizce zayıf kimliğe dönmek, kapatılan arızayı geri açmaktır.
# Üç araç SIRAYLA DENENİR, `elif` ile ELENMEZ: "araç PATH'te var" ile "araç çalışıyor" ayrı
# şeylerdir (bu ailenin tekrar eden dersi). Kırık bir shasum, çalışan bir md5'i devre dışı
# bırakmamalı. Üçü de üretemezse dönüş 1'dir ve çağıran kurulumu REDDEDER.
kimlik_ozeti() { # $1: özetlenecek dize → 8 hane hex
  local G="$1" O=""
  for arac in shasum md5 openssl; do
    case "$arac" in
      shasum)  O="$(printf '%s' "$G" | shasum -a 256 2>/dev/null | awk '{print $1}')" ;;
      md5)     O="$(printf '%s' "$G" | md5 -q 2>/dev/null)" ;;
      openssl) O="$(printf '%s' "$G" | openssl dgst -sha256 2>/dev/null | awk '{print $NF}')" ;;
    esac
    O="$(printf '%s' "$O" | tr 'A-Z' 'a-z' | cut -c1-8)"
    case "$O" in
      [0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]) printf '%s' "$O"; return 0 ;;
    esac
  done
  return 1
}

# XML KAÇIŞI (U33'ün ikinci yarısı): KOK · DIZIN · ETIKET aşağıdaki plist'e GÖMÜLÜR. İçinde
# `&` ya da `<` geçen bir yol ("~/Dev/A & B/proje") geçersiz XML üretir; launchd o dosyayı
# yükleyemez ve bugüne dek bunun tek belirtisi sessiz bir kurulum olurdu. Değer yapılandırılmış
# bir biçime giriyorsa o biçimin kuralıyla kaçırılır — varsayım yapılmaz.
xml_kacir() { # $1: ham değer
  printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'
}

# ESKİ ad BİREBİR eski formülle üretilir — devralma başka türlü kopar. Formülün kendi kusuru
# da korunur: `basename` çıktısındaki SATIRSONUNU `tr -c` bir tireye çeviriyordu, yani eski
# etiketler hep sondan tireliydi (`…nabiz.keel-`). Yeni ad o tireyi taşımaz; eski ad taşır,
# çünkü aranan şey diskte DURAN addır, olması gereken ad değil.
ESKI_SLUG="$(basename "$KOK" | tr -c 'A-Za-z0-9._-' '-' | cut -c1-40)"
ESKI_ETIKET="dev.keel.nabiz.$ESKI_SLUG"     # U33 ÖNCESİ ad — yalnız devralma/temizlik için
SLUG="$(basename "$KOK" | tr -d '\n' | tr -c 'A-Za-z0-9._-' '-' | cut -c1-40)"
OZET="$(kimlik_ozeti "$KOK")" || hata "kimlik özeti üretilemedi (shasum/md5/openssl yok) — çakışabilen eski ada DÜŞÜLMEZ, kurulum reddedildi"
ETIKET="dev.keel.nabiz.$SLUG-$OZET"
PLIST="$HOME/Library/LaunchAgents/$ETIKET.plist"
ESKI_PLIST="$HOME/Library/LaunchAgents/$ESKI_ETIKET.plist"
ISARET="$DIZIN/watchdog-kurulu"
UID_="$(id -u)"

ETIKET_X="$(xml_kacir "$ETIKET")"
DIZIN_X="$(xml_kacir "$DIZIN")"
KOK_X="$(xml_kacir "$KOK")"

# Eski adlı iş BİZİM MİYDİ? Yalnız plist'i BU kurulumun nabiz.sh'ını gösteriyorsa bizimdir.
# Göstermiyorsa BAŞKA bir kurulumundur ve ona DOKUNULMAZ — kapatılan arıza tam buydu.
# (Eski sürüm kaçışsız yazıyordu; iki biçim de aranır, yoksa devralma yolun içindeki tek bir
# `&` yüzünden sessizce kopardı.)
eski_is_bizim_mi() {
  [ -f "$ESKI_PLIST" ] || return 1
  grep -Fq "$DIZIN/nabiz.sh" "$ESKI_PLIST" 2>/dev/null && return 0
  grep -Fq "$DIZIN_X/nabiz.sh" "$ESKI_PLIST" 2>/dev/null
}

# Eski adlı işin devri/temizliği. Bizimse söker ve söyler; BAŞKASININSA dokunmaz ve söyler.
eski_isi_ele_al() { # $1: "kaldir" | "kur"
  if eski_is_bizim_mi; then
    launchctl bootout "gui/$UID_/$ESKI_ETIKET" >/dev/null 2>&1 \
      || launchctl unload "$ESKI_PLIST" >/dev/null 2>&1 || true
    rm -f "$ESKI_PLIST"
    printf 'eski adlı iş devralındı ve söküldü: %s (yeni kimlik: %s)\n' "$ESKI_ETIKET" "$ETIKET"
  elif [ -f "$ESKI_PLIST" ]; then
    printf 'UYARI: %s adlı launchd işi BAŞKA bir kurulumun (%s) — dokunulmadı.\n' \
      "$ESKI_ETIKET" "$ESKI_PLIST" >&2
    printf '       Eskiden bu ad paylaşıldığı için ikinci kurulum birincinin watchdog'"'"'unu söküyordu (U33).\n' >&2
  fi
}

durum_yaz() {
  printf 'etiket: %s\n' "$ETIKET"
  printf 'kimlik kaynağı: %s (klasör adı DEĞİL — mutlak yol özeti)\n' "$KOK"
  if launchctl print "gui/$UID_/$ETIKET" >/dev/null 2>&1; then
    printf 'launchd işi: YÜKLÜ\n'
  else
    printf 'launchd işi: YÜKLÜ DEĞİL\n'
  fi
  if [ -f "$ESKI_PLIST" ]; then
    if eski_is_bizim_mi; then
      printf 'eski adlı iş: VAR ve BİZİM (%s) — kurulum onu devralıp söker\n' "$ESKI_ETIKET"
    else
      printf 'eski adlı iş: VAR ama BAŞKA kurulumun (%s) — dokunulmaz\n' "$ESKI_ETIKET"
    fi
  fi
  if [ -f "$DIZIN/.nabiz-son" ]; then
    printf 'son nabız: %s\n' "$(head -n1 "$DIZIN/.nabiz-son")"
    # U32 · "Ne zaman koştu" ile "işini yaptı mı" AYRI iki sorudur; bu yüzey ikincisini de
    # söylemek zorunda. Taze bir damganın arkasında ortak.sh'ı okuyamamış, node'unu bulamamış
    # bir watchdog durabilir — sahip o hâlde başka yere bakmalı (üretilen hâlin tüketicisi).
    HAL_S="$(sed -n 's/^hal=//p' "$DIZIN/.nabiz-son" 2>/dev/null | head -n1)"
    case "$HAL_S" in
      TAM)   printf 'nabız hâli: TAM (işini yapabildi)\n' ;;
      EKSIK) printf 'nabız hâli: EKSİK — %s (koştu ama işini YAPAMADI)\n' \
               "$(sed -n 's/^sebep=//p' "$DIZIN/.nabiz-son" 2>/dev/null | head -n1)" ;;
      *)     printf 'nabız hâli: YAZILMAMIŞ (eski bir nabiz.sh koşuyor — damganın neyi kanıtladığı bilinmiyor)\n' ;;
    esac
  else
    printf 'son nabız: HİÇ (betik hiç koşmamış)\n'
  fi
}

case "${1:-}" in
  --durum) durum_yaz; exit 0 ;;
  --kaldir)
    launchctl bootout "gui/$UID_/$ETIKET" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST" "$ISARET"
    eski_isi_ele_al kaldir
    printf 'watchdog söküldü: %s\n' "$ETIKET"
    exit 0
    ;;
  '') : ;;
  *) hata "tanınmayan argüman: $1 (--kaldir | --durum)" ;;
esac

[ -r "$DIZIN/nabiz.sh" ] || hata "tools/sevk/nabiz.sh yok — kurulacak iş yok"
mkdir -p "$HOME/Library/LaunchAgents" 2>/dev/null || hata "LaunchAgents dizini açılamadı"

cat > "$PLIST" <<PLIST_SON
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ETIKET_X</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DIZIN_X/nabiz.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>CLAUDE_PROJECT_DIR</key><string>$KOK_X</string></dict>
  <key>StartInterval</key><integer>$ARALIK</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>$DIZIN_X/.nabiz-hata.log</string>
</dict>
</plist>
PLIST_SON

# Kendi etiketimizi söküp yeniden yüklüyoruz — ARTIK BU AD YALNIZ BİZİM (U33). Eski paylaşımlı
# adı ise devralma kuralı ele alır: bizimse söker, başkasınınsa dokunmaz ve sahibe söyler.
launchctl bootout "gui/$UID_/$ETIKET" >/dev/null 2>&1 || true
eski_isi_ele_al kur
if ! launchctl bootstrap "gui/$UID_" "$PLIST" 2>/dev/null; then
  launchctl load "$PLIST" 2>/dev/null || hata "launchd işi yüklenemedi: $PLIST"
fi
launchctl print "gui/$UID_/$ETIKET" >/dev/null 2>&1 || hata "iş yüklendi görünüyor ama launchctl onu bulamıyor — kurulum SAYILMAZ (ölü kural olmasın)"

{
  printf 'etiket=%s\n' "$ETIKET"
  printf 'plist=%s\n' "$PLIST"
  printf 'aralik_sn=%s\n' "$ARALIK"
  printf 'kurulum=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
} > "$ISARET"

printf 'watchdog kuruldu ve yüklendi.\n'
durum_yaz
