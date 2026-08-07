'use strict';

// Kokpit — istemci. Salt-okuma; sunucudan state/tree/render çeker.
// Kokpit: sabit ekran, sayfa kaymaz; gerekirse yalnız panel içi kayar.

var state = null;
var treeData = null;
var view = 'pano';
var openPath = null;
var POLL_MS = 15000;

function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function jsInline(s) {
  var t = esc(s);
  t = t.replace(/`([^`]+)`/g, function (_, c) { return '<code>' + c + '</code>'; });
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  return t;
}
function humanBytes(n) {
  if (n == null) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
}
function lightClass(v) {
  if (v === 'YEŞİL') return 'green';
  if (v === 'SARI') return 'amber';
  if (v === 'KIRMIZI') return 'red';
  return 'gray';
}
function pillClass(d) {
  if (!d) return '';
  if (d.indexOf('açık') === 0) return 'acik';
  if (d.indexOf('yapıldı') === 0) return 'yapildi';
  if (d.indexOf('değerlendirme') === 0) return 'degerlendirme';
  return '';
}

function fetchState() {
  return fetch('/api/state').then(function (r) { return r.json(); }).then(function (s) {
    state = s; renderTopbar(); if (view === 'pano') renderPano();
  }).catch(function () { $('sys-light').textContent = 'sunucu yok'; });
}
function fetchTree() {
  return fetch('/api/tree').then(function (r) { return r.json(); }).then(function (t) { treeData = t; renderTree(); });
}

// ---- marka (config'ten) ----
function renderBrand() {
  var c = (state && state.config) || {};
  var b = c.baslik || 'pano';
  var sub = c.altBaslik || 'panosu';
  var home = $('home-btn');
  if (home) home.innerHTML = esc(b) + '<span class="dot">.</span>';
  var wm = document.querySelector('.wm-sub');
  if (wm && sub) wm.textContent = sub;
  document.title = b + ' · ' + sub;
}

// ---- topbar + ribbon ----
function renderTopbar() {
  if (!state) return;
  renderBrand();
  var s = state.saglik || {};
  var chip = $('sys-light');
  var g = s.sistemGenel || 'VERI-YOK';
  chip.className = 'sys-pill ' + lightClass(g);
  chip.textContent = s.stale ? 'sistem: kırmızı · damga eski' : ('sistem: ' + (g === 'VERI-YOK' ? 'veri yok' : g.toLocaleLowerCase('tr')));
  $('stamp').textContent = s.lastRun ? ('sağlık denetimi ' + s.lastRun + ' · #' + (s.runNo == null ? '?' : s.runNo)) : 'damga yok';
  $('updated').textContent = 'güncel ' + new Date().toLocaleTimeString('tr-TR');

  var rib = $('ribbon');
  if (s.stale) {
    rib.hidden = false; rib.className = 'ribbon red';
    rib.innerHTML = '<b>Sağlık damgası eski.</b> ' + esc(s.staleReason || 'damga bir günden eski') + ' — damga bir günden eskiyse ışıklar yeşil görünse bile sistem kırmızı sayılır.';
  } else if (s.driftAfterRun) {
    rib.hidden = false; rib.className = 'ribbon amber';
    rib.innerHTML = '<b>Işıklar biraz eskimiş olabilir.</b> Son kontrolden sonra ' + s.driftCount + ' dosya değişti; otomatik sağlık kontrolü (bekçi) henüz yeniden çalışmadı — ışıklar bir sonraki oturum kapanınca kendini günceller. Sorun değil, sadece bilgi.';
  } else {
    rib.hidden = true; rib.innerHTML = '';
  }
}

// ---- pano (kokpit) ----
function panel(title, body, opts) {
  opts = opts || {};
  return '<section class="panel' + (opts.grow ? ' grow' : '') + (opts.cls ? ' ' + opts.cls : '') + '">' +
    '<div class="phead"><span>' + esc(title) + '</span>' + (opts.aside ? '<span class="aside">' + opts.aside + '</span>' : '') + '</div>' +
    (opts.sub ? '<div class="psub">' + opts.sub + '</div>' : '') +
    '<div class="pbody">' + body + '</div></section>';
}

// Taşan panellere "devamı var" işareti — kullanıcı gizli içerik sanmasın
function markMore() {
  requestAnimationFrame(function () {
    var ps = document.querySelectorAll('#pano-view .panel');
    for (var i = 0; i < ps.length; i++) {
      var b = ps[i].querySelector('.pbody');
      if (b && b.scrollHeight > b.clientHeight + 14) ps[i].classList.add('has-more');
      else ps[i].classList.remove('has-more');
    }
  });
}

function stone(name, val, hint) {
  var c = lightClass(val);
  return '<div class="stone"><div class="skey">' + name + '</div>' +
    '<div class="sval ' + c + '"><span class="orb ' + c + '"></span>' + esc(val || 'veri yok') + '</div>' +
    '<div class="shint">' + hint + '</div></div>';
}

function renderPano() {
  if (!state) return;
  var s = state.saglik || {}, y = state.yargi || {};
  var lights = s.lights || [];
  var ip = (state.config && state.config.isikIpuclari) || {};

  // Sağlık paneli — her ışık için bir taş (ad'lar vault'a göre değişir; toLowerCase yok)
  var lb = '<div class="stones">';
  lights.forEach(function (lt) {
    lb += stone(esc(lt.ad), lt.deger, esc(ip[lt.ad] || ''));
  });
  lb += '</div>';
  if (s.red != null) lb += '<div class="counts">kırmızı kalem <b>' + s.red + '</b> · sarı kalem <b>' + s.yellow + '</b></div>';
  if (s.driftAfterRun && s.items && s.items.length) lb += '<div class="drift-note">bu kalemler son denetimden (' + esc(s.lastRun || '') + '); o zamandan beri dosyalar değişti, bir kısmı çözülmüş olabilir.</div>';
  if (s.items && s.items.length) {
    s.items.forEach(function (it) {
      var c = it.level === 'KIRMIZI' ? 'red' : (it.level === 'SARI' ? 'amber' : 'gray');
      var lab = it.level === 'BILGI' ? 'bilgi' : it.level.toLocaleLowerCase('tr');
      lb += '<div class="item"><span class="tag ' + c + '">' + lab + '</span><span class="itext">' + jsInline(it.text) + '</span></div>';
    });
  }

  // Kutu + görevler
  var k = state.kutu, gb = '';
  if (k) {
    if (y.blokaj && y.blokaj.trim() !== 'yok') gb += '<div class="blokaj"><b>Blokaj:</b> ' + jsInline(y.blokaj) + '</div>';
    (k.gates || []).forEach(function (g) {
      var d = g.durumKanon || g.durum || '';
      gb += '<div class="gate"><span class="gid">' + esc(g.id) + '</span>' +
        '<span class="gis">' + esc(g.is) +
        (g.kanit ? '<span class="gkanit">kanıt: ' + esc(g.kanit) + '</span>' : '') +
        '</span>' +
        '<span class="gsahip">' + esc(g.sahip) + '</span>' +
        '<span class="pill ' + pillClass(d) + '">' + esc(d) + '</span></div>';
    });
  } else gb = '<div class="muted">aktif kutu yok</div>';
  var sevkte = (k && k.fazA && k.fazA.sevkte) ? 'faz A · sevkte' : '';

  // Şimdi sıra (mercan odak) — #6: SIRADAKİ rolü zaten hareket ettiyse "koordinatör sevki bekleniyor"
  // Rol açılış TARİFİ config'e bağlı (soğuk-denetim A2): rolToreni=true → /rol-<slug> töreni
  // (KEEL; tören rol kafesini kurar — klasörde-aç tarifi orada YANLIŞ olurdu); yok/false →
  // klasörde-aç metni (eski kurgular, ör. Loopinance — geri-uyum).
  var koordRol = (state.config && state.config.koordinatorRol) || 'koordinator';
  var acTarifi = function (slug) {
    if (state.config && state.config.rolToreni) {
      return 'proje kökünde oturum aç, <code>/rol-' + esc(slug) + '</code> yaz; tören <b>"ROL AÇIK"</b> deyince <code>devam</code> yaz';
    }
    return '<code>03_roller/' + esc(slug) + '/</code> klasöründe oturum aç, <code>devam</code> yaz';
  };
  var nb;
  if (y.siradakiStale && y.sonHareketRol) {
    nb = '<div class="now-in stale"><div class="now-eyebrow">sıradaki adım · koordinatörde</div>' +
      '<div class="now-role"><span class="now-verb">son hareket:</span> ' + esc(y.sonHareketRol) + '<span class="dot">.</span></div>' +
      '<div class="now-desc">Bu rol işini bitirdi; sıra koordinatöre döndü. Panodaki "sıradaki" satırı koordinatör bir sonraki sevki yazana kadar eski görünebilir.</div>' +
      '<div class="now-how">→ ' + acTarifi(koordRol) + ' (bir sonrakini koordinatör sevk eder).</div>' +
      '</div>';
  } else if (y.siradakiOturum) {
    var rol = y.siradakiRol || '';
    nb = '<div class="now-in"><div class="now-eyebrow">sıradaki adım · sıra sende</div>' +
      '<div class="now-role"><span class="now-verb">aç:</span> ' + esc(rol) + '<span class="dot">.</span></div>' +
      '<div class="now-desc">' + jsInline(y.siradakiOturum) + '</div>' +
      (rol ? '<div class="now-how">→ ' + acTarifi(rol) + '.</div>' : '') +
      '<div class="now-clar">Bu senin sıran: <b>' + esc(rol) + '</b> rolünün oturumunu <b>sen</b> açacaksın; ' + esc(rol) + ' kendi başına başlamaz.</div>' +
      '</div>';
  } else {
    nb = '<div class="now-in"><div class="now-eyebrow">şu an</div><div class="now-desc">sıradaki oturum belirtilmemiş.</div></div>';
  }

  // Roller
  var rb = '<div class="roles">';
  (state.roller || []).forEach(function (r) {
    rb += '<div class="role' + (r.bos ? ' bos' : '') + '" data-open="' + esc(r.path) + '">' +
      '<div class="rname"><span class="rdot"></span>' + esc(r.ad) + '</div>' +
      '<div class="rsum">' + esc(r.ozet || '') + '</div>' +
      (r.sonOturum ? '<div class="rdate">son: ' + esc(r.sonOturum) + '</div>' : '') + '</div>';
  });
  rb += '</div>';

  // Ana plan (kutular + ertelenenler)
  var mb = '<div class="mini-row">';
  (state.kutular || []).forEach(function (b) {
    mb += '<span class="chip' + (b.aktif ? ' aktif' : '') + '" data-open="' + esc(b.path) + '"><span class="cid">' + esc(b.id) + '</span><span class="cst">' + (b.aktif ? 'açık' : 'arşiv') + '</span></span>';
  });
  mb += '</div><div class="defer">';
  (state.ertelenenler || []).forEach(function (e) {
    mb += '<div class="dline" data-open="00_pano/ERTELENENLER.md" title="' + esc(e.kalem) + '">' + jsInline(e.kalem) + ' <span class="downer">· ' + esc(e.sahip) + '</span></div>';
  });
  mb += '</div>';
  if (state.warnings && state.warnings.length) mb += '<div class="warns">okuma notu: ' + state.warnings.map(esc).join(' · ') + '</div>';

  var left = panel('sağlık', lb, { sub: 'sistemin genel durumu — üç ışığı bekçi ölçer · yeşil iyi, sarı dikkat, kırmızı sorun' }) +
    panel('kutu · görevler', gb, { grow: true, aside: sevkte, sub: 'açık kutudaki görevler — hangi iş kimde ve ne durumda' });
  var right = '<section class="panel now">' + nb + '</section>' +
    panel('roller', rb, { grow: true, aside: 'kendi ağzından', sub: 'ekibin (' + (state.roller || []).length + ' yapay zeka rolü) — her biri en son ne yaptı' }) +
    panel('ana plan', mb, { cls: 'mini', aside: k ? esc(k.id) : '', sub: 'işler (kutular) ve ertelenen işler' });

  $('pano-view').innerHTML = '<div class="col left">' + left + '</div><div class="col right">' + right + '</div>';
  markMore();
}

// ---- ağaç ----
function renderTree() {
  if (!treeData) return;
  $('tree').innerHTML = '<ul>' + treeData.children.map(treeNode).join('') + '</ul>';
}
function treeNode(n) {
  if (n.type === 'dir') {
    var kids = (n.children || []).map(treeNode).join('');
    var col = shouldCollapse(n.path) ? ' collapsed' : '';
    return '<li class="dirnode' + col + '"><div class="node dir" data-dir="' + esc(n.path) + '"><span class="caret">▾</span>' + esc(n.name) + '</div><ul>' + kids + '</ul></li>';
  }
  return '<li><div class="node file' + (openPath === n.path ? ' active' : '') + '" data-open="' + esc(n.path) + '"><span class="caret"></span>' + esc(n.name) + '<span class="nbytes">' + humanBytes(n.bytes) + '</span></div></li>';
}
function shouldCollapse(p) { return p === '02_kanon' || p.indexOf('02_kanon/') === 0 || p === '01_kutular/_arsiv'; }

// ---- dosya görüntüleyici ----
function openFile(path) {
  openPath = path; view = 'file';
  $('pano-view').hidden = true; $('file-view').hidden = false;
  $('file-view').innerHTML = '<div class="muted">yükleniyor…</div>';
  markActive();
  fetch('/api/render?path=' + encodeURIComponent(path)).then(function (r) { return r.json(); }).then(function (d) {
    if (d.error) { $('file-view').innerHTML = '<div class="ribbon red" style="border-radius:12px">' + esc(d.error) + '</div>'; return; }
    var head = '<div class="file-head"><button class="back-btn" id="back">← pano</button><span class="fpath">' + esc(d.path) + ' · ' + humanBytes(d.bytes) + '</span></div>';
    var body = d.html != null ? '<div class="doc">' + d.html + '</div>'
      : '<div class="doc"><div class="raw-note">dosya büyük, ham metin gösteriliyor</div><div class="doc-raw">' + esc(d.raw) + '</div></div>';
    $('file-view').innerHTML = head + body;
  }).catch(function () { $('file-view').innerHTML = '<div class="ribbon red" style="border-radius:12px">dosya okunamadı</div>'; });
}
function showPano() {
  view = 'pano'; openPath = null;
  $('file-view').hidden = true; $('pano-view').hidden = false;
  markActive(); renderPano();
}
function markActive() {
  var nodes = document.querySelectorAll('.node.file');
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].getAttribute('data-open') === openPath) nodes[i].classList.add('active');
    else nodes[i].classList.remove('active');
  }
}

// #8b — Nasıl kullanılır paneli: NASIL_KULLANILIR.md'yi markdown çiziciyle göster (tembel yükleme)
var howtoLoaded = false;
function toggleHowto() {
  var pane = $('howto-panel');
  if (!pane) return;
  if (pane.hidden) {
    pane.hidden = false;
    if (!howtoLoaded) {
      howtoLoaded = true;
      pane.innerHTML = '<div class="muted">yükleniyor…</div>';
      fetch('/api/render?path=' + encodeURIComponent('NASIL_KULLANILIR.md'))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var head = '<div class="howto-head"><b>Nasıl kullanılır</b><button class="back-btn" id="howto-close">kapat</button></div>';
          if (d.error || (d.html == null && d.raw == null)) {
            pane.innerHTML = head + '<div class="howto-body muted">Kurulum tamamlanınca burada kılavuz görünecek (NASIL_KULLANILIR.md henüz yok).</div>';
            return;
          }
          var body = d.html != null ? d.html : esc(d.raw);
          pane.innerHTML = head + '<div class="howto-body doc">' + body + '</div>';
        })
        .catch(function () {
          pane.innerHTML = '<div class="howto-head"><b>Nasıl kullanılır</b><button class="back-btn" id="howto-close">kapat</button></div>' +
            '<div class="howto-body muted">kılavuz okunamadı.</div>';
        });
    }
  } else {
    pane.hidden = true;
  }
}

// ---- olaylar ----
document.addEventListener('click', function (ev) {
  var t = ev.target;
  if (t.id === 'back' || t.id === 'home-btn') { showPano(); return; }
  if (t.id === 'refresh') { fetchState(); fetchTree(); return; }
  if (t.id === 'howto') { toggleHowto(); return; }
  if (t.id === 'howto-close') { var hp = $('howto-panel'); if (hp) hp.hidden = true; return; }
  var link = t.closest ? t.closest('[data-open]') : null;
  if (link) { ev.preventDefault(); openFile(link.getAttribute('data-open')); return; }
  var dir = t.closest ? t.closest('[data-dir]') : null;
  if (dir) { dir.parentElement.classList.toggle('collapsed'); return; }
});

setInterval(function () { if (!document.hidden) fetchState(); }, POLL_MS);

fetchState();
fetchTree();
