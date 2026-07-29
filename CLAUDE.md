# İşletim disiplini şablonu

Bu klasör, durumsuz ajanlarla bir yazılım projesini sıfırdan kurup yürütmek için bir işletim disiplini şablonudur.

## Bu oturumda İLK İŞ — yönlendirme

**0. Tek soru: bu sistem kurulu mu?** Kökte **`.kurulum-tamam`** dosyası var mı diye bak:

- **YOKSA** → sistem henüz kurulmadı. **`00_genesis/`** klasöründe oturum açıp GENESIS'i başlat (kurallar: `GENESIS.md`). Yarım kurulmuş olabilir; önce `00_genesis/GENESIS_DURUM.md`yi okuyup **kaldığın yerden** devam et. Klasörün kuruluma hazır olup olmadığını (KEEL bağı, yedek, git kaydı) **sen elle ölçmezsin** — GENESIS G0.1'de `tools/guard/klasor-hazirligi.sh` bunu mekanik yapar; kullanıcıya "burası kopya mı, orijinal mi" diye SORMA.
- **VARSA** → sistem kurulu. **`00_pano/PANO.md`**yi aç, **"SIRADAKİ OTURUM"** satırını izle — normal döngü. (Kurucu/GENESIS artık çekilmiştir.) Rol oturumunu İNSAN açar: sahip `/rol-<slug>` törenini yazar; sen rol becerisini kendiliğinden tetikleyemezsin, tören çıktısında "ROL AÇIK" görmeden rol işi yapma.

> `.kurulum-tamam` dosyasını yalnız GENESIS, kurulumu bitirip çekilirken (G5) bırakır. Başka hiç kimse dokunmaz.
