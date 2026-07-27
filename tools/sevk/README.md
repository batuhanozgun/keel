# tools/sevk — otonom koşu mekaniği (E1'den itibaren)

Otonom KEEL evrelerinin kod evi. Bu dizin `korunan-yollar.txt`te **[SERT]**tir: oturum içinde
değiştirilmez; meşru ihtiyaç → sahip kararı + tören. El-sürüşlü günlük kullanımda buradaki
hiçbir parça devreye girmez (koşu-AÇIK şartı).

- **`zarf-ekle.sh`** — zarf günlüğünün (`00_pano/zarf-gunlugu.jsonl`) TEK append-aracı:
  şema denetimli (surum:1), mkdir-kilitli, fail-closed. Günlük araç katmanında [SERT]
  (Edit/Write kesilir); bozuk satır bekçide KIRMIZI; şema-geçerli sahte satıra karşı mekanik
  yakalayıcı YOK (bilinen sınır — süreç disiplini, E2+ adayı).
- **`zarf-bicim-kapisi.sh`** — SubagentStop kancası: otonom koşuda alt-ajan dönüşünün biçim
  kapısı (beyaz liste + 6+3 alan + kanıt işaretçisi + izin-engeli çaprazı + transkript-izi).
  Yalnız BİÇİM denetler; içerik gözleri ayrı (tasarım §6).
- **`.kosu-acik`** — koşu-AÇIK göstergesi (git-izlenmez; yazarı `/kosu` [E4], sileni sevk).
- **`damgalar/`** — tatbikat damgaları (`T0`, `T1`, …): tek satır `tarih · kanıt işaretçisi`.
  Sevk betiği (E4) damgasız AÇILMAZ — "kalkansız motor yok" betiğin ilk satırlarıdır.

Kural evi: `02_kanon/OTONOM_KOSU.md` (kalıbı `00_genesis/OTONOM_KOSU_KALIBI.md`).
Tasarı: `docs/superpowers/plans/2026-07-27-e1-durus-zarf-tasarisi.md`.
Testler: `tools/guard/test/sevk.test.mjs` + `otonom-sim.test.mjs` (D-10: guard testleri
kokpit test klasörüne girmez; sevk de aynı evde yaşar).
