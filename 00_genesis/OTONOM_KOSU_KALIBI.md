<!-- OTONOM_KOSU KALIBI (E1, 2026-07-27): otonom kipin kural evi. Kurulu projede hedef yol
     02_kanon/OTONOM_KOSU.md (korunma [SORULUR]). KURULUM ADIMI HENÜZ GENESIS'E BAĞLI DEĞİL —
     GENESIS-derinleştirme işine dek bu kalıp ELLE kopyalanır (tasarım §13; otonom koşuya
     girecek her kutu için kurulum denetçisi bu dosyanın varlığını arar — E4).
     Kalıp metni SABİTTİR: kopyala, «alanları» doldur, bu bloğu sil. Alanlar: «SAHİP».
     EL_KITABI'na TEK HARF eklenmez (marj 44B; tavan sorusu sahibe gitmeden ek giremez) —
     otonom kural evi BU dosyadır; keşfi rol sözleşmelerinin "Açılış ek-okumaları" satırından.
     Tavan: 14.336 B + MARJ FRENİ 500 B (şablon testi tools/guard/test/otonom-sim.test.mjs
     ölçer; kurulu bekçiye girmez — F3 tablosu EL_KITABI'nda ve ona dokunulmuyor).
     Tavan E3'te 12.288'den çıkarıldı (2026-07-27): E1'in sayısı içerik yazılmadan seçilmişti
     ve dört evreye 658 B pay bırakıyordu; E3 sıkıştırma sınırına geldi (§6'nın beş-kalem
     listesi koltuk dosyasına bırakıldı — F3 "kural-atıf kopyası" sınıfı). Sayı yine bir
     TAHMİNDİR; marj freni onu bir dahaki sefere sessizce kaydırılamaz kılar: 500 B'nin altına
     inecek ek, tavan kararını YENİDEN aldırır. Bu dosya sahip yüzeyi DEĞİLDİR (karar alanı
     çizgisi madde 8: yapının kendi işleyişi sahibe soru değildir) — karar danışmanındır,
     beyanı paketin raporundadır. İlk gerçek retroda ölçümle kalibre edilir. -->
# OTONOM KOŞU — otonom kipin kuralları

Bu belge yalnız **otonom koşu** kipinde devreye girer; el-sürüşlü günlük döngüyü (rol töreni,
D1-D9, F1-F8) DEĞİŞTİRMEZ. Otonom koşu ek bir kiptir: mevcut çalışma biçiminin yerini almaz.

## 1 · Koşu tanımı

**Koşu** = sahibin («SAHİP») tek dokunuşla (`/kosu`) başlattığı, mühürde ya da duran kapıda
biten sahipsiz çalışma dilimi. Koşuyu başlatan HER ZAMAN sahiptir; zamanlayıcı/kendi kendine
başlama YOKTUR (D-25 ①'in sınırı — 3. basamak tasarımın hiçbir yerinde yok). Koşu içinde
görevleri yapı açar-kapatır: her görev (G-NN) **taze hafızalı bir alt-ajan koşusudur**; rol
alt-ajan dosyasına `memory` alanı yazılmaz (zorunlu unutmanın ölüm noktası — kurulum denetimi
KIRMIZI basar). Döngü: sevk görevi seçer → alt-ajan koşusu → dönüş zarfı → SubagentStop biçim
kapısı → sevk karne/kapı koşullarına bakar → sıradaki.

**Koşu dört hâlden biriyle biter:** açık iş kalmadı · duran kapı (çatal/mühür) · bütçe tavanı
doldu · bekçi KIRMIZI'sı ya da DUR işareti. **İzin kapısı (`ask`) bunlardan biri DEĞİLDİR —
iki dalda da koşuyu bitirmez (E0 ölçümü, 2026-07-27):** başsız kipte ask = anında red + iz
(görev raporlar, koşu sürer; engel zarfın İZİN-ENGELİ satırına düşer); **interaktif kipte ask
cevapsızsa koşu süresiz ASILI KALIR** — sahip klavye başında değilken tek çıkış
watchdog/DUR'dur (E5). Kip bilinçli tercihtir ve göstergenin 4. alanında yazılıdır (§11).

**Koşuyu durduran KIRMIZI'lar sayılıdır:** bekçi KIRMIZI'sı · zarf günlüğü bütünlük
KIRMIZI'sı. **KUTU tavan KIRMIZI'sı bunlardan DEĞİLDİR:** bugünkü davranışını korur —
kapanış kilididir, duran kapı değil (F3'ün aynısı). SARI hiçbir yerde durdurmaz; kapanış
bloğuna yazılır.

## 2 · Duruş sözleşmesi (kutu kurulumuna dört zorunlu satır)

Otonom koşuya girecek her kutunun `KUTU.md`'sinde `## Duruş sözleşmesi` bloğu:

```
BİTİŞ HÂLİ: <gözlemlenebilir; "bu kutu bitince gözünle göreceklerin" ile eş>
KANIT:      <hangi komut koşulur, hangi çıktı görülür — kanıt-komutu zarfı emsali>
KISIT:      <neye dokunulmaz — golden İÇERİK cinsleri dahil (yalnız yol değil)>
BÜTÇE:      <koşu başına en çok N alt-ajan koşusu · ilerleme-yok eşiği · toplam koşu tavanı>
```

- **Bitti tanımı iki iş yapar (K-H):** ne içeri girer + ne zaman biter. Koşu içinde doğan her
  yeni iş bu süzgeçten geçer: *bitti tanımına hizmet ediyor mu?* — tek satır beyanla kapı
  tablosuna girer; etmiyorsa ERTELENENLER'e. Yazılmamışsa kurulum denetçisi kurulumu geçirmez.
- **BÜTÇE = "sahip bakmadan en fazla ne kadar şey kurulabilir"** (K-G) — kontrol vidası, para
  değil. İlk koşularda küçük başlar (koşu başına 3 alt-ajan koşusu), veriyle gevşetilir.
  RAF'taki "Sert bütçe tavanı" (maliyet/zaman durdurucusu) AYRI kayıttır — birleştirilmez.
- **Mükemmeliyetçilik freni:** "hiç eksik kalmasın" koşu hedefi DEĞİLDİR. Hedef duruş
  sözleşmesidir: bitiş hâli + kanıt + yeşil karneler → kutu kapanışa gider; "bu kadarı yeter"
  hissi sahipte kalır (kapanış mührü onun).

## 3 · Bağımlılık ve risk bloğu (KUTU.md içinde; kokpit bu bölümü atlar)

```
## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)
G-12: onkosul=G-07 G-08 · risk=riskli — <tek satır gerekçe>
G-13: onkosul=yok · risk=düşük — <tek satır gerekçe>
```

Blok MAKİNE-OKURDUR: KUTU tavan ölçümünden düşülür, içerik-sınıfı denetimi uygulanmaz, şema
denetimi uygulanır (ölçülmüş karar — 25 görevlik blok 2,9KB; oturum-günlüğü emsali).
Risk satırlarını kurulum koşusu taslaklar, **kurulum denetçisi bağımsız gözden geçirip kendi
hükmünü yazar** (kuran kendi işine risk notu veremez); uyuşmazlık kurulum bulgusudur.
`risk=riskli` → görev `isolation: worktree` ile koşar ve doğrulayıcı yeşili gelmeden çıktısı
ana ağaca geçmez; düşük-riskli yazan görevde de doğrulayıcı yeşili gelmeden commit atılmaz.
**F8 köprüsü (beyanlı istisna):** doğrulayıcı KARNESİ commit-ÖNCESİ içerik gözüdür ve kirli
ağaçta koşar — aksi kilitlenme olurdu (commit doğrulamasız atılamaz + doğrulama commit'siz
yapılamaz). F8'in "doğrulama commit'li YEŞİL REF'e" kuralı kutu-KAPANIŞ doğrulamasında
(denetçi/bekçi) aynen sürer; karne onun yerine geçmez, önüne eklenir.

## 4 · Dönüş zarfı (rol-koşusu → sevk iç kanalı; kapanış bloğunun YERİNE GEÇMEZ)

Her alt-ajan koşusu dönüşünü şu adlı listeyle bitirir — **6 üst alan; ÇATAL doluysa 3
alt-alan da zorunlu** (SubagentStop biçim kapısının denetlediği kanonik sayım):

**Her etiket AYRI satırın BAŞINDA yazılır** (biçim kapısı satır-içi etiketi okumaz — mekanik sınır):

```
BİTEN:      G-NN — <tek cümle> · kanıt: <dosya:satır | commit>  (riskli görevde commit YASAK)
ÇATAL:      yok | dolu — dolu ise üç zorunlu alt-alan, her biri AYRI satırda:
ÇEVİRİ:     <sahip dilinde tek cümle>
ETKİ:       <cevaba göre ertesi sabah ne değişir · yanlışsa bedeli · geri dönüşü>
BEKLETİR:   <bu cevaba bağlı görevler — K-B>
DEĞERLENDİRMEDİKLERİM: <tam tartılmayan boyutlar> | yok   (BOŞ BIRAKILAMAZ — "yok" açık yazılır)
SIRADAKİ:   <rol/G-NN önerisi> | kapalı
TÜRETME-İZİ: yok | "sormadım çünkü VIZYON/karar <satır>"
GERİ-ÇEKİLEN: yok | <koşu içinde açılıp geri çekilen çatal/karar — tek satır iz>
```

- **Koşullu 7. satır — İZİN-ENGELİ:** koşuda izin reddi (`ask`/deny/kanca engeli) yaşandıysa
  zarfa `İZİN-ENGELİ: <ne engellendi>` yazılır; kapı bunu transkriptten ÇİFT kaynakla doğrular
  (`permission_denials` + kanca-hata deseni) — yaşanmışken yazılmamış zarf geri döner.
- Zarf ekrana değil **diske** düşer: `00_pano/zarf-gunlugu.jsonl`. Günlüğe append eden TEK
  betik `tools/sevk/zarf-ekle.sh`'dir (fail-closed, şema denetimli, kilitli append); kancalar
  doğrudan yazmaz. Güvence katmanları ayrık: günlük araç katmanında [SERT] (Edit/Write
  kesilir) · bozuk/yarım satır bekçide KIRMIZI + koşuda duran kapı · şema-GEÇERLİ sahte satıra
  karşı mekanik yakalayıcı YOK — bilinen sınır, süreç disiplini (E2+ adayı).
- **Koşu-AÇIK göstergesi** `tools/sevk/.kosu-acik`tir (1. satır: kimlik · kutu · tür · kip ·
  sınıf; 2. satır damga; yazarı `/kosu`, sileni sevk). Git-izlenmez; güvencesi bekçi değil **koşu
  dikişidir**: göstergeye dokunan Bash komutu sahibe SORULUR (rol-damgası emsali). Bozuk
  gösterge (dizin/boş kimlik) biçim kapısında fail-closed'dur — "koşu yok" sayılmaz.
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
   sahibin açık cevabıyla **CEVAPLANDI** olur. Zaman aşımı, yeni koşu, "itiraz gelmedi" —
   hiçbiri durumu değiştiremez. `[x]` işareti tek başına da yetmez: boş cevap · "anlamadım"
   sınıfı · sorunun yankısı → madde AÇIK kalır.
2. **"Anlamadım" = çatal soruyu getirene döner** (çeviri kusuru); rol düzeltip yeniden
   getirir, kararı basamaz. Eski madde SİLİNMEZ (D-21) ama kilidi yeni maddeye **devreder**:
   satırına `devretti: Ç-NN` yazılır — yoksa bağlı işler sonsuza dek kilitli kalır.
3. **Cevap-eşleşme + İNAT:** soruyla eşleşmeyen cevap CEVAP DEĞİLDİR. Mekanik yalnız üç kaba
   dalı tutar; gerisi rolün ve çatal denetçisinin işidir (beyanlı sınır).
4. CEVAP-BEKLİYOR çatalın `BEKLETİR` görevlerini sevk AÇAMAZ; bağımsız işler koşar. İkinci hat
   biçim kapısıdır: o görevin dönüşü red alır.
5. **Çatal sahibe gitmeden yazamaz bir gözden geçer:** `catal-denetcisi` koşusu (beş kalem,
   sözleşmesi kendi dosyasında). Hükmü GEÇTİ/DÖNDÜ'dür ve **metni yeniden yazamaz** — sahip
   cümlesi zarfın günlük kaydından mekanik alınır (§9). DÖNDÜ izini dış göz okur.
6. **Sahibin bilmediği kelime kırmızıdır:** çeviride karar/görev numarası, dosya adı ya da yol
   geçen çatal kapıdan döner. *Ders: sahip anlamadığı soruya "olur" der.*

Mekanikler: `tools/sevk/karar-alani.sh` (kanal açık mı) · `catal-kuyruk.sh` (durum + ekleme) ·
biçim kapısı (jargon · TÜRETME-İZİ çapası · BEKLETİR kilidi · denetçi sözleşmesi).

## 7 · Sır-cinsi ilkesi + Bash-yazım kuralı (önleme — mekaniği KURULU, E2)

- **"Git'te geri alınır" kişisel veri/sır cinsinde güvence DEĞİLDİR.** Bu cinsin tek
  güvencesi hiç yazılmaması ya da tek atılabilir kopyada kalmasıdır. Worktree ayrı depo
  değildir (ortak nesne deposu — E0 ölçümü): **riskli görevin worktree'sinde obje üreten git
  komutları (commit/add/stash) YASAKTIR; kanıt yalnız `dosya:satır`.**
- **Otonom koşuda dosya yazımı esasen yazma araçlarıyla yapılır;** Bash'le dosya yazımı
  (yönlendirme, heredoc, `tee`/`cp`/`mv`) doğrulayıcı/bekçi bulgusudur (içerik süzgeci
  desen-kaçırmaya açıktır — tek hat değil üç hattın ilki).
- **Serbest-metin yasağı (dışa giden):** e-posta/haber gövdesi yalnız zarfın ve kapanış
  bloğunun tanımlı alanlarından kurulur; serbest metin eklenmez. Her gönderim önce içerik
  süzgecinden geçer; süzgeç red verirse gövde GİTMEZ (sansürlü sabit-şablon alarm gider).
- **E2 mekaniği:** `tools/guard/icerik-suzgeci.sh` (+işaret listesi) yazım-öncesi keser —
  Edit/Write/Bash-yazımı ve MCP içeriği (her kanalda fail-closed). Koşuda MCP ve
  `git add/commit/stash` SORULUR (worktree bağlamında git-obje ENGEL); worktree'de koruma
  haritası aynen kurulur. Dışa-giden (`git push`/`curl`/`gh`/…) her kipte SORULUR.

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

Sevk betiği (E4) açılışta şunları arar; eksikte HİÇ başlamaz ve sebebini yazar:
dış göz koltuğu kurulu · **T0 damgası** (E0 ölçüm raporu) · **T1 damgası** (E1 tatbikatı) ·
**önleme-tatbikat damgası** (T2/E2) · **soru-kanalı-tatbikat damgası** (T3/E3). Gerçek-kutu
koşusunda ek iki şart: T6 damgası (E5) + watchdog fiilen kurulu. Damga evi:
`tools/sevk/damgalar/` (tek satır: tarih + kanıt-rapor işaretçisi). Tatbikat damgası düşmeden
otonom koşu YOKTUR — bu sahibin kararıdır (D-25 ②③) ve betiğin ilk satırlarıdır.

## 11 · Sevk döngüsü (E4)

Tören: `/kosu <kutu> [yapim|kurulum|kapanis] [interaktif|bassiz] [gercek|tatbikat]`.
**İzin zemini `--allowedTools` bayrağıdır** — `settings.allow` başsız alt-ajanda ÖLÜ ölçüldü,
oraya yazılmaz. **`gercek` sınıf** §10'un iki ek şartını (T6 damgası + kurulu watchdog) arar;
tatbikat muaftır. Sevk (Stop kancası) iş yapmaz, karar basmaz, kapı kapatmaz.

**Görev beşi birden sağlanmadan açılmaz:** durumu `açık` · sahibi kadroda · önkoşulları karneyle
kapalı · açık çatalın BEKLETİR listesinde DEĞİL (K-B birincil hattı) · uçuşta değil.

**Karne şartı (K2):** kapı ancak tabloda `kapalı` + TAZE YEŞİL `karne` kaydı varsa kapalı
SAYILIR (taze = son iş-zarfından sonra); karneyi işi yapan yazamaz. Karnesiz kapı Stop'tan geçmez.

**Devir metni yalnız işaretçidir** (`gorev · kutu · sozlesme · kural · ek-okuma`; tavan 800 B).
Serbest metin, tavan aşımı, `memory` alanı ve sevkin açmadığı (rol, görev) ikilisi çağrı anında
kesilir — iç içe alt-ajan da orada durur.

**Frenler:** bütçe · ilerleme-yok · mutlak tur tavanı; sevkin kendi hatası koşuyu KAPATIR.
Tamamı: `tools/sevk/README.md`.
