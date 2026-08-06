# Otonom KEEL — E1 paketi tasarısı (duruş sözleşmesi + dönüş zarfı)

**Tarih:** 2026-07-27 · **Çapalar:** "Otonom KEEL — tasarım" §10/E1 (geliştirme arşivi; bu depoda yoktur) · E0 raporu §4.1 + §6.1 (`…/20`) · D-24 · D-25
**Durum:** danışmanın yazı işi (D-23: uygulama mührü istenmez); kanıt = guard testleri + T1 tatbikatı. Bu belge E1'in ŞEMA KARARLARINI sabitler — tasarımın "E1'de yazılır" dediği her boşluğun cevabı burada.

---

## 1 · Paketin kapsamı (tasarım E1 satırı + E0 girdileri)

1. `00_genesis/OTONOM_KOSU_KALIBI.md` doğar — otonom kipin kural evi. Kurulu projedeki hedef yolu `02_kanon/OTONOM_KOSU.md`; korunma statüsü [SORULUR] (korunan-yollar.txt şablon verisine şimdiden girer — dosya yoksa kural uyur). **GENESIS'e kurulum adımı bu pakette BAĞLANMAZ** (tasarım §13: GENESIS-derinleştirmesi ayrı iş; o güne dek üretim elle).
2. Duruş sözleşmesi 4 satırı + bağımlılık/risk bloğu — KUTU.md şeması olarak (kokpit koduna dokunulmaz; doğrulandı: `status.mjs:126` başka H2'de Kapılar taramasını keser, yeni bölümler görünmez).
3. Dönüş zarfı şeması + `00_pano/zarf-gunlugu.jsonl` + `tools/sevk/zarf-ekle.sh` (tek append-aracı) + `tools/sevk/zarf-bicim-kapisi.sh` (SubagentStop — şablonda İLK KEZ bağlanan kanca).
4. Bekçi tarifine `[şema]` ekleri (GENESIS.md) + koruma-hattı kablo listesine sevk dosyaları.
5. Bayt ölçümleri: KUTU-sim (KT-003 ölçeği, 25 görev) + OTONOM_KOSU kalıp boyu (kurulu-sim emsali).
6. BÜTÇE↔RAF ilişkisi tek satırla (§6).

## 2 · Zarf günlüğü — şema kararı (surum:1)

- **Dosya:** `00_pano/zarf-gunlugu.jsonl` — append-only makine günlüğü, `oturum-gunlugu.jsonl`in kardeşi (anayasa m.1 istisnası: insan okumaz, makine okur; satır tavanı uygulanmaz).
- **Tek yazar = append-aracı:** günlüğe append eden TEK betik `tools/sevk/zarf-ekle.sh`; kancalar/betikler doğrudan yazmaz, onu çağırır (F1'in süreç-düzeyi karşılığı — tasarım §9).
- **Satır şeması:** tek satır JSON; zorunlu üst alanlar `surum:1` · `ts` (ISO) · `tip` · `kosu` (koşu kimliği ya da null). Tip listesi (E1'de tanımlı; kullanım evreye göre): `kosu-acilis` · `kosu-kapanis` · `nabiz` · `zarf` · `bicim` · `sevk-karar` · `catal-suzgec` · `sahip-temas` · `izin-engel` · `bulgu`. E1'de fiilen yazılanlar: `zarf` · `bicim` · `izin-engel` · `bulgu` (+tatbikatta elle `kosu-acilis`).
- **Kilit mekanizması (tasarımın "tek-write ya da flock" sorusunun cevabı):** macOS tabanında `flock(1)` YOK → **mkdir kilidi + tek printf-append**. Kilit dizini `<günlük>.kilit/`, içinde PID dosyası; 50×0,1 sn bekleme; bayat kilit (PID ölü) kırılır; kilit alınamazsa **fail-closed exit 1** (satır sessizce düşmez, çağıran hatayı görür). Append tek `printf '%s\n' >>` çağrısıdır.
- **Şema denetimi append-aracında (fail-closed):** geçerli tek-satır JSON değilse · `surum`/`ts`/`tip` eksikse · `tip` bilinen listede değilse · metinde gömülü satırsonu varsa → yazmaz, exit 1 + stderr gerekçe.
- **Bütünlük üç katman** (tasarım §9): append-aracı şema denetimi → sevkin koşu-içi turu (E4) → bekçi kapanışı (bu paket, §5).

## 3 · Koşu-AÇIK göstergesi

- **Dosya:** `tools/sevk/.kosu-acik` — tek satır TSV: `<koşu-id>\t<kutu-dizini>\t<ISO damga>` (kutu alanı hasım A7 ile eklendi: risk taraması koşunun kutusuna hedeflenir; 2-alanlı eski biçim kaba-tarama dalına düşer ve günlüğe `risk-kaba-tarama` notu düşer). `.aktif-rol` emsali TAM alındı (hasım A3): git-izlenmez (.gitignore) **VE koşu-dikişli** — `.kosu-acik`e dokunan Bash komutu file-guard'da sahibe SORULUR (`SOR-KOSU`); tek `rm` kapıyı artık sessiz söndüremez. Bekçi porcelain hattı bu dosyayı yapısal olarak GÖREMEZ (gitignore) — güvence bekçi değil dikiş + [SERT], beyanlı. Yazarı `/kosu` ön-işlemesi (E4; dikiş sorusu tören sırasında düşer, sahip onayıyla geçer — G3.3c "bu NORMALdir" emsali), sileni sevk kapanışı (E4). Bayat-gösterge temizliği E4'te `/kosu` tasarımıyla çözülür (beyanlı açık). T1 tatbikatında elle basılır.
- **Kapının açılma şartı:** bu dosya YOKSA SubagentStop kapısı sessiz geçer (`exit 0`) — normal (el-sürüşlü) kullanımda `dogrulayici` vb. alt-ajan dönüşleri rahatsız edilmez, günlüğe de yazılmaz (gürültü + tek-nokta hassasiyeti).
- `/kosu` becerisinin günlüğe düşürdüğü `kosu-acilis` kaydı (tasarım §2.1) bu dosyayla ÇİFT kayıttır: dosya "şu an açık mı"nın ucuz mekanik cevabı, günlük satırı kalıcı iz + watchdog girdisi (E5).

## 4 · SubagentStop biçim kapısı — davranış sözleşmesi

Denetim sırası (uygulamadaki gerçek sıra — en ucuz eleme önce, günlüğe hiçbir hayalet satır düşmeden):

1. **Koşu şartı (bash, node'suz):** `.kosu-acik` yoksa `exit 0` sessiz — el-sürüşlü kullanımda kanca yok hükmünde.
2. **stdin JSON** okunur (`agent_type` · `agent_transcript_path` · `last_assistant_message` · `stop_hook_active` — E0 kalem 6 ölçümü); koşu açıkken çözülemezse fail-closed exit 2.
3. **Beyaz liste (E0 §6.1 — ZORUNLU):** `agent_type` boşsa/slug-dışıysa YA DA `.claude/agents/<agent_type>.md` yoksa `exit 0` sessiz; günlüğe satır DÜŞMEZ (hayalet satır karneyi bozar). Kadro kaynağı = `.claude/agents/` dosya adları (kadro oturum başında donuyor — E0 yan bulgu 6 ile tutarlı).
4. **Döngü emniyeti (her red kararının içinde):** `stop_hook_active` true ise kapı bir daha ENGELLEMEZ; hüküm günlüğe `bicim` kaydı (`sonuc:"kirmizi-devam"`) olarak düşer, `exit 0`. (E0 hayalet vakasındaki sonsuz-tur riskinin panzehiri; duran-kapıya çevirme işi sevkin Stop turunundur — E4.)
5. **Zarf arama:** `last_assistant_message` içinde 6 üst alan: `BİTEN:` `ÇATAL:` `DEĞERLENDİRMEDİKLERİM:` `SIRADAKİ:` `TÜRETME-İZİ:` `GERİ-ÇEKİLEN:`. Eksik alan → **exit 2** + eksik listesi (ajan zarfı tamamlar). `DEĞERLENDİRMEDİKLERİM` içeriksiz olamaz ("yok" da açık yazılır).
6. **ÇATAL dolu ise** üç alt-alan zorunlu: `ÇEVİRİ:` `ETKİ:` `BEKLETİR:` — eksikse exit 2.
7. **Kanıt işaretçisi:** `BİTEN` satırında `kanıt:` zorunlu. Vault-yolu biçimindeyse (bekçi bağ-varlık DAR kuralının aynısı: boşluksuz + bilinen kök-dizin) dosya varlığı denetlenir; `dosya:satır` biçiminde satır eki soyulur. **Riskli görevde commit-kanıtı REDDEDİLİR** (tasarım §4 Hat-3): görevin risk işareti aktif KUTU'nun `## Bağımlılık ve risk` bloğundan okunur (`G-NN: … risk=riskli`); blok yoksa risk BİLİNMİYOR sayılır ve commit-reddi uygulanmaz (bloksuz kutu otonom koşuya zaten E4 kurulum kapısından giremez — beyanlı sınır).
8. **İzin-engeli çaprazı (E0 girdisi 1 — ÇİFT kaynak):** transkriptte `permission_denials` dolu YA DA kanca-red deseni (`file-guard ENGEL` · `Permission for this tool use was denied` vb.) varsa zarfta `İZİN-ENGELİ:` satırı aranır; yoksa exit 2. Zarf şemasının kanonik 6 üst alanı değişmez — `İZİN-ENGELİ` KOŞULLU 7. satırdır (yalnız yaşandıysa zorunlu). Kapı ayrıca günlüğe bağımsız `izin-engel` kaydı düşer (kaynağıyla: `settings-ask` / `kanca`).
9. **GERİ-ÇEKİLEN transkript-izi (tasarım §2.4 — kablo kararı):** `ÇATAL: yok` + `GERİ-ÇEKİLEN: yok` iken transkriptin ajan-metinlerinde DAR çatal-değerlendirme deseni aranır (`ÇATAL` sözcüğü ya da "sahibe sor/sahibe mi" kalıbı). Bulunursa İLK sefer exit 2 ("çatal değerlendirmesi izi var — zarfı dürüst doldur ya da GERİ-ÇEKİLEN'e yaz"); ajan aynı hâlde dönerse (stop_hook_active) `bulgu` kaydı (`catal-iz-suphesi`) + geçer — doğrulayıcı/dış göz okur (2. hat). Yanlış-pozitif oranı T1/T3'te ölçülür.
10. **Talimat↔fiil dikişi:** günlükte `sevk-karar` kaydı varsa zarfın G-NN'i o kümede aranır; küme BOŞSA (sevk kurulmamış — E4 öncesi/tatbikat) dikiş atlanır ve bu atlama beyanlıdır (`dikis:"atlandi"`). **Sapma ajanı ENGELLEMEZ** (exit 2 ajana döner ama ajan sistem-seviyesi sapmayı düzeltemez): `bulgu` kaydı `dikis-sapma` + zarf kaydında `dikis:"sapma"` düşer; duran kapıya çevirme sevkin Stop-turu işidir (E4). AÇIK-küme inceltmesi (kapanan görevlerin kümeden düşmesi) de E4'ün işidir — E1'de küme tüm `sevk-karar` kayıtlarıdır, beyanlı kabalık.
11. **Geçen zarf:** günlüğe `zarf` kaydı (ham metin + çözümlenmiş alanlar) + `bicim` kaydı (`sonuc:"gecti"`); red de `bicim` kaydı düşer (`sonuc:"red"` + gerekçe) — kapının her hükmü izlidir. Bütün yazımlar `zarf-ekle.sh` üzerinden.
12. **Zarf-yokluğu ("tur-tavanı şüphesi", E0 girdisi 1):** alanların HİÇBİRİ yoksa (maxTurns sessiz kesmesi/anlaşılmaz yarım dönüş) exit 2 bir kez; stop_hook_active dalında `bulgu` kaydı `tur-tavani-suphesi` + geçer. Karnedeki alanın tanımı OTONOM_KOSU kalıbında; mekaniği E4 (karne-şartı).
13. **DUR yoklaması** bu kancaya E5'te eklenir (tasarım §7.3); kalıpta yazılı, bu pakette kod yok.

## 5 · Bekçi tarifi ekleri (GENESIS.md; `[şema]` altında — yeni zorunlu kategori AÇILMAZ)

1. **Zarf günlüğü:** dosya varsa her satır geçerli JSON + `surum`/`tip` alanlı olmalı; bozuk/yarım satır → **KIRMIZI** (tasarım §9: yeni tek-nokta veri katmanı; bozulması bütün gözleri köreltir). Tek yazar beyanı: `zarf-ekle.sh`. Tavan uygulanmaz (append-only istisnası, oturum-günlüğü emsali).
2. **Duruş sözleşmesi + bağımlılık/risk blokları:** KUTU'da MEVCUTSA şema denetlenir — `## Duruş sözleşmesi` altında 4 satır (`BİTİŞ HÂLİ:` `KANIT:` `KISIT:` `BÜTÇE:`, hepsi içerikli); `## Bağımlılık ve risk` altında her kayıt `G-NN: onkosul=… · risk=<düşük|riskli> — <gerekçe>` biçiminde. Biçimsiz → SARI. **Yokluk denetimi bekçide DEĞİL** (eski kutulara dırdır olur); otonom kutuda zorunluluğu kurulum denetçisi arar (E4) + sevk damgasız başlamaz. **Tavan statüsü (ölçümün verdiği karar):** duruş sözleşmesi KUTU tavanına DAHİL; `## Bağımlılık ve risk` bloğu makine-okur bloktur ve tavan ölçümünden DÜŞÜLÜR — ölçüm: 25 görevlik gerçekçi blok 2.918B = sarı tavanın ~%29'u; tasarımın gösterdiği emsal (oturum-günlüğü "tavan denetimine sokulmaz") uygulandı, sıkıştırma (gerekçesiz risk satırı) reddedildi çünkü gerekçe zorunluluğu K-I/m.9 kararıdır.
3. **KUTU tavan statüsü beyanı:** KUTU tavan KIRMIZI'sı otonom koşuda da **kapanış kilididir, duran kapı değildir** (tasarım §5.1/§7.4; koşuyu durduran KIRMIZI'lar sayılıdır: bekçi KIRMIZI'sı + günlük-bütünlük).
4. **Koruma-hattı (i) kablo listesine ek:** `.claude/settings.json`da SubagentStop girdisi + `tools/sevk/zarf-ekle.sh` ve `tools/sevk/zarf-bicim-kapisi.sh` mevcut/okunur — değilse KIRMIZI (çift hat: kancanın ölümünü bekçi yakalar).

## 6 · Tek-satır kararlar

- **BÜTÇE↔RAF:** duruş sözleşmesinin `BÜTÇE` satırı **koşu-kontrol vidasıdır** (K-G: "sahip bakmadan en fazla ne kadar şey kurulabilir" — alt-ajan koşusu sayısı/ilerleme-yok eşiği); RAF'taki "Sert bütçe tavanı" **maliyet/zaman durdurucusudur** ve yakıt-disiplini adım-2'ye bağlı AYRI kayıttır — birleştirilmez, ikisi de kendi evinde (aynı vida iki işte habersiz doğmaz; tasarım §5.1 sorusu kapandı).
- **OTONOM_KOSU tavanı:** kalıbın kendi yorum bloğunda 12KB beyan edilir ve ŞABLON testinde ölçülür (kurulu-sim emsali); kurulu-proje bekçisinin F3 tavan tablosuna GİRMEZ (EL_KITABI'na tek harf eklenmez — marj 44B). İlk gerçek retroda kalibre edilir.
- **Damga evi (E0 raporu §5.5'in cevabı — sevkin arayacağı biçim):** tatbikat damgaları `tools/sevk/damgalar/<T-ad>` dosyalarıdır; tek satır: `YYYY-AA-GG · <kanıt-rapor işaretçisi>`. E1 paketi `T0` damgasını (kaynak-kanıt: E0 raporu) ve T1 kapanınca `T1` damgasını düşürür; sevk betiği (E4) açılışta bu evi arar.
- **Şişme alarmı (tasarım §7.4)** bu pakette YOK — sevkle birlikte E4/E5 (görev-sayısı çapası taban-ref diff'i ister).
- **UserPromptSubmit kancası (tasarım §9)** bu pakette YOK — sahip-temas sayacı E4/E5.

## 7 · Hasım inceleme kaydı (paket denetimi — 2026-07-27)

**Yöntem:** 6 mercek paralel taradı (tasarım-uyum · kabuk · koruma · tutarlılık · test-kapsamı · kural-evi), her bulguya bağımsız çürütücü. **22 ham → 15 ayakta · 7 düşen** (koşu: wf_5455eaa4-501; 28 ajan, 2,7M jeton). Bir çürütücü API hatasıyla hükümsüz kaldı (bayat-kilit kırma yarışı); bulgu ELLE karara bağlandı: gerçek delik (iki süreç bayat kilidi aynı anda kırarken biri ötekinin TAZE kilidini silebilir) → kırma `mv` (rename) ile atomikleştirildi.

**İşlenenler (15/15):**
1. **A3 (YÜKSEK)** `.kosu-acik` korumasız → file-guard'a **koşu-dikişi** (`SOR-KOSU`) + `.aktif-rol` emsali beyanı (§3 revize).
2. **A4 (YÜKSEK)** günlük araç katmanında korumasız → `00_pano/zarf-gunlugu.jsonl` [SERT]'e alındı (kanca bash sürecinde koşar, engelden geçmez — bedava koruma).
3. **A5** kurulum istisnası `tools/sevk`i sert tutmuyordu → çekirdek listesine `tools/sevk` eklendi (sevk betikleri şablonla sabittir; damgalar kurulum penceresinde yazılamaz).
4. **A1+A6** kalıbın ÇATAL çiti satır-içi ÇEVİRİ gösteriyordu (ayrıştırıcı okumaz) → çit ayrı-satır biçimine düzeltildi + kapının red-ipuçlarına "her alan AYRI satırın BAŞINDA" eklendi.
5. **A7** risk taraması tüm kutuları okuyordu → `.kosu-acik`e kutu alanı; tarama koşunun kutusuna hedefli; kutusuz eski biçim = kaba dal + günlük notu.
6. **A8** izin-kaynak sözlüğü sapması → sözlük beyan edildi + boş-dizi bastırma hatası regex'le düzeltildi. **T1a canlı ölçümü sözlüğü DÖRDE çıkardı (settings-ask · kanca · red-metni · zemin-red):** başsız kipte ajan-transkriptine `permission_denials` düşmüyor; izin-zemini reddinin tek izi `Claude requested permissions to … granted it` metni — A10'un "gerçek baytlarla sınanmamış desen sessiz-ölü kalır" uyarısı sahada doğrulandı, desen gerçek baytlardan eklendi.
7. **A11+D2** bayat kilit: pid'siz kilit kalıcı kilitliyordu → yaş-bazlı (30 sn) kırma + `mv`-atomik kırma; testler eklendi.
8. **A12** bozuk gösterge "koşu yok" sayılıyordu → dizin/boş-kimlik fail-closed exit 2 (döngü emniyetli).
9. **A14** F8 kilitlenmesi → kalıba **F8 köprüsü**: karne commit-öncesi içerik gözü (kirli ağaçta, beyanlı istisna); F8 kutu-kapanış doğrulamasında sürer.
10. **A15** bitiş-hâlleri çelişkisi → liste DÖRT hâle indi; izin kapısı "bitiş değil" olarak ayrı paragraf.
11. **A2** "elle append bekçi KIRMIZI'sıdır" sahte güvencesi → zarf-ekle başlığı + README + kalıp dili gerçek katmanlara daraltıldı (şema-geçerli sahte satır = bilinen sınır, E2+ adayı).
12. **A9** transkript-yedeği hattı testsiz → test eklendi (last_assistant_message yokken zarf transkriptten okunur).
13. **A10** izin desenlerinin 2/3'ü testsiz → settings-ask + red-metni desen testleri eklendi.
14. **A13** kablo testi zayıf desen → komutun tam yolu + type:command doğrulanıyor.
15. (A2 ile birleşik) README güvence dili — yukarıda.

**Düşenler (7):** keşfedilebilirlik işaretçisi (E1 kapsamı dışı — GENESIS-derinleştirme listesinde) · porcelain dışlaması (tetiklenemez senaryo) · hayalet fail-closed sızıntısı (beyanlı sıralama; hayalet yalnız interaktif, ask-JSON'u hep çözülür) · bitiş-listesi "güncellenmemiş" varyantı (E0 düzeltmesi uygulanmıştı; yine de A15 ile netleştirildi) · döngü-emniyeti kapsamı (beyanlı) · bozuk sevk-karar satırı dikişi (üç-katman bütünlük + bekçi KIRMIZI beyanlı).

## 8 · Dürüstlük kaydı

- Kapının zarf araması `last_assistant_message` alanına dayanır; alanın SubagentStop girdisinde geldiği E0'da ölçüldü (kalem 6). Alan boş gelirse transkriptin son ajan-metni yedek kaynaktır (kapı ikisini de dener).
- GERİ-ÇEKİLEN deseninin DAR hâli heuristiktir; yanlış-pozitif ölçümü T1'de sentetik, T3'te gerçek koşuyla yapılır.
- Bu paket hiçbir gerçek kutuyu otonom koşuya sokmaz; sevk yok, tetik yok (E4). Kurulan her parça el-sürüşlü kullanımda ETKİSİZDİR (koşu-AÇIK şartı) — tek görünür değişiklik bekçi tarifinin yeni gözleri ve şablon dosyaları.
