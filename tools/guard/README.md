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
değişimi reddedilir; slug tek-token a-z0-9 ve rol `03_roller/` altında KAYITLI olmalı —
uydurma ada damga basılmaz, soğuk-denetim E3 yaması 2026-07-16). Her YENİ oturumun
başında SessionStart kancası (startup+clear) damgayı siler; `--resume` damgayı korur.
Damga `.gitignore`'dadır (oturum-durumu).

Komut araçlarına karışılmaz (Faz-1 dersi); ÜÇ BELGELİ İSTİSNA (dikişler):
(1) damga-dikişi — `.aktif-rol`a dokunan Bash komutu sahibe SORULUR (damganın git-izi
yok, bekçi ona kör; bu dikiş o deliği insan-sorusuna çevirir); (2) işaret-dikişi —
`.kurulum-tamam`a dokunan Bash komutu, işaret MEVCUTKEN sahibe SORULUR (işaret silinirse
koruma kurulum-moduna düşer — soğuk-denetim E2 yaması 2026-07-16; işaret YOKKEN dikiş
susar ki GENESIS'in işareti doğurması sürtünmesiz kalsın; işaret git-İZLİ olduğundan
silinme ayrıca bekçinin porcelain hattında da görünür); (3) çapa-dikişi —
`02_kanon/kilitli/.taban-ref`e dokunan Bash komutu, kurulum BİTMİŞKEN sahibe SORULUR
(çapayı ilerletmek kilitli-tarih sinyalini söndürür — V2 Öbek-1, 2026-07-23).
Üç dikiş de metin-eşleşmelidir, kusursuz değildir; bilinen sınırdır.

Kapanış kancası (`kapanis.sh`, SessionEnd): oturum kapanırken sırayla (0) **SENDE BEKLEYEN
süzmesi** — transcript'in son asistan mesajındaki D2 kapanış-bloğu çapasını (`SENDE BEKLEYEN:`)
arar; "N madde" ise maddeleri `00_pano/SENDE_BEKLEYEN.md` kuyruğuna tekilleştirerek EKLER
(kuyruğun mekanik yazarı budur — EL_KITABI F1 istisna 2; SİLME yok), blok durumunu bekçiye
`KAPANIS_BLOK` ile geçirir (yalnız rol damgası varken); (1) bekçiyi koşar
(`tools/bekci/bekci.sh` varsa — konvansiyon-yol; kuyruk ondan ÖNCE yazılır ki PANO sayacı
taze olsun); (2) `00_pano/oturum-gunlugu.jsonl`e tek satır oturum-meta düşürür (şema
`surum:2` — tarih · oturum · neden · rol · blok · bekleyen_eklendi · süre · token · damga-yaşı;
transcript'ten okunabildiği kadar; biçim Claude Code'un iç formatıdır, okunamayan
alan null düşer, satır HEP düşer). Günlüğün tek yazarı bu kancadır; append-only.
FAIL-OPEN: SessionEnd zaten engelleyemez (doc-teyitli) — kapanış hijyeni oturumu
rehin almaz; kancanın ölümünü bekçinin kablo-denetimi KIRMIZI basar. Vault değilse
(00_pano yoksa) kanca susar. Rol damgasını yalnız OKUR; temizlik SessionStart'ta.
node yoksa süzme atlanır (blok=bilinmiyor), meta satırı yine düşer.

Açılış kancası (`acilis.sh`, SessionStart startup+clear): kuyrukta AÇIK madde varsa oturum
başına TEK bilgi satırı basar (`Sende bekleyen N madde (en eskisi X gündür)`), yoksa susar.
Salt-okurdur, hiçbir dosyaya yazmaz; fail-open (kuyruk yoksa/bozuksa sessiz exit 0).
Yaş BİLGİdir — uyarı/eskalasyon YOKTUR (sahip kararı, 2026-07-24). `--resume` oturumlarında
çalışmaz (rol-temizliğiyle aynı matcher kümesi; bilinçli).

İş bölümü (çift hat):
1. Ön hat = bu kanca (araç katmanı, anında).
2. Yedek hat = bekçi: her koşuda guard + SessionStart/SessionEnd kablosu yerinde mi + git-İZLİ
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
