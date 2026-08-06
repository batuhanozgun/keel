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
  #   Zorunlu kümenin TEK EVİ tools/bekci/el-kitabi-zorunlu.txt (bekçi sözleşmesi §5①) — üç
  #   kopya dönemi bitti (K1 adım 5): çekirdek, bu betik ve kalıp-eşlik testi AYNI dosyayı okur.
  #   Fail-closed: liste yok ya da kalem biçimsiz → KIRMIZI (küme evsizken "geçti" basılamaz).
  #   baslik: SATIR BAŞINDA çapalı aranır — yorum/paragraf içinde geçen söz başlık sayılmaz
  #   (soğuk-denetim bulgusu C4, 2026-07-16). Desen BRE'dir; kaleme .*[ gibi metakarakter
  #   KOYMA (yanlış-eşleşme; listenin kendi başlık notu da yasaklar).
  #   ibare:/kural: gevşek sabit-dize (grep -qF); "Değer aksiyomu" başlık değil ibaredir.
  LISTE="$KOK/tools/bekci/el-kitabi-zorunlu.txt"
  if [ ! -f "$LISTE" ]; then
    kirmizi "tools/bekci/el-kitabi-zorunlu.txt yok — EL_KITABI bütünlük kümesi evsiz (fail-closed)"
  else
    while IFS= read -r KALEM || [ -n "$KALEM" ]; do
      case "$KALEM" in
        ''|'#'*) : ;;
        baslik:*) B="${KALEM#baslik:}"
                  grep -q "^$B" "$EK" || kirmizi "EL_KITABI zorunlu başlık eksik: $B" ;;
        ibare:*)  B="${KALEM#ibare:}"
                  grep -qF "$B" "$EK" || kirmizi "EL_KITABI zorunlu ibare eksik: $B" ;;
        kural:*)  B="${KALEM#kural:}"
                  grep -qF "$B" "$EK" || kirmizi "EL_KITABI zorunlu kural eksik: $B" ;;
        *)        kirmizi "el-kitabi-zorunlu.txt biçimsiz kalem: $KALEM (fail-closed)" ;;
      esac
    done < "$LISTE"
  fi
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

# 3 · Doldurulmamış «alan» kalmadı (canlı yüzey: kanon + roller + beceriler + kadro koltukları;
#     _arsiv muaf). Fail-closed: taranamayan dosya (grep rc>=2) sessiz-temiz SAYILMAZ.
#     `.claude/agents` bu listeye Faz 2 sıra 6'da girdi: o dizin ilk kez KALIPTAN doldurulan
#     dosyalar taşıyor (G3.3e) ve yarım doldurulmuş bir «ARAÇLAR» satırı koltuğu bozar.
#     Kökteki NASIL_KULLANILIR.md bu taramada YOK ve olamaz — onu G5.0 yazar, bu kapı G4.5'te
#     yani G5'ten ÖNCE koşar; kalan «alan» denetimi G5.0'ın kendi KANIT satırındadır.
ACIK_ALAN=""
for d in "$KOK/02_kanon" "$KOK/03_roller" "$KOK/.claude/skills" "$KOK/.claude/agents"; do
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
# Kökteki sahip kılavuzu: G4.5 koşusunda HENÜZ YOKTUR (onu G5.0 yazar) ama G5.3.c'nin ikinci
# koşusunda vardır — "varsa tara" bu yüzden gerçek bir kalem, gösteriş değil. Kılavuz bu pakette
# ilk kez kalıptan doğuyor, yani ilk kez «alan» taşıyabiliyor; doldurulmamış «PROJE-ADI» sahibin
# kokpit panelinde basılır (hasım bulgusu 2026-07-30).
KILAVUZ="$KOK/NASIL_KULLANILIR.md"
if [ -f "$KILAVUZ" ] && grep -qF '«' "$KILAVUZ"; then
  ACIK_ALAN="$ACIK_ALAN NASIL_KULLANILIR.md"
fi
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
# 4b2 · Cevap sözlüğü (F1-5g): catal-kuyruk.sh onu KİP AYRIMINDAN ÖNCE fail-closed arar, yani
#       yokluğu yalnız uzaktan cevabı değil `--durum` ve `--ekle` yollarını da öldürür — sevk
#       o hâlde dönemi "duran-kapı" ile kapatır. Kırılma gürültülüdür ama YERİ geç: gece, ilk
#       otonom dönemde. Aktarım öz-denetiminin tam olarak yakalaması gereken sınıf (4b emsali).
if [ -s "$KOK/tools/sevk/cevap-sozlugu.txt" ] \
   && grep -qv '^[[:space:]]*\(#.*\)\?$' "$KOK/tools/sevk/cevap-sozlugu.txt" 2>/dev/null; then
  gecti "cevap sözlüğü yerinde (anlamadım sınıfı tanınabiliyor)"
else
  kirmizi "tools/sevk/cevap-sozlugu.txt yok ya da boş — çatal kuyruğunun TÜM kipleri fail-closed durur (F1-5g)"
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
ADIM_TOPLAM=64500    # bayt · indeks + adımlar + BEKCI_TARIFI. Bölmek büyümenin bahanesi olamaz —
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
                     # İKİNCİ BEYANLI ARTIŞ (2026-07-30, Faz 2 sıra 5 · ilk kutu): 60.000 → 61.500
                     # (+%2,5). Yine hasım turu: 62 ham bulgunun 45'i ayakta kaldı ve 11'inin
                     # karşılığı tarifin İÇİNDE yaşamak zorunda (G5.1'in erteleme dalı ve pano
                     # satırı · G5.2'nin çekilme ilanının düzeltilmesi · G1'in "bu karar değil"
                     # işareti · sahip kılavuzuna "ilk işin" kalemi · G3.3d). Bu paket önce
                     # 1,6 KB'lık GERÇEK tekrarı sildi (G4'ün indeksle çakışan gerekçesi, kabuğun
                     # kalıpta zaten yazan tavan ilanı); artış ondan SONRA kaldı.
                     # YAPISAL SEBEP — sonraki paketin işi: `G5.md` bir ADIM dosyası olduğu hâlde
                     # içinde ÜRETİLEN BİR DOSYANIN içerik sözleşmesini taşıyor (NASIL_KULLANILIR,
                     # ~4,5 KB). O içerik cinsi kalıptır (EL_KITABI_KALIBI emsali) ve kalıplar bu
                     # tavana girmez. Doğru çözüm sayıyı büyütmek değil, o sözleşmeyi ÖLÇÜLEN bir
                     # kalıba (`00_genesis/KILAVUZ_KALIBI.md`) çıkarmaktır — bu pakette YAPILMADI
                     # çünkü paket sonunda yapılacak bir yapı değişikliği değil.
                     # ÜÇÜNCÜ BEYANLI ARTIŞ (2026-07-30, Faz 2 sıra 6 · otonom dosyalar):
                     # 61.500 → 64.500 (+%4,9). Sayı paketin SONUNDAKİ hâlidir; paket içinde iki
                     # kez ateşledi ve ikisi de aynı beyanda toplandı (iki ayrı beyan satırı,
                     # freni okunamaz kılan çelişkinin ta kendisi olurdu):
                     #   · ilk yazımda 62.000 yetiyordu (marj 997 B);
                     #   · HASIM TURU (30 ham bulgu, 25'i ayakta) 13 mekanik kural daha getirdi ve
                     #     hepsi tarifin İÇİNDE yaşamak zorunda: G3.3e'nin dört KANIT kalemi +
                     #     fazla-koltuk/rezerve-ad yasağı · G3.3f-ii'nin "Bölüm B'yi SEN YAZMAZSIN,
                     #     SAHİBE SORARSIN" + teyit damgası · G5.0c'nin parola cümlesi + yazma-aracı
                     #     şartı · G5.0d (işaret listesinin SIRA gerekçesiyle taşınması) ·
                     #     G5.3.c'nin ikinci kapı koşusu. Sıkıştırma ilk uygulandı (üç gerçek
                     #     tekrar), kalan 2,3 KB yeni kuraldır.
                     # SIRA: (1) yukarıdaki yapısal iş YAPILDI —
                     # NASIL_KULLANILIR sözleşmesi `KILAVUZ_KALIBI.md`ye çıktı ve tavandan
                     # ~4,0 KB düştü; kaçış yolu olmasın diye yeni kalıp kendi ÖLÇÜLEN tavanıyla
                     # (+marj freni) doğdu. (2) Sonra GERÇEK TEKRAR silindi — hepsi, kurulumcunun
                     # o anda zaten açtığı dosyanın kendi başlığında yazan şeylerdi (kalıp yorumları ·
                     # kanal.conf.ornek başlığı · işaret listesinin biçim tarifi). BU KALEM COMMIT'TEN
                     # ÖLÇÜLEMEZ ve ilk yazımında "~0,9 KB" diye SAYIYLA ilan edilmişti — hasım turu
                     # haklı çıktı: diff'te görünen tek sayı NET değişimdir (60.377 → 61.003 = +626 B),
                     # ara sıkıştırma düzenleme geçmişinde yaşar. Ölçülemeyen tasarrufu sayıyla ilan
                     # etmek "ilan abartması" sınıfıdır; kalem sayısız yazılıyor.
                     # (3) Kalan baskı YENİ MEKANİK KURAL: kurulum ilk kez otonom tarafın
                     # dosyalarını üretiyor (G3.3e kadro koltukları · G3.3f kural evi + karar
                     # alanı + işaret listesi · G5.0c haber kanalı + watchdog) ve bu kuralların
                     # tarifin İÇİNDE yaşaması zorunlu. Marj sıkıştırmadan sonra 497 B'ye indi —
                     # frenin 3 B altı; o üç baytı tıraşlamak frenin engellediği şeyin kendisi
                     # olurdu, o yüzden artış BEYANLA alındı.
                     # SIRADAKİ YAPISAL ADAY (sonraki paketin işi): `G5.0b` de aynı sınıf —
                     # `kokpit.config.json`ın ALAN SÖZLEŞMESİNİ taşıyor (~1,1 KB) ve o da bir
                     # ADIM dosyasında yaşamamalı. Bu pakette yapılmadı: kokpit config'i şablonla
                     # HAZIR gelen bir dosyadır, yani kalıp kategorisi (kopyalanan metin) ona
                     # birebir oturmuyor — kategori kararı ayrı bir iş.
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
  #     (EL_KITABI 16KB burada · OTONOM_DONEM_KALIBI + KARAR_ALANI_KALIBI otonom-sim testinde ·
  #     KILAVUZ_KALIBI + ROL_ALT_AJAN_KALIBI otonom-dosyalar testinde · EL_KITABI kurulu-sim
  #     testinde). ÖLÇÜLMEYENLER ADIYLA SAYILIR (ilan abartmayı kapatmak için — hasım turu
  #     2026-07-30): `ILK_KUTU_KALIBI.md` · `SOZLESME_KALIBI.md` · `MULAKAT_KALIBI.md` ·
  #     `RETRO_KALIBI.md` · `ROL_SKILL_KALIBI.md` · `DEFO_MODELI.md` hiçbir tavana girmiyor.
  #     Yani "tarif tavanı" ile "kalıp tavanları" iki ayrı hat ve ikincisi TAM DEĞİL; ölçülmeyen
  #     bir kalıba paragraf taşıyarak bu tavandan kaçmak MÜMKÜNDÜR — ilan edilmiş sınır,
  #     kapatılması ayrı bir ölçüm paketinin işi. (Faz 2 sıra 6'da bu tavandan İÇERİK ÇIKARILDI:
  #     G5.0'ın NASIL_KULLANILIR sözleşmesi KILAVUZ_KALIBI'na taşındı — yukarıdaki "yapısal sebep"
  #     notunun istediği iş. Kaçış yolu olmasın diye yeni kalıp ölçülen tavanla + marj freniyle
  #     doğdu. TAVAN YİNE DE ARTTI: 61.500 → 64.500, beyanı yukarıdaki ADIM_TOPLAM notunda.
  #     İlk yazımda burada "tavan ARTIRILMADI" yazıyordu ve aynı dosyanın 170. satırıyla
  #     ÇELİŞİYORDU — hasım turu bulgusu; bu evde tavan artışının tek denetimi beyan satırı
  #     olduğu için iki yerde çelişen kayıt, freni okunamaz kılar.)
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

# 7c · KADRONUN ALT-AJAN KOLTUKLARI (Faz 2 sıra 6 · F1-2e · G3.3e). Otonom dönemde sevk bir
#      görevi ancak sahibinin `.claude/agents/<slug>.md` dosyası varsa sevk eder (sevk.sh:562);
#      o dosyaları kurulum ÜRETMİYORDU ve kimse yokluğunu ölçmüyordu — madde 6b yalnız "hiç
#      dosya var mı" diye bakıyor, şablonun üç sabit koltuğu o şartı tek başına karşılıyordu.
#      ÜÇ KALEM: (a) her kadro rolünün dosyası var; (b) `name:` alanı slug'la BİREBİR aynı
#      (dosya adı doğru, alan yanlışsa sevk kapısı geçer ama çağrı hedefini bulamaz);
#      (c) `yazamaz` rolün araç listesinde YAZMA ARACI YOK. (c) bu paketin en kritik kalemi:
#      rol kafesi (file-guard) tören damgasına bakar, otonom dönemde tören YOKTUR ⇒ o dönemde
#      yazamaz modun TEK kilidi bu satırdır. Kalem olmasa "yazamayan doğrulayıcı" güvencesi
#      otonom kipte sessizce ölürdü.
# ARAÇ LİSTESİNİN İKİ MEŞRU DEĞERİ — evi 00_genesis/ROL_ALT_AJAN_KALIBI.md'nin ilanıdır; buradaki
# iki dize onun BİREBİR karşılığıdır ve eşliği şablon testi tutar (TAVANLAR emsali: sayı/dize
# değişikliği İKİ dosyada bilinçli edim ister). Regex ile "yazma aracı var mı" aramak yerine
# BİREBİR EŞLEŞME aranıyor — hasım turu iki yönlü kusur gösterdi: alt-dize eşleşmesi hem yanlış
# KIRMIZI üretiyor (TodoWrite · BashOutput) hem gerçek bir yazma yolunu kaçırıyor (Task/Agent).
ARAC_YAZAMAZ="Read, Grep, Glob"
ARAC_TAM="Read, Grep, Glob, Edit, Write, Bash"
# Şablonun SABİT koltukları: kadro slug'ı olarak REZERVEDİR. Çakışırsa 7c şablonun kendi dosyasına
# bakıp "geçti" basardı, oysa o koltuk salt-okurdur; kadro rolünün görevi hiç kapanmaz ve dosyayı
# düzeltmek kancada engellidir (hasım bulgusu 2026-07-30).
SABIT_KOLTUK_ADLARI="dogrulayici catal-denetcisi kurulum-denetcisi"
KADRO_SAYISI=0
KADRO_SLUGLARI=""
for r in "$KOK"/03_roller/*/; do
  AD=$(basename "$r")
  case "$AD" in _*) continue ;; esac
  KADRO_SAYISI=$((KADRO_SAYISI + 1))
  KADRO_SLUGLARI="$KADRO_SLUGLARI $AD "
  for S in $SABIT_KOLTUK_ADLARI; do
    if [ "$AD" = "$S" ]; then
      kirmizi "kadro slug'ı şablonun SABİT koltuğuyla çakışıyor: 03_roller/$AD (rezerve adlar: $SABIT_KOLTUK_ADLARI) — o koltuk salt-okurdur, bu rolün görevi hiç kapanmaz"
    fi
  done
  AJAN="$KOK/.claude/agents/$AD.md"
  if [ ! -f "$AJAN" ]; then
    kirmizi "kadro rolünün alt-ajan koltuğu yok: .claude/agents/$AD.md (G3.3e — sevk bu rolün görevini sevk edemez, kutu otonom döneme giremez)"
    continue
  fi
  # (a) FRONTMATTER GERÇEKTEN FRONTMATTER MI — ilk satır '---'. Kalıp, frontmatter'ın ÜSTÜNE
  #     kullanım yorumu koyuyor ve onu kurulumcu ELLE siliyor; tepede tek boş satır kalması bile
  #     frontmatter'ı ayrıştırılamaz yapar. Aşağıdaki name/tools kalemleri dosyanın HER YERİNDE
  #     arıyordu, yani gövdeye kaymış bir 'tools:' satırı kapıyı YEŞİL bırakıyordu (hasım bulgusu
  #     2026-07-30). Bu betiğin madde 6'sı SKILL.md için tam bu kontrolü yapıyor ve gerekçesi
  #     "yaşanmış kırılma" olarak yazılı — ders kardeş artefakta taşınmamıştı.
  if [ "$(head -n1 "$AJAN")" = "---" ]; then :; else
    kirmizi "alt-ajan koltuğunun ilk satırı '---' değil: .claude/agents/$AD.md — kalıp-yorumu tam silinmemiş, frontmatter ayrıştırılamaz (araç kısıtı hiç uygulanmaz)"
    continue
  fi
  # (b) name alanı — satır başında, slug'la birebir (frontmatter alanı; kalıpta «SLUG» doldurulur)
  if grep -qE "^name:[[:space:]]*$AD[[:space:]]*$" "$AJAN"; then :; else
    kirmizi "alt-ajan koltuğunun name alanı slug'la eşleşmiyor: .claude/agents/$AD.md ('name: $AD' satırı yok) — sevk dosyayı bulur, çağrı hedefini bulamaz"
  fi
  # (c) MOD SÖZLÜĞÜ FAIL-CLOSED. Eskiden yalnız "Mod: **yazamaz**" aranıyordu ve eşleşmeyen HER
  #     hâl (mod yok · 'Mod: yazamaz' · '**Yazamaz**' · '**yazar**' · ROL.md hiç yok) koşulsuz
  #     'geçti'ye düşüyordu: "mod tam" ile "modu okuyamadım" aynı yeşil satırdı ve paketin
  #     "en kritik kalemi" (yazamaz koltukta yazma aracı yasağı) hiç koşmuyordu.
  # İKİ AYRI grep: BRE'de `\|` alternasyonu GNU eklentisidir, macOS BSD sed onu LİTERAL sayar ve
  # desen hiç eşleşmez — yani mod HER ZAMAN "okunamadı" olurdu (fixture düzeltilince sahada
  # yakalandı). Bu betikte kadran da aynı biçimde, iki ayrı grep'le okunuyor.
  MOD=""
  if [ -f "$r/ROL.md" ]; then
    if grep -qE 'Mod:[[:space:]]*\*\*yazamaz\*\*' "$r/ROL.md"; then MOD="yazamaz"
    elif grep -qE 'Mod:[[:space:]]*\*\*tam\*\*' "$r/ROL.md"; then MOD="tam"
    fi
  fi
  if [ -z "$MOD" ]; then
    kirmizi "rolün araç-profili okunamadı: 03_roller/$AD/ROL.md ('Mod: **yazamaz**' ya da 'Mod: **tam**' satırı yok) — profil belirsizken araç kısıtı ölçülemez (fail-closed; sevkin kadro sayımı da bu satıra bakar)"
    continue
  fi
  # (c2) SABİT MODLU KOLTUK: dış göz her kadranda YAZAMAZ (G2.1.5, D-20 parça 2). Tarifte sabit
  #      olan tek moda çapa yoktu; 'Mod: **tam**' yazılınca kapı sessizce geçiyordu.
  if [ "$AD" = "disgoz" ] && [ "$MOD" != "yazamaz" ]; then
    kirmizi "dış göz koltuğunun modu 'yazamaz' değil (okunan: $MOD) — G2.1.5 bu koltuğun profilini SABİT ilan ediyor; iş yapmayan koltuk yazma aracı devralamaz"
  fi
  # (d) ARAÇ LİSTESİ: değeri moda göre BİREBİR eşleşmeli.
  # Değer YALNIZ frontmatter'ın içinden okunur (ilk '---' ile ikinci '---' arası): gövdeye
  # yazılmış bir 'tools:' satırı harness tarafından okunmaz, kapı da onu okumamalı.
  ARAC=$(awk 'NR==1 && $0=="---" { fm=1; next }
              fm && /^---[[:space:]]*$/ { exit }
              fm && /^tools:/ { sub(/^tools:[[:space:]]*/, ""); sub(/[[:space:]]+$/, ""); print; exit }' "$AJAN")
  if [ -z "$ARAC" ]; then
    kirmizi "alt-ajan koltuğunda araç listesi yok: .claude/agents/$AD.md (frontmatter içinde satır başında 'tools:' olmalı)"
    continue
  fi
  BEKLENEN="$ARAC_TAM"
  [ "$MOD" = "yazamaz" ] && BEKLENEN="$ARAC_YAZAMAZ"
  if [ "$ARAC" = "$BEKLENEN" ]; then
    gecti "alt-ajan koltuğu: $AD ($MOD — araç listesi kalıbın ilan ettiği dize)"
  elif [ "$MOD" = "yazamaz" ]; then
    kirmizi "yazamaz rolün alt-ajan koltuğunda araç listesi kalıbın dizesi DEĞİL: .claude/agents/$AD.md → '$ARAC' (beklenen birebir: '$BEKLENEN') — otonom dönemde rol kafesi susar (tören damgası yok), kilit YALNIZ bu satırdır"
  else
    kirmizi "alt-ajan koltuğunun araç listesi kalıbın dizesi DEĞİL: .claude/agents/$AD.md → '$ARAC' (mod $MOD için beklenen birebir: '$BEKLENEN')"
  fi
done
[ "$KADRO_SAYISI" -gt 0 ] || kirmizi "kadro sayılamadı (03_roller boş) — alt-ajan koltuğu denetimi 'ölçemedim'dir, 'hepsi yerinde' değil"

# 7c2 · TERS YÖNLÜ SAYIM (hasım bulgusu 2026-07-30): yukarıdaki döngü yalnız 03_roller üstünden
#       koşuyordu, yani sözleşmesi ve modu OLMAYAN fazladan bir koltuk kurulumdan çıkabiliyordu —
#       ve sevk ona görev sevk eder (sevk.sh 'ajanVar' yalnız dosya varlığına bakar). Alt dizinler
#       de taranır: '.claude/agents/alt/x.md' kancanın istisnasından geçiyor.
if [ -d "$KOK/.claude/agents" ]; then
  FAZLA=""
  while IFS= read -r a; do
    [ -n "$a" ] || continue
    B=$(basename "$a" .md)
    UST=$(dirname "$a")
    if [ "$UST" != "$KOK/.claude/agents" ]; then FAZLA="$FAZLA ${a#$KOK/}"; continue; fi
    KAYITLI=0
    for S in $SABIT_KOLTUK_ADLARI; do
      if [ "$B" = "$S" ]; then KAYITLI=1; fi
    done
    case "$KADRO_SLUGLARI" in *" $B "*) KAYITLI=1 ;; esac
    if [ "$KAYITLI" -ne 1 ]; then FAZLA="$FAZLA ${a#$KOK/}"; fi
  done <<EOF_AJANLAR
$(find "$KOK/.claude/agents" -name '*.md' 2>/dev/null | sort)
EOF_AJANLAR
  if [ -n "$FAZLA" ]; then
    kirmizi "kadroda karşılığı olmayan alt-ajan koltuğu var:$FAZLA — sevk dosya varlığına bakıp görev sevk eder; sözleşmesiz/modsuz koltuk denetlenemez (alt dizin de meşru değil: kanca istisnası oraya kadar geniş)"
  else
    gecti "alt-ajan koltukları ↔ kadro eşliği (fazla/sahipsiz koltuk yok)"
  fi
fi

# 7d · OTONOM KİPİN İKİ KANON DOSYASI (Faz 2 sıra 6 · F1-2e · G3.3f). İkisi de bugüne dek ELLE
#      kopyalanıyordu: kurulumdan çıkan projede yoklardı, `/donem` "kural evi kurulmamış" ve
#      "profil boş" diye duruyordu — yani kurulum, kullanılamaz bir otonom kip bırakıyordu.
#      KARAR_ALANI denetimi KOPYALANMADI, DEVREDİLDİ: tek kaynak tools/sevk/karar-alani.sh
#      (Bölüm A çapaları + Bölüm B dört başlığın doluluğu orada yaşıyor). Aynı kör noktayı iki
#      kapıya birden yazmak sıra 3'ün dersiydi.
OD="$KOK/02_kanon/OTONOM_DONEM.md"
if [ ! -f "$OD" ]; then
  kirmizi "02_kanon/OTONOM_DONEM.md yok — otonom kipin kural evi kurulmamış (G3.3f; kalıp: 00_genesis/OTONOM_DONEM_KALIBI.md)"
else
  if grep -qF '«' "$OD"; then kirmizi "02_kanon/OTONOM_DONEM.md doldurulmamış «alan» taşıyor"; fi
  if grep -qF 'OTONOM_DONEM KALIBI' "$OD"; then kirmizi "02_kanon/OTONOM_DONEM.md kalıp-yorumunu hâlâ taşıyor (kopyalarken silinmeli)"; fi
  # Taşıyıcı iki başlık: duruş sözleşmesini kurulum kapısı, dönüş zarfını biçim kapısı ve rol
  # koltukları işaretçi olarak gösterir. Biri eksikse dosya var ama işaret ettiği kural yok.
  for CAPA in 'Duruş sözleşmesi' 'Dönüş zarfı'; do
    grep -qF "$CAPA" "$OD" || kirmizi "02_kanon/OTONOM_DONEM.md taşıyıcı bölümü eksik: $CAPA (kural evi yarım kopyalanmış)"
  done
  gecti "otonom kipin kural evi yerinde (02_kanon/OTONOM_DONEM.md)"
fi
if [ -r "$KOK/tools/sevk/karar-alani.sh" ]; then
  KA="$(bash "$KOK/tools/sevk/karar-alani.sh" "$KOK" 2>/dev/null | head -n1 || true)"
  if [ "$KA" = "HAZIR" ]; then
    gecti "sahibin karar alanı HAZIR (02_kanon/KARAR_ALANI.md — soru kanalı açık)"
  else
    kirmizi "sahibin karar alanı hazır değil: ${KA:-ölçülemedi} (G3.3f — profil boşken çatal sahibe gidemez, otonom kip baştan kapalıdır)"
  fi
else
  kirmizi "tools/sevk/karar-alani.sh yok/okunamıyor — karar alanı ölçülemedi (fail-closed)"
fi
# 7d2 · KARAR ALANININ PROVENANS ÇAPASI (hasım turu 2026-07-30 · en sert ikinci bulgu).
#       KARAR_ALANI Bölüm B, sahibe HANGİ SORUNUN GİDECEĞİNİ belirler — yani ajanın sahibe sorma
#       yükümlülüğünü DARALTIR (kalıp: «BİLMEZ» başlığındaki konu sahibe GİDEMEZ) ve
#       korunan-yollar.txt ilanı "ajan kendi soru alanını genişletemez/daraltamaz" der. Bu paket
#       dosyayı ilk kez kurulumun İÇİNE aldı; yani metni artık kuran ajan yazıyor ve tek makine
#       kapısı gövde uzunluğu sayıyordu. Çapa: profil sahibe okunup teyit alınmadan çekilme YOK.
#       SINIR BEYANLI: damgayı da ajan yazar. Ölçülen şey "teyit alındığı BEYAN edildi mi";
#       "gerçekten alındı mı" repo içinden kanıtlanamaz — G0/G2 mühür damgalarıyla aynı sınıf.
GD="$KOK/00_genesis/GENESIS_DURUM.md"
if [ -f "$GD" ]; then
  if grep -qE '^Karar alanı teyidi:[[:space:]]*[^[:space:]]' "$GD"; then
    gecti "karar alanı teyit damgası yerinde (profil sahibe okundu, onayı damgalandı)"
  else
    kirmizi "karar alanı teyit damgası yok: GENESIS_DURUM.md içinde 'Karar alanı teyidi: <ad> · <tarih>' satırı olmalı (G3.3f-ii) — yoksa sahibe hangi sorunun gideceğini kuran ajan kendi kalemiyle yazmış olur"
  fi
fi

# 8 · İşletim yüzeyi: pano bağlanmış + ilk kutu kurulmuş (G4.5, G3.4 ve G4'ten SONRA koşar —
#     soğuk-denetim bulgusu C1: bu yüzeyler yokken "çekilme serbest" denemez. SAGLIK.md bilerek
#     ARANMAZ: onu bekçi yazar ve G5.3d son denetiminden önce meşru olarak olmayabilir.)
if [ -f "$KOK/00_pano/PANO.md" ]; then
  gecti "00_pano/PANO.md yerinde"
else
  kirmizi "00_pano/PANO.md yok (pano bağlanmamış — G3.4)"
fi
# 8b · İLK KUTU KABUĞU — sayarak değil ADIYLA ve ŞEMASIYLA (Faz 2 sıra 5 · F1-2c/F1-2d).
# ESKİ HÂL: "01_kutular/KT-*/KUTU.md kaç tane" diye SAYIYORDU. Sayı, kabuğun DOĞRU olduğunu
# söylemez — boş bir KT-999/KUTU.md de sayıyı 1 yapardı ve kapı yeşil basardı.
# ÖLÇÜLEN ŞEY BİÇİMDİR, İÇERİK DEĞİL — ama biçim, kabuğun HER MAKİNE OKUYUCUSUNUN aradığı
# şeyleri kapsar: taşıyıcı başlıklar (sevk `## Bağımlılık ve risk` yoksa dönemi hiç açmaz;
# kokpit `## Görevler` yoksa kutuyu boş gösterir), duruş sözleşmesinin beş satırı BLOĞUN İÇİNDE
# (dosya genelinde aramak, satır bloğun dışına kaydığında sessiz yeşil üretiyordu — hasım turu
# 2026-07-30), LİSTE'nin DEĞERİ (sevk yalnız o dizeyi tanır), doldurulan tek alanın karşılığı
# ve sahibin mühür vereceği yüzey.
KABUK_AD="KT-001-proje-plani"
KABUK="$KOK/01_kutular/$KABUK_AD/KUTU.md"
# Kabuğun mandat çapası: kalıptan kopyalandığının tek işareti.
MANDAT="Bu kutunun işi, bu projenin nasıl yürütüleceğini çıkarmaktır"
# Olgun projede kabuk arşive gitmiş olabilir: kapı elle yeniden koşturulabilir bir betiktir ve
# tamamlanmış bir kurulumu geriye dönük KIRMIZI'ya düşürmemeli. AMA bu dal bir KAÇIŞ YOLU
# olamaz: sıfır baytlık bir `_arsiv/KT-001-proje-plani/KUTU.md` "kutu tamamlanmış" saydırıp
# çekilmeyi açıyordu (hasım turu 2026-07-30) — arşiv dalı da mandat çapasını arar.
if [ ! -f "$KABUK" ] && [ -f "$KOK/01_kutular/_arsiv/$KABUK_AD/KUTU.md" ]; then
  if grep -qF "$MANDAT" "$KOK/01_kutular/_arsiv/$KABUK_AD/KUTU.md"; then
    gecti "ilk kutu kabuğu arşivde ($KABUK_AD) — kutu tamamlanmış"
  else
    kirmizi "arşivdeki $KABUK_AD kabuk değil (mandat metni yok) — 'kutu tamamlanmış' hükmü verilemez"
  fi
elif [ ! -f "$KABUK" ]; then
  kirmizi "ilk kutu kabuğu yok: 01_kutular/$KABUK_AD/KUTU.md (G4 — 00_genesis/ILK_KUTU_KALIBI.md kopyalanmamış)"
else
  # (i) Mandat çapası: kopyala-doldur yerine serbest yazım yapıldıysa burada görünür.
  if grep -qF "$MANDAT" "$KABUK"; then
    gecti "ilk kutu kabuğu: mandat metni yerinde"
  else
    kirmizi "ilk kutu kabuğunda mandat metni yok — kalıp kopyalanmamış/yeniden yazılmış (00_genesis/ILK_KUTU_KALIBI.md)"
  fi
  # (ii) Doldurulmamış alan: kalıbın tek alanı «KOORDİNATÖR-SLUG».
  if grep -q '«' "$KABUK"; then
    kirmizi "ilk kutu kabuğunda doldurulmamış «alan» var: 01_kutular/$KABUK_AD/KUTU.md"
  else
    gecti "ilk kutu kabuğu: doldurulmamış alan yok"
  fi
  # (iii) TAŞIYICI BAŞLIKLAR — satır çapalı. Biri silinirse kapı eskiden YEŞİL basıyordu ama
  #       ilk dönem baştan ölüydü: sevk `## Bağımlılık ve risk` yoksa `dur()` ile hiç açılmıyor.
  for H in "## Görevler" "## Duruş sözleşmesi" "## Bağımlılık ve risk" \
           "## Bu kutu bitince gözünle göreceklerin" "## Kabul kriterleri"; do
    if grep -qF -- "$H" "$KABUK" && [ "$(grep -c "^$H" "$KABUK" 2>/dev/null || echo 0)" -gt 0 ]; then
      gecti "ilk kutu kabuğu: başlık yerinde ($H)"
    else
      kirmizi "ilk kutu kabuğunda taşıyıcı başlık yok: '$H' — o bloğun okuyucusu kutuyu göremez"
    fi
  done
  # (iv) G-01 satırı + SAHİP hücresi. Kapı GENESIS'in doldurduğu TEK alanı ölçmüyordu: slug
  #      «KOORDİNATÖR-SLUG» olarak bırakılsa bile «alan» denetimi onu yakalar, ama YANLIŞ bir
  #      slug yazılırsa kapı yeşil basıp sevk "sahibi kadroda yok" diye duruyordu (hasım turu).
  G01_SAHIP="$(awk -F'|' '/^\|[[:space:]]*G-01[[:space:]]*\|/ { s=$4; gsub(/^[[:space:]]+|[[:space:]]+$/, "", s); print s; exit }' "$KABUK" 2>/dev/null || true)"
  if [ -z "$G01_SAHIP" ]; then
    kirmizi "ilk kutu kabuğunda G-01 görev satırı yok/okunamıyor — sevk görev listesini göremez"
  else
    gecti "ilk kutu kabuğu: G-01 görev satırı yerinde"
    case "$G01_SAHIP" in
      *[!a-z0-9_-]*|'') kirmizi "ilk kutu kabuğunda G-01 sahip hücresi slug değil: '$G01_SAHIP' (izinli: a-z 0-9 _ -)" ;;
      *)
        if [ -f "$KOK/03_roller/$G01_SAHIP/ROL.md" ]; then
          gecti "ilk kutu kabuğu: G-01 sahibi kadroda ($G01_SAHIP)"
        else
          kirmizi "ilk kutu kabuğunda G-01 sahibi kadroda yok: 03_roller/$G01_SAHIP/ROL.md — sevk bu görevi hiç açamaz"
        fi ;;
    esac
  fi
  # (v) Duruş sözleşmesinin beş satırı BLOĞUN İÇİNDE. Dosya genelinde aramak, satır bloğun
  #     dışına kaydığında kapıyı yeşil bırakıyordu; sevk ise bloğu okur ve kutuyu sıradan kutu
  #     sayardı — iki göz ayrışıyordu.
  DURUS_BLOK="$(awk '/^## Duruş sözleşmesi/ { f = 1; next } f && /^## / { exit } f' "$KABUK" 2>/dev/null || true)"
  for S in "BİTİŞ HÂLİ" "KANIT" "KISIT" "BÜTÇE" "İZİN" "LİSTE"; do
    if printf '%s\n' "$DURUS_BLOK" | grep -qE "^[[:space:]]*$S[[:space:]]*:[[:space:]]*[^[:space:]]"; then :; else
      kirmizi "ilk kutu kabuğunda duruş sözleşmesi satırı eksik/boş (blok İÇİNDE aranır): $S"
    fi
  done
  # (vi) LİSTE'nin DEĞERİ. Bu satır İKİ freni birden taşıyor (şişme çapasının ertelenmesi +
  #      görev tavanının kadroya bağlanması) ve sevk yalnız TEK dizeyi tanır. Kapı "dolu mu"
  #      diye bakarsa, değer değiştiğinde kabuk sessizce sıradan kutuya döner ve plan doğar
  #      doğmaz yanlış şişme alarmı çalar (hasım turu 2026-07-30).
  if printf '%s\n' "$DURUS_BLOK" | grep -qE "^[[:space:]]*LİSTE[[:space:]]*:.*dönem[[:space:]]+içinde[[:space:]]+doğar"; then
    gecti "ilk kutu kabuğu: LİSTE satırı sevkin tanıdığı değeri taşıyor"
  else
    kirmizi "ilk kutu kabuğunda LİSTE satırı sevkin tanıdığı değeri taşımıyor (beklenen: 'dönem içinde doğar') — planlama kutusu muafiyeti sessizce düşer"
  fi
  # (vi-a) İZİN'in DEĞERİ (F1-5f). Otonom dönemde izin penceresi açılmaz: kutunun izin listesinde
  #        yazmayan sınıf engellenir. İlk kutunun ekibi iki kanon dosyasını (BITTI_TANIMI ·
  #        KUTU_PLANI) YAZMAK ZORUNDADIR — onlar bu kutunun ÜRÜNÜDÜR. `kutu-ciktilari` sınıfı
  #        listede yoksa kutu mekanik olarak bitirilemez ve bu SESSİZ olur (adım atlanır, iş
  #        sürer, dört çıktının ikisi hiç doğmaz). LİSTE emsali: değer EŞLENİR, "dolu mu" denmez.
  if printf '%s\n' "$DURUS_BLOK" | grep -qE "^[[:space:]]*İZİN[[:space:]]*:.*kutu-ciktilari"; then
    gecti "ilk kutu kabuğu: İZİN satırı kutu çıktılarını serbest bırakıyor"
  else
    kirmizi "ilk kutu kabuğunun İZİN satırında 'kutu-ciktilari' yok — ekip 02_kanon/BITTI_TANIMI.md ve 02_kanon/KUTU_PLANI.md dosyalarını yazamaz; kutunun dört çıktısının ikisi sessizce doğmaz (F1-5f)"
  fi
  # (vi-a2) BÜTÇE ile KADRO karşılaştırılır (hasım turu 2026-07-30). Kabuğun BÜTÇE değeri SABİT
  #         metindir (6), planlama kutusunun görev sayısı ise DEĞİŞKENDİR: G-01 + iş zincirindeki
  #         her role bir görev = kadro + 1. İkisi hiçbir yerde karşılaştırılmıyordu; kadro 6 olan
  #         bir kurulumda 7. üretim sevki bütçeye takılır, sevk erken döner ve o dönemde ne dış
  #         göz brifingi ne kapanış karnesi üretilir — kutu SESSİZCE bitirilemez hâle gelir.
  #         Kadro: 03_roller altındaki `Mod: **yazamaz**` OLMAYAN koltuklar (F1-7 sayımıyla aynı).
  BUTCE_SAYI="$(printf '%s\n' "$DURUS_BLOK" | sed -n 's/^[[:space:]]*BÜTÇE[[:space:]]*:.*/&/p' | sed -n 's/[^0-9]*\([0-9][0-9]*\).*/\1/p' | head -n1)"
  KADRO_SAYI=0
  for r in "$KOK"/03_roller/*/; do
    [ -f "$r/ROL.md" ] || continue
    grep -q 'Mod:[[:space:]]*\*\*yazamaz\*\*' "$r/ROL.md" && continue
    KADRO_SAYI=$((KADRO_SAYI + 1))
  done
  if [ -z "$BUTCE_SAYI" ]; then
    kirmizi "ilk kutu kabuğunun BÜTÇE satırında sayı yok — sevk fail-closed 3 varsayar ve planlama kutusu bitirilemez"
  elif [ "$KADRO_SAYI" -gt 0 ] && [ "$BUTCE_SAYI" -lt $((KADRO_SAYI + 1)) ]; then
    kirmizi "ilk kutu kabuğunun BÜTÇE değeri ($BUTCE_SAYI) kadroya yetmiyor: planlama kutusu G-01 + $KADRO_SAYI rol görevi = $((KADRO_SAYI + 1)) üretim çağrısı ister. Kutu mekanik olarak bitirilemez (bütçe YALNIZ üretim sayar — tools/sevk/README.md)"
  else
    gecti "ilk kutu kabuğu: BÜTÇE ($BUTCE_SAYI) kadro+1 ($((KADRO_SAYI + 1))) şartını karşılıyor"
  fi
  # (vi-b) Bağımlılık/risk SATIRI: kurulum kapısının (tools/sevk/kurulum-kapisi.sh) ve sevkin
  #        birebir aradığı biçim. Başlığın varlığı yetmez — blok boşsa sevk `dur()` ile durur.
  if grep -qE '^[[:space:]]*G-01[[:space:]]*:[[:space:]]*onkosul=.*·[[:space:]]*risk=(düşük|riskli)[[:space:]]*—' "$KABUK"; then
    gecti "ilk kutu kabuğu: bağımlılık/risk satırı biçimli"
  else
    kirmizi "ilk kutu kabuğunda G-01 için bağımlılık/risk satırı yok/biçimsiz (## Bağımlılık ve risk)"
  fi
  # (vii) Sahibin mühür vereceği yüzey: üç somut iddia (EL_KITABI kutu-döngüsü 1 zorunlu sayar).
  GOR_SAYI="$(awk '/^## Bu kutu bitince gözünle göreceklerin/ { f = 1; next } f && /^## / { exit } f && /^[0-9]+\. / { n++ } END { print n + 0 }' "$KABUK" 2>/dev/null || true)"
  case "$GOR_SAYI" in
    ''|*[!0-9]*) kirmizi "ilk kutu kabuğunun 'göreceklerin' bloğu okunamadı" ;;
    *) if [ "$GOR_SAYI" -ge 3 ]; then gecti "ilk kutu kabuğu: 'göreceklerin' bloğu $GOR_SAYI madde"
       else kirmizi "ilk kutu kabuğunun 'göreceklerin' bloğunda $GOR_SAYI madde var (en az 3) — sahip mührü bu blok üstünden verilir"; fi ;;
  esac
  # (viii) Kilitli-tarih çapası: G4'ün İKİNCİ ürünü ve tek denetçisi bugüne dek kurulumcunun
  #        KENDİ yazdığı bekçiydi (denetleyen ≠ denetlenenin yazarı ilkesinin dışında kalıyordu).
  CAPA="$KOK/02_kanon/kilitli/.taban-ref"
  if [ ! -f "$CAPA" ]; then
    kirmizi "kilitli-tarih çapası yok: 02_kanon/kilitli/.taban-ref (G4 — koruma-hattı (iii) gözü onsuz açılmaz)"
  elif [ "$(wc -l < "$CAPA" | tr -d ' ')" -gt 1 ]; then
    kirmizi "kilitli-tarih çapası tek satır değil: 02_kanon/kilitli/.taban-ref"
  elif grep -qE '^[0-9a-f]{40}$' "$CAPA"; then
    gecti "kilitli-tarih çapası biçimli (40'lık commit-hash)"
  else
    kirmizi "kilitli-tarih çapası 40'lık commit-hash değil (sembolik ref kalıcı körlüktür): 02_kanon/kilitli/.taban-ref"
  fi
fi

# 8c · İleriye bakan iki kanon iskeleti (G3.3d) — ilk kutunun dört çıktısından ikisinin EVİ.
# Ev kurulumda doğmazsa ilk kutu "yeni dosya icat etme" yasağıyla çarpışır ve çıktı sahipsiz kalır.
# Başlık SATIR ÇAPALI aranır: çapasız `grep -qF`, HTML yorumu içine yazılmış bir dizeyi de
# "iskelet yerinde" sayıyordu (hasım turu 2026-07-30; aynı dosyanın kendi kuralı çapalı aramaydı).
for I in "BITTI_TANIMI.md:# BİTTİ TANIMI" "KUTU_PLANI.md:# KUTU PLANI"; do
  I_AD="${I%%:*}"; I_BAS="${I#*:}"
  if [ ! -f "$KOK/02_kanon/$I_AD" ]; then
    kirmizi "kanon iskeleti yok: 02_kanon/$I_AD (G3.3d — ilk kutunun çıktısı buraya yazılır)"
  elif grep -q "^$I_BAS" "$KOK/02_kanon/$I_AD"; then
    gecti "kanon iskeleti yerinde: 02_kanon/$I_AD"
  else
    kirmizi "kanon iskeletinin başlığı yanlış/çapasız: 02_kanon/$I_AD (beklenen satır başında: '$I_BAS …')"
  fi
done

# 8d · Korunan yollar listesi: iki kanon dosyası [SORULUR] bölümünde mi. G3.3b bu listeyi
# GENESIS'e güncelletiyor; iki satırın kurulumdan sağ çıktığını bugüne dek hiçbir göz ölçmüyordu
# (file-guard kurulum penceresinde yazımı serbest bırakır — hasım turu 2026-07-30).
KY="$KOK/tools/guard/korunan-yollar.txt"
if [ ! -r "$KY" ]; then
  kirmizi "korunan-yollar listesi okunamıyor: tools/guard/korunan-yollar.txt"
else
  KY_SORULUR="$(awk '/^\[SORULUR\]/ { f = 1; next } f && /^\[/ { exit } f' "$KY" 2>/dev/null || true)"
  for Y in "02_kanon/BITTI_TANIMI.md" "02_kanon/KUTU_PLANI.md"; do
    if printf '%s\n' "$KY_SORULUR" | grep -qxF "$Y"; then
      gecti "korunan yol [SORULUR] listesinde: $Y"
    else
      kirmizi "korunan-yollar [SORULUR] bölümünde eksik: $Y — sahip mührüne bağlı dosya dönem içinde sessizce değişebilir"
    fi
  done
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
