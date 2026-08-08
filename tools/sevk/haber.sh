#!/bin/bash
# haber — otonom dönemin TEK dışa-haber noktası (E5). Sahibe e-posta atar: dört olay
# (donem-basladi · donem-bitti · catal-bekliyor · alarm). Tasarım §7.3 (kayıt `…/18`).
#
# SERBEST-METİN YASAĞI MEKANİKTİR: bu betikte `--govde` diye bir argüman YOKTUR. Çağıran yalnız
# olay adını ve o olayın TANIMLI alanlarını verir; gövdeyi buradaki şablon kurar. Kural metinde
# değil, arayüzde yaşar — kanona yazılmış bir yasağın koda inmiş hâli budur.
#
# GÖNDERİM-ÖNCESİ ZORUNLU SÜZGEÇ: konu+gövde tek parça hâlinde icerik-suzgeci.sh --metin'den
# geçer. Bu betik Stop/SubagentStop kancasının İÇİNDEN koşar; kanca-içi gönderim bir araç
# çağrısı olmadığı için `permissions.ask` ve PreToolUse önünden GEÇMEZ (E2 Hat-2 muafiyeti).
# Muafiyetin bedeli bu süzgeçtir: red → e-posta GİTMEZ, yerine sabit-şablonlu sansürlü alarm
# gider (fail-closed) ve günlüğe önleme bulgusu düşer.
#
# PAROLA: yalnız macOS Keychain'de. curl'e argüman olarak DEĞİL, yapılandırma stdin'inden
# (`curl -K -`) geçer — `ps` çıktısında ve diskte hiçbir an görünmez.
#
# Çıkış sözleşmesi (çağıran KARAR VERİR; bu betik kimseyi öldürmez):
#   0 = gönderildi (ya da --prova)      3 = süzgeç durdurdu, sansürlü alarm gitti
#   1 = ARGÜMAN/OLAY hatası (program kusuru)  4 = gönderim başarısız (ağ/kimlik)
#   2 = kanal KURULU DEĞİL (kanal.conf/Keychain yok) — G5.0c bunu açıkça meşru sayar; çağıran
#       SESSİZ kalır. 1 ile 2 tek koddayken kanalı hiç kurmamış proje her denemede sahip
#       ekranına sahte bulgu yazıyordu (hasım bulgusu: geri uyum kırığı).
#   5 = dönem başına gönderim tavanı doldu ya da bu olay zaten gönderilmiş
set -uo pipefail
export LC_ALL=C.UTF-8

DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KOK="${CLAUDE_PROJECT_DIR:-$(cd "$DIZIN/../.." && pwd)}"

ALAN_TAVAN=1500      # alan başına bayt
GOVDE_TAVAN=8192     # gövde toplamı
DONEM_GONDERIM_TAVANI=10

hata() { printf 'haber: %s\n' "$1" >&2; exit "${2:-1}"; }

# Ortak kitaplık erkenden alınır: gövde metni DUR konusunu yapılandırmadan okur (prova kipinde
# de doğru görünsün). Buradaki okuma FAIL-OPEN'dır — sert doğrulama gönderim anındadır (§6).
if [ -r "$DIZIN/ortak.sh" ]; then
  # shellcheck source=/dev/null
  . "$DIZIN/ortak.sh"
  kanal_oku "$KOK" >/dev/null 2>&1 || true
fi
DUR_KONU_METNI="${KANAL_DUR_KONU:-KEEL DUR}"

# ── 1 · Argümanlar (yalnız adlandırılmış; serbest gövde YOK) ──────────────────────────────
OLAY=""; A_DONEM=""; A_KUTU=""; A_TUR=""; A_SINIF=""; A_UYKU=""
A_BLOK1=""; A_BLOK2=""; A_BLOK3=""
A_CATAL=""; A_CEVIRI=""; A_ETKI=""; A_BEKLETIR=""
A_CINS=""; A_DETAY=""; A_ANAHTAR=""
A_KOD=""; A_SECENEKLER=""
PROVA=0; SAYACSIZ=0

# DEĞERLİ SEÇENEKLER — TEK LİSTE. Testler bu satırdan okur (çapa): elle tutulan bir kopya
# bayatlar ve yeni bir seçenek testsiz doğardı. Bayraklar (`--prova` · `--sayacsiz`) burada YOK.
DEGERLI_SECENEKLER='--olay --donem --kutu --tur --sinif --uyku --blok1 --blok2 --blok3 --catal --ceviri --etki --bekletir --cins --detay --anahtar --kod --secenekler'

while [ $# -gt 0 ]; do
  SEC="$1"
  case "$SEC" in
    # Cevap hattı dönem-DIŞI koşar (nabız, dönem kapısının önünde). Sayaç dosyası
    # (.haber-durum) ilk satırındaki DÖNEM kimliğine bağlıdır; dönem-dışı bir alarm onu
    # yeniden yazıp CANLI dönemin tekilleştirme listesini silerdi (hasım bulgusu). Bu bayrak
    # o dosyaya hiç dokunmaz; cevap hattının tekilleştirmesi .cevap-capa satırındadır.
    --sayacsiz) SAYACSIZ=1; shift; continue ;;
    --prova) PROVA=1; shift; continue ;;
  esac
  # TANIMA ÖNCE, DEĞER SONRA: sırası ters olsaydı `--govde` "değersiz kaldı" derdi ve
  # serbest-metin yasağının kendi sebebi kaybolurdu.
  case " $DEGERLI_SECENEKLER " in
    *" $SEC "*) : ;;
    *) hata "tanınmayan argüman: $SEC (serbest gövde argümanı YOKTUR — tasarım §7.3)" ;;
  esac
  # U28 · DEĞERSİZ KALAN SEÇENEK. `shift 2`, $# < 2 iken BAŞARISIZ olur ve HİÇBİR ŞEY kaydırmaz;
  # `set -e` yoktur (çıkış sözleşmesi kodlarla konuşur, §"Çıkış sözleşmesi") ⇒ döngü aynı
  # argümanla sonsuza dönerdi ve ÇAĞIRAN KANCA ASKIDA KALIRDI. Canlı ölçüldü, süreç elle
  # öldürüldü. Ölçüm 18 dalda değil TEK kapıda: kopya = sürüklenme (D-02 dersi).
  [ $# -ge 2 ] || hata "değer isteyen seçenek değersiz kaldı: $SEC"
  DEGER="$2"; shift 2
  case "$SEC" in
    --olay) OLAY="$DEGER" ;;
    --donem) A_DONEM="$DEGER" ;;
    --kutu) A_KUTU="$DEGER" ;;
    --tur) A_TUR="$DEGER" ;;
    --sinif) A_SINIF="$DEGER" ;;
    --uyku) A_UYKU="$DEGER" ;;
    --blok1) A_BLOK1="$DEGER" ;;
    --blok2) A_BLOK2="$DEGER" ;;
    --blok3) A_BLOK3="$DEGER" ;;
    --catal) A_CATAL="$DEGER" ;;
    --ceviri) A_CEVIRI="$DEGER" ;;
    --etki) A_ETKI="$DEGER" ;;
    --bekletir) A_BEKLETIR="$DEGER" ;;
    --cins) A_CINS="$DEGER" ;;
    --detay) A_DETAY="$DEGER" ;;
    --anahtar) A_ANAHTAR="$DEGER" ;;
    --kod) A_KOD="$DEGER" ;;
    --secenekler) A_SECENEKLER="$DEGER" ;;
    # Beyaz listede olup burada karşılığı OLMAYAN seçenek bir İÇ TUTARSIZLIKTIR ve sessiz
    # geçmez: iki liste ayrışırsa kullanıcı sessizce yok sayılan bir argüman verir.
    *) hata "iç tutarsızlık: $SEC beyaz listede ama atanmıyor (tools/sevk/haber.sh)" ;;
  esac
done

case "$OLAY" in
  donem-basladi|donem-bitti|catal-bekliyor|alarm) : ;;
  '') hata "--olay gerekli: donem-basladi | donem-bitti | catal-bekliyor | alarm" ;;
  *) hata "tanınmayan olay: $OLAY" ;;
esac
[ -n "$A_KUTU" ] || A_KUTU="(kutu adı yok)"
[ -n "$A_DONEM" ] || A_DONEM="(dönem kimliği yok)"
if [ "$OLAY" = "alarm" ]; then
  case "$A_CINS" in
    # F1-5g: cevapsiz = eşiği aşan cevapsız çatal (P4.4) · cevap-okunamadi = kimlik geçti ama
    # gövde çözülemedi ya da kod düştü. Beyaz liste KAPALI olduğu için bu iki cins EKLENMEDEN
    # yükseltme hattı `exit 1` verip izsiz kalıyordu (hasım bulgusu, dört mercek).
    # `olculemedi` AYRI bir cinstir, `sessizlik`in alt hâli DEĞİL (U49): "yapı sustu" ile
    # "susup susmadığını ölçemedim" sahibe farklı şey söyler ve farklı yere baktırır. İkisini
    # tek ada sıkıştırmak, tam da bu turda kapatılan körlüğün adlandırma yarısıdır.
    sessizlik|sisme|kirmizi|kanal|tavan|cevapsiz|cevap-okunamadi|olculemedi) : ;;
    *) hata "alarm olayı --cins ister: sessizlik | sisme | kirmizi | kanal | tavan | cevapsiz | cevap-okunamadi | olculemedi" ;;
  esac
fi
# Kod biçimi SERT: konuya/başlığa girmeden önce ayrıştırılır. Alfabe karışması imkânsız
# (I/O/0/1 yok) ve yalnız bu küme — başka bir bayt Message-ID'yi ya da IMAP arama dizesini
# bozabilirdi (arama saf ASCII olmak zorunda; tasarı §3).
MSGID=""
if [ -n "$A_KOD" ]; then
  case "$A_KOD" in
    *[!ABCDEFGHJKLMNPQRSTUVWXYZ23456789]*|'') hata "geçersiz cevap kodu (yalnız ABCDEFGHJKLMNPQRSTUVWXYZ23456789)" ;;
  esac
  # TEK ÜRETİCİ ortak.sh:msgid_kur — giden başlık, çapaya yazılan alan ve nabzın aradığı dize
  # ÜÇÜ de oradan çıkar. İlk uygulamada üç uç ayrı kurulmuştu ve çapaya msgid hiç yazılmamıştı
  # (hasım bulgusu, beş mercek): nabız canlıda çatal kimliğini Message-ID sanıp arıyordu.
  MSGID="$(msgid_kur "$A_KOD" "${KANAL_HESAP:-deneme@keel.gecersiz}")" \
    || hata "Message-ID kurulamadı: kanal.conf HESAP alanı bir e-posta adresi değil (${KANAL_HESAP:-boş}) — kod üretilemez (fail-closed)"
fi

# Alan tavanı: kesilen alan KESİLDİĞİNİ söyler (sessiz kırpma, sahip yüzeyinde yalandır).
kirp() {
  local M="$1"
  if [ "${#M}" -gt "$ALAN_TAVAN" ]; then
    printf '%s… [%s karakter kesildi]' "$(printf '%s' "$M" | cut -c1-"$ALAN_TAVAN")" "$(( ${#M} - ALAN_TAVAN ))"
  else
    printf '%s' "$M"
  fi
}
# Güvenli dolaylı atama (bash 3.2): `eval "$AD=\$V"` değeri TEK SÖZCÜK olarak atar; içeriği
# yeniden ayrıştırmaz. `eval "$AD=$V"` yazmak alan içeriğini koda çevirirdi.
for D in A_BLOK1 A_BLOK2 A_BLOK3 A_CEVIRI A_ETKI A_BEKLETIR A_DETAY A_UYKU A_SECENEKLER; do
  eval "KIRP_V=\${$D}"
  KIRP_V="$(kirp "$KIRP_V")"
  eval "$D=\$KIRP_V"
done

# ── 2 · Konu + gövde: YALNIZ şablondan ────────────────────────────────────────────────────
SIMDI="$(date '+%Y-%m-%d %H:%M')"
case "$OLAY" in
  donem-basladi)
    KONU="KEEL · $A_KUTU · dönem başladı"
    GOVDE="$(printf 'Dönem açıldı: %s\nKutu: %s\nEvre: %s · Sınıf: %s\nZaman: %s\n\n%s\n\nBu dönem bittiğinde ya da bir çatal sana düştüğünde yeni bir e-posta gelecek.\nDurdurmak için bu adrese "%s" konulu bir posta at.\n' \
      "$A_DONEM" "$A_KUTU" "${A_TUR:-?}" "${A_SINIF:-?}" "$SIMDI" "${A_UYKU:-}" "$DUR_KONU_METNI")"
    ;;
  donem-bitti)
    KONU="KEEL · $A_KUTU · dönem bitti"
    GOVDE="$(printf 'Dönem: %s\nZaman: %s\n\nGECE NE OLDU\n%s\n\nSENDE BEKLEYEN\n%s\n\nŞİMDİ NE YAPIYOR\n%s\n' \
      "$A_DONEM" "$SIMDI" "${A_BLOK1:-(kayıt yok)}" "${A_BLOK2:-(kayıt yok)}" "${A_BLOK3:-(kayıt yok)}")"
    ;;
  catal-bekliyor)
    # KONU DEĞİŞMEZ ve KOD TAŞIMAZ (F1-5g, hasım bulgusu): kod konuda yaşasaydı kilitli
    # telefonun bildirim şeridinde okunur ve `Fwd:` ile aynen taşınırdı. Kimlik çapası
    # Message-ID başlığıdır (aşağıda) — kullanıcı yüzeyinde hiç görünmez, hiçbir istemci
    # onu yeniden yazmaz ve saf ASCII olduğu için IMAP araması ona dayanabilir.
    KONU="KEEL · $A_KUTU · bir karar seni bekliyor (${A_CATAL:-Ç-??})"
    if [ -n "$A_KOD" ] && [ -n "$A_SECENEKLER" ]; then
      CEVAP_YOLU="$(printf 'NASIL CEVAP VERİRSİN\nBu postayı YANITLA ve ilk satıra yalnız seçeneğin numarasını yaz (örnek: 2).\nBaşka bir şey yazmana gerek yok; altındaki alıntı kalabilir.%s\n\nCevabını bilgisayardan da verebilirsin: 00_pano/SENDE_BEKLEYEN.md\n' \
        "$([ -n "${KANAL_CEVAP_JETON:-}" ] && printf '\nRakamdan sonra bir boşluk bırakıp anlaştığımız kelimeyi de yaz.' || printf '')")"
      GOVDE="$(printf 'Dönem: %s\nZaman: %s\nÇatal: %s\n\nSORU\n%s\n\nSEÇENEKLER\n%s\n\nNE DEĞİŞİR\n%s\n\nBU CEVAP GELENE KADAR BEKLEYEN İŞLER\n%s\n\n%s' \
        "$A_DONEM" "$SIMDI" "${A_CATAL:-?}" "${A_CEVIRI:-(çeviri yok)}" "$A_SECENEKLER" \
        "${A_ETKI:-(etki yok)}" "${A_BEKLETIR:-(liste yok)}" "$CEVAP_YOLU")"
    else
      GOVDE="$(printf 'Dönem: %s\nZaman: %s\nÇatal: %s\n\nSORU\n%s\n\nNE DEĞİŞİR\n%s\n\nBU CEVAP GELENE KADAR BEKLEYEN İŞLER\n%s\n\nCevabı bilgisayardan veriyorsun: 00_pano/SENDE_BEKLEYEN.md\n(Bu soru uzaktan cevaplanamaz: seçenekleri sayılabilir değil ya da geri alınamaz bir seçim içeriyor.)\n' \
        "$A_DONEM" "$SIMDI" "${A_CATAL:-?}" "${A_CEVIRI:-(çeviri yok)}" "${A_ETKI:-(etki yok)}" "${A_BEKLETIR:-(liste yok)}")"
    fi
    ;;
  alarm)
    KONU="KEEL · $A_KUTU · ALARM ($A_CINS)"
    GOVDE="$(printf 'Dönem: %s\nZaman: %s\nAlarm cinsi: %s\n\n%s\n' \
      "$A_DONEM" "$SIMDI" "$A_CINS" "${A_DETAY:-(ayrıntı yok)}")"
    ;;
esac
if [ "${#GOVDE}" -gt "$GOVDE_TAVAN" ]; then
  GOVDE="$(printf '%s' "$GOVDE" | cut -c1-"$GOVDE_TAVAN")
[gövde tavanı aşıldı, kesildi]"
fi

# ── 3 · Gönderim-öncesi ZORUNLU süzgeç (fail-closed) ──────────────────────────────────────
# Süzgeç KOŞAMAZSA da temiz sayılmaz: "tarayamadım" ile "temiz" aynı şey değildir.
SUZGEC="$KOK/tools/guard/icerik-suzgeci.sh"
SANSUR=0; SUZGEC_SINIF=""
if [ -r "$SUZGEC" ]; then
  SUZ_CIKTI="$(printf '%s\n%s\n' "$KONU" "$GOVDE" | CLAUDE_PROJECT_DIR="$KOK" bash "$SUZGEC" --metin 2>/dev/null)"
  SUZ_KOD=$?
else
  SUZ_CIKTI=""; SUZ_KOD=90
fi
if [ "$SUZ_KOD" -ne 0 ]; then
  SANSUR=1
  if [ "$SUZ_KOD" -eq 3 ]; then
    SUZGEC_SINIF="$(printf '%s' "$SUZ_CIKTI" | head -n1 | cut -f2)"
    [ -n "$SUZGEC_SINIF" ] || SUZGEC_SINIF="bilinmeyen-sinif"
  else
    SUZGEC_SINIF="süzgeç koşamadı (kod $SUZ_KOD)"
  fi
  # SABİT ŞABLON: eşleşen değer bir yana, ÖZGÜN METNİN KENDİSİ de taşınmaz.
  KONU="KEEL · $A_KUTU · gönderim durduruldu"
  GOVDE="$(printf 'Dönem: %s\nZaman: %s\n\nGönderilecek metin önleme süzgecinde DURDU (%s).\nİçerik taşınmadı; bu ileti sabit şablondur.\nOlay: %s\n\nBilgisayara bak: 00_pano/zarf-gunlugu.jsonl\n' \
    "$A_DONEM" "$SIMDI" "$SUZGEC_SINIF" "$OLAY")"
fi

# ── 4 · Boğulma freni: dönem başına tavan + olay tekilleştirmesi ───────────────────────────
# Gerekçe: Stop döngüsü ya da tekrarlayan alarm, frensiz bir kanalda yüzlerce e-postaya döner.
# Gürültüye boğulan kanal haber işlevini kaybeder — kanalın kendi freni budur.
DURUM="$DIZIN/.haber-durum"
ANAHTAR="$OLAY${A_ANAHTAR:+:$A_ANAHTAR}${A_CINS:+:$A_CINS}"
if [ "$PROVA" -eq 0 ] && [ "$SAYACSIZ" -eq 0 ]; then
  if [ -f "$DURUM" ] && [ "$(head -n1 "$DURUM" 2>/dev/null)" = "$A_DONEM" ]; then
    if tail -n +2 "$DURUM" 2>/dev/null | grep -qxF "$ANAHTAR"; then
      hata "bu olay bu dönemde zaten gönderildi: $ANAHTAR" 5
    fi
    if [ "$(( $(wc -l < "$DURUM" 2>/dev/null || echo 1) - 1 ))" -ge "$DONEM_GONDERIM_TAVANI" ]; then
      hata "dönem başına gönderim tavanı doldu ($DONEM_GONDERIM_TAVANI) — kanal susturuldu" 5
    fi
  else
    printf '%s\n' "$A_DONEM" > "$DURUM" 2>/dev/null || true
  fi
fi

# ── 5 · Prova kipi: gönderme, göster (testlerin TAMAMI bu kipte koşar) ────────────────────
if [ "$PROVA" -eq 1 ]; then
  printf 'PROVA\t%s\t%s\n' "$OLAY" "$([ "$SANSUR" -eq 1 ] && printf 'SANSURLU' || printf 'TEMIZ')"
  printf 'Subject: %s\n' "$KONU"
  # Message-ID prova çıktısında da basılır: giden çapa ile nabzın aradığı desenin AYNI
  # kaynaktan üretildiğini test mekanik olarak ölçebilsin (bitti ölçütü 5 — iki uç ayrışamaz).
  [ -n "$MSGID" ] && printf 'Message-ID: %s\n' "$MSGID"
  printf '\n%s\n' "$GOVDE"
  [ "$SANSUR" -eq 1 ] && exit 3
  exit 0
fi

# ── 6 · Yapılandırma + parola (SERT doğrulama; §1'deki okuma fail-open'dı) ────────────────
[ -r "$DIZIN/ortak.sh" ] || hata "ortak kitaplık yok (tools/sevk/ortak.sh)"
kanal_oku "$KOK" || hata "$KANAL_HATA" 2
PAROLA="$(security find-generic-password -s "$KANAL_KEYCHAIN_SERVIS" -a "$KANAL_HESAP" -w 2>/dev/null)" || PAROLA=""
[ -n "$PAROLA" ] || hata "Keychain kaydı yok/okunamadı (servis=$KANAL_KEYCHAIN_SERVIS hesap=$KANAL_HESAP)" 2

# ── 7 · Gönderim ──────────────────────────────────────────────────────────────────────────
GOVDE_DOSYA="$(mktemp -t keel-haber)" || hata "geçici dosya açılamadı"
chmod 600 "$GOVDE_DOSYA" 2>/dev/null || true
temizle() { rm -f "$GOVDE_DOSYA"; }
trap temizle EXIT
{
  printf 'From: %s\n' "$KANAL_HESAP"
  printf 'To: %s\n' "$KANAL_ALICI"
  printf 'Subject: %s\n' "$KONU"
  # KİMLİK ÇAPASI (F1-5g): kod yalnız BURADA yaşar. Sahip yanıtladığında istemci bunu
  # `In-Reply-To`ya kopyalar ve nabız cevabı o başlıktan bulur. Üç güvence bir arada:
  # (1) saf ASCII — IMAP tırnaklı dizesi 7-bit'tir, konu Türkçe harf taşıdığı için arama
  #     anahtarı olamazdı (ölçüldü: curl tele ham UTF-8 baytı yolluyor);
  # (2) kullanıcı yüzeyinde görünmez — bildirim şeridi ve `Fwd:` konusu sırrı taşımaz;
  # (3) özgün postada `In-Reply-To` YOKTUR — yapının kendi postası (HESAP=ALICI kurulumunda)
  #     kendi kodunu eşleştiremez. "Bu bir yanıttır" şartı böylece mekanikleşir.
  [ -n "$MSGID" ] && printf 'Message-ID: %s\n' "$MSGID"
  printf 'MIME-Version: 1.0\nContent-Type: text/plain; charset=UTF-8\n\n'
  printf '%s\n' "$GOVDE"
} > "$GOVDE_DOSYA"

gonder() {
  printf 'url = "smtp://%s:%s"\nuser = "%s:%s"\nmail-from = "%s"\nmail-rcpt = "%s"\nupload-file = "%s"\nmax-time = 20\nssl-reqd\nsilent\nshow-error\n' \
    "$KANAL_SMTP_SUNUCU" "$KANAL_SMTP_PORT" "$KANAL_HESAP" "$PAROLA" \
    "$KANAL_HESAP" "$KANAL_ALICI" "$GOVDE_DOSYA" | curl -K - 2>&1
}
SONUC="$(gonder)"; KOD=$?
if [ "$KOD" -ne 0 ]; then
  SONUC="$(gonder)"; KOD=$?   # tek yeniden deneme (geçici ağ arızası)
fi

# ── 8 · Kayıt ─────────────────────────────────────────────────────────────────────────────
# SAYACSIZ hem OKUMA hem YAZMA yanını atlar. İlk uygulamada yalnız okuma atlanıyordu: cevap
# hattının dönem-DIŞI alarmları canlı dönemin 10luk gönderim kotasını yiyor ve o dönemin
# kendi sessizlik/kirmizi alarmlarını susturabiliyordu (hasım bulgusu, iki mercek).
if [ "$KOD" -eq 0 ] && [ "$SAYACSIZ" -eq 0 ] && [ -f "$DURUM" ]; then printf '%s\n' "$ANAHTAR" >> "$DURUM" 2>/dev/null || true; fi
if [ -n "${NODE_BIN:-}" ] || node_bul 2>/dev/null; then
  J_tip=haber J_donem="$A_DONEM" J_kutu="$A_KUTU" J_olay="$OLAY" \
    J_sonuc="$([ "$KOD" -eq 0 ] && printf 'gitti' || printf 'gitmedi')" \
    J_sansur="$([ "$SANSUR" -eq 1 ] && printf 'evet' || printf 'hayir')" \
    J_sebep="$([ "$KOD" -eq 0 ] && printf '' || printf '%s' "$SONUC")" \
    json_kur 2>/dev/null | gunluge_yaz "$KOK" >/dev/null 2>&1 || true
fi

if [ "$KOD" -ne 0 ]; then
  printf 'haber: gönderim başarısız (%s): %s\n' "$KOD" "$SONUC" >&2
  exit 4
fi
[ "$SANSUR" -eq 1 ] && exit 3
exit 0
