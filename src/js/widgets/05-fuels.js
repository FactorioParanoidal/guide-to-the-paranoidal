/* Chapter 05 widgets (fuels).
   fuel-scatter : SVG scatter of combustible fluids, x = heat value kJ (log), y = emission multiplier (log)
   solid-fuels  : sortable table of solid fuels (records.fuels_solid)
   vehicle-kpd  : locomotive fuel effectivity and vehicle movement effectivity bars */
(function (G) {
  function col(c) {
    if (!c) return '#888';
    var r = c.r !== undefined ? c.r : c[0], g = c.g !== undefined ? c.g : c[1], b = c.b !== undefined ? c.b : c[2];
    if (r <= 1 && g <= 1 && b <= 1) { r *= 255; g *= 255; b *= 255; }
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  G.widget('fuel-scatter', function (el) {
    var F = G.data.records.fuels_fluid, filt = 'all';
    var W = 860, H = 430, L = 60, Rr = 20, T = 20, B = 50;
    var x0 = Math.log10(25), x1 = Math.log10(3500), y0 = Math.log10(0.07), y1 = Math.log10(22);
    var X = function (v) { return L + (Math.log10(v) - x0) / (x1 - x0) * (W - L - Rr); };
    var Y = function (v) { return T + (1 - (Math.log10(v) - y0) / (y1 - y0)) * (H - T - B); };
    var notable = { 'diesel-fuel': 1, 'angels-gas-hydrogen': 1, 'angels-gas-hydrazine': 1, 'angels-liquid-rubber': 1, 'bob-alien-fire': 1, 'angels-gas-methane': 1, 'angels-gas-butane': 1, 'angels-liquid-multi-phase-oil': 1, 'angels-liquid-naphtha': 1 };
    function render() {
      var pts = F.filter(function (f) { return filt === 'all' || (filt === 'gas') === !!f.gas; });
      var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fs-svg">';
      s += '<rect x="' + X(500) + '" y="' + Y(1.5) + '" width="' + (X(3500) - X(500)) + '" height="' + (Y(0.07) - Y(1.5)) + '" class="fs-best"/>';
      s += '<text x="' + (X(3400)) + '" y="' + (Y(0.08)) + '" class="fs-bl" text-anchor="end">' + G.t('зона мечты', 'dream zone') + '</text>';
      [30, 100, 300, 1000, 3000].forEach(function (v) { s += '<line x1="' + X(v) + '" x2="' + X(v) + '" y1="' + T + '" y2="' + (H - B) + '" class="fs-grid"/><text x="' + X(v) + '" y="' + (H - B + 18) + '" class="fs-ax">' + G.fmt(v) + '</text>'; });
      [0.1, 0.3, 1, 3, 10].forEach(function (v) { s += '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="fs-grid"/><text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" class="fs-ax" text-anchor="end">×' + G.fmt(v) + '</text>'; });
      s += '<text x="' + ((L + W) / 2) + '" y="' + (H - 10) + '" class="fs-lab">' + G.t('теплотворность, кДж за единицу →', 'heat value, kJ per unit →') + '</text>';
      s += '<text transform="translate(16 ' + ((T + H - B) / 2) + ') rotate(-90)" class="fs-lab">' + G.t('← чище · множитель загрязнения · грязнее →', '← cleaner · emission multiplier · dirtier →') + '</text>';
      pts.forEach(function (f, i) {
        var jitter = ((i * 37) % 9 - 4) * 1.2, cx = X(f.kj), cy = Y(Math.max(0.07, f.emissions)) + jitter;
        var tip = '<div class="tt-title"><img src="' + G.icon(f.icon) + '" alt="">' + G.esc(G.nm(f)) + '</div>' + G.t('Теплотворность', 'Heat value') + ': <b>' + G.fmt(f.kj) + ' ' + G.t('кДж', 'kJ') + '</b><br>' + G.t('Загрязнение', 'Emissions') + ': <b>×' + G.fmt(f.emissions) + '</b><br>' + (f.gas ? G.t('газ', 'gas') : G.t('жидкость', 'liquid'));
        var shape = f.gas ? '<rect x="' + (cx - 7) + '" y="' + (cy - 7) + '" width="14" height="14" transform="rotate(45 ' + cx + ' ' + cy + ')"' : '<circle cx="' + cx + '" cy="' + cy + '" r="8"';
        s += '<g class="fs-pt" data-tip-ru="' + G.esc(tip) + '" data-tip-en="' + G.esc(tip) + '">' + shape + ' fill="' + col(f.base_color) + '" stroke="#000" stroke-width="1.5"/>';
        if (notable[f.id]) s += cx > W - 190 ? '<text x="' + (cx - 11) + '" y="' + (cy + 4) + '" class="fs-name" text-anchor="end">' + G.esc(G.nm(f)) + '</text>' : '<text x="' + (cx + 11) + '" y="' + (cy + 4) + '" class="fs-name">' + G.esc(G.nm(f)) + '</text>';
        s += '</g>';
      });
      s += '</svg>';
      el.innerHTML = '<div class="wbar">' + [['all', 'Все', 'All'], ['liquid', 'Жидкости ●', 'Liquids ●'], ['gas', 'Газы ◆', 'Gases ◆']].map(function (b) { return '<button class="fbtn ' + (filt === b[0] ? 'go' : '') + '" data-f="' + b[0] + '">' + G.t(b[1], b[2]) + '</button>'; }).join('') + '<span class="muted">' + G.t('Точек: ', 'Points: ') + pts.length + '</span></div>' + s;
      el.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { filt = b.getAttribute('data-f'); render(); }; });
    }
    render(); G.onLang(render);
  });

  G.widget('solid-fuels', function (el) {
    var F = G.data.records.fuels_solid.filter(function (f) { return f.category !== 'bet-fuel-battery'; });
    var key = 'mj', dir = -1;
    var cols = [['mj', 'МДж', 'MJ'], ['emissions', 'Дым ×', 'Smoke ×'], ['acceleration', 'Разгон ×', 'Accel. ×'], ['top_speed', 'Скорость ×', 'Speed ×']];
    function render() {
      var rows = F.slice().sort(function (a, b) { return (a[key] - b[key]) * dir; });
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon('item__coal') + '" alt="">' + G.t('Всё, что горит', 'Everything that burns') + ' (' + rows.length + ')</div><div class="table-wrap"><table class="ftable sortable"><tr><th>' + G.t('Топливо', 'Fuel') + '</th>' +
        cols.map(function (c) { return '<th data-k="' + c[0] + '" class="' + (key === c[0] ? 'on' : '') + '">' + G.t(c[1], c[2]) + (key === c[0] ? (dir < 0 ? ' ▼' : ' ▲') : '') + '</th>'; }).join('') + '</tr>' +
        rows.map(function (f) {
          var mj = f.mj >= 1000 ? G.fmt(f.mj / 1000, { maximumFractionDigits: 2 }) + ' ' + G.t('ГДж', 'GJ') : G.fmt(f.mj, { maximumFractionDigits: 2 });
          return '<tr class="' + (f.emissions < 0 ? 'neg' : f.emissions >= 3 ? 'dirty' : '') + '"><td>' + G.iconImg(f) + ' ' + G.esc(G.nm(f)) + '</td><td class="n">' + mj + '</td><td class="n">' + G.fmt(f.emissions) + '</td><td class="n">' + G.fmt(f.acceleration) + '</td><td class="n">' + G.fmt(f.top_speed) + '</td></tr>';
        }).join('') + '</table></div><p class="muted small-note">' + G.t('Нажмите на заголовок столбца, чтобы отсортировать. Зелёным — топливо с отрицательным загрязнением.', 'Click a column header to sort. Green: fuel with negative emissions.') + '</p>';
      el.querySelectorAll('th[data-k]').forEach(function (th) { th.onclick = function () { var k = th.getAttribute('data-k'); if (k === key) dir = -dir; else { key = k; dir = -1; } render(); }; });
    }
    render(); G.onLang(render);
  });

  G.widget('vehicle-kpd', function (el) {
    var R = G.data.records;
    function bars(list, field, title) {
      var max = 2;
      return '<h4>' + title + '</h4>' + list.map(function (r) {
        var v = r[field] || 0;
        return '<div class="sl-row vk"><span class="sl-q">' + G.iconImg(r) + G.esc(G.nm(r)) + '</span><span class="sl-bar"><i style="width:' + Math.min(100, v / max * 100) + '%;background:' + (v < .3 ? '#ff5a4a' : v < 1 ? '#ffa020' : '#7ccf5a') + '"></i></span><b>' + G.fmt(v * 100, { maximumFractionDigits: 0 }) + '%</b></div>';
      }).join('');
    }
    function render() {
      var locos = R.locomotives.filter(function (l) { return l.effectivity; }).sort(function (a, b) { return a.effectivity - b.effectivity; });
      var cars = R.cars.filter(function (c) { return /^(car|tank|bob-tank-3|gunship|cargo-plane|jet|flying-fortress|Schall-tank-SH)$/.test(c.id); }).sort(function (a, b) { return a.effectivity - b.effectivity; });
      el.innerHTML = '<div class="grid g2"><div>' + bars(locos, 'effectivity', G.t('Локомотивы: КПД топлива', 'Locomotives: fuel efficiency')) + '</div><div>' + bars(cars, 'effectivity', G.t('Машины, танки, самолёты: КПД движения', 'Cars, tanks, aircraft: movement efficiency')) + '</div></div>' +
        '<p class="muted small-note">' + G.t('Да, у маглева КПД 200%: он получает из заряда вдвое больше, чем в нём есть. Инженеры Paranoidal не обязаны соблюдать законы термодинамики. А боевой самолёт с КПД 7% — самый честный двигатель на планете.', 'Yes, the maglev runs at 200%: it gets twice what the charge holds. Paranoidal engineers are not obliged to obey thermodynamics. And the gunship at 7% is the most honest engine on the planet.') + '</p>';
    }
    render(); G.onLang(render);
  });
})(window.Guide);
