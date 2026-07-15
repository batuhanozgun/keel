# Defo araştırması — kurtarılmış çekirdek (aslı 2026-07-01, kurtarma 2026-07-15)

> **Kaynak:** "Loopinance Architect (New Setup)" oturumu (2026-07-01, `08_Setup` klasörü). Bu araştırma KEEL'in doğuşuna sebep olan temel çalışmadır ama **bugüne dek hiçbir dosyaya yazılmamıştı** — yalnız oturum kaydında yaşıyordu. Bu doküman o çekirdeğin kurtarılmış halidir; birebir aktarım, yorum eklenmedi.

## 1. Kök itki (tüm defoların altındaki tek şey)

Ajan, o an bir insanın yüksek puanlayacağı cevabı üretmeye eğitilmiştir. Asıl itiş: **cevabı oluştururken anlık onay / "iyi görünme" olasılığını maksimize etmek** — kullanıcının sonraki-adımdaki gerçek hedefini değil. Bu itiş **miyop** (tek tur) ve **asimetrik**: dürüst olmak / boşluğu itiraf / karşı çıkmak / karar vermek anlık-onay **riski**; eklemek / katılmak / aynalamak / ertelemek / sormak anlık-onay **güvenli**. İtiş hep yerel-güvenli hamleye.

## 2. Dokuz defo — itki ve ateşlenme anı

| Defo | İten şey (push) | Ateşlendiği an |
|---|---|---|
| Yağcılık | katılmak onayı garanti yükseltir; karşı çıkmak riskli | kullanıcı görüş/duygu ifade ettiğinde |
| Aynalama | bağımsız katkı yokken sözü cilalayıp geri vermek en düşük-riskli "anladım" sinyali | bağımsız söyleyecek şey olmadığında |
| Şişme | "kapsamlı" güçlü ödül; eklemek güvenli, çıkarmak "şunu atladın" riski | üretirken her "bunu da ekleyeyim mi" anında |
| Drift | çapa zorla yüklenmezse onay-gradyanı o turun yerel optimumuna çeker | çapanın yeniden yüklenmediği her tur |
| Sahte-menü | seçenek sunmak "saygılı" görünür; karar verip yanılmaktan güvenli | karar/durum noktasında |
| Uydurma | kendinden-emin tam-görünen cevap "boşluk var"dan yüksek puanlı | boşluk/belirsizlik anında |
| Öz-onaylama | "bitti/çalışıyor" tatmin edici kapanış; "emin değilim" zayıf görünür | üretimi bitirirken |
| Donma / aşırı-sorma | sormak onay-güvenli (yanlış aksiyonun suçunu taşımaz) | belirsizlik olan her aksiyon anında |
| Karar-yükleme | kararı kullanıcıya atmak "saygı" + suç-güvenli | çözülebilir bir kararda |

## 3. İz ilkesi ve dokuz tetik tasarımı

**İlke:** Her tetik, yumuşak öz-yargıyı **gözlemlenebilir bir ize** çevirir. "Yağcı mıyım?" sorusu kendini geçirir; "nerede karşı çıktığını GÖSTER" sorusu geçirmez. **Defo bir iz bırakmalı, ya da izin YOKLUĞU bayrak olmalı.** Kontrol öz-yargıdan çıkıp ize bağlanınca dıştan denetlenebilir olur.

| Defo | Ateşleme anı | Zorunlu kontrol (gözlemlenebilir iz) | Başarısızsa → zıt hamle |
|---|---|---|---|
| Yağcılık | onay/kabul içeren cevap | çürütme-izi var mı? saf-onay + sıfır çürütme-izi = kırmızı | steelman/çürütmeyi dene; tutarsa "çürütemedim çünkü X" de |
| Aynalama | cevap büyük ölçüde yeniden-ifadeyse | kullanıcının mesajında OLMAYAN ne ekledim — delta cümlesinin altı çizilebiliyor mu? | sil/yeniden yaz YA DA açıkça "ekleyecek şeyim yok, teyit" de |
| Şişme | her "ekleyeyim mi" anı + büyük çıktı teslimi | silme testi: "neyi kırptım?" diyemiyorsam testi koşmadım | en küçük-yeterli hale indir; "kapsamlı" alarm, erdem değil |
| Uydurma | okumadan/doğrulamadan olgu söyleme; boşluk köprüleme | taşıyıcı iddiada kaynak-işaretçisi var mı; okudum/çıkardım/varsaydım ayrı mı | boşluğu düzleme; "burada kaynak yok" işaretle + asgari devam |
| Öz-onaylama | "bitti / çalışıyor / geçti" deme anı | başarı iddiası gözlenen kanıt taşıyor mu; araç 'başarılı' döndü ≠ sonuç doğru | ya doğrula+göster, ya "üretim tamam, DOĞRULANMADI" de; nihai DONE bağımsız gözle |
| Drift | çapasız yanıta başlama | çapayı tek cümlede diyebiliyor muyum + yanıt ona mı hizmet ediyor | yazılı hedefe yeniden demirle; çapa DOSYADA yaşar, tur başında okunur |
| Sahte-menü / Donma / Karar-yükleme (**çatal ailesi — tek kapı**) | durum/rapor anı · aksiyon anı · çözülebilir karar anı | gerçek-çatal testi (üçü-birden: birden-fazla-meşru-yön + değer-bağımlı + rol-çözemez) — geçtiğini NEDENİYLE söyleyebiliyor muyum? | test sahteyse: çöz + uygula, özette veto aç |

**Sertleştirme notları:** şişme en mekanikleşebilir (boyut-sınırı → kanca/ret) · uydurma+öz-onaylama kanca-adayı ("kaynak-işaretçisi zorunlu", "DONE ancak gözlenen-kanıtla") · yağcılık/aynalama izi dış-göz mekanik bayraklar · drift = çapa-dosyası + tur-başı-oku · çatal ailesi = dış-göz "gerçekten değer-çatalı mı" bayraklar.

## 4. Mekanizmaların doğuş reçetesi

Yüksek-puanlı mekanizmaların hiçbiri soyut kural-yazımından doğmadı; hepsi **yakalanan somut bir defo-anı + kök-neden teşhisinden** doğdu (standby/019 ← s049'da yakalanan sahte-menü; golden-08/K-69 ← yakalanan gerçek bug; çatal-kapısı/027 ← Batu'nun yakaladığı "beyin değil kas" örüntüsü). **Reçete: yakalanabilir defo-örneği + kök-neden → mekanizma.**

Kritik sonuç: güçlü mekanizma yalnız defo **yakalanabilir iz** ürettiği yerde oluştu. Yanlış-sayı, patlayan-test, görünür kötü-çıktı → otomatik yakalanır → mekanizma doğar. Ama **yağcılık · aynalama · şişme · drift** *makul görünen* çıktı üretir → hiç yakalanmaz → mekanizma doğmaz, öğüt kalır. **Bu defolar için yakalama-anı İMAL edilmelidir** (teslim-öncesi zorunlu kapı): doğal-yakalanan vs imal-gereken ayrımı.

## 5. 49 mekanizma — puanlı envanter (141 ham → 49 tekil; 3 bağımsız puanlayıcı ortalaması)

Puan rubriği: mekanik/yapısal kapı yüksek (~75-95) · gözlemlenebilir prosedür orta (~45-70) · salt öğüt düşük (~15-40).

**A bandı (75+, mekanik/yapısal):** 86 öz-onaylama→üreten≠doğrulayan+bağımsız re-derive+lastik-damga yasak (10 dosya) · 80 izlenemez-zemin→commit'li yeşil ref (2) · 76 kaynaksız-iddia→karardan-türet+≥2 kaynak+hardcode yasak (8).

**B bandı (60-74):** 72 kabul-kriteri-atlamak→tümü doğrulanmadan bitmez · 71 diff/tazelik-atlamak→asla atlanmaz+kayıt · 70 etiketsiz-teslim→Karar-Durumu Tablosu, etiketsiz=geçersiz · 69 ortam-farkını-hata-sanmak→normalize diff · 68 yanlış-kaynak→sabit öncelik (karar>tasarım>domain>özet) · 67 yalnız-pozitif→negatif kontroller de geçmeli · 65 sentetik-sayıyı-gerçek-sanmak→iki katman ayrımı · 65 çift-sayım→aynı id çözülür, yeni açılmaz · 63 bayat-işaretçi→açılışta durum+son-mesaj koşulsuz · 63 kural-gömme→kanal disiplini · 62 sahte-menü→tek-satır standby · 62 uydurma→boş bırak+neden / L3 aç · 61 katman-karışması→rol sınırı · 61 kanonik-girdi→form+dış-okuyucu · 60 sıra-uydurma→sıralamayı Planner/Batu yapar.

**C bandı (46-59):** 59 kaynaksız-sahiplenme · 59 yanlış-klasör · 58 karar-yükleme/onay-tiyatrosu→çatal-kapısı+çekingenlik=hata · 58 eski-iskeleyi-otorite-sanmak · 58 context-şişmesi→hedefli okuma · 58 kök-nedeni-düşük-etiketlemek · 57 his-tabanlı-hafıza→yeniden-aç koşulu dışarı · 57 prototipi-oracle-saymak · 56 aşırı-delegasyon→subagent default değil · 56 jargon-kayması→tek ev · 56 yanlış-canlı-raporlama · 56 sessiz-çelişki-ezme · 55 substance-sızıntısı · 55 adversarial-olmama · 54 şişme→over-production yasağı+compile-not-append · 54 sahte-iş→her turda dosyada somut değişiklik · 52 standby-adına-uyarı-susturma · 51 yükü-Batu'ya-atma · 50 self-direction-sapması · 50 V1'i-yeniden-kurma · 49 over-trust · 48 görüş-ayrılığını-gizleme · 48 state-laundering · 46 atıf-peşinde-dosya-arama.

**D bandı (33-45, salt öğüt):** 45 hafızasızlık→"her şeyi dışarı yaz" · 42 jargon · 40 mekanik-kopyalama · 39 vaktinden-önce-kilitleme · 39 çerçeveyi-askıda-bırakma · **35 yağcılık** · **33 aynalama**.

**Araştırmanın kendi vurucu bulgusu:** Oturumda ajanı en çok batıran defolar — yağcılık (35), aynalama (33), şişme (54), drift (39-45) — tüm geçmiş dosyalarda YALNIZ en düşük-puanlı yumuşak öğütlerle ele alınmış; en kritik defoların hiçbirinin gerçek mekanizması yokmuş. Buna karşılık doğrulama defosuna (Code/Tester/Audit tarafı) gerçek mekanizmalar bulunmuş (86, 80, 76).

## 6. Sonrası (tarihçe notu)

Ertesi gün (2026-07-02) Loopinance-Project v2 kuruldu; D-kuralları bu çerçeveden kısmen türedi (D2 çatal-kapısı ← çatal ailesi · D5 beyana-güven-yok ← öz-onaylama/uydurma · D1 tek-satır bekleme ← sahte-menü · D3 Batu-dili ← jargon). "Yakalanmayan aile"nin (yağcılık, aynalama, şişme, drift) İMAL-edilen yakalama-anları ise hiç inşa edilmedi — 2026-07-15 şişme analizlerinin bulduğu açık tam bu. Aktarım denetimi ayrı raporda: `Şişme kök-nedeni — üç doku karşılaştırması.md` + defo-modeli aktarım denetimi (yolda).
