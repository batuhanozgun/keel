# KEEL — otonom kipin provaları (sürüm beyanı)

Bu dosya **KEEL'in kendi geliştirme provalarını** kaydeder: otonom kipin hangi katmanı ne zaman,
hangi raporla sınandı. **Kurulan bir projenin hazır olup olmadığını KANITLAMAZ** — o denetim
ayrıdır ve her kurulumda yeniden koşar (`tools/guard/kurulum-denetimi.sh` · `/donem` töreninin
kapılanma çapaları · `tools/sevk/kurulum-kapisi.sh`).

**Sınır:** burası **ne KOŞULDU**'yu tutar. **Ne KOŞULACAK** — sürüm hattı, kapsam ve çıkış
şartları — bu dosyanın işi değildir; geliştirme kaydında yaşar ve dağıtılan pakette yoktur.

**Neden dosya değil beyan:** bu satırlar 2026-07-30'a kadar `tools/sevk/damgalar/T0…T4` adlı
"prova fişi" dosyalarıydı ve dönem açılışında KAPI olarak aranıyorlardı. Şablonla **dolu**
geldikleri için o kapı her kurulumda baştan mühürlü geçiyordu: sorduğu soru ("bu proje hazır mı")
ile ölçtüğü şey ("KEEL'in kendi provası yapılmış mı") aynı değildi (B-06). Kapı kaldırıldı;
yerine bu kurulumda **ölçülebilen** çapalar kondu (F1-5h). Prova kaydı burada, doğru adında yaşar.

Raporların evi geliştirme arşividir; dağıtılan pakette yoktur.

| Prova | Tarih | Ne sınandı | Rapor |
|---|---|---|---|
| T0 | 2026-07-27 | Temel tatbikat: harness davranışının ölçümü (izin reddi · maxTurns · worktree nesne deposu) | `20_… E0 temel tatbikat (T0) — rapor.md` |
| T1 | 2026-07-27 | Duruş sözleşmesi + dönüş zarfı + biçim kapısı (kit: `Dev/keel-tatbikat-e1`) | `21_… E1 duruş+zarf — rapor.md` |
| T2 | 2026-07-27 | Önleme katmanı: içerik süzgeci + dikişler (kit: `Dev/keel-tatbikat-e2`) | `22_… E2 önleme — rapor.md` |
| T3 | 2026-07-28 | Soru kanalı: çatal süzgeci · kuyruk · karar alanı | `23_… E3 soru kanalı — rapor.md` |
| T4 | 2026-07-28 | Sevk + tetik + kurulum kapısı (kit: `Dev/keel-tatbikat-e4`) | `24_… E4 sevk+tetik+kurulum kapısı — rapor.md` |

**Açık kalan prova:** uçtan uca kurulum ve **gerçek bir projede otonom dönem** (Faz 3). Bu satır
dolmadan "otonom KEEL bitti" denmez.

**Sürüm damgasıyla ilişki:** KEEL'in sürüm numarası ve güncelleme töreni ayrı bir pakettir
(D-30'un açık kalemi). O paket geldiğinde bu tablo sürüm damgasına bağlanır; bugün tabloyu
güncelleyen, provayı koşan kişidir.
