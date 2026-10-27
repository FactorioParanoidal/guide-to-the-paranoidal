/* ==========================================================================
   CORE — shared runtime of the guide. No external libraries.
   Public API (used by widgets, see AGENTS.md §Widgets):
     Guide.data            parsed data/stats.json (+ meta)
     Guide.lang            'ru' | 'en'
     Guide.t(ru, en)       pick text for current language
     Guide.nm(rec)         RU/EN name of a stats record ({ru,en})
     Guide.fmt(n, opts)    locale number format
     Guide.asset(path)     URL of a file under assets/ (path from the guide root); every asset path in JS goes through it
     Guide.icon(key)       URL of an icon by key "type__name"
     Guide.el(tag, attrs, html)  tiny DOM helper
     Guide.widget(name, fn)      register widget; fn(el, Guide) runs when el[data-widget=name] nears the viewport
     Guide.onLang(fn)      callback after a language switch
     Guide.achieve(id, ru, en, iconUrl)   unlock a reading achievement (toast + localStorage)
     Guide.tip(el, html)   attach a custom tooltip
   ========================================================================== */
(function () {
  'use strict';
  var G = window.Guide = {};
  var D = G.data = JSON.parse(document.getElementById('guide-data').textContent);
  var html = document.documentElement;
  var langCbs = [];
  var widgets = {};

  /* ---------------- helpers ---------------- */
  G.t = function (ru, en) { return G.lang === 'en' ? en : ru; };
  G.nm = function (r) { return r ? (G.lang === 'en' ? (r.en || r.ru || r.id) : (r.ru || r.en || r.id)) : ''; };
  G.fmt = function (n, o) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return Number(n).toLocaleString(G.lang === 'en' ? 'en-US' : 'ru-RU', o || { maximumFractionDigits: 2 });
  };
  /* display colour of a quality record: defect greys are too dark in the game data, use a readable rust-to-grey ramp */
  G.qColor = function (q) {
    if (!q) return '#888';
    if (q.defect) { var g = +q.id.slice(-1); return ['#9b928a', '#8a7a6c', '#7a6352', '#6d4f3e', '#62402f'][g - 1] || '#777'; }
    return q.color || '#b2b2b2';
  };
  /* The one-file release (tools/build.py --single) embeds every asset and defines window.GuideAssets(path) -> data: URL;
     the normal page loads the files next to index.html. A bare asset path string in JS would break the one-file guide:
     tools/check.py reports any asset literal that is not passed straight to G.asset(). */
  G.asset = function (p) { return window.GuideAssets ? window.GuideAssets(p) : p; };
  G.icon = function (key) { return G.asset('assets/icons/' + key + '.webp'); };
  G.el = function (tag, attrs, inner) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k === 'style') e.style.cssText = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (inner !== undefined) e.innerHTML = inner;
    return e;
  };
  G.bi = function (ru, en) { return '<span lang="ru">' + ru + '</span><span lang="en">' + en + '</span>'; };
  G.iconImg = function (rec, cls) {
    return '<img class="' + (cls || 'ic') + '" src="' + G.icon(rec.icon) + '" alt="" data-ru="' + esc(rec.ru) + '" data-en="' + esc(rec.en) + '" loading="lazy">';
  };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  G.esc = esc;
  G.onLang = function (fn) { langCbs.push(fn); };
  G.widget = function (name, fn) { widgets[name] = fn; };

  /* ---------------- language ---------------- */
  function setLang(l, user) {
    G.lang = l === 'en' ? 'en' : 'ru';
    html.setAttribute('data-lang', G.lang);
    html.setAttribute('lang', G.lang);
    try { localStorage.setItem('pg-lang', G.lang); } catch (e) {}
    document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-set-lang') === G.lang); });
    var s = document.getElementById('search');
    if (s) s.placeholder = s.getAttribute('data-ph-' + G.lang);
    document.title = G.t('Paranoidal — гайд для ванильного игрока', 'Paranoidal — a guide for vanilla players');
    formatNumbers();
    langCbs.forEach(function (f) { try { f(G.lang); } catch (e) { console.error(e); } });
    buildSearchIndex();
    if (user) G.achieve('polyglot', 'Полиглот', 'Polyglot', G.icon('technology__space-telescope'), 'Переключить язык гайда', 'Switch the guide language');
  }
  var saved = null, qp = null;
  try { saved = localStorage.getItem('pg-lang'); } catch (e) {}
  try { qp = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  G.lang = (qp === 'en' || qp === 'ru') ? qp : (saved || ((navigator.language || 'ru').toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en'));

  /* ---------------- numbers (count-up) ---------------- */
  function formatNumbers() {
    document.querySelectorAll('.num[data-v]').forEach(function (e) {
      var v = parseFloat(e.getAttribute('data-v'));
      if (!isNaN(v) && e.dataset.done !== 'anim') e.textContent = G.fmt(v);
    });
  }
  function countUp(e) {
    var v = parseFloat(e.getAttribute('data-v'));
    // animate only big standalone counters; numbers inside running text appear final at once
    if (isNaN(v) || v < 20 || !e.closest('.hero-counters,.stat,.out,.deep.center')) { e.textContent = G.fmt(v); return; }
    e.dataset.done = 'anim';
    var t0 = performance.now(), dur = 1200 + Math.min(1400, Math.log10(v) * 220);
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 3);
      e.textContent = G.fmt(Math.round(v * ease));
      if (k < 1) requestAnimationFrame(step); else { e.dataset.done = '1'; e.textContent = G.fmt(v); }
    })(t0);
  }

  /* ---------------- table of contents + scrollspy ---------------- */
  var chapters = [];
  function buildToc() {
    var box = document.querySelector('#toc .toc-inner');
    box.innerHTML = '<div class="toc-title">' + G.bi('Содержание', 'Contents') + '</div>';
    document.querySelectorAll('section.chapter').forEach(function (sec, i) {
      var h2 = sec.querySelector('h2');
      var grp = G.el('div', { class: 'grp' });
      var icon = sec.getAttribute('data-icon');
      var a = G.el('a', { href: '#' + sec.id }, '<span class="tn">' + (sec.getAttribute('data-num') || '') + '</span>' + (icon ? '<img src="' + icon + '" alt="">' : '') + '<span>' + (sec.getAttribute('data-toc') ? G.bi.apply(null, sec.getAttribute('data-toc').split('|')) : (h2 ? h2.innerHTML : sec.id)) + '</span>');
      grp.appendChild(a);
      var sub = G.el('div', { class: 'sub' });
      sec.querySelectorAll('h3').forEach(function (h3, j) {
        if (!h3.id) h3.id = sec.id + '-' + (j + 1);
        sub.appendChild(G.el('a', { href: '#' + h3.id }, h3.innerHTML));
      });
      if (sub.children.length) grp.appendChild(sub);
      box.appendChild(grp);
      chapters.push({ sec: sec, link: a, grp: grp, subs: sub.querySelectorAll('a'), heads: sec.querySelectorAll('h3') });
    });
    box.addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });
  }
  var lastChapter = null;
  function onScroll() {
    var y = window.scrollY, H = document.documentElement.scrollHeight - innerHeight;
    var pct = H > 0 ? Math.min(100, Math.max(0, y / H * 100)) : 0;
    document.querySelector('#research-bar .rb-track i').style.width = pct + '%';
    var cur = null;
    for (var i = 0; i < chapters.length; i++) if (chapters[i].sec.getBoundingClientRect().top < innerHeight * 0.35) cur = chapters[i];
    chapters.forEach(function (c) { c.link.classList.toggle('on', c === cur); c.grp.classList.toggle('open', c === cur); });
    if (cur) {
      var hs = cur.heads, active = -1;
      for (var j = 0; j < hs.length; j++) if (hs[j].getBoundingClientRect().top < innerHeight * 0.3) active = j;
      cur.subs.forEach(function (s, k) { s.classList.toggle('on', k === active); });
      if (cur !== lastChapter) { lastChapter = cur; chapterReached(cur.sec); }
    }
  }

  /* ---------------- achievements (reading game) ---------------- */
  var ach = {};
  try { ach = JSON.parse(localStorage.getItem('pg-ach') || '{}'); } catch (e) {}
  var achDefs = {};
  function achTotal() { return Object.keys(achDefs).length; }
  function achUpdate() {
    document.getElementById('ach-count').textContent = Object.keys(ach).filter(function (k) { return achDefs[k]; }).length;
    document.getElementById('ach-total').textContent = achTotal();
  }
  G.defineAchievement = function (id, ru, en, icon, dru, den) { achDefs[id] = { ru: ru, en: en, icon: icon, dru: dru || '', den: den || '' }; };
  G.achieve = function (id, ru, en, icon, dru, den) {
    if (!achDefs[id]) G.defineAchievement(id, ru, en, icon, dru, den);
    if (ach[id]) return;
    ach[id] = Date.now();
    try { localStorage.setItem('pg-ach', JSON.stringify(ach)); } catch (e) {}
    var d = achDefs[id];
    toast(d.icon, G.t('Достижение получено', 'Achievement unlocked'), G.t(d.ru, d.en));
    achUpdate();
  };
  function toast(icon, small, text) {
    var t = G.el('div', { class: 'toast' }, '<img src="' + icon + '" alt=""><div><small>' + small + '</small>' + text + '</div>');
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 450); }, 4200);
  }
  G.toast = toast;
  function chapterReached(sec) {
    var meta = (D.meta.sections || []).filter(function (s) { return s.id === sec.id; })[0];
    if (meta && meta.achievement_ru) G.achieve('ch-' + sec.id, meta.achievement_ru, meta.achievement_en, sec.getAttribute('data-icon') || G.icon('technology__automation'));
  }

  /* ---------------- range sliders: drag survives widget re-render ----------------
     Widgets rebuild their innerHTML on every 'input', which destroys the native slider in the middle
     of a drag. Here the drag is driven by the page: the pointer is tracked on window, and on every move
     the CURRENT slider with the same index inside the widget gets the value + 'input'/'change' events. */
  document.addEventListener('pointerdown', function (e) {
    var r = e.target.closest && e.target.closest('input[type=range]');
    if (!r || e.button !== 0 || r.disabled) return;
    var box = r.closest('[data-widget]') || document.body;
    var idx = [].indexOf.call(box.querySelectorAll('input[type=range]'), r);
    e.preventDefault();
    function cur() { return box.querySelectorAll('input[type=range]')[idx]; }
    function set(x) {
      var el = cur(); if (!el) return;
      var rc = el.getBoundingClientRect(), th = 8;
      var min = +el.min || 0, max = el.max === '' ? 100 : +el.max, st = el.step;
      var f = Math.max(0, Math.min(1, (x - rc.left - th) / Math.max(1, rc.width - 2 * th)));
      var v = min + f * (max - min);
      if (st !== 'any') { var s = +st || 1; v = min + Math.round((v - min) / s) * s; v = +v.toFixed(6); }
      v = Math.max(min, Math.min(max, v));
      if (String(v) === el.value) return;
      el.value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      var el2 = cur(); if (el2 && el2 !== el) el2.value = v;
      (el2 || el).dispatchEvent(new Event('change', { bubbles: true }));
    }
    function mv(ev) { ev.preventDefault(); set(ev.clientX); }
    function up() { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); document.documentElement.classList.remove('dragging'); var el = cur(); if (el) el.focus({ preventScroll: true }); }
    document.documentElement.classList.add('dragging');
    addEventListener('pointermove', mv, { passive: false });
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    set(e.clientX);
  });

  /* ---------------- tooltips ---------------- */
  var tipEl = document.getElementById('tooltip');
  function showTip(e, htmlStr) {
    tipEl.innerHTML = htmlStr; tipEl.hidden = false; moveTip(e);
  }
  function moveTip(e) {
    var x = e.clientX + 16, y = e.clientY + 18, r = tipEl.getBoundingClientRect();
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 12;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 12;
    tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
  }
  function tipFor(t) {
    if (t._tip) return typeof t._tip === 'function' ? t._tip() : t._tip;
    if (t.hasAttribute('data-ru')) {
      var n = G.lang === 'en' ? t.getAttribute('data-en') : t.getAttribute('data-ru');
      if (!n) return null;
      return '<div class="tt-title"><img src="' + t.getAttribute('src') + '" alt="">' + esc(n) + '</div>';
    }
    if (t.hasAttribute('data-tip-ru')) return G.lang === 'en' ? t.getAttribute('data-tip-en') : t.getAttribute('data-tip-ru');
    if (t.matches('a[href^="#g-"]')) {
      var dt = document.getElementById(t.getAttribute('href').slice(1));
      if (!dt) return null;
      var dd = dt.nextElementSibling;
      return '<div class="tt-title">' + dt.innerHTML + '</div>' + (dd ? dd.innerHTML : '');
    }
    return null;
  }
  G.tip = function (el, h) { el._tip = h; };
  var tipTarget = null;
  document.addEventListener('mouseover', function (e) {
    var t = e.target.closest('[data-ru],[data-tip-ru],a[href^="#g-"],.has-tip');
    if (!t || t.closest('#tooltip')) return;
    var h = tipFor(t);
    if (h) { tipTarget = t; showTip(e, h); }
  });
  document.addEventListener('mousemove', function (e) { if (!tipEl.hidden) moveTip(e); });
  document.addEventListener('mouseout', function (e) { if (tipTarget && !tipTarget.contains(e.relatedTarget)) { tipEl.hidden = true; tipTarget = null; } });

  /* ---------------- spoilers / redactions ---------------- */
  var spoilersOpened = 0;
  document.addEventListener('click', function (e) {
    var s = e.target.closest('.spoiler:not(.open)');
    if (s) {
      s.classList.add('open'); spoilersOpened++;
      if (spoilersOpened === 1) G.achieve('curious', 'Любопытный инженер', 'Curious engineer', G.icon('technology__space-telescope'), 'Открыть первый спойлер', 'Open the first spoiler');
      if (spoilersOpened === 8) G.achieve('spoiler-addict', 'Спойлероголик', 'Spoiler addict', G.icon('technology__astrometrics'), 'Открыть 8 спойлеров', 'Open 8 spoilers');
      e.preventDefault(); return;
    }
    var r = e.target.closest('.redact'); if (r) r.classList.add('open');
  });

  /* ---------------- reveal on scroll + widgets + counters ---------------- */
  function runWidget(el) {
    if (el._w) return;
    el._w = 1;
    var fn = widgets[el.getAttribute('data-widget')];
    if (fn) { try { fn(el, G); } catch (err) { console.error('widget', el.getAttribute('data-widget'), err); el.innerHTML = '<p class="muted">widget error</p>'; } }
  }
  /* render every widget and reveal everything at once (print mode, tools/jscheck.sh) */
  G.renderAll = function () {
    document.querySelectorAll('[data-widget]').forEach(runWidget);
    document.querySelectorAll('.rv').forEach(function (e) { e.classList.add('in'); });
    formatNumbers();
  };
  addEventListener('beforeprint', function () { G.renderAll(); });
  var io = new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      io.unobserve(el);
      if (el.classList.contains('rv')) el.classList.add('in');
      if (el.classList.contains('num')) countUp(el);
      if (el.hasAttribute('data-widget')) runWidget(el);
    });
  }, { rootMargin: '250px 0px' });

  /* ---------------- search ---------------- */
  var index = [];
  function buildSearchIndex() {
    index = [];
    document.querySelectorAll('section.chapter').forEach(function (sec) {
      var title = '';
      var h2 = sec.querySelector('h2'); if (h2) title = textOf(h2);
      sec.querySelectorAll('h3,h4,p,li,dt,figcaption,td').forEach(function (n) {
        var tx = textOf(n);
        if (tx.length < 3) return;
        var anchor = n.closest('[id]');
        var h = n.closest('h3,h4') ? n : prevHeading(n, sec);
        index.push({ text: tx, low: tx.toLowerCase(), id: (n.id || (anchor && anchor.id) || sec.id), head: h ? textOf(h) : title, chap: title, isHead: /^H[34]$/.test(n.tagName) });
      });
    });
  }
  function textOf(n) {
    var c = n.cloneNode(true);
    c.querySelectorAll('[lang]').forEach(function (x) { if (x.getAttribute('lang') !== G.lang) x.remove(); });
    c.querySelectorAll('img[data-ru]').forEach(function (img) { img.replaceWith(' ' + (G.lang === 'en' ? img.getAttribute('data-en') : img.getAttribute('data-ru')) + ' '); });
    return c.textContent.replace(/\s+/g, ' ').trim();
  }
  function prevHeading(n, sec) {
    var hs = sec.querySelectorAll('h3'), best = null;
    for (var i = 0; i < hs.length; i++) if (hs[i].compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) best = hs[i];
    return best;
  }
  function doSearch(q) {
    var box = document.getElementById('search-results');
    q = q.trim().toLowerCase();
    if (q.length < 2) { box.hidden = true; return; }
    var res = [], seen = {};
    index.forEach(function (r) {
      var i = r.low.indexOf(q);
      if (i < 0) return;
      var key = r.id + '|' + r.text.slice(0, 40);
      if (seen[key]) return; seen[key] = 1;
      res.push({ r: r, score: (r.isHead ? 0 : 10) + i / 100 });
    });
    res.sort(function (a, b) { return a.score - b.score; });
    box.innerHTML = res.slice(0, 30).map(function (o) {
      var r = o.r, i = r.low.indexOf(q), s = Math.max(0, i - 50);
      var snip = (s ? '…' : '') + esc(r.text.slice(s, i)) + '<mark>' + esc(r.text.slice(i, i + q.length)) + '</mark>' + esc(r.text.slice(i + q.length, i + q.length + 70)) + '…';
      return '<a href="#' + r.id + '">' + esc(r.head || r.chap) + '<small>' + snip + '</small></a>';
    }).join('') || '<a>' + G.t('Ничего не найдено. Даже в Paranoidal.', 'Nothing found. Even in Paranoidal.') + '</a>';
    box.hidden = false;
  }

  /* ---------------- random fact ---------------- */
  function randomFact() {
    var facts = document.querySelectorAll('#facts-list > li');
    if (!facts.length) return;
    var f = facts[Math.floor(Math.random() * facts.length)];
    var pop = document.getElementById('fact-pop');
    pop.innerHTML = '<div class="fp-k">' + G.bi('Случайный факт о Paranoidal', 'Random Paranoidal fact') + '</div><div class="fp-t">' + f.innerHTML + '</div><div class="fp-b"><button class="fbtn" data-fact-next>' + G.bi('Ещё!', 'Another!') + '</button><button class="fbtn go" data-fact-close>' + G.bi('Понятно', 'Got it') + '</button></div>';
    pop.hidden = false;
    G._facts = (G._facts || 0) + 1;
    if (G._facts === 5) G.achieve('trivia', 'Знаток мелочей', 'Trivia nerd', G.icon('technology__research-speed-1'), 'Прочитать 5 случайных фактов', 'Read 5 random facts');
  }

  /* ---------------- boot ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    buildToc();
    setLang(G.lang);
    document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang'), true); }); });
    document.getElementById('nav-toggle').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    document.querySelectorAll('.rv,.num[data-v],[data-widget]').forEach(function (e) { io.observe(e); });
    var s = document.getElementById('search');
    s.addEventListener('input', function () { doSearch(s.value); });
    s.addEventListener('keydown', function (e) { if (e.key === 'Escape') { s.value = ''; doSearch(''); } if (e.key === 'Enter') { var a = document.querySelector('#search-results a[href]'); if (a) { location.hash = a.getAttribute('href'); doSearch(''); s.blur(); } } });
    document.getElementById('search-results').addEventListener('click', function (e) { if (e.target.closest('a[href]')) { document.getElementById('search-results').hidden = true; G.achieve('seeker', 'Искатель', 'Seeker', G.icon('technology__ore-radar'), 'Воспользоваться поиском', 'Use the search'); } });
    document.addEventListener('click', function (e) { if (!e.target.closest('.tb-search')) document.getElementById('search-results').hidden = true; });
    document.getElementById('fact-btn').addEventListener('click', randomFact);
    document.getElementById('fact-pop').addEventListener('click', function (e) { if (e.target.closest('[data-fact-next]')) randomFact(); if (e.target.closest('[data-fact-close]')) this.hidden = true; });
    document.getElementById('ach-btn').addEventListener('click', showAchievements);
    (D.meta.sections || []).forEach(function (m) {
      if (!m.achievement_ru) return;
      var sec = document.getElementById(m.id);
      var icon = (sec && sec.getAttribute('data-icon')) || G.icon('technology__automation');
      G.defineAchievement('ch-' + m.id, m.achievement_ru, m.achievement_en, icon, 'Дочитать до главы «' + m.ru + '»', 'Reach the chapter “' + m.en + '”');
    });
    G.defineAchievement('polyglot', 'Полиглот', 'Polyglot', G.icon('technology__space-telescope'), 'Переключить язык гайда', 'Switch the guide language');
    G.defineAchievement('curious', 'Любопытный инженер', 'Curious engineer', G.icon('technology__space-telescope'), 'Открыть первый спойлер', 'Open the first spoiler');
    G.defineAchievement('spoiler-addict', 'Спойлероголик', 'Spoiler addict', G.icon('technology__astrometrics'), 'Открыть 8 спойлеров', 'Open 8 spoilers');
    G.defineAchievement('trivia', 'Знаток мелочей', 'Trivia nerd', G.icon('technology__research-speed-1'), 'Прочитать 5 случайных фактов', 'Read 5 random facts');
    G.defineAchievement('seeker', 'Искатель', 'Seeker', G.icon('technology__ore-radar'), 'Воспользоваться поиском', 'Use the search');
    (D.meta.widget_achievements || []).forEach(function (a) { G.defineAchievement(a.id, a.ru, a.en, G.asset(a.icon), a.dru, a.den); });
    /* every hotkey in the text is a link to the keyboard of the QoL chapter */
    document.querySelectorAll('main kbd').forEach(function (k) {
      if (k.closest('#qol-keys, [data-widget]')) return;
      k.classList.add('kbd-link');
      k.setAttribute('data-tip-ru', 'Все горячие клавиши — в главе «Удобства»');
      k.setAttribute('data-tip-en', 'All hotkeys are in the “Quality of life” chapter');
    });
    document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('kbd.kbd-link')) location.hash = '#qol-keys'; });
    document.dispatchEvent(new Event('guide:ready'));
    achUpdate();
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  });
  function showAchievements() {
    var pop = document.getElementById('fact-pop');
    var rows = Object.keys(achDefs).map(function (k) {
      var d = achDefs[k], got = !!ach[k];
      return '<div style="display:flex;gap:10px;align-items:center;padding:5px 0;opacity:' + (got ? 1 : .45) + '">' + (d.icon ? '<img src="' + d.icon + '" style="width:30px;height:30px" alt="">' : '<span style="width:30px">🏆</span>') + '<div><b>' + G.t(d.ru, d.en) + '</b>' + (d.dru ? '<br><small>' + G.t(d.dru, d.den) + '</small>' : '') + '</div>' + (got ? '<span style="margin-left:auto;color:var(--green)">✔</span>' : '') + '</div>';
    }).join('');
    pop.innerHTML = '<div class="fp-k">' + G.bi('Достижения читателя', 'Reader achievements') + '</div><div class="fp-t" style="max-height:55vh;overflow:auto;font-size:15px">' + rows + '</div><div class="fp-b">' + (Object.keys(ach).length ? '<button class="fbtn" data-ach-reset>' + G.t('Сбросить достижения', 'Reset achievements') + '</button>' : '') + '<button class="fbtn go" data-fact-close>OK</button></div>';
    pop.hidden = false;
    var rb = pop.querySelector('[data-ach-reset]');
    if (rb) rb.addEventListener('click', function () {
      /* two-step confirm: the first click arms the button, the second one wipes */
      if (!rb._armed) {
        rb._armed = 1;
        rb.textContent = G.t('Точно сбросить? Нажмите ещё раз', 'Sure? Click again to reset');
        rb.style.borderColor = rb.style.color = 'var(--red, #e04040)';
        setTimeout(function () { if (rb.isConnected && rb._armed) { rb._armed = 0; rb.textContent = G.t('Сбросить достижения', 'Reset achievements'); rb.style.borderColor = rb.style.color = ''; } }, 4000);
        return;
      }
      ach = {};
      try { localStorage.removeItem('pg-ach'); } catch (e) {}
      achUpdate();
      showAchievements();
      toast(G.icon('technology__automation'), G.t('Достижения', 'Achievements'), G.t('Сброшены. Можно собирать заново', 'Reset. Start collecting again'));
    });
  }
})();
