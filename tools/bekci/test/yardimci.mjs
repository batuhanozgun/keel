// yardimci.mjs — bekçi çekirdeği testlerinin ORTAK fixture kurucusu.
// Fixture kurulu-kutu gerçeğini yansıtır: kalıp biçimleri PANO_SOZLESMESI + BEKCI_TARIFI'ndan
// birebir alınmıştır (uydurma bir ağaç, çekirdeğin gerçekte gördüğü şeyi sınamazdı — guard
// testlerinin kendi ilkesi). git'li kurulur: kilitli-tarih ve golden-tazelik git tarihi ister.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BURASI = dirname(fileURLToPath(import.meta.url));
export const CEKIRDEK = join(BURASI, '..', 'cekirdek.mjs');

export const EK_TAM = `# EL KİTABI — işletim disiplini
Bu belge ekibin çalışma anayasasıdır. Ağırlık kadranı: **TAM RİTÜEL**.
**Değer aksiyomu:** İşi bitiren en küçük çıktı en iyisidir.
## D-kuralları
- D7 · Mühür paketi. SENDE BEKLEYEN satırı zorunlu; dördüncüsü dış göz brifingi işaretçisidir.
- D9 · İş-icat yasağı.
## F-kuralları
- F6 · Kural-evrim kilidi.
**Tavanlar (sarı eşik):** PANO 2KB · SAGLIK 2KB · DURUM 2KB · KUTU 10KB · ERTELENENLER 4KB · SENDE_BEKLEYEN 10KB · BRIFING 2KB · NOTLAR 2KB · EL_KITABI 16KB. Sarı = uyarı (iş durmaz); kırmızı (1,5×) = yalnız kutu KAPANIŞINI kilitler.
## Üslup hükmü
## Kutu döngüsü
## Mühür ritüeli
Muğlak mesaj onay sayılmaz; yorumla onay üretme yasak.
## Domain-rol disiplin iskeleti
## Kanon-fakir dünya
## Kişisel-veri süzgeci
## Kadro + kapsam
`;

export const EK_KUCUK = EK_TAM.replace('Ağırlık kadranı: **TAM RİTÜEL**', 'Ağırlık kadranı: **KÜÇÜK / düşük-risk**');

export const KUTU_METNI = `# KUTU — KT-001 proje planı

## Kabul kriterleri
- ölçüt 1: dört çıktı dosyası açılıp sahibe okunur

## Görevler
| Görev | İş | Sahip | Durum | Kanıt |
|---|---|---|---|---|
| G-01 | ilk iş | koordinator | açık | test: fixture koşusu yeşil |
| G-02 | ikinci iş | koordinator | açık | demo: elle bakılır |

## Duruş sözleşmesi
BİTİŞ HÂLİ: demo gözle görünür
KANIT:      node --test çıktısı temiz
KISIT:      kilitliye dokunulmaz
BÜTÇE:      dönem başına 5 üretim çağrısı

## Bağımlılık ve risk (yalnız sevk + kurulum denetçisi okur)
G-01: onkosul=yok · risk=düşük — süreç işi; geri dönüşü dosya silmektir
`;

export function confMetni(ek = {}) {
  const conf = {
    kadran: 'tam',
    tavan_pano: 2048, tavan_saglik: 2048, tavan_durum: 2048, tavan_kutu: 10240,
    tavan_ertelenenler: 4096, tavan_sende_bekleyen: 10240, tavan_brifing: 2048,
    tavan_notlar: 2048, tavan_el_kitabi: 16384,
    urun_yollari: '04_urun', golden_dizini: '02_kanon/golden',
    kok_izinli_ek: '.DS_Store .obsidian', pano_izinli_ek: '.DS_Store',
    ...ek,
  };
  return '# bekci.conf — proje ayarı [SORULUR]\n'
    + Object.entries(conf).map(([a, d]) => a + '=' + d).join('\n') + '\n';
}

const AYARLAR_JSON = JSON.stringify({
  hooks: {
    PreToolUse: [
      { matcher: '*', hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/guard/file-guard.sh"' }] },
      { matcher: 'Task|Agent', hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/sevk/devir-kapisi.sh"' }] },
    ],
    Stop: [
      { hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/sevk/sevk.sh"' }] },
      { hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/guard/kurulum-surucu.sh"' }] },
    ],
    SessionStart: [
      { matcher: 'startup', hooks: [{ type: 'command', command: 'rm -f "$CLAUDE_PROJECT_DIR/tools/guard/.aktif-rol"' }, { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/guard/acilis.sh"' }] },
      { matcher: 'clear', hooks: [{ type: 'command', command: 'rm -f "$CLAUDE_PROJECT_DIR/tools/guard/.aktif-rol"' }, { type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/guard/acilis.sh"' }] },
    ],
    SessionEnd: [{ hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/guard/kapanis.sh"' }] }],
    SubagentStop: [{ hooks: [{ type: 'command', command: 'bash "$CLAUDE_PROJECT_DIR/tools/sevk/zarf-bicim-kapisi.sh"' }] }],
  },
}, null, 2);

const KORUNAN_YOLLAR = `# korunan-yollar — fixture (biçim: file-guard.sh grameri)
[SERT]
tools/guard/
tools/sevk/
.claude/
.kurulum-tamam
02_kanon/kilitli/
00_pano/zarf-gunlugu.jsonl

[SORULUR]
02_kanon/golden/
00_genesis/
`;

export function git(kok, ...args) {
  const r = spawnSync('git', args, { cwd: kok, encoding: 'utf8' });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' rc=' + r.status + ': ' + r.stderr);
  return r.stdout;
}

// tarih verilirse commit zamanı ona sabitlenir (golden-tazelik %ct saniye çözünürlüklü —
// aynı saniyeye düşen iki commit "eski"yi ölçemez).
export function commitEt(kok, mesaj, tarih = null) {
  git(kok, 'add', '-A');
  const env = { ...process.env, GIT_AUTHOR_NAME: 'Tatbikat', GIT_AUTHOR_EMAIL: 't@ornek', GIT_COMMITTER_NAME: 'Tatbikat', GIT_COMMITTER_EMAIL: 't@ornek' };
  if (tarih) { env.GIT_AUTHOR_DATE = tarih; env.GIT_COMMITTER_DATE = tarih; }
  const r = spawnSync('git', ['commit', '-qm', mesaj, '--allow-empty'], { cwd: kok, encoding: 'utf8', env });
  if (r.status !== 0) throw new Error('git commit rc=' + r.status + ': ' + r.stderr);
  return git(kok, 'rev-parse', 'HEAD').trim();
}

export function kurulum(opts = {}) {
  const {
    kadran = 'tam',            // conf + EL_KITABI birlikte kurulur (tanıklar uyumlu doğar)
    kurulumTamam = true,
    gitli = true,
    conf = {},
  } = opts;
  const kok = mkdtempSync(join(tmpdir(), 'bekci-cekirdek-'));
  const yaz = (rel, icerik) => { mkdirSync(dirname(join(kok, rel)), { recursive: true }); writeFileSync(join(kok, rel), icerik); };

  yaz('CLAUDE.md', '# proje\n');
  yaz('README.md', '# okuma\n');
  yaz('NASIL_KULLANILIR.md', '# kullanım\n');
  yaz('LICENSE', 'MIT\n');
  yaz('.gitignore', '.DS_Store\ntools/sevk/.nabiz-son\ntools/sevk/kanal.conf\ntools/guard/.aktif-rol\n');
  yaz('.claude/settings.json', AYARLAR_JSON);

  yaz('00_pano/PANO.md', '<!-- yazar: bekci-betigi (MEKANİK BLOK) + koordinator (YARGI BLOĞU) -->\n# PANO\n\n'
    + '## MEKANİK BLOK — yalnız bekçi yazar\n```\nSon denetim: 2026-08-01 09:00 (denetim #1)\n```\n\n'
    + '## YARGI BLOĞU — yazar: koordinator\n- **Aktif kutu:** KT-001\n- **SIRADAKİ OTURUM:** koordinator — plan\n- **Blokaj:** yok\n');
  yaz('00_pano/ERTELENENLER.md', '# ERTELENENLER\n- [ ] 2026-08-01 · parklanan kalem · uyanma: v2 kapısı\n');
  yaz('00_pano/SENDE_BEKLEYEN.md', '# SENDE BEKLEYEN — sahipte bekleyen maddeler\n'
    + '- [ ] 2026-08-01 · koordinator · soru bir · kaynak: oturum 1\n'
    + '- [x] 2026-08-02 · koordinator · soru iki · cevap: "olur" · 2026-08-03\n');
  yaz('00_pano/zarf-gunlugu.jsonl',
    '{"surum":1,"ts":"2026-08-01T10:00:00Z","tip":"donem-acilis","donem":"d1"}\n'
    + '{"surum":1,"ts":"2026-08-01T10:05:00Z","tip":"nabiz","donem":"d1"}\n');

  yaz('01_kutular/KT-001-proje-plani/KUTU.md', KUTU_METNI);
  mkdirSync(join(kok, '01_kutular', '_arsiv'), { recursive: true });
  yaz('01_kutular/_arsiv/.tut', '');

  yaz('02_kanon/EL_KITABI.md', kadran === 'tam' ? EK_TAM : EK_KUCUK);
  yaz('02_kanon/kilitli/README.md', 'Kilitli karar gövdeleri buraya. Kilitli düzenlenmez — L3 gereği YENİSİ yazılır.\n');
  yaz('02_kanon/kilitli/K-001-ornek.md', '# K-001 — örnek kilitli karar\nhüküm satırı\n');
  yaz('02_kanon/golden/README.md', 'Donmuş örnek-çıktılar (golden) burada yaşar.\n');

  yaz('03_roller/koordinator/ROL.md', '# ROL — Koordinatör\nMod: **tam**\n');
  yaz('03_roller/koordinator/DURUM.md', '# DURUM — Koordinatör\nHenüz oturum açılmadı\n');
  yaz('03_roller/disgoz/ROL.md', '# ROL — Dış göz\nMod: **yazamaz**\n');
  yaz('03_roller/disgoz/DURUM.md', '# DURUM — Dış göz\nHenüz oturum açılmadı\n');
  yaz('03_roller/disgoz/BRIFING.md', '<!-- yazar: disgoz -->\n# DIŞ GÖZ — brifing\nTarih: 2026-08-01\n');

  for (const betik of ['file-guard.sh', 'rol-ac.sh', 'kapanis.sh', 'acilis.sh', 'kurulum-surucu.sh', 'porcelain.sh', 'icerik-suzgeci.sh']) {
    yaz('tools/guard/' + betik, '#!/bin/bash\n# fixture kablosu\n');
  }
  yaz('tools/guard/gercek-veri-isaretleri.txt', '# fixture\n');
  yaz('tools/guard/korunan-yollar.txt', KORUNAN_YOLLAR);
  for (const betik of ['sevk.sh', 'zarf-ekle.sh', 'zarf-bicim-kapisi.sh']) {
    yaz('tools/sevk/' + betik, '#!/bin/bash\n# fixture kablosu\n');
  }
  yaz('tools/bekci/bekci.conf', confMetni({ kadran, ...conf }));

  if (kurulumTamam) yaz('.kurulum-tamam', '2026-08-01\n');

  if (gitli) {
    git(kok, 'init', '-q');
    git(kok, 'config', 'user.email', 't@ornek');
    git(kok, 'config', 'user.name', 'Tatbikat');
    const taban = commitEt(kok, 'genesis kurulum', '2026-08-01T10:00:00');
    yaz('02_kanon/kilitli/.taban-ref', taban + '\n');
    commitEt(kok, 'genesis taban-ref', '2026-08-01T10:00:05');
  }
  return kok;
}

export function kos(kok, env = {}) {
  const r = spawnSync(process.execPath, [CEKIRDEK, kok], { encoding: 'utf8', env: { ...process.env, ...env } });
  const satirlar = (r.stdout || '').trimEnd().split('\n');
  const makine = satirlar[satirlar.length - 1] || '';
  const m = makine.match(/^BEKCI v1 durduran=(\d+) kilit=(\d+) uyari=(\d+) bilgi=(\d+) ariza=(\d+) kadran=(tam|kucuk) pencere=(kurulum|isletim)$/);
  const alanlar = m ? { durduran: +m[1], kilit: +m[2], uyari: +m[3], bilgi: +m[4], ariza: +m[5], kadran: m[6], pencere: m[7] } : null;
  return { rc: r.status, stdout: r.stdout || '', stderr: r.stderr || '', makine, alanlar };
}

export function temizle(kok) { rmSync(kok, { recursive: true, force: true }); }
