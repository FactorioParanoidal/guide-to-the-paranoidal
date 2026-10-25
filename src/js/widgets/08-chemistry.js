/* Chapter 08 widgets (chemistry).
   fluid-wall : all visible fluids (records.fluids_all) with search and gas/liquid filter
   tank-fire  : interactive tank overheat (Flammable_Oils_QUICKFIX PARANOIDAL-CHANGES.md: burns 60 s, drained below 25% → goes out, else explosion) */
(function (G) {
  G.widget('fluid-wall', function (el) {
    var F = G.data.records.fluids_all, q = '', f = 'all';
    el.innerHTML = '<div class="wbar"><input class="fsel" type="search" data-q style="flex:1;min-width:200px"><span data-btns></span><b class="out" data-c></b></div><div class="wall fw"></div>';
    var wall = el.querySelector('.wall'), inp = el.querySelector('[data-q]');
    function render() {
      inp.placeholder = G.t('Найти жидкость…', 'Find a fluid…');
      el.querySelector('[data-btns]').innerHTML = [['all', 'Все', 'All'], ['liquid', 'Жидкости', 'Liquids'], ['gas', 'Газы', 'Gases']].map(function (b) { return '<button class="fbtn ' + (f === b[0] ? 'go' : '') + '" data-f="' + b[0] + '">' + G.t(b[1], b[2]) + '</button>'; }).join(' ');
      var list = F.filter(function (x) { return (f === 'all' || (f === 'gas') === !!x.gas) && (!q || (x.ru + ' ' + x.en).toLowerCase().indexOf(q) >= 0); });
      wall.innerHTML = list.map(function (x) { return G.iconImg(x, ''); }).join('') || '<span class="muted">' + G.t('Такой жидкости нет. Пока.', 'No such fluid. Yet.') + '</span>';
      el.querySelector('[data-c]').textContent = list.length + ' / ' + F.length;
      el.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { f = b.getAttribute('data-f'); render(); }; });
    }
    inp.oninput = function () { q = inp.value.trim().toLowerCase(); render(); };
    render(); G.onLang(render);
  });

  G.widget('tank-fire', function (el) {
    var state = 'idle', level = 100, t = 0, timer = null, BURN = 60, SPEED = 8; // game seconds; 8× faster than real time
    function paint() {
      var fireOn = state === 'burning';
      el.innerHTML = '<div class="panel-title"><img class="ic" src="' + G.icon('technology__angels-oil-processing') + '" alt="">' + G.t('Резервуар с нафтой, 25 000 единиц', 'Naphtha tank, 25,000 units') + '</div>' +
        '<div class="tf-stage ' + state + '"><img class="tf-tank" src="assets/sprites/storage-tank.webp" alt="">' + (fireOn ? '<div class="tf-fire"><i></i><i></i><i></i><i></i><i></i></div><div class="tf-smoke"></div>' : '') +
        (state === 'boom' ? '<div class="tf-boom"></div>' : '') + '<div class="tf-level"><i style="height:' + level + '%"></i><b>' + Math.round(level) + '%</b><em></em></div></div>' +
        '<div class="tf-timer"><i style="width:' + (t / BURN * 100) + '%"></i><span>' + (state === 'burning' ? G.t('До взрыва: ', 'Until explosion: ') + Math.max(0, Math.ceil(BURN - t)) + ' ' + G.t('с', 's') : '') + '</span></div>' +
        '<div class="wbar">' + (state === 'idle' ? '<button class="fbtn danger" data-ign>' + G.t('🔥 Попасть шальной пулей', '🔥 Hit it with a stray bullet') + '</button>' : '') +
        (state === 'burning' ? '<button class="fbtn go" data-drain>' + G.t('💧 Откачивать! (жмите быстрее)', '💧 Drain it! (click faster)') + '</button>' : '') +
        (state === 'out' || state === 'boom' ? '<button class="fbtn" data-reset>' + G.t('↺ Ещё раз', '↺ Again') + '</button>' : '') + '</div>' +
        '<div class="tf-msg">' + msg() + '</div>';
      var b;
      if ((b = el.querySelector('[data-ign]'))) b.onclick = ignite;
      if ((b = el.querySelector('[data-drain]'))) b.onclick = function () { level = Math.max(0, level - 4.5); check(); paint(); };
      if ((b = el.querySelector('[data-reset]'))) b.onclick = function () { state = 'idle'; level = 100; t = 0; paint(); };
    }
    function msg() {
      if (state === 'idle') return G.t('Полный резервуар горючего. Что может пойти не так?', 'A full tank of fuel. What could possibly go wrong?');
      if (state === 'burning') return G.t('Резервуар горит! Слейте горючее ниже 25% начального, пока не поздно. Над ним уже валит чёрный дым.', 'The tank is on fire! Drain below 25% of the initial amount before it is too late. Black smoke is already pouring out.');
      if (state === 'out') return '<b style="color:#8de06a">' + G.t('Пожар погас.', 'The fire is out.') + '</b> ' + G.t('Горючего меньше четверти — нечему взрываться. Вы спасли базу. На этот раз.', 'Less than a quarter left: nothing to explode. You saved the base. This time.');
      return '<b style="color:#ff5a4a">' + G.t('БАБАХ.', 'KABOOM.') + '</b> ' + G.t('Мощный взрыв, 40–200 долгих пожаров вокруг на две минуты и ' + G.fmt(Math.round(250 * level)) + ' единиц загрязнения разом. Жуки уже в пути.', 'A massive explosion, 40–200 long fires around for two minutes and ' + G.fmt(Math.round(250 * level)) + ' pollution at once. The bugs are on their way.');
    }
    function check() { if (state === 'burning' && level < 25) { state = 'out'; clearInterval(timer); G.achieve('firefighter', 'Пожарный', 'Firefighter', G.icon('fluid-turret__pd-fire-safety-turret'), 'Потушить горящий резервуар', 'Put out a burning tank'); } }
    function ignite() {
      state = 'burning'; t = 0; paint();
      timer = setInterval(function () {
        t += SPEED / 10;
        if (state !== 'burning') return clearInterval(timer);
        if (t >= BURN) { state = 'boom'; clearInterval(timer); el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 700); G.achieve('kaboom', 'Химик-подрывник', 'Demolition chemist', G.icon('technology__angels-oil-processing'), 'Взорвать резервуар', 'Blow up a tank'); }
        var bar = el.querySelector('.tf-timer i'), sp = el.querySelector('.tf-timer span');
        if (state === 'burning' && bar) { bar.style.width = (t / BURN * 100) + '%'; sp.textContent = G.t('До взрыва: ', 'Until explosion: ') + Math.max(0, Math.ceil(BURN - t)) + ' ' + G.t('с', 's'); }
        else paint();
      }, 100);
    }
    paint(); G.onLang(paint);
  });
})(window.Guide);
