#!/bin/bash
# kilit — sevk ailesinin ortak dosya kilidi kitaplığı (E3, 2026-07-28).
# Doğuş: E1'de zarf-ekle.sh kendi kilidini yazdı; E3'te catal-kuyruk.sh --ekle KİLİTSİZ çıktı ve
# eşzamanlı SubagentStop'ta üç ayrı soru aynı Ç-01 numarasını aldı (hasım bulgusu, 4 paralel
# dönemle yeniden üretildi). İkinci bir kopya yazmak yerine kitaplık çıkarıldı — D-02 dersi:
# bayt-bayt kopya = sürüklenme.
#
# Kullanım (kaynak olarak alınır, koşturulmaz):
#   . "$(dirname "$0")/kilit.sh"
#   kilit_al "$YOL.kilit" || hata "kilit alinamadi: $KILIT_HATA"
#   ... kritik bölge ...
#   kilit_birak
#
# Mekanik: mkdir kilidi (macOS tabanında flock yok) · 50×0,1 sn deneme · bayat kilit İKİ dallı
# kırılır (ölü PID · pid'siz + mtime > 30 sn) · KIRMA ATOMİKTİR (`mv`, `rm -rf` DEĞİL: iki süreç
# aynı anda bayat görürse biri ötekinin TAZE kilidini silebilirdi — E1 hasım bulgusu D2).
# FAIL-CLOSED: alınamazsa 1 döner ve çağıran YAZMAZ.
export LC_ALL=C.UTF-8

KILIT_YOLU=""
KILIT_HATA=""

kilit_kir() { # atomik: mv'yi tek süreç kazanır; kaybeden sessizce döngüye döner
  local KY="$1" COP="$1.kirik.$$"
  if mv "$KY" "$COP" 2>/dev/null; then rm -rf "$COP" 2>/dev/null || true; fi
}

kilit_al() { # $1: kilit dizini yolu → 0 alındı · 1 alınamadı (KILIT_HATA dolu)
  local KY="$1" DENEME=0 ESKI_PID KILIT_ZAMAN
  KILIT_HATA=""
  while ! mkdir "$KY" 2>/dev/null; do
    DENEME=$((DENEME + 1))
    if [ "$DENEME" -ge 50 ]; then
      ESKI_PID="$(cat "$KY/pid" 2>/dev/null || true)"
      case "$ESKI_PID" in
        *[!0-9]*|'')
          KILIT_ZAMAN="$(stat -f %m "$KY" 2>/dev/null || stat -c %Y "$KY" 2>/dev/null || echo 0)"
          case "$KILIT_ZAMAN" in *[!0-9]*|'') KILIT_ZAMAN=0;; esac
          if [ "$KILIT_ZAMAN" -gt 0 ] && [ $(( $(date +%s) - KILIT_ZAMAN )) -gt 30 ]; then
            kilit_kir "$KY"; DENEME=0; continue
          fi
          KILIT_HATA="sahibi okunamadi ve kilit taze ($KY) — yazim yigilmis olabilir, elle bak"
          return 1 ;;
        *) if kill -0 "$ESKI_PID" 2>/dev/null; then
             KILIT_HATA="sahibi PID $ESKI_PID yasiyor ($KY) — yazim yigilmis olabilir"
             return 1
           else
             kilit_kir "$KY"; DENEME=0; continue
           fi ;;
      esac
    fi
    sleep 0.1
  done
  KILIT_YOLU="$KY"
  printf '%s\n' "$$" > "$KY/pid" 2>/dev/null || true
  return 0
}

kilit_birak() {
  [ -n "$KILIT_YOLU" ] || return 0
  rm -rf "$KILIT_YOLU" 2>/dev/null
  KILIT_YOLU=""
}
