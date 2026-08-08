// Kokpit — yerel, SALT-OKUNUR izleme sunucusu.
//
// GÜVENLİK SÖZLEŞMESİ (bozulmamalı):
//  1. Yalnız GET/HEAD kabul edilir; başka metot → 405. Yazma ucu YOKTUR.
//  2. Bu dosyada ve lib/ altında hiçbir fs.write* / fs.append* / fs.rm* çağrısı yoktur — yalnız okuma.
//  3. Dosya yolları vault köküne kilitlenir: resolve + realpath, kök-öneki dışı → 403 (symlink kaçışı dahil).
//  4. Sunucu yalnız 127.0.0.1'e bağlanır (ağa açılmaz).
//
// Ayar: KOKPIT_VAULT (vault kökü), KOKPIT_PORT (varsayılan 4173).

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildState } from './lib/status.mjs';
import { buildTree } from './lib/tree.mjs';
import { renderMarkdown } from './lib/markdown.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config: kokpit.config.json (GENESIS her projede yazar). Yoksa güvenli varsayılan.
const DEFAULTS = { baslik: 'Pano', altBaslik: 'panosu', sahip: '', koordinatorRol: 'koordinator', vaultYolu: '../..', port: 4173, isikIpuclari: null, renkler: null };
let CONFIG = {};
try { CONFIG = JSON.parse(await fs.readFile(path.join(__dirname, 'kokpit.config.json'), 'utf8')); } catch {}
const cfg = { ...DEFAULTS, ...CONFIG };

const PUBLIC = path.join(__dirname, 'public');
const HOST = '127.0.0.1';
const MAX_RENDER_BYTES = 2 * 1024 * 1024; // 2MB üstü ham gösterilir
// Env override > config.
const VAULT = path.resolve(__dirname, process.env.KOKPIT_VAULT || cfg.vaultYolu);
const PORT = Number(process.env.KOKPIT_PORT || cfg.port || 4173);

let VAULT_REAL = VAULT;
try {
  VAULT_REAL = await fs.realpath(VAULT);
} catch {
  console.error('UYARI: vault kökü bulunamadı: ' + VAULT);
}

const TEXT_EXT = new Set(['.md', '.txt', '.sh', '.json', '.gitignore', '']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// Kök içinde güvenli çöz; kaçış varsa null. realpath ile symlink kaçışını da engeller.
async function safeVaultPath(rel) {
  if (typeof rel !== 'string' || rel.length === 0) return null;
  if (rel.includes('\0')) return null;
  const abs = path.resolve(VAULT_REAL, rel);
  if (abs !== VAULT_REAL && !abs.startsWith(VAULT_REAL + path.sep)) return null;
  let real;
  try {
    real = await fs.realpath(abs);
  } catch {
    return null;
  }
  if (real !== VAULT_REAL && !real.startsWith(VAULT_REAL + path.sep)) return null;
  return real;
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function sendText(res, code, text, type) {
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

async function serveStatic(res, urlPath) {
  const name = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  const abs = path.resolve(PUBLIC, name);
  if (abs !== PUBLIC && !abs.startsWith(PUBLIC + path.sep)) return sendText(res, 403, 'yasak');
  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    sendText(res, 404, 'bulunamadı');
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'yalnız okuma (GET)');
  }
  const url = new URL(req.url, 'http://' + HOST);
  const p = url.pathname;

  try {
    if (p === '/api/state') {
      return sendJson(res, 200, await buildState(VAULT_REAL, cfg));
    }
    if (p === '/api/tree') {
      return sendJson(res, 200, await buildTree(VAULT_REAL));
    }
    if (p === '/api/file' || p === '/api/render') {
      const rel = url.searchParams.get('path') || '';
      const abs = await safeVaultPath(rel);
      if (!abs) return sendJson(res, 403, { error: 'yol vault dışında ya da yok' });
      const st = await fs.stat(abs);
      if (!st.isFile()) return sendJson(res, 400, { error: 'dosya değil' });
      const ext = path.extname(abs).toLowerCase();
      if (!TEXT_EXT.has(ext)) return sendJson(res, 415, { error: 'metin dosyası değil: ' + ext });
      const raw = await fs.readFile(abs, 'utf8');
      if (p === '/api/file') {
        return sendJson(res, 200, { path: rel, bytes: st.size, raw });
      }
      const html = st.size > MAX_RENDER_BYTES ? null : renderMarkdown(raw, rel);
      return sendJson(res, 200, { path: rel, bytes: st.size, html, raw: html ? null : raw });
    }
    if (p === '/api/health') {
      return sendJson(res, 200, { ok: true, vault: VAULT_REAL, port: PORT });
    }
    // statik
    if (p === '/' || /^\/[\w.-]+$/.test(p)) {
      return serveStatic(res, p);
    }
    sendText(res, 404, 'bulunamadı');
  } catch (err) {
    sendJson(res, 500, { error: String(err && err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ' + cfg.baslik + ' ' + cfg.altBaslik + ' çalışıyor (salt-okunur)');
  console.log('  Tarayıcıda aç:  http://' + HOST + ':' + PORT);
  console.log('  Vault:          ' + VAULT_REAL);
  console.log('  Durdurmak için: Ctrl+C');
  console.log('');
});
