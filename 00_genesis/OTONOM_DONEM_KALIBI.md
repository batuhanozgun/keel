<!-- OTONOM_DONEM KALIBI (E1, 2026-07-27): otonom kipin kural evi. Kurulu projede hedef yol
     02_kanon/OTONOM_DONEM.md (korunma [SORULUR]). KURULUM ADIMI: G3.3f — kurulum bu dosyayı
     kendisi kurar (Faz 2 sıra 6, 2026-07-30; o güne dek ELLE kopyalanıyordu ve kurulumdan
     çıkan projede YOKTU). Varlığını iki kapı arar: çekilme kapısı (kurulum-denetimi 7d) ve
     otonom döneme girecek her kutu için kurulum kapısı (E4).
     Kalıp metni SABİTTİR: kopyala, «alanları» doldur, bu bloğu sil. Alanlar: «SAHİP».
     EL_KITABI'na TEK HARF eklenmez (marj 44B; tavan sorusu sahibe gitmeden ek giremez) —
     otonom kural evi BU dosyadır. Keşfi ÜÇ yoldan: sevkin devir metnindeki `kural:` işaretçisi ·
     rolün alt-ajan koltuğundaki açılış okuma listesi (G3.3e) · rol sözleşmesinin "Açılış
     ek-okumaları" satırı. İlk ikisi mekaniktir, üçüncüsü serbest metin.
     Tavan: 17.920 B + MARJ FRENİ 500 B (şablon testi tools/guard/test/otonom-sim.test.mjs
     17.664 -> 17.920 (K3 hasım turu, 2026-08-07): açılış mührü HER kutunun zorunlusu oldu ve
     bu sözleşmede yazılı olmak zorunda — hasım bulgusu, kapı her kutuya işlerken satırın evi
     yalnız ilk kutunun kalıbıydı, yani KT-002 duvara çarpardı. Metin önce asgariye indirildi
     (700 -> 200 B); dosya zaten marjın dibindeydi, yani HERHANGİ bir ekleme beyan istiyordu.
     Artış 256 B; ikinci ev otonom-sim.test.mjs'in TAVANLAR sabitidir, ikisi eş olmak zorunda;
     ölçer; kurulu bekçiye girmez — F3 tablosu EL_KITABI'nda ve ona dokunulmuyor).
     ALTINCI ARTIŞ (2026-07-31, SAHİP KARARI): 17.408 → 17.664 (+256 B). Sebep tek bir kural:
     sahibe giden üç satır SADE, GÜNDELİK ve KISA olacak (§6.6; bayt tavanları kapıda mekanik,
     kapı kırpmaz geri çevirir). Kararı sahip verdi — kuyruk tavanı 2KBdan 10KBa çıkarılırken
     "asıl çözüm tavan değil kalem" dedi. Metin ÜÇ kez sıkıştırıldı (yeni bloğun kendisi
     kaldırıldı ve kural, sahibin dilini zaten düzenleyen §6.6ya eklendi; §6.7 de kısaltıldı);
     artış ondan sonra kalan. Yeni marj 687 B.
     BEŞİNCİ ARTIŞ (2026-07-30, Faz 2 sıra 8 · cevap kanalı): 16.640 → 17.408 (+768 B).
     Sebep yine ek KURAL: (i) zarfa isteğe bağlı SEÇENEKLER alt-alanı ve biçimi (§4) ·
     (ii) §6ya 7. madde — uzaktan cevabın üç şartı, "cevap bir indekstir" ilkesi, kapanış
     evresi istisnası ve "kapanmış dönemi açmaz" sınırı. Metin ÖNCE sıkıştırıldı: paketin
     kendi eklemesi 1.350 Bden 791 Be indirildi (%41) ve §6nın mekanik listesi kısaltıldı;
     artış ondan sonra kalan. Yeni marj 530 B. Tavan kararı danışmanındır (bu dosya sahip
     yüzeyi değildir), beyanı paketin raporundadır.
     ÖNCEKİ ARTIŞLAR (tek satır; gerekçeleri git geçmişinde ve paket raporlarında):
     12.288 → 14.336 (E3, 2026-07-27, dört evre) · → 14.464 (2026-07-29, dil paketi: sebep
     kural değil kelime uzunluğuydu) · → 14.848 (sıra 5, `LİSTE:` satırı) · → 16.640 (sıra 7,
     üç evre + `İZİN:` + bütçe düzeltmesi + kapanış gözleri).
     Sayı her seferinde bir TAHMİNDİR; marj freni onu sessizce kaydırılamaz kılar: 500 Bnin
     altına inecek ek, tavan kararını YENİDEN aldırır. Bu dosya sahip yüzeyi DEĞİLDİR (karar
     alanı çizgisi madde 8: yapının kendi işleyişi sahibe soru değildir) — karar danışmanındır,
     beyanı paketin raporundadır. İlk gerçek retroda ölçümle kalibre edilir. -->
# OTONOM DÖNEM — otonom kipin kuralları

Bu belge yalnız **otonom dönem** kipinde devreye girer; el-sürüşlü günlük döngüyü (rol töreni,
D1-D9, F1-F8) DEĞİŞTİRMEZ. Otonom dönem ek bir kiptir: mevcut çalışma biçiminin yerini almaz.

## 1 · Dönem tanımı

**Dönem** = sahibin («SAHİP») tek dokunuşla (`/donem`) başlattığı, mühürde ya da duran kapıda
biten sahipsiz çalışma dilimi. Dönemi başlatan HER ZAMAN sahiptir; zamanlayıcı/kendi kendine
başlama YOKTUR (D-25 ①'in sınırı — 3. basamak tasarımın hiçbir yerinde yok). Dönem içinde
görevleri yapı açar-kapatır: her görev (G-NN) **taze hafızalı bir alt-ajan çağrısıdır**; rol
alt-ajan dosyasına `memory` alanı yazılmaz (zorunlu unutmanın ölüm noktası — kurulum denetimi
KIRMIZI basar). Döngü: sevk görevi seçer → alt-ajan çağrısı → dönüş zarfı → SubagentStop biçim
kapısı → sevk karne/görev koşullarına bakar → sıradaki.

**Dönem ÜÇ EVRELİDİR ve evre geçişi için tuş gerekmez:** ÜRETİM (görevler işlenir) → açık üretim
görevi kalmayınca göstergenin tür alanı yerinde `kapanis` olur ve üretim kilitlenir → KAPANIŞ
(dış göz brifingi + bağımsız kapanış karnesi). Karne YEŞİL ise dönem biter, **kapanış mührü
sahibindedir**; KIRMIZI ise tür yerinde `yapim`a döner, karnenin `BULGU-GOREV` satırında yazılı
görev sevk edilir ve bulgu kapatılır (en çok **2 gidiş-dönüş**, sonra dönem kapanır).

**Dönem dört hâlden biriyle biter:** kapanış karnesi YEŞİL (mühür bekler) · duran kapı
(çatal/mühür/gidiş-dönüş tavanı) · bütçe tavanı doldu · bekçi KIRMIZI'sı ya da DUR işareti.
**İzin penceresi (`ask`) bunlardan biri DEĞİLDİR — otonom dönemde HİÇ AÇILMAZ (§2 İZİN):**
kutunun izin listesinde yazmayan sınıf engellenir, o adım ATLANIR, zarfın İZİN-ENGELİ satırına
düşer ve sahibin kuyruğuna not gider; dönem sürer. Pencere açıp insan beklemek, tanım gereği
otonomluğun bittiği andır.

**Dönemi durduran KIRMIZI'lar sayılıdır:** bekçi KIRMIZI'sı (`durduran>0`) · zarf günlüğü
bütünlük KIRMIZI'sı. **Bekçinin KİLİT bulguları bunlardan DEĞİLDİR** (tavan 1,5× · bayat dış
göz brifingi; tam liste sözleşmede): kapanış kilididir, duran kapı değil (F3'ün aynısı). SARI
hiçbir yerde durdurmaz; kapanış bloğuna yazılır.

## 2 · Duruş sözleşmesi (kutu kurulumuna beş zorunlu satır)

**Açılış mührü (K3):** her kutunun `KUTU.md`'si bu bloktan ÖNCE `**Açılış mührü:** bekliyor`
satırını taşır (mühür gelince `<ad> · YYYY-AA-GG`). Mührü **sahip** verir; mühürsüz kutuya
`donem-ac.sh` dönem AÇMAZ ve `kurulum-kapisi.sh` satırın yokluğunu EKSİK basar.

Otonom döneme girecek her kutunun `KUTU.md`'sinde `## Duruş sözleşmesi` bloğu:

```
BİTİŞ HÂLİ: <gözlemlenebilir; "bu kutu bitince gözünle göreceklerin" ile eş>
KANIT:      <hangi komut koşulur, hangi çıktı görülür — kanıt-komutu zarfı emsali>
KISIT:      <neye dokunulmaz — golden İÇERİK cinsleri dahil (yalnız yol değil)>
BÜTÇE:      <dönem başına en çok N ÜRETİM çağrısı · ilerleme-yok eşiği · toplam dönem tavanı>
İZİN:       <önceden serbest sınıflar; hiçbiri gerekmiyorsa: yok>
LİSTE:      <yalnız planlama kutusunda; değeri BİREBİR: dönem içinde doğar>
```

- **Bitti tanımı iki iş yapar (K-H):** ne içeri girer + ne zaman biter. Dönem içinde doğan her
  yeni iş bu süzgeçten geçer: *bitti tanımına hizmet ediyor mu?* — tek satır beyanla görev
  tablosuna girer; etmiyorsa ERTELENENLER'e. Yazılmamışsa kurulum denetçisi kurulumu geçirmez.
- **BÜTÇE = "sahip bakmadan en fazla ne kadar şey kurulabilir"** (K-G) — kontrol vidası, para
  değil. **Yalnız ÜRETİM çağrılarını sayar:** görev sevki ve kapanış bulgusunun düzeltmesi.
  Doğrulama, çatal süzgeci, brifing ve kapanış denetimi bir şey KURMAZ; onların freni tur tavanı
  ve gidiş-dönüş tavanıdır. Sayı en az **kadro + 1** olmalıdır (G-01 + her role bir görev).
- **İZİN = sahibin kutu açılışında verdiği önceden-izin listesi.** Kapalı sözlük: `git-obje` ·
  `disa` · `mcp` · `yazim` · `korumali-yol` ([SORULUR] yol, golden dahil) · `kutu-ciktilari`
  (`BITTI_TANIMI.md` · `KUTU_PLANI.md`); hiçbiri gerekmiyorsa `yok`. **Kural evi (`00_genesis/` ·
  `OTONOM_DONEM.md` · `KARAR_ALANI.md`) ve yapının damga/işaret dosyaları HİÇBİR ZAMAN önceden
  verilemez** — izin listesi bir esneme yeridir, kafesin anahtarı değil.
- **LİSTE (beşinci, seçimli):** yalnız görev listesi dönem İÇİNDE doğan kutuda yazılır. İki
  fren ona bağlı: şişme çapası liste doğana dek çakılmaz (yoksa plan doğar doğmaz alarm çalar) ·
  görev tavanı 5 değil, iş zincirindeki rol sayısı + 1 olur. Değer kayarsa kutu sessizce sıradan
  kutuya döner; kurulum kapısı bu yüzden değeri EŞLER.
- **Mükemmeliyetçilik freni:** "hiç eksik kalmasın" dönem hedefi DEĞİLDİR. Hedef duruş
  sözleşmesidir: bitiş hâli + kanıt + yeşil karneler → kutu kapanışa gider; "bu kadarı yeter"
  hissi sahipte kalır (kapanış mührü onun).

## 3 · Bağımlılık ve risk bloğu (KUTU.md içinde; kokpit bu bölümü atlar)

```
## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)
G-12: onkosul=G-07 G-08 · risk=riskli — <tek satır gerekçe>
G-13: onkosul=yok · risk=düşük — <tek satır gerekçe>
```

Blok MAKİNE-OKURDUR; muafiyeti bekçi çekirdeği uygular (sözleşme): tavan gözü bloğu
başlığıyla KUTU ölçümünden düşer, kural-atıf gözü muaf tutar, şema gözü biçim tartar — üçü de
testli (ölçülmüş karar: 25 görevlik blok 2,9KB; oturum-günlüğü emsali).
Risk satırlarını kurulum oturumu taslaklar, **kurulum denetçisi bağımsız gözden geçirip kendi
hükmünü yazar** (kuran kendi işine risk notu veremez); uyuşmazlık kurulum bulgusudur.
`risk=riskli` → görev `isolation: worktree` ile koşar ve doğrulayıcı yeşili gelmeden çıktısı
ana ağaca geçmez; düşük-riskli yazan görevde de doğrulayıcı yeşili gelmeden commit atılmaz.
**F8 köprüsü (beyanlı istisna):** doğrulayıcı KARNESİ commit-ÖNCESİ içerik gözüdür ve kirli
ağaçta koşar — aksi kilitlenme olurdu (commit doğrulamasız atılamaz + doğrulama commit'siz
yapılamaz). F8'in "doğrulama commit'li YEŞİL REF'e" kuralı kutu-KAPANIŞ doğrulamasında
(denetçi/bekçi) aynen sürer; karne onun yerine geçmez, önüne eklenir.

## 4 · Dönüş zarfı (alt-ajan çağrısı → sevk iç kanalı; kapanış bloğunun YERİNE GEÇMEZ)

Her alt-ajan çağrısı dönüşünü şu adlı listeyle bitirir — **6 üst alan; ÇATAL doluysa 3
alt-alan zorunlu + SEÇENEKLER isteğe bağlı** (SubagentStop biçim kapısının kanonik sayımı):

**Her etiket AYRI satırın BAŞINDA yazılır** (biçim kapısı satır-içi etiketi okumaz — mekanik sınır):

```
BİTEN:      G-NN — <tek cümle> · kanıt: <dosya:satır | commit>  (riskli görevde commit YASAK)
ÇATAL:      yok | dolu — dolu ise üç zorunlu alt-alan, her biri AYRI satırda:
ÇEVİRİ:     <sahip dilinde tek cümle>
ETKİ:       <cevaba göre ertesi sabah ne değişir · yanlışsa bedeli · geri dönüşü>
BEKLETİR:   <bu cevaba bağlı görevler — K-B>
SEÇENEKLER: 1) <sahip dilinde tek cümle> 2) <…>   | açık-uçlu — <gerekçe>   (İSTEĞE BAĞLI)
DEĞERLENDİRMEDİKLERİM: <tam tartılmayan boyutlar> | yok   (BOŞ BIRAKILAMAZ — "yok" açık yazılır)
SIRADAKİ:   <rol/G-NN önerisi> | kapalı
TÜRETME-İZİ: yok | "sormadım çünkü VIZYON/karar <satır>"
GERİ-ÇEKİLEN: yok | <dönem içinde açılıp geri çekilen çatal/karar — tek satır iz>
```

- **SEÇENEKLER:** yazılırsa 2-4 seçenek, sahip dilinde. **Yokluğu red sebebi değildir** — o
  çatal klavye-yalnız kalır.
- **Koşullu 7. satır — İZİN-ENGELİ:** izin engeli yaşandıysa (§2 İZİN) zarfa
  `İZİN-ENGELİ: <ne engellendi>` yazılır; kapı bunu transkriptten ÇİFT kaynakla doğrular —
  yaşanmışken yazılmamış zarf geri döner. Engellenen adım ATLANIR; iş durmaz.
- Zarf ekrana değil **diske** düşer: `00_pano/zarf-gunlugu.jsonl`. Günlüğe append eden TEK
  betik `tools/sevk/zarf-ekle.sh`'dir (fail-closed, şema denetimli, kilitli append); kancalar
  doğrudan yazmaz. Güvence katmanları ayrık: günlük araç katmanında [SERT] (Edit/Write
  kesilir) · bozuk/yarım satır bekçide KIRMIZI + dönemde duran kapı · şema-GEÇERLİ sahte satıra
  karşı mekanik yakalayıcı YOK — bilinen sınır, süreç disiplini (E2+ adayı).
- **Dönem-AÇIK göstergesi** `tools/sevk/.donem-acik`tir (1. satır: kimlik · kutu · evre · sınıf;
  2. satır damga; yazarı `/donem`, evresini değiştiren ve silen sevk). Git-izlenmez; güvencesi
  bekçi değil **dönem dikişidir**: göstergeye dokunan Bash komutu dönemde ENGELLENİR. Bozuk
  gösterge (dizin/boş kimlik) biçim kapısında fail-closed'dur — "dönem yok" sayılmaz.
- **Dönüş mekaniği:** çatal cevabı ya da kapı düzeltmesi gelince rol TAZE çağrıyla sürer;
  aynı alt-ajan sürdürülmez. Durum dosyada yaşar, hafızada değil.
- **Tur-tavanı şüphesi:** `maxTurns` kesmesi İŞARETSİZDİR (E0 ölçümü); zarfsız dönüş "bitti"
  sayılmaz, bölünme adayıdır (mekaniği `tools/sevk/README.md`).

## 5 · SubagentStop biçim kapısı + beyaz liste

Kapı (`tools/sevk/zarf-bicim-kapisi.sh`) yalnız BİÇİM denetler, içerik doğruluğu içerik
gözlerinindir. **Beyaz liste kuralı (E0 hayalet bulgusu, 2026-07-27):** kapı yalnız
`agent_type` DOLU ve kadroda kayıtlı (`.claude/agents/<ad>.md` mevcut) dönüşlerde zarf arar;
aksi hâlde sessiz geçirir ve günlüğe satır DÜŞÜRMEZ — harness'in kendi iç ajanları (boş
`agent_type`, diskte olmayan transkript, Stop'tan SONRA gelebilen olay) rol dönüşü DEĞİLDİR.
Sevk, Stop anında "tüm dönüşler geldi" varsayamaz. *Ders: kapı hayaleti rol sanınca kapı
metni harness ajanının çıktısına sızdı — ölçüldü (E0 §6.1).*

## 6 · Sessizlik onay değildir (çatal genişletmesi; mühür kuralının kardeşi)

Muğlak-mesaj kuralı (EL_KITABI, mühür ritüeli) çatal cevaplarına da genişler. **Hangi soru
sahibe gider:** `02_kanon/KARAR_ALANI.md` (Bölüm A soru çizgisi · Bölüm B sahip profili).
Dosya yoksa ya da profil boşsa **çatal sahibe gidemez** — soru kanalı kapalıdır.

1. Sahibe giden çatal `SENDE_BEKLEYEN` kuyruğuna düşer, durumu **CEVAP-BEKLİYOR**; yalnız
   sahibin açık cevabıyla **CEVAPLANDI** olur. Zaman aşımı, yeni dönem, "itiraz gelmedi" —
   hiçbiri durumu değiştiremez. `[x]` işareti tek başına da yetmez: boş cevap · "anlamadım"
   sınıfı · sorunun yankısı → madde AÇIK kalır.
2. **"Anlamadım" = çatal soruyu getirene döner** (çeviri kusuru); rol düzeltip yeniden
   getirir, kararı basamaz. Eski madde SİLİNMEZ (D-21) ama kilidi yeni maddeye **devreder**:
   satırına `devretti: Ç-NN` yazılır — yoksa bağlı işler sonsuza dek kilitli kalır.
3. **Cevap-eşleşme + İNAT:** soruyla eşleşmeyen cevap CEVAP DEĞİLDİR. Mekanik yalnız üç kaba
   dalı tutar; gerisi rolün ve çatal denetçisinin işidir (beyanlı sınır).
4. CEVAP-BEKLİYOR çatalın `BEKLETİR` görevlerini sevk AÇAMAZ; bağımsız işler koşar. İkinci hat
   biçim kapısıdır: o görevin dönüşü red alır.
5. **Çatal sahibe gitmeden yazamaz bir gözden geçer:** `catal-denetcisi` çağrısı (beş kalem,
   sözleşmesi kendi dosyasında). Hükmü GEÇTİ/DÖNDÜ'dür ve **metni yeniden yazamaz** — sahip
   cümlesi zarfın günlük kaydından mekanik alınır (§9). DÖNDÜ izini dış göz okur.
6. **Sahibin bilmediği kelime kırmızıdır:** çeviride karar/görev numarası, dosya adı ya da yol
   geçen çatal kapıdan döner. **Benzetme ve uzunluk da öyle** — sahibe giden üç satır sade,
   gündelik ve kısadır (≤200/240/120 B); kapı kırpmaz, geri çevirir. *Ders: sahip anlamadığı
   soruya "olur" der; okumadığı açıklamaya da.*

7. **Uzaktan cevap (kanal açıksa):** posta tek-kullanımlık kimlik çapası taşır; sahip yanıtlayıp
   **yalnız seçenek numarasını** yazar. Kuyruğa yazılan cümle sahibin değil **yapının kendi
   seçeneğidir** — gelen tek şey bir indekstir (serbest-metin yasağının simetriği). Kod üç
   şartla doğar: kanal açık · `UZAKTAN` uygun · SEÇENEKLER sayılabilir; kapanış evresinde
   doğmaz. Uzaktan cevap kapanmış dönemi **açmaz.**

Mekanikler: `karar-alani.sh` · `catal-kuyruk.sh` (durum + ekleme + `--cevapla`: kuyruğa yazan
TEK betik) · `nabiz.sh` (uzaktan cevap; dönem kapısının dışında) · biçim kapısı.

## 7 · Sır-cinsi ilkesi + Bash-yazım kuralı (önleme — mekaniği KURULU, E2)

- **"Git'te geri alınır" kişisel veri/sır cinsinde güvence DEĞİLDİR.** Bu cinsin tek
  güvencesi hiç yazılmaması ya da tek atılabilir kopyada kalmasıdır. Worktree ayrı depo
  değildir (ortak nesne deposu — E0 ölçümü): **riskli görevin worktree'sinde obje üreten git
  komutları (commit/add/stash) YASAKTIR; kanıt yalnız `dosya:satır`.**
- **Otonom dönemde dosya yazımı esasen yazma araçlarıyla yapılır;** Bash'le dosya yazımı
  (yönlendirme, heredoc, `tee`/`cp`/`mv`) doğrulayıcı/bekçi bulgusudur (içerik süzgeci
  desen-kaçırmaya açıktır — tek hat değil üç hattın ilki).
- **Serbest-metin yasağı (dışa giden):** e-posta/haber gövdesi yalnız zarfın ve kapanış
  bloğunun tanımlı alanlarından kurulur; serbest metin eklenmez. Her gönderim önce içerik
  süzgecinden geçer; süzgeç red verirse gövde GİTMEZ (sansürlü sabit-şablon alarm gider).
- **E2 mekaniği:** `tools/guard/icerik-suzgeci.sh` (+işaret listesi) yazım-öncesi keser —
  Edit/Write/Bash-yazımı ve MCP içeriği (her kanalda fail-closed, node yokken de). git-obje ·
  dışa-giden el-sürüşlü SORULUR; MCP yalnız korumalı yol anarsa. Dönemde §2 İZİN listesine
  bakılır ama **izin YOL hükmünü ezemez**; worktree'de git-obje hep ENGEL, harita aynen kurulur.

## 8 · Aynı-model uyarısı

Model bağımsızlığımız YOK: bütün gözler aynı modelin kopyalarıdır ve birbirini endüstriyel
ölçekte onaylayabilir. Bağımsızlığımız **taze bağlam + yazma yetkisizliği**dir; bu sınır
yazılı kalır, "iki göz onayladı" iki BAĞIMSIZ kanıt sayılmaz (kanıt tür-bağımsızlığı kuralı).
Doğrulayıcıya `model:` denemesi E4'te maliyetiyle tartılır.

## 9 · Sahip-atfı kanıt şartı

Hiçbir rol "«SAHİP» şöyle dedi" beyanını kendi kaleminden yazamaz; sahip sesi yalnız zarf
günlüğü kaydının işaretçisiyle taşınır ("cevap: zarf-günlüğü #N"). İşaretçisiz sahip-atfı
denetçi/dış göz bulgusudur.

## 10 · Sevkin kapılanma şartları (kalkansız motor yok)

Tören ve sevk açılışta şunları arar; eksikte dönem HİÇ başlamaz ve sebep yazılır: dış göz
koltuğu (`03_roller/disgoz/` + `BRIFING.md` iskeleti) · dış gözün alt-ajan koltuğu
(`.claude/agents/disgoz.md`) · bu kural evi (`02_kanon/OTONOM_DONEM.md`) · sahibin karar alanı.
**Gerçek-kutu döneminde ek üç şart ÖLÇÜLEREK aranır:** watchdog fiilen yüklü · nabzı taze ·
haber kanalı canlı (kimlik doğrulaması ağa çıkar). Hepsi BU kurulumda ölçülür; şablonla gelen
"prova fişi" dosyaları kapı olmaktan çıktı — dolu geldikleri için baştan mühürlü geçiyorlardı.

## 11 · Sevk döngüsü ve kanal (E4-E5)

Tören: `/donem [kutu] [yapim|kurulum|kapanis] [gercek|tatbikat]` — kutu adı verilmezse açık kutu
aranır; tam bir tane varsa o seçilir. Sevk (Stop kancası) iş yapmaz, karar basmaz, görev
kapatmaz; işi seçer ve talimatı üretir. Mekaniği: `tools/sevk/README.md`. Seni bağlayanlar:

**Karne şartı (K2):** görev ancak tabloda `kapalı` + TAZE YEŞİL karne varsa kapalı SAYILIR
(taze = son iş-zarfından sonra). Kapanış karnesi de aynı kurala tabidir. **Kendi işine karne
yazamazsın.**

**Kapanış evresinin iki zorunlu gözü:** dış göz brifingi + kapanış karnesi. İkisinin de dönüş
biçimi kendi koltuk sözleşmesindedir (dış göz: beş `BRIFING-N` satırı, dosyayı biçim kapısı
yazar — koltuk yazamaz kalır; doğrulayıcı: KIRMIZI kapanış karnesinde `BULGU-GOREV: G-NN`).
Düzeltilecek görevi **hükmü veren göz** söyler; sevk görev İCAT ETMEZ ve o görevin satırı
yeniden AÇILMAZ — düzeltme aynı görevin altında yapılır, yeni karne kendiliğinden istenir.

**Devir metni yalnız işaretçidir** (`gorev · kutu · sozlesme · kural · ek-okuma`; tavan 800 B).
Serbest metin, `memory` alanı ve sevkin açmadığı (rol, görev) ikilisi çağrı anında kesilir —
iç içe alt-ajan da orada durur.

**Haber kanalı sana kapalıdır.** Dört olay vardır (dönem başladı · bitti · çatal bekliyor ·
alarm); gövde yalnız tanımlı alanlardan kurulur ve süzgeçten geçer. Kanalı çağıran yalnız
kancalardır — bir rol posta gönderemez, metnini de seçemez.

**DUR** koşan görevi kesmez, en geç o görev bitince işler: yeni alt-ajan açılmaz, dönem kapanır.
**Watchdog** sustuğunu haber verir, dönemi DİRİLTMEZ — yeniden başlatma sahibindedir.
