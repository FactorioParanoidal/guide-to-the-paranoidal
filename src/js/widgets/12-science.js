/* Chapter 12 widgets (science).
   science-wall   : science packs with number of technologies using them (records.science_packs)
   tech-eras      : technologies by number of pack kinds (records.tech_by_pack_kinds)
   lab-scale      : lab footprints to scale (records.labs + records.spot sizes)
   evolution-calc : evolution = 1 − exp(−(0.0015·techs + 0.0000035·packs)), research_evolution_factor/parameters.lua */
(function (G) {
  G.widget('science-wall', function (el) {
    function render() {
      var P = G.data.records.science_packs, main = P.filter(function (p) { return !p.module_token; }), mods = P.filter(function (p) { return p.module_token; });
      var max = Math.max.apply(null, main.map(function (p) { return p.techs; }));
      function card(p) { return '<div class="sw-card"><img src="' + G.icon(p.icon) + '" alt="" data-ru="' + G.esc(p.ru) + '" data-en="' + G.esc(p.en) + '"><b>' + G.fmt(p.techs) + '</b><i style="height:' + Math.max(3, p.techs / max * 60) + 'px"></i></div>'; }
      el.innerHTML = '<div class="panel-title">' + G.t('Научные пакеты и число технологий, где они нужны', 'Science packs and how many technologies need them') + '</div><div class="sw">' + main.map(card).join('') + '</div>' +
        '<h4>' + G.t('Платы модулей — «наука» для лаборатории модулей', 'Module boards: “science” for the module lab') + '</h4><div class="sw small">' + mods.map(card).join('') + '</div>';
    }
    render(); G.onLang(render);
  });

  G.widget('tech-eras', function (el) {
    function render() {
      var E = G.data.records.tech_by_pack_kinds, max = Math.max.apply(null, E.map(function (e) { return e[1]; }));
      el.innerHTML = '<div class="panel-title">' + G.t('Технологии по числу видов науки', 'Technologies by number of science kinds') + '</div><div class="te">' +
        E.map(function (e) { return '<div class="te-col"><b>' + e[1] + '</b><i style="height:' + (e[1] / max * 200) + 'px"></i><span>' + e[0] + '</span></div>'; }).join('') +
        '</div><p class="muted small-note center">' + G.t('видов пакетов в стоимости технологии →', 'pack kinds in the technology cost →') + '</p>';
    }
    render(); G.onLang(render);
  });

  /* lab-scale: pick a lab → it is drawn next to a regular 3×3 lab on one tile grid (records.labs: tiles, speed, power, inputs) */
  G.widget('lab-scale', function (el) {
    var ORDER = ['salvaged-lab', 'burner-lab', 'lab', 'bob-lab-2', 'lab-module', 'bob-lab-alien', 'erp-lab', 'big-lab', 'paranoidal-beta8-big-lab', 'paranoidal-beta8-hyper-lab'];
    var L = {}; G.data.records.labs.forEach(function (l) { L[l.id] = l; });
    var labs = ORDER.filter(function (id) { return L[id]; }).map(function (id) { return L[id]; });
    var sel = 'paranoidal-beta8-hyper-lab';
    function power(w) { return w >= 1e9 ? G.fmt(w / 1e9) + ' ' + G.t('ГВт', 'GW') : w >= 1e6 ? G.fmt(w / 1e6, { maximumFractionDigits: 1 }) + ' ' + G.t('МВт', 'MW') : G.fmt(w / 1e3) + ' ' + G.t('кВт', 'kW'); }
    function render() {
      var l = L[sel], base = L.lab, t = l.tiles || [3, 3];
      var H = 300, scale = Math.min(48, (H - 40) / t[1], 560 / t[0]);
      function box(x, label, isBase) {
        var tt = x.tiles || [3, 3], w = tt[0] * scale, h = tt[1] * scale;
        return '<div class="ls-item' + (isBase && scale < 12 ? ' tiny' : '') + '"><div class="ls-fp" style="width:' + w + 'px;height:' + h + 'px"><img src="assets/sprites/' + x.id + '.webp" alt=""></div><span>' + label + '</span></div>';
      }
      var stage = box(l, G.esc(G.nm(l)) + ' · ' + t[0] + '×' + t[1]) + (sel !== 'lab' ? box(base, G.t('обычная', 'regular') + ' · 3×3', true) : '');
      el.innerHTML = '<div class="ls-pick">' + labs.map(function (x) {
        return '<button class="ls-card' + (x.id === sel ? ' on' : '') + '" data-l="' + x.id + '"><img src="' + G.icon(x.icon) + '" alt=""><b>' + G.esc(G.nm(x)) + '</b><small>×' + G.fmt(x.speed) + '</small></button>';
      }).join('') + '</div>' +
        '<div class="ls-stage" style="height:' + H + 'px;background-size:' + scale + 'px ' + scale + 'px">' + stage + '</div>' +
        '<div class="stats-row ls-stats">' +
        '<div class="stat"><span class="v">' + t[0] + '×' + t[1] + '</span><span class="l">' + G.t('размер в клетках', 'size in tiles') + '</span></div>' +
        '<div class="stat"><span class="v">×' + G.fmt(l.speed) + '</span><span class="l">' + G.t('скорость исследований', 'research speed') + '</span></div>' +
        '<div class="stat"><span class="v">' + power(l.power_w) + '</span><span class="l">' + G.t('потребляет', 'power draw') + '</span></div>' +
        '<div class="stat"><span class="v">' + l.inputs + '</span><span class="l">' + G.t('видов научных пакетов', 'science pack kinds') + '</span></div></div>' +
        '<p class="muted small-note">' + G.t('Клетка фона — одна клетка игры. Лаборатории нарисованы в одном масштабе.', 'One background square is one game tile. Labs are drawn to the same scale.') + '</p>';
      el.querySelectorAll('[data-l]').forEach(function (b) { b.onclick = function () { sel = b.getAttribute('data-l'); render(); if (sel === 'paranoidal-beta8-hyper-lab') G.achieve('hyperlab', 'Гигаватт на науку', 'A gigawatt for science', G.icon('item__paranoidal-beta8-hyper-lab'), 'Рассмотреть гипер-лабу', 'Inspect the hyper lab'); }; });
    }
    render(); G.onLang(render);
  });

  G.widget('evolution-calc', function (el) {
    var techs = 120, packsExp = 4.5;
    function render() {
      var packs = Math.round(Math.pow(10, packsExp)), x = 0.0015 * techs + packs * 0.0000035, evo = 1 - Math.exp(-x);
      var stage = evo < 0.1 ? G.t('маленькие кусаки и черви. Пока.', 'small biters and worms. For now.') : evo < 0.3 ? G.t('средние жуки; с 10% — летуны, с 20% могут прийти вражеские солдаты.', 'medium bugs; flyers from 10%, hostile soldiers may come from 20%.') : evo < 0.6 ? G.t('большие жуки; с 40% — исполинские монстры.', 'big bugs; giant monsters from 40%.') : evo < 0.8 ? G.t('чудовища.', 'behemoths.') : G.t('паукотроны врага, летающие тарелки и прочий апокалипсис.', 'enemy spidertrons, flying saucers and other apocalypse.');
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon('unit__behemoth-biter') + '" alt="">' + G.t('Калькулятор эволюции', 'Evolution calculator') + '</div>' +
        '<div class="qc-form"><label>' + G.t('Изучено технологий', 'Technologies researched') + ': <b>' + techs + '</b><input class="frange" type="range" min="0" max="900" value="' + techs + '" data-t></label>' +
        '<label>' + G.t('Потрачено пакетов', 'Packs spent') + ': <b>' + G.fmt(packs) + '</b><input class="frange" type="range" min="2" max="7.5" step="0.05" value="' + packsExp + '" data-p></label></div>' +
        '<div class="ev-meter"><i style="width:' + (evo * 100) + '%"></i><b>' + G.fmt(evo * 100, { maximumFractionDigits: 1 }) + '%</b></div>' +
        '<p>' + G.t('Что вас ждёт: ', 'What awaits you: ') + '<b>' + stage + '</b></p>' +
        '<p class="muted small-note">' + G.t('Показатель = 0,0015 × технологии + 0,0000035 × пакеты; эволюция = 1 − e^(−показатель). Пороги событий — из настроек Big Monsters; реальный состав врагов зависит ещё и от расстояния до гнёзд.', 'Exponent = 0.0015 × technologies + 0.0000035 × packs; evolution = 1 − e^(−exponent). Event thresholds come from Big Monsters settings; the actual enemy mix also depends on distance to nests.') + '</p>';
      el.querySelector('[data-t]').oninput = function () { techs = +this.value; render(); };
      el.querySelector('[data-p]').oninput = function () { packsExp = +this.value; render(); };
    }
    render(); G.onLang(render);
  });
})(window.Guide);
