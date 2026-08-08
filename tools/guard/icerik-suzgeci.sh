#!/bin/bash
# icerik-suzgeci — ORTAK içerik süzgeci (E2, önleme Hat-1). Yazıma giden İÇERİĞİ ADI KONMUŞ
# desenlere tarar. KAPSAM BU LİSTEDİR, "her sır" DEĞİL (U37 — ilan kapsamı adıyla söyler):
#   · TCKN (çift kontrol-hanesi) · TR IBAN (mod-97) · kart (Luhn, 15-16 hane, ilk hane 2-6)
#   · API anahtarı: sk-… · gh[pousr]_… · AKIA… · AIza… · xox[baprs]-…   [sınıf: api-anahtari]
#   · JWT jetonu (üç parçalı eyJ…eyJ…)                                   [sınıf: jeton]
#   · PEM özel anahtar başlığı                                           [sınıf: ozel-anahtar]
#   · gerçek-veri işaret listesi (tools/guard/gercek-veri-isaretleri.txt — birebir bayt)
# LİSTE DIŞI bir sır bu kapıdan GEÇER: sağlayıcı öneki taşımayan anahtarlar, parola dizeleri ve
# genel "yüksek entropili dize" avı BİLEREK yoktur — bu süzgeç her araç çağrısında koşar ve bir
# yanlış-pozitif meşru işi durdurur. Kapsamı genişletmek desen eklemektir, ilanı değiştirmek değil.
# Çağıranlar: file-guard.sh (yazım-öncesi, bugün) · haber betiği (gönderim-öncesi, E5).
# Kipler: --arac-json (stdin=PreToolUse araç JSON'u; Edit new_string / MultiEdit edits[].new_string /
#         Write content / NotebookEdit new_source / Bash command[yalnız yazım-kalıplıysa]) ·
#         --metin (stdin=düz metin) · --dosya <yol>.
# Çıkış sözleşmesi: 0 = temiz · 3 = eşleşme (stdout: ESLESME<TAB>sınıf<TAB>konum) · diğer = hata
# (fail-closed ÇAĞIRANDADIR: file-guard 3'ü de 0/3-dışını da ENGEL'e çevirir).
# DEĞER SIZDIRMAMA (E1 §4.1 dersi): eşleşen DEĞER hiçbir kanala yazılmaz — yalnız sınıf + konum.
# Bu betikte ve testlerde ÖRNEK GERÇEKÇİ DEĞER BULUNMAZ (test değerleri checksum kuralından
# üretilir): kapı redi alan ajan koruma betiğini OKUYOR (E1 ölçümü) — betikteki örnek değer
# desen-tabanlı gözleri kirletir, engel metnindeki değer transkripte sızardı.
# Bilinen sınır: desen-kaçırma (değişkende saklama, base64, parça birleştirme) süzgeçten kaçar —
# üç hattın İLKİdir (OTONOM_DONEM §7: otonom dönemde Bash'le dosya yazımı zaten bulgudur).
set -euo pipefail
export LC_ALL=C.UTF-8

hata() { printf 'icerik-suzgeci HATA: %s\n' "$1" >&2; exit 1; }

KIP="${1:-}"
case "$KIP" in
  --arac-json|--metin|--mcp-json) [ $# -eq 1 ] || hata "bu kip ek argüman almaz" ;;
  --dosya) [ $# -eq 2 ] || hata "--dosya <yol> ister"; [ -r "$2" ] || hata "dosya okunamadı: $2" ;;
  *) hata "kip gerekli: --arac-json | --mcp-json | --metin | --dosya <yol>" ;;
esac

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ISARET="$KOK/tools/guard/gercek-veri-isaretleri.txt"
# Yazım-kalıbı tanımının TEK EVİ (U59 · U65). Okunamazsa FAIL-CLOSED: "ölçemedim" ile "temiz"
# ayrı şeydir ve çağıran (file-guard) 0/3 dışını ENGEL'e çevirir.
YK_YOL="$KOK/tools/guard/yazim-kalibi.txt"
[ -r "$YK_YOL" ] || hata "yazım-kalıbı tanımı okunamadı: $YK_YOL — Bash yazım kalıbı ölçülemez (çağıran fail-closed davranmalı)"

# node keşfi (file-guard ailesiyle aynı: GUI oturumunda PATH dar olabilir)
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi
[ -n "$NODE_BIN" ] || hata "node bulunamadı — tarama yapılamıyor (çağıran fail-closed davranmalı)"

if [ "$KIP" = "--dosya" ]; then
  GIRDI_YOLU="$2"
  [ -f "$ISARET" ] || printf 'icerik-suzgeci: işaret listesi yok/boş — yalnız jenerik desenlerle tarandı\n' >&2
else
  GIRDI_YOLU="-"
fi

SONUC=0
SZ_KIP="$KIP" SZ_ISARET="$ISARET" SZ_GIRDI="$GIRDI_YOLU" SZ_YK="$YK_YOL" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";

const KIP = process.env.SZ_KIP;
const ISARET_YOL = process.env.SZ_ISARET;
const GIRDI_YOLU = process.env.SZ_GIRDI;

// Yazim-kalibi tanimi TEK EVDEN okunur (U59 · U65): tools/guard/yazim-kalibi.txt. Ayni dosyayi
// file-guard.sh de okur. Eksik/bozuk anahtar FAIL-CLOSED: cozulemeyen tanimla "temiz" denmez.
const yk = (() => {
  const h = {};
  for (const satirHam of readFileSync(process.env.SZ_YK, "utf8").split("\n")) {
    const satir = satirHam.replace(/\r$/, "");
    if (!satir.trim() || satir.trimStart().startsWith("#")) continue;
    const i = satir.indexOf("=");
    if (i > 0) h[satir.slice(0, i).trim()] = satir.slice(i + 1);
  }
  for (const a of ["BOLUT_AYRAC", "ANAHTAR_SOZCUK", "SARMALAYICI", "YONLENDIRME", "HEREDOC", "FIIL", "FIIL_BAYRAKLI"])
    if (!h[a]) { console.error("icerik-suzgeci HATA: yazim-kalibi.txt eksik anahtar: " + a); process.exit(1); }
  return h;
})();

const ham = GIRDI_YOLU === "-" ? readFileSync(0, "utf8") : readFileSync(GIRDI_YOLU, "utf8");

// ---- taranacak (konum, metin) çiftleri ----
const parcalar = [];
if (KIP === "--arac-json") {
  let j; try { j = JSON.parse(ham); } catch { console.error("icerik-suzgeci HATA: arac JSON cozulemedi"); process.exit(1); }
  const ad = String(j.tool_name || "");
  const ti = j.tool_input || {};
  if (ad === "Edit" && typeof ti.new_string === "string") parcalar.push(["Edit.new_string", ti.new_string]);
  if (ad === "MultiEdit" && Array.isArray(ti.edits))
    ti.edits.forEach((e, i) => { if (e && typeof e.new_string === "string") parcalar.push(["MultiEdit.edits[" + i + "]", e.new_string]); });
  if (ad === "Write" && typeof ti.content === "string") parcalar.push(["Write.content", ti.content]);
  if (ad === "NotebookEdit" && typeof ti.new_source === "string") parcalar.push(["NotebookEdit.new_source", ti.new_source]);
  if (ad === "Bash" && typeof ti.command === "string") {
    // Bash yalniz YAZIM-KALIPLI ise taranir (tasarim §3). TANIM BURADA DEGIL, tek evdedir:
    // tools/guard/yazim-kalibi.txt — file-guard SOR-YAZIM dikisi de AYNI dosyadan okur.
    // Eskiden tanim iki yerde elle yaziliydi ve iki dosya da "ayni" diye ILAN ediyordu (U59).
    const k = ti.command;
    const temiz = k.replace(/[0-9]*>>?\s*\/dev\/null/g, "").replace(/[0-9]*>&[0-9-]*/g, "");
    const yonlendirme = new RegExp(yk.YONLENDIRME).test(temiz);
    const heredoc = new RegExp(yk.HEREDOC).test(k);
    const [fbAd, fbDesen] = yk.FIIL_BAYRAKLI.split(":");
    const fiil = k.split(new RegExp(yk.BOLUT_AYRAC)).some((s) => {
      const t = s.trim()
        .replace(new RegExp("^(?:" + yk.ANAHTAR_SOZCUK + ")\\s+"), "")
        .replace(/^((?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+)/, "")
        .replace(new RegExp("^(?:" + yk.SARMALAYICI + ")\\s+(?:-\\S+\\s+)*"), "");
      const ad2 = ((t.match(/^(\S+)/) || [])[1] || "").split("/").pop();
      const kuyruk = t.replace(/^\S+\s*/, "");
      return new RegExp("^(?:" + yk.FIIL + ")$").test(ad2) || (ad2 === fbAd && new RegExp(fbDesen).test(kuyruk));
    });
    if (yonlendirme || heredoc || fiil) parcalar.push(["Bash.command", k]);
  }
} else if (KIP === "--mcp-json") {
  // MCP kanali (E2 hasim bulgusu — "her kipte keser" beyani MCPyi de kapsamali): tool_input
  // altindaki TUM dize degerleri (ic ice dizi/nesne dahil) toplanir ve taranir; MCP yazmalari
  // da icerik-fail-closed olur. Konum tool_input yolu olarak raporlanir (deger sizdirilmaz).
  let j; try { j = JSON.parse(ham); } catch { console.error("icerik-suzgeci HATA: mcp JSON cozulemedi"); process.exit(1); }
  const yur = (deger, yol) => {
    if (typeof deger === "string") { if (deger) parcalar.push(["mcp:" + (yol || "tool_input"), deger]); return; }
    if (Array.isArray(deger)) { deger.forEach((d, i) => yur(d, yol + "[" + i + "]")); return; }
    if (deger && typeof deger === "object") { for (const kk of Object.keys(deger)) yur(deger[kk], yol ? yol + "." + kk : kk); }
  };
  yur(j.tool_input || {}, "");
} else {
  parcalar.push([KIP === "--dosya" ? "dosya" : "metin", ham]);
}
if (!parcalar.length) process.exit(0);

// ---- desen sinifi dogrulayicilari (ORNEK DEGER YOK — yalniz kural) ----
function tcknMi(s) { // 11 hane, ilk hane 0 degil, cift kontrol-hanesi
  const d = s.split("").map(Number);
  const t10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  const t11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return (t10 + 10) % 10 === d[9] && t11 === d[10];
}
function ibanMi(s) { // TR + 24 hane, mod-97 == 1 (ISO 7064)
  const duz = s.replace(/[ -]/g, "");
  if (!/^TR\d{24}$/.test(duz)) return false;
  const cevrik = duz.slice(4) + "2927" + duz.slice(2, 4); // T=29 R=27
  let m = 0n;
  for (const ch of cevrik) m = (m * 10n + BigInt(ch)) % 97n;
  return m === 1n;
}
// U37 · Anahtar/jeton desenleri: her biri SAGLAYICI ONEKI ya da yapisal cerceve tasir; hicbiri
// "uzun rastgele dize" avi degildir. Kaynakta ORNEK DEGER YOK — desenin kendisi de kendine
// uymaz (onekten hemen sonra `[` gelir, sinif disi karakter).
const ANAHTAR_DESENLERI = [
  [/(?<![A-Za-z0-9])sk-[A-Za-z0-9_-]{20,}/g, "api-anahtari"],                    // OpenAI / Anthropic
  [/(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{36}(?![A-Za-z0-9])/g, "api-anahtari"], // GitHub
  [/(?<![A-Za-z0-9])AKIA[0-9A-Z]{16}(?![A-Za-z0-9])/g, "api-anahtari"],          // AWS erisim kimligi
  [/(?<![A-Za-z0-9])AIza[0-9A-Za-z_-]{35}(?![A-Za-z0-9])/g, "api-anahtari"],     // Google
  [/(?<![A-Za-z0-9])xox[baprs]-[0-9A-Za-z-]{10,}/g, "api-anahtari"],             // Slack
  [/(?<![A-Za-z0-9])eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "jeton"], // JWT
  [/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/g, "ozel-anahtar"],                  // PEM ozel anahtar
];

function luhnMi(s) {
  const d = s.split("").map(Number).reverse();
  let top = 0;
  for (let i = 0; i < d.length; i++) { let x = d[i]; if (i % 2 === 1) { x *= 2; if (x > 9) x -= 9; } top += x; }
  return top % 10 === 0;
}

const bulunan = []; // [sinif, konum]
for (const [konum, metin] of parcalar) {
  for (const es of metin.matchAll(/(?<![0-9])[1-9][0-9]{10}(?![0-9])/g))
    if (tcknMi(es[0])) { bulunan.push(["tckn", konum]); break; }
  for (const es of metin.matchAll(/(?<![A-Z0-9])TR[0-9]{2}(?:[ -]?[0-9]){22}(?![0-9])/g))
    if (ibanMi(es[0])) { bulunan.push(["iban", konum]); break; }
  // kart adaylari: bitisik 15-16 hane YA DA tutarli tek ayracla 4-4-4-4 / 4-6-5 gruplama
  // (gevsek "her aralikli dizi" adayligi sayi tablolarinda yanlis-pozitif uretirdi — dar tutuldu)
  // U64 · ILK HANE SINIFI [2-6]. Eskiden [3-6] idi ve Mastercardin 2-serisi (222100-272099,
  // 2017den beri CANLI bir BIN araligi) Luhn-gecerli olsa bile TEMIZ geciyordu — bitisik de,
  // 4-4-4-4 gruplu da. Yanlis-pozitif freni degismedi: Luhn + 15-16 hane yerinde.
  const kartAdaylari = [
    /(?<![0-9])[2-6][0-9]{14,15}(?![0-9])/g,
    /(?<![0-9])[2-6][0-9]{3}([ -])[0-9]{4}\1[0-9]{4}\1[0-9]{4}(?![0-9])/g,
    /(?<![0-9])3[0-9]{3}([ -])[0-9]{6}\1[0-9]{5}(?![0-9])/g,
  ];
  let kartVar = false;
  for (const re of kartAdaylari) {
    for (const es of metin.matchAll(re)) {
      const duz = es[0].replace(/[ -]/g, "");
      if ((duz.length === 15 || duz.length === 16) && luhnMi(duz)) { kartVar = true; break; }
    }
    if (kartVar) break;
  }
  if (kartVar) bulunan.push(["kart", konum]);
  // ── U37 · ANAHTAR ve JETON SINIFLARI ────────────────────────────────────────────────
  // TCKN/IBAN/kart KISISEL VERIdir; API anahtari ve jeton AYRI bir sinifitir ve bu suzgecte
  // HIC YOKTU. Olculdu: sk-… · ghp_… · JWT uctan uca TEMIZ geciyordu, oysa engel metni
  // kapsamini "sir" diye GENELLIYORDU — ilan gercekten genis, uygulama dardi (Kok 4).
  // Desenler DAR ve SAGLAYICI-ONEKLIDIR: bu suzgec HER arac cagrisinda kosar ve bir
  // yanlis-pozitif mesru isi durdurur. Genel "yuksek entropili dize" avi BILEREK YOKTUR;
  // sinir dosyanin basinda ILAN EDILIR — kapsam bu listedir, "her sir" degil.
  for (const [re, sinif] of ANAHTAR_DESENLERI) {
    if (re.test(metin)) bulunan.push([sinif, konum]);
    re.lastIndex = 0;                       // /g durumlu: sonraki parcaya temiz girilir
  }
  // isaret listesi: birebir BAYT eslesmesi (harf donusumu YOK); # yorum; <4 karakter yok sayilir
  if (ISARET_YOL && existsSync(ISARET_YOL)) {
    for (const satirHam of readFileSync(ISARET_YOL, "utf8").split("\n")) {
      const satir = satirHam.replace(/\r$/, "");
      if (!satir || satir.trimStart().startsWith("#") || satir.length < 4) continue;
      if (metin.includes(satir)) { bulunan.push(["isaret", konum]); break; }
    }
  }
}

if (!bulunan.length) process.exit(0);
const tekil = [...new Set(bulunan.map((b) => b.join("\t")))];
for (const b of tekil) console.log("ESLESME\t" + b);
process.exit(3);
' || SONUC=$?
exit "$SONUC"
