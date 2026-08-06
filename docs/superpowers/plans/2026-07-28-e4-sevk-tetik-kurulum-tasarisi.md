# Otonom KEEL — E4 paketi tasarısı (sevk + tetik + kurulum kapısı; K2+K3)

**Tarih:** 2026-07-28 · **Çapa:** "Otonom KEEL — tasarım" (geliştirme arşivi; bu depoda yoktur)
(§2.1 koşu · §2.2 model-aracılı halka + dikişler · §2.5 kapı modeli · §3 sevk · §5.1/§5.2 duruş + kurulum kapısı · §7.4 frenler · §8 kapılanma · §10 E4 satırı) ·
**önceki paketler:** E0 `20` · E1 `21` (+ `2026-07-27-e1-durus-zarf-tasarisi.md`) · E2 `22` (+ `…-e2-onleme-tasarisi.md`) · E3 `23` (+ `…-e3-soru-kanali-tasarisi.md`) ·
**kararlar:** D-24 · D-25 ① · D-21 · D-22 · D-23 · D-02 · D-10

**Durum:** tasarı — uygulama bu belgeye göre yapılır; hasım incelemesi §12'de kayıtlıdır.

---

## 1 · Paketin kapsamı (tasarım E4 satırı + E0/E1/E2/E3 girdileri)

E4, K2 (bağımsız kapı) + K3 (tetik) basamaklarını kurar: **koşuyu sahip tek dokunuşla açar, işi
yapı seçer ve açar, kapı bağımsız karne olmadan kapanmaz.** Yedi kalem:

| # | Tasarım kalemi | E4 teslimatı |
|---|---|---|
| 1 | Tetik (K3) — `/kosu` töreni | `.claude/skills/kosu/SKILL.md` (insan-kilitli) + `tools/sevk/kosu-ac.sh` (tören betiği, rol-ac.sh emsali) |
| 2 | Sevk betiği (Stop; fail-closed) | `tools/sevk/sevk.sh` — Stop kancası; görev seçer, talimat üretir, koşuyu kapatır |
| 3 | Karne-şartı (K2) | doğrulayıcı sınıfının **karne dönüş sözleşmesi** (biçim kapısı) → günlüğe `karne`; **karnesiz kapı Stop'tan geçmez** |
| 4 | Devir-şema kapısı + talimat↔fiil dikişi (çağrı ucu) | `tools/sevk/devir-kapisi.sh` — `Task\|Agent` PreToolUse; işaretçi şeması + tavan bayt + **sevk-karar eşleşmesi** |
| 5 | Kurulum kapısı (7 kalem) | `.claude/agents/kurulum-denetcisi.md` (yazamaz) + `tools/sevk/kurulum-kapisi.sh` (mekanik kalemler) |
| 6 | İzin zemini vidası | ölçüme dayalı KARAR (§4): settings-`allow` **açılmaz**, zemin `--allowedTools`; kip `.kosu-acik`ın 4. alanı |
| 7 | Doğrulayıcıya `model:` denemesi | ölçülür (T4), sonucu ve **yazmama kararı** gerekçesiyle kayda geçer (§9) |

**E4'ün sınırı (beyanlı):** haber kanalı (e-posta), watchdog, DUR'un birincil hattı ve sabah
yüzeyi **E5'indir.** E4 yalnız DUR'un *ikinci* hattını (sevkin okuduğu işaret) kurar. Uçtan uca
prova (T7) E6'dır. Sevk gerçek bir kutuyu koşturmaz: T4/T5 **sentetik kutuda** koşar.

---

## 2 · Koşu birimi ve tetik (K3)

### 2.1 `/kosu` töreni

Rol töreninin birebir emsali (`rol-ac.sh` → `.aktif-rol`): beceri **yalnız insan** tetikler
(`disable-model-invocation: true`; `kurulum-denetimi.sh:119` bu kilidi zaten arar), ön-işleme
satırı tören betiğini koşar, betik **damga-değiştirmez** (açık koşu varken ikincisi açılmaz).

```
/kosu <kutu-dizini> [yapim|kurulum|kapanis] [bassiz|interaktif]
```

`tools/sevk/kosu-ac.sh` sırasıyla:

1. **Argüman doğrulama.** Kutu dizini `01_kutular/` altında ve `KUTU.md`si olmalı; tür ve kip
   birebir sözlükten. Uydurma ada damga basılmaz (rol töreni emsali).
2. **Kapılanma kontrolü — "kalkansız motor yok" (tasarım §8).** Dış göz koltuğu + brifing
   iskeleti · `tools/sevk/damgalar/` altında **T0 · T1 · T2 · T3**. Eksikte **koşu HİÇ AÇILMAZ**
   ve sebebi yazılır. (Sevk açılışta aynı kontrolü tekrar yapar — çift hat: damga koşu içinde
   silinirse sevk durur.)
3. **Karar alanı ön koşulu.** `karar-alani.sh` HAZIR değilse koşu açılmaz *(gerekçe: koşunun
   olağan işi çatal üretmektir; kanalı kapalı bir koşu, sorusunu sessizce yutan koşudur)*.
4. **Damga.** `tools/sevk/.kosu-acik` tek satır, **dört alan** (TAB ayraçlı):
   `<koşu-id>\t<kutu-dizini>\t<tür>\t<kip>` + ikinci satırda `damga\t<ISO>`.
   E1 uyumu: 1. alan koşu-id, 2. alan kutu — biçim kapısı bugünkü okumasını sürdürür.
5. **Bağımsız açılış kaydı.** `zarf-ekle.sh` ile `kosu-acilis` satırı — **sevkten ve Stop'tan
   BAĞIMSIZ** (tasarım §2.1: koşu ilk adımda ölürse bile "açıldı ama nabız gelmedi" kaydı
   var olur; E5 watchdog'unun okuyacağı çapa budur).
6. **İzin zemini metnini basar** (§4) ve kayda `izin_zemini` alanıyla düşürür.

**Koşuyu sahip kapatabilir:** `/kosu kapat` → damga silinir + `kosu-kapanis` kaydı. Normal
kapanışı sevk yapar.

### 2.2 Koşu türü — üç tür, üç farklı zorunlu göz

| Tür | Sevkin zorunlu açtığı göz | Koşu neyle kapanabilir |
|---|---|---|
| `kurulum` | **kurulum denetçisi** (§6) | denetçinin YEŞİL karnesi olmadan kapanmaz → açılış mührü paketine rapor eklenir |
| `yapim` | her kapalı kapı için **doğrulayıcı** (§5) | açık iş kalmaması ya da duran kapı |
| `kapanis` | **kapanış denetçisi** (G-15 sınıfı) | `KAPANIS` kapılı YEŞİL karne olmadan kapanmaz (tasarım §6: "Stop kancası G-15 karnesi olmadan kutuyu kapatmaz") |

Tür `.kosu-acik`ın 3. alanındadır; sevk her turda oradan okur (dosyaya bakar — §3 "sevk aptal
ve deterministik kalır").

---

## 3 · Sevk (`tools/sevk/sevk.sh`) — Stop kancası

**Sözleşme:** `exit 0` sessiz = koşu yok / koşu kapandı · `exit 2` = durmayı engeller, stderr'daki
**talimat** modele ulaşır · **fail-closed**: betiğin kendi hatası koşuyu DURDURUR (sessiz sevk yok).

**Bir Stop turu — on iki adım (sıra bağlayıcıdır; ilk duran adım turu bitirir):**

| # | Adım | Sonuç |
|---|---|---|
| 0 | `.kosu-acik` yok → **exit 0 sessiz** | el-sürüşlü oturum hiç etkilenmez |
| 1 | Gösterge bozuk (dizin/boş kimlik/tanınmayan tür-kip-sınıf) | duran kapı (fail-closed) |
| 2 | Kapılanma çapaları (dış göz + T0-T3) · **gerçek-kutu ise T6 + watchdog** | eksikse koşu KAPANIR + sebep |
| 2b | **Bayat gösterge** (damga > 12 saat) | duran kapı + gösterge temizlenir |
| 3 | **DUR işareti** `tools/sevk/.dur` | duran kapı (2. hat; birincil E5) |
| 4 | **Zarf günlüğü bütünlüğü** — bozuk/yarım satır | duran kapı (kapanışı beklemez) |
| 5 | **Tur freni** — ilerleme-yok eşiği + mutlak tur tavanı | duran kapı |
| 6 | **Bütçe** — bu koşuda açılan alt-ajan koşusu sayısı ≥ BÜTÇE | duran kapı |
| 7 | **Bekçi koşu-içi tazeliği** (yeni karne düştüyse) → KIRMIZI | duran kapı (tavan KIRMIZI'sı HARİÇ) |
| 8 | **Çatal süzgeci** — hükmü gelmemiş ÇATAL varsa | `catal-denetcisi` **talimatı** (E3→E4 girdisi) |
| 9 | **Karne şartı** — bu koşuda işlenmiş, karnesiz kapalı kapı | doğrulayıcı koşusu **talimatı** (exit 2) |
| 10 | **Görev seçimi** — uygun görev varsa | üretim koşusu **talimatı** (exit 2) |
| 11 | Uygun görev yok | koşu KAPANIR (üç bloklu özet + `kosu-kapanis`) |

### 3.1 Sevkin okuduğu dosyalar (yazılı metin — §3)

1. `01_kutular/<kutu>/KUTU.md`: **Kapılar tablosu** (`| G-NN | iş | sahip | durum | kanıt |`;
   durum sözlüğü EL_KITABI'ndan birebir: `açık · sürüyor · mühür-bekliyor · kapalı · pas`) +
   **`## Duruş sözleşmesi`** (BÜTÇE satırı) + **`## Bağımlılık ve risk`** bloğu (`onkosul=` / `risk=`).
2. `00_pano/zarf-gunlugu.jsonl`: `sevk-karar` (açık küme) · `zarf` (dönenler) · `karne` (kapı
   hükümleri) · `bulgu` · `catal-suzgec`.
3. `00_pano/SENDE_BEKLEYEN.md` → `catal-kuyruk.sh --durum`: **BEKLETİR kilidinin BİRİNCİL hattı.**

**Kanonik durum kaynağı:** kapı durumu için tek otorite KUTU tablosudur (kokpit PANO mekanik
bloğunu tercih eder ama onu bekçi yazar ve koşu ortasında bayat olabilir; sevk **dosyaya**
bakar — `/goal`'ün elenme gerekçesinin tersi).

### 3.2 Görev seçimi — beş süzgeç

Bir görev ancak şu **beşi birden** sağlanırsa açılır:
1. durumu `açık` (`sürüyor` = uçuşta, yeniden açılmaz),
2. sahibi (`Sahip` hücresi) kadroda kayıtlı bir alt-ajan (`.claude/agents/<slug>.md` var),
3. `onkosul=` listesindeki her görev `kapalı` **ve** karnesi YEŞİL,
4. **hiçbir açık çatalın `BEKLETİR` listesinde değil** (K-B'nin birincil mekaniği — E3 yalnız
   dönüşü durduruyordu; burada görev *hiç açılmaz*),
5. uçuşta değil: günlükte dönüşü gelmemiş `sevk-karar` kaydı yok.

Kalan adaylardan **G-NN sırasıyla ilki** seçilir (deterministik). Paralellik tavanı v1'de **1**:
tasarım "ilk sürümde 2" diyordu; ölçüm gerekçesiyle 1'e indirildi — model-aracılı halkada
(§2.2) aynı Stop turunda iki talimat üretmek talimat↔fiil eşleşmesini çok-değerli hâle getirir
ve dikişin yanlış-negatifini büyütür. Tavan `OTONOM_KOSU`'da yazılı, T4'te kalibre edilir.

### 3.3 Talimat biçimi (stderr) — model-aracılı halkanın tek çıktısı

```
SEVK · <koşu-id> · tur <n>/<tavan> · bütçe <k>/<N>
AÇ: Agent aracıyla alt-ajan koşusu — subagent_type: <slug>
DEVİR METNİ (AYNEN, başka hiçbir satır ekleme):
görev: G-NN
kutu: 01_kutular/<kutu>/KUTU.md
sözleşme: 03_roller/<slug>/ROL.md
kural: 02_kanon/OTONOM_KOSU.md
```

Sevk **iş anlatmaz** (tek-odak): devir metni yalnız işaretçidir, rol işi KUTU'dan okur. Bu,
13 no'lu raporun 2. sızıntı yamasının mekanik hâlidir ve **devir-şema kapısı** onu denetler.

### 3.4 Frenler (§7.4)

- **BÜTÇE:** `Duruş sözleşmesi`nin `BÜTÇE:` satırından ilk sayı (`koşu başına en çok N
  alt-ajan koşusu`). Satır yoksa/okunmazsa **fail-closed varsayılan 3** ve bulgu düşer.
- **İlerleme-yok:** ardışık **2** Stop turunda günlüğe yeni `zarf` düşmediyse duran kapı.
  (Tasarımın "aynı görevde iki maxTurns dayanması = bölünmeli" işaretinin Stop-turu karşılığı;
  `maxTurns` kesmesi İŞARETSİZDİR — E0 kalem 4 — tek gözlenebilir iz zarfın gelmemesidir.)
- **Mutlak tur tavanı:** `3 × BÜTÇE + 5`. Sonsuz Stop döngüsüne karşı son kemer; aşımda duran
  kapı ve bulgu. *(Gerekçe: `stop_hook_active` bu tasarımda döngü freni OLARAK KULLANILAMAZ —
  sevk döngüsü tanımı gereği çok turludur. Freni bütçe + ilerleme + mutlak tavan üçlüsü taşır.)*
- **Bekçi koşu-içi:** kapı kapandığı turda sevk `tools/bekci/bekci.sh`yi konvansiyon-yoldan
  kendisi koşturur, sonucu `bekci` kaydıyla damgalar; KIRMIZI → duran kapı. Bekçi yoksa
  **bulgu + duran kapı** (kurulu projede bekçi zorunludur; yokluğu sessiz geçemez).

---

## 4 · İzin zemini vidası (E1 ölçümünün kararı)

**Ölçüm (E1 §3):** `.claude/settings.json`'ın `permissions.allow` listesi **başsız alt-ajanın
Write'ını AÇMIYOR** (ne `Edit(yol)` ne `Write(yol)`); fiilen çalışan zemin `--allowedTools`
bayrağıdır.

**KARAR — settings'e `allow` listesi YAZILMAZ.** Gerekçe: yazılsaydı dosyada duran ama başsız
koşuda ölü bir kural olurdu; bu paket ailesinin en pahalı dersi tam bu sınıftır (E1: *"var
olmayan mekanik güvence beyan etmek"*; 2.1.220'de ölü ask kuralları bu yüzden çıkarıldı).
Bunun yerine:

- Zemin **koşu komutunun bayrağıdır.** `/kosu` töreni kip `bassiz` iken zemini METİN olarak
  basar ve `kosu-acilis` kaydına `izin_zemini` alanıyla damgalar — böylece hangi zeminle
  koşulduğu sonradan okunabilir (bugün hiçbir yerde yazmıyordu).
- **Kip `.kosu-acik`ın 4. alanıdır** ve sevk kapanış özetine yazar. Ayrım ölçülmüştür:
  `bassiz`'da izin reddi = **anında red + iz** (koşu sürer) · `interaktif`'te = **duran kapı,
  cevapsızsa koşu ASILI KALIR** (E0 §6). İkincisinde gözsüz koşu riski beyanlıdır ve tek
  çıkışı E5'in watchdog/DUR'udur; sevk bunu her `interaktif` koşuda kapanış özetine yazar.
- **Zemin gevşetilmez:** `--allowedTools` yalnız üretim araçlarını (Read/Write/Edit/Grep/Glob/
  Bash) açar; korumanın kendisi (file-guard [SERT]/ask + E2 hatları) kanca katmanındadır ve
  bayraktan etkilenmez — Değişmeyenler m.5 ayakta.

---

## 5 · Karne şartı (K2) — "kimse kendi işine yeşil diyemez" mekanikleşiyor

### 5.1 Karne = doğrulayıcı sınıfının zarf-eki

E3'ün `catal-denetcisi` sözleşmesinin birebir emsali. Biçim kapısına yeni sınıf: **KARNECILER**
(`dogrulayici`, `kurulum-denetcisi`). Bu koltukların dönüşü standart 6 alanlı zarf + **üç ek
satır** taşır (her biri ayrı satırın başında):

```
KARNE-KAPI: G-NN | KURULUM | KAPANIS
HÜKÜM:      YEŞİL | KIRMIZI | DOĞRULANAMADI
MADDELER:   <iddia=hüküm çiftleri, tek satır>
```

Kapı bunu denetler ve günlüğe **`karne`** kaydı düşürür (`kapi`, `hukum`, `maddeler`, `ajan`).
Kurallar:
- `KARNE-KAPI` çözülmeli (`G-\d+` ya da `KURULUM`/`KAPANIS`); çözülmezse dönüş red.
- `HÜKÜM` üç değerden biri; başka jeton red (E3'ün `GEÇTİ/DÖNDÜ` bayt-eşliği dersi: ASCII
  `\b` Türkçe harfte sınır saymaz — jeton **birebir** karşılaştırılır).
- **Öz-karne yasağı:** karnenin konusu olan görevi kim yaptıysa (günlükteki o görevin `zarf`
  kaydının `ajan`ı) karneyi o **yazamaz** — aynı ajansa dönüş red + `oz-karne` bulgusu.
  *Bu, kuralın adının mekanik karşılığıdır ve E3'ün "denetçi kendi zarfını kaynak yapamaz"
  dikişinin kardeşidir.*
- `KARNECILER` sınıfı **BEKLETİR kilidinden muaftır** (iş değil hüküm üretir — E3'te
  `DENETCILER` için verilen kararın aynısı).

### 5.2 Sevkin şartı

Bir kapı ancak şu üçü birden sağlanırsa **kapalı sayılır**:
1. KUTU tablosunda durumu `kapalı` (ya da `pas`),
2. günlükte o kapı için **YEŞİL** `karne` kaydı var,
3. karne **taze**: o görevin son `zarf` kaydından SONRA yazılmış (iş yeniden dokunulduysa
   eski karne düşer).

Aksi hâlde sevk durmayı engeller ve **doğrulayıcı talimatı** üretir. Böylece KT-003'ün "9
kapının 9'unu koordinatör kendi okumasıyla kapattı" tablosu mekanik olarak imkânsızlaşır.

`pas` kapılar karne İSTEMEZ (iş yapılmadı) ama **bulgu düşer** — sessiz pas geçmez.

---

## 6 · Kurulum kapısı (§5.2'nin yedi kalemi)

İki katman: **mekanik olan mekanikte, yargı olan koltukta.**

### 6.1 `tools/sevk/kurulum-kapisi.sh` (mekanik; çıkış 0/1 + satır satır gerekçe)

| Kalem | Mekanik denetim |
|---|---|
| 3 | Duruş sözleşmesi dört satır dolu (`BİTİŞ HÂLİ`/`KANIT`/`KISIT`/`BÜTÇE`), BÜTÇE'de sayı var; bağımlılık/risk bloğu **her kapı için** satır taşıyor ve biçimli |
| 6 | `karar-alani.sh` HAZIR (D-25 ③ proje katmanı) |
| 7 | `tools/guard/gercek-veri-isaretleri.txt` dolu — boşsa **beyan zorunlu**: "Hat-1 yalnız jenerik desenle koşuyor" |
| — | ek: `.claude/agents/*.md` içinde **`memory:` alanı YASAK** (tasarım §2.3 — zorunlu unutmanın ölüm noktası) · her kapı sahibi kadroda var |

`memory:` yasağı ayrıca **`kurulum-denetimi.sh`e** (GENESIS G4.5 sabit kapısı) eklenir: tasarım
"kurulum-denetimi KIRMIZI basar" diyor ve orası her kurulumda koşan tek sabit kapıdır.

### 6.2 `.claude/agents/kurulum-denetcisi.md` (yazamaz: Read/Grep/Glob)

Yedi kalemin **yargı gerektiren dördü** (1 izlenebilirlik matrisi · 2 çapa-İÇERİK doğruluğu ·
4 lokma boyu · 5 risk satırlarının bağımsız gözden geçirilmesi) + mekanik üçünün **sonucunu
okuyup rapora geçirmesi**. Dönüşü **karne**dir (`KARNE-KAPI: KURULUM`).

Koltuğun kuralları `dogrulayici`/`catal-denetcisi` ile aynı ailedendir: kaynaksız iddia
geçersiz · doğrulayamadığına YEŞİL deme · bulgu icat etme · değer sızdırma.

**Kapı:** `kurulum` türündeki koşu, `KURULUM` kapılı YEŞİL karne olmadan kapanmaz; rapor açılış
mührü paketine gider (bugün paket yalnız kurucunun kendi beyanıydı).

---

## 7 · Devir-şema kapısı (`tools/sevk/devir-kapisi.sh`)

**Kablo:** ayrı PreToolUse kancası, matcher **`Task|Agent`** (araç adı sürüme göre değişiyor —
E0 kalem 7: bu sürümde **Agent**; iki adı da tutuyoruz). **Koşu-AÇIK şartının ardında** —
el-sürüşlü oturumda alt-ajan çağrısı hiç etkilenmez.

**Üç denetim:**

1. **Şema.** `prompt` alanının her boş-olmayan satırı `<anahtar>: <değer>` biçiminde ve anahtar
   beyaz listede olmalı: `görev · kutu · sözleşme · kural · ek-okuma`. Serbest düzyazı satırı →
   `exit 2`. **Tavan 800 B.** `görev: G-NN` zorunlu.
2. **Talimat↔fiil (çağrı ucu).** `(subagent_type, G-NN)` ikilisi günlükteki **açık** bir
   `sevk-karar` kaydıyla eşleşmeli. Eşleşmiyorsa `exit 2` + `dikis-sapma` bulgusu.
   *Bu, iki deliği birden kapatır:* (a) sevkin hiç açmadığı görev/rol (§2.2 halkasının sapması),
   (b) **iç içe alt-ajan** — E0 yan bulgu 2: alt-ajan içinden ikinci seviye ajan açılabiliyor ve
   sevkin haberi olmuyordu; onun `sevk-karar` kaydı olmadığı için burada durur.
3. **`memory` sızıntısı.** Çağrı gövdesinde `memory` alanı geçiyorsa `exit 2` (zorunlu unutma).

**Dönüş ucu değişmez:** biçim kapısındaki (E1) talimat↔fiil dikişi aynen kalır; E4'ten sonra
`sevk-karar` kümesi artık DOLU olacağı için "beyanlı atlama" dalı fiilen kapanır.

**Fail-closed sınırı:** node yoksa ya da girdi çözülemezse — koşu-AÇIK iken `exit 2`
(denetimsiz devir yok), koşu yokken `exit 0`.

---

## 8 · Günlük şeması (surum:1 — genişleme)

Yeni tipler: **`karne`** · **`devir`** · **`bekci`**. Var olan tipler ve alanlar değişmez
(geri uyum: E1/E2/E3 satırları aynen okunur). `sevk-karar` kaydı E4'te ilk kez FİİLEN yazılır;
alanları: `gorev` · `rol` · `tur` · `sebep`.

`nabiz` kaydı sevkin her talimat ürettiği anda düşer (tasarım §8: "koşu-başı damgayı sevk,
Stop turunda talimatı ürettiği anda basar"); koşu-sonu damga zaten SubagentStop'un kaydıdır.

---

## 9 · `model:` denemesi ve kararı

**Deneme (T4):** `dogrulayici.md` frontmatter'ına `model:` satırı konur, alt-ajan koşusu
başsız kipte açılır; alan kabul ediliyor mu, koltuk koşuyor mu ölçülür.

**Ön karar (ölçüm sonucundan bağımsız gerekçe — raporda ölçümle birlikte kesinleşir):
doğrulayıcıya `model:` YAZILMAZ.** Üç gerekçe:
1. Bütün seçenekler aynı sağlayıcının modelleridir; `OTONOM_KOSU §8` zaten "iki göz onayladı
   iki BAĞIMSIZ kanıt sayılmaz" diyor — model satırı bağımsızlık **görüntüsü** üretir, kendisini
   değil. Bu, kanıt tür-bağımsızlığı kuralının ihlali sınıfındadır.
2. Doğrulayıcının yanlış-negatifi (yakalayamadığına yeşil demesi) kapının varlık sebebini
   yıkar; daha zayıf bir modele geçmek bu riski **artırır**, azaltmaz.
3. Alan çalışıyorsa kayda geçer ve **tek satırla açılabilir** — gerçek bir çok-sağlayıcı
   seçeneği doğduğu gün karar yeniden alınır (o gün D-23 gereği bu bir KONUŞMADIR).

---

## 10 · Doku değişiklikleri (tavan disiplinli)

| Dosya | Değişiklik | Tavan |
|---|---|---|
| `00_genesis/OTONOM_KOSU_KALIBI.md` | §1'e koşu türü + kip · yeni **§11 Sevk döngüsü** (görev seçimi beşlisi · karne şartı · frenler · devir şeması) | tavan **14.336 B DEĞİŞMEZ**; marj 1.552 B → ek ≤1.052 B (marj freni 500 B) |
| `.claude/settings.json` | `Stop` kancası + `Task\|Agent` matcher'lı PreToolUse | — |
| `tools/sevk/zarf-ekle.sh` | üç yeni tip | — |
| `tools/sevk/zarf-bicim-kapisi.sh` | KARNECILER sınıfı + karne sözleşmesi + öz-karne yasağı | — |
| `tools/guard/kurulum-denetimi.sh` | `memory:` yasağı (KIRMIZI) | — |
| `.claude/agents/dogrulayici.md` | karne dönüş sözleşmesi (8. madde) | — |
| `tools/sevk/README.md` · `tools/guard/README.md` | yeni parçalar | — |

**EL_KITABI'na TEK HARF eklenmez** (marj 44 B — dokunulmuyor). Tavan büyütme YOK: E3'te tavan
bir kez büyütüldü ve hasım turu haklı olarak "sözleşme güncellenmeden büyütme" dedi; E4 aynı
tavana **sığar**, detay `tools/sevk/README.md` ve koltuk dosyalarında yaşar (tavansız yüzeyler).

---

## 11 · T4/T5 tatbikat programı (kit `Dev/keel-tatbikat-e4`)

Sentetik kutu `KT-900-e4`: 3 üretim kapısı + 1 riskli + 1 bağımlılıklı; kadro `e4-uretici` +
`dogrulayici` + `kurulum-denetcisi` + `catal-denetcisi`.

| Koşu | Senaryo | Beklenen |
|---|---|---|
| **T4a** | 3-görevlik zincir, sahipsiz | sevk sırayla G-01→G-02→G-03 talimatı üretir; el dokunuşu 0 |
| **T4b** | karnesiz kapı | kapı `kapalı` işaretli ama karne yok → sevk **doğrulayıcı talimatı** üretir, koşu kapanmaz |
| **T4c** | bekçi koşu-içi | kapı kapandığı turda `bekci` kaydı düşer; ekilmiş KIRMIZI → duran kapı |
| **T4d** | devir şeması | serbest düzyazılı devir → `exit 2`; şemalı devir geçer (günlükten sayılır) |
| **T4e** | talimattan farklı rol / iç içe ajan | sevk-kararsız `(rol, G-NN)` → **çağrı anında** engel + `dikis-sapma` |
| **T4f** | BEKLETİR görevi | açık çatalın bekletir listesindeki görev **hiç açılmaz** (birincil hat) |
| **T4g** | öz-karne | işi yapan ajan kendi karnesini yazar → red + `oz-karne` |
| **T4h** | frenler | bütçe dolunca duran kapı · ilerleme-yok 2 turda duran kapı |
| **T4i** | `model:` denemesi | alan kabul ediliyor mu (ölçüm) |
| **T5a** | izlenebilirlik matrisi | BİTİŞ HÂLİ'nde karşılıksız madde → kurulum denetçisi KIRMIZI |
| **T5b** | çapa denetimi | kapı Kanıt hücresi yanlış dosyayı gösteriyor → KIRMIZI |
| **T5c** | mekanik kurulum kapısı | eksik BÜTÇE satırı · boş işaret listesi · `memory:` alanı → sırasıyla yakalanır |

**Sürüm sabiti:** `claude` **2.1.220** başsız (`-p --allowedTools …`), E0-E3 ile aynı (RSK-4).

**En kritik ölçüm:** *başsız kipte Stop kancasının `exit 2`'si koşuyu fiilen sürdürüyor mu.*
E0 Stop'un **ateşlendiğini** ölçtü; **engellediğini** ölçmedi. Tutmazsa omurga ayakta kalır ama
tetik kipi değişir (interaktif) — beyan edilmiş kırılma noktası, T4a'nın birinci işi budur.

---

## 12 · Hasım inceleme kaydı (koşu `wf_afd5bdc6-e08`, 2026-07-28)

**Yöntem:** paketin ilk hâli (`c38380b`) 7 mercekli bul→çürüt hattından geçti (5 şablon merceği +
E4'e özel iki mercek: **tasarım-uyumu** ve **harness-mekanik**); her ham bulguya bağımsız bir
çürütücü. **45 ajan · 5,1M jeton · 38 ham bulgu → 28 ayakta · 10 düşen.** Tekrarlar çıkınca
**~17 ayrık kusur;** tamamı işlendi. Salt-okunurluk kanıtı: koşu öncesi/sonrası
`git status --porcelain` birebir aynı (`?? .obsidian/`).

**En ağır sekizi (ve karşılığı):**

1. **Devir metni yazamaz koltuklara ölü sözleşme işaretçisi veriyordu** (`03_roller/<rol>/ROL.md`
   — o koltukların 03_roller evi YOK). *Aynı kusuru T4b canlı tatbikatında doğrulayıcı da
   KIRMIZI yazdı — bağımsız yakınsama.* → işaretçi yalnız VAR OLANI gösterir + devir kapısına
   **işaretçi-varlık denetimi** eklendi.
2. **Kurulum denetçisi yapısal olarak YEŞİL'e ulaşamıyordu:** sözleşmesi "mekanik kalemler sana
   prompt içinde verilir" diyordu ama verecek kanal yoktu (devir şeması serbest metni kesiyor,
   `kurulum-kapisi.sh`ı kimse çağırmıyor). → sevk `kurulum` turunda betiği KOŞAR, raporu diske
   yazar ve devir metni onu `ek-okuma` işaretçisiyle taşır.
3. **Üç fren de best-effort günlük yazımına bağlıydı** (`|| true`): yazım ölürse bütçe ·
   ilerleme-yok · mutlak tavan birlikte ölür ⇒ sonsuz Stop döngüsü. → `yaz_ya_da_kapat`:
   günlüğe yazılamıyorsa motor DURUR.
4. **Bekçi ışığı üç yönden hatalıydı:** çıkış kodu karara girmiyordu (çöken bekçi = sessiz
   yeşil) · ışık birleşik çıktıda alt-dize aramasıyla belirleniyordu · kanonun iki yerde yazdığı
   **"KUTU tavan KIRMIZI'sı koşuyu durdurmaz"** istisnası koda inmemişti. → üçü de düzeltildi
   (`TAVAN-KIRMIZI` ayrı sınıf; çıkış kodu fail-closed).
5. **Kanon "gerçek-kutu koşusunda T6 + watchdog şart" diyordu, kodda ne şart ne AYRIM vardı.**
   → göstergeye beşinci alan: **koşu sınıfı** (`gercek` varsayılan / `tatbikat` muaf). Bugün
   gerçek bir kutu E5 kurulmadan açılamaz — kanon cümlesi artık doğru.
6. **Karne şartı miras kapılara da uygulanıyordu** (karne mekaniği E4'te doğdu; eski kutunun
   hiçbir kapısının karnesi olamaz) ⇒ bütçeyi doğrulama koşuları yerdi. → şart yalnız BU
   KOŞUDA iş üretilmiş kapıya; miras kapı `miras-kapi` bulgusuyla geçer.
7. **Devir kapısı "AÇIK sevk-kararı" semantiğini kurmamıştı:** dönüşü gelmiş bir görev
   sınırsız kez yeniden açılabiliyordu. → karar/tüketim sayacı (zarf ve hüküm kayıtları, MAX).
8. **İki yeni kanca (Stop · Task|Agent) hiçbir testte aranmıyordu** — kablo koparsa suite yeşil
   kalırdı. → `settings.json` kablo testi (E1 emsali).

Ayrıca işlendi: `.dur` korumasızdı (file-guard dikişi eklendi) · bayat gösterge TTL'siz (12 saat)
· `pas` kapı kapanış özetinde "kapalı" diye raporlanıyordu · kanonun §4 gösterge tarifi §11 ile
çelişiyordu · dönüş dikişinin rol/koşu daraltması testsizdi · mutlak tur tavanı testsizdi ·
`kurulum-kapisi.sh` kural evini (`OTONOM_KOSU.md`) aramıyordu · dağıtılan koltuk dosyasına iç
proje vakası (saat + görev sayısı) gömülmüştü → genelleştirildi.

**Bir bulgu kendi hatamı gösterdiği için ayrıca yazıyorum:** düzenleme sırasında iki dosyaya
**NUL baytı** kaçtı (`" "` → `"\0"`). `bash -n` bunu yakalamaz, gözle görünmez ve gömülü node
bloğunda ayraç dizesini sessizce bozar. Hasım turu değil, kendi hijyen taramam yakaladı —
karşılığı `betik-hijyeni.test.mjs`e yeni bir lint: **kabuk betiklerinde NUL baytı yasak.**

**Düşen 10'un** çoğunu çürütücüler "beyanlı bilinçli sınır" ya da "kanıt yanlış okunmuş" diye
düşürdü; ikisi kısmen doğruydu ve dolaylı karşılandı (kapanış raporunun kanalı — E5 haber
kanalının işi; `ek-okuma` değerinin serbest metin taşıyabilmesi — artık işaretçi-varlık
denetimiyle daraldı).

## 13 · Dürüstlük kaydı (uygulama öncesi beyanlar)

1. **Model-aracılı halka deterministik değildir** (tasarım §14.3). Devir kapısı çağrı anını,
   biçim kapısı dönüş anını denetler; **aradaki modelin ne yaptığı denetlenmez** — güvence
   kafes + E2 hatlarıdır. "2. sızıntı kapanır" hükmü T4d/T4e geçene kadar iddiadır.
2. **Sevk körlüğü tasarım gereğidir:** panoda/KUTU'da yazmayan iş sevk için yoktur. Panzehir
   sevke zekâ eklemek değil kurulum kapısıdır (§6) — ve o kapı da bir modeldir.
3. **Karne şartı "doğru karne"yi garanti etmez**, yalnız *bağımsız bir karnenin varlığını ve
   tazeliğini* garanti eder. İçeriğin doğruluğu aynı-model sınırına tabidir (§9).
4. **Bekçi bir tariftir**, şablonda betiği yoktur; koşu-içi tazeleme kurulu projede anlamlıdır.
   Tatbikat kiti kendi minimal bekçisini kurar — bu, gerçek bekçinin kanıtı DEĞİLDİR.
5. **Sahip-temas sayacı (`UserPromptSubmit`) E4'e alınmadı** — tasarım §9'da var ama hiçbir
   E-satırında yok; her oturuma dokunan bir kanca olduğu için ölçüm katmanıyla (E5) birlikte
   tasarlanacak. Bilinçli erteleme.
6. **Paralellik 1'e indirildi** (tasarım "ilk sürümde 2" diyordu) — beyanlı sapma, gerekçe §3.2.
7. **Loopinance'a dokunulmaz** (D-05); şablon + vitrin bayt-eş (D-02/D-10).
8. **Gerçek kutu bugün koşamaz** (§12 madde 5): `gercek` sınıf T6 damgası + kurulu watchdog
   arar, ikisi de E5'te doğacak. Bu bir eksik DEĞİL, kanonun kendi şartının mekanikleşmesidir —
   ama pratik sonucu şudur: **E4 bittiğinde otonom koşu yalnız tatbikat kutusunda açılabilir.**
9. **Tören argümanı kabuk genişlemesine açık** (`$ARGUMENTS` tırnaksız): `kosu-ac.sh`ın titiz
   doğrulaması genişlemeden SONRA çalışır. Tetik insan-kilitlidir ve komut file-guard'ın
   PreToolUse dikişlerinden geçer; yine de rol töreninin sabit-argüman güvencesinden zayıftır.
10. **KIRMIZI karnenin otomatik düzeltme akışı v1'de yok:** kapı KIRMIZI karne alırsa koşu
    durur ve iş role/sahibe döner — sevk kapıyı kendi açamaz (yazma yetkisi yok, bilinçli).
11. **`--allowedTools` zemini tek satırdır ve daraltılmadı:** koşu kipinin izin zemini üretim
    araçlarını topluca açar; asıl koruma kanca katmanındadır (Değişmeyenler m.5). Araç-bazlı
    daraltma ölçülmedi — E5/E6 adayı.
