#!/bin/bash
# kurulum-denetimi.sh — GENESIS aktarım öz-denetimi (G4.5 kapısı). ŞABLONLA SABİTTİR:
# GENESIS bu betiği YAZMAZ ve DEĞİŞTİRMEZ, yalnız koşar (denetleyen ≠ denetlenenin yazarı —
# tarif-buharlaşması sessiz olamaz). Çekilmeden (G5.3) önce YEŞİL olmak zorundadır.
# Çıkış: 0 = YEŞİL · 2 = KIRMIZI (eksik aktarım — çekilme YOK).
# Fail-closed: betiğin KENDİ hatası da KIRMIZI'dır (sessiz yeşil yok).
set -euo pipefail
export LC_ALL=C.UTF-8
shopt -s nullglob

KOK="${1:-${CLAUDE_PROJECT_DIR:-.}}"
SORUN=0
kirmizi() { printf 'KIRMIZI · %s\n' "$1"; SORUN=1; }
gecti()   { printf 'geçti   · %s\n' "$1"; }

trap 'printf "KIRMIZI · kurulum-denetimi kendi içinde hata verdi (satır %s) — fail-closed\n" "$LINENO"; exit 2' ERR

EK="$KOK/02_kanon/EL_KITABI.md"

# 1 · EL_KITABI var ve zorunlu başlıklar/kurallar yerinde (kapalı-kadran gövdesi çıksa da başlık kalır)
if [ ! -f "$EK" ]; then
  kirmizi "02_kanon/EL_KITABI.md yok"
else
  #   Başlıklar SATIR BAŞINDA aranır (çapalı) — yorum/paragraf içinde geçen söz başlık sayılmaz
  #   (soğuk-denetim bulgusu C4, 2026-07-16). "Değer aksiyomu" başlık değil ibare: gevşek aranır.
  #   NOT (hasım turu): desen BRE'dir; buradaki başlıklar h2 + girintisiz + metakaraktersiz
  #   ('+' BRE'de literal). Yeni başlık eklerken .*[ gibi metakarakter KOYMA (yanlış-eşleşme).
  for baslik in "## D-kuralları" "## F-kuralları" "## Üslup hükmü" "## Kutu döngüsü" \
                "## Mühür ritüeli" "## Domain-rol disiplin iskeleti" "## Kanon-fakir dünya" \
                "## Kişisel-veri süzgeci" "## Kadro + kapsam" "Değer aksiyomu"; do
    case "$baslik" in
      '## '*) if grep -q "^$baslik" "$EK"; then :; else kirmizi "EL_KITABI zorunlu başlık eksik: $baslik"; fi ;;
      *)      if grep -qF "$baslik" "$EK"; then :; else kirmizi "EL_KITABI zorunlu başlık eksik: $baslik"; fi ;;
    esac
  done
  for kural in "Mühür paketi" "İş-icat yasağı" "Kural-evrim kilidi" "SENDE BEKLEYEN" "yorumla onay üretme" "dış göz brifingi"; do
    if grep -qF "$kural" "$EK"; then :; else kirmizi "EL_KITABI zorunlu kural eksik: $kural"; fi
  done
  BOYUT=$(wc -c < "$EK" | tr -d ' ')
  if [ "$BOYUT" -gt 16384 ]; then
    kirmizi "EL_KITABI kendi tavanını aşıyor: ${BOYUT}B > 16384B (F3)"
  else
    gecti "EL_KITABI başlıklar + kurallar + tavan (${BOYUT}B)"
  fi
fi

# 2 · Kadran oku (bekçi zorunlu-kategori kümesini belirler) — çapalı desen: kalıp biçimi
#     "Ağırlık kadranı: **TAM RİTÜEL**" / "**KÜÇÜK ...**" garanti eder; tanınmayan = KIRMIZI
KADRAN=""
if [ -f "$EK" ]; then
  if grep -qF 'Ağırlık kadranı: **TAM' "$EK"; then KADRAN="tam";
  elif grep -qF 'Ağırlık kadranı: **KÜÇÜK' "$EK"; then KADRAN="kucuk";
  fi
fi
if [ -z "$KADRAN" ]; then
  kirmizi "kadran okunamadı (beklenen: 'Ağırlık kadranı: **TAM …' ya da '**KÜÇÜK …') — fail-closed"
  KADRAN="tam"
else
  gecti "kadran okundu: $KADRAN"
fi

# 3 · Doldurulmamış «alan» kalmadı (canlı yüzey: kanon + roller + beceriler; _arsiv muaf)
#     Fail-closed: taranamayan dosya (grep rc>=2) sessiz-temiz SAYILMAZ.
ACIK_ALAN=""
for d in "$KOK/02_kanon" "$KOK/03_roller" "$KOK/.claude/skills"; do
  if [ -d "$d" ]; then
    RC=0
    CIKTI=$(grep -Rl --exclude-dir=_arsiv '«' "$d" 2>/dev/null) || RC=$?
    if [ "$RC" -eq 0 ]; then
      ACIK_ALAN="$ACIK_ALAN $(printf '%s' "$CIKTI" | tr '\n' ' ')"
    elif [ "$RC" -ge 2 ]; then
      kirmizi "«alan» taraması hata verdi ($d, rc=$RC — okunamayan dosya?) — fail-closed"
    fi
  fi
done
if [ -n "$ACIK_ALAN" ]; then kirmizi "doldurulmamış «alan» var:$ACIK_ALAN"; else gecti "«alan» taraması temiz"; fi

# 4 · Bilinç + retro kalıbı kopyaları (omurga her kuruluma iner)
if [ -f "$KOK/00_genesis/DEFO_MODELI.md" ] && grep -q "On defo" "$KOK/00_genesis/DEFO_MODELI.md"; then
  gecti "DEFO_MODELI.md yerinde"
else
  kirmizi "00_genesis/DEFO_MODELI.md yok ya da çekirdeği eksik (bilinç katmanı inmemiş)"
fi
if [ -f "$KOK/00_genesis/RETRO_KALIBI.md" ] && grep -q "Tavan kalibrasyonu" "$KOK/00_genesis/RETRO_KALIBI.md"; then
  gecti "RETRO_KALIBI.md yerinde"
else
  kirmizi "00_genesis/RETRO_KALIBI.md yok ya da kalibrasyon maddesi eksik"
fi
# 4b · Ortam denetimi ikilisi (F1-2a): betik + veri dosyası. Eksik kopyalanırsa açılış kancası
#      FAIL-OPEN olduğu için SESSİZ kalır — aktarım öz-denetiminin görmesi gereken tam olarak bu.
if [ -f "$KOK/tools/guard/ortam-kontrol.sh" ] && [ -f "$KOK/tools/guard/ortam-kalemleri.txt" ]; then
  gecti "ortam denetimi yerinde (betik + kalem listesi)"
else
  kirmizi "tools/guard/ortam-kontrol.sh ya da ortam-kalemleri.txt yok — ortam denetimi sessizce ölü (F1-2a)"
fi
# 4c · KEEL bağı koparılmış mı (F1-2b / G0.1 — kurulum girişinin ÇIKIŞ kapısı). Kurulu projenin
#      hiçbir uzak adresi KEEL dağıtım deposunu göstermemeli: gösterirse sahip kendi deposuna
#      gönderdiğinde KEEL'in bütün geçmişi de gider (D-03) ve `git pull` şablonu sahibin
#      çalışmasının üstüne yazabilir. Giriş adımı atlanmış/geri alınmışsa çekilme kilitlenir.
#      Desen `klasor-hazirligi.sh`teki KEEL_DEPO ile aynıdır; testi ikisini birbirine bağlar.
#      FAIL-CLOSED (hasım turu 2026-07-29): "ölçemedim" ile "bağ yok" AYNI ŞEY DEĞİLDİR.
#      İlk hâli `|| true` ile her hatayı boş dizeye çeviriyordu; git yokken, `.git` bozukken ve
#      `.git` hiç yokken üçünde de "geçti" basıyordu — dosyanın kendi 6. satırındaki
#      "sessiz yeşil yok" ilanının tersi. Artık dört ayrı hâl var, üçü KIRMIZI.
KEEL_DEPO='batuhanozgun/keel'
if [ ! -e "$KOK/.git" ]; then
  kirmizi "projenin git kaydı yok (.git) — KEEL bağı ölçülemez ve KEEL'in geri-alma güvencesi zaten yok (G0.1 klasör hazırlığı koşmamış)"
elif ! command -v git >/dev/null 2>&1; then
  kirmizi "KEEL bağı ÖLÇÜLEMEDİ: git bulunamadı — fail-closed"
else
  UZAKLAR=""; RC=0
  UZAKLAR="$(git -C "$KOK" remote -v 2>/dev/null)" || RC=$?
  if [ "$RC" -ne 0 ]; then
    kirmizi "KEEL bağı ÖLÇÜLEMEDİ: git kaydı okunamadı (git remote -v rc=$RC) — fail-closed"
  else
    #    Eşleşme SAĞDAN ÇAPALI — `batuhanozgun/keel-oyun` gibi ayrı bir depo KEEL sayılmaz
    #    (alt-dize hâli kurulmuş projeye KALICI yanlış KIRMIZI basıyordu).
    case "$(printf '%s' "$UZAKLAR" | tr 'A-Z' 'a-z')" in
      *"$KEEL_DEPO".git*|*"$KEEL_DEPO"/*|*"$KEEL_DEPO"' '*|*"$KEEL_DEPO")
        kirmizi "proje hâlâ KEEL deposuna bağlı ($KEEL_DEPO) — sahibin deposuna gönderim KEEL'in geçmişini de taşır. Çare: uzak adresi kaldır (git remote remove <ad>) ya da kendi deponun adresiyle değiştir" ;;
      *) gecti "KEEL bağı yok (uzak adres kontrolü)" ;;
    esac
  fi
fi

# 5 · Bekçi: mevcut + sözdizimi + kadranın zorunlu kategorileri İLAN edilmiş
#     (ilan `# kategoriler:` satırıdır — GENESIS tarifi zorunlu kılar; beyanın İÇERİĞİNİ
#     G3.2'nin fiilî bozuk-girdi kanıtı tartar, bu betik yalnız ilan-varlığını denetler)
BEKCI="$KOK/tools/bekci/bekci.sh"
if [ ! -f "$BEKCI" ]; then
  kirmizi "tools/bekci/bekci.sh yok (konvansiyon-yol)"
else
  if bash -n "$BEKCI" 2>/dev/null; then gecti "bekçi sözdizimi"; else kirmizi "bekçi sözdizimi hatalı (bash -n)"; fi
  GEREKLI="tavan şema"
  if [ "$KADRAN" = "tam" ]; then GEREKLI="tavan şema koruma-hattı bağ-varlık tazelik"; fi
  KAT_SATIR=$(grep -m1 '^# kategoriler:' "$BEKCI" || true)
  if [ -z "$KAT_SATIR" ]; then
    kirmizi "bekçide '# kategoriler:' ilan satırı yok (tarif G3.2)"
  else
    for k in $GEREKLI; do
      if printf '%s' "$KAT_SATIR" | grep -qF "$k"; then :; else kirmizi "bekçi ilanında zorunlu kategori eksik: $k (kadran: $KADRAN)"; fi
    done
    gecti "bekçi kategori ilanı denetlendi ($KADRAN)"
  fi
fi

# 6 · Rol becerileri: SKILL.md ilk satırı '---' (yaşanmış kırılma: frontmatter yenirse beceri sessiz ölür)
#     + insan-tetikleme kilidi (disable-model-invocation) her beceride ZORUNLU — kilitsiz beceri
#     "rolü yalnız insan açar" garantisini deler (soğuk-denetim bulgusu C3, 2026-07-16).
for s in "$KOK"/.claude/skills/*/SKILL.md; do
  ILK=$(head -n1 "$s")
  if [ "$ILK" = "---" ]; then :; else kirmizi "SKILL ilk satırı '---' değil: $s"; fi
  # Kilit SATIR BAŞINDA aranır (çapalı): gövde metninde ya da yorumda geçen aynı dize
  # kilidi karşılamaz — kilitsiz beceri "rolü yalnız insan açar"ı deler (hasım turu 2026-07-16).
  if grep -q '^disable-model-invocation:[[:space:]]*true[[:space:]]*$' "$s"; then :; else kirmizi "SKILL insan-tetikleme kilidi eksik/yanlış yerde (satır başında 'disable-model-invocation: true' yok): $s"; fi
done
gecti "SKILL frontmatter + kilit taraması"

# 6b · Alt-ajan dosyalarında `memory:` alanı YASAK (Otonom KEEL tasarımı §2.3 — E4).
#      Roller arası zorunlu unutma bu yapının en eski korunanıdır (Değişmeyenler m.1) ve
#      alt-ajan `memory` alanı onun TEK ölüm noktasıdır: taze bağlam kalkarsa "beş varsayımın
#      beşi yazılı olmadığı için yakalandı" ölçümü de kalkar. Kural yazılıydı, kapısı yoktu.
MEM_KIRLI=""
for a in "$KOK"/.claude/agents/*.md; do
  if grep -qE '^[[:space:]]*memory[[:space:]]*:' "$a"; then MEM_KIRLI="$MEM_KIRLI $(basename "$a")"; fi
done
if [ -n "$MEM_KIRLI" ]; then
  kirmizi "alt-ajan dosyasında memory alanı var:$MEM_KIRLI — roller arası zorunlu unutma delinir (hiçbir rol alt-ajan dosyasına memory yazılmaz)"
else
  gecti "alt-ajan memory yasağı"
fi

# 7 · Rol slug'ları tek-token ASCII + rol↔beceri eşliği (yokluk körlüğü yok: sıfır rol = KIRMIZI)
ROL_SAYISI=0
for r in "$KOK"/03_roller/*/; do
  AD=$(basename "$r")
  case "$AD" in
    _*) : ;;  # _arsiv benzeri altyapı dizinleri slug değildir
    *)
      ROL_SAYISI=$((ROL_SAYISI + 1))
      if printf '%s' "$AD" | grep -Eq '^[a-z0-9]+$'; then :; else kirmizi "rol slug'ı tek-token ASCII değil: $AD"; fi
      if [ -f "$KOK/.claude/skills/rol-$AD/SKILL.md" ]; then :; else kirmizi "rol becerisi eksik: .claude/skills/rol-$AD/SKILL.md (tören kurulmamış)"; fi
      # Rol evinin iki zorunlu dosyası (soğuk-denetim bulgusu C1; tatbikat-v2'de DURUM'suz roller sahada görüldü):
      if [ -f "$r/ROL.md" ]; then :; else kirmizi "rol sözleşmesi eksik: 03_roller/$AD/ROL.md (G2 sözleşme doldurma)"; fi
      # DURUM.md: yalnız VARLIK değil, BİÇİM de — boş/bozuk DURUM sessiz tarif-buharlaşmasıdır
      # (hasım turu 2026-07-16: G4.5 varlığı görüp biçim driftini kaçırıyordu). İlk başlık
      # '# DURUM — <Ad>' olmalı (kokpit parseDurum + fixture biçimi bunu ister).
      if [ -f "$r/DURUM.md" ]; then
        if grep -q '^# DURUM' "$r/DURUM.md"; then :; else kirmizi "rol durum dosyası biçimsiz: 03_roller/$AD/DURUM.md (ilk başlık '# DURUM — <Ad>' değil — kokpit parser'ı okuyamaz)"; fi
      else
        kirmizi "rol durum dosyası eksik: 03_roller/$AD/DURUM.md (G3.4 başlangıç DURUM'u — kokpit rol kartı ve devir buna bakar)"
      fi
      ;;
  esac
done
if [ "$ROL_SAYISI" -eq 0 ]; then
  kirmizi "hiç rol yok (03_roller boş ya da eksik) — G4.5 rollerden SONRA koşar, sıfır rol aktarım eksiğidir"
else
  gecti "slug + rol↔beceri taraması ($ROL_SAYISI rol)"
fi

# 7b · Dış göz koltuğu ZORUNLUDUR (her kadranda — G2.1.5; D-20 parça 2). Türetilmez, sabittir:
#      "zorunlu" sözünün mekanik karşılığı budur; koltuk atlanırsa çekilme kilitlenir.
#      (ROL.md/DURUM.md/beceri denetimi yukarıdaki genel döngüde zaten koşar.)
if [ -d "$KOK/03_roller/disgoz" ]; then
  if [ -f "$KOK/03_roller/disgoz/BRIFING.md" ]; then
    gecti "dış göz koltuğu + brifing iskeleti yerinde"
  else
    kirmizi "dış göz brifing iskeleti eksik: 03_roller/disgoz/BRIFING.md (G3.4 — bekçinin kapanış kilidi ve açılış hatırlatması buna bakar)"
  fi
else
  kirmizi "zorunlu koltuk eksik: 03_roller/disgoz/ (dış göz her kadranda kurulur — G2.1.5)"
fi

# 8 · İşletim yüzeyi: pano bağlanmış + ilk kutu kurulmuş (G4.5, G3.4 ve G4'ten SONRA koşar —
#     soğuk-denetim bulgusu C1: bu yüzeyler yokken "çekilme serbest" denemez. SAGLIK.md bilerek
#     ARANMAZ: onu bekçi yazar ve G5.3d son denetiminden önce meşru olarak olmayabilir.)
if [ -f "$KOK/00_pano/PANO.md" ]; then
  gecti "00_pano/PANO.md yerinde"
else
  kirmizi "00_pano/PANO.md yok (pano bağlanmamış — G3.4)"
fi
KUTU_SAYISI=0
# CANLI kutu sayılır (arşiv değil): G4.5 tek-seferlik çekilme kapısıdır, G4 hemen öncesinde
# KT-001'i taze kurar — bu noktada daima ≥1 canlı kutu olur. (Olgun projede yalnız _arsiv
# kalmışsa bu denetim tekrar koşulmaz; hasım turu 2026-07-16 notu.)
for k in "$KOK"/01_kutular/KT-*/KUTU.md; do KUTU_SAYISI=$((KUTU_SAYISI + 1)); done
if [ "$KUTU_SAYISI" -eq 0 ]; then
  kirmizi "hiç kutu yok (01_kutular/KT-*/KUTU.md) — ilk kutu G4'te kurulmuş olmalı"
else
  gecti "kutu taraması ($KUTU_SAYISI kutu)"
fi

if [ "$SORUN" -eq 0 ]; then
  printf 'SONUÇ: YEŞİL — aktarım tam, çekilme serbest\n'
  exit 0
else
  printf 'SONUÇ: KIRMIZI — aktarım eksik, çekilme YOK (G4.5)\n'
  exit 2
fi
