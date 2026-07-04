// Dosya/klasör ağacı — pano gezgini için. SALT-OKUNUR.
// Dışlanan: .git, node_modules, .DS_Store, tüm dot-girişler (.claude dahil), symlink'ler.
// Symlink ASLA takip edilmez (03_roller/*/.claude → ../../.claude döngü/tekrar riski).

import { promises as fs } from 'node:fs';
import path from 'node:path';

const EXCLUDE = new Set(['.git', 'node_modules', '.DS_Store']);

async function walk(root, rel, depth) {
  const abs = path.join(root, rel);
  let entries;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = [];
  const files = [];
  for (const e of entries) {
    if (EXCLUDE.has(e.name) || e.name.startsWith('.')) continue;
    if (e.isSymbolicLink()) continue; // takip etme
    const childRel = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) {
      const children = depth > 0 ? await walk(root, childRel, depth - 1) : [];
      dirs.push({ name: e.name, path: childRel, type: 'dir', children });
    } else if (e.isFile()) {
      let bytes = 0;
      try {
        bytes = (await fs.stat(path.join(root, childRel))).size;
      } catch {}
      files.push({ name: e.name, path: childRel, type: 'file', bytes });
    }
  }
  const byName = (a, b) => a.name.localeCompare(b.name, 'tr');
  dirs.sort(byName);
  files.sort(byName);
  return [...dirs, ...files];
}

export async function buildTree(root) {
  const children = await walk(root, '', 24);
  return { name: path.basename(root), path: '', type: 'dir', children };
}
