#!/usr/bin/env bash
# Runtime smoke test of the built page in headless Chrome.
# Usage: bash tools/jscheck.sh [ru|en] [page]
#   page: default index.html; give dist/Guide_to_the_Paranoidal.html to test the one-file guide. Such a page is copied
#   alone into work/jscheck-single/ (no assets/ next to it), so any asset it does not embed fails to load.
# Injects an error collector (JS errors and failed resource loads), forces every widget to render (widgets normally
# start when scrolled into view), clicks every spoiler and the language buttons, then dumps the DOM and prints:
#   ERRS   JS errors and resources that failed to load
#   EMPTY  widgets that rendered nothing
#   LOCAL  (one-file page only) images still pointing at assets/ instead of the embedded copy
# Exit 1 if any list is not empty. Writes only work/ and _jscheck.html (deleted after).
cd "$(dirname "$0")/.."
L=${1:-ru}
PAGE=${2:-index.html}
SINGLE=0
[ "$PAGE" != "index.html" ] && SINGLE=1
mkdir -p work
if [ $SINGLE = 1 ]; then OUTDIR=work/jscheck-single; rm -rf "$OUTDIR"; mkdir -p "$OUTDIR"; else OUTDIR=.; fi
python -I - "$PAGE" "$OUTDIR/_jscheck.html" "$SINGLE" <<'PY'
import sys
src, dst, single = sys.argv[1], sys.argv[2], sys.argv[3] == '1'
s = open(src, encoding='utf-8').read()
inject = """<script>window.__errs=[];window.addEventListener('error',function(e){var t=e.target;
if(t&&t!==window&&t.nodeType===1){window.__errs.push('resource '+String(t.currentSrc||t.src||t.href||t.getAttribute('href')||'').slice(0,90));return}
window.__errs.push((e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+e.lineno)},true);
var _ce=console.error;console.error=function(){window.__errs.push([].map.call(arguments,String).join(' '));_ce.apply(console,arguments)};</script>"""
s = s.replace('<head>', '<head>' + inject, 1)
tail = """<script>document.addEventListener('guide:ready',function(){setTimeout(function(){
Guide.renderAll();
setTimeout(function(){document.querySelectorAll('.spoiler').forEach(function(s){s.click()});
document.querySelectorAll('[data-set-lang]').forEach(function(b){b.click()});
setTimeout(function(){var empty=[].filter.call(document.querySelectorAll('[data-widget]'),function(e){return !e.children.length}).map(function(e){return e.getAttribute('data-widget')});
var local=[].map.call(document.querySelectorAll('img,image,link[rel=icon]'),function(e){return e.getAttribute('src')||e.getAttribute('href')||''}).filter(function(u){return /^assets\\//.test(u)});
var d=document.createElement('pre');d.id='__report';d.textContent='ERRS:'+JSON.stringify(window.__errs)+'\\nEMPTY:'+JSON.stringify(empty)+(SINGLE?'\\nLOCAL:'+JSON.stringify(local.slice(0,20)):'');document.body.appendChild(d)},1500)},2500)},300)});</script>""".replace('SINGLE', 'true' if single else 'false')
s = s.replace('</body>', tail + '</body>', 1)
open(dst, 'w', encoding='utf-8').write(s)
PY
M="$(cygpath -m "$PWD")"
D="$(cygpath -m "$PWD/$OUTDIR")"
URL="file:///$(echo "$D" | sed 's/ /%20/g')/_jscheck.html?lang=$L"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new "--user-data-dir=$M/work/chrome-prof" --disable-gpu --window-size=1440,1000 --virtual-time-budget=20000 --dump-dom "$URL" 2>/dev/null > work/_jscheck-dom.html
rm -f "$OUTDIR/_jscheck.html"
python -I - "$SINGLE" <<'PY'
import re, sys, html
s = open('work/_jscheck-dom.html', encoding='utf-8', errors='replace').read()
m = re.search(r'<pre id="__report">(.*?)</pre>', s, re.S)
if not m:
    print('NO REPORT (page did not finish booting)'); sys.exit(1)
rep = html.unescape(m.group(1))
print(rep)
ok = 'ERRS:[]' in rep and 'EMPTY:[]' in rep and (sys.argv[1] != '1' or 'LOCAL:[]' in rep)
sys.exit(0 if ok else 1)
PY
