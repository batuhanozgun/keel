#!/bin/bash
# kanal-yokla — haber kanalının sağlık kontrolü (E5). `/donem` töreninin ve bekçinin okuduğu
# tek satırlık hüküm; karar-alani.sh emsali, FAIL-CLOSED (kendi hatası da "HAZIR DEĞİL"dir).
#
# Neden ön koşul: kanalın kırık olduğunu öğrenmenin en ucuz anı, sahibin klavyede olduğu tek
# andır. Gece yarısı keşfedilen kırık kanal = haber alınmayan bir gece (tasarı §3.3).
#
# Üç kalem: yapılandırma · Keychain kaydı · SMTP kimlik doğrulaması (POSTA GÖNDERMEZ — curl
# yalnız bağlanır, STARTTLS yapar, AUTH dener ve kapatır).
# Çıktı (ilk satır): HAZIR   ya da   HAZIR DEĞİL · <sebep>
# Çıkış kodu: 0 = hazır · 1 = değil.
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"
DERIN=1
[ "${1:-}" = "--sig" ] && DERIN=0   # ağa çıkmadan yalnız yapılandırma+Keychain (testler)

degil() { printf 'HAZIR DEĞİL · %s\n' "$1"; exit 1; }

[ -r "$DIZIN/ortak.sh" ] || degil "ortak kitaplık yok (tools/sevk/ortak.sh)"
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

kanal_oku "$KOK" || degil "${KANAL_HATA:-kanal.conf okunamadı}"
[ -x "$(command -v security 2>/dev/null || echo /usr/bin/security)" ] || degil "security (Keychain) bulunamadı"

PAROLA="$(security find-generic-password -s "$KANAL_KEYCHAIN_SERVIS" -a "$KANAL_HESAP" -w 2>/dev/null)" || PAROLA=""
[ -n "$PAROLA" ] || degil "Keychain kaydı yok — kur: security add-generic-password -s \"$KANAL_KEYCHAIN_SERVIS\" -a \"$KANAL_HESAP\" -w"

if [ "$DERIN" -eq 1 ]; then
  command -v curl >/dev/null 2>&1 || degil "curl bulunamadı"
  CIKTI="$(printf 'url = "smtp://%s:%s"\nuser = "%s:%s"\nmax-time = 15\nssl-reqd\nsilent\nshow-error\n' \
    "$KANAL_SMTP_SUNUCU" "$KANAL_SMTP_PORT" "$KANAL_HESAP" "$PAROLA" | curl -K - 2>&1)"
  KOD=$?
  case "$KOD" in
    0) : ;;
    67) degil "SMTP kimlik doğrulaması reddedildi — uygulama parolası yanlış ya da süresi dolmuş (Keychain: $KANAL_KEYCHAIN_SERVIS/$KANAL_HESAP)" ;;
    6|7|28|35) degil "SMTP sunucusuna ulaşılamadı ($KANAL_SMTP_SUNUCU:$KANAL_SMTP_PORT · curl $KOD): $CIKTI" ;;
    *) degil "SMTP yoklaması başarısız (curl $KOD): $CIKTI" ;;
  esac
fi

printf 'HAZIR\n'
exit 0
