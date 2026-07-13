# file-guard — dosya koruma kancası

Ne yapar: Claude Code her araç çağrısı öncesi bu kancayı çalıştırır (PreToolUse).
Kanca dosya-yolu taşıyan çağrılarda `korunan-yollar.txt`e bakar:

- **[SERT]** → işlem KESİN engellenir, ajan gerekçeyi görür (guard'ın kendisi,
  `.claude/`, kilitli kararlar). Meşru değişikliğin yolu: sahip kararı + tören.
- **[SORULUR]** → sahibe SORULUR, onayla geçer (golden'lar, genesis arşivi).

İş bölümü (çift hat):
1. Ön hat = bu kanca (araç katmanı, anında).
2. Yedek hat = bekçi: her koşuda guard kablosu yerinde mi + korunan yollarda
   commit dışı değişim var mı diye bakar (kanca sessiz ölse bile tören yakalar).
3. `.claude/settings.json`daki ask kuralları kilitli/golden alanının araç-katmanı yedeğidir.

Bilinen sınır: kanca yalnız dosya-yolu taşıyan araç çağrılarını görür; kabuk
komutuyla yazım (`sed`, `>` …) kapsam DIŞIDIR — onu ikinci hat (bekçi) yakalar.

Kurulum istisnası: kökte `.kurulum-tamam` yokken (GENESIS kurulumu sürerken)
kanca yalnız ÇEKİRDEĞİ korur: `tools/guard/` (tek istisna: `korunan-yollar.txt`
yazılabilir — GENESIS veri doldurur) + `.claude/`. Diğer her şey kurulum boyunca
susarak geçer; kurulum bitince tam koruma kendiliğinden açılır.

Bakım: kanca kendi içinde hata verirse güvenli tarafta ENGELLER (fail-closed).
Kilitlenme yaşarsan: `korunan-yollar.txt` okunur mu, `node` kurulu mu bak.
Sorun sürerse settings'ten kancayı geçici kapat — bekçi bunu KIRMIZI basar,
normaldir; iş bitince geri aç.

Test: `cd tools/guard && node --test`
