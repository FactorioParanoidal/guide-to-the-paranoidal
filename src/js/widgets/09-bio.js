/* Chapter 09 widgets (biology).
   puffer-breeding : egg lottery from records.puffer_breeding (real probabilities from recipes)
   green-machines  : machines with negative pollution (records.absorbers), log bars */
(function (G) {
  G.widget('puffer-breeding', function (el) {
    var P = G.data.records.puffer_breeding, pi = 0, hist = {}, spins = 0;
    function eggOuts(p) { return p.outputs.filter(function (o) { return /puffer-egg/.test(o.id); }); }
    function render(result) {
      var p = P[pi], eggs = eggOuts(p);
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon(p.icon) + '" alt="">' + G.t('Рефугиум фугу', 'Puffer refugium') + '</div>' +
        '<div class="wbar">' + P.map(function (x, i) { var e = eggOuts(x)[i] || x.outputs[0]; return '<button class="pb-b ' + (i === pi ? 'on' : '') + '" data-p="' + i + '"><img src="' + G.icon(x.outputs[0].icon) + '" alt="" data-ru="' + G.esc(x.outputs[0].ru) + '" data-en="' + G.esc(x.outputs[0].en) + '"></button>'; }).join('') + '</div>' +
        '<p class="muted">' + G.esc(G.nm(p)) + '</p>' +
        '<div class="pb-slot">' + (result ? '<img src="' + G.icon(result.icon) + '" alt=""><b>' + G.esc(G.nm(result)) + '</b>' : '<span class="muted">' + G.t('Яйцо ждёт инкубации', 'The egg awaits incubation') + '</span>') + '</div>' +
        '<div class="wbar"><button class="fbtn go" data-spin>' + G.t('🥚 Вывести', '🥚 Hatch') + '</button><button class="fbtn" data-spin10>×20</button></div>' +
        eggs.map(function (o) { var c = hist[o.id] || 0; return '<div class="sl-row vk"><span class="sl-q">' + G.iconImg(o) + G.esc(G.nm(o)) + '</span><span class="sl-bar"><i style="width:' + o.probability * 100 + '%"></i></span><b>' + Math.round(o.probability * 100) + '%' + (spins ? ' · ' + c : '') + '</b></div>'; }).join('');
      el.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { pi = +b.getAttribute('data-p'); hist = {}; spins = 0; render(); }; });
      el.querySelector('[data-spin]').onclick = function () { spin(1); };
      el.querySelector('[data-spin10]').onclick = function () { spin(20); };
    }
    function spin(n) {
      var eggs = eggOuts(P[pi]), last = null;
      for (var k = 0; k < n; k++) {
        var tot = eggs.reduce(function (a, o) { return a + o.probability; }, 0), r = Math.random() * tot, s = 0;
        for (var i = 0; i < eggs.length; i++) { s += eggs[i].probability; if (r < s) { last = eggs[i]; break; } }
        hist[last.id] = (hist[last.id] || 0) + 1; spins++;
        if (P[pi].outputs[0].id !== last.id.replace('-egg', '') && last.id !== eggs[pi].id) G.achieve('mutant', 'Генетик', 'Geneticist', G.icon(last.icon), 'Вывести фугу другой породы', 'Hatch a puffer of another breed');
      }
      render(last);
      var slot = el.querySelector('.pb-slot'); slot.classList.remove('spin'); void slot.offsetWidth; slot.classList.add('spin');
    }
    render(); G.onLang(function () { render(); });
  });

  G.widget('green-machines', function (el) {
    function render() {
      var A = G.data.records.absorbers.filter(function (a) { return !/-2$|-3$|-4$|-5$/.test(a.id) || /garden|CW-air-filter-machine-6|arboretum-3/.test(a.id); }).slice(0, 14);
      var max = Math.log10(-A[0].pollution + 1);
      el.innerHTML = '<div class="panel-title">🌳 ' + G.t('Поглощение загрязнения, единиц в минуту', 'Pollution absorbed per minute') + ' · ' + G.t('всего таких машин: ', 'machines like this in total: ') + G.data.counts.absorbers + '</div>' +
        A.map(function (a) { var v = -a.pollution; return '<div class="sl-row vk"><span class="sl-q">' + G.iconImg(a) + G.esc(G.nm(a)) + '</span><span class="sl-bar"><i style="width:' + (Math.log10(v + 1) / max * 100) + '%;background:linear-gradient(90deg,#3f8d2c,#8de06a)"></i></span><b>−' + G.fmt(v, { maximumFractionDigits: 0 }) + '</b></div>'; }).join('') +
        '<p class="muted small-note">' + G.t('Шкала логарифмическая. Огромный био-сад поглощает больше, чем дымят десятки котлов. Правда, сам по себе он тоже кое-что ест.', 'Log scale. A huge bio garden absorbs more than dozens of boilers emit. It does eat a few things itself, though.') + '</p>';
    }
    render(); G.onLang(render);
  });
})(window.Guide);
