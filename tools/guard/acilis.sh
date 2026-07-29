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

# ── (5) Yarım kalan kurulum (F1-2f) — başlamış ama bitmemiş kurulumun tek işaretçisi ───────
# Gerekçe: kurulum yarıda kalırsa hiçbir yüzey bunu söylemiyordu. Sahip ertesi gün klasörü
# açar; pano yok, kokpit boş, sistem "kurulu değil" diye görünür ama nerede kalındığı
# yalnız 00_genesis/GENESIS_DURUM.md içinde yazılıdır ve oraya kimse bakmaz.
# Koşul İKİ parçalı: kurulum işareti YOK **ve** kurulum durumu "başlamadı" DEĞİL.
# Şablonun kendi kökünde satır DOĞMAZ (durum dosyası orada "kurulum başlamadı" der) —
# kurulmamışı kurulmuş-yarım sanmak yanlış alarmdır.
# Durum satırı okunamıyor/bozuksa satır BASILIR (sessiz geçmek yerine haber vermek): kurulum
# işareti yokken durum dosyasının bozuk olması zaten anormaldir.
# Satır BEKLEYEN ADIMIN ADINI TAŞIMAZ (hasım turu 2026-07-29): "G2 · Rol türetme + çapraz-
# kontrol" sahibin sözlüğünde olmayan bir etikettir ve sahibin yapacağı şeyi değiştirmez —
# nereye gideceğini söylemek yeterli. Etiketi basmaya çalışan ilk sürüm üç ayrı kusur
# doğurmuştu (boş bölümde sonraki başlığı adım sanmak · CRLF'in cümleye sızması · jargon).
# Nerede kalındığını GENESIS zaten kendi açılışında bu dosyadan okur.
GDURUM="$KOK/00_genesis/GENESIS_DURUM.md"
if [ ! -e "$KOK/.kurulum-tamam" ] && [ -r "$GDURUM" ]; then
  awk '
    # Susturma ÇAPALI: yalnız şablonun KENDİ cümlesi susturur. Alt-dize araması
    # ("başlamadı" geçen her satır) "G3 başlamadı." gibi bir cümlede yanlış yerde susuyordu.
    BEGIN { baslamadi = 0 }
    /^\*\*Durum:\*\*[[:space:]]*kurulum başlamadı\.?[[:space:]]*$/ { baslamadi = 1 }
    END {
      if (baslamadi == 1) exit 0
      printf "ℹ️ Kurulum yarım kalmış — 00_genesis klasöründe oturum açıp kaldığın yerden devam edebilirsin.\n"
    }
  ' "$GDURUM" 2>/dev/null || true
fi

exit 0
