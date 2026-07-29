#!/bin/bash
# kapanis — oturum-kapanış kancası (SessionEnd): olay-gömülü hijyen + oturum-günlüğü (RSK-2 sayacı).
# K3 dersi mekaniğe iner: olay-gömülü hijyen HEP koşar, tetiklemeye bağlı hijyen hiç koşmadı.
# Yaptığı (sırayla): (-1) PORCELAIN DİKİŞİ (dış göz paketi, D-20 parça 2): yazamaz koltuk
#   açılışta damganın 2. satırına kirlilik özeti bırakır; burada AYNI kitaplıkla (porcelain.sh)
#   yeniden alınır ve karşılaştırılır — es/fark/yok. Kancanın KENDİ yazımlarından ÖNCE koşar.
#   Sonuç bekçiye KAPANIS_PORCELAIN ile geçer (yalnız dikiş varken) ve günlüğe düşer;
#   (0) SENDE BEKLEYEN süzmesi (V2 Öbek-2): transcript'in SON asistan mesajından
#   D2 kapanış bloğunun makine-okur satırını arar — "YOK" ise dokunmaz, "N madde" ise maddeleri
#   00_pano/SENDE_BEKLEYEN.md kuyruğuna EKLER (tekilleştirmeli; EL_KITABI F1 istisna 2 — mekanik
#   yazar bu kancadır, kapanış işareti rolündür, SİLME YASAK). Blok durumu bekçiye KAPANIS_BLOK
#   değişkeniyle geçer (yalnız rol damgası varken — rolsüz oturumda sahibe dırdır edilmez);
#   (1) bekçi denetimi (tools/bekci/bekci.sh varsa — konvansiyon-yol, GENESIS G3.2;
#   PANO/SAGLIK damgası tazelenir; kuyruk ondan ÖNCE yazılır ki PANO sayacı taze olsun);
#   (2) 00_pano/oturum-gunlugu.jsonl'e TEK satır oturum-meta (şema surum:3 — Öbek-2'de
#   `blok` + `bekleyen_eklendi`, dış göz paketinde `porcelain` eklendi; surum:1/2 satırları
#   eski oturumlardır)
#   (tarih · oturum · neden · rol · blok · porcelain · süre · token · damga-yaşı — transcript'ten OKUNABİLDİĞİ KADAR:
#   biçim Claude Code'un iç formatıdır, sürümle değişebilir [doc-teyitli]; okunamayan alan null,
#   satır HEP düşer). Damga-yaşı = SAGLIK "son denetim:" damgasının dakika yaşı (SALT-OKUMA; politika
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

# Porcelain dikişi karşılaştırması — kancanın KENDİ yazımlarından (kuyruk, bekçi, günlük) ÖNCE
# alınır, yoksa kancanın izi "fark" sanılır. Açılış özeti damganın 2. satırındadır (yalnız
# yazamaz profilde doğar); yoksa "yok" kalır ve bekçiye sinyal GEÇMEZ (denetlenmez).
PORCELAIN="yok"
if [ -n "$ROL" ]; then
  ACILIS_OZET="$(awk -F'\t' 'NR==2 && $1=="porcelain" { print $2 }' "$KOK/tools/guard/.aktif-rol" 2>/dev/null || true)"
  case "$ACILIS_OZET" in
    ''|*[!0-9]*) : ;;  # dikiş yok / "yok" / bozuk → karşılaştırma yapılmaz
    *)
      LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/porcelain.sh"   # kitaplık betiğin yanında
      if [ -r "$LIB" ]; then
        . "$LIB"
        if [ "$(porcelain_ozet "$KOK" "$ROL")" = "$ACILIS_OZET" ]; then PORCELAIN="es"; else PORCELAIN="fark"; fi
      fi
      ;;
  esac
fi

# node keşfi (file-guard ile aynı: GUI oturumunda PATH dardır — Faz-1 bulgusu)
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi

# (0) SENDE BEKLEYEN süzmesi + kuyruk yazımı — bekçiden ÖNCE (PANO sayacı taze olsun).
# Çapa: son asistan mesajındaki literal "SENDE BEKLEYEN:" satırı (markdown kalınına toleranslı).
# node yoksa süzme atlanır (blok=bilinmiyor) — bilinçli fail-open, meta satırı yine düşer.
BLOK="bilinmiyor"; EKLENDI=0
if [ -n "$NODE_BIN" ]; then
  SUZME="$(printf '%s' "$GIRDI" | KAPANIS_KOK="$KOK" KAPANIS_ROL="$ROL" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, writeFileSync, appendFileSync } from "node:fs";
let g = {};
try { g = JSON.parse(readFileSync(0, "utf8")); } catch {}
const KOK = process.env.KAPANIS_KOK || ".";
const rolHam = process.env.KAPANIS_ROL || "";
const rol = /^[a-z0-9_-]+$/.test(rolHam) ? rolHam : "—";
const oturum = String(g.session_id || "bilinmiyor").slice(0, 8);
const BASLIK = [
  "<!-- yazar: kapanış kancası (mekanik ekleme) + cevabı alan rol (kapanış işareti) — EL_KITABI F1 istisna 2.",
  "     Biçim: \"- [ ] <tarih> · <rol> · tek cümle · kaynak: oturum <id>\"; cevaplanınca aynı satır",
  "     \"- [x] … · cevap: … · <tarih>\" olur. MADDE SİLİNMEZ (tavan 2KB; taşmada en eski KAPALI izler kırpılır). -->",
  "# SENDE BEKLEYEN — sahipte bekleyen maddeler",
  "",
  "",
].join("\n");
let blok = "bilinmiyor", eklendi = 0;
try {
  const tp = g.transcript_path;
  if (tp && existsSync(tp)) {
    let son = null;
    for (const l of readFileSync(tp, "utf8").split("\n")) {
      if (!l) continue;
      let j; try { j = JSON.parse(l); } catch { continue; }
      if (j.type !== "assistant" || !j.message) continue;
      const c = j.message.content;
      const metin = Array.isArray(c)
        ? c.filter((p) => p && p.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n").trim()
        : (typeof c === "string" ? c.trim() : "");
      if (metin) son = metin;
    }
    if (son !== null) {
      const satirlar = son.split("\n");
      let i = -1, bas = "";
      for (let k = satirlar.length - 1; k >= 0; k--) {
        const m = satirlar[k].match(/SENDE BEKLEYEN\*{0,2}\s*:\s*(.*)$/);
        if (m) { i = k; bas = m[1].replace(/[*`]/g, "").trim(); break; }
      }
      if (i < 0 || !bas) {
        blok = "yok";
      } else if (/^YOK\b/i.test(bas)) {
        blok = "var";
      } else {
        const maddeler = [];
        for (let k = i + 1; k < satirlar.length; k++) {
          const s = satirlar[k];
          if (/^\s*#{1,6}\s/.test(s)) break;
          if (/SIRADAKİ\*{0,2}\s*:/.test(s)) break;
          const m = s.match(/^\s*(\d+)[.)]\s+(.+)$/);
          if (m) maddeler.push(m[2]);
        }
        blok = maddeler.length ? "var" : "bicimsiz";
        if (maddeler.length) {
          const yol = KOK + "/00_pano/SENDE_BEKLEYEN.md";
          if (!existsSync(yol)) writeFileSync(yol, BASLIK);
          const mevcut = readFileSync(yol, "utf8");
          const d = new Date();
          const p2 = (n) => String(n).padStart(2, "0");
          const bugun = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
          const ekler = [];
          for (const ham of maddeler) {
            let t = ham.replace(/[`*]/g, "").replace(/\s+/g, " ").replace(/"/g, "’").trim();
            if (t.length > 200) t = t.slice(0, 199) + "…";
            if (!t) continue;
            const imza = "· \"" + t + "\" · kaynak: oturum " + oturum;
            if (mevcut.includes(imza)) continue;
            if (ekler.some((e) => e.indexOf(imza) >= 0)) continue;
            ekler.push("- [ ] " + bugun + " · " + rol + " " + imza);
          }
          if (ekler.length) { appendFileSync(yol, ekler.join("\n") + "\n"); eklendi = ekler.length; }
        }
      }
    }
  }
} catch {}
process.stdout.write(blok + "\t" + eklendi);
' 2>/dev/null || true)"
  case "$SUZME" in
    var*|yok*|bicimsiz*|bilinmiyor*)
      BLOK="${SUZME%%	*}"; EKLENDI="${SUZME##*	}"
      case "$EKLENDI" in ''|*[!0-9]*) EKLENDI=0;; esac
      ;;
  esac
fi

# (1) bekçi denetimi — sonucu günlük satırına işlensin diye meta yazımından ÖNCE koşar (günlük .md
# değil: drift radarına ve mtime kuralına görünmez; PANO_SOZLESMESI sırası bozulmaz).
# KAPANIS_BLOK yalnız rol damgası varken geçer: kapanış bloğu rol-oturumu disiplinidir,
# rolsüz oturumda bekçi bunu denetlemez (sahibe dırdır yok).
BEKCI="yok"
if [ -f "$KOK/tools/bekci/bekci.sh" ]; then
  RC=0
  if [ -n "$ROL" ] && [ "$PORCELAIN" != "yok" ]; then
    KAPANIS_BLOK="$BLOK" KAPANIS_PORCELAIN="$PORCELAIN" bash "$KOK/tools/bekci/bekci.sh" >/dev/null 2>&1 || RC=$?
  elif [ -n "$ROL" ]; then
    KAPANIS_BLOK="$BLOK" bash "$KOK/tools/bekci/bekci.sh" >/dev/null 2>&1 || RC=$?
  else
    bash "$KOK/tools/bekci/bekci.sh" >/dev/null 2>&1 || RC=$?
  fi
  case "$RC" in 0) BEKCI="tamam";; 1) BEKCI="kirmizi";; *) BEKCI="hata";; esac
fi

SATIR=""
if [ -n "$NODE_BIN" ]; then
  SATIR="$(printf '%s' "$GIRDI" | KAPANIS_KOK="$KOK" KAPANIS_ROL="$ROL" KAPANIS_BEKCI="$BEKCI" \
    KAPANIS_BLOK="$BLOK" KAPANIS_EKLENDI="$EKLENDI" KAPANIS_PORCELAIN="$PORCELAIN" \
    "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
let g = {};
try { g = JSON.parse(readFileSync(0, "utf8")); } catch {}
const rolHam = process.env.KAPANIS_ROL || "";
const out = {
  surum: 3,
  ts: new Date().toISOString(),
  oturum: g.session_id || null,
  neden: g.reason || null,
  rol: /^[a-z0-9_-]+$/.test(rolHam) ? rolHam : null,
  bekci: process.env.KAPANIS_BEKCI || "yok",
  blok: process.env.KAPANIS_BLOK || null,
  bekleyen_eklendi: Number(process.env.KAPANIS_EKLENDI) || 0,
  porcelain: process.env.KAPANIS_PORCELAIN || "yok",
  damga_yasi_dk: null,
  sure_dk: null, girdi_token: null, cikti_token: null, cache_okuma: null, cache_yazma: null,
  not: null,
};
// Damga yasi (plan karari 12 — SALT-OKUMA): SAGLIK "son denetim:" damgasi yerel saattir.
// Geri uyum (dil paketi, 2026-07-29): eski yazim "son kosu:" idi; eski KEEL surumuyle kurulmus
// bir projenin bekcisi hala onu yazabilir — ikisi de okunur, yoksa olcum sessizce kaybolur.
try {
  const s = readFileSync(process.env.KAPANIS_KOK + "/00_pano/SAGLIK.md", "utf8");
  const m = s.match(/son (?:denetim|koşu):\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
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
  SATIR="{\"surum\":3,\"ts\":\"$TS\",\"oturum\":null,\"neden\":null,\"rol\":$ROLJ,\"bekci\":\"$BEKCI\",\"blok\":\"$BLOK\",\"bekleyen_eklendi\":$EKLENDI,\"porcelain\":\"$PORCELAIN\",\"damga_yasi_dk\":null,\"sure_dk\":null,\"girdi_token\":null,\"cikti_token\":null,\"cache_okuma\":null,\"cache_yazma\":null,\"not\":\"node yok ya da cozumleyici oldu — daraltilmis meta\"}"
fi
printf '%s\n' "$SATIR" >> "$GUNLUK" 2>/dev/null || printf 'kapanis: gunluk yazilamadi (%s)\n' "$GUNLUK" >&2
exit 0
