#!/bin/bash
# ortam-kontrol — KEEL'in ihtiyaç duyduğu araçları ÖLÇER ve sahibin diliyle açıklar (F1-2a / G0.0).
#
# NEDEN SAF KABUK: bu betik "node yok" diyebilmek zorundadır — o yüzden node'a, awk'a, sed'e,
# date'e dokunmaz. Yalnız bash yerleşikleri (command -v · read · printf · case) kullanır.
# Ortam bozukken koşabilen tek denetim budur; kırılırsa yerine bakacak ikinci göz yoktur.
#
# BAŞKA HİÇBİR ŞEYİ DENETLEMEZ: kurulumun doğruluğu `kurulum-denetimi.sh`in (G4.5), projenin
# sağlığı bekçinin işidir. Bu betik yalnız "araç var mı" sorusuna bakar.
#
# Kipler:
#   --rapor   (varsayılan) Sahibe okunacak tam rapor. Eksik kalemin DÖRT cevabı basılır;
#             var olan kalemin cevapları basılmaz (şişme freni).
#   --satir   Açılış kancasının basacağı EN FAZLA BİR bilgi satırı. Yalnız ZORUNLU eksikte
#             konuşur; seçimli eksik burada susar (ısrar yok — D-21). HER ZAMAN exit 0.
#   --kalemler <yol>  Veri dosyasını değiştirir (denetim ve prova için; varsayılan yanındaki dosya).
#
# Çıkış kodları (--rapor):
#   0  zorunluların hepsi var (seçimli eksik olabilir — o kırmızı DEĞİLDİR)
#   1  zorunlu araç eksik · var-ama-çalışmıyor · var-ama-AYARSIZ → kuruluma başlanmaz
#      (üçüncü hâl: araç kurulu ve çalışıyor ama kullanılamaz durumda — git'in kimliği gibi)
#   2  DENETİMİN KENDİSİ çalışamadı (argüman hatası · kalem listesi yok/boş/çözülemedi).
#      Bu "hepsi yerinde" DEĞİLDİR ve sessiz geçilmez; --satir kipinde tek satırla haber verilir.
#
# Seçimli kalem eksikliği HİÇBİR ZAMAN kırmızı değildir: ona bağlı özellik çalışmaz, sistem çalışır.
#
# BİLİNEN SINIR (zaman aşımı yok): --satir kipi hiçbir dış komut çağırmaz (yalnız yerleşikler +
# tek dosya okuma), çalışırlık yoklaması SADECE --rapor kipinde koşar. Bu yüzden açılış
# kancasının asılma yolu yoktur ve ayrı bir zaman aşımı makinesi kurulmamıştır.
set -uo pipefail
export LC_ALL=C.UTF-8

# Kendi dizinini YERLEŞİKLERLE bulur: `dirname` bir dış komuttur ve dar PATH'te (tam da bu
# betiğin konuştuğu durumda) bulunamaz — kendi veri dosyasını bulamayan denetim işe yaramaz.
DIZIN="${BASH_SOURCE[0]%/*}"
[ "$DIZIN" = "${BASH_SOURCE[0]}" ] && DIZIN="."
# `-P` + stdout susturma: CDPATH ayarlıysa `cd` gittiği dizini stdout'a basar ve çıktıyı kirletir.
DIZIN="$(cd -P -- "$DIZIN" >/dev/null 2>&1 && pwd)"   # cd ve pwd yerleşiktir
KALEMLER="$DIZIN/ortam-kalemleri.txt"
KIP="rapor"

# Denetimin kendisi çalışamıyorsa bu SESSİZ GEÇMEZ. Satır kipi açılışı kilitlemez (exit 0) ama
# tek satırla haber verir: "ölçemedim" ile "hepsi yerinde" aynı şey değildir — bu paketin
# varlık sebebi tam olarak bu ayrımdır.
oz_ariza() {
  if [ "$KIP" = "satir" ]; then
    printf 'ℹ️ Ortam denetimi çalışamadı (%s) — "bash tools/guard/ortam-kontrol.sh" ile bak.\n' "$1"
    exit 0
  fi
  printf 'ortam-kontrol: %s\n' "$1" >&2
  exit 2
}

while [ $# -gt 0 ]; do
  case "$1" in
    --rapor) KIP="rapor"; shift ;;
    --satir) KIP="satir"; shift ;;
    # `shift 2` tek argüman kalmışken BAŞARISIZ olur ve döngü sonsuza girer (hasım bulgusu,
    # altı mercekten altısı buldu). Değer varlığı önce sınanır.
    --kalemler)
      [ $# -ge 2 ] || { printf 'ortam-kontrol: --kalemler bir yol ister\n' >&2; exit 2; }
      KALEMLER="$2"; shift 2 ;;
    *) printf 'ortam-kontrol: bilinmeyen argüman: %s\n' "$1" >&2
       printf 'kullanım: ortam-kontrol.sh [--rapor|--satir] [--kalemler <yol>]\n' >&2; exit 2 ;;
  esac
done

[ -f "$KALEMLER" ] || oz_ariza "kalem listesi yok ya da dosya değil: $KALEMLER"
[ -r "$KALEMLER" ] || oz_ariza "kalem listesi okunamıyor: $KALEMLER"

# ── Bulma: önce PATH, sonra aday tam yollar (GUI oturumunda PATH dardır — guard.test.mjs emsali) ──
# Çıktı: bulunan yol (stdout) + 0 · bulunamadı + 1. Joker adaylar kabuk genişletmesiyle çözülür.
# `-x` YETMEZ, `-f` de aranır: çalıştırılabilir bir DİZİN "araç var" demek değildir.
# ADAY LİSTESİ BİLEREK DAR: file-guard · kapanis · icerik-suzgeci · ortak.sh aynı listeyi taşır
# (dört kopya, bu paketten ÖNCE de öyleydi). Bu liste onlardan GENİŞ olursa "node var" deriz ama
# koruma kancası node'u bulamaz — yanlış YEŞİL, yanlış alarmdan beterdir. Testi `ortam.test.mjs`
# bağlar: listeler ayrışırsa KIRMIZI. Bilinen sınır: nvm/fnm/volta/asdf kurulumları PATH'ten
# görünür, dar PATH'te görünmez — beşini birlikte genişletmek ayrı bir iştir.
bul() {
  local komut="$1" adaylar="$2" yol aday
  yol="$(command -v -- "$komut" 2>/dev/null || true)"
  case "$yol" in
    /*) printf '%s' "$yol"; return 0 ;;   # yalnız gerçek bir DOSYA yolu sayılır
    *)  : ;;                              # yerleşik/fonksiyon/alias "araç var" değildir
  esac
  for aday in $adaylar; do
    if [ -f "$aday" ] && [ -x "$aday" ]; then printf '%s' "$aday"; return 0; fi
  done
  return 1
}

# ── Çalışırlık yoklaması: VAR olmak ÇALIŞMAK değildir ─────────────────────────────────────
# Kanıt: macOS'ta Xcode komut satırı araçları kurulu değilken `/usr/bin/git` YİNE DE durur —
# bir vekil dosyadır ve her çağrıda hata verir. Yalnız varlığa bakan denetim orada "✔ git" der
# ve kurulum ilk commit'te patlar; bu paketin engellemek istediği şey tam olarak budur.
# SINIR (bilinçli): yoklama YALNIZ --rapor kipinde koşar. Sebebi macOS: araçları kurulu olmayan
# bir makinede `git` çağırmak KURULUM PENCERESİ açtırır. Kurulum anında bu yardımcıdır; her
# oturum açılışında sahibin karşısına pencere çıkarmak kabul edilemez. Bunun sonucu yazılıdır:
# günlük satır, bozuk-ama-var bir aracı SESSİZ geçer — yanlış bir şey SÖYLEMEZ, görmez.
yokla() {
  local yol="$1" arg="$2"
  [ -n "$arg" ] || return 0                 # yoklaması olmayan kalem yoklanmaz
  [ "$KIP" = "rapor" ] || return 0
  "$yol" $arg >/dev/null 2>&1
}

# ── Kullanılabilirlik yoklaması: ÇALIŞMAK da yetmez, AYARLI olmak gerekir ─────────────────
# Kanıt: git kurulu ve çalışıyor olabilir ama `user.name`/`user.email` ayarlı değilse İLK
# KAYIT DENEMESİNDE durur ve kurulum orada patlar. Yalnız varlığa ve çalışırlığa bakan denetim
# "✔ git" der, sonra kurulum ilk commit'te ölür — bu ÜÇÜNCÜ HÂL ölçülmeden görünmezdi.
# Sözleşme: her `ayar` satırı için "$yol $ayar" BOŞ OLMAYAN çıktı vermeli; çıktı boşsa ya da
# komut hata verirse kalem AYARSIZ sayılır.
# SINIR 1: `dene` ile aynı — yalnız --rapor kipinde koşar (macOS'ta aracı çağırmak kurulum
# penceresi açtırabilir; açılış kancasında pencere kabul edilemez).
# SINIR 2 (İLAN): yoklama aracın KENDİ ortamını kullanır. `git config` kullanıcı ayarını
# `$HOME` altından okur; HOME tanımsız bir kabukta ayarlı bir git bile AYARSIZ görünür. Bu
# yanlış alarm değil DOĞRU alarmdır — o kabukta commit de aynı sebeple düşer — ama sınırın
# bilinmesi gerekir: KEEL'in koştuğu her yerde (kanca, kurulum oturumu) HOME vardır.
ayarli() {
  local yol="$1" satir cikti
  [ -n "$AYAR" ] || return 0                # ayarı olmayan kalem yoklanmaz
  [ "$KIP" = "rapor" ] || return 0
  while IFS= read -r satir; do
    [ -n "$satir" ] || continue
    cikti="$("$yol" $satir 2>/dev/null)" || return 1
    [ -n "$cikti" ] || return 1
  done <<< "$AYAR"
  return 0
}

# ── Kayıt biçimi bash 3.2 uyumlu okunur: ilişkisel dizi YOK, kayıt tamamlanınca akıtılır ──
AD=""; SINIF=""; OZELLIK=""; ARAMA=""; ADAY=""; DENE=""; AYAR=""; AYARSIZ=""
NEDIR=""; NEDEN=""; YOKSA=""; NEREDEN=""
ZORUNLU_EKSIK=""; SECIMLI_EKSIK=""
Z_VAR=""; S_VAR=""; Z_METIN=""; S_METIN=""; BOZUK=""; KAYIT_SAYISI=0; TANINMAYAN=0

sifirla() { AD=""; SINIF=""; OZELLIK=""; ARAMA=""; ADAY=""; DENE=""; AYAR=""; AYARSIZ=""; NEDIR=""; NEDEN=""; YOKSA=""; NEREDEN=""; }

dort_cevap() {
  printf '      Bu nedir            : %s\n' "$NEDIR"
  printf '      KEEL neden istiyor  : %s\n' "$NEDEN"
  printf '      Kurmazsan ne olmaz  : %s\n' "$YOKSA"
  printf '      Nereden gelir       : %s\n' "$NEREDEN"
}

# AYARSIZ hâlinde "nereden gelir" cevabı YANLIŞ YÖNLENDİRMEDİR: araç zaten kurulu, sahibin
# yapması gereken şey indirmek değil bir kez ayar yazmaktır. O yüzden bu hâlde üç cevap basılır.
ayar_cevap() {
  printf '      Bu nedir            : %s\n' "$NEDIR"
  printf '      KEEL neden istiyor  : %s\n' "$NEDEN"
  printf '      Eksik olan ayar     : %s\n' "$AYARSIZ"
}

akit() {
  [ -n "$AD" ] || return 0
  KAYIT_SAYISI=$((KAYIT_SAYISI + 1))

  # Eksik/tanınmayan alan SESSİZ GEÇMEZ. `sinif` özellikle kritiktir: tanınmayan bir değer
  # zorunlu bir aracı sessizce seçimliye düşürürdü — denetimi kapatan tek harflik yazım hatası.
  # FAIL-CLOSED: tanınmayan sınıf ZORUNLU sayılır (yanlış alarm, yanlış yeşilden ucuzdur).
  if [ -z "$NEDIR" ] || [ -z "$NEDEN" ] || [ -z "$YOKSA" ] || [ -z "$NEREDEN" ] || [ -z "$ARAMA" ]; then
    BOZUK="$BOZUK $AD"
  fi
  case "$SINIF" in
    zorunlu|secimli) : ;;
    *) BOZUK="$BOZUK ${AD}(sınıf:'${SINIF}')"; SINIF="zorunlu" ;;
  esac
  if [ "$SINIF" = "secimli" ] && [ -z "$OZELLIK" ]; then BOZUK="$BOZUK ${AD}(özelliksiz)"; fi
  # `ayar` yazılıp `ayarsiz` yazılmayan kayıt sahibe "eksik" der ama ne yapacağını söylemez —
  # dört cevap kuralının aynısı. Eksik kayıt sayılır ve raporda kusur olarak görünür.
  if [ -n "$AYAR" ] && [ -z "$AYARSIZ" ]; then BOZUK="$BOZUK ${AD}(ayarsız-cevapsız)"; fi

  local yol durum ayar_kusuru=0
  if yol="$(bul "${ARAMA:-$AD}" "$ADAY")"; then
    if yokla "$yol" "$DENE"; then
      if ayarli "$yol"; then
        if [ "$SINIF" = "zorunlu" ]; then
          Z_VAR="$Z_VAR$(printf '  ✔ %-12s %s\n' "$AD" "$yol")"$'\n'
        else
          S_VAR="$S_VAR$(printf '  ✔ %-12s %s  → %s\n' "$AD" "$yol" "${OZELLIK:-—}")"$'\n'
        fi
        return 0
      fi
      # Kurulu ve çalışıyor ama kullanılamaz: AYARSIZ. "Kur" demek burada yanlış olur.
      durum="$(printf 'AYARSIZ (%s)' "$yol")"
      ayar_kusuru=1
    else
      # Dosya yerinde ama çalışmıyor: EKSİK sayılır. Sebep ayrı yazılır — "kur" demek yanlış
      # yönlendirme olurdu; sorun kurulu olmaması değil, kurulumun tamamlanmamış olmasıdır.
      durum="$(printf 'VAR AMA ÇALIŞMIYOR (%s)' "$yol")"
    fi
  else
    durum="BULUNAMADI"
  fi

  local cevap
  if [ "$ayar_kusuru" -eq 1 ]; then cevap="$(ayar_cevap)"; else cevap="$(dort_cevap)"; fi

  if [ "$SINIF" = "zorunlu" ]; then
    ZORUNLU_EKSIK="$ZORUNLU_EKSIK $AD"
    Z_METIN="$Z_METIN$(printf '  ✘ %-12s %s\n' "$AD" "$durum")"$'\n'"$cevap"$'\n\n'
  else
    SECIMLI_EKSIK="$SECIMLI_EKSIK $AD"
    S_METIN="$S_METIN$(printf '  ✘ %-12s %s  → "%s" çalışmaz\n' "$AD" "$durum" "${OZELLIK:-—}")"$'\n'"$cevap"$'\n\n'
  fi
}

while IFS= read -r satir || [ -n "$satir" ]; do
  satir="${satir%$'\r'}"                     # CRLF: tek başına BÜTÜN kayıtları buharlaştırıyordu
  case "$satir" in
    '#'*|'') continue ;;
    '['*']')
      akit; sifirla
      AD="${satir#[}"; AD="${AD%]}"
      ;;
    *': '*)
      anahtar="${satir%%: *}"; deger="${satir#*: }"
      case "$anahtar" in
        sinif)   SINIF="$deger" ;;
        ozellik) OZELLIK="$deger" ;;
        arama)   ARAMA="$deger" ;;
        aday)    ADAY="$deger" ;;
        dene)    DENE="$deger" ;;
        # `ayar` BİRDEN ÇOK KEZ yazılabilir: git'in iki ayarı (user.name + user.email) ayrı
        # satırlardır ve BİRİ eksikse ilk kayıt yine durur. Üzerine yazsaydık ikincisi
        # birincisini siler ve denetim yarım ölçerdi — sessiz yeşilin bu ailedeki hâli.
        ayar)    AYAR="${AYAR}${AYAR:+$'\n'}$deger" ;;
        ayarsiz) AYARSIZ="$deger" ;;
        nedir)   NEDIR="$deger" ;;
        neden)   NEDEN="$deger" ;;
        yoksa)   YOKSA="$deger" ;;
        nereden) NEREDEN="$deger" ;;
        # Tanınmayan anahtar da SESSİZ GEÇMEZ: `nedin:` gibi bir yazım hatası cevabı düşürür.
        *) TANINMAYAN=$((TANINMAYAN + 1)) ;;
      esac
      ;;
    # Hiçbir kalıba uymayan satır: en sinsi hâli `[node] ` (sonda boşluk) — o KAYIT komple
    # düşer, ötekiler okunur ve sayaç kapısı bunu göremez. Sayılır ve raporda söylenir.
    *) TANINMAYAN=$((TANINMAYAN + 1)) ;;
  esac
done < "$KALEMLER"
akit

# Hiç kayıt okunamadıysa bu "hepsi yerinde" DEĞİLDİR — listeyi okuyamamışızdır (boş dosya,
# bozuk başlıklar, satır sonu kazası). Sessiz yeşil, bu paketin en pahalı kusuru olurdu.
[ "$KAYIT_SAYISI" -gt 0 ] || oz_ariza "kalem listesinde hiç kayıt yok/çözülemedi: $KALEMLER"

# Tek bir tanınmayan satır bile okumayı GÜVENİLMEZ yapar — yalnız o satırı düşürmez, sonraki
# alanları BİR ÖNCEKİ kaydın üstüne yazar. `[git] ` (sonda boşluk) denendiğinde çıktı
# "✔ node /usr/bin/git" oldu: sessiz değil ama YANLIŞ. Yanlış rapor, raporsuzluktan beterdir.
[ "$TANINMAYAN" -eq 0 ] || oz_ariza "kalem listesinde $TANINMAYAN satır tanınmadı — okuma güvenilir değil: $KALEMLER"

# ── Satır kipi: açılış kancasının tek bilgi satırı ────────────────────────────────────────
if [ "$KIP" = "satir" ]; then
  if [ -n "$ZORUNLU_EKSIK" ]; then
    ARALI=""
    for a in $ZORUNLU_EKSIK; do [ -z "$ARALI" ] && ARALI="$a" || ARALI="$ARALI · $a"; done
    printf 'ℹ️ Ortam eksiği: %s yok — KEEL bu araç olmadan doğru çalışamaz. Ayrıntı: "bash tools/guard/ortam-kontrol.sh"\n' "$ARALI"
  fi
  exit 0
fi

# ── Rapor kipi ────────────────────────────────────────────────────────────────────────────
printf 'ORTAM KONTROLÜ — KEEL neye ihtiyaç duyuyor\n\n'
printf 'ZORUNLU — bunlar olmadan kurulum başlamaz\n'
printf '%s' "$Z_VAR"
[ -n "$Z_METIN" ] && printf '\n%s' "$Z_METIN"
printf '\nSEÇİMLİ — yokluğu sistemi durdurmaz, bağlı özelliği kapatır\n'
printf '%s' "$S_VAR"
[ -n "$S_METIN" ] && printf '\n%s' "$S_METIN"

[ -n "$BOZUK" ] && printf '\nKALEM LİSTESİ KUSURU — eksik/tanınmayan alanlı kayıt:%s (ortam-kalemleri.txt)\n' "$BOZUK"

printf '\n'
if [ -n "$ZORUNLU_EKSIK" ]; then
  printf 'SONUÇ: zorunlu araç eksik —%s. Kuruluma başlanmaz.\n' "$ZORUNLU_EKSIK"
  printf 'Kurulum sahibin bilgisayarında yapılır: KEEL kurmaz, yalnız söyler.\n'
  exit 1
fi
if [ -n "$SECIMLI_EKSIK" ]; then
  printf 'SONUÇ: zorunluların hepsi var. Seçimli eksik:%s — bağlı özellikler kapalı çalışır.\n' "$SECIMLI_EKSIK"
else
  printf 'SONUÇ: hepsi yerinde.\n'
fi
exit 0
