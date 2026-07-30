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

**Porcelain dikişi** (dış göz paketi, D-20 parça 2): kafes Edit/Write'ı keser, KABUK yazımını
kesmez — dış göz gibi koltuklar meşru olarak kabuk kullandığı için delik büyür. Dikiş deliği
kapatmaz, ÖLÇÜLEBİLİR yapar: tören `yazamaz` profilde damganın **2. satırına** kirlilik özetini
yazar (`porcelain\t<özet>`), kapanış kancası kendi yazımlarından ÖNCE aynı özeti tekrar alır
(`es`/`fark`/`yok`), sonucu günlüğe düşürür ve bekçiye `KAPANIS_PORCELAIN` ile geçirir → `fark`
= SARI. Özetin tek evi `porcelain.sh` (SOURCE edilen kitaplık — iki kopya ayrışırsa her oturum
sahte "fark" basardı). Kapsam dışı: rolün kendi evi + bekçinin çıktıları (PANO/SAGLIK).
Kitaplık yoksa dikiş sessizce susar (tören ölmez); ölümünü bekçinin koruma-hattı KIRMIZI basar.

Komut araçlarına karışılmaz (Faz-1 dersi); BELGELİ İSTİSNALAR (dikişler):
(1) damga-dikişi — `.aktif-rol`a dokunan Bash komutu sahibe SORULUR (damganın git-izi
yok, bekçi ona kör; bu dikiş o deliği insan-sorusuna çevirir); (2) işaret-dikişi —
`.kurulum-tamam`a dokunan Bash komutu, işaret MEVCUTKEN sahibe SORULUR (işaret silinirse
koruma kurulum-moduna düşer — soğuk-denetim E2 yaması 2026-07-16; işaret YOKKEN dikiş
susar ki GENESIS'in işareti doğurması sürtünmesiz kalsın; işaret git-İZLİ olduğundan
silinme ayrıca bekçinin porcelain hattında da görünür); (3) çapa-dikişi —
`02_kanon/kilitli/.taban-ref`e dokunan Bash komutu, kurulum BİTMİŞKEN sahibe SORULUR
(çapayı ilerletmek kilitli-tarih sinyalini söndürür — V2 Öbek-1, 2026-07-23);
(4) dönem-dikişi — `.donem-acik`a dokunan Bash komutu (E1: gösterge silinirse SubagentStop
kapısı sessiz söner). Hepsi metin-eşleşmelidir, kusursuz değildir; bilinen sınır.
**F1-5f (2026-07-30) bu dört dikişin dönem-içi davranışını değiştirdi:** otonom dönem AÇIKKEN
"sahibe sor" kararı PENCERE AÇMAZ — dördü de ENGEL olur (bunlar yapının kendi kilitleridir ve
önceden serbest bırakılamaz). El-sürüşlü oturumda dördü de eskisi gibi SORULUR.

**E2 önleme katmanı (2026-07-27; tasarı `docs/superpowers/plans/2026-07-27-e2-onleme-tasarisi.md`):**
- **Hat 1 — içerik süzgeci** (`icerik-suzgeci.sh` ortak betik + `gercek-veri-isaretleri.txt`
  veri dosyası): yazma araçlarının YENİ içeriği ve yazım-kalıplı Bash komut metni
  TCKN/IBAN/kart (checksum'lı) + işaret listesine taranır; eşleşme = ENGEL ("önleme
  bulgusu"). HER KİPTE keser (V3 vakası el-sürüşlü dönemde yaşandı). Süzgeç yoksa yazma
  fail-closed engellenir (komutlar yaşar). Süzgeç eşleşen DEĞERİ hiçbir kanala yazmaz.
  İçerik taraması Edit/Write/Bash-yazımı VE **mcp__ tool_input**'unu da kapsar (her kanalda
  içerik fail-closed — hasım bulgusu: "her kipte keser" beyanı MCP'yi de içermeli).
- **Hat 2 — dışa-giden**: komut-konumunda `git push`/`curl`/`wget`/`ssh`/`scp`/`sftp`/
  `rsync`/`mail`/`sendmail`/`gh`/`npm publish` → sahibe SORULUR (her kipte; settings-ask
  öneki çift hattır, bu dikiş bileşik/çok-satırlı komutu yakalar). Komut-konumu çözümlemesi
  env/sudo/nohup öneklerini ve git global bayraklarını atar, mutlak yolu son parçaya indirir
  → `git -C x push`, `/usr/bin/curl`, `sudo scp` yakalanır (hasım bulgusu). + **MCP dikişi**:
  dönem-AÇIK iken `mcp__*` araç çağrısı (kutu dışına iş çıkaran, dosya izi bırakmayan kanal).
- **Hat 3 — worktree**: hedef `.claude/worktrees/<ajan>/` altında VE orada gerçek worktree
  varsa (`<ajan>/.git` dosyası) kurallar worktree SANAL köküne göre değerlendirilir (koruma
  haritası worktree'de aynen; iş alanları serbest — E0 çarpışma bulgusunun çözümü). Gerçek
  worktree yoksa (uydurma yol) sanal kök AÇILMAZ → `.claude/` [SERT] kalır (hasım bulgusu:
  sahte-worktree ile [SERT] delme kapandı). + **git-obje dikişi**: dönem-AÇIK iken
  `git add/commit/stash`; worktree bağlamında her hâlde ENGEL (ortak nesne deposu).
- **Yazım+korumalı-yol dikişi**: yazım-kalıplı Bash komutu (yönlendirme/heredoc/`tee`/`cp`/
  `mv`/`dd`/`rsync`/`sed -i`) korunan-yollar kaydını anıyorsa SORULUR (hedef/kaynak metinden
  ayrılamaz; `2>/dev/null` yazım sayılmaz; kurulum sürerken yalnız çekirdek üçlü sorulur).
- **İZİN KAPISI (F1-5f, 2026-07-30):** yukarıdaki "SORULUR" kararlarının hepsi otonom dönemde
  kutunun `İZİN:` satırına bakar. Sözlük: `git-obje` · `disa` · `mcp` · `yazim` ·
  `korumali-yol` ([SORULUR] yol yazımı) · `kutu-ciktilari` (`BITTI_TANIMI.md`/`KUTU_PLANI.md`).
  Listede yazan sınıf SERBEST geçer (izni sahip kutu açılışında verdi), yazmayan `exit 2`
  (ENGEL-IZIN) alır: ajan o adımı atlar, zarfına `İZİN-ENGELİ` yazar, sevk sahibin kuyruğuna
  sabit cümleli not düşer ve dönem SÜRER. **Kural evi (`00_genesis/` · `OTONOM_DONEM.md` ·
  `KARAR_ALANI.md`) sözlükte YOKTUR** — önceden serbest bırakılamaz.

**E3 kuyruk dikişi (2026-07-28; tasarı `…-e3-soru-kanali-tasarisi.md`):** dönem-AÇIK iken
`00_pano/SENDE_BEKLEYEN.md`'ye yazma aracıyla dokunmak **ENGEL**dir. Gerekçesi
`OTONOM_DONEM §6.1`: *"cevap yalnız sahibin açık cevabıyla CEVAPLANDI olur; başka hiçbir olay
durumu değiştiremez"* — dönemin kendi eliyle `[x] cevap: …` yazabilmesi o kilidi deliyordu
(hasım bulgusu; kilidin fiilen açıldığı ölçüldü). Meşru yazıcı kanca sürecindeki
`tools/sevk/catal-kuyruk.sh` betiğidir ve o bu engelden geçmez. **El-sürüşlü oturumda dikiş
YOKTUR:** D-21'in "cevabı alan rol kapanış işareti koyar" akışı aynen sürer.

**E4 kabloları (2026-07-28; tasarı `…-e4-sevk-tetik-kurulum-tasarisi.md`):** `.claude/settings.json`
iki yeni kanca bağlar — **`Stop` → `tools/sevk/sevk.sh`** (dönemin motoru; dönem-AÇIK değilse tam
sessiz) ve **`PreToolUse` matcher `Task|Agent` → `tools/sevk/devir-kapisi.sh`** (alt-ajan
çağrısının şema + talimat↔fiil kapısı; dönem-AÇIK değilse yok hükmünde). file-guard'ın `*`
matcher'lı hattı değişmedi, ikisi yan yana koşar. Ayrıca `kurulum-denetimi.sh`e **alt-ajan
`memory:` yasağı** eklendi (KIRMIZI): roller arası zorunlu unutmanın tek ölüm noktası artık
kurulumun sabit kapısında aranıyor.

**Perf ve degrade (hasım bulguları):** Bash yalnız bir dikiş-tetikleyici token taşıyorsa
node'a iner (`ls`/`grep`/`cat`/`pwd` node görmez). node YA DA süzgeç çalışamazsa: YAZMA
araçları fail-closed (engel), Bash/MCP fail-open (komut serbest — pre-E2 tabanı korunur, ama
koruma damgasına dokunan Bash yine engel).

Kapanış kancası (`kapanis.sh`, SessionEnd): oturum kapanırken sırayla (-1) **porcelain
karşılaştırması** (yukarıda; kancanın kendi yazımlarından ÖNCE); (0) **SENDE BEKLEYEN
süzmesi** — transcript'in son asistan mesajındaki D2 kapanış-bloğu çapasını (`SENDE BEKLEYEN:`)
arar; "N madde" ise maddeleri `00_pano/SENDE_BEKLEYEN.md` kuyruğuna tekilleştirerek EKLER
(kuyruğun mekanik yazarı budur — EL_KITABI F1 istisna 2; SİLME yok), blok durumunu bekçiye
`KAPANIS_BLOK` ile geçirir (yalnız rol damgası varken); (1) bekçiyi koşar
(`tools/bekci/bekci.sh` varsa — konvansiyon-yol; kuyruk ondan ÖNCE yazılır ki PANO sayacı
taze olsun); (2) `00_pano/oturum-gunlugu.jsonl`e tek satır oturum-meta düşürür (şema
`surum:3` — tarih · oturum · neden · rol · blok · bekleyen_eklendi · porcelain · süre · token · damga-yaşı;
transcript'ten okunabildiği kadar; biçim Claude Code'un iç formatıdır, okunamayan
alan null düşer, satır HEP düşer). Günlüğün tek yazarı bu kancadır; append-only.
FAIL-OPEN: SessionEnd zaten engelleyemez (doc-teyitli) — kapanış hijyeni oturumu
rehin almaz; kancanın ölümünü bekçinin kablo-denetimi KIRMIZI basar. Vault değilse
(00_pano yoksa) kanca susar. Rol damgasını yalnız OKUR; temizlik SessionStart'ta.
node yoksa süzme atlanır (blok=bilinmiyor), meta satırı yine düşer.

Açılış kancası (`acilis.sh`, SessionStart startup+clear): BEŞ koşullu bilgi satırı; hiçbiri
her oturumda çıkmaz, koşul yoksa susar — (1) kuyrukta AÇIK madde varsa `Sende bekleyen N madde
(en eskisi X gündür)`; (2) `03_roller/disgoz/` varsa ve brifingin içindeki `Tarih:` satırı 7
günden eskiyse (ya da brifing/tarih yoksa) `... dış göz brifingi ... "durumu anlat"
diyebilirsin` — bu YUMUŞAK hatırlatmadır, kapanış kilidi değil (kilit bekçidedir ve git
tarihine bakar); (3) `00_pano/SABAH.md` varsa gece dönemine köprü (E5); (4) `ortam-kontrol.sh
--satir` — ZORUNLU bir dış araç (node/git) eksikse tek satır; seçimli eksikte SUSAR (F1-2a);
(5) `.kurulum-tamam` YOK **ve** `tools/guard/.keel-kaynak` YOK ise kurulumun nerede kaldığını
söyler — durum **MAKİNE BLOĞUNDAN** okunur (`00_genesis/GENESIS_DURUM.md` → `## KURULUM DURUMU`
→ `Durum:`): `başlamadı` ise `Bu klasörde kurulum henüz başlamadı …` (F1-1; bu hâlde bugüne
kadar hiçbir yüzey konuşmuyordu), aksi hâlde — açık · bekliyor · blok bozuk/yok — `Kurulum yarım
kalmış …` (F1-2f). Satır bekleyen adımın ADINI taşımaz; sahibin sözlüğünde olmayan etiket bu
yüzeye giremez. **Neden insan cümlesi değil blok (2026-07-29):** eski çapa `**Durum:** kurulum
başlamadı.` satırını arıyordu ve iki ölçülmüş kusuru vardı — (a) aynı cümlenin bir KOPYASI dosyanın
başka bir yerinde satır başında geçerse hatırlatma KALICI susuyordu (bayrak sıfırlanmıyor, ilk
eşleşme yetiyor), (b) cümlenin biçimi azıcık kayarsa (liste maddesi, kalın yazımın kayması) taze
şablonda YANLIŞ ALARM doğuyordu. Aynı olgu iki yerde yazılıysa drift kapısıdır — tek kaynak bloktur.
Salt-okurdur, hiçbir dosyaya yazmaz; fail-open (dosya yoksa/bozuksa sessiz exit 0).
Yaş BİLGİdir — uyarı/eskalasyon YOKTUR (sahip kararı, 2026-07-24). `--resume` oturumlarında
çalışmaz (rol-temizliğiyle aynı matcher kümesi; bilinçli).

Kurulum girişi (`klasor-hazirligi.sh`, GENESIS G0.1 — F1-2b): indirilen KEEL klasörünü sahibin
PROJE klasörü yapar. `--rapor` (varsayılan) SALT-OKUR sınıflar: **BAGLI** (`.git` var + uzak
adreslerden biri KEEL dağıtım deposunu gösteriyor — eşleşme sağdan çapalı) · **DEPOSUZ**
(`.git` yok) · **KENDI** (uzak adres KEEL'i göstermiyor → dokunulmaz). `--uygula` sırası
değişmez: yedeği yan klasöre al (`<ad>-KEEL-yedek`, `.git` dâhil) → **doğrula** (dosya sayısı +
`GENESIS.md` boyu + `.git`) → `rm -rf <kök>/.git` → `git init`. **Bu, KEEL'in tek geri alınamaz
kurulum işlemidir**; dört emniyet kemeri önce koşar (KEEL izleri var mı · `tools/guard/.keel-kaynak`
[dağıtılmaz; varsa burası KEEL'in kendi kopyasıdır] · kurulum başlamış/bitmiş mi · git var mı).
Ölçüm FAIL-CLOSED'dır: git patlarsa "bağ yok" denmez, çıkış 2 verilir. Çıkış kodları: 0 gerek
yok/tamam · 1 gerekli ya da yapılamadı · 2 denetim koşamadı. Bağın koparıldığını çekilme anında
`kurulum-denetimi.sh` 4c yeniden ölçer (çift hat). İLAN EDİLMİŞ SINIR: ölçülen şey uzak
ADRESTİR, geçmiş değil — ayna/çatal depodan kurulumda KEEL geçmişi klasörde kalır ve görülmez.

Kurulum sürücüsü (`kurulum-surucu.sh`, **Stop** kancası — F1-1): kurulum SIRASINI taşır. Tek işi
"hangi adımdayız · sıradaki hangisi · atlanmış mı"; içerik yazmaz, mühür vermez, adım bitirmez.
Adı bilerek "sevk" DEĞİL (o kelime bir görevi alt-ajana vermek demektir — `docs/SOZLUK.md` §2b);
yeri bilerek `tools/guard/` (kurulum penceresinde de `[SERT]`, yani kuran ajan onu yeniden yazamaz).
**Saf kabuk** — node çağırmaz: kanca her oturum kapanışında koşar ve node'un varlığını G0.0 ölçer,
sıra sürücüsü o ölçümün sonucuna bağlı olamaz. Okuduğu tek veri: `00_genesis/GENESIS_DURUM.md`
`## KURULUM DURUMU` bloğu + `00_genesis/adimlar/SIRA.txt`.

- **Sessiz geçtiği dört hâl:** `.kurulum-tamam` var (kurulum bitti) · `.keel-kaynak` var (KEEL'in
  kendi kopyası — bu işaret DAĞITILMAZ, bakımcının geliştirme oturumları kurulum sanılmasın) ·
  `tools/sevk/.donem-acik` var (Stop olayı sevkin işi, iki motor aynı olayda konuşmaz) ·
  `Durum: başlamadı`.
- **Durum makinesi:** `açık` → engel (exit 2), adım dosyasını ADIYLA söyler · `bekliyor` → oturumun
  kapanmasına izin verir (mühür anında sahibi bilgisayar başında tutmak, iki mühür arasına tuş
  koymaktan da kötüdür) · `bitti` → bloğu **yerinde** yeniden yazar, sıradakini açar, talimatı basar.
- **Sıra kilidi:** `Tamamlanan` listesi sıranın **kesintisiz ön eki** olmalı ve `Adım` ondan hemen
  sonrası. "G0 bitmeden G1 açılamaz" cümlesinin mekanik karşılığı budur.
- **FAIL YÖNÜ sevkin TERSİ (bilinçli):** sevkte güvenli taraf DURMAKtır (risk sonsuz Stop döngüsü);
  kurulumda durmak "kurulum yarım kalır ve kimse haber vermez" demektir — bu ailenin en pahalı
  kusuru. Bu yüzden okunamayan/bozuk durum ENGELLER, susmaz.
- **Döngü freni (tek katman):** aynı (adım, durum) çifti üst üste 3 kez görülürse oturumun
  kapanmasına izin verir ve sayacı SIFIRLAR — hiçbir oturumu hapsetmez, kalıcı da ölmez.
  `stop_hook_active` fren olarak KULLANILMAZ (sürücünün normal işleyişi çok turludur; sevk.sh ile
  aynı gerekçe). Sayaç `tools/guard/.kurulum-surucu-durum`, izlenmez.
- **Çift hat:** sürücü hiç devreye girmemişse çekilme kapısı yakalar — `kurulum-denetimi.sh` 4e
  makine bloğunu arar, 4d ise adım dosyaları ↔ sıra listesi eşliğini ve iki tavanı ölçer.
- **DİKKAT — Stop kancasının `stdout`'u sahibin ekranına ÇIKMAZ** (harness onu hata ayıklama
  günlüğüne yazar). Modele ulaşan tek yol `exit 2 + stderr`; sahibe ulaşan yüzey `acilis.sh` (5).

İş bölümü (çift hat):
1. Ön hat = bu kanca (araç katmanı, anında).
2. Yedek hat = bekçi: her denetimde guard + SessionStart/SessionEnd kablosu yerinde mi + git-İZLİ
   korunan yollarda commit dışı değişim var mı diye bakar (kanca sessiz ölse bile tören
   yakalar). DİKKAT: damga git-izsizdir — rol kafesinin kabuk-yazımına karşı yedeği
   bekçi DEĞİL, yukarıdaki damga-dikişi + oturum-başı temizliktir.
3. `.claude/settings.json`daki ask kuralları kilitli/golden alanının araç-katmanı yedeğidir.

Bilinen sınır: kabuk yazımı E2'den beri KISMEN kapsamda (içerik süzgeci + yazım/dışa-giden
dikişleri) ama metin-eştir — değişkende saklanan değer, base64, parça-birleştirme kaçar;
kancanın tanımadığı yeni yazma araçları kapsam dışıdır. Git-izli korunan yolları ikinci hat
(bekçi) yakalar; otonom dönemde Bash'le dosya yazımı zaten bulgudur (OTONOM_DONEM §7).
Okuma her zaman serbesttir.

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
