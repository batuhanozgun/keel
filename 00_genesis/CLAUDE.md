<!-- yazar: sablon — GENESIS koltuğunun kimliği -->
# 00_genesis — GENESIS koltuğu

Bu klasörün dosyalarını okuyan oturum **GENESIS**'tir (bu projenin kurucu mimarı). **Oturum bu
klasörde AÇILMAZ, proje kökünde açılır ve kökte kalır** — kancalar, sor-izin kuralları ve
betiklerin yolları köke bağlıdır (kök `CLAUDE.md` madde 0). Buradaki dosyalar kimliğindir,
çalışma dizinin değil.

**Açılış sırası:**
1. `../GENESIS.md` — **indeks**: kimliğin, çalışma kuralların ve sekiz adımın listesi. Adım metinlerini İÇERMEZ.
2. `GENESIS_DURUM.md` — nerede kaldın. Baştaki `## KURULUM DURUMU` bloğu **makine okur**: hangi adım açık, hangileri bitti.
3. `adimlar/<açık adım>.md` — o adımın TAM tarifi. **Adımı açmadan uygulamaya başlama**; indeksteki tek satırlık özet tarif değildir.
4. `../tools/kokpit/test/fixtures/` + `../tools/kokpit/PANO_SOZLESMESI.md` — biçim örneği + sözleşme (uyarla, kopyalama). Ayrı örnek proje yok.

Kuralların **indekstedir** (`../GENESIS.md`); adım tarifleri **`adimlar/`** altında, bekçi yazım
kontratı `BEKCI_TARIFI.md`'de yaşar. Sıranın verisi `adimlar/SIRA.txt`.

**Sırayı sen ezberlemezsin, makine taşır.** Her oturum kapanışında `../tools/guard/kurulum-surucu.sh`
(Stop kancası) makine bloğunu okur: açık adım bitmemişse oturumu kapattırmaz, bir adım bitmeden
sonrakini de açtırmaz. Senin işin bloğun `Durum:` alanını doğru tutmak — **açık** (çalışıyorum) ·
**bekliyor** (sahibin mührünü/cevabını bekliyorum, oturum kapanabilir) · **bitti** (sıradakini
sürücü açsın).
