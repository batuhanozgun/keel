#!/bin/bash
# sevk — otonom dönemin MOTORU (E4). Stop kancası: oturum bitmeye çalıştığında koşar.
# Tek işi: "sıradaki işi doğru role, doğru girdiyle vermek" (tek-odak ilkesi). İÇERİK YAZMAZ,
# KARAR BASMAZ, GÖREV KAPATMAZ — görevi bağımsız karne kapatır (K2).
#
# Çıkış sözleşmesi:
#   exit 0, sessiz        = dönem yok (el-sürüşlü oturum HİÇ etkilenmez)
#   exit 2 + stderr       = durmayı ENGELLER; stderr'daki SEVK talimatı modele ulaşır
#   exit 0 + stdout       = dönem KAPANDI (açık iş yok / duran kapı) — gösterge silinir
#
# FAIL-CLOSED YÖNÜ (bilinçli): sevkin kendi hatası dönemi SÜRDÜRMEZ, KAPATIR. Ters yön
#   (hatada exit 2) sonsuz Stop döngüsü üretirdi — motorun güvenli tarafı DURMAKTIR.
# Döngü frenleri DÖRT katman: bütçe sayacı (yalnız ÜRETİM) · ilerleme-yok eşiği · mutlak tur
#   tavanı · üretim↔kapanış gidiş-dönüş tavanı (2).
#   (`stop_hook_active` fren OLARAK KULLANILMAZ: sevk döngüsü tanımı gereği çok turludur.)
#
# ÜÇ EVRE, TEK DÖNEM (F1-5a, 2026-07-30): üretim bitince dönem KAPANMAZ — göstergenin tür alanı
#   yerinde `kapanis` olur, üretim kilitlenir ve aynı dönem içinde dış göz brifingi + bağımsız
#   kapanış denetimi koşar. Kapanış karnesi KIRMIZI ise tür yerinde `yapim`a döner ve bulgu
#   sevk edilir (en çok 2 gidiş-dönüş). Sahibin iki tuşu vardır: açılış mührü ve kapanış mührü.
set -uo pipefail
export LC_ALL=C.UTF-8

KOK="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GOSTERGE="$DIZIN/.donem-acik"

# En ucuz eleme: dönem yoksa bu kanca yok hükmünde.
[ -e "$GOSTERGE" ] || exit 0

GIRDI="$(cat 2>/dev/null || true)"

# ── Kapanış yüzeyi (E5) — dönemin DÖRT bitiş hâlinde de aynı üç blok ─────────────────────
# Üç iş: uyanık-tutma savını bırak · 00_pano/SABAH.md'yi yerinde yeniden yaz · donem-bitti
# haberini gönder. Üçü de fail-OPEN'dır: kapanışın kendisi bunlara bağlı olamaz (kapanamayan
# dönem, kapanan dönemden çok daha kötüdür). Bloklar çözümleyiciden gelir — TEK üretici.
kapanis_yuzeyi() { # $1: 3. blok yedeği (bloklar hiç üretilemediyse)
  local B1="${BLOK1:-}" B2="${BLOK2:-}" B3="${BLOK3:-}"
  [ -n "$B1" ] || B1="dönem turu tamamlanamadı — sayaçlar okunamadı"
  [ -n "$B2" ] || B2="kuyruk durumu okunamadı (00_pano/SENDE_BEKLEYEN.md)"
  [ -n "$B3" ] || B3="${1:-durdu}"

  # Sav sızarsa Mac hiç uyumaz — bu ayrı bir arızadır; üç bırakma noktasından biri burasıdır.
  if [ -f "$DIZIN/.caffeinate-pid" ]; then
    kill "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)" 2>/dev/null || true
    rm -f "$DIZIN/.caffeinate-pid"
  fi

  # SABAH.md — YERİNDE yeniden yazılır (append DEĞİL), tavanlı. Gerekçe: D-21'in kapanış bloğu
  # bir SOHBET yüzeyidir; gözetimsiz gecenin sonunda sohbet yoktur. Yüzey dosya olmak zorunda,
  # ama şişme dedektörü kendi yüzeyinde de geçerli (PANO disiplini).
  if [ -d "$KOK/00_pano" ]; then
    {
      printf '# SABAH — %s · %s · %s\n\n' "${DONEM_KUTU:-?}" "${DONEM_ID:-?}" "$(date '+%Y-%m-%d %H:%M')"
      printf '## GECE NE OLDU\n%s\n\n## SENDE BEKLEYEN\n%s\n\n## ŞİMDİ NE YAPIYOR\n%s\n' "$B1" "$B2" "$B3"
    } 2>/dev/null | cut -c1-4096 > "$KOK/00_pano/SABAH.md" 2>/dev/null || true
  fi

  if command -v haber_at >/dev/null 2>&1; then
    CLAUDE_PROJECT_DIR="$KOK" haber_at --olay donem-bitti --donem "${DONEM_ID:-bilinmiyor}" \
      --kutu "${DONEM_KUTU:-}" --blok1 "$B1" --blok2 "$B2" --blok3 "$B3" || true
  fi
}

kapat() { # $1: sınıf · $2: sebep (tek satır) — dönemi kapatır, gösterge silinir
  rm -f "$GOSTERGE"
  kapanis_yuzeyi "durdu — $1: $2"
  if [ -n "${NODE_BIN:-}" ]; then
    J_tip=donem-kapanis J_donem="${DONEM_ID:-bilinmiyor}" J_kutu="${DONEM_KUTU:-}" \
      J_sinif="$1" J_sebep="$2" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
  fi
  printf 'DÖNEM KAPANDI · %s · %s\n%s\n' "${DONEM_ID:-bilinmiyor}" "$1" "$2"
  exit 0
}
# Günlüğe yazım FAIL-CLOSED'dur (hasım bulgusu — en ağırı): sevkin ÜÇ freni de (bütçe ·
# ilerleme-yok · mutlak tur tavanı) günlükteki `sevk-karar`/`nabiz` kayıtlarından SAYILIYOR.
# Yazım `|| true` ile yutulursa sayaçlar hiç ilerlemez ve üç fren birden sessizce ölür —
# sonsuz Stop döngüsü. Kayıt düşmüyorsa motorun güvenli tarafı DURMAKTIR.
# BORU İÇİNDE ÇAĞRILMAZ (yaşanmış kırılma, 2026-07-30): fonksiyon bir borunun sağ tarafındayken
# ALT KABUKTA koşar ve içindeki `exit` yalnız o alt kabuğu bitirir — `kapat` çağrılır, mesaj basılır,
# ama motor durmaz ve akış devam eder (tek olayda İKİ "DÖNEM KAPANDI" satırı). Bu yüzden yazım
# sonucu değişkene alınır, karar ANA kabukta verilir.
yaz_dene() { # stdin: tek satır JSON · dönüş: 0 = yazıldı · 1 = yazılamadı
  gunluge_yaz "$KOK" >/dev/null 2>&1
}
YAZIM_HATASI_METNI="zarf günlüğüne yazılamadı — bütçe/ilerleme/tur sayaçları günlükten okunur, yazım ölünce üç fren birden ölür (fail-closed: motor durdu)"

[ -r "$DIZIN/ortak.sh" ] || { rm -f "$GOSTERGE"; printf 'DÖNEM KAPANDI · arıza · ortak kitaplık yok (tools/sevk/ortak.sh) — sevk ailesi eksik\n'; exit 0; }
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

trap 'kapat "ariza" "sevk kendi içinde durdu (satır $LINENO) — fail-closed: motor durdu, dönem kapandı"' ERR

# ── 1 · Gösterge ──────────────────────────────────────────────────────────────────────────
# (|| ile yakalanır: ERR tuzağı kurulu, çıplak başarısızlık tuzağı ateşlerdi)
GOSTERGE_RC=0; donem_oku "$KOK" || GOSTERGE_RC=$?
if [ "$GOSTERGE_RC" = "2" ]; then kapat "duran-kapi" "dönem göstergesi bozuk: ${DONEM_HATA} — kimliksiz/tanımsız dönem sevk edilemez (fail-closed)"; fi
if [ "$GOSTERGE_RC" != "0" ]; then exit 0; fi
[ -z "$DONEM_HATA" ] || printf 'sevk notu: %s\n' "$DONEM_HATA" >&2

node_bul || kapat "duran-kapi" "node bulunamadı — sevk karar veremiyor (fail-closed)"

# ── 2 · Kapılanma çapaları (çift hat: tören de bakmıştı; koltuk dönem içinde silinebilir) ────
# Prova fişleri (T0-T3) F1-5h ile çıktı: KEEL sürümünün provasını kanıtlıyorlardı, BU kurulumun
# hazırlığını değil. Yerlerini bu projede ölçülebilen çapalar aldı (tören ile aynı liste).
EKSIK=""
[ -d "$KOK/03_roller/disgoz" ] || EKSIK="$EKSIK dış-göz-koltuğu"
[ -f "$KOK/.claude/agents/disgoz.md" ] || EKSIK="$EKSIK dış-göz-alt-ajan-koltuğu"
[ -f "$KOK/02_kanon/OTONOM_DONEM.md" ] || EKSIK="$EKSIK otonom-kural-evi"
[ -z "$EKSIK" ] || kapat "duran-kapi" "kapılanma eksik —$EKSIK. Kalkansız motor yok (OTONOM_DONEM §10)."
if [ "${DONEM_SINIF:-gercek}" = "gercek" ]; then
  GERCEK_EKSIK="$(gercek_kutu_eksikleri "$DIZIN")"
  [ -z "$GERCEK_EKSIK" ] || kapat "duran-kapi" "gerçek kutu döneminin ek şartları eksik —$GERCEK_EKSIK (OTONOM_DONEM §10; tatbikat dönemleri muaftır)"
fi

# ── 2b · Bayat gösterge (hasım bulgusu): dönem anormal biterse gösterge diskte KALIR ve hiçbir
# şey onu temizlemez — sonraki sıradan oturumda sevk dönemi "diriltir", devir kapısı her
# alt-ajan çağrısını keser. Asıl çözüm E5 watchdog'udur; buradaki TTL ikinci hattır.
DONEM_YAS_SAAT=""
if [ -n "${DONEM_DAMGA:-}" ]; then
  DONEM_YAS_SAAT="$(D="$DONEM_DAMGA" "$NODE_BIN" -e 'const t=Date.parse(process.env.D||"");console.log(Number.isFinite(t)?Math.floor((Date.now()-t)/3600000):"")' 2>/dev/null || true)"
fi
case "$DONEM_YAS_SAAT" in
  ''|*[!0-9]*) : ;;
  *) [ "$DONEM_YAS_SAAT" -lt 12 ] || kapat "duran-kapi" "dönem göstergesi BAYAT (${DONEM_YAS_SAAT} saat önce açılmış) — dönem anormal bitmiş olabilir; gösterge temizlendi. Yeniden başlatma sahibin işidir (watchdog E5)." ;;
esac

# ── 2c · Kurulum türünde mekanik kapı raporu (kurulum denetçisinin okuyacağı ek-okuma) ─────
if [ "$DONEM_TUR" = "kurulum" ] && [ -r "$DIZIN/kurulum-kapisi.sh" ]; then
  CLAUDE_PROJECT_DIR="$KOK" bash "$DIZIN/kurulum-kapisi.sh" "$DONEM_KUTU" "$KOK" \
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
CIKTI="$(printf '%s' "$GIRDI" | S_KOK="$KOK" S_DONEM="$DONEM_ID" S_KUTU="$DONEM_KUTU" S_TUR="$DONEM_TUR" \
  S_KUYRUK="$KUYRUK_DURUM" \
  "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const KOK = process.env.S_KOK || ".";
const DONEM = process.env.S_DONEM || null;
const KUTU = process.env.S_KUTU || "";
const TUR = process.env.S_TUR || "yapim";

const loglar = [], metin = [], alarmlar = [], eylemler = [];
let EVRE_HEDEF = "";   // dolu ise kabuk gostergenin tur alanini bununla degistirir (F1-5a)
// KAPAT kararinin SEBEBI: kabuk bunu sahip ekranina ve gunluge yazar. Varsayilan bilerek
// notrdur — kosmamis bir denetimin adini varsayilan yapmak, bu paketin kendi hatasiydi.
let KAPANIS_SEBEP = "donem kapandi";
const kayit = (o) => loglar.push(JSON.stringify({ surum: 1, ts: new Date().toISOString(), donem: DONEM, ...o }));
// BU TURUN kayitlari `loglar`dadir, `buKosu`da DEGIL (buKosu diskteki gecmisi okur). Ikisi
// toplanmazsa 41 bulgu dusen bir turda sahip ekrani "0 bulgu" der (hasim turu 2026-07-30).
const buTurBulgu = () => loglar.filter((l) => { try { return JSON.parse(l).tip === "bulgu"; } catch { return false; } }).length;
const yaz = (s) => metin.push(s);
let BEKCI_GEREK = 0;

// SABAH YUZEYI — uc blok, TEK uretici (E5). Eskiden bu uc satir yalnizca "acik is yok" dalinda
// yaz() ile kuruluyordu; artik HER karar yolunda OZET icinden uretilir ve UC yere birden gider:
// stdout (sahip ekrani) · 00_pano/SABAH.md (sabah yuzeyi) · e-posta govdesi. Ayni cumleyi iki
// yerde ayri ayri kurmak surüklenmenin en ucuz dogdugu yerdir (D-02 dersi).
const OZET = { sevk: 0, gorevToplam: 0, karneli: 0, bulgu: 0, miras: 0, izin: 0, pas: [], bekleyen: null, simdi: "" };
const ucBlok = () => {
  const b1 = (OZET.gorevToplam
    ? OZET.sevk + " alt-ajan cagrisi · " + OZET.karneli + "/" + OZET.gorevToplam + " gorev karneyle kapali"
      + (OZET.miras ? " · " + OZET.miras + " miras gorev (karnesiz, donemden once kapanmis)" : "")
      + " · " + OZET.bulgu + " bulgu"
    : OZET.sevk + " alt-ajan cagrisi · gorev tablosu okunamadi · " + OZET.bulgu + " bulgu")
    // IZIN ATLAMASI SAHIP YUZEYINE CIKAR (F1-5f): atlanan adim sessiz kalirsa "her sey yapildi"
    // sanilir. Kuyruga da ayri not duser; burasi sayidir, orasi maddedir.
    + (OZET.izin ? " · " + OZET.izin + " adim izin kapisinda atlandi" : "");
  const b2 = OZET.bekleyen === null
    ? "kuyruk durumu okunamadi (00_pano/SENDE_BEKLEYEN.md)"
    : (OZET.bekleyen ? OZET.bekleyen + " gorevi bekleten acik catal var (00_pano/SENDE_BEKLEYEN.md)"
                     : "kuyrukta acik catal yok");
  const b3 = (OZET.simdi || "durdu")
    + (OZET.pas.length ? "; " + OZET.pas.length + " gorev PAS (is YAPILMADI: " + OZET.pas.join(" ") + ")" : "");
  return [b1, b2, b3];
};
const bitir = (karar) => {
  // `buKosu` bu satirdan SONRA tanimlanir ve `dur()` cozumlemenin en basinda `bitir`i
  // cagirabilir — bu yuzden burada YALNIZ bu turun kayitlari eklenir (gecmis sayi 298. satirda
  // zaten yazildi; erken cagride OZET.bulgu sifirdir ve dogru sonuc yine bu turun sayisidir).
  OZET.bulgu = (OZET.bulgu || 0) + buTurBulgu();
  console.log("KARAR\t" + karar);
  console.log("EVRE\t" + EVRE_HEDEF);
  console.log("BEKCI\t" + BEKCI_GEREK);
  // KAPANIS SEBEBI CAGIRANDAN GELIR (hasim bulgusu 2026-07-30): kabuk tarafi KAPAT kararinda
  // SABIT olarak "kapanis denetimi YEŞİL" basiyordu — ama ayni karari KURULUM donemi de
  // kullaniyor ve orada kapanis denetimi HIC KOSMAZ. Sahip ekranina ve gunluge kosmamis bir
  // denetimin yesili yaziliyordu (`J_sinif=kapanis-denetimi-yesil`). Sebep artik tasinir.
  console.log("KAPANIS\t" + KAPANIS_SEBEP);
  const bl = ucBlok();
  for (let i = 0; i < 3; i++) console.log("BLOK\t" + (i + 1) + "\t" + bl[i].replace(/\t/g, " "));
  for (const a of alarmlar) console.log("ALARM\t" + a);
  for (const e of eylemler) console.log("EYLEM\t" + e);
  for (const l of loglar) console.log("LOG\t" + l);
  // Cok satirli mesaj protokolu bozmasin: her fiziksel satir ayri METIN kaydidir.
  for (const m of metin) for (const s of String(m).split("\n")) console.log("METIN\t" + s);
  process.exit(0);
};
const dur = (sebep) => {
  kayit({ tip: "bulgu", cins: "duran-kapi", detay: sebep });
  if (!OZET.simdi) OZET.simdi = "durdu — " + String(sebep).split("\n")[0];
  yaz(sebep); bitir("DUR");
};

// ── KUTU.md: gorev tablosu + durus sozlesmesi + bagimlilik/risk blogu ────────────────────
const kutuYol = join(KOK, "01_kutular", KUTU, "KUTU.md");
if (!KUTU || !existsSync(kutuYol)) dur("donem gostergesindeki kutu bulunamadi: 01_kutular/" + KUTU + "/KUTU.md — sevk neyi koşturacagini bilmiyor");
const kutuMetin = readFileSync(kutuYol, "utf8");

const DURUM_SOZ = new Set(["açık", "sürüyor", "mühür-bekliyor", "kapalı", "pas"]);
const gorevler = [];
for (const s of kutuMetin.split("\n")) {
  if (!/^\s*\|/.test(s)) continue;
  const h = s.split("|").map((x) => x.trim());
  if (h.length < 6) continue;
  if (!/^G-\d+$/.test(h[1])) continue;
  // Durum hucresi "açık — sevkte" gibi ek tasiyabilir (kokpit de ayni yerden keser).
  gorevler.push({ id: h[1], is: h[2], sahip: h[3], durum: (h[4] || "").split(/[—–]/)[0].trim(), kanit: h[5] });
}
if (!gorevler.length) dur("KUTU.md gorev tablosu okunamadi (G-NN satiri yok) — sevk gorev listesini goremiyor");
for (const k of gorevler) {
  if (!DURUM_SOZ.has(k.durum)) dur("gorev durumu sozlukte yok: " + k.id + " = " + JSON.stringify(k.durum) + " (izinli: açık · sürüyor · mühür-bekliyor · kapalı · pas)");
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

// BUTCE: donem ACIKKEN CAPADAN okunur, kutudan DEGIL (hasim bulgusu 2026-07-30). Gerekce:
// `01_kutular/<kutu>/KUTU.md` korunan-yollarin hicbir bolumunde degil ve donem icinde ajanin
// ona yazmasi tasarimin kendi geregi — yani uretim tavanini (ve ondan turetilen tur tavanini
// 3×BUTCE+5) olctugu taraf serbestce degistirebiliyordu. Capayi acilis toreni yazar.
// Donem yokken (el-suruslu okuma, kurulum kapisi cagrilari) davranis DEGISMEZ: kutudan okunur.
let BUTCE = 3;
const durusBlok = blok("Duruş sözleşmesi");
let butceKaynak = "kutu";
let butceSayi = null;
try {
  const c = readFileSync(join(KOK, "tools/sevk/.donem-capa"), "utf8");
  const s = c.split("\n").find((x) => /^butce\t/.test(x));
  const m = s && s.replace(/^butce\t/, "").match(/(\d+)/);
  if (m) { butceSayi = m; butceKaynak = "capa"; }
} catch { /* capa yok: donem acik degil ya da eski donem — kutuya dus */ }
if (!butceSayi) {
  const butceSatir = (durusBlok || "").split("\n").find((s) => /^\s*BÜTÇE\s*:/.test(s));
  butceSayi = butceSatir && butceSatir.match(/(\d+)/);
}
if (butceSayi) BUTCE = Number(butceSayi[1]);
else kayit({ tip: "bulgu", cins: "butce-okunmadi", detay: "durus sozlesmesinde BÜTÇE satiri yok/sayisiz — fail-closed varsayilan 3" });
// Capasiz acik donem = eski surumden kalan ya da elle acilmis gosterge: butce kutudan okunuyor
// demektir ve o dosya ajana aciktir. Sessiz gecilmez.
if (DONEM && butceKaynak !== "capa") {
  kayit({ tip: "bulgu", cins: "butce-capasiz", detay: "donem acik ama tools/sevk/.donem-capa yok — butce kutudan okundu (olctugu taraf yazabilir); donemi kapatip yeniden ac" });
}

// Bagimlilik/risk blogu: her gorev icin bir satir sart (kurulum kapisinin de aradigi sema).
const riskBlok = blok("Bağımlılık ve risk");
if (riskBlok === null) dur("KUTU.md bagimlilik/risk blogu yok — kutu otonom doneme hazir degil (OTONOM_DONEM §3; kurulum kapisi bunu arar)");
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
      dur("zarf gunlugu bozuk: " + (i + 1) + ". satir JSON degil — butun gozler ayni anda korelir, donem durdu (fail-closed)");
    }
    kayitlar.push({ i: i + 1, j });
  }
}
const buKosu = kayitlar.filter((r) => r.j.donem === DONEM);
const sonIndeks = (sart) => { let n = -1; for (const r of kayitlar) if (sart(r.j)) n = r.i; return n; };
const sonKayit = (sart) => { let k = null; for (const r of kayitlar) if (sart(r.j)) k = r.j; return k; };

// Bekci donem-ici tazeligi (§7.4): gorev kapanisi ANINDA — yani gunluge YENI bir karne dustugu
// turda — isik tazelenir. Otonom donemde oturum uzundur; SessionEnd bekcisi beklenirse Stop-turu
// BAYAT isik okur. Karari node verir; kosturan ve KIRMIZI ise EZEN taraf kabuktur.
if (sonIndeks((j) => j.tip === "karne") > sonIndeks((j) => j.tip === "bekci")) BEKCI_GEREK = 1;

const zarfSayisi = buKosu.filter((r) => r.j.tip === "zarf").length;
const nabizlar = buKosu.filter((r) => r.j.tip === "nabiz").map((r) => r.j);
const TUR_NO = nabizlar.length + 1;
const sevkKararlari = buKosu.filter((r) => r.j.tip === "sevk-karar").map((r) => r.j);
// BUTCE YALNIZ URETIMI SAYAR (F1-5a duzeltmesi, 2026-07-30). Eskiden HER sevk karari sayiliyordu
// ve bu, kutunun kapanmasini MEKANIK OLARAK IMKANSIZ kiliyordu: her uretim gorevi bir de bagimsiz
// karne cagrisi dogurur (K2), yani 3 butceli bir kutuda 1,5 gorev kosulabiliyordu. Ilk kutunun
// kendi sayilari bunu acikca gosteriyor (butce 6, kadro+1 gorev → 6 uretim + 6 karne = 12 cagri).
// Butcenin ILAN EDILMIS anlami "sahip bakmadan en fazla ne kadar sey KURULABILIR"dir (K-G) —
// dogrulama, catal suzgeci, dis goz brifingi ve kapanis denetimi bir sey KURMAZ. Onlarin freni
// mutlak tur tavani ve gidis-donus tavanidir.
// `kapanis-duzeltme` DE URETIMDIR (hasim bulgusu 2026-07-30): o cagri kutunun uretim koltugunu
// acar ve dosya yazdirir — "bir sey KURAR". Ilk yazimda yalniz `uretim` sayiliyordu, yani
// ilan edilen tavan donem basina 2 cagri sizdiriyordu (gidis-donus tavani kadar) ve sahip
// ekraninda o cagrilar "denetim cagrisi" diye gorunuyordu: paketin bu turda duzelttigi
// "sayac ne olctugunu soylemiyor" kusurunun yeni daldaki tekrari.
const URETIM_TIPLERI = new Set(["uretim", "kapanis-duzeltme"]);
const uretimKararlari = sevkKararlari.filter((s) => URETIM_TIPLERI.has(s.is_tipi));

// ── Frenler ─────────────────────────────────────────────────────────────────────────────
// Butce freni burada DEGIL, uretim sevkinden hemen once kosar: butce dolduysa yeni is kurulmaz,
// ama biten kutunun kapanis denetimi yine de kosabilmelidir (aksi halde butcesi dolan her donem
// kapanmadan olur ve sahip ucuncu bir tusa mecbur kalir — makro olcute aykiri).
// TUR TAVANI KAPANIS EVRESINI DE KALDIRMALI (hasim bulgusu 2026-07-30): sayi `3*BUTCE+5` idi ve
// bu paket doneme YENI turlar ekledi — kapanis evresi sabit iki tur (dis goz brifingi + kapanis
// karnesi) ve her gidis-donus UC tur (duzeltme + karnesi + yeniden kapanis karnesi) yer. Kucuk
// kutuda hesap tutmuyordu: BUTCE=2 icin tavan 11, gereken 12 → "iki gidis-donus" ilani kagit
// uzerinde vardi, kodda ULASILAMIYORDU. Ek pay ayri yazilir ki bir sonraki paket neyi
// buyuttugunu gorsun (tek sayiya gomulen gerekce, okunamaz gerekcedir).
const GIDIS_DONUS_TAVANI = 2;
const KAPANIS_TUR_PAYI = 2 + 3 * GIDIS_DONUS_TAVANI;   // brifing + kapanis karnesi + gidis-donusler
const TUR_TAVANI = 3 * BUTCE + 5 + KAPANIS_TUR_PAYI;
if (TUR_NO > TUR_TAVANI) dur("mutlak tur tavani asildi (" + TUR_NO + " > " + TUR_TAVANI + ") — sonsuz Stop dongusune karsi son kemer; donem durdu");
const sonIki = nabizlar.slice(-2);
if (sonIki.length === 2 && sonIki.every((n) => n.zarf_sayisi === zarfSayisi)) {
  // SEBEP ADIYLA SOYLENIR (hasim bulgusu 2026-07-30): bu fren, kapanis evresindeki her tikanmada
  // (ornegin bicim kapisi brifingi geri cevirdiginde) OTEKI frenlerden ONCE atesliyor ve sahibe
  // hep ayni jenerik cumleyi basiyordu — "dis goz iki kez sevk edildi ama brifing dusmedi" gibi
  // ozel tanilar bu yuzden fiilen ULASILAMAZDI. Son sevk kararinin tipi cumleye girer.
  const sonKarar = sevkKararlari[sevkKararlari.length - 1];
  const ek = sonKarar ? " Son acilan cagri: " + sonKarar.rol + " · " + sonKarar.is_tipi +
    " (" + (sonKarar.gorev || "?") + ") — donusu gunluge DUSMEDI; bicim kapisi zarfi geri ceviriyor olabilir (`bicim` kayitlarina bak)." : "";
  dur("ilerleme yok: son iki turda gunluge yeni zarf dusmedi (zarf sayisi " + zarfSayisi + ") — gorev bolunmeli ya da halka kopmus (maxTurns kesmesi ISARETSIZDIR, E0 kalem 4)." + ek);
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
// OZET her karar yolunda dolu olmasi icin (E5): uc blok artik SEVK/DUR/KAPAT ayrimi
// gozetmeden basilir, bu yuzden sayilar hesaplandiklari anda buraya yazilir.
OZET.sevk = sevkKararlari.length;
OZET.gorevToplam = gorevler.length;
OZET.bulgu = buKosu.filter((r) => r.j.tip === "bulgu").length;
OZET.miras = buKosu.filter((r) => r.j.cins === "miras-gorev").length;
OZET.pas = gorevler.filter((k) => k.durum === "pas").map((k) => k.id);
OZET.bekleyen = bekletilen.size;

// ── IZIN ENGELI: atlanan adim sahibin kuyruguna duser (F1-5f) ────────────────────────────
// Kaynak, kapinin CIFT-KAYNAK dogrulamasindan gecmis `izin-engel` kayitlaridir — ajanin beyani
// degil. Kuyruga giden cumle SABIT sablondur (catal-kuyruk.sh --not); burada yalnizca hangi
// gorev icin not dusecegi secilir ve tekillestirmeyi o betik yapar.
const izinKayitlari = buKosu.filter((r) => r.j.tip === "izin-engel");
OZET.izin = izinKayitlari.length;
for (const g of [...new Set(izinKayitlari.map((r) => String(r.j.gorev || "")))]) {
  if (/^(G-\d+|KAPANIS|KURULUM)$/.test(g)) eylemler.push("izin-not\t" + g);
}

// ── SISME ALARMI (E5; tasarim §7.4) — sahibin 13 kez ELLE yaptigi is mekaniklesiyor ───────
// "Bu kutu neden buyuyor?" sorusu artik yapinin kendi gozu. Capa: bu kutu icin gunlukteki EN
// ESKI gorev-sayaci kaydi; yoksa bugunku sayi capa olur (ilk donem kendi capasini kurar).
// DURDURMAZ — haberdir. Esik burada SABITTIR: olculen sayi frene girerse fren fren olmaktan
// cikar (E3 tavan dersi). Ilk gercek kutuda kalibre edilecek, bugun kalibre EDILMEMISTIR.
const SISME_ORANI = 1.5;
// PLANLAMA KUTUSU (Faz 2 sira 5 · B-11). Durus sozlesmesindeki `LİSTE: dönem içinde doğar`
// satiri tek bir olguyu ilan eder: bu kutunun gorev listesi ACILISTA degil DONEM ICINDE dogar
// (ilk kutu boyledir — kabukta tek gorev vardir ve o gorevin ISI listeyi uretmektir). Ayni
// olgudan IKI sonuc cikar:
//   (1) Sisme capasi ilk turda cakilmaz. Cakilsaydi capa 1 olurdu ve plan dogar dogmaz alarm
//       calardi: alarm plan yapildi demis olurdu. Capa, kutunun ILK GOREVI KAPANDIGI turda
//       cakilir — yani listeyi kim dogurduysa ona.
//   (2) Mutlak gorev tavani 5 degil, kadro buyuklugunun turevidir (asagida).
const listeSatir = (durusBlok || "").split("\n").find((s) => /^\s*LİSTE\s*:/.test(s));
const PLAN_KUTUSU = /dönem\s+içinde\s+doğar/.test(listeSatir || "");
// Liste DOGDU MU: kabuk tek gorevle gelir ve o gorevin isi listeyi uretmektir. Liste bir
// gorevden buyudugu an ya da ilk gorev kapandigi an, olculecek bir "acilis sayisi" vardir.
// (Ilk yazim yalnizca kapanmis goreve bakiyordu: kabuk geregi G-01 EN SON kapanir, yani
// hicbir gorev kapanmayan bir plan kutusunda oransal fren omur boyu olu kalirdi.)
const listeDogdu = gorevler.length > 1 || gorevler.some((k) => k.durum === "kapalı" || k.durum === "pas");

// ── MUTLAK GOREV TAVANI (F1-7 karari, Faz 2 sira 5) ───────────────────────────────────────
// EL_KITABI kutu-dongusu 1 "≤5 gorev" diyor ve bugune kadar KODDA SAYACI YOKTU: 40 gorevle
// ACILAN kutu makineye hic gorunmuyordu. Oransal alarm onu GOREMEZ (capa da 40 olurdu) — iki
// fren ayri kor noktalari kapatir. HABERDIR, durdurmaz: F3 sarisi uyarir, durdurmaz.
// ILAN EDILMIS SINIR: bu sayac YALNIZ OTONOM DONEMDE kosar (sevk donem gostergesi yoksa hemen
// cikar). El-surusluu kipte 40 gorevlik kutu hala gorunmez; oradaki gerçek çözüm bekciye bir
// gorev-sayisi gozu koymaktir ve bekci kontratini degistirir — ayri paket.
// Sayinin EVI: 00_genesis/EL_KITABI_KALIBI.md kutu-dongusu 1 maddesi. Ikisini test esler.
const GOREV_TAVANI = 5;
let gorevTavani = GOREV_TAVANI;
let kadroNot = "";
if (PLAN_KUTUSU) {
  // Planlama kutusunun tavani: IS ZINCIRINDEKI her role bir gorev arti bir toplama gorevi.
  // KADRONUN EVI `03_roller/<slug>/`dir, `.claude/agents/` DEGIL: ikincisi yazamaz koltuklari
  // da (dogrulayici · catal-denetcisi · kurulum-denetcisi · disgoz) tasir ve onlar gorev
  // ALAMAZ — o dizini saymak tavani gercek kadrodan bagimsiz kaydiriyordu (hasim turu
  // 2026-07-30: 8 ajan + 9 gorev sessiz geciyordu, 3 ajan + 6 gorev yanlis alarm veriyordu).
  // Yazamaz koltuk rol sozlesmesinden okunur (SOZLESME_KALIBI "Mod: **yazamaz**").
  let kadro = 0;
  try {
    for (const e of readdirSync(join(KOK, "03_roller"), { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      let rol = "";
      try { rol = readFileSync(join(KOK, "03_roller", e.name, "ROL.md"), "utf8"); } catch { rol = ""; }
      if (/Mod:\s*\*\*yazamaz\*\*/.test(rol)) continue;
      kadro++;
    }
  } catch { kadro = 0; }
  if (kadro > 0) { gorevTavani = kadro + 1; kadroNot = "planlama kutusu: kadro " + kadro + " + toplama"; }
  else {
    // OLCEMEDIM ile OLCTUM ayni sey degildir: 5 burada bir OLCUM degil, fail-closed varsayilan.
    kadroNot = "planlama kutusu: kadro OLCULEMEDI (03_roller okunamadi) — fail-closed varsayilan tavan";
    kayit({ tip: "bulgu", cins: "kadro-olculemedi", detay: "03_roller okunamadi ya da bos; plan kutusunun tavani varsayilan " + GOREV_TAVANI });
  }
}
if (gorevler.length > gorevTavani && !buKosu.some((r) => r.j.tip === "bulgu" && r.j.cins === "gorev-tavani")) {
  const kaynak = PLAN_KUTUSU ? kadroNot : "EL_KITABI kutu-dongusu 1";
  kayit({ tip: "bulgu", cins: "gorev-tavani", detay: "gorev sayisi " + gorevler.length + " > tavan " + gorevTavani + " (" + kaynak + ")" });
  // Cins `tavan`: haber kanalinin alarm beyaz listesindeki ad. Beyaz listede olmayan bir cins
  // haber.sh tarafindan REDDEDILIR ve gonderim `|| true` ile yutulurdu — alarm gunluge dusup
  // sahibe HIC ulasmazdi (hasim turu 2026-07-30, kritik).
  alarmlar.push("tavan\tKutuda " + gorevler.length + " gorev var; tavan " + gorevTavani + " (" + kaynak +
    "). Bu bir DURDURMA degil, HABER: sigmiyorsa kutu bolunmeli. 01_kutular/" + KUTU + "/KUTU.md");
}

const capalar = kayitlar.filter((r) => r.j.tip === "gorev-sayaci" && r.j.kutu === KUTU && Number.isFinite(r.j.gorev_sayisi));
if (!capalar.length) {
  // Plan kutusunda capa ilk gorev kapanana kadar CAKILMAZ (yukaridaki gerekce); capasiz kutuda
  // oransal alarm da yoktur; bilincli: olculecek bir acilis sayisi henuz dogmamistir.
  if (!PLAN_KUTUSU || listeDogdu) kayit({ tip: "gorev-sayaci", kutu: KUTU, gorev_sayisi: gorevler.length, cins: PLAN_KUTUSU ? "capa-plan-sonrasi" : "capa" });
} else {
  const capa = capalar[0].j.gorev_sayisi;
  const zatenSoylendi = buKosu.some((r) => r.j.tip === "bulgu" && r.j.cins === "sisme");
  if (gorevler.length > Math.ceil(capa * SISME_ORANI) && !zatenSoylendi) {
    kayit({ tip: "bulgu", cins: "sisme", detay: "kutu buyudu: " + capa + " -> " + gorevler.length + " gorev" });
    // TAMPONLANIR, dogrudan basilmaz: protokolun ILK satiri KARAR olmak zorunda (kabuk
    // ${CIKTI%%\n*} ile okuyor). Erken basilan tek satir motoru sessizce yanlis karara surer.
    alarmlar.push("sisme\tKutu buyuyor: acilistaki " + capa + " gorevden " + gorevler.length +
      " goreve cikti (esik: +%50). Bu bir DURDURMA degil, HABER. K-H beyanlarina bakmak isteyebilirsin: 01_kutular/" + KUTU + "/KUTU.md");
  }
}

if (cozulemeyen.length) {
  dur("sahibin kuyrugunda yapisi okunmayan madde var (" + cozulemeyen.join(" ") + ") — hangi gorevin bekledigi bilinemiyor (fail-closed); 00_pano/SENDE_BEKLEYEN.md maddesini bicime dondur");
}

// ── Karne okumasi ───────────────────────────────────────────────────────────────────────
// IS OLMAYAN ZARF SINIFLARI: karne (dogrulayici/kurulum-denetcisi) · hukum (catal denetcisi) ·
// brifing (dis goz — F1-5c). Ucu de "yargi/rapor" donusudur; is tazeligi olcumune girmezler.
const HUKUM_ZARFI = new Set(["karne", "hukum", "brifing"]);
// Bir gorev ancak: (1) tablosunda kapali (2) YESIL karnesi var (3) karne TAZE — o gorevin son
// zarf kaydindan SONRA yazilmis. Aksi halde gorev kapali SAYILMAZ.
const karneDurumu = (gorev) => {
  const k = sonKayit((j) => j.tip === "karne" && j.gorev === gorev);
  if (!k) return { var: false };
  const kIdx = sonIndeks((j) => j.tip === "karne" && j.gorev === gorev);
  // Tazelik yalniz IS zarflarina gore olculur: karnecinin/denetcinin kendi zarfi (sinif "karne",
  // "hukum" ya da "brifing") is degildir; sayilsaydi karne daima kendi zarfindan eski gorunurdu.
  const zIdx = sonIndeks((j) => j.tip === "zarf" && j.gorev === gorev && !HUKUM_ZARFI.has(j.sinif));
  return { var: true, hukum: k.hukum, taze: kIdx > zIdx, ajan: k.ajan };
};
// Bu DÖNEMDE fiilen is uretilmis gorev (karneci/denetci/dis goz zarflari is degildir).
const isZarfiVar = (gorev) => kayitlar.some((r) => r.j.tip === "zarf" && r.j.donem === DONEM &&
  r.j.gorev === gorev && !HUKUM_ZARFI.has(r.j.sinif));
// BU DONEMIN son IS zarfinin indeksi (kapanis karnesinin tazeligi buna olculur — F1-5a):
// kapanis karnesi son isten SONRA yazilmis olmali, yoksa duzeltilen is denetlenmemis kalir.
const sonIsZarfiIdx = () => sonIndeks((j) => j.tip === "zarf" && j.donem === DONEM && !HUKUM_ZARFI.has(j.sinif));

// MIRAS GOREV AYRIMI (hasim bulgusu): karne mekanigi bu paketle DOGDU — dönemden ONCE kapanmis
// hicbir gorevin karnesi olamaz. Ilk surum her `kapalı` satira dogrulayici sevk ediyordu:
// eski bir kutu acildiginda butce yalniz miras gorevleri dogrulamaya giderdi. Kural: karne
// sarti BU DONEMIN DOKUNDUGU gorevlere uygulanir; miras gorev tabloya guvenilerek kapali sayilir
// ve bir kez `miras-gorev` bulgusu duser (sessiz gecmez, ama dönemi de yemez).
const kapaliSayilir = (gorev) => {
  const k = gorevler.find((x) => x.id === gorev);
  if (!k) return false;
  if (k.durum === "pas") return true;              // is yapilmadi — karne istenmez (tasarim §5.2)
  if (k.durum !== "kapalı") return false;
  if (!isZarfiVar(gorev)) return true;             // miras gorev
  const kn = karneDurumu(gorev);
  return kn.var && kn.hukum === "YEŞİL" && kn.taze;
};

const ajanVar = (slug) => /^[a-z0-9_-]+$/.test(String(slug || "")) && existsSync(join(KOK, ".claude", "agents", slug + ".md"));

const talimat = (rol, gorev, tip, sebep, ekOkuma) => {
  kayit({ tip: "sevk-karar", gorev, rol, is_tipi: tip, sebep });
  kayit({ tip: "nabiz", gorev, tur_no: TUR_NO, zarf_sayisi: zarfSayisi });
  // SAYAÇ NE ÖLÇTÜĞÜNÜ SÖYLER: bütçe artık YALNIZ üretimi sayıyor; ekrana toplam çağrı sayısını
  // basmak "butce 7/2" gibi yalan bir satır üretiyordu (ilan abartması sınıfı — canlı yürüyüşte
  // görüldü, 2026-07-30). Üretim dışı çağrılar ayrı sayılır ve ayrı yazılır.
  const butceSayac = uretimKararlari.length + (URETIM_TIPLERI.has(tip) ? 1 : 0);
  yaz("SEVK · " + DONEM + " · tur " + TUR_NO + "/" + TUR_TAVANI +
      " · uretim butcesi " + butceSayac + "/" + BUTCE +
      " · denetim cagrisi " + (sevkKararlari.length + 1 - butceSayac) + " · " + sebep);
  yaz("AC: Agent araciyla alt-ajan cagrisi — subagent_type: " + rol);
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
  if (existsSync(join(KOK, "02_kanon", "OTONOM_DONEM.md"))) yaz("kural: 02_kanon/OTONOM_DONEM.md");
  if (ekOkuma) yaz("ek-okuma: " + ekOkuma);
  bitir("SEVK");
};

// ── Tur: kurulum — tek zorunlu goz, uretim gorevi acilmaz ──────────────────────────────
if (TUR === "kurulum") {
  const gorev = "KURULUM";
  const rol = "kurulum-denetcisi";
  // TAZELIK BU DALDA DA ARANIR (hasim bulgusu): karne sartinin yazili ucuncu kosulu
  // ("karne son degisiklikten SONRA") kurulum dalinda hic sorulmuyordu. KURULUM gorevinin
  // "is zarfi" yoktur; tazeligi DONEM-YERELDIR — onceki dönemden kalma bir YEŞİL karne
  // bugunku kurulumu kapatamaz.
  const k = karneDurumu(gorev);
  const kayitBuKosuda = kayitlar.some((r) => r.j.tip === "karne" && r.j.gorev === gorev && r.j.donem === DONEM);
  if (k.var && !kayitBuKosuda) {
    kayit({ tip: "bulgu", gorev: gorev, cins: "bayat-karne", detay: "karne onceki donemden — kurulum kapisi donem-yerel karne ister" });
  }
  if (k.var && kayitBuKosuda && k.hukum === "YEŞİL") {
    OZET.simdi = "durdu — kurulum denetimi YESIL; acilis muhru sahibin";
    KAPANIS_SEBEP = "kurulum denetimi YEŞİL";
    yaz("kurulum denetimi YESIL — acilis muhru sahibin. Denetci raporu muhur paketine eklenir.");
    bitir("KAPAT");
  }
  if (k.var && kayitBuKosuda && k.hukum !== "YEŞİL") {
    dur("KURULUM karnesi " + k.hukum + " — kutu bu haliyle acilis muhrune gidemez; bulgular kapatilmadan donem surmez");
  }
  if (!ajanVar(rol)) dur("zorunlu goz kadroda yok: .claude/agents/" + rol + ".md — kurulum donemi bagimsiz denetim olmadan kapanamaz");
  // MEKANIK KALEM KANALI (hasim bulgusu — kapatilmazsa kurulum turu yapisal olarak YESILE
  // ULASAMAZ): koltugun sozlesmesi "mekanik kalemlerin sonucu sana prompt icinde verilir"
  // diyordu ama verecek kanal yoktu (devir semasi serbest metni kesiyor). Kabuk tarafi
  // kurulum-kapisi.sh raporunu diske yazar, devir metni onu `ek-okuma` ISARETCISI olarak tasir.
  const mekanikRapor = "00_pano/kurulum-kapisi.txt";
  talimat(rol, gorev, "kurulum-denetimi",
    "kurulum kapisi: acilis muhru oncesi bagimsiz denetim (7 kalem)",
    existsSync(join(KOK, mekanikRapor)) ? mekanikRapor : null);
}

// ── KAPANIS EVRESI (F1-5a/b/c) ──────────────────────────────────────────────────────────
// Uc adim, sirayla: (1) dis goz brifingi — muhur paketinin dorduncu sarti, donem ICINDE uretilir
// (2) bagimsiz kapanis karnesi — TAZE olmak zorunda (son isten sonra) (3) hukum: YESIL ise donem
// kapanir ve sahip muhru bekler; KIRMIZI ise tur yerinde `yapim` olur ve bulgu SEVK EDILIR.
// Uretim gorevi bu evrede ACILMAZ (rejim ayrimi korunur) — duzeltme sevki bunun tek istisnasidir
// ve bulgunun sahibi karnede ADIYLA yazilidir (sevk kendi gorev acmaz, v1 siniri).
// GIDIS_DONUS_TAVANI yukarida, tur tavaninin yaninda tanimli: iki sayi birbirine bagli (tur
// tavani kapanis evresinin turlarini kaldirmak zorunda) ve iki ayri yerde yasamalari, ikisinin
// birlikte hesaplanmadigi hatasinin ta kendisiydi.
const kapanisDali = () => {
  // (1) Dis goz brifingi — donem basina TEK sefer.
  const brifingVar = kayitlar.some((r) => r.j.tip === "brifing" && r.j.donem === DONEM);
  if (!brifingVar) {
    if (!ajanVar("disgoz")) {
      dur("dis goz koltugu kadroda yok (.claude/agents/disgoz.md) — kapanis brifingi uretilemez ve kutu kapanisa gidemez (D7 dorduncusu)");
    }
    const brifingSevki = sevkKararlari.filter((s) => s.is_tipi === "disgoz-brifing").length;
    if (brifingSevki >= 2) {
      dur("dis goz iki kez sevk edildi ama brifing gunluge dusmedi — bicim kapisi zarfi geri ceviriyor olabilir (00_pano/zarf-gunlugu.jsonl `bicim` kayitlarina bak); kutu kapanisa brifingsiz gidemez");
    }
    talimat("disgoz", "BRIFING", "disgoz-brifing",
      "kapanis evresi: dis goz brifingi (muhur paketinin dorduncu sarti; koltuk is almaz, yalnizca sahibe yazar)");
  }

  // (2) Kapanis karnesi — bu DONEME ait ve son IS zarfindan SONRA yazilmis olmali.
  const kIdx = sonIndeks((j) => j.tip === "karne" && j.gorev === "KAPANIS" && j.donem === DONEM);
  const k = sonKayit((j) => j.tip === "karne" && j.gorev === "KAPANIS" && j.donem === DONEM);
  const taze = kIdx > sonIsZarfiIdx();
  if (k && taze && k.hukum === "YEŞİL") {
    OZET.karneli = gorevler.filter((x) => x.durum === "kapalı" && kapaliSayilir(x.id)).length;
    OZET.simdi = "durdu — kapanis denetimi YESIL; kapanis muhru sahibin (D7 muhur paketi: demo + dis goz brifingi 03_roller/disgoz/BRIFING.md + kapanis karnesi)";
    KAPANIS_SEBEP = "kapanış denetimi YEŞİL";
    const bl = ucBlok();
    yaz("GECE NE OLDU: " + bl[0]);
    yaz("SENDE BEKLEYEN: " + bl[1]);
    yaz("SIMDI NE YAPIYOR: " + bl[2]);
    yaz("muhur paketinin dordu: demo · kanit satirlari · dis goz brifingi (03_roller/disgoz/BRIFING.md) · kapanis karnesi (00_pano/zarf-gunlugu.jsonl)");
    bitir("KAPAT");
  }
  // DOGRULANAMADI AYRI HALDIR (hasim bulgusu 2026-07-30): "dogrulayamadim" diyen gozun elinde
  // duzeltilecek adres YOKTUR; onu KIRMIZI dalina sokmak, gozu adres uydurmaya zorlamakti
  // (bulgu icat yasaginin tam tersi). Bu hal donemi SAHIBE birakir — yapiya verilmis bir is yok.
  if (k && taze && k.hukum === "DOĞRULANAMADI") {
    dur("kapanis karnesi DOĞRULANAMADI: bagimsiz goz kutunun bitip bitmedigini OLCEMEDI — duzeltilecek adres yok, karar sahibin. Karne maddeleri gunlukte (00_pano/zarf-gunlugu.jsonl, son `karne` kaydi)");
  }
  if (k && taze && k.hukum !== "YEŞİL") {
    // (3) KIRMIZI dali — ucuncu komut istenmez (F1-5b): tur yerinde `yapim` olur.
    const donus = kayitlar.filter((r) => r.j.tip === "evre-gecis" && r.j.donem === DONEM && r.j.hedef === "yapim").length;
    const hedefler = String(k.bulgu_gorev || "").match(/G-\d+/g) || [];
    // BULGU DOSYASI EN BASTA YAZILIR (hasim bulgusu 2026-07-30): dosya eskiden dalin SONUNDA,
    // yalniz duzeltme sevk edilirken yaziliyordu. Oysa dalin cikis yollarinin hepsi (gidis-donus
    // tavani · uygunsuz hedef · dolu butce) sahibi ADIYLA bu dosyaya yolluyor — yani sahibin
    // gordugu icerik BIR ONCEKI turun bulgulariydi, hic KIRMIZI olmamis bir kutuda ise dosya
    // HIC YOKTU ve mesaj var olmayan bir dosyayi gosteriyordu. Isaretci yalan soylemez.
    const bulguYolu = "00_pano/kapanis-bulgulari.txt";
    try {
      writeFileSync(join(KOK, bulguYolu),
        "KAPANIS KARNESI — donem " + DONEM + "\n" +
        "HUKUM: " + k.hukum + "\n" +
        "KARNEYI VEREN: " + (k.ajan || "?") + "\n" +
        "GIDIS-DONUS: " + donus + "/" + GIDIS_DONUS_TAVANI + "\n" +
        "DUZELTILECEK GOREV(LER): " + hedefler.join(" ") + "\n" +
        "MADDELER: " + String(k.maddeler || "(karne maddeleri bos)") + "\n\n" +
        "KURAL: gorev satiri YENIDEN ACILMAZ — `kapalı` kalir, duzeltme ayni gorevin altinda\n" +
        "yapilir. Donusun ardindan sevk once bagimsiz karneyi, sonra kapanis denetimini yeniden\n" +
        "ister; bu dosyayi sen guncellemezsin (mekanik olarak yeniden yazilir).\n");
    } catch (e) {
      dur("kapanis bulgu dosyasi yazilamadi (" + bulguYolu + ") — duzeltme sevki isaretcisiz kalirdi (fail-closed): " + String(e && e.message));
    }
    if (donus >= GIDIS_DONUS_TAVANI) {
      dur("kapanis karnesi " + k.hukum + " ve uretim<->kapanis gidis-donusu doldu (" + donus + "/" + GIDIS_DONUS_TAVANI + ") — donem kapandi; bulgular sahibin masasinda (kapanis karnesi: 00_pano/kapanis-bulgulari.txt)");
    }
    // HEDEF UYGUNLUGU (hasim bulgusu 2026-07-30): burada TEK kosul numaranin tabloda BULUNMASIYDI.
    // Yapim dalinin bes engeli (pas · muhur-bekliyor · cozulmemis onkosul · BEKLETIR kilidi ·
    // donusu gelmemis cagri) bu evrede HIC sorulmuyordu — cunku `kapanisDali()` yapim blogunun
    // tamaminin onunde ve her dali sureci bitiriyor. Otomatik yolda ulasilan hal `pas`ti:
    // `acikVar` pas durumunu saymaz, yani pas gorevli kutu kapanis evresine gecer ve karne o numarayi
    // adresleyince "pas gorevde IS YAPILMADI" kuralina ragmen sahibe sorulmadan uretim acilirdi.
    const UYGUNSUZ = { "pas": "gorev PAS (is yapilmayacagi yazili)", "mühür-bekliyor": "gorev sahip muhru bekliyor" };
    const hedefAdaylari = hedefler.map((g) => gorevler.find((x) => x.id === g)).filter(Boolean);
    const acilabilir = hedefAdaylari.filter((x) => !UYGUNSUZ[x.durum]);
    if (!acilabilir.length) {
      const sebep = hedefAdaylari.length
        ? "gosterdigi gorev(ler) duzeltmeye uygun degil: " + hedefAdaylari.map((x) => x.id + " (" + (UYGUNSUZ[x.durum] || x.durum) + ")").join(" · ")
        : "duzeltilecek gorev cozulmuyor (BULGU-GOREV: " + (k.bulgu_gorev || "yok") + ")";
      dur("kapanis karnesi " + k.hukum + " ama " + sebep + " — sevk kendi gorev acamaz (v1 siniri); bulgulari sahip/rol kapatir");
    }
    const hedef = acilabilir[0];
    // BUTCE FRENI KAPANIS DUZELTMESINDE DE SORULUR (hasim bulgusu 2026-07-30): bu cagri kutunun
    // URETIM koltugunu acar ve dosya yazdirir — yani "bir sey KURAR", bütçenin ilan edilmis
    // anlaminin (K-G) tam tanimi. Fren yalniz `if (secilen)` blogundaydi; kapanis dali ona hic
    // ugramiyordu ve gidis-donus tavani 2 oldugu icin fiili tavan BUTCE+2 idi (butce 3 icin %66 asim).
    if (uretimKararlari.length >= BUTCE) {
      dur("kapanis karnesi " + k.hukum + " ama uretim butcesi doldu (" + uretimKararlari.length + "/" + BUTCE +
          ") — duzeltme yeni bir uretim cagrisi acar ve bu donemde acilamaz. Bulgular sahibin masasinda: 00_pano/kapanis-bulgulari.txt");
    }
    if (!ajanVar(hedef.sahip)) {
      dur("kapanis bulgusunun gorevi (" + hedef.id + ") kadroda olmayan bir koltuga ait: " + hedef.sahip + " — duzeltme sevk edilemez");
    }
    // Bulgu metni ROLE ISARETCIYLE gider (devir metni serbest metin tasiyamaz — 800B sema kapisi);
    // dosya yukarida, dalin BASINDA yazildi.
    // KALAN HEDEFLER IZSIZ DUSMEZ (hasim bulgusu 2026-07-30): BULGU-GOREV birden cok gorev
    // gosterebilir ve sevk yalniz ILKINI acar. Kalanlar hicbir yerde gorunmuyordu; simdi hem
    // gunluge bulgu olarak duser hem de dosyada ADIYLA yazili (yukaridaki DUZELTILECEK satiri).
    if (acilabilir.length > 1) {
      kayit({ tip: "bulgu", gorev: hedef.id, cins: "kapanis-bulgu-kuyrugu",
              detay: "kapanis karnesi " + acilabilir.length + " gorev gosterdi; bu turda " + hedef.id + " sevk edildi, kalanlar: " +
                     acilabilir.slice(1).map((x) => x.id).join(" ") + " (sonraki kapanis turunda sirayla acilir)" });
    }
    EVRE_HEDEF = "yapim";
    kayit({ tip: "evre-gecis", hedef: "yapim", sebep: "kapanis karnesi " + k.hukum, gorev: hedef.id });
    talimat(hedef.sahip, hedef.id, "kapanis-duzeltme",
      "kapanis karnesi " + k.hukum + ": " + hedef.id + " bulgulari kapatilacak (gidis-donus " + (donus + 1) + "/" + GIDIS_DONUS_TAVANI + "; gorev satiri yeniden ACILMAZ)",
      bulguYolu);
  }
  // Karne yok ya da BAYAT (duzeltmeden sonra) → bagimsiz kapanis denetimi istenir.
  if (k && !taze) {
    kayit({ tip: "bulgu", gorev: "KAPANIS", cins: "bayat-karne", detay: "kapanis karnesi son is zarfindan ONCE yazilmis — is yeniden dokunuldu, denetim tazelenir" });
  }
  if (!ajanVar("dogrulayici")) dur("zorunlu goz kadroda yok: .claude/agents/dogrulayici.md — kapanis bagimsiz denetim olmadan muhre gidemez");
  talimat("dogrulayici", "KAPANIS", "kapanis-denetimi",
    "kapanis kapisi: kutunun bagimsiz denetimi (KIRMIZI ise karneye BULGU-GOREV satiri zorunlu)");
};

// ── (0) Catal suzgeci — EVREDEN BAGIMSIZ ────────────────────────────────────────────────
// E3ten E4e gelen ZORUNLU girdi (tasarim §7.2): zarfta ÇATAL dolu dustuyse soru sahibe
// GITMEDEN once catal-denetcisi cagrisi acilir. Suzgec hukmu (catal-suzgec kaydi) gelmemis bir
// catal, kuyruga da dusmemistir — bu is her seyin onunde gelir: acik catal BEKLETIR
// listesindeki gorevleri kilitler, yani beklemek koseyi tikar.
// SIRA DEGISTI (hasim bulgusu 2026-07-30): blok `if (TUR === "kapanis") kapanisDali()` cagrisinin
// ALTINDAYDI ve kapanisDali fonksiyonunun HER dali talimat()/dur()/bitir() ile sureci bitiriyor — yani
// kapanis evresinde suzgec HIC KOSMUYORDU. Kapanis evresinde catal dogmasi olagandir (dis goz
// ve karne zarflari ÇATAL tasiyabilir; kapi bunu bekliyor bile, iki koltuk da HUKUM_SINIFI kumesinde).
// Karne YESIL gelip donem kapanirsa ne `catal-suzgec` kaydi ne kuyruk maddesi dogardi: D-25 ucuncu maddesinin
// "suzgecten gecmemis catal sahibe GONDERILEMEZ" kurali, "hic gonderilmez"e donuyordu.
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

if (TUR === "kapanis") kapanisDali();

// ── Tur: yapim ──────────────────────────────────────────────────────────────────────────
// (a) Karne sarti — BU DÖNEMDE is uretilmis ama karnesiz/bayat gorev (miras gorev haric — yukarida)
for (const k of gorevler) {
  if (k.durum !== "kapalı") continue;
  if (!isZarfiVar(k.id)) {
    const knm = karneDurumu(k.id);
    if (!knm.var) kayit({ tip: "bulgu", gorev: k.id, cins: "miras-gorev", detay: "donem oncesi kapanmis, bagimsiz karnesi yok — tabloya guveniliyor (karne mekanigi E4te dogdu)" });
    continue;
  }
  const kn = karneDurumu(k.id);
  if (kn.var && kn.hukum === "YEŞİL" && kn.taze) continue;
  if (kn.var && kn.hukum !== "YEŞİL") {
    dur("gorev " + k.id + " kapali isaretli ama karnesi " + kn.hukum + " — duzeltme rolun/sahibin isidir, sevk gorevi kendi acamaz (v1 sinir)");
  }
  if (kn.var && !kn.taze) {
    kayit({ tip: "bulgu", gorev: k.id, cins: "bayat-karne", detay: "karne son zarftan ONCE yazilmis — is yeniden dokunuldu" });
  }
  if (!ajanVar("dogrulayici")) dur("dogrulayici kadroda yok (.claude/agents/dogrulayici.md) — karnesiz gorev kapatilamaz (K2)");
  talimat("dogrulayici", k.id, "dogrulama",
    "karne sarti: " + k.id + " kapali isaretli ama " + (kn.var ? "karnesi bayat" : "bagimsiz karnesi yok") + " — kimse kendi isine yesil diyemez");
}

// (b) Gorev secimi — bes suzgec
// YENIDEN-SEVK HAKKI (T4 on-olcumunun dusurdugu kusur, 2026-07-28): model-araciyi halka
// kopabilir — talimat verilir ama alt-ajan cagrisi hic yapilmaz ya da devir kapisinda doner.
// Ilk surumde bu gorev "ucusta" sayilip dönemin sonuna kadar KILITLENIYORDU (canli olcumde
// gorüldü: tek dusen cagri butun donemi duran kapiya soktu). Kural: donusu gelmemis gorev BIR
// KEZ yeniden sevk edilir (taze cagri — §2.3 zaten "aynı alt-ajan surdurulmez" diyor); ikinci
// kez de donmezse ucustadir ve duran kapi uretir. Sessiz sonsuz tekrar YOK.
const acilis = {};
for (const sk of sevkKararlari) {
  if (sk.is_tipi !== "uretim" || typeof sk.gorev !== "string") continue;
  acilis[sk.gorev] = (acilis[sk.gorev] || 0) + 1;
}
// HUKUM_ZARFI kumesi burada da kullanilir (hasim bulgusu 2026-07-30): bu paket "is olmayan
// zarf siniflari"ni tek kumede topladi ve UC kullanim yerini gunceledi, DORDUNCUSUNU degil —
// burasi hala `karne`/`hukum` dizelerini elle sayiyordu ve `brifing` sinifini IS sayiyordu.
// Sonucu: dis gozun BRIFING donusu, ayni ada sahip bir gorevin "dondu" sayilmasina yol acabilir.
const donen = new Set(kayitlar
  .filter((r) => r.j.tip === "zarf" && r.j.donem === DONEM && !HUKUM_ZARFI.has(r.j.sinif))
  .map((r) => r.j.gorev));
const ucusta = new Set(Object.keys(acilis).filter((g) => !donen.has(g) && acilis[g] >= 2));
const yeniden = new Set(Object.keys(acilis).filter((g) => !donen.has(g) && acilis[g] === 1));
const engeller = [];
let secilen = null;
for (const k of gorevler) {
  if (k.durum === "kapalı") continue;
  if (k.durum === "pas") { kayit({ tip: "bulgu", gorev: k.id, cins: "pas-gorev", detay: "gorev pas isaretli — is yapilmadi, sessiz gecmesin" }); continue; }
  if (k.durum === "mühür-bekliyor") { engeller.push(k.id + ": muhur bekliyor (sahip)"); continue; }
  if (ucusta.has(k.id)) { engeller.push(k.id + ": iki kez sevk edildi, donus gelmedi (halka kopuk — gorev bolunmeli ya da rol dosyasi hatali)"); continue; }
  // ISLENMIS AMA KAPANMAMIS (T4 on-olcumu, 2026-07-28): rol zarfini dondurdu ama gorev satirini
  // kapatmadi. Yeniden sevk etmek AYNI ISI TEKRAR yaptirirdi ve ilerleme-yok freni de tutmazdi
  // (her turda yeni zarf duser). Bu bir kusurdur: iz birakilir ve gorev acilmaz.
  if (donen.has(k.id)) {
    kayit({ tip: "bulgu", gorev: k.id, cins: "gorev-kapatilmadi", detay: "donus zarfi geldi ama gorev satiri hala " + k.durum });
    engeller.push(k.id + ": donusu geldi ama gorev satiri hala " + k.durum + " (rol Durum hucresini kapatmadi — tekrar sevk edilmez, ayni is iki kez yapilmaz)");
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
  // BUTCE FRENI TAM BURADA (F1-5a): yalnizca YENI IS kurulurken sorulur.
  if (uretimKararlari.length >= BUTCE) {
    dur("butce tavani doldu: bu donemde " + uretimKararlari.length + " uretim cagrisi acildi (tavan " + BUTCE +
        ") — sahip bakmadan bu kadari kurulur (K-G). Acik gorev kaldi, kutu kapanmadi.");
  }
  const bg = bagimlilik[secilen.id];
  talimat(secilen.sahip, secilen.id, "uretim",
    (yeniden.has(secilen.id) ? "YENIDEN sevk (onceki cagri donmedi): " : "sirada: ") +
    secilen.id + " (risk=" + bg.risk + (bg.risk === "riskli" ? "; worktree + commit yasagi" : "") + ")");
}

// (c) Uretim bitti → KAPANIS EVRESI (F1-5a; eskiden burada donem KAPANIR ve sahip ikinci komutu
//     yazardi). Gosterge tur alani yerinde `kapanis` olur, uretim kilitlenir, ayni donem surer.
const acikVar = gorevler.some((k) => k.durum === "açık" || k.durum === "sürüyor" || k.durum === "mühür-bekliyor");
if (!acikVar) {
  // PAS AYRI SAYILIR (hasim bulgusu): pas gorevde IS YAPILMADI; onu "kapali" diye raporlamak
  // sahip yuzeyinde yalan olur. Kapanis cumlesi pas sayisini acikca soyler (ucBlok icinde).
  OZET.karneli = gorevler.filter((k) => k.durum === "kapalı" && kapaliSayilir(k.id)).length;
  OZET.simdi = "uretim bitti — kapanis evresi acildi (dis goz brifingi + bagimsiz kapanis denetimi)";
  EVRE_HEDEF = "kapanis";
  kayit({ tip: "evre-gecis", hedef: "kapanis", sebep: "acik uretim gorevi kalmadi" });
  kapanisDali();
}

// (d) Acik gorev var ama hicbiri acilamiyor → duran kapi (SESSIZ "is bitti" DEMEZ)
kayit({ tip: "nabiz", tur_no: TUR_NO, zarf_sayisi: zarfSayisi });
dur("acik gorev var ama hicbiri acilamiyor:\n  - " + engeller.join("\n  - "));
')" || kapat "ariza" "sevk çözümleyicisi koşamadı (fail-closed) — motor durdu, dönem kapandı"

# ── 6 · Protokol çözümü ───────────────────────────────────────────────────────────────────
KARAR="$(printf '%s' "${CIKTI%%$'\n'*}" | cut -f2)"
EVRE_HEDEF="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="EVRE"{print $2; exit}')"
EYLEMLER="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="EYLEM"{sub(/^EYLEM\t/,""); print}')"
BEKCI_GEREK="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="BEKCI"{print $2; exit}')"
KAPANIS_SEBEP="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="KAPANIS"{print $2; exit}')"
LOGLAR="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="LOG"{sub(/^LOG\t/,""); print}')"
MESAJ="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="METIN"{sub(/^METIN\t/,""); print}')"
# Üç blok (E5): sabah yüzeyinin ve kapanış e-postasının gövdesi. TEK üretici çözümleyicidir.
BLOK1="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="BLOK" && $2=="1"{print $3; exit}')"
BLOK2="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="BLOK" && $2=="2"{print $3; exit}')"
BLOK3="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="BLOK" && $2=="3"{print $3; exit}')"
# Alarmlar (E5): DURDURMAYAN haberler — dönem sürer, sahip bilir. Gönderim fail-open.
ALARMLAR="$(printf '%s' "$CIKTI" | awk -F'\t' '$1=="ALARM"{sub(/^ALARM\t/,""); print}')"
if [ -n "$ALARMLAR" ]; then
  while IFS=$'\t' read -r A_CINS A_DETAY; do
    [ -n "$A_CINS" ] || continue
    CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins "$A_CINS" --anahtar "$A_CINS" \
      --donem "$DONEM_ID" --kutu "$DONEM_KUTU" --detay "$A_DETAY" || true
  done <<EOF_ALARM
$ALARMLAR
EOF_ALARM
fi

# ── 7 · Bekçi dönem-içi tazeliği (§7.4): görev kapanışı turunda ışık tazelenir ──────────────
# Otonom dönemde oturum uzundur; bekçi yalnız SessionEnd'de koşarsa Stop-turu BAYAT ışık okur.
# KIRMIZI duran kapıdır ve node'un kararını EZER (sıra: önce ışık, sonra sevk).
# MAKİNE SATIRI (K1, sözleşme: tools/bekci/README.md §1-§2) — metin taraması EMEKLİ:
#  - Karar `BEKCI v1 durduran= kilit= uyari= …` satırından ve çıkış kodundan (0/1/2) okunur.
#    "KIRMIZI" kelime taraması yok: bir açıklama cümlesindeki kelime dönemi durduramaz, bulgu
#    metni yalnız GÖRÜNTÜ için `^DURDURAN ` önekli insan satırlarından alınır.
#  - FAIL-CLOSED üç kapı: satır YOK · çıkış kodu 0/1 dışı (2 = bekçinin kendi arızası) ·
#    satır ile çıkış kodu ÇELİŞİYOR. "Ölçemedim" ile "temiz" aynı şey değildir (sözleşme §1).
#  - `kilit>0` duran kapı DEĞİL — kanonun iki yerde yazdığı istisna (OTONOM_DONEM §1 · GENESIS
#    bekçi tarifi): kapanış kilididir, dönem sürer, sahibe alarm gider. Eski `[tavan]` önek
#    eşleşmesi bu sayıyla emekli; ışık adı KILIT (kilit tavandan geniştir: bayat dış göz
#    brifingi de kilit basar — sözleşme §4).
if [ "${BEKCI_GEREK:-0}" = "1" ]; then
  BEKCI="$KOK/tools/bekci/bekci.sh"
  if [ ! -r "$BEKCI" ]; then
    kapat "duran-kapi" "bekçi yok (tools/bekci/bekci.sh) — dönem-içi ışık tazelenemiyor; kurulu projede bekçi zorunludur (GENESIS G3.2)"
  fi
  BEKCI_CIKIS=0
  BEKCI_CIKTI="$(cd "$KOK" && CLAUDE_PROJECT_DIR="$KOK" bash "$BEKCI" 2>&1)" || BEKCI_CIKIS=$?
  MAKINE="$(printf '%s\n' "$BEKCI_CIKTI" | grep '^BEKCI v1 ' | tail -n 1 || true)"
  B_DURDURAN=""; B_KILIT=""; B_UYARI=""; B_ARIZA=""
  if [ -n "$MAKINE" ]; then
    B_DURDURAN="$(printf '%s' "$MAKINE" | sed -n 's/.* durduran=\([0-9][0-9]*\) .*/\1/p')"
    B_KILIT="$(printf '%s' "$MAKINE" | sed -n 's/.* kilit=\([0-9][0-9]*\) .*/\1/p')"
    B_UYARI="$(printf '%s' "$MAKINE" | sed -n 's/.* uyari=\([0-9][0-9]*\) .*/\1/p')"
    B_ARIZA="$(printf '%s' "$MAKINE" | sed -n 's/.* ariza=\([0-9][0-9]*\) .*/\1/p')"
  fi
  BEKCI_SEBEP=""
  if [ -z "$MAKINE" ]; then
    BEKCI_ISIK="KIRMIZI"; BEKCI_SEBEP="makine satırı yok (BEKCI v1 …); bekçi çıkış kodu $BEKCI_CIKIS — ölçemedim ile temiz aynı şey değildir (fail-closed)"
  elif [ -z "$B_DURDURAN" ] || [ -z "$B_KILIT" ] || [ -z "$B_UYARI" ] || [ -z "$B_ARIZA" ]; then
    BEKCI_ISIK="KIRMIZI"; BEKCI_SEBEP="makine satırı çözümlenemedi: ${MAKINE} (fail-closed)"
  elif [ "$BEKCI_CIKIS" != "0" ] && [ "$BEKCI_CIKIS" != "1" ]; then
    BEKCI_ISIK="KIRMIZI"; BEKCI_SEBEP="bekçi çıkış kodu $BEKCI_CIKIS — 2 bekçinin kendi arızasıdır (sözleşme §2), fail-closed"
  elif [ "$B_ARIZA" != "0" ]; then
    # ariza>0 sözleşmede çıkış 2 demektir; buraya düştüysek üretici çıkış 0/1 basmış — çelişki.
    # Arıza hattı hiçbir çıkış koduyla sessiz yeşile dönemez (hasım bulgusu #5/#12, fail-closed).
    BEKCI_ISIK="KIRMIZI"; BEKCI_SEBEP="makine satırı ariza=$B_ARIZA ama çıkış kodu $BEKCI_CIKIS — arıza hattı sessiz geçemez (sözleşme §2, fail-closed)"
  elif { [ "$BEKCI_CIKIS" = "1" ] && [ "$B_DURDURAN" = "0" ]; } || { [ "$BEKCI_CIKIS" = "0" ] && [ "$B_DURDURAN" != "0" ]; }; then
    BEKCI_ISIK="KIRMIZI"; BEKCI_SEBEP="çıkış kodu ($BEKCI_CIKIS) ile makine satırı (durduran=$B_DURDURAN) çelişiyor — fail-closed"
  elif [ "$B_DURDURAN" != "0" ]; then
    BEKCI_ISIK="KIRMIZI"
    BULGULAR="$(printf '%s\n' "$BEKCI_CIKTI" | grep '^DURDURAN ' | head -n 3 | tr '\n' ' ' || true)"
    BEKCI_SEBEP="durduran=$B_DURDURAN: ${BULGULAR:-bulgu satırı okunamadı}"
  elif [ "$B_KILIT" != "0" ]; then
    BEKCI_ISIK="KILIT"
  elif [ "$B_UYARI" != "0" ]; then
    BEKCI_ISIK="SARI"
  else
    BEKCI_ISIK="YEŞİL"
  fi
  if ! J_tip=bekci J_donem="$DONEM_ID" J_isik="$BEKCI_ISIK" JN_cikis="$BEKCI_CIKIS" \
      J_kaynak="sevk görev-turu" json_kur 2>/dev/null | yaz_dene; then
    kapat "ariza" "$YAZIM_HATASI_METNI"
  fi
  if [ "$BEKCI_ISIK" = "KIRMIZI" ]; then
    # Ayrı `alarm` postası ATILMAZ: kapat() zaten donem-bitti haberini gönderiyor ve 3. blok
    # sebebi taşıyor. İki posta aynı olayı anlatırsa kanal gürültüye döner (dört olay sözleşmesi).
    kapat "duran-kapi" "bekçi KIRMIZI (dönem-içi tazeleme): ${BEKCI_SEBEP} — otonom dönemde bekçi kırmızısı duran kapıdır (OTONOM_DONEM §1)."
  fi
  # KILIT dönemi DURDURMAZ (kanonun iki yerde yazdığı istisna: kapanış kilidi, duran kapı
  # değil) — ama sahibe HİÇ söylenmezse kutu sessizce kilitli hâle gelmiş olur. Alarm tam da
  # "görür ama bağlamaz"ın kapandığı yer: haber gider, dönem sürer.
  if [ "$BEKCI_ISIK" = "KILIT" ]; then
    CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins kirmizi --anahtar kilit \
      --donem "$DONEM_ID" --kutu "$DONEM_KUTU" \
      --detay "Bekçi kapanış kilidi basıyor (kilit=$B_KILIT: tavan 1,5x aşımı ya da bayat dış göz brifingi). Bu bir DURAN KAPI değildir: dönem sürüyor, ama kutu kapanış mührüne bu hâliyle gidemez." || true
  fi
fi

# ── 8 · Günlük yazımı (kararın kesinleştiği an) ───────────────────────────────────────────
LOG_YAZILAMADI=""
if [ -n "$LOGLAR" ]; then
  while IFS= read -r SATIR; do
    [ -n "$SATIR" ] || continue
    printf '%s' "$SATIR" | yaz_dene || LOG_YAZILAMADI="var"
  done <<EOF_LOG
$LOGLAR
EOF_LOG
fi
# Karar ANA kabukta: `while` döngüsü de burada alt kabuk DEĞİLDİR (girdisi heredoc, boru değil),
# ama yine de tek çıkış noktası korunur.
[ -z "$LOG_YAZILAMADI" ] || kapat "ariza" "$YAZIM_HATASI_METNI"

# ── 8b · Evre geçişi (F1-5a) — kararın kesinleştiği andan SONRA, sevkten ÖNCE ─────────────
# Gösterge yerinde değişir: kimlik ve açılış damgası korunur, yalnız TÜR (evre) alanı yazılır.
# FAIL-CLOSED: yazılamazsa dönem kapanır. Yazılamayan geçiş, bir sonraki turda aynı geçişi
# yeniden doğurur ve dönem sessizce üretim↔kapanış arasında salınırdı.
if [ -n "${EVRE_HEDEF:-}" ]; then
  # İZ ZATEN DÜŞTÜ: çözümleyici `evre-gecis` kaydını §8'de yazdırdı — ikinci bir "yazıldı" kaydı
  # aynı olayı iki kez anlatırdı (günlük gürültüsü). Yazım başarısızsa dönem kapanır ve kapanış
  # kaydı sebebi taşır; yani başarısız geçiş de izsiz kalmaz.
  donem_turu_yaz "$KOK" "$EVRE_HEDEF" \
    || kapat "ariza" "evre geçişi yazılamadı (hedef: $EVRE_HEDEF) — gösterge güncellenemiyor (fail-closed); tools/sevk/.donem-acik dosyasına bak"
fi

# ── 8c · Eylemler: sahibin kuyruğuna izin notu (F1-5f) ────────────────────────────────────
# Cümle catal-kuyruk.sh'ın SABİT şablonundan gelir; burada yalnız görev numarası taşınır.
# Tekilleştirme o betiktedir (aynı görev + aynı dönem için tek not). Fail-OPEN: not düşmemesi
# dönemi durdurmaz, ama izsiz de kalmaz (aşağıdaki bulgu kaydı).
if [ -n "${EYLEMLER:-}" ]; then
  while IFS=$'\t' read -r EYLEM E_ARG; do
    [ -n "$EYLEM" ] || continue
    case "$EYLEM" in
      izin-not)
        if ! CLAUDE_PROJECT_DIR="$KOK" bash "$DIZIN/catal-kuyruk.sh" --not izin "$E_ARG" "$DONEM_ID" >/dev/null 2>&1; then
          J_tip=bulgu J_donem="$DONEM_ID" J_gorev="$E_ARG" J_cins=izin-notu-dusmedi \
            J_detay="izin engeli kuyruga yazilamadi (catal-kuyruk.sh --not)" \
            json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
        fi
        ;;
    esac
  done <<EOF_EYLEM
$EYLEMLER
EOF_EYLEM
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
    # KAPANIŞ SEBEBİ ARTIK "açık iş yok" DEĞİL: dönem, bağımsız bir denetim YEŞİL verdiği için
    # biter (F1-5a). Sebep ÇÖZÜMLEYİCİDEN gelir — burada sabit metin basmak, aynı kararı kullanan
    # KURULUM dönemi için yanlış cümle üretiyordu: hiç koşmamış bir "kapanış denetimi"nin yeşili
    # hem sahip ekranına hem günlüğe yazılıyordu (hasım bulgusu 2026-07-30).
    rm -f "$GOSTERGE" "$KOK/tools/sevk/.donem-capa"
    kapanis_yuzeyi "durdu — ${KAPANIS_SEBEP:-dönem kapandı}"
    J_tip=donem-kapanis J_donem="$DONEM_ID" J_kutu="$DONEM_KUTU" J_sinif="${KAPANIS_SEBEP:-donem-kapandi}" \
      J_sebep="${KAPANIS_SEBEP:-dönem kapandı} — muhur sahibin" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
    printf 'DÖNEM KAPANDI · %s · %s (mühür sende)\n%s\n' "$DONEM_ID" "${KAPANIS_SEBEP:-dönem kapandı}" "$MESAJ"
    exit 0
    ;;
  *)
    kapat "ariza" "sevk beklenmeyen karar döndürdü: '${KARAR}' (fail-closed)"
    ;;
esac
