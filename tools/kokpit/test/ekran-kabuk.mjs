// ekran-kabuk — app.js'i sanal kabukta (node:vm) gerçek haliyle koşturan sahte DOM.
//
// NEDEN TEK EV: kabuk iki test dosyasının ortak aletidir (sahip-ekrani · okuma-butunlugu).
// İkinci kopyayı yazmak, bu deponun en pahalı dersini tekrarlamak olurdu — `tools/sevk/ortak.sh`
// başlığında yazılı: aynı blok beş betiğe kopyalanmıştı ve sürüklendi (D-02 dersi).
// Kabuk app.js'in DOKUNDUĞU her şeyi sağlar, fazlasını değil; eklemek gerekirse burada eklenir.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function sandbox() {
  const ekran = {};
  const el = (id) => (ekran[id] ||= { id, innerHTML: '', textContent: '', className: '', hidden: false });
  const ctx = {
    document: {
      getElementById: el,
      querySelector: () => el('wm-sub'),
      querySelectorAll: () => [],
      addEventListener: () => {},
      set title(v) { el('__title').textContent = v; },
      get title() { return el('__title').textContent; },
    },
    // fetch: app.js yüklenirken kendiliğinden çağrılır. Hiç çözülmeyen bir söz veriyoruz ki
    // testin çizdiği ekranı ağdan gelen bir cevap EZMESİN (belirlenimsizlik yok).
    fetch: () => new Promise(() => {}),
    requestAnimationFrame: () => {},
    setInterval: () => 0,
    console,
    Promise, Date, String, Number, Object, Array, JSON, RegExp, Math,
  };
  createContext(ctx);
  runInContext(readFileSync(path.join(KOK, 'public', 'app.js'), 'utf8'), ctx, { filename: 'app.js' });
  return { ctx, ekran };
}
