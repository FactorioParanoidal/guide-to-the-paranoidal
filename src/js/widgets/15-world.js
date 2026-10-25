/* Chapter 15 widgets (world).
   season-dial : 24-day year; solar 50–100% and night brightness 5–15% by season (NightBrightness README ranges; the curve shape is an illustration)
   smog-scene  : pollution slider over a small base scene (illustration of visible smog, solar penalty and toxic damage)
   ruins-map   : random map with the ruin counts from AbandonedRuins-paranoidal (87 small, 57 medium, 26 large + 150 base) */
(function (G) {
  G.widget('season-dial', function (el) {
    var day = 0, t = 0.5, playing = true;
    el.innerHTML = '<div class="sd"><svg viewBox="0 0 240 240" class="sd-ring"></svg><div class="sd-info"></div></div><canvas class="sd-day" width="600" height="70"></canvas><div class="wbar"><input class="frange" type="range" min="0" max="23.99" step="0.01" data-d style="flex:1"><button class="fbtn" data-p>⏯</button></div>';
    var ring = el.querySelector('.sd-ring'), info = el.querySelector('.sd-info'), cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), rng = el.querySelector('[data-d]');
    function season(d) { return (1 + Math.cos(2 * Math.PI * d / 24)) / 2; }
    function bright(s, x) { // x: time of day 0..1, 0 = noon (Factorio convention)
      var tilt = (s - 0.5) * 0.3, dusk = 0.2 + tilt / 2, eve = 0.3 + tilt / 2, morn = 0.7 - tilt / 2, dawn = 0.8 - tilt / 2, night = 0.05 + 0.10 * s;
      if (x < dusk || x > dawn) return 1;
      if (x < eve) return 1 - (1 - night) * (x - dusk) / (eve - dusk);
      if (x < morn) return night;
      return night + (1 - night) * (x - morn) / (dawn - morn);
    }
    function draw() {
      var s = season(day), solar = 0.5 + 0.5 * s, night = 0.05 + 0.1 * s;
      var names = [['Лето', 'Summer'], ['Осень', 'Autumn'], ['Зима', 'Winter'], ['Весна', 'Spring']], si = Math.floor(((day + 3) % 24) / 6);
      var svg = '<circle cx="120" cy="120" r="92" fill="none" stroke="#000" stroke-width="22"/>';
      for (var i = 0; i < 24; i++) { var a = i / 24 * 2 * Math.PI - Math.PI / 2, sv = season(i), c = 'hsl(' + (40 * sv + 200 * (1 - sv)) + ',70%,' + (35 + 25 * sv) + '%)'; svg += '<path d="' + arc(120, 120, 92, a, a + 2 * Math.PI / 24 - 0.03) + '" stroke="' + c + '" stroke-width="20" fill="none"/>'; }
      var pa = day / 24 * 2 * Math.PI - Math.PI / 2;
      svg += '<line x1="120" y1="120" x2="' + (120 + 70 * Math.cos(pa)) + '" y2="' + (120 + 70 * Math.sin(pa)) + '" stroke="#ffa020" stroke-width="4"/><circle cx="120" cy="120" r="8" fill="#ffa020"/>';
      svg += '<text x="120" y="24" class="sd-t">' + G.t('лето', 'summer') + '</text><text x="120" y="226" class="sd-t">' + G.t('зима', 'winter') + '</text>';
      ring.innerHTML = svg;
      info.innerHTML = '<div class="out">' + G.t(names[si][0], names[si][1]) + '</div><p>' + G.t('День года', 'Day of year') + ': <b>' + (Math.floor(day) + 1) + ' / 24</b></p><p>' + G.t('Выработка солнца', 'Solar output') + ': <b>' + Math.round(solar * 100) + '%</b></p><p>' + G.t('Яркость ночи', 'Night brightness') + ': <b>' + Math.round(night * 100) + '%</b></p>';
      var W = cv.width, H = cv.height;
      for (var x = 0; x < W; x++) { var tod = (x / W + 0.5) % 1, b = bright(s, tod); ctx.fillStyle = 'rgb(' + Math.round(20 + 220 * b) + ',' + Math.round(22 + 180 * b) + ',' + Math.round(40 + 120 * b) + ')'; ctx.fillRect(x, 0, 1, H); }
      var cx = ((t + 0.5) % 1) * W; ctx.fillStyle = '#ffa020'; ctx.fillRect(cx - 1, 0, 3, H);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = '12px Lilittium, sans-serif'; ctx.fillText(G.t('полночь', 'midnight'), 4, H - 6); ctx.fillText(G.t('полдень', 'noon'), W / 2 - 20, H - 6);
      rng.value = day;
    }
    function arc(cx, cy, r, a0, a1) { return 'M' + (cx + r * Math.cos(a0)) + ' ' + (cy + r * Math.sin(a0)) + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r * Math.cos(a1)) + ' ' + (cy + r * Math.sin(a1)); }
    rng.oninput = function () { day = +this.value; playing = false; draw(); };
    el.querySelector('[data-p]').onclick = function () { playing = !playing; };
    (function loop() { if (!document.body.contains(el)) return; if (playing) { t = (t + 0.004) % 1; day = (day + 0.02) % 24; } draw(); setTimeout(function () { requestAnimationFrame(loop); }, 60); })();
    G.onLang(draw);
  });

  G.widget('smog-scene', function (el) {
    var p = 300; // pollution in the chunk; visible-pollutants defaults: shown from 60 to 1000, solar occlusion up to −50%
    function render() {
      var k = Math.max(0, Math.min(1, (p - 60) / 940)), solar = Math.round(100 - 50 * Math.pow(k, 0.4) * (p > 60 ? 1 : 0)), toxic = k > 0.45;
      el.innerHTML = '<div class="ss"><div class="ss-ground"></div><img class="ss-a" src="assets/sprites/assembling-machine-1.webp" alt=""><img class="ss-b" src="assets/sprites/boiler.webp" alt=""><img class="ss-c" src="assets/sprites/steam-engine.webp" alt=""><img class="ss-p" src="assets/sprites/character.webp" alt="">' +
        '<div class="ss-fog" style="opacity:' + (k * 0.92) + '"></div><div class="ss-fog f2" style="opacity:' + (k * 0.7) + '"></div>' + (toxic ? '<div class="ss-hurt">−HP</div>' : '') + '</div>' +
        '<div class="qc-form" style="grid-template-columns:1fr"><label>' + G.t('Загрязнение в чанке', 'Pollution in the chunk') + ': <b>' + G.fmt(p) + '</b><input class="frange" type="range" min="0" max="1200" step="10" value="' + p + '" data-s></label></div>' +
        '<div class="stats-row"><div class="stat"><span class="v">' + solar + '%</span><span class="l">' + G.t('солнце под смогом', 'sun under smog') + '</span></div><div class="stat"><span class="v" style="color:' + (toxic ? '#ff5a4a' : '#8de06a') + '">' + (toxic ? G.t('урон', 'damage') : G.t('терпимо', 'tolerable')) + '</span><span class="l">' + G.t('персонаж без брони', 'character without armor') + '</span></div></div>' +
        '<p class="muted small-note">' + G.t('По умолчанию смог виден от 60 единиц загрязнения и густеет до 1000; солнце под смогом теряет до 50%. Порог урона для персонажа здесь условный — точный задаётся настройкой мода.', 'By default smog shows from 60 pollution and thickens up to 1000; solar loses up to 50% under smog. The damage threshold here is illustrative; the exact one is a mod setting.') + '</p>';
      el.querySelector('[data-s]').oninput = function () { p = +this.value; render(); };
    }
    render(); G.onLang(render);
  });

  G.widget('ruins-map', function (el) {
    function render() {
      var W = 520, H = 360, s = '', counts = [[87, 8, '#ffa020'], [57, 16, '#ffa020'], [26, 32, '#ff5a1f'], [150, 12, '#79a6d6']];
      s += '<rect width="' + W + '" height="' + H + '" fill="#2b2419"/>';
      s += '<rect x="' + (W / 2 - 40) + '" y="' + (H / 2 - 40) + '" width="80" height="80" fill="rgba(124,207,90,.15)" stroke="#7ccf5a" stroke-dasharray="4 3"/><text x="' + W / 2 + '" y="' + (H / 2 + 4) + '" class="rm-t">' + G.t('старт', 'start') + '</text>';
      counts.forEach(function (c) {
        for (var i = 0; i < c[0] / 2; i++) {
          var x, y; do { x = Math.random() * (W - 10); y = Math.random() * (H - 10); } while (Math.abs(x - W / 2) < 50 && Math.abs(y - H / 2) < 50);
          var sz = c[1] / 3.2 + 2, danger = Math.random() < 0.08;
          s += '<rect x="' + x + '" y="' + y + '" width="' + sz + '" height="' + sz + '" fill="' + c[2] + '" opacity=".85"/>' + (danger ? '<text x="' + (x + sz + 1) + '" y="' + (y + sz) + '" class="rm-d">☠</text>' : '');
        }
      });
      el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rm">' + s + '</svg><div class="chips"><span class="chip"><i style="background:#ffa020"></i>87 ' + G.t('малых 8×8', 'small 8×8') + '</span><span class="chip"><i style="background:#ffa020"></i>57 ' + G.t('средних 16×16', 'medium 16×16') + '</span><span class="chip"><i style="background:#ff5a1f"></i>26 ' + G.t('больших 32×32', 'large 32×32') + '</span><span class="chip"><i style="background:#79a6d6"></i>150 ' + G.t('классических', 'classic') + '</span></div>' +
        '<div class="wbar"><button class="fbtn" data-r>' + G.t('↻ Другая карта', '↻ Another map') + '</button><span class="muted">' + G.t('Половина руин каждого вида на условной карте; ☠ — опасные.', 'Half of each ruin kind on a mock map; ☠ marks dangerous ones.') + '</span></div>';
      el.querySelector('[data-r]').onclick = render;
    }
    render(); G.onLang(render);
  });
})(window.Guide);
