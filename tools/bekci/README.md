# Bekçi sabit çekirdeği — SÖZLEŞME

<!-- Bu dosya K1 adım 2'nin ürünüdür (2026-08-06). Kod HENÜZ YOK: burada yazan şey, adım 3'te
     yazılacak çekirdeğin uyacağı sözleşmedir. Sözleşme KODDAN ölçülerek yazıldı, belgeden
     derlenerek değil; her hüküm bir `dosya:satır` çapası taşır. Çapasız madde buraya girmez.
     Tasarının bilgisi ve ölçüm kayıtları ürünün DIŞINDA, geliştirme tarafının kendi evinde
     tutulur; buraya yalnız hüküm iner.
     Bu dosya bir KALIP DEĞİLDİR: kuruluma kopyalanmaz, çekirdekle birlikte gelir.
     ÇAPA NOTU (K1 adım 7, hasım bulgusu #1): BEKCI_TARIFI.md adım 4'te işaretçiye KIRPILDI ve
     bu dosyanın oraya attığı satır-çapaları öldü. Onarım: ölen çapalar ya hükmün CANLI evine
     çevrildi ya "kırpma-öncesi gövde" diye işaretlendi — o gövde geliştirme deposunun git
     tarihindedir (kırpan commit'in ebeveyni); kurulu projede o tarih YOKTUR, oradan
     doğrulanacak hüküm aranmaz. Oynak satır numarası yerine içerik çapası kullanılır. -->

Bugün her kurulum kendi bekçisini sıfırdan yazıyor. Ölçüldü: **altı gerçek kurulumda altı
farklı bekçi** doğdu — biri Python, biri rol dizininde, biri kancasız, üçünde zorunlu-küme
denetimi hiç yok, ikisi tavanı satır sayıyor. Bu sözleşme onu bitirir: **her projede aynı
çekirdek**, projeye özel olan yalnız bir ayar dosyası.

**Ölçüm kaynağının adlandırılması.** Aşağıdaki hükümlerin çoğu bu altı kurulumda yapılmış
ölçümlere dayanır. Kurulumlar bu depoda **adlarıyla anılmaz** — bu depo dışarıya gider ve
sahibin yerel proje envanteri ürünün taşıyacağı bilgi değildir. `K-a` … `K-f` kısaltmaları
kullanılır; hangi kısaltmanın hangi kuruluma karşılık geldiği geliştirme tarafının kendi
kaydındadır. Ölçümün kanıt gücü ADDA değil, SAYIDA ve DAVRANIŞTADIR.

## 0 · Beş dosya, üç sahip

| Dosya | Sınıf | Kim değiştirir |
|---|---|---|
| `tools/bekci/cekirdek` — sabit denetim gövdesi | `[SERT]` | yalnız KEEL; kurulum YAZMAZ |
| `tools/bekci/bekci.sh` — ince sarmalayıcı | `[SERT]` | yalnız KEEL |
| `tools/bekci/el-kitabi-zorunlu.txt` — EL_KITABI zorunlu kümesinin tek evi (§5①) | `[SERT]` | yalnız KEEL |
| `tools/bekci/gorev-durumlari.txt` — görev durum sözlüğünün tek evi | `[SERT]` | yalnız KEEL |
| `tools/bekci/bekci.conf` — proje ayarı | `[SORULUR]` | sahip, kurulumdan sonra da |

**İki VERİ dosyası neden burada:** ikisi de bir KÜMENİN tek evidir ve iki ayrı makine tarafından
okunur. Kümeyi koda gömmek, aynı olguyu iki yerde yazmaktır; sürüklenme oradan doğar.

**`gorev-durumlari.txt` — SEVK İLE ORTAK küme (K5, 2026-08-08).** Dosya iki şeyi birden tanımlar:
görev durum sözlüğü (`açık` · `sürüyor` · `mühür-bekliyor` · `kapalı` · `pas`) ve o sözlüğün
**ÜRETİM/KAPANIŞ ayrımı** (`uretimde:` / `kapanista:` önekleri). Çekirdek onu `dis-goz-brifingi`
gözünde, `tools/sevk/sevk.sh` çözümleyicisinde okur; ikisi de dosya yok/biçimsizse fail-closed
(çekirdek arıza hattına yazar, sevk dönemi durdurur).

*Doğuş — ölçülmüş çelişki:* `mühür-bekliyor` cinsi iki makinede ZIT anlamdaydı. Sevk onu AÇIK
üretim görevi sayıyordu, yani yalnız mühür bekleyen görevi kalan kutu kapanış evresine hiç
girmeden duran kapıda ölüyordu; bekçi ise aynı görevi kapanış tarafında sayıp kapanış kilidini
sevkten bir tur önce basıyordu. **Hüküm:** `mühür-bekliyor` KAPANIŞ tarafındadır — kanonun
kendi cümlesi evre geçişini "açık **ÜRETİM** görevi kalmaması"na bağlar (`OTONOM_DONEM §1`) ve
mühür bekleyen görevin işi bitmiştir; yapının onu ilerletecek hiçbir hamlesi yoktur. Kümenin
yük taşıdığını iki bozma ölçer (dosya ters çevrilir, iki tarafın hükmü de onunla döner):
`tools/bekci/test/gorev-durum-tek-ev.test.mjs` · `tools/guard/test/sevk-e4.test.mjs` (K5).

**Sarmalayıcı neden ayrı:** kapanış kancası (`tools/guard/kapanis.sh:165`), sevk
(`tools/sevk/sevk.sh:864`) ve korunan-yollar kaydı bekçiyi **`tools/bekci/bekci.sh`** yolundan
çağırır. Konvansiyon yolu bu paketin kırmızı çizgisidir; çekirdek `.mjs`e geçse bile sarmalayıcı
`.sh` kalır ve kabloya dokunulmaz.

**Ayar neden `[SORULUR]`:** `[SERT]` olsaydı kurulumdan sonra hiçbir kanaldan güncellenemezdi.
Oysa ürün yolları, test komutu ve tavan sayıları projenin normal yaşamında değişir — tavan
sayıları için EL_KITABI'nın kendi retro maddesi zaten "ilk retroda ölçümle yeniden kalibre
edilir" diyor.

**Ayarın YAZAMAYACAĞI iki şey (mekanik):** ① kök şemasının **zorunlu kümesi** — ayar yalnız
izinli kümeye ekleme yapabilir; ② `GENESIS.md`'nin izinli kümeye alınması — çekirdek bu adı
ayardan gelse bile reddeder (`00_genesis/adimlar/G3a.md:8` adıyla yasaklıyor: "onu şemaya
kalıcı whitelist'leme"). Sahada delinmişti; artık delinemez.

## 1 · Makine satırı

Çekirdek, çıktısının **son satırı** olarak tek bir makine satırı basar:

```
BEKCI v1 durduran=<n> kilit=<n> uyari=<n> bilgi=<n> ariza=<n> kadran=<tam|kucuk> pencere=<kurulum|isletim>
```

- **Satır başında `BEKCI ` çapası**, alanlar boşlukla ayrılır, değerler ASCII.
- **Hiçbir ciddiyet kelimesi geçmez** — `KIRMIZI` · `SARI` · `YEŞİL` · `sari` bu satırda
  YASAKTIR. Sebebi ölçülmüş: sözleşme yazıldığı gün `sevk.sh` bekçinin çıktısını **satır satır
  tarayıp `KIRMIZI` kelimesini arıyordu** ve metinde geçen tek açıklama cümlesi dönemi
  durdurabiliyordu. Tarama K1 adım 5'te EMEKLİ edildi (karar artık makine satırından ve çıkış
  kodundan okunur); yasak yürürlükte kalır, çünkü ciddiyet kelimesi bu satıra girerse o
  taramanın geri dönmesinin önü açılır.
- **Alan adları ASCII:** `uyari`, `sari` değil. Türkçe harf güvenliği (`İ`/`ı`) makine
  eşleşmesinde hiçbir dönüşüme izin vermez; alan adını ASCII tutmak tartışmayı kapatır.
- Satır **hiç basılmamışsa** tüketici fail-closed durur: "ölçemedim" ile "temiz" aynı şey
  değildir.

**Beş sayının anlamı:**

| Alan | Ne sayar | Tüketicideki karşılığı |
|---|---|---|
| `durduran` | otonom dönemi DURDURAN bulgu | sevk `duran-kapi` ile döner |
| `kilit` | kutu KAPANIŞINI kilitleyen ama dönemi durdurmayan bulgu | dönem sürer, kapanış mührü verilemez |
| `uyari` | SARI | iş durmaz, sahibe not |
| `bilgi` | BİLGİ | yalnız kayıt |
| `ariza` | bekçinin KENDİ hatası | fail-closed durdurur |

**`kilit` neden ayrı bir sayı:** sözleşme yazıldığı gün `tools/sevk/sevk.sh` bu ayrımı
`[tavan]` **önek eşleşmesiyle** yapıyordu — tavan kırmızısı kapanış kilididir, duran kapı
değildir (`02_kanon/OTONOM_DONEM.md §1`). Önek eşleşmesi kırılgandır: K-a bekçisi tavan
bulgusunu `tavan aşımı 1.5x: …` diye köşeli parantezsiz basıyordu ve o bulgu DURDURAN
sayılıyordu. Sayıyı bekçinin kendisi verince ayrım tüketicinin metin okumasına bağlı kalmadı;
önek eşleşmesi K1 adım 5'te emekli oldu, sevk `kilit` alanını okur (`sevk.sh` KILIT dalı).

## 2 · Çıkış kodları

| Kod | Anlam |
|---|---|
| `0` | durduran yok ve arıza yok |
| `1` | durduran var |
| `2` | **bekçinin kendi arızası** — "kırmızı" değil, AYRI hâl |

`kilit` ve `uyari` çıkış kodunu değiştirmez; onlar makine satırından okunur.

**Bu bir remap DEĞİL, onarımdır.** Tüketici bu sözleşmeyi zaten varsayıyor:
`tools/guard/kapanis.sh:174` → `case "$RC" in 0) tamam;; 1) kirmizi;; *) hata;; esac`.
Üreticiler hiç uymadı: saha bekçileri `1 = SARI var · 2 = KIRMIZI` kullanıyor
(K-c bekçisinin kendi başlığı). Yani bugün yalnız SARI bulan bir bekçi
oturum günlüğüne **"kirmizi"** yazdırıyor, gerçekten KIRMIZI bulan ise **"hata"**. Kayıt iki
yönde de yanlış. Çekirdek tüketicinin varsayımına uyar.

**Kurulumdan çekilme ölçütü** buradan mekanikleşir: çekilme şartı **çıkış kodu 0**'dır. Kalan
`uyari` sayısı sahibin kuyruğuna beyanla düşer, çekilmeyi engellemez.

## 3 · Ciddiyet sözlüğü ve kurulum penceresi

Dört hâl vardır, beşincisi yoktur: **DURDURAN · KİLİT · UYARI · BİLGİ** (+ arıza, ayrı hat).
İnsan çıktısında her bulgu tek satırdır:

```
<HÂL> [<kategori>] <göz-adı>: <bulgu>
```

`<göz-adı>` bulgunun okunabilirliğini taşır; **yeni kategori açmaz.** Zorunlu kategori kümesi
kadrandan türer ve `tools/guard/kurulum-denetimi.sh` onu ilan satırında arar (kadran denetimi,
`# kategoriler:` çapası) — yeni bir zorunlu ad açmak eski kurulumların ilanını kırar (karar
üç kez verilmişti; doğuş evi tarifin kırpma-öncesi gövdesi, canlı hüküm BU madde). Çekirdeğin
ilan satırı:

```
# kategoriler: tavan şema koruma-hattı bağ-varlık golden-tazelik
```

`golden-tazelik`, `tazelik`i **alt dize olarak içerir**; kurulum denetimi ilan satırına
`grep -qF` ile baktığı için eski zorunluluk aynen karşılanır ve
denetim koduna dokunulmaz. Ad neden değişti: **"tazelik" üründe iki ayrı şeyin adıydı** —
kokpitin sahibe bastığı tazelik SAGLIK damgasının yaşıdır
(`tools/kokpit/lib/status.mjs:197-225`) ve `README.md:77` onu sahibin **tek ezberi** ilan
ediyor. Kokpit kodu bu paketin kırmızı çizgisi olduğu için ayrımı bekçi tarafı yapar.

**Kurulum penceresi = dördüncü sütun.** `.kurulum-tamam` yokken kurulum sürüyordur. Bu
sütun olmazsa "bir kez koştur" adımı `.taban-ref` doğmadan koşar ve **her TAM kurulum garantili
KIRMIZI** basar. Kural üç satırdır:

1. **Koruma-hattı kablo denetimi HER ZAMAN tamdır** — kurulum penceresinde de. Kablo yoksa
   kurulum zaten yarımdır (`00_genesis/BEKCI_TARIFI.md` kablo-listesi maddesi bunu bugün de
   söylüyor: "kurulum penceresinde de tam").
2. **Geri kalan her göz kurulum penceresinde BİLGİ'ye düşer.** Kurulumda kilitliye yazmak,
   şemayı doldurmak, tavanı aşmak normaldir.
3. **Pencere hâli makine satırında `pencere=` alanıyla İLAN EDİLİR.** Böylece "temiz çıktı"
   ile "penceredeydi, ölçmedim" aynı görünmez.

## 4 · Denetim tablosu

Dört sütun: **göz · kategori · işletimde hâl · kurulum penceresinde hâl.** Kadran sütunu
beşincidir; `TAM` yazan göz KÜÇÜK kadranda hiç koşmaz.

### Kategori `tavan`

| Göz | İşletim | Pencere | Kadran |
|---|---|---|---|
| tavan aşımı (sarı eşik) | UYARI | BİLGİ | her |
| tavan aşımı (1,5× kırmızı eşik) | **KİLİT** | BİLGİ | her |
| içerik-sınıfı: kural-atıf kopyası | UYARI | BİLGİ | her |
| içerik-sınıfı: çok-satırlı kuyruk maddesi | UYARI | BİLGİ | her |

### Kategori `şema`

| Göz | İşletim | Pencere | Kadran |
|---|---|---|---|
| kök izinli küme dışı girdi | UYARI | BİLGİ | her |
| kök **zorunlu küme** eksik | DURDURAN | BİLGİ | her |
| `GENESIS.md` kökte (kurulum bitmişken) | UYARI | — | her |
| `00_pano` izinli küme dışı dosya | UYARI | BİLGİ | her |
| kutu dizini `KT-` öneksiz | UYARI | BİLGİ | her |
| rol evinde `ROL.md`/`DURUM.md` eksik ya da biçimsiz | UYARI | BİLGİ | her |
| kadro bütünlüğü: rolün alt-ajan koltuğu / töreni yok · sözleşmesiz koltuk | UYARI | BİLGİ | her |
| sahip kuyruğu: PANO sayacı yazımı | (yazar, bulgu üretmez) | yazar | her |
| sahip kuyruğu: kuyruk şeması bozuk | UYARI | BİLGİ | her |
| sahip kuyruğu: kapanış bloğu yok/biçimsiz | UYARI | denetlenmez | her |
| zarf günlüğü bütünlüğü bozuk | DURDURAN | BİLGİ | her |
| duruş sözleşmesi / bağımlılık-risk bloğu biçimsiz | UYARI | BİLGİ | her |
| dış göz brifingi bayat/yok (kapanışa gelmiş kutuda) | **KİLİT** | denetlenmez | her |
| porcelain dikişi `fark` | UYARI | BİLGİ | her |
| kanal yapılandırılmış ama hazır değil | UYARI | denetlenmez | her |
| watchdog işareti var, iş yüklü değil / nabız bayat | DURDURAN | denetlenmez | her |
| ölçüt-diff: kabul ölçütü açılıştan beri değişmiş | UYARI | BİLGİ | TAM |
| kapanış-dışı EL_KITABI diff'i | DURDURAN | BİLGİ | TAM |
| EL_KITABI bütünlüğü (zorunlu başlık/kural eksik) | DURDURAN | BİLGİ | her |
| arşive giden kutuda `açık` görev | UYARI | BİLGİ | TAM |
| retro bloğu boş (arşive giden kutu) | UYARI | BİLGİ | TAM |
| boş-backlog durağı (`AKIŞ=VERİ-YOK` + pano durak satırı) | BİLGİ | BİLGİ | her |

### Kategori `koruma-hattı`

| Göz | İşletim | Pencere | Kadran |
|---|---|---|---|
| kablo denetimi (settings.json girdileri + betik varlığı) | DURDURAN | **DURDURAN** | her |
| `[SERT]` yolda commit-dışı değişim | DURDURAN | BİLGİ | her |
| `[SORULUR]` yolda commit-dışı değişim | UYARI | BİLGİ | her |
| kilitli-tarih: kilitliye dokunan MDRT commit | DURDURAN | BİLGİ | her |
| kilitli-tarih: kilitliye YENİ dosya (A) | UYARI | BİLGİ | her |
| kilitli-tarih: `.taban-ref` yok/biçimsiz/git hatası | DURDURAN | BİLGİ | her |

### Kategori `bağ-varlık`

| Göz | İşletim | Pencere | Kadran |
|---|---|---|---|
| görev satırında Kanıt hücresi boş | UYARI | BİLGİ | her |
| Kanıt vault-yolu kopuk (dosya yok) | UYARI | BİLGİ | her |

### Kategori `golden-tazelik`

| Göz | İşletim | Pencere | Kadran |
|---|---|---|---|
| golden, ürün kodundan eski | UYARI | BİLGİ | TAM |
| golden dizini yok/boş | BİLGİ | BİLGİ | TAM |
| ölçüm yapılamadı (git yok / log hatası) | DURDURAN | BİLGİ | TAM |
| golden testinde üretim modülü import'u | DURDURAN | BİLGİ | TAM |

**Sayı beyanı:** tablo 37 satırdır — 36 göz + 1 yazım işi (PANO sayacı, bulgu üretmez).
<!-- Düzeltme (K1 adım 3, 2026-08-06): önceki beyan "31 göz" yazıyordu; tablonun mekanik
     sayımı 37 satırdır (4+21+6+2+4). İlan ettiğin katmanı sayarken abartmama/yanılmama kuralı
     bu dosyaya da işler (BEKCI_TARIFI'nın kendi dersi); tablo değişmedi, sayı tabloya çekildi. -->
Tasarı "24 denetim" diyordu; fark uydurma değil, kapsamdır —
tasarının envanteri E1/E5 gözlerinden (zarf günlüğü · duruş sözleşmesi · kanal · watchdog · dış
göz) ve içerik-sınıfının iki mekanikleşen kaleminden önce sayılmıştı. Envanterin kaynak
dosyaları diskte yok; bu tablo **koddan yeniden çıkarıldı**, tasarıdan kopyalanmadı.

## 5 · Beş tanım boşluğunun hükmü

Her boşluk ya MEKANİKLEŞİR ya BEYANLA kapsam dışına alınır; üçüncü yol yok.

**① Üç başlık adının kanonik yazımı.**
- **MEKANİKLEŞİR:** EL_KITABI'nın zorunlu kümesi (9 başlık + 1 ibare + 6 kural) **tek eve**
  iner: `tools/bekci/el-kitabi-zorunlu.txt`, satır başına `baslik:` / `ibare:` / `kural:`
  önekli tek kalem. Çekirdek ve `tools/guard/kurulum-denetimi.sh:28-38` **aynı dosyayı** okur;
  `00_genesis/EL_KITABI_KALIBI.md` gövdesinin bu listeyi karşıladığını bir test tartar. Bugün
  aynı küme üç kopyada yaşıyor (denetim betiği · `test/kurulum-denetimi.test.mjs:24-37`
  fixture'ı · kalıbın gövdesi) ve eşliğini hiçbir şey ölçmüyor.
- **Evin yeri neden `tools/` (ölçülmüş kısıt):** `00_genesis/` kurulum bitince **çekilebiliyor**
  — K-a `.kurulum-tamam` taşıyor ama `00_genesis` taşımıyor. Çekirdek çalışma
  zamanında `00_genesis/` altındaki hiçbir dosyaya çapa atamaz.
- **`## Kabul kriterleri` → BEYANLA KAPSAM DIŞI.** Başlık ekseninde beş yerin beşinde birebir
  aynı ve çapalı (`00_genesis/ILK_KUTU_KALIBI.md:62` · `kurulum-denetimi.sh:699` ·
  `test/ilk-kutu.test.mjs:217` + iki kokpit fixture'ı). Üç yazım yalnız düzyazı terimindedir;
  çekirdek düzyazı okumaz. Kapsam dışılık beyandır: yeniden açılırsa gerekçe yazılır.
- **`## Retro` → BEYANLA KAPSAM DIŞI.** Böyle bir başlık hiçbir kalıpta yok ve olmasına gerek
  yok; kurulum denetiminin çapası birebir dizedir (`grep -q "Tavan kalibrasyonu"`,
  `kurulum-denetimi.sh:96`) ve testlidir. Tasarının "tanımsız başlık" cümlesi yanlıştı; cümle
  düzeltildi, kod değişmiyor.

**② Tazelik mekaniği. MEKANİKLEŞİR.**
- Kategori adı `golden-tazelik` (gerekçe §3).
- Ölçüm: `git log -1 --format=%ct` ile **golden dizininin** son commit zamanı ile **ayarda ilan
  edilen ürün yollarının** son commit zamanı karşılaştırılır. Golden eskiyse UYARI.
- Golden dizini yok ya da boş → **BİLGİ** (kanon-fakir esnemesi;
  `00_genesis/EL_KITABI_KALIBI.md:196` çapası).
- Git yok / `git log` hatası → **DURDURAN, fail-closed.** "Ölçemedim" ile "taze" aynı şey
  değildir; emsal, kilitli-tarih gözünün kendi fail-closed hükmüdür (§4 koruma-hattı tablosu;
  doğuş evi tarifin kırpma-öncesi gövdesi).
- "Ürün kodu" kümesinin tek evi **proje ayar dosyasıdır**; EL_KITABI ona işaret eder,
  kopyalamaz. K-01'in ilan ettiği düzen buraya yazılır.
- **Bugün ne var:** hiçbir şey. Altı bekçinin beşinde kategori yok; altıncısında
  (K-f bekçisi) iki dalın ikisi de BİLGİ basıyor — zorunlu
  ilan edilen göz hiçbir kipte kırmızıya dönemiyor.

**③ Kök şemasının zorunlu kümesi. MEKANİKLEŞİR.** İki küme AYRI yazılır:

- **Zorunlu küme (`[SERT]`, ayar ekleyemez/çıkaramaz)** — yoksa DURDURAN:
  dizin `00_pano` `01_kutular` `02_kanon` `03_roller` `tools` `.claude` ·
  dosya `CLAUDE.md` `.gitignore` · ve `.kurulum-tamam` varsa ek olarak `NASIL_KULLANILIR.md`.
  - `.gitignore` zorunlu, çünkü makine-durumu dosyaları (`tools/sevk/.nabiz-son`,
    `.haber-durum`, `kanal.conf`) onsuz git'e girer.
  - `README.md` zorunlu **değil**: yokluğu hiçbir mekanizmayı kırmaz. `.kurulum-tamam` da
    zorunlu değil — o, kümenin anahtarıdır, üyesi değil.
  - **Neden gerekli, ölçümle:** K-a gerçek bir kurulumdur, `.kurulum-tamam` taşır ve
    `tools/` dizini **hiç yoktur**; `EL_KITABI.md` kanonik evi yerine kökte durur. Altı
    bekçinin üçünde zorunlu küme hiç yok — o üç kurulumda kökü tamamen boşaltmak şema gözünü
    YEŞİL bırakır. Whitelist yalnız FAZLAYI görür, EKSİĞİ görmez.
- **İzinli küme** = zorunlu küme + `README.md` `LICENSE` `.kurulum-tamam` `.git` `00_genesis`
  + ayarın ilan ettiği kalemler (ürün kod yolları, editör/OS artıkları). Dışı UYARI.
- **`GENESIS.md` hiçbir yoldan izinli olamaz** (§0). Sahada delinmişti:
  K-f bekçisi onu kalıcı whitelist'e almış.
- **"OS klasörleri" ifadesi ölür.** `00_genesis/adimlar/G3a.md:8`'deki bu tanımsız söz, yukarıda
  adlandırılan kümeyle değiştirilir (adım 5'in işi). Altı bekçi altı ayrı biçimde açmıştı.
- **Kadran çapası ikinci bir tanık kazanır.** Kadran bugün tek dizeden okunuyor
  (`kurulum-denetimi.sh:51-53`) ve altı kurulumun **beşinde eşleşmiyor** (K-b iki noktasız
  yazmış; K-c/K-d/K-e `Kadran: **KÜÇÜK …**` yazmış). Fail-closed dal `tam`a düşüyor, yani kayan bir
  KÜÇÜK kurulum TAM ölçülüyor. Çekirdek kadranı **ayar dosyasından** okur ve EL_KITABI dizesiyle
  karşılaştırır; ikisi ayrışırsa DURDURAN. Tek tanık, tanık değildir.

**④ Tavan kalemlerinin dosya/glob haritası. MEKANİKLEŞİR.**
**Harita sabittir (çekirdek, `[SERT]`), sayılar projeye aittir (ayar, `[SORULUR]`).** Ayrımın
sebebi yazılı: sayılar ilk retroda ölçümle kalibre edilir, harita edilmez.

| Kalem | Glob |
|---|---|
| `PANO` | `00_pano/PANO.md` |
| `SAGLIK` | `00_pano/SAGLIK.md` |
| `ERTELENENLER` | `00_pano/ERTELENENLER.md` |
| `SENDE_BEKLEYEN` | `00_pano/SENDE_BEKLEYEN.md` |
| `DURUM` | `03_roller/*/DURUM.md` |
| `BRIFING` | `03_roller/disgoz/BRIFING.md` |
| `NOTLAR` | `03_roller/*/NOTLAR.md` (var olanlar) |
| `KUTU` | `01_kutular/KT-*/KUTU.md` — **`_arsiv/` hariç** |
| `EL_KITABI` | `02_kanon/EL_KITABI.md` |

- **Birim BAYT'tır.** İki bekçi (K-d ve K-e bekçileri) satır sayıyor *ve*
  sayıyı EL_KITABI'ya atfediyor — oysa o projelerin F3'ü hiç tavan yazmıyor. Uydurma sayı,
  yazılı bir eve atfedilmiş.
- **`SAGLIK` kaleme eklendi:** bugün F3'te hiç yok ama iki bekçi ona tavan uyguluyor. Ölçülmemiş
  bir uygulamayı ya sil ya yaz; yazıldı.
- **"görev dosyası 6KB" kalemi DÜŞÜRÜLÜR.** Şablon ağacında `gorevler/` diye bir dizin **hiç
  yok**; K-f bekçisi glob'u kendisi icat etmiş. İhtiyaç doğarsa kalem beyanla
  yeniden açılır. Düşürme F3 metnine de işlenir (adım 5).
- **`_arsiv/` hariç, beyan:** arşive giden kutu artık değişmez; tavanını zorlamak geriye dönük
  gürültüdür.
- **Çekirdek bölüm NUMARASINA çapa atmaz.** `G3a.md:8` "tavan sayıları EL_KITABI **F3**
  tablosundan gelir" diyor; K-a'da tavanlar **F4**, F3 ise "Tek yazıcı" ve bekçisi
  `EL_KITABI §6` diye anıyor. Numara kurulumlar arasında kaymış. Sayılar ayardan okunur;
  EL_KITABI ile ayarın ayrışması UYARI'dır (sahibin kalibrasyonu ile bekçinin ölçüsü tek
  doğrultuda kalsın diye).
- **`## Bağımlılık ve risk` bloğu KUTU tavanından DÜŞÜLÜR** — hüküm ve ölçümü (25 görevlik
  blok 2,9 KB = sarı tavanın ~%29'u) tarifin kırpma-öncesi gövdesinden BURAYA taşındı; canlı
  ev bu madde + `00_genesis/OTONOM_DONEM_KALIBI.md` risk-bloğu bölümü. Altı bekçinin
  hiçbirinde bu düşme yok; çekirdek uygular.

**⑤ İçerik-sınıfı SARI'sı. İKİSİ MEKANİKLEŞİR, BİRİ BEYANLA DÜŞER.**
Kural `00_genesis/EL_KITABI_KALIBI.md:106-108`'de üç sınıf sayıyor; hiçbirinin makine tanımı
yok ve altı bekçinin altısında sıfır uygulama var.

- **`kural-atıf açılımı/kopyası` → MEKANİKLEŞİR:** `02_kanon/EL_KITABI.md`
  gövdesinden **200 bayt ya da daha uzun birebir tekrar** → UYARI, tavandan bağımsız.
  **Kapsam (beyan):** tekrar ardışık-satır düzeyinde ölçülür ve yalnız tavan haritasının
  insan-okur dosyalarında aranır — EL_KITABI'nın kendisi ve bekçinin yazdığı SAGLIK hariç,
  KUTU'daki risk bloğu muaf (§6③). Eşik beyandır; değişirse gerekçe yazılır. Kuralın kendi dersi tam bu sınıfı adlandırıyor:
  "kanıt zorunluluğu atıf-zırhı üretti; dosyalar tavana yapıştı"
  (`00_genesis/EL_KITABI_KALIBI.md:56`).
- **`1 satırı aşan açık-kalem anlatısı` → DAR BİÇİMDE MEKANİKLEŞİR:** yalnız kuyruk biçimi
  tanımlı iki dosyada (`00_pano/SENDE_BEKLEYEN.md` · `00_pano/ERTELENENLER.md`) bir madde
  birden çok satıra yayılıyorsa UYARI. Biçim zaten sözleşmeli — canlı ev `tools/sevk/catal-kuyruk.sh`
  başlığı (D-21 biçimi: `- [ ]`/`- [x]` + `YYYY-AA-GG` + ` · `).
- **`süreç-günlüğü` → BEYANLA DÜŞER.** Bir metnin "olan biteni anlatan günlük" olduğuna karar
  vermek sınıflandırma değil YARGIDIR; makine tanımı yoktur ve uydurma bir desen yanlış UYARI
  üretir. Düşerken F3 metninden de silinir — yazılı ama ölü kural, boşluktan pahalıdır.
- **Muafiyet cümleleri yeniden yazılır.** Tarifteki eş cümle adım 4 kırpmasında silindi;
  `00_genesis/OTONOM_DONEM_KALIBI.md` risk-bloğu bölümünün "içerik-sınıfı denetimi uygulanmaz"
  cümlesi — **var olmayan bir denetimden muafiyetti** — adım 5'te gerçek denetime bağlandı
  (tavan gözü düşer · kural-atıf gözü muaf tutar · şema gözü biçim tartar).

## 6 · Üç çelişkinin hükmü

**① `SENDE_BEKLEYEN` tavanı: 10KB kazanır — KAPANDI.** Hüküm günü şablonda iki sayı vardı ve
ikisi de testliydi: `00_genesis/EL_KITABI_KALIBI.md` F3 **10KB** (`test/cevap-kanali.test.mjs`
"kuyruk tavanı 10 KB" testi çapalıyor) · tarifin kırpma-öncesi gövdesi **2KB**
(`catal-kuyruk.sh` + `test/catal.test.mjs` o gün 2KB'ı çapalıyordu). Gerekçe: bu dosyanın
maddeleri **SİLİNMEZ** (EL_KITABI F1 istisna 2), yani tekdüze büyür; silinemeyen bir dosyaya
dar tavan koymak tasarım hatasıdır ve `catal-kuyruk.sh`'ın kendi yorumu bunu ölçmüş ("birkaç
çatal dosyayı sarıya itebiliyordu"). Ayrıca 10KB, bekçinin fiilen okuduğu yoldur (tavan
sayıları ayardan gelir, F3 sahibin ilanı). Uygulandı: 2KB satırı adım 4 kırpmasıyla silindi;
`catal-kuyruk.sh` yorumu + `catal.test.mjs` başlığı adım 5'te 10KB'a çekildi.

**② Tavan birimi: BAYT.** Satır ölçen iki bekçi yanlıştı (§5④).

**③ Var olmayan denetimden muafiyet: denetim yazılarak kapanır** (§5⑤).

## 7 · İlan edilmiş sınırlar — örtülmez, adıyla yazılır

- **Paket yalnız YENİ kurulumlara ulaşır.** Kurulu bir projeye çekirdeği taşıyan mekanizma
  yoktur; güncelleme töreni ayrı iştir. "Sabit çekirdek güncellenebilir" bugün bir yetenek
  değil, o törenin vaadidir.
- **Kokpit çekirdeği açamayacak.** Çekirdek `.sh` olmaktan çıkarsa sahip denetim kodunu
  kokpitten okuyamaz. Karşılığı bu dosyadır.
- **Ölçülemeyen gözler adıyla sayılır:** `watchdog`/`launchctl` ve `kanal` gözleri makine
  durumuna bağlıdır; test ortamında koşmazlar. "Hepsi kapsandı" denmez.
- **Damga sınırı:** kadran ve teyit damgalarını kuran ajan yazar. Ölçülen şey "beyan edildi
  mi"dir; "gerçekten yapıldı mı" repo içinden kanıtlanamaz.
- **Ayar dosyası `[SORULUR]`dur, yani sahip onayıyla değişir** — bu bir esneme yeridir ve
  bilinçlidir. Zorunlu kümenin ayardan korunması (§0) bu esnemenin sınırıdır.

## 8 · Kabul — bu sözleşme ne zaman "uygulandı" sayılır

1. Beş dosya kurulu: çekirdek + sarmalayıcı + iki VERİ evi + ayar (§0).
2. **En az sekiz kasıtlı bozma yazıldı ve sekizi de kırmızı.** Test oracle'ı
   `warnings.length === 0` **DEĞİLDİR** — kokpit gerçek bozulmada sıfır uyarı basabiliyor;
   oracle makine satırının alanlarıdır.
3. Her göz için pozitif VE negatif vaka var; test çekirdekle **aynı commit'te** yazılır.
4. İki kopya (geliştirme aslı + dağıtım) bayt-eş.
5. Ayrı hasım turu koşuldu.
