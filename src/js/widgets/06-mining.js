/* Chapter 06 widgets (mining).
   ore-fluids    : ore → mining fluid, infinite cluster → acid (records.resources)
   field-survey  : procedural RSO-like field shapes on a canvas + survey card (shape names and signatures from RSO-reforged changelog 9.2.0)
   drill-compare : mining speed and area of drills (records.drills) */
(function (G) {
  function R() { return G.data.records; }
  function C(key, fb) { return (G.data.icon_colors || {})[key] || fb; }
  function lighten(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, r + (255 - r) * k); g = Math.min(255, g + (255 - g) * k); b = Math.min(255, b + (255 - b) * k);
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  G.widget('ore-fluids', function (el) {
    function render() {
      var res = {}; R().resources.forEach(function (r) { res[r.id] = r; });
      var ores = ['coal', 'angels-ore1', 'angels-ore2', 'angels-ore3', 'angels-ore4', 'angels-ore5', 'angels-ore6'];
      el.innerHTML = '<div class="panel-title">' + G.bi('Чем поливать бур', 'What to feed the drill') + '</div><table class="ftable"><tr><th>' + G.bi('Руда', 'Ore') + '</th><th>' + G.bi('Обычное поле', 'Regular field') + '</th><th>' + G.bi('Бесконечный кластер', 'Infinite cluster') + '</th></tr>' +
        ores.map(function (id) {
          var r = res[id], inf = res['infinite-' + id];
          if (!r) return '';
          var f = r.fluid ? '<img class="ic" src="' + G.icon(r.fluid_icon) + '" alt="">' + G.esc(G.t(r.fluid_ru, r.fluid_en)) : '<span class="muted">' + G.t('без жидкости', 'no fluid') + '</span>';
          var fi = inf ? (inf.fluid ? '<img class="ic" src="' + G.icon(inf.fluid_icon) + '" alt="">' + G.esc(G.t(inf.fluid_ru, inf.fluid_en)) : '<span class="muted">' + G.t('без жидкости', 'no fluid') + '</span>') : '—';
          return '<tr><td>' + G.iconImg(r) + ' ' + G.esc(G.nm(r)) + '</td><td>' + f + '</td><td>' + fi + '</td></tr>';
        }).join('') + '</table>';
    }
    render(); G.onLang(render);
  });

  /* ---------------- field-survey ---------------- */
  var SHAPES = {
    blob: ['пятно', 'blob'], diamond: ['ромб', 'diamond'], ring: ['кольцо', 'ring'], crescent: ['серп', 'crescent'], seam: ['пласт', 'seam'],
    specks: ['крапинки', 'specks'], archipelago: ['архипелаг', 'archipelago'], star: ['звезда', 'star'], chain: ['цепочка вдоль разлома', 'chain along a fault'], cluster: ['гроздь скважин', 'well cluster']
  };
  var SIGN = { coal: ['seam'], 'angels-ore5': ['specks'], 'angels-ore4': ['diamond'], 'angels-ore1': ['star', 'diamond'], 'angels-ore2': ['crescent'], 'angels-ore6': ['archipelago'], 'angels-ore3': ['archipelago'] };
  function hash(x, y, s) { var h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  G.widget('field-survey', function (el) {
    var surveys = 0, last = null;
    el.innerHTML = '<div class="fsv"><canvas width="560" height="380"></canvas><div class="fsv-card deep"></div></div><div class="wbar"><button class="fbtn go" data-go>' + G.bi('⛏ Провести разведку', '⛏ Run a survey') + '</button>' +
      '<select class="fsel" data-ore></select><span class="muted">' + G.bi('Форма, руда и особенности — случайны; правила — как у RSO Reforged.', 'Shape, ore and features are random; the rules follow RSO Reforged.') + '</span></div>';
    var cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), card = el.querySelector('.fsv-card'), sel = el.querySelector('[data-ore]');
    var ores = R().resources.filter(function (r) { return !r.infinite || /^(crude-oil|angels-natural-gas|angels-fissure)$/.test(r.id); }).filter(function (r) { return r.id !== 'angels-sea-pump-resource'; });
    function fillSel() { sel.innerHTML = '<option value="">' + G.t('Случайная руда', 'Random ore') + '</option>' + ores.map(function (r) { return '<option value="' + r.id + '">' + G.esc(G.nm(r)) + '</option>'; }).join(''); }
    fillSel();
    function pickShape(ore) {
      if (/crude-oil|natural-gas|fissure/.test(ore.id)) return Math.random() < (ore.id === 'angels-fissure' ? 0.7 : 0.3) ? 'chain' : 'cluster';
      var sig = SIGN[ore.id];
      if (sig && Math.random() < 0.55) return sig[Math.floor(Math.random() * sig.length)];
      var all = ['blob', 'blob', 'diamond', 'ring', 'crescent', 'seam', 'specks', 'archipelago', 'star'];
      return all[Math.floor(Math.random() * all.length)];
    }
    function inside(shape, x, y, P) {
      var r = Math.sqrt(x * x + y * y), th = Math.atan2(y, x), n = vnoise(x * 3 + P.s, y * 3, P.s) - 0.5;
      switch (shape) {
        case 'blob': return r < 0.62 + n * 0.5;
        case 'diamond': return Math.abs(x) * 0.9 + Math.abs(y) * 1.2 < 0.7 + n * 0.25;
        case 'ring': return Math.abs(r - 0.55) < 0.14 + n * 0.12;
        case 'crescent': return r < 0.68 + n * 0.25 && Math.sqrt(Math.pow(x - 0.32, 2) + Math.pow(y + 0.1, 2)) > 0.55 + n * 0.2;
        case 'seam': var yy = y - 0.35 * Math.sin(x * 2.3 + P.s) - 0.15 * x; return Math.abs(yy) < 0.1 + n * 0.08 && Math.abs(x) < 0.95;
        case 'star': var k = P.k, m = Math.pow(Math.abs(Math.cos(k * (th + P.s) / 2)), 3); return r < 0.25 + 0.55 * m + n * 0.2;
        case 'specks': for (var i = 0; i < P.pts.length; i++) { var p = P.pts[i]; if (Math.pow(x - p[0], 2) + Math.pow(y - p[1], 2) < p[2] * p[2] * (1 + n)) return true; } return false;
        case 'archipelago': for (i = 0; i < P.isl.length; i++) { p = P.isl[i]; if (Math.pow(x - p[0], 2) + Math.pow(y - p[1], 2) < p[2] * p[2] * (1 + n * 1.2)) return true; } return false;
        case 'chain': for (i = 0; i < P.wells.length; i++) { p = P.wells[i]; if (Math.pow(x - p[0], 2) + Math.pow(y - p[1], 2) < 0.0025) return true; } return false;
        case 'cluster': for (i = 0; i < P.wells.length; i++) { p = P.wells[i]; if (Math.pow(x - p[0], 2) + Math.pow(y - p[1], 2) < 0.0025) return true; } return false;
      }
      return false;
    }
    function survey() {
      var ore = sel.value ? ores.filter(function (o) { return o.id === sel.value; })[0] : ores[Math.floor(Math.random() * ores.length)];
      var shape = pickShape(ore), s = Math.random() * 100;
      var P = { s: s, k: 4 + Math.floor(Math.random() * 3), pts: [], isl: [], wells: [] };
      for (var i = 0; i < 26; i++) P.pts.push([(Math.random() - .5) * 1.6, (Math.random() - .5) * 1.4, 0.04 + Math.random() * 0.06]);
      for (i = 0; i < 6; i++) P.isl.push([(Math.random() - .5) * 1.3, (Math.random() - .5) * 1.1, 0.12 + Math.random() * 0.12]);
      if (shape === 'chain') { var a = Math.random() * Math.PI; for (i = 0; i < 9; i++) { var t = (i - 4) * 0.18; P.wells.push([Math.cos(a) * t + (Math.random() - .5) * .06, Math.sin(a) * t + (Math.random() - .5) * .06]); } }
      if (shape === 'cluster') for (i = 0; i < 8; i++) P.wells.push([(Math.random() - .5) * 0.7, (Math.random() - .5) * 0.6]);
      var grade = Math.random(), gname = grade < .3 ? ['бедное', 'poor', '#9a9a9a'] : grade < .78 ? ['среднее', 'average', '#ffd25a'] : ['богатое', 'rich', '#ffa020'];
      var vein = !/chain|cluster/.test(shape) && Math.random() < 0.25, core = !/chain|cluster/.test(shape) && Math.random() < 0.18, guard = Math.random() < (vein || core ? 0.85 : 0.3);
      last = { ore: ore, shape: shape, P: P, gname: gname, vein: vein, core: core, guard: guard };
      paint(); surveys++;
      if (surveys === 10) G.achieve('geologist', 'Геолог-любитель', 'Amateur geologist', G.icon('technology__ore-radar'), 'Провести 10 разведок', 'Run 10 surveys');
    }
    function paint() {
      if (!last) return;
      var L = last, W = cv.width, H = cv.height, base = L.ore.map_color || C(L.ore.icon, '#888'), tile = 5;
      ctx.fillStyle = '#2b2419'; ctx.fillRect(0, 0, W, H);
      for (var gx = 0; gx < W; gx += tile) for (var gy = 0; gy < H; gy += tile) {
        var nx = (gx - W / 2) / (H / 2), ny = (gy - H / 2) / (H / 2), soil = vnoise(gx / 40, gy / 40, 9);
        ctx.fillStyle = 'rgba(' + (60 + soil * 30 | 0) + ',' + (48 + soil * 22 | 0) + ',' + (32 + soil * 10 | 0) + ',1)'; ctx.fillRect(gx, gy, tile, tile);
        if (inside(L.shape, nx, ny, L.P)) {
          var rich = 0.25 + 0.6 * vnoise(nx * 6, ny * 6, L.P.s + 3);
          if (L.vein && Math.abs(ny - 0.15 * Math.sin(nx * 3 + L.P.s)) < 0.06) rich = 1.1;
          var core = L.core && nx * nx + ny * ny < 0.03;
          ctx.fillStyle = core ? '#9cff7a' : lighten(base, Math.min(.7, rich * .4 - .05));
          ctx.fillRect(gx, gy, tile - 1, tile - 1);
        }
      }
      if (L.guard) { var img = new Image(); img.onload = function () { ctx.drawImage(img, W * 0.78, H * 0.08, 64, 64); }; img.src = G.icon('unit-spawner__biter-spawner'); }
      card.innerHTML = '<div class="tt-title"><img src="' + G.icon(L.ore.icon) + '" alt="" style="width:40px;height:40px">' + G.esc(G.nm(L.ore)) + '</div>' +
        '<p>' + G.t('Форма', 'Shape') + ': <b>' + G.t(SHAPES[L.shape][0], SHAPES[L.shape][1]) + '</b>' + (SIGN[L.ore.id] && SIGN[L.ore.id].indexOf(L.shape) >= 0 ? ' <span class="badge">' + G.t('фирменная', 'signature') + '</span>' : '') + '</p>' +
        '<p>' + G.t('Оценка', 'Grade') + ': <b style="color:' + L.gname[2] + '">' + G.t(L.gname[0], L.gname[1]) + '</b></p>' +
        '<p>' + (L.vein ? '💎 ' + G.t('богатая жила', 'rich vein') + '<br>' : '') + (L.core ? '♾ ' + G.t('бесконечное ядро', 'infinite core') + '<br>' : '') + (L.guard ? '<span style="color:#ff8a7a">☠ ' + G.t('под охраной гнезда', 'guarded by a nest') + '</span>' : '<span class="muted">' + G.t('охраны не видно… пока', 'no guards in sight… yet') + '</span>') + '</p>';
    }
    el.querySelector('[data-go]').onclick = survey;
    survey();
    G.onLang(function () { fillSel(); paint(); });
  });

  G.widget('drill-compare', function (el) {
    function render() {
      var D = R().drills.filter(function (d) { return /mining-drill/.test(d.id); }).sort(function (a, b) { return a.speed - b.speed; });
      var maxS = Math.max.apply(null, D.map(function (d) { return d.speed; }));
      el.innerHTML = '<table class="ftable"><tr><th>' + G.bi('Бур', 'Drill') + '</th><th>' + G.bi('Скорость', 'Speed') + '</th><th>' + G.bi('Площадь', 'Area') + '</th><th>' + G.bi('Питание', 'Power') + '</th></tr>' +
        D.map(function (d) {
          var side = Math.round(d.radius * 2);
          return '<tr><td>' + G.iconImg(d) + ' ' + G.esc(G.nm(d)) + '</td><td><span class="ws-bar p"><i style="width:' + (d.speed / maxS * 100) + '%"></i><em>×' + G.fmt(d.speed) + '</em></span></td>' +
            '<td><span class="dc-area"><i style="width:' + side * 3 + 'px;height:' + side * 3 + 'px"></i>' + side + '×' + side + '</span></td><td class="n">' + (d.source === 'burner' ? G.t('топливо', 'fuel') : G.fmt(d.power_w / 1e3) + ' ' + G.t('кВт', 'kW')) + '</td></tr>';
        }).join('') + '</table>';
    }
    render(); G.onLang(render);
  });
})(window.Guide);
