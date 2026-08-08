#!/bin/bash
# ortak — sevk ailesinin ortak kitaplığı (E4, 2026-07-28). Kaynak olarak alınır, koşturulmaz.
# Doğuş: E1-E3 boyunca AYNI node-keşfi bloğu beş betiğe kopyalandı (kilit.sh'ın doğuşuyla aynı
# hikâye — D-02 dersi: bayt-bayt kopya = sürüklenme). E4 dört betik daha ekleyeceği için blok
# tek eve alındı. Kitaplık YOKSA çağıran fail-closed davranır (sessiz geçme yok).
#
# Sağladıkları:
#   node_bul                → NODE_BIN'i doldurur; bulunamazsa 1 döner (GUI oturumunda PATH dardır)
#   donem_oku <kök>          → .donem-acik'ı okur: DONEM_ID · DONEM_KUTU · DONEM_TUR · DONEM_SINIF
#                             0 = dönem açık ve gösterge sağlam · 1 = dönem YOK · 2 = gösterge BOZUK
#                             (2 fail-closed'dur: "okunamıyor" ile "dönem yok" AYNI ŞEY DEĞİLDİR)
#   donem_turu_yaz <kök> <tür> → göstergenin TÜR alanını yerinde değiştirir (evre geçişi, F1-5a);
#                             kimlik ve damga KORUNUR — dönem aynı dönemdir, evresi değişir
#   gunluge_yaz <kök>       → stdin'deki tek satır JSON'u zarf-ekle.sh ile günlüğe append eder
#   json_kur                → J_/JN_ önekli env değişkenlerinden güvenli JSON kurar
#   kanal_oku <kök>         → kanal.conf'u AYRIŞTIRIR (source ETMEZ); KANAL_* doldurur
#                             0 = eksiksiz · 1 = dosya yok · 2 = zorunlu alan boş/bozuk
export LC_ALL=C.UTF-8

ORTAK_DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kaynak alınmak SIFIRLAMAZ (yaşanmış kırılma, E4): zarf-bicim-kapisi.sh göstergeyi kendi
# okuyup sonra kitaplığı alıyordu; düz atama onun DONEM_KUTU değerini siliyor ve risk taraması
# sessizce "kaba dal"a düşüyordu. Kitaplık yalnız TANIMLAR, değer EZMEZ.
NODE_BIN="${NODE_BIN:-}"
DONEM_ID="${DONEM_ID:-}"; DONEM_KUTU="${DONEM_KUTU:-}"; DONEM_TUR="${DONEM_TUR:-}"
DONEM_SINIF="${DONEM_SINIF:-}"; DONEM_DAMGA="${DONEM_DAMGA:-}"
DONEM_HATA="${DONEM_HATA:-}"

node_bul() {
  [ -n "$NODE_BIN" ] && return 0
  NODE_BIN="$(command -v node 2>/dev/null || true)"
  if [ -z "$NODE_BIN" ]; then
    for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
      if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
    done
  fi
  [ -n "$NODE_BIN" ]
}

# Dönem göstergesi — DÖRT alan: donem-id · kutu-dizini · tür (evre) · sınıf.
# KİP ALANI KALKTI (F1-5e, 2026-07-30): `interaktif`/`bassiz` bayrağı yalnız bir NOT DİZESİ
# üretiyordu; davranışı oturumun nasıl başlatıldığı belirliyordu. İzin penceresi artık hiçbir
# kipte açılmaz (F1-5f) — bayrağın anlattığı ayrım da böylece ortadan kalktı.
# Geri uyum: eski beş-alan göstergede 4. alan `interaktif|bassiz`tır; o hâlde sınıf 5. alandan
# okunur ve bu SESSİZ olmaz (DONEM_HATA doldurulur, çağıran bulgu düşürür).
donem_oku() {
  local KOK="${1:-.}" YOL SATIR ESKI_KIP
  YOL="$KOK/tools/sevk/.donem-acik"
  DONEM_ID=""; DONEM_KUTU=""; DONEM_TUR=""; DONEM_SINIF=""; DONEM_HATA=""
  [ -e "$YOL" ] || return 1
  if [ ! -f "$YOL" ]; then
    DONEM_HATA="gösterge dosya değil (dizin/başka tür): tools/sevk/.donem-acik"
    return 2
  fi
  SATIR="$(head -n1 "$YOL" 2>/dev/null || true)"
  DONEM_ID="$(printf '%s' "$SATIR" | cut -f1)"
  DONEM_KUTU="$(printf '%s' "$SATIR" | cut -f2)"
  DONEM_TUR="$(printf '%s' "$SATIR" | cut -f3)"
  DONEM_SINIF="$(printf '%s' "$SATIR" | cut -f4)"
  DONEM_DAMGA="$(sed -n '2p' "$YOL" 2>/dev/null | cut -f2 || true)"
  if [ -z "$DONEM_ID" ]; then
    DONEM_HATA="gösterge boş: ilk satırda dönem kimliği yok"
    return 2
  fi
  case "$DONEM_KUTU" in
    *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) DONEM_KUTU=""; DONEM_TUR=""; DONEM_SINIF=""; DONEM_HATA="eski 2-alan gösterge biçimi (kutu/tür yok)" ;;
  esac
  case "$DONEM_TUR" in
    *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) DONEM_TUR=""; DONEM_SINIF=""; DONEM_HATA="eski 3-alan gösterge biçimi (tür yok)" ;;
  esac
  case "$DONEM_SINIF" in
    interaktif|bassiz)
      ESKI_KIP="$DONEM_SINIF"
      DONEM_SINIF="$(printf '%s' "$SATIR" | cut -f5)"
      DONEM_HATA="eski gösterge biçimi: 4. alan kip ($ESKI_KIP) — kip bayrağı kalktı (F1-5e), sınıf 5. alandan okundu"
      ;;
  esac
  [ -n "$DONEM_TUR" ] || DONEM_TUR="yapim"
  case "$DONEM_TUR" in
    kurulum|yapim|kapanis) : ;;
    *) DONEM_HATA="tanınmayan dönem türü: $DONEM_TUR"; return 2 ;;
  esac
  # Sınıf: gerçek kutu dönemi ile tatbikat dönemini ayırır (gerçekte watchdog + haber kanalı
  # ÖLÇÜLEREK aranır). Alan yoksa güvenli taraf GERÇEK'tir — muafiyet açıkça istenmedikçe verilmez.
  [ -n "$DONEM_SINIF" ] || DONEM_SINIF="gercek"
  case "$DONEM_SINIF" in
    gercek|tatbikat) : ;;
    *) DONEM_HATA="tanınmayan dönem sınıfı: $DONEM_SINIF"; return 2 ;;
  esac
  return 0
}

# Gerçek-kutu döneminin ek şartları (OTONOM_DONEM §10; tatbikat dönemleri MUAF — E4/E5
# tatbikatları döngüsel bağımlılığa girmesin diye tasarımın bilinçli istisnası).
# Çıktı: eksiklerin listesi (boşsa şart karşılanmış).
# İŞARET DEĞİL CANLILIK (E5): "dosya var" ile "iş fiilen koşuyor" AYRI şeylerdir. E4'ün en
# pahalı ders sınıfı dosyada duran ölü kuraldı — bu denetim işaretin gösterdiği launchd işini
# `launchctl print` ile arar ve son nabız damgasının tazeliğine bakar. Kanal da aynı hatta:
# haber kanalı kırıkken gerçek bir kutu koşarsa, gece sessiz geçer ve kimse bilmez.
# T6 PROVA FİŞİ ŞARTI KALKTI (F1-5h, 2026-07-30): o dosya KEEL sürümünün E5 kanal provasını
# kanıtlıyordu, KULLANICININ kurulumunu değil. GEREKÇE HASIM TURUNDA DÜZELTİLDİ (aynı gün):
# T6, kardeşleri T0-T4 gibi şablonla DOLU gelmiyordu — dağıtımda hiç yoktu. Yani kusur
# "baştan mühürlü kapı" DEĞİL, tam tersiydi: şart her kurulumda gerçek dönemi kilitliyordu ve
# karşılığı o kurulumda hiçbir zaman üretilemiyordu. Yerini alan şey daha sert: aşağıdaki üç
# ölçüm bu makinede, bu an koşuyor (dosya varlığı değil, işin CANLILIĞI).

# Metin tavanı — TEK EV (U29 · U30 · U31, K23 Öbek 1). Üç ayrı yerde üç kopyası vardı ve
# üçü de AYNI üç kusuru taşıyordu. ÖLÇÜLDÜ 2026-08-08:
#   · İlan "1500 bayt"tı ama `${#M}` KARAKTER sayar: 1800 Türkçe karakterlik metin 3300 B'dır
#     ve tavan onu 1800 sanardı — ilan edilen birimle ölçülen birim aynı değildi.
#   · `cut -c1-1500` çıktısı o metinde 2751 B verdi: ilan edilen tavanın neredeyse iki katı.
#   · `cut -c` SATIR BAŞINA keser. Üç satırlık 2702 karakterlik gövde `cut -c1-1500`ten HİÇ
#     KESİLMEDEN geçti — ve etiket sahibe "1202 karakter kesildi" dedi. Kesilmemiş bir metne
#     "kesildi" demek, sahip yüzeyinde düpedüz yalandır.
# Buradaki sözleşme: birim BAYTtır ve ilan edilen birimle ölçülür · kesme çok satırlıda da
# uygulanır · etiket ancak GERÇEKTEN kesildiğinde basılır ve ÖLÇÜLEN miktarı söyler.
# Etiketin kendi baytları tavana SAYILMAZ: tavan yükün sınırıdır, uyarının değil.
kirp_bayt() { # $1: metin · $2: tavan (bayt) — çıktı stdout
  local M="${1:-}" TAVAN="${2:-1500}" HAM KESIK N i=0
  HAM="$(printf '%s' "$M" | wc -c | tr -d ' ')"
  case "$TAVAN" in ''|*[!0-9]*) TAVAN=1500 ;; esac
  if [ "$HAM" -le "$TAVAN" ]; then printf '%s' "$M"; return 0; fi
  KESIK="$(printf '%s' "$M" | head -c "$TAVAN")"
  # ÇOK BAYTLI KARAKTER İKİYE BÖLÜNMEZ: bayt sınırında kesmek son karakteri yarım bırakır ve
  # sahibin ekranında bozuk bayt olarak görünür. En çok 3 bayt soyulur — UTF-8'in kendi üst
  # sınırı budur, döngü bu yüzden SAYILI: iconv yoksa da sonsuza dönmez (fail-bounded).
  while [ "$i" -lt 3 ] && [ -n "$KESIK" ] \
        && ! printf '%s' "$KESIK" | iconv -f UTF-8 -t UTF-8 >/dev/null 2>&1; do
    N="$(printf '%s' "$KESIK" | wc -c | tr -d ' ')"
    KESIK="$(printf '%s' "$KESIK" | head -c $(( N - 1 )))"
    i=$(( i + 1 ))
  done
  N="$(printf '%s' "$KESIK" | wc -c | tr -d ' ')"
  printf '%s… [%s bayt kesildi]' "$KESIK" "$(( HAM - N ))"
}

# launchd işinin YÜKLÜ olup olmadığı. Kendi fonksiyonunda, çünkü bu dal testte HİÇ koşmuyordu:
# "hangi kipte hiç koşmuyor" sorusunun bu evdeki cevabı buydu — yüklü bir işin arkasındaki
# nabız/damga kuyruğunun tamamı ölçümsüzdü (U26 tam orada yaşıyordu).
watchdog_isi_yuklu() { # $1: launchd etiketi
  launchctl print "gui/$(id -u)/${1:-}" >/dev/null 2>&1
}

# Nabız damgasının yaşı (dakika). ÜÇ AYRI SONUÇ — "ölçemedim" ile "ölçtüm, kötü" AYNI ŞEY
# DEĞİLDİR (U26). Eskiden bu hesap `node`u ÇIPLAK çağırıp hatasını `|| echo 999` ile yutuyordu:
# launchd/GUI oturumunun dar PATH'inde node bulunamıyor, 999 bir "yaş" sanılıyor ve gerçek kutu
# dönemi `watchdog-nabzi-BAYAT(999dk)` diye ENGELLENİYORDU — oysa watchdog dipdiri koşuyordu.
# Sahip yanlış yere bakar, asıl arıza görünmez. Kardeşi U46'dır (kokpit okuyamadığına YEŞİL
# diyordu); yönü ters, sınıfı aynı: OKUYAMAMAYI BİR ÖLÇÜM DEĞERİNE ÇEVİRMEK.
# Dönüş: 0 = yaş stdoutta · 2 = ÖLÇÜLEMEDİ (node yok / koşmadı) · 3 = damga çözülemedi
nabiz_yasi_dk() { # $1: damga dosyası
  local DOSYA="${1:-}" HAM YAS RC=0
  [ -s "$DOSYA" ] || return 3
  HAM="$(head -n1 "$DOSYA" 2>/dev/null || true)"
  [ -n "$HAM" ] || return 3
  node_bul || return 2
  YAS="$(N_D="$HAM" "$NODE_BIN" -e 'const t=Date.parse(process.env.N_D||"");if(!Number.isFinite(t))process.exit(3);console.log(Math.floor((Date.now()-t)/60000))' 2>/dev/null)" || RC=$?
  [ "$RC" = "3" ] && return 3
  [ "$RC" = "0" ] || return 2
  case "$YAS" in ''|-|*[!0-9-]*) return 2 ;; esac
  printf '%s' "$YAS"
}

# Nabız damgasının HÂLİ (U32). Damganın 1. satırı NE ZAMAN koştuğunu söyler; 2. satır İŞİNİ
# YAPIP YAPAMADIĞINI. İkisi ayrı sorudur ve eskiden yalnız birincisi vardı: watchdog ortak.sh'ı
# okuyamadan ya da node'u bulamadan sessizce çıksa bile damga TAZE duruyor, üç tüketici de ona
# bakıp YEŞİL diyordu. Yaş ölçümü (nabiz_yasi_dk) BU FONKSİYONUN İŞİ DEĞİL — o "ne zaman"
# sorusunun cevabıdır, bu "ne yaptı" sorusunun.
# Dönüş: 0 = stdout `TAM` · 1 = stdout `EKSIK:<sebep>` · 2 = stdout `HALSIZ` (hâl satırı yok —
# eski sürüm bir nabiz.sh koşuyor: damga TAZE olabilir ama neyi kanıtladığı BİLİNMİYOR, ve
# "bilinmiyor" bir ölçüm değeri değildir).
nabiz_hali() { # $1: damga dosyası
  local DOSYA="${1:-}" HAL SEBEP
  [ -s "$DOSYA" ] || { printf 'HALSIZ'; return 2; }
  HAL="$(sed -n 's/^hal=//p' "$DOSYA" 2>/dev/null | head -n1)"
  case "$HAL" in
    TAM) printf 'TAM'; return 0 ;;
    EKSIK)
      SEBEP="$(sed -n 's/^sebep=//p' "$DOSYA" 2>/dev/null | head -n1)"
      case "$SEBEP" in ''|*[!A-Za-z0-9._-]*) SEBEP="sebep-okunmadi" ;; esac
      printf 'EKSIK:%s' "$SEBEP"; return 1 ;;
    *) printf 'HALSIZ'; return 2 ;;
  esac
}

gercek_kutu_eksikleri() { # $1: sevk dizini
  local D="${1:-$ORTAK_DIZIN}" E="" ETIKET="" YAS="" YRC=0 HAL="" HRC=0
  if [ ! -s "$D/watchdog-kurulu" ]; then
    E="$E watchdog-kaydi(tools/sevk/watchdog-kurulu)"
  else
    ETIKET="$(sed -n 's/^etiket=//p' "$D/watchdog-kurulu" 2>/dev/null | head -n1)"
    if [ -z "$ETIKET" ]; then
      E="$E watchdog-kaydinda-etiket-yok"
    elif ! watchdog_isi_yuklu "$ETIKET"; then
      E="$E watchdog-isi-YUKLU-DEGIL($ETIKET)"
    elif [ ! -s "$D/.nabiz-son" ]; then
      E="$E watchdog-hic-kosmamis"
    else
      YAS="$(nabiz_yasi_dk "$D/.nabiz-son")" || YRC=$?
      # ÜÇ EKSİK ADI, ÜÇ AYRI SEBEP. Hepsi dönemi engeller (kalkansız motor yok) ama sahibi
      # AYRI yere gönderir: bayat nabız watchdog'a, ölçülemeyen nabız node kurulumuna,
      # okunmayan damga dosyanın kendisine bakılmasını söyler.
      case "$YRC" in
        0) [ "$YAS" -le 20 ] || E="$E watchdog-nabzi-BAYAT(${YAS}dk)" ;;
        2) E="$E watchdog-nabzi-OLCULEMEDI(node-bulunamadi)" ;;
        *) E="$E watchdog-damgasi-okunmuyor" ;;
      esac
      # DÖRDÜNCÜ SORU (U32): damga taze olabilir ve watchdog yine de işini yapamıyor olabilir.
      # "Ne zaman koştu" ile "işini yaptı mı" ayrı ölçümlerdir; ikincisinin tüketicisi burasıdır.
      # Üretilip bağlanmayan hâl, hiç üretilmemiş hâlle aynı körlüğü verir (Kök 1c).
      HAL="$(nabiz_hali "$D/.nabiz-son")" || HRC=$?
      case "$HRC" in
        1) E="$E watchdog-KOSUYOR-AMA-ISINI-YAPAMIYOR(${HAL#EKSIK:})" ;;
        2) E="$E watchdog-damgasi-HALSIZ(eski-nabiz.sh-kosuyor)" ;;
      esac
    fi
  fi
  if [ -r "$D/kanal-yokla.sh" ]; then
    [ "$(CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}" bash "$D/kanal-yokla.sh" --sig 2>/dev/null | head -n1)" = "HAZIR" ] \
      || E="$E haber-kanali-HAZIR-DEGIL"
  else
    E="$E kanal-yoklamasi-yok(tools/sevk/kanal-yokla.sh)"
  fi
  printf '%s' "$E"
}

# Haber kanalının yapılandırması (E5). SOURCE EDİLMEZ, ayrıştırılır: kanal.conf bir VERİ
# dosyasıdır ve `.` ile alınması onu koda çevirirdi (kabuk enjeksiyonu). Yalnız ANAHTAR=değer
# satırları okunur; anahtar beyaz listededir, değerde satırsonu/kontrol karakteri kabul edilmez.
# PAROLA BU DOSYADA YOKTUR (Keychain'de) — okunması da bu fonksiyonun işi değildir.
KANAL_SMTP_SUNUCU=""; KANAL_SMTP_PORT=""; KANAL_HESAP=""; KANAL_ALICI=""
KANAL_KEYCHAIN_SERVIS=""; KANAL_IMAP_SUNUCU=""; KANAL_IMAP_PORT=""
KANAL_DUR_KONU=""; KANAL_DUR_JETON=""; KANAL_SESSIZLIK_ESIK_DK=""; KANAL_HATA=""
# F1-5g · cevap kanalı. VARSAYILAN KAPALI: doldurulmamış bir alan bir KARAR kanalını açamaz
# (DUR fail-safe'tir, cevap fail-dangerous'tur — tasarı §1). Böylece bugün kurulu her projede
# hiçbir davranış değişmez; kanal ancak sahip kurulumda "evet" derse doğar.
KANAL_CEVAP_KANALI=""; KANAL_CEVAP_JETON=""; KANAL_CEVAP_ESIK_SAAT=""; KANAL_CEVAP_OMUR_SAAT=""
kanal_oku() { # $1: kök
  local KOK="${1:-.}" YOL SATIR A D
  YOL="$KOK/tools/sevk/kanal.conf"
  KANAL_HATA=""
  [ -f "$YOL" ] || { KANAL_HATA="kanal.conf yok: tools/sevk/kanal.conf"; return 1; }
  while IFS= read -r SATIR || [ -n "$SATIR" ]; do
    case "$SATIR" in ''|'#'*) continue ;; esac
    case "$SATIR" in *=*) : ;; *) continue ;; esac
    A="${SATIR%%=*}"; D="${SATIR#*=}"
    # Baştaki/sondaki boşluk soyulur; içeride kontrol karakteri kalmışsa alan REDDEDİLİR.
    A="$(printf '%s' "$A" | tr -d ' \t')"
    D="$(printf '%s' "$D" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    case "$D" in *[[:cntrl:]]*) KANAL_HATA="kanal.conf: $A alanında kontrol karakteri var"; return 2 ;; esac
    case "$A" in
      SMTP_SUNUCU) KANAL_SMTP_SUNUCU="$D" ;;
      SMTP_PORT) KANAL_SMTP_PORT="$D" ;;
      HESAP) KANAL_HESAP="$D" ;;
      ALICI) KANAL_ALICI="$D" ;;
      KEYCHAIN_SERVIS) KANAL_KEYCHAIN_SERVIS="$D" ;;
      IMAP_SUNUCU) KANAL_IMAP_SUNUCU="$D" ;;
      IMAP_PORT) KANAL_IMAP_PORT="$D" ;;
      DUR_KONU) KANAL_DUR_KONU="$D" ;;
      DUR_JETON) KANAL_DUR_JETON="$D" ;;
      SESSIZLIK_ESIK_DK) KANAL_SESSIZLIK_ESIK_DK="$D" ;;
      CEVAP_KANALI) KANAL_CEVAP_KANALI="$D" ;;
      CEVAP_JETON) KANAL_CEVAP_JETON="$D" ;;
      CEVAP_ESIK_SAAT) KANAL_CEVAP_ESIK_SAAT="$D" ;;
      CEVAP_OMUR_SAAT) KANAL_CEVAP_OMUR_SAAT="$D" ;;
      *) : ;;   # tanınmayan anahtar sessizce atlanır (ileri uyum)
    esac
  done < "$YOL"
  [ -n "$KANAL_DUR_KONU" ] || KANAL_DUR_KONU="KEEL DUR"
  # Cevap kanalı YALNIZ açıkça "acik" yazılmışsa açıktır: boş, bozuk, "evet", "1" — hepsi KAPALI.
  # Tanınmayan değeri "açık" saymak, yazım hatasıyla karar kanalı açardı (fail-closed).
  case "$KANAL_CEVAP_KANALI" in acik) : ;; *) KANAL_CEVAP_KANALI="" ;; esac
  case "$KANAL_CEVAP_ESIK_SAAT" in ''|*[!0-9]*) KANAL_CEVAP_ESIK_SAAT=24 ;; esac
  case "$KANAL_CEVAP_OMUR_SAAT" in ''|*[!0-9]*) KANAL_CEVAP_OMUR_SAAT=72 ;; esac
  [ -n "$KANAL_SMTP_PORT" ] || KANAL_SMTP_PORT="587"
  [ -n "$KANAL_IMAP_PORT" ] || KANAL_IMAP_PORT="993"
  [ -n "$KANAL_KEYCHAIN_SERVIS" ] || KANAL_KEYCHAIN_SERVIS="keel-haber"
  case "$KANAL_SESSIZLIK_ESIK_DK" in
    ''|*[!0-9]*) KANAL_SESSIZLIK_ESIK_DK=30 ;;
  esac
  local EKSIK=""
  [ -n "$KANAL_SMTP_SUNUCU" ] || EKSIK="$EKSIK SMTP_SUNUCU"
  [ -n "$KANAL_HESAP" ] || EKSIK="$EKSIK HESAP"
  [ -n "$KANAL_ALICI" ] || EKSIK="$EKSIK ALICI"
  if [ -n "$EKSIK" ]; then
    KANAL_HATA="kanal.conf doldurulmamış — eksik alan:$EKSIK"
    return 2
  fi
  return 0
}

# Evre geçişi (F1-5a/b): göstergenin TÜR alanını yerinde değiştirir. Dönem KİMLİĞİ ve AÇILIŞ
# DAMGASI korunur — bu YENİ bir dönem değildir, aynı dönemin başka evresidir (bütçe, tur sayacı
# ve günlük dilimi aynı kimliğe bağlı kalır; yeni kimlik üretmek üç freni birden sıfırlardı).
# Yazar YALNIZ sevktir (kanca süreci); ajan eliyle çağrılması file-guard'ın dönem dikişine takılır.
# Dönüş: 0 = yazıldı · 1 = gösterge yok/okunamadı (çağıran fail-closed davranır).
donem_turu_yaz() { # $1: kök · $2: yeni tür
  local KOK="${1:-.}" YENI="${2:-}" YOL SATIR DAMGA SINIF
  YOL="$KOK/tools/sevk/.donem-acik"
  case "$YENI" in kurulum|yapim|kapanis) : ;; *) return 1 ;; esac
  [ -f "$YOL" ] || return 1
  SATIR="$(head -n1 "$YOL" 2>/dev/null || true)"
  [ -n "$SATIR" ] || return 1
  DAMGA="$(sed -n '2p' "$YOL" 2>/dev/null || true)"
  # Sınıf ALANI eski biçimde 5. sıradadır (4. alan kipti) — donem_oku ile AYNI çözüm burada da
  # uygulanır, yoksa geçiş eski göstergede kipi sınıf hücresine yazardı.
  SINIF="$(printf '%s' "$SATIR" | cut -f4)"
  case "$SINIF" in interaktif|bassiz) SINIF="$(printf '%s' "$SATIR" | cut -f5)" ;; esac
  [ -n "$SINIF" ] || SINIF="gercek"
  printf '%s\t%s\t%s\t%s\n%s\n' \
    "$(printf '%s' "$SATIR" | cut -f1)" "$(printf '%s' "$SATIR" | cut -f2)" \
    "$YENI" "$SINIF" "$DAMGA" > "$YOL" || return 1
  DONEM_TUR="$YENI"
  return 0
}

# Haber gönderimi — TEK çağrı noktası (E5). Çağıranı ASLA öldürmez: dönem içi gönderim
# fail-OPEN'dır (tasarı §3.3 — geceyi bir yönlendirici arızasına rehin vermeyiz), ama izsiz
# değildir: haber.sh kendi sonucunu günlüğe yazar. Dönüş kodu bilgi amaçlıdır.
#
# HER ŞEYİ YUTMAZ (hasım bulgusu, dört mercek — F1-5g): `exit 1` yapılandırma/ARGÜMAN hatasıdır
# ve haber.sh o dalda günlüğe HİÇBİR ŞEY yazmaz (kayıt §8'de, gönderimden sonradır). Yani
# tanınmayan bir olay/cins adı — tam olarak yeni bir hattın en olası kusuru — ne postada, ne
# günlükte, ne ekranda iz bırakmıyordu. Bu sınıf artık bulgu düşürür. 4 (ağ) ve 5 (tavan)
# fail-open kalır: onların gerekçesi (gece bir yönlendirici arızasına rehin verilmez) geçerli.
haber_at() {
  local H="$ORTAK_DIZIN/haber.sh" RC=0
  [ -r "$H" ] || return 1
  CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}" bash "$H" "$@" >/dev/null 2>&1 || RC=$?
  # exit 1 = PROGRAM kusuru (tanınmayan olay/cins/argüman) → bulgu düşer.
  # exit 2 = kanal kurulu değil (kanal.conf/Keychain yok) → G5.0c bunu AÇIKÇA meşru sayıyor,
  #          sessiz kalır. İkisi tek koda bağlıyken kanalı hiç kurmamış her proje her haber
  #          denemesinde sahip ekranına sahte bulgu yazıyordu (hasım bulgusu: geri uyum kırığı).
  # ÇAĞRI ARGÜMANLARI GÜNLÜĞE YAZILMAZ: `--kod <SIR>` oradan düz metin olarak sızıyordu.
  if [ "$RC" = "1" ]; then
    J_tip=bulgu J_cins=haber-cagrisi-gecersiz J_donem="${DONEM_ID:-}" \
      J_detay="haber.sh argüman/olay hatasi (exit 1) — olay: $(printf '%s' "$*" | sed -n 's/.*--olay \([a-z-]*\).*/\1/p')" \
      json_kur 2>/dev/null | gunluge_yaz "${CLAUDE_PROJECT_DIR:-.}" >/dev/null 2>&1 || true
  fi
  return "$RC"
}

# Cevap kanalının KİMLİK ÇAPASI — TEK ÜRETİCİ (F1-5g, hasım bulgusu: beş mercek).
# Giden postanın Message-ID başlığı, çapaya yazılan `msgid` alanı ve nabzın IMAP aramasında
# kullandığı dize BU fonksiyondan çıkar. İlk uygulamada üç uç ayrı ayrı kurulmuştu ve çapaya
# msgid HİÇ yazılmamıştı ⇒ nabız canlıda çatal kimliğini Message-ID sanıp arıyordu.
# Dönüş: 0 = dize stdoutta · 1 = üretilemedi (fail-closed; çağıran KOD ÜRETMEZ).
# Alan adı DENETLENİR: kod yarısı kapalı alfabeyle sıkı denetlenirken alan adı sahibin elle
# doldurduğu kanal.conftan geliyordu — bozuk bir alan adı ya Message-IDyi sunucuya yeniden
# yazdırır (kanal sessizce ölür) ya da IMAP arama dizesini bozar.
msgid_kur() { # $1: kod · $2: hesap adresi
  local KOD="${1:-}" HESAP="${2:-}" ALAN
  case "$KOD" in ''|*[!ABCDEFGHJKLMNPQRSTUVWXYZ23456789]*) return 1 ;; esac
  ALAN="${HESAP##*@}"
  case "$ALAN" in
    ''|*[!A-Za-z0-9.-]*) return 1 ;;
    *.*) : ;;
    *) return 1 ;;
  esac
  printf '<keel-%s@%s>' "$KOD" "$ALAN"
}

# Günlüğe tek satır JSON append (TEK append-aracı üzerinden — F1'in süreç karşılığı).
# Dönüş: zarf-ekle.sh'ın çıkışı (fail-closed sinyali çağırana geçer).
gunluge_yaz() {
  local KOK="${1:-${CLAUDE_PROJECT_DIR:-.}}"
  CLAUDE_PROJECT_DIR="$KOK" bash "$ORTAK_DIZIN/zarf-ekle.sh"
}

# JSON kurucu: alanlar J_ (dize) ve JN_ (sayı) önekli env değişkenlerinden gelir.
# Kabukta JSON kaçışı güvenli değildir; bozuk satır BÜTÜN gözleri köreltir (günlük tek-nokta
# veri katmanı). Boş değerli alan atlanır; "donem" yoksa null yazılır (şema zorunluluğu).
json_kur() {
  node_bul || return 1
  "$NODE_BIN" --input-type=module -e '
const cik = { surum: 1, ts: new Date().toISOString() };
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith("JN_")) { if (v !== "") cik[k.slice(3)] = Number(v); continue; }
  if (!k.startsWith("J_")) continue;
  if (v !== "") cik[k.slice(2)] = String(v).replace(/\s+/g, " ").slice(0, 600);
}
if (!("donem" in cik)) cik.donem = null;
console.log(JSON.stringify(cik));
'
}
