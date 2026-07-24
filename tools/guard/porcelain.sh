#!/bin/bash
# porcelain.sh — porcelain dikişinin ORTAK kitaplığı. SOURCE edilir, koşulmaz.
# Neden ayrı dosya: özeti açılışta rol-ac.sh, kapanışta kapanis.sh üretir; iki kopya sessizce
# ayrışırsa dikiş HER oturumda sahte "fark" basar (güveni yiyen yanlış-pozitif). Tek ev = tek biçim.
#
# Ne işe yarar: "yazamaz" profilli koltuğun oturum boyunca KAFES DIŞINA yazıp yazmadığını
# görünür kılar. Rol kafesi Edit/Write'ı keser, KABUK yazımını (sed, >, git checkout …) kesmez;
# dış göz gibi koltuklar meşru olarak kabuk kullanır (git log/grep) → delik büyür. Bu dikiş
# deliği KAPATMAZ, ölçülebilir sinyale çevirir: açılış özeti damgaya yazılır, kapanışta
# yeniden alınır, fark oturum günlüğüne düşer ve bekçi SARI basar.
#
# Kapsam DIŞI (meşru yazarlar — dışlanmazsa her oturum yanlış SARI doğar):
#   · 03_roller/<slug>/  → kafesin zaten izin verdiği kendi ev
#   · 00_pano/PANO.md · 00_pano/SAGLIK.md → bekçinin çıktıları (yazamaz koltuk da bekçiyi
#     meşru koşar; bekçi her koşuda damga tarihini tazeler)
#   · tools/guard/.aktif-rol → dikişin KENDİ durum dosyası (doğru kurulumda .gitignore'dadır;
#     yine de açıkça dışlanır ki eksik gitignore kalıcı sahte "fark" üretmesin)
# Bilinen sınır (beyanlı): izlenmeyen (untracked) dosyanın İÇERİK değişimi görünmez —
# yalnız varlığı görünür. Dikiş kanıt değil sinyaldir; hükmü tören + sahip verir.
porcelain_ozet() { # porcelain_ozet <kök> <slug> → tek-token sayısal özet ya da "yok"
  local kok="$1" slug="$2" ham
  git -C "$kok" rev-parse --git-dir >/dev/null 2>&1 || { printf 'yok'; return 0; }
  # Yol süzgeci TEK yerde kurulur (iki git çağrısı aynı kümeyi görmeli — kopya = sessiz sapma).
  set -- . ":(exclude)03_roller/$slug" ":(exclude)00_pano/PANO.md" \
          ":(exclude)00_pano/SAGLIK.md" ":(exclude)tools/guard/.aktif-rol"
  ham="$( { git -C "$kok" status --porcelain -- "$@" 2>/dev/null || true
            git -C "$kok" diff HEAD -- "$@" 2>/dev/null || true
          } | cksum 2>/dev/null || true )"
  ham="$(printf '%s' "$ham" | tr -d '[:space:]')"
  case "$ham" in ''|*[!0-9]*) printf 'yok' ;; *) printf '%s' "$ham" ;; esac
}
