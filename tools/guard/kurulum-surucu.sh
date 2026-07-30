#!/bin/bash
# kurulum-surucu — kurulum SIRASININ sürücüsü (F1-1 · P1.1). Stop kancası: oturum bitmeye
# çalıştığında koşar. Tek işi sırayı taşımak: "hangi adımdayız, sıradaki hangisi, atlanmış mı".
# İÇERİK YAZMAZ, MÜHÜR VERMEZ, ADIM BİTİRMEZ — bir adımı yalnız GENESIS `Durum: bitti` yazarak
# bitirir; sürücü onu görüp SIRADAKİNİ AÇAR.
#
# NEDEN VAR: `GENESIS.md` 48 KB tek dosyaydı ve okunmasını HİÇBİR mekanizma zorlamıyordu
# (grep'le doğrulandı: hiçbir kancada, hiçbir betikte geçmiyordu). Bölünmüş plan bu riski
# BÜYÜTÜR — "G3'ü hiç açmadan G3'ü uyguladı" hâli mümkün hâle gelir ve kurulum öz-denetimi
# ÇIKTIYA bakar, OKUMAYA bakmaz. Sürücünün asıl işlevi budur: sıradaki adımın dosyasını her
# turda ADIYLA söylemek ve bitmemiş adımla oturumu kapattırmamak.
#
# NEDEN `tools/sevk/sevk.sh`a YASLANMIYOR: sevk rol seçen, bütçe sayan, karne bekleyen bir
# motordur ve açık kusurlu bir pakete bağlıdır. Kurulum düz bir çizgidir (G0→G5). Ortak olan
# tek şey KALIP, kod değil. Adı da bilerek "sevk" DEĞİL: "sevk" bu sözlükte bir görevi alt-ajana
# vermek demektir (docs/SOZLUK.md) ve bu betik alt-ajan çağırmaz — adım sıralar.
#
# NEDEN `tools/guard/` ALTINDA: burası kurulum penceresinde de [SERT] korumalıdır
# (file-guard.sh çekirdek istisnası) — yani KURAN AJAN bu betiği oturum içinde yeniden yazamaz.
# `tools/genesis/` gibi yeni bir dizin bu korumanın DIŞINDA kalırdı (ölçüldü: orada yazım serbest).
# Kardeşleri aynı evde: ortam-kontrol.sh (G0.0) · klasor-hazirligi.sh (G0.1) · kurulum-denetimi.sh (G4.5).
#
# SAF KABUK (node yok): kanca her oturum kapanışında koşar ve hiçbir kancada zaman aşımı tanımlı
# değildir; ucuz kalmak sözleşmedir. Ayrıca kurulumun ilk anında node'un varlığı henüz
# kanıtlanmamış olabilir (onu G0.0 ölçer) — sıra sürücüsü o ölçümün sonucuna bağlı olamaz.
#
# ÇIKIŞ SÖZLEŞMESİ (sevk.sh ile aynı KALIP):
#   exit 0, sessiz   = bu kancanın işi yok: kurulum bitmiş · hiç başlamamış · KEEL'in kendi
#                      kopyası · sahip bekleniyor · otonom dönem açık (Stop olayı onun)
#   exit 2 + stderr  = durmayı ENGELLER; stderr'daki talimat modele ulaşır
#   exit 0 + stdout  = sürücü çekildi (fren devreye girdi). DİKKAT: Stop kancasının stdout'u
#                      SAHİBİN EKRANINA ÇIKMAZ (harness onu hata ayıklama günlüğüne yazar) —
#                      bu yüzden stdout hiçbir zaman sahip yüzeyi sayılmaz; sahibin göreceği
#                      yüzey açılış kancasıdır (acilis.sh blok 5).
#
# FAIL YÖNÜ (bilinçli ve sevkin TERSİ): sevkte "güvenli taraf durmaktır" çünkü orada risk sonsuz
# Stop döngüsüdür. Kurulumda durmak demek "kurulum yarım kalır ve kimse haber vermez" demektir,
# yani bu ailenin en pahalı kusuru: sessiz yeşil. Bu yüzden okunamayan/bozuk durum ENGELLER
# (exit 2) ve sonsuz döngüyü sayaç freni keser — susmak değil.
#
# DÖNGÜ FRENİ (tek katman, yeterli): aynı (adım, durum) çifti üst üste 3 kez görülürse sürücü o
# oturumun kapanmasına izin verir ve sayacı SIFIRLAR — yani hiçbir oturumu hapsetmez, ama kalıcı
# olarak da ölmez (sonraki oturumda yeniden üç şans). `stop_hook_active` fren OLARAK KULLANILMAZ:
# sürücünün normal işleyişi çok turludur (her adım bitişinde bir tur), sevk.sh ile aynı gerekçe.
set -uo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DURUM_DOSYA="$KOK/00_genesis/GENESIS_DURUM.md"
SIRA_DOSYA="$KOK/00_genesis/adimlar/SIRA.txt"
ADIM_DIZIN="$KOK/00_genesis/adimlar"
SAYAC="$DIZIN/.kurulum-surucu-durum"
FREN_TAVANI=3

# ── En ucuz elemeler — dördü de "bu kancanın işi yok" demektir ────────────────────────────
# 1) Kurulum bitti: işaret G5.3.d'de doğar, o andan sonra sürücü yok hükmündedir.
#    AMA İŞARET SESSİZ BİR KAPATMA DÜĞMESİ OLAMAZ (hasım turu 2026-07-29, kritik): kurulum
#    penceresinde bu işaret file-guard'ın çekirdek istisnasının DIŞINDADIR, yani kuran ajan ya da
#    bir `touch` onu ortada yaratabilir. Yaratırsa sürücü, açılış hatırlatması ve G4.5'in kurulum
#    kipi AYNI ANDA susardı — sessiz yeşilin en pahalı biçimi. Bu yüzden işaret tek başına
#    yetmez: işaretin yanında SON adım bitmiş olmalı. Değilse işaret ERKEN doğmuştur ve sürücü
#    bunu yüksek sesle söyler (kontrol aşağıda, blok okunduktan sonra).
ISARET_VAR=0
[ -e "$KOK/.kurulum-tamam" ] && ISARET_VAR=1
# 2) KEEL'in kendi kopyası (mutfak/vitrin): bu işaret DAĞITILMAZ (.gitignore), yani sahibin
#    indirdiği hiçbir kopyada bulunmaz. Olmasa, bakımcının her geliştirme oturumu kurulum
#    sırası sanılırdı — negatif çapa (.kurulum-tamam yok) tek başına bunu ayırt EDEMİYOR.
#    BU DA SESSİZ BİR KAPATMA DÜĞMESİ OLAMAZ. Gerekçe üç satır aşağıda `.kurulum-tamam` için
#    yazılıydı ama buna uygulanmamıştı: tek `touch` ile kurulum sırası + açılış hatırlatması +
#    çekilme kapısı birlikte ve İZ BIRAKMADAN susuyordu — kapattığım yoldan daha ucuz
#    (hasım turu 2026-07-30, merceğin kaçırdığını çürütücü buldu). `-f` (dizin hâli geçmez) +
#    karşı-tanık: şablonun kendi kökünde blok "başlamadı" der; kurulum ortasında demez.
#    Karşı-kontrol blok okunduktan SONRA yapılır (aşağıda) — burada yalnız bayrak taşınır.
KEEL_KAYNAK=0
[ -f "$DIZIN/.keel-kaynak" ] && KEEL_KAYNAK=1
# 3) Otonom dönem açık: Stop olayı sevkin işidir, iki motor aynı olayda konuşmaz. Töre tarafında
#    bu hâl zaten kapalı (donem-ac.sh kurulum işareti olmadan dönem açmaz) ama tek noktalı bir
#    sözleşmeye yaslanmıyoruz — gösterge bayat kalabilir.
# `-f` (dosya), `-e` (herhangi bir şey) DEĞİL: gösterge yerinde bir DİZİN duruyorsa geçerli bir
# dönem yok — sevk onu silemiyor ve her turda gürültü basıyor; sürücünün de susması, kurulum
# penceresini iki motorun birden dışladığı bir boşluğa çeviriyordu (hasım turu 2026-07-29).
[ -f "$KOK/tools/sevk/.donem-acik" ] && exit 0
# 4) Burası bir KEEL kurulum klasörü mü: adım dizini yoksa sürücünün taşıyacağı sıra da yok.
[ -d "$ADIM_DIZIN" ] || exit 0

# ── Yardımcılar ──────────────────────────────────────────────────────────────────────────
# Sayaç: "<adım>\t<durum>\t<tekrar>\t<tamamlanan-sayısı>". İki iş yapar: döngü freni (3. alan) ve
# TEK-YAZIMDA SIRA ATLAMA tespiti (4. alan). Dosya makine durumudur (.gitignore'da).
sayac_oku() { # -> S_ADIM · S_DURUM · S_TEKRAR · S_TAMAM (yoksa boş)
  S_ADIM=""; S_DURUM=""; S_TEKRAR=0; S_TAMAM=""
  [ -r "$SAYAC" ] || return 0
  local satir; satir="$(head -n1 "$SAYAC" 2>/dev/null)" || return 0
  S_ADIM="$(printf '%s' "$satir" | cut -f1)"
  S_DURUM="$(printf '%s' "$satir" | cut -f2)"
  S_TEKRAR="$(printf '%s' "$satir" | cut -f3)"
  S_TAMAM="$(printf '%s' "$satir" | cut -f4)"
  case "$S_TEKRAR" in ''|*[!0-9]*) S_TEKRAR=0 ;; esac
  case "$S_TAMAM" in ''|*[!0-9]*) S_TAMAM="" ;; esac
}

# YAZAMIYORSAK FREN YOK, DOLAYISIYLA ENGEL DE YOK (hasım turu 2026-07-29): fren tek girdisi bu
# dosyadır. Yazım sessizce yutulursa (`|| true`) ve dizin yazılamaz hâle gelirse (dolu disk,
# salt-okunur bağlanmış disk, izin dönmesi) kanca her turda exit 2 basar ve oturum BİR DAHA
# kapanamaz. Sayacı yazamamak, engellemeyi bırakma sebebidir — hapsetmek değil.
# Yönlendirme HATASI da yutulur: `printf … > dosya 2>/dev/null` biçiminde "Permission denied"
# mesajını KABUK basar (printf değil) ve stderr'a sızar — kancanın çıktısını kirletir. Bloğun
# tamamı yönlendirilir.
sayac_yaz() { # 0 = yazıldı · 1 = yazılamadı
  { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "${4:-}" > "$SAYAC"; } 2>/dev/null
}

# ENGEL: talimatı stderr'a basar ve durmayı engeller. Fren sayacını da o çağırır — çünkü
# tekrar SAYILACAK olan tam olarak "aynı hâlde yeniden engelledim" olayıdır.
# Tekil-artış çapası. Sıra denetimi geçtikten sonra doğrulanmış "tamamlanan sayısı"na kurulur;
# `engel` onu yazar. Boşken denetim yapılmaz (ilk tur ya da silinmiş sayaç — ilan edilmiş sınır).
CAPA_TAMAM=""

engel() { # $1: adım · $2: durum · $3.. : talimat satırları
  local adim="$1" durum="$2"; shift 2
  sayac_oku
  local capa="${CAPA_TAMAM:-${S_TAMAM:-}}"
  local tekrar=1
  if [ "$S_ADIM" = "$adim" ] && [ "$S_DURUM" = "$durum" ]; then tekrar=$((S_TEKRAR + 1)); fi
  if [ "$tekrar" -gt "$FREN_TAVANI" ]; then
    # Fren: bu oturumu hapsetmiyoruz. Sayaç sıfırlanır — sonraki oturumda yeniden üç şans.
    sayac_yaz "$adim" "$durum" 0 "$capa" || true
    printf 'KURULUM SÜRÜCÜSÜ ÇEKİLDİ · %s · %s — aynı hâlde %s kez durdurdum, ilerleme yok.\n' \
      "$adim" "$durum" "$FREN_TAVANI"
    exit 0
  fi
  if ! sayac_yaz "$adim" "$durum" "$tekrar" "$capa"; then
    printf 'KURULUM SÜRÜCÜSÜ ÇEKİLDİ · sayaç yazılamadı (%s) — fren ölçülemiyorsa engellemem.\n' "$SAYAC"
    printf 'Son hâl: %s · %s\n' "$adim" "$durum"
    exit 0
  fi
  printf 'KURULUM SIRASI — oturum kapanamaz\n' >&2
  printf '%s\n' "$@" >&2
  exit 2
}

# ── Sıra verisi ──────────────────────────────────────────────────────────────────────────
# Alanlar TAB ayrık: kimlik · dosya · sahip cümlesi. Yorum ve boş satır atlanır.
[ -r "$SIRA_DOSYA" ] || engel "?" "sira-yok" \
  "Sıra dosyası okunamıyor: 00_genesis/adimlar/SIRA.txt" \
  "Kurulum sırasının verisi bu dosyadadır; o olmadan hangi adımın sırada olduğu bilinemez." \
  "Dosyayı yerine koy (KEEL'i indirdiğin kopyada var) ve devam et."

# CR SIYIRMA (satır sonu güvenliği): dosya CRLF ile kaydedilirse son alan `\r` taşır ve o
# karakter dosya adına yapışır ("G0.md\r" diye bir dosya yoktur) ya da sahibin ekranına sızar.
# awk yolları bunu zaten yutuyor (`[[:space:]]` CR'yi kapsar); kabuk yolları yutmaz — bu ailenin
# yerleşik dersi (CRLF'in cümleye sızması, hasım turu 2026-07-29).
cr_sil() { printf '%s' "${1%$'\r'}"; }

SIRA_KIMLIK=""; SIRA_SAYI=0
while IFS=$'\t' read -r k d c || [ -n "${k:-}" ]; do
  case "$k" in ''|'#'*) continue ;; esac
  k="$(cr_sil "$k")"; d="$(cr_sil "$d")"
  [ -n "$d" ] || engel "?" "sira-bozuk" \
    "Sıra dosyasında dosya adı boş: satır '$k' (00_genesis/adimlar/SIRA.txt)" \
    "Her satır üç alan taşır ve ayıraç TAB'dır: kimlik, dosya adı, tek satır açıklama."
  # Kimlik TEKİL olmalı — konumdan bağımsız. Tekrar, `sira_indeks`i belirsiz ve `sira_sonraki`yi
  # ÇOK SATIRLI yapar; ikinci hâlde bloğa çok satırlı bir `Adım:` değeri yazılmaya çalışılırdı.
  case "
$SIRA_KIMLIK" in
    *"
$k
"*) engel "?" "sira-tekrarli" \
          "Sıra listesinde '$k' kimliği birden fazla kez geçiyor." \
          "00_genesis/adimlar/SIRA.txt içinde her kimlik BİR kez yazılır: tekrar, sıradaki adımı" \
          "belirsiz yapar. Fazla satırı sil." ;;
  esac
  SIRA_KIMLIK="$SIRA_KIMLIK$k
"
  SIRA_SAYI=$((SIRA_SAYI + 1))
done < "$SIRA_DOSYA"

[ "$SIRA_SAYI" -gt 0 ] || engel "?" "sira-bos" \
  "Sıra dosyası boş: 00_genesis/adimlar/SIRA.txt" \
  "İçinde en az bir adım satırı olmalı."

# Kimliğe göre alan çekme (saf kabuk; birebir eşleşme, hiçbir harf dönüşümü yok).
sira_alan() { # $1: kimlik · $2: alan no (2=dosya, 3=cümle) -> stdout
  local hedef="$1" no="$2" k d c
  while IFS=$'\t' read -r k d c || [ -n "${k:-}" ]; do
    case "$k" in ''|'#'*) continue ;; esac
    if [ "$(cr_sil "$k")" = "$hedef" ]; then
      case "$no" in 2) cr_sil "$d" ;; 3) cr_sil "${c:-}" ;; esac
      return 0
    fi
  done < "$SIRA_DOSYA"
  return 1
}

sira_sonraki() { # $1: kimlik -> stdout (bir sonraki kimlik; son ise boş)
  printf '%s' "$SIRA_KIMLIK" | awk -v h="$1" 'NF { a[++n]=$0 } END { for (i=1;i<=n;i++) if (a[i]==h && i<n) print a[i+1] }'
}

sira_indeks() { # $1: kimlik -> stdout (1-tabanlı sıra no; yoksa 0)
  printf '%s' "$SIRA_KIMLIK" | awk -v h="$1" 'BEGIN { r=0 } NF { n++; if ($0==h && r==0) r=n } END { print r }'
}

# ── Durum bloğu ──────────────────────────────────────────────────────────────────────────
# Blok: "## KURULUM DURUMU" başlığından sonraki ilk fenced blok. Alanlar "Ad: değer".
[ -r "$DURUM_DOSYA" ] || engel "?" "durum-yok" \
  "Durum dosyası okunamıyor: 00_genesis/GENESIS_DURUM.md" \
  "Kurulumun nerede kaldığı yalnız o dosyada yazılıdır; o olmadan sıra taşınamaz." \
  "Dosyayı yerine koy ve devam et."

# Alan okuma İLK EŞLEŞMEDE DURMAZ, TEKRARI SAYAR (hasım turu 2026-07-29): bloğa ikinci bir
# `Durum:` satırı sızarsa (kopyala-yapıştır, yarım düzenleme) üç okuyucu da ilkini okur, insan
# ikincisini görür ve çekilme kapısı yeşil basar — sessiz ayrışma. Tekrarlı alan fail-closed'dır.
blok_alan() { # $1: alan adı -> stdout ("<sayı>\t<değer>")
  awk -v alan="$1" '
    /^## KURULUM DURUMU/ { basladi = 1; next }
    basladi && /^```/    { if (icinde) { exit } ; icinde = 1; next }
    icinde {
      # "Ad: değer" — ad birebir, değer sağdan/soldan kırpılır (CR dâhil: [[:space:]] kapsar).
      p = index($0, ":")
      if (p > 0 && substr($0, 1, p - 1) == alan) {
        n++
        if (n == 1) { d = substr($0, p + 1); sub(/^[[:space:]]+/, "", d); sub(/[[:space:]]+$/, "", d) }
      }
    }
    END { printf "%d\t%s\n", n + 0, d }
  ' "$DURUM_DOSYA" 2>/dev/null || true
}

# DİKKAT — `engel` KOMUT İKAMESİ İÇİNDEN ÇAĞRILMAZ: `exit 2` orada yalnız alt kabuktan çıkar,
# betikten çıkmaz ve engel sessizce yok olur. Bu yüzden alanlar önce ham okunur, tekrar denetimi
# ikame DIŞINDA yapılır. (Bu tuzağa bir kez düşüldü ve düzeltildi.)
HAM_ADIM="$(blok_alan 'Adım')"
HAM_DURUM="$(blok_alan 'Durum')"
HAM_TAMAM="$(blok_alan 'Tamamlanan')"

alan_kac() { local k="${1%%$'\t'*}"; case "$k" in ''|*[!0-9]*) printf '0' ;; *) printf '%s' "$k" ;; esac; }
alan_deger() { printf '%s' "${1#*$'\t'}"; }

# Üçü birden yoksa BLOK yoktur: "alanı yok" demek yerine bloğun tamamını tarif etmek gerekir
# (yanlış teşhis, teşhissizlikten iyi değildir).
if [ "$(alan_kac "$HAM_ADIM")" = "0" ] && [ "$(alan_kac "$HAM_DURUM")" = "0" ] \
   && [ "$(alan_kac "$HAM_TAMAM")" = "0" ]; then
  engel "?" "blok-yok" \
    "00_genesis/GENESIS_DURUM.md içinde makine bloğu okunamadı." \
    "Beklenen: '## KURULUM DURUMU' başlığı + fenced blok, içinde üç alan:" \
    "  Adım: <G0 | G1 | … | boşsa —>" \
    "  Durum: <başlamadı | açık | bekliyor | bitti>" \
    "  Tamamlanan: <virgülle ayrık bitmiş adımlar, boşsa —>" \
    "Bloğu bu biçimde yaz; insan cümlesini ('**Durum:** …') blok İÇİNE kopyalama."
fi

for ciftli in "Adım:$HAM_ADIM" "Durum:$HAM_DURUM" "Tamamlanan:$HAM_TAMAM"; do
  AD_="${ciftli%%:*}"; KAC_="$(alan_kac "${ciftli#*:}")"
  if [ "$KAC_" -gt 1 ]; then
    engel "?" "alan-tekrarli" \
      "Makine bloğunda '$AD_' alanı $KAC_ kez yazılmış." \
      "Her alan blokta BİR kez yazılır: makine ilkini okur, insan ikincisini görür ve ikisi" \
      "sessizce ayrışır — göz gezdiren kimse farkı görmez. Fazla satırı sil."
  fi
  # YOKLUK da fail-closed'dır (hasım turu 2026-07-30): tekrar denetleniyordu ama eksik alan
  # sessiz geçiyordu. Yazıcı awk yalnız VAR OLAN satırı ikame eder, eksik alanı YARATAMAZ —
  # yani `Tamamlanan` satırı silinmişse sürücü "AÇILDI" der, biten adımın kaydı kalıcı kaybolur
  # ve sonraki tur haksız yere "sıra atlandı" basar. Üstelik düzeltilecek alan blokta yoktur.
  if [ "$KAC_" = "0" ]; then
    engel "?" "alan-yok" \
      "Makine bloğunda '$AD_' alanı yok." \
      "Blok ÜÇ alan taşır ve eksik alanı sürücü yaratamaz — satırı elle ekle: $AD_: —" \
      "Eksik alan sessiz geçilirse biten adımın kaydı kaybolur ve sıra yanlış okunur."
  fi
done

ADIM="$(alan_deger "$HAM_ADIM")"
DURUM="$(alan_deger "$HAM_DURUM")"
TAMAMLANAN="$(alan_deger "$HAM_TAMAM")"

# Blok hiç yok / okunamadı: SESSİZ GEÇMEZ. "Ölçemedim" ile "kurulum yok" aynı şey değildir —
# bu ailenin en pahalı kusur sınıfı (D-28/D-29 dersi). Fren sonsuz döngüyü keser.
[ -n "$DURUM" ] || engel "?" "blok-yok" \
  "00_genesis/GENESIS_DURUM.md içinde makine bloğu okunamadı." \
  "Beklenen: '## KURULUM DURUMU' başlığı + fenced blok, içinde üç alan:" \
  "  Adım: <G0 | G1 | … | boşsa —>" \
  "  Durum: <başlamadı | açık | bekliyor | bitti>" \
  "  Tamamlanan: <virgülle ayrık bitmiş adımlar, boşsa —>" \
  "Bloğu bu biçimde yaz; insan cümlesini ('**Durum:** …') blok İÇİNE kopyalama."

# ── KEEL'in kendi kopyası mı, yoksa işaret kurulum ortasında mı doğdu ────────────────────
# Şablonun kendi kökünde blok "başlamadı" der (doğrulandı) ve orada susmak doğrudur. Kurulum
# ortasında aynı işaretin belirmesi bambaşka bir şeydir: sessiz kapatma. Karşı-tanık bloktur.
if [ "$KEEL_KAYNAK" = "1" ]; then
  case "$DURUM" in
    başlamadı|'') exit 0 ;;
    *) engel "${ADIM:-?}" "kaynak-isareti-kurulumda" \
         "Bakımcı işareti (tools/guard/.keel-kaynak) var ama bu klasörde kurulum sürüyor: Adım=${ADIM:-—} · Durum=${DURUM:-—}" \
         "O işaret yalnız KEEL'in kendi kopyalarında bulunur ve dağıtılmaz; kurulum ortasında" \
         "belirirse sıra denetimi, açılış hatırlatması ve çekilme kapısı birlikte susar." \
         "Kurulum yapıyorsan işareti kaldır. Burası KEEL'in kendi kopyasıysa kurulum yapılmamalı." ;;
  esac
fi

# ── Kurulum işareti erken doğmuş mu ──────────────────────────────────────────────────────
# İşaret varsa ve blok "son adım bitti" demiyorsa, işaret ERKEN doğmuştur. O hâlde işaret bir
# kapatma düğmesi olur: sürücü, açılış hatırlatması ve G4.5'in kurulum kipi birlikte susar.
# Yüksek sesle söylenir; sessiz geçilmez. (Meşru hâl: son adım bitti + işaret var → sessiz çıkış.)
if [ "$ISARET_VAR" = "1" ]; then
  SON_KIMLIK="$(printf '%s' "$SIRA_KIMLIK" | awk 'NF { s=$0 } END { print s }')"
  if [ "$DURUM" = "bitti" ] && [ "$ADIM" = "$SON_KIMLIK" ]; then exit 0; fi
  # Çare sırası bilinçli: ÖNCE bloğu düzeltmek önerilir. Ters sıra, kurulumu bitirmiş birine
  # ilk çare olarak işareti SİLMEYİ öğretiyordu — işaret silinince koruma rejimi kurulum kipine
  # düşer ve otonom dönem hiç açılamaz (hasım turu 2026-07-30).
  engel "${ADIM:-?}" "isaret-erken" \
    "Kurulum işareti (.kurulum-tamam) var ama kurulum kaydı bitmiş görünmüyor: Adım=${ADIM:-—} · Durum=${DURUM:-—}" \
    "Bu işaret kurulumun SON adımında bırakılır ve bırakıldığı an koruma rejimini değiştirir;" \
    "erken doğarsa sıra denetimi, açılış hatırlatması ve çekilme kapısı BİRLİKTE susar." \
    "Kurulumu bitirdiysen kaydı son hâle getir: Adım: $SON_KIMLIK · Durum: bitti" \
    "Bitirmediysen işareti kaldır ve kaldığın adımdan devam et (işaret G5'in son işidir)."
fi

# ── Durum makinesi ───────────────────────────────────────────────────────────────────────
case "$DURUM" in
  başlamadı)
    # Kurulum hiç başlamadı → sürücünün işi yok. AMA "başlamadı" bir kez YALAN söyleyebilir:
    # blok hiç güncellenmemişse kurulum fiilen ilerlemiş olabilir ve o hâlde sürücü kurulumun
    # TAMAMI boyunca susardı (hasım turu 2026-07-29, kritik). Ayırt eden şey, kurulumun kendi
    # ürettiği klasörler: dokunulmamış bir indirmede hiçbiri YOKTUR (aynı ölçüt klasör
    # hazırlığının 3. emniyet kemerinde de kullanılıyor — tek ölçüt, iki kapı).
    for iz in "02_kanon" "00_pano" "01_kutular" "03_roller"; do
      if [ -e "$KOK/$iz" ]; then
        engel "?" "blok-bayat" \
          "Blok 'başlamadı' diyor ama kurulum fiilen ilerlemiş (var: $iz)." \
          "Blok güncellenmediği sürece sıra denetimi kapalı kalır ve sahibin ekranına yanlış" \
          "cümle basılır — yanlış rapor, raporsuzluktan beterdir." \
          "Bloğu gerçek duruma getir: Adım = açık adımın kimliği · Durum = açık."
      fi
    done
    exit 0
    ;;
  açık|bekliyor|bitti) : ;;
  *)
    # Bayt sayısı mesaja GİRER: Türkçe harfler ayrık birleşen işaretlerle (NFD) yazıldığında
    # ekranda geçerli değerden AYIRT EDİLEMEZ ve "X tanınmadı, geçerli değerler: X" gibi
    # onarılamaz görünen bir mesaj çıkar. Fark tek yerde görünür — baytta (hasım turu 2026-07-29).
    engel "${ADIM:-?}" "durum-taninmadi" \
      "Durum alanı tanınmadı: '$DURUM' (okuduğum değer $(printf '%s' "$DURUM" | wc -c | tr -d ' ') bayt)" \
      "Geçerli dört değer (birebir, Türkçe harflerle): başlamadı (11 bayt) · açık (6) · bekliyor (8) · bitti (5)" \
      "Bayt sayısı tutmuyorsa değer görünmeyen bir yazım farkı taşıyor: kopyalamak yerine ELLE yaz." \
      "Tanınmayan değer sessizce 'yolunda' sayılmaz — düzelt ve devam et."
    ;;
esac

# Adım kimliği sırada olmalı.
if [ -z "$ADIM" ] || [ "$ADIM" = "—" ]; then
  engel "?" "adim-bos" \
    "Durum '$DURUM' ama Adım alanı boş." \
    "Kurulum başladıysa Adım alanı bir adım kimliği taşır. Sıradaki adım: $(printf '%s' "$SIRA_KIMLIK" | awk 'NF { print; exit }')"
fi
ADIM_NO="$(sira_indeks "$ADIM")"
[ "$ADIM_NO" != "0" ] || engel "$ADIM" "adim-taninmadi" \
  "Adım kimliği sırada yok: '$ADIM'" \
  "Geçerli kimlikler 00_genesis/adimlar/SIRA.txt içinde yazılıdır."

# ── Sıra denetimi: TAMAMLANAN, sıranın kesintisiz ÖN EKİ olmalı ve ADIM ondan hemen sonrası ─
# Bu, "G0 bitmeden G1 açılamaz" cümlesinin mekanik karşılığıdır. Atlama ÜÇ biçimde olur:
# (a) Tamamlanan'da boşluk var (G0,G2) · (b) Adım, tamamlananların hemen ardından gelen adım
# değil · (c) hepsi TEK YAZIMDA tamamlanmış ilan edilmiş (aşağıdaki tekil-artış freni).
# İLAN EDİLMİŞ SINIR (hasım turu 2026-07-29 yakaladı, ilk yorum yalnız iki biçim sayıyordu):
# bu üç denetim de bloğun İÇ TUTARLILIĞINI ölçer. Bir adımın gerçekten YAPILDIĞINI sürücü
# ölçmez — onu G4.5 çekilme kapısı (çıktıya bakar) ve sahip mühürleri taşır. Sürücünün sözü
# "sıra atlanmadı"dır, "iş yapıldı" değil.
BEKLENEN_ADET=$((ADIM_NO - 1))
SAYILAN=0
# Dosya-adı genişlemesi kapalı: bloğa `*` düşerse `for t in $TAMAMLANAN` kökteki dosya adlarını
# listeye sokuyordu ve rapor dosyada YAZMAYAN bir kimliği suçluyordu (yanlış rapor).
set -f
if [ -n "$TAMAMLANAN" ] && [ "$TAMAMLANAN" != "—" ]; then
  ESKI_IFS="$IFS"; IFS=','
  for t in $TAMAMLANAN; do
    # Kırpma (yerleşiklerle; boşluklu yazım "G0, G1" meşrudur)
    t="${t#"${t%%[![:space:]]*}"}"; t="${t%"${t##*[![:space:]]}"}"
    [ -n "$t" ] || continue
    SAYILAN=$((SAYILAN + 1))
    T_NO="$(sira_indeks "$t")"
    if [ "$T_NO" = "0" ]; then
      IFS="$ESKI_IFS"
      engel "$ADIM" "tamamlanan-taninmadi" \
        "Tamamlanan listesinde tanınmayan adım: '$t'" \
        "Geçerli kimlikler 00_genesis/adimlar/SIRA.txt içinde yazılıdır."
    fi
    if [ "$T_NO" != "$SAYILAN" ]; then
      IFS="$ESKI_IFS"
      engel "$ADIM" "sira-atlandi" \
        "Sıra bozuk: Tamamlanan listesi '$t' ile devam ediyor, ama sırada o konumda başka bir adım var." \
        "Tamamlanan listesi sıranın kesintisiz ön eki olmalı — atlanan adım geriye dönük tamamlanmış sayılmaz." \
        "Sıra: $(printf '%s' "$SIRA_KIMLIK" | awk 'NF { printf "%s%s", (n++ ? " → " : ""), $0 } END { print "" }')"
    fi
  done
  IFS="$ESKI_IFS"
fi
set +f

# TEKİL-ARTIŞ FRENİ (üçüncü atlama biçimi). Tamamlanan listesinin tek meşru büyütücüsü BU
# betiktir ve her seferinde BİR adım ekler. Sayaç son yazdığı sayıyı hatırlar; blok ondan fazlaya
# atlamışsa artışı sürücü yapmamıştır — tek yazımda ilan edilmiştir.
# Sayaçta kayıt YOKSA denetlenmez ve bu İLAN EDİLMİŞ bir sınırdır: sayaç izlenmeyen bir makine
# dosyasıdır (`git clean` onu siler), yokluğunu alarma çevirmek her taze klonda yanlış alarm olurdu.
sayac_oku
if [ -n "$S_TAMAM" ] && [ "$SAYILAN" -gt "$S_TAMAM" ] && [ $((SAYILAN - S_TAMAM)) -gt 1 ]; then
  engel "$ADIM" "tek-yazimda-atlama" \
    "Tamamlanan listesi bir turda $S_TAMAM'dan $SAYILAN'a atladı." \
    "Bu listeyi yalnız sürücü büyütür ve her seferinde BİR adım ekler; toplu artış, adımların" \
    "tek yazımda 'bitti' ilan edildiği anlamına gelir." \
    "Listeyi $S_TAMAM adıma geri al ve adımları sırayla bitir."
fi

# Çapa buradan sonra kurulur: sayı DOĞRULANMIŞ sıra üzerinden okundu, artık sonraki turların
# kıyas noktası olabilir. (Sırayı geçemeyen bir blok çapa olamaz — yanlışı sabitlerdik.)
CAPA_TAMAM="$SAYILAN"

if [ "$SAYILAN" != "$BEKLENEN_ADET" ]; then
  ONCEKI="$(printf '%s' "$SIRA_KIMLIK" | awk -v n="$BEKLENEN_ADET" 'NF { i++; if (i==n) { print; exit } }')"
  # Teşhis İKİ YÖNLÜ: liste eksik de olabilir FAZLA da. Tek yönlü cümle, fazlalık hâlinde
  # düzeltmeye çalışan tarafı listeye adım EKLEMEYE yönlendiriyordu (hasım turu 2026-07-29).
  if [ "$SAYILAN" -gt "$BEKLENEN_ADET" ]; then
    engel "$ADIM" "adim-geride" \
      "Sıra tutmuyor: Tamamlanan listesi '$ADIM' için gerekenden FAZLA adım sayıyor." \
      "Tamamlanan sayısı: $SAYILAN · '$ADIM' açıkken beklenen: $BEKLENEN_ADET" \
      "Muhtemel sebep: '$ADIM' hem açık hem tamamlanmış yazılmış. Listeden fazlalığı çıkar" \
      "ya da Adım alanını listeyle uyumlu adıma getir."
  fi
  engel "$ADIM" "adim-erken" \
    "Sıra atlandı: '$ADIM' açık ama ondan önceki adımların hepsi tamamlanmamış." \
    "Tamamlanan sayısı: $SAYILAN · '$ADIM' için gereken: $BEKLENEN_ADET (bitmesi gereken son adım: ${ONCEKI:-—})" \
    "Sırayı geriye al: bitmeyen adımı aç, bitir, sonra sıradakine geç. Sıra atlanamaz."
fi

ADIM_DOSYA="$(sira_alan "$ADIM" 2)" || ADIM_DOSYA=""
ADIM_CUMLE="$(sira_alan "$ADIM" 3)" || ADIM_CUMLE=""
ADIM_YOL="00_genesis/adimlar/$ADIM_DOSYA"

# Adım dosyası fiilen var mı: listede olup diskte olmayan adım, sürücünün sevk edeceği hiçbir
# şey olmadığı hâldir ve sessiz geçilemez.
[ -n "$ADIM_DOSYA" ] && [ -r "$KOK/$ADIM_YOL" ] || engel "$ADIM" "adim-dosyasi-yok" \
  "Adım dosyası okunamıyor: $ADIM_YOL" \
  "Sıra listesinde '$ADIM' var ama dosyası yok — kurulum tarifinin o parçası eksik." \
  "Dosyayı yerine koy (KEEL'i indirdiğin kopyada var) ve devam et."

# ── ÇİFT HATTIN TERS YÖNÜ ────────────────────────────────────────────────────────────────
# Çekilme kapısı hiçbir kancada değildir ve kendi başına koşmaz; YEŞİL koştuğunda iz bırakır.
# SON adım o iz olmadan ne AÇILIR ne SÜRDÜRÜLÜR.
# Kontrol BURADA, durum makinesinden ÖNCE (ilk yazımda bloğu yazdıktan SONRA geliyordu ve
# "tek atımlık zil"e dönüşüyordu: bir tur engelledikten sonra kayıt zaten `açık` olduğu için
# `açık` yolu bu satıra hiç gelmiyordu ve çekilmenin tamamı denetimsiz tamamlanabiliyordu —
# hasım turu 2026-07-30, kritik).
# İz `-f` ile aranır, `-e` ile DEĞİL: `mkdir` ile uydurulan bir DİZİN izi geçerli sayıyordu ve
# kalıcıydı (KIRMIZI kapı bile onu silemiyordu). Aynı ders 74. satırda `.donem-acik` için yazılıydı.
# İLAN EDİLMİŞ SINIR: iz bir kolaylık değil güvence değildir — kabuk komutuyla `touch` edilebilir.
# Ölçtüğü şey "kapı bu klasörde en az bir kez yeşil koştu"dur; tazeliği ölçülmez.
SON_ADIM="$(printf '%s' "$SIRA_KIMLIK" | awk 'NF { s=$0 } END { print s }')"
# "Son adım yürürlükte" iki hâlde de doğrudur: açık adım SON adımsa, ya da bu tur SON adımı
# açacaksak (Durum: bitti + sıradaki son adım). İkisini birden kapsamak, kapının tek turluk
# olmasını engelleyen şeydir.
SONRAKI_OLACAK=""
[ "$DURUM" = "bitti" ] && SONRAKI_OLACAK="$(sira_sonraki "$ADIM")"
if { [ "$ADIM" = "$SON_ADIM" ] || [ "$SONRAKI_OLACAK" = "$SON_ADIM" ]; } \
   && [ ! -f "$DIZIN/.kurulum-denetimi-son" ]; then
  engel "$ADIM" "kapi-kosmadi" \
    "Son adım ($SON_ADIM) aktarım öz-denetimi YEŞİL koşmadan yürütülemez." \
    "O denetim kurulumun tek sabit kapısıdır ve kendi başına koşmaz: 'bash tools/guard/kurulum-denetimi.sh' koştur." \
    "YEŞİL çıkınca iz düşer ve son adım açılır; KIRMIZI ise eksiği kapat ve yeniden koştur."
fi

# ── Üç hâl ───────────────────────────────────────────────────────────────────────────────
if [ "$DURUM" = "bekliyor" ]; then
  # Sahip bekleniyor (mühür ya da cevap). Oturumun kapanmasına İZİN VERİLİR: sahibi bilgisayar
  # başında tutmak, iki mühür arasına tuş koymaktan da kötüdür. Tekrar sayacı sıfırlanır;
  # tekil-artış çapası (4. alan) KORUNUR — yoksa bekleme her seferinde freni siliyor olurdu.
  sayac_oku
  sayac_yaz "$ADIM" "$DURUM" 0 "${S_TAMAM:-}" || true
  exit 0
fi

if [ "$DURUM" = "açık" ]; then
  engel "$ADIM" "açık" \
    "Açık adım: $ADIM — $ADIM_CUMLE" \
    "Tarifi: $ADIM_YOL (adımı AÇMADAN uygulama; indeksteki tek satır özet tarif değildir)" \
    "Bitirince $DURUM_DOSYA bloğunda 'Durum: bitti' yaz — sıradakini sürücü açar." \
    "Sahibin mührünü ya da cevabını bekliyorsan 'Durum: bekliyor' yaz; oturum o zaman kapanabilir."
fi

# DURUM = bitti → sıradakini AÇ (sürücünün tek yazma işi).
SONRAKI="$(sira_sonraki "$ADIM")"

if [ -z "$SONRAKI" ]; then
  # Son adım bitti ama kurulum işareti yok: G5 çekilme dizisi tamamlanmamış.
  engel "$ADIM" "cekilme-yarim" \
    "Son adım ($ADIM) bitti ama kurulum işareti (.kurulum-tamam) yok." \
    "Çekilme dizisi tamamlanmamış: $ADIM_YOL sonundaki sırayı bitir (temizlik → hijyen commit →" \
    "son bekçi denetimi yeşil → kurulum işareti → son commit)." \
    "İşaret doğduğu an bu sürücü kendiliğinden susar."
fi

# İkinci hat: tekrarlı kimlik yukarıda (yükleme sırasında) yakalanıyor, ama sıradaki adımın TEK
# satır olduğu burada da doğrulanır — bloğa çok satırlı bir `Adım:` değeri hiçbir yolla yazılmaz.
if [ "$(printf '%s\n' "$SONRAKI" | grep -c .)" != "1" ]; then
  engel "$ADIM" "sonraki-tekil-degil" \
    "Sıradaki adım tek değil (sıra listesi bozuk)." \
    "00_genesis/adimlar/SIRA.txt içinde her kimlik BİR kez yazılır."
fi

YENI_TAMAMLANAN="$ADIM"
if [ -n "$TAMAMLANAN" ] && [ "$TAMAMLANAN" != "—" ]; then YENI_TAMAMLANAN="$TAMAMLANAN, $ADIM"; fi

# Blok YERİNDE yeniden yazılır (append değil). Geçici dosya + mv: yarım yazılmış durum dosyası,
# hiç yazılmamıştan kötüdür (sıra okunamaz hâle gelirdi). Ad PID taşır: aynı anda kapanan iki
# oturum aynı geçici dosyayı ezip birbirinin yazımını yarım bırakıyordu (hasım turu 2026-07-29).
GECICI="$DURUM_DOSYA.surucu-yeni.$$"
if awk -v yeniAdim="$SONRAKI" -v yeniTamam="$YENI_TAMAMLANAN" '
    /^## KURULUM DURUMU/ { basladi = 1; print; next }
    basladi && /^```/ {
      if (icinde) { icinde = 0; basladi = 0; print; next }
      icinde = 1; print; next
    }
    icinde {
      p = index($0, ":")
      if (p > 0) {
        ad = substr($0, 1, p - 1)
        if (ad == "Adım")       { print "Adım: " yeniAdim;        next }
        if (ad == "Durum")      { print "Durum: açık";            next }
        if (ad == "Tamamlanan") { print "Tamamlanan: " yeniTamam; next }
      }
      print; next
    }
    { print }
  ' "$DURUM_DOSYA" > "$GECICI" 2>/dev/null && [ -s "$GECICI" ]; then
  # İZİN KORUMA: `mv` geçici dosyanın (umask'tan gelen) modunu taşır; sahip durum dosyasına
  # daraltılmış izin verdiyse sürücü onu sessizce genişletiyordu. Mod önce okunur, sonra geri konur.
  ESKI_MOD="$(ls -l "$DURUM_DOSYA" 2>/dev/null | cut -c2-10)"
  # YAZIM DOĞRULANIR: `mv` patlarsa akış eskiden devam ediyor ve modele "Sıradaki adım AÇILDI"
  # deniyordu — kayıt eski adımda kalırken. Yanlış rapor, raporsuzluktan beterdir (hasım turu).
  if ! mv -f "$GECICI" "$DURUM_DOSYA" 2>/dev/null; then
    rm -f "$GECICI" 2>/dev/null
    engel "$ADIM" "blok-yazilamadi" \
      "Sıradaki adım AÇILAMADI: 00_genesis/GENESIS_DURUM.md yerine konamadı (yazma izni/disk)." \
      "Kayıt hâlâ '$ADIM · bitti' diyor; '$SONRAKI' açılmadı — bu turda yeni adıma geçme." \
      "Bloktaki üç alanı elle güncelle: Adım: $SONRAKI · Durum: açık · Tamamlanan: $YENI_TAMAMLANAN"
  fi
  [ -n "$ESKI_MOD" ] && chmod "$(printf '%s' "$ESKI_MOD" | awk '{
      m = $0; b = 0
      if (substr(m,1,1) == "r") b += 400; if (substr(m,2,1) == "w") b += 200; if (substr(m,3,1) == "x") b += 100
      if (substr(m,4,1) == "r") b += 40;  if (substr(m,5,1) == "w") b += 20;  if (substr(m,6,1) == "x") b += 10
      if (substr(m,7,1) == "r") b += 4;   if (substr(m,8,1) == "w") b += 2;   if (substr(m,9,1) == "x") b += 1
      printf "%04d", b
    }')" "$DURUM_DOSYA" 2>/dev/null || true
else
  rm -f "$GECICI" 2>/dev/null
  engel "$ADIM" "blok-yazilamadi" \
    "Sıradaki adım açılamadı: 00_genesis/GENESIS_DURUM.md yazılamıyor." \
    "Bloktaki üç alanı elle güncelle: Adım: $SONRAKI · Durum: açık · Tamamlanan: $YENI_TAMAMLANAN"
fi

# Tekil-artış freninin çapası: sürücü listeyi bir büyüttü, sayaç bunu kaydeder.
YENI_SAYI=$((SAYILAN + 1))
S_DOSYA="$(sira_alan "$SONRAKI" 2)" || S_DOSYA=""
S_CUMLE="$(sira_alan "$SONRAKI" 3)" || S_CUMLE=""
sayac_yaz "$SONRAKI" "açık" 0 "$YENI_SAYI" || true
engel "$SONRAKI" "açık" \
  "Adım tamamlandı: $ADIM. Sıradaki adım AÇILDI: $SONRAKI — $S_CUMLE" \
  "Tarifi: 00_genesis/adimlar/$S_DOSYA (adımı AÇMADAN uygulama)" \
  "Bitirince bloğa 'Durum: bitti' yaz; sahibi bekliyorsan 'Durum: bekliyor' yaz."
