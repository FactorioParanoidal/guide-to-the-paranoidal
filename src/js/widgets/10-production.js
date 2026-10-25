/* Chapter 10 widgets (production).
   module-explorer : module families and tiers with effect bars (records.modules)
   factory-zoom    : infinite Factorissimo recursion animation
   memory-calc     : memory unit power = (1 MW + ceil(n/stack)^0.35 × 480 kW) × (0.2 + 0.8(1 − i/N)²), deep-storage-unit/README.md */
(function (G) {
  var CAT = { speed: ['Скорость', 'Speed'], effectivity: ['Эффективность', 'Efficiency'], productivity: ['Продуктивность', 'Productivity'], quality: ['Качество', 'Quality'],
    'pollution-clean': ['Очистка', 'Cleaning'], 'pollution-create': ['Загрязнение', 'Polluting'], green: ['Эффективность + очистка', 'Efficiency + cleaning'],
    'raw-productivity': ['Продуктивность+', 'Productivity+'], 'raw-speed': ['Скорость+', 'Speed+'], god: ['Квантовые', 'Quantum'] };
  var EFF = [['speed', 'Скорость', 'Speed', '#58b6ff'], ['productivity', 'Продуктивность', 'Productivity', '#ffa020'], ['consumption', 'Энергия', 'Energy', '#ffd25a'], ['pollution', 'Загрязнение', 'Pollution', '#b58cff'], ['quality', 'Качество', 'Quality', '#7ccf5a']];
  G.widget('module-explorer', function (el) {
    var M = G.data.records.modules, cats = [], cat = 'god', tier = 5;
    M.forEach(function (m) { if (cats.indexOf(m.category) < 0) cats.push(m.category); });
    function list() { return M.filter(function (m) { return m.category === cat; }).sort(function (a, b) { return a.tier - b.tier; }); }
    function bar(v) {
      var w = Math.min(50, Math.abs(v) * 50), left = v < 0 ? 50 - w : 50;
      return '<span class="me-bar"><i style="left:' + left + '%;width:' + w + '%;background:' + (v < 0 ? '#7ccf5a' : '#ff7a5a') + '"></i><s></s></span>';
    }
    function render() {
      var L = list(); if (tier > L.length) tier = L.length;
      var m = L[tier - 1];
      el.innerHTML = '<div class="me-cats">' + cats.map(function (c) { var f = M.filter(function (x) { return x.category === c; })[0]; return '<button class="me-c ' + (c === cat ? 'on' : '') + '" data-c="' + c + '"><img src="' + G.icon(f.icon) + '" alt="">' + G.t((CAT[c] || [c, c])[0], (CAT[c] || [c, c])[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="me-main"><div class="me-mod"><img src="' + G.icon(m.icon) + '" alt=""><b>' + G.esc(G.nm(m)) + '</b><label>' + G.t('Уровень', 'Tier') + ' ' + tier + ' / ' + L.length + '<input class="frange" type="range" min="1" max="' + L.length + '" value="' + tier + '" data-t></label></div>' +
        '<div class="me-effs">' + EFF.map(function (e) {
          var v = (m.effect || {})[e[0]] || 0;
          return '<div class="me-row"><span>' + G.t(e[1], e[2]) + '</span>' + bar(e[0] === 'consumption' || e[0] === 'pollution' ? v : -v) + '<b style="color:' + (v ? e[3] : '#555') + '">' + (v > 0 ? '+' : '') + G.fmt(v * 100, { maximumFractionDigits: 0 }) + '%</b></div>';
        }).join('') + '</div></div><p class="muted small-note">' + G.t('Зелёное — хорошо для вас, красное — цена. Энергия больше 100% не помещается в шкалу: продуктивность 8 добавляет +1280% потребления.', 'Green is good for you, red is the price. Energy above 100% does not fit the scale: productivity 8 adds +1280% consumption.') + '</p>';
      el.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { cat = b.getAttribute('data-c'); tier = 99; render(); }; });
      el.querySelector('[data-t]').oninput = function () { tier = +this.value; render(); };
    }
    render(); G.onLang(render);
  });

  G.widget('factory-zoom', function (el) {
    var depth = 0;
    function render() {
      el.innerHTML = '<div class="fz"><img src="assets/sprites/factory-1.webp" alt=""><img src="assets/sprites/factory-3.webp" alt=""><img src="assets/sprites/factory-4.webp" alt=""><img src="assets/sprites/factory-1.webp" alt=""></div>' +
        '<div class="wbar"><button class="fbtn go" data-d>' + G.t('Зайти глубже', 'Go deeper') + '</button><span class="out">' + G.t('Уровень вложенности: ', 'Nesting level: ') + depth + '</span></div>';
      el.querySelector('[data-d]').onclick = function () { depth++; render(); if (depth === 5) G.achieve('inception', 'Начало', 'Inception', G.icon('item__factory-1'), 'Зайти на 5 уровней вглубь фабрики', 'Go 5 levels deep into a factory'); };
    }
    render(); G.onLang(render);
  });

  G.widget('memory-calc', function (el) {
    var exp = 6, stack = 100, qi = 0, N = 40;
    function render() {
      var n = Math.pow(10, exp), base = 1e6 + Math.pow(Math.ceil(n / stack), 0.35) * 480e3, k = 0.2 + 0.8 * Math.pow(1 - qi / N, 2), P = base * k;
      var Q = G.data.records.qualities.filter(function (q) { return !q.defect; }), q = Q[Math.min(qi, Q.length - 1)];
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon('item__memory-unit') + '" alt="">' + G.t('Сколько ест материопамять', 'How much memory storage eats') + '</div>' +
        '<div class="qc-form"><label>' + G.t('Предметов в памяти', 'Items in memory') + ': <b>' + G.fmt(n) + '</b><input class="frange" type="range" min="3" max="9" step="0.25" value="' + exp + '" data-n></label>' +
        '<label>' + G.t('Размер стопки', 'Stack size') + '<select class="fsel" data-s>' + [50, 100, 200, 400, 500].map(function (s) { return '<option ' + (s === stack ? 'selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
        '<label style="grid-column:1/-1">' + G.t('Качество блока', 'Unit quality') + ': <b style="color:' + G.qColor(q) + '">' + G.esc(G.nm(q)) + '</b><input class="frange" type="range" min="0" max="40" value="' + qi + '" data-q></label></div>' +
        '<div class="qc-big"><span>' + G.t('Потребление', 'Consumption') + '</span><b style="color:#ffd25a">' + G.fmt(P / 1e6, { maximumFractionDigits: 2 }) + ' ' + G.t('МВт', 'MW') + '</b><small>(1 ' + G.t('МВт', 'MW') + ' + ⌈n/stack⌉^0.35 × 480 ' + G.t('кВт', 'kW') + ') × ' + G.fmt(k, { maximumFractionDigits: 2 }) + '</small></div>';
      el.querySelector('[data-n]').oninput = function () { exp = +this.value; render(); };
      el.querySelector('[data-s]').onchange = function () { stack = +this.value; render(); };
      el.querySelector('[data-q]').oninput = function () { qi = +this.value; render(); };
    }
    render(); G.onLang(render);
  });
})(window.Guide);
