/* Chapter 13 widgets (warfare).
   turret-ranges : all base turrets sorted by range (records.turrets)
   hero-ranks    : rank ladder; thresholds 550…55 000 kills linear (×20 for electric turrets and artillery), bonus 1 + 0.5·2/11·rank */
(function (G) {
  G.widget('turret-ranges', function (el) {
    var filt = 'all';
    function render() {
      var T = G.data.records.turrets.filter(function (t) { return t.range && (filt === 'all' || t.type === filt); }).sort(function (a, b) { return b.range - a.range; });
      var max = 120;
      var col = { 'ammo-turret': '#ffa020', 'electric-turret': '#58b6ff', 'fluid-turret': '#ff7a5a' };
      el.innerHTML = '<div class="wbar">' + [['all', 'Все', 'All'], ['ammo-turret', 'Огнестрельные', 'Ballistic'], ['electric-turret', 'Энергетические', 'Energy'], ['fluid-turret', 'Огнемёты и вода', 'Flame & water']].map(function (b) { return '<button class="fbtn ' + (filt === b[0] ? 'go' : '') + '" data-f="' + b[0] + '">' + G.t(b[1], b[2]) + '</button>'; }).join('') + '<span class="muted">' + G.t('дальность, клеток', 'range, tiles') + '</span></div><div class="tr-list">' +
        T.map(function (t) { return '<div class="sl-row vk"><span class="sl-q">' + G.iconImg(t) + G.esc(G.nm(t)) + '</span><span class="sl-bar"><i style="width:' + (t.range / max * 100) + '%;background:' + col[t.type] + '"></i></span><b>' + G.fmt(t.range) + '</b></div>'; }).join('') + '</div>' +
        '<p class="muted small-note">' + G.t('Ванильная пулемётная турель бьёт на 18 клеток, лазерная — на 24. Артиллерия здесь не показана: она стреляет за горизонт.', 'The vanilla gun turret reaches 18 tiles, the laser turret 24. Artillery is not shown: it fires beyond the horizon.') + '</p>';
      el.querySelectorAll('[data-f]').forEach(function (b) { b.onclick = function () { filt = b.getAttribute('data-f'); render(); }; });
    }
    render(); G.onLang(render);
  });

  G.widget('hero-ranks', function (el) {
    var names = G.data.records.hero_ranks;
    var ORDER = ['Ефрейтор', 'Капрал', 'Сержант', 'Старшина', 'Лейтенант', 'Капитан', 'Майор', 'Подполковник', 'Полковник', 'Генерал', 'Легендарный'];
    var EN = ['Lance corporal', 'Corporal', 'Sergeant', 'Sergeant major', 'Lieutenant', 'Captain', 'Major', 'Lieutenant colonel', 'Colonel', 'General', 'Legendary'];
    var kills = 3000, electric = false;
    function thr(r) { return (550 + (r - 1) * 5445) * (electric ? 20 : 1); }
    function render() {
      var rank = 0; for (var r = 1; r <= 11; r++) if (kills >= thr(r)) rank = r;
      el.innerHTML = '<div class="panel-title">' + G.t('Послужной список турели', 'Turret service record') + '</div>' +
        '<div class="qc-form"><label>' + G.t('Убито врагов', 'Enemies killed') + ': <b>' + G.fmt(kills) + '</b><input class="frange" type="range" min="0" max="6.1" step="0.01" value="' + Math.log10(kills + 1) + '" data-k></label>' +
        '<label>' + G.t('Тип', 'Type') + '<select class="fsel" data-e><option value="0">' + G.t('Пулемётная / пушка / огнемёт', 'Gun / cannon / flamer') + '</option><option value="1" ' + (electric ? 'selected' : '') + '>' + G.t('Энергетическая / артиллерия (×20)', 'energy / artillery (×20)') + '</option></select></label></div>' +
        '<div class="hr-list">' + ORDER.map(function (n, i) {
          var r = i + 1, on = r <= rank, mult = 1 + 0.5 * 2 / 11 * r;
          return '<div class="hr-row ' + (on ? 'on' : '') + (r === rank ? ' cur' : '') + '"><img src="' + G.icon('ammo-turret__hero-turret-' + r + '-for-gun-turret') + '" alt=""><span>' + G.t(n, EN[i]) + '</span><em>' + G.fmt(thr(r)) + '</em><b>×' + G.fmt(mult, { maximumFractionDigits: 2 }) + '</b></div>';
        }).join('') + '</div>';
      el.querySelector('[data-k]').oninput = function () { kills = Math.round(Math.pow(10, +this.value) - 1); render(); if (rank === 11) G.achieve('legend', 'Легенда обороны', 'Defence legend', G.icon('ammo-turret__hero-turret-11-for-gun-turret'), 'Дослужиться до легендарной турели', 'Promote a turret to legendary'); };
      el.querySelector('[data-e]').onchange = function () { electric = this.value === '1'; render(); };
    }
    render(); G.onLang(render);
  });
})(window.Guide);
