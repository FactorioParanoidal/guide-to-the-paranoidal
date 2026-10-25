/* Chapter 07 widgets (refining).
   ore-decoder   : Angels ore → stage → sorting outputs (records.ore_decoder), animated machine chain, yield per 100 raw ore
   top-materials : most used ingredients / most produced products (records.top_ingredients / top_products) */
(function (G) {
  var STAGES = [['crushed', 'Дроблёная', 'Crushed'], ['chunk', 'Куски (флотация)', 'Chunks (flotation)'], ['crystal', 'Кристаллы (выщелачивание)', 'Crystals (leaching)'], ['pure', 'Очищенная', 'Purified']];
  G.widget('ore-decoder', function (el) {
    var D = G.data.records.ore_decoder, M = G.data.records.refining_machines, oi = 0, si = 0;
    var mach = { crushed: 0, chunk: 1, crystal: 2, pure: 3 };
    function per100(st) {
      // raw ore -> intermediate is 1:1 for every tier (2→2, 2→2, 2→2, 4→4), so 100 raw ore = 100 inputs of the stage
      var k = 100 / st.input_amount, metal = 0, slag = 0, kinds = 0;
      st.outputs.forEach(function (o) { if (o.id === 'angels-slag') slag += o.amount * k; else { metal += o.amount * k; kinds++; } });
      return { metal: metal, slag: slag, kinds: kinds };
    }
    function render() {
      var O = D[oi], st = O.stages[si];
      var chain = M.slice(0, mach[st.stage] + 1).concat([M[M.length - 1]]);
      var y = O.stages.map(per100);
      el.innerHTML = '<div class="od-ores">' + D.map(function (o, i) { return '<button class="od-ore ' + (i === oi ? 'on' : '') + '" data-o="' + i + '">' + G.iconImg(o.ore, 'ic-lg') + '<span>' + G.esc(G.nm(o.ore)) + '</span></button>'; }).join('') + '</div>' +
        '<div class="od-stages">' + O.stages.map(function (s, i) { return '<button class="fbtn ' + (i === si ? 'go' : '') + '" data-s="' + i + '">' + (i + 1) + ' · ' + G.t(STAGES[i][1], STAGES[i][2]) + '</button>'; }).join('') + '</div>' +
        '<div class="od-chain">' + G.iconImg(O.ore, 'ic-lg') + chain.map(function (m, i) { return '<span class="od-arrow"></span><img class="od-m" src="assets/sprites/' + m.id + '.webp" alt="" data-ru="' + G.esc(m.ru) + '" data-en="' + G.esc(m.en) + '">'; }).join('') + '</div>' +
        '<div class="od-out"><div class="od-in"><span class="slot"><img src="' + G.icon(st.input.icon) + '" alt=""><b>' + st.input_amount + '</b></span><span class="od-eq">→</span>' +
        st.outputs.map(function (o) { return '<span class="slot' + (o.id === 'angels-slag' ? ' slag' : '') + '" data-ru="' + G.esc(o.ru) + '" data-en="' + G.esc(o.en) + '" src="' + G.icon(o.icon) + '"><img src="' + G.icon(o.icon) + '" alt=""><b>' + o.amount + '</b></span>'; }).join('') + '</div>' +
        '<p class="muted">' + G.esc(G.nm(st.input)) + ' → ' + st.outputs.filter(function (o) { return o.id !== 'angels-slag'; }).map(function (o) { return G.esc(G.nm(o)); }).join(', ') + '</p></div>' +
        '<h4>' + G.t('Что дают 100 единиц сырой руды на каждой ступени', 'What 100 raw ore yield at each tier') + '</h4><div class="od-yield">' + y.map(function (v, i) {
          return '<div class="' + (i === si ? 'on' : '') + '"><b>' + G.fmt(v.metal, { maximumFractionDigits: 1 }) + '</b><span>' + G.t('ед. металлической руды', 'metal ore units') + '</span><i style="height:' + v.metal + 'px"></i><em>' + v.kinds + ' ' + G.t('видов', 'kinds') + (v.slag ? ' · ' + G.fmt(v.slag, { maximumFractionDigits: 1 }) + ' ' + G.t('шлака', 'slag') : ' · ' + G.t('без шлака', 'no slag')) + '</em><small>' + (i + 1) + '</small></div>';
        }).join('') + '</div>';
      el.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { oi = +b.getAttribute('data-o'); render(); }; });
      el.querySelectorAll('[data-s]').forEach(function (b) { b.onclick = function () { si = +b.getAttribute('data-s'); render(); if (si === 3) G.achieve('purifier', 'Чистота превыше всего', 'Purity above all', G.icon('technology__angels-ore-refining'), 'Дойти до очищенной руды в дешифраторе', 'Reach purified ore in the decoder'); }; });
    }
    render(); G.onLang(render);
  });

  G.widget('top-materials', function (el) {
    var mode = 0;
    function render() {
      var list = mode ? G.data.records.top_products : G.data.records.top_ingredients, max = list[0].recipes;
      el.innerHTML = '<div class="wbar"><button class="fbtn ' + (!mode ? 'go' : '') + '" data-m="0">' + G.t('Чаще всего нужно', 'Most needed') + '</button><button class="fbtn ' + (mode ? 'go' : '') + '" data-m="1">' + G.t('Чаще всего получается', 'Most produced') + '</button></div>' +
        list.map(function (r, i) { return '<div class="sl-row vk"><span class="sl-q">' + G.iconImg(r) + (i + 1) + '. ' + G.esc(G.nm(r)) + '</span><span class="sl-bar"><i style="width:' + (r.recipes / max * 100) + '%"></i></span><b>' + r.recipes + '</b></div>'; }).join('') +
        '<p class="muted small-note">' + (mode ? G.t('Число рецептов, которые производят этот предмет.', 'Number of recipes that produce this item.') : G.t('Число рецептов, где этот предмет нужен как ингредиент.', 'Number of recipes that need this item as an ingredient.')) + ' ' + G.t('Учтены только доступные игроку рецепты, без переработки, бочек и утилизации.', 'Only recipes available to the player, excluding recycling, barrels and voiding.') + '</p>';
      el.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mode = +b.getAttribute('data-m'); render(); }; });
    }
    render(); G.onLang(render);
  });
})(window.Guide);
