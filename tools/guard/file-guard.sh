#!/bin/bash
# file-guard — araç-kancası (PreToolUse): korunan yollara YAZMA araçlarını (Edit/MultiEdit/Write/NotebookEdit) mekanik keser.
# Koruma YAZMAYA karşıdır — okuma/komut araçlarına hiç karışmaz (Faz-1 demo dersi: aksi, oturumu kullanılmaz kılar).
# Matcher GENİŞ (*), daraltma bu script'in içinde (anayasa m.5).
# Girdi: stdin'de Claude Code araç JSON'u. Çıkış sözleşmesi:
#   exit 2                = ENGEL ([SERT]; stderr'daki gerekçe ajana döner)
#   exit 0 + JSON çıktı   = SAHİBE SOR ([SORULUR]; permissionDecision "ask")
#   exit 0, çıktısız      = serbest (yazma-dışı araç ya da korunmayan yol — karar verme, karışma)
# Fail-closed: script kendi içinde hata verirse YAZMA işlemi ENGELLENİR (sessiz YEŞİL yok); yazma-dışı akış etkilenmez.
# Türkçe harf güvenliği: eşleştirme BİREBİR bayttır; kanca hiçbir harf dönüşümü yapmaz.
set -euo pipefail
shopt -s nullglob
export LC_ALL=C.UTF-8

engel() { printf 'file-guard ENGEL: %s\n' "$1" >&2; exit 2; }
trap 'engel "ic hata (fail-closed): kanca beklenmedik durdu; islem guvenli tarafta engellendi. Bakim: tools/guard/README.md"' ERR

INPUT="$(cat)"

# Ucuz ön-eleme (node gerekmeden): girdide yazma-aracı adı hiç geçmiyorsa bu çağrı konumuz değil.
# (Kesin araç-adı kontrolü aşağıda node içinde yapılır; burası yalnız gereksiz node koşusunu keser.)
case "$INPUT" in
  *'"Edit"'*|*'"MultiEdit"'*|*'"Write"'*|*'"NotebookEdit"'*) : ;;
  *) exit 0 ;;
esac

# node keşfi — GUI'den açılan oturumlarda PATH dardır (Homebrew yolları görünmez; Faz-1 demo bulgusu, 2026-07-13):
# önce PATH, sonra bilinen mutlak adaylar (keg-only Homebrew dahil).
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  engel "node bulunamadı — kanca karar veremiyor; GÜVENLİ taraf: yalnız BU YAZMA işlemi engellendi (okuma ve komutlar serbest). Çözüm: node kur (kokpit de istiyor). Bakım: tools/guard/README.md"
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
LIST="$ROOT/tools/guard/korunan-yollar.txt"
[ -r "$LIST" ] || engel "korunan-yollar.txt okunamadı ($LIST) — koruma tanımsız (fail-closed)"

KARAR="$(printf '%s' "$INPUT" | GUARD_ROOT="$ROOT" GUARD_LIST="$LIST" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";

// Diskin gercek yazimina coz: var olan en derin ataya kadar in, realpath al, kalani ekle.
// Bu case-folding DEGILDIR — kanca harf donusumu yapmaz, diskin tek-gercegine teslim olur.
function kanonik(p) {
  let govde = p; const kuyruk = [];
  while (!existsSync(govde)) {
    const ust = dirname(govde);
    if (ust === govde) break;
    kuyruk.unshift(govde.slice(ust.length + 1));
    govde = ust;
  }
  let gercek = govde;
  try { gercek = realpathSync.native(govde); } catch {}
  return kuyruk.length ? join(gercek, ...kuyruk) : gercek;
}

const ROOT = kanonik(resolve(process.env.GUARD_ROOT));
let j;
try { j = JSON.parse(readFileSync(0, "utf8")); } catch { console.log("HATA\tstdin JSON cozulemedi"); process.exit(0); }

// KESIN daraltma: koruma yalniz YAZMA araclarina karsi. Okuma (Read vb.) ve komut araclari
// dosya-yolu tasisa bile serbesttir; taninmayan yeni yazma araclarini ikinci hat (bekci) izler.
const YAZMA = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
if (!YAZMA.has(j.tool_name || "")) { console.log("GEC"); process.exit(0); }

const ti = j.tool_input || {};
const ham = ti.file_path || ti.notebook_path || "";
if (!ham) { console.log("GEC"); process.exit(0); }
const hedef = kanonik(resolve(ROOT, ham));

// Liste: satir basina bir yol; sondaki "/" = dizin-oneki; "#" ile baslayan satir yorum;
// "[SERT]" / "[SORULUR]" bolum basligi. Eslesme birebir bayt — harf donusumu YOK.
let bolum = "";
const kurallar = [];
for (const satirHam of readFileSync(process.env.GUARD_LIST, "utf8").split("\n")) {
  const satir = satirHam.replace(/\r$/, "").trimEnd();
  if (!satir || satir.trimStart().startsWith("#")) continue;
  if (satir === "[SERT]" || satir === "[SORULUR]") { bolum = satir; continue; }
  if (!bolum) { console.log("HATA\tkorunan-yollar.txt: bolum basligi oncesi kayit"); process.exit(0); }
  kurallar.push({ bolum, yol: satir });
}
if (kurallar.length === 0) { console.log("HATA\tkorunan-yollar.txt bos — koruma tanimsiz"); process.exit(0); }

const eslesir = (k) => {
  const dizin = k.yol.endsWith("/");
  const tam = kanonik(resolve(ROOT, dizin ? k.yol.slice(0, -1) : k.yol));
  return hedef === tam || (dizin && hedef.startsWith(tam + sep));
};
const altinda = (dizinYolu) => {
  const tam = kanonik(resolve(ROOT, dizinYolu));
  return hedef === tam || hedef.startsWith(tam + sep);
};

const kurulumSuruyor = !existsSync(resolve(ROOT, ".kurulum-tamam"));
const sert = kurallar.find((k) => k.bolum === "[SERT]" && eslesir(k));
if (sert) {
  if (kurulumSuruyor) {
    // Cekirdekli istisna: kurulum surerken yalniz tools/guard/ + .claude/ sert kalir;
    // onun icinde de korunan-yollar.txt yazilabilir (GENESIS veri doldurur).
    const cekirdekte = altinda("tools/guard") || altinda(".claude");
    const listeDosyasi = hedef === kanonik(resolve(ROOT, "tools/guard/korunan-yollar.txt"));
    if (!cekirdekte || listeDosyasi) { console.log("GEC"); process.exit(0); }
  }
  console.log("ENGEL\t" + sert.yol); process.exit(0);
}
const sor = kurallar.find((k) => k.bolum === "[SORULUR]" && eslesir(k));
if (sor) { console.log(kurulumSuruyor ? "GEC" : "SOR\t" + sor.yol); process.exit(0); }
console.log("GEC");
')" || engel "yol çözümleyici koşamadı (fail-closed)"

DURUM="${KARAR%%$'\t'*}"
DETAY="${KARAR#*$'\t'}"

case "$DURUM" in
  GEC) exit 0 ;;
  ENGEL)
    engel "bu yol korumalı ([SERT] sınıfı: $DETAY). Kilitli karar / guard dosyaları oturum içinde DEĞİŞTİRİLMEZ; meşru bir değişiklik gerekiyorsa sahibine söyle — yol: sahip kararı + tören. Liste: tools/guard/korunan-yollar.txt"
    ;;
  SOR)
    GEREKCE="Korumalı alan ([SORULUR] sınıfı: $DETAY) — bu değişiklik meşru olabilir ama sahip kararı ister." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  HATA) engel "$DETAY (fail-closed)" ;;
  *) engel "çözümleyici beklenmeyen karar döndürdü: $KARAR (fail-closed)" ;;
esac
