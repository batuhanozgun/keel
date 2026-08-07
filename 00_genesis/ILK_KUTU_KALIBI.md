<!-- İLK KUTU KALIBI (G4): 01_kutular/KT-001-proje-plani/KUTU.md'ye KOPYALA, tek alanı
     doldur, bu bloğu SİL. Kalıp metni SABİTTİR: kopyala, alanı doldur — DERLEME/YENİDEN-YAZMA YOK.
     Doldurulacak TEK alan: «KOORDİNATÖR-SLUG» = G2'de kurduğun koordinatör rolünün slug'ı
     (03_roller/<slug>/ ve .claude/agents/<slug>.md ile AYNI; genelde `koordinator`).
     Kutu adı da SABİTTİR (`KT-001-proje-plani`) — çekilme kapısı kabuğu SAYARAK değil ADIYLA
     arar; sayılan kabuk "bir kutu var" der, adlandırılmış kabuk "DOĞRU kutu var" der.

     NEDEN SABİT: GENESIS ürün planı yapmaz (indeksteki "Sınır"). Eski G4 ondan ince dilim
     önermesini, kabul ölçütü yazmasını ve mühürletmesini istiyordu — hiç koşturmadığı bir
     ekibin ilk işini kuran, kendisiydi. Artık ilk kutu bir KABUKTUR: içini ekip doldurur.
     Sabit metin ayrıca kurulum çıktısını ölçülebilir kılar (aşağıdaki üç çapa cümlesi).

     TAVAN: KUTU 10 KB (EL_KITABI F3). Bu kalıp doldurulunca ~4 KB'dir; kalan pay ekibin
     doğuracağı görev satırları ve risk bloğu içindir. -->
<!-- yazar: koordinator -->
# KT-001 — Proje planı (AÇIK)

**Durum:** AÇIK — ama **açılış mührü bekliyor.** Kutu ancak sahip mührü verince çalışmaya başlar;
mührü GENESIS vermez, sahip verir. Tek faz · tek demo.

**Açılış mührü:** bekliyor

<!-- Yukarıdaki satır MAKİNE-OKURDUR ve dönemin ön koşuludur (K3, 2026-08-07): mühürsüz kutuya
     `donem-ac.sh` dönem AÇMAZ. Mühür gelince satır "ad · YYYY-AA-GG" olur (G5 adımı damgalar,
     ör. "Batu · 2026-08-07"); gelmezse `bekliyor` kalır ve kalem sahibin kuyruğuna düşer.
     Doğuş: bu satır 2026-08-07'ye kadar HİÇBİR kalıpta yoktu — G5 var olmayan bir satıra damga
     bastırıyordu ve mührü okuyan tek bir betik bile yoktu, yani "mühürsüz eşik = süreç ihlali"
     hükmü (EL_KITABI) tamamen düzyazıda yaşıyordu. Satırı SİLMEK dönemi açmaz, KIRMIZI yapar.
     Yer tutucu köşeli tırnak BİLEREK yok: kurulum denetimi doldurulmamış alanı o işaretle arar
     ve bu yorum onu tetiklerdi (ölçüldü — kapı haklıydı, yorum düzeltildi). -->

## Bu kutunun işi

Bu kutunun işi, bu projenin nasıl yürütüleceğini çıkarmaktır. Kod yazmakla başlanmaz. Sonunda ne
var olacağını, süreçte hangi bilgiye ihtiyaç duyulacağını ve hafızasız oturumlar için neyin
nereye kaydedileceğini çıkarın.

## Görevler
| Görev | İş | Sahip | Durum | Kanıt |
|---|---|---|---|---|
| G-01 | Proje planını çıkar: her role birer görev doğur, sonra hepsini tek planda topla | «KOORDİNATÖR-SLUG» | açık | demo: dört ortak çıktı dosyası açılıp sahibe okunur |

**Görev listesini G-01 doğurur.** Koordinatör ilk iş olarak **iş zincirindeki her role bir görev**
açar (G-02, G-03, …; bir görev = bir rol = bir alt-ajan çağrısı — `tools/sevk/devir-kapisi.sh` iç
içe alt-ajanı durdurur). **Dış göz ve yazamaz koltuklar HARİÇ:** onlar iş zincirinin dışındadır ve
dosya yazamazlar (rol kafesi kancada kesin engeldir — görev verilirse alt-ajan çağrısı exit 2 ile
düşer). Her rol **kendi dosyasına** yazar: `01_kutular/KT-001-proje-plani/gorus-<slug>.md`
— üç soru: projenin sonunda ne olacak · süreçte neye ihtiyacım var · hafızasız oturum için ne
kaydedilmeli. **Son görev yine koordinatörün:** hepsini aşağıdaki dört çıktıda toplar.

**Bu kutunun görev tavanı:** iş zincirindeki rol başına en çok bir görev + bir toplama görevi
(sevk bu sayıyı `03_roller/` altındaki yazamaz-olmayan rollerden okur ve aşılırsa haber verir). EL_KITABI
kutu-döngüsü 1'deki **≤5 görev** tavanı *ürün dilimi* kutuları içindir (tek faz · tek
gözle-görülür demo · tek domain rolü); bu kutu ürün dilimi değil, planlama kutusudur ve
görev sayısı kadro büyüklüğünün türevidir. Sapma değil, tanımlı istisnadır.

## Dört ortak çıktı (kutunun ürünü)
| Çıktı | Nereye yazılır |
|---|---|
| Projenin bitti tanımı | `02_kanon/BITTI_TANIMI.md` (iskeleti G3'te doğdu) |
| Bilinmeyenler — her satırda cevabın kaynağı: **sahip / araştırma / ancak ilk gerçek işte** | `01_kutular/KT-001-proje-plani/BILINMEYENLER.md` |
| Kayıt düzeni — hangi bilgi hangi **mevcut** dosyaya (yeni arşiv İCAT EDİLMEZ) | `01_kutular/KT-001-proje-plani/KAYIT_DUZENI.md` |
| Sonraki kutular — ad, sıra, tek cümle gerekçe | `02_kanon/KUTU_PLANI.md` (iskeleti G3'te doğdu) |

Kayıt düzeni kesinleşince toplama görevi **rol sözleşmelerinin "Açılış ek-okumaları" satırını**
günceller (`03_roller/<slug>/ROL.md`) — GENESIS oraya "ilk kutuda güncellenecek" yazdı, bu o an.

## Bu kutu bitince gözünle göreceklerin
1. `02_kanon/BITTI_TANIMI.md`'yi açtığında, bu projenin **ne zaman bittiğini** tek sayfada okursun.
2. `02_kanon/KUTU_PLANI.md`'yi açtığında, **sıradaki kutuların adını ve sırasını** görürsün.
3. Ekibin sana **bilmediklerini** listeler ve her satırda cevabın kimden geleceğini söyler — hangileri sana sorulacak, hangileri araştırılacak, hangileri ancak ilk gerçek işte belli olacak.

## Kabul kriterleri
- **Alt sınır (tek başına evet/hayır):** dört çıktının dördü de yazılı ve sahibe okundu.
- **Üst sınır (kapsam aşımı = hata):** ürün kodu yazmak · mimari seçim mühürletmek · sonraki
  kutuların içini doldurmak. Bu kutu **sırayı** çıkarır, işi yapmaz.

## Duruş sözleşmesi
BİTİŞ HÂLİ: dört ortak çıktı yazılı ve sahibe okunmuş
KANIT:      demo: dört dosya sahibe açılıp okunur · `02_kanon/BITTI_TANIMI.md` ile `02_kanon/KUTU_PLANI.md` iskelet olmaktan çıkmıştır
KISIT:      ürün kodu yazılmaz · `02_kanon/kilitli/` ve `02_kanon/golden/` içeriğine dokunulmaz · yeni arşiv/klasör düzeni icat edilmez (kayıt düzeni MEVCUT dosyaları adresler)
BÜTÇE:      dönem başına en çok 6 ÜRETİM çağrısı · ilerleme-yok eşiği 2 tur · toplam dönem tavanı 6
LİSTE:      dönem içinde doğar — bu kutunun görev listesini G-01 üretir (planlama kutusu)
İZİN:       kutu-ciktilari

**İZİN satırı ne yapar:** otonom dönemde "sahibe sor" penceresi açılmaz — pencere açmak, gözetimsiz
çalışmanın bittiği andır. Bu kutunun ekibi yalnız `02_kanon/BITTI_TANIMI.md` ile
`02_kanon/KUTU_PLANI.md` dosyalarına yazabilsin diye tek sınıf önceden serbesttir
(`kutu-ciktilari`); listede olmayan bir izin gerekirse o adım ATLANIR ve sahibin kuyruğuna not
düşer. Sözlük: `git-obje` · `disa` · `mcp` · `yazim` · `korumali-yol` · `kutu-ciktilari` (hiçbiri
gerekmiyorsa `yok`). Ekibin commit atması isteniyorsa `git-obje` eklenir — bu kutuda gerekmez.

## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)
G-01: onkosul=yok · risk=düşük — süreç işi; ürün koduna dokunmaz, geri dönüşü dosya silmektir
