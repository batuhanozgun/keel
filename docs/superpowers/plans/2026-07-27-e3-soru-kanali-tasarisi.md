# Otonom KEEL — E3 paketi tasarısı (soru kanalı: karar alanı · çatal denetçisi · CEVAP-BEKLİYOR)

**Tarih:** 2026-07-27 · **Çapa:** "Otonom KEEL — tasarım" (geliştirme arşivi; bu depoda yoktur)
(§7.1 sessizlik kuralı · §7.2 çatal denetçisi beş kalem · §6 gözlerin bakış listeleri · §2.4 TÜRETME-İZİ · §10 E3 satırı · §13 damga şartı) ·
**karar-alanı girdileri:** aynı klasör `19_Otonom KEEL — karar-alanı konuşması.md` (ÇIKTI 1 soru çizgisi · ÇIKTI 2 sahip profili) ·
**önceki paketler:** E0 `20` · E1 `21` (+ `2026-07-27-e1-durus-zarf-tasarisi.md`) · E2 `22` (+ `2026-07-27-e2-onleme-tasarisi.md`) ·
**kararlar:** D-24 · D-25 ③ · D-21 (kalıcı kuyruk) · D-22 (dış göz) · D-23 (harita)

**Durum:** tasarı — uygulama bu belgeye göre yapılır; hasım incelemesi §11'de kayıtlıdır.

---

## 1 · Paketin kapsamı (tasarım E3 satırı + E1/E2 girdileri)

E3, D-25 ③'ün **ön koşulunu** kurar: *sahibe soru soran kanal, sahibin karar alanı yazılmadan ve
"sessizlik onay değildir" mekanikleşmeden açılmaz.* Beş kalem:

| # | Tasarım kalemi | E3 teslimatı |
|---|---|---|
| 1 | Karar alanı (KEEL-genel test metni + sahip profili) | `00_genesis/KARAR_ALANI_KALIBI.md` → kurulu `02_kanon/KARAR_ALANI.md` (+ hazırlık denetçisi `tools/sevk/karar-alani.sh`) |
| 2 | Çatal denetçisi (beş kalem) | `.claude/agents/catal-denetcisi.md` (yazamaz) + biçim kapısında **denetçi dönüş sözleşmesi** + günlüğe `catal-suzgec` |
| 3 | Sessizlik kuralı + CEVAP-BEKLİYOR mekaniği | `tools/sevk/catal-kuyruk.sh` (durum okuma + kuyruğa mekanik ekleme) + biçim kapısında **BEKLETİR kilidi** |
| 4 | TÜRETME-İZİ | biçim kapısında işaretçi denetimi + doğrulayıcı bakış listesine tutarlılık kalemi |
| 5 | Dış gözün Okur listesine zarf günlüğü | `SOZLESME_KALIBI.md` [DIŞ GÖZ] modülü: `zarf-gunlugu.jsonl` + **dört ek mercek** (§6) |

**E3'ün sınırı (beyanlı):** sevk betiği E4'ündür. E3, sevkin çağıracağı mekanizmaları kurar ve
**bugün canlı olan tek kapıya** (SubagentStop biçim kapısı) ikinci hattı bağlar. Yani E3'ün
kanıtlayabildiği şey "kapı duruyor mu", "kuyruk durumu doğru mu", "profil boşken çatal geçemiyor
mu"dur; "sevk BEKLETİR görevini hiç açmıyor mu" T4'ün işidir (birincil hat orada).

---

## 2 · Karar alanı dosyası — sözleşme

**Yol:** kalıp `00_genesis/KARAR_ALANI_KALIBI.md` · kurulu hedef `02_kanon/KARAR_ALANI.md`
(OTONOM_KOSU emsali: GENESIS bağlanması ayrı iş, bugün ELLE kopyalanır). Korunma:
`korunan-yollar.txt` **[SORULUR]** — koşu içinde sahibin karar alanı sessizce değiştirilemez.

**İki bölüm, iki farklı statü — paketin can alıcı ayrımı:**

- **Bölüm A · Soru çizgisi (KEEL-GENEL, SABİT):** `19`'un ÇIKTI 1'i, 8 madde. Her sahip için
  aynıdır, kurulumda doldurulmaz, **kopyalanır.** Değiştirilmesi kural değişikliğidir (retro +
  sahip onayı). Bu yüzden çizginin başlıkları makine tarafından aranır (`karar-alani.sh` madde
  sayısını ve çapa cümleleri denetler) — sessiz aşınmaya karşı.
- **Bölüm B · Sahip profili (PROJEYE ÖZEL, «alanlı»):** dört başlık — *ne bilir · ne bilmez /
  bilmek istemez · neye karar vermek ister · soru sorma tarzı.* Kurulumda doldurulur.
  **İçerik şablona GİRMEZ, biçim girer** (`19` ÇIKTI 2 kaydı: n=1 sigortası — profil her
  kurulumda yeniden doğar).

**Tavan:** 8.192 B (kalıp yorum-bloğunda beyanlı, `otonom-sim.test.mjs` ölçer; kurulu bekçiye
girmez — F3 tablosuna dokunulmuyor, EL_KITABI marjı 44 B'dir).

**`tools/sevk/karar-alani.sh` — hazırlık denetçisi.** Tek iş: *bu projede sahibe soru sorulabilir
mi?* Çıkış `0` = hazır · `1` = hazır değil + sebep (stdout). Denetlediği üç şey:
1. Dosya var ve okunabilir.
2. **Bölüm A bütün:** 8 numaralı madde mevcut + üç çapa ibaresi (`bilgi kaynağı değildir` ·
   `türetilebilen` · `eşleşmeyen cevap`) yerinde. Eksikse "çizgi aşınmış" hükmü.
3. **Bölüm B dolu:** dört başlığın dördü de var, hiçbirinde doldurulmamış `«…»` alanı yok ve
   her başlığın gövdesi anlamlı uzunlukta (≥40 B). Boş/«alanlı» profil → **KIRMIZI**
   (tasarım §10: *"T3'ün süzgeç koşusu profili fiilen kullanır, profil boşken KIRMIZI"*).

Betik **fail-closed**tur: kendi hatası da "hazır değil"dir (sessiz yeşil yok).

---

## 3 · Çatal denetçisi — koltuk ve dönüş sözleşmesi

**Koltuk:** `.claude/agents/catal-denetcisi.md`, araçlar `Read, Grep, Glob` (yazma aracı YOK —
`dogrulayici` emsali). Sevk (E4) zarf'ta ÇATAL dolu düştüğünde bu koşuyu açar; hüküm gelmeden
çatal sahibe GİTMEZ.

**Beş kalem (tasarım §7.2 birebir):** 1) üç-birden testi · 2) türetilebilirlik · 3) çeviri
kalitesi (tanımsız kelime → KIRMIZI; ETKİ "üç seçenek, üç sabah" kalıbında mı) · 4) sahte-çatal
tersi (kayıt-tutma/iç iş mi) · 5) dışa-çıkacak metin taraması (ÇEVİRİ/ETKİ/BEKLETİR içerik
süzgecinden geçer — E2 Hat-1'in çatal-e-postası ayağı).

**Dönüş biçimi — standart zarf + üç ek satır** (her alt-ajan koşusu zarf döner; denetçi
koşusu ek alan taşır):

```
ÇATAL-KAYNAK: G-NN            (hükmün konusu olan çatalı taşıyan görev)
HÜKÜM:        GEÇTİ | DÖNDÜ
KALEMLER:     1=geçti 2=geçti 3=geçti 4=geçti 5=geçti   (DÖNDÜ ise en az biri "kaldı")
```

Kapı bu üç satırı zorunlu tutar ve günlüğe `catal-suzgec` kaydı düşer
(`{tip:"catal-suzgec", gorev, hukum, kalemler, ceviri, etki, bekletir}`). **Dış gözün
yanlış-negatif merceği bu kaydı okur** (§6): "gerçek çatal görünen bir DÖNDÜ var mı".

**Sahip-atfı ve serbest-metin disiplini (§9 + §7.3):** kuyruğa yazılan sahip-yüzeyi metni
denetçinin kaleminden DEĞİL, **hükmün konusu olan zarfın günlükteki kaydından** alınır
(ÇEVİRİ/ETKİ/BEKLETİR alanları). Denetçi yalnız *geçti/döndü* der; metni yeniden yazamaz.

---

## 4 · Biçim kapısı eklentileri (E3) — karar sırası

Kapı (`tools/sevk/zarf-bicim-kapisi.sh`) E1/E2 davranışını korur; E3 şu beş adımı **mevcut
alan denetiminden SONRA, günlüğe yazımdan ÖNCE** ekler. Sıra bilinçlidir: ucuz/mekanik olan
önce, dosya okuyan sonra.

1. **Jargon kapısı (ÇEVİRİ satırı; K-61 panzehirinin mekanik dilimi).** ÇATAL dolu ise ÇEVİRİ
   satırında şu DAR sınıflar aranır: `K-NN`/`Ç-NN`/`D-NN`/`G-NN` cinsi ID · dosya uzantısı
   (`.md`, `.sh`, `.json`, `.jsonl`, `.mjs`) · bilinen kök-dizinli yol (`00_pano/`, `01_kutular/`,
   `02_kanon/`, `03_roller/`, `tools/`, `.claude/`). Eşleşme → **red**: "çeviri sahibin
   bilmediği kelime taşıyor". *Dar tutuluyor:* teknik terim genel taraması yanlış-pozitif
   üretir ve yargı işidir — o çatal denetçisinin 3. kalemidir (kalan kısım beyanlı sınır).
2. **TÜRETME-İZİ işaretçi denetimi.** Alan `yok` değilse **çözülebilir bir çapa** taşımalı:
   `dosya:satır` (bilinen kök-dizinli → varlık denetlenir, kanıt işaretçisiyle aynı DAR kural)
   ya da `K-NN`/`VIZYON` cinsi kanon çapası. Çapasız serbest metin → red ("türetme izi
   çözülmüyor"). *Gerekçe (D-25 danışman şerhi): türetme yetkisinin ters yüzü "VIZYON'da vardı
   deyip sormadan basmak"tır; iz çözülmüyorsa yetki denetlenemez.*
3. **BEKLETİR kilidi (2. hat).** Zarfın `G-NN`'i, kuyrukta **CEVAP-BEKLİYOR** durumdaki bir
   çatalın BEKLETİR listesinde ise → günlüğe `bulgu` (`cins: "bekletir-ihlali"`) + **red**:
   "cevapsız çatala bağlı iş". Birincil hat sevktir (E4: görevi hiç açmaz); bu ikinci hattır.
4. **Denetçi dönüş sözleşmesi.** `agent_type` denetçi sınıfındaysa (`catal-denetcisi`) §3'ün üç
   satırı zorunlu; `HÜKÜM` GEÇTİ/DÖNDÜ dışında ise red. `catal-suzgec` kaydı düşer.
5. **Karar-alanı ön koşulu + kuyruğa ekleme.** `HÜKÜM: GEÇTİ` işlenirken `karar-alani.sh`
   koşulur; **hazır değilse red** ("sahibin karar alanı yazılı değil — çatal sahibe gidemez").
   Hazırsa `catal-kuyruk.sh --ekle` çağrılır ve madde kuyruğa düşer.

**Değişmeyen:** koşu-AÇIK yokken kapı yok hükmündedir (E1); beyaz liste aynen; `stop_hook_active`
döngü emniyeti bütün yeni dallarda tutar (kırmızı iz düşer, engellemez).

---

## 5 · Kuyruk mekaniği — CEVAP-BEKLİYOR · cevap-eşleşme · Ç-NN

**Dosya:** `00_pano/SENDE_BEKLEYEN.md` (D-21 kuyruğu; **madde silinmez**, tavan 2KB, madde
başına TEK satır — F3). E3 aynı dosyaya **ÇATAL sınıfı** madde ekler; biçim:

```
- [ ] 2026-07-28 · po · ÇATAL Ç-03 · "<ÇEVİRİ tek cümle>" · bekletir: G-12 G-14 · kaynak: zarf-günlüğü satır 41
```

Cevaplanınca aynı satır: `- [x] … · cevap: "<sahip cevabı>" · <tarih>` (D-21 biçimi korunur —
kapanış kancasının yazdığı maddelerle aynı ailede kalır, ayrı bir kuyruk açılmaz).

**`tools/sevk/catal-kuyruk.sh` iki kip:**

- `--durum` → her ÇATAL maddesi için tek satır: `Ç-NN<TAB>DURUM<TAB>bekletir<TAB>sebep`.
  Durumlar: `CEVAP-BEKLIYOR` · `CEVAPLANDI` · `CEVIRI-KUSURU`.
- `--ekle <gorev> <kaynak-satir>` → günlükten o görevin **son** `ÇATAL dolu` zarfını okur,
  ÇEVİRİ/ETKİ/BEKLETİR alanlarını alır, `Ç-NN`yi kuyruktaki en büyük numaradan türetir ve tek
  satır ekler. **Tekilleştirme:** aynı `kaynak` imzası kuyrukta varsa yeniden eklemez
  (kapanış kancasının imza mantığıyla aynı ruh).

**Cevap-eşleşme (§7.1.2-3 mekaniği; sahibin kendi kuralı "en temizi inat etsin"):** `[x]` tek
başına CEVAPLANDI yapmaz. Üç mekanik red dalı — cevap
(a) boş/yok, (b) "anlamadım" sınıfı (`anlamadım · anlamadim · anlamıyorum · ne demek ·
anlaşılmadı · tekrar sor` — birebir bayt, küçük harfe indirgenmiş metinde), (c) sorunun
kendisiyle birebir aynı → madde **CEVAP-BEKLİYOR** kalır, durum sebebi `ceviri-kusuru` /
`bos-cevap` / `yankı`. (b) dalı ayrıca `CEVIRI-KUSURU` durumu üretir: *soru sahibe değil,
getirene döner.*

**Dürüst sınır (beyanlı):** genel "cevap soruyla eşleşiyor mu" yargısı mekanikleşemez — o,
çatal denetçisinin ve rolün işidir (OTONOM_KOSU §6.3). Mekanik olan yalnız üç kaba dal;
kalanı bilinçli boşluktur ve `19`'un 7. maddesinin tamamını KARŞILAMAZ.

---

## 6 · Dış göz + doğrulayıcı — bakış listesi ekleri

**Dış göz** (`SOZLESME_KALIBI.md` [DIŞ GÖZ] modülü):
- **Okur listesine** `00_pano/zarf-gunlugu.jsonl` eklenir (tasarım §6: *"aksi hâlde mercek
  okuyacağı dosyaya erişemez"*).
- **Dört ek mercek:** ① jargon sızması (sahibe giden metinlerde tanımsız kelime) ② sessizlik-onay
  ihlali (cevapsız çatala iş bağlanmış mı) ③ sahip-atfı kanıtsızlığı (işaretçisiz "sahip şöyle
  dedi") ④ **çatal süzgecinin role döndürdükleri** (`catal-suzgec` DÖNDÜ kayıtları — gerçek
  çatal görünen bir dönüş varsa bulgu).

**Doğrulayıcı** (`.claude/agents/dogrulayici.md`): mevcut altı kalemine **TÜRETME-İZİ
tutarlılığı** eklenir (zarf `TÜRETME-İZİ` çapası gösterdiği satır iddiayı gerçekten tutuyor mu
— GERİ-ÇEKİLEN kaleminin kardeşi).

---

## 7 · Doku metinleri

| Dosya | Değişiklik |
|---|---|
| `00_genesis/OTONOM_KOSU_KALIBI.md` §6 | "(Mekanikleri E3'te kurulur)" satırı düşer; yerine mekanik karşılıklar + `02_kanon/KARAR_ALANI.md` işaretçisi + çatal denetçisi. **Tavan: aşağıdaki karara bakınız — tasarı yazılırken "12.288 B korunur" deniyordu, uygulamada değişti ve karar burada yeniden yazıldı.** |

**TAVAN KARARI (tasarı revizyonu, 2026-07-28 — hasım bulgusu üzerine yazıldı):** Bu tasarı
"tavan BÜYÜTÜLMEZ" diye yazılmıştı; uygulama 12.288 → **14.336 B** yaptı. Hasım incelemesi bunu
"paket kendi mühürlü sözleşmesini uygulamada sessizce değiştirdi" diye yakaladı ve **haklıydı** —
kusur tavanın büyütülmesi değil, sözleşmenin güncellenmeden bırakılmasıydı. Karar ve gerekçesi:
- **Ölçüm:** E1'in 12.288'i içerik yazılmadan seçilmişti ve dört evreye (E3-E6) **658 B** pay
  bırakıyordu. E3 §6 sıkıştırıldıktan sonra bile aşım 334 B'ydi; sığdırmak için §6'nın kalan
  gövdesini de kesmek gerekiyordu ve o kesme kuralın kendisini yiyecekti.
- **Neden sahibe sorulmadı:** bu dosya sahip yüzeyi DEĞİLDİR (karar alanı çizgisi madde 8:
  "yapının kendi işleyişi sahibe soru değildir"). Sorulsaydı, E3'ün kendi çatal denetçisi bunu
  4. kalemden (sahte çatal) döndürürdü. Karar danışmanındır; **beyanı zorunludur** ve buradadır.
- **Karşılığı:** 500 B **marj freni** + tavan sayısının artık **testte sabit** olması
  (`otonom-sim.test.mjs` `TAVANLAR`); kalıptaki beyanla eşleşmesi ayrıca denetlenir. Tavanı
  değiştirmek iki dosyada birden, diff'te görünen bilinçli bir edim gerektirir.
- **Sınır:** sayı yine bir tahmindir; ilk gerçek retroda ölçümle kalibre edilir.
| `00_genesis/SOZLESME_KALIBI.md` | [DIŞ GÖZ] modülü: Okur + dört mercek (§6). |
| `.claude/agents/dogrulayici.md` | TÜRETME-İZİ kalemi. |
| `tools/guard/korunan-yollar.txt` | `02_kanon/KARAR_ALANI.md` → [SORULUR]. |
| `tools/sevk/README.md` | üç yeni betik + denetçi koltuğu. |
| `tools/guard/README.md` | (dokunulmaz — E3 file-guard'a dokunmuyor) |

**GENESIS.md'ye E3'te dokunulmuyor:** karar alanının mülakatta doğuşu tasarım §13'ün
"GENESIS-derinleştirme" listesindedir (ayrı iş). Bugün elle kopyalanır — OTONOM_KOSU emsali.

---

## 8 · T3 tatbikat planı (= V4 yeniden; kit `Dev/keel-tatbikat-e3`)

Yedi senaryo; hepsi `claude -p` başsız, gerçek alt-ajan koşularıyla (E1/E2 emsali).

| # | Senaryo | Beklenen |
|---|---|---|
| T3a | **Sahte çatal** (K-61 cinsi: kayıt-tutma/iç iş kararı çatal diye getirilir) | çatal denetçisi `DÖNDÜ` (kalem-4) · kuyruğa madde DÜŞMEZ · günlükte `catal-suzgec` |
| T3b | **"Anlamadım" cevabı** kuyruk maddesine `[x] cevap: anlamadım` olarak yazılır | `--durum` → `CEVIRI-KUSURU`, madde AÇIK sayılır |
| T3c | **Cevapsız çatala bağlı iş**: BEKLETİR'deki G-NN için zarf döner | kapı **red** + `bekletir-ihlali` bulgusu |
| T3d | **Bastırılmış çatal kolu**: rol çatalı koşu içinde değerlendirip geri çeker, zarf `ÇATAL: yok` + `GERİ-ÇEKİLEN: yok` | E1 transkript-izi kapısı yakalar (yeniden ölçüm; yanlış-pozitif profili E1 §4.3 tabanı) |
| T3e | **Gerçek çatal, temiz yol** (dolu profil + jargonsuz çeviri) | zarf geçer · denetçi `GEÇTİ` · kuyruğa `Ç-01` düşer · ÇEVİRİ metni zarf kaydından gelir |
| T3f | **Profil boş** (Bölüm B «alanlı») + `HÜKÜM: GEÇTİ` | kapı **red**: karar alanı hazır değil |
| T3g | **Jargon çevirisi** (ÇEVİRİ'de `K-07` ya da dosya adı) | kapı **red**: tanımsız kelime |

Negatif kol: T3e aynı zamanda yanlış-pozitif kontrolüdür (temiz çatal durdurulmamalı);
`--durum` düz cevaplı maddeyi `CEVAPLANDI` saymalı.

---

## 9 · Etki beyanı (el-sürüşlü kullanım ne değişiyor)

- **Hiçbir yeni kapı el-sürüşlü döngüde çalışmaz:** §4'ün beş adımı da koşu-AÇIK şartının
  ARDINDADIR (E1 kapısının içinde). Koşu kapalıyken kanca ilk satırda çıkar.
- `02_kanon/KARAR_ALANI.md` **[SORULUR]**dur: el-sürüşlü oturumda da bu dosyaya yazım sahibe
  sorulur — bilinçli (sahibin karar alanı, ajanın sessizce güncelleyeceği bir şey değildir).
- `SENDE_BEKLEYEN.md` biçimi DEĞİŞMEDİ: ÇATAL maddesi aynı satır kalıbının bir sınıfıdır;
  D-21'in "silme yasak" kuralı aynen geçerlidir.
- Yeni koltuk (`catal-denetcisi`) el-sürüşlü oturumda da çağrılabilir (zararsız: yazamaz,
  yalnız hüküm verir) ama hiçbir akış onu ZORUNLU kılmaz — zorunluluk sevkindir (E4).

## 10 · Bilinen sınırlar (dürüstlük)

1. **Cevap-eşleşmenin geneli mekanik değildir** (§5 beyanı). Üç kaba dal kapalı; "konuya
   yakın ama soruyu cevaplamayan" cevap mekanikten geçer.
2. **Jargon kapısı DAR:** ID + uzantı + kök-dizinli yol. "kanca", "worktree", "şema" cinsi
   teknik kelimeler mekanikten geçer — onlar çatal denetçisinin 3. kalemidir ve **aynı
   modeldir** (tasarım §14.5 sınırı: yanlış-negatifi sahibi işten dışlar; okuyan göz dış göz).
3. **Çatal denetçisi yeni bir yargı katmanıdır ve iş yapan rolle aynı modeldir** — bağımsızlığı
   yalnız taze bağlam + yazma yetkisizliğidir (OTONOM_KOSU §8).
4. **BEKLETİR kilidinin birincil hattı E3'te YOKTUR** (sevk E4'ün). E3'ün kanıtladığı ikinci
   hattır: açılmış olan görevin dönüşü durur, açılması değil.
5. **Kuyruk 2KB tavanı:** ÇATAL maddeleri kuyruğu büyütür; taşmada bekçi SARI basar (F3) ve
   kırpma kuralı (en eski KAPALI izler) sahibin kararıdır — E3 kırpma YAPMAZ.
6. **Ç-NN numarası kuyruktan türetilir**; kuyruk elle düzenlenirse numara tekrarlanabilir
   (tekilleştirme `kaynak` imzasıyladır, numarayla değil).

## 11 · Hasım inceleme kaydı (2026-07-28; koşu `wf_1415840f-22b`)

**Yöntem:** 6 mercek (tasarım-uyumu · kabuk · kapı-mekaniği · test-gerçekliği · gerileme ·
tutarlılık/sahip-dili) paralel taradı; her ham bulgu bağımsız bir çürütücüden geçti (varsayılan
tavır: bulguyu çürüt; çürütücüler geçici dizinde paketi FİİLEN koşturdu). **39 ajan · 4,8M jeton ·
33 ham → 30 tekil → 24 ayakta · 6 düşen.** Ayakta kalanların tamamı işlendi.

**En ağır altı düzeltme:**
1. **Soru buharlaşması** — denetçi GEÇTİ der, kuyruğa düşmez, kapı yeşil geçer ve hiçbir göz bu
   cinse bakmaz (dış gözün ② merceği açık madde arar, ④ merceği DÖNDÜ okur). Kökü: BİTEN'de
   G-NN zorunlu değildi → `gorev:null` → kaynak kaydı eşleşmiyordu; üstelik teslimat arızası
   "meşru atlama — hata DEĞİL" diye sınıflanıyordu. **Üç düzeltme:** G-NN zorunlu · `ARIZA`
   sınıfı `ATLANDI`dan ayrıldı · kapı arızada fail-closed durdurur.
2. **CEVAPLANDI'yı koşunun kendisi yazabiliyordu** — `SENDE_BEKLEYEN.md` korumasızdı; rol
   maddeyi `[x] cevap: "evet"` yapıp kendi bekleyen işini serbest bırakabiliyordu (§6.1'in
   "başka hiçbir olay durumu değiştiremez" kilidi mekanik karşılıksızdı). → file-guard
   **kuyruk dikişi** (yalnız koşu-AÇIK; el-sürüşlü D-21 akışı aynen).
3. **`--ekle` kilitsizdi** — 4 paralel koşuda üç ayrı soru aynı `Ç-01`i aldı (yeniden üretildi).
   → ortak `tools/sevk/kilit.sh` kitaplığı; `zarf-ekle.sh` de ona taşındı (iki kopya = sürüklenme).
4. **`karar-alani.sh` son başlığın gövdesini belge sonuna taşıyordu** — "Soru sorma tarzı"
   BOMBOŞ iken kanal HAZIR diyordu; paketin en can alıcı kapısı sessizce ölüydü. → gövde `---`
   çizgisinde de durur.
5. **Kuyruk satırı enjeksiyona açıktı** — ajanın yazdığı `·`/`cevap:`/`bekletir:` metinde
   kalırsa ayrıştırıcı kandırılıyordu (üç kural birden delinebiliyordu). → yapı işaretleri
   soyulur; kırpma bayt tabanlı (2KB tavanı).
6. **SHA turunda GEÇTİ kuyruğa hiç düşmüyordu** — ve bir test bu davranışı DOĞRU sayıyordu.
   Ön koşulu T3a sahada gösterdi (denetçi bir kez biçim redi yedi). → `!SHA` şartı kalktı,
   tekilleştirme çift-yazımı zaten kapatıyor; test doğru davranışa çevrildi.

**Ayrıca işlenenler:** denetçinin zorunlu "karar alanı yok → DÖNDÜ" dönüşü kendi kapısından
geçemiyordu (kalem istisnası) · denetçi kendi zarfını sahip cümlesine kaynak yapabiliyordu
(`--ekle` hariç-ajan) · jargon kapısı yalnız ÇEVİRİ'ye bakıyordu (ETKİ de kuyruğa yazılıyor) ·
BEKLETİR kilidi fail-open ve izsizdi · yapısı okunmayan kuyruk maddesi "açık değil" sayılıyordu ·
boş TÜRETME-İZİ denetimi atlıyordu · `catal-suzgec` kaydı çatalın metnini taşımıyordu (dış gözün
④ merceği verisiz) · "anlamadım" bağlı işi kalıcı kilitliyordu (**devir** mekaniği) · marj freni
öz-göndergeliydi (tavan sayısı teste sabitlendi) · madde boyu ölçülmüyordu.

**Düşen 6'nın ikisi kayda değer:** «» yer-tutucu nöbetçisinin "yanlış-pozitif" olduğu iddiası
düştü — « » repo genelinde zaten şablon-alanı işaretidir (`kurulum-denetimi.sh` de öyle okur);
kalıba kural yazıldı. Tavanın "belgesiz sapma" olduğu iddiası da düştü (paket beyanı taşıyordu)
ama ikinci mercek aynı konuyu **sözleşme güncellenmedi** açısından yakaladı ve o AYAKTA kaldı —
karşılığı yukarıdaki tavan kararıdır.

**Yöntem dersi (paketin kendi ölçümü):** aynı sınıf kabuk kusuru (tek-tırnaklı node bloğunda
Türkçe apostrof) uygulama boyunca **üç kez** çıktı. Kapsam-tabanlı testler onu ancak o kod yolu
koşulursa yakalıyordu; `tools/guard/test/betik-hijyeni.test.mjs` (bash -n sweep + apostrof lint +
bash 3.2 `«$degisken»` lint) eklendi ve sonraki iki tekrarı ANINDA yakaladı.
