#!/bin/bash
# rol-ac — rol açılış töreni kaydı. Meşru tetik: rol-becerisinin (!`…`) ön-işleme satırı,
# yani fiilen İNSANIN yazdığı /rol-<slug> komutu. Argüman-doğrulamalı ve DAMGA-DEĞİŞTİRMEZ:
# damga ancak boşken doğar; rol/profil değişimi reddedilir (kafes ancak YENİ oturumla değişir) —
# ajan bunu Bash ile çağırsa bile mevcut kafesi gevşetemez.
# Kullanım: rol-ac.sh <slug> <yazamaz|tam>   (rolün evi türetilir: 03_roller/<slug>/)
# Yazdığı: tools/guard/.aktif-rol — tek satır: "<slug>\t<mod>\t03_roller/<slug>/"
# Okuyan: file-guard.sh (rol kafesi) · Temizleyen: SessionStart kancası (startup+clear).
set -euo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DAMGA="$KOK/tools/guard/.aktif-rol"
SLUG="${1:-}"; MOD="${2:-}"

hata() { printf 'ROL AÇILAMADI: %s\n' "$1" >&2; exit 1; }

case "$SLUG" in ""|*[!a-z0-9_-]*) hata "slug boş ya da ASCII-slug değil (izinli: a-z 0-9 _ -). Kullanım: rol-ac.sh <slug> <yazamaz|tam>" ;; esac
{ [ "$MOD" = "yazamaz" ] || [ "$MOD" = "tam" ]; } || hata "mod 'yazamaz' ya da 'tam' olmalı (gelen: '$MOD')"

EV="03_roller/$SLUG/"
ISTENEN="$(printf '%s\t%s\t%s' "$SLUG" "$MOD" "$EV")"

acik_bas() {
  if [ "$MOD" = "yazamaz" ]; then
    printf 'ROL AÇIK: %s (mod: yazamaz — dosya-yazma araçları kilitli; kendi klasörün %s hariç, ROL.md sözleşmen istisnanın DIŞINDA)\n' "$SLUG" "$EV"
  else
    printf 'ROL AÇIK: %s (mod: tam — dosya koruması [kilitli/golden/guard] yine geçerli)\n' "$SLUG"
  fi
}

if [ -f "$DAMGA" ]; then
  MEVCUT_SATIR="$(head -n1 "$DAMGA")"
  if [ "$MEVCUT_SATIR" = "$ISTENEN" ]; then acik_bas; exit 0; fi # birebir aynı tören — no-op, damga YENİDEN YAZILMAZ
  MEVCUT="$(printf '%s' "$MEVCUT_SATIR" | cut -f1)"
  case "$MEVCUT" in
    "$SLUG") hata "aynı rol FARKLI profille açılamaz (mevcut damga korunur) — profil değişikliği = YENİ oturum + sahip kararı" ;;
    ""|*[!a-z0-9_-]*) hata "mevcut damga bozuk ($DAMGA) — üstüne yazılmaz. Çözüm: yeni oturum aç (SessionStart temizler) ya da dosyayı elle sil." ;;
    *) hata "bu oturumda '$MEVCUT' rolü zaten açık. Rol değişimi = YENİ oturum + yeni tören (EL_KITABI)." ;;
  esac
fi

printf '%s\n' "$ISTENEN" > "$DAMGA"
acik_bas
