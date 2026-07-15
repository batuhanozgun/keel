#!/bin/bash
# Kokpit — çift tıkla başlatıcı (salt-okunur yerel pano).
# Bu pencere açık kaldıkça pano çalışır; pencereyi kapatınca pano kapanır.

DIR="$(cd "$(dirname "$0")/.." && pwd)"   # tools/kokpit

# node keşfi — çift-tıkta PATH dardır (file-guard ile AYNI aday listesi; bağlantısız
# Homebrew kegi dahil — soğuk-denetim B6: eski tek-aday arama gerçek makinede node'u bulamıyordu).
NODE="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE="$aday"; break; fi
  done
fi
if [ -z "$NODE" ]; then
  printf '\n  Kokpit açılamadı: Node.js bulunamadı.\n'
  printf '  Çözüm: nodejs.org adresinden Node.js kur, sonra bu dosyaya yeniden çift tıkla.\n\n'
  read -r -p '  (kapatmak için Enter) ' _
  exit 1
fi

SRV="$DIR/server.mjs"
PORT="$("$NODE" -e "try{process.stdout.write(String((JSON.parse(require('fs').readFileSync('$DIR/kokpit.config.json','utf8')).port)||4173))}catch(e){process.stdout.write('4173')}" 2>/dev/null || echo 4173)"
URL="http://127.0.0.1:$PORT"

clear
printf '\n  ▸ Kokpit çalışıyor\n\n'
printf '    Tarayıcıda:    %s\n' "$URL"
printf '    Kapatmak için: bu pencereyi kapat.\n\n'

# Portta zaten bir kokpit varsa HANGİ projeye ait olduğunu doğrula (soğuk-denetim E4):
# sağlık cevabındaki vault, bu kopyanın vault'uyla aynı değilse YANLIŞ projenin panosu açılmasın.
SAGLIK="$(curl -s -m 1 "$URL/api/health" 2>/dev/null || true)"
if [ -n "$SAGLIK" ]; then
  BEKLENEN="$("$NODE" -e "
    const fs=require('fs'),path=require('path');
    let v='../..'; try{ v=JSON.parse(fs.readFileSync('$DIR/kokpit.config.json','utf8')).vaultYolu||'../..'; }catch(e){}
    try{ process.stdout.write(fs.realpathSync(path.resolve('$DIR', v))); }catch(e){ process.stdout.write(path.resolve('$DIR', v)); }
  " 2>/dev/null || true)"
  CALISAN="$(printf '%s' "$SAGLIK" | "$NODE" -e "
    let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{process.stdout.write(String(JSON.parse(d).vault||''))}catch(e){}});
  " 2>/dev/null || true)"
  if [ -n "$BEKLENEN" ] && [ "$CALISAN" = "$BEKLENEN" ]; then
    printf '    (Zaten çalışıyordu — tarayıcı açılıyor.)\n\n'
    open "$URL"; exit 0
  fi
  printf '    DİKKAT: Bu portta BAŞKA bir projenin panosu çalışıyor:\n'
  printf '      çalışan: %s\n      bu proje: %s\n' "${CALISAN:-bilinmiyor}" "$BEKLENEN"
  printf '    Bu projenin panosunu görmek için önce o pencereyi kapat,\n'
  printf '    ya da kokpit.config.json içindeki "port" değerini değiştir (ör. 4174).\n\n'
  read -r -p '  (kapatmak için Enter) ' _
  exit 1
fi

( sleep 2; open "$URL" ) &
exec "$NODE" "$SRV"
