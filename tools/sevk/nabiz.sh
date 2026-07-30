#!/bin/bash
# nabiz — WATCHDOG (E5). Claude Code'un DIŞINDA, launchd ile koşar. Tasarım §8.
#
# NEDEN AYRI SÜREÇ: bu betiğin tek işi "yapı sustu" demektir; sustuğu an Claude çalışmıyordur.
# Bir parçanın ölümünü raporlayacak şey o parçanın kendisi olamaz — kancanın ölümünü kanca
# yakalayamaz. Okuduğu açılış damgasını da sevk değil `/donem` düşürür (çift hat).
#
# DİRİLTMEZ (D-25 ①): haber verir, dönemi kendisi başlatmaz. Dirilten otomasyon, sahibin
# kilidini kaldıran gizli bir 3. basamaktır.
#
# Dört iş, sırayla:
#   0) UZAKTAN CEVAP (F1-5g) — DÖNEM KAPISININ ÖNÜNDE koşar; kapısı "açık kod var mı"dır
#   1) İKİ DURUM alarmı — (a) nabız durdu · (b) hiç doğmadı
#   2) Uzaktan DUR — IMAP'te yalnız BAŞLIK araması (gövde OKUNMAZ)
#   3) Bayat dönemde uyanık-tutma savının temizliği
#   4) Kendi dönem izini bırakma (canlılık denetiminin okuduğu damga)
#
# 1-4 için dönem AÇIK değilse hiçbir şey yapmaz (sıradan günler etkilenmez). 0 AYRIDIR:
# cevabın geldiği an oturum açık olmayabilir ve dönem çoktan kapanmış olabilir — cevap hattı
# dönem dalının ARKASINA konsaydı tam da var oluş sebebindeki durumda hiç koşmazdı (hasım
# bulgusu, iki mercek). Kapısı `.cevap-capa`da açık kod bulunmasıdır; açık kod ancak sahibe
# kodlu bir soru gittiyse vardır, yani sıradan günlerde bu blok da hiçbir şey yapmaz.
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"
GOSTERGE="$DIZIN/.donem-acik"
NABIZ_DAMGA="$DIZIN/.nabiz-son"

# Canlılık damgası HER turda basılır — dönem olsun olmasın. Kurulum denetimi bunu okur:
# "işaret dosyası var" ile "iş fiilen koşuyor" ayrı şeylerdir (E4'ün ölü-kural dersi).
date -u '+%Y-%m-%dT%H:%M:%SZ' > "$NABIZ_DAMGA" 2>/dev/null || true

[ -r "$DIZIN/ortak.sh" ] || exit 0
# shellcheck source=/dev/null
. "$DIZIN/ortak.sh"

CAPA="$DIZIN/.cevap-capa"

# ── F1-5g · cevap hattının JS yardımcıları (tek ev) ───────────────────────────────────────
# Dördü de SAF: girdi env/stdin, çıktı stdout. Hiçbiri dosya değiştirmez (yazan yalnız
# CEVAP_JS_YAZ) ve hiçbiri ağa çıkmaz — testler bu yüzden ağsız koşabilir.

# (a) Çapayı oku: açık kodları TSV olarak dök. Bozuk/çözülemeyen çapa exit 1 (fail-closed):
#     "dosya yok" ile "okuyamadım" AYNI ŞEY DEĞİLDİR (catal-kuyruk COZULEMEDI emsali).
CEVAP_JS_OKU='
import { readFileSync } from "node:fs";
let ham;
try { ham = readFileSync(process.env.CAPA_YOL, "utf8"); } catch { process.exit(0); }
const cikti = [];
for (const l of ham.split("\n")) {
  if (!l.trim()) continue;
  let j;
  try { j = JSON.parse(l); } catch { process.exit(1); }   // bozuk satir = FAIL-CLOSED
  if (!j || typeof j !== "object" || !j.kod) process.exit(1);
  if (j.durum !== "acik") continue;
  const t = Date.parse(j.ts || "");
  const yasSaat = Number.isFinite(t) ? Math.floor((Date.now() - t) / 3600000) : 9999;
  const sec = Array.isArray(j.secenekler) ? j.secenekler : [];
  const gor = Array.isArray(j.gorulen) ? j.gorulen : [];
  // KİMLİK ÇAPASIZ SATIR DÖKÜLMEZ (fail-closed): msgid yoksa arama boş dizeyle koşardı.
  if (!j.msgid) continue;
  // AYRAÇ 0x1e — sekme DEĞİL. Sekme bir IFS-BOŞLUĞUDUR: bash ardışık sekmeleri TEK ayraç
  // sayar ve BOŞ ALAN satırdan düşer. Yeni her kayıtta `alarm` boş olduğu için sütunlar
  // kayıyordu ve sahibin doğru cevabı "listede olmayan seçenek" sayılıyordu (yedi mercek).
  cikti.push([j.kod, j.msgid, j.catal || "", j.donem || "", j.kutu || "",
              String(yasSaat), j.alarm || "", String(j.bicimsiz || 0),
              sec.join("\u001f"), gor.join(" ")].join("\u001e"));
}
if (cikti.length) console.log(cikti.join("\n"));
'

# (b) Çapaya yerinde yaz: TEK alanı değiştirir, satır sırasını korur, ATOMİK (gecici + rename).
#     Yarim yazilmis bir capa, bir sonraki turda (a)nin fail-closed dalini ateslerdi.
CEVAP_JS_YAZ='
import { readFileSync, writeFileSync, renameSync, chmodSync } from "node:fs";
const yol = process.env.CAPA_YOL, kod = process.env.Y_KOD;
const alan = process.env.Y_ALAN, deger = process.env.Y_DEGER;
if (!["durum", "alarm", "bicimsiz", "gorulen"].includes(alan)) process.exit(1);
let satirlar;
try { satirlar = readFileSync(yol, "utf8").split("\n"); } catch { process.exit(1); }
const yeni = satirlar.map((l) => {
  if (!l.trim()) return l;
  let j; try { j = JSON.parse(l); } catch { return l; }
  if (j.kod !== kod) return l;
  j[alan] = alan === "bicimsiz" ? Number(deger) || 0
          : alan === "gorulen" ? String(deger).split(" ").filter(Boolean) : deger;
  return JSON.stringify(j);
});
writeFileSync(yol + ".yeni", yeni.join("\n"), { mode: 0o600 });
renameSync(yol + ".yeni", yol);
try { chmodSync(yol, 0o600); } catch {}
'

# (c) From basligindan ZARF ADRESINI cikar (gorunen ad YOK SAYILIR) ve ASCII kucult.
#     "From: \"sahip@ornek.com\" <saldirgan@kotu.com>" alt-dize denetimini gecerdi.
CEVAP_JS_ADRES='
import { readFileSync } from "node:fs";
let ham = ""; try { ham = readFileSync(0, "utf8"); } catch {}
// KATLAMAYI AÇ (RFC 5322): uzun basliklar devam satirina sarilabilir; satir bazli arama
// "From: Batu\n <adres>" girdisinde gorunen adi adres saniyordu ve sahibin KENDI cevabi ona
// sahtecilik denemesi olarak bildiriliyordu (hasim bulgusu).
ham = ham.replace(/\r/g, "").replace(/\n[ \t]+/g, " ");
let satir = ham.split("\n").find((l) => /^from:/i.test(l.trim())) || "";
// TIRNAKLI GORUNEN ADI SIL: RFC 5322de gorunen ad < ve > tasiyabilir; ilk <...> eslesmesini
// almak kimlik kapisini deliyordu — From: "Batu <sahip@x>" <saldirgan@y> sahibin adresini
// gosteriyordu. Once tirnakli bolum silinir, sonra SON <...> cifti alinir.
satir = satir.replace(/"(?:[^"\\]|\\.)*"/g, " ");
const hepsi = [...satir.matchAll(/<([^<>]+)>/g)];
const adres = (hepsi.length ? hepsi[hepsi.length - 1][1] : satir.replace(/^[^:]*:/, "")).trim();
console.log(adres.replace(/[A-Z]/g, (c) => c.toLowerCase()));
'

# (d) MIME-FARKINDA SECIM COZUMLEYICI. Gercek bir telefon yaniti cok parcalidir: BODY[TEXT]in
#     ilk satiri sahibin yazdigi rakam DEGIL, MIME sinir cizgisidir (olculdu). v1in "alintidan
#     onceki ilk bos olmayan satir" kurali sahibin DOGRU cevabini reddederdi.
#     Cikti: "SECIM\t<no>\t<-- secenek metni yok, cagiran capadan alir>" ya da bos.
CEVAP_JS_SECIM='
import { readFileSync } from "node:fs";
let ham = ""; try { ham = readFileSync(0, "utf8"); } catch { process.exit(0); }
ham = ham.replace(/\r/g, "");                              // CRLF cagirandan gelmeyebilir
const JETON = (process.env.SEC_JETON || "").trim();
const bit = (s) => { console.log(s); process.exit(0); };
// 1 · Cok parcali ise EN ICTEKI text/plain parcasini sec. Olagan bir telefon yaniti
//     multipart/mixed > multipart/alternative > (text/plain + text/html) yapisindadir:
//     ilk bulunan sinir DIS sinirdir ve dis blok icinde de "text/plain" gecer, o yuzden tek
//     kat ayirma DIS blogu secip ic sinir cizgisini "ilk dolu satir" yapiyordu (hasim bulgusu).
let parca = ham;
for (let kat = 0; kat < 4; kat++) {
  const sinirEs = parca.match(/^--[-A-Za-z0-9_.=+]+$/m);
  if (!sinirEs) break;
  const kacir = sinirEs[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parcalar = parca.split(new RegExp("^" + kacir + "-?-?$", "m"));
  const secili = parcalar.find((p) => /^\s*content-type:\s*text\/plain/im.test(p));
  if (!secili) break;
  if (secili === parca) break;
  parca = secili;
}
// 2 · Parca BASLIGI varsa atla — ama YALNIZ gercekten baslik gibi gorunuyorsa. (Yasanmis kusur:
//     kosulsuz "ilk bos satira kadar atla" kurali, duz metinli bir yanitta sahibin YAZDIGI
//     rakami atliyordu; fixture bunu yakaladi.)
let govde = parca.replace(/^\n+/, "");
if (/^[A-Za-z][A-Za-z0-9-]*:\s/.test(govde.split("\n")[0] || "")) {
  const bos = govde.search(/\n[ \t]*\n/);
  govde = bos >= 0 ? govde.slice(bos).replace(/^\n+/, "") : "";
}
// 3 · Kodlamayi coz (basligi PARCADAN okunur, govdeden degil).
const kEs = parca.match(/content-transfer-encoding:\s*([A-Za-z0-9-]+)/i);
const kodlama = kEs ? kEs[1].toLowerCase() : "";
if (kodlama === "base64") { try { govde = Buffer.from(govde.replace(/\s+/g, ""), "base64").toString("utf8"); } catch {} }
else if (kodlama === "quoted-printable") {
  govde = govde.replace(/=\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}
// 4 · Alinti sinirindan ONCEKI bolgede ilk dolu satir: tam olarak bir rakam (+ istege bagli jeton).
const ALINTI = /^\s*(>|-{3,}|On .*wrote:|.*\d{4}.*yazd|Kimden:|From:|Gonderen:|Gönderen:)/i;
for (const satirHam of govde.split("\n")) {
  if (ALINTI.test(satirHam)) break;
  const satir = satirHam.replace(/﻿/g, "").trim();
  if (!satir) continue;
  const m = satir.match(/^([0-9])(?:\s+(\S+))?$/);
  if (!m) bit("YOK\tilk dolu satir rakam degil");
  if (JETON && (m[2] || "") !== JETON) bit("YOK\tjeton eslesmedi");
  bit("SECIM\t" + m[1]);
}
bit("YOK\tgovdede secim bulunamadi");
'


# ═══ 0 · UZAKTAN CEVAP (F1-5g) — dönem kapısının ÖNÜNDE ═══════════════════════════════════
# Kimlik çapası postanın Message-ID başlığıdır; sahip yanıtladığında istemci onu In-Reply-To
# başlığına kopyalar. Üç güvence bir arada (tasarı §3): saf ASCII (IMAP tırnaklı dizesi 7-bit) ·
# kullanıcı yüzeyinde görünmez (bildirim şeridi ve Fwd: sırrı taşımaz) · özgün postada YOKTUR
# (yapının kendi postası kendi kodunu eşleştiremez — HESAP=ALICI kurulumunda tek koruma budur).
#
# İLAN EDİLMİŞ SINIR: curl BODY.PEEK üretemiyor (ölçüldü) ⇒ okunan ileti \Seen işaretlenir.
# Bu yüzden tekilleştirme UNSEEN bayrağına DEĞİL çapadaki kod durumuna bağlıdır.
cevap_hatti() {
  [ -s "$CAPA" ] || return 0
  [ -n "${NODE_BIN:-}" ] || return 0
  [ -n "${KANAL_CEVAP_KANALI:-}" ] || return 0
  [ -n "${KANAL_IMAP_SUNUCU:-}" ] && [ -n "${KANAL_HESAP:-}" ] || return 0

  local ACIKLAR PAROLA KOD MSGID CATAL C_DONEM C_KUTU YAS_SAAT ALARM BICIMSIZ
  # Çapa BOZUKSA sessiz geçilmez: "dosya yok" ile "dosya var ama çözülemedi" AYNI ŞEY DEĞİLDİR
  # (catal-kuyruk.sh COZULEMEDI sınıfının kardeşi). Sessiz geçmek, sahibin cevap bekleyen
  # sorusunun kaybolduğunu kimsenin bilmemesi demektir.
  ACIKLAR="$(CAPA_YOL="$CAPA" OMUR="${KANAL_CEVAP_OMUR_SAAT:-72}" ESIK="${KANAL_CEVAP_ESIK_SAAT:-24}" \
    "$NODE_BIN" --input-type=module -e "$CEVAP_JS_OKU" 2>/dev/null)" || {
    J_tip=bulgu J_cins=cevap-capasi-okunmuyor J_detay="tools/sevk/.cevap-capa cozulemedi (fail-closed)" \
      json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
    CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins cevap-okunamadi --sayacsiz \
      --anahtar capa-bozuk --kutu "${DONEM_KUTU:-}" \
      --detay "Cevap kayıtları okunamıyor. Telefondan verdiğin bir cevap işlenmemiş olabilir; bilgisayardan bak: 00_pano/SENDE_BEKLEYEN.md" || true
    return 0
  }
  [ -n "$ACIKLAR" ] || return 0

  PAROLA="$(security find-generic-password -s "${KANAL_KEYCHAIN_SERVIS:-keel-haber}" -a "$KANAL_HESAP" -w 2>/dev/null)" || PAROLA=""
  [ -n "$PAROLA" ] || return 0

  while IFS="$(printf '\036')" read -r KOD MSGID CATAL C_DONEM C_KUTU YAS_SAAT ALARM BICIMSIZ SECENEKLER GORULEN; do
    [ -n "$KOD" ] || continue
    # Sayısal alanlar DOĞRULANIR: kayan bir sütun aritmetik genişletmede kabuğu öldürüyordu
    # (genişletme hatası non-interaktif kabukta ölümcül) ve tur izsiz sona eriyordu.
    case "$YAS_SAAT" in ''|*[!0-9]*) YAS_SAAT=9999 ;; esac
    case "$BICIMSIZ" in ''|*[!0-9]*) BICIMSIZ=0 ;; esac
    # (a) Ömrü dolan kod: düşer + sahibe TEK bilgi. Geç gelen cevabın sessizce yutulması,
    #     sahibin "cevapladım" sanmasıyla yapının "cevap yok" bilmesi arasında sessiz bir
    #     çatlak açardı.
    if [ "$YAS_SAAT" -ge "${KANAL_CEVAP_OMUR_SAAT:-72}" ]; then
      cevap_capa_yaz "$KOD" durum suresi-doldu
      CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins cevap-okunamadi --sayacsiz \
        --anahtar "omur-$CATAL" --kutu "$C_KUTU" --donem "$C_DONEM" \
        --detay "Sorunun cevap süresi doldu ($CATAL). Telefondan cevaplamak artık işlemez; cevabını bilgisayardan ver: 00_pano/SENDE_BEKLEYEN.md" || true
      continue
    fi
    # (b) Eşiği aşan cevapsız çatal (P4.4) — kod başına BİR kez, sayaç dosyasına DOKUNMADAN.
    if [ "$YAS_SAAT" -ge "${KANAL_CEVAP_ESIK_SAAT:-24}" ] && [ "$ALARM" != "gitti" ]; then
      # Anahtarda KOD YOK (sır): tekilleştirme çatal kimliğiyle yeter ve `.haber-durum`a
      # sır dizesi sızmaz. İşaretleme yalnız posta GİTTİYSE yapılır — gitmeyen alarmı "gitti"
      # yazmak P4.4 yükseltmesini kalıcı olarak susturuyordu (hasım bulgusu).
      A_RC=0
      CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins cevapsiz --sayacsiz \
        --anahtar "esik-$CATAL" --kutu "$C_KUTU" --donem "$C_DONEM" \
        --detay "Bir soru $YAS_SAAT saattir cevabını bekliyor ($CATAL). Buna bağlı işler bekliyor. Postayı yanıtlayıp seçeneğin numarasını yazman yeter." || A_RC=$?
      case "$A_RC" in 0|3) cevap_capa_yaz "$KOD" alarm gitti ;; esac
    fi
    cevap_ara "$KOD" "$MSGID" "$CATAL" "$C_DONEM" "$C_KUTU" "$BICIMSIZ" "$SECENEKLER" "$GORULEN"
  done <<CEVAP_LISTE
$ACIKLAR
CEVAP_LISTE
  unset PAROLA
}

# Çapaya YERİNDE ve ATOMİK yazım (kilitli). Üç yazıcı vardır (kapı kod ekler, burası iki alan
# günceller) ve kilitsiz oku-değiştir-yaz bu deponun en pahalı dersidir (kilit.sh:3-7).
cevap_capa_yaz() {
  local K="$1" ALAN="$2" DEGER="$3" RC=0
  . "$DIZIN/kilit.sh"
  # SESSİZ BAŞARISIZLIK YOK (hasım bulgusu): kilit alınamazsa ya da yazım koşamazsa çağıran
  # bunu BİLMELİ. Eskiden `|| true` ile yutuluyordu: cevap kuyruğa yazılıyor, çapa "açık"
  # kalıyor ve bir sonraki tur sahibe "bu soru başka bir yoldan kapanmıştı" diyordu — oysa
  # cevabı uygulanmıştı. Dönüş: 0 = yazıldı · 1 = yazılamadı (iz günlüğe düşer).
  if ! kilit_al "$CAPA.kilit"; then
    J_tip=bulgu J_cins=cevap-capasi-yazilamadi J_detay="kilit alinamadi ($ALAN)" \
      json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
    return 1
  fi
  CAPA_YOL="$CAPA" Y_KOD="$K" Y_ALAN="$ALAN" Y_DEGER="$DEGER" \
    "$NODE_BIN" --input-type=module -e "$CEVAP_JS_YAZ" >/dev/null 2>&1 || RC=1
  kilit_birak
  if [ "$RC" != "0" ]; then
    J_tip=bulgu J_cins=cevap-capasi-yazilamadi J_detay="yazim kosamadi ($ALAN)" \
      json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
  fi
  return "$RC"
}

# Tek kodun IMAP hattı: ara → başlıkları süz → gövdeyi çöz → uygula.
cevap_ara() {
  local KOD="$1" MSGID="$2" CATAL="$3" C_DONEM="$4" C_KUTU="$5" BICIMSIZ="$6" SECLER="$7" GORULEN="${8:-}"
  local UIDLER U BASLIK GOVDE SECIM SONUC GONDEREN SEC_NO SEC_METIN

  # UID SEARCH (düz SEARCH DEĞİL — §0.1): düz SEARCH mesaj SIRA numarası döndürür ve onu
  # `;UID=` olarak vermek gerçek bir gelen kutusunda YANLIŞ mesajı çeker. Aranan dize saf
  # ASCII olduğu için CHARSET literali gerekmez (konu Türkçe harf taşıdığı için arama
  # anahtarı OLAMAZDI — ölçüldü: curl tele ham UTF-8 baytı yolluyor).
  UIDLER="$(imap_ara "UID SEARCH HEADER In-Reply-To \\\"$MSGID\\\"")"
  [ -n "$UIDLER" ] || UIDLER="$(imap_ara "UID SEARCH HEADER References \\\"$MSGID\\\"")"
  [ -n "$UIDLER" ] || return 0

  for U in $UIDLER; do
    case "$U" in ''|*[!0-9]*) continue ;; esac
    # AYNI İLETİ İKİ KEZ SAYILMAZ (hasım bulgusu, üç mercek): arama okundu-bayrağına bağlı
    # olmadığı için aynı UID her turda yeniden bulunur. Sayaç TUR başına artınca sahibin TEK
    # okunamayan yanıtı ~45 dakikada geçerli kodu düşürüyordu. `gorulen` alanı bu niyetin
    # yazılıp hiç okunmayan iziydi; artık fiilen kullanılıyor.
    case " $GORULEN " in *" $U "*) continue ;; esac
    BASLIK="$(imap_getir ";UID=$U;SECTION=HEADER.FIELDS%20(FROM%20DATE%20MESSAGE-ID%20IN-REPLY-TO%20AUTO-SUBMITTED%20PRECEDENCE%20X-AUTOREPLY)")"
    [ -n "$BASLIK" ] || continue
    # Otomatik yanıt (tatil iletisi) kodu YAKMAZ: konuyu ve kimlik başlığını aynen taşır,
    # gövdesi rakam değildir ve her turda yeniden eşleşirdi ⇒ 15 dakikada geçerli bir kodu
    # düşürürdü — tam da sahibin uzakta olduğu anda (hasım bulgusu).
    # RFC 3834: `Auto-Submitted: no` "bu ileti otomatik DEĞİLDİR" demektir. Alt-dize eşleşmesi
    # onu da eliyordu ve dal izsiz olduğu için arıza teşhis edilemiyordu: sahip "cevapladım"
    # sanar, yapı "cevap yok" bilir (hasım bulgusu). Değer artık ayrıştırılıyor.
    if printf '%s' "$BASLIK" | grep -qiE '^(auto-submitted:[[:space:]]*auto-|x-autoreply:|precedence:[[:space:]]*(bulk|auto))'; then
      J_tip=bulgu J_cins=cevap-otomatik-yanit J_donem="$C_DONEM" J_detay="uid $U otomatik yanit basligi tasiyor, atlandi" \
        json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
      continue
    fi
    # From ZARF ADRESİ üzerinden BİREBİR: görünen ada yazılmış bir adres alt-dize denetimini
    # geçerdi (hasım bulgusu; aynı zaafiyet DUR hattında da vardı).
    # ARAMA SUNUCUNUN SÖZÜ, DOĞRULAMA YAPININ İŞİ: çekilen iletinin In-Reply-To/References
    # başlığı çapadaki kimliği birebir taşımıyorsa cevap sayılmaz (yanlış UID / sunucu hatası).
    case "$BASLIK" in *"$MSGID"*) : ;; *) continue ;; esac
    GONDEREN="$(printf '%s' "$BASLIK" | "$NODE_BIN" --input-type=module -e "$CEVAP_JS_ADRES" 2>/dev/null || true)"
    if [ "$GONDEREN" != "$(printf '%s' "$KANAL_ALICI" | tr 'A-Z' 'a-z')" ]; then
      J_tip=cevap-reddedildi J_donem="$C_DONEM" J_kutu="$C_KUTU" J_catal="$CATAL" J_uid="$U" \
        J_sebep="gonderen zarf adresi ALICI ile eslesmiyor" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
      CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins kanal --sayacsiz --anahtar "sahte-$CATAL" \
        --kutu "$C_KUTU" --donem "$C_DONEM" \
        --detay "Senin adresinden gelmeyen bir cevap denemesi geldi ve REDDEDİLDİ. Hiçbir şey değişmedi; soru hâlâ cevabını bekliyor." || true
      # `--sayacsiz` haber.sh'ın kendi frenini de atlar ⇒ tekilleştirme ÇAPADA olmak zorunda:
      # yoksa aynı ileti her nabız turunda yeni bir posta doğururdu (24 saatte ~96 posta).
      GORULEN="$GORULEN $U"; cevap_capa_yaz "$KOD" gorulen "$GORULEN"
      continue
    fi
    GOVDE="$(imap_getir ";UID=$U;SECTION=TEXT;PARTIAL=0.8192")"
    if [ -z "$GOVDE" ]; then
      # "Okunamadı" ile "biçimsiz" AYRI sayaçtır: geçici bir ağ arızası geçerli bir kodu
      # ASLA düşürmemeli (hasım bulgusu — üç tökezleme sahibin hiçbir hatası olmadan
      # kanalı öldürüyordu).
      J_tip=bulgu J_cins=cevap-okunamadi J_donem="$C_DONEM" J_detay="govde bos/curl hatasi (uid $U)" \
        json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
      continue
    fi
    SECIM="$(printf '%s' "$GOVDE" | SEC_JETON="${KANAL_CEVAP_JETON:-}" "$NODE_BIN" --input-type=module -e "$CEVAP_JS_SECIM" 2>/dev/null || true)"
    case "$SECIM" in
      SECIM*) : ;;
      *)
        BICIMSIZ=$(( BICIMSIZ + 1 ))
        GORULEN="$GORULEN $U"; cevap_capa_yaz "$KOD" gorulen "$GORULEN"
        cevap_capa_yaz "$KOD" bicimsiz "$BICIMSIZ"
        J_tip=cevap-reddedildi J_donem="$C_DONEM" J_catal="$CATAL" J_uid="$U" \
          J_sebep="govde bicim disi (${SECIM:-cozulemedi})" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
        if [ "$BICIMSIZ" -ge 3 ]; then
          cevap_capa_yaz "$KOD" durum bicimsiz-dustu
          CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins cevap-okunamadi --sayacsiz \
            --anahtar "bicim-$CATAL" --kutu "$C_KUTU" --donem "$C_DONEM" \
            --detay "Cevabını okuyamadım ($CATAL): yanıtın ilk satırında yalnız seçeneğin numarası olmalı. Cevabını bilgisayardan ver: 00_pano/SENDE_BEKLEYEN.md" || true
        fi
        continue ;;
    esac
    # SEÇİM geçerli — uygulama TEK yazıcıdan (catal-kuyruk.sh) geçer.
    SEC_NO="$(printf '%s' "$SECIM" | cut -f2)"
    SEC_METIN="$(printf '%s' "$SECLER" | cut -d"$(printf '\037')" -f"$SEC_NO")"
    # Listede olmayan numara CEVAP DEĞİLDİR (biçim dışıyla aynı sınıf): sahip 5 yazmışsa ve
    # üç seçenek varsa, "en yakını" diye bir şey yoktur.
    if [ -z "$SEC_METIN" ] || [ "$SEC_NO" = "0" ]; then
      BICIMSIZ=$(( BICIMSIZ + 1 ))
      GORULEN="$GORULEN $U"; cevap_capa_yaz "$KOD" gorulen "$GORULEN"
      cevap_capa_yaz "$KOD" bicimsiz "$BICIMSIZ"
      J_tip=cevap-reddedildi J_donem="$C_DONEM" J_catal="$CATAL" J_uid="$U" \
        J_sebep="listede olmayan secenek numarasi ($SEC_NO)" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
      continue
    fi
    SONUC="$(CLAUDE_PROJECT_DIR="$KOK" bash "$DIZIN/catal-kuyruk.sh" --cevapla "$CATAL" "$SEC_METIN" "uzaktan-posta uid:$U" 2>&1 | head -n1 || true)"
    case "${SONUC%%$(printf '\t')*}" in
      CEVAPLANDI)
        cevap_capa_yaz "$KOD" durum tuketildi
        # KOD GÜNLÜĞE YAZILMAZ (sır) — Message-ID de yazılmaz, çünkü kodun KENDİSİNİ içerir
        # (hasım bulgusu: yorumun iki satır altında sızıyordu). Dış gözün bağımsız doğrulaması
        # için UID + çatal kimliği yeterlidir (§9 sahip-atfının gelen yönü).
        J_tip=cevap-alindi J_donem="$C_DONEM" J_kutu="$C_KUTU" J_catal="$CATAL" J_uid="$U" \
          J_kaynak="uzaktan-posta" JN_secim="$SEC_NO" \
          json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
        return 0 ;;
      ATLANDI)
        # Çapa yazılamadıysa sahibe hiçbir şey söylenmez: bir sonraki tur yeniden dener.
        # "Hiçbir şey değiştirilmedi" cümlesi, cevabın UYGULANDIĞI bir turda yanlış olurdu.
        cevap_capa_yaz "$KOD" durum tuketildi || return 0
        J_tip=cevap-reddedildi J_donem="$C_DONEM" J_catal="$CATAL" J_uid="$U" \
          J_sebep="madde artik cevap-bekliyor degil" json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
        CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins cevap-okunamadi --sayacsiz \
          --anahtar "kapali-$CATAL" --kutu "$C_KUTU" --donem "$C_DONEM" \
          --detay "Cevabın geldi ama o soru başka bir yoldan kapanmıştı ($CATAL); hiçbir şey değiştirilmedi." || true
        return 0 ;;
      *)
        # ARIZA: kod TÜKETİLMEZ — sahip yeniden yanıtlayabilir.
        J_tip=bulgu J_cins=cevap-yazilamadi J_donem="$C_DONEM" J_detay="catal-kuyruk --cevapla: $SONUC" \
          json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
        CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins cevap-okunamadi --sayacsiz \
          --anahtar "ariza-$CATAL" --kutu "$C_KUTU" --donem "$C_DONEM" \
          --detay "Cevabını aldım ama kaydedemedim ($CATAL). Bilgisayardan bak: 00_pano/SENDE_BEKLEYEN.md" || true
        return 0 ;;
    esac
  done
}

imap_ara() {
  printf 'url = "imaps://%s:%s/INBOX"\nuser = "%s:%s"\nrequest = "%s"\nmax-time = 20\nsilent\nshow-error\n' \
    "$KANAL_IMAP_SUNUCU" "${KANAL_IMAP_PORT:-993}" "$KANAL_HESAP" "$PAROLA" "$1" \
    | curl -K - 2>/dev/null | tr -d '\r' | sed -n 's/^\* SEARCH //p' | head -n1
}
imap_getir() {
  printf 'url = "imaps://%s:%s/INBOX%s"\nuser = "%s:%s"\nmax-time = 20\nsilent\nshow-error\n' \
    "$KANAL_IMAP_SUNUCU" "${KANAL_IMAP_PORT:-993}" "$1" "$KANAL_HESAP" "$PAROLA" \
    | curl -K - 2>/dev/null | tr -d '\r'
}

kanal_oku "$KOK" >/dev/null 2>&1 || true
node_bul || NODE_BIN=""
cevap_hatti

DONEM_RC=0; donem_oku "$KOK" || DONEM_RC=$?

# ── 3 · Uyanık-tutma savının temizliği ────────────────────────────────────────────────────
# Dönem kapandıysa (ya da gösterge bozuksa) savı bırak: sızan bir sav Mac'i hiç uyutmaz,
# bu da ayrı bir arızadır. Savın PID'i göstergenin 3. satırındadır.
sav_birak() {
  local P="${1:-}"
  case "$P" in ''|*[!0-9]*) return 0 ;; esac
  kill "$P" 2>/dev/null || true
}
if [ "$DONEM_RC" != "0" ]; then
  [ -f "$DIZIN/.caffeinate-pid" ] && { sav_birak "$(head -n1 "$DIZIN/.caffeinate-pid" 2>/dev/null)"; rm -f "$DIZIN/.caffeinate-pid"; }
  exit 0
fi

kanal_oku "$KOK" >/dev/null 2>&1 || true
ESIK_DK="${KANAL_SESSIZLIK_ESIK_DK:-30}"

node_bul || exit 0

# ── 1 · İki durum ─────────────────────────────────────────────────────────────────────────
# Günlükten BU dönemin kayıtları okunur: en yeni kaydın yaşı + açılıştan başka kayıt var mı.
# Çıktı: <durum>\t<yas_dk>\t<kayit_sayisi>   (durum: SESSIZ_A | SESSIZ_B | CANLI | OKUNAMADI)
OLCUM="$(N_KOK="$KOK" N_DONEM="$DONEM_ID" N_DAMGA="${DONEM_DAMGA:-}" N_ESIK="$ESIK_DK" \
  "$NODE_BIN" --input-type=module -e '
import { readFileSync } from "node:fs";
import { join } from "node:path";
const KOK = process.env.N_KOK || ".";
const DONEM = process.env.N_DONEM || "";
const ESIK = Number(process.env.N_ESIK || 30);
const bitir = (d, y, n) => { console.log([d, y, n].join("\t")); process.exit(0); };

let ham = "";
try { ham = readFileSync(join(KOK, "00_pano", "zarf-gunlugu.jsonl"), "utf8"); }
catch { ham = ""; }

let enYeni = 0, sayi = 0, acilisSayisi = 0;
for (const satir of ham.split("\n")) {
  if (!satir.trim()) continue;
  let j;
  try { j = JSON.parse(satir); } catch { continue; }
  if (String(j.donem || "") !== DONEM) continue;
  sayi++;
  if (j.tip === "donem-acilis") acilisSayisi++;
  const t = Date.parse(j.ts || "");
  if (Number.isFinite(t) && t > enYeni) enYeni = t;
}

// Kayit hic yoksa gostergenin kendi damgasi taban alinir (gunluk yazimi olduyse de sussun diye).
if (!enYeni) {
  const t = Date.parse(process.env.N_DAMGA || "");
  if (Number.isFinite(t)) enYeni = t;
}
if (!enYeni) bitir("OKUNAMADI", "", String(sayi));

const yasDk = Math.floor((Date.now() - enYeni) / 60000);
if (yasDk < ESIK) bitir("CANLI", String(yasDk), String(sayi));
// (b) HIC DOGMADI: dönem acik ama acilistan baska kayit yok — sevk daha ilk adimda oldu.
if (sayi <= acilisSayisi) bitir("SESSIZ_B", String(yasDk), String(sayi));
// (a) NABIZ DURDU: kayitlar var ama esik asildi.
bitir("SESSIZ_A", String(yasDk), String(sayi));
' 2>/dev/null || printf 'OKUNAMADI\t\t0')"

DURUM="$(printf '%s' "$OLCUM" | cut -f1)"
YAS_DK="$(printf '%s' "$OLCUM" | cut -f2)"
KAYIT="$(printf '%s' "$OLCUM" | cut -f3)"

case "$DURUM" in
  SESSIZ_A|SESSIZ_B)
    if [ "$DURUM" = "SESSIZ_B" ]; then
      DETAY="Dönem AÇIK görünüyor ama açılıştan bu yana HİÇ nabız gelmemiş: sevk daha ilk adımda ölmüş olabilir (kablo-söküm cinsi).
Dönem: $DONEM_ID · kutu: $DONEM_KUTU · açılış yaşı: $YAS_DK dk · eşik: $ESIK_DK dk
Yapı diriltilmedi — yeniden başlatma senin kararın. Bak: 00_pano/SABAH.md ve 00_pano/zarf-gunlugu.jsonl"
    else
      DETAY="Dönem AÇIK ama $YAS_DK dakikadır hiçbir hareket yok (eşik: $ESIK_DK dk). Yapı susmuş olabilir.
Dönem: $DONEM_ID · kutu: $DONEM_KUTU · bu dönemde $KAYIT kayıt var.
Yapı diriltilmedi — yeniden başlatma senin kararın. Durdurmak istersen: bu adrese \"${KANAL_DUR_KONU:-KEEL DUR}\" konulu posta at."
    fi
    # Alarm ÖNCE günlüğe, sonra postaya: kanal kırıksa bile olayın izi kalmalı (postanın
    # gitmemesi, alarmın olmadığı anlamına gelmez — sabah yüzeyi bu kaydı okur).
    J_tip=alarm J_donem="$DONEM_ID" J_kutu="$DONEM_KUTU" J_cins=sessizlik J_durum="$DURUM" \
      J_sebep="nabiz yasi ${YAS_DK}dk (esik ${ESIK_DK}dk)" json_kur 2>/dev/null \
      | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
    # Tekilleştirme haber.sh'ın kendi freninde (--anahtar): dönem başına BİR sessizlik alarmı.
    CLAUDE_PROJECT_DIR="$KOK" haber_at --olay alarm --cins sessizlik --anahtar "$DURUM" \
      --donem "$DONEM_ID" --kutu "$DONEM_KUTU" --detay "$DETAY" || true
    ;;
esac

# ── 2 · Uzaktan DUR (IMAP · yalnız BAŞLIK; gövde OKUNMAZ) ─────────────────────────────────
# Beyanlı sınır (tasarı §4.1): From başlığı taklit edilebilir. Bu kanalın tek etkisi
# DURDURMAKTIR — sahtecilik en kötü ihtimalle gecenin işini iptal ettirir; veri sızdırmaz,
# karar bastırmaz, dışarı bir şey göndertmez. Fail-safe yönü doğru olduğu için jeton
# varsayılan kapalıdır (kanal.conf · DUR_JETON).
if [ ! -e "$DIZIN/.dur" ] && [ -n "${KANAL_IMAP_SUNUCU:-}" ] && [ -n "${KANAL_HESAP:-}" ]; then
  IMAP_PAROLA="$(security find-generic-password -s "${KANAL_KEYCHAIN_SERVIS:-keel-haber}" -a "$KANAL_HESAP" -w 2>/dev/null)" || IMAP_PAROLA=""
  if [ -n "$IMAP_PAROLA" ]; then
    ARANAN="${KANAL_DUR_KONU:-KEEL DUR}"
    [ -n "${KANAL_DUR_JETON:-}" ] && ARANAN="$ARANAN $KANAL_DUR_JETON"
    # UID SEARCH — düz SEARCH DEĞİL (F1-5g hasım turunda ölçülen GERÇEK ARIZA, 2026-07-30):
    # RFC 3501de düz `SEARCH` mesaj SIRA NUMARASI döndürür, UID döndüren `UID SEARCH`tir.
    # Aşağıdaki satır dönen sayıyı `;UID=` olarak veriyordu ve curl `UID FETCH` üretiyordu;
    # gerçek bir gelen kutusunda ikisi aynı değildir ⇒ uzaktan DUR muhtemelen HİÇ ateşlenmiyordu.
    # Değişken adının UIDLER olması hatayı altı pakettir görünmez kılmış. Canlı IMAP hiç
    # koşulmadığı için hiçbir test bunu göremezdi (E5in kendi ilan ettiği sınırın faturası).
    # Arama yalnız KONU eşleştirir ve hiçbir gövde indirilmez — DUR hattının sözü korunur.
    UIDLER="$(printf 'url = "imaps://%s:%s/INBOX"\nuser = "%s:%s"\nrequest = "UID SEARCH UNSEEN HEADER Subject \\"%s\\""\nmax-time = 20\nsilent\nshow-error\n' \
      "$KANAL_IMAP_SUNUCU" "${KANAL_IMAP_PORT:-993}" "$KANAL_HESAP" "$IMAP_PAROLA" "$ARANAN" \
      | curl -K - 2>/dev/null | tr -d '\r' | sed -n 's/^\* SEARCH //p' | head -n1)"
    for U in ${UIDLER:-}; do
      case "$U" in ''|*[!0-9]*) continue ;; esac
      # Yalnız From ve Date başlıkları çekilir (BODY.PEEK ile okundu işaretlenmez de).
      BASLIK="$(printf 'url = "imaps://%s:%s/INBOX;UID=%s;SECTION=HEADER.FIELDS%%20(FROM%%20DATE)"\nuser = "%s:%s"\nmax-time = 20\nsilent\nshow-error\n' \
        "$KANAL_IMAP_SUNUCU" "${KANAL_IMAP_PORT:-993}" "$U" "$KANAL_HESAP" "$IMAP_PAROLA" \
        | curl -K - 2>/dev/null | tr -d '\r')"
      # Zarf adresi BİREBİR (hasım bulgusu): alt-dize denetimi görünen ada yazılmış bir
      # adresle geçilebiliyordu — «From: "sahip@ornek.com" <saldirgan@kotu.com>».
      DUR_GONDEREN="$(printf '%s' "$BASLIK" | "$NODE_BIN" --input-type=module -e "$CEVAP_JS_ADRES" 2>/dev/null || true)"
      case "$DUR_GONDEREN" in
        "$(printf '%s' "$KANAL_ALICI" | tr 'A-Z' 'a-z')")
          POSTA_TARIH="$(printf '%s' "$BASLIK" | sed -n 's/^[Dd]ate: //p' | head -n1)"
          printf 'uzaktan · posta · %s\n' "${POSTA_TARIH:-tarih okunamadı}" > "$DIZIN/.dur"
          J_tip=dur-alindi J_donem="$DONEM_ID" J_kutu="$DONEM_KUTU" J_kaynak="posta" \
            J_sebep="uzaktan DUR postasi alindi (konu esleşti, gonderen dogrulandi)" \
            json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
          break
          ;;
      esac
    done
    unset IMAP_PAROLA
  fi
fi

exit 0
