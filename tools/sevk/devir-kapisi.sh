#!/bin/bash
# devir-kapisi — alt-ajan çağrısının PreToolUse kapısı (E4; matcher "Task|Agent").
# Model-aracılı halkanın ÇAĞRI ucu (tasarım §2.2): sevkin kararı deterministiktir ama alt-ajanı
# fiilen açan ana-oturum modelidir. Bu kapı o halkayı iki yerden denetler:
#   (1) ŞEMA — devir metni YALNIZ işaretçi taşır (13 no'lu raporun 2. sızıntı yaması)
#   (2) TALİMAT↔FİİL — (rol, görev) ikilisi günlükteki AÇIK bir sevk-kararıyla eşleşmeli
#       ⇒ sevkin hiç açmadığı dönem ile İÇ İÇE alt-ajan (E0 yan bulgu 2) aynı kapıda durur
#   (3) memory sızıntısı — zorunlu unutmanın ölüm noktası (tasarım §2.3)
#
# YALNIZ dönem-AÇIK iken çalışır: el-sürüşlü oturumda alt-ajan çağrısı HİÇ etkilenmez.
# Çıkış: exit 2 = ENGEL (stderr gerekçe modele ulaşır) · exit 0 = serbest.
# FAIL-CLOSED: dönem açıkken girdi/node çözülemezse ENGEL (denetimsiz devir yok).
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"

# En ucuz eleme: dönem yoksa bu kanca yok hükmünde.
[ -e "$DIZIN/.donem-acik" ] || exit 0

engel() { printf 'devir-kapisi ENGEL: %s\n' "$1" >&2; exit 2; }

[ -r "$DIZIN/ortak.sh" ] || engel "ortak kitaplık yok (tools/sevk/ortak.sh) — devir denetlenemiyor (fail-closed)"
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

trap 'engel "devir kapısı kendi içinde durdu (satır $LINENO) — fail-closed"' ERR

GIRDI="$(cat 2>/dev/null || true)"
DONEM_RC=0; donem_oku "$KOK" || DONEM_RC=$?
[ "$DONEM_RC" != "2" ] || engel "dönem göstergesi bozuk: ${DONEM_HATA} — devir eşleştirmesi yapılamıyor (fail-closed)"
[ "$DONEM_RC" = "0" ] || exit 0

# ── DUR · HAT-1: FRENLEME (E5) ────────────────────────────────────────────────────────────
# Tasarım §7.3 "DUR yoklaması SubagentStop kancasındadır (birincil)" diyordu; mekaniği yazarken
# düzeltildi (tasarı §4). SubagentStop dönemi DURDURAMAZ — çıkışı yalnız alt-ajanın dönüşüne
# etki eder. DUR ile Stop arasındaki gerçek boşluk şudur: alt-ajan döndükten sonra ana model,
# Stop'a hiç varmadan YENİ bir alt-ajan açabilir. İşin yayılmasını fiilen durduran tek nokta
# çağrının önündeki bu kapıdır. (Hat-2 = SubagentStop teyit+haber · Hat-3 = sevkin kapatması.)
# Beyan: DUR koşmakta olan alt-ajanı KESMEZ — en geç o görev bittiğinde işler.
if [ -e "$DIZIN/.dur" ]; then
  DUR_SEBEP="$(head -n1 "$DIZIN/.dur" 2>/dev/null || true)"
  engel "DUR işareti var (tools/sevk/.dur): ${DUR_SEBEP:-sebep yazılmamış}. Yeni alt-ajan AÇILMAZ; uçuştaki görev bitince dönem kapanır. Sahibin freni ancak yine sahibin eliyle kalkar."
fi

node_bul || engel "node bulunamadı — devir şeması denetlenemiyor (fail-closed)"

KARAR="$(printf '%s' "$GIRDI" | D_KOK="$KOK" D_DONEM="$DONEM_ID" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const KOK = process.env.D_KOK || ".";
const DONEM = process.env.D_DONEM || "";
const bitir = (kod, sebep) => { console.log(kod + "\t" + (sebep || "")); process.exit(0); };

let g = {};
try { g = JSON.parse(readFileSync(0, "utf8")); } catch { bitir("ENGEL", "cagri JSON cozulemedi (fail-closed)"); }

const arac = String(g.tool_name || "");
if (arac !== "Task" && arac !== "Agent") bitir("GEC", "");   // matcher genis olabilir; daraltma burada

const ti = g.tool_input || {};
const rol = String(ti.subagent_type || "");
const metin = String(ti.prompt || "");

// (3) memory sizintisi — cagrinin HERHANGI bir yerinde
if (/\bmemory\b/i.test(JSON.stringify(ti))) {
  bitir("ENGEL", "alt-ajan cagrisinda memory alani gecemez — roller arasi zorunlu unutma bu tasarimin en eski korunani (OTONOM_DONEM §1). Devir metni yalniz isaretci tasir.");
}

if (!rol) bitir("ENGEL", "subagent_type bos — otonom donemde her gorev KAYITLI bir koltugun cagrisidir");
if (!/^[a-z0-9_-]+$/.test(rol)) bitir("ENGEL", "subagent_type slug bicimli degil: " + rol);

// (1) SEMA — her bos-olmayan satir "<anahtar>: <deger>" ve anahtar beyaz listede.
const TAVAN = 800;
const bayt = Buffer.byteLength(metin, "utf8");
if (bayt > TAVAN) {
  bitir("ENGEL", "devir metni tavani asiyor (" + bayt + " B > " + TAVAN + " B) — devir ISARETCI tasir, IS ANLATMAZ; rol isini KUTU.mdden okur");
}
const ANAHTARLAR = new Set(["görev", "gorev", "kutu", "sözleşme", "sozlesme", "kural", "ek-okuma"]);
const alanlar = {};
for (const ham of metin.split("\n")) {
  const s = ham.trim();
  if (!s) continue;
  const m = s.match(/^([^:]{1,20}):\s*(.*)$/);
  if (!m || !ANAHTARLAR.has(m[1].trim())) {
    bitir("ENGEL", "devir metninde sema disi satir: " + JSON.stringify(s.slice(0, 80)) +
      " — izinli anahtarlar: gorev · kutu · sozlesme · kural · ek-okuma. Serbest metin YASAK (sevk talimatini AYNEN gecir).");
  }
  const ad = m[1].trim().replace("görev", "gorev").replace("sözleşme", "sozlesme");
  if (!(ad in alanlar)) alanlar[ad] = m[2].trim();
}
// BRIFING (F1-5c): dis goz koltugu is zincirinin disindadir, gorev almaz — kapanis evresinde
// sevkin actigi tek islem onun brifingidir ve jetonu budur (KURULUM/KAPANIS emsali).
const gorevEs = String(alanlar.gorev || "").match(/^(G-\d+|KURULUM|KAPANIS|BRIFING)$/);
if (!gorevEs) {
  bitir("ENGEL", "devir metninde gorev satiri yok ya da cozulmuyor — «gorev: G-NN» zorunlu (talimat-fiil dikisi buna baglanir)");
}
const gorev = gorevEs[1];

// ISARETCI COZULMELI (T4b canli olcumu): kopuk isaretci tasiyan devir, role yalan soyler ve
// dogrulayici bunu KIRMIZI yazar. Kanit isaretcisiyle AYNI dar kural: yalniz bilinen kok
// dizinlerinden baslayan yollar denetlenir.
for (const [ad, deger] of Object.entries(alanlar)) {
  if (ad === "gorev") continue;
  for (const yol of String(deger).split(/\s+/)) {
    if (!/^(00_pano|01_kutular|02_kanon|03_roller|00_genesis|tools|\.claude)\//.test(yol)) continue;
    if (!existsSync(join(KOK, yol.replace(/:[0-9][0-9,\-]*$/, "")))) {
      bitir("ENGEL", "devir isaretcisi kopuk (" + ad + "): " + yol + " — devir metni yalniz VAR OLAN dosyalari gosterir; sevk talimatini AYNEN gecir");
    }
  }
}

// (2) TALIMAT-FIIL — acik sevk-karari eslesmesi
const gy = join(KOK, "00_pano", "zarf-gunlugu.jsonl");
if (!existsSync(gy)) {
  bitir("ENGEL", "zarf gunlugu yok — sevk karari dogrulanamiyor; donem icinde alt-ajan yalniz sevk talimatiyla acilir (fail-closed)");
}
// ACIK karar = verilmis ama HENUZ TUKETILMEMIS karar (hasim bulgusu: tasari "AÇIK bir
// sevk-karar" diyordu, kod yalnizca "bir kere eslesti mi" diye bakiyordu — donusu gelmis bir
// gorev sinirsiz kez yeniden acilabiliyordu ve butce freni gercek alt-ajan sayisini kacirtiyordu).
// Tuketim IKI kanaldan sayilir, MAX alinir (cift sayim yok): (a) zarf kaydi BİTEN goreviyle;
// (b) hukum kaydi (karne / catal-suzgec) hukmun KONUSU olan gorevle — hukum koltuklarinin
// BİTEN gorevi kendi cagrisini anlatir, sevkin actigi gorevi degil.
let hicVar = false;
const gorulen = [];
const karar = {}, zarfS = {}, hukumS = {};
for (const l of readFileSync(gy, "utf8").split("\n")) {
  if (!l.trim()) continue;
  let j; try { j = JSON.parse(l); } catch { continue; }
  if (j.donem !== DONEM) continue;
  if (j.tip === "sevk-karar") {
    hicVar = true; gorulen.push(String(j.rol) + "/" + String(j.gorev));
    const a = String(j.rol) + " " + String(j.gorev); karar[a] = (karar[a] || 0) + 1;
  } else if (j.tip === "zarf") {
    const a = String(j.ajan) + " " + String(j.gorev); zarfS[a] = (zarfS[a] || 0) + 1;
  } else if (j.tip === "karne" || j.tip === "catal-suzgec") {
    const a = String(j.ajan) + " " + String(j.gorev); hukumS[a] = (hukumS[a] || 0) + 1;
  }
}
const bu = rol + " " + gorev;
const tuketim = Math.max(zarfS[bu] || 0, hukumS[bu] || 0);
if (!((karar[bu] || 0) > tuketim)) {
  bitir("ENGEL", (karar[bu] ? "sevk karari TUKETILMIS: (" : "sevkin acmadigi donem: (") + rol + " · " + gorev + ")" +
    (hicVar ? " — bu donemdeki sevk kararlari: " + gorulen.slice(-4).join(", ") : " — bu donemde henuz hic sevk karari yok") +
    ". Otonom donemde alt-ajani SEVK secer; ic ice alt-ajan, talimat disi cagri ve bitmis gorevin yeniden acilmasi bu kapida durur (tasarim §2.2).");
}
bitir("GEC", rol + " · " + gorev + " · " + bayt + "B");
')" || engel "devir çözümleyicisi koşamadı (fail-closed)"

DURUM="${KARAR%%$'\t'*}"
SEBEP="${KARAR#*$'\t'}"

if [ "$DURUM" = "ENGEL" ]; then
  # İz: sapma sessiz kalmaz (dış göz ve doğrulayıcı bu cinsi okur).
  J_tip=bulgu J_donem="$DONEM_ID" J_cins=dikis-sapma J_detay="$SEBEP" \
    json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
  engel "$SEBEP"
fi

# Geçen devir de izlidir (talimat↔fiil eşleşmesinin pozitif kanıtı — T4d günlükten sayılır).
J_tip=devir J_donem="$DONEM_ID" J_sonuc=gecti J_detay="$SEBEP" \
  json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
exit 0
