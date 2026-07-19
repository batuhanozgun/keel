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
  for kural in "Mühür paketi" "İş-icat yasağı" "Kural-evrim kilidi" "SANA KALAN" "yorumla onay üretme"; do
    if grep -qF "$kural" "$EK"; then :; else kirmizi "EL_KITABI zorunlu kural eksik: $kural"; fi
  done
  BOYUT=$(wc -c < "$EK" | tr -d ' ')
  if [ "$BOYUT" -gt 14336 ]; then
    kirmizi "EL_KITABI kendi tavanını aşıyor: ${BOYUT}B > 14336B (F3)"
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

# 8 · İşletim yüzeyi: pano bağlanmış + ilk kutu kurulmuş (G4.5, G3.4 ve G4'ten SONRA koşar —
#     soğuk-denetim bulgusu C1: bu yüzeyler yokken "çekilme serbest" denemez. SAGLIK.md bilerek
#     ARANMAZ: onu bekçi yazar ve G5.3d son koşusundan önce meşru olarak olmayabilir.)
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
