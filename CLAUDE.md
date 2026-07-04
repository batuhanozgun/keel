# İşletim disiplini şablonu

Bu klasör, durumsuz ajanlarla bir yazılım projesini sıfırdan kurup yürütmek için bir işletim disiplini şablonudur.

## Bu oturumda İLK İŞ — yönlendirme

**0. Önce `.template-source` var mı bak.** VARSA → **kaynak şablonun içindesin**, kurulum YAPMA. Kullanıcıya jargonsuz söyle ve DUR:
> "Bu, dağıtılan şablonun kendisi. Kurulum yapmadan önce bu klasörü boş/yeni bir proje klasörüne kopyala, kopyadaki `.template-source` dosyasını sil, sonra o klasörde beni yeniden başlat."

`.template-source` YOKSA (düzgün bir kopyadasın) → kökte **`.kurulum-tamam`** dosyası var mı diye bak:

- **YOKSA** → sistem henüz kurulmadı. **`00_genesis/`** klasöründe oturum açıp GENESIS'i başlat (kurallar: `GENESIS.md`). Yarım kurulmuş olabilir; önce `00_genesis/GENESIS_DURUM.md`yi okuyup **kaldığın yerden** devam et.
- **VARSA** → sistem kurulu. **`00_pano/PANO.md`**yi aç, **"SIRADAKİ OTURUM"** satırını izle — normal döngü. (Kurucu/GENESIS artık çekilmiştir.)

> `.kurulum-tamam` dosyasını yalnız GENESIS, kurulumu bitirip çekilirken (G5) bırakır. Başka hiç kimse dokunmaz.
