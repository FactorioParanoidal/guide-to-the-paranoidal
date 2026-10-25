/* Chapter 02 widgets.
   wreck-field  : clickable wreck sprites with info cards (values from records.spot)
   start-levels : quality weights of start supplies per start level (zzzparanoidal-shipwreck/README.md) */
(function (G) {
  G.widget('wreck-field', function (el) {
    var S = G.data.records.spot;
    var items = [
      { k: 'crash-site-spaceship', sp: 'crash-site-spaceship',
        ru: function () { return 'Корабль. 80 слотов добра, добывается 6 секунд. Самая жирная точка старта.'; },
        en: function () { return 'The ship. 80 slots of loot, 6 seconds to mine. The fattest spot of the start.'; } },
      { k: 'aai-big-ship-wreck-1', sp: 'aai-big-ship-wreck-1',
        ru: function () { return 'Большой обломок. Три секунды киркой — и внутри материалы, детали, иногда приятные сюрпризы.'; },
        en: function () { return 'A big wreck. Three seconds of pickaxe work, and inside are materials, parts and sometimes pleasant surprises.'; } },
      { k: 'salvaged-generator', sp: 'salvaged-generator',
        ru: function () { var s = S['salvaged-generator']; return 'Спасённый генератор: ' + G.fmt(s.production_w / 1e3) + ' кВт без топлива и буфер ' + G.fmt(s.buffer_j / 1e6) + ' МДж. Электричество до первого котла!'; },
        en: function () { var s = S['salvaged-generator']; return 'Salvaged generator: ' + G.fmt(s.production_w / 1e3) + ' kW with no fuel and a ' + G.fmt(s.buffer_j / 1e6) + ' MJ buffer. Electricity before your first boiler!'; } },
      { k: 'salvaged-assembling-machine', sp: 'salvaged-assembling-machine',
        ru: function () { var s = S['salvaged-assembling-machine']; return 'Спасённый сборочный автомат: скорость ' + G.fmt(s.crafting_speed) + ', ' + G.fmt(s.energy_usage_w / 1e3) + ' кВт. Медленный, зато уже электрический.'; },
        en: function () { var s = S['salvaged-assembling-machine']; return 'Salvaged assembler: speed ' + G.fmt(s.crafting_speed) + ', ' + G.fmt(s.energy_usage_w / 1e3) + ' kW. Slow, but already electric.'; } },
      { k: 'salvaged-lab', sp: 'salvaged-lab',
        ru: function () { var s = S['salvaged-lab']; return 'Извлечённая лаборатория: скорость исследований ' + G.fmt(s.research_speed) + '. Да, в шесть с лишним раз медленнее обычной. Да, это всё равно лучше, чем ничего.'; },
        en: function () { var s = S['salvaged-lab']; return 'Salvaged lab: research speed ' + G.fmt(s.research_speed) + '. Yes, more than six times slower than a normal one. Yes, it is still better than nothing.'; } }
    ];
    el.innerHTML = '<div class="panel-title">' + G.bi('Нажмите на обломок', 'Click a wreck') + '</div><div class="wf-grid">' +
      items.map(function (it, i) { return '<button class="wf-item" data-i="' + i + '"><img src="assets/sprites/' + it.sp + '.webp" alt=""><span>' + (function (r) { return G.bi(G.esc(r.ru || r.en), G.esc(r.en || r.ru)); })(S[it.k] || { ru: it.k, en: it.k }) + '</span></button>'; }).join('') +
      '</div><div class="wf-card deep">' + G.bi('Обломки ждут кирку.', 'The wrecks are waiting for a pickaxe.') + '</div>';
    var card = el.querySelector('.wf-card'), opened = {};
    function show(i) {
      var it = items[i];
      card.innerHTML = '<b>' + G.nm(S[it.k] || { ru: it.k, en: it.k }) + '</b><br>' + G.t(it.ru(), it.en());
      el.querySelectorAll('.wf-item').forEach(function (b, j) { b.classList.toggle('on', j === i); });
      opened[i] = 1;
      if (Object.keys(opened).length === items.length) G.achieve('scavenger', 'Мародёр', 'Scavenger', 'assets/sprites/crash-site-spaceship.webp', 'Осмотреть все обломки', 'Inspect every wreck');
    }
    el.querySelectorAll('.wf-item').forEach(function (b) { b.onclick = function () { show(+b.getAttribute('data-i')); }; });
    G.onLang(function () { var on = el.querySelector('.wf-item.on'); if (on) show(+on.getAttribute('data-i')); });
  });

  G.widget('start-levels', function (el) {
    var Q = G.data.records.qualities, byId = {};
    Q.forEach(function (q) { byId[q.id] = q; });
    var chain = Q.map(function (q) { return q.id; });
    var ni = chain.indexOf('normal');
    var levels = [
      { id: 'min', ru: 'Минимальный', en: 'Minimum', dru: 'Половина припасов, готовые изделия и все столбы — с браком.', den: 'Half of the supplies; finished items and all poles are defective.',
        w: [[0, 5], [-1, 15], [-2, 25], [-3, 25], [-4, 20], [-5, 10]] },
      { id: 'med', ru: 'Средний', en: 'Medium', dru: 'Полный набор припасов, всё обычного качества.', den: 'Full supplies, everything of normal quality.', w: [[0, 100]] },
      { id: 'rich', ru: 'Богатый (по умолчанию)', en: 'Rich (default)', dru: 'Готовые изделия могут оказаться выше обычного качества.', den: 'Finished items may roll above normal quality.',
        w: [[0, 25], [1, 30], [2, 20], [3, 13], [4, 8], [5, 4]] }
    ];
    var cur = 2;
    function draw() {
      var L = levels[cur];
      el.innerHTML = '<div class="wbar">' + levels.map(function (l, i) { return '<button class="fbtn ' + (i === cur ? 'go' : '') + '" data-l="' + i + '">' + G.t(l.ru, l.en) + '</button>'; }).join('') + '</div>' +
        '<p>' + G.t(L.dru, L.den) + '</p><div class="sl-bars">' + L.w.map(function (p) {
          var q = byId[chain[ni + p[0]]];
          return '<div class="sl-row"><span class="sl-q" style="--qc:' + G.qColor(q) + '"><img src="' + G.icon(q.icon) + '" alt="">' + G.nm(q) + '</span><span class="sl-bar"><i style="width:' + p[1] + '%;background:' + G.qColor(q) + '"></i></span><b>' + p[1] + '%</b></div>';
        }).join('') + '</div><p class="muted small-note">' + G.t('Шанс выпадения ступени для каждого вида готового изделия. Материалы, ленты, подземные ленты, разделители и погрузчики всегда обычные.', 'Chance of each grade per finished item type. Materials, belts, undergrounds, splitters and loaders are always normal.') + '</p>';
      el.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { cur = +b.getAttribute('data-l'); draw(); }; });
    }
    draw(); G.onLang(draw);
  });
})(window.Guide);
