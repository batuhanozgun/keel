# Otonom KEEL — E2 paketi tasarısı (önleme: içerik süzgeci + dışa-giden sınıfı + worktree kuralı)

**Tarih:** 2026-07-27 · **Çapalar:** Otonom KEEL tasarımı §4 + §10/E2 (`OS Architect/Araştırmalar/04_dış-göz-incelemeleri/2026-07-23_loop-engineering-araştırması/18_Otonom KEEL — tasarım.md`) · E0 raporu §4.2 + §9.1 (`…/20`) · E1 raporu §4.1 (`…/21`) · D-24 · D-25 ②
**Durum:** danışmanın yazı işi (D-23: uygulama mührü istenmez); kanıt = guard testleri + T2 tatbikatı. Bu belge E2'nin ŞEMA KARARLARINI sabitler — tasarımın "E2'de tasarlanır" dediği her boşluğun cevabı burada.

---

## 1 · Paketin kapsamı (tasarım E2 satırı + E0/E1 girdileri)

1. **Hat 1 — içerik süzgeci:** `tools/guard/icerik-suzgeci.sh` (ortak betik; file-guard bugün, haber betiği E5'te aynısını çağırır) + `tools/guard/gercek-veri-isaretleri.txt` (korunan-yollar.txt'nin kardeşi VERİ dosyası; GENESIS doldurması ayrı iş — şablonda başlıklı/boş gelir, E4 kurulum denetçisi kalem-7 doluluğu arar).
2. **Hat 1'in file-guard dikişleri:** yazma araçlarında yeni-içerik taraması (ENGEL) + **Bash yazım dikişi** (beşinci dikiş: yazım-kalıplı komut metni aynı süzgeçten geçer; korumalı-yol hedefli yazım-kalıbı SOR alır).
3. **Hat 2 — dışa-giden sınıfı:** `settings.json` ask kuralları (`git push`/`curl`/… — bugün allow/deny yok, yalnız kilitli-golden ask var) + file-guard **dışa-giden dikişi** (komut-konumu eşleşmesi; bileşik komut kaçağını settings-önekinin göremediği yerde yakalar) + **MCP dikişi** (E0 §9.1 kör-kanal bulgusunun cevabı: koşu-AÇIK iken `mcp__*` araç çağrısı SORULUR — güvence artık harness'ın değil bizim).
4. **Hat 3 — worktree kuralı (E0 §4.2 ZORUNLU revizyon):** file-guard kural değerlendirmesi **worktree-farkında** olur (aday A; §5) — worktree×korunan-yollar çarpışması çözülür, worktree İÇİNDE koruma haritası aynen kurulur. + **koşu-içi git-obje dikişi:** koşu-AÇIK iken `git add/commit/stash` SORULUR; worktree bağlamında ENGELLENİR (ortak nesne deposu — E0 kalem 5 ölçümü).
5. Doku metinleri: OTONOM_KOSU kalıbı §7 "mekaniği kuruldu" güncellemesi · `dogrulayici.md`'ye kişisel-veri kalemi · GENESIS bekçi tarifinin koruma-hattı kablo listesine süzgeç + işaret listesi.
6. **T2 tatbikatı** (= V3 yeniden) + `tools/sevk/damgalar/T2`.

**Kapsam dışı (beyanlı):** haber betiği ve e-posta süzgeç çağrısı (E5) · sevk/karne mekaniği (E4) · risk satırlarının doğuşu (GENESIS-derinleştirme) · şema-geçerli sahte günlük satırı yakalayıcısı (E1 bilinen sınırı — bu pakette de mekanik yakalayıcı YOK; yazım-kaynağı izi adayı E4'te sevk-karar kaydıyla birlikte tartılır).

## 2 · İçerik süzgeci — davranış sözleşmesi

- **Betik:** `tools/guard/icerik-suzgeci.sh` — üç kip: `--arac-json` (stdin=PreToolUse araç JSON'u; yazım-etkili alanları tarar) · `--metin` (stdin=düz metin; E5 haber betiğinin kipi) · `--dosya <yol>` (dosya içeriği; tatbikat/elle kontrol).
- **Çıkış sözleşmesi:** `0` = temiz · `3` = eşleşme (stdout satırları: `ESLESME\t<sınıf>\t<konum>`) · diğer = hata. **Fail-closed ÇAĞIRANDADIR:** file-guard 3'ü ENGEL'e, 0-dışı/3-dışı her kodu da ENGEL'e çevirir (sessiz YEŞİL yok).
- **Taranan alanlar (`--arac-json`):** Edit `new_string` · MultiEdit `edits[].new_string` · Write `content` · NotebookEdit `new_source` · Bash `command` (YALNIZ yazım-kalıplıysa — §3). Eski içerik (`old_string`) TARANMAZ: içeride duran hassas veriyi SİLEN düzeltme engellenmemeli.
- **Desen sınıfları (jenerik üçlü + işaret listesi):**
  1. `tckn` — 11 hane, ilk hane 0 değil, hane-sınırlı VE **çift kontrol-hanesi doğrulamalı** (10. hane = ((1,3,5,7,9. haneler)×7 − (2,4,6,8. haneler)) mod 10; 11. hane = ilk 10 hanenin toplamı mod 10). Checksum tutmayan 11 hane SERBESTTİR (sipariş no vb. yanlış-pozitifi budanır).
  2. `iban` — `TR` + 24 hane (boşluk/tire gruplu yazım normalize edilir) + **mod-97 == 1** doğrulaması. Yalnız TR — jenerik ülke deseni yanlış-pozitif fırtınası yapar (beyanlı daralma; yabancı IBAN işaret listesiyle yakalanır).
  3. `kart` — 15-16 hane (boşluk/tire gruplu normalize), ilk hane 3-6, **Luhn doğrulamalı**. 15-16 dışı uzunluklar kapsam dışı (beyanlı — Maestro 12-19 ucu yanlış-pozitife değmez).
  4. `isaret` — `gercek-veri-isaretleri.txt` girdileri: satır başına bir dize, birebir BAYT eşleşmesi (harf dönüşümü yok — Türkçe güvenliği), `#` yorum, 4 karakterden kısa satır YOK SAYILIR (aşırı-engelleme freni; dosya başlığında yazılıdır).
- **Değer sızdırmama (E1 §4.1 dersinin genişletilmiş uygulaması):** süzgeç eşleşen DEĞERİ hiçbir kanala yazmaz — stdout/stderr yalnız sınıf + konum taşır. Betiğin içinde ve testlerde ÖRNEK GERÇEKÇİ DEĞER BULUNMAZ: test değerleri çalışma anında checksum kurallarından ÜRETİLİR (literal sabit yok). Gerekçe iki katlı: (a) engel metni transkripte düşer — değeri basmak sızıntıyı çoğaltır; (b) "kapı redi alan ajan koruma betiğini okumaya gidiyor" (E1 ölçümü) — betikteki örnek değer desen-tabanlı gözleri kirletir.
- **İşaret listesi yoksa/boşsa:** süzgeç jenerik üçlüyle koşar ve `--arac-json`/`--metin` çıktısına uyarı BASMAZ (kanca gürültüsü olur); doluluk denetimi kurulum denetçisinindir (E4 kalem-7; tasarım §5.2). `--dosya` kipinde stderr'e tek satır bilgi düşer.

## 3 · file-guard dikişleri — karar sırası ve yeni karar kodları

Katman sırası (güçlü hüküm önce): **içerik ENGEL'i (bash katmanı, node-öncesi) → node yol/fiil kararları.**

1. **İçerik taraması (bash katmanında):** girdi yazma-aracı adı YA DA `"Bash"` taşıyorsa `icerik-suzgeci.sh --arac-json`a borulanır; `3` → `engel` ("önleme bulgusu: <sınıf> — gerçek kişisel veri/sır dokuya ajan eliyle girmez; sentetik örnek kullan, gerçek veri gerekiyorsa sahibine söyle"). Süzgeç hatası → engel (fail-closed). Engel metni `file-guard ENGEL:` önekiyle çıkar → zarf kapısının izin-engeli `kanca` deseni EK KOD OLMADAN yakalar (E1 sözlüğü değişmez).
2. **Bash dalı node kararları** (mevcut dört damga-dikişinden sonra, sırayla):
   - **git-obje dikişi (yalnız koşu-AÇIK):** komut-konumunda `git [-C …] add|commit|stash` VE (komut metni YA DA girdinin `cwd` alanı `.claude/worktrees` içeriyor) → **ENGEL-WT** ("riskli görevin worktree'sinde obje üreten git komutu yasak — ortak nesne deposu; kanıt dosya:satır"). Worktree bağlamı yoksa → **SOR-GIT** ("koşu içinde commit doğrulayıcı yeşili ister — düşük-risk commit-öncesi kapısı; E4 karne-şartı gelene dek sahip kapısı"). Koşu kapalıyken dikiş YOK (el-sürüşlü commit akışı değişmez).
   - **dışa-giden dikişi (her kipte):** komut-konumu deseninde `git push` · `curl` · `wget` · `ssh` · `scp` · `sftp` · `rsync` · `mail` · `sendmail` · `gh` · `npm publish` → **SOR-DISA**. "Komut-konumu" = satır başı ya da `; && || | \` $(` sonrası (alt-dize DEĞİL — `echo "high"` `gh`e takılmaz). D-03'ün ("push/paylaşım kararı sahibin") mekanik yüzü; settings-öneki bileşik komutu göremez, bu dikiş görür.
   - **yazım+korumalı-yol dikişi (her kipte):** komut yazım-kalıplı (`>`/`>>`/heredoc/`tee`/`cp`/`mv`/`dd`/`rsync`) VE metninde korunan-yollar listesinden bir yol geçiyor → **SOR-YAZIM** ("Bash'le korumalı alana yazım-kalıbı — hedef mi kaynak mı metinden ayrılamaz, sahip kararı"). [SERT] yol için de SOR (ENGEL değil): metin-eş sezgi hedef/kaynak ayıramaz; golden'DAN okuyan meşru komut (`cat 02_kanon/golden/a > /tmp/x`) yanlış-ENGEL yememeli. Başsız koşuda SOR=red — önleme çekirdeği ayakta (E0 §3). **Kurulum penceresi istisnası ([SORULUR] emsali; test tabanı yakalattı):** kurulum sürerken dikiş yalnız çekirdek üçlüyü (tools/guard/ + tools/sevk/ + .claude/) anan komutta sorar — GENESIS doğumu sürtünmesiz kalır (taban-ref ve .kurulum-tamam yönlendirmeyle doğar), A5 ruhu (çekirdek kurulumda da yazılamaz) korunur.
3. **MCP dikişi (yalnız koşu-AÇIK):** `tool_name` `mcp__` ile başlıyorsa → **SOR-MCP** ("koşu içinde MCP kanalı sahip kapısındadır — kutu dışına iş çıkaran, dosya izi bırakmayan kanal"; E0 §9.1). Koşu kapalıyken GEC — el-sürüşlü MCP kullanımı değişmez.
4. **Ön-eleme genişlemesi:** bash `case` süzgecine `"Bash"` ve `"mcp__` desenleri eklenir. **Bilinçli maliyet:** her Bash çağrısı artık node'a iner (~50-100 ms) — kaçırılan kaba-desen sessiz delik olurdu; doğruluk gecikmeye tercih edildi.

**Yanlış-pozitif duruşu:** SOR sınıfı dikişlerin yanlış-pozitifi ZARARSIZDIR (sahibe bir soru; başsızda red + zarf İZİN-ENGELİ izi); ENGEL sınıfı ikidir ve ikisi de dar: içerik-ENGEL checksum'lu, ENGEL-WT koşu+worktree+git-obje kesişimi.

## 4 · Hat 2'nin settings katmanı

`.claude/settings.json` ask listesine (mevcut kilitli/golden Edit kurallarının yanına):
`Bash(git push:*)` · `Bash(curl:*)` · `Bash(wget:*)` · `Bash(ssh:*)` · `Bash(scp:*)` · `Bash(sftp:*)` · `Bash(rsync:*)` · `Bash(mail:*)` · `Bash(sendmail:*)` · `Bash(gh:*)` · `Bash(npm publish:*)`

Çift hat bilinçli (golden emsali: kanca-SOR + settings-ask birlikte, E0 T0b ölçümü): settings öneki basit vakayı harness katmanında keser, guard dikişi bileşik/gömülü vakayı yakalar. Bu kurallar dosya-izin sınıfı DEĞİL — 2.1.220 "ölü Write kuralı" uyarı sınıfına girmez (o uyarı yalnız dosya-araç kurallarınaydı; rapor 20 §7.1).

## 5 · Hat 3 — worktree-farkında kural değerlendirmesi (aday A; aday B reddi)

**Sorun (E0 §4.2):** harness worktree'si `PROJE/.claude/worktrees/<ajan>/` altında; `.claude/` [SERT] ⇒ riskli görevin worktree'sinde file-guard TÜM yazımları kesiyor — Hat-3 bu haliyle koşamaz.

**Karar — aday A:** hedef yol `<KÖK>/.claude/worktrees/<ajan>/<kalan>` biçimindeyse kurallar `<KÖK>/.claude/worktrees/<ajan>` **sanal köküne göre** değerlendirilir: worktree içindeki `01_kutular/…` serbest, worktree içindeki `tools/guard/` + `.claude/` + `tools/sevk/` + `02_kanon/kilitli/` yine [SERT], `02_kanon/golden/` yine [SORULUR] — **koruma haritası worktree'de aynen kurulur.** Rol-kafesi ev çözümü de sanal köke göredir (damga dosyası GERÇEK kökten okunur — oturum durumu git-izlenmez, worktree'ye düşmez); `.kurulum-tamam` sanal kökten okunur (checkout kopyası aynı rejimi taşır).

**Aday B (korunan-yollara dar istisna) REDDİ:** istisna worktree İÇİNİ topyekûn serbest bırakır — worktree'nin kendi kanon/guard kopyası ajana açılır, "yazılan şey doğrulanmadan ana ağaca geçmez" güvencesi worktree içinde çöker. A yapısal, B delik.

**Kaçak analizi (hasım öncesi öz-denetim; testli):**
- `..`/symlink ile sanal kökten kaçış → `kanonik()` gerçek yola çözer; çözüm worktree dışına düşerse GERÇEK kök kurallarıyla değerlendirilir (kaçış yok).
- Worktree kökünün KENDİSİNE dosya (`.claude/worktrees/x` tek parça) → sanal kök kurulmaz, `.claude/` [SERT] kalır.
- İç içe worktree (`<wt>/.claude/worktrees/y/…`) → eşleme TEK seviye; kalan yol sanal kökün `.claude/` kuralına takılır ([SERT]).
- Kural listesi HER ZAMAN gerçek kökten okunur (worktree'deki kopya değil — kopya bayat/tahrif olabilirdi; zaten [SERT] ama okuma kaynağı da sabitlendi).

**Taşıma mekaniği bu pakette KURULMAZ** (sevk işi, E4): kural yazılıdır — taşıma **dosya-kopyasıyla, git objesi üretmeden** (E0 ölçümü: add bile sızdırıyor; commit yasağının zarf-kanıt yüzü E1'de kurulu, yazım-anı yüzü §3 git-obje dikişi).

## 6 · Doku metinleri

1. **OTONOM_KOSU kalıbı §7:** "mekaniği E2" ibaresi kurulan gerçeğe güncellenir (süzgeç + işaret listesi adları, MCP kanalı, worktree haritası) — tavan 12.288B İÇİNDE kalınır (bugün 12.017B; ekler sıkıştırılarak girer, tavan oynatılmaz).
2. **`dogrulayici.md` bakış listesine kalem:** değişen/kanıt gösterilen dosyalarda kişisel-veri taraması (jenerik üç sınıf + işaret listesi girdileri, Grep ile — doğrulayıcının Bash'i yok, süzgeç betiğini koşamaz; tarif düzeyi beyanlı). Eşleşme = KIRMIZI bulgu; **karneye DEĞER yazılmaz** (sınıf + dosya:satır).
3. **GENESIS bekçi tarifi, koruma-hattı (i) kablo listesi:** `icerik-suzgeci.sh` + `gercek-veri-isaretleri.txt` mevcut/okunur — değilse KIRMIZI.

## 7 · T2 tatbikat planı (= V3 yeniden; kit `Dev/keel-tatbikat-e2`)

Sentetik ama checksum-GEÇERLİ veri (üretilir, literal saklanmaz) ekilerek, gerçek `claude -p` alt-ajan koşularıyla:

1. **Edit/Write yolu:** ajan sentetik TCKN'yi dosyaya Edit/Write ile yazmayı dener → içerik-ENGEL bekleniyor (hangi hat durdurdu, ham kanıtla).
2. **Bash yolu:** `echo <değer> > dosya` ve `cp <ekili-dosya> 02_kanon/golden/…` → içerik-ENGEL / SOR-YAZIM.
3. **Düşük-risk varyantı:** risk=düşük işaretli görevde aynı ekim → Hat-1'in risk işaretinden BAĞIMSIZ durduğu kanıtlanır (risk işareti yanılsa da son kemer).
4. **Nesne-deposu kurtarma denemesi (tasarım E2 satırının sınav sorusu):** worktree'de sır yazılıp commit ATILMADAN worktree+dal silinir → `git fsck`/`cat-file` ile kurtarma DENEnir; kurtarılamıyorsa Hat-3 hükmü ayakta, kurtarılabiliyorsa hat KIRMIZI beyanı rapora. (E0 t05 ölçümü commit/add/stash sızdırdığını gösterdi; buradaki soru: dikişler + kanıt-yasağı altında git'siz worktree'nin temiz kaldığının teyidi.)
5. **Dışa-giden + MCP + git-obje dikiş provası:** koşu-AÇIK/KAPALI iki durumda `git push`/bileşik komut/`git commit`/mcp çağrısı — SOR/red/GEC beklenen tabloyla.
6. **Negatifler (el-sürüşlü etkilenmezlik):** koşu KAPALIYKEN normal yazım/commit/MCP serbest; checksum-BOZUK 11 hane serbest; `echo "high"` `gh`e takılmıyor.

Damga: `tools/sevk/damgalar/T2` (tek satır: tarih · kanıt-rapor işaretçisi · kit yolu).

## 8 · Etki beyanı (el-sürüşlü kullanım NE değişiyor)

E1'in "el-sürüşlü etkilenmez" çizgisinden İKİ bilinçli sapma var; ikisi de beyanlı:
1. **İçerik süzgeci HER KİPTE keser** (koşu şartına bağlanmadı): V3 vakası el-sürüşlü dönemde yaşandı (KT-003 testçi blocker'ı); önleme sınıfı KEEL'in genel eksiği, yalnız otonomun değil. Gerçek veri ajan eliyle dokuya girmez — sentetik kullanılır ya da sahip elle koyar (engel metni bunu söyler).
2. **Dışa-giden SOR her kipte:** D-03 zaten "push/paylaşım sahibin" diyordu — kural mekanikleşti; el-sürüşlüde fark tek bir onay sorusudur.
MCP ve git-obje dikişleri ile SubagentStop tarafı koşu-AÇIK şartlıdır — günlük döngüde yok hükmünde.

## 9 · Bilinen sınırlar (dürüstlük)

- **Desen-kaçırma:** karmaşık kabuk kurgusu (değişkende saklanan değer, base64, parça-parça birleştirme) süzgeçten kaçar — bu yüzden `OTONOM_KOSU.md` kuralı: otonom koşuda dosya yazımı esasen yazma araçlarıyla; Bash yazımı doğrulayıcı/bekçi bulgusudur. Süzgeç üç hattın İLKİdir, teki değil.
- **Metin-eş sınırı:** SOR-YAZIM/SOR-DISA/ENGEL-WT komut METNİNE ve `cwd` alanına bakar (damga-dikişleriyle aynı bilinen sınır).
- **Luhn/checksum artık-payı:** rastgele 16 hanenin ~%10'u Luhn'dan geçer — yanlış-pozitif payı var; SOR değil ENGEL olduğu için tatbikatta negatif koşuyla ölçülür, gerekirse desen daraltılır.
- **İşaret listesi şablonda BOŞ:** Hat-1 ilk günden yalnız jenerik üçlüyle koşar; doluluk kutu-başına kurulum denetçisi şartıdır (E4) — bugün beyanla yaşıyor.
- **`cwd` alanı** kanca girdisinde ölçülmüş olarak VAR (E0 kanca-günlüğü) ama şeması RSK-4 sınıfı (sürümle değişebilir); yokluğunda git-obje dikişi komut metnine düşer (fail-open değil — SOR-GIT hâlâ çalışır, yalnız worktree-ENGEL daralması kaçabilir; beyanlı).

## 10 · Hasım inceleme kaydı (2026-07-27; koşu wf_1fea1dba)

**Yöntem:** 6 mercek (tasarım-uyum · kabuk · koruma-kaçak · tutarlılık · test-kapsamı · yan-etki)
paralel taradı, her bulguya bağımsız çürütücü (kaynağında yeniden-üretim zorunlu). **29 ham →
27 ayakta · 2 düşen.** 27 ayakta tekrarları çıkarınca ~13 ayrık kusur; TAMAMI işlendi.

**En ağır düzeltmeler (YÜKSEK):**
1. **Komut-konumu kaçakları** (`git -C x push` · `/usr/bin/curl` · `sudo scp` · çok-satırlı komut
   · satırsonu-ayraç): dışa-giden/git-obje/yazım dikişlerinin üçü de bitişik `git push`/`^\s*fiil`
   deseni istiyordu ve çok-satırı bölütlemiyordu. Çözüm: bölütlemeye `\n` eklendi; `komutAdi`
   (env/sudo/nohup/VAR= öneklerini atar + mutlak yolu basename'e indirir) + `gitAlt` (git global
   bayraklarını atlayıp alt-komutu bulur) yazıldı. `git -C x push`, `/usr/bin/curl`, `npm publish`
   artık yakalanıyor. Kanıt: 8-vaka kaçak testi + T2e canlı.
2. **Sahte-worktree ile [SERT] delme** (E0 §4.2 açık şartı): sanal kök yalnız yol-şekliyle
   kuruluyordu → ajan uydurma `.claude/worktrees/hayalet/` yolu icat edip kilitli'ye yazabiliyordu
   (üstelik kurulum-modunda). Çözüm: sanal kök yalnız GERÇEK worktree'de (`<ajan>/.git` dosyası)
   kurulur; yoksa `.claude/` [SERT] kalır. Kanıt: sahte-worktree 3-yol ENGEL testi.
3. **node/süzgeç-yok Bash'i komple kilitliyordu**: E2'nin "her Bash node'a iner"i, node yok gününde
   TÜM Bash'i engelliyordu — "komutlar serbest" güvencesini (Faz-1) kırıyordu. Çözüm: degrade —
   YAZMA fail-closed, Bash/MCP fail-open (koruma damgası hariç). Kanıt: bozuk-süzgeç degrade testi.

**Orta düzeltmeler:** worktree × bekçi porcelain KIRMIZI'sı → `.claude/worktrees/` gitignore'landı +
GENESIS tarifine not · MCP içerik süzgeci dışındaydı → `--mcp-json` kipiyle MCP tool_input da
taranıyor (her kanal içerik fail-closed) · perf (330 ms/Bash) → token-gate ile yazımsız Bash node
görmüyor · `2>/dev/null` yanlış SOR-YAZIM → /dev/null yönlendirmesi soyuluyor · `sed -i` yazım
listesine eklendi · dışa-giden liste genişliği testsizdi → 11 fiil + settings 11 kural testlendi ·
MultiEdit/NotebookEdit file-guard üzerinden testlendi · işaret-listesi doldurma yolu → çekirdek
install-window istisnasına eklendi (korunan-yollar.txt emsali).

**Düşük:** dogrulayıcı kalem-6 checksum'suz Grep → "ŞÜPHE bulgusu, süzgeç checksum'ı doğrular" diye
yumuşatıldı · OTONOM_KOSU §7 "(worktree'de ENGEL)" belirsizliği → MCP her bağlamda SOR, git-obje
worktree'de ENGEL diye netleştirildi · symlink kaçağı testsizdi → `..`-kaçış testi eklendi.

**Düşen 2:** işaret-listesi kurulum-ENGEL'i (çürütücü: GENESIS akışı farklı; yine de ileri-güvence
için çekirdek istisnası eklendi) · süzgeç-yok içerik-taşıma bypass'ı (çürütücü: kanca girdisi
JSON-kaçışlı, birebir taşınamaz).

**Beyanlı sınır (işlenmeyen — tasarım §9 ile tutarlı):** desen-kaçırma (değişkende saklama, base64,
`python -c open(w)` cinsi keyfi yorumlayıcı) metin-eş süzgeçten kaçar — üç hattın İLKİdir, teki
değil; asıl güvence "otonom koşuda Bash yazımı bulgudur" + doğrulayıcı + doğrulanmadan geçmeme.
