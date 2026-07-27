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
- **`kilit.sh`** — ortak dosya kilidi kitaplığı (E3): mkdir kilidi · bayat kilit iki dallı
  kırılır · kırma `mv` ile atomik · fail-closed. `zarf-ekle.sh` ve `catal-kuyruk.sh` ikisi de
  bunu kaynak alır (iki kopya = sürüklenme, D-02 dersi).
- **`karar-alani.sh`** — soru kanalının ön koşulu (E3): `02_kanon/KARAR_ALANI.md` var mı ·
  Bölüm A (KEEL-genel soru çizgisi) bütün mü · Bölüm B (sahip profili) DOLU mu. Çıkış
  `0`=HAZIR / `1`=HAZIR DEĞİL + sebep; fail-closed. **Profil boşken çatal sahibe gidemez.**
- **`catal-kuyruk.sh`** — çatalın sahip-yüzeyi mekaniği (E3). `--durum`: kuyruktaki her ÇATAL
  maddesinin durumu (`CEVAP-BEKLIYOR` / `CEVAPLANDI` / `CEVIRI-KUSURU`) + bekletilen görevler.
  `--ekle <G-NN> [<hariç-ajan>]`: zarf günlüğündeki kayıttan sahip-yüzeyi maddesini üretir ve
  `00_pano/SENDE_BEKLEYEN.md`'ye tek satır ekler (metni rol/denetçi DEĞİL kayıt yazar — §9;
  hüküm veren ajanın kendi zarfı kaynak olarak dışlanır). Kilitli, tekilleştirmeli.
  Çıkış sınıfları: `EKLENDI` · `ATLANDI` (tekilleştirme — tek meşru atlama) · `ARIZA`
  (teslimat başarısızlığı; kapı bunu fail-closed okur, soru buharlaşmasın).
  Ayrı kuyruk açılmaz: D-21 kuyruğunun ÇATAL sınıfıdır, madde SİLİNMEZ. "Anlamadım" ile geri
  dönen madde silinmez, **devreder** (`devretti: Ç-NN`) — yoksa bağlı işler kalıcı kilitlenir.
  Koşu-AÇIK iken kuyruğa ARAÇLA yazım file-guard'da ENGEL: cevabı yalnız sahip yazar.
- **`.kosu-acik`** — koşu-AÇIK göstergesi (git-izlenmez; yazarı `/kosu` [E4], sileni sevk).
- **`damgalar/`** — tatbikat damgaları (`T0`, `T1`, …): tek satır `tarih · kanıt işaretçisi`.
  Sevk betiği (E4) damgasız AÇILMAZ — "kalkansız motor yok" betiğin ilk satırlarıdır.

Yazamaz koltuklar (`.claude/agents/`): `dogrulayici` (dosya-gerçeği) · `catal-denetcisi`
(sahibe gitmeden önceki çatal süzgeci, beş kalem — E3).

Kural evi: `02_kanon/OTONOM_KOSU.md` (kalıbı `00_genesis/OTONOM_KOSU_KALIBI.md`) ·
sahibin karar alanı: `02_kanon/KARAR_ALANI.md` (kalıbı `00_genesis/KARAR_ALANI_KALIBI.md`).
Tasarılar: `docs/superpowers/plans/2026-07-27-e1-durus-zarf-tasarisi.md` ·
`…-e2-onleme-tasarisi.md` · `…-e3-soru-kanali-tasarisi.md`.
Testler: `tools/guard/test/sevk.test.mjs` + `otonom-sim.test.mjs` (D-10: guard testleri
kokpit test klasörüne girmez; sevk de aynı evde yaşar).
