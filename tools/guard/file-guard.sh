#!/bin/bash
# file-guard — araç-kancası (PreToolUse): korunan yollara + (rol kafesi) yazamaz-rol oturumlarında her yola YAZMA araçlarını (Edit/MultiEdit/Write/NotebookEdit) mekanik keser.
# E2 önleme katmanı (2026-07-27, tasarı: docs/superpowers/plans/2026-07-27-e2-onleme-tasarisi.md):
#   Hat-1 içerik süzgeci (yazım-öncesi ENGEL; icerik-suzgeci.sh ortak betik) + Bash yazım dikişi ·
#   Hat-2 dışa-giden SOR (el-sürüşlü) + MCP dikişi ·
#   Hat-3 worktree sanal-kök değerlendirmesi + dönem-içi git-obje dikişi (SOR-GIT/ENGEL-WT).
# F1-5f (2026-07-30): otonom dönem AÇIKKEN "sahibe sor" kararı PENCERE AÇMAZ. Kutunun duruş
#   sözleşmesindeki `İZİN:` satırında yazılı sınıf serbest geçer, yazılı olmayan ENGEL alır
#   (exit 2 · ENGEL-IZIN) — adım atlanır, kuyruğa not düşer, dönem sürer. El-sürüşlü oturumda
#   hiçbir şey değişmez. Kural evi ve yapının damga/işaret dosyaları önceden serbest bırakılamaz.
# Koruma YAZMAYA karşıdır — okuma/komut araçlarına karışılmaz (Faz-1 demo dersi); ÜÇ BELGELİ İSTİSNA (dikişler): (1) rol damgasına (.aktif-rol) dokunan Bash komutu sahibe SORULUR (damganın git-izi yok, bekçi göremez — plan kararı 2); (2) kurulum işaretine (.kurulum-tamam) dokunan Bash komutu, işaret MEVCUTKEN sahibe SORULUR (işaret silinirse koruma kurulum-moduna düşer — soğuk-denetim bulgusu E2, 2026-07-16; işaret yokken sorulmaz ki GENESIS doğumu sürtünmesiz kalsın; ayrıca işaret git-İZLİdir, silinme/kirlilik bekçi porcelain hattında da yakalanır); (3) kilitli-tarih çapasına (.taban-ref) dokunan Bash komutu, kurulum BİTMİŞKEN sahibe SORULUR (çapayı ilerletmek kilitli-ihlal sinyalini söndürür — "ilerletme sahip-onaylı" güvencesinin mekanik kapısı; V2 Öbek-1 düzeltmesi, hasım bulgusu wf_e35b1e11, 2026-07-23).
# Matcher GENİŞ (*), daraltma bu script'in içinde (anayasa m.5).
# Girdi: stdin'de Claude Code araç JSON'u. Çıkış sözleşmesi:
#   exit 2                = ENGEL ([SERT]; stderr'daki gerekçe ajana döner)
#   exit 0 + JSON çıktı   = SAHİBE SOR ([SORULUR]; permissionDecision "ask")
#   exit 0, çıktısız      = serbest (yazma-dışı araç ya da korunmayan yol — karar verme, karışma)
# Fail-closed: script kendi içinde hata verirse YAZMA işlemi ENGELLENİR (sessiz YEŞİL yok); yazma-dışı akış etkilenmez.
# Türkçe harf güvenliği: eşleştirme BİREBİR bayttır; kanca hiçbir harf dönüşümü yapmaz.
set -euo pipefail
shopt -s nullglob
export LC_ALL=C.UTF-8

engel() { printf 'file-guard ENGEL: %s\n' "$1" >&2; exit 2; }
trap 'engel "ic hata (fail-closed): kanca beklenmedik durdu; islem guvenli tarafta engellendi. Bakim: tools/guard/README.md"' ERR

INPUT="$(cat)"

ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Ucuz ön-eleme (node gerekmeden): yazma araçları + mcp__ her zaman; Bash yalnız bir dikiş-
# tetikleyici token taşıyorsa node'a iner. Hasım bulgusu (perf): E2'nin ilk sürümü HER Bash'i
# node'a indiriyordu (~330 ms/çağrı); oysa dikişler yalnız aşağıdaki tokenlarda ateşler.
# Token TAŞIMAYAN Bash (ls/grep/cat/echo-yazımsız/pwd/find/node/python-yazımsız) node görmeden geçer.
# Token listesi dikiş kapsamının ÜST-kümesidir (kaçak yok, yalnız gereksiz node çalıştırması elenir).
case "$INPUT" in
  *'"Edit"'*|*'"MultiEdit"'*|*'"Write"'*|*'"NotebookEdit"'*|*'"mcp__'*) : ;;
  *'"Bash"'*|*'"tool_name": "Bash"'*)
    # Perf ön-elemesi: hiçbir dikiş-tetikleyici token YOKSA node'a inme (ls/grep/cat/pwd/echo-yazımsız).
    # Tokenlar ÇIPLAK alt-dizedir — FAZLA eşleşme zararsız (yalnız gereksiz node); AZ eşleşme koruma
    # deliğidir (bu yüzden çıplak: "cp" baştaki cp'yi de yakalar — hasım bulgusu). Gate dikiş
    # tetikleyicilerinin TAM üst-kümesidir (markerlar + dışa-giden + git-obje + yazım fiilleri).
    case "$INPUT" in
      *'.aktif-rol'*|*'.kurulum'*|*'.taban-ref'*|*'.donem-acik'*|*'.dur'*) : ;;
      # E5 kanal betikleri: ön-eleme listesi dikiş kapsamının ÜST-kümesi olmak zorundadır —
      # buraya eklenmezse aşağıdaki kanal dikişi HİÇ koşmaz (yaşanmış: dikiş yazıldı, gate
      # elemişti; sessiz delik). "Az eşleşme koruma deliğidir" kuralının canlı örneği.
      *haber.sh*|*nabiz.sh*) : ;;
      *git*|*curl*|*wget*|*ssh*|*scp*|*sftp*|*rsync*|*mail*|*sendmail*|*gh*|*npm*) : ;;
      *'>'*|*'<<'*|*tee*|*cp*|*mv*|*dd*|*sed*|*install*|*truncate*) : ;;
      *) exit 0 ;;
    esac ;;
  *) exit 0 ;;
esac

# ---- E2 Hat-1: içerik süzgeci (yazım-öncesi; en güçlü hüküm önce, yol kararlarından bağımsız) ----
# Yazıma giden İÇERİK kişisel-veri desenlerine taranır (TCKN/IBAN/kart + işaret listesi);
# eşleşme = ENGEL ("önleme bulgusu"). Bash'te yalnız yazım-kalıplı komut taranır (karar süzgeçte).
# HER KİPTE keser (dönem şartına bağlı değil — V3 vakası el-sürüşlü dönemde yaşandı; tasarı §8).
# Yazma araçları + Bash → --arac-json; mcp__ → --mcp-json (tool_input'un tüm dize değerleri
# taranır; MCP kanalı da içerik-fail-closed olur — hasım bulgusu: "her kipte keser" beyanı MCP'yi
# de kapsamalı). Bash/mcp süzgeç ÇALIŞAMAZSA (rc≠0, çoğu kez node-yok) fail-open (komut serbest,
# pre-E2 tabanı); YAZMA araçları süzgeç çalışamaz/yoksa fail-CLOSED (engel).
SUZGEC="$ROOT/tools/guard/icerik-suzgeci.sh"
SUZGEC_KIP=""
case "$INPUT" in
  *'"mcp__'*) SUZGEC_KIP="--mcp-json" ;;
  *'"Edit"'*|*'"MultiEdit"'*|*'"Write"'*|*'"NotebookEdit"'*|*'"Bash"'*|*'"tool_name": "Bash"'*) SUZGEC_KIP="--arac-json" ;;
esac
if [ -n "$SUZGEC_KIP" ]; then
  case "$INPUT" in
    *'"tool_name":"Bash"'*|*'"tool_name": "Bash"'*|*'"mcp__'*) YAZMA_SINIFI=0 ;;
    *) YAZMA_SINIFI=1 ;;
  esac
  if [ -r "$SUZGEC" ]; then
    SUZGEC_RC=0
    SUZGEC_CIKTI="$(printf '%s' "$INPUT" | bash "$SUZGEC" "$SUZGEC_KIP" 2>/dev/null)" || SUZGEC_RC=$?
    if [ "$SUZGEC_RC" = "3" ]; then
      SINIFLAR="$(printf '%s\n' "$SUZGEC_CIKTI" | awk -F'\t' '$1=="ESLESME"{print $2}' | sort -u | paste -sd+ -)"
      engel "önleme bulgusu (${SINIFLAR:-içerik}): gerçek kişisel veri/sır dokuya ajan eliyle girmez — sentetik örnek kullan; gerçek veri gerekiyorsa sahibine söyle (Hat-1; işaret listesi: tools/guard/gercek-veri-isaretleri.txt)"
    elif [ "$SUZGEC_RC" != "0" ] && [ "$YAZMA_SINIFI" = "1" ]; then
      engel "içerik süzgeci koşamadı (fail-closed; çıkış $SUZGEC_RC): tools/guard/icerik-suzgeci.sh — node kurulu mu / süzgeç sağlam mı bak; YAZMA güvenli tarafta engellendi (komut sınıfı fail-open geçer)"
    fi
    # Bash/mcp + süzgeç hatası → fail-open (komut serbest; node-yok tabanı korunur — hasım bulgusu).
  elif [ "$YAZMA_SINIFI" = "1" ]; then
    engel "içerik süzgeci yok (tools/guard/icerik-suzgeci.sh) — önleme hattı tanımsız; YAZMA güvenli tarafta engellendi"
  fi
fi

# node keşfi — GUI'den açılan oturumlarda PATH dardır (Homebrew yolları görünmez; Faz-1 demo bulgusu, 2026-07-13):
# önce PATH, sonra bilinen mutlak adaylar (keg-only Homebrew dahil).
NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
  for aday in /usr/local/bin/node /opt/homebrew/bin/node /usr/local/opt/node*/bin/node /opt/homebrew/opt/node*/bin/node; do
    if [ -x "$aday" ]; then NODE_BIN="$aday"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  # node-yok DEGRADE (hasım bulgusu — "komutlar serbest" güvencesi korunur): YAZMA fail-closed;
  # koruma damgasına/işaretine dokunan Bash fail-closed (pre-E2 davranışı); diğer Bash + mcp
  # fail-open (node olmadan dikişler değerlendirilemez, taban pre-E2 = komut serbest).
  case "$INPUT" in
    *'"Edit"'*|*'"MultiEdit"'*|*'"Write"'*|*'"NotebookEdit"'*)
      engel "node bulunamadı — kanca karar veremiyor; GÜVENLİ taraf: yalnız BU YAZMA işlemi engellendi (okuma ve komutlar serbest). Çözüm: node kur (kokpit de istiyor). Bakım: tools/guard/README.md" ;;
    *'.aktif-rol'*|*'.kurulum'*|*'.taban-ref'*|*'.donem-acik'*|*'.dur'*)
      engel "node bulunamadı — koruma damgası/işaretine dokunan komut güvenli tarafta engellendi (fail-closed; pre-E2 damga koruması). Çözüm: node kur." ;;
    *) exit 0 ;;
  esac
fi

LIST="$ROOT/tools/guard/korunan-yollar.txt"
[ -r "$LIST" ] || engel "korunan-yollar.txt okunamadı ($LIST) — koruma tanımsız (fail-closed)"

KARAR="$(printf '%s' "$INPUT" | GUARD_ROOT="$ROOT" GUARD_LIST="$LIST" "$NODE_BIN" --input-type=module -e '
import { readFileSync, existsSync, realpathSync, lstatSync } from "node:fs";
import { resolve, dirname, join, sep } from "node:path";

// Diskin gercek yazimina coz: var olan en derin ataya kadar in, realpath al, kalani ekle.
// Bu case-folding DEGILDIR — kanca harf donusumu yapmaz, diskin tek-gercegine teslim olur.
function kanonik(p) {
  let govde = p; const kuyruk = [];
  while (!existsSync(govde)) {
    const ust = dirname(govde);
    if (ust === govde) break;
    kuyruk.unshift(govde.slice(ust.length + 1));
    govde = ust;
  }
  let gercek = govde;
  try { gercek = realpathSync.native(govde); } catch {}
  return kuyruk.length ? join(gercek, ...kuyruk) : gercek;
}

const ROOT = kanonik(resolve(process.env.GUARD_ROOT));
let j;
try { j = JSON.parse(readFileSync(0, "utf8")); } catch { console.log("HATA\tstdin JSON cozulemedi"); process.exit(0); }

const ti = j.tool_input || {};
const donemAcik = existsSync(resolve(ROOT, "tools/sevk/.donem-acik"));

// ── F1-5f · IZIN PENCERESI OTONOM DONEMDE ACILMAZ ────────────────────────────────────────
// "Sahibe sorulur" karari bir PENCERE acar ve insan bekler — tanim geregi otonomlugun bittigi
// andir. Otonom donemde bu kararlar ikiye ayrilir: kutunun `İZİN:` satirinda ONCEDEN yazili
// sinif SERBEST gecer (izni sahip kutu acilisinda vermistir), yazili olmayan ENGELLENIR; adim
// atlanir, kuyruga not duser, donem SURER. El-suruslu kullanimda hicbir sey degismez: sahip
// klavyededir, soru ona gider.
// UC SINIF HICBIR ZAMAN ONCEDEN VERILEMEZ (yapinin kendi kilitleri): rol damgasi · kurulum
// isareti · kilitli-tarih capasi · donem gostergesi · KURAL EVI (00_genesis/ · OTONOM_DONEM.md ·
// KARAR_ALANI.md). Bunlari onceden serbest birakabilmek, ajanin kendi kafesini genisletebilmesi
// demek olurdu — izin listesi bir esneme yeridir, kafesin anahtari degil.
const IZIN_SOZLUGU = new Set(["git-obje", "disa", "mcp", "yazim", "korumali-yol", "kutu-ciktilari"]);
let izinListesi = null;
const izinli = (sinif) => {
  if (!donemAcik) return true;                 // el-suruslu: karar sahibe gider (SOR)
  if (!IZIN_SOZLUGU.has(sinif)) return false;  // sozlukte olmayan sinif onceden verilemez
  if (izinListesi === null) {
    izinListesi = new Set();
    try {
      const g = readFileSync(resolve(ROOT, "tools/sevk/.donem-acik"), "utf8").split("\n")[0].split("\t");
      const kutu = String(g[1] || "").trim();
      if (/^[A-Za-z0-9._-]+$/.test(kutu)) {
        const km = readFileSync(resolve(ROOT, "01_kutular", kutu, "KUTU.md"), "utf8");
        const satir = (km.split("\n").find((s) => /^\s*İZİN\s*:/.test(s)) || "").replace(/^\s*İZİN\s*:/, "");
        for (const jeton of satir.split(/[\s,·]+/)) if (IZIN_SOZLUGU.has(jeton)) izinListesi.add(jeton);
      }
    } catch { izinListesi = new Set(); }   // okunamayan kutu = izin YOK (fail-closed)
  }
  return izinListesi.has(sinif);
};
// Karari basar: donemde izinliyse GEC, degilse ENGEL-IZIN; donem yoksa bugunku SOR davranisi.
const izinKarari = (sinif, sorKodu, detay) => {
  if (!donemAcik) { console.log(sorKodu + (detay ? "\t" + detay : "")); process.exit(0); }
  if (izinli(sinif)) { console.log("GEC"); process.exit(0); }
  console.log("ENGEL-IZIN\t" + sinif + (detay ? " · " + detay : ""));
  process.exit(0);
};

// MCP dikisi (E2 Hat-2; E0 §9.1 kor-kanal bulgusu): donem-ACIK iken mcp__* cagrisi sahibe
// SORULUR — kutu disina is cikarabilen, dosya izi birakmayan kanal donemde sahip kapisindadir
// (bassiz donemde ask = red + iz; guvence artik harnessin degil bizim). El-suruslu kullanimda
// (donem yok) MCP serbesttir — bugunku davranis degismez.
if (String(j.tool_name || "").startsWith("mcp__")) {
  if (donemAcik) izinKarari("mcp", "SOR-MCP", String(j.tool_name));
  console.log("GEC"); process.exit(0);
}

// KUYRUK DİKİŞİ (E3 hasim bulgusu; YALNIZ donem-ACIK): otonom donemde hicbir rol sahibin
// kuyruguna (00_pano/SENDE_BEKLEYEN.md) YAZAMAZ. Gerekcesi OTONOM_DONEM §6.1: "cevap yalniz
// sahibin acik cevabiyla CEVAPLANDI olur; baska hicbir olay durumu degistiremez" — donemin
// kendi eliyle "[x] cevap: evet" yazabilmesi o kilidi mekanik olarak DELIYORDU. Mesru yazici
// kanca surecindeki tools/sevk/catal-kuyruk.sh betigidir ve o bu engelden gecmez. EL-SURUSLU
// kullanimda dikis YOK: D-21 akisi ("cevabi alan rol kapanis isareti koyar") aynen surer.
if (donemAcik && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(String(j.tool_name || ""))) {
  const hedefYol = String(ti.file_path || ti.notebook_path || "").replace(/\\/g, "/");
  if (/(^|\/)00_pano\/SENDE_BEKLEYEN\.md$/.test(hedefYol)) {
    console.log("ENGEL-KUYRUK\t00_pano/SENDE_BEKLEYEN.md"); process.exit(0);
  }
}

// Kural listesi ERKEN okunur (E2: Bash yazim-dikisi de korumali-yol metnine bakar).
// Liste HER ZAMAN gercek kokten okunur (worktree kopyasi degil — tasari §5).
// Bicim: satir basina bir yol; sondaki "/" = dizin-oneki; "#" yorum; [SERT]/[SORULUR] bolum.
let bolum = "";
const kurallar = [];
for (const satirHam of readFileSync(process.env.GUARD_LIST, "utf8").split("\n")) {
  const satir = satirHam.replace(/\r$/, "").trimEnd();
  if (!satir || satir.trimStart().startsWith("#")) continue;
  if (satir === "[SERT]" || satir === "[SORULUR]") { bolum = satir; continue; }
  if (!bolum) { console.log("HATA\tkorunan-yollar.txt: bolum basligi oncesi kayit"); process.exit(0); }
  kurallar.push({ bolum, yol: satir });
}
if (kurallar.length === 0) { console.log("HATA\tkorunan-yollar.txt bos — koruma tanimsiz"); process.exit(0); }

// Damga-dikisi (Faz 2, tek belgeli istisna — plan karari 2): rol damgasina (.aktif-rol)
// dokunan Bash komutu sahibe SORULUR (damga git-izsiz, bekci goremez). Baska hicbir
// komut-araci mudahalesi yok; okuma serbest.
if ((j.tool_name || "") === "Bash") {
  const komut = String(ti.command || "");
  if (komut.includes(".aktif-rol")) izinKarari("damga", "SOR-DAMGA", "tools/guard/.aktif-rol");
  // Capa-dikisi (V2 Obek-1 duzeltmesi 2026-07-23, hasim bulgusu wf_e35b1e11): kilitli-tarih
  // capasina (.taban-ref) dokunan Bash komutu kurulum BITMISKEN sahibe SORULUR — capayi
  // ilerletmek kilitli-ihlal sinyalini sondurur; "ilerletme sahip-onayli" guvencesinin mekanik
  // kapisi budur. Kurulum surerken sorulmaz (capanin G4te dogusu surtunmesiz). Metin-es sinir
  // damga-dikisiyle aynidir (bilinen sinir).
  if (komut.includes(".taban-ref") && existsSync(resolve(ROOT, ".kurulum-tamam"))) izinKarari("taban", "SOR-TABAN", "02_kanon/kilitli/.taban-ref");
  // Isaret-dikisi (soguk-denetim E2 + hasim turu 2026-07-16): kurulum isareti MEVCUTKEN ona
  // ".kurulum" iceren bir Bash komutu dokunuyorsa sahibe SORULUR (silinirse koruma kurulum-
  // moduna duser). ".kurulum" alt-dizesi hem ".kurulum-tamam" hem ".kurulum-*" glob desenini
  // yakalar; degisken/yeniden-adlandirma/suffix-glob (find -name yildiz-tamam) metin-esiyle
  // yakalanamaz (damga-dikisiyle ayni bilinen sinir) — asil yedek: isaret git-IZLI ve
  // korunan-yollar [SERT] oldugundan silinme bekcinin porcelain hattinda KIRMIZI basar.
  // Isaret yokken serbest (GENESIS dogumu sürtünmesiz).
  if (komut.includes(".kurulum") && existsSync(resolve(ROOT, ".kurulum-tamam"))) izinKarari("isaret", "SOR-ISARET", ".kurulum-tamam");
  // Kosu-dikisi (E1 hasim bulgusu A3): donem-ACIK gostergesine (.donem-acik) dokunan Bash komutu
  // sahibe SORULUR — dosya git-izsiz (.gitignore) oldugundan bekci porcelain hatti onu GOREMEZ;
  // tek guvencesi bu dikis + [SERT] arac-katmani. Tek bir rm komutu SubagentStop kapisini
  // sessiz sondururdu; simdi o rm sahibe soru olur. /donem toreninin kendi yazimi da buraya takilir ve
  // sahip onayiyla gecer (rol-toreni damga-dikisi emsali — G3.3c "bu NORMALdir"). Metin-es
  // sinir damga-dikisiyle aynidir (bilinen sinir).
  if (komut.includes(".donem-acik")) izinKarari("donem", "SOR-DONEM", "tools/sevk/.donem-acik");
  // DUR-dikisi (E4 hasim bulgusu): `.dur` sahibin acil frenidir ve .gitignore icindedir — bekcinin
  // porcelain hatti onu GOREMEZ. Kosu-gostergesiyle ayni sinif: ona dokunan Bash komutu SORULUR
  // (donem icinde modelin freni sessizce silmesini engeller; el-suruslu oturumda da sorulur —
  // dosya zaten yalnizca donem baglaminda anlamlidir).
  if (komut.includes(".dur")) izinKarari("donem", "SOR-DONEM", "tools/sevk/.dur");
  // Kanal-dikisi (E5): haber.sh ve nabiz.sh disa POSTA gonderir. Mesru cagiranlari yalnizca
  // kancalardir (donem-ac · sevk · SubagentStop kapisi · launchd) ve kanca sureci arac
  // katmanindan GECMEZ — yani bu dikis onlari hic gormez, hicbir mesru yolu kesmez.
  // Bir AJANIN bu betikleri cagirmasi ise "modelin yazdigi metni disari cikarma" yolunu acardi:
  // serbest-metin yasagi tam da bu yuzden arayuze gomulu (haber.sh icinde govde argumani YOKTUR).
  // Yol yine de kapatilir — E2 Hat-2 disa-giden fiillerinin kardesi.
  if (komut.includes("haber.sh") || komut.includes("nabiz.sh")) {
    console.log("ENGEL-KANAL\ttools/sevk/haber.sh"); process.exit(0);
  }
  // ---- E2 dikisleri (tasari §3) — icerik ENGELi bash katmaninda coktan kosuldu ----
  // Komut bolutleri: ; & | ` $( VE SATIRSONU ayraclarindan bolunur (hasim bulgusu: cok-satirli
  // komut satirsonuyla ucunu de atliyordu). "komut-konumu" = bir bolutun BASI.
  const bolutler = komut.split(/[;&|`\n]|\$\(/);
  // Bir bolutun ETKIN komut adini cikar: bastaki VAR=deger atamalarini + env/sudo/nohup/command/
  // time/exec oneklerini at; mutlak yolu son parcaya (basename) indir (hasim: /usr/bin/curl, git -C,
  // sudo curl kaciyordu). Boylece "git -C x push" -> git alt-komut cozumu, "/usr/bin/curl" -> curl.
  const komutAdi = (s) => {
    let t = s.trim();
    t = t.replace(/^((?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+)/, "");           // VAR=val onekleri
    t = t.replace(/^(?:env|sudo|nohup|command|time|exec|builtin)\s+(?:-\S+\s+)*/, ""); // sarmalayicilar
    const w = (t.match(/^(\S+)/) || [])[1] || "";
    return { ad: w.split("/").pop(), kuyruk: t.replace(/^\S+\s*/, "") };
  };
  // git global bayraklarini atlayip alt-komutu bul (git -C x / -c k=v / --git-dir= / --no-pager ...).
  const gitAlt = (kuyruk) => {
    const tok = kuyruk.split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < tok.length) {
      const t = tok[i];
      if (t === "-C" || t === "-c") { i += 2; continue; }
      if (t === "--git-dir" || t === "--work-tree" || t === "--namespace" || t === "--exec-path") { i += 2; continue; }
      if (/^--(git-dir|work-tree|namespace|exec-path|super-prefix)=/.test(t)) { i++; continue; }
      if (/^--(no-pager|paginate|bare|no-replace-objects|literal-pathspecs|help|version)$/.test(t) || t === "-p") { i++; continue; }
      if (t.startsWith("-")) { i++; continue; }
      break;
    }
    return tok[i] || "";
  };
  // Git-obje dikisi (YALNIZ donem-ACIK; E0 kalem-5: worktree ortak nesne deposu — add bile sizdirir):
  if (donemAcik) {
    const gitObje = bolutler.some((s) => { const c = komutAdi(s); return c.ad === "git" && /^(add|commit|stash)$/.test(gitAlt(c.kuyruk)); });
    if (gitObje) {
      const wtBaglam = komut.includes(".claude/worktrees") || String(j.cwd || "").includes(".claude/worktrees");
      if (wtBaglam) { console.log("ENGEL-WT"); process.exit(0); }
      izinKarari("git-obje", "SOR-GIT", "");
    }
  }
  // Disa-giden dikisi (HER KIPTE; D-03 mekanigi + E2 Hat-2): makineden disari cikaran komut
  // cinsleri sahibe SORULUR. Komut-konumu + basename + git-alt-komut cozumuyle "git -C x push",
  // "/usr/bin/curl", "sudo scp" hepsi yakalanir. settings-ask cift hattir (basit vakayi harness keser).
  const disaAdlar = new Set(["curl", "wget", "ssh", "scp", "sftp", "rsync", "mail", "sendmail", "gh"]);
  const disa = bolutler.some((s) => {
    const c = komutAdi(s);
    if (disaAdlar.has(c.ad)) return true;
    if (c.ad === "git" && gitAlt(c.kuyruk) === "push") return true;
    if (c.ad === "npm" && /\bpublish\b/.test(c.kuyruk)) return true;
    return false;
  });
  if (disa) izinKarari("disa", "SOR-DISA", "");
  // Yazim+korumali-yol dikisi (HER KIPTE; besinci dikis — hasim bulgusu: cp golden/ uc hatti
  // deliyordu): yazim-kalipli komut metninde korunan-yollar kaydi geciyorsa sahibe SORULUR.
  // [SERT] icin de SOR (ENGEL degil): metin-es sezgi hedef/kaynak ayiramaz — goldendan OKUYAN
  // mesru komut yanlis-ENGEL yememeli. Yazim-kalibi tanimi icerik-suzgeciyle AYNIdir.
  // /dev/null yonlendirmesi ve fd-dup (2>&1) yazim SAYILMAZ (hasim bulgusu: "cat X 2>/dev/null"
  // yanlis SOR-YAZIM uretiyordu — hedef gercek dosya degil).
  const komutTemiz = komut.replace(/[0-9]*>>?\s*\/dev\/null/g, "").replace(/[0-9]*>&[0-9-]*/g, "");
  const yazimKalip = /(^|[^>])>{1,2}(?!&)/.test(komutTemiz) || /<<-?\s*["'\''"]?\w/.test(komut) ||
    bolutler.some((s) => { const c = komutAdi(s); return /^(tee|cp|mv|dd|rsync|install|truncate)$/.test(c.ad) || (c.ad === "sed" && /(^|\s)(-i|--in-place)\b/.test(c.kuyruk)); });
  if (yazimKalip) {
    const anilanlar = kurallar.filter((k) => komut.includes(k.yol.replace(/\/$/, "")));
    if (anilanlar.length) {
      // Kurulum penceresi istisnasi ([SORULUR] emsali — GENESIS dogumu surtunmesiz: taban-ref
      // ve .kurulum-tamam yonlendirmeyle dogar): kurulum surerken dikis YALNIZ cekirdek ucluyu
      // (tools/guard/ + tools/sevk/ + .claude/) anan komutta sorar (A5 ruhu), digerinde susar.
      const kurulumSuruyorB = !existsSync(resolve(ROOT, ".kurulum-tamam"));
      const cekirdekAnildi = anilanlar.some((k) => /^(tools\/guard\/|tools\/sevk\/|\.claude\/)/.test(k.yol));
      if (!kurulumSuruyorB || cekirdekAnildi) izinKarari("yazim", "SOR-YAZIM", anilanlar[0].yol);
    }
  }
  console.log("GEC"); process.exit(0);
}

// KESIN daraltma: koruma yalniz YAZMA araclarina karsi. Okuma (Read vb.) ve komut araclari
// dosya-yolu tasisa bile serbesttir; taninmayan yeni yazma araclarini ikinci hat (bekci) izler.
const YAZMA = new Set(["Edit", "MultiEdit", "Write", "NotebookEdit"]);
if (!YAZMA.has(j.tool_name || "")) { console.log("GEC"); process.exit(0); }
const ham = ti.file_path || ti.notebook_path || "";
if (!ham) { console.log("GEC"); process.exit(0); }
const hedef = kanonik(resolve(ROOT, ham));

// Worktree sanal koku (E2 Hat-3; E0 §4.2 ZORUNLU revizyonu — aday A): harness worktreesi
// PROJE/.claude/worktrees/<ajan>/ altinda yasar ve .claude/ [SERT] oldugundan icindeki HER
// yazim kesiliyordu (T0h canli bulgusu). Cozum: hedef worktree icindeyse kurallar worktree
// SANAL KOKUNE gore degerlendirilir — koruma haritasi worktreede AYNEN kurulur (worktree ici
// tools/guard/ + .claude/ + kilitli yine SERT; golden yine SORULUR; is alanlari serbest).
// Kacaklar: ../symlink kanonik() ile gercek yola cozulur (worktree disina cozulen hedef gercek
// kok kurallarina doner); worktree kokune TEK-parca dosya sanal kok kurmaz (.claude/ SERT kalir);
// ic ice worktree eslemesi TEK seviye (kalan yol sanal kokun .claude/ kuralina takilir).
// GERCEK-WORKTREE KAPISI (hasim bulgusu — KRITIK): sanal kok yalniz GERCEK bir git worktree
// icinde kurulur; "git worktree add"in biraktigi <kok>/.git DOSYASI aranir. Yoksa (ajanin uydurdugu
// .claude/worktrees/hayalet/ yolu) sanal kok kurulmaz → GERCEK kok kurallari (.claude/ [SERT])
// gecerli kalir, uydurma-yol ile [SERT] delme + kurulum-modu istismari kapanir (E0 §4.2 sarti).
let KOKE = ROOT;
const wtTaban = kanonik(resolve(ROOT, ".claude", "worktrees"));
if (hedef.startsWith(wtTaban + sep)) {
  const kalan = hedef.slice(wtTaban.length + 1);
  const kes = kalan.indexOf(sep);
  if (kes > 0) {
    const aday = join(wtTaban, kalan.slice(0, kes));
    if (existsSync(join(aday, ".git"))) KOKE = aday; // yalniz gercek worktree
  }
}

const eslesir = (k) => {
  const dizin = k.yol.endsWith("/");
  const tam = kanonik(resolve(KOKE, dizin ? k.yol.slice(0, -1) : k.yol));
  return hedef === tam || (dizin && hedef.startsWith(tam + sep));
};
const altinda = (dizinYolu) => {
  const tam = kanonik(resolve(KOKE, dizinYolu));
  return hedef === tam || hedef.startsWith(tam + sep);
};

const kurulumSuruyor = !existsSync(resolve(KOKE, ".kurulum-tamam"));
// ISTISNA REFERANSI SYMLINK ISE ISTISNA YOKTUR (hasim bulgusu 2026-07-30). kanonik() hem hedefi
// hem referansi diskin gercek yazimina cozer; bu yuzden `.claude/agents -> tools/guard` gibi tek
// bir sembolik bag, kurulum-penceresi istisnasini bagin isaret ettigi BUTUN agaca yayiyordu
// (olculdu: koruma kodunun tamami yazilabilir hale geliyordu). Ayni delik `.claude/skills` icin
// b268adc oncesinden beri acikti; ayni sinif oldugu icin ucu birlikte kapaniyor.
// Yolun HER PARCASI denetlenir: ara dizinin bag olmasi da yeter.
const bagsiz = (yol) => {
  let p = KOKE;
  for (const parca of yol.split("/")) {
    p = join(p, parca);
    try { if (lstatSync(p).isSymbolicLink()) return false; } catch { return true; }
  }
  return true;
};
let sertMuaf = false;
const sert = kurallar.find((k) => k.bolum === "[SERT]" && eslesir(k));
if (sert) {
  if (kurulumSuruyor) {
    // Cekirdekli istisna: kurulum surerken yalniz tools/guard/ + .claude/ + tools/sevk/ sert
    // kalir; onun icinde de korunan-yollar.txt yazilabilir (GENESIS veri doldurur).
    // tools/sevk cekirdege E1 hasim bulgusu A5 ile girdi: sevk betikleri SABLONLA SABIT gelir —
    // kuran ajan koruma/sevk KODUNU ve damgalar/ prova fislerini kurulum penceresinde yeniden
    // yazamasin. (Otonom kipin KURAL EVI artik elle kopyalanmiyor ama o dosya 02_kanon/ altinda
    // [SORULUR]dur, bu cekirdegin icinde degil — G3.3f.)
    const cekirdekte = altinda("tools/guard") || altinda(".claude") || altinda("tools/sevk");
    const listeDosyasi = hedef === kanonik(resolve(KOKE, "tools/guard/korunan-yollar.txt"));
    // GENESIS gercek-veri isaret listesini kurulumda doldurabilmeli (korunan-yollar.txt emsali —
    // ikisi de tools/guard/ altinda VERI dosyasidir; hasim bulgusu: doldurma yolu mekanikce kapaliydi).
    const veriDosyasi = hedef === kanonik(resolve(KOKE, "tools/guard/gercek-veri-isaretleri.txt"));
    const beceriAlani = altinda(".claude/skills") && bagsiz(".claude/skills"); // rol becerileri (G3.3c)
    // GENESIS kadronun alt-ajan koltuklarini kurulumda uretir (G3.3e) — bu yol bugune dek
    // mekanikce KAPALIYDI ve otonom donem "sahibi kadroda yok" diye duruyordu. Istisna DAR:
    // sablonla gelen UC SABIT yazamaz koltuk bunun DISINDADIR — bagimsiz gozun arac listesini
    // kuran ajan yeniden yazamaz (yazabilse `tools:` satirina Write ekleyip "yazamayan
    // dogrulayici" guvencesini sessizce oldururdu). Listenin diskteki gercekle esligini
    // sablon testi tutar: yeni bir sabit koltuk eklenip buraya yazilmazsa test KIRMIZI.
    // Karsilastirma AD ile degil COZULMUS YOL ile: kanonik() diskin gercek yazimina iner,
    // yani buyuk/kucuk harfe duyarsiz dosya sisteminde "dogrulayici.MD" ile sabit koltugu
    // ezme yolu da kapanir (listeDosyasi/veriDosyasi emsali).
    const SABIT_KOLTUKLAR = ["dogrulayici", "catal-denetcisi", "kurulum-denetcisi"];
    const kadroAlani = altinda(".claude/agents") && bagsiz(".claude/agents") &&
      !SABIT_KOLTUKLAR.some((s) => hedef === kanonik(resolve(KOKE, ".claude/agents/" + s + ".md")));
    // Haber kanalinin yapilandirmasi (G5.0c): tools/sevk/ kurulumda cekirdektir cunku sevk KODU
    // ve prova fisleri kurulum penceresinde yeniden yazilmasin. Bu TEK dosya kod DEGIL VERIdir
    // (hicbir zaman source edilmez, satir satir ayristirilir) ve gitignore listesindedir —
    // NOT: bu blok bash tek-tirnagi icinde yasiyor, yorumda KESME ISARETI kullanilamaz.
    // korunan-yollar.txt ile gercek-veri-isaretleri.txt emsali.
    const kanalAyari = hedef === kanonik(resolve(KOKE, "tools/sevk/kanal.conf")) && bagsiz("tools/sevk/kanal.conf");
    if (!cekirdekte || listeDosyasi || veriDosyasi || beceriAlani || kadroAlani || kanalAyari) sertMuaf = true;
  }
  // MUAF DAL ARTIK BURADA CIKMIYOR (hasim bulgusu 2026-07-30): eskiden dogrudan "GEC" basip
  // process.exit yapiyordu ve rol kafesi bu yollarda HIC kosmuyordu — yani `yazamaz` damgali bir
  // oturum sıradan bir is dosyasini yazamazken alt-ajan koltugunu ve haber kanalini yazabiliyordu.
  // Ilan edilen oncelik "[SERT] > rol-kafesi > [SORULUR]"dir; muaf yol kafesi ATLAMAZ.
  if (!sertMuaf) { console.log("ENGEL\t" + sert.yol); process.exit(0); }
}
// Rol kafesi (Faz 2): tören (rol-ac.sh) .aktif-rol damgasini bastiysa ve mod "yazamaz" ise,
// YAZMA sinifi rolun kendi klasoru disinda kesilir; ROL.md sozlesme dosyasi istisnanin
// DISINDADIR (rol kendi sozlesmesini yazamaz). Koke/disari cozulen sahte "ev" istisnasiz
// kilitler (savunma-derinligi). Oncelik: [SERT] > rol-kafesi > [SORULUR].
const damgaYolu = resolve(ROOT, "tools/guard/.aktif-rol");
if (existsSync(damgaYolu)) {
  let rol = null;
  try {
    const [slug, mod, ev] = readFileSync(damgaYolu, "utf8").split("\n")[0].split("\t");
    if (slug && (mod === "yazamaz" || mod === "tam")) rol = { slug, mod, ev: (ev || "").trim() };
  } catch {}
  if (!rol) { console.log("HATA\ttools/guard/.aktif-rol bozuk/okunamadi — rol durumu belirsiz, yazma guvenli tarafta engellendi. Cozum: yeni oturum ac (SessionStart temizler) ya da dosyayi sil"); process.exit(0); }
  if (rol.mod === "yazamaz") {
    const evYolu = rol.ev.endsWith("/") ? rol.ev.slice(0, -1) : rol.ev;
    const evTam = evYolu ? kanonik(resolve(KOKE, evYolu)) : "";
    const evGecerli = evTam && evTam !== KOKE && evTam.startsWith(KOKE + sep);
    const evIci = evGecerli && (hedef === evTam || hedef.startsWith(evTam + sep));
    const sozlesme = evIci && hedef === join(evTam, "ROL.md");
    if (!evIci || sozlesme) { console.log("ROL-ENGEL\t" + rol.slug); process.exit(0); }
  }
}

// Kurulum-penceresi muafiyeti kafesten SONRA gecer (yukaridaki not).
if (sertMuaf) { console.log("GEC"); process.exit(0); }
const sor = kurallar.find((k) => k.bolum === "[SORULUR]" && eslesir(k));
if (sor) {
  if (kurulumSuruyor) { console.log("GEC"); process.exit(0); }
  // Sinif YOLA gore: kural evi ASLA onceden verilemez; ilk kutunun iki urunu kendi sinifindadir;
  // gerisi (golden dahil, projenin ekledigi yollar dahil) `korumali-yol` sinifidir.
  const KURAL_EVI = ["00_genesis/", "02_kanon/OTONOM_DONEM.md", "02_kanon/KARAR_ALANI.md"];
  const KUTU_CIKTILARI = ["02_kanon/BITTI_TANIMI.md", "02_kanon/KUTU_PLANI.md"];
  const sinif = KURAL_EVI.includes(sor.yol) ? "kural-evi"
              : (KUTU_CIKTILARI.includes(sor.yol) ? "kutu-ciktilari" : "korumali-yol");
  izinKarari(sinif, "SOR", sor.yol);
}
console.log("GEC");
')" || engel "yol çözümleyici koşamadı (fail-closed)"

DURUM="${KARAR%%$'\t'*}"
DETAY="${KARAR#*$'\t'}"

case "$DURUM" in
  GEC) exit 0 ;;
  ENGEL)
    engel "bu yol korumalı ([SERT] sınıfı: $DETAY). Kilitli karar / guard dosyaları oturum içinde DEĞİŞTİRİLMEZ; meşru bir değişiklik gerekiyorsa sahibine söyle — yol: sahip kararı + tören. Liste: tools/guard/korunan-yollar.txt"
    ;;
  SOR)
    GEREKCE="Korumalı alan ([SORULUR] sınıfı: $DETAY) — bu değişiklik meşru olabilir ama sahip kararı ister." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  ROL-ENGEL)
    engel "rol kafesi: aktif rol '$DETAY' YAZAMAZ modundadır — dosya-yazma araçları bu oturumda mekanik kilitli (kendi 03_roller/ klasörü hariç; ROL.md sözleşmesi istisnanın DIŞINDA; tören kaydı: tools/guard/.aktif-rol). Bulguyu DEĞİŞTİRME, raporla — yazma işi 'tam' profilli rol oturumunundur (EL_KITABI rol-töreni kuralı)."
    ;;
  SOR-DAMGA)
    GEREKCE="Bu kabuk komutu rol-töreni damgasına (tools/guard/.aktif-rol) dokunuyor. Damga oturum-durumudur; meşru yolu /rol-<slug> töreni ve yeni oturumdur. Elle müdahale sahip kararı ister." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  SOR-ISARET)
    GEREKCE="Bu kabuk komutu kurulum işaretine (.kurulum-tamam) dokunuyor. İşaret koruma rejiminin anahtarıdır: yokken kilitli alanlar kurulum-moduna düşer. Silme/değiştirme sahip kararı ister." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  SOR-TABAN)
    GEREKCE="Bu kabuk komutu kilitli-tarih çapasına (02_kanon/kilitli/.taban-ref) dokunuyor. Çapayı ilerletmek, kilitli-karar ihlal sinyalini söndürür — sahip kararı ister (bekçi koruma-hattı iii)." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  ENGEL-KANAL)
    printf 'file-guard ENGEL: haber kanalı ajan eliyle çağrılamaz (%s).\nBu betikler sahibin adına DIŞARI posta gönderir; meşru çağıranları yalnız kancalardır (/donem töreni · sevk · SubagentStop kapısı · launchd watchdog) ve onlar araç katmanından geçmez.\nSerbest metnin dışarı çıkmaması bu tasarımın çekirdek güvencesidir: gövde yalnız tanımlı alanlardan kurulur ve gönderim öncesi içerik süzgecinden geçer (OTONOM_DONEM §7 · §12).\n' "$DETAY" >&2
    exit 2
    ;;
  SOR-DONEM)
    GEREKCE="Bu kabuk komutu dönem-AÇIK göstergesine (tools/sevk/.donem-acik) dokunuyor. Gösterge otonom dönemin anahtarıdır: silinirse SubagentStop biçim kapısı sessizce kapanır. Meşru yolu /donem töreni ve sevk kapanışıdır; elle müdahale sahip kararı ister." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  ENGEL-KUYRUK)
    engel "otonom dönemde sahibin kuyruğuna ($DETAY) yazım YASAK — «cevap yalnız sahibin açık cevabıyla CEVAPLANDI olur; başka hiçbir olay durumu değiştiremez» (OTONOM_DONEM §6.1). Dönemin kendi eliyle cevap işaretlemesi bu kilidi delerdi. Meşru yazıcı sevk kancasıdır (tools/sevk/catal-kuyruk.sh); el-sürüşlü oturumda bu engel YOKTUR."
    ;;
  SOR-MCP)
    GEREKCE="Otonom dönem AÇIKKEN MCP araç çağrısı ($DETAY) sahip kapısındadır: kutu dışına iş çıkarabilen, dosya izi bırakmayan kanal (E2 dikişi; başsız dönemde bu soru red + iz olur)." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  SOR-GIT)
    GEREKCE="Otonom dönem AÇIKKEN obje üreten git komutu (add/commit/stash) doğrulayıcı yeşili ister — commit-öncesi kapı (OTONOM_DONEM §3/§7). Karne-şartı mekaniği E4'e dek bu sahip sorusudur; başsız dönemde red + iz." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  SOR-DISA)
    GEREKCE="Bu komut makineden DIŞARI çıkan sınıftadır (push/gönderim/paylaşım) — dışa giden her şey sahip kararıdır (D-03; E2 Hat-2). Başsız dönemde bu soru red + iz olur." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  SOR-YAZIM)
    GEREKCE="Yazım-kalıplı kabuk komutu korumalı yolu ($DETAY) anıyor — hedef mi kaynak mı metinden ayrılamaz, sahip kararı ister (E2 beşinci dikiş). Dosya yazımı için meşru yol yazma araçlarıdır (Edit/Write); Bash yazımı otonom dönemde zaten bulgudur (OTONOM_DONEM §7)." \
      "$NODE_BIN" -e 'console.log(JSON.stringify({hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:process.env.GEREKCE}}))'
    exit 0
    ;;
  ENGEL-WT)
    engel "otonom dönemde worktree bağlamında obje üreten git komutu (add/commit/stash) YASAK — worktree ana depoyla AYNI nesne veritabanını paylaşır, atılan obje worktree silinse de kalır (E0 ölçümü). Kanıt yalnız dosya:satır ile verilir (OTONOM_DONEM §7); taşıma sevkin işidir, dosya-kopyasıyla."
    ;;
  ENGEL-IZIN)
    printf 'file-guard ENGEL: otonom dönemde izin penceresi AÇILMAZ (sınıf: %s).\nBu adım kutunun «İZİN:» satırında önceden serbest bırakılmamış — yani sahibin bu döneme verdiği izinlerin dışında.\nYAPILACAK: bu adımı ATLA, işine devam et ve dönüş zarfına «İZİN-ENGELİ: <ne engellendi>» satırını yaz. Dönem sürüyor; yapı sahibin kuyruğuna atlanan adım için not düşecek.\nSahip bu sınıfı istiyorsa kutunun duruş sözleşmesindeki İZİN satırına ekler (sözlük: git-obje · disa · mcp · yazim · korumali-yol · kutu-ciktilari).\nKural evi (00_genesis/ · OTONOM_DONEM.md · KARAR_ALANI.md) ve yapının damga/işaret dosyaları HİÇBİR ZAMAN önceden verilemez.\n' "$DETAY" >&2
    exit 2
    ;;
  HATA) engel "$DETAY (fail-closed)" ;;
  *) engel "çözümleyici beklenmeyen karar döndürdü: $KARAR (fail-closed)" ;;
esac
