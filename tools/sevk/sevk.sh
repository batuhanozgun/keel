#!/bin/bash
# sevk — otonom koşunun MOTORU (E4). Stop kancası: oturum bitmeye çalıştığında koşar.
# Tek işi: "sıradaki işi doğru role, doğru girdiyle vermek" (tek-odak ilkesi). İÇERİK YAZMAZ,
# KARAR BASMAZ, KAPI KAPATMAZ — kapıyı bağımsız karne kapatır (K2).
#
# Çıkış sözleşmesi:
#   exit 0, sessiz        = koşu yok (el-sürüşlü oturum HİÇ etkilenmez)
#   exit 2 + stderr       = durmayı ENGELLER; stderr'daki SEVK talimatı modele ulaşır
#   exit 0 + stdout       = koşu KAPANDI (açık iş yok / duran kapı) — gösterge silinir
#
# FAIL-CLOSED YÖNÜ (bilinçli): sevkin kendi hatası koşuyu SÜRDÜRMEZ, KAPATIR. Ters yön
#   (hatada exit 2) sonsuz Stop döngüsü üretirdi — motorun güvenli tarafı DURMAKTIR.
# Döngü frenleri ÜÇ katman: bütçe sayacı · ilerleme-yok eşiği · mutlak tur tavanı.
#   (`stop_hook_active` fren OLARAK KULLANILMAZ: sevk döngüsü tanımı gereği çok turludur.)
set -uo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOSTERGE="$DIZIN/.kosu-acik"

# En ucuz eleme: koşu yoksa bu kanca yok hükmünde.
[ -e "$GOSTERGE" ] || exit 0

GIRDI="$(cat 2>/dev/null || true)"

kapat() { # $1: sınıf · $2: sebep (tek satır) — koşuyu kapatır, gösterge silinir
  rm -f "$GOSTERGE"
  if [ -n "${NODE_BIN:-}" ]; then
    J_tip=kosu-kapanis J_kosu="${KOSU_ID:-bilinmiyor}" J_kutu="${KOSU_KUTU:-}" \
      J_sinif="$1" J_sebep="$2" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
  fi
  printf 'KOŞU KAPANDI · %s · %s\n%s\n' "${KOSU_ID:-bilinmiyor}" "$1" "$2"
  exit 0
}
# Günlüğe yazım FAIL-CLOSED'dur (hasım bulgusu — en ağırı): sevkin ÜÇ freni de (bütçe ·
# ilerleme-yok · mutlak tur tavanı) günlükteki `sevk-karar`/`nabiz` kayıtlarından SAYILIYOR.
# Yazım `|| true` ile yutulursa sayaçlar hiç ilerlemez ve üç fren birden sessizce ölür —
# sonsuz Stop döngüsü. Kayıt düşmüyorsa motorun güvenli tarafı DURMAKTIR.
yaz_ya_da_kapat() { # stdin: tek satır JSON
  if ! gunluge_yaz "$KOK" >/dev/null 2>&1; then
    kapat "ariza" "zarf günlüğüne yazılamadı — bütçe/ilerleme/tur sayaçları günlükten okunur, yazım ölünce üç fren birden ölür (fail-closed: motor durdu)"
  fi
}

[ -r "$DIZIN/ortak.sh" ] || { rm -f "$GOSTERGE"; printf 'KOŞU KAPANDI · arıza · ortak kitaplık yok (tools/sevk/ortak.sh) — sevk ailesi eksik\n'; exit 0; }
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

trap 'kapat "ariza" "sevk kendi içinde durdu (satır $LINENO) — fail-closed: motor durdu, koşu kapandı"' ERR

# ── 1 · Gösterge ──────────────────────────────────────────────────────────────────────────
# (|| ile yakalanır: ERR tuzağı kurulu, çıplak başarısızlık tuzağı ateşlerdi)
GOSTERGE_RC=0; kosu_oku "$KOK" || GOSTERGE_RC=$?
if [ "$GOSTERGE_RC" = "2" ]; then kapat "duran-kapi" "koşu göstergesi bozuk: ${KOSU_HATA} — kimliksiz/tanımsız koşu sevk edilemez (fail-closed)"; fi
if [ "$GOSTERGE_RC" != "0" ]; then exit 0; fi
[ -z "$KOSU_HATA" ] || printf 'sevk notu: %s\n' "$KOSU_HATA" >&2

node_bul || kapat "duran-kapi" "node bulunamadı — sevk karar veremiyor (fail-closed)"

# ── 2 · Kapılanma çapaları (çift hat: tören de bakmıştı; damga koşu içinde silinebilir) ────
EKSIK=""
[ -d "$KOK/03_roller/disgoz" ] || EKSIK="$EKSIK dış-göz-koltuğu"
for D in T0 T1 T2 T3; do [ -s "$DIZIN/damgalar/$D" ] || EKSIK="$EKSIK ${D}-damgası"; done
[ -z "$EKSIK" ] || kapat "duran-kapi" "kapılanma eksik —$EKSIK. Kalkansız motor yok (OTONOM_KOSU §10)."
if [ "${KOSU_SINIF:-gercek}" = "gercek" ]; then
  GERCEK_EKSIK="$(gercek_kutu_eksikleri "$DIZIN")"
  [ -z "$GERCEK_EKSIK" ] || kapat "duran-kapi" "gerçek kutu koşusunun ek şartları eksik —$GERCEK_EKSIK (OTONOM_KOSU §10; tatbikat koşuları muaftır)"
fi

# ── 2b · Bayat gösterge (hasım bulgusu): koşu anormal biterse gösterge diskte KALIR ve hiçbir
# şey onu temizlemez — sonraki sıradan oturumda sevk koşuyu "diriltir", devir kapısı her
# alt-ajan çağrısını keser. Asıl çözüm E5 watchdog'udur; buradaki TTL ikinci hattır.
KOSU_YAS_SAAT=""
if [ -n "${KOSU_DAMGA:-}" ]; then
  KOSU_YAS_SAAT="$(D="$KOSU_DAMGA" "$NODE_BIN" -e 'const t=Date.parse(process.env.D||"");console.log(Number.isFinite(t)?Math.floor((Date.now()-t)/3600000):"")' 2>/dev/null || true)"
fi
case "$KOSU_YAS_SAAT" in
  ''|*[!0-9]*) : ;;
  *) [ "$KOSU_YAS_SAAT" -lt 12 ] || kapat "duran-kapi" "koşu göstergesi BAYAT (${KOSU_YAS_SAAT} saat önce açılmış) — koşu anormal bitmiş olabilir; gösterge temizlendi. Yeniden başlatma sahibin işidir (watchdog E5)." ;;
esac

# ── 2c · Kurulum türünde mekanik kapı raporu (kurulum denetçisinin okuyacağı ek-okuma) ─────
if [ "$KOSU_TUR" = "kurulum" ] && [ -r "$DIZIN/kurulum-kapisi.sh" ]; then
  CLAUDE_PROJECT_DIR="$KOK" bash "$DIZIN/kurulum-kapisi.sh" "$KOSU_KUTU" "$KOK" \
    > "$KOK/00_pano/kurulum-kapisi.txt" 2>&1 || true
fi

# ── 3 · DUR işareti (2. hat; birincil hat SubagentStop — E5) ──────────────────────────────
if [ -e "$DIZIN/.dur" ]; then
  DUR_SEBEP="$(head -n1 "$DIZIN/.dur" 2>/dev/null || true)"
  kapat "duran-kapi" "DUR işareti var (tools/sevk/.dur): ${DUR_SEBEP:-sebep yazılmamış}"
fi

# ── 4 · Kuyruk durumu (BEKLETİR kilidinin BİRİNCİL hattı) ─────────────────────────────────
KUYRUK_DURUM=""; KUYRUK_HATA=0
if [ -f "$KOK/00_pano/SENDE_BEKLEYEN.md" ]; then
  if [ -r "$DIZIN/catal-kuyruk.sh" ]; then
    KUYRUK_DURUM="$(CLAUDE_PROJECT_DIR="$KOK" bash "$DIZIN/catal-kuyruk.sh" --durum 2>/dev/null)" || KUYRUK_HATA=1
  else
    KUYRUK_HATA=1
  fi
fi
[ "$KUYRUK_HATA" = "0" ] || kapat "duran-kapi" "sahibin kuyruğu okunamadı — BEKLETİR kilidi değerlendirilemedi (fail-closed); 00_pano/SENDE_BEKLEYEN.md ve tools/sevk/catal-kuyruk.sh'a bak"

# ── 5 · Çözümleme (tek node turu) ─────────────────────────────────────────────────────────
CIKTI="$(printf '%s' "$GIRDI" | S_KOK="$KOK" S_KOSU="$KOSU_ID" S_KUTU="$KOSU_KUTU" S_TUR="$KOSU_TUR" \
  S_KIP="$KOSU_KIP" S_KUYRUK="$KUYRUK_DURUM" \
  "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KOK = process.env.S_KOK || ".";
const KOSU = process.env.S_KOSU || null;
const KUTU = process.env.S_KUTU || "";
const TUR = process.env.S_TUR || "yapim";
const KIP = process.env.S_KIP || "interaktif";

const loglar = [], metin = [];
const kayit = (o) => loglar.push(JSON.stringify({ surum: 1, ts: new Date().toISOString(), kosu: KOSU, ...o }));
const yaz = (s) => metin.push(s);
let BEKCI_GEREK = 0;
const bitir = (karar) => {
  console.log("KARAR\t" + karar);
  console.log("BEKCI\t" + BEKCI_GEREK);
  for (const l of loglar) console.log("LOG\t" + l);
  // Cok satirli mesaj protokolu bozmasin: her fiziksel satir ayri METIN kaydidir.
  for (const m of metin) for (const s of String(m).split("\n")) console.log("METIN\t" + s);
  process.exit(0);
};
const dur = (sebep) => { kayit({ tip: "bulgu", cins: "duran-kapi", detay: sebep }); yaz(sebep); bitir("DUR"); };

// ── KUTU.md: kapi tablosu + durus sozlesmesi + bagimlilik/risk blogu ────────────────────
const kutuYol = join(KOK, "01_kutular", KUTU, "KUTU.md");
if (!KUTU || !existsSync(kutuYol)) dur("kosu gostergesindeki kutu bulunamadi: 01_kutular/" + KUTU + "/KUTU.md — sevk neyi koşturacagini bilmiyor");
const kutuMetin = readFileSync(kutuYol, "utf8");

const DURUM_SOZ = new Set(["açık", "sürüyor", "mühür-bekliyor", "kapalı", "pas"]);
const kapilar = [];
for (const s of kutuMetin.split("\n")) {
  if (!/^\s*\|/.test(s)) continue;
  const h = s.split("|").map((x) => x.trim());
  if (h.length < 6) continue;
  if (!/^G-\d+$/.test(h[1])) continue;
  // Durum hucresi "açık — sevkte" gibi ek tasiyabilir (kokpit de ayni yerden keser).
  kapilar.push({ id: h[1], is: h[2], sahip: h[3], durum: (h[4] || "").split(/[—–]/)[0].trim(), kanit: h[5] });
}
if (!kapilar.length) dur("KUTU.md kapi tablosu okunamadi (G-NN satiri yok) — sevk gorev listesini goremiyor");
for (const k of kapilar) {
  if (!DURUM_SOZ.has(k.durum)) dur("kapi durumu sozlukte yok: " + k.id + " = " + JSON.stringify(k.durum) + " (izinli: açık · sürüyor · mühür-bekliyor · kapalı · pas)");
}

const blok = (baslik) => {
  const satirlar = kutuMetin.split("\n");
  const bas = satirlar.findIndex((s) => new RegExp("^##\\s+" + baslik).test(s));
  if (bas < 0) return null;
  const govde = [];
  for (let i = bas + 1; i < satirlar.length; i++) {
    if (/^##\s/.test(satirlar[i])) break;
    govde.push(satirlar[i]);
  }
  return govde.join("\n");
};

// BUTCE: durus sozlesmesinin BUTCE satirindaki ilk sayi. Yoksa fail-closed varsayilan 3 + bulgu.
let BUTCE = 3;
const durusBlok = blok("Duruş sözleşmesi");
const butceSatir = (durusBlok || "").split("\n").find((s) => /^\s*BÜTÇE\s*:/.test(s));
const butceSayi = butceSatir && butceSatir.match(/(\d+)/);
if (butceSayi) BUTCE = Number(butceSayi[1]);
else kayit({ tip: "bulgu", cins: "butce-okunmadi", detay: "durus sozlesmesinde BÜTÇE satiri yok/sayisiz — fail-closed varsayilan 3" });

// Bagimlilik/risk blogu: her kapi icin bir satir sart (kurulum kapisinin de aradigi sema).
const riskBlok = blok("Bağımlılık ve risk");
if (riskBlok === null) dur("KUTU.md bagimlilik/risk blogu yok — kutu otonom kosuya hazir degil (OTONOM_KOSU §3; kurulum kapisi bunu arar)");
const bagimlilik = {};
for (const s of riskBlok.split("\n")) {
  const m = s.match(/^\s*(G-\d+)\s*:\s*onkosul=([^·]*)·\s*risk=(düşük|riskli)\b/);
  if (!m) continue;
  const on = /^\s*yok\s*$/.test(m[2]) ? [] : (m[2].match(/G-\d+/g) || []);
  bagimlilik[m[1]] = { onkosul: on, risk: m[3] };
}

// ── Zarf gunlugu: butunluk + kumeler ─────────────────────────────────────────────────────
const gunlukYol = join(KOK, "00_pano", "zarf-gunlugu.jsonl");
const kayitlar = [];
if (existsSync(gunlukYol)) {
  const satirlar = readFileSync(gunlukYol, "utf8").split("\n");
  for (let i = 0; i < satirlar.length; i++) {
    const l = satirlar[i];
    if (!l.trim()) continue;
    let j;
    try { j = JSON.parse(l); } catch {
      dur("zarf gunlugu bozuk: " + (i + 1) + ". satir JSON degil — butun gozler ayni anda korelir, kosu durdu (fail-closed)");
    }
    kayitlar.push({ i: i + 1, j });
  }
}
const buKosu = kayitlar.filter((r) => r.j.kosu === KOSU);
const sonIndeks = (sart) => { let n = -1; for (const r of kayitlar) if (sart(r.j)) n = r.i; return n; };
const sonKayit = (sart) => { let k = null; for (const r of kayitlar) if (sart(r.j)) k = r.j; return k; };

// Bekci kosu-ici tazeligi (§7.4): kapi kapanisi ANINDA — yani gunluge YENI bir karne dustugu
// turda — isik tazelenir. Otonom kosuda oturum uzundur; SessionEnd bekcisi beklenirse Stop-turu
// BAYAT isik okur. Karari node verir; kosturan ve KIRMIZI ise EZEN taraf kabuktur.
if (sonIndeks((j) => j.tip === "karne") > sonIndeks((j) => j.tip === "bekci")) BEKCI_GEREK = 1;

const zarfSayisi = buKosu.filter((r) => r.j.tip === "zarf").length;
const nabizlar = buKosu.filter((r) => r.j.tip === "nabiz").map((r) => r.j);
const TUR_NO = nabizlar.length + 1;
const sevkKararlari = buKosu.filter((r) => r.j.tip === "sevk-karar").map((r) => r.j);

// ── Frenler ─────────────────────────────────────────────────────────────────────────────
const TUR_TAVANI = 3 * BUTCE + 5;
if (TUR_NO > TUR_TAVANI) dur("mutlak tur tavani asildi (" + TUR_NO + " > " + TUR_TAVANI + ") — sonsuz Stop dongusune karsi son kemer; kosu durdu");
const sonIki = nabizlar.slice(-2);
if (sonIki.length === 2 && sonIki.every((n) => n.zarf_sayisi === zarfSayisi)) {
  dur("ilerleme yok: son iki turda gunluge yeni zarf dusmedi (zarf sayisi " + zarfSayisi + ") — gorev bolunmeli ya da halka kopmus (maxTurns kesmesi ISARETSIZDIR, E0 kalem 4)");
}
if (sevkKararlari.length >= BUTCE) {
  dur("butce tavani doldu: bu kosuda " + sevkKararlari.length + " alt-ajan kosusu acildi (tavan " + BUTCE + ") — sahip bakmadan bu kadari kurulur (K-G)");
}

// ── Kuyruk: BEKLETIR kilidi + cozulemeyen madde ─────────────────────────────────────────
const bekletilen = new Set();
const cozulemeyen = [];
for (const s of (process.env.S_KUYRUK || "").split("\n")) {
  if (!s.trim()) continue;
  const [id, durum, bek] = s.split("\t");
  if (durum === "COZULEMEDI") { cozulemeyen.push(id); continue; }
  if (durum !== "CEVAP-BEKLIYOR" && durum !== "CEVIRI-KUSURU") continue;
  for (const g of (bek || "").split(/\s+/)) if (/^G-\d+$/.test(g)) bekletilen.add(g);
}
if (cozulemeyen.length) {
  dur("sahibin kuyrugunda yapisi okunmayan madde var (" + cozulemeyen.join(" ") + ") — hangi gorevin bekledigi bilinemiyor (fail-closed); 00_pano/SENDE_BEKLEYEN.md maddesini bicime dondur");
}

// ── Karne okumasi ───────────────────────────────────────────────────────────────────────
// Bir kapi ancak: (1) tablosunda kapali (2) YESIL karnesi var (3) karne TAZE — o gorevin son
// zarf kaydindan SONRA yazilmis. Aksi halde kapi kapali SAYILMAZ.
const karneDurumu = (kapi) => {
  const k = sonKayit((j) => j.tip === "karne" && j.kapi === kapi);
  if (!k) return { var: false };
  const kIdx = sonIndeks((j) => j.tip === "karne" && j.kapi === kapi);
  // Tazelik yalniz IS zarflarina gore olculur: karnecinin/denetcinin kendi zarfi (sinif "karne"
  // ya da "hukum") is degildir; sayilsaydi karne daima kendi zarfindan eski gorunurdu.
  const zIdx = sonIndeks((j) => j.tip === "zarf" && j.gorev === kapi && j.sinif !== "karne" && j.sinif !== "hukum");
  return { var: true, hukum: k.hukum, taze: kIdx > zIdx, ajan: k.ajan };
};
// Bu KOŞUDA fiilen is uretilmis kapi (karneci/denetci zarflari is degildir).
const isZarfiVar = (kapi) => kayitlar.some((r) => r.j.tip === "zarf" && r.j.kosu === KOSU &&
  r.j.gorev === kapi && r.j.sinif !== "karne" && r.j.sinif !== "hukum");

// MIRAS KAPI AYRIMI (hasim bulgusu): karne mekanigi bu paketle DOGDU — koşudan ONCE kapanmis
// hicbir kapinin karnesi olamaz. Ilk surum her `kapalı` satira dogrulayici sevk ediyordu:
// eski bir kutu acildiginda butce yalniz miras kapilari dogrulamaya giderdi. Kural: karne
// sarti BU KOSUNUN DOKUNDUGU kapilara uygulanir; miras kapi tabloya guvenilerek kapali sayilir
// ve bir kez `miras-kapi` bulgusu duser (sessiz gecmez, ama koşuyu da yemez).
const kapaliSayilir = (kapi) => {
  const k = kapilar.find((x) => x.id === kapi);
  if (!k) return false;
  if (k.durum === "pas") return true;              // is yapilmadi — karne istenmez (tasarim §5.2)
  if (k.durum !== "kapalı") return false;
  if (!isZarfiVar(kapi)) return true;              // miras kapi
  const kn = karneDurumu(kapi);
  return kn.var && kn.hukum === "YEŞİL" && kn.taze;
};

const ajanVar = (slug) => /^[a-z0-9_-]+$/.test(String(slug || "")) && existsSync(join(KOK, ".claude", "agents", slug + ".md"));

const talimat = (rol, gorev, tip, sebep, ekOkuma) => {
  kayit({ tip: "sevk-karar", gorev, rol, is_tipi: tip, sebep });
  kayit({ tip: "nabiz", gorev, tur_no: TUR_NO, zarf_sayisi: zarfSayisi });
  yaz("SEVK · " + KOSU + " · tur " + TUR_NO + "/" + TUR_TAVANI + " · butce " + (sevkKararlari.length + 1) + "/" + BUTCE + " · " + sebep);
  yaz("AC: Agent araciyla alt-ajan kosusu — subagent_type: " + rol);
  yaz("DEVIR METNI (AYNEN gecir, baska hicbir satir ekleme):");
  yaz("gorev: " + gorev);
  yaz("kutu: 01_kutular/" + KUTU + "/KUTU.md");
  // ISARETCI YALNIZ VAR OLANI GOSTERIR (T4b/T4d canli olcumu, 2026-07-28): sevk her role
  // "03_roller/<rol>/ROL.md" yaziyordu; yazamaz alt-ajan koltuklarinin (dogrulayici,
  // catal-denetcisi, kurulum-denetcisi) 03_roller evi YOKTUR — sozlesmeleri koltuk dosyasidir.
  // Kopuk isaretci devir metnini yalanci yapar ve dogrulayici bunu KIRMIZI yazdi (haklıydı).
  const rolEvi = join(KOK, "03_roller", rol, "ROL.md");
  if (existsSync(rolEvi)) yaz("sozlesme: 03_roller/" + rol + "/ROL.md");
  else if (existsSync(join(KOK, ".claude", "agents", rol + ".md"))) yaz("sozlesme: .claude/agents/" + rol + ".md");
  if (existsSync(join(KOK, "02_kanon", "OTONOM_KOSU.md"))) yaz("kural: 02_kanon/OTONOM_KOSU.md");
  if (ekOkuma) yaz("ek-okuma: " + ekOkuma);
  bitir("SEVK");
};

// ── Tur: kurulum / kapanis — tek zorunlu goz, uretim kapisi acilmaz ─────────────────────
if (TUR === "kurulum" || TUR === "kapanis") {
  const kapi = TUR === "kurulum" ? "KURULUM" : "KAPANIS";
  const rol = TUR === "kurulum" ? "kurulum-denetcisi" : "dogrulayici";
  // TAZELIK BU DALDA DA ARANIR (hasim bulgusu): karne sartinin yazili ucuncu kosulu
  // ("karne son degisiklikten SONRA") kurulum/kapanis dalinda hic sorulmuyordu. KURULUM ve
  // KAPANIS kapilarinin "is zarfi" yoktur; onlarin tazeligi KOSU-YERELDIR — onceki koşudan
  // kalma bir YEŞİL karne bugunku kurulumu kapatamaz.
  const k = karneDurumu(kapi);
  const kayitBuKosuda = kayitlar.some((r) => r.j.tip === "karne" && r.j.kapi === kapi && r.j.kosu === KOSU);
  if (k.var && !kayitBuKosuda) {
    kayit({ tip: "bulgu", gorev: kapi, cins: "bayat-karne", detay: "karne onceki kosudan — " + TUR + " kapisi kosu-yerel karne ister" });
  }
  if (k.var && kayitBuKosuda && k.hukum === "YEŞİL") {
    yaz(TUR === "kurulum"
      ? "kurulum denetimi YESIL — acilis muhru sahibin. Denetci raporu muhur paketine eklenir."
      : "kapanis denetimi YESIL — kapanis muhru sahibin (D7 muhur paketi).");
    bitir("KAPAT");
  }
  if (k.var && kayitBuKosuda && k.hukum !== "YEŞİL") {
    dur(kapi + " karnesi " + k.hukum + " — kutu bu haliyle " + (TUR === "kurulum" ? "acilis" : "kapanis") + " muhrune gidemez; bulgular kapatilmadan kosu surmez");
  }
  if (!ajanVar(rol)) dur("zorunlu goz kadroda yok: .claude/agents/" + rol + ".md — " + TUR + " kosusu bagimsiz denetim olmadan kapanamaz");
  // MEKANIK KALEM KANALI (hasim bulgusu — kapatilmazsa kurulum turu yapisal olarak YESILE
  // ULASAMAZ): koltugun sozlesmesi "mekanik kalemlerin sonucu sana prompt icinde verilir"
  // diyordu ama verecek kanal yoktu (devir semasi serbest metni kesiyor). Kabuk tarafi
  // kurulum-kapisi.sh raporunu diske yazar, devir metni onu `ek-okuma` ISARETCISI olarak tasir.
  const mekanikRapor = "00_pano/kurulum-kapisi.txt";
  talimat(rol, kapi, TUR === "kurulum" ? "kurulum-denetimi" : "kapanis-denetimi",
    TUR === "kurulum" ? "kurulum kapisi: acilis muhru oncesi bagimsiz denetim (7 kalem)" : "kapanis kapisi: G-15 sinifi bagimsiz denetim",
    TUR === "kurulum" && existsSync(join(KOK, mekanikRapor)) ? mekanikRapor : null);
}

// ── Tur: yapim ──────────────────────────────────────────────────────────────────────────
// (0) Catal suzgeci — E3ten E4e gelen ZORUNLU girdi (tasarim §7.2): zarfta ÇATAL dolu dustuyse
//     soru sahibe GITMEDEN once catal-denetcisi kosusu acilir. Suzgec hukmu (catal-suzgec kaydi)
//     gelmemis bir catal, kuyruga da dusmemistir — bu is her seyin onunde gelir: acik catal
//     BEKLETIR listesindeki gorevleri kilitler, yani beklemek koseyi tikar.
const catalBekleyen = [];
for (const r of kayitlar) {
  const j = r.j;
  if (j.tip !== "zarf" || !j.gorev || !j.alanlar || j.alanlar.catal !== "dolu") continue;
  const sIdx = sonIndeks((x) => x.tip === "catal-suzgec" && x.gorev === j.gorev);
  if (sIdx > r.i) continue;                       // hukum zaten verilmis
  if (!catalBekleyen.includes(j.gorev)) catalBekleyen.push(j.gorev);
}
if (catalBekleyen.length) {
  if (!ajanVar("catal-denetcisi")) dur("catal-denetcisi kadroda yok (.claude/agents/catal-denetcisi.md) — suzgecten gecmemis catal sahibe gonderilemez (D-25 ③)");
  talimat("catal-denetcisi", catalBekleyen[0], "catal-suzgeci",
    "catal suzgeci: " + catalBekleyen[0] + " gorevinin catali sahibe gitmeden once bes kalemden gecer");
}

// (a) Karne sarti — BU KOŞUDA is uretilmis ama karnesiz/bayat kapi (miras kapi haric — yukarida)
for (const k of kapilar) {
  if (k.durum !== "kapalı") continue;
  if (!isZarfiVar(k.id)) {
    const knm = karneDurumu(k.id);
    if (!knm.var) kayit({ tip: "bulgu", gorev: k.id, cins: "miras-kapi", detay: "kosu oncesi kapanmis, bagimsiz karnesi yok — tabloya guveniliyor (karne mekanigi E4te dogdu)" });
    continue;
  }
  const kn = karneDurumu(k.id);
  if (kn.var && kn.hukum === "YEŞİL" && kn.taze) continue;
  if (kn.var && kn.hukum !== "YEŞİL") {
    dur("kapi " + k.id + " kapali isaretli ama karnesi " + kn.hukum + " — duzeltme rolun/sahibin isidir, sevk kapiyi kendi acamaz (v1 sinir)");
  }
  if (kn.var && !kn.taze) {
    kayit({ tip: "bulgu", gorev: k.id, cins: "bayat-karne", detay: "karne son zarftan ONCE yazilmis — is yeniden dokunuldu" });
  }
  if (!ajanVar("dogrulayici")) dur("dogrulayici kadroda yok (.claude/agents/dogrulayici.md) — karnesiz kapi kapatilamaz (K2)");
  talimat("dogrulayici", k.id, "dogrulama",
    "karne sarti: " + k.id + " kapali isaretli ama " + (kn.var ? "karnesi bayat" : "bagimsiz karnesi yok") + " — kimse kendi isine yesil diyemez");
}

// (b) Gorev secimi — bes suzgec
// YENIDEN-SEVK HAKKI (T4 on-olcumunun dusurdugu kusur, 2026-07-28): model-araciyi halka
// kopabilir — talimat verilir ama alt-ajan cagrisi hic yapilmaz ya da devir kapisinda doner.
// Ilk surumde bu gorev "ucusta" sayilip koşunun sonuna kadar KILITLENIYORDU (canli olcumde
// gorüldü: tek dusen cagri butun kosuyu duran kapiya soktu). Kural: donusu gelmemis gorev BIR
// KEZ yeniden sevk edilir (taze cagri — §2.3 zaten "aynı alt-ajan surdurulmez" diyor); ikinci
// kez de donmezse ucustadir ve duran kapi uretir. Sessiz sonsuz tekrar YOK.
const acilis = {};
for (const sk of sevkKararlari) {
  if (sk.is_tipi !== "uretim" || typeof sk.gorev !== "string") continue;
  acilis[sk.gorev] = (acilis[sk.gorev] || 0) + 1;
}
const donen = new Set(kayitlar
  .filter((r) => r.j.tip === "zarf" && r.j.kosu === KOSU && r.j.sinif !== "karne" && r.j.sinif !== "hukum")
  .map((r) => r.j.gorev));
const ucusta = new Set(Object.keys(acilis).filter((g) => !donen.has(g) && acilis[g] >= 2));
const yeniden = new Set(Object.keys(acilis).filter((g) => !donen.has(g) && acilis[g] === 1));
const engeller = [];
let secilen = null;
for (const k of kapilar) {
  if (k.durum === "kapalı") continue;
  if (k.durum === "pas") { kayit({ tip: "bulgu", gorev: k.id, cins: "pas-kapi", detay: "kapi pas isaretli — is yapilmadi, sessiz gecmesin" }); continue; }
  if (k.durum === "mühür-bekliyor") { engeller.push(k.id + ": muhur bekliyor (sahip)"); continue; }
  if (ucusta.has(k.id)) { engeller.push(k.id + ": iki kez sevk edildi, donus gelmedi (halka kopuk — gorev bolunmeli ya da rol dosyasi hatali)"); continue; }
  // ISLENMIS AMA KAPANMAMIS (T4 on-olcumu, 2026-07-28): rol zarfini dondurdu ama kapi satirini
  // kapatmadi. Yeniden sevk etmek AYNI ISI TEKRAR yaptirirdi ve ilerleme-yok freni de tutmazdi
  // (her turda yeni zarf duser). Bu bir kusurdur: iz birakilir ve kapi acilmaz.
  if (donen.has(k.id)) {
    kayit({ tip: "bulgu", gorev: k.id, cins: "kapi-kapatilmadi", detay: "donus zarfi geldi ama kapi satiri hala " + k.durum });
    engeller.push(k.id + ": donusu geldi ama kapi satiri hala " + k.durum + " (rol Durum hucresini kapatmadi — tekrar sevk edilmez, ayni is iki kez yapilmaz)");
    continue;
  }
  if (k.durum === "sürüyor" && !yeniden.has(k.id)) { engeller.push(k.id + ": suruyor isaretli ama acik sevk karari yok (yarim kalmis olabilir)"); continue; }
  if (bekletilen.has(k.id)) { engeller.push(k.id + ": cevapsiz catalin BEKLETIR listesinde"); continue; }
  const bg = bagimlilik[k.id];
  if (!bg) { engeller.push(k.id + ": bagimlilik/risk satiri yok"); continue; }
  const acikOn = bg.onkosul.filter((o) => !kapaliSayilir(o));
  if (acikOn.length) { engeller.push(k.id + ": onkosul cozulmedi (" + acikOn.join(" ") + ")"); continue; }
  if (!ajanVar(k.sahip)) { engeller.push(k.id + ": sahibi kadroda yok (.claude/agents/" + k.sahip + ".md)"); continue; }
  secilen = k;
  break;
}

if (secilen) {
  const bg = bagimlilik[secilen.id];
  talimat(secilen.sahip, secilen.id, "uretim",
    (yeniden.has(secilen.id) ? "YENIDEN sevk (onceki cagri donmedi): " : "sirada: ") +
    secilen.id + " (risk=" + bg.risk + (bg.risk === "riskli" ? "; worktree + commit yasagi" : "") + ")");
}

// (c) Acik is yok
const acikVar = kapilar.some((k) => k.durum === "açık" || k.durum === "sürüyor" || k.durum === "mühür-bekliyor");
if (!acikVar) {
  const bulgular = buKosu.filter((r) => r.j.tip === "bulgu").length;
  const karneli = kapilar.filter((k) => k.durum === "kapalı" && kapaliSayilir(k.id)).length;
  // PAS AYRI SAYILIR (hasim bulgusu): pas kapida IS YAPILMADI; onu "kapali" diye raporlamak
  // sahip yuzeyinde yalan olur. Kapanis cumlesi pas sayisini acikca soyler.
  const pasli = kapilar.filter((k) => k.durum === "pas").map((k) => k.id);
  const miras = buKosu.filter((r) => r.j.cins === "miras-kapi").length;
  kayit({ tip: "nabiz", tur_no: TUR_NO, zarf_sayisi: zarfSayisi });
  yaz("GECE NE OLDU: " + sevkKararlari.length + " alt-ajan kosusu · " + karneli + "/" + kapilar.length +
      " kapi karneyle kapali" + (miras ? " · " + miras + " miras kapi (karnesiz, koşudan once kapanmis)" : "") + " · " + bulgular + " bulgu");
  yaz("SENDE BEKLEYEN: " + (bekletilen.size ? bekletilen.size + " gorevi bekleten acik catal var (00_pano/SENDE_BEKLEYEN.md)" : "kuyrukta acik catal yok"));
  yaz("SIMDI NE YAPIYOR: durdu — acik kapi kalmadi" +
      (pasli.length ? "; " + pasli.length + " kapi PAS (is YAPILMADI: " + pasli.join(" ") + ")" : "") +
      ". Kapanis muhru sahibin (D7 paketi).");
  if (KIP === "interaktif") yaz("not: bu kosu interaktif kipteydi — izin sorusu cikarsa kosu ASILI kalir (E5 watchdog/DUR yok).");
  bitir("KAPAT");
}

// (d) Acik kapi var ama hicbiri acilamiyor → duran kapi (SESSIZ "is bitti" DEMEZ)
kayit({ tip: "nabiz", tur_no: TUR_NO, zarf_sayisi: zarfSayisi });
dur("acik kapi var ama hicbiri acilamiyor:\n  - " + engeller.join("\n  - "));
')" || kapat "ariza" "sevk çözümleyicisi koşamadı (fail-closed) — motor durdu, koşu kapandı"

# ── 6 · Protokol çözümü ───────────────────────────────────────────────────────────────────
KARAR="$(printf '%s' "${CIKTI%%$'\n'*}" | cut -f2)"
BEKCI_GEREK="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="BEKCI"{print $2; exit}')"
LOGLAR="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="LOG"{sub(/^LOG\t/,""); print}')"
MESAJ="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="METIN"{sub(/^METIN\t/,""); print}')"

# ── 7 · Bekçi koşu-içi tazeliği (§7.4): kapı kapanışı turunda ışık tazelenir ──────────────
# Otonom koşuda oturum uzundur; bekçi yalnız SessionEnd'de koşarsa Stop-turu BAYAT ışık okur.
# KIRMIZI duran kapıdır ve node'un kararını EZER (sıra: önce ışık, sonra sevk).
# ÜÇ HASIM DÜZELTMESİ (2026-07-28):
#  (a) FAIL-CLOSED: bekçinin ÇIKIŞ KODU karara girer — çöken/erken ölen bekçi YEŞİL sayılmaz.
#      (Eskiden yalnız çıktı metninde "KIRMIZI" aranıyordu: çöken bekçi = sessiz yeşil.)
#  (b) KATEGORİ DUYARLI: KUTU tavan KIRMIZI'sı koşuyu DURDURMAZ — kanonun iki yerde yazdığı
#      istisna (OTONOM_KOSU §1 · GENESIS bekçi tarifi): o bir KAPANIŞ KİLİDİDİR, duran kapı değil.
#      `[tavan]` etiketli satırdaki KIRMIZI ayrı sayılır; başka her kategori durdurur.
#  (c) Bekçi çıktısı stdout/stderr AYRI okunur; ışık satır bazında sınıflanır.
if [ "${BEKCI_GEREK:-0}" = "1" ]; then
  BEKCI="$KOK/tools/bekci/bekci.sh"
  if [ ! -r "$BEKCI" ]; then
    kapat "duran-kapi" "bekçi yok (tools/bekci/bekci.sh) — koşu-içi ışık tazelenemiyor; kurulu projede bekçi zorunludur (GENESIS G3.2)"
  fi
  BEKCI_CIKIS=0
  BEKCI_CIKTI="$(cd "$KOK" && CLAUDE_PROJECT_DIR="$KOK" bash "$BEKCI" 2>&1)" || BEKCI_CIKIS=$?
  DURDURAN=""; TAVAN_KIRMIZI=""
  while IFS= read -r BS; do
    case "$BS" in
      *KIRMIZI*)
        case "$BS" in
          \[tavan\]*) TAVAN_KIRMIZI="var" ;;
          *)          DURDURAN="${DURDURAN}${BS} " ;;
        esac ;;
    esac
  done <<EOF_BEKCI
$BEKCI_CIKTI
EOF_BEKCI
  if [ -n "$DURDURAN" ]; then BEKCI_ISIK="KIRMIZI"
  elif [ "$BEKCI_CIKIS" != "0" ]; then BEKCI_ISIK="KIRMIZI"; DURDURAN="bekçi çıkış kodu $BEKCI_CIKIS (çıktısında KIRMIZI yok — betik çökmüş olabilir)"
  elif [ -n "$TAVAN_KIRMIZI" ]; then BEKCI_ISIK="TAVAN-KIRMIZI"
  else
    case "$BEKCI_CIKTI" in *SARI*) BEKCI_ISIK="SARI" ;; *) BEKCI_ISIK="YEŞİL" ;; esac
  fi
  J_tip=bekci J_kosu="$KOSU_ID" J_isik="$BEKCI_ISIK" JN_cikis="$BEKCI_CIKIS" \
    J_kaynak="sevk kapı-turu" json_kur 2>/dev/null | yaz_ya_da_kapat
  if [ "$BEKCI_ISIK" = "KIRMIZI" ]; then
    kapat "duran-kapi" "bekçi KIRMIZI (koşu-içi tazeleme): ${DURDURAN} — otonom koşuda bekçi kırmızısı duran kapıdır (OTONOM_KOSU §1)."
  fi
fi

# ── 8 · Günlük yazımı (kararın kesinleştiği an) ───────────────────────────────────────────
if [ -n "$LOGLAR" ]; then
  while IFS= read -r SATIR; do
    [ -n "$SATIR" ] || continue
    printf '%s' "$SATIR" | yaz_ya_da_kapat
  done <<EOF_LOG
$LOGLAR
EOF_LOG
fi

# ── 9 · Karar ─────────────────────────────────────────────────────────────────────────────
case "$KARAR" in
  SEVK)
    printf '%s\n' "$MESAJ" >&2
    exit 2
    ;;
  DUR)
    kapat "duran-kapi" "$MESAJ"
    ;;
  KAPAT)
    rm -f "$GOSTERGE"
    J_tip=kosu-kapanis J_kosu="$KOSU_ID" J_kutu="$KOSU_KUTU" J_sinif="acik-is-yok" \
      J_sebep="acik is kalmadi" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
    printf 'KOŞU KAPANDI · %s · açık iş yok\n%s\n' "$KOSU_ID" "$MESAJ"
    exit 0
    ;;
  *)
    kapat "ariza" "sevk beklenmeyen karar döndürdü: '${KARAR}' (fail-closed)"
    ;;
esac
