#!/bin/bash
# acilis — oturum-açılış kancası (SessionStart): sahibe kısa bilgi satırları, HER BİRİ koşullu
# (hiçbiri her oturumda çıkmaz; beşi birden çıkması olağandışı bir gündür).
# (1) V2 Öbek-2 (sahip yüzeyi): kapanışta sorulan soru sonraki oturumda buharlaşıyordu (ölçüldü);
#     kuyruk kalıcı, hatırlatma AÇILIŞTA + PANODA.
# (2) Dış göz (D-20 parça 2): brifing uzun süredir tazelenmediyse tek satır hatırlatma —
#     "uzun sessizlikten sonraki ilk açılış" anı. Eşik 7 gün.
# (3) Sabah yüzeyi (E5): gece bir dönem olduysa üç bloğa köprü.
# (4) Ortam (F1-2a): ZORUNLU bir araç (node/git) yoksa tek satır — SEÇİMLİ eksik burada SUSAR.
# (5) Yarım kurulum (F1-2f): kurulum başlamış ama bitmemişse nerede kalındığını söyler.
# Sahip seçimi (2026-07-24): ISRAR YOK — yaş BİLGİdir, uyarı değil; eskalasyon/dırdır
# bilinçli kapsam dışı. Satırlar ünlem/KIRMIZI taşımaz, hiçbir akışı kilitlemez.
# FAIL-OPEN: okunamayan/olmayan dosyada sessizce geçer (exit 0); açılışı hiçbir koşulda kilitlemez.
# SALT-OKUR: bu kanca hiçbir dosyaya yazmaz (kuyruğun mekanik yazarı kapanis.sh — F1 istisna 2;
# brifingin tek yazarı dış göz koltuğudur).
# Vault değilse (ilgili dosya/dizin yok) o satır hiç doğmaz: şablon kökü kirletilmez.
set -uo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BUGUN="$(date '+%Y-%m-%d')"

# Gün farkı Julian gün-numarasıyla hesaplanır (tarih aritmetiği kabuk-bağımsız kalsın diye);
# tarih deseni aralık niceleyicisi YOK — BSD awk taban uyumu. Tek ev: iki göz de bunu kullanır.
GUNNO='function gunno(y, m, d) { if (m < 3) { y--; m += 12 } return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d - 1524 }'

# ── (1) Sahipte bekleyen maddeler — açık madde = "- [ ]" ile başlayan satır ───────────────
KUYRUK="$KOK/00_pano/SENDE_BEKLEYEN.md"
if [ -r "$KUYRUK" ]; then
  awk -v bugun="$BUGUN" "$GUNNO"'
    BEGIN { n = 0; enEski = -1; split(bugun, b, "-"); bg = gunno(b[1] + 0, b[2] + 0, b[3] + 0) }
    /^- \[ \]/ {
      n++
      if (match($0, /[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/)) {
        split(substr($0, RSTART, RLENGTH), t, "-")
        yas = bg - gunno(t[1] + 0, t[2] + 0, t[3] + 0)
        if (yas > enEski) enEski = yas
      }
    }
    END {
      if (n == 0) exit 0
      if (enEski >= 1) printf "ℹ️ Sende bekleyen %d madde (en eskisi %d gündür) — \"bekleyenleri göster\" de.\n", n, enEski
      else printf "ℹ️ Sende bekleyen %d madde — \"bekleyenleri göster\" de.\n", n
    }
  ' "$KUYRUK" 2>/dev/null || true
fi

# ── (2) Dış göz brifingi tazeliği — yalnız koltuk varsa; eşik 7 gün ───────────────────────
# Yaş ölçüsü brifingin İÇİNDEKİ makine-okur "Tarih: YYYY-AA-GG" satırıdır (dosya mtime'ı
# git checkout'ta yalan söyler). Bekçinin kapanış kilidi AYRI ve daha serttir (git tarihine
# bakar); bu satır yalnız yumuşak hatırlatmadır — kapanış kilidiyle karıştırılmaz.
BRIFING="$KOK/03_roller/disgoz/BRIFING.md"
if [ -d "$KOK/03_roller/disgoz" ]; then
  if [ -r "$BRIFING" ]; then
    awk -v bugun="$BUGUN" "$GUNNO"'
      BEGIN { yas = -1; split(bugun, b, "-"); bg = gunno(b[1] + 0, b[2] + 0, b[3] + 0) }
      /^Tarih:/ {
        if (yas < 0 && match($0, /[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/)) {
          split(substr($0, RSTART, RLENGTH), t, "-")
          yas = bg - gunno(t[1] + 0, t[2] + 0, t[3] + 0)
        }
      }
      END {
        if (yas < 0) { printf "ℹ️ Dış göz brifingi tarihsiz — \"durumu anlat\" diyebilirsin.\n"; exit 0 }
        if (yas >= 7) printf "ℹ️ Son dış göz brifingi %d gündür tazelenmedi — \"durumu anlat\" diyebilirsin.\n", yas
      }
    ' "$BRIFING" 2>/dev/null || true
  else
    printf 'ℹ️ Dış göz brifingi yok — "durumu anlat" diyebilirsin.\n'
  fi
fi

# ── (3) Sabah yüzeyi (E5) — gözetimsiz gecenin tek işaretçisi ─────────────────────────────
# Gerekçe: D-21'in kapanış bloğu bir SOHBET yüzeyidir; gece döneminin sonunda sohbet YOKTUR.
# Bu satır, sabah bilgisayarı açan sahibi üç bloğa götüren tek köprüdür. ISRAR YOK (D-21):
# yaş bilgidir, uyarı değil; dosya yoksa satır hiç doğmaz.
SABAH="$KOK/00_pano/SABAH.md"
if [ -r "$SABAH" ]; then
  SABAH_BASLIK="$(head -n1 "$SABAH" 2>/dev/null || true)"
  # 2>/dev/null: dar PATH'te (grep/head yok) kanca sahibin ekranına "command not found" sızdırıyordu.
  SABAH_GUN="$(printf '%s' "$SABAH_BASLIK" | grep -o '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' 2>/dev/null | head -n1 2>/dev/null || true)"
  if [ -n "$SABAH_GUN" ]; then
    if [ "$SABAH_GUN" = "$(date '+%Y-%m-%d')" ]; then
      printf 'ℹ️ Bu gece bir dönem oldu — üç blok hazır: 00_pano/SABAH.md\n'
    else
      printf 'ℹ️ Son dönemin sabah yüzeyi %s tarihli: 00_pano/SABAH.md\n' "$SABAH_GUN"
    fi
  fi
fi

# ── (4) Ortam eksiği (F1-2a) — YALNIZ zorunlu araç yokken konuşur ─────────────────────────
# Gerekçe: node ya da git yoksa sistem sessizce yanlış davranır — koruma kancası yazmayı
# engeller, kurulum ilk adımda durur, tarih çapası doğmaz. Bu, "bilgi" sınıfının en sert ucudur
# ve yine de ISRAR YOK: tek satır, ünlem yok, hiçbir şeyi kilitlemez. Seçimli eksik SUSAR
# (her oturumda "curl yok" demek dırdırdır; onun yeri kurulum raporudur).
# Betiğin kendisi yoksa/patlarsa satır hiç doğmaz — açılış hiçbir koşulda kilitlenmez.
ORTAM="$KOK/tools/guard/ortam-kontrol.sh"
[ -r "$ORTAM" ] && bash "$ORTAM" --satir 2>/dev/null || true

# ── (5) Kurulum nerede kaldı (F1-2f + F1-1) — kurulmamış klasörün tek işaretçisi ────────────
# Gerekçe: kurulum başlamazsa ya da yarıda kalırsa hiçbir yüzey bunu söylemiyordu. Sahip ertesi
# gün klasörü açar; pano yok, kokpit boş, sistem "kurulu değil" diye görünür ama nerede kalındığı
# yalnız 00_genesis/GENESIS_DURUM.md içinde yazılıdır ve oraya kimse bakmaz.
#
# TEK KAYNAK (F1-1 düzeltmesi): durum artık makine bloğundan okunur (`## KURULUM DURUMU` →
# `Durum:`), insan cümlesinden DEĞİL. Eski hâl insan cümlesini (`**Durum:** kurulum başlamadı.`)
# satır-çapalı arıyordu ve iki ölçülmüş kusuru vardı: (a) aynı cümlenin bir KOPYASI dosyanın
# başka bir yerinde satır başında geçerse hatırlatma KALICI SUSUYORDU (bayrak sıfırlanmıyor,
# ilk eşleşme yetiyor) — sessiz ölüm; (b) cümlenin biçimi azıcık kayarsa (liste maddesi, kalın
# yazımın kayması) taze şablonda YANLIŞ ALARM doğuyordu. Aynı olguyu iki yerde yazmak drift
# kapısıdır; makine bloğu tek kaynak, insan cümlesi yalnız okunacak metin.
#
# DÖRT HÂL, İKİ CÜMLE (kodda gerçekten iki printf var — sayıyı abartmıyoruz):
#   başlamadı → "henüz başlamadı" (yeni: bugüne kadar bu hâlde HİÇBİR yüzey konuşmuyordu)
#   açık · bekliyor · blok yok/okunamıyor/tanınmayan değer → "yarım kalmış" (sessiz geçmek
#     yerine haber vermek; kurulum işareti yokken durum dosyasının bozuk olması zaten anormaldir)
# "bekliyor" hâlinin sahibe ayrı bir cümlesi YOK ve bu bilinçli bir sınırdır: o hâlde top
# gerçekten sahiptedir ("mührünü bekliyorum"), ama hangi mühür olduğunu bu yüzey bilemez —
# adım etiketi basmak yasak (jargon), sorunun metnini ise adım dosyası taşır. Sahibe soru
# taşıyan yüzey ayrıdır (00_pano/SENDE_BEKLEYEN.md) ve kurulum penceresinde henüz doğmamıştır.
# KEEL'in KENDİ kopyalarında (mutfak/vitrin) hiçbiri doğmaz: `.keel-kaynak` işareti susturur.
# O işaret DAĞITILMAZ (.gitignore), yani sahibin indirdiği kopyada bulunması imkânsızdır.
#
# Satır BEKLEYEN ADIMIN ADINI TAŞIMAZ (hasım turu 2026-07-29): "G2 · Rol türetme + çapraz-
# kontrol" sahibin sözlüğünde olmayan bir etikettir ve sahibin yapacağı şeyi değiştirmez —
# nereye gideceğini söylemek yeterli. Etiketi basmaya çalışan ilk sürüm üç ayrı kusur
# doğurmuştu (boş bölümde sonraki başlığı adım sanmak · CRLF'in cümleye sızması · jargon).
# Nerede kalındığını GENESIS zaten kendi açılışında bu dosyadan okur.
GDURUM="$KOK/00_genesis/GENESIS_DURUM.md"
kurulum_durumu_oku() {
  [ -r "$GDURUM" ] || return 0
  awk '
    /^## KURULUM DURUMU/ { basladi = 1; next }
    basladi && /^```/    { if (icinde) { exit } ; icinde = 1; next }
    icinde {
      p = index($0, ":")
      if (p > 0 && substr($0, 1, p - 1) == "Durum") {
        d = substr($0, p + 1)
        sub(/^[[:space:]]+/, "", d); sub(/[[:space:]]+$/, "", d)
        print d; exit
      }
    }
  ' "$GDURUM" 2>/dev/null || true
}

if [ -d "$KOK/00_genesis" ] && [ ! -e "$KOK/tools/guard/.keel-kaynak" ]; then
  KURULUM_DURUM="$(kurulum_durumu_oku)"
  if [ -e "$KOK/.kurulum-tamam" ]; then
    # TERS YÖN (hasım turu 2026-07-29): işaret var AMA kayıt kurulumu bitmiş göstermiyorsa
    # ortada bir çelişki vardır ve bugüne kadar hiçbir yüzey bunu söylemiyordu. İşaret koruma
    # rejiminin anahtarıdır: erken doğduysa sıra denetimi de, bu blok da, çekilme kapısının
    # kurulum kipi de susar. Tek satır, ısrar yok — ama sessizlik yok.
    case "$KURULUM_DURUM" in
      açık|bekliyor|başlamadı)
        printf 'ℹ️ Kurulum bitti işareti var ama kurulum kaydı yarım görünüyor — "kurulumu kontrol et" diyebilirsin.\n' ;;
    esac
  else
    case "$KURULUM_DURUM" in
      başlamadı)
        # Eylem cümlesi README'nin kurulum adımıyla BİREBİR aynı olmalı: sahibin kılavuzu
        # "o klasörü Claude Code'da aç ve selam yaz" diyor. İlk yazım "00_genesis klasöründe
        # oturum açarsan başlar" diyordu — sahibe kılavuzundan FARKLI bir iş söylüyordu ve
        # üstüne ham klasör adı basıyordu (hasım turu 2026-07-29). Nereye gidileceği makinenin
        # işidir; sahibin bileceği tek şey ne yazacağıdır.
        printf 'ℹ️ Bu klasörde kurulum henüz başlamadı — "selam" yazarsan başlar.\n' ;;
      *)
        printf 'ℹ️ Kurulum yarım kalmış — "devam" yazarsan kaldığımız yerden sürer.\n' ;;
    esac
  fi
fi

exit 0
