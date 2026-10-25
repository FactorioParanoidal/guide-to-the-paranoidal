/* Chapter 17 widget.
   hotkey-board : keyboard map of default mod hotkeys (records.hotkeys: {keys:"CONTROL + SHIFT + R", ru, en}); red = several mods on one combo */
(function (G) {
  G.widget('hotkey-board', function (el) {
    var H = G.data.records.hotkeys, mod = 'SHIFT';
    var ROWS = [
      ['ESCAPE', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
      ['GRAVE', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'MINUS', 'EQUALS', 'BACKSPACE'],
      ['TAB', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
      ['CAPS', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'ENTER'],
      ['LSHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'RSHIFT'],
      ['LCTRL', 'LALT', 'SPACE', 'UP', 'LEFT', 'DOWN', 'RIGHT', 'PAD +', 'PAD -', 'KP_0']
    ];
    var LABEL = { ESCAPE: 'Esc', GRAVE: '~', MINUS: '−', EQUALS: '=', BACKSPACE: '⌫', TAB: 'Tab', CAPS: 'Caps', ENTER: 'Enter', LSHIFT: 'Shift', RSHIFT: 'Shift', LCTRL: 'Ctrl', LALT: 'Alt', SPACE: 'Space', UP: '↑', LEFT: '←', DOWN: '↓', RIGHT: '→', 'PAD +': 'Num+', 'PAD -': 'Num−', KP_0: 'Num0' };
    var MODS = [['', 'без модификатора', 'no modifier'], ['SHIFT', 'Shift', 'Shift'], ['CONTROL', 'Ctrl', 'Ctrl'], ['ALT', 'Alt', 'Alt'], ['CONTROL+SHIFT', 'Ctrl+Shift', 'Ctrl+Shift'], ['SHIFT+ALT', 'Shift+Alt', 'Shift+Alt'], ['CONTROL+ALT', 'Ctrl+Alt', 'Ctrl+Alt']];
    function parse(k) {
      var parts = k.split(' + ').map(function (s) { return s.trim(); }), mods = [], key = null;
      parts.forEach(function (p) { if (p === 'SHIFT' || p === 'CONTROL' || p === 'ALT') mods.push(p); else key = key ? key + ' + ' + p : p; });
      if (k.indexOf('PAD +') >= 0) key = 'PAD +'; if (k.indexOf('PAD -') >= 0) key = 'PAD -';
      if (key === 'RETURN') key = 'ENTER';
      var order = ['CONTROL', 'SHIFT', 'ALT'];
      mods.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
      return { mods: mods.join('+'), key: key };
    }
    var map = {}, mouse = [];
    H.forEach(function (h) { var p = parse(h.keys); if (/mouse/.test(p.key || '')) { mouse.push(h); return; } var id = p.mods + '|' + p.key; (map[id] = map[id] || []).push(h); });
    function render() {
      var counts = {};
      Object.keys(map).forEach(function (id) { var m = id.split('|')[0]; counts[m] = (counts[m] || 0) + map[id].length; });
      el.innerHTML = '<div class="wbar">' + MODS.map(function (m) { return '<button class="fbtn ' + (m[0] === mod ? 'go' : '') + '" data-m="' + m[0] + '">' + G.t(m[1], m[2]) + ' <small>(' + (counts[m[0]] || 0) + ')</small></button>'; }).join('') + '</div><div class="kb">' +
        ROWS.map(function (row) {
          return '<div class="kb-row">' + row.map(function (k) {
            var acts = map[mod + '|' + k] || [], isMod = /SHIFT|CTRL|ALT/.test(k) && k.length > 3, on = isMod && ((k.indexOf('SHIFT') >= 0 && mod.indexOf('SHIFT') >= 0) || (k === 'LCTRL' && mod.indexOf('CONTROL') >= 0) || (k === 'LALT' && mod.indexOf('ALT') >= 0));
            var tip = acts.length ? acts.map(function (a) { return '• ' + G.esc(G.t(a.ru, a.en)); }).join('<br>') : '';
            return '<span class="kb-k' + (acts.length ? ' has' : '') + (acts.length > 1 ? ' many' : '') + (on ? ' mod' : '') + (k === 'SPACE' ? ' space' : '') + '"' + (tip ? ' data-tip-ru="' + G.esc(tip) + '" data-tip-en="' + G.esc(tip) + '"' : '') + '>' + (LABEL[k] || k) + (acts.length ? '<i>' + acts.length + '</i>' : '') + '</span>';
          }).join('') + '</div>';
        }).join('') + '</div><h4>' + G.t('Мышь', 'Mouse') + '</h4><div class="chips">' + mouse.map(function (h) { return '<span class="chip"><kbd>' + G.esc(h.keys.replace('CONTROL', 'Ctrl').replace(/mouse-button-1/, 'ЛКМ').replace(/mouse-button-2/, 'ПКМ').replace(/mouse-wheel-up/, '↑колесо').replace(/mouse-wheel-down/, '↓колесо')) + '</kbd> ' + G.esc(G.t(h.ru, h.en)) + '</span>'; }).join('') + '</div>' +
        '<p class="muted small-note">' + G.t('Показаны значения по умолчанию из прототипов игры. Конфликты Factorio обрабатывает по контексту (например, Ctrl+R работает по-разному на манипуляторе, на станции и с кистью лент), но в меню «Управление» их удобно переназначить.', 'Default values from the game prototypes. Factorio resolves conflicts by context (Ctrl+R behaves differently on an inserter, a station or with the belt brush), but remapping them in Controls is convenient.') + '</p>';
      el.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { mod = b.getAttribute('data-m'); render(); }; });
    }
    render(); G.onLang(render);
  });
})(window.Guide);
