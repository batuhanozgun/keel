#!/bin/bash
# acilis — oturum-açılış kancası (SessionStart): sahipte bekleyen madde varsa TEK bilgi satırı.
# V2 Öbek-2 (sahip yüzeyi): kapanışta sorulan soru sonraki oturumda buharlaşıyordu (ölçüldü);
# kuyruk kalıcı, hatırlatma AÇILIŞTA + PANODA. Sahip seçimi (2026-07-24): ISRAR YOK — yaş
# BİLGİdir, uyarı değil; eskalasyon/dırdır bilinçli kapsam dışı.
# FAIL-OPEN: kuyruk yoksa/okunamazsa sessizce çıkar (exit 0); açılışı hiçbir koşulda kilitlemez.
# SALT-OKUR: bu kanca hiçbir dosyaya yazmaz (kuyruğun mekanik yazarı kapanis.sh — F1 istisna 2).
# Vault değilse (00_pano/SENDE_BEKLEYEN.md yok) sessiz çıkar: şablon kökü kirletilmez.
set -uo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
KUYRUK="$KOK/00_pano/SENDE_BEKLEYEN.md"
[ -r "$KUYRUK" ] || exit 0

# Açık madde = "- [ ]" ile başlayan satır. Yaş: satırdaki ilk YYYY-AA-GG damgası (aralık
# niceleyicisi YOK — BSD awk taban uyumu; gün farkı Julian gün-numarasıyla, tarih aritmetiği
# kabuk-bağımsız kalsın diye).
awk -v bugun="$(date '+%Y-%m-%d')" '
  function gunno(y, m, d) { if (m < 3) { y--; m += 12 } return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d - 1524 }
  BEGIN { n = 0; enEski = -1; split(bugun, b, "-"); bg = gunno(b[1] + 0, b[2] + 0, b[3] + 0) }
  /^- \[ \]/ {
    n++
    if (match($0, /[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/)) {
      split(substr($0, RSTART, RLENGTH), t, "-")
      yas = bg - gunno(t[1] + 0, t[2] + 0, t[3] + 0)
      if (yas > enEski) enEski = yas
    }
  }
  END {
    if (n == 0) exit 0
    if (enEski >= 1) printf "ℹ️ Sende bekleyen %d madde (en eskisi %d gündür) — \"bekleyenleri göster\" de.\n", n, enEski
    else printf "ℹ️ Sende bekleyen %d madde — \"bekleyenleri göster\" de.\n", n
  }
' "$KUYRUK" 2>/dev/null || true
exit 0
