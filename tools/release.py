"""Build the one-file guide release (what the Paranoidal Launcher downloads) and its release.json.

Usage (from the guide folder):
    python -I tools/release.py            # build index.html + dist/, report whether the committed index.html was stale
    python -I tools/release.py --ci       # the same, but a stale committed index.html is an error (GitHub Actions)
    python -I tools/release.py --compare <published release.json>
                                          # exit 1 if dist/ differs from that release (page changed, version not bumped)

Output in dist/ (git-ignored), uploaded by .github/workflows/release.yml as GitHub Release v<guide_version>:
    Guide_to_the_Paranoidal.html   the page with every asset inside (tools/build.py --single)
    release.json                   the release manifest the launcher reads (format below)
    release-notes.md               the top CHANGELOG section (release notes)

release.json (the same format for every FactorioParanoidal release the launcher reads):
    {"schema": 1, "product": "guide", "version": "1.3.4", "date": "2026-10-27",
     "file": "Guide_to_the_Paranoidal.html", "size": <bytes>, "sha256": "<hex of the file>",
     "digest": "<hex of the page without its build time: equal = the same guide>",
     "changes": [{"version": "1.3.4", "date": "2026-10-27", "text": "<markdown>"}, ...]}   # newest first
The launcher finds it at https://github.com/FactorioParanoidal/guide-to-the-paranoidal/releases/latest/download/release.json
"""
import argparse, hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DIST = os.path.join(ROOT, 'dist')
FILE = 'Guide_to_the_Paranoidal.html'

ap = argparse.ArgumentParser()
ap.add_argument('--ci', action='store_true')
ap.add_argument('--compare')
args = ap.parse_args()


def changelog():
    text = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
    heads = list(re.finditer(r'^## (\d+\.\d+\.\d+)(?:\s+—\s+(\d{4}-\d\d-\d\d))?\s*$', text, re.M))
    out = []
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        out.append({'version': h.group(1), 'date': h.group(2) or '', 'text': text[h.end():end].strip()})
    return out


def page_digest(path):
    """Digest of a built page without its build time (tools/build.py digest())."""
    if not os.path.exists(path):
        return None
    s = open(path, encoding='utf-8').read()
    m = re.search(r'"built":"(\d{4}-\d\d-\d\d \d\d:\d\d)"', s)
    if m:
        s = s.replace(m.group(1), '')
    return hashlib.sha256(s.encode('utf-8')).hexdigest()


if args.compare:
    mine = json.load(open(os.path.join(DIST, 'release.json'), encoding='utf-8'))
    pub = json.load(open(args.compare, encoding='utf-8'))
    if pub.get('version') != mine['version']:
        print('published release has version %s, built %s' % (pub.get('version'), mine['version']))
        sys.exit(1)
    if pub.get('digest') != mine['digest']:
        print('ERROR: the guide changed but guide_version %s is already released. Raise guide_version in src/sections.json '
              'and add its CHANGELOG.md section.' % mine['version'])
        sys.exit(1)
    print('release v%s is up to date' % mine['version'])
    sys.exit(0)

index = os.path.join(ROOT, 'index.html')
before = page_digest(index)
r = subprocess.call([sys.executable, '-I', os.path.join(HERE, 'build.py'), '--check', '--single', os.path.join(DIST, FILE)])
if r:
    print('ERROR: build/check failed')
    sys.exit(1)
stale = before != page_digest(index)
if stale:
    print(('ERROR' if args.ci else 'NOTE') + ': the committed index.html did not match the sources; it is rebuilt now (commit it).')
    if args.ci:
        sys.exit(1)

registry = json.load(open(os.path.join(ROOT, 'src', 'sections.json'), encoding='utf-8'))
version = registry['guide_version']
changes = changelog()
if not changes or changes[0]['version'] != version:
    print('ERROR: CHANGELOG.md must start with "## %s — YYYY-MM-DD"' % version)
    sys.exit(1)
path = os.path.join(DIST, FILE)
data = open(path, 'rb').read()
manifest = {
    'schema': 1,
    'product': 'guide',
    'version': version,
    'date': changes[0]['date'],
    'file': FILE,
    'size': len(data),
    'sha256': hashlib.sha256(data).hexdigest(),
    'digest': page_digest(path),
    'changes': changes,
}
with open(os.path.join(DIST, 'release.json'), 'w', encoding='utf-8', newline='\n') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
with open(os.path.join(DIST, 'release-notes.md'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(changes[0]['text'] + '\n\nОдин файл для чтения без интернета: `%s` (его скачивает Paranoidal Launcher).\n' % FILE)
print('release v%s: %s %.1f MB sha256 %s' % (version, FILE, len(data) / 1048576, manifest['sha256'][:16]))
