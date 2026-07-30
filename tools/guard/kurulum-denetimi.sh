#!/bin/bash
# kurulum-denetimi.sh — GENESIS aktarım öz-denetimi (G4.5 kapısı). ŞABLONLA SABİTTİR:
# GENESIS bu betiği YAZMAZ ve DEĞİŞTİRMEZ, yalnız koşar (denetleyen ≠ denetlenenin yazarı —
# tarif-buharlaşması sessiz olamaz). Çekilmeden (G5.3) önce YEŞİL olmak zorundadır.
# Çıkış: 0 = YEŞİL · 2 = KIRMIZI (eksik aktarım — çekilme YOK).
# Fail-closed: betiğin KENDİ hatası da KIRMIZI'dır (sessiz yeşil yok).
set -euo pipefail
export LC_ALL=C.UTF-8
shopt -s nullglob

KOK="${1:-${CLAUDE_PROJECT_DIR:-.}}"
SORUN=0
kirmizi() { printf 'KIRMIZI · %s\n' "$1"; SORUN=1; }
gecti()   { printf 'geçti   · %s\n' "$1"; }

trap 'printf "KIRMIZI · kurulum-denetimi kendi içinde hata verdi (satır %s) — fail-closed\n" "$LINENO"; exit 2' ERR

EK="$KOK/02_kanon/EL_KITABI.md"

# 1 · EL_KITABI var ve zorunlu başlıklar/kurallar yerinde (kapalı-kadran gövdesi çıksa da başlık kalır)
if [ ! -f "$EK" ]; then
  kirmizi "02_kanon/EL_KITABI.md yok"
else
  #   Başlıklar SATIR BAŞINDA aranır (çapalı) — yorum/paragraf içinde geçen söz başlık sayılmaz
  #   (soğuk-denetim bulgusu C4, 2026-07-16). "Değer aksiyomu" başlık değil ibare: gevşek aranır.
  #   NOT (hasım turu): desen BRE'dir; buradaki başlıklar h2 + girintisiz + metakaraktersiz
  #   ('+' BRE'de literal). Yeni başlık eklerken .*[ gibi metakarakter KOYMA (yanlış-eşleşme).
  for baslik in "## D-kuralları" "## F-kuralları" "## Üslup hükmü" "## Kutu döngüsü" \
                "## Mühür ritüeli" "## Domain-rol disiplin iskeleti" "## Kanon-fakir dünya" \
                "## Kişisel-veri süzgeci" "## Kadro + kapsam" "Değer aksiyomu"; do
    case "$baslik" in
      '## '*) if grep -q "^$baslik" "$EK"; then :; else kirmizi "EL_KITABI zorunlu başlık eksik: $baslik"; fi ;;
      *)      if grep -qF "$baslik" "$EK"; then :; else kirmizi "EL_KITABI zorunlu başlık eksik: $baslik"; fi ;;
    esac
  done
  for kural in "Mühür paketi" "İş-icat yasağı" "Kural-evrim kilidi" "SENDE BEKLEYEN" "yorumla onay üretme" "dış göz brifingi"; do
    if grep -qF "$kural" "$EK"; then :; else kirmizi "EL_KITABI zorunlu kural eksik: $kural"; fi
  done
  BOYUT=$(wc -c < "$EK" | tr -d ' ')
  if [ "$BOYUT" -gt 16384 ]; then
    kirmizi "EL_KITABI kendi tavanını aşıyor: ${BOYUT}B > 16384B (F3)"
  else
    gecti "EL_KITABI başlıklar + kurallar + tavan (${BOYUT}B)"
  fi
fi

# 2 · Kadran oku (bekçi zorunlu-kategori kümesini belirler) — çapalı desen: kalıp biçimi
#     "Ağırlık kadranı: **TAM RİTÜEL**" / "**KÜÇÜK ...**" garanti eder; tanınmayan = KIRMIZI
KADRAN=""
if [ -f "$EK" ]; then
  if grep -qF 'Ağırlık kadranı: **TAM' "$EK"; then KADRAN="tam";
  elif grep -qF 'Ağırlık kadranı: **KÜÇÜK' "$EK"; then KADRAN="kucuk";
  fi
fi
if [ -z "$KADRAN" ]; then
  kirmizi "kadran okunamadı (beklenen: 'Ağırlık kadranı: **TAM …' ya da '**KÜÇÜK …') — fail-closed"
  KADRAN="tam"
else
  gecti "kadran okundu: $KADRAN"
fi

# 3 · Doldurulmamış «alan» kalmadı (canlı yüzey: kanon + roller + beceriler; _arsiv muaf)
#     Fail-closed: taranamayan dosya (grep rc>=2) sessiz-temiz SAYILMAZ.
ACIK_ALAN=""
for d in "$KOK/02_kanon" "$KOK/03_roller" "$KOK/.claude/skills"; do
  if [ -d "$d" ]; then
    RC=0
    CIKTI=$(grep -Rl --exclude-dir=_arsiv '«' "$d" 2>/dev/null) || RC=$?
    if [ "$RC" -eq 0 ]; then
      ACIK_ALAN="$ACIK_ALAN $(printf '%s' "$CIKTI" | tr '\n' ' ')"
    elif [ "$RC" -ge 2 ]; then
      kirmizi "«alan» taraması hata verdi ($d, rc=$RC — okunamayan dosya?) — fail-closed"
    fi
  fi
done
if [ -n "$ACIK_ALAN" ]; then kirmizi "doldurulmamış «alan» var:$ACIK_ALAN"; else gecti "«alan» taraması temiz"; fi

# 4 · Bilinç + retro kalıbı kopyaları (omurga her kuruluma iner)
if [ -f "$KOK/00_genesis/DEFO_MODELI.md" ] && grep -q "On defo" "$KOK/00_genesis/DEFO_MODELI.md"; then
  gecti "DEFO_MODELI.md yerinde"
else
  kirmizi "00_genesis/DEFO_MODELI.md yok ya da çekirdeği eksik (bilinç katmanı inmemiş)"
fi
if [ -f "$KOK/00_genesis/RETRO_KALIBI.md" ] && grep -q "Tavan kalibrasyonu" "$KOK/00_genesis/RETRO_KALIBI.md"; then
  gecti "RETRO_KALIBI.md yerinde"
else
  kirmizi "00_genesis/RETRO_KALIBI.md yok ya da kalibrasyon maddesi eksik"
fi
# 4b · Ortam denetimi ikilisi (F1-2a): betik + veri dosyası. Eksik kopyalanırsa açılış kancası
#      FAIL-OPEN olduğu için SESSİZ kalır — aktarım öz-denetiminin görmesi gereken tam olarak bu.
if [ -f "$KOK/tools/guard/ortam-kontrol.sh" ] && [ -f "$KOK/tools/guard/ortam-kalemleri.txt" ]; then
  gecti "ortam denetimi yerinde (betik + kalem listesi)"
else
  kirmizi "tools/guard/ortam-kontrol.sh ya da ortam-kalemleri.txt yok — ortam denetimi sessizce ölü (F1-2a)"
fi
# 4c · KEEL bağı koparılmış mı (F1-2b / G0.1 — kurulum girişinin ÇIKIŞ kapısı). Kurulu projenin
#      hiçbir uzak adresi KEEL dağıtım deposunu göstermemeli: gösterirse sahip kendi deposuna
#      gönderdiğinde KEEL'in bütün geçmişi de gider (D-03) ve `git pull` şablonu sahibin
#      çalışmasının üstüne yazabilir. Giriş adımı atlanmış/geri alınmışsa çekilme kilitlenir.
#      Desen `klasor-hazirligi.sh`teki KEEL_DEPO ile aynıdır; testi ikisini birbirine bağlar.
#      FAIL-CLOSED (hasım turu 2026-07-29): "ölçemedim" ile "bağ yok" AYNI ŞEY DEĞİLDİR.
#      İlk hâli `|| true` ile her hatayı boş dizeye çeviriyordu; git yokken, `.git` bozukken ve
#      `.git` hiç yokken üçünde de "geçti" basıyordu — dosyanın kendi 6. satırındaki
#      "sessiz yeşil yok" ilanının tersi. Artık dört ayrı hâl var, üçü KIRMIZI.
KEEL_DEPO='batuhanozgun/keel'
if [ ! -e "$KOK/.git" ]; then
  kirmizi "projenin git kaydı yok (.git) — KEEL bağı ölçülemez ve KEEL'in geri-alma güvencesi zaten yok (G0.1 klasör hazırlığı koşmamış)"
elif ! command -v git >/dev/null 2>&1; then
  kirmizi "KEEL bağı ÖLÇÜLEMEDİ: git bulunamadı — fail-closed"
else
  UZAKLAR=""; RC=0
  UZAKLAR="$(git -C "$KOK" remote -v 2>/dev/null)" || RC=$?
  if [ "$RC" -ne 0 ]; then
    kirmizi "KEEL bağı ÖLÇÜLEMEDİ: git kaydı okunamadı (git remote -v rc=$RC) — fail-closed"
  else
    #    Eşleşme SAĞDAN ÇAPALI — `batuhanozgun/keel-oyun` gibi ayrı bir depo KEEL sayılmaz
    #    (alt-dize hâli kurulmuş projeye KALICI yanlış KIRMIZI basıyordu).
    case "$(printf '%s' "$UZAKLAR" | tr 'A-Z' 'a-z')" in
      *"$KEEL_DEPO".git*|*"$KEEL_DEPO"/*|*"$KEEL_DEPO"' '*|*"$KEEL_DEPO")
        kirmizi "proje hâlâ KEEL deposuna bağlı ($KEEL_DEPO) — sahibin deposuna gönderim KEEL'in geçmişini de taşır. Çare: uzak adresi kaldır (git remote remove <ad>) ya da kendi deponun adresiyle değiştir" ;;
      *) gecti "KEEL bağı yok (uzak adres kontrolü)" ;;
    esac
  fi
fi

# 4d · Kurulum TARİFİ eksiksiz mi (F1-1 · GENESIS iskeleti). Bu kapı yeni değil, YERİ yeni:
#      `GENESIS.md` 48 KB tek dosyaydı ve tarifin aktarıldığını hiçbir şey ölçmüyordu (bu betikte
#      'GENESIS.md' dizesi bile geçmiyordu). Bölünmüş tarifte denetimsiz yüzey 1 dosyadan 10'a
#      çıkar; kapı olmazsa "yarım kopyalanmış tarif" sessizce çekilme alır.
#      DÖRT ŞEY: (a) sıra verisi ↔ adım dosyaları ÇİFT YÖNLÜ eşlik, (b) dosya başına tavan,
#      (c) toplam tavan, (d) indeks ve bekçi-tarifi kontratı yerinde.
ADIM_TAVANI=12288    # bayt · dosya başına (aşan adım ikiye bölünür: G3a/G3b emsali)
ADIM_TOPLAM=60000    # bayt · indeks + adımlar + BEKCI_TARIFI. Bölmek büyümenin bahanesi olamaz —
                     # asıl fren budur, dosya-başı tavan değil.
                     # ÇAPA VE BEYANLI ARTIŞ (2026-07-30): ilk değer 57.660 = bölmeden önceki
                     # GENESIS.md 48.050 B × 1,20 idi ve bölmenin kendisi ona sığdı. Hasım turu
                     # (46 ham bulgu) sonrası marj 99 B'ye indi; bir tur SIKIŞTIRMAYLA 518 B'ye
                     # çıkarıldı, sonra kalan bulgular yeni MEKANİK KURALLAR getirdi (G0'ın sıra
                     # açma maddesi · G5'in blok dilbilgisi · G4.5'in eksik denetim listesi) ve
                     # ikinci bir sıkıştırma turu, hafızasız oturumun ihtiyaç duyduğu gerekçeleri
                     # silmeye başlayacaktı. Tavan 60.000'e çıkarıldı (= 48.050 × 1,249).
                     # Artışın sebebi kelime uzunluğu değil, EKLENEN KURAL: bölme sırasında
                     # bilinmeyen 11 kusurun mekanik karşılığı tarifin içinde yaşamak zorunda.
                     # Bu satır beyandır: sonraki artış yeniden beyan ister (D-27 emsali).
SIRA_TAVANI=4096     # bayt · sıra verisinin KENDİ tavanı. Toplama DAHİL DEĞİL, ayrı ölçülür:
                     # dahil edilmesi toplam tavan kararını yeniden almayı gerektirir (bugünkü
                     # tarif toplama girse marj 500B freninin altına inerdi) ve tavan kararı
                     # beyanlı olmak zorundadır. Ama tavansız da bırakılmaz: sürücü bu dosyayı
                     # HER Stop turunda okur, sınırsız büyümesi kancayı pahalılaştırır
                     # (hasım turu 2026-07-30: dosya 99.885 B yapıldı, hiçbir kapı kıpırdamadı).
SIRA="$KOK/00_genesis/adimlar/SIRA.txt"
if [ ! -r "$SIRA" ]; then
  kirmizi "00_genesis/adimlar/SIRA.txt yok — kurulum sırasının verisi eksik (F1-1); sürücü hangi adımın sırada olduğunu bilemez"
else
  # (a1) Listede var → diskte yok
  SIRA_BOY=$(wc -c < "$SIRA" | tr -d ' ')
  if [ "$SIRA_BOY" -gt "$SIRA_TAVANI" ]; then
    kirmizi "sıra verisi kendi tavanını aşıyor: ${SIRA_BOY}B > ${SIRA_TAVANI}B (SIRA.txt her Stop turunda okunur)"
  fi
  ADIM_EKSIK=""; ADIM_SAYISI=0; TOPLAM=0; ASAN=""; SIRA_DOSYALARI=""
  while IFS="$(printf '\t')" read -r k d c || [ -n "${k:-}" ]; do
    case "$k" in ''|'#'*) continue ;; esac
    # CRLF güvenliği: son alan `\r` taşırsa dosya adına yapışır ("G0.md\r" yoktur).
    d="${d%$'\r'}"
    ADIM_SAYISI=$((ADIM_SAYISI + 1))
    SIRA_DOSYALARI="$SIRA_DOSYALARI $d "
    if [ -n "$d" ] && [ -r "$KOK/00_genesis/adimlar/$d" ]; then
      B=$(wc -c < "$KOK/00_genesis/adimlar/$d" | tr -d ' ')
      TOPLAM=$((TOPLAM + B))
      if [ "$B" -gt "$ADIM_TAVANI" ]; then ASAN="$ASAN $d(${B}B)"; fi
    else
      ADIM_EKSIK="$ADIM_EKSIK ${d:-<dosya adı boş>}"
    fi
  done < "$SIRA"
  [ "$ADIM_SAYISI" -gt 0 ] || kirmizi "SIRA.txt içinde hiç adım satırı yok — kurulum tarifi boş"
  [ -z "$ADIM_EKSIK" ] || kirmizi "sırada yazılı adım dosyası yok:$ADIM_EKSIK (listede var, diskte yok — tarif yarım aktarılmış)"
  # (a2) Diskte var → listede yok. Ters yön ayrı bir sessiz kusurdur: sürücü o dosyayı hiç
  #      açmaz, içindeki tarif hiç uygulanmaz ve kimse fark etmez.
  #      Desen 'G*.md' DEĞİL '*.md': 'G' ile başlamayan bir adım dosyası (ileride bölünen bir
  #      adımın adı değişirse) ters yönde görünmez kalırdı — kapının kör noktası olurdu.
  #      Eşleşme SIRA satırlarından toplanan dosya adları listesine bakar; ham grep DEĞİL, çünkü
  #      üçüncü alanı boş bırakılmış bir satırda sondaki TAB yoktur ve grep yanlış "listede yok" derdi.
  #      Tarama DERİN ve SEMBOLİK BAĞLARI da görür: ilk yazım `-maxdepth 1 -type f` idi ve iki kör
  #      noktası vardı — `adimlar/alt/G9.md` (alt dizin) ve symlink hâlindeki adım dosyası ikisi de
  #      sessizce geçiyordu (hasım turu 2026-07-30). Ad öneki kör noktası kapatılmıştı, konum ve
  #      dosya-tipi kör noktaları açıktaydı.
  #      Uzantı süzgeci de KALDIRILDI: `-name '*.md'` iken aynı içerik `.md` ile KIRMIZI, `.txt`
  #      ile sessiz geçiyordu (aynı denetimin kendi gerekçesiyle çelişen asimetri). Artık
  #      `adimlar/` altındaki SIRA.txt DIŞINDA her dosya sırada kayıtlı olmak zorunda.
  KAYITSIZ=""
  for f in $(find "$KOK/00_genesis/adimlar" \( -type f -o -type l \) ! -name 'SIRA.txt' | sort); do
    AD=$(basename "$f")
    case "$SIRA_DOSYALARI" in *" $AD "*) : ;; *) KAYITSIZ="$KAYITSIZ $AD" ;; esac
  done
  [ -z "$KAYITSIZ" ] || kirmizi "adım dosyası sırada kayıtlı değil:$KAYITSIZ (diskte var, listede yok — sürücü onu hiç açmaz)"
  # (b) dosya başına tavan
  [ -z "$ASAN" ] || kirmizi "adım dosyası kendi tavanını aşıyor:$ASAN > ${ADIM_TAVANI}B (aşan adım ikiye bölünür)"
  # (c) toplam tavan — indeks + adımlar + kontrat. İndeks G5.3.a'da 00_genesis/'e TAŞINIR,
  #     bu kapı ise taşımadan ÖNCE koşar: iki yer de meşrudur, ama İKİSİ BİRDEN olamaz —
  #     G5.3.a "taşı" der; kopyalanırsa iki indeks doğar, biri sessizce eskir ve kapı hangisine
  #     baktığını söylemez (hasım turu 2026-07-30; indeksin kendi testi bunu "drift kapısı" sayıyor).
  #     TAVANIN KAPSAMI (beyan): burada ölçülen şey TARİFTİR — indeks + adımlar + bekçi kontratı.
  #     `00_genesis/` KALIP dosyaları (EL_KITABI_KALIBI · OTONOM_DONEM_KALIBI · KARAR_ALANI_KALIBI …)
  #     bu toplama GİRMEZ ve girmemeleri bilinçlidir: onların kendi tavanları var ve ayrı ölçülüyor
  #     (EL_KITABI 16KB burada, ötekiler kurulu-sim/otonom-sim testlerinde). Yani "tarif tavanı" ile
  #     "kalıp tavanları" iki ayrı hat; bir paragrafı kalıba taşıyarak bu tavandan kaçan taraf
  #     ötekine çarpar. Kalıpsız yeni bir dosya icat edilirse HİÇBİR tavana girmez — ilan edilmiş sınır.
  KOK_INDEKS=""; ARSIV_INDEKS=""
  [ -r "$KOK/GENESIS.md" ] && KOK_INDEKS="$KOK/GENESIS.md"
  [ -r "$KOK/00_genesis/GENESIS.md" ] && ARSIV_INDEKS="$KOK/00_genesis/GENESIS.md"
  INDEKS="${KOK_INDEKS:-$ARSIV_INDEKS}"
  if [ -n "$KOK_INDEKS" ] && [ -n "$ARSIV_INDEKS" ]; then
    kirmizi "İKİ indeks var (kökte ve 00_genesis/ altında) — G5.3.a TAŞI der, kopyalamaz; biri sessizce eskir"
  fi
  # Boyut okumaları AYRI ADIMDA: `$(( TOPLAM + $(wc -c …) ))` biçimi, iç komut patladığında
  # ARİTMETİK SÖZDİZİMİ HATASI üretir — o hata ERR trap'i TETİKLEMEZ ve `set -e` betiği DURDURMAZ,
  # yalnız içinde bulunduğu bileşik komutu iptal eder: 4d'nin geri kalanı (toplam tavan + ikinci
  # tanık) sessizce atlanır ve SONUÇ YEŞİL basılır. Dosyanın 6. satırındaki "betiğin KENDİ hatası da
  # KIRMIZI'dır" ilanının tersi. (Hasım turu 2026-07-30 — yeniden koşulan mercek bunu yakaladı.)
  boy_ekle() { # $1: yol · $2: insan adı
    local b
    b="$(wc -c < "$1" 2>/dev/null | tr -d ' ')" || b=""
    case "$b" in
      ''|*[!0-9]*) kirmizi "$2 boyutu ÖLÇÜLEMEDİ ($1) — toplam tavan hesaplanamaz, fail-closed"; return 0 ;;
    esac
    TOPLAM=$((TOPLAM + b))
  }
  if [ -z "$INDEKS" ]; then
    kirmizi "GENESIS indeksi yok (ne kökte ne 00_genesis/ altında) — kurulum tarifinin girişi eksik"
  else
    boy_ekle "$INDEKS" "GENESIS indeksi"
  fi
  if [ -r "$KOK/00_genesis/BEKCI_TARIFI.md" ]; then
    boy_ekle "$KOK/00_genesis/BEKCI_TARIFI.md" "bekçi kontratı"
  else
    kirmizi "00_genesis/BEKCI_TARIFI.md yok — bekçi yazım kontratı aktarılmamış (G3.2 ona işaret ediyor)"
  fi
  if [ "$TOPLAM" -gt "$ADIM_TOPLAM" ]; then
    kirmizi "kurulum tarifi toplam tavanını aşıyor: ${TOPLAM}B > ${ADIM_TOPLAM}B (bölmek büyümenin bahanesi değildir)"
  else
    gecti "kurulum tarifi: $ADIM_SAYISI adım · toplam ${TOPLAM}B / ${ADIM_TOPLAM}B"
  fi
  # (e) İKİNCİ TANIK — indeks ↔ sıra. Yukarıdaki denetimler SIRA.txt ile diski karşılaştırır;
  #     ikisi de kurulum penceresinde yazılabilir, yani sırayı atlamak isteyen taraf İKİSİNİ
  #     birden kırpıp tutarlı bir yalan kurabilir (hasım turu 2026-07-29: bu yolla `G4.5` — bu
  #     kapının kendisi — sıradan çıkarılabiliyordu). İndeks üçüncü, BAĞIMSIZ bir kayıttır:
  #     adımların işaretçilerini taşır ve iki liste ayrışırsa çekilme kilitlenir.
  #     İşaretçi İKİ BİÇİMDE meşrudur: kökteki indeks `00_genesis/adimlar/G0.md` yazar, taşınmış
  #     indeks `adimlar/G0.md` (G5.3.a onları bilerek kısaltır — aynı klasördedir). Yalnız uzun
  #     biçimi aramak, çekilme SONRASI her koşuşta kalıcı yanlış KIRMIZI üretiyordu; üstelik
  #     teşhis yanlıştı ("okuyan onu bulamaz" derken indeks doğruydu) — yanlış rapor, raporsuzluktan
  #     beter (hasım turu 2026-07-30).
  if [ -n "$INDEKS" ]; then
    INDEKS_EKSIK=""
    for d in $SIRA_DOSYALARI; do
      if grep -qF "00_genesis/adimlar/$d" "$INDEKS" || grep -qE "(^|[^/])adimlar/$(printf '%s' "$d" | sed 's/\./\\./g')" "$INDEKS"; then :;
      else INDEKS_EKSIK="$INDEKS_EKSIK $d"; fi
    done
    [ -z "$INDEKS_EKSIK" ] || kirmizi "sırada olup indekste GEÇMEYEN adım:$INDEKS_EKSIK (indeks tarifin girişidir; ayrışırsa okuyan onu bulamaz)"
    SIRADA_YOK=""
    for d in $(grep -oE '(00_genesis/)?adimlar/[A-Za-z0-9._-]*\.md' "$INDEKS" | sed 's|.*/||' | sort -u); do
      case "$SIRA_DOSYALARI" in *" $d "*) : ;; *) SIRADA_YOK="$SIRADA_YOK $d" ;; esac
    done
    [ -z "$SIRADA_YOK" ] || kirmizi "indekste yazılı olup SIRADA olmayan adım:$SIRADA_YOK (sıra kırpılmış — sürücü o adımı hiç açmaz)"
    [ -n "$INDEKS_EKSIK$SIRADA_YOK" ] || gecti "indeks ↔ sıra eşliği (ikinci tanık)"
  fi
fi

# 4e · Kurulum DURUMU makine-okur mu (F1-1). Sıra ikinci bir Stop kancasına bağlıdır ve o kanca
#      tek bir yerden okur: `## KURULUM DURUMU` bloğu. Blok yoksa sürücü hiç devreye girmemiştir,
#      yani sıra bu kurulum boyunca MEKANİK OLARAK HİÇ denetlenmemiştir — çıktı doğru görünse de
#      güvence yoktur. G4.5'e gelmiş bir kurulum "başlamadı" da diyemez.
GDURUM="$KOK/00_genesis/GENESIS_DURUM.md"
if [ ! -r "$GDURUM" ]; then
  kirmizi "00_genesis/GENESIS_DURUM.md yok — kurulumun nerede kaldığı hiçbir yerde yazılı değil"
else
  # Alan sayımı sürücüyle AYNI mantıkta (hasım turu 2026-07-30): sürücü tekrarlı alanda
  # fail-closed duruyor, bu kapı ise aynı bloğa "geçti" basıyordu — iki göz ayrı hüküm veriyordu.
  KD_HAM=$(awk '
    /^## KURULUM DURUMU/ { basladi = 1; next }
    basladi && /^```/    { if (icinde) { exit } ; icinde = 1; next }
    icinde {
      p = index($0, ":")
      if (p > 0 && substr($0, 1, p - 1) == "Durum") {
        n++
        if (n == 1) { d = substr($0, p + 1); sub(/^[[:space:]]+/, "", d); sub(/[[:space:]]+$/, "", d) }
      }
    }
    END { printf "%d\t%s\n", n + 0, d }
  ' "$GDURUM" || true)
  KD_KAC="${KD_HAM%%	*}"; KD="${KD_HAM#*	}"
  case "$KD_KAC" in ''|*[!0-9]*) KD_KAC=0 ;; esac
  if [ "$KD_KAC" -gt 1 ]; then
    kirmizi "GENESIS_DURUM makine bloğunda 'Durum' alanı $KD_KAC kez yazılmış — makine ilkini okur, insan ikincisini görür (sessiz ayrışma)"
    KD="__tekrarli__"
  fi
  case "$KD" in
    __tekrarli__) : ;;
    açık|bekliyor|bitti) gecti "kurulum durumu makine-okur (Durum: $KD)" ;;
    başlamadı) kirmizi "GENESIS_DURUM makine bloğu 'başlamadı' diyor ama kurulum G4.5'e gelmiş — blok hiç güncellenmemiş, sıra mekanik olarak denetlenmemiş" ;;
    '') kirmizi "GENESIS_DURUM içinde '## KURULUM DURUMU' makine bloğu okunamadı — kurulum sürücüsü bu kurulum boyunca hiç devreye girmemiş olabilir" ;;
    *) kirmizi "GENESIS_DURUM makine bloğunda tanınmayan Durum değeri: '$KD' (geçerli: başlamadı · açık · bekliyor · bitti)" ;;
  esac
fi

# 5 · Bekçi: mevcut + sözdizimi + kadranın zorunlu kategorileri İLAN edilmiş
#     (ilan `# kategoriler:` satırıdır — GENESIS tarifi zorunlu kılar; beyanın İÇERİĞİNİ
#     G3.2'nin fiilî bozuk-girdi kanıtı tartar, bu betik yalnız ilan-varlığını denetler)
BEKCI="$KOK/tools/bekci/bekci.sh"
if [ ! -f "$BEKCI" ]; then
  kirmizi "tools/bekci/bekci.sh yok (konvansiyon-yol)"
else
  if bash -n "$BEKCI" 2>/dev/null; then gecti "bekçi sözdizimi"; else kirmizi "bekçi sözdizimi hatalı (bash -n)"; fi
  GEREKLI="tavan şema"
  if [ "$KADRAN" = "tam" ]; then GEREKLI="tavan şema koruma-hattı bağ-varlık tazelik"; fi
  KAT_SATIR=$(grep -m1 '^# kategoriler:' "$BEKCI" || true)
  if [ -z "$KAT_SATIR" ]; then
    kirmizi "bekçide '# kategoriler:' ilan satırı yok (tarif G3.2)"
  else
    for k in $GEREKLI; do
      if printf '%s' "$KAT_SATIR" | grep -qF "$k"; then :; else kirmizi "bekçi ilanında zorunlu kategori eksik: $k (kadran: $KADRAN)"; fi
    done
    gecti "bekçi kategori ilanı denetlendi ($KADRAN)"
  fi
fi

# 6 · Rol becerileri: SKILL.md ilk satırı '---' (yaşanmış kırılma: frontmatter yenirse beceri sessiz ölür)
#     + insan-tetikleme kilidi (disable-model-invocation) her beceride ZORUNLU — kilitsiz beceri
#     "rolü yalnız insan açar" garantisini deler (soğuk-denetim bulgusu C3, 2026-07-16).
for s in "$KOK"/.claude/skills/*/SKILL.md; do
  ILK=$(head -n1 "$s")
  if [ "$ILK" = "---" ]; then :; else kirmizi "SKILL ilk satırı '---' değil: $s"; fi
  # Kilit SATIR BAŞINDA aranır (çapalı): gövde metninde ya da yorumda geçen aynı dize
  # kilidi karşılamaz — kilitsiz beceri "rolü yalnız insan açar"ı deler (hasım turu 2026-07-16).
  if grep -q '^disable-model-invocation:[[:space:]]*true[[:space:]]*$' "$s"; then :; else kirmizi "SKILL insan-tetikleme kilidi eksik/yanlış yerde (satır başında 'disable-model-invocation: true' yok): $s"; fi
done
gecti "SKILL frontmatter + kilit taraması"

# 6b · Alt-ajan dosyalarında `memory:` alanı YASAK (Otonom KEEL tasarımı §2.3 — E4).
#      Roller arası zorunlu unutma bu yapının en eski korunanıdır (Değişmeyenler m.1) ve
#      alt-ajan `memory` alanı onun TEK ölüm noktasıdır: taze bağlam kalkarsa "beş varsayımın
#      beşi yazılı olmadığı için yakalandı" ölçümü de kalkar. Kural yazılıydı, kapısı yoktu.
#      YOKLUK KÖRLÜĞÜ YOK (hasım turu 2026-07-30): `nullglob` altında hiç alt-ajan dosyası
#      olmadığında döngü hiç koşuyor, altındaki `gecti` koşulsuz basıyordu — "ölçemedim" ile
#      "hepsi yerinde" karışıyordu. Şablon üç alt-ajanla gelir; sıfır dosya aktarım eksiğidir
#      (aynı ilke betiğin kendi "sıfır rol = KIRMIZI" kararında yazılı).
MEM_KIRLI=""; MEM_SAYI=0
for a in "$KOK"/.claude/agents/*.md; do
  MEM_SAYI=$((MEM_SAYI + 1))
  if grep -qE '^[[:space:]]*memory[[:space:]]*:' "$a"; then MEM_KIRLI="$MEM_KIRLI $(basename "$a")"; fi
done
if [ "$MEM_SAYI" -eq 0 ]; then
  kirmizi "hiç alt-ajan dosyası yok (.claude/agents/*.md) — şablon üçüyle gelir; yokluk aktarım eksiğidir, 'memory yasağı geçti' denemez"
elif [ -n "$MEM_KIRLI" ]; then
  kirmizi "alt-ajan dosyasında memory alanı var:$MEM_KIRLI — roller arası zorunlu unutma delinir (hiçbir rol alt-ajan dosyasına memory yazılmaz)"
else
  gecti "alt-ajan memory yasağı"
fi

# 7 · Rol slug'ları tek-token ASCII + rol↔beceri eşliği (yokluk körlüğü yok: sıfır rol = KIRMIZI)
ROL_SAYISI=0
for r in "$KOK"/03_roller/*/; do
  AD=$(basename "$r")
  case "$AD" in
    _*) : ;;  # _arsiv benzeri altyapı dizinleri slug değildir
    *)
      ROL_SAYISI=$((ROL_SAYISI + 1))
      if printf '%s' "$AD" | grep -Eq '^[a-z0-9]+$'; then :; else kirmizi "rol slug'ı tek-token ASCII değil: $AD"; fi
      if [ -f "$KOK/.claude/skills/rol-$AD/SKILL.md" ]; then :; else kirmizi "rol becerisi eksik: .claude/skills/rol-$AD/SKILL.md (tören kurulmamış)"; fi
      # Rol evinin iki zorunlu dosyası (soğuk-denetim bulgusu C1; tatbikat-v2'de DURUM'suz roller sahada görüldü):
      if [ -f "$r/ROL.md" ]; then :; else kirmizi "rol sözleşmesi eksik: 03_roller/$AD/ROL.md (G2 sözleşme doldurma)"; fi
      # DURUM.md: yalnız VARLIK değil, BİÇİM de — boş/bozuk DURUM sessiz tarif-buharlaşmasıdır
      # (hasım turu 2026-07-16: G4.5 varlığı görüp biçim driftini kaçırıyordu). İlk başlık
      # '# DURUM — <Ad>' olmalı (kokpit parseDurum + fixture biçimi bunu ister).
      if [ -f "$r/DURUM.md" ]; then
        if grep -q '^# DURUM' "$r/DURUM.md"; then :; else kirmizi "rol durum dosyası biçimsiz: 03_roller/$AD/DURUM.md (ilk başlık '# DURUM — <Ad>' değil — kokpit parser'ı okuyamaz)"; fi
      else
        kirmizi "rol durum dosyası eksik: 03_roller/$AD/DURUM.md (G3.4 başlangıç DURUM'u — kokpit rol kartı ve devir buna bakar)"
      fi
      ;;
  esac
done
if [ "$ROL_SAYISI" -eq 0 ]; then
  kirmizi "hiç rol yok (03_roller boş ya da eksik) — G4.5 rollerden SONRA koşar, sıfır rol aktarım eksiğidir"
else
  gecti "slug + rol↔beceri taraması ($ROL_SAYISI rol)"
fi

# 7b · Dış göz koltuğu ZORUNLUDUR (her kadranda — G2.1.5; D-20 parça 2). Türetilmez, sabittir:
#      "zorunlu" sözünün mekanik karşılığı budur; koltuk atlanırsa çekilme kilitlenir.
#      (ROL.md/DURUM.md/beceri denetimi yukarıdaki genel döngüde zaten koşar.)
if [ -d "$KOK/03_roller/disgoz" ]; then
  if [ -f "$KOK/03_roller/disgoz/BRIFING.md" ]; then
    gecti "dış göz koltuğu + brifing iskeleti yerinde"
  else
    kirmizi "dış göz brifing iskeleti eksik: 03_roller/disgoz/BRIFING.md (G3.4 — bekçinin kapanış kilidi ve açılış hatırlatması buna bakar)"
  fi
else
  kirmizi "zorunlu koltuk eksik: 03_roller/disgoz/ (dış göz her kadranda kurulur — G2.1.5)"
fi

# 8 · İşletim yüzeyi: pano bağlanmış + ilk kutu kurulmuş (G4.5, G3.4 ve G4'ten SONRA koşar —
#     soğuk-denetim bulgusu C1: bu yüzeyler yokken "çekilme serbest" denemez. SAGLIK.md bilerek
#     ARANMAZ: onu bekçi yazar ve G5.3d son denetiminden önce meşru olarak olmayabilir.)
if [ -f "$KOK/00_pano/PANO.md" ]; then
  gecti "00_pano/PANO.md yerinde"
else
  kirmizi "00_pano/PANO.md yok (pano bağlanmamış — G3.4)"
fi
KUTU_SAYISI=0
# CANLI kutu sayılır (arşiv değil): G4.5 tek-seferlik çekilme kapısıdır, G4 hemen öncesinde
# KT-001'i taze kurar — bu noktada daima ≥1 canlı kutu olur. (Olgun projede yalnız _arsiv
# kalmışsa bu denetim tekrar koşulmaz; hasım turu 2026-07-16 notu.)
for k in "$KOK"/01_kutular/KT-*/KUTU.md; do KUTU_SAYISI=$((KUTU_SAYISI + 1)); done
if [ "$KUTU_SAYISI" -eq 0 ]; then
  kirmizi "hiç kutu yok (01_kutular/KT-*/KUTU.md) — ilk kutu G4'te kurulmuş olmalı"
else
  gecti "kutu taraması ($KUTU_SAYISI kutu)"
fi

if [ "$SORUN" -eq 0 ]; then
  # KOŞTUĞUNUN İZİ (F1-1 · hasım turu 2026-07-30). İlan edilen "çift hat" tek yönlüydü: sürücü
  # devreye girmediyse bu kapı yakalıyordu, ama BU KAPININ hiç koşmadığını hiçbir şey yakalamıyordu
  # — betik hiçbir kancada değil, diske iz bırakmıyordu ve üç ayrı çürütme "ama kapı KIRMIZI
  # basar" savına dayanıyordu. İz, sürücünün son adımı açarken aradığı şeydir.
  # İzlenmez (makine durumu); YEŞİL değilken yazılmaz ve eski iz silinir.
  # `rmdir` yedeği: iz yerinde bir DİZİN varsa `rm -f` onu silemez ve sürücü (`-f` aradığı için)
  # izi hiç göremez — kilit KALICI olur ve çare mesajı yanlış yönü gösterir. Önce temizle, sonra yaz.
  rm -f "$KOK/tools/guard/.kurulum-denetimi-son" 2>/dev/null || rmdir "$KOK/tools/guard/.kurulum-denetimi-son" 2>/dev/null || true
  { printf '%s\n' "$(date '+%Y-%m-%d %H:%M')" > "$KOK/tools/guard/.kurulum-denetimi-son"; } 2>/dev/null || true
  printf 'SONUÇ: YEŞİL — aktarım tam, çekilme serbest\n'
  exit 0
else
  rm -f "$KOK/tools/guard/.kurulum-denetimi-son" 2>/dev/null || rmdir "$KOK/tools/guard/.kurulum-denetimi-son" 2>/dev/null || true
  printf 'SONUÇ: KIRMIZI — aktarım eksik, çekilme YOK (G4.5)\n'
  exit 2
fi
