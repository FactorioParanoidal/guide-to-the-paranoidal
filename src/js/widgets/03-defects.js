/* Chapter 03 widgets (defects & quality).
   quality-ladder : staircase of all quality grades (records.qualities), top grades hidden until revealed
   defect-sim     : defect distribution by control level and production mode — port of ic-more-qualities model.lua M.distribution
   workshop-sim   : refinement workshop modes, Monte Carlo of attempts/time/packs (rules from the in-game tips)
   quality-calc   : upgrade chance = effect × 10 × next_probability; modes = 1/3/10 independent rolls
   qc-loop        : animated SVG of production → control post → workshop loop */
(function (G) {
  function quals() { return G.data.records.qualities; }
  var FAM = { Uncommon: ['Хорошие', 'Uncommon'], Rare: ['Редкие', 'Rare'], Epic: ['Эпические', 'Epic'], Legendary: ['Легендарные', 'Legendary'], Unique: ['Уникальные', 'Unique'], Astral: ['Астральные', 'Astral'], Quantum: ['Квантовые', 'Quantum'] };
  function family(q) {
    if (q.defect) return ['Брак', 'Defects'];
    if (q.id === 'normal') return ['Обычное', 'Normal'];
    var f = (q.en || '').split(' ')[0];
    return FAM[f] || ['Вершины', 'Summits'];
  }

  /* ---------------- quality-ladder ---------------- */
  G.widget('quality-ladder', function (el) {
    var Q = quals(), revealed = false;
    var maxL = Math.max.apply(null, Q.map(function (q) { return q.level; }));
    function draw() {
      var fams = [], last = null;
      Q.forEach(function (q, i) { var f = family(q)[0]; if (f !== last) { fams.push({ f: family(q), from: i, n: 0 }); last = f; } fams[fams.length - 1].n++; });
      var cols = Q.map(function (q, i) {
        var secret = !revealed && family(q)[0] === 'Вершины';
        var h = q.defect ? (6 - +q.id.slice(-1)) * 4 : 30 + q.level / maxL * 230;
        var g = q.defect ? -(+q.id.slice(-1)) : null;
        var tip = secret ? G.t('Засекречено. Нажмите кнопку ниже.', 'Classified. Press the button below.') :
          '<div class="tt-title"><img src="' + G.icon(q.icon) + '" alt="">' + G.esc(G.nm(q)) + '</div>' + G.t('Уровень', 'Level') + ': <b>' + (q.defect ? g : q.level) + '</b>' + (q.next_probability ? '<br>' + G.t('Шанс перехода дальше', 'Next-grade chance') + ': <b>' + G.fmt(q.next_probability, { maximumFractionDigits: 3 }) + '</b>' : '');
        return '<div class="ql-col' + (q.defect ? ' def' : '') + (secret ? ' secret' : '') + '" data-tip-ru="' + G.esc(tip) + '" data-tip-en="' + G.esc(tip) + '"><i style="height:' + h + 'px;background:' + G.qColor(q) + '"></i><img src="' + G.icon(q.icon) + '" alt=""></div>';
      }).join('');
      var labels = fams.map(function (f) { return '<span style="flex:' + f.n + '">' + G.t(f.f[0], f.f[1]) + '</span>'; }).join('');
      el.innerHTML = '<div class="ql-stair">' + cols + '</div><div class="ql-fams">' + labels + '</div>' +
        '<div class="wbar" style="margin-top:12px">' + (revealed ? '<span class="badge hot">' + G.t('Вершины рассекречены', 'Summits declassified') + '</span> ' +
          Q.filter(function (q) { return family(q)[0] === 'Вершины'; }).map(function (q) { return '<span class="chip"><img class="ic" src="' + G.icon(q.icon) + '" alt="">' + G.esc(G.nm(q)) + '</span>'; }).join('') :
          '<button class="fbtn danger" data-reveal>' + G.t('🔒 Рассекретить пять вершин', '🔒 Declassify the five summits') + '</button><span class="muted">' + G.t('Названия самых высоких ступеней — маленький спойлер.', 'The names of the highest grades are a small spoiler.') + '</span>') + '</div>';
      var b = el.querySelector('[data-reveal]');
      if (b) b.onclick = function () { revealed = true; draw(); G.achieve('summits', 'Взгляд на вершину', 'A glimpse of the summit', G.icon('quality__extreme'), 'Рассекретить вершины качества', 'Declassify the quality summits'); };
    }
    draw(); G.onLang(draw);
  });

  /* ---------------- defect distribution (model.lua) ---------------- */
  function geometric(min) { var r = {}, tot = 0, w = 1, g; for (g = -5; g <= 0; g++) r[g] = 0; for (g = min; g <= 0; g++) { r[g] = w; tot += w; w /= 10; } for (g = min; g <= 0; g++) r[g] /= tot; return r; }
  function distribution(level) {
    var min = -5 + Math.floor(level / 2), lo = geometric(min);
    if (level % 2 === 0) return lo;
    var up = geometric(min + 1), g; for (g = -5; g <= 0; g++) lo[g] = (lo[g] + up[g]) / 2; return lo;
  }
  G.defectDistribution = distribution;
  function draw(d) { var r = Math.random(), s = 0; for (var g = -5; g <= 0; g++) { s += d[g]; if (r < s) return g; } return 0; }
  function qByGrade(g) { var Q = quals(); return Q[Q.map(function (q) { return q.id; }).indexOf('normal') + g]; }

  G.widget('defect-sim', function (el) {
    var level = 0, mode = 0, last = null;
    function dist() { if (mode === 2) return { '-5': 0, '-4': 0, '-3': 0, '-2': 0, '-1': 0, 0: 1 }; return distribution(Math.min(10, level + (mode === 1 ? 4 : 0))); }
    function render() {
      var d = dist(), g;
      var bars = '';
      for (g = -5; g <= 0; g++) {
        var q = qByGrade(g), p = d[g] * 100;
        bars += '<div class="sl-row"><span class="sl-q"><img src="' + G.icon(q.icon) + '" alt="">' + G.esc(G.nm(q)) + '</span><span class="sl-bar"><i style="width:' + p + '%;background:' + G.qColor(q) + '"></i></span><b>' + G.fmt(p, { maximumFractionDigits: p < 1 ? 4 : 1 }) + '%</b></div>';
      }
      el.innerHTML = '<div class="ds-ctl"><label>' + G.t('Контроль качества', 'Quality control') + ': <b class="out">' + level + '</b></label><input class="frange" type="range" min="0" max="10" value="' + level + '" data-lv style="flex:1">' +
        '<span class="ds-modes">' + [['I', 'Обычный', 'Normal'], ['II', 'Точный', 'Careful'], ['III', 'Эталонный', 'Reference']].map(function (m, i) { return '<button class="fbtn ' + (i === mode ? 'go' : '') + '" data-m="' + i + '">' + m[0] + ' · ' + G.t(m[1], m[2]) + '</button>'; }).join('') + '</span></div>' +
        '<div class="ds-wrap"><div>' + bars + '</div><div class="ds-batch"><button class="fbtn go" data-run>' + G.t('Скрафтить 100 железных сундуков', 'Craft 100 iron chests') + '</button><div class="ds-grid"></div><div class="ds-sum muted"></div></div></div>' +
        '<p class="muted small-note">' + G.t('Точная формула из кода мода: на уровне 0 ступени относятся как 1 : 0,1 : 0,01 : …; каждые два уровня отрезают худшую ступень, нечётные уровни — среднее между соседями. Режим «Точный» = контроль на 4 уровня выше, «Эталонный» = без брака.', 'Exact formula from the mod code: at level 0 grades relate as 1 : 0.1 : 0.01 : …; every two levels cut the worst grade, odd levels average the neighbours. “Careful” = control 4 levels higher, “Reference” = no defects.') + '</p>';
      el.querySelector('[data-lv]').oninput = function () { level = +this.value; render(); if (level === 10) G.achieve('qc10', 'Брак побеждён', 'Defects defeated', G.icon('technology__ic-defect-control-10'), 'Довести контроль качества до 10 в симуляторе', 'Push quality control to 10 in the simulator'); };
      el.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = +b.getAttribute('data-m'); render(); }; });
      el.querySelector('[data-run]').onclick = run;
      if (last) paint(last);
    }
    function run() {
      var d = dist(), res = []; for (var i = 0; i < 100; i++) res.push(draw(d)); last = res; paint(res);
    }
    function paint(res) {
      // 100 chests sorted by grade (worst first, same order as the bars); each chest carries its quality marker
      var grid = el.querySelector('.ds-grid'), chest = G.icon('item__iron-chest');
      var sorted = res.slice().sort(function (x, y) { return x - y; });
      grid.innerHTML = sorted.map(function (g) { var q = qByGrade(g); return '<span class="ds-cell"><img src="' + chest + '" alt=""><img class="ds-q" src="' + G.icon(q.icon) + '" alt=""></span>'; }).join('');
      var cnt = {}; res.forEach(function (g) { cnt[g] = (cnt[g] || 0) + 1; });
      el.querySelector('.ds-sum').innerHTML = G.t('Итог партии: ', 'Batch result: ') + Object.keys(cnt).sort(function (a, b) { return a - b; }).map(function (g) { var q = qByGrade(+g); return '<span class="ds-tot"><img src="' + G.icon(q.icon) + '" alt="">' + G.esc(G.nm(q)) + ' <b>×' + cnt[g] + '</b></span>'; }).join('');
    }
    render(); G.onLang(render);
  });

  /* ---------------- workshop-sim ---------------- */
  G.widget('workshop-sim', function (el) {
    var start = -5, N = 2000;
    function attempt(mode, g) {
      if (mode === 2) return 0;
      if (mode === 1) return Math.min(0, g + 2);
      if (Math.random() < 0.1) return g;
      g++; while (g < 0 && Math.random() < 0.1) g++;
      return g;
    }
    function sim(mode) {
      var att = 0; for (var i = 0; i < N; i++) { var g = start; while (g < 0) { g = attempt(mode, g); att++; } }
      var a = att / N, tm = [1, 5, 20][mode];
      return { attempts: a, time: a * tm, packs: a };
    }
    function render() {
      var r = [sim(0), sim(1), sim(2)];
      var maxT = Math.max(r[0].time, r[1].time, r[2].time), maxP = Math.max(r[0].packs, r[1].packs, r[2].packs);
      var names = [['I · Обычный', 'I · Normal'], ['II · Точный', 'II · Precise'], ['III · Эталонный', 'III · Reference']];
      el.innerHTML = '<div class="wbar"><label>' + G.t('Исходная ступень', 'Starting grade') + '</label>' + [-5, -4, -3, -2, -1].map(function (g) { var q = qByGrade(g); return '<button class="fbtn ' + (g === start ? 'go' : '') + '" data-g="' + g + '"><img class="ic" src="' + G.icon(q.icon) + '" alt=""> ' + g + '</button>'; }).join('') + '</div>' +
        '<table class="ftable"><tr><th>' + G.t('Режим', 'Mode') + '</th><th>' + G.t('Попыток до обычного', 'Attempts to normal') + '</th><th>' + G.t('Время (в попытках обычного режима)', 'Time (in normal attempts)') + '</th><th>' + G.t('Ремонтных наборов (отн.)', 'Repair packs (rel.)') + '</th></tr>' +
        r.map(function (x, i) {
          return '<tr><td><b>' + G.t(names[i][0], names[i][1]) + '</b></td><td class="n">' + G.fmt(x.attempts, { maximumFractionDigits: 2 }) + '</td>' +
            '<td><span class="ws-bar t"><i style="width:' + (x.time / maxT * 100) + '%"></i><em>' + G.fmt(x.time, { maximumFractionDigits: 1 }) + '</em></span></td>' +
            '<td><span class="ws-bar p"><i style="width:' + (x.packs / maxP * 100) + '%"></i><em>' + G.fmt(x.packs, { maximumFractionDigits: 2 }) + '</em></span></td></tr>';
        }).join('') + '</table><p class="muted small-note">' + G.t('Монте-Карло на ' + G.fmt(N) + ' изделий по правилам из внутриигровой справки. Наборов за попытку уходит одинаково во всех режимах, меняется время. Мало наборов — эталонный; мало времени — обычный.', 'Monte Carlo over ' + G.fmt(N) + ' items using the in-game help rules. Packs per attempt are the same in all modes; time differs. Short on packs: reference; short on time: normal.') + '</p>';
      el.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { start = +b.getAttribute('data-g'); render(); }; });
    }
    render(); G.onLang(render);
  });

  /* ---------------- quality-calc ---------------- */
  G.widget('quality-calc', function (el) {
    var tier = 3, count = 4, qi = 0, mode = 0;   // count 1..8: chosen by hovering/tapping the machine slots
    var Q = quals().filter(function (q) { return !q.defect && q.next_probability; });
    var M = (G.data.records.modules || []).filter(function (m) { return m.category === 'quality'; }).sort(function (x, y) { return x.tier - y.tier; });
    function mod(t) { return M.filter(function (m) { return m.tier === t; })[0]; }
    function qchip(q) { return q ? '<img class="ic" src="' + G.icon(q.icon) + '" alt=""> <span style="color:' + G.qColor(q) + '">' + G.esc(G.nm(q)) + '</span>' : ''; }
    function render() {
      var base = Q[qi], np = base.next_probability, eff = tier * count;
      var p = Math.min(1, eff / 100 * 10 * np), rolls = [1, 3, 10][mode], P = 1 - Math.pow(1 - p, rolls);
      // jump distribution after an upgrade: further steps with next_probability of each reached grade
      var jumps = [0, 0, 0], g = qi + 1, carry = 1;
      for (var k = 0; k < 3 && g < Q.length; k++) { var stay = k < 2 ? 1 - (Q[g] ? Q[g].next_probability : 0) : 1; jumps[k] = carry * stay; carry *= (1 - stay); g++; }
      var rows = [[G.t('Останется', 'Stays') + ' ' + qchip(base), 1 - P], ['↑1 → ' + qchip(Q[qi + 1]), P * jumps[0]], ['↑2 → ' + qchip(Q[qi + 2]), P * jumps[1]], ['↑3 → ' + qchip(Q[qi + 3]) + ' ' + G.t('и выше', 'or higher'), P * jumps[2]]]
        .filter(function (r, i) { return i === 0 || Q[qi + i]; });
      var m = mod(tier), one = tier * 10 * np;   // what the in-game tooltip shows: "Quality: +2.04%" for module 1 on normal
      var mods = M.map(function (x) {
        return '<button class="qm-btn' + (x.tier === tier ? ' on' : '') + '" data-t="' + x.tier + '" data-tip-ru="' + G.esc(x.ru) + '" data-tip-en="' + G.esc(x.en) + '"><img src="' + G.icon(x.icon) + '" alt=""><b>+' + G.fmt(x.tier * 10 * np, { maximumFractionDigits: 2 }) + '%</b></button>';
      }).join('');
      var slots = '';
      for (var i = 0; i < 8; i++) slots += '<span class="qm-slot' + (i < count ? ' on' : '') + '" data-n="' + (i + 1) + '">' + (m ? '<img src="' + G.icon(m.icon) + '" alt="">' : '') + '</span>';
      var speed = Math.max(20, 100 - 20 * count);
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon('module__quality-module-3') + '" alt="">' + G.t('Калькулятор качества', 'Quality calculator') + '</div>' +
        '<div class="qm-lbl">' + G.t('Модуль качества', 'Quality module') + ': <b>' + G.esc(m ? G.t(m.ru, m.en) : tier) + '</b> — ' + G.t('в игре «Качество: +', 'in game “Quality: +') + G.fmt(one, { maximumFractionDigits: 2 }) + G.t('%» для ингредиентов «', '%” for “') + G.esc(G.nm(base)) + G.t('»', '” ingredients') + '</div>' +
        '<div class="qm-row">' + mods + '</div>' +
        '<div class="qm-lbl">' + G.t('Модулей в машине', 'Modules in the machine') + ': <b>' + count + '</b> <span class="muted">(' + G.t('скорость машины', 'machine speed') + ' ' + speed + '%) · ' + G.t('наведите на слот', 'hover a slot') + '</span></div>' +
        '<div class="qm-slots" title="">' + slots + '</div>' +
        '<div class="qc-form"><label>' + G.t('Качество ингредиентов', 'Ingredient quality') + ' <select class="fsel" data-q>' + Q.map(function (q, i) { return '<option value="' + i + '" ' + (i === qi ? 'selected' : '') + '>' + G.esc(G.nm(q)) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + G.t('Режим', 'Mode') + ' <select class="fsel" data-m>' + [['I · 1 бросок', 'I · 1 roll'], ['II · 3 броска', 'II · 3 rolls'], ['III · 10 бросков', 'III · 10 rolls']].map(function (x, i) { return '<option value="' + i + '" ' + (i === mode ? 'selected' : '') + '>' + G.t(x[0], x[1]) + '</option>'; }).join('') + '</select></label></div>' +
        '<div class="qc-big"><span>' + G.t('Шанс повышения за операцию', 'Upgrade chance per operation') + '</span><b>' + G.fmt(P * 100, { maximumFractionDigits: 2 }) + '%</b><small>= ' + count + ' × ' + G.fmt(one, { maximumFractionDigits: 2 }) + '%' + (rolls > 1 ? ' → 1 − (1 − p)<sup>' + rolls + '</sup>' : '') + '</small></div>' +
        '<div class="qm-res">' + rows.map(function (r) { return '<div class="sl-row"><span class="sl-q">' + r[0] + '</span><span class="sl-bar"><i style="width:' + (r[1] * 100) + '%"></i></span><b>' + G.fmt(r[1] * 100, { maximumFractionDigits: 2 }) + '%</b></div>'; }).join('') + '</div>' +
        '<p class="muted small-note">' + G.t('Каждый модуль качества замедляет машину на 20% (но не ниже 20% скорости). Режимы II и III повышают шанс за операцию, но операций становится в 5 и 20 раз меньше.', 'Each quality module slows a machine by 20% (but not below 20% speed). Modes II and III raise the chance per operation, but there are 5 and 20 times fewer operations.') + '</p>';
      el.querySelectorAll('.qm-btn').forEach(function (b) { b.onclick = function () { tier = +b.getAttribute('data-t'); render(); }; });
      el.querySelectorAll('.qm-slot').forEach(function (sl) { sl.onmouseenter = sl.onclick = function () { var n = +sl.getAttribute('data-n'); if (n !== count) { count = n; render(); } }; });
      el.querySelector('[data-q]').onchange = function () { qi = +this.value; render(); };
      el.querySelector('[data-m]').onchange = function () { mode = +this.value; render(); };
    }
    render(); G.onLang(render);
  });

  /* ---------------- qc-loop (animated SVG) ---------------- */
  /* qc-loop: production → control post → accepted; defects go down to the refinement workshop and come back.
     Real belt tile (assets/static/ui/belt-tile.png, animated pattern) and inserter icons; dots = item quality. */
  G.widget('qc-loop', function (el) {
    function A(f) { return G.asset('assets/sprites/' + f); }
    function I(f) { return G.asset('assets/icons/' + f); }
    function belt(x, y, len, rot) {
      // a belt piece drawn horizontally in its own frame; rot 0 = to the right, 90 = down, -90 = up
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ')"><rect x="0" y="-13" width="' + len + '" height="26" fill="url(#qcl-belt)"/></g>';
    }
    function ins(x, y) { return '<image href="' + I('inserter__inserter.webp') + '" x="' + x + '" y="' + y + '" width="30" height="30"/>'; }
    function render() {
      el.innerHTML = '<svg class="qcl" viewBox="0 60 900 300" role="img">' +
        '<defs><pattern id="qcl-belt" patternUnits="userSpaceOnUse" width="26" height="26" x="0" y="-13">' +
        '<image href="' + G.asset('assets/static/ui/belt-tile.png') + '" x="-26" y="0" width="26" height="26" preserveAspectRatio="none" transform="scale(-1 1)"/>' +
        '<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="26 0" dur="0.9s" repeatCount="indefinite"/></pattern></defs>' +
        belt(166, 145, 206, 0) + belt(564, 145, 188, 0) + belt(440, 197, 58, 90) + belt(496, 255, 58, -90) +
        '<path id="qp1" d="M166 145 L372 145" fill="none"/><path id="qp2" d="M564 145 L752 145" fill="none"/>' +
        '<path id="qp3" d="M440 197 L440 255" fill="none"/><path id="qp4" d="M496 255 L496 197" fill="none"/>' +
        '<image href="' + A('assembling-machine-1.webp') + '" x="20" y="92" width="110" height="110"/>' +
        '<image href="' + A('ic-control-post.webp') + '" x="408" y="95" width="120" height="100"/>' +
        '<image href="' + A('ic-refine-workshop.webp') + '" x="408" y="256" width="120" height="96"/>' +
        '<image href="' + I('item__iron-chest.webp') + '" x="790" y="117" width="56" height="56"/>' +
        ins(134, 130) + ins(374, 130) + ins(532, 130) + ins(756, 130) +
        dots() +
        '<text x="75" y="228" class="qcl-t">' + G.t('Производство', 'Production') + '</text>' +
        '<text x="468" y="82" class="qcl-t">' + G.t('Контрольный пост', 'Control post') + '</text>' +
        '<text x="545" y="310" class="qcl-t l">' + G.t('Мастерская доводки', 'Refinement workshop') + '</text>' +
        '<text x="818" y="198" class="qcl-t">' + G.t('Годное', 'Accepted') + '</text>' +
        '<text x="658" y="118" class="qcl-s">' + G.t('дальше: обычное качество', 'onward: normal quality') + '</text>' +
        '<text x="420" y="231" class="qcl-s r">' + G.t('брак', 'defects') + '</text>' +
        '<text x="516" y="231" class="qcl-s l">' + G.t('после доводки', 'refined') + '</text>' +
        '</svg>';
    }
    function dots() {
      var Q = quals(), cols = [-5, -4, -3, -2, -1].map(function (g) { return G.qColor(Q[5 + g]); });
      var s = '';
      for (var k = 0; k < 6; k++) s += '<circle r="7" fill="' + cols[k % 5] + '" stroke="#000"><animateMotion dur="3s" begin="' + (k * 0.5) + 's" repeatCount="indefinite"><mpath href="#qp1"/></animateMotion></circle>';
      for (k = 0; k < 4; k++) s += '<circle r="7" fill="#e6e6e6" stroke="#000"><animateMotion dur="3s" begin="' + (k * 0.75) + 's" repeatCount="indefinite"><mpath href="#qp2"/></animateMotion></circle>';
      for (k = 0; k < 2; k++) s += '<circle r="6" fill="' + cols[k] + '" stroke="#000"><animateMotion dur="1.6s" begin="' + (k * 0.8) + 's" repeatCount="indefinite"><mpath href="#qp3"/></animateMotion></circle>';
      for (k = 0; k < 2; k++) s += '<circle r="6" fill="' + cols[k + 3] + '" stroke="#000"><animateMotion dur="1.6s" begin="' + (k * 0.8 + 0.4) + 's" repeatCount="indefinite"><mpath href="#qp4"/></animateMotion></circle>';
      return s;
    }
    render(); G.onLang(render);
  });
})(window.Guide);
