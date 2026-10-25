/* Chapter 19 widgets (statistics). Everything is read from stats.json, so the page updates itself after tools/extract_stats.py.
   stat-dashboard : grid of counters with icons and the vanilla multiplier when known
   recipe-kinds   : split of recipe prototypes (main / recycling / void / barrel / hidden-technical)
   records-board  : record cards (records.*) */
(function (G) {
  G.widget('stat-dashboard', function (el) {
    var C = G.data.counts, V = G.data.vanilla_reference;
    var cards = [
      [C.mods_gameplay, 'игровых модов (+' + C.mods_libraries + ' библиотек)', 'gameplay mods (+' + C.mods_libraries + ' libraries)', 'technology__automation', null],
      [C.items_visible, 'предметов', 'items', 'item__iron-gear-wheel', null],
      [C.fluids_visible, 'жидкостей и газов', 'fluids and gases', 'fluid__angels-liquid-multi-phase-oil', V.fluids],
      [C.recipes_main, 'рецептов', 'recipes', 'technology__automation', V.recipes],
      [C.technologies_visible, 'технологий', 'technologies', 'technology__research-speed-1', V.technologies],
      [C.technologies_infinite, 'бесконечных технологий', 'infinite technologies', 'technology__worker-robots-speed-1', null],
      [C.tech_max_depth, 'шагов в самой длинной цепочке', 'steps in the longest chain', 'technology__orbital-ai-core', null],
      [C.science_packs, 'научных пакетов', 'science packs', 'tool__bob-science-pack-gold', V.science_packs],
      [C.buildings_placeable, 'зданий и машин', 'buildings and machines', 'item__assembling-machine-1', null],
      [C.placeable_by_type['assembling-machine'], 'видов сборочных машин', 'crafting machine types', 'item__assembling-machine-1', V.assemblers],
      [C.modules, 'модулей', 'modules', 'module__god-module-5', V.modules],
      [C.qualities, 'ступеней качества', 'quality grades', 'quality__extreme', V.qualities],
      [C.enemy_units, 'видов врагов', 'enemy types', 'unit__juggernaut-biter-v1-t10-rampant', V.enemy_units],
      [C.enemy_spawners, 'видов гнёзд и ульев', 'nest and hive types', 'unit-spawner__neutral-super-hive-v1-t10-rampant', V.spawners],
      [C.worms, 'видов червей', 'worm types', 'unit__behemoth-biter', null],
      [C.turrets, 'турелей', 'turrets', 'ammo-turret__gun-turret', V.turrets],
      [C.ammo, 'видов боеприпасов', 'ammo types', 'ammo__bob-atomic-artillery-shell', null],
      [C.equipment, 'видов оборудования', 'equipment types', 'armor__bob-power-armor-mk5', null],
      [C.achievements, 'достижений', 'achievements', 'technology__space-telescope', V.achievements],
      [C.fuels_solid + C.fuels_fluid, 'видов топлива', 'fuels', 'item__coal', null],
      [C.absorbers, 'машин, поглощающих смог', 'smog-absorbing machines', 'technology__bi-tech-bio-farming', null],
      [C.locale_ru, 'строк перевода', 'locale strings', 'technology__space-telescope', null],
      [C.trees, 'видов деревьев', 'tree types', 'item__wood', null],
      [C.hotkeys_mod, 'горячих клавиш модов', 'mod hotkeys', 'technology__toolbelt', null]
    ];
    function render() {
      el.innerHTML = '<div class="stats-row dash">' + cards.map(function (c) {
        return '<div class="stat"><span class="v">' + G.fmt(c[0]) + '</span><span class="l">' + G.t(c[1], c[2]) + '</span>' + (c[4] ? '<span class="x">×' + G.fmt(c[0] / c[4], { maximumFractionDigits: c[0] / c[4] < 10 ? 1 : 0 }) + '</span>' : '') + '<img class="ic" src="' + G.icon(c[3]) + '" alt="" onerror="this.remove()"></div>';
      }).join('') + '</div><p class="muted small-note">' + G.t('×N — во сколько раз больше, чем в ванили. Данные: ', '×N: how many times more than vanilla. Data: ') + '<code>' + G.esc(G.data.meta.data.dump || '') + '</code>, Factorio ' + G.esc(G.data.meta.data.engine || '') + ', ' + G.t('сгенерировано', 'generated') + ' ' + G.esc(G.data.meta.data.generated || '') + '.</p>';
    }
    render(); G.onLang(render);
  });

  G.widget('recipe-kinds', function (el) {
    var C = G.data.counts;
    function render() {
      var parts = [[C.recipes_main, 'рецепты для игрока', 'player recipes', '#ffa020'], [C.recipes_recycling, 'переработка', 'recycling', '#58b6ff'], [C.recipes_void, 'утилизация', 'voiding', '#ff5a4a'], [C.recipes_barrel, 'бочки', 'barrels', '#7ccf5a']];
      var used = parts.reduce(function (a, p) { return a + p[0]; }, 0), other = C.recipes_total_prototypes - used;
      parts.push([other, 'скрытые и служебные', 'hidden and technical', '#555']);
      el.innerHTML = '<div class="rk">' + parts.map(function (p) { return '<i style="flex:' + p[0] + ';background:' + p[3] + '" data-tip-ru="' + G.esc(p[1] + ': ' + p[0]) + '" data-tip-en="' + G.esc(p[2] + ': ' + p[0]) + '"></i>'; }).join('') + '</div><div class="chips">' +
        parts.map(function (p) { return '<span class="chip"><i style="background:' + p[3] + '"></i>' + G.t(p[1], p[2]) + ' <b>' + G.fmt(p[0]) + '</b></span>'; }).join('') + '</div>';
    }
    render(); G.onLang(render);
  });

  G.widget('records-board', function (el) {
    var R = G.data.records;
    function card(rec, val, ru, en) { return '<div class="rb-card rv in"><img src="' + G.icon(rec.icon) + '" alt=""><div><small>' + G.t(ru, en) + '</small><b>' + G.esc(G.nm(rec)) + '</b><span class="out">' + val + '</span></div></div>'; }
    function render() {
      var fuel = R.fuels_solid.slice().sort(function (a, b) { return b.mj - a.mj; })[0];
      var clean = R.fuels_solid.slice().sort(function (a, b) { return a.emissions - b.emissions; })[0];
      var dirty = R.fuels_fluid.slice().sort(function (a, b) { return b.emissions - a.emissions || b.kj - a.kj; })[0];
      var lab = R.labs.slice().sort(function (a, b) { return b.speed - a.speed; })[0];
      var tur = R.turrets.filter(function (t) { return t.range; }).sort(function (a, b) { return b.range - a.range; })[0];
      var drill = R.drills.slice().sort(function (a, b) { return b.speed - a.speed; })[0];
      el.innerHTML = '<div class="grid g3">' + [
        card(R.recipe_longest[0], G.fmt(R.recipe_longest[0].seconds) + ' ' + G.t('с', 's'), 'Самый долгий рецепт', 'Longest recipe'),
        card(R.recipe_most_ingredients[0], R.recipe_most_ingredients[0].ingredients + ' ' + G.t('ингредиентов', 'ingredients'), 'Самый сложный рецепт', 'Most complex recipe'),
        card(R.recipe_most_results[0], R.recipe_most_results[0].results + ' ' + G.t('продуктов', 'products'), 'Больше всего продуктов', 'Most products'),
        card(R.top_ingredients[0], R.top_ingredients[0].recipes + ' ' + G.t('рецептов', 'recipes'), 'Самый нужный материал', 'Most needed material'),
        card(R.top_products[0], R.top_products[0].recipes + ' ' + G.t('рецептов', 'recipes'), 'Самый частый продукт', 'Most common product'),
        card(R.tech_most_expensive[0], G.fmt(R.tech_most_expensive[0].packs_total) + ' ' + G.t('пакетов', 'packs'), 'Самая дорогая технология', 'Most expensive technology'),
        card(R.tech_deepest[0], R.tech_deepest[0].depth + ' ' + G.t('шагов', 'steps'), 'Самая глубокая технология', 'Deepest technology'),
        card(R.enemy_toughest[0], G.fmt(R.enemy_toughest[0].health) + ' HP', 'Самый живучий враг', 'Toughest enemy'),
        card(lab, '×' + G.fmt(lab.speed), 'Самая быстрая лаборатория', 'Fastest lab'),
        card(tur, G.fmt(tur.range) + ' ' + G.t('клеток', 'tiles'), 'Самая дальнобойная турель', 'Longest-range turret'),
        card(drill, '×' + G.fmt(drill.speed), 'Самый быстрый бур', 'Fastest drill'),
        card(fuel, G.fmt(fuel.mj / 1000) + ' ' + G.t('ГДж', 'GJ'), 'Самое энергоёмкое топливо', 'Most energy-dense fuel'),
        card(clean, '×' + G.fmt(clean.emissions), 'Самое «чистое» топливо', 'Cleanest fuel'),
        card(dirty, '×' + G.fmt(dirty.emissions), 'Самая грязная горючая жидкость', 'Dirtiest combustible fluid'),
        card(R.absorbers[0], G.fmt(R.absorbers[0].pollution) + G.t('/мин', '/min'), 'Главный «пылесос» смога', 'Top smog absorber')
      ].join('') + '</div>';
    }
    render(); G.onLang(render);
  });
})(window.Guide);
