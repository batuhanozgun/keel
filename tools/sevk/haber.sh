#!/bin/bash
# haber — otonom dönemin TEK dışa-haber noktası (E5). Sahibe e-posta atar: dört olay
# (donem-basladi · donem-bitti · catal-bekliyor · alarm). Tasarım §7.3 (kayıt `…/18`).
#
# SERBEST-METİN YASAĞI MEKANİKTİR: bu betikte `--govde` diye bir argüman YOKTUR. Çağıran yalnız
# olay adını ve o olayın TANIMLI alanlarını verir; gövdeyi buradaki şablon kurar. Kural metinde
# değil, arayüzde yaşar — kanona yazılmış bir yasağın koda inmiş hâli budur.
#
# GÖNDERİM-ÖNCESİ ZORUNLU SÜZGEÇ: konu+gövde tek parça hâlinde icerik-suzgeci.sh --metin'den
# geçer. Bu betik Stop/SubagentStop kancasının İÇİNDEN koşar; kanca-içi gönderim bir araç
# çağrısı olmadığı için `permissions.ask` ve PreToolUse önünden GEÇMEZ (E2 Hat-2 muafiyeti).
# Muafiyetin bedeli bu süzgeçtir: red → e-posta GİTMEZ, yerine sabit-şablonlu sansürlü alarm
# gider (fail-closed) ve günlüğe önleme bulgusu düşer.
#
# PAROLA: yalnız macOS Keychain'de. curl'e argüman olarak DEĞİL, yapılandırma stdin'inden
# (`curl -K -`) geçer — `ps` çıktısında ve diskte hiçbir an görünmez.
#
# Çıkış sözleşmesi (çağıran KARAR VERİR; bu betik kimseyi öldürmez):
#   0 = gönderildi (ya da --prova)      3 = süzgeç durdurdu, sansürlü alarm gitti
#   1 = yapılandırma/kurulum eksik      4 = gönderim başarısız (ağ/kimlik)
#   5 = dönem başına gönderim tavanı doldu ya da bu olay zaten gönderilmiş
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"

ALAN_TAVAN=1500      # alan başına bayt
GOVDE_TAVAN=8192     # gövde toplamı
DONEM_GONDERIM_TAVANI=10

hata() { printf 'haber: %s\n' "$1" >&2; exit "${2:-1}"; }

# Ortak kitaplık erkenden alınır: gövde metni DUR konusunu yapılandırmadan okur (prova kipinde
# de doğru görünsün). Buradaki okuma FAIL-OPEN'dır — sert doğrulama gönderim anındadır (§6).
if [ -r "$DIZIN/ortak.sh" ]; then
  # shellcheck source=/dev/null
  . "$DIZIN/ortak.sh"
  kanal_oku "$KOK" >/dev/null 2>&1 || true
fi
DUR_KONU_METNI="${KANAL_DUR_KONU:-KEEL DUR}"

# ── 1 · Argümanlar (yalnız adlandırılmış; serbest gövde YOK) ──────────────────────────────
OLAY=""; A_DONEM=""; A_KUTU=""; A_TUR=""; A_KIP=""; A_SINIF=""; A_UYKU=""
A_BLOK1=""; A_BLOK2=""; A_BLOK3=""
A_CATAL=""; A_CEVIRI=""; A_ETKI=""; A_BEKLETIR=""
A_CINS=""; A_DETAY=""; A_ANAHTAR=""
PROVA=0

while [ $# -gt 0 ]; do
  case "$1" in
    --olay) OLAY="${2:-}"; shift 2 ;;
    --donem) A_DONEM="${2:-}"; shift 2 ;;
    --kutu) A_KUTU="${2:-}"; shift 2 ;;
    --tur) A_TUR="${2:-}"; shift 2 ;;
    --kip) A_KIP="${2:-}"; shift 2 ;;
    --sinif) A_SINIF="${2:-}"; shift 2 ;;
    --uyku) A_UYKU="${2:-}"; shift 2 ;;
    --blok1) A_BLOK1="${2:-}"; shift 2 ;;
    --blok2) A_BLOK2="${2:-}"; shift 2 ;;
    --blok3) A_BLOK3="${2:-}"; shift 2 ;;
    --catal) A_CATAL="${2:-}"; shift 2 ;;
    --ceviri) A_CEVIRI="${2:-}"; shift 2 ;;
    --etki) A_ETKI="${2:-}"; shift 2 ;;
    --bekletir) A_BEKLETIR="${2:-}"; shift 2 ;;
    --cins) A_CINS="${2:-}"; shift 2 ;;
    --detay) A_DETAY="${2:-}"; shift 2 ;;
    --anahtar) A_ANAHTAR="${2:-}"; shift 2 ;;
    --prova) PROVA=1; shift ;;
    *) hata "tanınmayan argüman: $1 (serbest gövde argümanı YOKTUR — tasarım §7.3)" ;;
  esac
done

case "$OLAY" in
  donem-basladi|donem-bitti|catal-bekliyor|alarm) : ;;
  '') hata "--olay gerekli: donem-basladi | donem-bitti | catal-bekliyor | alarm" ;;
  *) hata "tanınmayan olay: $OLAY" ;;
esac
[ -n "$A_KUTU" ] || A_KUTU="(kutu adı yok)"
[ -n "$A_DONEM" ] || A_DONEM="(dönem kimliği yok)"
if [ "$OLAY" = "alarm" ]; then
  case "$A_CINS" in
    sessizlik|sisme|kirmizi|kanal) : ;;
    *) hata "alarm olayı --cins ister: sessizlik | sisme | kirmizi | kanal" ;;
  esac
fi

# Alan tavanı: kesilen alan KESİLDİĞİNİ söyler (sessiz kırpma, sahip yüzeyinde yalandır).
kirp() {
  local M="$1"
  if [ "${#M}" -gt "$ALAN_TAVAN" ]; then
    printf '%s… [%s karakter kesildi]' "$(printf '%s' "$M" | cut -c1-"$ALAN_TAVAN")" "$(( ${#M} - ALAN_TAVAN ))"
  else
    printf '%s' "$M"
  fi
}
# Güvenli dolaylı atama (bash 3.2): `eval "$AD=\$V"` değeri TEK SÖZCÜK olarak atar; içeriği
# yeniden ayrıştırmaz. `eval "$AD=$V"` yazmak alan içeriğini koda çevirirdi.
for D in A_BLOK1 A_BLOK2 A_BLOK3 A_CEVIRI A_ETKI A_BEKLETIR A_DETAY A_UYKU; do
  eval "KIRP_V=\${$D}"
  KIRP_V="$(kirp "$KIRP_V")"
  eval "$D=\$KIRP_V"
done

# ── 2 · Konu + gövde: YALNIZ şablondan ────────────────────────────────────────────────────
SIMDI="$(date '+%Y-%m-%d %H:%M')"
case "$OLAY" in
  donem-basladi)
    KONU="KEEL · $A_KUTU · dönem başladı"
    GOVDE="$(printf 'Dönem açıldı: %s\nKutu: %s\nTür: %s · Kip: %s · Sınıf: %s\nZaman: %s\n\n%s\n\nBu dönem bittiğinde ya da bir çatal sana düştüğünde yeni bir e-posta gelecek.\nDurdurmak için bu adrese "%s" konulu bir posta at.\n' \
      "$A_DONEM" "$A_KUTU" "${A_TUR:-?}" "${A_KIP:-?}" "${A_SINIF:-?}" "$SIMDI" "${A_UYKU:-}" "$DUR_KONU_METNI")"
    ;;
  donem-bitti)
    KONU="KEEL · $A_KUTU · dönem bitti"
    GOVDE="$(printf 'Dönem: %s\nZaman: %s\n\nGECE NE OLDU\n%s\n\nSENDE BEKLEYEN\n%s\n\nŞİMDİ NE YAPIYOR\n%s\n' \
      "$A_DONEM" "$SIMDI" "${A_BLOK1:-(kayıt yok)}" "${A_BLOK2:-(kayıt yok)}" "${A_BLOK3:-(kayıt yok)}")"
    ;;
  catal-bekliyor)
    KONU="KEEL · $A_KUTU · bir karar seni bekliyor (${A_CATAL:-Ç-??})"
    GOVDE="$(printf 'Dönem: %s\nZaman: %s\nÇatal: %s\n\nSORU\n%s\n\nNE DEĞİŞİR\n%s\n\nBU CEVAP GELENE KADAR BEKLEYEN İŞLER\n%s\n\nCevabı bilgisayardan veriyorsun: 00_pano/SENDE_BEKLEYEN.md\n(Uzaktan cevap yolu bilerek yok — sahip sesi yalnız kayıtlı kanaldan taşınır.)\n' \
      "$A_DONEM" "$SIMDI" "${A_CATAL:-?}" "${A_CEVIRI:-(çeviri yok)}" "${A_ETKI:-(etki yok)}" "${A_BEKLETIR:-(liste yok)}")"
    ;;
  alarm)
    KONU="KEEL · $A_KUTU · ALARM ($A_CINS)"
    GOVDE="$(printf 'Dönem: %s\nZaman: %s\nAlarm cinsi: %s\n\n%s\n' \
      "$A_DONEM" "$SIMDI" "$A_CINS" "${A_DETAY:-(ayrıntı yok)}")"
    ;;
esac
if [ "${#GOVDE}" -gt "$GOVDE_TAVAN" ]; then
  GOVDE="$(printf '%s' "$GOVDE" | cut -c1-"$GOVDE_TAVAN")
[gövde tavanı aşıldı, kesildi]"
fi

# ── 3 · Gönderim-öncesi ZORUNLU süzgeç (fail-closed) ──────────────────────────────────────
# Süzgeç KOŞAMAZSA da temiz sayılmaz: "tarayamadım" ile "temiz" aynı şey değildir.
SUZGEC="$KOK/tools/guard/icerik-suzgeci.sh"
SANSUR=0; SUZGEC_SINIF=""
if [ -r "$SUZGEC" ]; then
  SUZ_CIKTI="$(printf '%s\n%s\n' "$KONU" "$GOVDE" | CLAUDE_PROJECT_DIR="$KOK" bash "$SUZGEC" --metin 2>/dev/null)"
  SUZ_KOD=$?
else
  SUZ_CIKTI=""; SUZ_KOD=90
fi
if [ "$SUZ_KOD" -ne 0 ]; then
  SANSUR=1
  if [ "$SUZ_KOD" -eq 3 ]; then
    SUZGEC_SINIF="$(printf '%s' "$SUZ_CIKTI" | head -n1 | cut -f2)"
    [ -n "$SUZGEC_SINIF" ] || SUZGEC_SINIF="bilinmeyen-sinif"
  else
    SUZGEC_SINIF="süzgeç koşamadı (kod $SUZ_KOD)"
  fi
  # SABİT ŞABLON: eşleşen değer bir yana, ÖZGÜN METNİN KENDİSİ de taşınmaz.
  KONU="KEEL · $A_KUTU · gönderim durduruldu"
  GOVDE="$(printf 'Dönem: %s\nZaman: %s\n\nGönderilecek metin önleme süzgecinde DURDU (%s).\nİçerik taşınmadı; bu ileti sabit şablondur.\nOlay: %s\n\nBilgisayara bak: 00_pano/zarf-gunlugu.jsonl\n' \
    "$A_DONEM" "$SIMDI" "$SUZGEC_SINIF" "$OLAY")"
fi

# ── 4 · Boğulma freni: dönem başına tavan + olay tekilleştirmesi ───────────────────────────
# Gerekçe: Stop döngüsü ya da tekrarlayan alarm, frensiz bir kanalda yüzlerce e-postaya döner.
# Gürültüye boğulan kanal haber işlevini kaybeder — kanalın kendi freni budur.
DURUM="$DIZIN/.haber-durum"
ANAHTAR="$OLAY${A_ANAHTAR:+:$A_ANAHTAR}${A_CINS:+:$A_CINS}"
if [ "$PROVA" -eq 0 ]; then
  if [ -f "$DURUM" ] && [ "$(head -n1 "$DURUM" 2>/dev/null)" = "$A_DONEM" ]; then
    if tail -n +2 "$DURUM" 2>/dev/null | grep -qxF "$ANAHTAR"; then
      hata "bu olay bu dönemde zaten gönderildi: $ANAHTAR" 5
    fi
    if [ "$(( $(wc -l < "$DURUM" 2>/dev/null || echo 1) - 1 ))" -ge "$DONEM_GONDERIM_TAVANI" ]; then
      hata "dönem başına gönderim tavanı doldu ($DONEM_GONDERIM_TAVANI) — kanal susturuldu" 5
    fi
  else
    printf '%s\n' "$A_DONEM" > "$DURUM" 2>/dev/null || true
  fi
fi

# ── 5 · Prova kipi: gönderme, göster (testlerin TAMAMI bu kipte koşar) ────────────────────
if [ "$PROVA" -eq 1 ]; then
  printf 'PROVA\t%s\t%s\n' "$OLAY" "$([ "$SANSUR" -eq 1 ] && printf 'SANSURLU' || printf 'TEMIZ')"
  printf 'Subject: %s\n\n%s\n' "$KONU" "$GOVDE"
  [ "$SANSUR" -eq 1 ] && exit 3
  exit 0
fi

# ── 6 · Yapılandırma + parola (SERT doğrulama; §1'deki okuma fail-open'dı) ────────────────
[ -r "$DIZIN/ortak.sh" ] || hata "ortak kitaplık yok (tools/sevk/ortak.sh)"
kanal_oku "$KOK" || hata "$KANAL_HATA"
PAROLA="$(security find-generic-password -s "$KANAL_KEYCHAIN_SERVIS" -a "$KANAL_HESAP" -w 2>/dev/null)" || PAROLA=""
[ -n "$PAROLA" ] || hata "Keychain kaydı yok/okunamadı (servis=$KANAL_KEYCHAIN_SERVIS hesap=$KANAL_HESAP)"

# ── 7 · Gönderim ──────────────────────────────────────────────────────────────────────────
GOVDE_DOSYA="$(mktemp -t keel-haber)" || hata "geçici dosya açılamadı"
chmod 600 "$GOVDE_DOSYA" 2>/dev/null || true
temizle() { rm -f "$GOVDE_DOSYA"; }
trap temizle EXIT
{
  printf 'From: %s\n' "$KANAL_HESAP"
  printf 'To: %s\n' "$KANAL_ALICI"
  printf 'Subject: %s\n' "$KONU"
  printf 'MIME-Version: 1.0\nContent-Type: text/plain; charset=UTF-8\n\n'
  printf '%s\n' "$GOVDE"
} > "$GOVDE_DOSYA"

gonder() {
  printf 'url = "smtp://%s:%s"\nuser = "%s:%s"\nmail-from = "%s"\nmail-rcpt = "%s"\nupload-file = "%s"\nmax-time = 20\nssl-reqd\nsilent\nshow-error\n' \
    "$KANAL_SMTP_SUNUCU" "$KANAL_SMTP_PORT" "$KANAL_HESAP" "$PAROLA" \
    "$KANAL_HESAP" "$KANAL_ALICI" "$GOVDE_DOSYA" | curl -K - 2>&1
}
SONUC="$(gonder)"; KOD=$?
if [ "$KOD" -ne 0 ]; then
  SONUC="$(gonder)"; KOD=$?   # tek yeniden deneme (geçici ağ arızası)
fi

# ── 8 · Kayıt ─────────────────────────────────────────────────────────────────────────────
if [ "$KOD" -eq 0 ] && [ -f "$DURUM" ]; then printf '%s\n' "$ANAHTAR" >> "$DURUM" 2>/dev/null || true; fi
if [ -n "${NODE_BIN:-}" ] || node_bul 2>/dev/null; then
  J_tip=haber J_donem="$A_DONEM" J_kutu="$A_KUTU" J_olay="$OLAY" \
    J_sonuc="$([ "$KOD" -eq 0 ] && printf 'gitti' || printf 'gitmedi')" \
    J_sansur="$([ "$SANSUR" -eq 1 ] && printf 'evet' || printf 'hayir')" \
    J_sebep="$([ "$KOD" -eq 0 ] && printf '' || printf '%s' "$SONUC")" \
    json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
fi

if [ "$KOD" -ne 0 ]; then
  printf 'haber: gönderim başarısız (%s): %s\n' "$KOD" "$SONUC" >&2
  exit 4
fi
[ "$SANSUR" -eq 1 ] && exit 3
exit 0
