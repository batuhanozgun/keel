# KEEL sözlüğü — hangi kelime neyi anlatır

**Amaç:** bir kelime bir şeyi anlatır. Aynı kelimenin iki anlamı varsa, hafızasız bir oturum
hangisini okuduğunu bilemez ve yanlış yere bakar.

Bu dosya iki iş yapar: (1) bugünkü doğru adları listeler, (2) hangi eski adın hangi yeni ada
çevrildiğini kaydeder — eski kayıtları okuyan biri karşılığını buradan bulur.

---

## 1 · "koşu" — altı ayrı şeyi anlatıyordu · UYGULANDI

Düzeltme tarihi: 2026-07-29 (dil paketi, Faz 2 sıra 1).

| Eski | Yeni | Ne demek |
|---|---|---|
| koşu | **otonom dönem** | Sahibin `/donem` ile açtığı, `tools/sevk/.donem-acik` göstergesi varken süren çalışma dilimi. Mühürde ya da duran görevde biter |
| koşu | **alt-ajan çağrısı** | Sevkin bir görev için açtığı tek, taze hafızalı ajan çağrısı |
| koşu | **bekçi denetimi** | `tools/bekci/bekci.sh`'ın bir kez çalışması; çıktısı `00_pano/SAGLIK.md`'ye düşer |
| koşu | **prova** | Deneme klasöründe yapılan tatbikat (`Dev/keel-tatbikat-*`) |
| koşu | **kurulum oturumu** | GENESIS'in yürüdüğü ilk oturum |
| koşu | **çalıştırma** | Bir programın bir kez çalışması ("node çalıştırması", "kanıt çalıştırması") |

Fiil olarak **"koşmak"** doğru ve tek anlamlıdır — "bekçi koşar", "test koşuluyor" değişmedi.
Değişen yalnız **isim** hâlidir.

### Makine adları (kodda geçen karşılıklar)

| Eski | Yeni |
|---|---|
| `/kosu` | `/donem` |
| `tools/sevk/kosu-ac.sh` | `tools/sevk/donem-ac.sh` |
| `tools/sevk/.kosu-acik` | `tools/sevk/.donem-acik` |
| `.claude/skills/kosu/` | `.claude/skills/donem/` |
| `02_kanon/OTONOM_KOSU.md` | `02_kanon/OTONOM_DONEM.md` |
| `00_genesis/OTONOM_KOSU_KALIBI.md` | `00_genesis/OTONOM_DONEM_KALIBI.md` |
| `KOSU_ID` `KOSU_KUTU` `KOSU_TUR` `KOSU_KIP` `KOSU_HATA` `KOSU_SINIF` `KOSU_DAMGA` `KOSU_SATIRI` `KOSU_RC` `KOSU_YOL` `KOSU_YAS_SAAT` `KOSU_GONDERIM_TAVANI` | aynısı: baştaki `KOSU_` yerine `DONEM_` |
| betikler arası geçiş değişkenleri `S_KOSU` `D_KOSU` `A_KOSU` `N_KOSU` `KAPI_KOSU` `B_KOSU` `J_kosu` | aynısı: `_KOSU` yerine `_DONEM` |
| `kosu_oku` · `kosuAcik` · `kosuAcikMi` | `donem_oku` · `donemAcik` · `donemAcikMi` |
| olay adları: `kosu-acilis` `kosu-basladi` `kosu-bitti` `kosu-kapanis` | `donem-acilis` `donem-basladi` `donem-bitti` `donem-kapanis` |
| dönem kimliği öneki `KOSU-…` | `DONEM-…` |
| zarf günlüğü alanı `"kosu"` | `"donem"` |
| bekçi damgası `Son koşu: … (koşu #N)` | `Son denetim: … (denetim #N)` — eski yazım kokpitte okunmaya devam eder (§2) |

**Ekranda görünen değişiklik:** tören çıktısı artık `KOŞU AÇIK` değil **`DÖNEM AÇIK`** yazar.

---

## 2 · "kapı" → **görev** — KARARLAŞTIRILDI, HENÜZ UYGULANMADI

`KUTU.md` içindeki `## Kapılar` tablosunun bir satırı bir **görevdir** (`G-NN`). Kod bugün aynı
şey için **iki ad** taşıyor: yerel değişken `kapi`, günlük alanı `gorev` — `sevk.sh` içinde
`r.j.gorev === kapi` satırı bunu açıkça gösteriyor. Hedef: tek ad, **görev**.

| Eski | Yeni |
|---|---|
| kapı (`KUTU.md` tablosunun satırı) | **görev** |
| `## Kapılar` başlığı | `## Görevler` |
| `duran-kapi` · `miras-kapi` · `kapi-sayaci` · `kapiToplam` | `duran-gorev` · `miras-gorev` · `gorev-sayaci` · `gorevToplam` |
| günlük alanı `kapi` (karne kayıtları) | `gorev` — **şema değişikliği** |
| denetleyen mekanizmalar (`kurulum-kapisi.sh`, `zarf-bicim-kapisi.sh`, `devir-kapisi.sh`, biçim/devir/kurulum/izin/SubagentStop kapısı) | **değişmez** — bunlar gerçekten birer kapıdır: geçirir ya da geçirmez |

**Neden bugün uygulanmadı (2026-07-29):** mekanik dönüşüm denendi ve **anlam bozdu.** İki cins
"kapı" aynı cümlede, hatta satır sonunda bölünmüş hâlde yaşıyor — kalıp dosyasında *"SubagentStop
biçim / kapısı"* (mekanizma) *"biçim görevi"* oldu, *"İzin kapısı"* *"İzin görevi"* oldu. Değişiklik
geri alındı. Bu katman **dosya dosya okunarak** yapılır; kural listesiyle değil.

**Uygulanınca geçerli olacak geri uyum kuralı:** kokpit (`tools/kokpit/lib/status.mjs`) **iki
başlığı da okumalı** — `## Görevler` ve `## Kapılar`. Sebep: kokpit kodu üç kopyada bayt-bayt
ortaktır (D-02) ve üçüncü kopya Loopinance projesinin panosudur; o proje eski başlığı kullanır ve
oraya yazılmaz (D-05). Aynı yöntem 2026-07-14'te sütun sayısı için de kullanıldı.

---

## 3 · Değişmeyenler — bilerek

| Ne | Neden |
|---|---|
| **`koşul`** kelimesi (= şart) | "koşu" ile ilgisi yok; LICENSE'taki "Kullanım Koşulları" dâhil |
| **`docs/superpowers/plans/`** altındaki tarihli kayıtlar ve **`docs/TASARIM.md`** (2026-07-03 taslağı) | O günün kaydıdır; dilini değiştirmek kaydı çarpıtır. Eski kelimeleri orada okursan karşılığı bu dosyadadır |
| **`damga`** — rol damgası, kapanış damgası, tarih damgası | Gerçekten damgadır; tek istisna aşağıda |
| **`tools/sevk/damgalar/T0-T4`** = **prova fişi** | Adı bugün düzeltilmedi: bu dosyalar dağıtılan kopyadan tamamen çıkacak (Faz 2 paket 7). Aynı dosyaya iki kez dokunulmaz |
| **`yapim` · `kurulum` · `kapanis`** dönem türleri | `yapim` iş üretir; `kurulum` ve `kapanis` hiçbir şey üretmez, **denetim evresidir**. Adlar Faz 2 paket 7'de evre tasarımıyla birlikte ele alınır |

---

## 4 · Bu dosyanın kuralı

Yeni bir kelime ürüne girerken buraya bir satır düşer. Bir kelime iki şeyi anlatmaya
başladıysa, çözüm ikinci anlama yeni bir kelime bulmaktır — açıklama eklemek değil.
