---
name: kosu
description: Otonom koşu açılış töreni (E4 · K3 tetiği). Yalnız insan /kosu ile tetikler; ajan kendiliğinden tetikleyemez (bilinçli kilit — koşuyu başlatan HER ZAMAN sahiptir, D-25 ①). Kullanım: /kosu <kutu> [yapim|kurulum|kapanis] [interaktif|bassiz] · kapatmak için /kosu kapat
disable-model-invocation: true
---

!`bash "${CLAUDE_PROJECT_DIR:-.}/tools/sevk/kosu-ac.sh" $ARGUMENTS`

# Koşu töreni — otonom kip

Yukarıdaki tören çıktısında **"KOŞU AÇIK"** yoksa DUR: koşuyu açılmış sayma, sebebini sahibe
jargonsuz söyle. En sık üç sebep: zaten açık bir koşu var · tatbikat damgalarından biri eksik
("kalkansız motor yok") · sahibin karar alanı yazılı değil (soru kanalı kapalı).

**"KOŞU AÇIK" gördüysen, bu oturumdaki rolün SEVK'tir ve sevk İŞ YAPMAZ.** Tek işin:

1. Oturumu bitirmeye çalıştığında **Stop kancası** (`tools/sevk/sevk.sh`) devreye girer ve sana
   ya bir **SEVK talimatı** verir ya da koşuyu kapatır. Talimatı AYNEN uygula.
2. Talimat sana bir `subagent_type` ve bir **devir metni** verir. Alt-ajan koşusunu Agent
   aracıyla aç ve devir metnini **AYNEN** geçir — tek harf ekleme. Devir-şema kapısı serbest
   düzyazı satırını, tavanı aşan metni ve sevkin açmadığı görev/rol ikilisini keser.
3. **Kendin dosya yazma, karar basma, kapı kapatma.** İçerik üretmek alt-ajan koşusunun,
   "kapandı" demek doğrulayıcının işidir (karnesiz kapı Stop'tan geçmez).
4. Alt-ajan dönüşünü **olduğu gibi** aktar; zarfı sen düzeltme. Biçim kapısı reddederse redde
   İTAAT ET ve gerekçeyi rapora geçir — zarfı kendi kaleminden tamamlama.
5. Duran kapı bildirimi geldiğinde koşu bitmiştir: sebebi ve kapanış özetini sahibe sade dille
   aktar, yeni iş İCAT ETME.

Kural evi: `02_kanon/OTONOM_KOSU.md` (koşu tanımı · duruş sözleşmesi · dönüş zarfı · sessizlik
kuralı · sevk döngüsü). Sahibin karar alanı: `02_kanon/KARAR_ALANI.md`.
