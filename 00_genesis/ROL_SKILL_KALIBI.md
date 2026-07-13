<!-- GENESIS kalıbı (G3.3c): her kadro rolü için .claude/skills/rol-«SLUG»/SKILL.md dosyasına
     KOPYALA, «alanları» doldur, bu yorum bloğunu SİL. Alanlar:
       «SLUG»    = ASCII rol slug'ı, 03_roller/<slug> klasör adıyla AYNI (ör. denetci)
       «ROL-ADI» = insan-görünümü Türkçe ad (ör. Denetçi)
       «MOD»     = yazamaz | tam  (G2 araç-profili)
     Kalıbın kendisini DÜZENLEME — kopyasını doldur. Sözleşme kopyalama: rol sözleşmesi
     ROL.md'de yaşar (tek-ev); beceri yalnız tören + protokol + işaretçidir. -->
---
description: «ROL-ADI» rolü oturum açılış töreni. Yalnız insan /rol-«SLUG» ile tetikler; ajan kendiliğinden tetikleyemez (bilinçli kilit).
disable-model-invocation: true
---

!`bash "$CLAUDE_PROJECT_DIR/tools/guard/rol-ac.sh" «SLUG» «MOD»`

# Rol töreni — «ROL-ADI»

Yukarıdaki tören çıktısında **"ROL AÇIK"** yoksa DUR: rolü açılmış sayma, sebebini sahibe
jargonsuz söyle (en sık sebep: bu oturumda başka rol açık — rol değişimi = YENİ oturum).

Açılış protokolü (sırayla):
1. `03_roller/«SLUG»/ROL.md` oku — rol sözleşmen budur (tek ev; burada kopyası yok).
2. `03_roller/«SLUG»/DURUM.md` oku — kaldığın yer.
3. `00_pano/PANO.md` "SIRADAKİ OTURUM" satırını doğrula — sıra bu rolde değilse DUR, sahibe söyle.
4. Sözleşmedeki yetki sınırı oturum boyu geçerli; mod **«MOD»**dur (yazamaz = dosya-yazma
   araçların kancayla mekanik kilitli; kendi `03_roller/«SLUG»/` klasörün hariç, ROL.md
   sözleşmen istisnanın DIŞINDA — engel görürsen bu ARIZA DEĞİL tasarımdır: bulguyu
   raporla, dosyayı değiştirme).
5. Kapanışta ROL.md'deki kapanış maddesini uygula (DURUM yaz · devir · F5 hijyen).
