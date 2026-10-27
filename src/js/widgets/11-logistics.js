/* Chapter 11 widgets (logistics).
   belt-race  : items travel along six belts with real relative speeds (records.belts items_per_s)
   train-race : locomotive sprites race to the finish by max speed (records.locomotives) */
(function (G) {
  G.widget('belt-race', function (el) {
    var B = G.data.records.belts.slice().sort(function (a, b) { return a.items_per_s - b.items_per_s; }), item = 'item__iron-gear-wheel';
    function render() {
      var max = B[B.length - 1].items_per_s;
      el.innerHTML = B.map(function (b) {
        var dur = 40 * (max / b.items_per_s) / 24 * 1.0; // seconds for the slowest ~40 s, fastest ~1.7 s
        var dots = ''; for (var i = 0; i < 6; i++) dots += '<img src="' + G.icon(item) + '" alt="" style="animation-duration:' + dur.toFixed(2) + 's;animation-delay:-' + (dur * i / 6).toFixed(2) + 's">';
        return '<div class="br-row"><span class="br-name">' + G.iconImg(b) + G.esc(G.nm(b)) + '</span><div class="br-belt" style="--sp:' + (0.6 * max / b.items_per_s).toFixed(2) + 's">' + dots + '</div><b>' + G.fmt(b.items_per_s) + ' ' + G.t('/с', '/s') + '</b></div>';
      }).join('') + '<p class="muted small-note">' + G.t('Скорости в анимации пропорциональны реальным. Ванильный максимум — экспресс-конвейер на 60 предметов в секунду; дальше начинается Paranoidal.', 'Animation speeds are proportional to the real ones. The vanilla maximum is the express belt at 60 items per second; beyond that is Paranoidal.') + '</p>';
    }
    render(); G.onLang(render);
  });

  G.widget('train-race', function (el) {
    var L = G.data.records.locomotives.slice().sort(function (a, b) { return a.max_speed_kmh - b.max_speed_kmh; });
    var spr = { 'yir_usl': 'yir_usl', 'hiend_loco': 'hiend_loco', 'bet-locomotive': 'bet-locomotive' };
    function render(go) {
      var max = L[L.length - 1].max_speed_kmh;
      el.innerHTML = '<div class="wbar"><button class="fbtn go" data-go>' + G.t('🏁 Старт!', '🏁 Go!') + '</button><span class="muted">' + G.t('Максимальная скорость, км/ч', 'Top speed, km/h') + '</span></div>' +
        L.map(function (l) {
          var t = (max / l.max_speed_kmh * 2.2).toFixed(2);
          var img = spr[l.id] ? '<img class="tr-spr" src="' + G.asset('assets/sprites/' + spr[l.id] + '.webp') + '" alt="">' : '<img class="tr-ic" src="' + G.icon(l.icon) + '" alt="">';
          return '<div class="tr-row"><span class="tr-name">' + G.esc(G.nm(l)) + '</span><div class="tr-track"><div class="tr-car' + (go ? ' go' : '') + '" style="transition-duration:' + t + 's" data-ru="' + G.esc(l.ru) + '" data-en="' + G.esc(l.en) + '" src="' + G.icon(l.icon) + '">' + img + '</div></div><b>' + G.fmt(l.max_speed_kmh) + '</b></div>';
        }).join('');
      el.querySelector('[data-go]').onclick = function () { render(false); requestAnimationFrame(function () { requestAnimationFrame(function () { el.querySelectorAll('.tr-car').forEach(function (c) { c.classList.add('go'); }); }); }); };
    }
    render(false); G.onLang(function () { render(false); });
  });
})(window.Guide);
