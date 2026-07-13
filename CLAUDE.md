# İşletim disiplini şablonu

Bu klasör, durumsuz ajanlarla bir yazılım projesini sıfırdan kurup yürütmek için bir işletim disiplini şablonudur.

## Bu oturumda İLK İŞ — yönlendirme

**0. Önce `.template-source` var mı bak.** VARSA → bu klasör iki şeyden biridir: ya dağıtılan **KEEL şablonunun orijinali**, ya da kullanıcının **yeni projesi için açtığı taze bir kopya** (guard henüz temizlenmemiş). İkisini dosyalardan ayırt **edemezsin** — kullanıcının gizli dosyayı elle silmesini bekleme, ona **sen sor**:
> "Burası, yeni bir proje için açtığın (boş/taze) klasör mü, yoksa indirdiğin KEEL'in kendisi mi? Yeni projense kurulum işaretini ben silip başlayacağım; KEEL'in orijinaliyse durmam gerekir — oraya kurarsak şablonu bozarız."

Yanıta göre:
- **"Yeni projem" derse:** bir de bağlam ipuçlarına bak (klasör adı `keel` mi? git remote KEEL deposunu mu gösteriyor?). Şablonun orijinali gibi görünüyorsa uyar ve tekrar teyit iste. Emin olunca `.template-source`'u **sil** ve aşağıdaki `.kurulum-tamam` kontrolüne geç (kurulmamış sistem → GENESIS başlar).
- **"KEEL'in kendisi" derse ya da emin değilse:** **DUR, silme, kurma.** "Önce bu klasörü boş bir proje klasörüne kopyala, sonra orada beni aç" de.

`.template-source` YOKSA (düzgün bir kopyadasın) → kökte **`.kurulum-tamam`** dosyası var mı diye bak:

- **YOKSA** → sistem henüz kurulmadı. **`00_genesis/`** klasöründe oturum açıp GENESIS'i başlat (kurallar: `GENESIS.md`). Yarım kurulmuş olabilir; önce `00_genesis/GENESIS_DURUM.md`yi okuyup **kaldığın yerden** devam et.
- **VARSA** → sistem kurulu. **`00_pano/PANO.md`**yi aç, **"SIRADAKİ OTURUM"** satırını izle — normal döngü. (Kurucu/GENESIS artık çekilmiştir.) Rol oturumunu İNSAN açar: sahip `/rol-<slug>` törenini yazar; sen rol becerisini kendiliğinden tetikleyemezsin, tören çıktısında "ROL AÇIK" görmeden rol işi yapma.

> `.kurulum-tamam` dosyasını yalnız GENESIS, kurulumu bitirip çekilirken (G5) bırakır. Başka hiç kimse dokunmaz.
