#!/bin/bash
# karar-alani — "bu projede sahibe soru sorulabilir mi?" hazırlık denetçisi (E3).
# Tek iş: 02_kanon/KARAR_ALANI.md var mı · Bölüm A (KEEL-genel soru çizgisi) bütün mü ·
# Bölüm B (sahip profili) DOLU mu. Kaynağı: tasarım §10 E3 satırı — "T3'ün süzgeç çalıştırması
# profili fiilen kullanır, PROFİL BOŞKEN KIRMIZI" + §13 damga şartı.
# Çıkış: 0 = hazır (stdout "HAZIR") · 1 = hazır değil (stdout "HAZIR DEĞİL · <sebep>").
# FAIL-CLOSED: betiğin kendi hatası da "hazır değil"dir (sessiz yeşil yok) — çünkü bu betiğin
#   yeşili, sahibe soru gitmesinin kapısıdır.
# Çağıranlar: zarf-bicim-kapisi.sh (çatal denetçisi GEÇTİ hükmünü işlerken) · sevk (E4) ·
#   kurulum denetçisi kalem-6 (E4).
# Türkçe harf güvenliği: eşleştirme birebir bayt; harf dönüşümü yok.
set -uo pipefail
export LC_ALL=C.UTF-8

hazir_degil() { printf 'HAZIR DEĞİL · %s\n' "$1"; exit 1; }
trap 'printf "HAZIR DEĞİL · karar-alani denetçisi kendi içinde hata verdi (satır %s) — fail-closed\n" "$LINENO"; exit 1' ERR

KOK="${1:-${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}}"
DOSYA="$KOK/02_kanon/KARAR_ALANI.md"

[ -f "$DOSYA" ] || hazir_degil "02_kanon/KARAR_ALANI.md yok (kurulum G3.3f'de kurar; kalıp: 00_genesis/KARAR_ALANI_KALIBI.md)"
[ -r "$DOSYA" ] || hazir_degil "02_kanon/KARAR_ALANI.md okunamıyor"

# ── Bölüm A · soru çizgisi bütün mü ───────────────────────────────────────────────────────
# Aşınmaya karşı ÜÇ çapa ibaresi + 8. maddenin varlığı. Çizgi KEEL-geneldir: kurulumda
# doldurulmaz, kopyalanır; eksilmesi kural aşınmasıdır (sessiz olamaz).
# BİÇİM NOTU (yaşanmış kırılma, 2026-07-27): «$capa» yazımı macOS bash 3.2'de değişken adına
# »'in baytını katıyor ve dal "unbound variable" ile SESSİZ ölüyordu — birim testi yakaladı.
# ASCII olmayan karaktere bitişik her genişletme SÜSLÜ PARANTEZLE yazılır: «${capa}».
grep -q '^## Bölüm A' "$DOSYA" || hazir_degil "Bölüm A başlığı yok (soru çizgisi silinmiş)"
for capa in 'bilgi kaynağı değildir' 'Türetilebilen sorulmaz' 'eşleşmeyen cevap'; do
  grep -qF "$capa" "$DOSYA" || hazir_degil "soru çizgisi aşınmış: «${capa}» çapası yok (Bölüm A değiştirilmez — retro + sahip onayı ister)"
done
grep -qE '^8\. ' "$DOSYA" || hazir_degil "soru çizgisi eksik: 8. madde yok (çizgi 8 maddedir)"

# ── Bölüm B · sahip profili DOLU mu ───────────────────────────────────────────────────────
grep -q '^## Bölüm B' "$DOSYA" || hazir_degil "Bölüm B başlığı yok (sahip profili hiç kurulmamış)"

# Dört başlık + gövde uzunluğu. Gövde = başlıktan sonraki, bir sonraki BAŞLIK ya da YATAY ÇİZGİ
# ('---') gelene kadar olan metin; «alan» işareti taşıyorsa ya da 40 bayttan kısaysa profil BOŞ.
# YATAY ÇİZGİ SINIRI (hasım bulgusu + bağımsız doğrulama 2026-07-28): yalnız '#' ile durmak,
# SON başlığın gövdesini belge sonundaki kapanış paragrafına taşıyordu — "Soru sorma tarzı"
# BOMBOŞ iken kanal HAZIR diyordu. Denetimin en can alıcı kalemi sessizce ölüydü.
EKSIK=""
while IFS= read -r baslik; do
  GOVDE="$(awk -v b="### $baslik" '
    $0 == b { icinde = 1; next }
    icinde && (/^#/ || /^---[[:space:]]*$/) { icinde = 0 }
    icinde { print }
  ' "$DOSYA")"
  if [ -z "$GOVDE" ]; then
    EKSIK="$EKSIK «${baslik}: başlık yok ya da gövdesi boş»"
    continue
  fi
  case "$GOVDE" in
    *'«'*) EKSIK="$EKSIK «${baslik}: doldurulmamış alan»"; continue ;;
  esac
  UZUNLUK="$(printf '%s' "$GOVDE" | tr -d ' \n\t' | wc -c | tr -d ' ')"
  if [ "$UZUNLUK" -lt 40 ]; then
    EKSIK="$EKSIK «${baslik}: gövde çok kısa (${UZUNLUK}B < 40B)»"
  fi
done <<'EOF_BASLIKLAR'
Ne bilir (sorular yalnız buradan çekilebilir)
Ne bilmez / bilmek istemez
Neye karar vermek ister
Soru sorma tarzı
EOF_BASLIKLAR

[ -z "$EKSIK" ] || hazir_degil "sahip profili doldurulmamış:$EKSIK — profil boşken çatal sahibe gidemez (tasarım §10/E3)"

# ── KALIP-DOLGU FRENİ (hasım turu 2026-07-30) ──────────────────────────────────────────────
# Yukarıdaki kalemler yalnız UZUNLUK ölçüyordu (≥40B) ve bu, profilin sahiple konuşulduğunu hiçbir
# biçimde göstermiyor: dört başlığa AYNI jenerik cümleyi yazan bir kurulum HAZIR alıyordu (iki
# bağımsız hasım ajanı bunu kum havuzunda fiilen koştu ve HAZIR/exit 0 aldı). Dört başlık dört
# AYRI soruya cevap verir; ikisinin gövdesi birebir aynıysa o cevaplar sahibin değil, dolgunun.
# Bu fren, metnin sahibin ağzından çıktığını KANITLAMAZ — repo içinden kanıtlanamaz, beyanlı sınır
# (provenans çapası GENESIS_DURUM teyit damgasıdır; kurulum-denetimi 7d onu arar). Gösterilmiş TEK
# sömürü yolunu kapatır ve fixture'ı da dürüst olmaya zorlar.
# Karşılaştırma boşluk-normalize gövde üzerindedir; harf dönüşümü YOK (Türkçe güvenliği).
GOVDELER=""
while IFS= read -r baslik; do
  G="$(awk -v b="### $baslik" '
    $0 == b { icinde = 1; next }
    icinde && (/^#/ || /^---[[:space:]]*$/) { icinde = 0 }
    icinde { print }
  ' "$DOSYA" | tr -d ' \n\t')"
  case "$GOVDELER" in
    *"|$G|"*) hazir_degil "sahip profilinde iki başlığın gövdesi BİREBİR aynı — dört başlık dört ayrı soruya cevap verir; aynı metin, profilin sahiple konuşulmadığının işaretidir (kalıp-dolgu freni)" ;;
  esac
  GOVDELER="$GOVDELER|$G|"
done <<'EOF_GOVDE'
Ne bilir (sorular yalnız buradan çekilebilir)
Ne bilmez / bilmek istemez
Neye karar vermek ister
Soru sorma tarzı
EOF_GOVDE

printf 'HAZIR\n'
exit 0
