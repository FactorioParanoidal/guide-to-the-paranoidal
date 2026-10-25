/* Chapter 20 widget.
   readiness-quiz : 8 questions; answers must stay consistent with the chapters (update when mechanics change). */
(function (G) {
  var Q = [
    { q: ['КПД стартового котла?', 'Starter boiler efficiency?'], a: [['100%, как в ванили', '100%, like vanilla'], ['50%', '50%'], ['98%', '98%'], ['Котлов нет, только солнце', 'No boilers, only solar']], ok: 1, link: '#energy-kpd' },
    { q: ['Без чего нельзя изучить зелёную науку?', 'What is required for green science?'], a: [['Без ракеты', 'A rocket'], ['Без «Контроля качества 10»', '“Quality control 10”'], ['Без поезда', 'A train'], ['Ни без чего, как в ванили', 'Nothing, like vanilla']], ok: 1, link: '#defects-control' },
    { q: ['Где взять железную руду?', 'Where do you get iron ore?'], a: [['На железном месторождении', 'From an iron ore field'], ['Сортировкой сложных руд, например сапфирита', 'By sorting compound ores, e.g. saphirite'], ['Купить у жуков', 'Buy it from the bugs'], ['Из камня', 'From stone']], ok: 1, link: '#refining-tiers' },
    { q: ['Что нужно буру на сапфирите, кроме электричества?', 'What does a drill on saphirite need besides power?'], a: [['Ничего', 'Nothing'], ['Вода', 'Water'], ['Смазка', 'Lubricant'], ['Удача', 'Luck']], ok: 1, link: '#mining-fluids' },
    { q: ['От чего здесь растёт эволюция жуков?', 'What makes bug evolution grow here?'], a: [['От времени', 'Time'], ['От загрязнения', 'Pollution'], ['От ваших исследований', 'Your research'], ['От фазы луны', 'The moon phase']], ok: 2, link: '#science-evolution' },
    { q: ['Шанс взрыва первой ракеты без исследований?', 'Chance the first rocket explodes without research?'], a: [['0%', '0%'], ['5%', '5%'], ['50%', '50%'], ['100%', '100%']], ok: 2, link: '#space-explosions' },
    { q: ['Горящий резервуар можно спасти, если…', 'A burning tank can be saved if…'], a: [['…полить его из ведра', '…you pour a bucket on it'], ['…за минуту откачать горючее ниже 25%', '…you drain the fuel below 25% within a minute'], ['…отойти подальше', '…you walk away'], ['…никак', '…no way']], ok: 1, link: '#chemistry-fire' },
    { q: ['Кто из этих врагов существует в сборке?', 'Which of these enemies exists in the modpack?'], a: [['Люди с ядерными ракетами', 'Humans with nuclear rockets'], ['Жуки-джаггернауты', 'Juggernaut bugs'], ['Летающие тарелки', 'Flying saucers'], ['Все перечисленные', 'All of the above']], ok: 3, link: '#enemies-events' }
  ];
  G.widget('readiness-quiz', function (el) {
    var i = 0, score = 0, picked = null;
    function render() {
      if (i >= Q.length) return result();
      var q = Q[i];
      el.innerHTML = '<div class="qz-top"><span>' + G.t('Вопрос', 'Question') + ' ' + (i + 1) + ' / ' + Q.length + '</span><span>' + G.t('Очки', 'Score') + ': ' + score + '</span></div><div class="qz-bar"><i style="width:' + (i / Q.length * 100) + '%"></i></div>' +
        '<h4>' + G.t(q.q[0], q.q[1]) + '</h4><div class="qz-a">' + q.a.map(function (a, k) {
          var cls = picked === null ? '' : k === q.ok ? 'ok' : k === picked ? 'bad' : 'dim';
          return '<button class="qz-b ' + cls + '" data-k="' + k + '" ' + (picked !== null ? 'disabled' : '') + '>' + G.t(a[0], a[1]) + '</button>';
        }).join('') + '</div>' + (picked !== null ? '<div class="wbar"><a class="x" href="' + q.link + '">' + G.t('Где об этом в гайде', 'Where the guide covers it') + '</a><button class="fbtn go" data-next>' + G.t('Дальше →', 'Next →') + '</button></div>' : '');
      el.querySelectorAll('[data-k]').forEach(function (b) { b.onclick = function () { picked = +b.getAttribute('data-k'); if (picked === Q[i].ok) score++; render(); }; });
      var n = el.querySelector('[data-next]'); if (n) n.onclick = function () { i++; picked = null; render(); };
    }
    function result() {
      var verdict = score === Q.length ? [G.t('Готов к Paranoidal', 'Paranoidal-ready'), G.t('Вы прочитали гайд внимательнее, чем некоторые читают договор ипотеки. Запускайте игру. Жуки уже ждут.', 'You read the guide more carefully than some people read a mortgage contract. Launch the game. The bugs are waiting.'), '#8de06a']
        : score >= 5 ? [G.t('Почти готов', 'Almost ready'), G.t('Пара пробелов есть, но в Paranoidal всё равно всё узнаётся на практике. Обычно ночью и под атакой.', 'A few gaps, but in Paranoidal you learn everything in practice anyway. Usually at night and under attack.'), '#ffd25a']
          : [G.t('Сначала ваниль', 'Vanilla first'), G.t('Честно? Пролистайте гайд ещё раз. Или включите пресет «без врагов» — это не стыдно, это стратегия.', 'Honestly? Skim the guide again. Or pick the “no enemies” preset: no shame, it is strategy.'), '#ff5a4a'];
      el.innerHTML = '<div class="qz-res"><b class="out" style="color:' + verdict[2] + '">' + score + ' / ' + Q.length + '</b><h4>' + verdict[0] + '</h4><p>' + verdict[1] + '</p><button class="fbtn" data-again>' + G.t('Пройти ещё раз', 'Try again') + '</button></div>';
      el.querySelector('[data-again]').onclick = function () { i = 0; score = 0; picked = null; render(); };
      if (score === Q.length) G.achieve('quiz', 'Отличник', 'Straight A', G.icon('technology__ic-defect-control-10'), 'Ответить на все вопросы теста', 'Answer every quiz question correctly');
    }
    render(); G.onLang(render);
  });
})(window.Guide);
