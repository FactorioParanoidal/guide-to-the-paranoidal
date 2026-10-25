/* Chapter 16 widgets (space).
   rocket-launch : failure chance from RocketExplosions2/control.lua (defaults: dfc 50%, research factor 0.1^(1/6), launch factor 0.1^(1/20)) + launch animation
   ftl-ladder    : the most expensive technologies (records.tech_most_expensive), log bars of total packs */
(function (G) {
  G.widget('rocket-launch', function (el) {
    var rev = 0, launched = 0, busy = false, history = [];
    var A = Math.pow(0.1, 1 / 6), B = Math.pow(0.1, 1 / 20);
    function chance() { var a = Math.pow(A, rev), b = Math.pow(B, launched); return 0.5 * (0.1 * a + 0.1 * b + 0.8 * a * b); }
    function render(state) {
      var c = chance();
      el.innerHTML = '<div class="rl-pad ' + (state || '') + '"><div class="rl-rocket">🚀</div><div class="rl-fx"></div><img src="assets/sprites/rocket-silo.webp" alt="" class="rl-silo"></div>' +
        '<div class="qc-form"><label>' + G.t('Исследований надёжности', 'Reliability revisions') + ': <b>' + rev + ' / 7</b><input class="frange" type="range" min="0" max="7" value="' + rev + '" data-r></label>' +
        '<label>' + G.t('Уже запущено ракет', 'Rockets already launched') + ': <b>' + launched + '</b><input class="frange" type="range" min="0" max="60" value="' + launched + '" data-l></label></div>' +
        '<div class="qc-big"><span>' + G.t('Шанс взрыва при старте', 'Chance of exploding at launch') + '</span><b style="color:' + (c > .25 ? '#ff5a4a' : c > .08 ? '#ffd25a' : '#8de06a') + '">' + G.fmt(c * 100, { maximumFractionDigits: 1 }) + '%</b></div>' +
        '<div class="wbar"><button class="fbtn go" data-go ' + (busy ? 'disabled' : '') + '>' + G.t('Пуск!', 'Launch!') + '</button><span class="rl-hist">' + history.slice(-12).map(function (h) { return h ? '💥' : '✅'; }).join('') + '</span></div>';
      el.querySelector('[data-r]').oninput = function () { rev = +this.value; render(); };
      el.querySelector('[data-l]').oninput = function () { launched = +this.value; render(); };
      el.querySelector('[data-go]').onclick = launch;
    }
    function launch() {
      if (busy) return; busy = true;
      var boom = Math.random() < chance();
      render('go ' + (boom ? 'boom' : 'ok'));
      setTimeout(function () {
        busy = false; history.push(boom); if (!boom) launched++;
        render();
        if (boom) G.achieve('rud', 'Быстрая незапланированная разборка', 'Rapid unscheduled disassembly', G.icon('technology__rocket-failure-revision'), 'Взорвать ракету на старте', 'Blow up a rocket at launch');
        else G.achieve('orbit', 'Есть орбита!', 'We have orbit!', G.icon('technology__rocket-silo'), 'Успешно запустить ракету', 'Launch a rocket successfully');
      }, 2200);
    }
    render(); G.onLang(function () { render(); });
  });

  G.widget('ftl-ladder', function (el) {
    function render() {
      var T = G.data.records.tech_most_expensive, max = Math.log10(T[0].packs_total);
      el.innerHTML = '<div class="panel-title">' + G.t('Самые дорогие исследования игры, в научных пакетах', 'The most expensive research in the game, in science packs') + '</div>' +
        T.map(function (t) { return '<div class="sl-row vk"><span class="sl-q">' + G.iconImg(t) + G.esc(G.nm(t)) + '</span><span class="sl-bar"><i style="width:' + (Math.log10(t.packs_total) / max * 100) + '%;background:linear-gradient(90deg,#3a2a7a,#b58cff)"></i></span><b>' + G.fmt(t.packs_total) + '</b></div>'; }).join('') +
        '<p class="muted small-note">' + G.t('Логарифмическая шкала. Число = единицы исследования × виды пакетов. Ванильная «Ракетная шахта» стоит 5 000 пакетов.', 'Log scale. Number = research units × pack kinds. The vanilla “Rocket silo” costs 5,000 packs.') + '</p>';
    }
    render(); G.onLang(render);
  });
})(window.Guide);
