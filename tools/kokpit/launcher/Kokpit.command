#!/bin/bash
# Kokpit — çift tıkla başlatıcı (salt-okunur yerel pano).
# Bu pencere açık kaldıkça pano çalışır; pencereyi kapatınca pano kapanır.

DIR="$(cd "$(dirname "$0")/.." && pwd)"   # tools/kokpit
NODE="$(command -v node || echo /usr/local/bin/node)"
SRV="$DIR/server.mjs"
PORT="$("$NODE" -e "try{process.stdout.write(String((JSON.parse(require('fs').readFileSync('$DIR/kokpit.config.json','utf8')).port)||4173))}catch(e){process.stdout.write('4173')}" 2>/dev/null || echo 4173)"
URL="http://127.0.0.1:$PORT"

clear
printf '\n  ▸ Kokpit çalışıyor\n\n'
printf '    Tarayıcıda:    %s\n' "$URL"
printf '    Kapatmak için: bu pencereyi kapat.\n\n'

if curl -s -o /dev/null -m 1 "$URL/api/health" 2>/dev/null; then
  printf '    (Zaten çalışıyordu — tarayıcı açılıyor.)\n\n'
  open "$URL"; exit 0
fi
( sleep 2; open "$URL" ) &
exec "$NODE" "$SRV"
