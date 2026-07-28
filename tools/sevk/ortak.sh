#!/bin/bash
# ortak — sevk ailesinin ortak kitaplığı (E4, 2026-07-28). Kaynak olarak alınır, koşturulmaz.
# Doğuş: E1-E3 boyunca AYNI node-keşfi bloğu beş betiğe kopyalandı (kilit.sh'ın doğuşuyla aynı
# hikâye — D-02 dersi: bayt-bayt kopya = sürüklenme). E4 dört betik daha ekleyeceği için blok
# tek eve alındı. Kitaplık YOKSA çağıran fail-closed davranır (sessiz geçme yok).
#
# Sağladıkları:
#   node_bul                → NODE_BIN'i doldurur; bulunamazsa 1 döner (GUI oturumunda PATH dardır)
#   kosu_oku <kök>          → .kosu-acik'ı okur: KOSU_ID · KOSU_KUTU · KOSU_TUR · KOSU_KIP
#                             0 = koşu açık ve gösterge sağlam · 1 = koşu YOK · 2 = gösterge BOZUK
#                             (2 fail-closed'dur: "okunamıyor" ile "koşu yok" AYNI ŞEY DEĞİLDİR)
#   gunluge_yaz <kök>       → stdin'deki tek satır JSON'u zarf-ekle.sh ile günlüğe append eder
#   json_kur                → J_/JN_ önekli env değişkenlerinden güvenli JSON kurar
export LC_ALL=C.UTF-8

ORTAK_DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Kaynak alınmak SIFIRLAMAZ (yaşanmış kırılma, E4): zarf-bicim-kapisi.sh göstergeyi kendi
# okuyup sonra kitaplığı alıyordu; düz atama onun KOSU_KUTU değerini siliyor ve risk taraması
# sessizce "kaba dal"a düşüyordu. Kitaplık yalnız TANIMLAR, değer EZMEZ.
NODE_BIN="${NODE_BIN:-}"
KOSU_ID="${KOSU_ID:-}"; KOSU_KUTU="${KOSU_KUTU:-}"; KOSU_TUR="${KOSU_TUR:-}"
KOSU_KIP="${KOSU_KIP:-}"; KOSU_SINIF="${KOSU_SINIF:-}"; KOSU_DAMGA="${KOSU_DAMGA:-}"
KOSU_HATA="${KOSU_HATA:-}"

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

# Koşu göstergesi — DÖRT alan (E4): kosu-id · kutu-dizini · tür · kip.
# Geri uyum (E1/E3 kitleri): 2. ya da 3. alan ISO damga biçimindeyse eski biçimdir; eksik alanlar
# varsayılana düşer ve bu SESSİZ olmaz (KOSU_HATA doldurulur, çağıran bulgu düşürür).
kosu_oku() {
  local KOK="${1:-.}" YOL SATIR
  YOL="$KOK/tools/sevk/.kosu-acik"
  KOSU_ID=""; KOSU_KUTU=""; KOSU_TUR=""; KOSU_KIP=""; KOSU_HATA=""
  [ -e "$YOL" ] || return 1
  if [ ! -f "$YOL" ]; then
    KOSU_HATA="gösterge dosya değil (dizin/başka tür): tools/sevk/.kosu-acik"
    return 2
  fi
  SATIR="$(head -n1 "$YOL" 2>/dev/null || true)"
  KOSU_ID="$(printf '%s' "$SATIR" | cut -f1)"
  KOSU_KUTU="$(printf '%s' "$SATIR" | cut -f2)"
  KOSU_TUR="$(printf '%s' "$SATIR" | cut -f3)"
  KOSU_KIP="$(printf '%s' "$SATIR" | cut -f4)"
  KOSU_SINIF="$(printf '%s' "$SATIR" | cut -f5)"
  KOSU_DAMGA="$(sed -n '2p' "$YOL" 2>/dev/null | cut -f2 || true)"
  if [ -z "$KOSU_ID" ]; then
    KOSU_HATA="gösterge boş: ilk satırda koşu kimliği yok"
    return 2
  fi
  case "$KOSU_KUTU" in
    *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) KOSU_KUTU=""; KOSU_TUR=""; KOSU_KIP=""; KOSU_HATA="eski 2-alan gösterge biçimi (kutu/tür/kip yok)" ;;
  esac
  case "$KOSU_TUR" in
    *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) KOSU_TUR=""; KOSU_KIP=""; KOSU_HATA="eski 3-alan gösterge biçimi (tür/kip yok)" ;;
  esac
  [ -n "$KOSU_TUR" ] || KOSU_TUR="yapim"
  [ -n "$KOSU_KIP" ] || KOSU_KIP="interaktif"
  case "$KOSU_TUR" in
    kurulum|yapim|kapanis) : ;;
    *) KOSU_HATA="tanınmayan koşu türü: $KOSU_TUR"; return 2 ;;
  esac
  case "$KOSU_KIP" in
    bassiz|interaktif) : ;;
    *) KOSU_HATA="tanınmayan koşu kipi: $KOSU_KIP"; return 2 ;;
  esac
  # Sınıf (E4, hasım bulgusu): kanon "gerçek-kutu koşusunda T6 damgası + watchdog şart" diyordu
  # ama kodda ne şart ne AYRIM vardı. Beşinci alan o ayrımı taşır; eski göstergede yoksa
  # güvenli taraf GERÇEK'tir (fail-closed: muafiyet açıkça istenmedikçe verilmez).
  [ -n "$KOSU_SINIF" ] || KOSU_SINIF="gercek"
  case "$KOSU_SINIF" in
    gercek|tatbikat) : ;;
    *) KOSU_HATA="tanınmayan koşu sınıfı: $KOSU_SINIF"; return 2 ;;
  esac
  return 0
}

# Gerçek-kutu koşusunun ek iki şartı (OTONOM_KOSU §10; tatbikat koşuları MUAF — E4/E5
# tatbikatları döngüsel bağımlılığa girmesin diye tasarımın bilinçli istisnası).
# Çıktı: eksiklerin listesi (boşsa şart karşılanmış).
gercek_kutu_eksikleri() { # $1: sevk dizini
  local D="${1:-$ORTAK_DIZIN}" E=""
  [ -s "$D/damgalar/T6" ] || E="$E T6-damgasi(E5-kanal-tatbikati)"
  [ -s "$D/watchdog-kurulu" ] || E="$E watchdog-kaydi(tools/sevk/watchdog-kurulu)"
  printf '%s' "$E"
}

# Günlüğe tek satır JSON append (TEK append-aracı üzerinden — F1'in süreç karşılığı).
# Dönüş: zarf-ekle.sh'ın çıkışı (fail-closed sinyali çağırana geçer).
gunluge_yaz() {
  local KOK="${1:-${CLAUDE_PROJECT_DIR:-.}}"
  CLAUDE_PROJECT_DIR="$KOK" bash "$ORTAK_DIZIN/zarf-ekle.sh"
}

# JSON kurucu: alanlar J_ (dize) ve JN_ (sayı) önekli env değişkenlerinden gelir.
# Kabukta JSON kaçışı güvenli değildir; bozuk satır BÜTÜN gözleri köreltir (günlük tek-nokta
# veri katmanı). Boş değerli alan atlanır; "kosu" yoksa null yazılır (şema zorunluluğu).
json_kur() {
  node_bul || return 1
  "$NODE_BIN" --input-type=module -e '
const cik = { surum: 1, ts: new Date().toISOString() };
for (const [k, v] of Object.entries(process.env)) {
  if (k.startsWith("JN_")) { if (v !== "") cik[k.slice(3)] = Number(v); continue; }
  if (!k.startsWith("J_")) continue;
  if (v !== "") cik[k.slice(2)] = String(v).replace(/\s+/g, " ").slice(0, 600);
}
if (!("kosu" in cik)) cik.kosu = null;
console.log(JSON.stringify(cik));
'
}
