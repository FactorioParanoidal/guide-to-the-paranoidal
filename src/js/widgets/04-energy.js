/* Chapter 04 widgets (power & efficiency).
   kpd-calc     : installation × fuel × count → fuel per minute, losses, pollution; vs vanilla 100%
   boiler-ladder: solid and liquid boiler tiers with efficiency gauges, steam temperature, smog per MW
   wind-sim     : live wind using the Wind-Turbines-Reforged formula (README) and the three turbine tiers */
(function (G) {
  function R() { return G.data.records; }
  function mw(w) { return G.fmt(w / 1e6, { maximumFractionDigits: 2 }); }

  G.widget('kpd-calc', function (el) {
    var solidKinds = ['boiler', 'bob-boiler-2', 'bob-boiler-3', 'bob-boiler-4', 'bob-boiler-5', 'bi-bio-boiler'];
    var inst = [];
    R().boilers.forEach(function (b) {
      if (b.source === 'burner' && solidKinds.indexOf(b.id) >= 0) inst.push({ r: b, kind: 'solid', eff: b.effectivity, p: b.power_w, pol: b.pollution });
      if (b.source === 'fluid') inst.push({ r: b, kind: 'fluid', eff: b.effectivity, p: b.power_w, pol: b.pollution });
    });
    R().burner_generators.forEach(function (b) { if (b.id !== 'torch') inst.push({ r: b, kind: 'solid', eff: b.effectivity, p: b.power_w, pol: b.pollution }); });
    R().generators.forEach(function (g) { if (g.burns_fluid) inst.push({ r: g, kind: 'fluid', eff: g.effectivity, p: g.power_w, pol: g.pollution }); });
    var solid = R().fuels_solid.filter(function (f) { return (f.category === 'chemical' || f.category === 'processed-chemical') && f.mj >= 1 && f.mj < 1000 && !/chest|pole|pipe|fence|turret|artifact/.test(f.id); });
    var fluid = R().fuels_fluid;
    var ii = 0, fi = solid.map(function (f) { return f.id; }).indexOf('coal'), n = 1;
    function fuels() { return inst[ii].kind === 'solid' ? solid : fluid; }
    function render() {
      var I = inst[ii], F = fuels()[fi] || fuels()[0];
      var P = I.p * n, eff = I.eff || 1, Pin = P / eff;
      var fv = I.kind === 'solid' ? F.mj * 1e6 : F.kj * 1e3;
      var perMin = Pin / fv * 60, vanillaPerMin = P / fv * 60;
      var pol = (I.pol || 0) * (F.emissions || 1) * n;
      var unit = I.kind === 'solid' ? G.t('шт.', 'pcs') : G.t('ед.', 'units');
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon(I.r.icon) + '" alt="">' + G.t('Калькулятор КПД', 'Efficiency calculator') + '</div>' +
        '<div class="qc-form"><label>' + G.t('Установка', 'Installation') + '<select class="fsel" data-i>' + inst.map(function (x, i) { return '<option value="' + i + '" ' + (i === ii ? 'selected' : '') + '>' + G.esc(G.nm(x.r)) + ' — ' + G.fmt(x.eff * 100) + '%</option>'; }).join('') + '</select></label>' +
        '<label>' + G.t('Топливо', 'Fuel') + '<select class="fsel" data-f>' + fuels().map(function (f, i) { return '<option value="' + i + '" ' + (f === F ? 'selected' : '') + '>' + G.esc(G.nm(f)) + ' — ' + (I.kind === 'solid' ? G.fmt(f.mj) + ' ' + G.t('МДж', 'MJ') : G.fmt(f.kj) + ' ' + G.t('кДж', 'kJ')) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + G.t('Сколько штук', 'How many') + ' <b>' + n + '</b><input class="frange" type="range" min="1" max="40" value="' + n + '" data-n></label>' +
        '<label>' + G.t('Полезная мощность', 'Useful power') + '<b class="out">' + mw(P) + ' ' + G.t('МВт', 'MW') + '</b></label></div>' +
        '<div class="kc-flow"><div class="kc-in">' + G.t('Сгорает', 'Burned') + ' <b>' + mw(Pin) + ' ' + G.t('МВт', 'MW') + '</b></div><div class="kc-bar"><i class="u" style="width:' + (eff * 100) + '%">' + G.fmt(eff * 100) + '% ' + G.t('в дело', 'useful') + '</i><i class="l" style="width:' + ((1 - eff) * 100) + '%">' + (eff < 0.97 ? G.fmt((1 - eff) * 100) + '% ' + G.t('в трубу', 'up the chimney') : '') + '</i></div></div>' +
        '<div class="stats-row"><div class="stat"><span class="v">' + G.fmt(perMin, { maximumFractionDigits: perMin < 10 ? 1 : 0 }) + '</span><span class="l">' + G.esc(G.nm(F)) + ', ' + unit + ' ' + G.t('в минуту', 'per minute') + '</span><img class="ic" src="' + G.icon(F.icon) + '" alt=""></div>' +
        '<div class="stat"><span class="v">' + G.fmt(perMin - vanillaPerMin, { maximumFractionDigits: 1 }) + '</span><span class="l">' + G.t('из них сгорает впустую', 'of that wasted') + ' (' + G.t('при КПД 100% было бы', 'at 100% it would be') + ' ' + G.fmt(vanillaPerMin, { maximumFractionDigits: 1 }) + ')</span></div>' +
        '<div class="stat"><span class="v">' + G.fmt(pol, { maximumFractionDigits: 1 }) + '</span><span class="l">' + G.t('загрязнения в минуту (×' + G.fmt(F.emissions) + ' за топливо)', 'pollution per minute (×' + G.fmt(F.emissions) + ' for the fuel)') + '</span></div></div>';
      el.querySelector('[data-i]').onchange = function () { var k = inst[ii].kind; ii = +this.value; if (inst[ii].kind !== k) fi = 0; render(); };
      el.querySelector('[data-f]').onchange = function () { fi = +this.value; render(); G.achieve('stoker', 'Кочегар-аналитик', 'Analytical stoker', G.icon('boiler__bob-boiler-5'), 'Сравнить топливо в калькуляторе КПД', 'Compare fuels in the efficiency calculator'); };
      el.querySelector('[data-n]').oninput = function () { n = +this.value; render(); };
    }
    render(); G.onLang(render);
  });

  G.widget('boiler-ladder', function (el) {
    var rows = [
      ['solid', ['boiler', 'bob-boiler-2', 'bob-boiler-3', 'bob-boiler-4', 'bob-boiler-5'], 'Твердотопливные котлы', 'Solid-fuel boilers'],
      ['fluid', ['oil-steam-boiler', 'oil-steam-boiler-2', 'oil-steam-boiler-3', 'oil-steam-boiler-4', 'oil-steam-boiler-5'], 'Жидкотопливные котлы', 'Liquid-fuel boilers']
    ];
    var by = {}; R().boilers.forEach(function (b) { by[b.id] = b; });
    function gauge(eff) {
      var c = 2 * Math.PI * 30, col = eff < .6 ? '#ff5a4a' : eff < .85 ? '#ffa020' : '#7ccf5a';
      return '<svg viewBox="0 0 76 76" class="bl-g"><circle cx="38" cy="38" r="30" class="bg"/><circle cx="38" cy="38" r="30" class="fg" stroke="' + col + '" stroke-dasharray="' + (c * eff) + ' ' + c + '"/><text x="38" y="44">' + Math.round(eff * 100) + '%</text></svg>';
    }
    function render() {
      el.innerHTML = rows.map(function (row) {
        return '<h4>' + G.t(row[2], row[3]) + '</h4><div class="bl-row">' + row[1].map(function (id, i) {
          var b = by[id]; if (!b) return '';
          var perMW = b.pollution / (b.power_w / 1e6);
          return '<div class="bl-card"><div class="bl-tier">' + ['I', 'II', 'III', 'IV', 'V'][i] + '</div><img class="ic-lg" src="' + G.icon(b.icon) + '" alt="" data-ru="' + G.esc(b.ru) + '" data-en="' + G.esc(b.en) + '">' + gauge(b.effectivity) +
            '<dl><dt>' + G.t('Мощность', 'Power') + '</dt><dd>' + mw(b.power_w) + ' ' + G.t('МВт', 'MW') + '</dd><dt>' + G.t('Пар', 'Steam') + '</dt><dd>' + b.target_temperature + ' °C</dd><dt>' + G.t('Смог на МВт', 'Smog per MW') + '</dt><dd>' + G.fmt(perMW, { maximumFractionDigits: 1 }) + '</dd></dl></div>';
        }).join('') + '</div>';
      }).join('') + '<p class="muted small-note">' + G.t('Смог на МВт — загрязнение в минуту на мегаватт полезной мощности при топливе с множителем ×1.', 'Smog per MW: pollution per minute per megawatt of useful power with a ×1 fuel.') + '</p>';
    }
    render(); G.onLang(render);
  });

  G.widget('wind-sim', function (el) {
    var ks = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29], x = Math.random() * 1000, t = 0, z = 0, hist = [], running = true;
    var tiers = ['texugo-wind-turbine', 'texugo-wind-turbine2', 'texugo-wind-turbine3'].map(function (k) { return G.data.records.spot[k]; }).filter(Boolean);
    el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon('technology__texugo-wind-turbine3') + '" alt="">' + G.bi('Ветер над базой', 'Wind over the base') + '</div><canvas class="wind-c" width="600" height="180"></canvas><div class="wind-now"></div><div class="wbar"><button class="fbtn" data-p>' + G.bi('⏸ Пауза', '⏸ Pause') + '</button><span class="muted">' + G.bi('1 точка = 61 тик игры', '1 point = 61 game ticks') + '</span></div>';
    var cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), now = el.querySelector('.wind-now');
    function step() {
      x += Math.random() / 2;
      var y = 1.5; ks.forEach(function (k) { y += Math.sin(x / k); });
      t = 0.99 * t + Math.random() - 0.5; z = 0.9 * z + 0.1 * t;
      var T = 14 * (y + 0.8 * z + 3), share = Math.max(0, Math.min(1, (T - 15) / 85)), speed = Math.max(0, 3 + (T - 15) * 9 / 85);
      hist.push(share); if (hist.length > 300) hist.shift();
      return { share: share, speed: speed };
    }
    for (var i = 0; i < 300; i++) step();
    function frame() {
      if (!document.body.contains(el)) return;
      var s = running ? step() : null;
      var W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#121110'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; for (var g = 0; g <= 4; g++) { ctx.beginPath(); ctx.moveTo(0, H * g / 4); ctx.lineTo(W, H * g / 4); ctx.stroke(); }
      var grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(124,207,90,.55)'); grd.addColorStop(1, 'rgba(124,207,90,.03)');
      ctx.beginPath(); ctx.moveTo(0, H);
      hist.forEach(function (v, i) { ctx.lineTo(i / 299 * W, H - v * (H - 8)); });
      ctx.lineTo(W, H); ctx.closePath(); ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath(); hist.forEach(function (v, i) { var X = i / 299 * W, Y = H - v * (H - 8); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.strokeStyle = '#8de06a'; ctx.lineWidth = 2; ctx.stroke();
      if (s) {
        now.innerHTML = '<b class="out">' + G.fmt(s.speed, { maximumFractionDigits: 1 }) + ' ' + G.t('м/с', 'm/s') + '</b> · ' + G.t('доля мощности', 'power share') + ' <b>' + Math.round(s.share * 100) + '%</b><br>' +
          tiers.map(function (r, i) { return '<span class="chip"><img class="ic" src="' + G.icon(r.icon) + '" alt="">T' + (i + 1) + ': ' + G.fmt(r.production_w * s.share / 1e3, { maximumFractionDigits: 0 }) + ' ' + G.t('кВт', 'kW') + '</span>'; }).join(' ');
      }
      setTimeout(function () { requestAnimationFrame(frame); }, 120);
    }
    el.querySelector('[data-p]').onclick = function () { running = !running; };
    frame();
  });
})(window.Guide);
