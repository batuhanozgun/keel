<!-- yazar: genesis — her G-adımı kapanışında yerinde yeniden yazılır.
     Aşağıdaki fenced blok MAKİNE OKUR (tools/guard/kurulum-surucu.sh · tools/guard/acilis.sh ·
     tools/guard/kurulum-denetimi.sh): alan adları ve değerler BİREBİR eşleşir, tanınmayan değer
     fail-closed sayılır. Her alanın bir değeri, her alanın bir okuyucusu var — süsleme alan yok.
     Başlık bilerek `## MEKANİK BLOK` DEĞİLDİR — o ad kokpitin PANO sözleşmesine aittir
     (tools/kokpit/PANO_SOZLESMESI.md) ve alan dilbilgisi başkadır; aynı adı iki ayrı sözleşmeye
     vermek D-27'nin kapattığı çok-anlamlılığı diriltirdi.

     DURUM BİLGİSİ YALNIZ BLOKTA YAZILIR. Bu dosyanın eski hâlinde aynı üç olgu bir de düzyazıyla
     yazılıyordu (`**Durum:** …` · `## Tamamlanan adımlar` · `## Bekleyen adım`). Sürücü bloğu
     ilerlettiğinde o üç bölüm eskiyordu ve aynı dosya kendisiyle çelişiyordu: makine G1'de,
     düzyazı "kurulum başlamadı" (hasım turu 2026-07-29 — sahibin okuduğu yüzey yanlış oluyordu).
     Aynı olguyu iki yerde yazmak drift kapısıdır; ikinci kopya kaldırıldı.

     Tasarıda bir de `SÜRÜM` alanı vardı (B-43); bu pakette KONMADI ve sebebi mekanik: KEEL'in
     sürüm kimliği git geçmişinde yaşıyor, G0.1 (klasör hazırlığı) ise kuruluma başlamadan
     `.git`i siliyor — yani alan doldurulacağı anda bilgi zaten yok olmuş oluyor. Sürüm damgası,
     bilgiyi bağ koparılmadan ÖNCE yakalayan ya da dağıtımla gelen bir yol ister; o iş
     sürüm/güncelleme paketinindir (P5.6). -->

# GENESIS DURUM

## KURULUM DURUMU — makine okur (yazan: GENESIS ve kurulum sürücüsü)
```
Adım: —
Durum: başlamadı
Tamamlanan: —
```

`Adım` = açık adımın kimliği (`00_genesis/adimlar/SIRA.txt`) · `Durum` = **başlamadı** ·
**açık** (çalışıyorum) · **bekliyor** (sahibin mührünü/cevabını bekliyorum — oturum kapanabilir) ·
**bitti** (sıradakini sürücü açsın) · `Tamamlanan` = bitmiş adımlar, sıra sırasıyla, virgülle.
**Nerede kaldığın buradadır; başka yerde tekrarlanmaz.**

## Sahip adı
(G0'da onaylanınca buraya YALNIZ sahip adını yaz — açıklama/gerekçe ekleme, şablon-örneği adı buraya taşıma)

## Son mühür
(henüz yok)

## Format spec (G3b'de doldurulur)
(henüz yok)
