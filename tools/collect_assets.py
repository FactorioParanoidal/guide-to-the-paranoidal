"""Render in-game icons/sprites and copy static art for the guide.

Usage (from the guide folder):
    python -I tools/collect_assets.py --dump <data-raw-dump.json>

Inputs:
    data/icon-requests.json   - [type, name] pairs produced by tools/extract_stats.py
    tools/assets-config.json  - extra icons, technology icons, entity sprites and static files
Outputs:
    assets/icons/<type>__<name>.png   (64 px; technologies 128 px)
    assets/sprites/<key>.png          (first frame of an entity graphic, trimmed)
    assets/static/...                 (copied files: fonts, backgrounds, logo animation)
    assets/manifest.json              (every output -> source path + source sha256)

Reads the game data folder and the mod folders; writes only inside the guide folder.
Mods that are zip archives are skipped (none are enabled in the 2.0 profile).
"""
import argparse, glob, hashlib, json, os, re, shutil, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.dirname(ROOT)
ap = argparse.ArgumentParser()
ap.add_argument('--dump', required=True)
ap.add_argument('--mods', default=os.path.join(WS, 'ParanoidalModpack-master', 'mods'))
ap.add_argument('--game', default='C:/Games/Factorio 2.077 - QUILITY/data')
ap.add_argument('--only', help='comma list of output kinds: icons,sprites,static')
ap.add_argument('--quality', type=int, default=90, help='WebP quality for icons and sprites')
args = ap.parse_args()
def save_webp(img, path):
    img.save(path, 'WEBP', quality=args.quality, method=6)
kinds = set((args.only or 'icons,sprites,static').split(','))

D = json.load(open(args.dump, encoding='utf-8'))
cfg = json.load(open(os.path.join(HERE, 'assets-config.json'), encoding='utf-8'))
manifest_path = os.path.join(ROOT, 'assets', 'manifest.json')
manifest = json.load(open(manifest_path, encoding='utf-8')) if os.path.exists(manifest_path) else {}

# mod name -> folder
MODDIR = {}
for f in glob.glob(os.path.join(args.mods, '*', 'info.json')):
    try:
        MODDIR[json.load(open(f, encoding='utf-8-sig'))['name']] = os.path.dirname(f)
    except Exception:
        pass
for m in ('base', 'core', 'quality', 'elevated-rails', 'space-age'):
    MODDIR[m] = os.path.join(args.game, m)

def resolve(path):
    m = re.match(r'^__([^_].*?)__/(.*)$', path)
    if not m:
        return None
    base = MODDIR.get(m.group(1))
    if not base:
        return None
    p = os.path.join(base, m.group(2))
    return p if os.path.exists(p) else None

_sha = {}
def sha(p):
    if p not in _sha:
        _sha[p] = hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]
    return _sha[p]

def rel(p):
    try:
        return os.path.relpath(p, WS).replace('\\', '/')
    except ValueError:
        return p.replace('\\', '/')

ITEM_TYPES = ['item', 'tool', 'ammo', 'capsule', 'module', 'gun', 'armor', 'item-with-entity-data', 'repair-tool', 'rail-planner',
              'selection-tool', 'item-with-tags', 'spidertron-remote']

def tint_img(img, tint):
    if not tint:
        return img
    if isinstance(tint, dict):
        t = [tint.get('r', 1), tint.get('g', 1), tint.get('b', 1), tint.get('a', 1)]
    else:
        t = list(tint) + [1] * (4 - len(tint))
    if max(t[:3]) > 1:
        t = [x / 255 for x in t[:3]] + [t[3] / 255 if t[3] > 1 else t[3]]
    r, g, b, a = img.split()
    r = r.point(lambda v: v * t[0]); g = g.point(lambda v: v * t[1]); b = b.point(lambda v: v * t[2]); a = a.point(lambda v: v * t[3])
    return Image.merge('RGBA', (r, g, b, a))

# corner badges the guide does not want (design rule: clean icons without overlays):
# tech level markers / badge frames of zzzparanoidal, vanilla tech "constant" badges, Rampant tier letters,
# reskins tier numbers / letters / symbols, Angel's num-N, molecule badges of gases, Mk1/Mk2 tank marks, Clowns % badges.
BADGE_PARTS = ('/icon-markers/', '/technology/constants/', '/icons/signal/signal_', '/icons/signal/signal-star',
               '/icons/tiers/', '/icons/letters/', '/icons/symbols/', '/num-', '/molecules/', '/icons/mk1.png', '/icons/mk2.png')
BADGE_RE = re.compile(r'/\d+%\.png$')   # Clowns enrichment percent badges

def is_badge(l):
    ic = l.get('icon') or ''
    return l.get('floating') or any(s in ic for s in BADGE_PARTS) or bool(BADGE_RE.search(ic))

def icon_layers(p):
    if p.get('icons'):
        ls = [dict(l) for l in p['icons']]
        clean = [l for i, l in enumerate(ls) if i == 0 or not is_badge(l)]
        return clean
    if p.get('icon'):
        return [{'icon': p['icon'], 'icon_size': p.get('icon_size', 64)}]
    return None

def render_icon(layers, expected=64, out=64):
    """Composite Factorio icon layers. Logical units: first layer size defines the canvas."""
    if not layers:
        return None, []
    srcs = []
    first = layers[0]
    fs = first.get('icon_size', 64)
    fscale = first.get('scale', (expected / 2) / fs)
    logical = fs * fscale
    k = out / logical
    canvas = Image.new('RGBA', (out, out), (0, 0, 0, 0))
    for l in layers:
        path = resolve(l.get('icon', ''))
        if not path:
            continue
        srcs.append(path)
        size = l.get('icon_size', 64)
        try:
            im = Image.open(path).convert('RGBA')
        except Exception:
            continue
        im = im.crop((0, 0, min(size, im.width), min(size, im.height)))
        scale = l.get('scale', (expected / 2) / size)
        px = max(1, round(size * scale * k))
        im = im.resize((px, px), Image.LANCZOS)
        im = tint_img(im, l.get('tint'))
        sh = l.get('shift') or [0, 0]
        if isinstance(sh, dict):
            sh = [sh.get('x', 0), sh.get('y', 0)]
        x = round(out / 2 - px / 2 + sh[0] * k)
        y = round(out / 2 - px / 2 + sh[1] * k)
        layer = Image.new('RGBA', (out, out), (0, 0, 0, 0))
        layer.paste(im, (x, y), im)
        canvas = Image.alpha_composite(canvas, layer)
    return canvas, srcs

def find_proto(typ, name):
    if typ in D and name in D[typ]:
        return D[typ][name]
    return None

def icon_for(typ, name):
    p = find_proto(typ, name)
    if p is None and typ in ITEM_TYPES:
        for t in ITEM_TYPES:
            p = find_proto(t, name)
            if p is not None:
                break
    if p is None:
        return None, []
    layers = icon_layers(p)
    if not layers and typ == 'recipe':
        prod = p.get('main_product') or ((p.get('results') or [{}])[0].get('name'))
        for t in ITEM_TYPES + ['fluid']:
            q = find_proto(t, prod) if prod else None
            if q:
                layers = icon_layers(q)
                break
    if not layers:
        # entities without icon: try their item
        for t in ITEM_TYPES:
            q = find_proto(t, name)
            if q:
                layers = icon_layers(q)
                break
    if not layers:
        return None, []
    tech = typ == 'technology'
    return render_icon(layers, expected=256 if tech else 64, out=128 if tech else 64)

def key(typ, name):
    return re.sub(r'[^A-Za-z0-9_.-]', '_', typ + '__' + name)

made = 0
missing = []
if 'icons' in kinds:
    os.makedirs(os.path.join(ROOT, 'assets', 'icons'), exist_ok=True)
    reqs = [tuple(x) for x in json.load(open(os.path.join(ROOT, 'data', 'icon-requests.json'), encoding='utf-8'))]
    reqs += [tuple(x) for x in cfg.get('icons', [])]
    reqs += [('technology', t) for t in cfg.get('technology_icons', [])]
    for typ, name in sorted(set(reqs)):
        img, srcs = icon_for(typ, name)
        if img is None:
            missing.append([typ, name])
            continue
        outp = os.path.join(ROOT, 'assets', 'icons', key(typ, name) + '.webp')
        save_webp(img, outp)
        manifest['icons/' + key(typ, name) + '.webp'] = {'from': 'icon of %s/%s' % (typ, name), 'sources': [rel(s) + '#' + sha(s) for s in srcs]}
        made += 1

# ---------------------------------------------------------------- sprites
FRAME = [0]
def first_sprite_layers(node):
    """Return list of (filename, x, y, w, h, scale, shift, shadow) from a graphics node."""
    if node is None:
        return []
    if isinstance(node, list):
        for n in node:
            r = first_sprite_layers(n)
            if r:
                return r
        return []
    if not isinstance(node, dict):
        return []
    if 'layers' in node:
        out = []
        for l in node['layers']:
            out += first_sprite_layers(l)
        return out
    for k in ('sheet', 'sheets'):
        if k in node:
            return first_sprite_layers(node[k])
    if 'filename' in node or 'filenames' in node or 'stripes' in node:
        fn = node.get('filename') or (node.get('filenames') or [None])[0] or (node.get('stripes') or [{}])[0].get('filename')
        if not fn:
            return []
        w = node.get('width') or (node.get('size')[0] if isinstance(node.get('size'), list) else node.get('size'))
        h = node.get('height') or (node.get('size')[1] if isinstance(node.get('size'), list) else node.get('size'))
        fr = FRAME[0]
        x, y = node.get('x', 0), node.get('y', 0)
        if fr:
            ll = node.get('line_length') or node.get('direction_count') or 1
            lpf = node.get('lines_per_file')
            fns = node.get('filenames')
            if fns and lpf:
                per = ll * lpf
                fn = fns[min(len(fns) - 1, fr // per)]
                fr = fr % per
            x += (fr % ll) * w
            y += (fr // ll) * h
        return [(fn, x, y, w, h, node.get('scale', 1), node.get('shift') or [0, 0],
                 node.get('draw_as_shadow') or node.get('draw_as_light') or node.get('draw_as_glow'), node.get('tint'))]
    for k in ('north', 'animation', 'picture', 'idle_animation', 'run_animation', 'base_picture', 'structure', 'pictures', 'animations',
              'graphics_set', 'working_visualisations', 'sprite', 'integration_patch', 'horizontal_animation', 'vertical_animation',
              'folded_animation', 'prepared_animation', 'base', 'image', 'layers', 'frozen_patch', 'idle', 'east', 'south',
              'on_animation', 'off_animation', 'rotated', 'chargable_graphics', 'picture', 'base_day_sprite', 'shadow', 'charge_animation',
              'discharge_animation', 'states', 'frames', 'animation_progress'):
        if k in node:
            r = first_sprite_layers(node[k])
            if r:
                return r
    return []

def render_sprite(entry):
    p = find_proto(entry['type'], entry['name'])
    if p is None:
        return None, []
    node = p
    for k in entry.get('path', []):
        node = node.get(k) if isinstance(node, dict) else (node[k] if isinstance(node, list) and isinstance(k, int) and k < len(node) else None)
        if node is None:
            return None, []
    FRAME[0] = entry.get('frame', 0)
    layers = first_sprite_layers(node)
    pieces = []
    srcs = []
    for fn, x, y, w, h, scale, shift, shadow, tint in layers:
        if shadow and not entry.get('shadows'):
            continue
        path = resolve(fn)
        if not path or not w or not h:
            continue
        srcs.append(path)
        im = Image.open(path).convert('RGBA').crop((x, y, x + w, y + h))
        im = tint_img(im, tint)
        if isinstance(shift, dict):
            shift = [shift.get('x', 0), shift.get('y', 0)]
        pieces.append((im, scale, shift))
    if not pieces:
        return None, []
    # common canvas in tile units (32 px per tile at scale 1 -> use 64 px/tile for HR)
    ppt = entry.get('px_per_tile', 64)
    boxes = []
    for im, scale, shift in pieces:
        wt = im.width * scale / 32
        ht = im.height * scale / 32
        boxes.append((shift[0] - wt / 2, shift[1] - ht / 2, shift[0] + wt / 2, shift[1] + ht / 2))
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    W = max(1, round((x1 - x0) * ppt)); H = max(1, round((y1 - y0) * ppt))
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (im, scale, shift), b in zip(pieces, boxes):
        pw = max(1, round((b[2] - b[0]) * ppt)); ph = max(1, round((b[3] - b[1]) * ppt))
        im2 = im.resize((pw, ph), Image.LANCZOS)
        layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        layer.paste(im2, (round((b[0] - x0) * ppt), round((b[1] - y0) * ppt)))
        canvas = Image.alpha_composite(canvas, layer)
    bb = canvas.getbbox()
    if bb:
        canvas = canvas.crop(bb)
    mx = entry.get('max', 512)
    if max(canvas.size) > mx:
        canvas.thumbnail((mx, mx), Image.LANCZOS)
    return canvas, srcs

if 'sprites' in kinds:
    os.makedirs(os.path.join(ROOT, 'assets', 'sprites'), exist_ok=True)
    for e in cfg.get('sprites', []):
        img, srcs = render_sprite(e)
        if img is None:
            missing.append(['sprite', e['name']])
            continue
        outp = os.path.join(ROOT, 'assets', 'sprites', e['key'] + '.webp')
        save_webp(img, outp)
        manifest['sprites/' + e['key'] + '.webp'] = {'from': 'first frame of %s/%s %s' % (e['type'], e['name'], '/'.join(map(str, e.get('path', [])))),
                                                     'sources': [rel(s) + '#' + sha(s) for s in srcs]}
        made += 1

# ---------------------------------------------------------------- static files
if 'static' in kinds:
    for e in cfg.get('static', []):
        src = e['src']
        src_abs = resolve(src) if src.startswith('__') else (src if os.path.isabs(src) else os.path.join(WS, src))
        if not src_abs or not os.path.exists(src_abs):
            missing.append(['static', src])
            continue
        dst = os.path.join(ROOT, 'assets', 'static', e['dst'])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if e.get('strip'):
            # sprite sheet (grid of frames) -> one horizontal strip for a CSS steps() animation
            fw, fh, cols, n = e['strip']
            sheet = Image.open(src_abs).convert('RGBA')
            out = Image.new('RGBA', (fw * n, fh), (0, 0, 0, 0))
            for i in range(n):
                x, y = (i % cols) * fw, (i // cols) * fh
                out.paste(sheet.crop((x, y, x + fw, y + fh)), (i * fw, 0))
            out.save(dst, quality=e.get('quality', 82), method=4)
        elif e.get('keyout'):
            # make a dark background transparent in every frame (animated WebP logo): alpha = (max(r,g,b) - lo) / (hi - lo)
            from PIL import ImageSequence
            lo, hi = e['keyout']
            frames, durs = [], []
            for f in ImageSequence.Iterator(Image.open(src_abs)):
                fr = f.convert('RGBA')
                from PIL import ImageChops
                r, g, b_, a_ = fr.split()
                mx = ImageChops.lighter(ImageChops.lighter(r, g), b_)
                k = mx.point(lambda v: max(0, min(255, int((v - lo) * 255 / (hi - lo)))))
                fr.putalpha(ImageChops.multiply(k, a_))
                frames.append(fr); durs.append(f.info.get('duration', 67))
            frames[0].save(dst, save_all=True, append_images=frames[1:], duration=durs, loop=0, quality=88, method=4)
        elif e.get('crop') or e.get('resize') or e.get('format'):
            im = Image.open(src_abs)
            if e.get('crop'):
                im = im.crop(tuple(e['crop']))
            if e.get('resize'):
                im.thumbnail(tuple(e['resize']), Image.LANCZOS)
            im.save(dst, quality=e.get('quality', 85), method=6) if dst.endswith('.webp') else im.save(dst, quality=e.get('quality', 85))
        else:
            shutil.copyfile(src_abs, dst)
        manifest['static/' + e['dst']] = {'from': e.get('note', 'copy'), 'sources': [rel(src_abs) + '#' + sha(src_abs)]}
        made += 1

# average visible colour of every icon (used by widgets for map/ore colours; canvas sampling is blocked on file://)
if 'icons' in kinds:
    colors = {}
    for f in glob.glob(os.path.join(ROOT, 'assets', 'icons', '*.webp')):
        im = Image.open(f).convert('RGBA').resize((16, 16))
        px = [p for p in im.getdata() if p[3] > 200]
        if px:
            colors[os.path.basename(f)[:-5]] = '#%02x%02x%02x' % tuple(sum(p[i] for p in px) // len(px) for i in range(3))
    json.dump(colors, open(os.path.join(ROOT, 'data', 'icon-colors.json'), 'w', encoding='utf-8'), indent=0, sort_keys=True)

# drop manifest entries whose files no longer exist (e.g. after a format change)
manifest = {k: v for k, v in manifest.items() if os.path.exists(os.path.join(ROOT, 'assets', k))}
json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
print('assets written: %d; missing: %d' % (made, len(missing)))
for m in missing[:60]:
    print('  missing', m)
