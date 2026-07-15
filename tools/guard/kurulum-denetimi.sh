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
  for baslik in "## D-kuralları" "## F-kuralları" "## Üslup hükmü" "## Kutu döngüsü" \
                "## Mühür ritüeli" "## Domain-rol disiplin iskeleti" "## Kanon-fakir dünya" \
                "## Kişisel-veri süzgeci" "## Kadro + kapsam" "Değer aksiyomu"; do
    if grep -qF "$baslik" "$EK"; then :; else kirmizi "EL_KITABI zorunlu başlık eksik: $baslik"; fi
  done
  for kural in "Mühür paketi" "İş-icat yasağı" "Kural-evrim kilidi" "SANA KALAN"; do
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
for s in "$KOK"/.claude/skills/*/SKILL.md; do
  ILK=$(head -n1 "$s")
  if [ "$ILK" = "---" ]; then :; else kirmizi "SKILL ilk satırı '---' değil: $s"; fi
done
gecti "SKILL frontmatter taraması"

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
      ;;
  esac
done
if [ "$ROL_SAYISI" -eq 0 ]; then
  kirmizi "hiç rol yok (03_roller boş ya da eksik) — G4.5 rollerden SONRA koşar, sıfır rol aktarım eksiğidir"
else
  gecti "slug + rol↔beceri taraması ($ROL_SAYISI rol)"
fi

if [ "$SORUN" -eq 0 ]; then
  printf 'SONUÇ: YEŞİL — aktarım tam, çekilme serbest\n'
  exit 0
else
  printf 'SONUÇ: KIRMIZI — aktarım eksik, çekilme YOK (G4.5)\n'
  exit 2
fi
