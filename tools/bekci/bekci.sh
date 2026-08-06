#!/bin/bash
# bekci.sh — bekçi SABİT ÇEKİRDEĞİNİN ince sarmalayıcısı [SERT]. Sözleşme: tools/bekci/README.md.
# kategoriler: tavan şema koruma-hattı bağ-varlık golden-tazelik
# Konvansiyon yolu BU dosyadır: kapanış kancası (kapanis.sh), sevk (sevk.sh) ve kurulum denetimi
# bekçiyi buradan çağırır — kabloya dokunulmaz (sözleşme §0). Denetim gövdesi cekirdek.mjs'tedir;
# çıkış kodu sözleşmesi çekirdeğindir ve AYNEN geçer: 0 = durduran yok · 1 = durduran var ·
# 2 = bekçinin kendi arızası.
set -euo pipefail
export LC_ALL=C.UTF-8

BURASI="$(cd "$(dirname "$0")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$BURASI/../.." && pwd)}"

# Node keşfi: GUI'den açılan oturumda PATH dardır (BEKCI_TARIFI'nın macOS dersi) — command -v
# yetmez, bilinen mutlak adaylar da denenir (ortak.sh node_bul aday listesiyle aynı).
# BEKCI_NODE yalnız TEST dikişidir: arıza dalı ancak bu dikişle kırmızıya dönebilir; env'i
# kontrol eden süreci zaten kontrol eder, dikiş yeni yetki açmaz.
NODE_BIN="${BEKCI_NODE:-}"
if [ -z "$NODE_BIN" ] && command -v node >/dev/null 2>&1; then NODE_BIN="$(command -v node)"; fi
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi
if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  # Makine satırı BASILMAZ: sarmalayıcı çekirdek adına satır uydurmaz — satır yoksa tüketici
  # zaten fail-closed durur ("ölçemedim" ile "temiz" aynı şey değildir, sözleşme §1).
  printf 'ARIZA [sarmalayici] node bulunamadı — denetim koşamıyor (fail-closed)\n'
  exit 2
fi

RC=0
"$NODE_BIN" "$BURASI/cekirdek.mjs" "$KOK" || RC=$?
exit "$RC"
