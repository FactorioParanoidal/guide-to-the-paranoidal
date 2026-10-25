/* Chapter 14 widgets (enemies).
   hp-ladder       : log-scale HP from vanilla biters to the toughest units (records.vanilla_biters + enemy_toughest + big_monsters)
   faction-gallery : Rampant factions (tier-10 unit of each) + Bob's leviathans
   enemy-sources   : donut of enemy KINDS (tiers collapsed) by source (records.enemy_sources)
   threat-board    : evolution → bug level, Rampant nest types, special attacks (sources in the widget comment) */
(function (G) {
  G.widget('hp-ladder', function (el) {
    function render() {
      var R = G.data.records, seen = {}, list = [];
      R.vanilla_biters.forEach(function (u) { list.push({ r: u, hp: u.health, tag: G.t('ваниль', 'vanilla') }); });
      R.rampant_faction_units.filter(function (u) { return u.faction === 'juggernaut'; }).forEach(function (u) { list.push({ r: u, hp: u.health, tag: 'Rampant' }); });
      R.bob_breeds.slice(0, 1).forEach(function (u) { list.push({ r: u, hp: u.health, tag: 'Bob' }); });
      R.big_monsters.forEach(function (u) { list.push({ r: u, hp: u.health, tag: 'Big Monsters' }); });
      R.enemy_toughest.slice(0, 2).forEach(function (u) { list.push({ r: u, hp: u.health, tag: u.source === 'humans' ? G.t('люди', 'humans') : 'Rampant' }); });
      list = list.filter(function (x) { var k = G.nm(x.r); if (seen[k]) return false; seen[k] = 1; return true; }).sort(function (a, b) { return a.hp - b.hp; });
      var max = Math.log10(list[list.length - 1].hp), beh = 25000;
      el.innerHTML = list.map(function (x) {
        var w = Math.log10(x.hp) / max * 100, isV = x.tag === G.t('ваниль', 'vanilla');
        return '<div class="hp-row' + (isV ? ' van' : '') + '"><span class="sl-q">' + G.iconImg(x.r) + G.esc(G.nm(x.r)) + ' <small class="badge">' + x.tag + '</small></span><span class="sl-bar"><i style="width:' + w + '%"></i></span><b>' + G.fmt(x.hp) + '</b><em>' + (x.hp > beh ? '×' + G.fmt(x.hp / beh, { maximumFractionDigits: 0 }) : '') + '</em></div>';
      }).join('') + '<p class="muted small-note">' + G.t('Логарифмическая шкала. Справа — во сколько раз здоровье больше, чем у ванильного чудовища (25 000).', 'Log scale. On the right: how many times the HP exceeds a vanilla behemoth (25,000).') + '</p>';
    }
    render(); G.onLang(render);
  });

  G.widget('faction-gallery', function (el) {
    function render() {
      var F = G.data.records.rampant_faction_units, B = G.data.records.bob_breeds;
      el.innerHTML = '<div class="panel-title">' + G.t('Фракции Rampant, 10-й уровень', 'Rampant factions, tier 10') + '</div><div class="fg">' +
        F.map(function (u) { return '<div class="fg-c" data-ru="' + G.esc(u.ru) + '" data-en="' + G.esc(u.en) + '" src="' + G.icon(u.icon) + '"><img src="' + G.icon(u.icon) + '" alt=""><b>' + G.fmt(u.health) + '</b></div>'; }).join('') + '</div>' +
        '<h4>' + G.t('Левиафаны Боба', 'Bob\'s leviathans') + '</h4><div class="fg">' + B.map(function (u) { return '<div class="fg-c" data-ru="' + G.esc(u.ru) + '" data-en="' + G.esc(u.en) + '" src="' + G.icon(u.icon) + '"><img src="' + G.icon(u.icon) + '" alt=""><b>' + G.fmt(u.health) + '</b></div>'; }).join('') + '</div>' +
        '<p class="muted small-note">' + G.t('Число — здоровье. Наведите курсор для названия.', 'The number is HP. Hover for the name.') + '</p>';
    }
    render(); G.onLang(render);
  });

  G.widget('enemy-sources', function (el) {
    var NAMES = { rampant: ['Rampant', 'Rampant', '#ffa020'], bob: ['Жуки Боба', 'Bob\'s bugs', '#58b6ff'], humans: ['Люди', 'Humans', '#ff5a4a'], big_monsters: ['Исполины', 'Giants', '#b58cff'], vanilla: ['Ваниль', 'Vanilla', '#7ccf5a'], other: ['Прочие', 'Other', '#888'] };
    function render() {
      var S = G.data.records.enemy_sources, keys = Object.keys(S).sort(function (a, b) { return S[b].units - S[a].units; });
      var tot = keys.reduce(function (a, k) { return a + S[k].units; }, 0), acc = 0, R = 80, C = 2 * Math.PI * R, segs = '';
      keys.forEach(function (k) { var f = S[k].units / tot; segs += '<circle r="' + R + '" cx="110" cy="110" fill="none" stroke="' + NAMES[k][2] + '" stroke-width="34" stroke-dasharray="' + (f * C) + ' ' + C + '" stroke-dashoffset="' + (-acc * C) + '" transform="rotate(-90 110 110)"/>'; acc += f; });
      el.innerHTML = '<div class="es"><svg viewBox="0 0 220 220">' + segs + '<text x="110" y="106" class="es-t">' + G.fmt(tot) + '</text><text x="110" y="128" class="es-s">' + G.t('видов врагов', 'enemy types') + '</text></svg><div>' +
        keys.map(function (k) { return '<div class="es-l"><i style="background:' + NAMES[k][2] + '"></i>' + G.t(NAMES[k][0], NAMES[k][1]) + '<b>' + G.fmt(S[k].units) + '</b></div>'; }).join('') + '</div></div>';
    }
    render(); G.onLang(render);
  });

  /* threat-board: what the player meets at each evolution level.
     Rampant factions: first base tier of each faction (Constants.lua acceptRate[1]) mapped to evolution by
     BaseUtils.lua evoToTierMapping (tier 1 = 10%, 2 = 17%, 3 = 27% ... 9 = 83%; tierByEvolutionOnly = true in Paranoidal).
     Bug levels: first evolution where nests breed that level (SwarmUtils.lua unitSetToProbabilityTable, tierEnd 10).
     Events: Big Monsters with Paranoidal defaults (zzzparanoidal/settings-final-fixes.lua), flyers ≥10% (ПР-063);
     events with chance 0 in Paranoidal (volcano, invasion, worms) are not shown. */
  G.widget('threat-board', function (el) {
    var evo = 0.3;
    var FAC = [
      [0, 'neutral', 'Обычные', 'Common'], [0.10, 'acid', 'Кислотные', 'Acidic'],
      [0.17, 'laser', 'Лазерные', 'Laser'], [0.17, 'electric', 'Электрические', 'Electric'], [0.17, 'suicide', 'Камикадзе', 'Suicide'], [0.17, 'fast', 'Быстрые', 'Fast'],
      [0.27, 'wasp', 'Осы', 'Wasp'], [0.27, 'spawner', 'Породители', 'Spawner'], [0.27, 'troll', 'Регенерирующие', 'Regenerative'], [0.27, 'energy-thief', 'Энерговоры', 'Sapper'],
      [0.37, 'fire', 'Огненные', 'Fire'], [0.37, 'arachnids', 'Арахниды', 'Arachnids'],
      [0.47, 'physical', 'Бронированные', 'Armored'],
      [0.56, 'inferno', 'Адские', 'Inferno'], [0.56, 'poison', 'Ядовитые', 'Poison'],
      [0.65, 'nuclear', 'Ядерные', 'Nuclear'], [0.83, 'juggernaut', 'Джаггернауты', 'Juggernaut']
    ];
    var LVL = [0, 0.15, 0.27, 0.38, 0.47, 0.65, 0.74, 0.80, 0.85, 0.91];
    var EV = [
      [0, 'Рой', 'Swarm', 'Большая волна жуков на край вашей базы', 'A big wave of bugs at the edge of your base'],
      [0.10, 'Летуны', 'Flyers', 'Летают над водой и стенами, ищут слабое место', 'Fly over water and walls, look for a weak spot'],
      [0.20, 'Вражеские солдаты', 'Enemy soldiers', 'Отряд людей с оружием', 'A squad of armed humans'],
      [0.40, 'Исполины', 'Giants', 'Огромные монстры и королева-матка', 'Huge monsters and the Brood Mother'],
      [0.80, 'Паукотроны', 'Spidertrons', 'Вражеские шагающие машины', 'Enemy walking machines'],
      [0.80, 'Летающие тарелки', 'Flying saucers', 'Да, настоящие', 'Yes, real ones']
    ];
    var EV_ICON = ['🌀', '🦟', '🪖', '🦖', '🕷', '🛸'];
    var units = {};
    (G.data.records.rampant_faction_units || []).forEach(function (u) { units[u.faction] = u; });
    function pct(x) { return x ? Math.round(x * 100) + '%' : G.t('сразу', 'start'); }
    function render() {
      var lvl = 0; LVL.forEach(function (v, i) { if (evo >= v) lvl = i + 1; });
      var facOn = FAC.filter(function (f) { return evo >= f[0]; }).length;
      var lv = LVL.map(function (v, i) {
        var on = evo >= v, top = on && i + 1 === lvl;
        return '<div class="tb-lv' + (on ? ' on' : '') + (top ? ' top' : '') + '"><b>' + (i + 1) + '</b><small>' + pct(v) + '</small></div>';
      }).join('');
      var fac = FAC.map(function (f) {
        var u = units[f[1]], on = evo >= f[0];
        return '<div class="tb-f' + (on ? ' on' : '') + '">' + (u ? '<img src="' + G.icon(u.icon) + '" alt="">' : '') + '<b>' + G.t(f[2], f[3]) + '</b><small>' + pct(f[0]) + '</small></div>';
      }).join('');
      var ev = EV.map(function (e, i) {
        var on = evo >= e[0];
        return '<div class="tb-c' + (on ? ' on' : '') + '" data-tip-ru="' + G.esc(e[3]) + '" data-tip-en="' + G.esc(e[4]) + '"><span class="tb-i">' + EV_ICON[i] + '</span><b>' + G.t(e[1], e[2]) + '</b><small>' + pct(e[0]) + '</small></div>';
      }).join('');
      el.innerHTML =
        '<div class="tb-evo"><span>' + G.t('Эволюция врагов', 'Enemy evolution') + '</span><b>' + Math.round(evo * 100) + '%</b></div>' +
        '<input class="frange" type="range" min="0" max="1" step="0.01" value="' + evo + '" data-e style="width:100%">' +
        '<h5 class="tb-h">' + G.t('Уровень жуков из гнёзд', 'Bug level from nests') + ' <span class="muted">— ' + G.t('сейчас до', 'now up to') + ' ' + lvl + '</span></h5><div class="tb-lvls">' + lv + '</div>' +
        '<h5 class="tb-h">' + G.t('Виды гнёзд', 'Nest types') + ' <span class="muted">— ' + facOn + ' ' + G.t('из', 'of') + ' ' + FAC.length + '</span></h5><div class="tb-fac">' + fac + '</div>' +
        '<h5 class="tb-h">' + G.t('Особые нападения', 'Special attacks') + '</h5><div class="tb">' + ev + '</div>' +
        '<p class="muted small-note">' + G.t('Это настройки Paranoidal по умолчанию. Дальние базы могут быть сильнее ближних. Особое нападение бывает раз в 100 игровых дней, какое именно — случайно. Наведите курсор на карточку, чтобы узнать подробности.', 'These are Paranoidal\'s default settings. Distant bases can be stronger than near ones. A special attack happens once every 100 game days; which one is random. Hover a card for details.') + '</p>';
      el.querySelector('[data-e]').oninput = function () {
        evo = +this.value; render();
        if (evo >= 0.8) G.achieve('doom', 'Предвестник апокалипсиса', 'Harbinger of doom', G.icon('unit__bm_fake_human_boss_nuke_rocket_10'), 'Довести эволюцию до 80% на табло угроз', 'Push evolution to 80% on the threat board');
      };
    }
    render(); G.onLang(render);
  });
})(window.Guide);
