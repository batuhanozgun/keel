# KEEL

> Boş bir fikri; disiplinli, izlenebilir ve çalışan bir **yazılım ekibine + panoya** çeviren kurulum sistemi.

**KEEL**, durumsuz yapay zekâ ajanlarıyla (Claude Code) bir yazılım projesini **sıfırdan kurup yürütmek** için bir *işletim disiplini* şablonudur. Merkezinde **GENESIS** vardır: projeyi bir kez seninle konuşarak kuran, ekibi ve panoyu ayağa kaldıran, sonra çekilen kurucu mimar.

Adı buradan gelir: *keel*, geminin omurgasıdır — en başta konulan, üstüne her şeyin inşa edildiği ve gemi ömrü boyunca kalan taşıyıcı. KEEL de projenin en başında konulan, kalıcı disiplindir.

---

## KEEL ne işe yarar?

Yapay zekâ ajanlarıyla iş yaparken en büyük sorun **dağınıklık ve unutkanlıktır**: her oturum sıfırdan başlar, kararlar kaybolur, kim neyi neden yaptı belirsizleşir. KEEL bunun panzehiri:

- **Roller** — her işi sahiplenen belirli roller (ör. koordinatör, uygulayıcı, denetçi). Kimse "sahipsiz" iş bırakmaz.
- **Kutular** — iş, uçtan uca *ince dilimler* (kutu) hâlinde ilerler; her kutunun bir kapısı ve ölçütü vardır.
- **Mühürler** — kritik kararlarda **senin** onayın alınır. Sen görmeden ilerlemez.
- **Kanon** — kararlar tek yerde kayıtlı kalır; "neden böyle yapıldı" her zaman bulunur.
- **Kokpit** — tek ekrandan bütün sistemin sağlığını görürsün (aşağıda).

Felsefesi tek cümlede: **bilerek az anla, çalışan bir sistem bırak.** Baştan her şeyi tasarlamaya çalışmaz; en ince çalışan dilimle başlar, üstüne koyar.

---

## Gerekenler

1. **Claude Code** — KEEL'i asıl *çalıştıran* budur. Bu depodaki dosyalar tek başına birer *tariftir*; onları hayata geçiren zekâ Claude Code'dur. → [docs.claude.com/claude-code](https://docs.claude.com/claude-code)
2. **Node.js** — yalnızca **kokpit** (izleme panosu) için gerekir; proje kurulumu için gerekmez. → [nodejs.org](https://nodejs.org)

> KEEL Türkçe bir sistemdir. Dosyalardaki Türkçe metin — Türkçe harfler dâhil (ı, ş, ğ, ç, ö, ü) — sistemin doğru çalışması için önemlidir; ASCII'ye çevirme.

---

## Kurulum — adım adım

KEEL bir **şablondur**: onu olduğu yerde çalıştırmazsın; önce **yeni ve boş bir proje klasörüne** kopyalarsın.

1. **Kopyala.** Bu klasörün tamamını, projen için açtığın **boş bir klasöre** kopyala.
   > Neden boş klasör? `.template-source` adlı bir guard dosyası, yanlışlıkla kaynağın kendi içine kurulum yapmanı engeller.
2. **Guard'ı sil.** Kopyaladığın klasörde `.template-source` dosyasını **sil**. Bu, "artık gerçek bir projedeyiz, kuruluma başlayabilirsin" demektir.
3. **Claude Code'u aç.** O klasörün kökünde bir Claude Code oturumu başlat.
4. **"selam" yaz.** Hepsi bu. `CLAUDE.md` Claude'u yönlendirir; **GENESIS** kuruluma başlar: sana sorular sorar, ölçek/riski ölçer, ekibi ve panoyu kurar.

Kurulum boyunca her önemli adımda **senin onayını (mühür)** ister. Acele etmez, seni sürüklemez.

---

## Kurulumda ne olur? (GENESIS)

GENESIS sabit bir plan izler (G0–G5):

- **Seni tanır.** Adını, projenin ölçeğini ve riskini sorar; ritüel yoğunluğunu ona göre ayarlar — küçük proje = hafif; ERP gibi büyük/riskli iş = tam disiplin.
- **Kabaca haritayı çıkarır.** Projeyi derinlemesine değil, *geniş* tanır; nereden başlanacağına gerekçesiyle karar verir.
- **Ekibi kurar.** Hangi rollerin gerektiğini türetir; sahipsiz kalan işi sana jargonsuz, kırmızıyla gösterir.
- **İlk kutuyu açar.** En ince uçtan-uca dilimi kurar ve senin açılış mührünle başlatır.
- **Çekilir.** Sistem ayağa kalkıp ilk sevk verilir verilmez GENESIS resmen görevi bırakır. Bundan sonrası kalıcı ekibinin (koordinatör + roller) işidir.

---

## Kurulumdan sonra — günlük kullanım

Kurulum bitince döngün çok basit:

1. `00_pano/PANO.md`'yi aç → **"SIRADAKİ OTURUM: &lt;rol&gt;"** satırını gör.
2. O rolün klasöründe bir Claude Code oturumu aç → **"devam"** yaz.
3. Kararlarda senden mühür istenir; sen onaylarsın.

Kurulumdan sonra kökte **`NASIL_KULLANILIR.md`** adlı bir sahip kılavuzu oluşur — ekibinin ne iş yaptığı, günlük döngü, nerede senin dâhil olduğun, hepsi jargonsuz orada.

> **Tek ezberin:** Kokpitteki sistem ışığı kırmızıysa ve "tazelik" diyorsa, sistem kırmızıdır — diğer ışıklar yeşil görünse bile.

---

## Kokpit — tek ekrandan izleme

`tools/kokpit`, sistemin sağlığını — ışıklar · sıradaki adım · kutu kapıları · roller — tek ekranda gösteren **salt-okunur** yerel bir panodur. Hiçbir şeye dokunmaz, yalnızca okur. Harici bağımlılık yok (`npm install` gerekmez).

Açmak için iki yol:

- **Kolay:** `tools/kokpit/launcher/Kokpit.command`'i Masaüstüne kopyala, çift tıkla.
- **Terminal:** `cd tools/kokpit && npm start` → tarayıcıda **http://127.0.0.1:4173**

---

## Kutunun içinde ne var?

```
keel/
├── README.md            ← bu dosya
├── LICENSE              ← telif ve kullanım koşulları
├── CLAUDE.md            ← ilk oturumu yönlendiren giriş ("kurulu mu?")
├── GENESIS.md           ← GENESIS'in sabit kurulum planı (G0–G5)
├── .template-source     ← "kaynağa kurulum yapma" guard'ı (kopyada silinir)
├── 00_genesis/          ← GENESIS koltuğu + yarım-kurulum toparlama çapası
└── tools/kokpit/        ← salt-okunur izleme panosu + format sözleşmesi + testler
```

---

## Lisans

Telifli — © 2026 Batuhan Özgün. Görmek ve denemek için paylaşılmıştır. Ayrıntı: [`LICENSE`](LICENSE).
