# tools/sevk — otonom dönem mekaniği (E1'den itibaren)

Otonom KEEL evrelerinin kod evi. Bu dizin `korunan-yollar.txt`te **[SERT]**tir: oturum içinde
değiştirilmez; meşru ihtiyaç → sahip kararı + tören. El-sürüşlü günlük kullanımda buradaki
hiçbir parça devreye girmez (dönem-AÇIK şartı).

- **`ortak.sh`** — sevk ailesinin ortak kitaplığı (E4): node keşfi · dönem göstergesi okuma
  (dört alan) · günlüğe yazım · güvenli JSON kurma. Beş betikteki aynı bloğun tek evi
  (D-02 dersi). **Kaynak alınmak değer EZMEZ** — kitaplık yalnız tanımlar (yaşanmış kırılma:
  düz atama, biçim kapısının okuduğu kutu adını siliyordu).
- **`donem-ac.sh`** — `/donem` töreni (E4, K3 tetiği; `rol-ac.sh` emsali, insan-kilitli beceri).
  Argüman doğrular (**kutu adı seçimli** — verilmezse açık kutu aranır, tam bir tane olmalı) →
  **kapılanma çapalarını arar** (dış göz koltuğu + alt-ajan koltuğu + kural evi) → karar alanını
  denetler → göstergeyi yazar (`<dönem-id>·<kutu>·<evre>·<sınıf>`) → **sevkten bağımsız**
  `donem-acilis` kaydını düşürür (E5 watchdog çapası) → izin zeminini basar. `donem-ac.sh kapat`
  dönemi sahip eliyle kapatır. Damga-değiştirmez: açık dönem varken ikincisi açılmaz.
- **`sevk.sh`** — dönemin MOTORU (E4): **Stop kancası.** Her turda sırayla: gösterge · kapılanma
  · DUR işareti · günlük bütünlüğü · frenler (ilerleme-yok/mutlak tur tavanı; **bütçe yalnız
  üretim sevkinden önce**) · çatal süzgeci · **karne şartı** · görev seçimi · **evre geçişi**.
  Üretim bitince göstergenin evre alanını `kapanis` yapar ve aynı dönem içinde dış göz brifingi
  ile kapanış karnesini ister; karne KIRMIZI ise evre `yapim`a döner (en çok 2 gidiş-dönüş). `exit 2` = durmayı engeller, stderr'daki
  talimat modele ulaşır; `exit 0` = dönem kapandı. **Fail-closed YÖNÜ terstir:** sevkin kendi
  hatası dönemi sürdürmez, KAPATIR (aksi sonsuz Stop döngüsü olurdu). İş yapmaz, karar basmaz,
  görev kapatmaz. Bekçiyi görev-turunda konvansiyon-yoldan kendisi koşturur (KIRMIZI = duran kapı).
- **`devir-kapisi.sh`** — alt-ajan çağrısının PreToolUse kapısı (E4; matcher `Task|Agent`).
  Üç denetim: **şema** (devir metni yalnız `gorev·kutu·sozlesme·kural·ek-okuma`; tavan 800 B) ·
  **talimat↔fiil** ((rol, görev) açık bir `sevk-karar`la eşleşmeli — *iç içe alt-ajan da burada
  durur*) · **`memory` yasağı**. Geçen devir de izlidir (`devir` kaydı).
- **`kurulum-kapisi.sh`** — kutu kurulumunun MEKANİK denetimi (E4). GENESIS'in `kurulum-denetimi.sh`
  kapısıyla karıştırılmaz: o şablon aktarımını (bir kez), bu BİR KUTUNUN otonom döneme hazırlığını
  denetler. Duruş sözleşmesi + bağımlılık/risk bloğu + kadro eşliği + karar alanı + işaret listesi
  + `memory` yasağı. Yargı kalemleri `kurulum-denetcisi` koltuğunundur.
- **`zarf-ekle.sh`** — zarf günlüğünün (`00_pano/zarf-gunlugu.jsonl`) TEK append-aracı:
  şema denetimli (surum:1), mkdir-kilitli, fail-closed. Günlük araç katmanında [SERT]
  (Edit/Write kesilir); bozuk satır bekçide KIRMIZI; şema-geçerli sahte satıra karşı mekanik
  yakalayıcı YOK (bilinen sınır — süreç disiplini, E2+ adayı).
- **`zarf-bicim-kapisi.sh`** — SubagentStop kancası: otonom dönemde alt-ajan dönüşünün biçim
  kapısı (beyaz liste + 6+3 alan + kanıt işaretçisi + izin-engeli çaprazı + transkript-izi).
  Yalnız BİÇİM denetler; içerik gözleri ayrı (tasarım §6).
- **`kilit.sh`** — ortak dosya kilidi kitaplığı (E3): mkdir kilidi · bayat kilit iki dallı
  kırılır · kırma `mv` ile atomik · fail-closed. `zarf-ekle.sh` ve `catal-kuyruk.sh` ikisi de
  bunu kaynak alır (iki kopya = sürüklenme, D-02 dersi).
- **`karar-alani.sh`** — soru kanalının ön koşulu (E3): `02_kanon/KARAR_ALANI.md` var mı ·
  Bölüm A (KEEL-genel soru çizgisi) bütün mü · Bölüm B (sahip profili) DOLU mu. Çıkış
  `0`=HAZIR / `1`=HAZIR DEĞİL + sebep; fail-closed. **Profil boşken çatal sahibe gidemez.**
- **`catal-kuyruk.sh`** — çatalın sahip-yüzeyi mekaniği (E3). `--durum`: kuyruktaki her ÇATAL
  maddesinin durumu (`CEVAP-BEKLIYOR` / `CEVAPLANDI` / `CEVIRI-KUSURU`) + bekletilen görevler.
  `--ekle <G-NN> [<hariç-ajan>]`: zarf günlüğündeki kayıttan sahip-yüzeyi maddesini üretir ve
  `00_pano/SENDE_BEKLEYEN.md`'ye tek satır ekler (metni rol/denetçi DEĞİL kayıt yazar — §9;
  hüküm veren ajanın kendi zarfı kaynak olarak dışlanır). Kilitli, tekilleştirmeli.
  Çıkış sınıfları: `EKLENDI` · `ATLANDI` (tekilleştirme — tek meşru atlama) · `ARIZA`
  (teslimat başarısızlığı; kapı bunu fail-closed okur, soru buharlaşmasın).
  Ayrı kuyruk açılmaz: D-21 kuyruğunun ÇATAL sınıfıdır, madde SİLİNMEZ. "Anlamadım" ile geri
  dönen madde silinmez, **devreder** (`devretti: Ç-NN`) — yoksa bağlı işler kalıcı kilitlenir.
  Dönem-AÇIK iken kuyruğa ARAÇLA yazım file-guard'da ENGEL: cevabı yalnız sahip yazar.
- **`.donem-acik`** — dönem-AÇIK göstergesi (git-izlenmez; yazarı `/donem`, evresini değiştiren
  ve sileni sevk). DÖRT alan: `dönem-id · kutu · evre (kurulum|yapim|kapanis) · sınıf
  (gercek|tatbikat)`. Kip alanı F1-5e ile kalktı: yalnız bir not dizesi üretiyordu.
- **`.dur`** — DUR işareti (E4: sevkin okuduğu 2. hat; birincil hat SubagentStop, E5). Varsa
  dönem duran kapıya gider; ilk satırı sebeptir.
- **Prova fişleri (`damgalar/`) KALKTI** (F1-5h): KEEL sürümünün provasını kanıtlıyorlardı,
  kullanıcının kurulumunu değil — ve dolu geldikleri için kapı baştan mühürlü geçiyordu.
  Prova kaydının yeni evi `docs/PROVALAR.md`; kapılanma çapaları artık BU kurulumda ölçülüyor
  (dış göz koltuğu + alt-ajan koltuğu + kural evi + karar alanı; gerçek sınıfta ayrıca watchdog
  canlılığı ve haber kanalı yoklaması).

Yazamaz koltuklar (`.claude/agents/`): `dogrulayici` (dosya-gerçeği **+ E4 karne sözleşmesi**) ·
`catal-denetcisi` (sahibe gitmeden önceki çatal süzgeci, beş kalem — E3) · `kurulum-denetcisi`
(kutunun otonom döneme hazırlığı, yedi kalem — E4).

## Karne şartı (K2 — E4'ün çekirdeği)

"Kimse kendi işine yeşil diyemez" E4'e kadar bir KURALDI; artık mekaniktir. **Karneci sınıfı**
(`dogrulayici` · `kurulum-denetcisi`) dönüşüne üç satır ekler — `KARNE-GOREV` · `HÜKÜM` ·
`MADDELER` — ve biçim kapısı günlüğe ayrı bir `karne` kaydı düşürür. Sevk bir görevi **ancak**
(a) tabloda `kapalı`, (b) YEŞİL karne kaydı var, (c) karne o görevin **son iş-zarfından SONRA**
yazılmışsa kapalı sayar. Üç mekanik ayrıntı:

- **Öz-karne yasağı:** karnenin konusu olan işi yapan koltuk karneyi yazamaz (kapı keser + iz).
- **Sınıf ayrımı:** karneci/denetçi zarfları `sinif` alanı taşır (`karne`/`hukum`); tazelik
  ölçümü yalnız `is` zarflarına bakar — aksi hâlde karne kendi zarfından eski görünürdü.
- **KIRMIZI karne duran kapıdır** (v1): sevk görevi kendi açamaz, iş role/sahibe döner.

## Dönem sınıfı, bütçe ve bilinen sınırlar (hasım turu 2026-07-28)

- **Dönem sınıfı** göstergenin **4. alanıdır** (kip bayrağı F1-5e ile kalktı): `gercek`
  (varsayılan) ya da `tatbikat`. `gercek` dönem, OTONOM_DONEM §10'un ek şartlarını **ölçerek**
  arar: kurulu watchdog (`tools/sevk/watchdog-kurulu`) + taze nabız + hazır haber kanalı.
  Prova fişi (T6) şartı F1-5h ile **kalktı** — o dosya KEEL sürümünün provasını kanıtlıyordu,
  bu kurulumun hazırlığını değil. Tatbikat dönemleri muaftır (döngüsel bağımlılık olmasın).
- **BÜTÇE YALNIZ ÜRETİM ÇAĞRILARINI SAYAR** (F1-5a düzeltmesi; bu üç satır 2026-07-30 hasım
  turunda düzeltildi — eski hâli "üretim + doğrulama toplamıdır" diyordu, yani kutu sahibini
  gereken sayının **iki katını** yazmaya yönlendiriyordu). Sayılan iki iş tipi: sıradaki görevin
  sevki (`uretim`) ve kapanış karnesi KIRMIZI çıkınca açılan düzeltme (`kapanis-duzeltme`).
  Doğrulama, çatal süzgeci, dış göz brifingi ve kapanış denetimi **bir şey kurmaz** — onların
  freni tur tavanı ve gidiş-dönüş tavanıdır. **Sayıyı seçerken:** bütçe en az `kadro + 1` olmalı
  (ilk kutuda G-01 + iş zincirindeki her role bir görev) ve düşen bir çağrının yeniden sevki de
  bütçeden yer.
- **Dönem çapası** (`tools/sevk/.donem-capa`): izin listesi ve bütçe tavanı, dönem açılışında
  kutunun duruş sözleşmesinden **kapalı sözlükle** ayrıştırılıp buraya yazılır; koruma kancası
  ve sevk **yalnız burayı** okur. Gerekçe (2026-07-30 hasım turu): `01_kutular/` korunan
  yollarda değildir ve dönem içinde ajanın kutuya yazması tasarımın kendi gereğidir — kafesin
  anahtarı ile üretim tavanı orada duramaz.
- **Miras görev:** karne mekaniği E4'te doğdu; dönemden ÖNCE kapanmış görevlerin karnesi olamaz.
  Sevk onları yeniden doğrulatmaz (bütçeyi yerdi), tabloya güvenir ve `miras-gorev` bulgusu düşer.
- **Tur-tavanı şüphesi mekaniği:** `maxTurns` kesmesi işaretsizdir (E0 ölçümü); zarfı hiç
  dönmeyen dönem biçim kapısında yakalanır ve `tur-tavani-suphesi` bulgusu düşer. Sevk ayrıca
  dönüşü gelmeyen görevi **bir kez** yeniden sevk eder, ikincide duran kapı üretir.
- **Bayat gösterge:** dönem anormal biterse gösterge diskte kalır. Sevk 12 saatten eski damgayı
  duran kapı sayıp temizler — bu ikinci hattır; birincisi E5 watchdog'udur.
- **Bilinen sınır — tören argümanı:** `/donem` becerisi `$ARGUMENTS`i kabuğa tırnaksız geçirir;
  `donem-ac.sh`'ın titiz doğrulaması kabuk genişlemesinden SONRA çalışır. Tetik insan-kilitlidir
  (ajan çağıramaz) ve komutun tamamı file-guard'ın PreToolUse dikişlerinden geçer; yine de
  bu, rol töreninin sabit-argüman güvencesinden zayıftır — beyanlı sınır.

## Dönem turu, tek bakışta

```
/donem                        → gösterge + çapa + donem-acilis kaydı (kutu adı seçimli)
   Stop → sevk → SEVK talimatı (exit 2) → ana oturum Agent açar
                                   ↓ devir-kapisi (şema + talimat↔fiil)
                              alt-ajan çağrısı
                                   ↓ SubagentStop → zarf-bicim-kapisi (biçim + karne)
   Stop → sevk → … → açık iş yok / duran kapı → dönem kapanır (üç bloklu özet)
```

Kural evi: `02_kanon/OTONOM_DONEM.md` (kalıbı `00_genesis/OTONOM_DONEM_KALIBI.md`) ·
sahibin karar alanı: `02_kanon/KARAR_ALANI.md` (kalıbı `00_genesis/KARAR_ALANI_KALIBI.md`).
Tasarılar: `docs/superpowers/plans/2026-07-27-e1-durus-zarf-tasarisi.md` ·
`…-e2-onleme-tasarisi.md` · `…-e3-soru-kanali-tasarisi.md`.
Testler: `tools/guard/test/sevk.test.mjs` + `otonom-sim.test.mjs` (D-10: guard testleri
kokpit test klasörüne girmez; sevk de aynı evde yaşar).

## Kanal, nabız ve sabah yüzeyi (E5)

**Dosyalar.** `haber.sh` (tek gönderim noktası) · `kanal-yokla.sh` (sağlık kontrolü) ·
`nabiz.sh` (watchdog, launchd ile koşar) · `watchdog-kur.sh` (kur/kaldır/durum) ·
`kanal.conf.ornek` → kurulu kutuda `kanal.conf` (**.gitignore**; parola YOK, Keychain'de).

**Kurulum (kutu başına bir kez).**

```
cp tools/sevk/kanal.conf.ornek tools/sevk/kanal.conf   # doldur: sunucu · hesap · alıcı
security add-generic-password -s keel-haber -a <hesap> -w   # parolayı SAHİP girer
bash tools/sevk/kanal-yokla.sh          # HAZIR bekleriz (ağa çıkar, posta GÖNDERMEZ)
bash tools/sevk/watchdog-kur.sh         # launchd işini kurar + yükler
```

**Dört olay ve kim atar.** `donem-basladi` → `/donem` töreni (gerçek sınıfta **gidemezse dönem
açılmaz**) · `donem-bitti` → sevkin dört bitiş hâlinin hepsi (üç blok) · `catal-bekliyor` →
SubagentStop kapısı, çatal kuyruğa düştüğü an (metin **kuyruk satırından** okunur, iki yerde
ayrı kurulmaz) · `alarm` → şişme (+%50) · KUTU tavan KIRMIZI'sı · watchdog sessizliği ·
kanalın kendi süzgeç redi.

**Neden kanca-içi gönderim ve bedeli.** Kanca süreci araç katmanından geçmez: `permissions.ask`
ve PreToolUse onu görmez (E2 Hat-2 muafiyeti). Muafiyetin bedeli **gönderim-öncesi zorunlu
süzgeç**tir — konu+gövde `icerik-suzgeci.sh --metin`den geçer; red → posta GİTMEZ, sabit-şablon
sansürlü alarm gider, günlüğe bulgu düşer. Süzgeç *koşamazsa* da temiz sayılmaz.
Gövde yalnız tanımlı alanlardan kurulur: **`--govde` diye bir argüman yoktur.**

**Fail yönleri (bilinçli asimetri).** Tören: kanal HAZIR değilse ya da ilk posta gidemezse
dönem **AÇILMAZ** (sahip klavyededir — kırık kanalı öğrenmenin en ucuz anı). Dönem içi gönderimler
**fail-open** ama izsiz değil (günlüğe `haber` kaydı). Frenler: dönem başına 10 gönderim + olay
tekilleştirmesi (`--anahtar`).

**DUR üç hat.** ① `devir-kapisi.sh` — `.dur` varsa yeni alt-ajan açılmaz (**frenleme**)
② `zarf-bicim-kapisi.sh` — görülme anı günlüğe (`dur-alindi`) ③ `sevk.sh` — dönemi kapatır.
Koşan görevi **kesmez**. `.dur`'u yazan: sahip (elle) ya da `nabiz.sh`'ın IMAP yoklaması —
yapılandırılmış adresten `KEEL DUR` konulu posta; **yalnız başlık okunur, gövde OKUNMAZ.**
*Beyanlı sınır:* `From` taklit edilebilir; bu kanalın tek etkisi durdurmak olduğu için kabul
edildi (jeton alanı `kanal.conf`'ta hazır, varsayılan kapalı).

**Watchdog iki durum.** (a) nabız durdu — eşik (varsayılan 30 dk) aşıldı · (b) hiç doğmadı —
dönem açık, tek kaydı açılış. **Diriltmez.** Canlılık `launchctl print` + `.nabiz-son` ile
ölçülür: *işaret dosyası yetmez.*

**Nabız damgası İKİ soruya cevap verir; tazelik yalnız birincisidir** (U32). Damganın 1. satırı
ISO zaman damgasıdır — *ne zaman koştu.* 2. satırı `hal=TAM` ya da `hal=EKSIK` + `sebep=…`
taşır — *işini yapabildi mi.* İkisi ayrı ölçümdür: `nabiz.sh` ortak kitaplığı okuyamadan ya da
node'unu bulamadan sessizce çıktığında damga **taze** olur ve watchdog **ölüdür**. Damgayı
betiğin çıkış tuzağı basar; böylece "işin önüne damga basma" bir daha yazılamaz. Üç tüketici de
hâli okur ve ayrı ad verir: `ortak.sh` (`watchdog-KOSUYOR-AMA-ISINI-YAPAMIYOR(<sebep>)` ·
`watchdog-damgasi-HALSIZ`) · `tools/bekci` watchdog gözü (DURDURAN) · `watchdog-kur --durum`.
Hâl satırı hiç yoksa eski bir `nabiz.sh` koşuyordur ve bu **kendi adıyla** söylenir —
"bilinmiyor" bir ölçüm değeri değildir.

**Uyanık tutma.** macOS'ta boşta kalan makine uyur; uyuyan makinede ne dönem sürer ne watchdog
ateşler. `/donem` gerçek sınıfta `caffeinate` savı başlatır (PID `.caffeinate-pid`), üç yerden
bırakılır: sevk kapanışı · nabzın bayat-dönem turu · `/donem kapat`.

**Sabah yüzeyi.** `00_pano/SABAH.md` — üç blok, **yerinde** yeniden yazılır (append değil),
4 KB tavanlı; her kapanışta tazelenir. Blokların TEK üreticisi sevkin çözümleyicisidir
(stdout · SABAH.md · e-posta gövdesi aynı kaynaktan). `acilis.sh` sabah tek satır işaretçi verir.
