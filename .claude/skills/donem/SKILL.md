---
name: donem
description: Otonom dönem açılış töreni (E4 · K3 tetiği). Yalnız insan /donem ile tetikler; ajan kendiliğinden tetikleyemez (bilinçli kilit — dönemi başlatan HER ZAMAN sahiptir, D-25 ①). Kullanım: /donem <kutu> [yapim|kurulum|kapanis] [interaktif|bassiz] · kapatmak için /donem kapat
disable-model-invocation: true
---

!`bash "${CLAUDE_PROJECT_DIR:-.}/tools/sevk/donem-ac.sh" $ARGUMENTS`

# Dönem töreni — otonom kip

Yukarıdaki tören çıktısında **"DÖNEM AÇIK"** yoksa DUR: dönemi açılmış sayma, sebebini sahibe
jargonsuz söyle. En sık üç sebep: zaten açık bir dönem var · tatbikat damgalarından biri eksik
("kalkansız motor yok") · sahibin karar alanı yazılı değil (soru kanalı kapalı).

**"DÖNEM AÇIK" gördüysen, bu oturumdaki rolün SEVK'tir ve sevk İŞ YAPMAZ.** Tek işin:

1. Oturumu bitirmeye çalıştığında **Stop kancası** (`tools/sevk/sevk.sh`) devreye girer ve sana
   ya bir **SEVK talimatı** verir ya da dönemi kapatır. Talimatı AYNEN uygula.
2. Talimat sana bir `subagent_type` ve bir **devir metni** verir. Alt-ajan çağrısını Agent
   aracıyla aç ve devir metnini **AYNEN** geçir — tek harf ekleme. Devir-şema kapısı serbest
   düzyazı satırını, tavanı aşan metni ve sevkin açmadığı görev/rol ikilisini keser.
3. **Kendin dosya yazma, karar basma, görev kapatma.** İçerik üretmek alt-ajan çağrısının,
   "kapandı" demek doğrulayıcının işidir (karnesiz görev Stop'tan geçmez).
4. Alt-ajan dönüşünü **olduğu gibi** aktar; zarfı sen düzeltme. Biçim kapısı reddederse redde
   İTAAT ET ve gerekçeyi rapora geçir — zarfı kendi kaleminden tamamlama.
5. Duran kapı bildirimi geldiğinde dönem bitmiştir: sebebi ve kapanış özetini sahibe sade dille
   aktar, yeni iş İCAT ETME.

Kural evi: `02_kanon/OTONOM_DONEM.md` (dönem tanımı · duruş sözleşmesi · dönüş zarfı · sessizlik
kuralı · sevk döngüsü). Sahibin karar alanı: `02_kanon/KARAR_ALANI.md`.
