# Kokpit

Projenin vault'unu **tek ekrandan izlemek** için yerel, salt-okunur bir pano.
Işıklar, sıradaki oturum, aktif kutu kapıları, roller, ertelenenler ve ana plan —
hepsi `.md` dosyalarını tek tek açmadan görünür. Ayrıca sol taraftaki ağaçtan
istediğin dosyayı açıp okuyabilirsin. Üstteki **"nasıl kullanılır"** düğmesi projenin
`NASIL_KULLANILIR.md` kılavuzunu panelde gösterir.

## Nasıl açılır

### En kolay: çift tıkla

Masaüstüne kopyaladığın **"Kokpit"** simgesine çift tıkla. Küçük bir pencere açılır
(bu pencere açık kaldıkça pano çalışır) ve tarayıcıda pano kendiliğinden açılır.
**Kapatmak için o pencereyi kapat.** (macOS "çalışan işlemi sonlandır?" diye sorarsa
"Terminate" de.)

İlk açışta macOS güvenlik uyarısı verirse: simgeye **sağ tıkla → Aç**, bir kez onayla;
sonraki açışlarda direkt çift tıklama yeter.

Başlatıcının kaynağı: `launcher/Kokpit.command`. Yeniden kurmak için o dosyayı
Masaüstüne kopyalayıp `chmod +x` yeter.

### Alternatif: terminalden

```
cd <proje>/tools/kokpit
npm start
```

Sonra tarayıcıda **http://127.0.0.1:4173** (port `kokpit.config.json`'dan); kapatmak için `Ctrl+C`.

## Ayar

`kokpit.config.json` (GENESIS her projede yazar):

- `baslik` / `altBaslik` — üstteki marka yazısı
- `sahip` — kişiselleştirme etiketleri
- `koordinatorRol` — koordinatör rolünün slug'ı (varsayılan `koordinator`; "sıradaki bayat" tespiti için)
- `vaultYolu` — vault kökü (varsayılan `../..` = proje kökü)
- `port` — port (varsayılan `4173`)
- `isikIpuclari` — ışık boyutlarına kısa açıklama (opsiyonel)
- `renkler` — tema override (opsiyonel; varsayılan tema var)

Ortam değişkeni override'ı da var: `KOKPIT_VAULT`, `KOKPIT_PORT`.

## Önemli

- **Hiçbir şey yazmaz.** Bu pano yalnızca okur; vault'a, git'e, hiçbir dosyaya dokunmaz.
  Tek gerçek yine vault dosyaları + git'tir; pano onların aynasıdır.
- **Canlı.** Açık kaldıkça her 15 saniyede kendini tazeler. Bir rol dosyaya yazınca
  pano kısa süre içinde güncellenir. Üstte "güncellendi" saati görünür.
- **Tazelik.** Üstteki sistem ışığı kırmızıysa ve "tazelik" yazıyorsa: bekçi bir gündür
  koşmamış demektir — ışıklar yeşil görünse bile sistem kırmızı sayılır (senin tek ezberin).
- Bir rol dosyayı bekçi koşusundan sonra değiştirdiyse pano "ışıklar güncel olmayabilir"
  diye sarı uyarı gösterir. Bu, sapmayı erken görmen için.

## Yapı

- `server.mjs` — bağımlılıksız Node sunucusu (yalnız GET; 127.0.0.1; yol/symlink kaçışı korumalı)
- `lib/status.mjs` — vault → durum JSON (PANO/SAGLIK/KUTU/ERTELENENLER/roller ayrıştırıcısı)
- `lib/tree.mjs` — dosya ağacı (symlink takip etmez, dot/dışlanan gizlenir)
- `lib/markdown.mjs` — küçük, güvenli Markdown çizici (offline, bağımlılıksız)
- `public/` — arayüz (tek sayfa)
- `test/` — ayrıştırıcı ve çizici testleri (`npm test`) + `test/fixtures/` (tek-faz/iki-faz örnek vault)
- `PANO_SOZLESMESI.md` — kokpitin okuduğu makine biçiminin sözleşmesi (GENESIS bunu üretir)
