# İşletim disiplini şablonu

Bu klasör, durumsuz ajanlarla bir yazılım projesini sıfırdan kurup yürütmek için bir işletim disiplini şablonudur.

## Bu oturumda İLK İŞ — yönlendirme

**0. Tek soru: bu sistem kurulu mu?** Kökte **`.kurulum-tamam`** dosyası var mı diye bak:

- **YOKSA** → sistem henüz kurulmadı. **`00_genesis/`** klasöründe oturum açıp GENESIS'i başlat. `GENESIS.md` **indekstir** — adım tarifleri `00_genesis/adimlar/` altında yaşar ve indeksteki tek satırlık özet tarif DEĞİLDİR; açık adımın dosyasını açmadan uygulamaya geçme. Yarım kurulmuş olabilir; önce `00_genesis/GENESIS_DURUM.md`nin `## KURULUM DURUMU` bloğunu okuyup **kaldığın yerden** devam et — sırayı `tools/guard/kurulum-surucu.sh` (Stop kancası) taşır: bitmemiş adımla oturum kapanmaz, bir adım bitmeden sonraki açılmaz. Klasörün kuruluma hazır olup olmadığını (KEEL bağı, yedek, git kaydı) **sen elle ölçmezsin** — GENESIS G0.1'de `tools/guard/klasor-hazirligi.sh` bunu mekanik yapar; kullanıcıya "burası kopya mı, orijinal mi" diye SORMA.
- **VARSA** → sistem kurulu. **`00_pano/PANO.md`**yi aç, **"SIRADAKİ OTURUM"** satırını izle — normal döngü. (Kurucu/GENESIS artık çekilmiştir.) Rol oturumunu İNSAN açar: sahip `/rol-<slug>` törenini yazar; sen rol becerisini kendiliğinden tetikleyemezsin, tören çıktısında "ROL AÇIK" görmeden rol işi yapma.

> `.kurulum-tamam` dosyasını yalnız GENESIS, kurulumu bitirip çekilirken (G5) bırakır. Başka hiç kimse dokunmaz.
