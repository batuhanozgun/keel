#!/bin/bash
# zarf-bicim-kapisi — SubagentStop kancası (E1): otonom dönemde alt-ajan dönüşünün BİÇİM kapısı.
# İçerik doğruluğuna BAKMAZ (o içerik gözlerinin işi); yalnız dönüş zarfının şemasını denetler.
# ANCAK dönem-AÇIK iken çalışır (tools/sevk/.donem-acik yoksa sessiz geçer) — el-sürüşlü günlük
# kullanımda (dogrulayici vb.) bu kanca ETKİSİZDİR.
# BEYAZ LİSTE (E0 §6.1 hayalet bulgusu — zorunlu): yalnız agent_type DOLU ve kadroda kayıtlı
# (.claude/agents/<tip>.md mevcut) dönüşlerde zarf aranır; aksi hâlde sessiz geçer ve günlüğe
# satır DÜŞMEZ (harness'in kendi iç ajanı: boş agent_type + diskte olmayan transkript +
# Stop'tan SONRA gelebilen olay — kapı metni ona sızdırılmaz).
# Döngü emniyeti: stop_hook_active=true iken kapı bir daha ENGELLEMEZ; hükmü günlüğe yazar,
# geçirir (duran kapıya çevirmek sevkin Stop-turu işidir — E4).
# Çıkış sözleşmesi: exit 2 = zarf geri döner (stderr gerekçe ajana ulaşır — E0 kalem 6/7
# ölçümü); exit 0 = geçer. Günlüğe her yazım tools/sevk/zarf-ekle.sh ÜZERİNDEN (tek append-aracı).
# FAIL-CLOSED yalnız dönem içinde: dönem-AÇIK iken girdi çözülemezse exit 2; dönem yokken exit 0.
set -euo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DONEM_YOL="$KOK/tools/sevk/.donem-acik"

# Dönem şartı — en ucuz eleme: otonom dönem açık değilse bu kanca yok hükmünde.
[ -e "$DONEM_YOL" ] || exit 0

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

# E3 girdileri — kapı çağırmadan ÖNCE toplanır (node bloğu saf kalsın; iki ucuz alt-süreç,
# SubagentStop dönem başına bir kez ateşlenir — file-guard'ın her-araç sıcaklığında DEĞİL).
#   KARAR_ALANI: "HAZIR" ya da "HAZIR DEĞİL · <sebep>" — çatal sahibe gitmeden aranan ön koşul.
#   KUYRUK_DURUM: catal-kuyruk.sh --durum çıktısı (TSV) — BEKLETİR kilidinin girdisi.
# İkisi de fail-open OKUNUR (betik yoksa/patlarsa boş): yokluk kapıyı kilitlemez, ama
# "HAZIR" da demez — karar-alanı dalı boş değeri HAZIR SAYMAZ (aşağıda fail-closed).
KARAR_ALANI_DURUM=""
if [ -r "$KOK/tools/sevk/karar-alani.sh" ]; then
  KARAR_ALANI_DURUM="$(bash "$KOK/tools/sevk/karar-alani.sh" "$KOK" 2>/dev/null | head -n1 || true)"
fi
KUYRUK_DURUM=""
KUYRUK_HATA=0
if [ -f "$KOK/00_pano/SENDE_BEKLEYEN.md" ]; then
  # Kuyruk VARSA okuyucu hatası sessiz geçilemez (fail-closed; hasım bulgusu): "açık çatal yok"
  # ile "okuyamadım" aynı şey değildir. Kuyruk hiç yoksa açık çatal da yoktur — okuyucu koşmaz.
  if [ -r "$KOK/tools/sevk/catal-kuyruk.sh" ]; then
    KUYRUK_DURUM="$(bash "$KOK/tools/sevk/catal-kuyruk.sh" --durum 2>/dev/null)" || KUYRUK_HATA=1
  else
    KUYRUK_HATA=1
  fi
fi

# Bozuk gösterge fail-closed'dur (hasım bulgusu A12): "dönem açık ama gösterge okunamıyor" hâli
# "dönem yok" DEĞİLDİR — kapı sessiz kapanırsa işletmen dönemi denetimli sanır.
[ -f "$DONEM_YOL" ] || engel_e "dönem göstergesi bozuk: tools/sevk/.donem-acik dosya değil (dizin/başka tür) — dönem kimliği okunamıyor, biçim denetimi yapılamaz (fail-closed)"
DONEM_ID="$(head -n1 "$DONEM_YOL" 2>/dev/null | cut -f1 || true)"
DONEM_KUTU="$(head -n1 "$DONEM_YOL" 2>/dev/null | cut -f2 || true)"
case "$DONEM_KUTU" in *[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*) DONEM_KUTU="";; esac  # eski 2-alan biçim: 2. alan damga
[ -n "$DONEM_ID" ] || engel_e "dönem göstergesi boş: tools/sevk/.donem-acik ilk satırında dönem kimliği yok — kimliksiz günlük kaydı düşer, dönem dilimlenemez (fail-closed)"

# node keşfi ORTAK KİTAPLIKTAN (E4: tools/sevk/ortak.sh; D-02 dersi — tek ev). Kitaplık yoksa
# döngü emniyetini bozmadan fail-closed davran (aşağıdaki node-yok dalıyla aynı kural).
ORTAK="$KOK/tools/sevk/ortak.sh"
NODE_BIN=""
if [ -r "$ORTAK" ]; then
  # shellcheck source=/dev/null
  . "$ORTAK"
  node_bul || NODE_BIN=""
fi
if [ -z "$NODE_BIN" ]; then
  # Döngü emniyeti node'suz da tutmalı: ikinci turda kilitlenme üretme.
  case "$GIRDI" in
    *'"stop_hook_active":true'*|*'"stop_hook_active": true'*) exit 0 ;;
    *) engel "node ya da ortak kitaplik (tools/sevk/ortak.sh) yok — bicim denetimi yapilamiyor (fail-closed; donem acikken zarf denetimsiz gecmez)" ;;
  esac
fi

CIKTI="$(printf '%s' "$GIRDI" | KAPI_KOK="$KOK" KAPI_DONEM="$DONEM_ID" KAPI_KUTU="$DONEM_KUTU" \
  KAPI_KARAR_ALANI="$KARAR_ALANI_DURUM" KAPI_KUYRUK="$KUYRUK_DURUM" KAPI_KUYRUK_HATA="$KUYRUK_HATA" \
  "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const KOK = process.env.KAPI_KOK || ".";
const DONEM = process.env.KAPI_DONEM || null;
const KUTU = /^[A-Za-z0-9._-]+$/.test(process.env.KAPI_KUTU || "") ? process.env.KAPI_KUTU : null;
const loglar = [];
const eylemler = [];   // E3: kabuk tarafında koşacak yan-etkiler (kuyruğa ekleme)
const ts = () => new Date().toISOString();
const kayit = (o) => loglar.push(JSON.stringify({ surum: 1, ts: ts(), donem: DONEM || null, ...o }));
const bitir = (kod, sha, mesaj) => {
  console.log(["KARAR", kod, sha ? 1 : 0, mesaj || ""].join("\t"));
  for (const l of loglar) console.log("LOG\t" + l);
  for (const e of eylemler) console.log("EYLEM\t" + e);
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
const ETIKETLER = ["BİTEN", "ÇATAL", "DEĞERLENDİRMEDİKLERİM", "SIRADAKİ", "TÜRETME-İZİ", "GERİ-ÇEKİLEN", "İZİN-ENGELİ", "ÇEVİRİ", "ETKİ", "BEKLETİR",
                   "ÇATAL-KAYNAK", "HÜKÜM", "KALEMLER",    // E3: denetçi dönüş sözleşmesi
                   "KARNE-KAPI", "MADDELER"];              // E4: karne dönüş sözleşmesi
// E3 · denetçi sınıfı: dönüşü ZARF + üç ek satır taşıyan yazamaz koltuklar. Bu koltukların
// dönüşü "iş" değil "hüküm"dür — BEKLETİR kilidi (aşağıda) onlara uygulanmaz.
const DENETCILER = new Set(["catal-denetcisi"]);
// E4 · karneci sınıfı: kapı hükmü üreten yazamaz koltuklar (K2 — "kimse kendi işine yeşil
// diyemez" kuralının mekanik yüzü). Dönüşleri ZARF + KARNE-KAPI/HÜKÜM/MADDELER taşır ve
// günlüğe ayrıca `karne` kaydı düşer; sevk kapıyı YALNIZ o kayda bakarak kapalı sayar.
const KARNECILER = new Set(["dogrulayici", "kurulum-denetcisi"]);
// Hüküm üreten koltuklar: iş değil yargı döndürürler — BEKLETİR kilidi ve çatal-iz şüphesi
// onlara uygulanmaz (T3a dersi: denetçinin İŞİ çatal değerlendirmektir, şüphe değil beklentidir).
const HUKUM_SINIFI = new Set([...DENETCILER, ...KARNECILER]);
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
  red("donus zarfi yok", "gorevi 6 alanli donus zarfiyla bitir (02_kanon/OTONOM_DONEM.md §4: BİTEN · ÇATAL · DEĞERLENDİRMEDİKLERİM · SIRADAKİ · TÜRETME-İZİ · GERİ-ÇEKİLEN)");
}
if (eksik.length) red("zarf eksik: " + eksik.join(", "), "eksik alanlari ekleyip zarfi yeniden ver; her alan AYRI satirin BASINDA olmali (OTONOM_DONEM §4)");
if (!alan["DEĞERLENDİRMEDİKLERİM"]) red("DEĞERLENDİRMEDİKLERİM bos birakilamaz", "tam tartmadigin boyutlari yaz; yoksa acikca \"yok\" yaz");

// ÇATAL dolu ise üç alt-alan zorunlu.
const catalYok = /^yok\b/i.test(alan["ÇATAL"] || "") || (alan["ÇATAL"] || "") === "yok";
if (!catalYok) {
  const altEksik = ["ÇEVİRİ", "ETKİ", "BEKLETİR"].filter((e) => !(e in alan) || !alan[e]);
  if (altEksik.length) red("ÇATAL dolu ama alt-alan eksik: " + altEksik.join(", "), "ÇEVİRİ (sahip dilinde) + ETKİ (ertesi sabah ne değişir) + BEKLETİR (bekleyen görevler) zorunlu — her biri AYRI satirin BASINDA (satir-ici etiket okunmaz)");
  // BEKLETİR MAKİNE-OKUR olmali (hasim bulgusu): kilit G-NN jetonlarina baglidir; sahip dilinde
  // yazilmis "ekstre isleri" bir liste degildir ve K-B kilidi IZSIZ olur. Bagli is yoksa "yok".
  const bek = alan["BEKLETİR"] || "";
  if (!/G-\d+/.test(bek) && !/^yok\b/i.test(bek)) {
    red("BEKLETİR görev numarası taşımıyor: " + bek.slice(0, 80),
        "bu cevaba bağlı görevleri G-NN olarak yaz (ör. «BEKLETİR: G-32 G-33»); bağlı iş yoksa «yok» yaz — kilit bu listeye bağlanır");
  }
}

// Kanit isaretcisi: BİTEN satirinda "kanıt:" zorunlu; vault-yolu ise varlik denetlenir (DAR kural).
const biten = alan["BİTEN"] || "";
const kanitEs = biten.match(/kanıt\s*:\s*(.+)$/);
if (!kanitEs) red("BİTEN satirinda kanit yok", "«kanıt: <dosya:satır | commit>» ekle (riskli görevde commit yasak)");
// Kuyruk noktalamasi soyulur — T1b canli olcumu: ajan zarfina ")" bulasti, isaretci "kopuk" sanildi.
const kanit = kanitEs[1].trim().split(/\s+/)[0].replace(/[.,;:)\]"»]+$/, "");
// Satir-numarasi eki: tek satir (":41"), aralik (":41-46") VE VIRGULLU LISTE (":43,46").
// Virgullu bicim T3a canli olcumunde geldi (2026-07-28): ajan iki ayri satiri tek isaretcide
// gosterdi, dar desen eslesmedi ve gecerli kanit "kopuk" sayildi — yanlis-pozitif.
const satirEkiniSoy = (y) => y.replace(/:[0-9][0-9,\-]*$/, "");
const gorevEs = biten.match(/G-\d+/);
const gorev = gorevEs ? gorevEs[0] : null;
// GÖREV NUMARASI ZORUNLU (hasim bulgusu): sema zaten "BİTEN: G-NN — …" diyor ama kapi yalniz
// «kanıt:»i mekanik zorluyordu. G-NNsiz zarf iki kapiyi birden deliyordu: BEKLETİR kilidi hic
// calismiyor (gorev null) VE kuyruk teslimati eslesmiyor (catal sahibe hic ulasmiyor).
// Sozlesmenin bir yarisini kesip digerini serbest birakmak kapinin varlik sebebine aykiri.
if (!gorev) red("BİTEN satırında görev numarası yok", "«BİTEN: G-NN — <tek cümle> · kanıt: …» biçimini kullan (OTONOM_DONEM §4); G-NN olmadan kilit ve sahip kuyruğu bağlanamaz");
if (/^(00_pano|01_kutular|02_kanon|03_roller|tools)\//.test(kanit)) {
  const yol = satirEkiniSoy(kanit);
  if (!existsSync(resolve(KOK, yol))) red("kanit isaretcisi kopuk: " + kanit, "dosya bulunamadi — gercek yolu yaz");
}

// Riskli gorevde commit-kanit yasagi (OTONOM_DONEM §3/§7 — ortak nesne deposu, E0 kalem 5).
// Risk DONEMIN KUTUSUNDAN okunur (hasim bulgusu A7: G-NN numaralari kutu-yereldir; tum kutulari
// taramak komsu kutunun riskli G-NNsiyle yanlis red uretir). .donem-acik 2. alani kutu dizinidir;
// alan bos/eski-bicimse KABA dal: tum aktif kutular taranir ve bu kabalik gunluge not düşer.
const commitCinsi = /^[0-9a-f]{7,40}$/.test(kanit) || /^commit\b/i.test(kanitEs[1].trim());
if (gorev && commitCinsi) {
  let riskli = false;
  try {
    const kutular = join(KOK, "01_kutular");
    const adaylar = KUTU && existsSync(join(kutular, KUTU, "KUTU.md"))
      ? [KUTU]
      : (existsSync(kutular) ? readdirSync(kutular).filter((d) => !d.startsWith("_")) : []);
    if (!KUTU && adaylar.length > 1) kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "risk-kaba-tarama", detay: "donem gostergesinde kutu alani yok; risk " + adaylar.length + " kutudan birden okundu" });
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
  if (riskli) red("riskli gorevde commit-kanit yasak (" + gorev + ")", "kanit yalniz dosya:satır olabilir — sir cinsi ortak nesne deposuna girmemeli (OTONOM_DONEM §7)");
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
  red("donemde izin engeli yasandi (" + kaynaklar.join("+") + ") ama zarfta İZİN-ENGELİ satiri yok", "zarfa «İZİN-ENGELİ: <ne engellendi>» ekle (OTONOM_DONEM §4)");
}
if (kaynaklar.length) kayit({ tip: "izin-engel", ajan: tipHam, gorev, kaynak: kaynaklar, beyan: alan["İZİN-ENGELİ"] || null });

// GERİ-ÇEKİLEN transkript-izi (tasarım §2.4; DAR desen — yanlis-pozitif T1/T3te olculur).
// DARALTMA (T1 canli olcumu): zarf-etiket satirlari desen havuzundan cikarilir — red-duzeltme
// dongusunde ilk zarfin "ÇATAL:" etiketi ara-mesaj olarak kalip deseni tetikliyordu.
// DENETÇİ MUAFİYETİ (T3a canli olcumu, 2026-07-28): catal-denetcisinin İŞİ catal degerlendirmektir;
// transkriptinde "ÇATAL"/"sahibe sor" gecmesi supheli DEGIL, beklenendir. Muafiyet olmadan her
// denetci cagrisi catal-iz-suphesi uretiyordu (yanlis-pozitif; sahada goruldu).
const geriYok = /^yok\b/i.test(alan["GERİ-ÇEKİLEN"] || "");
// SON MESAJ DA TARANIR (T3d canli olcumu, 2026-07-28): ajan butun "sahibe sormali miyim"
// degerlendirmesini TEK ve SON metin mesajina koydu; slice(0,-1) o mesaji disladigi icin
// bastirilmis-catal kolu HIC denetlenmedi (kapi yesil verdi). E1 son-mesaj dislamasinin
// gerekcesi zarfin kendi "ÇATAL:" etiketiydi — o gerekce artik ETIKET SUZGECIYLE karsilaniyor,
// mesaji komple dislamaya gerek yok. Etiket satirlari (6+3 alan) havuzdan cikarilir.
const ETIKET_DESENI = /^[\s>*+-]*(?:\d+[.)])?\s*\**(?:ÇATAL|ÇATAL-KAYNAK|ÇEVİRİ|ETKİ|BEKLETİR|BİTEN|DEĞERLENDİRMEDİKLERİM|SIRADAKİ|TÜRETME-İZİ|GERİ-ÇEKİLEN|İZİN-ENGELİ|HÜKÜM|KALEMLER)\**\s*:/;
if (catalYok && geriYok && !HUKUM_SINIFI.has(tipHam) && ajanMetinleri.length) {
  const govde = ajanMetinleri.join("\n")
    .split("\n").filter((s) => !ETIKET_DESENI.test(s)).join("\n");
  if (/ÇATAL\b/.test(govde) || /sahibe (mi )?sor/i.test(govde)) {
    if (SHA) {
      kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "catal-iz-suphesi", detay: "donem icinde catal degerlendirme izi var; zarf ÇATAL:yok + GERİ-ÇEKİLEN:yok" });
    } else {
      red("donem icinde catal-degerlendirme izi var ama zarf ÇATAL:yok + GERİ-ÇEKİLEN:yok", "gercek catalsa ÇATAL doldur; actin-vazgectinse GERİ-ÇEKİLEN satirina tek satir iz yaz");
    }
  }
}

// ═══ E3 · SORU KANALI ═══════════════════════════════════════════════════════════════════
// Bes adim: jargon kapisi · TÜRETME-İZİ capasi · BEKLETİR kilidi · denetci sozlesmesi ·
// karar-alani on kosulu + kuyruga ekleme. Hepsi donem-ACIK sartinin ARDINDA (el-surusluye
// dokunmaz) ve stop_hook_active dalinda ENGELLEMEZ (red() bunu zaten tasiyor).
const denetciMi = DENETCILER.has(tipHam);
const karneciMi = KARNECILER.has(tipHam);
const hukumSinifi = HUKUM_SINIFI.has(tipHam);
// Talimat-fiil dikisinin bakacagi gorev: uretim rolunde BİTEN satirinin G-NNsi; hukum
// koltuklarinda HÜKMÜN KONUSU (catal denetcisinde ÇATAL-KAYNAK, karnecide KARNE-KAPI) —
// cunku onlarin BİTEN satiri kendi cagrilarini anlatir, sevkin actigi gorevi degil.
let dikisGorev = gorev;
let karneKaydi = null;

// (1) Jargon kapisi — ÇEVİRİ satiri sahibin bilmedigi kelime tasiyor mu. DAR kural (tasari
//     §4.1): yalniz ID + dosya uzantisi + kok-dizinli yol. Genel teknik-terim taramasi yargi
//     isidir ve catal denetcisinin 3. kalemidir (beyanli sinir). Ders: K-61 — sahip anlamadigi
//     soruya "olur" der; anlasilmayan soru sahibi isten dislar.
// (3) BEKLETİR kilidi (2. hat) — cevapsiz catala bagli is. Birincil hat SEVKtir (E4: gorevi
//     hic acmaz); burada acilmis olanin DONUSU durur. Denetci cagrilari muaf (is degil hukum).
// FAIL-CLOSED OKUYUCU (hasim bulgusu): kuyruk okuyucusu patlarsa kilit SESSIZCE devre disi
// kalirdi — "acik catal yok" ile "okuyamadim" ayni sey sayiliyordu. Artik kuyruk dosyasi VARKEN
// okuyucu hata verirse dönüş DURUR ve iz duser; kuyruk hic yoksa acik catal da yoktur, gecer.
const kuyrukHam = process.env.KAPI_KUYRUK || "";
const kuyrukHata = process.env.KAPI_KUYRUK_HATA === "1";
if (gorev && !hukumSinifi && kuyrukHata) {
  kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "kuyruk-okunamadi", detay: "BEKLETİR kilidi degerlendirilemedi (fail-closed)" });
  red("sahibin kuyrugu okunamadi — BEKLETİR kilidi degerlendirilemedi (fail-closed)",
      "00_pano/SENDE_BEKLEYEN.md okunabilir mi ve tools/sevk/catal-kuyruk.sh calisiyor mu, bak");
}
if (gorev && !hukumSinifi && kuyrukHam) {
  const bekleyen = [], cozulemeyen = [];
  for (const s of kuyrukHam.split("\n")) {
    if (!s.trim()) continue;
    const [id, durum, bek] = s.split("\t");
    // COZULEMEDI fail-closed (hasim bulgusu): yapisi okunmayan madde "acik degil" SAYILAMAZ —
    // sahibin elle duzenledigi yuzeyde bir yazim kazasi kilidi acmamali.
    if (durum === "COZULEMEDI") { cozulemeyen.push(id); continue; }
    if (durum !== "CEVAP-BEKLIYOR" && durum !== "CEVIRI-KUSURU") continue;
    if ((bek || "").split(/\s+/).includes(gorev)) bekleyen.push(id);
  }
  if (cozulemeyen.length) {
    kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "kuyruk-cozulemedi", detay: "yapisi okunmayan madde(ler): " + cozulemeyen.join(" ") });
    red("sahibin kuyrugunda yapisi okunmayan madde var (" + cozulemeyen.join(" ") + ") — kilit degerlendirilemedi (fail-closed)",
        "00_pano/SENDE_BEKLEYEN.md maddesini biçime döndür: «ÇATAL Ç-NN · \"soru\" · bekletir: G-NN»");
  }
  if (bekleyen.length) {
    kayit({ tip: "bulgu", ajan: tipHam, gorev, cins: "bekletir-ihlali", detay: "cevapsiz catal(lar): " + bekleyen.join(" ") });
    red("cevapsız çatala bağlı iş döndü (" + bekleyen.join(" ") + " · " + gorev + ")",
        "bu görev açık bir çatalın BEKLETİR listesinde — sahip cevap verene dek beklemeli (OTONOM_DONEM §6.4)");
  }
}

// ÇEVİRİ **VE ETKİ** taranir (hasim bulgusu): kuyruga yazilan sahip-yuzeyi satiri ikisini de
// tasir; yalniz ÇEVİRİyi süzmek, jargonun ETKİ üzerinden sahibin önüne çikmasina izin veriyordu.
const jargonTara = (metin) => {
  const j = [];
  if (/(?:^|[^\p{L}\p{N}])(?:KT|K|D|G|F|Ç)-\d+/u.test(metin)) j.push("karar/görev numarası");
  if (/\.(?:md|sh|json|jsonl|mjs|js|txt|ya?ml)(?:$|[^\p{L}\p{N}])/u.test(metin)) j.push("dosya adı");
  if (/(?:^|[^\p{L}\p{N}])(?:00_pano|01_kutular|02_kanon|03_roller|00_genesis|tools|\.claude)\//u.test(metin)) j.push("dosya yolu");
  return j;
};
if (!catalYok && !denetciMi) {
  for (const [ad, metin] of [["ÇEVİRİ", alan["ÇEVİRİ"] || ""], ["ETKİ", alan["ETKİ"] || ""]]) {
    const jargon = jargonTara(metin);
    if (jargon.length) {
      red(ad + " satırı sahibin bilmediği kelime taşıyor (" + jargon.join(", ") + ")",
          "soruyu ve etkisini sahip diline çevir: numara/dosya adı/yol GEÇMEZ — «cevabına göre ertesi sabah ne değişir» diliyle yaz (KARAR_ALANI Bölüm A madde 6). Bu iki satır kuyruğa AYNEN yazılır.");
    }
  }
}

// (2) TÜRETME-İZİ capasi — iz "yok" degilse COZULEBILIR bir capa tasimali. Gerekce (D-25
//     danisman serhi): turetme yetkisinin ters yuzu "VIZYONDA vardi deyip sormadan basmak"tir;
//     iz cozulmuyorsa yetki denetlenemez. Kanit isaretcisiyle AYNI dar yol kurali.
const izHam = (alan["TÜRETME-İZİ"] || "").trim();
// BOS BIRAKILAMAZ (hasim bulgusu): dürüst serbest metin red aliyordu ama alani BOS birakan
// yesil geciyordu — denetimden kacmanin en ucuz yolu hicbir sey yazmamak olmamali.
if (!izHam) red("TÜRETME-İZİ boş bırakılamaz", "türeterek geçtiğin çatal yoksa açıkça «yok» yaz");
if (!/^yok\b/i.test(izHam)) {
  const yolEs = izHam.match(/(?:00_pano|01_kutular|02_kanon|03_roller|00_genesis|tools)\/[^\s"»)\]]+/);
  const kanonCapa = /(?:^|[^\p{L}\p{N}])(?:K|D|Ç)-\d+/u.test(izHam) || /VIZYON/.test(izHam);
  if (!yolEs && !kanonCapa) {
    red("TÜRETME-İZİ çözülmüyor: çapa yok", "izi «sormadım çünkü VIZYON/K-NN <dosya:satır>» biçiminde yaz — serbest metin iz değildir");
  }
  if (yolEs) {
    const izYol = satirEkiniSoy(yolEs[0].replace(/[.,;:)\]"»]+$/, ""));
    if (!existsSync(resolve(KOK, izYol))) red("TÜRETME-İZİ işaretçisi kopuk: " + yolEs[0], "gerçek dosya yolunu yaz");
  }
}

// (4) Denetci donus sozlesmesi + (5) karar-alani on kosulu ve kuyruga ekleme.
if (denetciMi) {
  const kaynak = (alan["ÇATAL-KAYNAK"] || "").trim();
  const hukumHam = (alan["HÜKÜM"] || "").trim();
  const kalemler = (alan["KALEMLER"] || "").trim();
  const eksikDen = [];
  if (!kaynak) eksikDen.push("ÇATAL-KAYNAK");
  if (!hukumHam) eksikDen.push("HÜKÜM");
  if (!kalemler) eksikDen.push("KALEMLER");
  if (eksikDen.length) {
    red("denetçi dönüşünde eksik alan: " + eksikDen.join(", "),
        "çatal denetçisi zarfa üç satır daha ekler: ÇATAL-KAYNAK: G-NN · HÜKÜM: GEÇTİ|DÖNDÜ · KALEMLER: 1=… 5=…");
  }
  const kaynakGorev = (kaynak.match(/G-\d+/) || [])[0];
  if (!kaynakGorev) red("ÇATAL-KAYNAK görev taşımıyor: " + kaynak, "hükmün konusu olan görevi yaz (ör. «ÇATAL-KAYNAK: G-12»)");
  // İlk jeton BİREBİR karşılaştırılır: \b ASCII sözcük sınırıdır, "GEÇTİ" sonundaki İ ona
  // sınır saydırmaz (canlı ölçüm 2026-07-27 — desen sessiz-ölü kalıyordu). Türkçe harf
  // dönüşümü YOK; eşleştirme bayt eşitliğidir.
  const hukumIlk = hukumHam.split(/\s+/)[0] || "";
  const hukum = hukumIlk === "GEÇTİ" ? "GECTI" : (hukumIlk === "DÖNDÜ" ? "DONDU" : null);
  if (!hukum) red("HÜKÜM okunmuyor: " + hukumHam, "yalnız «GEÇTİ» ya da «DÖNDÜ» yazılır");
  // KARAR-ALANI İSTİSNASI (hasim bulgusu): koltugun kendi sozlesmesi "karar alani yoksa hukmun
  // DÖNDÜ ve gerekcen «karar alani yazili degil»" diyor — ama o gerekce BES KALEMDEN HICBIRI
  // degil. Kapi "DÖNDÜ ⇒ en az bir kalem kaldi" sartini korusaydi, koltugun ZORUNLU dönüşü kendi
  // kapisindan geceMEZdi (denetci ya kural ihlal edecek ya kalem uyduracakti). Karar alani hazir
  // DEGILKEN bu sart aranmaz; hazirken aynen surer.
  const kararHazir = (process.env.KAPI_KARAR_ALANI || "").trim() === "HAZIR";
  if (hukum === "DONDU" && kararHazir && !/kaldı/.test(kalemler)) {
    red("HÜKÜM DÖNDÜ ama KALEMLER satırında hiçbir kalem «kaldı» değil", "hangi kalemden düştüğünü işaretle (1..5)");
  }
  // (5) Karar alani on kosulu: profil bos/eksikken catal SAHİBE GİDEMEZ (tasarim §10/E3).
  //     Bos deger HAZIR SAYILMAZ (fail-closed): betik yoksa da soru kanali acilmis olmaz.
  const karar = (process.env.KAPI_KARAR_ALANI || "").trim();
  if (hukum === "GECTI" && !kararHazir) {
    kayit({ tip: "catal-suzgec", ajan: tipHam, gorev: kaynakGorev, hukum: "GECTI-ENGEL", kalemler, sebep: karar || "karar-alani denetcisi kosmadi" });
    red("sahibin karar alanı yazılı değil — çatal sahibe gidemez (" + (karar || "denetçi koşmadı") + ")",
        "02_kanon/KARAR_ALANI.md kurulmalı ve Bölüm B (sahip profili) doldurulmalı (kalıp: 00_genesis/KARAR_ALANI_KALIBI.md)");
  }
  // Hukmun KONUSU olan catalin metni kayda GECER (hasim bulgusu: alanlar sabit null yaziliyordu
  // ve dis gozun 4. mercegi — "gercek catal gorunen bir DÖNDÜ var mi" — okuyacagi veriyi
  // bulamiyordu; kanit-zorunlu bir koltuga kanitsiz kayit birakmak D-22 ile carpisiyordu).
  // Metin yine ZARF KAYDINDAN gelir, denetcinin kaleminden DEGIL (§9).
  let kaynakAlan = null;
  try {
    const gy = join(KOK, "00_pano", "zarf-gunlugu.jsonl");
    if (existsSync(gy)) {
      for (const l of readFileSync(gy, "utf8").split("\n")) {
        if (!l) continue;
        let j; try { j = JSON.parse(l); } catch { continue; }
        if (j.tip === "zarf" && j.gorev === kaynakGorev && j.alanlar && j.alanlar.catal === "dolu") kaynakAlan = j.alanlar;
      }
    }
  } catch {}
  const kis = (s) => (typeof s === "string" ? s.slice(0, 400) : null);
  kayit({ tip: "catal-suzgec", ajan: tipHam, gorev: kaynakGorev, hukum, kalemler,
          ceviri: kis(kaynakAlan && kaynakAlan.ceviri), etki: kis(kaynakAlan && kaynakAlan.etki),
          bekletir: kis(kaynakAlan && kaynakAlan.bekletir) });
  // GEÇTİ ise sahip-yuzeyi maddesi kuyruga MEKANIK duser; metni denetci DEGIL kayit yazar
  // (§9 sahip-atfi kurali: sahip yuzeyine giden cumle zarfin gunluk kaydindan gelir).
  // SHA TURUNDA DA YAZILIR (hasim bulgusu; T3a bunun on kosulunu sahada gosterdi): denetci bir
  // kez biçim redi yerse ikinci tur SHA olur ve "!SHA" sarti sahibin sorusunu SESSIZCE yutuyordu.
  // Cift-yazim riski yok: --ekle tekillestirmesi kaynak imzasiyladir (ayni gunluk satiri).
  if (hukum === "GECTI") eylemler.push("kuyruk-ekle\t" + kaynakGorev + "\t" + tipHam);
  dikisGorev = kaynakGorev;
}
// ═══ E3 sonu ════════════════════════════════════════════════════════════════════════════

// ═══ E4 · KARNE SÖZLEŞMESİ (K2) ═════════════════════════════════════════════════════════
// "Kimse kendi isine yesil diyemez" bugune kadar bir KURALDI; burada mekanige donusuyor. Karneci
// koltuklarin donusu uc ek satir tasir ve gunluge ayri bir `karne` kaydi duser — sevk kapiyi
// YALNIZ o kayda bakarak kapali sayar (tasarim §2.5: karnesiz kapi Stop kancasindan gecmez).
if (karneciMi) {
  const kapiHam = (alan["KARNE-KAPI"] || "").trim();
  const hukumHam2 = (alan["HÜKÜM"] || "").trim();
  const maddeler = (alan["MADDELER"] || "").trim();
  const eksikK = [];
  if (!kapiHam) eksikK.push("KARNE-KAPI");
  if (!hukumHam2) eksikK.push("HÜKÜM");
  if (!maddeler) eksikK.push("MADDELER");
  if (eksikK.length) {
    red("karne dönüşünde eksik alan: " + eksikK.join(", "),
        "karneci koltuk zarfa üç satır daha ekler: KARNE-KAPI: G-NN|KURULUM|KAPANIS · HÜKÜM: YEŞİL|KIRMIZI|DOĞRULANAMADI · MADDELER: <iddia=hüküm çiftleri>");
  }
  const kapiEs = kapiHam.split(/\s+/)[0].match(/^(G-\d+|KURULUM|KAPANIS)$/);
  if (!kapiEs) red("KARNE-KAPI çözülmüyor: " + kapiHam, "hükmün konusu olan kapıyı yaz (G-NN ya da KURULUM/KAPANIS)");
  const kapi = kapiEs[1];
  // Ilk jeton BIREBIR karsilastirilir (E3 dersi: ASCII \b Turkce harfte sinir saymaz).
  const hIlk = hukumHam2.split(/\s+/)[0];
  const HUKUMLER = { "YEŞİL": "YEŞİL", "KIRMIZI": "KIRMIZI", "DOĞRULANAMADI": "DOĞRULANAMADI" };
  const hukumK = HUKUMLER[hIlk] || null;
  if (!hukumK) red("HÜKÜM okunmuyor: " + hukumHam2, "yalnız «YEŞİL», «KIRMIZI» ya da «DOĞRULANAMADI» yazılır");
  // OZ-KARNE YASAGI: isi yapan kendi karnesini yazamaz. Kaynak, o kapinin son IS zarfinin
  // ajanidir (karne sinifi zarflar disarida birakilir — karneci kendi kaydini kaynak sayamaz).
  let isAjani = null;
  try {
    const gy2 = join(KOK, "00_pano", "zarf-gunlugu.jsonl");
    if (existsSync(gy2)) {
      for (const l of readFileSync(gy2, "utf8").split("\n")) {
        if (!l) continue;
        let j; try { j = JSON.parse(l); } catch { continue; }
        if (j.tip === "zarf" && j.gorev === kapi && j.sinif !== "karne") isAjani = j.ajan || null;
      }
    }
  } catch {}
  if (isAjani && isAjani === tipHam) {
    kayit({ tip: "bulgu", ajan: tipHam, gorev: kapi, cins: "oz-karne", detay: "isi yapan koltuk kendi karnesini yazmaya calisti" });
    red("öz-karne yasak: " + kapi + " işini yapan koltuk (" + tipHam + ") kendi karnesini yazamaz",
        "karneyi işe dokunmamış bir koltuk verir — «kimse kendi işine yeşil diyemez» kuralının mekanik yüzü budur");
  }
  dikisGorev = kapi;
  karneKaydi = { tip: "karne", ajan: tipHam, kapi, hukum: hukumK, maddeler: maddeler.slice(0, 400) };
}
// ═══ E4 sonu ════════════════════════════════════════════════════════════════════════════

// Talimat↔fiil dikişi (DÖNÜŞ ucu; çağrı ucu E4te devir-kapisi.sh): günlükte sevk-karar kaydi
// varsa zarfin gorevi o kümede aranir; küme BOSSA atlanir. Sapma ENGELLEMEZ: kirmizi iz düşer,
// duran kapiya çevirmek sevkin Stop-turu isidir.
// E4 iki daraltma getirdi: (1) kume YALNIZ BU DONEMin kararlarindan kurulur (eski donemin
// karari bugunku sapmayi ortemez); (2) rol de eslesir — sevk G-01i uygulayiciya verdiyse ayni
// gorevi baska bir koltugun donmesi SAPMADIR (T4e). Rolu YAZILMAMIS eski kayitlar icin (E1/E3
// donemi) yalniz gorev eslesmesi aranir — geri uyum.
let dikis = "atlandi";
try {
  const gy = join(KOK, "00_pano", "zarf-gunlugu.jsonl");
  if (existsSync(gy)) {
    const acik = new Set();
    for (const l of readFileSync(gy, "utf8").split("\n")) {
      if (!l) continue;
      let j; try { j = JSON.parse(l); } catch { continue; }
      if (j.tip !== "sevk-karar" || typeof j.gorev !== "string") continue;
      if (DONEM && j.donem && j.donem !== DONEM) continue;
      acik.add(typeof j.rol === "string" && j.rol ? j.rol + " " + j.gorev : j.gorev);
    }
    if (acik.size) {
      const esti = dikisGorev && (acik.has(tipHam + " " + dikisGorev) || acik.has(dikisGorev));
      dikis = esti ? "esti" : "sapma";
    }
  }
} catch {}
if (dikis === "sapma") {
  kayit({ tip: "bulgu", ajan: tipHam, gorev: dikisGorev, cins: "dikis-sapma", detay: "sevkin acmadigi (rol, gorev) ikilisinden donus geldi (talimat-fiil dikisi, donus ucu)" });
}

// Geçti: zarf + biçim kaydı günlüğe (tek append-aracı üzerinden; ham metin 4000 karakterle kirpilir).
// `sinif: karne` (E4): karneci koltugun zarfi IS zarfi degildir — karne TAZELIK olcumunde ve
// oz-karne kaynak aramasinda bu zarflar disarida birakilir (aksi halde karne kendi zarfindan
// eski gorunur ve sevk sonsuza dek yeniden dogrulayici acardi).
kayit({
  tip: "zarf", ajan: tipHam, gorev, sinif: karneciMi ? "karne" : (denetciMi ? "hukum" : "is"),
  alanlar: {
    biten: biten, catal: catalYok ? "yok" : "dolu",
    ceviri: alan["ÇEVİRİ"] || null, etki: alan["ETKİ"] || null, bekletir: alan["BEKLETİR"] || null,
    degerlendirmediklerim: alan["DEĞERLENDİRMEDİKLERİM"], siradaki: alan["SIRADAKİ"],
    turetme_izi: alan["TÜRETME-İZİ"], geri_cekilen: alan["GERİ-ÇEKİLEN"],
    izin_engeli: alan["İZİN-ENGELİ"] || null,
  },
  dikis, ham: (metin || "").slice(0, 4000),
});
// Karne kaydi ZARFTAN SONRA duser: tazelik "karne indeksi > son is-zarfi indeksi" ile olculur;
// sira tersine donerse kendi zarfi karneyi bayat gosterirdi.
if (karneKaydi) kayit(karneKaydi);
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
EYLEMLER=""
while IFS= read -r satir; do
  case "$satir" in
    LOG$'\t'*)
      if ! printf '%s' "${satir#LOG$'\t'}" | bash "$KOK/tools/sevk/zarf-ekle.sh"; then
        YAZIM_HATASI=1
      fi
      ;;
    EYLEM$'\t'*)
      # Eylemler LOG'lardan SONRA toplanır ve LOG yazımı bittikten sonra koşar (E3):
      # kuyruğa giden sahip-yüzeyi metni günlükteki zarf kaydından okunur — sıra önemlidir.
      EYLEMLER="$EYLEMLER${satir#EYLEM$'\t'}"$'\n'
      ;;
  esac
done <<EOF_CIKTI
$CIKTI
EOF_CIKTI

# E3 · kuyruğa mekanik ekleme. Yazım hatası kapıyı KIRMIZI yapmaz (çatal hükmü zaten günlükte;
# kuyruk yazımı sahip-yüzeyi işidir) ama İZSİZ de kalmaz: sonuç günlüğe bulgu olarak düşer.
if [ -n "$EYLEMLER" ]; then
  KUYRUK_ARIZA=""
  while IFS=$'\t' read -r EYLEM ARG HARIC; do
    [ -n "$EYLEM" ] || continue
    case "$EYLEM" in
      kuyruk-ekle)
        SONUC="$(bash "$KOK/tools/sevk/catal-kuyruk.sh" --ekle "$ARG" "${HARIC:-}" 2>&1 | head -n1 || true)"
        DURUM="${SONUC%%$'\t'*}"
        AYRINTI="${SONUC#*$'\t'}"
        case "$DURUM" in
          EKLENDI) CINS="kuyruk-eklendi" ;;   # yeni madde sahibin kuyruğuna düştü
          ATLANDI) CINS="kuyruk-atlandi" ;;   # TEKİLLEŞTİRME — tek meşru atlama sınıfı
          # Teslimat ARIZASI (hasım bulgusu): süzgeçten GEÇMİŞ bir çatal sahibe ULAŞAMADI.
          # Eskiden bu da "atlandı" sayılıp yeşil geçiyordu — sorunun sessizce buharlaşması.
          ARIZA)   CINS="kuyruk-arizasi"; KUYRUK_ARIZA="$AYRINTI" ;;
          *)       CINS="kuyruk-hatasi";  KUYRUK_ARIZA="$AYRINTI" ;;
        esac
        # JSON gövdesi node ile kurulur: sebep metni Türkçe/serbesttir, kabukta kaçış güvenli
        # değildir (bozuk satır bütün gözleri köreltir — günlük tek-nokta veri katmanı).
        B_DONEM="$DONEM_ID" B_GOREV="$ARG" B_CINS="$CINS" B_DETAY="$AYRINTI" \
          "$NODE_BIN" --input-type=module -e '
const k = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
console.log(JSON.stringify({ surum: 1, ts: new Date().toISOString(), donem: k(process.env.B_DONEM, 120) || null,
  tip: "bulgu", gorev: k(process.env.B_GOREV, 24), cins: k(process.env.B_CINS, 40), detay: k(process.env.B_DETAY, 200) }));
' | bash "$KOK/tools/sevk/zarf-ekle.sh" >/dev/null 2>&1 || true
        # ── HABER · catal-bekliyor (E5) ─────────────────────────────────────────────────
        # Metin KUYRUK SATIRINDAN okunur, zarftan DEĞİL: kuyruğa yazılan cümle catal-kuyruk.sh
        # tarafından zaten temizlenmiş/kısaltılmıştır (yapı işaretleri soyulur, tavan uygulanır).
        # Böylece sahibin ekranda gördüğü cümle ile telefonuna düşen cümle AYNI olur — iki ayrı
        # yerde ayrı ayrı kurulan metin, sürüklenmenin en ucuz doğduğu yerdir (D-02 dersi).
        if [ "$DURUM" = "EKLENDI" ]; then
          KUYRUK_ALAN="$(K_YOL="$KOK/00_pano/SENDE_BEKLEYEN.md" K_ID="$AYRINTI" "$NODE_BIN" --input-type=module -e '
import { readFileSync } from "node:fs";
let s = "";
try { s = readFileSync(process.env.K_YOL || "", "utf8"); } catch { process.exit(0); }
const id = String(process.env.K_ID || "");
const satir = s.split("\n").find((r) => r.includes("ÇATAL " + id));
if (!satir) process.exit(0);
const al = (re) => { const m = satir.match(re); return m ? m[1].trim() : ""; };
const ceviri = al(/ÇATAL\s+\S+\s+·\s+"([^"]*)"/);
const etki = al(/·\s*etki:\s*([^·]*)/);
const bekletir = al(/·\s*bekletir:\s*([^·]*)/);
console.log([ceviri, etki, bekletir].join("\t"));
' 2>/dev/null || true)"
          if [ -n "$KUYRUK_ALAN" ]; then
            H_CEVIRI="$(printf '%s' "$KUYRUK_ALAN" | cut -f1)"
            H_ETKI="$(printf '%s' "$KUYRUK_ALAN" | cut -f2)"
            H_BEKLETIR="$(printf '%s' "$KUYRUK_ALAN" | cut -f3)"
            CLAUDE_PROJECT_DIR="$KOK" haber_at --olay catal-bekliyor --donem "$DONEM_ID" \
              --kutu "$DONEM_KUTU" --catal "$AYRINTI" --anahtar "$AYRINTI" \
              --ceviri "$H_CEVIRI" --etki "$H_ETKI" --bekletir "$H_BEKLETIR" || true
          fi
        fi
        ;;
    esac
  done <<EOF_EYLEM
$EYLEMLER
EOF_EYLEM
fi

# ── DUR · HAT-2: TEYİT KAYDI (E5) ─────────────────────────────────────────────────────────
# Bu hat dönemi DURDURMAZ — SubagentStop kancasının çıkışı yalnız alt-ajanın dönüşüne etki eder
# (tasarı §4'ün düzeltmesi; tasarımın "birincil hat" cümlesi mekanik karşılıksızdı). Yaptığı iş
# KAYITTIR: DUR'un en erken KESİN görüldüğü an burasıdır — paralel demette Stop, ana modelin
# turu bitene kadar hiç ateşlenmez. Sabah yüzeyi "DUR ne zaman işledi, o an ne uçuyordu"
# sorusunu bu kayıttan cevaplar. Frenleme hat-1'de (devir kapısı), kapatma hat-3'te (sevk).
# Ayrı e-posta ATILMAZ: dört olay sözleşmesi şişirilmez, haber donem-bitti ile gider.
if [ -e "$KOK/tools/sevk/.dur" ] && [ -n "${NODE_BIN:-}" ]; then
  DUR_SEBEP="$(head -n1 "$KOK/tools/sevk/.dur" 2>/dev/null || true)"
  J_tip=dur-alindi J_donem="$DONEM_ID" J_kutu="$DONEM_KUTU" J_kaynak="isaret" \
    J_sebep="${DUR_SEBEP:-sebep yazılmamış}" json_kur 2>/dev/null \
    | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
fi

if [ "$YAZIM_HATASI" = "1" ] && [ "$SHA_BAYRAK" != "1" ]; then
  engel "zarf gunlugune yazilamadi — gunluk butunlugu suphede (fail-closed); tools/sevk/zarf-ekle.sh ciktisina bak"
fi

# Kuyruk teslimat ARIZASI fail-closed'dur (hasım bulgusu): süzgeçten GEÇMİŞ bir çatal sahibin
# kuyruğuna düşmediyse soru KAYBOLMUŞTUR. Kapı yeşil geçerse hiçbir göz bu cinse bakmıyor
# (dış gözün ② merceği açık madde arar, ④ merceği DÖNDÜ okur — "GEÇTİ ama düşmedi" ikisinin de
# dışında). İz zaten günlüğe düştü; burada dönüş de durdurulur.
if [ -n "${KUYRUK_ARIZA:-}" ] && [ "$SHA_BAYRAK" != "1" ]; then
  engel "çatal süzgeçten GEÇTİ ama sahibin kuyruğuna düşmedi ($KUYRUK_ARIZA) — soru kaybolmasın diye dönüş durduruldu (fail-closed); ÇATAL-KAYNAK görevi ile zarfın BİTEN görevi aynı mı, bak"
fi

case "$KOD" in
  0) exit 0 ;;
  2) engel "$MESAJ" ;;
  *) [ "$SHA_BAYRAK" = "1" ] && exit 0; engel "beklenmeyen karar: $KARAR_SATIRI (fail-closed)" ;;
esac
