#!/bin/bash
# klasor-hazirligi — kurulum girişi: indirilen KEEL klasörünü sahibin PROJE klasörü yapar
# (F1-2b · GENESIS G0.1).
#
# NEDEN VAR: eski yol iki parçaydı — (1) sahip KEEL'i elle boş bir klasöre kopyalardı,
# (2) kökte duran gizli bir kopya-işareti dosyası kuruluma "burası orijinal mi, kopya mı?" diye
# SORDURURDU. İkinci parça çürüktü: iki klasör dosyadan ayırt EDİLEMİYORDU (eski CLAUDE.md
# bunu birebir yazıyordu), yani sahibe cevabını bilemeyeceği bir soru soruluyordu — sahte çatal.
# Ayrımı artık makine yapar ve tek şeye bakar: klasör KEEL deposuna bağlı mı?
#
# NE YAPAR (yalnız --uygula ile, ve yalnız gerekiyorsa):
#   1. YEDEK      — indirilen hâlin TAM kopyası yan klasöre alınır (.git dâhil) ve DOĞRULANIR.
#   2. BAĞ KOPARMA— `.git` silinir. Yedek doğrulanmadan bu adıma GEÇİLMEZ.
#   3. BOŞ GEÇMİŞ — `git init`; klasör artık yalnız sahibin projesidir.
# Sıra tersine çevrilemez: tek geri alınamaz adım (2), doğrulanmış bir yedeğin ardından koşar.
#
# NEDEN BAĞ KOPARILIR: KEEL özel/telifli bir depodur. Bağ kalırsa sahibin projesi KEEL'in
# bütün geçmişini taşır; sahip kendi deposuna gönderdiğinde o geçmiş de gider (D-03 ihlali).
# Ters yön de gerçek: uzak adres duruyorken `git pull` şablonu sahibin çalışmasının üstüne yazar.
#
# NE YAPMAZ: sahibin KENDİ deposuna dokunmaz (KEEL'i göstermeyen uzak adres sahibin malıdır) ·
# kurulu projede hiç koşmaz (`.kurulum-tamam` varsa çıkış 2) · ortamı denetlemez (o G0.0'ın işi) ·
# commit atmaz (ilk commit GENESIS'in kendi hijyen adımıdır; `git commit` sahibin git kimliğini
# ister ve bu betiğin bağ koparma sırası kimlik yüzünden yarıda kalamaz).
#
# GERİ ALINAMAZ ADIMIN O ANDA FİİLEN DURAN KATMANLARI (abartma yok — hasım turu 2026-07-29 bu
# listeyi bir kez yanlış yazdığım için düzeltildi): (1) dört emniyet kemeri, (2) rm'den ÖNCE
# alınıp ÜÇ ölçüyle doğrulanan yedek. G0.3 mührü bu adımdan SONRA gelir, dolayısıyla burada
# emniyet olarak SAYILMAZ.
#
# Kipler:
#   --rapor   (varsayılan) SALT-OKUR. Klasörün hâlini sınıflar, sahibin diliyle anlatır.
#   --uygula  Hazırlığı yapar. Kendi ölçümünü yeniden yapar (rapora güvenmez).
#
# Çıkış kodları:
#   0  hazırlık gerekmiyor · ya da (--uygula) hazırlık TAMAM
#   1  (--rapor) hazırlık GEREKLİ · (--uygula) hazırlık YAPILAMADI ve klasöre DOKUNULMADI
#   2  denetimin KENDİSİ çalışamadı (argüman hatası · burası KEEL klasörü değil · proje zaten
#      kurulu · git yok). "Hazırlık gerekmiyor" DEĞİLDİR ve sessiz geçilmez.
set -uo pipefail
export LC_ALL=C.UTF-8

# KEEL'in dağıtım adresi. Adres değişirse BU SATIR değişir. Aynı desen `kurulum-denetimi.sh`in
# çekilme kapısında da geçer (iki kopya, bilerek: biri kurulum girişi, öteki kurulum çıkışı);
# `klasor-hazirligi.test.mjs` ikisinin ayrışmasını KIRMIZI basar.
KEEL_DEPO='batuhanozgun/keel'

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
KIP="rapor"

oz_ariza() { printf 'klasor-hazirligi: %s\n' "$1" >&2; exit 2; }

# Geri alınamaz adım geçildi mi. duramadi() BUNA göre iki ayrı kapanış cümlesi basar:
# "dokunulmadı" ile "dokunuldu" aynı cümleyle anlatılamaz. (Hasım turu 2026-07-29: üç mercek
# birden yakaladı — `git init` patladığında ekranda `.git` silinmişken "Klasöre DOKUNULMADI"
# yazıyordu; sahibe söylenen cümle olguyla ters olamaz.)
DOKUNULDU=0
duramadi() {
  printf '\n'
  printf 'SONUÇ: Hazırlık yapılamadı — %s\n' "$1"
  if [ "$DOKUNULDU" = "1" ]; then
    printf 'DİKKAT: bu klasörün ESKİ değişiklik geçmişi zaten kaldırıldı.\n'
    printf 'İndirdiğin hâlin tam kopyası burada duruyor:\n  %s\n' "${YEDEK:-(yedek yolu bilinmiyor)}"
    printf 'Kurtarma: bu klasörü sil, o kopyayı yerine koy ve baştan başla.\n'
  else
    printf 'Klasöre DOKUNULMADI; her şey indirdiğin gibi duruyor.\n'
  fi
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --rapor)  KIP="rapor"; shift ;;
    --uygula) KIP="uygula"; shift ;;
    *) printf 'klasor-hazirligi: bilinmeyen argüman: %s\n' "$1" >&2
       printf 'kullanım: klasor-hazirligi.sh [--rapor|--uygula]\n' >&2; exit 2 ;;
  esac
done

# ── Emniyet kemeri 1: burası gerçekten bir KEEL klasörü mü ────────────────────────────────
# Bu betiğin tek geri alınamaz adımı bir `rm -rf` içerir; yanlış kökte koşması kabul edilemez.
# Kök yanlışsa hiçbir şey ÖLÇÜLMEZ de: yanlış klasör hakkında rapor üretmek de zarardır.
[ -n "$KOK" ] || oz_ariza "proje kökü boş"
[ -d "$KOK" ] || oz_ariza "proje kökü diye verilen yol bir klasör değil: $KOK"
KOK="$(cd -P -- "$KOK" >/dev/null 2>&1 && pwd)" || oz_ariza "proje köküne girilemedi"
[ "$KOK" != "/" ] || oz_ariza "proje kökü / olamaz"
for iz in "GENESIS.md" "00_genesis" "tools/guard/file-guard.sh"; do
  [ -e "$KOK/$iz" ] || oz_ariza "burası bir KEEL klasörü değil (eksik: $iz) — hazırlık koşmaz: $KOK"
done

# ── Emniyet kemeri 2: KEEL'in kendi kopyası ───────────────────────────────────────────────
# `tools/guard/.keel-kaynak` DAĞITILMAZ (`.gitignore`dadır) — bir clone'da ya da ZIP'te
# bulunması imkânsızdır. Bu yüzden silinen eski kopya-işaretinin tekrarı DEĞİLDİR: o işaret
# ÜRÜNLE BİRLİKTE geliyordu, iki hâli ayırt edemiyordu ve sahibe cevabını bilemeyeceği bir
# soru sordurtuyordu. Bu işaret yalnız bakımcının kendi makinesinde, elle vardır; sahibin
# indirdiği hiçbir kopyada bulunmaz ve kimseye hiçbir soru sordurmaz.
[ ! -e "$KOK/tools/guard/.keel-kaynak" ] || oz_ariza "burası KEEL'in kendi kopyası (tools/guard/.keel-kaynak) — buraya kurulum yapılmaz"

# ── Emniyet kemeri 3: kurulum başlamış ya da bitmişse bu betik hiç koşmaz ──────────────────
# Hazırlık kuruluma BAŞLAMADAN önce koşar. Kurulum ortasında koşarsa kurulumun kendi git
# kaydını (ve kilitli-tarih çapasını) siler; `.kurulum-tamam` ise ancak G5'te doğduğu için
# tek başına yetmiyordu — G1..G5 arası bütün pencere açıktaydı (hasım turu bulgusu).
# Aşağıdaki klasörlerin hiçbiri dokunulmamış bir indirmede YOKTUR.
for iz in ".kurulum-tamam" "02_kanon" "00_pano" "01_kutular" "03_roller"; do
  [ ! -e "$KOK/$iz" ] || oz_ariza "bu klasörde kurulum başlamış ya da bitmiş (var: $iz) — hazırlık yalnız kuruluma başlamadan önce koşar"
done

# ── Emniyet kemeri 4: git ──────────────────────────────────────────────────────────────────
# G0.0 (ortam kontrolü) git'i zorunlu sayar ve bu adımdan önce koşar. Yine de sessiz
# varsayılmaz: git yoksa ölçüm de yapılamaz, "bağ yok" denemez.
command -v git >/dev/null 2>&1 || oz_ariza "git bulunamadı — önce ortam kontrolü (bash tools/guard/ortam-kontrol.sh)"

# ── Ölçüm ─────────────────────────────────────────────────────────────────────────────────
# DURUM üç değerden biri:
#   BAGLI    .git var + uzak adreslerden biri KEEL dağıtım deposunu gösteriyor
#   DEPOSUZ  .git yok (ZIP ile indirilmiş) — koparılacak bağ yok, açılacak kayıt var
#   KENDI    .git var, uzak adreslerin hiçbiri KEEL'i göstermiyor; DOKUNULMAZ
#
# ÖLÇÜLEN ŞEY ADRESTİR, GEÇMİŞ DEĞİL (ilan edilmiş sınır): bir ayna/çatal deposundan ya da
# uzak adresi elle değiştirilmiş bir klondan kurulursa KEEL'in commit geçmişi klasörde kalır
# ve bu betik onu göremez. Gerekçe: kök-commit'i sabitlemek işe yaramaz — dağıtım kopyasının
# ve geliştirme kopyasının kökleri farklıdır, `clone --depth 1`de kök commit hiç yoktur.
# Karşılığı: KEEL'in ilan edilen iki kanalı (ZIP indirme · doğrudan clone) doğru sınıflanır.
UZAKLAR=""
if [ -e "$KOK/.git" ]; then
  # `git -C` KENDİ .git'i olmayan bir klasörde ÜST deponun uzaklarını basar; o yüzden ölçüm
  # `.git` varlığına kapılanır (yoksa üstteki deponun adresine bakıp yanlış BAGLI derdik).
  #
  # FAIL-CLOSED: git'in HATASI sessizce "bağ yok"a çevrilmez. Eski hâlinde `|| true` vardı ve
  # bozuk/okunamayan bir `.git` (yarım kopyalanmış depo, izin sorunu, bozuk config) KENDI
  # sayılıyordu: bağ duruyorken "hazırlık gerekmiyor" deniyordu — sessiz yeşil, bu projenin
  # en pahalı kusur sınıfı (hasım turu 2026-07-29, dört mercek).
  UZAKLAR="$(git -C "$KOK" remote -v 2>/dev/null)" || oz_ariza "klasörün git kaydı okunamadı (git remote -v hata verdi) — KEEL bağı ÖLÇÜLEMEDİ, kuruluma başlanmaz"
  KUCUK="$(printf '%s' "$UZAKLAR" | tr 'A-Z' 'a-z')" || oz_ariza "uzak adresler okunamadı (tr çalışmadı) — KEEL bağı ÖLÇÜLEMEDİ"
  # Eşleşme SAĞDAN ÇAPALI: alt-dize araması `batuhanozgun/keel-oyun` gibi ayrı bir depoyu da
  # KEEL sayıyordu (hasım turu; Batu'nun fiilî adlandırması tam bu biçimde). `git remote -v`
  # satırı adresten sonra ya `.git`, ya `/`, ya boşluk taşır.
  case "$KUCUK" in
    *"$KEEL_DEPO".git*|*"$KEEL_DEPO"/*|*"$KEEL_DEPO"' '*|*"$KEEL_DEPO") DURUM="BAGLI" ;;
    *)                                                                   DURUM="KENDI" ;;
  esac
else
  DURUM="DEPOSUZ"
fi

# İç içe depo: klasörün kendi `.git`i yok ama ÜST klasörlerden biri bir depo. `git init` burada
# meşrudur (KEEL'in geri-alma güvencesi kendi kaydını ister) ama sessiz kalmaz — sahip iç içe
# iki kayıt olduğunu bilmeli.
IC_ICE=""
if [ "$DURUM" = "DEPOSUZ" ]; then
  UST="$(git -C "$KOK" rev-parse --show-toplevel 2>/dev/null || true)"
  [ -n "$UST" ] && [ "$UST" != "$KOK" ] && IC_ICE="$UST"
fi

AD="${KOK##*/}"
UST_KLASOR="${KOK%/*}"
[ -n "$UST_KLASOR" ] || UST_KLASOR="/"

# Yedek adı: yan klasör. Varsa -2 … -9 denenir; dokuzu da doluysa hazırlık YAPILMAZ (eski
# yedeğin üstüne yazmak, yedeğin var olma sebebini yok eder).
yedek_yolu() {
  local temel="$UST_KLASOR/$AD-KEEL-yedek" n
  if [ ! -e "$temel" ]; then printf '%s' "$temel"; return 0; fi
  for n in 2 3 4 5 6 7 8 9; do
    if [ ! -e "$temel-$n" ]; then printf '%s' "$temel-$n"; return 0; fi
  done
  return 1
}

say() { find "$1" 2>/dev/null | wc -l | tr -d ' '; }

# ── Rapor gövdesi (iki kipte de basılır: sahip ne olacağını ÖNCE okur) ─────────────────────
printf 'KLASÖR HAZIRLIĞI — burası senin projenin klasörü olacak\n\n'
printf '  Klasör: %s\n' "$KOK"
case "$DURUM" in
  BAGLI)
    printf "  Durum : Bu klasör hâlâ KEEL'in indirildiği yere bağlı.\n\n"
    printf "  Yapılacak üç şey:\n"
    printf "    1. İndirdiğin hâlin TAM bir kopyası yan klasöre alınır — önce bu, sonra gerisi.\n"
    printf "    2. KEEL'e olan bağ koparılır: bu klasördeki ESKİ değişiklik geçmişi kaldırılır\n"
    printf "       (kopyası 1. adımdaki yedekte durur). Böylece senin çalışman KEEL'in deposuna\n"
    printf "       karışmaz, KEEL'in geçmişi de senin projene yapışmaz.\n"
    printf "    3. Bu klasör için sıfırdan, boş bir değişiklik geçmişi açılır.\n"
    ;;
  DEPOSUZ)
    printf "  Durum : Koparılacak bir bağ yok. Değişiklik geçmişi henüz başlatılmamış.\n\n"
    printf "  Yapılacak tek şey: bu klasör için boş bir değişiklik geçmişi açılır —\n"
    printf "  KEEL'in \"yanlış giderse geri alırız\" güvencesi buna dayanır.\n"
    [ -n "$IC_ICE" ] && printf "\n  Not: bu klasör başka bir değişiklik geçmişinin içinde duruyor (%s).\n       İki kayıt iç içe çalışır; senin projenin kaydı bu klasöre ait olur.\n" "$IC_ICE"
    ;;
  KENDI)
    # Cümle ÖLÇÜLENİ söyler. Eski hâli "zaten SENİN kendi geçmişin var" diyordu; bu bir
    # varsayımdı (ölçülen tek şey uzak adres) ve ayna/çatal kopyalarda fiilen yanlıştı.
    printf "  Durum : Bu klasörde bir değişiklik geçmişi var ve uzak adresi KEEL'i göstermiyor —\n"
    printf "          senin kendi kaydın sayılır.\n\n"
    printf "  Yapılacak bir şey yok; ona dokunulmaz.\n"
    ;;
esac
printf '\n'

# ── Rapor kipi burada biter ───────────────────────────────────────────────────────────────
if [ "$KIP" = "rapor" ]; then
  case "$DURUM" in
    KENDI) printf 'SONUÇ: Hazırlık gerekmiyor.\n'; exit 0 ;;
    *)     printf 'SONUÇ: Hazırlık gerekli.\n'; exit 1 ;;
  esac
fi

# ── Uygulama kipi ─────────────────────────────────────────────────────────────────────────
if [ "$DURUM" = "KENDI" ]; then
  printf 'SONUÇ: Hazırlık gerekmiyor — kendi değişiklik geçmişine dokunulmadı.\n'
  exit 0
fi

if [ "$DURUM" = "BAGLI" ]; then
  # 1 · YEDEK — geri alınamaz adımdan önceki tek güvence.
  YEDEK="$(yedek_yolu)" || duramadi "yan klasörde yedek için boş bir ad kalmamış ($AD-KEEL-yedek … -9). Eskilerinden birini taşı ya da sil, sonra yeniden dene."
  [ -w "$UST_KLASOR" ] || duramadi "yedeği koyacağım klasöre yazma iznim yok: $UST_KLASOR — KEEL klasörünü yazabildiğin bir yere (ör. Belgeler) taşı ve yeniden dene."

  KAYNAK_SAYI="$(say "$KOK")"
  [ "${KAYNAK_SAYI:-0}" -gt 0 ] 2>/dev/null || duramadi "klasördeki dosyalar sayılamadı — yedeğin tam olduğunu kanıtlayamam. İndirmeyi tekrarla ve yeniden dene."

  mkdir "$YEDEK" 2>/dev/null || duramadi "yedek klasörü açılamadı: $YEDEK — aynı adda bir dosya olabilir; onu kaldır ve yeniden dene."
  # `-R` + `/.` gizli dosyaları da kopyalar; `-p` çalıştırma bitini korur (betikler yedekte de çalışsın).
  cp -Rp "$KOK/." "$YEDEK/" 2>/dev/null || duramadi "yedek kopyalanamadı (yer kalmamış olabilir). Yarım kopya burada duruyor, silebilirsin: $YEDEK"

  # DOĞRULAMA — "kopyaladım" demek yetmez; geri alınamaz adımın tek dayanağı bu üç ölçüdür:
  # dosya sayısı · bir çapa dosyanın boyu · .git. Not: `cp` bazı hâllerde eksik kopyalayıp
  # yine de 0 döner (ör. soket dosyası atlanır) — rc'ye güvenmenin yetmediği yer burası.
  YEDEK_SAYI="$(say "$YEDEK")"
  [ "$YEDEK_SAYI" = "$KAYNAK_SAYI" ] || duramadi "yedek eksik ($YEDEK_SAYI/$KAYNAK_SAYI dosya): $YEDEK — bu yarım kopyayı sil ve yeniden dene."
  K_BOY="$(wc -c < "$KOK/GENESIS.md" 2>/dev/null | tr -d ' ')"
  Y_BOY="$(wc -c < "$YEDEK/GENESIS.md" 2>/dev/null | tr -d ' ')"
  [ -n "$Y_BOY" ] && [ "$Y_BOY" = "$K_BOY" ] || duramadi "yedekteki GENESIS.md kaynağıyla aynı değil: $YEDEK — bu yarım kopyayı sil ve yeniden dene."
  [ -e "$YEDEK/.git" ] || duramadi "yedekte değişiklik geçmişi (.git) yok: $YEDEK — bu yarım kopyayı sil ve yeniden dene."

  # 2 · BAĞ KOPARMA — betiğin tek geri alınamaz adımı. Buraya YALNIZ doğrulanmış yedekten
  #     sonra gelinir; hedef, emniyet kemeri 1'den geçmiş kökün kendi `.git`idir.
  # Bayrak rm'den ÖNCE kalkar: yarım silme de "dokunuldu"dur ve o hâlde sahibe
  # "klasöre dokunulmadı" denemez.
  DOKUNULDU=1
  rm -rf "$KOK/.git" || duramadi "bağ koparılamadı (eski kayıt yarım silinmiş olabilir)."

  printf '  ✔ Yedek alındı  : %s (%s dosya)\n' "$YEDEK" "$YEDEK_SAYI"
  printf '  ✔ Bağ koparıldı : bu klasör artık KEEL deposuna bağlı değil\n'
fi

# 3 · BOŞ GEÇMİŞ
git -C "$KOK" init -q >/dev/null 2>&1 || duramadi "boş değişiklik geçmişi açılamadı (git init)"
[ -e "$KOK/.git" ] || duramadi "değişiklik geçmişi açıldı görünüyor ama .git yok"
printf '  ✔ Boş bir değişiklik geçmişi açıldı\n\n'

if [ "$DURUM" = "BAGLI" ]; then
  printf "SONUÇ: Klasör hazır — indirdiğin KEEL'in tam kopyası \"%s\" içinde duruyor, bu klasör artık yalnız senin projen.\n" "$YEDEK"
else
  printf 'SONUÇ: Klasör hazır — bu klasör artık yalnız senin projen.\n'
fi
exit 0
