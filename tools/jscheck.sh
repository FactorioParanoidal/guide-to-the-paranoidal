#!/usr/bin/env bash
# Runtime smoke test of the built page in headless Chrome.
# Usage: bash tools/jscheck.sh [ru|en]
# Copies index.html to _jscheck.html with an error collector, forces every widget to render
# (widgets normally start when scrolled into view), clicks every spoiler, then dumps the DOM and
# prints collected JS errors. Exit 1 if any error was caught. Writes only _jscheck.html (deleted after).
cd "$(dirname "$0")/.."
L=${1:-ru}
python -I - <<'PY'
s = open('index.html', encoding='utf-8').read()
inject = """<script>window.__errs=[];window.addEventListener('error',function(e){window.__errs.push((e.message||'')+' @'+(e.filename||'').split('/').pop()+':'+e.lineno)});
var _ce=console.error;console.error=function(){window.__errs.push([].map.call(arguments,String).join(' '));_ce.apply(console,arguments)};</script>"""
s = s.replace('<head>', '<head>' + inject, 1)
tail = """<script>document.addEventListener('guide:ready',function(){setTimeout(function(){
Guide.renderAll();
setTimeout(function(){document.querySelectorAll('.spoiler').forEach(function(s){s.click()});
document.querySelectorAll('[data-set-lang]').forEach(function(b){b.click()});
setTimeout(function(){var empty=[].filter.call(document.querySelectorAll('[data-widget]'),function(e){return !e.children.length}).map(function(e){return e.getAttribute('data-widget')});
var d=document.createElement('pre');d.id='__report';d.textContent='ERRS:'+JSON.stringify(window.__errs)+'\\nEMPTY:'+JSON.stringify(empty);document.body.appendChild(d)},1500)},2500)},300)});</script>"""
s = s.replace('</body>', tail + '</body>', 1)
open('_jscheck.html', 'w', encoding='utf-8').write(s)
PY
M="$(cygpath -m "$PWD")"
mkdir -p work
URL="file:///$(echo "$M" | sed 's/ /%20/g')/_jscheck.html?lang=$L"
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new "--user-data-dir=$M/work/chrome-prof" --disable-gpu --window-size=1440,1000 --virtual-time-budget=20000 --dump-dom "$URL" 2>/dev/null > work/_jscheck-dom.html
rm -f _jscheck.html
python -I - <<'PY'
import re, sys, html
s = open('work/_jscheck-dom.html', encoding='utf-8', errors='replace').read()
m = re.search(r'<pre id="__report">(.*?)</pre>', s, re.S)
if not m:
    print('NO REPORT (page did not finish booting)'); sys.exit(1)
rep = html.unescape(m.group(1))
print(rep)
sys.exit(0 if 'ERRS:[]' in rep and 'EMPTY:[]' in rep else 1)
PY
