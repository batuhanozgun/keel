#!/bin/bash
# nabiz — WATCHDOG (E5). Claude Code'un DIŞINDA, launchd ile koşar. Tasarım §8.
#
# NEDEN AYRI SÜREÇ: bu betiğin tek işi "yapı sustu" demektir; sustuğu an Claude çalışmıyordur.
# Bir parçanın ölümünü raporlayacak şey o parçanın kendisi olamaz — kancanın ölümünü kanca
# yakalayamaz. Okuduğu açılış damgasını da sevk değil `/donem` düşürür (çift hat).
#
# DİRİLTMEZ (D-25 ①): haber verir, dönemi kendisi başlatmaz. Dirilten otomasyon, sahibin
# kilidini kaldıran gizli bir 3. basamaktır.
#
# Dört iş, sırayla:
#   1) İKİ DURUM alarmı — (a) nabız durdu · (b) hiç doğmadı
#   2) Uzaktan DUR — IMAP'te yalnız BAŞLIK araması (gövde OKUNMAZ)
#   3) Bayat dönemde uyanık-tutma savının temizliği
#   4) Kendi dönem izini bırakma (canlılık denetiminin okuduğu damga)
#
# Dönem AÇIK değilse hiçbir şey yapmaz (sıradan günler etkilenmez).
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"
GOSTERGE="$DIZIN/.donem-acik"
NABIZ_DAMGA="$DIZIN/.nabiz-son"

# Canlılık damgası HER turda basılır — dönem olsun olmasın. Kurulum denetimi bunu okur:
# "işaret dosyası var" ile "iş fiilen koşuyor" ayrı şeylerdir (E4'ün ölü-kural dersi).
date -u '+%Y-%m-%dT%H:%M:%SZ' > "$NABIZ_DAMGA" 2>/dev/null || true

[ -r "$DIZIN/ortak.sh" ] || exit 0
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

DONEM_RC=0; donem_oku "$KOK" || DONEM_RC=$?

# ── 3 · Uyanık-tutma savının temizliği ────────────────────────────────────────────────────
# Dönem kapandıysa (ya da gösterge bozuksa) savı bırak: sızan bir sav Mac'i hiç uyutmaz,
# bu da ayrı bir arızadır. Savın PID'i göstergenin 3. satırındadır.
sav_birak() {
  local P="${1:-}"
  case "$P" in ''|*[!0-9]*) return 0 ;; esac
  kill "$P" 2>/dev/null || true
}
if [ "$DONEM_RC" != "0" ]; then
  [ -f "$DIZIN/.caffeinate-pid" ] && { sav_birak "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)"; rm -f "$DIZIN/.caffeinate-pid"; }
  exit 0
fi

kanal_oku "$KOK" >/dev/null 2>&1 || true
ESIK_DK="${KANAL_SESSIZLIK_ESIK_DK:-30}"

node_bul || exit 0

# ── 1 · İki durum ─────────────────────────────────────────────────────────────────────────
# Günlükten BU dönemin kayıtları okunur: en yeni kaydın yaşı + açılıştan başka kayıt var mı.
# Çıktı: <durum>\t<yas_dk>\t<kayit_sayisi>   (durum: SESSIZ_A | SESSIZ_B | CANLI | OKUNAMADI)
OLCUM="$(N_KOK="$KOK" N_DONEM="$DONEM_ID" N_DAMGA="${DONEM_DAMGA:-}" N_ESIK="$ESIK_DK" \
  "$NODE_BIN" --input-type=module -e '
import { readFileSync } from "node:fs";
import { join } from "node:path";
const KOK = process.env.N_KOK || ".";
const DONEM = process.env.N_DONEM || "";
const ESIK = Number(process.env.N_ESIK || 30);
const bitir = (d, y, n) => { console.log([d, y, n].join("\t")); process.exit(0); };

let ham = "";
try { ham = readFileSync(join(KOK, "00_pano", "zarf-gunlugu.jsonl"), "utf8"); }
catch { ham = ""; }

let enYeni = 0, sayi = 0, acilisSayisi = 0;
for (const satir of ham.split("\n")) {
  if (!satir.trim()) continue;
  let j;
  try { j = JSON.parse(satir); } catch { continue; }
  if (String(j.donem || "") !== DONEM) continue;
  sayi++;
  if (j.tip === "donem-acilis") acilisSayisi++;
  const t = Date.parse(j.ts || "");
  if (Number.isFinite(t) && t > enYeni) enYeni = t;
}

// Kayit hic yoksa gostergenin kendi damgasi taban alinir (gunluk yazimi olduyse de sussun diye).
if (!enYeni) {
  const t = Date.parse(process.env.N_DAMGA || "");
  if (Number.isFinite(t)) enYeni = t;
}
if (!enYeni) bitir("OKUNAMADI", "", String(sayi));

const yasDk = Math.floor((Date.now() - enYeni) / 60000);
if (yasDk < ESIK) bitir("CANLI", String(yasDk), String(sayi));
// (b) HIC DOGMADI: dönem acik ama acilistan baska kayit yok — sevk daha ilk adimda oldu.
if (sayi <= acilisSayisi) bitir("SESSIZ_B", String(yasDk), String(sayi));
// (a) NABIZ DURDU: kayitlar var ama esik asildi.
bitir("SESSIZ_A", String(yasDk), String(sayi));
' 2>/dev/null || printf 'OKUNAMADI\t\t0')"

DURUM="$(printf '%s' "$OLCUM" | cut -f1)"
YAS_DK="$(printf '%s' "$OLCUM" | cut -f2)"
KAYIT="$(printf '%s' "$OLCUM" | cut -f3)"

case "$DURUM" in
  SESSIZ_A|SESSIZ_B)
    if [ "$DURUM" = "SESSIZ_B" ]; then
      DETAY="Dönem AÇIK görünüyor ama açılıştan bu yana HİÇ nabız gelmemiş: sevk daha ilk adımda ölmüş olabilir (kablo-söküm cinsi).
Dönem: $DONEM_ID · kutu: $DONEM_KUTU · açılış yaşı: $YAS_DK dk · eşik: $ESIK_DK dk
Yapı diriltilmedi — yeniden başlatma senin kararın. Bak: 00_pano/SABAH.md ve 00_pano/zarf-gunlugu.jsonl"
    else
      DETAY="Dönem AÇIK ama $YAS_DK dakikadır hiçbir hareket yok (eşik: $ESIK_DK dk). Yapı susmuş olabilir.
Dönem: $DONEM_ID · kutu: $DONEM_KUTU · bu dönemde $KAYIT kayıt var.
Yapı diriltilmedi — yeniden başlatma senin kararın. Durdurmak istersen: bu adrese \"${KANAL_DUR_KONU:-KEEL DUR}\" konulu posta at."
    fi
    # Alarm ÖNCE günlüğe, sonra postaya: kanal kırıksa bile olayın izi kalmalı (postanın
    # gitmemesi, alarmın olmadığı anlamına gelmez — sabah yüzeyi bu kaydı okur).
    J_tip=alarm J_donem="$DONEM_ID" J_kutu="$DONEM_KUTU" J_cins=sessizlik J_durum="$DURUM" \
      J_sebep="nabiz yasi ${YAS_DK}dk (esik ${ESIK_DK}dk)" json_kur 2>/dev/null \
      | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
    # Tekilleştirme haber.sh'ın kendi freninde (--anahtar): dönem başına BİR sessizlik alarmı.
    CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins sessizlik --anahtar "$DURUM" \
      --donem "$DONEM_ID" --kutu "$DONEM_KUTU" --detay "$DETAY" || true
    ;;
esac

# ── 2 · Uzaktan DUR (IMAP · yalnız BAŞLIK; gövde OKUNMAZ) ─────────────────────────────────
# Beyanlı sınır (tasarı §4.1): From başlığı taklit edilebilir. Bu kanalın tek etkisi
# DURDURMAKTIR — sahtecilik en kötü ihtimalle gecenin işini iptal ettirir; veri sızdırmaz,
# karar bastırmaz, dışarı bir şey göndertmez. Fail-safe yönü doğru olduğu için jeton
# varsayılan kapalıdır (kanal.conf · DUR_JETON).
if [ ! -e "$DIZIN/.dur" ] && [ -n "${KANAL_IMAP_SUNUCU:-}" ] && [ -n "${KANAL_HESAP:-}" ]; then
  IMAP_PAROLA="$(security find-generic-password -s "${KANAL_KEYCHAIN_SERVIS:-keel-haber}" -a "$KANAL_HESAP" -w 2>/dev/null)" || IMAP_PAROLA=""
  if [ -n "$IMAP_PAROLA" ]; then
    ARANAN="${KANAL_DUR_KONU:-KEEL DUR}"
    [ -n "${KANAL_DUR_JETON:-}" ] && ARANAN="$ARANAN $KANAL_DUR_JETON"
    # SEARCH yalnız KONU eşleştirir ve UID listesi döndürür — hiçbir gövde indirilmez.
    UIDLER="$(printf 'url = "imaps://%s:%s/INBOX"\nuser = "%s:%s"\nrequest = "SEARCH UNSEEN HEADER Subject \\"%s\\""\nmax-time = 20\nsilent\nshow-error\n' \
      "$KANAL_IMAP_SUNUCU" "${KANAL_IMAP_PORT:-993}" "$KANAL_HESAP" "$IMAP_PAROLA" "$ARANAN" \
      | curl -K - 2>/dev/null | tr -d '\r' | sed -n 's/^\* SEARCH //p' | head -n1)"
    for U in ${UIDLER:-}; do
      case "$U" in ''|*[!0-9]*) continue ;; esac
      # Yalnız From ve Date başlıkları çekilir (BODY.PEEK ile okundu işaretlenmez de).
      BASLIK="$(printf 'url = "imaps://%s:%s/INBOX;UID=%s;SECTION=HEADER.FIELDS%%20(FROM%%20DATE)"\nuser = "%s:%s"\nmax-time = 20\nsilent\nshow-error\n' \
        "$KANAL_IMAP_SUNUCU" "${KANAL_IMAP_PORT:-993}" "$U" "$KANAL_HESAP" "$IMAP_PAROLA" \
        | curl -K - 2>/dev/null | tr -d '\r')"
      case "$BASLIK" in
        *"$KANAL_ALICI"*)
          POSTA_TARIH="$(printf '%s' "$BASLIK" | sed -n 's/^[Dd]ate: //p' | head -n1)"
          printf 'uzaktan · posta · %s\n' "${POSTA_TARIH:-tarih okunamadı}" > "$DIZIN/.dur"
          J_tip=dur-alindi J_donem="$DONEM_ID" J_kutu="$DONEM_KUTU" J_kaynak="posta" \
            J_sebep="uzaktan DUR postasi alindi (konu esleşti, gonderen dogrulandi)" \
            json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
          break
          ;;
      esac
    done
    unset IMAP_PAROLA
  fi
fi

exit 0
