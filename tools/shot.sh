#!/usr/bin/env bash
# Visual preview helper (Chrome headless). Usage: bash tools/shot.sh <section-ids-comma> <out-name> [height]
# Builds _preview.html with only these sections and saves work/peek/<out-name>_N.png slices (1440 px wide page).
cd "$(dirname "$0")/.."
python -I tools/build.py --only "$1" >/dev/null 2>&1
H=${3:-3000}
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
M="$(cygpath -m "$PWD")"
URL="file:///$(echo "$M" | sed 's/ /%20/g')/_preview.html${LANGQ:-}"
mkdir -p work/peek work
"$CH" --headless=new "--user-data-dir=$M/work/chrome-prof" --disable-gpu --hide-scrollbars "--window-size=1440,$H" --virtual-time-budget=7000 \
  "--screenshot=$M/work/peek/$2.png" "$URL" 2>&1 | grep -i written
python -I - "$2" "$H" <<'PY'
import sys
from PIL import Image
n,H=sys.argv[1],int(sys.argv[2])
im=Image.open('work/peek/%s.png'%n)
step=1300
for i,y in enumerate(range(0,H,step)):
    im.crop((0,y,1440,min(H,y+step))).resize((1080,int((min(H,y+step)-y)*0.75))).save('work/peek/%s_%d.png'%(n,i))
print('pieces',(H+step-1)//step)
PY
