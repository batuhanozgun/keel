# file-guard — dosya koruma kancası + rol kafesi

Ne yapar: Claude Code her araç çağrısı öncesi bu kancayı çalıştırır (PreToolUse).
Kanca yalnız YAZMA araçlarını (Edit/MultiEdit/Write/NotebookEdit) değerlendirir ve
iki karar girdisi kullanır:

1. `korunan-yollar.txt` (yol koruması):
   - **[SERT]** → işlem KESİN engellenir, ajan gerekçeyi görür (guard'ın kendisi,
     `.claude/`, kilitli kararlar). Meşru değişikliğin yolu: sahip kararı + tören.
   - **[SORULUR]** → sahibe SORULUR, onayla geçer (golden'lar, genesis arşivi).
2. `.aktif-rol` damgası (rol kafesi): damga varsa ve mod **yazamaz** ise YAZMA sınıfı
   HER yolda kesilir — rolün kendi `03_roller/<slug>/` klasörü hariç (`ROL.md`
   sözleşme dosyası istisnanın DIŞINDA: rol kendi sözleşmesini değiştiremez).
   Öncelik: [SERT] > rol-kafesi > [SORULUR].

Rol kafesi mekaniği: damgayı yalnız `rol-ac.sh` yazar (tetik: insanın `/rol-<slug>`
töreni; argüman-doğrulamalı ve damga-değiştirmez — damga ancak boşken doğar, rol/profil
değişimi reddedilir). Her YENİ oturumun başında SessionStart kancası (startup+clear)
damgayı siler; `--resume` damgayı korur. Damga `.gitignore`'dadır (oturum-durumu).

Komut araçlarına karışılmaz (Faz-1 dersi); TEK BELGELİ İSTİSNA: `.aktif-rol`a dokunan
Bash komutu sahibe SORULUR — damganın git-izi olmadığından bekçi ona kördür, bu dikiş
o deliği insan-sorusuna çevirir (metin-eşleşmeli olduğundan kusursuz değildir; bilinen
sınırdır).

İş bölümü (çift hat):
1. Ön hat = bu kanca (araç katmanı, anında).
2. Yedek hat = bekçi: her koşuda guard + SessionStart kablosu yerinde mi + git-İZLİ
   korunan yollarda commit dışı değişim var mı diye bakar (kanca sessiz ölse bile tören
   yakalar). DİKKAT: damga git-izsizdir — rol kafesinin kabuk-yazımına karşı yedeği
   bekçi DEĞİL, yukarıdaki damga-dikişi + oturum-başı temizliktir.
3. `.claude/settings.json`daki ask kuralları kilitli/golden alanının araç-katmanı yedeğidir.

Bilinen sınır: kabuk komutuyla yazım (`sed`, `>` …) ve kancanın tanımadığı
yeni yazma araçları kapsam DIŞIDIR — git-izli korunan yolları ikinci hat (bekçi)
yakalar, damga için damga-dikişi devrededir. Okuma her zaman serbesttir.

Kurulum istisnası: kökte `.kurulum-tamam` yokken (GENESIS kurulumu sürerken)
kanca yalnız ÇEKİRDEĞİ korur: `tools/guard/` (istisna: `korunan-yollar.txt`
yazılabilir — GENESIS veri doldurur) + `.claude/` (istisna: `.claude/skills/`
yazılabilir — GENESIS rol becerilerini kurar). Diğer her şey kurulum boyunca
susarak geçer; kurulum bitince tam koruma kendiliğinden açılır.

Bakım: kanca kendi içinde hata verirse güvenli tarafta yalnız YAZMAYI engeller
(fail-closed; okuma/komutlar yaşar). `node`u PATH'te bulamazsa bilinen Homebrew
yollarında kendisi arar (GUI'den açılan oturumların dar PATH'ine karşı).
Kilitlenme yaşarsan: `korunan-yollar.txt` okunur mu, `node` kurulu mu, `.aktif-rol`
bayat/bozuk mu bak (bozuk damga = yazma kilidi; çözüm: yeni oturum ya da dosyayı
elle sil). Sorun sürerse settings'ten kancayı geçici kapat — bekçi bunu KIRMIZI
basar, normaldir; iş bitince geri aç.

Test: `cd tools/guard && node --test`
