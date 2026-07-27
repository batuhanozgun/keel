#!/bin/bash
# zarf-bicim-kapisi — SubagentStop kancası (E1): otonom koşuda alt-ajan dönüşünün BİÇİM kapısı.
# İçerik doğruluğuna BAKMAZ (o içerik gözlerinin işi); yalnız dönüş zarfının şemasını denetler.
# ANCAK koşu-AÇIK iken çalışır (tools/sevk/.kosu-acik yoksa sessiz geçer) — el-sürüşlü günlük
# kullanımda (dogrulayici vb.) bu kanca ETKİSİZDİR.
# BEYAZ LİSTE (E0 §6.1 hayalet bulgusu — zorunlu): yalnız agent_type DOLU ve kadroda kayıtlı
# (.claude/agents/<tip>.md mevcut) dönüşlerde zarf aranır; aksi hâlde sessiz geçer ve günlüğe
# satır DÜŞMEZ (harness'in kendi iç ajanı: boş agent_type + diskte olmayan transkript +
# Stop'tan SONRA gelebilen olay — kapı metni ona sızdırılmaz).
# Döngü emniyeti: stop_hook_active=true iken kapı bir daha ENGELLEMEZ; hükmü günlüğe yazar,
# geçirir (duran kapıya çevirmek sevkin Stop-turu işidir — E4).
# Çıkış sözleşmesi: exit 2 = zarf geri döner (stderr gerekçe ajana ulaşır — E0 kalem 6/7
# ölçümü); exit 0 = geçer. Günlüğe her yazım tools/sevk/zarf-ekle.sh ÜZERİNDEN (tek append-aracı).
# FAIL-CLOSED yalnız koşu içinde: koşu-AÇIK iken girdi çözülemezse exit 2; koşu yokken exit 0.
set -euo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
KOSU_YOL="$KOK/tools/sevk/.kosu-acik"

# Koşu şartı — en ucuz eleme: otonom koşu açık değilse bu kanca yok hükmünde.
[ -e "$KOSU_YOL" ] || exit 0

GIRDI="$(cat 2>/dev/null || true)"

engel() { printf 'zarf-bicim-kapisi: %s\n' "$1" >&2; exit 2; }
# Döngü emniyetli engel: stop_hook_active=true iken bir daha bloklanmaz (ham metin denetimi —
# bozuk-marker dalı node'a hiç inmeden engel basar, emniyet burada da tutmalı).
engel_e() {
  case "$GIRDI" in
    *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;;
    *) engel "$1" ;;
  esac
}

# Bozuk gösterge fail-closed'dur (hasım bulgusu A12): "koşu açık ama gösterge okunamıyor" hâli
# "koşu yok" DEĞİLDİR — kapı sessiz kapanırsa işletmen koşuyu denetimli sanır.
[ -f "$KOSU_YOL" ] || engel_e "koşu göstergesi bozuk: tools/sevk/.kosu-acik dosya değil (dizin/başka tür) — koşu kimliği okunamıyor, biçim denetimi yapılamaz (fail-closed)"
KOSU_ID="$(head -n1 "$KOSU_YOL" 2>/dev/null | cut -f1 || true)"
KOSU_KUTU="$(head -n1 "$KOSU_YOL" 2>/dev/null | cut -f2 || true)"
case "$KOSU_KUTU" in *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) KOSU_KUTU="";; esac  # eski 2-alan biçim: 2. alan damga
[ -n "$KOSU_ID" ] || engel_e "koşu göstergesi boş: tools/sevk/.kosu-acik ilk satırında koşu kimliği yok — kimliksiz günlük kaydı düşer, koşu dilimlenemez (fail-closed)"

# node keşfi (guard ailesiyle aynı)
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  # Döngü emniyeti node'suz da tutmalı: ikinci turda kilitlenme üretme.
  case "$GIRDI" in
    *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;;
    *) engel "node bulunamadi — bicim denetimi yapilamiyor (fail-closed; kosu acikken zarf denetimsiz gecmez)" ;;
  esac
fi

CIKTI="$(printf '%s' "$GIRDI" | KAPI_KOK="$KOK" KAPI_KOSU="$KOSU_ID" KAPI_KUTU="$KOSU_KUTU" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const KOK = process.env.KAPI_KOK || ".";
const KOSU = process.env.KAPI_KOSU || null;
const KUTU = /^[A-Za-z0-9._-]+$/.test(process.env.KAPI_KUTU || "") ? process.env.KAPI_KUTU : null;
const loglar = [];
const ts = () => new Date().toISOString();
const kayit = (o) => loglar.push(JSON.stringify({ surum: 1, ts: ts(), kosu: KOSU || null, ...o }));
const bitir = (kod, sha, mesaj) => {
  console.log(["KARAR", kod, sha ? 1 : 0, mesaj || ""].join("\t"));
  for (const l of loglar) console.log("LOG\t" + l);
  process.exit(0);
};

let g = {};
try { g = JSON.parse(readFileSync(0, "utf8")); } catch { bitir(2, false, "girdi JSON cozulemedi (fail-closed)"); }
const SHA = g.stop_hook_active === true;
const tipHam = String(g.agent_type || "");

// Beyaz liste: agent_type dolu + slug-bicimli + kadroda kayitli; degilse SESSIZ gec, LOG YOK.
if (!/^[a-z0-9_-]+$/.test(tipHam)) bitir(0, SHA, "");
if (!existsSync(join(KOK, ".claude", "agents", tipHam + ".md"))) bitir(0, SHA, "");

// Zarf metni: birincil kaynak last_assistant_message; bos ise transkriptin son ajan-metni.
let metin = typeof g.last_assistant_message === "string" ? g.last_assistant_message : "";
const tYol = typeof g.agent_transcript_path === "string" ? g.agent_transcript_path : "";
let transkript = "";
if (tYol && existsSync(tYol)) { try { transkript = readFileSync(tYol, "utf8"); } catch {} }
const ajanMetinleri = [];
if (transkript) {
  for (const l of transkript.split("\n")) {
    if (!l) continue;
    let j; try { j = JSON.parse(l); } catch { continue; }
    if (j.type !== "assistant" || !j.message) continue;
    const c = j.message.content;
    const t = Array.isArray(c)
      ? c.filter((p) => p && p.type === "text" && typeof p.text === "string").map((p) => p.text).join("\n").trim()
      : (typeof c === "string" ? c.trim() : "");
    if (t) ajanMetinleri.push(t);
  }
  if (!metin && ajanMetinleri.length) metin = ajanMetinleri[ajanMetinleri.length - 1];
}

const red = (sebep, ipucu) => {
  kayit({ tip: "bicim", ajan: tipHam, sonuc: SHA ? "kirmizi-devam" : "red", sebep });
  if (SHA) bitir(0, true, "");
  bitir(2, false, sebep + (ipucu ? " — " + ipucu : ""));
};

// Alan ayristirma: satir basinda (liste imi/kalin toleransli) ETIKET: deger
const ETIKETLER = ["BİTEN", "ÇATAL", "DEĞERLENDİRMEDİKLERİM", "SIRADAKİ", "TÜRETME-İZİ", "GERİ-ÇEKİLEN", "İZİN-ENGELİ", "ÇEVİRİ", "ETKİ", "BEKLETİR"];
const alan = {};
for (const satirHam of (metin || "").split("\n")) {
  const satir = satirHam.replace(/^[\s>*+-]*(?:\d+[.)])?\s*/, "").replace(/\*\*/g, "");
  for (const e of ETIKETLER) {
    if (satir.startsWith(e) && /^\s*:/.test(satir.slice(e.length))) {
      if (!(e in alan)) alan[e] = satir.slice(e.length).replace(/^\s*:\s*/, "").trim();
    }
  }
}
const UST = ["BİTEN", "ÇATAL", "DEĞERLENDİRMEDİKLERİM", "SIRADAKİ", "TÜRETME-İZİ", "GERİ-ÇEKİLEN"];
const eksik = UST.filter((e) => !(e in alan));

// Zarf tamamen yok → tur-tavani süphesi (maxTurns sessiz keser — E0 kalem 4).
if (eksik.length === UST.length) {
  if (SHA) {
    kayit({ tip: "bulgu", ajan: tipHam, cins: "tur-tavani-suphesi", detay: "donus zarfi hic yok (kesilme/yarim donus olabilir)" });
    kayit({ tip: "bicim", ajan: tipHam, sonuc: "kirmizi-devam", sebep: "zarf yok" });
    bitir(0, true, "");
  }
  red("donus zarfi yok", "gorevi 6 alanli donus zarfiyla bitir (02_kanon/OTONOM_KOSU.md §4: BİTEN · ÇATAL · DEĞERLENDİRMEDİKLERİM · SIRADAKİ · TÜRETME-İZİ · GERİ-ÇEKİLEN)");
}
if (eksik.length) red("zarf eksik: " + eksik.join(", "), "eksik alanlari ekleyip zarfi yeniden ver; her alan AYRI satirin BASINDA olmali (OTONOM_KOSU §4)");
if (!alan["DEĞERLENDİRMEDİKLERİM"]) red("DEĞERLENDİRMEDİKLERİM bos birakilamaz", "tam tartmadigin boyutlari yaz; yoksa acikca \"yok\" yaz");

// ÇATAL dolu ise üç alt-alan zorunlu.
const catalYok = /^yok\b/i.test(alan["ÇATAL"] || "") || (alan["ÇATAL"] || "") === "yok";
if (!catalYok) {
  const altEksik = ["ÇEVİRİ", "ETKİ", "BEKLETİR"].filter((e) => !(e in alan) || !alan[e]);
  if (altEksik.length) red("ÇATAL dolu ama alt-alan eksik: " + altEksik.join(", "), "ÇEVİRİ (sahip dilinde) + ETKİ (ertesi sabah ne değişir) + BEKLETİR (bekleyen görevler) zorunlu — her biri AYRI satirin BASINDA (satir-ici etiket okunmaz)");
}

// Kanit isaretcisi: BİTEN satirinda "kanıt:" zorunlu; vault-yolu ise varlik denetlenir (DAR kural).
const biten = alan["BİTEN"] || "";
const kanitEs = biten.match(/kanıt\s*:\s*(.+)$/);
if (!kanitEs) red("BİTEN satirinda kanit yok", "«kanıt: <dosya:satır | commit>» ekle (riskli görevde commit yasak)");
// Kuyruk noktalamasi soyulur — T1b canli olcumu: ajan zarfina ")" bulasti, isaretci "kopuk" sanildi.
const kanit = kanitEs[1].trim().split(/\s+/)[0].replace(/[.,;:)\]"»]+$/, "");
const gorevEs = biten.match(/G-\d+/);
const gorev = gorevEs ? gorevEs[0] : null;
if (/^(00_pano|01_kutular|02_kanon|03_roller|tools)\//.test(kanit)) {
  const yol = kanit.replace(/:[0-9][0-9-]*$/, "");
  if (!existsSync(resolve(KOK, yol))) red("kanit isaretcisi kopuk: " + kanit, "dosya bulunamadi — gercek yolu yaz");
}

// Riskli gorevde commit-kanit yasagi (OTONOM_KOSU §3/§7 — ortak nesne deposu, E0 kalem 5).
// Risk KOSUNUN KUTUSUNDAN okunur (hasim bulgusu A7: G-NN numaralari kutu-yereldir; tum kutulari
// taramak komsu kutunun riskli G-NNsiyle yanlis red uretir). .kosu-acik 2. alani kutu dizinidir;
// alan bos/eski-bicimse KABA dal: tum aktif kutular taranir ve bu kabalik gunluge not düşer.
const commitCinsi = /^[0-9a-f]{7,40}$/.test(kanit) || /^commit\b/i.test(kanitEs[1].trim());
if (gorev && commitCinsi) {
  let riskli = false;
  try {
    const kutular = join(KOK, "01_kutular");
    const adaylar = KUTU && existsSync(join(kutular, KUTU, "KUTU.md"))
      ? [KUTU]
      : (existsSync(kutular) ? readdirSync(kutular).filter((d) => !d.startsWith("_")) : []);
    if (!KUTU && adaylar.length > 1) kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "risk-kaba-tarama", detay: "kosu gostergesinde kutu alani yok; risk " + adaylar.length + " kutudan birden okundu" });
    for (const d of adaylar) {
      const ky = join(kutular, d, "KUTU.md");
      if (!existsSync(ky)) continue;
      let icinde = false;
      for (const s of readFileSync(ky, "utf8").split("\n")) {
        if (/^##\s+Bağımlılık ve risk/.test(s)) { icinde = true; continue; }
        if (/^##\s/.test(s)) { icinde = false; continue; }
        if (icinde && s.trimStart().startsWith(gorev + ":") && /risk=riskli/.test(s)) riskli = true;
      }
    }
  } catch {}
  if (riskli) red("riskli gorevde commit-kanit yasak (" + gorev + ")", "kanit yalniz dosya:satır olabilir — sir cinsi ortak nesne deposuna girmemeli (OTONOM_KOSU §7)");
}

// İzin-engeli çaprazı (E0 girdisi: ÇİFT kaynak — settings permission_denials + kanca-hata deseni).
// Kaynak sozlugu DORT degerli (tasari §4.8): settings-ask · kanca · red-metni · zemin-red.
// Bos-dizi bastirmasi duzeltildi (hasim bulgusu A8). zemin-red T1a CANLI olcumunden geldi
// (2026-07-27): bassiz kipte ajan-transkriptine permission_denials DUSMUYOR; izin-zemini
// reddinin tek izi tool_result metni "Claude requested permissions to ... havent granted".
// DARALTMA (T1b canli olcumu): desenler yalniz is_error:true tasiyan satirlarda aranir —
// ajan koruma betigini Read ile ACARSA betigin kendi metni desenlere denk geliyordu
// (yanlis-pozitif: gercek engel yasanmamisken İZİN-ENGELİ beyani zorlanirdi).
const hataSatirlari = transkript.split("\n").filter((s) => s.includes("\"is_error\":true")).join("\n");
const kaynaklar = [];
if (/"permission_denials":\[(?!\])/.test(transkript)) kaynaklar.push("settings-ask");
if (hataSatirlari.includes("file-guard ENGEL")) kaynaklar.push("kanca");
if (hataSatirlari.includes("Permission for this tool use was denied")) { if (!kaynaklar.includes("settings-ask")) kaynaklar.push("red-metni"); }
if (hataSatirlari.includes("requested permissions to") && hataSatirlari.includes("granted it")) kaynaklar.push("zemin-red");
if (kaynaklar.length && !("İZİN-ENGELİ" in alan)) {
  red("kosuda izin engeli yasandi (" + kaynaklar.join("+") + ") ama zarfta İZİN-ENGELİ satiri yok", "zarfa «İZİN-ENGELİ: <ne engellendi>» ekle (OTONOM_KOSU §4)");
}
if (kaynaklar.length) kayit({ tip: "izin-engel", ajan: tipHam, gorev, kaynak: kaynaklar, beyan: alan["İZİN-ENGELİ"] || null });

// GERİ-ÇEKİLEN transkript-izi (tasarım §2.4; DAR desen — yanlis-pozitif T1/T3te olculur).
// DARALTMA (T1 canli olcumu): zarf-etiket satirlari desen havuzundan cikarilir — red-duzeltme
// dongusunde ilk zarfin "ÇATAL:" etiketi ara-mesaj olarak kalip deseni tetikliyordu.
const geriYok = /^yok\b/i.test(alan["GERİ-ÇEKİLEN"] || "");
if (catalYok && geriYok && ajanMetinleri.length > 1) {
  const govde = ajanMetinleri.slice(0, -1).join("\n")
    .split("\n").filter((s) => !/^[\s>*+-]*(?:\d+[.)])?\s*\**ÇATAL\**\s*:/.test(s)).join("\n");
  if (/ÇATAL\b/.test(govde) || /sahibe (mi )?sor/i.test(govde)) {
    if (SHA) {
      kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "catal-iz-suphesi", detay: "kosu icinde catal degerlendirme izi var; zarf ÇATAL:yok + GERİ-ÇEKİLEN:yok" });
    } else {
      red("kosu icinde catal-degerlendirme izi var ama zarf ÇATAL:yok + GERİ-ÇEKİLEN:yok", "gercek catalsa ÇATAL doldur; actin-vazgectinse GERİ-ÇEKİLEN satirina tek satir iz yaz");
    }
  }
}

// Talimat↔fiil dikişi: günlükte sevk-karar kaydi varsa zarfin G-NNsi o kümede aranir;
// küme BOSSA atlanir (E4 öncesi — beyanli). Sapma ENGELLEMEZ: kirmizi iz düşer, duran
// kapiya çevirmek sevkin Stop-turu isidir (E4).
let dikis = "atlandi";
try {
  const gy = join(KOK, "00_pano", "zarf-gunlugu.jsonl");
  if (existsSync(gy)) {
    const acik = new Set();
    for (const l of readFileSync(gy, "utf8").split("\n")) {
      if (!l) continue;
      let j; try { j = JSON.parse(l); } catch { continue; }
      if (j.tip === "sevk-karar" && typeof j.gorev === "string") acik.add(j.gorev);
    }
    if (acik.size) dikis = gorev && acik.has(gorev) ? "esti" : "sapma";
  }
} catch {}
if (dikis === "sapma") {
  kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "dikis-sapma", detay: "sevkin acmadigi gorev donusu (talimat-fiil dikisi)" });
}

// Geçti: zarf + biçim kaydı günlüğe (tek append-aracı üzerinden; ham metin 4000 karakterle kirpilir).
kayit({
  tip: "zarf", ajan: tipHam, gorev,
  alanlar: {
    biten: biten, catal: catalYok ? "yok" : "dolu",
    ceviri: alan["ÇEVİRİ"] || null, etki: alan["ETKİ"] || null, bekletir: alan["BEKLETİR"] || null,
    degerlendirmediklerim: alan["DEĞERLENDİRMEDİKLERİM"], siradaki: alan["SIRADAKİ"],
    turetme_izi: alan["TÜRETME-İZİ"], geri_cekilen: alan["GERİ-ÇEKİLEN"],
    izin_engeli: alan["İZİN-ENGELİ"] || null,
  },
  dikis, ham: (metin || "").slice(0, 4000),
});
kayit({ tip: "bicim", ajan: tipHam, gorev, sonuc: "gecti", sebep: null });
bitir(0, SHA, "");
')" || engel "bicim cozumleyicisi kosamadi (fail-closed)"

# Çıktı protokolü: ilk satır KARAR\t<kod>\t<sha>\t<mesaj>; sonrakiler LOG\t<json>.
# (İlk satır boru/head ile DEĞİL parametre açılımıyla alınır: pipefail altında head'in erken
# çıkışı SIGPIPE=141 üretir ve set -e kancayı sessizce öldürürdü.)
KARAR_SATIRI="${CIKTI%%$'\n'*}"
KOD="$(printf '%s' "$KARAR_SATIRI" | cut -f2)"
SHA_BAYRAK="$(printf '%s' "$KARAR_SATIRI" | cut -f3)"
MESAJ="$(printf '%s' "$KARAR_SATIRI" | cut -f4-)"

YAZIM_HATASI=0
while IFS= read -r satir; do
  case "$satir" in
    LOG$'\t'*)
      if ! printf '%s' "${satir#LOG$'\t'}" | bash "$KOK/tools/sevk/zarf-ekle.sh"; then
        YAZIM_HATASI=1
      fi
      ;;
  esac
done <<EOF_CIKTI
$CIKTI
EOF_CIKTI

if [ "$YAZIM_HATASI" = "1" ] && [ "$SHA_BAYRAK" != "1" ]; then
  engel "zarf gunlugune yazilamadi — gunluk butunlugu suphede (fail-closed); tools/sevk/zarf-ekle.sh ciktisina bak"
fi

case "$KOD" in
  0) exit 0 ;;
  2) engel "$MESAJ" ;;
  *) [ "$SHA_BAYRAK" = "1" ] && exit 0; engel "beklenmeyen karar: $KARAR_SATIRI (fail-closed)" ;;
esac
