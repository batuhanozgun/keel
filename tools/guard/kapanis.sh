#!/bin/bash
# kapanis — oturum-kapanış kancası (SessionEnd): olay-gömülü hijyen + oturum-günlüğü (RSK-2 sayacı).
# K3 dersi mekaniğe iner: olay-gömülü hijyen HEP koşar, tetiklemeye bağlı hijyen hiç koşmadı.
# Yaptığı (sırayla): (1) bekçi koşusu (tools/bekci/bekci.sh varsa — konvansiyon-yol, GENESIS G3.2;
#   PANO/SAGLIK damgası tazelenir); (2) 00_pano/oturum-gunlugu.jsonl'e TEK satır oturum-meta
#   (tarih · oturum · neden · rol · süre · token · damga-yaşı — transcript'ten OKUNABİLDİĞİ KADAR:
#   biçim Claude Code'un iç formatıdır, sürümle değişebilir [doc-teyitli]; okunamayan alan null,
#   satır HEP düşer). Damga-yaşı = SAGLIK "son koşu:" damgasının dakika yaşı (SALT-OKUMA; politika
#   kancada yok, bayatlığın sahip-yüzeyi kokpittir).
# FAIL-OPEN (bilinçli; file-guard'ın fail-closed'undan farklı): SessionEnd engelleyemez (doc-teyitli),
#   kapanış hijyeni oturumu rehin almaz; kancanın ölümünü bekçinin kablo-denetimi KIRMIZI basar (çift hat).
# Tek-yazar: oturum-gunlugu.jsonl'i YALNIZ bu kanca yazar; append-only (anayasa m.1 istisnası:
#   insan okumaz, makine okur; satır tavanı uygulanmaz). Rol damgasını yalnız OKUR — silmek
#   SessionStart'ın işi (Faz 2 kararı 8: tek temizlikçi).
# Vault değilse (00_pano yok) sessizce çıkar: şablon kökü / GENESIS-öncesi oturum kirletilmez.
set -uo pipefail
export LC_ALL=C.UTF-8

GIRDI="$(cat 2>/dev/null || true)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
[ -d "$KOK/00_pano" ] || exit 0
GUNLUK="$KOK/00_pano/oturum-gunlugu.jsonl"

# Rol damgası (yalnız oku; slug-doğrulamalı — bozuksa boş kalır, jsonl'de null düşer)
ROL=""
if [ -f "$KOK/tools/guard/.aktif-rol" ]; then
  ROL="$(head -n1 "$KOK/tools/guard/.aktif-rol" 2>/dev/null | cut -f1 || true)"
  case "$ROL" in ""|*[!a-z0-9_-]*) ROL="";; esac
fi

# Bekçi koşusu — sonucu günlük satırına işlensin diye ÖNCE koşar (günlük .md değil:
# drift radarına ve mtime kuralına görünmez; PANO_SOZLESMESI sırası bozulmaz).
BEKCI="yok"
if [ -f "$KOK/tools/bekci/bekci.sh" ]; then
  bash "$KOK/tools/bekci/bekci.sh" >/dev/null 2>&1
  RC=$?
  case "$RC" in 0) BEKCI="tamam";; 1) BEKCI="kirmizi";; *) BEKCI="hata";; esac
fi

# node keşfi (file-guard ile aynı: GUI oturumunda PATH dardır — Faz-1 bulgusu)
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi

SATIR=""
if [ -n "$NODE_BIN" ]; then
  SATIR="$(printf '%s' "$GIRDI" | KAPANIS_KOK="$KOK" KAPANIS_ROL="$ROL" KAPANIS_BEKCI="$BEKCI" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
let g = {};
try { g = JSON.parse(readFileSync(0, "utf8")); } catch {}
const rolHam = process.env.KAPANIS_ROL || "";
const out = {
  surum: 1,
  ts: new Date().toISOString(),
  oturum: g.session_id || null,
  neden: g.reason || null,
  rol: /^[a-z0-9_-]+$/.test(rolHam) ? rolHam : null,
  bekci: process.env.KAPANIS_BEKCI || "yok",
  damga_yasi_dk: null,
  sure_dk: null, girdi_token: null, cikti_token: null, cache_okuma: null, cache_yazma: null,
  not: null,
};
// Damga yasi (plan karari 12 — SALT-OKUMA): SAGLIK "son koşu:" damgasi yerel saattir.
try {
  const s = readFileSync(process.env.KAPANIS_KOK + "/00_pano/SAGLIK.md", "utf8");
  const m = s.match(/son koşu:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  if (m) {
    const t = new Date(m[1].replace(" ", "T") + ":00").getTime();
    if (Number.isFinite(t)) out.damga_yasi_dk = Math.max(0, Math.round((Date.now() - t) / 60000));
  }
} catch {}
const tp = g.transcript_path;
if (tp && existsSync(tp)) {
  try {
    let ilk = null, son = null;
    // Ayni message.id parca parca tekrar duser (fiilî gozlem 2026-07-13) — SON usage kazanir.
    const sonUsage = new Map();
    for (const l of readFileSync(tp, "utf8").split("\n")) {
      if (!l) continue;
      let j; try { j = JSON.parse(l); } catch { continue; }
      if (j.timestamp) { if (!ilk) ilk = j.timestamp; son = j.timestamp; }
      if (j.type === "assistant" && j.message && j.message.usage) {
        sonUsage.set(j.message.id || "satir-" + sonUsage.size, j.message.usage);
      }
    }
    if (ilk && son) {
      const ms = Date.parse(son) - Date.parse(ilk);
      if (Number.isFinite(ms) && ms >= 0) out.sure_dk = Math.round(ms / 60000);
    }
    if (sonUsage.size) {
      let gi = 0, ci = 0, co = 0, cy = 0;
      for (const u of sonUsage.values()) {
        gi += u.input_tokens || 0; ci += u.output_tokens || 0;
        co += u.cache_read_input_tokens || 0; cy += u.cache_creation_input_tokens || 0;
      }
      out.girdi_token = gi; out.cikti_token = ci; out.cache_okuma = co; out.cache_yazma = cy;
    } else {
      out.not = "transcriptte usage satiri yok (bos oturum ya da bicim degisti)";
    }
  } catch (e) { out.not = "transcript okunamadi: " + ((e && e.message) || "hata"); }
} else {
  out.not = "transcript yolu yok/bulunamadi";
}
process.stdout.write(JSON.stringify(out));
' 2>/dev/null || true)"
fi

if [ -z "$SATIR" ]; then
  # node yok ya da çözümleyici öldü — DARALTILMIŞ satır yine düşer (iz hiç kaybolmaz)
  TS="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  ROLJ="null"; [ -n "$ROL" ] && ROLJ="\"$ROL\""
  SATIR="{\"surum\":1,\"ts\":\"$TS\",\"oturum\":null,\"neden\":null,\"rol\":$ROLJ,\"bekci\":\"$BEKCI\",\"damga_yasi_dk\":null,\"sure_dk\":null,\"girdi_token\":null,\"cikti_token\":null,\"cache_okuma\":null,\"cache_yazma\":null,\"not\":\"node yok ya da cozumleyici oldu — daraltilmis meta\"}"
fi
printf '%s\n' "$SATIR" >> "$GUNLUK" 2>/dev/null || printf 'kapanis: gunluk yazilamadi (%s)\n' "$GUNLUK" >&2
exit 0
