/* Widgets of the cover and chapter 01.
   hero-belt : endless conveyor with real item icons (random sample from stats records)
   vs-bars   : vanilla vs Paranoidal bars, log/linear toggle (stats.vanilla_reference + counts) */
(function (G) {
  G.widget('hero-belt', function (el) {
    var R = G.data.records, pool = [];
    ['fuels_solid', 'science_packs', 'modules', 'turrets', 'drills', 'boilers', 'top_ingredients', 'top_products', 'belts', 'labs', 'assemblers_fastest', 'burner_machines', 'cars', 'reactors', 'solar']
      .forEach(function (k) { (R[k] || []).forEach(function (r) { if (r.icon) pool.push(r); }); });
    (R.ore_decoder || []).forEach(function (o) { pool.push(o.ore); o.stages.forEach(function (s) { s.outputs.forEach(function (x) { pool.push(x); }); }); });
    var seen = {}; pool = pool.filter(function (r) { if (seen[r.icon]) return false; seen[r.icon] = 1; return true; });
    pool.sort(function () { return Math.random() - .5; });
    var pick = pool.slice(0, 40), track = el.querySelector('.track');
    // eager loading (lazy images inside a moving strip sometimes stayed broken) + one retry on error
    var h = pick.map(function (r) { return G.iconImg(r, '').replace(' loading="lazy"', ' onerror="if(!this.dataset.r){this.dataset.r=1;this.src=this.src}"'); }).join('');
    track.innerHTML = h + h; // duplicated for a seamless loop
    // items ride at the belt speed: the belt texture moves 52 px per 1.08 s (60-unified.css .belt)
    var BELT_PX_PER_S = 52 / 1.08;
    track.style.animationDuration = (track.scrollWidth / 2 / BELT_PX_PER_S).toFixed(2) + 's';
  });

  G.widget('vs-bars', function (el) {
    var C = G.data.counts, V = G.data.vanilla_reference, log = true;
    var rows = [
      ['recipes', C.recipes_main, V.recipes, 'Рецептов (без переработки)', 'Recipes (no recycling)', '#production'],
      ['technologies', C.technologies_visible, V.technologies, 'Технологий', 'Technologies', '#science'],
      ['enemy_units', C.enemy_units, V.enemy_units, 'Видов врагов', 'Enemy types', '#enemies'],
      ['fluids', C.fluids_visible, V.fluids, 'Жидкостей и газов', 'Fluids and gases', '#chemistry'],
      ['qualities', C.qualities, V.qualities, 'Ступеней качества (с браком)', 'Quality grades (incl. defects)', '#defects'],
      ['science', C.science_packs, V.science_packs, 'Научных пакетов', 'Science packs', '#science'],
      ['modules', C.modules, V.modules, 'Модулей', 'Modules', '#production'],
      ['turrets', C.turrets, V.turrets, 'Турелей (без рангов героев)', 'Turrets (without hero ranks)', '#military'],
      ['achievements', C.achievements, V.achievements, 'Достижений', 'Achievements', '#life'],
      ['spawners', C.enemy_spawners, V.spawners, 'Видов гнёзд и ульев', 'Nest and hive types', '#enemies']
    ];
    function draw() {
      var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }));
      var sc = function (v) { return log ? Math.log10(v + 1) / Math.log10(max + 1) : v / max; };
      el.innerHTML = '<div class="vsb-head"><span>' + G.t('Шкала:', 'Scale:') + '</span>' +
        '<button class="fbtn ' + (log ? 'go' : '') + '" data-s="log">' + G.t('логарифмическая', 'logarithmic') + '</button>' +
        '<button class="fbtn ' + (!log ? 'go' : '') + '" data-s="lin">' + G.t('линейная (жестокая)', 'linear (brutal)') + '</button>' +
        '<span class="vsb-leg"><i class="v"></i>' + G.t('Ваниль', 'Vanilla') + ' <i class="p"></i>Paranoidal</span></div>' +
        rows.map(function (r) {
          var mult = r[2] ? r[1] / r[2] : 0;
          return '<a class="vsb-row" href="' + r[5] + '"><span class="vsb-l">' + G.t(r[3], r[4]) + '</span>' +
            '<span class="vsb-bars"><i class="v" style="width:' + (sc(r[2]) * 100).toFixed(2) + '%"><em>' + G.fmt(r[2]) + '</em></i>' +
            '<i class="p" style="width:' + (sc(r[1]) * 100).toFixed(2) + '%"><em>' + G.fmt(r[1]) + '</em></i></span>' +
            '<span class="vsb-x">×' + G.fmt(mult, { maximumFractionDigits: mult < 10 ? 1 : 0 }) + '</span></a>';
        }).join('') +
        '<p class="muted small-note">' + G.t('Ванильные значения — Factorio 2.0 с Quality и Elevated Rails, без Space Age (рецепты и технологии — приблизительно, по прототипам игры).', 'Vanilla values: Factorio 2.0 with Quality and Elevated Rails, no Space Age (recipes and technologies are approximate, counted from game prototypes).') + '</p>';
      el.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { log = b.getAttribute('data-s') === 'log'; draw(); }; });
      requestAnimationFrame(function () { el.classList.add('drawn'); });
    }
    draw();
    G.onLang(draw);
  });
})(window.Guide);
