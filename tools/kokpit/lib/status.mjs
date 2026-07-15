// Vault durumu → tek JSON. SALT-OKUNUR: yalnız okur, ayrıştırır; hiçbir yere yazmaz.
// Biçim sözleşmesi recon'dan (pano-recon workflow, 2026-07-03). Türkçe İ/ı ve · (U+00B7),
// — (U+2014), → (U+2192) load-bearing; ASCII normalize edilmez, toLowerCase kullanılmaz.
//
// Kaynak önceliği (recon gotcha): görev durumu için tek otorite PANO MEKANİK BLOK
// (bekci.sh üretir, makine). KUTU kapı tablosu koordinatör elyazımı (en bayat) → yalnız iş+sahip.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { splitRow } from './markdown.mjs';

const MID = '·';   // ·  alan ayıracı (boşluklu)
const DASH = '—';  // —  em-dash

// "AKIŞ=YEŞİL · DOSYA=SARI · DAVRANIŞ=VERİ-YOK" → [{ad,deger}] (sıralı).
// Ad'lar serbest (vault'a göre değişir); yalnız söz dizimi sabit (NAME=val · NAME=val).
export function parseLights(s) {
  if (typeof s !== 'string') return null;
  const out = [];
  for (const part of s.split(' ' + MID + ' ')) {
    const m = part.trim().match(/^(.+?)=(\S+)$/);
    if (m) out.push({ ad: m[1].trim(), deger: m[2] });
  }
  return out.length ? out : null;
}

async function readIf(abs) {
  try {
    return await fs.readFile(abs, 'utf8');
  } catch {
    return null;
  }
}

async function statIf(abs) {
  try {
    return await fs.stat(abs);
  } catch {
    return null;
  }
}

// --- PANO mekanik blok (fenced, makine) ---
function parseMekanik(pano, warnings) {
  const out = { lights: null, tasks: {}, red: null, yellow: null, lastRun: null, runNo: null };
  if (!pano) {
    warnings.push('PANO.md okunamadı');
    return out;
  }
  const block = pano.match(/## MEKANİK BLOK[^\n]*\n```\n([\s\S]*?)\n```/);
  if (!block) {
    warnings.push('PANO mekanik blok bulunamadı (biçim değişmiş olabilir)');
    return out;
  }
  const body = block[1];
  const son = body.match(/Son koşu:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\(koşu #(\d+)\)/);
  if (son) {
    out.lastRun = son[1];
    out.runNo = Number(son[2]);
  }
  const isikLine = body.match(/Işıklar:\s*(.+)/);
  if (isikLine) out.lights = parseLights(isikLine[1]);
  else warnings.push('PANO Işıklar satırı okunamadı');
  if (isikLine && !out.lights) warnings.push('PANO Işıklar satırı çözümlenemedi');
  const gorev = body.match(/Görevler:\s*(.+)/);
  if (gorev) {
    for (const part of gorev[1].split(' ' + MID + ' ')) {
      const m = part.match(/G-(\d+)=(\S+)/);
      if (m) out.tasks['G-' + m[1]] = m[2];
    }
  } else {
    warnings.push('PANO Görevler satırı okunamadı');
  }
  const say = body.match(/Kırmızı:\s*(\d+) · Sarı:\s*(\d+)/);
  if (say) {
    out.red = Number(say[1]);
    out.yellow = Number(say[2]);
  } else {
    warnings.push('PANO Kırmızı/Sarı sayaç satırı okunamadı');
  }
  return out;
}

// --- SAGLIK.md (makine): damga + kalem metinleri ---
function parseSaglik(saglik, warnings) {
  const out = { lastRun: null, runNo: null, lights: null, items: [] };
  if (!saglik) {
    warnings.push('SAGLIK.md okunamadı');
    return out;
  }
  const stamp = saglik.match(/son koşu:\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\(koşu #(\d+)\)/);
  if (stamp) {
    out.lastRun = stamp[1];
    out.runNo = Number(stamp[2]);
  } else {
    warnings.push('SAGLIK tazelik damgası bulunamadı');
  }
  const isik = saglik.match(/\*\*Işıklar:\*\*\s*(.+)/);
  if (isik) out.lights = parseLights(isik[1]);
  for (const line of saglik.split(/\r?\n/)) {
    const m = line.match(/^-\s*\[(KIRMIZI|SARI|[iİI])\]\s*(.+)$/);
    if (m) out.items.push({ level: /^[iİI]$/.test(m[1]) ? 'BILGI' : m[1], text: m[2].trim() });
  }
  return out;
}

// --- PANO yargı bloğu (nesir): kalın etiketli satırlar ---
function yargiField(pano, label) {
  if (!pano) return null;
  const re = new RegExp('- \\*\\*' + label + '[^:]*:\\*\\*\\s*(.+)');
  const m = pano.match(re);
  return m ? m[1].trim() : null;
}

// --- KUTU.md kapı tablosu → [{id, is, sahip, durum, kanit}] ---
// Sözleşme: kapılar "## Kapılar" bölümü altındadır. Tek-faz (Faz başlığı yok) →
// tüm satırlar aktif. Çok-faz → yalnız "### Faz A" aktif; Faz B+ ve "Kapanan aşama"
// gibi diğer alt başlıklar pasif (mevcut çok-faz davranışı korunur).
function parseGates(kutu, warnings) {
  const gates = [];
  if (!kutu) return gates;
  let inKapilar = false; // "## Kapılar" bölümünün içinde miyiz
  let aktif = false;     // aktif kapı satırları toplanır mı
  for (const line of kutu.split(/\r?\n/)) {
    if (/^##\s+Kapılar/.test(line)) { inKapilar = true; aktif = true; continue; }
    if (/^##\s/.test(line)) { inKapilar = false; aktif = false; continue; } // başka H2 → Kapılar bitti
    if (inKapilar && /^###\s+Faz\s+A\b/.test(line)) { aktif = true; continue; }
    if (inKapilar && /^###\s+Faz\s+/.test(line)) { aktif = false; continue; } // Faz B, C… pasif
    if (inKapilar && /^###\s/.test(line)) { aktif = false; continue; }        // "Kapanan aşama" vb. pasif
    if (!inKapilar || !aktif) continue;
    if (!/^\|\s*G-\d+\b/.test(line)) continue;
    // splitRow (markdown.mjs ile ORTAK): `a|b` gibi satır-içi kod hücreyi bölmez (soğuk-denetim B4).
    const cells = splitRow(line);
    // [ 'G-07', 'iş...', 'analiz', 'açık — sevkte', 'kanıt' ]
    const id = cells[0];
    const is = cells[1] || '';
    const sahip = (cells[2] || '').split(/[\s/]/)[0]; // ilk rol
    const durum = (cells[3] || '').split(DASH)[0].trim();
    const kanitHam = (cells[4] || '').trim();
    const kanit = kanitHam && kanitHam !== DASH ? kanitHam : null; // 5. sütun (Kanıt); boş/'—'/4-sütun → null (bekçiyle aynı dil: '—' = işaretçisiz)
    gates.push({ id, is, sahip, durum, kanit });
  }
  return gates;
}

// --- ERTELENENLER.md (4 sütun tablo) ---
function parseErtelenenler(text, warnings) {
  const rows = [];
  if (!text) return rows;
  let headerSeen = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\|/.test(line)) {
      if (/^\|\s*Kalem\b/.test(line)) { headerSeen = true; continue; }
      if (/^[|\s:—-]+$/.test(line)) continue; // ayraç satırı
      if (!headerSeen) continue;
      const cells = splitRow(line); // markdown.mjs ile ortak bölücü (satır-içi kod korunur)
      rows.push({ kalem: cells[0] || '', sahip: cells[1] || '', kosul: cells[2] || '', kaynak: cells[3] || '' });
    } else if (headerSeen && rows.length) {
      break; // tablo bitti (kural paragrafı)
    }
  }
  return rows;
}

// --- Rol DURUM.md → özet ---
function parseDurum(slug, text) {
  const out = { slug, ad: slug, path: '03_roller/' + slug + '/DURUM.md', ozet: null, sonOturum: null, bos: false };
  if (!text) {
    out.ozet = '(DURUM.md okunamadı)';
    return out;
  }
  const h1 = text.match(/^#\s+DURUM\s+—\s+(.+)$/m);
  if (h1) out.ad = h1[1].trim();
  if (/Henüz oturum açılmadı/.test(text)) {
    out.bos = true;
    out.ozet = 'Henüz oturum açılmadı';
    return out;
  }
  const son = text.match(/\*\*Son oturum[^*]*\*\*:?\s*(.+)/);
  if (son) {
    out.ozet = son[1].trim();
    const d = text.match(/Son oturum[^)]*\(?(\d{4}-\d{2}-\d{2})/);
    if (d) out.sonOturum = d[1];
  } else {
    // ilk dolu gövde satırı (başlık + yorum sonrası)
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !/^<!--/.test(l) && !/^#/.test(l));
    if (lines.length) out.ozet = lines[0].trim();
  }
  return out;
}

// --- Tazelik: sahibin tek ezberi (bekçi tazeliği) + koşu-sonrası dosya değişimi (drift radarı) ---
async function computeFreshness(root, saglik, warnings) {
  const out = { lastRun: saglik.lastRun, stale: false, staleReason: null, driftAfterRun: false, driftFiles: [] };
  if (!saglik.lastRun) {
    out.stale = true;
    out.staleReason = 'SAGLIK tazelik damgası yok';
    return out;
  }
  const stampTime = new Date(saglik.lastRun.replace(' ', 'T') + ':00');
  const now = new Date();
  const ageMs = now.getTime() - stampTime.getTime();
  if (Number.isNaN(stampTime.getTime())) {
    out.stale = true;
    out.staleReason = 'damga çözümlenemedi';
    return out;
  }
  // Gelecekteki damga tazelik VE drift radarını birden maskeler (soğuk-denetim B2):
  // saat/dilim hatası ya da bozuk bekçi çıktısı — güvenilmez say, bayat işaretle.
  if (ageMs < -60 * 1000) {
    out.stale = true;
    out.staleReason = 'sağlık damgası GELECEKTE görünüyor (saat/dilim hatası?) — tazelik güvenilmez';
    return out;
  }
  if (ageMs > 24 * 3600 * 1000) {
    out.stale = true;
    const gun = Math.floor(ageMs / (24 * 3600 * 1000));
    out.staleReason = 'son sağlık koşusu ' + gun + ' gün önce — bekçi güncel değil';
  }
  // Koşudan sonra değişen dosyalar (bekçi çıktıları hariç) → ışıklar geride olabilir
  const skip = new Set(['00_pano/SAGLIK.md', '00_pano/PANO.md']);
  async function scan(rel) {
    const abs = path.join(root, rel);
    let entries;
    try { entries = await fs.readdir(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      if (e.isSymbolicLink()) continue;
      const childRel = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { await scan(childRel); continue; }
      if (!e.isFile() || !e.name.endsWith('.md')) continue;
      if (skip.has(childRel)) continue;
      const st = await statIf(path.join(root, childRel));
      if (st && st.mtime.getTime() > stampTime.getTime() + 60000) {
        out.driftFiles.push(childRel);
      }
    }
  }
  await scan('');
  if (out.driftFiles.length) {
    out.driftAfterRun = true;
    out.driftFiles.sort();
  }
  return out;
}

const WORST = { KIRMIZI: 3, SARI: 2, YEŞİL: 1 };
function worseLight(x, y) {
  return (WORST[x] || 0) >= (WORST[y] || 0) ? x : y;
}
export function worstLight(lights) {
  if (!lights || !lights.length) return null;
  let worst = 'YEŞİL'; // taban iyimserlik; VERİ-YOK nötr (WORST=0), kötüleştirmez
  for (const { deger } of lights) {
    if ((WORST[deger] || 0) > (WORST[worst] || 0)) worst = deger;
  }
  return worst;
}
// İki ışık dizisini ada göre birleştir; ortak adta kötümser değer (fail-safe —
// izleme aracı kırmızıyı asla maskelemez). Çelişki uyarısı yalnız iki taraf da
// ÖLÇÜLMÜŞ (VERİ-YOK değil) ve farklıysa.
export function mergeLights(a, b, warnings) {
  if (!a && !b) { if (warnings) warnings.push('ışıklar hiçbir kaynaktan okunamadı'); return null; }
  if (!a) { if (warnings) warnings.push('PANO ışıkları okunamadı; SAGLIK ışıkları kullanıldı'); return b; }
  if (!b) return a;
  const bMap = new Map(b.map((x) => [x.ad, x.deger]));
  const seen = new Set();
  const out = [];
  let celiski = false;
  for (const { ad, deger } of a) {
    seen.add(ad);
    if (!bMap.has(ad)) { out.push({ ad, deger }); continue; }
    const bVal = bMap.get(ad);
    const wa = WORST[deger] || 0, wb = WORST[bVal] || 0;
    if (wa > 0 && wb > 0 && wa !== wb) celiski = true;
    out.push({ ad, deger: worseLight(deger, bVal) });
  }
  for (const { ad, deger } of b) {
    if (!seen.has(ad)) out.push({ ad, deger });
  }
  if (celiski && warnings) warnings.push('PANO ve SAGLIK ışıkları çelişiyor — kötümser değer gösterildi');
  return out;
}

export async function buildState(root, config = {}) {
  const warnings = [];
  const [pano, saglikTxt, ertTxt, kutuInfo] = await Promise.all([
    readIf(path.join(root, '00_pano/PANO.md')),
    readIf(path.join(root, '00_pano/SAGLIK.md')),
    readIf(path.join(root, '00_pano/ERTELENENLER.md')),
    findActiveBox(root, warnings),
  ]);

  const mek = parseMekanik(pano, warnings);
  const sag = parseSaglik(saglikTxt, warnings);
  const fresh = await computeFreshness(root, sag, warnings);

  // Işıklar: PANO + SAGLIK birleşimi; çelişki varsa kötümser (fail-safe)
  const lights = mergeLights(mek.lights, sag.lights, warnings);

  // Görev kapıları: KUTU'dan iş+sahip, PANO mekanikten kanonik durum
  const gates = kutuInfo ? parseGates(kutuInfo.text, warnings) : [];
  for (const g of gates) {
    if (mek.tasks[g.id]) g.durumKanon = mek.tasks[g.id];
    else g.durumKanon = g.durum;
  }

  // Roller
  const roller = await readRoles(root, warnings);

  // Kutular (aktif + arşiv)
  const kutular = await listBoxes(root);

  const stale = fresh.stale;
  const worst = worstLight(lights);
  // Hiç ÖLÇÜLMÜŞ değer yokken (hepsi VERİ-YOK/serbest) taban-iyimserlik YEŞİL göstermesin —
  // dürüst gri (soğuk-denetim B1). Tek ölçülmüş değer varsa davranış eskisiyle aynı.
  const olculmus = !!(lights && lights.some((l) => (WORST[l.deger] || 0) > 0));
  const sistemGenel = stale ? 'KIRMIZI' : (olculmus ? worst : 'VERI-YOK');

  // SIRADAKİ bayatlığı (#6): sevk edilen rol koordinatörden yeni hareket ettiyse bayat.
  const koordinatorRol = config.koordinatorRol || 'koordinator';
  const siradakiRolAd = siradakiRol(yargiField(pano, 'SIRADAKİ OTURUM'));
  const siradakiDurum = computeSiradakiStale(roller, siradakiRolAd, koordinatorRol);

  return {
    generatedAt: new Date().toISOString(),
    vaultRoot: root,
    saglik: {
      lastRun: sag.lastRun || mek.lastRun,
      runNo: sag.runNo != null ? sag.runNo : mek.runNo,
      lights,
      red: mek.red,
      yellow: mek.yellow,
      items: sag.items,
      stale: fresh.stale,
      staleReason: fresh.staleReason,
      driftAfterRun: fresh.driftAfterRun,
      driftFiles: fresh.driftFiles.slice(0, 12),
      driftCount: fresh.driftFiles.length,
      sistemGenel,
    },
    yargi: {
      aktifKutu: yargiField(pano, 'Aktif kutu'),
      siradakiOturum: yargiField(pano, 'SIRADAKİ OTURUM'),
      siradakiRol: siradakiRolAd,
      siradakiStale: siradakiDurum.stale,
      sonHareketRol: siradakiDurum.sonHareketRol,
      paralel: yargiField(pano, 'Paralel açılabilir'),
      blokaj: yargiField(pano, 'Blokaj'),
    },
    kutu: kutuInfo
      ? { id: kutuInfo.id, title: kutuInfo.title, path: kutuInfo.path, fazA: kutuInfo.fazA, gates }
      : null,
    roller,
    ertelenenler: parseErtelenenler(ertTxt, warnings),
    kutular,
    config: {
      baslik: config.baslik || null,
      altBaslik: config.altBaslik || null,
      sahip: config.sahip || null,
      koordinatorRol,
      rolToreni: config.rolToreni === true, // true = /rol-<slug> töreni metni (KEEL); yok/false = klasörde-aç metni (eski kurgular — geri-uyum)
      isikIpuclari: config.isikIpuclari || null,
      renkler: config.renkler || null,
    },
    warnings,
  };
}

function siradakiRol(s) {
  if (!s) return null;
  // Rakam da slug'ın parçasıdır (GENESIS slug kuralı ^[a-z0-9]+$; ör. "po2" — soğuk-denetim A3).
  const m = s.match(/^([A-Za-z0-9ÇĞİÖŞÜçğıöşü]+)/);
  return m ? m[1] : null;
}

// SIRADAKİ rolü koordinatörden DAHA YENİ hareket ettiyse sevk tüketilmiş = bayat.
// Sinyal: DURUM.md dosya mtime (gün-granülü metin damgasından ince). koordinatorRol config'ten.
function computeSiradakiStale(roller, siradakiRolAd, koordinatorRol) {
  if (!siradakiRolAd || siradakiRolAd === koordinatorRol) return { stale: false, sonHareketRol: null };
  const sr = roller.find((r) => r.slug === siradakiRolAd);
  const ko = roller.find((r) => r.slug === koordinatorRol);
  if (!sr || !ko || sr.mtimeMs == null || ko.mtimeMs == null) return { stale: false, sonHareketRol: null };
  if (sr.mtimeMs > ko.mtimeMs) return { stale: true, sonHareketRol: siradakiRolAd };
  return { stale: false, sonHareketRol: null };
}

async function findActiveBox(root, warnings) {
  const kutularDir = path.join(root, '01_kutular');
  let entries;
  try {
    entries = await fs.readdir(kutularDir, { withFileTypes: true });
  } catch {
    warnings.push('01_kutular okunamadı');
    return null;
  }
  // Tek-aktif-kutu varsayımı: birden fazla açık kutu görürsek deterministik (ada göre sıralı)
  // İLKİNİ gösterir ve uyarı basarız — sessiz dosya-sistemi-sırası seçimi yok (soğuk-denetim B5).
  const adaylar = entries
    .filter((e) => e.isDirectory() && /^KT-\d+/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (adaylar.length > 1) {
    warnings.push(
      'birden fazla açık kutu var (' + adaylar.map((e) => e.name.match(/^(KT-\d+)/)[1]).join(', ') +
      ') — tek-aktif-kutu varsayımı bozuk; ayrıntı paneli ada göre ilkini gösteriyor'
    );
  }
  const active = adaylar[0];
  if (!active) return null;
  const rel = '01_kutular/' + active.name + '/KUTU.md';
  const text = await readIf(path.join(root, rel));
  const idMatch = active.name.match(/^(KT-\d+)/);
  let title = active.name;
  let fazA = null;
  if (text) {
    const h1 = text.match(/^#\s+(.+)$/m);
    if (h1) title = h1[1].trim();
    const fh = text.match(/^###\s+Faz A[^\n]*/m);
    if (fh) {
      const paren = fh[0].match(/\(([^)]*)\)/);
      fazA = { sevkte: /SEVKTE/i.test(fh[0]), not: paren ? paren[1].trim() : null };
    }
  }
  return { id: idMatch ? idMatch[1] : active.name, name: active.name, title, path: rel, fazA, text };
}

async function listBoxes(root) {
  const boxes = [];
  const kutularDir = path.join(root, '01_kutular');
  try {
    const entries = await fs.readdir(kutularDir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory() && /^KT-\d+/.test(e.name)) {
        boxes.push({ id: e.name.match(/^(KT-\d+)/)[1], name: e.name, aktif: true, path: '01_kutular/' + e.name + '/KUTU.md' });
      }
    }
    const arsivDir = path.join(kutularDir, '_arsiv');
    const arsiv = await fs.readdir(arsivDir, { withFileTypes: true }).catch(() => []);
    for (const e of arsiv) {
      if (e.isDirectory() && /^KT-\d+/.test(e.name)) {
        boxes.push({ id: e.name.match(/^(KT-\d+)/)[1], name: e.name, aktif: false, path: '01_kutular/_arsiv/' + e.name + '/KUTU.md' });
      }
    }
  } catch {}
  boxes.sort((a, b) => a.id.localeCompare(b.id));
  return boxes;
}

async function readRoles(root, warnings) {
  const rollerDir = path.join(root, '03_roller');
  let entries;
  try {
    entries = await fs.readdir(rollerDir, { withFileTypes: true });
  } catch {
    warnings.push('03_roller okunamadı');
    return [];
  }
  const roles = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue;
    const durumAbs = path.join(rollerDir, e.name, 'DURUM.md');
    const text = await readIf(durumAbs);
    const st = await statIf(durumAbs);
    const role = parseDurum(e.name, text);
    role.mtimeMs = st ? st.mtime.getTime() : null;
    roles.push(role);
  }
  roles.sort((a, b) => a.slug.localeCompare(b.slug, 'tr'));
  return roles;
}
