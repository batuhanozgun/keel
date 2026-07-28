# tools/sevk — otonom koşu mekaniği (E1'den itibaren)

Otonom KEEL evrelerinin kod evi. Bu dizin `korunan-yollar.txt`te **[SERT]**tir: oturum içinde
değiştirilmez; meşru ihtiyaç → sahip kararı + tören. El-sürüşlü günlük kullanımda buradaki
hiçbir parça devreye girmez (koşu-AÇIK şartı).

- **`ortak.sh`** — sevk ailesinin ortak kitaplığı (E4): node keşfi · koşu göstergesi okuma
  (dört alan) · günlüğe yazım · güvenli JSON kurma. Beş betikteki aynı bloğun tek evi
  (D-02 dersi). **Kaynak alınmak değer EZMEZ** — kitaplık yalnız tanımlar (yaşanmış kırılma:
  düz atama, biçim kapısının okuduğu kutu adını siliyordu).
- **`kosu-ac.sh`** — `/kosu` töreni (E4, K3 tetiği; `rol-ac.sh` emsali, insan-kilitli beceri).
  Argüman doğrular → **kapılanma çapalarını arar** (dış göz + T0-T3 damgaları) → karar alanını
  denetler → göstergeyi yazar (`<koşu-id>·<kutu>·<tür>·<kip>`) → **sevkten bağımsız**
  `kosu-acilis` kaydını düşürür (E5 watchdog çapası) → izin zeminini basar. `kosu-ac.sh kapat`
  koşuyu sahip eliyle kapatır. Damga-değiştirmez: açık koşu varken ikincisi açılmaz.
- **`sevk.sh`** — koşunun MOTORU (E4): **Stop kancası.** Her turda sırayla: gösterge · kapılanma
  · DUR işareti · günlük bütünlüğü · frenler (bütçe/ilerleme-yok/mutlak tur tavanı) · çatal
  süzgeci · **karne şartı** · görev seçimi · kapanış. `exit 2` = durmayı engeller, stderr'daki
  talimat modele ulaşır; `exit 0` = koşu kapandı. **Fail-closed YÖNÜ terstir:** sevkin kendi
  hatası koşuyu sürdürmez, KAPATIR (aksi sonsuz Stop döngüsü olurdu). İş yapmaz, karar basmaz,
  kapı kapatmaz. Bekçiyi kapı-turunda konvansiyon-yoldan kendisi koşturur (KIRMIZI = duran kapı).
- **`devir-kapisi.sh`** — alt-ajan çağrısının PreToolUse kapısı (E4; matcher `Task|Agent`).
  Üç denetim: **şema** (devir metni yalnız `gorev·kutu·sozlesme·kural·ek-okuma`; tavan 800 B) ·
  **talimat↔fiil** ((rol, görev) açık bir `sevk-karar`la eşleşmeli — *iç içe alt-ajan da burada
  durur*) · **`memory` yasağı**. Geçen devir de izlidir (`devir` kaydı).
- **`kurulum-kapisi.sh`** — kutu kurulumunun MEKANİK denetimi (E4). GENESIS'in `kurulum-denetimi.sh`
  kapısıyla karıştırılmaz: o şablon aktarımını (bir kez), bu BİR KUTUNUN otonom koşuya hazırlığını
  denetler. Duruş sözleşmesi + bağımlılık/risk bloğu + kadro eşliği + karar alanı + işaret listesi
  + `memory` yasağı. Yargı kalemleri `kurulum-denetcisi` koltuğunundur.
- **`zarf-ekle.sh`** — zarf günlüğünün (`00_pano/zarf-gunlugu.jsonl`) TEK append-aracı:
  şema denetimli (surum:1), mkdir-kilitli, fail-closed. Günlük araç katmanında [SERT]
  (Edit/Write kesilir); bozuk satır bekçide KIRMIZI; şema-geçerli sahte satıra karşı mekanik
  yakalayıcı YOK (bilinen sınır — süreç disiplini, E2+ adayı).
- **`zarf-bicim-kapisi.sh`** — SubagentStop kancası: otonom koşuda alt-ajan dönüşünün biçim
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
  Koşu-AÇIK iken kuyruğa ARAÇLA yazım file-guard'da ENGEL: cevabı yalnız sahip yazar.
- **`.kosu-acik`** — koşu-AÇIK göstergesi (git-izlenmez; yazarı `/kosu`, sileni sevk). DÖRT alan:
  `koşu-id · kutu · tür (kurulum|yapim|kapanis) · kip (interaktif|bassiz)`.
- **`.dur`** — DUR işareti (E4: sevkin okuduğu 2. hat; birincil hat SubagentStop, E5). Varsa
  koşu duran kapıya gider; ilk satırı sebeptir.
- **`damgalar/`** — tatbikat damgaları (`T0`, `T1`, …): tek satır `tarih · kanıt işaretçisi`.
  Tören ve sevk damgasız AÇILMAZ — "kalkansız motor yok" ikisinin de ilk satırlarıdır (çift hat).

Yazamaz koltuklar (`.claude/agents/`): `dogrulayici` (dosya-gerçeği **+ E4 karne sözleşmesi**) ·
`catal-denetcisi` (sahibe gitmeden önceki çatal süzgeci, beş kalem — E3) · `kurulum-denetcisi`
(kutunun otonom koşuya hazırlığı, yedi kalem — E4).

## Karne şartı (K2 — E4'ün çekirdeği)

"Kimse kendi işine yeşil diyemez" E4'e kadar bir KURALDI; artık koşumdur. **Karneci sınıfı**
(`dogrulayici` · `kurulum-denetcisi`) dönüşüne üç satır ekler — `KARNE-KAPI` · `HÜKÜM` ·
`MADDELER` — ve biçim kapısı günlüğe ayrı bir `karne` kaydı düşürür. Sevk bir kapıyı **ancak**
(a) tabloda `kapalı`, (b) YEŞİL karne kaydı var, (c) karne o görevin **son iş-zarfından SONRA**
yazılmışsa kapalı sayar. Üç mekanik ayrıntı:

- **Öz-karne yasağı:** karnenin konusu olan işi yapan koltuk karneyi yazamaz (kapı keser + iz).
- **Sınıf ayrımı:** karneci/denetçi zarfları `sinif` alanı taşır (`karne`/`hukum`); tazelik
  ölçümü yalnız `is` zarflarına bakar — aksi hâlde karne kendi zarfından eski görünürdü.
- **KIRMIZI karne duran kapıdır** (v1): sevk kapıyı kendi açamaz, iş role/sahibe döner.

## Koşu sınıfı, bütçe ve bilinen sınırlar (hasım turu 2026-07-28)

- **Koşu sınıfı** göstergenin 5. alanıdır: `gercek` (varsayılan) ya da `tatbikat`. `gercek`
  koşu, OTONOM_KOSU §10'un iki EK şartını arar — **T6 damgası** (E5 kanal tatbikatı) ve
  **kurulu watchdog** (`tools/sevk/watchdog-kurulu`). Bugün ikisi de yoktur: yani gerçek bir
  kutu E5 kurulmadan sahipsiz koşamaz. Tatbikat koşuları muaftır (döngüsel bağımlılık olmasın).
- **BÜTÇE üretim + doğrulama koşularının TOPLAMIDIR:** karne şartı yüzünden bir kapı tipik
  olarak **iki** alt-ajan koşusu yer (üretim + doğrulayıcı). Duruş sözleşmesindeki sayıyı buna
  göre seç; küçük bütçe koşuyu doğrulamanın ortasında duran kapıya sokar.
- **Miras kapı:** karne mekaniği E4'te doğdu; koşudan ÖNCE kapanmış kapıların karnesi olamaz.
  Sevk onları yeniden doğrulatmaz (bütçeyi yerdi), tabloya güvenir ve `miras-kapi` bulgusu düşer.
- **Tur-tavanı şüphesi mekaniği:** `maxTurns` kesmesi işaretsizdir (E0 ölçümü); zarfı hiç
  dönmeyen koşu biçim kapısında yakalanır ve `tur-tavani-suphesi` bulgusu düşer. Sevk ayrıca
  dönüşü gelmeyen görevi **bir kez** yeniden sevk eder, ikincide duran kapı üretir.
- **Bayat gösterge:** koşu anormal biterse gösterge diskte kalır. Sevk 12 saatten eski damgayı
  duran kapı sayıp temizler — bu ikinci hattır; birincisi E5 watchdog'udur.
- **Bilinen sınır — tören argümanı:** `/kosu` becerisi `$ARGUMENTS`i kabuğa tırnaksız geçirir;
  `kosu-ac.sh`'ın titiz doğrulaması kabuk genişlemesinden SONRA çalışır. Tetik insan-kilitlidir
  (ajan çağıramaz) ve komutun tamamı file-guard'ın PreToolUse dikişlerinden geçer; yine de
  bu, rol töreninin sabit-argüman güvencesinden zayıftır — beyanlı sınır.

## Koşu turu, tek bakışta

```
/kosu KT-… yapim bassiz     → gösterge + kosu-acilis kaydı
   Stop → sevk → SEVK talimatı (exit 2) → ana oturum Agent açar
                                   ↓ devir-kapisi (şema + talimat↔fiil)
                              alt-ajan koşusu
                                   ↓ SubagentStop → zarf-bicim-kapisi (biçim + karne)
   Stop → sevk → … → açık iş yok / duran kapı → koşu kapanır (üç bloklu özet)
```

Kural evi: `02_kanon/OTONOM_KOSU.md` (kalıbı `00_genesis/OTONOM_KOSU_KALIBI.md`) ·
sahibin karar alanı: `02_kanon/KARAR_ALANI.md` (kalıbı `00_genesis/KARAR_ALANI_KALIBI.md`).
Tasarılar: `docs/superpowers/plans/2026-07-27-e1-durus-zarf-tasarisi.md` ·
`…-e2-onleme-tasarisi.md` · `…-e3-soru-kanali-tasarisi.md`.
Testler: `tools/guard/test/sevk.test.mjs` + `otonom-sim.test.mjs` (D-10: guard testleri
kokpit test klasörüne girmez; sevk de aynı evde yaşar).
