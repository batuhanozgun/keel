#!/bin/bash
# sablon-hijyeni.sh — ŞABLONUN çalışma ağacı temiz mi (K7 / U22).
#
# NEDEN VAR — ölçülmüş kusur, 2026-08-07:
# Şablon deposunun çalışma ağacında `tools/sevk/kanal.conf` on gün durdu (2026-07-28'de bir
# tatbikat koşusundan kaldı) ve o dosya SAHİBİN E-POSTA ADRESİNİ taşır. Yanına iki dönem
# durumu daha birikmişti: `.haber-durum` (içinde `TEST-SIZMA-103643 / alarm:kirmizi`) ve
# `.nabiz-son`. Üçü de `.gitignore`'daydı, yani **git onları göremez**: `git status` tertemiz,
# `git log --all` boş. Kusuru gören TEK göz ürünün DIŞINDAydı (danışmanın bekçisi, madde 23)
# ve o SARI basıyordu. Ürünün kendisi kendi hijyenine kördü. Bu betik o körlüğü kapatır.
#
# NE ÖLÇER: `.gitignore`'un `# === KUTU-DURUMU-BASLANGIC ===` ile `# === KUTU-DURUMU-SON ===`
# arasındaki YOL satırları. O blok kurulu bir kutunun ürettiği yerel durumdur; şablon ağacında
# hiçbiri bulunmaz. LİSTE BURAYA KOPYALANMAZ — ikinci kopya bir gün ayrışır ve ayrıştığı gün
# kapı, kendi listesindeki dosyaları arayıp gerçekte var olanı kaçırır.
#
# NEREDE KOŞAR — ilan edilmiş sınır: yalnız `tools/guard/.keel-kaynak` taşıyan ağaçta ölçer.
# O işaret "burası KEEL'in kendisidir" demektir; izlenmez, bakımcı kendi makinesinde elle koyar
# (F1-2b). ÖLÇÜLDÜ 2026-08-07: işaret bakımcının HER İKİ kopyasında da var (geliştirme aslı ve
# dağıtım kopyası), yani kapı ikisini de tarar — bu satır tahminle değil `git ls-files --others
# --ignored` çıktısıyla yazıldı.
#   · bakımcının iki kopyası → ÖLÇÜLÜR
#   · kurulu kutu            → ölçülmez ve ölçülMEMELİ (orada bu dosyalar MEŞRUDUR)
#   · clone / ZIP            → ölçülmez, ama KAPSAM AÇIĞI DEĞİL: bu dosyalar `.gitignore`da
#     olduğu ve hiç commit edilmediği için bir clone'a ZATEN GİREMEZLER. Girebilecekleri tek
#     yol yerel `cp -R`dir ve o kopya `.keel-kaynak`ı da taşır — yani yine ölçülür.
# "Ölçmedim" ile "temiz" AYNI ŞEY DEĞİLDİR: işaret yoksa betik bunu ADIYLA söyler ve 0 döner.
# İKİNCİ GÖZ, ürünün DIŞINDA ve bilerek öyle (denetlenen taraf kendi çapasını yazamaz):
# danışmanın bekçisi iki kopyayı da dışarıdan tarar ve aynı üç dosyayı kendi başına arar.
#
# Kullanım:  bash tools/guard/sablon-hijyeni.sh [kök]
# Çıkış:     0 = YEŞİL ya da ÖLÇÜLMEDİ · 2 = KIRMIZI (kirli ağaç ya da denetimin kendi arızası)
# Fail-closed: blok bulunamazsa ya da boşsa KIRMIZI — sessiz yeşil YOK.
set -uo pipefail
export LC_ALL=C.UTF-8
shopt -s nullglob dotglob

KOK="${1:-${CLAUDE_PROJECT_DIR:-.}}"
trap 'printf "KIRMIZI · sablon-hijyeni kendi içinde hata verdi (satır %s) — fail-closed\n" "$LINENO"; exit 2' ERR
set -E

if [ ! -d "$KOK" ]; then
  printf 'KIRMIZI · kök yok: %s\n' "$KOK"
  exit 2
fi

# Bakımcı işareti yoksa burası şablon değildir. Sessiz geçmez, adıyla söyler.
if [ ! -e "$KOK/tools/guard/.keel-kaynak" ]; then
  printf 'ÖLÇÜLMEDİ · burası şablon ağacı değil (tools/guard/.keel-kaynak yok) — hijyen denetimi koşmadı\n'
  exit 0
fi

YOKSAY="$KOK/.gitignore"
if [ ! -f "$YOKSAY" ]; then
  printf 'KIRMIZI · .gitignore yok — kutu-durumu listesi evsiz (fail-closed)\n'
  exit 2
fi

BAS='# === KUTU-DURUMU-BASLANGIC ==='
SON='# === KUTU-DURUMU-SON ==='
grep -qF "$BAS" "$YOKSAY" || { printf 'KIRMIZI · .gitignore icinde "%s" imi yok — liste okunamiyor (fail-closed)\n' "$BAS"; exit 2; }
grep -qF "$SON" "$YOKSAY" || { printf 'KIRMIZI · .gitignore icinde "%s" imi yok — liste okunamiyor (fail-closed)\n' "$SON"; exit 2; }

# Blok içindeki yorum ve boş satırlar atılır; kalan her satır bir yol desenidir.
KALEMLER="$(awk -v b="$BAS" -v s="$SON" '
  index($0, b) == 1 { icinde = 1; next }
  index($0, s) == 1 { icinde = 0; next }
  icinde && $0 !~ /^[[:space:]]*#/ && $0 !~ /^[[:space:]]*$/ { print }
' "$YOKSAY")"

SAYI=0
[ -n "$KALEMLER" ] && SAYI=$(printf '%s\n' "$KALEMLER" | wc -l | tr -d ' ')
if [ "$SAYI" -eq 0 ]; then
  printf 'KIRMIZI · kutu-durumu blogu BOS — kapi hicbir sey olcmuyor (fail-closed)\n'
  exit 2
fi

SORUN=0
BULUNAN=0
while IFS= read -r DESEN; do
  [ -z "$DESEN" ] && continue
  # Desen `.gitignore` biçimindedir: kök-göreli yol, sonda `*` olabilir (ör. .cevap-capa*).
  # `nullglob` + `dotglob` açık olduğu için genişleme eşleşme yoksa BOŞ döner ve döngü dönmez.
  for YOL in "$KOK"/$DESEN; do
    [ -e "$YOL" ] || continue
    printf 'KIRMIZI · kurulu-kutu durum dosyasi sablon agacinda: %s\n' "${YOL#"$KOK"/}"
    BULUNAN=$((BULUNAN+1))
    SORUN=1
  done
done <<< "$KALEMLER"

if [ "$SORUN" -ne 0 ]; then
  printf 'KIRMIZI · %s dosya bulundu (%s desen tarandi). Bunlar kurulu kutunun yerel durumudur;\n' "$BULUNAN" "$SAYI"
  printf '          sablon agacinda durmalari sizinti yuzeyidir (kanal.conf sahibin e-posta adresini tasir).\n'
  printf '          SILMEDEN ONCE BAK: icerigi bir daha lazim olabilir, deponun DISINA tasi.\n'
  printf 'SONUÇ: KIRMIZI\n'
  exit 2
fi

printf 'geçti   · sablon calisma agaci temiz (%s desen tarandi, 0 bulundu)\n' "$SAYI"
printf 'SONUÇ: YEŞİL\n'
exit 0
