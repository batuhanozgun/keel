<!-- BEKÇİ-TARİFİ KONTRATI — GENESIS G3.2'nin eki. K1/sıra 9 (2026-08-06) ile KIRPILDI:
     bekçi artık kurulumda ÜRETİLMEZ; sabit çekirdek şablonla gelir ve kod-yazım kurallarının
     tek evi tools/bekci/README.md'dir (sözleşme). Bu dosya yerinde kalır (kurulum denetimi
     varlığını ölçer, G3.2 buna işaret eder) ama yalnız kurulum tarafının payını ve işaretçiyi
     taşır. Kırpma öncesi gövde git'te: bu dosyanın 2026-08-06 öncesi hâli. -->
# BEKÇİ-TARİFİ KONTRATI — bekçi üretilmez, sabit çekirdek şablonla gelir

- **(Sabit çekirdek)** Beş dosya şablonla SABİT gelir: `tools/bekci/cekirdek.mjs` `[SERT]`
  (denetim gövdesi) · `tools/bekci/bekci.sh` `[SERT]` (ince sarmalayıcı — kancaların çağırdığı
  konvansiyon yolu) · iki VERİ evi `[SERT]` (`el-kitabi-zorunlu.txt` · `gorev-durumlari.txt`) ·
  `tools/bekci/bekci.conf` `[SORULUR]` (proje ayarı; TEK yazılabilir parça).
  Denetim tablosu, makine satırı (`BEKCI v1 …`), çıkış kodları (0/1/2), ciddiyet sözlüğü ve
  kurulum-penceresi davranışı **tek evde**: `tools/bekci/README.md`. İçerik buraya KOPYALANMAZ.
- **(Kurulumun payı)** G3.2 bekçi yazmaz; yalnız `bekci.conf`u doldurur (kadran · tavan
  sayıları · ürün yolları `«ÜRÜN-YOLU»` · golden dizini · izinli ekler) ve bekçiyi bir kez
  koşturup çıktısını `GENESIS_DURUM`a damgalar. Fail-closed öz-testin kanıtı: bekçiyi bilerek
  bozuk girdiyle koştur, arıza hattının (çıkış 2) bastığını gör.
- **(Kablo listesi — çekirdeğin koruma-hattı gözü bunu denetler, kurulum penceresinde de tam)**
  `.claude/settings.json`: PreToolUse file-guard + PreToolUse `Task|Agent` devir kapısı
  (devir-kapisi.sh) + SessionStart startup+clear (rol-temizliği + acilis.sh) + SessionEnd
  (kapanis.sh) + SubagentStop (zarf-bicim-kapisi.sh) + **Stop girdilerinin İKİSİ birden**:
  `tools/sevk/sevk.sh` · `tools/guard/kurulum-surucu.sh`. Betik/veri varlığı da kablodur;
  tam liste ve hükümler sözleşmede.
- **(Türkçe harf güvenliği)** Makine eşleştirmesi DÖNÜŞÜMSÜZ birebirdir: `grep -i` ve her tür
  ASCII küçültme YASAK (İ/ı). Kabuk betiği `LC_ALL=C.UTF-8` sabitler.
- **(Görev durum sözlüğü — sevk ile ORTAK, tek ev)** Sözlük (`açık` · `sürüyor` ·
  `mühür-bekliyor` · `kapalı` · `pas`) ve onun **ÜRETİM/KAPANIŞ ayrımı** tek evde yaşar:
  `tools/bekci/gorev-durumlari.txt`. Çekirdek de `tools/sevk/sevk.sh` de onu okur; kod içine
  gömülü kopya YASAKTIR. `mühür-bekliyor` KAPANIŞ tarafındadır — evre geçişinin şartı "açık
  **ÜRETİM** görevi kalmaması"dır ve mühür bekleyen görevi yapı ilerletemez. Hüküm, gerekçe ve
  bozmaları sözleşmede: `tools/bekci/README.md` §0.
- **(Duruş sözleşmesi dili — sevk ve kurulum kapısıyla ortak)** `## Duruş sözleşmesi` bloğu
  MEVCUTSA dört satırı (`BİTİŞ HÂLİ:` `KANIT:` `KISIT:` `BÜTÇE:`) içerikli olmalı; beşinci
  `LİSTE:` satırı MEVCUTSA değeri birebir `dönem içinde doğar` olmalı (planlama kutusu
  işareti). Biçimin evi `00_genesis/OTONOM_DONEM_KALIBI.md`, denetimin hükmü sözleşmede.
