---
description: Hasım inceleme düğmesi — verilen commit paketini çok-mercekli bul→çürüt hattından geçirir (salt-okunur). Uzun ve yakıt-yoğun inceleme; büyük yama paketinde kapanış mühründen önce kullanılır.
disable-model-invocation: true
---

# Hasım inceleme — düğme

Bu düğmeye yalnız insan basar (`/hasim-inceleme`); ajan kendi işine kendiliğinden hasım turu AÇAMAZ (kilit bilinçli — rol töreniyle aynı ilke).

Adımlar (sırayla):

1. **Maliyet uyarısını bas:** "Bu inceleme uzun sürer ve yakıt yakar (ölçü: paket boyuna göre ~10-20 alt-ajan). Küçük işte gerekmez; büyük yama paketinde kapanış mühründen önce anlamlıdır." İsteyen yine de istiyorsa devam.
2. **Hedef paketi netleştir:** incelemeye girecek commit listesi — her hedef: repo yolu + commit ref + tek satır not. İnsan verdiyse onu kullan; vermediyse son commit'lerden ÖNER ve ONAYLAT — onaysız koşma.
3. **Dönem-öncesi durum kaydı:** `git status --porcelain` çıktısını aynen kaydet (karşılaştırma tabanı).
4. **Workflow'u çağır:** Workflow aracına `{scriptPath: "<proje kökü>/.claude/workflows/hasim-inceleme.js", args: {targets: [...]}}` ver ve bitmesini bekle.
5. **Salt-okunurluk kanıtı (zorunlu):** inceleme bitince `git status --porcelain` TEKRAR al ve 3. adımla karşılaştır. FARK varsa DUR: hiçbir şeyi geri alma, örtme; sahibe aynen bildir. *Ders: "salt-okunur" sözü tek başına güvence değildir — Golden-09 olayı (2026-07-04).*
6. **Sonucu sahip-diliyle özetle:** ayakta kalan bulgular (şiddet sırasıyla, tek'er cümle) · çürüyen bulgular (tek satır) · porcelain karşılaştırması sonucu. Bulgu yoksa "temiz" de — doldurmak için bulgu ÜRETME (şişme defosu). Ayakta bulgular koordinatör/denetçi akışına taşınır; kapanışta D2 bloğu zorunlu (BİTEN · SENDE BEKLEYEN · SIRADAKİ).

Bilinen sınır (beyan): koşan inceleme ajanlarının salt-okunurluğu talimat katmanındadır (diff okumak için kabuk gerekir; araç-kilidi verilemez) — güvence 5. adımın mekanik karşılaştırmasıdır.
