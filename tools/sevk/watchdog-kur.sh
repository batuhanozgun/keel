#!/bin/bash
# watchdog-kur — nabiz.sh'ı launchd'ye bağlar/söker (E5). Sahibin ya da kurulumun elinden koşar.
#
# Kullanım:  bash tools/sevk/watchdog-kur.sh            → kurar ve yükler
#            bash tools/sevk/watchdog-kur.sh --kaldir   → söker
#            bash tools/sevk/watchdog-kur.sh --durum    → canlılık raporu
#
# NEDEN launchd: watchdog'un Claude'dan bağımsız yaşaması gerekir (tasarım §8). launchd işi
# makine açık olduğu sürece diriltir; Claude'un ölümü onu etkilemez.
#
# İŞARET DEĞİL CANLILIK: bu betik `tools/sevk/watchdog-kurulu` dosyasını yazar ama o dosya
# yalnız NEREYE bakılacağını söyler. Koşu açılışındaki denetim işin fiilen YÜKLÜ olduğunu
# `launchctl print` ile ve son nabız damgasının tazeliğiyle doğrular — E4'ün en pahalı ders
# sınıfı buydu: dosyada duran ölü kural.
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"
ARALIK=300

hata() { printf 'watchdog-kur HATA: %s\n' "$1" >&2; exit 1; }

SLUG="$(basename "$KOK" | tr -c 'A-Za-z0-9._-' '-' | cut -c1-40)"
ETIKET="dev.keel.nabiz.$SLUG"
PLIST="$HOME/Library/LaunchAgents/$ETIKET.plist"
ISARET="$DIZIN/watchdog-kurulu"
UID_="$(id -u)"

durum_yaz() {
  printf 'etiket: %s\n' "$ETIKET"
  if launchctl print "gui/$UID_/$ETIKET" >/dev/null 2>&1; then
    printf 'launchd işi: YÜKLÜ\n'
  else
    printf 'launchd işi: YÜKLÜ DEĞİL\n'
  fi
  if [ -f "$DIZIN/.nabiz-son" ]; then
    printf 'son nabız: %s\n' "$(head -n1 "$DIZIN/.nabiz-son")"
  else
    printf 'son nabız: HİÇ (betik hiç koşmamış)\n'
  fi
}

case "${1:-}" in
  --durum) durum_yaz; exit 0 ;;
  --kaldir)
    launchctl bootout "gui/$UID_/$ETIKET" 2>/dev/null || launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST" "$ISARET"
    printf 'watchdog söküldü: %s\n' "$ETIKET"
    exit 0
    ;;
  '') : ;;
  *) hata "tanınmayan argüman: $1 (--kaldir | --durum)" ;;
esac

[ -r "$DIZIN/nabiz.sh" ] || hata "tools/sevk/nabiz.sh yok — kurulacak iş yok"
mkdir -p "$HOME/Library/LaunchAgents" 2>/dev/null || hata "LaunchAgents dizini açılamadı"

cat > "$PLIST" <<PLIST_SON
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$ETIKET</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DIZIN/nabiz.sh</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>CLAUDE_PROJECT_DIR</key><string>$KOK</string></dict>
  <key>StartInterval</key><integer>$ARALIK</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>$DIZIN/.nabiz-hata.log</string>
</dict>
</plist>
PLIST_SON

launchctl bootout "gui/$UID_/$ETIKET" >/dev/null 2>&1 || true
if ! launchctl bootstrap "gui/$UID_" "$PLIST" 2>/dev/null; then
  launchctl load "$PLIST" 2>/dev/null || hata "launchd işi yüklenemedi: $PLIST"
fi
launchctl print "gui/$UID_/$ETIKET" >/dev/null 2>&1 || hata "iş yüklendi görünüyor ama launchctl onu bulamıyor — kurulum SAYILMAZ (ölü kural olmasın)"

{
  printf 'etiket=%s\n' "$ETIKET"
  printf 'plist=%s\n' "$PLIST"
  printf 'aralik_sn=%s\n' "$ARALIK"
  printf 'kurulum=%s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
} > "$ISARET"

printf 'watchdog kuruldu ve yüklendi.\n'
durum_yaz
