# PANO Sözleşmesi — kokpitin okuduğu biçim

Kokpit (`tools/kokpit/`) vault'u SALT-OKUR ve tek ekranda gösterir. Bunu yapabilmesi için
vault'un makine-okur biçimi sabit olmalı. Bu belge o **sözleşmedir**: **söz dizimi sabit,
içerik serbest.** GENESIS her projede bu iskeleti aynen üretir.

## Sabit (söz dizimi — değişmez)

- **Dizin şeması:** `00_pano/{PANO,SAGLIK,ERTELENENLER}.md` (+ `00_pano/oturum-gunlugu.jsonl` —
  makine günlüğü; tek yazarı kapanış kancası, kokpit okumaz) · `01_kutular/KT-*/**/KUTU.md` ·
  `01_kutular/_arsiv/` · `03_roller/<rol>/DURUM.md` · `02_kanon/`
- **Ayıraçlar:** alan ayıracı ` · ` (U+00B7, boşluklu) · durum ayıracı ` — ` (U+2014, em-dash).
  ASCII'ye normalize edilmez; `toLowerCase` uygulanmaz (Türkçe İ/ı).
- **PANO mekanik blok:** `## MEKANİK BLOK` başlığı altında ``` ``` ``` fenced blok; içinde:
  - `Son koşu: YYYY-MM-DD HH:MM (koşu #N)`
  - `Işıklar: <AD>=<değer> · <AD>=<değer> · …`  → **NAME=val çiftleri** (ad serbest, değer ciddiyet sözlüğünden)
  - `Görevler: G-NN=<durum> · …`
  - `Kırmızı: N · Sarı: N`
- **Ciddiyet sözlüğü (sabit Türkçe):** `YEŞİL` · `SARI` · `KIRMIZI` · `VERİ-YOK` (nötr).
- **PANO yargı bloğu (koordinatör nesri):** kalın etiketli satırlar —
  `- **Aktif kutu:** …` · `- **SIRADAKİ OTURUM:** <rol> — …` · `- **Paralel açılabilir:** …` · `- **Blokaj:** …`
- **KUTU kapı tablosu:** `## Kapılar` başlığı altında `| Kapı | İş | Sahip | Durum | Kanıt |` tablosu.
  **Kanıt** = kanıt-işaretçisi (`test:`/`demo:` öneki ya da vault yolu); varlık denetimini bekçinin
  bağ-varlık kategorisi yapar (yeni projelerde zorunlu; açık kapıda `test:`/`demo:` tipi — yol-tipi
  kapı kapanırken yazılır). Kokpit 4 sütunlu eski tabloyu da okur (Kanıt boş kalır — geri-uyum);
  `—` hücresi "işaretçisiz" sayılır.
  - **Tek-faz:** Faz alt-başlığı yok → tablo doğrudan aktif.
  - **Çok-faz:** `### Faz A …` (aktif) · `### Faz B …` (iskelet, pasif). Kapı ID öneki `G-`.
- **Rol durumu:** `03_roller/<rol>/DURUM.md`, `# DURUM — <Ad>` başlığı; `**Son oturum:** …` satırı.
- **ID önekleri:** kutu `KT-` · kapı/görev `G-`.

## Serbest (içerik — projeye göre değişir)

- Rol adları ve sayısı (`03_roller/*`'tan okunur; kokpit saymaz-sabitlemez).
- Işık boyutlarının **adları/sayısı** (`NAME=val` jenerik okunur; AKIŞ/DOSYA/DAVRANIŞ zorunlu değil).
- Kutu faz sayısı (tek/çok).
- Proje başlığı · sahip adı · renkler · vault yolu → `tools/kokpit/kokpit.config.json`.
- Koordinatör rolünün slug'ı → `kokpit.config.json` `koordinatorRol` (varsayılan `koordinator`).

## "Sıradaki" bayatlığı (kokpit ipucu)

Yargı bloğunu yalnız koordinatör yazar. Bir rol işini bitirip koordinatöre devrettiğinde
pano bir an eski "sıradaki"yi gösterebilir. Kokpit bunu **deterministik** yakalar: SIRADAKİ
rolünün `DURUM.md` dosya-değişim-zamanı, koordinatörünkinden yeniyse → *"koordinatör sevki
bekleniyor"* gösterir (rol adı değil dosya mtime; aynı-gün ayrımı için).

> **GENESIS/kapanış yazım sırası (load-bearing — iki mtime kısıtını BİRLİKTE çözer):**
> önce diğer rol `DURUM.md`'leri → sonra `03_roller/koordinator/DURUM.md` (rol dosyaları arasında **en yeni**)
> → **EN SON bekçiyi koştur** (SAGLIK+PANO damgasını o yazar; ikisi de drift-skip listesinde). Böylece
> hem "koordinatör en yeni rol" (yoksa yanlış *"sevk bekleniyor"*) hem "SAGLIK damgası tüm canlı dosyalardan
> yeni" (yoksa drift-radar yanlış SARI) aynı anda sağlanır. Koordinatör DURUM'u bekçiden ÖNCE ama diğer
> rollerden SONRA yaz.

## Load-bearing yazımlar (harfi harfine — kayarsa uyarı/yanlış-skor)

Parser bu string'leri **birebir** arar; ASCII'ye çevirme, harf değiştirme:

- `## MEKANİK BLOK`  (İ = U+0130, noktalı büyük I)
- `Işıklar:`  (I = noktasız büyük I) · `Son koşu:` · `Görevler:` · `Bekleyen sorular:` · `Kırmızı: N · Sarı: N`
- **Ciddiyet değerleri:** `YEŞİL` · `SARI` · `KIRMIZI` · `VERİ-YOK` (nötr). ASCII `YESIL` **skorlanmaz** → nötr sayılır, sistem yanlışlıkla yeşil görünür.
- `# DURUM — <Ad>`  (— = U+2014 em-dash, çevresinde boşluk) · `**Son oturum:** …`
- Boş rol için gövdede `Henüz oturum açılmadı` (parser bunu "boş" işaretler).
- **Ayıraçlar:** alan ` · ` (U+00B7, çevresinde boşluk) · durum ` — ` (U+2014).
- **Rol slug'ları tek-token** (tire/boşluk yok; ör. `urun` — `urun-ortagi` DEĞİL). SIRADAKİ ayrıştırıcısı slug'ın yalnız ilk kelimesini alır; tireli slug "sevk bekleniyor" tespitini ve "aç: `<rol>`" etiketini bozar.

**En güvenli yol:** `tools/kokpit/test/fixtures/tekfaz/` dosyalarını **kopyalayıp içeriğini değiştir** —
diakritikler otomatik doğru gelir, elle yazım hatası olmaz.

## Neden sözleşme?

Kokpit parser'ı jeneriktir; onu bir projeye bağlayan tek şey bu söz dizimidir. GENESIS bu
iskeleti üretirse kokpit **0 uyarı** ile okur (gerçek koşularda kanıtlandı).
Söz dizimi bozulursa kokpit ilgili satır için "okuma notu" uyarısı basar (asla sessiz maskeleme).
