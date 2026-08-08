// kuyruk-ortak — sahibin kuyruğuna (00_pano/SENDE_BEKLEYEN.md) YAZAN HER KOLUN ortak evi.
//
// NEDEN VAR (U60 · U69). Kuyruğu iki dosya yazıyor: tools/sevk/catal-kuyruk.sh (üç kol:
// --ekle · --not · --cevapla) ve tools/guard/kapanis.sh. Üçü de kendi temizliğini yazmıştı ve
// üçü ayrı davranıyordu: ajanın ÇEVİRİ/ETKİ metni içerik süzgecinden HİÇ geçmiyordu (aynı metin
// dış kapıda sansürleniyordu — U60), kapanış kancası ise kırpmayı KARAKTERLE yapıyor ve satırın
// kendi yapı işaretlerini (·, cevap:, bekletir:, kaynak:, devretti:) soymuyordu; ajanın bir
// cümlesi AÇIK bir çatalı DEVREDILDI gösterebiliyordu (U69). Ders K24'ün asıl bulgusudur:
// "iki taraf tanım aynıdır diye YAZIYOR ve hiçbir şey ölçmüyor." Bu yüzden tanım tek evdedir ve
// yazıcıların bu evden geçtiğini test mekanik olarak sayar (kuyruk-yazicilari.test.mjs).
//
// İKİ ÇÖZÜM YOLU AYRIDIR — kod ile veri:
//   · KOD (bu dosya, içerik süzgeci) betiğin YANINDAN çözülür: birlikte gelen takım birlikte
//     koşar (ortak.sh · kilit.sh · cevap-sozlugu.txt emsali).
//   · VERİ (işaret listesi, yazım-kalıbı) PROJENİN kökünden gelir: sahibin gerçek-veri işaret
//     listesi kuruluma özeldir, şablonunki değil. Bu yüzden süzgece CLAUDE_PROJECT_DIR geçer.
//
// FAIL-CLOSED: süzgeç bulunamaz, koşamaz ya da 0/3 dışı dönerse metin TEMİZ SAYILMAZ. "Ölçemedim"
// ile "temiz" ayrı şeydir; kuyruğa yazamamak, süzgeçsiz yazmaktan ucuzdur (çağıran gürültülü
// davranır: zarf kapısı dönüşü durdurur, sevk bulgu düşürür, kapanış kancası sayacı raporlar).
// DEĞER SIZDIRMAMA: süzgeç yalnız SINIF + konum basar, eşleşen değeri hiçbir kanala yazmaz;
// buradan dönen sebep metni de yalnız sınıfı taşır.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** UTF-8 bayt uzunluğu — Türkçe harf 2 bayttır, karakter sayısı tavanı yanıltır. */
export const bayt = (s) => Buffer.byteLength(s, "utf8");

/**
 * Sahip-yüzeyi metnini kuyruk satırının KENDİ yapı işaretlerinden arındırır ve BAYT tabanlı
 * kırpar. Yapı işaretleri soyulmazsa --durum ayrıştırıcısı kandırılır: [x] olmadan CEVAPLANDI
 * görünmek, bekletir listesini bozmak, tekilleştirmeyi delmek, açık çatalı DEVREDILDI göstermek.
 */
export const kis = (s, n) => {
  let t = String(s || "").replace(/[`*"\n]/g, " ").replace(/·/g, "-")
    .replace(/\b(cevap|bekletir|kaynak|devretti)\s*:/gi, "$1 -")
    .replace(/ÇATAL\s+Ç-\d+/g, "çatal").replace(/\s+/g, " ").trim();
  if (bayt(t) <= n) return t;
  while (bayt(t) > n - 3 && t.length) t = t.slice(0, -1);
  return t + "…";
};

/** Yalnız ASCII küçültme — `tr` ve toLowerCase Türkçe İ/ı çiftini bozar. */
export const asciiKucuk = (s) => String(s).replace(/[A-Z]/g, (c) => c.toLowerCase());

/** "anlamadım" sınıfı VERİ dosyasından okunur (tools/sevk/cevap-sozlugu.txt). Boşsa fail-closed. */
export function anlamadimOku(yol) {
  const liste = readFileSync(yol, "utf8").split("\n")
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map(asciiKucuk);
  if (!liste.length) throw new Error("cevap sozlugu bos: " + yol);
  return liste;
}

/** İçerik süzgecinin yolu — bu dosyanın YANINDAN çözülür (kod takımla gelir, KOK'tan değil). */
export const SUZGEC_YOLU = fileURLToPath(new URL("../guard/icerik-suzgeci.sh", import.meta.url));

/**
 * Kuyruğa yazılacak metni içerik süzgecinden geçirir.
 * @param {string[]|string} parcalar  Taranacak metinler. HEM ham alanlar HEM kurulan satır
 *   verilir: kırpma bir sırrı ikiye bölüp desenden kaçırabilir, ham alan onu yakalar; kurulan
 *   satır ise dosyaya fiilen düşecek baytlardır.
 * @param {{kok:string}} secenek  kok = projenin kökü (süzgecin VERİ dosyaları oradan gelir).
 * @returns {{temiz:boolean, sebep:string}} temiz=false ise satır YAZILMAZ.
 */
export function suzgectenGecir(parcalar, secenek = {}) {
  const kok = String(secenek.kok || process.env.CLAUDE_PROJECT_DIR || "");
  const girdi = (Array.isArray(parcalar) ? parcalar : [parcalar])
    .filter((p) => typeof p === "string" && p).join("\n");
  if (!girdi) return { temiz: true, sebep: "" };
  if (!existsSync(SUZGEC_YOLU)) {
    return { temiz: false, sebep: "icerik suzgeci yok (" + SUZGEC_YOLU + ") — olculemedi" };
  }
  const cev = spawnSync("bash", [SUZGEC_YOLU, "--metin"], {
    input: girdi, encoding: "utf8",
    env: kok ? { ...process.env, CLAUDE_PROJECT_DIR: kok } : process.env,
  });
  if (cev.error) return { temiz: false, sebep: "icerik suzgeci kosamadi: " + (cev.error.message || "hata") };
  if (cev.status === 0) return { temiz: true, sebep: "" };
  if (cev.status === 3) {
    const siniflar = [...new Set(String(cev.stdout || "").split("\n")
      .filter((l) => l.startsWith("ESLESME"))
      .map((l) => l.split("\t")[1]).filter(Boolean))];
    return { temiz: false, sebep: "icerik suzgeci esti (sinif: " + (siniflar.join(",") || "bilinmiyor") + ")" };
  }
  return { temiz: false, sebep: "icerik suzgeci olculemedi (cikis " + (cev.status === null ? "sinyal" : cev.status) + ")" };
}
