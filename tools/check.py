"""Validate the built guide (index.html). Run after tools/build.py.

Checks:
  1. every href="#id" points to an existing id (no dead internal links);
  2. ids are unique;
  3. bilingual pairing: an element with lang="ru" is immediately followed by a sibling of the same tag with lang="en"
     (and vice versa), so the page never shows a missing translation;
  4. every <img src> / CSS url() under assets/ exists;
  5. every data-widget="x" has a registered widget Guide.widget('x', ...);
  6. every section in src/sections.json is present;
  7. reports glossary terms (#g-*) that nothing links to, and chapters with few cross-links (wiki density);
  8. JS builds asset paths only through G.asset()/G.icon() (the one-file guide resolves them from its embedded table);
  9. guide_version of sections.json = <meta name="guide-version"> of the page = the top CHANGELOG.md section.
Exit code 1 when errors (1-6, 8, 9) are found; warnings (7) do not fail.
"""
import glob, json, os, re, sys
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
page = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
errors, warnings = [], []

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Node:
    __slots__ = ('tag', 'attrs', 'children', 'parent', 'line')
    def __init__(self, tag, attrs, parent, line):
        self.tag, self.attrs, self.parent, self.line, self.children = tag, dict(attrs), parent, line, []

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#root', [], None, 0)
        self.cur = self.root
        self.in_script = False
    def handle_starttag(self, tag, attrs):
        n = Node(tag, attrs, self.cur, self.getpos()[0])
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n
    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur, self.getpos()[0]))
    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

p = P()
p.feed(page)

ids, hrefs, imgs, widgets = {}, [], [], []
def walk(n):
    a = n.attrs
    if 'id' in a:
        if a['id'] in ids:
            errors.append('duplicate id "%s" (lines %s and %s)' % (a['id'], ids[a['id']], n.line))
        ids[a['id']] = n.line
    if n.tag == 'a' and a.get('href', '').startswith('#') and len(a['href']) > 1:
        hrefs.append((a['href'][1:], n.line))
    if n.tag == 'img' and a.get('src'):
        imgs.append((a['src'], n.line))
    if 'data-widget' in a:
        widgets.append((a['data-widget'], n.line))
    cls = a.get('class', '').split()
    if 'spoiler' in cls and 'data-label' in a and 'data-label-en' not in a:
        errors.append('line %d: spoiler without data-label-en' % n.line)
    if 'dossier' in cls and 'data-stamp' in a and 'data-stamp-en' not in a:
        errors.append('line %d: dossier without data-stamp-en' % n.line)
    # bilingual pairing among element siblings
    kids = [c for c in n.children]
    for i, c in enumerate(kids):
        if c.tag == 'html':
            continue
        lang = c.attrs.get('lang')
        if lang == 'ru':
            nxt = kids[i + 1] if i + 1 < len(kids) else None
            if not nxt or nxt.attrs.get('lang') != 'en' or nxt.tag != c.tag:
                errors.append('line %d: <%s lang="ru"> without following <%s lang="en">' % (c.line, c.tag, c.tag))
        elif lang == 'en':
            prv = kids[i - 1] if i > 0 else None
            if not prv or prv.attrs.get('lang') != 'ru':
                errors.append('line %d: <%s lang="en"> without preceding lang="ru"' % (c.line, c.tag))
    for c in kids:
        walk(c)
walk(p.root)

for target, line in hrefs:
    if target not in ids:
        errors.append('line %d: dead link #%s' % (line, target))
for src, line in imgs:
    if src.startswith('assets/') and not os.path.exists(os.path.join(ROOT, src)):
        errors.append('line %d: missing image %s' % (line, src))
for url in set(re.findall(r'url\(["\']?(assets/[^"\')]+)', page)):
    if not os.path.exists(os.path.join(ROOT, url)):
        errors.append('missing css asset %s' % url)
registered = set(re.findall(r"(?:Guide|G)\.widget\(\s*'([\w-]+)'", page))
for w, line in widgets:
    if w not in registered:
        errors.append('line %d: data-widget="%s" has no Guide.widget registration' % (line, w))
reg = json.load(open(os.path.join(ROOT, 'src', 'sections.json'), encoding='utf-8'))
for e in reg['sections']:
    if e.get('status') != 'disabled' and e['id'] not in ids:
        errors.append('section %s from sections.json is missing in the page' % e['id'])

# 8. the one-file release resolves assets at run time: JS must build every asset path through G.asset()/G.icon()
for f in [os.path.join(ROOT, 'src', 'js', 'core.js')] + sorted(glob.glob(os.path.join(ROOT, 'src', 'js', 'widgets', '*.js'))):
    for n, line in enumerate(open(f, encoding='utf-8'), 1):
        for m in re.finditer(r"""(['"])assets/""", line):
            if not line[:m.start()].endswith('G.asset('):
                errors.append('%s:%d: asset path not passed to G.asset() (breaks the one-file guide)' % (os.path.relpath(f, ROOT), n))
        for m in re.finditer(r"""(?:src|href)="assets/""", line):
            errors.append('%s:%d: literal src/href="assets/.." in JS (use G.asset())' % (os.path.relpath(f, ROOT), n))

# 9. version: the page, sections.json and the top CHANGELOG section agree (tools/release.py publishes this version)
m = re.search(r'<meta name="guide-version" content="([^"]+)">', page[:4096])
top = re.search(r'^## (\S+)', open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read(), re.M)
if not re.fullmatch(r'\d+\.\d+\.\d+', str(reg.get('guide_version'))):
    errors.append('sections.json guide_version must look like 1.2.3')
if not m or m.group(1) != reg.get('guide_version'):
    errors.append('<meta name="guide-version"> is missing from the first 4 KB or differs from sections.json')
if not top or top.group(1) != reg.get('guide_version'):
    errors.append('CHANGELOG.md must start with "## %s" (guide_version of sections.json)' % reg.get('guide_version'))

# warnings: glossary usage and link density
linked = {t for t, _ in hrefs}
for gid in [i for i in ids if i.startswith('g-')]:
    if gid not in linked:
        warnings.append('glossary term #%s is never linked' % gid)
chap = re.split(r'<!-- ===== section: ', page)
for part in chap[1:]:
    name = part.split(' ', 1)[0]
    n = len(re.findall(r'href="#', part))
    if n < 3 and name not in ('hero',):
        warnings.append('section %s has only %d internal links' % (name, n))

print('check: %d ids, %d internal links, %d images, %d widgets (%d kinds registered)' % (len(ids), len(hrefs), len(imgs), len(widgets), len(registered)))
for e in errors:
    print('  ERROR', e)
for w in warnings:
    print('  warn ', w)
print('RESULT:', 'FAIL' if errors else 'OK', '(%d errors, %d warnings)' % (len(errors), len(warnings)))
sys.exit(1 if errors else 0)
