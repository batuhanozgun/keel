#!/bin/bash
# ortak — sevk ailesinin ortak kitaplığı (E4, 2026-07-28). Kaynak olarak alınır, koşturulmaz.
# Doğuş: E1-E3 boyunca AYNI node-keşfi bloğu beş betiğe kopyalandı (kilit.sh'ın doğuşuyla aynı
# hikâye — D-02 dersi: bayt-bayt kopya = sürüklenme). E4 dört betik daha ekleyeceği için blok
# tek eve alındı. Kitaplık YOKSA çağıran fail-closed davranır (sessiz geçme yok).
#
# Sağladıkları:
#   node_bul                → NODE_BIN'i doldurur; bulunamazsa 1 döner (GUI oturumunda PATH dardır)
#   donem_oku <kök>          → .donem-acik'ı okur: DONEM_ID · DONEM_KUTU · DONEM_TUR · DONEM_KIP
#                             0 = dönem açık ve gösterge sağlam · 1 = dönem YOK · 2 = gösterge BOZUK
#                             (2 fail-closed'dur: "okunamıyor" ile "dönem yok" AYNI ŞEY DEĞİLDİR)
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
DONEM_KIP="${DONEM_KIP:-}"; DONEM_SINIF="${DONEM_SINIF:-}"; DONEM_DAMGA="${DONEM_DAMGA:-}"
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

# Dönem göstergesi — DÖRT alan (E4): donem-id · kutu-dizini · tür · kip.
# Geri uyum (E1/E3 kitleri): 2. ya da 3. alan ISO damga biçimindeyse eski biçimdir; eksik alanlar
# varsayılana düşer ve bu SESSİZ olmaz (DONEM_HATA doldurulur, çağıran bulgu düşürür).
donem_oku() {
  local KOK="${1:-.}" YOL SATIR
  YOL="$KOK/tools/sevk/.donem-acik"
  DONEM_ID=""; DONEM_KUTU=""; DONEM_TUR=""; DONEM_KIP=""; DONEM_HATA=""
  [ -e "$YOL" ] || return 1
  if [ ! -f "$YOL" ]; then
    DONEM_HATA="gösterge dosya değil (dizin/başka tür): tools/sevk/.donem-acik"
    return 2
  fi
  SATIR="$(head -n1 "$YOL" 2>/dev/null || true)"
  DONEM_ID="$(printf '%s' "$SATIR" | cut -f1)"
  DONEM_KUTU="$(printf '%s' "$SATIR" | cut -f2)"
  DONEM_TUR="$(printf '%s' "$SATIR" | cut -f3)"
  DONEM_KIP="$(printf '%s' "$SATIR" | cut -f4)"
  DONEM_SINIF="$(printf '%s' "$SATIR" | cut -f5)"
  DONEM_DAMGA="$(sed -n '2p' "$YOL" 2>/dev/null | cut -f2 || true)"
  if [ -z "$DONEM_ID" ]; then
    DONEM_HATA="gösterge boş: ilk satırda dönem kimliği yok"
    return 2
  fi
  case "$DONEM_KUTU" in
    *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) DONEM_KUTU=""; DONEM_TUR=""; DONEM_KIP=""; DONEM_HATA="eski 2-alan gösterge biçimi (kutu/tür/kip yok)" ;;
  esac
  case "$DONEM_TUR" in
    *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) DONEM_TUR=""; DONEM_KIP=""; DONEM_HATA="eski 3-alan gösterge biçimi (tür/kip yok)" ;;
  esac
  [ -n "$DONEM_TUR" ] || DONEM_TUR="yapim"
  [ -n "$DONEM_KIP" ] || DONEM_KIP="interaktif"
  case "$DONEM_TUR" in
    kurulum|yapim|kapanis) : ;;
    *) DONEM_HATA="tanınmayan dönem türü: $DONEM_TUR"; return 2 ;;
  esac
  case "$DONEM_KIP" in
    bassiz|interaktif) : ;;
    *) DONEM_HATA="tanınmayan dönem kipi: $DONEM_KIP"; return 2 ;;
  esac
  # Sınıf (E4, hasım bulgusu): kanon "gerçek-kutu döneminde T6 damgası + watchdog şart" diyordu
  # ama kodda ne şart ne AYRIM vardı. Beşinci alan o ayrımı taşır; eski göstergede yoksa
  # güvenli taraf GERÇEK'tir (fail-closed: muafiyet açıkça istenmedikçe verilmez).
  [ -n "$DONEM_SINIF" ] || DONEM_SINIF="gercek"
  case "$DONEM_SINIF" in
    gercek|tatbikat) : ;;
    *) DONEM_HATA="tanınmayan dönem sınıfı: $DONEM_SINIF"; return 2 ;;
  esac
  return 0
}

# Gerçek-kutu döneminin ek iki şartı (OTONOM_DONEM §10; tatbikat dönemleri MUAF — E4/E5
# tatbikatları döngüsel bağımlılığa girmesin diye tasarımın bilinçli istisnası).
# Çıktı: eksiklerin listesi (boşsa şart karşılanmış).
# İŞARET DEĞİL CANLILIK (E5): "dosya var" ile "iş fiilen koşuyor" AYRI şeylerdir. E4'ün en
# pahalı ders sınıfı dosyada duran ölü kuraldı — bu denetim işaretin gösterdiği launchd işini
# `launchctl print` ile arar ve son nabız damgasının tazeliğine bakar. Kanal da aynı hatta:
# haber kanalı kırıkken gerçek bir kutu koşarsa, gece sessiz geçer ve kimse bilmez.
gercek_kutu_eksikleri() { # $1: sevk dizini
  local D="${1:-$ORTAK_DIZIN}" E="" ETIKET="" YAS=""
  [ -s "$D/damgalar/T6" ] || E="$E T6-damgasi(E5-kanal-tatbikati)"
  if [ ! -s "$D/watchdog-kurulu" ]; then
    E="$E watchdog-kaydi(tools/sevk/watchdog-kurulu)"
  else
    ETIKET="$(sed -n 's/^etiket=//p' "$D/watchdog-kurulu" 2>/dev/null | head -n1)"
    if [ -z "$ETIKET" ]; then
      E="$E watchdog-kaydinda-etiket-yok"
    elif ! launchctl print "gui/$(id -u)/$ETIKET" >/dev/null 2>&1; then
      E="$E watchdog-isi-YUKLU-DEGIL($ETIKET)"
    elif [ ! -s "$D/.nabiz-son" ]; then
      E="$E watchdog-hic-kosmamis"
    else
      YAS="$(N_D="$(head -n1 "$D/.nabiz-son" 2>/dev/null)" node -e 'const t=Date.parse(process.env.N_D||"");console.log(Number.isFinite(t)?Math.floor((Date.now()-t)/60000):999)' 2>/dev/null || echo 999)"
      case "$YAS" in
        ''|*[!0-9]*) E="$E watchdog-damgasi-okunmuyor" ;;
        *) [ "$YAS" -le 20 ] || E="$E watchdog-nabzi-BAYAT(${YAS}dk)" ;;
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
      *) : ;;   # tanınmayan anahtar sessizce atlanır (ileri uyum)
    esac
  done < "$YOL"
  [ -n "$KANAL_DUR_KONU" ] || KANAL_DUR_KONU="KEEL DUR"
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

# Haber gönderimi — TEK çağrı noktası (E5). Çağıranı ASLA öldürmez: dönem içi gönderim
# fail-OPEN'dır (tasarı §3.3 — geceyi bir yönlendirici arızasına rehin vermeyiz), ama izsiz
# değildir: haber.sh kendi sonucunu günlüğe yazar. Dönüş kodu bilgi amaçlıdır.
haber_at() {
  local H="$ORTAK_DIZIN/haber.sh"
  [ -r "$H" ] || return 1
  CLAUDE_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-}" bash "$H" "$@" >/dev/null 2>&1
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
