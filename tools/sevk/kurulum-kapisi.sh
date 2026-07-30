#!/bin/bash
# kurulum-kapisi — kutu kurulumunun MEKANİK denetimi (E4; tasarım §5.2'nin makine tarafı).
# GENESIS'in G4.5 kapısıyla KARIŞTIRILMAZ: o, şablon aktarımını denetler (bir kez, kurulumda);
# bu, BİR KUTUNUN otonom döneme hazır olup olmadığını denetler (her kutu açılışında).
#
# Kullanım: kurulum-kapisi.sh <kutu-dizin-adı> [<kök>]
# Çıkış: 0 = mekanik kalemler YEŞİL · 1 = eksik var (stdout satır satır gerekçe)
# FAIL-CLOSED: betiğin kendi hatası da "eksik"tir (sessiz yeşil yok).
#
# Denetlediği (yargı gerektirmeyenler — gerisi kurulum-denetcisi koltuğunun işidir):
#   K3  duruş sözleşmesi dört satır dolu + BÜTÇE sayılı · bağımlılık/risk bloğu her görev için tam
#   K6  sahibin karar alanı hazır (karar-alani.sh) — D-25 ③ proje katmanı
#   K7  gerçek-veri işaret listesi dolu (boşsa BEYAN zorunlu: "Hat-1 yalnız jenerik desenle koşuyor")
#   +   her görevin sahibi kadroda kayıtlı · alt-ajan dosyalarında `memory:` alanı YOK
set -uo pipefail
export LC_ALL=C.UTF-8

SORUN=0
eksik() { printf 'EKSİK   · %s\n' "$1"; SORUN=1; }
gecti() { printf 'geçti   · %s\n' "$1"; }
trap 'printf "EKSİK   · kurulum kapısı kendi içinde durdu (satır %s) — fail-closed\n" "$LINENO"; exit 1' ERR

KUTU="${1:-}"
KOK="${2:-${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}}"
DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ -n "$KUTU" ] || { printf 'EKSİK   · kutu verilmedi (kullanım: kurulum-kapisi.sh <kutu> [kök])\n'; exit 1; }
KUTU="$(basename "$KUTU")"
KUTU_MD="$KOK/01_kutular/$KUTU/KUTU.md"
[ -f "$KUTU_MD" ] || { printf 'EKSİK   · kutu bulunamadı: 01_kutular/%s/KUTU.md\n' "$KUTU"; exit 1; }

[ -r "$DIZIN/ortak.sh" ] || { printf 'EKSİK   · ortak kitaplık yok (tools/sevk/ortak.sh)\n'; exit 1; }
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"
node_bul || { printf 'EKSİK   · node bulunamadı — mekanik denetim yapılamıyor (fail-closed)\n'; exit 1; }

# ── K3 · duruş sözleşmesi + bağımlılık/risk bloğu + kadro eşliği ───────────────────────────
RAPOR="$(K_KUTU="$KUTU_MD" K_KOK="$KOK" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const metin = readFileSync(process.env.K_KUTU, "utf8");
const KOK = process.env.K_KOK;
const satirlar = metin.split("\n");
const cik = [];
const blok = (baslik) => {
  const b = satirlar.findIndex((s) => new RegExp("^##\\s+" + baslik).test(s));
  if (b < 0) return null;
  const g = [];
  for (let i = b + 1; i < satirlar.length; i++) { if (/^##\s/.test(satirlar[i])) break; g.push(satirlar[i]); }
  return g.join("\n");
};

// Durus sozlesmesi: dort satir DOLU (bos deger ya da «alan» isareti gecmez).
const durus = blok("Duruş sözleşmesi");
if (durus === null) cik.push("EKSIK\tdurus sozlesmesi blogu yok (## Duruş sözleşmesi) — bitti tanimi yazilmamis kutu otonom doneme giremez (K-H)");
else {
  // LİSTE (Faz 2 sıra 5): VARSA değeri sevkin tanıdığı dize olmalı. Bu satır İKİ freni birden
  // taşır (şişme çapasının ertelenmesi + görev tavanının kadroya bağlanması) ve sevk yalnız TEK
  // dizeyi tanır; değeri sessizce değişirse kutu planlama kutusu olmaktan çıkar ve plan doğar
  // doğmaz yanlış şişme alarmı çalar. YOKLUK denetlenmez: sıradan kutuda satır zaten olmaz.
  if (durus !== null) {
    const l = durus.split("\n").find((x) => /^\s*LİSTE\s*:/.test(x));
    if (l && !/dönem\s+içinde\s+doğar/.test(l)) {
      cik.push("EKSIK\tLİSTE satiri sevkin tanidigi degeri tasimiyor (beklenen: dönem içinde doğar): " + l.trim().slice(0, 70));
    } else if (l) cik.push("GECTI\tLİSTE: planlama kutusu isareti gecerli");
  }
  for (const ad of ["BİTİŞ HÂLİ", "KANIT", "KISIT", "BÜTÇE"]) {
    const s = durus.split("\n").find((x) => new RegExp("^\\s*" + ad + "\\s*:").test(x));
    if (!s) { cik.push("EKSIK\tdurus sozlesmesi satiri yok: " + ad); continue; }
    const deger = s.replace(new RegExp("^\\s*" + ad + "\\s*:"), "").trim();
    if (!deger || deger.includes("«")) { cik.push("EKSIK\tdurus sozlesmesi satiri bos/doldurulmamis: " + ad); continue; }
    if (ad === "BÜTÇE" && !/\d/.test(deger)) { cik.push("EKSIK\tBÜTÇE satirinda sayi yok — donem basina kac alt-ajan cagrisi acilabilir yazilmali (K-G)"); continue; }
    cik.push("GECTI\tdurus: " + ad);
  }
}

// Gorev tablosu + bagimlilik/risk blogu eslesmesi
const gorevler = [];
for (const s of satirlar) {
  if (!/^\s*\|/.test(s)) continue;
  const h = s.split("|").map((x) => x.trim());
  if (h.length < 6 || !/^G-\d+$/.test(h[1])) continue;
  gorevler.push({ id: h[1], sahip: h[3] });
}
if (!gorevler.length) cik.push("EKSIK\tgorev tablosu okunamadi (G-NN satiri yok)");
const risk = blok("Bağımlılık ve risk");
if (risk === null) cik.push("EKSIK\tbagimlilik/risk blogu yok (## Bağımlılık ve risk) — sevk bagimlilik okuyamaz (OTONOM_DONEM §3)");
else {
  const kayitli = new Set();
  for (const s of risk.split("\n")) {
    const m = s.match(/^\s*(G-\d+)\s*:\s*onkosul=([^·]*)·\s*risk=(düşük|riskli)\s*—\s*(.+)$/);
    if (m) kayitli.add(m[1]);
    else if (/^\s*G-\d+\s*:/.test(s)) cik.push("EKSIK\trisk satiri bicimsiz: " + s.trim().slice(0, 70));
  }
  const yok = gorevler.filter((k) => !kayitli.has(k.id)).map((k) => k.id);
  if (yok.length) cik.push("EKSIK\tbagimlilik/risk satiri olmayan gorev(ler): " + yok.join(" "));
  else if (gorevler.length) cik.push("GECTI\tbagimlilik/risk blogu " + gorevler.length + " gorevin hepsini kapsiyor");
  // Onkosul cozulebilir mi (var olmayan goreve bagimlilik = kurulum kusuru)
  const idler = new Set(gorevler.map((k) => k.id));
  for (const s of risk.split("\n")) {
    const m = s.match(/^\s*(G-\d+)\s*:\s*onkosul=([^·]*)/);
    if (!m) continue;
    for (const o of (m[2].match(/G-\d+/g) || [])) {
      if (!idler.has(o)) cik.push("EKSIK\t" + m[1] + " var olmayan goreve bagimli: " + o);
      if (o === m[1]) cik.push("EKSIK\t" + m[1] + " kendine bagimli (dongusel onkosul)");
    }
  }
}

// Kadro esligi: her gorevin sahibi .claude/agents altinda kayitli olmali (sevk oyle sevk eder)
for (const k of gorevler) {
  if (!/^[a-z0-9_-]+$/.test(k.sahip || "")) { cik.push("EKSIK\t" + k.id + " sahip hucresi slug degil: " + JSON.stringify(k.sahip)); continue; }
  if (!existsSync(join(KOK, ".claude", "agents", k.sahip + ".md"))) cik.push("EKSIK\t" + k.id + " sahibi kadroda yok: .claude/agents/" + k.sahip + ".md");
}
for (const c of cik) console.log(c);
')" || { printf 'EKSİK   · kutu çözümleyicisi koşamadı (fail-closed)\n'; exit 1; }

while IFS= read -r SATIR; do
  [ -n "$SATIR" ] || continue
  ETIKET="${SATIR%%$'\t'*}"
  GOVDE="${SATIR#*$'\t'}"
  case "$ETIKET" in
    EKSIK) eksik "$GOVDE" ;;
    GECTI) gecti "$GOVDE" ;;
  esac
done <<EOF_RAPOR
$RAPOR
EOF_RAPOR

# ── Kural evi (otonom kipin kural dosyası kurulmuş mu) ─────────────────────────────────────
# Sevkin devir metni bu dosyayı işaretçi olarak gösterir; yoksa rol kuralı okuyamaz.
if [ -f "$KOK/02_kanon/OTONOM_DONEM.md" ]; then
  gecti "otonom kural evi yerinde (02_kanon/OTONOM_DONEM.md)"
else
  eksik "02_kanon/OTONOM_DONEM.md yok — otonom kipin kural evi kurulmamış (kalıp: 00_genesis/OTONOM_DONEM_KALIBI.md, elle kopyalanır)"
fi

# ── K6 · sahibin karar alanı (D-25 ③ proje katmanı) ────────────────────────────────────────
if [ -r "$DIZIN/karar-alani.sh" ]; then
  KANAL="$(bash "$DIZIN/karar-alani.sh" "$KOK" 2>/dev/null | head -n1 || true)"
else
  KANAL="HAZIR DEĞİL · tools/sevk/karar-alani.sh yok"
fi
if [ "$KANAL" = "HAZIR" ]; then gecti "karar alanı hazır (soru kanalı açık)"; else eksik "karar alanı: $KANAL"; fi

# ── K7 · gerçek-veri işaret listesi ────────────────────────────────────────────────────────
ISARET="$KOK/tools/guard/gercek-veri-isaretleri.txt"
if [ ! -f "$ISARET" ]; then
  eksik "gerçek-veri işaret listesi yok (tools/guard/gercek-veri-isaretleri.txt) — Hat-1 tanımsız"
else
  DOLU="$(grep -cv '^[[:space:]]*\(#.*\)\?$' "$ISARET" || true)"
  if [ "${DOLU:-0}" -gt 0 ]; then
    gecti "gerçek-veri işaret listesi dolu ($DOLU girdi)"
  else
    # Boşluk KIRMIZI değildir ama BEYAN ister (tasarım §5.2 kalem 7): mühür paketine yazılır.
    gecti "gerçek-veri işaret listesi BOŞ — BEYAN zorunlu: Hat-1 yalnız jenerik desenle koşuyor (TCKN/IBAN/kart)"
  fi
fi

# ── memory yasağı (tasarım §2.3 — zorunlu unutmanın ölüm noktası) ──────────────────────────
MEM=""
for A in "$KOK"/.claude/agents/*.md; do
  [ -f "$A" ] || continue
  if grep -qE '^[[:space:]]*memory[[:space:]]*:' "$A"; then MEM="$MEM $(basename "$A")"; fi
done
if [ -n "$MEM" ]; then eksik "alt-ajan dosyasında memory alanı VAR:$MEM — roller arası zorunlu unutma delinir"; else gecti "memory yasağı (alt-ajan dosyaları temiz)"; fi

if [ "$SORUN" -eq 0 ]; then
  printf 'SONUÇ: MEKANİK KALEMLER YEŞİL — yargı kalemleri kurulum denetçisinin (izlenebilirlik matrisi · çapa içeriği · lokma boyu · risk gözden geçirme)\n'
  exit 0
fi
printf 'SONUÇ: EKSİK — kutu bu hâliyle otonom döneme giremez (tasarım §5.2)\n'
exit 1
