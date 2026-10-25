/* Chapter 18 widgets.
   xp-curve         : XP table of PMRPGsystem (control.lua ResetXPTables: start 1500, m = 1.6 − k(0.018 − 0.018k/200), min growth ×1.02)
   achievement-kinds: achievement prototypes by kind (records.achievement_kinds) */
(function (G) {
  function table() {
    var xp = 1500, t = [1500], maxi = 200;
    for (var k = 2; k <= maxi; k++) { var m = 1.6 - k * (0.018 - 0.018 * k / maxi); xp = Math.ceil(xp * m); if (xp / t[k - 2] < 1.02) xp = t[k - 2] * 1.02; xp = Math.ceil(xp); t.push(xp); }
    return t;
  }
  G.widget('xp-curve', function (el) {
    var T = table(), lv = 50;
    function render() {
      var W = 560, H = 220, max = Math.log10(T[T.length - 1]), min = Math.log10(T[0]);
      var pts = T.map(function (v, i) { return (i / (T.length - 1) * (W - 20) + 10).toFixed(1) + ',' + (H - 10 - (Math.log10(v) - min) / (max - min) * (H - 30)).toFixed(1); }).join(' ');
      var cx = (lv - 1) / (T.length - 1) * (W - 20) + 10, cy = H - 10 - (Math.log10(T[lv - 1]) - min) / (max - min) * (H - 30);
      el.innerHTML = '<div class="panel-title">' + G.t('Опыт до следующего уровня', 'XP to the next level') + '</div><svg viewBox="0 0 ' + W + ' ' + H + '" class="xp"><polyline points="' + pts + '" fill="none" stroke="#ffa020" stroke-width="2.5"/><line x1="' + cx + '" x2="' + cx + '" y1="10" y2="' + (H - 10) + '" stroke="#ffa020" stroke-dasharray="4 3"/><circle cx="' + cx + '" cy="' + cy + '" r="6" fill="#ffa020" stroke="#000"/></svg>' +
        '<div class="qc-form" style="grid-template-columns:1fr"><label>' + G.t('Уровень', 'Level') + ': <b>' + lv + '</b><input class="frange" type="range" min="1" max="200" value="' + lv + '" data-l></label></div>' +
        '<div class="qc-big"><span>' + G.t('Нужно опыта на уровень ', 'XP needed for level ') + lv + '</span><b>' + G.fmt(T[lv - 1]) + '</b></div><p class="muted small-note">' + G.t('Логарифмическая шкала. Точная таблица из кода мода.', 'Log scale. The exact table from the mod code.') + '</p>';
      el.querySelector('[data-l]').oninput = function () { lv = +this.value; render(); };
    }
    render(); G.onLang(render);
  });

  G.widget('achievement-kinds', function (el) {
    var NAMES = { 'produce-achievement': ['Произвести N предметов', 'Produce N items'], 'produce-per-hour-achievement': ['Производить N в час', 'Produce N per hour'], 'achievement': ['Скриптовые и особые', 'Scripted and special'], 'kill-achievement': ['Убийства', 'Kills'], 'build-entity-achievement': ['Построить здание', 'Build a building'], 'research-with-science-pack-achievement': ['Наука', 'Science'], 'use-item-achievement': ['Использовать предмет', 'Use an item'], 'dont-build-entity-achievement': ['Испытания «не строить»', '“Don\'t build” challenges'], 'complete-objective-achievement': ['Цели', 'Objectives'], 'train-path-achievement': ['Длинные маршруты поездов', 'Long train routes'], 'player-damaged-achievement': ['Выжить с уроном', 'Survive damage'] };
    function render() {
      var A = G.data.records.achievement_kinds, tot = A.reduce(function (a, x) { return a + x[1]; }, 0), cells = '';
      var colors = ['#ffa020', '#ffa020', '#58b6ff', '#ff5a4a', '#7ccf5a', '#b58cff', '#3fd6cc', '#e06ad3', '#ffe6c0', '#9a9a9a'];
      A.forEach(function (x, i) { for (var k = 0; k < x[1]; k++) cells += '<i style="background:' + colors[Math.min(i, colors.length - 1)] + '"></i>'; });
      el.innerHTML = '<div class="ak-grid">' + cells + '</div><div class="chips">' + A.slice(0, 9).map(function (x, i) { var n = NAMES[x[0]] || [x[0], x[0]]; return '<span class="chip"><i style="background:' + colors[i] + '"></i>' + G.t(n[0], n[1]) + ' <b>' + x[1] + '</b></span>'; }).join('') + '<span class="chip"><i style="background:#9a9a9a"></i>' + G.t('прочие', 'other') + '</span></div><p class="muted small-note">' + G.t('Каждая клетка — одно достижение. Всего ', 'Each cell is one achievement. Total ') + G.fmt(tot) + '.</p>';
    }
    render(); G.onLang(render);
  });
})(window.Guide);
