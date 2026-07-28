# Otonom KEEL — E5 paketi tasarısı (kanal + nabız + sabah yüzeyi)

**Tarih:** 2026-07-28 · **Çapa:** `OS Architect/Araştırmalar/04_dış-göz-incelemeleri/2026-07-23_loop-engineering-araştırması/18_Otonom KEEL — tasarım.md`
(§7.3 haber kanalı · §7.4 frenler [şişme alarmı] · §8 sessiz ölüm + watchdog · §10 E5 satırı/T6) ·
**önceki paketler:** E0 `20` · E1 `21` · E2 `22` · E3 `23` · E4 `24` (+ `2026-07-28-e4-sevk-tetik-kurulum-tasarisi.md`) ·
**kararlar:** D-24 (K-E · K-F · K-G) · D-25 ① · D-21 · D-22 · D-23 · D-02 · D-10

**Durum:** tasarı — uygulama bu belgeye göre yapılır.

---

## 1 · Paketin kapsamı ve neden ŞİMDİ zorunlu

E4 motoru kurdu ama motoru **yalnız tatbikat kutusunda** koşturabiliyor: `kosu-ac.sh` gerçek
sınıfta `damgalar/T6` + `tools/sevk/watchdog-kurulu` arıyor ve ikisi de yok. Bu bir eksik değil,
D-25 ②③'ün mekanikleşmesi — **gözü ve sesi olmayan motor gerçek bir kutuda koşmaz.** E5 o iki
organı takar. Paket bittiğinde gerçek kutu koşusunun önündeki mekanik engel kalkar.

| # | Tasarım kalemi | E5 teslimatı |
|---|---|---|
| 1 | Haber kanalı (§7.3) — dört olay, e-posta | `tools/sevk/haber.sh` (tek gönderim noktası; adlandırılmış alanlar, serbest gövde argümanı YOK) + `kanal.conf` |
| 2 | Gönderim-öncesi zorunlu süzgeç (§7.3) | her gönderim `tools/guard/icerik-suzgeci.sh --metin`den geçer; red → **sabit-şablon sansürlü alarm** + günlüğe bulgu |
| 3 | DUR yoklaması (§7.3) | **üç hat**: `devir-kapisi.sh` (yeni alt-ajan açılmaz — asıl frenleme) · `zarf-bicim-kapisi.sh` (teyit + haber) · `sevk.sh` (koşuyu kapatır; E4'te var) |
| 4 | DUR'u YAZAN kanal (K-G, uzaktan) | watchdog'un IMAP yoklaması: yapılandırılmış adresten `KEEL DUR` konulu posta → `.dur` yazılır (yalnız başlık okunur, gövde OKUNMAZ) |
| 5 | Watchdog / nabız (§8) | `tools/sevk/nabiz.sh` + `watchdog-kur.sh` (launchd); iki durum kuralı; **dirilmez, haber verir** |
| 6 | Şişme alarmı (§7.4) | kapı sayısı açılış çapasına göre +%50 → `alarm` haberi + bulgu; **durdurmaz** |
| 7 | Sabah yüzeyi (K-E) | `00_pano/SABAH.md` — üç blok, yerinde yeniden yazılır, tavanlı; `acilis.sh` işaretçi verir |
| 8 | T6 tatbikatı | kit `Dev/keel-tatbikat-e5`; damga `tools/sevk/damgalar/T6` |

**E5'in sınırı (beyanlı):** uçtan uca prova (T7) **E6'nındır.** Uzaktan **çatal cevabı v1'de
bilerek YOK** (§7.3) — uzaktan gelen tek şey DUR'dur. Watchdog koşuyu **diriltmez** (D-25 ①:
dirilten otomasyon 3. basamağa gizli geçiştir).

---

## 2 · Ölçülmüş zemin (uygulamadan ÖNCE, bu makinede)

Tasarım "betik + SMTP/`mail`" diyordu; hangi aletin fiilen var olduğu ölçüldü:

| Alet | Durum | Karar |
|---|---|---|
| `curl` 8.7.1 | VAR, `smtp`+`smtps` protokolleri derlenmiş | **gönderim yolu bu** |
| `mail` / `sendmail` | VAR ama yerel MTA (postfix) yapılandırılmamış → kuyruğa yazar, teslim etmez | ELENDİ (sessiz kayıp sınıfı) |
| `security` (Keychain) | VAR | **parola evi bu** — parola ne dosyada ne argümanda |
| `launchctl` + `~/Library/LaunchAgents` | VAR | watchdog evi |
| `osascript` (Mail.app/Messages) | VAR | ELENDİ: GUI'ye bağlı, kilitli ekranda kırılgan, gece koşusunun tam ihtiyacı olmayan cins |

**Kritik ölçüm — uyku (`pmset -g`):** bu makinede `sleep 1` — yani **1 dakika boşta kalınca
uyuyor.** Şu an uyanık olmasının tek sebebi çalışan Claude sürecinin güç savını (`sleep prevented
by Claude`) tutması. Sonucu ağır: **koşu süreci ölürse Mac 1 dakika içinde uyur ve watchdog
"yapı sustu" haberini hiç atamaz** — sessiz-ölüm alarmının kendisi sessizce ölür. Bu yüzden
uyanık-tutma E5'in ayrı bir kalemidir (§6.3), "kurulum notu" değil.

---

## 3 · Haber kanalı

### 3.1 `tools/sevk/haber.sh` — tek gönderim noktası

Tasarımın "serbest-metin yasağı" kuralı **mekanikleşir**: betikte `--govde` diye bir argüman
YOKTUR. Çağıran yalnız olay adını ve o olayın tanımlı alanlarını verir; gövdeyi şablon kurar.

```
haber.sh --olay kosu-basladi   --kosu <id> --kutu <ad> --tur <t> --kip <k> --sinif <s>
haber.sh --olay kosu-bitti     --kosu <id> --kutu <ad> --blok1 <..> --blok2 <..> --blok3 <..>
haber.sh --olay catal-bekliyor --kosu <id> --kutu <ad> --catal <Ç-NN> --ceviri <..> --etki <..> --bekletir <..>
haber.sh --olay alarm          --kosu <id> --kutu <ad> --cins sessizlik|sisme|kirmizi|kanal --detay <..>
```

- **Alan tavanı:** her alan 1.500 B'de kesilir (kesildiği yazılır). Gövde tavanı 8 KB.
- **Gönderim-öncesi süzgeç (zorunlu):** konu + gövde **tek parça** hâlinde
  `tools/guard/icerik-suzgeci.sh --metin`e verilir. Red → e-posta **GİTMEZ**; yerine sabit
  şablonlu sansürlü alarm gider: *"KEEL · <kutu> · gönderilecek metin önleme süzgecinde durdu
  (<sınıf>). İçerik taşınmadı. Bilgisayara bak."* + günlüğe `bulgu` (`cins: onleme-haber`).
  Fail-closed yön: **süzgeç koşamazsa da gönderim yapılmaz**, sansürlü alarm gider.
- **Parola argv'ye GİRMEZ:** `curl -K -` ile yapılandırma **stdin'den** verilir (`user = …`,
  `mail-rcpt = …`, `upload-file = …`). Böylece parola ne `ps` çıktısında ne diskte durur; gövde
  ayrı bir 600-izinli geçici dosyadır ve gönderim biter bitmez silinir.
- **Ağ freni:** `--max-time 20`, tek deneme + 1 yeniden deneme.
- **Boğulma freni (yeni, hasım öncesi kendi eklediğim):** koşu başına gönderim **tavanı 10**;
  ayrıca aynı `olay+anahtar` ikinci kez gönderilmez (tekilleştirme işareti). Tavana varınca
  gönderim durur ve günlüğe tek `bulgu` düşer. Gerekçe: Stop döngüsü ya da tekrarlayan alarm,
  frensiz bir kanalda yüzlerce e-postaya döner — kanalın kendisi gürültüye boğulursa haber
  işlevini kaybeder.
- **`--prova` kipi:** gönderim yapmaz, gövdeyi stdout'a basar. **Testlerin tamamı bu kipte koşar**
  (ağ ve gerçek adres testin girdisi olamaz).

### 3.2 `tools/sevk/kanal.conf` — yapılandırma (parola YOK)

Şablonda **örnek+yorumlu** hâlde durur (`gercek-veri-isaretleri.txt` emsali: VERİ dosyası, içerik
kuruluma özel). Alanlar: `SMTP_SUNUCU` · `SMTP_PORT` · `HESAP` (gönderen) · `ALICI` ·
`KEYCHAIN_SERVIS` · `IMAP_SUNUCU` · `IMAP_PORT` · `DUR_KONU` · `SESSIZLIK_ESIK_DK`.

- Parola **yalnız Keychain'de**: `security find-generic-password -s "$KEYCHAIN_SERVIS" -a "$HESAP" -w`.
- `kanal.conf` **.gitignore'a girer** — sahibin e-posta adresi kişisel veridir, depoya girmez.
  (`tools/sevk/` zaten `[SERT]`: ajan bu dosyayı araç katmanından okuyamaz/yazamaz.)
- **Kanal yoklaması `tools/sevk/kanal-yokla.sh`:** conf var mı · Keychain'de anahtar var mı ·
  SMTP el sıkışması yapılıyor mu. Çıkışı `HAZIR` / `HAZIR DEĞİL · <sebep>` — `karar-alani.sh`
  emsali, **fail-closed**.

### 3.3 Kanal bir ÖN KOŞULDUR (fail-closed yönü ve gerekçesi)

- **`/kosu` (gerçek sınıf):** kanal yoklaması `HAZIR` değilse **koşu AÇILMAZ**; ayrıca ilk
  `kosu-basladi` e-postası fiilen gönderilir ve **gönderilemezse koşu açılmaz.**
  Gerekçe: kanalın kırık olduğunu öğrenmenin en ucuz anı, sahibin klavyede olduğu tek andır.
- **Koşu İÇİNDEKİ gönderimler fail-OPEN'dır** ama izsiz değildir: başarısızlık günlüğe `bulgu`
  olarak düşer, sabah yüzeyine yazılır ve bir sonraki `/kosu` yoklamasında görünür.
  Gerekçe: geceyi bir yönlendirici arızasına rehin vermek, motorun kendi arızası olmayan bir
  sebeple işi durdurmaktır. Asimetri bilinçlidir ve §9'da kayıtlıdır.
- **Ajan haber betiğini çağıramaz:** koşu-AÇIK iken Bash komutunda `haber.sh`/`nabiz.sh` geçmesi
  file-guard'da **ENGEL**. Kanalın çağıranı yalnız kancalardır (kanca süreci araç katmanından
  geçmez — E2'de yazılı muafiyetin bedeli §3.1'in zorunlu süzgecidir).

### 3.4 Dört olay ve tetikleyicileri

| Olay | Kim atar | Ne zaman |
|---|---|---|
| `kosu-basladi` | `kosu-ac.sh` | tören kapılarının hepsi geçince; **gönderilemezse koşu açılmaz** |
| `kosu-bitti` | `sevk.sh` (`kapat()` + `KAPAT` dalı) | koşunun dört bitiş hâlinin hepsinde; gövde = üç blok |
| `catal-bekliyor` | `zarf-bicim-kapisi.sh` | çatal kuyruğa mekanik eklendiği anda (E3 hattı); ÇEVİRİ+ETKİ+BEKLETİR |
| `alarm` | `sevk.sh` (bekçi KIRMIZI · şişme) · `nabiz.sh` (sessizlik) · `haber.sh` (kanalın kendi süzgeç redi) | olayında |

---

## 4 · DUR — üç hat (tasarımın "birincil hat" cümlesinin düzeltmesi)

Tasarım §7.3 "DUR yoklaması SubagentStop kancasındadır (birincil), Stop'ta ikinci hat" diyor.
Mekaniği yazarken **düzeltme gerekti** — E0'ın "cevapsız ask koşuyu bitirir" düzeltmesiyle aynı
cins: SubagentStop kancası **koşuyu durduramaz** (çıkışı yalnız alt-ajanın dönüşüne etki eder).
Ayrıca DUR ile Stop arasındaki gerçek boşluk şudur: alt-ajan döndükten sonra ana model
Stop'a varmadan **yeni bir alt-ajan açabilir.** O boşluğu kapatan kanca `devir-kapisi.sh`tir.

| Hat | Kanca | Ne yapar | Neden |
|---|---|---|---|
| **1 · frenleme** | `devir-kapisi.sh` (PreToolUse `Task\|Agent`) | `.dur` varsa **yeni alt-ajan açılmaz** (exit 2, gerekçeli) | işin yayılmasını fiilen durduran tek nokta |
| **2 · teyit + haber** | `zarf-bicim-kapisi.sh` (SubagentStop) | `.dur` varsa günlüğe `dur-alindi` + **teyit e-postası** (koşu başına bir kez) | telefondan DUR yazan sahip, Stop'u beklemeden "aldım" cevabı alır; paralel demette uçuştaki görevler kayda geçer |
| **3 · kapatma** | `sevk.sh` (Stop) | koşuyu `duran-kapi` ile kapatır (E4'te kurulu) | koşunun resmî bitiş noktası |

**Beyan:** DUR **koşmakta olan alt-ajanı kesmez** — en geç o görev bittiğinde işler. Bu, tasarımın
söz verdiği tanecikliktir; değişen tek şey hangi kancanın hangi işi yaptığıdır.

### 4.1 DUR'u YAZAN kanal (uzaktan — K-G)

`nabiz.sh` her turunda IMAP yoklaması yapar: `curl imaps://…` ile **yalnız** `SUBJECT "<DUR_KONU>"`
araması; eşleşen iletinin **yalnız `From` ve `Date` başlıkları** çekilir — **gövde okunmaz.**
Gönderen `ALICI` ile birebir eşleşiyorsa `.dur` yazılır (sebep satırı: "uzaktan · posta · <tarih>").

**Beyanlı sınır (dürüstlük kaydı):** `From` başlığı taklit edilebilir. Bu kanalın tek etkisi
**koşuyu durdurmaktır** — yani sahtecilik en kötü ihtimalle gecenin işini iptal ettirir; veri
sızdırmaz, karar bastırmaz, dışarı bir şey göndertmez. Fail-safe yönü doğru olduğu için v1'de
paylaşılan-jeton (`KEEL DUR <jeton>`) **isteğe bağlıdır ve varsayılan kapalıdır**: gece yarısı
telefondan jeton yazdırmanın sürtünmesi, faydasından büyük. Jeton alanı `kanal.conf`'ta hazır
durur; sahip isterse tek satırla açılır.

---

## 5 · Watchdog / nabız (§8)

### 5.1 `tools/sevk/nabiz.sh` — tek görevli, sevkten bağımsız

Her turda (launchd `StartInterval` = **300 sn**):

1. `.kosu-acik` yoksa → **sessiz çık** (en ucuz eleme; sıradan günleri hiç etkilemez).
2. `zarf-gunlugu.jsonl`den bu koşunun **son nabız/karar kaydının yaşı** okunur.
3. **İki durum, tek alarm:**
   - **(a) nabız durdu:** koşu AÇIK, en az bir nabız var, yaş > eşik (varsayılan **30 dk**).
   - **(b) hiç doğmadı:** koşu AÇIK, **tek damgası açılış**, açılış yaşı > eşik (sevk daha ilk
     adımda öldü — kablo-söküm cinsi; Golden 09 ve faz-3 söküm drilinin gerçek olduğunu gösterdiği sınıf).
4. Alarm gönderilir (`alarm --cins sessizlik`), **koşu başına bir kez** (tekilleştirme işareti);
   günlüğe `alarm` kaydı düşer. **Koşu diriltilmez, gösterge silinmez** — yeniden başlatma sahibin
   işidir (D-25 ①).
5. IMAP DUR yoklaması (§4.1).
6. Uyanık-tutma savının bakımı (§6.3).

**Çift hat felsefesi (tasarım §8):** kancanın ölümünü kanca yakalayamaz. `nabiz.sh` Claude Code'un
dışında, ayrı süreçte koşar ve okuduğu **açılış damgasını sevk değil `/kosu` düşürür.**

### 5.2 `tools/sevk/watchdog-kur.sh` — kurulum ve **canlılık**

`~/Library/LaunchAgents/dev.keel.nabiz.<kutu-slug>.plist` yazar, `launchctl bootstrap` ile yükler,
sonra `tools/sevk/watchdog-kurulu` işaretini yazar (etiket + plist yolu + kurulum damgası).
`--kaldir` tersini yapar.

**En önemli vida:** `ortak.sh`'taki `gercek_kutu_eksikleri` bugün yalnız **dosyanın varlığına**
bakıyor. Bu, E4'ün "dosyada duran ölü kural" sınıfının tam kendisidir: işaret durur, job yüklü
değildir, koşu kendini korunuyor sanır. Düzeltme: **işaret değil, canlılık denetlenir** —
`launchctl print gui/<uid>/<etiket>` ile job fiilen yüklü mü ve son koşu damgası taze mi.
İşaret dosyası artık yalnız *nerede arayacağını* söyler.

### 5.3 Uyanık tutma (§2'nin ölçümünün karşılığı)

`sleep 1` altında koşu süreci ölür ölmez Mac uyur; watchdog uyanamaz, alarm gitmez.
Karşılığı: **`/kosu` (gerçek sınıf) koşu boyunca bir `caffeinate` savı başlatır**, PID'ini
göstergeye yazar; `sevk.sh` kapanışta savı bırakır; `nabiz.sh` bayat/ölü koşuda savı temizler
(sav sızıntısı = Mac hiç uyumaz = ayrı bir arıza). Ayrıca `/kosu` açılışta `pmset -g`yi okur ve
uyku ayarını **koşu başladı e-postasına yazar** — sahip gece boyunca neye güvendiğini bilir.

---

## 6 · Şişme alarmı (§7.4)

Sahibin 13 kez elle yaptığı iş ("bu kutu neden büyüyor") mekanikleşir: sevk, kapı tablosundaki
görev sayısını **kutu açılış çapasındaki sayıyla** karşılaştırır; **+%50 → `alarm --cins sisme`**
("kutu büyüyor: 16→25; K-H beyanları şunlar") + günlüğe bulgu. **Durdurmaz** — haberdir.
Eşik ilk gerçek kutuda kalibre edilir ve bu tasarıda **testte sabittir** (E3'ün tavan dersi:
ölçülen sayı frene girerse fren fren olmaktan çıkar).

---

## 7 · Sabah yüzeyi (K-E)

`00_pano/SABAH.md` — **üç blok**, D-21 kapanış bloğunun sürekli yüzeye terfisi:

```
# SABAH — <kutu> · <koşu id> · <kapanış zamanı>
## GECE NE OLDU
## SENDE BEKLEYEN
## ŞİMDİ NE YAPIYOR
```

- **Yerinde yeniden yazılır** (append DEĞİL) ve **tavanlıdır (4 KB)** — PANO disiplininin aynısı;
  şişme dedektörü kendi yüzeyinde de geçerli.
- Her **kapanışta** ve her **nabızda** tazelenir: koşu ortasında ölse bile sabah bir yüzey vardır.
- `tools/guard/acilis.sh` (SessionStart): dosya bugüne aitse tek satır işaretçi düşer
  ("gece koşusu oldu → `00_pano/SABAH.md`").
- **Neden ayrı dosya (şişme itirazının cevabı):** D-21'in kapanış bloğu bir *sohbet* yüzeyidir;
  gözetimsiz gecenin sonunda sohbet yoktur. Tek satırlık PANO işaretçisi de koşunun üç bloğunu
  taşıyamaz. Bu yüzden yüzey dosyadır — ama tavanlı ve yerinde yazılan bir dosya.

---

## 8 · Doku değişiklikleri (tavan disiplinli)

| Dosya | Değişiklik |
|---|---|
| `00_genesis/OTONOM_KOSU_KALIBI.md` | **§12 · Kanal ve nabız** — kısa: dört olay · serbest-metin yasağının mekaniği · DUR üç hat + taneciklik · watchdog haber verir/diriltmez · kanal gerçek koşunun ön koşuludur. §10'a **canlılık** şartı. |
| `tools/guard/file-guard.sh` | `haber.sh`/`nabiz.sh` çağrısı koşu-AÇIK iken ENGEL; `kanal.conf` dikişi |
| `tools/bekci/` tarifi | kanal kalemleri: `kanal.conf` var + Keychain anahtarı yok → **SARI**; `watchdog-kurulu` var + job yüklü değil → **KIRMIZI** |
| `.gitignore` | `tools/sevk/kanal.conf` (kişisel veri), `00_pano/SABAH.md` (koşu çıktısı) |
| `tools/sevk/ortak.sh` | `gercek_kutu_eksikleri` → canlılık denetimi; ortak `kanal_oku()` |
| `tools/sevk/README.md` · kurulum çekirdeği | yeni betikler |

**Kanon tavanı — beyanlı karar:** OTONOM_KOSU kurulu-sim bugün **13.811 B / tavan 14.336 B →
marj 525 B**, marj freni 500 B. Yani serbest pay **25 bayttır.** §12 buna sığmaz.
**Karar: tavan BÜYÜTÜLMEZ.** Gerekçe: tavan E3'te bir kez büyütüldü (12.288→14.336); üst üste
üçüncü evrede büyütmek, KEEL'in yakalamak için var olduğu şişme örüntüsünün ta kendisidir.
Bunun yerine §12 **en fazla 400 B** yazılır ve yeri açmak için §11'in E4 tekrarları (sevkin
frenleri, izin zemini — hepsi koda inmiş ve testte sabit) budanır. **Eğer 400 B'ye sığmazsa
tavan büyütülmez; kanal kuralları ayrı kanon dosyasına (`02_kanon/OTONOM_KANAL.md`, kendi tavanı)
çıkar** — `KARAR_ALANI.md` emsali. Bu, uygulama sırasında ölçüyle kararlaştırılır ve rapora yazılır.

**Günlük şeması (surum:1 genişlemesi):** `haber` (`olay` · `sonuc`) · `dur-alindi` (`kaynak: elle|posta`) ·
`alarm` (`cins: sessizlik|sisme|kirmizi|kanal`).

---

## 9 · T6 tatbikat programı (kit `Dev/keel-tatbikat-e5`)

| Kalem | Ne kanıtlar |
|---|---|
| **T6a · dört olay** | `kosu-basladi` · `kosu-bitti` (üç blok) · `catal-bekliyor` · `alarm` — dördü de düşüyor mu (canlı; adres sahibin) |
| **T6b · sızma negatifi** | sentetik sır (TCKN/IBAN/kart) e-posta gövdesine ekilir → gönderim **durur**, sansürlü alarm gider, günlüğe bulgu düşer, **değer hiçbir kanala sızmaz** |
| **T6c · DUR paralel demette** | 2 alt-ajan açıkken DUR → yeni alt-ajan **açılmaz** (hat-1), teyit e-postası gider (hat-2), Stop'ta koşu kapanır (hat-3) |
| **T6d · nabız kesilince alarm** | Stop kancası sökülüyken `/kosu` → eşik içinde "yapı sustu" e-postası (durum **b**: hiç doğmadı) + koşu ortasında süreç öldürülerek durum **a** |
| **T6e · watchdog canlılığı** | `watchdog-kurulu` dosyası VAR ama job kaldırılmış → gerçek koşu **açılmaz** ("ölü kural" sınıfının negatifi) |
| **T6f · uzaktan DUR** | telefondan `KEEL DUR` postası → `.dur` yazıldı, gövde okunmadı; yanlış gönderenden gelen posta **yok sayıldı** |
| **T6g · boğulma freni** | tekrarlayan alarm → tavanda gönderim durdu, tek bulgu düştü |
| **T6h · negatif** | koşu-AÇIK değilken `nabiz.sh` sessiz; el-sürüşlü oturumda hiçbir e-posta yok |

Damga: `tools/sevk/damgalar/T6` (T6a–T6h sonuçlarıyla).

**Testlerin tamamı `--prova` kipinde koşar** (ağ/gerçek adres birim testin girdisi olamaz);
canlı gönderim yalnız T6'da ve **sahibin kendi adresine** yapılır.

---

## 10 · Dürüstlük kaydı (uygulama öncesi beyanlar)

1. **Tasarımın "SubagentStop birincil" cümlesi düzeltildi** (§4): SubagentStop koşuyu durduramaz;
   frenleme hattı `devir-kapisi.sh`e taşındı, SubagentStop teyit+haber hattı oldu. E0'ın
   "cevapsız ask" düzeltmesiyle aynı cins — ölçü belgeyi düzeltti.
2. **Uzaktan DUR kimlik doğrulaması zayıftır** (§4.1): `From` taklit edilebilir. Etkisi yalnız
   durdurmak olduğu için kabul edildi ve yazıldı; jeton alanı hazır ama kapalı.
3. **Koşu içi gönderim fail-open'dır** (§3.3): ağ arızası geceyi durdurmaz. Bunun bedeli, ağın
   uzun süre kırık olduğu bir gecede sahibin haber almamasıdır; ikinci hat watchdog, üçüncü hat
   sabah yüzeyidir — ama üçü de aynı ağa bağlıdır. **Ağsız gecede kanal sessizdir.**
4. **Uyku savı bir yan etkidir** (§5.3): koşu boyunca Mac uyumaz. Sav sızarsa Mac hiç uyumaz;
   temizleme üç yerde (sevk kapanışı · nabız bayat-koşu turu · `/kosu kapat`) ama beyanlı risktir.
5. **Kanon tavanı büyütülmeyecek** (§8); §12'nin 400 B'ye sığmaması hâlinde ayrı kanon dosyası
   açılır. Karar ölçüyle verilir, rapora yazılır.
6. **Şişme eşiği (+%50) kalibre edilmemiştir** — ilk gerçek kutunun verisiyle ayarlanacak;
   bugün testte sabittir.
7. **Sahipten gereken tek şey:** posta hesabı (gönderen+alıcı) ve o hesabın **uygulama parolası**
   Keychain'e kendi eliyle konur. Parola bana gösterilmez, hiçbir dosyaya yazılmaz. Bu yalnız
   **canlı T6'yı** geciktirir; tasarım ve uygulama buna bağlı değildir.
