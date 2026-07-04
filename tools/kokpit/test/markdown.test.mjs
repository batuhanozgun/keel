import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../lib/markdown.mjs';

test('başlıklar', () => {
  assert.match(renderMarkdown('# Başlık'), /<h1>Başlık<\/h1>/);
  assert.match(renderMarkdown('### Alt'), /<h3>Alt<\/h3>/);
});

test('kalın ve satır-içi kod', () => {
  assert.match(renderMarkdown('**kalın** ve `kod`'), /<strong>kalın<\/strong> ve <code>kod<\/code>/);
});

test('HTML kaçışı (XSS koruması)', () => {
  const out = renderMarkdown('metin <script>alert(1)</script> son');
  assert.ok(!out.includes('<script>'), 'script etiketi çıkmamalı');
  assert.ok(out.includes('&lt;script&gt;'));
});

test('kod bloğu içi kaçışlı, işlenmez', () => {
  const out = renderMarkdown('```\n<b>x</b> **y**\n```');
  assert.match(out, /<pre><code>&lt;b&gt;x&lt;\/b&gt; \*\*y\*\*<\/code><\/pre>/);
});

test('HTML yorumu temizlenir', () => {
  const out = renderMarkdown('<!-- yazar: analist -->\n# X');
  assert.ok(!out.includes('yazar'), 'yorum içeriği görünmemeli');
  assert.match(out, /<h1>X<\/h1>/);
});

test('pipe tablosu', () => {
  const src = '| A | B |\n|---|---|\n| 1 | 2 |';
  const out = renderMarkdown(src);
  assert.match(out, /<table>/);
  assert.match(out, /<th>A<\/th>/);
  assert.match(out, /<td>1<\/td>/);
});

test('dış bağlantı yeni sekme, iç bağlantı data-open', () => {
  const ext = renderMarkdown('[git](https://example.com)');
  assert.match(ext, /target="_blank"/);
  const int = renderMarkdown('[kutu](KUTU.md)', '01_kutular/KT-001/x.md');
  assert.match(int, /data-open="01_kutular\/KT-001\/KUTU.md"/);
});

test('sırasız ve sıralı liste', () => {
  assert.match(renderMarkdown('- a\n- b'), /<ul><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(renderMarkdown('1. a\n2. b'), /<ol><li>a<\/li><li>b<\/li><\/ol>/);
});

test('boş/null güvenli', () => {
  assert.equal(renderMarkdown(null), '');
  assert.equal(renderMarkdown(''), '');
});

test('yatay çizgi', () => {
  assert.match(renderMarkdown('---'), /<hr>/);
});

test('tablo hücresinde `a|b` kodu hücreyi bölmez', () => {
  const src = '| formül | not |\n|---|---|\n| `|x| × 2` | tamam |';
  const out = renderMarkdown(src);
  assert.match(out, /<code>\|x\| × 2<\/code>/, 'kod içi pipe korunmalı');
  // iki veri hücresi olmalı (formül + not), üç değil
  const cells = (out.match(/<td[ >]/g) || []).length;
  assert.equal(cells, 2, 'satır iki hücreye bölünmeli');
});

test('tablo hücresinde " 5 " boşluklu sayı bozulmaz', () => {
  const src = '| a | b |\n|---|---|\n| bekle 5 dk | x |';
  const out = renderMarkdown(src);
  assert.match(out, /bekle 5 dk/, 'boşluklu sayı olduğu gibi kalmalı');
  assert.ok(!out.includes('undefined'), 'yer tutucu çakışması olmamalı');
});
