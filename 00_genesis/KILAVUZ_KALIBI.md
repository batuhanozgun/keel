<!-- KILAVUZ KALIBI (G5.0): sahip kılavuzunu kökteki NASIL_KULLANILIR.md'ye KOPYALA,
     «alanları» doldur, bu yorum bloğunu SİL. Alanlar:
       «PROJE-ADI»        = projenin adı
       «EKİP-LİSTESİ»     = her kadro rolü için TEK satır: "- **<Ad>** — <ne işe bakar> · `/rol-<slug>`"
       «PO-SLUG»          = ürün sahibi rolünün slug'ı (fikir/şikâyet/demo muhatabı)
       «KOORDİNATÖR-SLUG» = koordinatör rolünün slug'ı (süreç/sıra/takılma muhatabı)
       «KOKPIT-PORT»      = kokpit portu (G5.0b'de config'e yazdığın değer; varsayılan 4173)
     DERLEME YOK: metin BU KALIPTA yaşar, adım dosyasında değil. Kural eklemek/çıkarmak
     kalıbı düzenlemektir — serbest derleme iki kurulumda tarif-buharlaşması üretti
     (EL_KITABI_KALIBI emsali, G3.1). Kalıbın kendisini bir projeye özel doldurma.
     Bu dosya SAHİP YÜZEYİDİR: jargon yasak. İKİ cins kusur var (K18, 2026-08-07):
     (a) KEEL sözlüğü — ürünün iç adları; bu metne GİRMEZ.
     (b) TANIMSIZ ÖZEL ANLAM — gündelik Türkçe görünen ama burada özel anlam taşıyan
         kelime. Yasak listesi bu cinsi yakalayamaz, çünkü kelime zaten Türkçedir.
     Hüküm: sahip dilinde karşılığı VARSA çıkarılır ve yasak listesine eklenir; ürünün
     gerçek kavramıysa (sahip onu PANO'da AYNEN görüyorsa) çıkarılmaz, ilk geçtiği
     `## ` bölümünde TANIMLANIR. Liste buraya KOPYALANMAZ — iki yerde yaşayan liste
     sürüklenir; tek evi tools/guard/test/otonom-dosyalar.test.mjs (SAHIP_YASAGI ·
     TANIM_CAPALARI) ve üçünün de kasıtlı bozması orada kırmızı basar.
     Tavan: 5.760 B + MARJ FRENİ 500 B (ölçen: tools/guard/test/otonom-dosyalar.test.mjs;
     5.632 -> 5.760 (K2, 2026-08-07): 13. bölüm «## Sen yokken çalışması» ZORUNLU kalem olarak
     eklendi — kılavuz otonom kipten sıfır satır söz ediyordu. Sıkıştırma ÖNCE koşuldu, bölüm
     640 -> 452 B'a indi ve frene 4 B kaldı; dördüncü bayt için sahibe bakan cümleyi budamak
     tavanın işi yönetmesi olurdu. Gerekçenin ikinci evi testin TAVANLAR sabitidir, ikisi eş olmak zorunda;
     ilk yazımda 7.168 B kondu ve hasım turu haklı çıktı: ölçüm 4.6 KB idi, yani 2,5 KB serbest
     büyüme demekti — "kaçış yolu olmasın" ilanı mekanik olarak tutmuyordu. Sayı kardeşlerinin
     marjına (513 B · 621 B) çekildi;
     kurulu bekçiye girmez). Bu içerik 2026-07-30'da (Faz 2 sıra 6) `adimlar/G5.md`'nin
     içinden buraya çıkarıldı: bir ADIM dosyası, ÜRETİLEN bir dosyanın içerik sözleşmesini
     taşıyordu ve ~4,5 KB'ıyla kurulum tarifinin toplam tavanının asıl büyüme sebebiydi.
     Çıkarma bir kaçış yolu OLMASIN diye kalıp kendi ölçülen tavanını taşıyor. -->
# «PROJE-ADI» — nasıl kullanılır

Kurulum bittikten sonra da günlük kılavuzun budur.

## Ekibin

«EKİP-LİSTESİ»

En çok muhatabın iki rol: fikir/şikâyet/demo → `/rol-«PO-SLUG»` · süreç/sıra/takılma →
`/rol-«KOORDİNATÖR-SLUG»`.

## Günlük döngü

1. `00_pano/PANO.md`'yi aç.
2. **"SIRADAKİ OTURUM: <rol>"** satırını gör.
3. Proje klasöründe yeni bir sohbet penceresi (oturum) aç.
4. `/rol-<rol>` yaz.
5. Açılış çıktısı **"ROL AÇIK"** deyince `devam` yaz.

Rolü **sen** açarsın; ekip kendi rolünü açamaz — bu kilit bilinçlidir. Rol değiştirmek yeni
oturum ister.

## Sen yokken çalışması

Ekip sen uyurken de çalışabilir. Başlatmak: `/donem` (tek iş varsa
onunla başlar, çoksa sorar) · bitirmek: `/donem kapat`.

**Senin onayın olmadan başlamaz** — o paketin onay satırı boşken makine reddeder; nezaket
değil, mekanik kilit. Bir karara ihtiyacı olursa **durur ve sana haber verir**, uydurmaz;
sabah o gecenin özeti önüne gelir. Bunun için e-posta bildirimi ve "yapı susarsa seni uyaran
nöbetçi" kurulmuş olmalı; kurulmadıysa bu biçim hiç açılmaz ve ekip sebebini söyler.

## İlk işin

Ekip ilk işte sana bir **plan** çıkaracak: bu proje ne zaman bitmiş sayılır · sıradaki işlerin
adı ve sırası · neleri bilmiyoruz (her satırda cevabın kimden geleceği yazılı) · hangi bilginin
nereye kaydedileceği. **Kod bundan sonra yazılır.**

## Nerede sen dahilsin

Bir işin **başında** onay, **sonunda** onay. Arada ürün sahibiyle sohbet ve sana gelen
"itiraz eder misin" davetleri. Arası ekibin işidir.

## Sonunda önüne gelecek paket

Kapanışta **dört şey** gelir: (1) başlangıçta söz verilen "gözünle göreceklerin"in nasıl
gösterileceği, (2) sağlık ışıkları ve son ölçüm tarihi, (3) denetleyenin hükmü,
(4) dış gözün brifingi. **Dördünden biri eksikse onaylamayın** — eksik paket geçersizdir.
Sana teknik bir soru soran paket hatalıdır: *"bunu denetleyene sor"* de. Teknik kanıtı
SEN değerlendirmezsin; paketin tam olmasına bakarsın.

## Her kapanışın üç başlığı

**BİTEN · SENDE BEKLEYEN · SIRADAKİ.** Orta satır ya "YOK" der ya "N madde" + numaralı sorular;
her madde dördünü söyler: neden soruluyor · seçimin neyi değiştirir · geri dönüşü var mı ·
itiraz etmezsen ne olur.

Maddeler `00_pano/SENDE_BEKLEYEN.md` listesine kendiliğinden düşer ve **silinmez**: cevaplayınca
işaretlenir, tarih ve cevabınla orada kalır. Yeni oturum açılışında *"sende bekleyen N madde"*
bilgi satırını görürsün — ısrar etmez, hatırlatır. İstediğin an **"bekleyenleri göster"** dersen
ekip listeyi sade dille okur; **"aksiyon alma, anlat"** dersen hiçbir dosyaya dokunmadan anlatır.

## Dış göz — senin koltuğun değil, senin için duran koltuk

Ekipte iş yapmayan, hiçbir dosyaya dokunmayan, yalnız SANA konuşan bir koltuk var. İşi tek şey:
**durum brifingi** — ne yapılıyor · neden · bu normal mi · sırada ne var + senden ne istenecek.
Sapma yazarsa arkasına kanıt satırı koymak zorundadır; bakamadığı yeri de yazar.

İstediğin an **"durumu anlat"** dersen açılır ve brifingi getirir; **iş kapanışında
brifing zorunludur** (paketin dördüncüsü). Uzun süre brifing yazılmamışsa oturum açılışında tek
satır hatırlatma görürsün — ısrar etmez.

Ekibin denetleyeni işin doğru yapıldığını kanıtlar; **dış göz senin doğru şeyi onayladığını
kontrol eder.**

## İş verirken 4 soru kartı (60 saniye)

1. Bitince neye bakıp "tamam" diyeceğim?
2. Ekip "iyi görüneyim" diye fazladan ne ekleyebilir — **bunlar YOK**.
3. Bu iş hangi kararı besliyor?
4. Çıktı en fazla ne kadar?

Bulanık bıraktığın her yeri ekip "kapsamlı görünme"yle doldurur.

## Ara sıra sana iki kontrol sorusu gelebilir

*"Sahte seçenek menüsü gördün mü?"* ve *"sana taşınan karar gerçekten senin miydi?"* — dürüst
cevabın ekibin en sinsi iki hatasını yakalar.

## Tek ezberin

`00_pano/SAGLIK.md`'deki tarih damgası **yoksa ya da bir günden eskiyse sistem KIRMIZI'dır.**

## Tek ekrandan izleme

`tools/kokpit`'i çalıştırınca tarayıcıda tek ekranda sağlık ışıkları · sıradaki adım · açık işin
maddeleri · roller görünür. Açmak: `launcher/Kokpit.command`'i Masaüstüne kopyala + çift tıkla,
ya da `cd tools/kokpit && npm start` → `http://127.0.0.1:«KOKPIT-PORT»`. **Salt-okunur** —
hiçbir şeye dokunmaz. İçindeki **"nasıl kullanılır"** düğmesi bu dosyayı gösterir.

## Düşman-gözü incelemesi (isteğe bağlı)

Büyük bir iş onayına gelmeden önce `/hasim-inceleme` yazarsan ekip, işi birbirinden bağımsız
birkaç açıdan tarar ve bulduklarını çürütmeye çalışır. Uzun sürer ve pahalıdır; küçük işte
gerekmez — koordinatör gerektiğinde önerir.
