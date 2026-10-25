"""Extract guide statistics from a Factorio data-raw dump.

Usage (from the guide folder):
    python -I tools/extract_stats.py --dump <data-raw-dump.json> [--inputs <inputs.json>]

Writes:
    data/stats.json   - all numbers and tables used by the guide (RU/EN names included)
    data/icon-requests.json - list of [type, name] whose icons tools/collect_assets.py renders

Nothing in mods/ or the game is modified. The dump is read-only input.
Locale: game data (core/base/quality/elevated-rails) + every mod folder locale/<lang>/*.cfg,
alphabetical order, later files override earlier ones (approximation of load order;
zzz* mods win, which matches the modpack in practice).
"""
import math, argparse, collections, glob, hashlib, json, os, re, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.dirname(ROOT)
DEFAULT_MODS = os.path.join(WS, 'ParanoidalModpack-master', 'mods')
DEFAULT_GAME = 'C:/Games/Factorio 2.077 - QUILITY/data'

ap = argparse.ArgumentParser()
ap.add_argument('--dump', required=True)
ap.add_argument('--inputs', help='inputs.json of the dump run (enabled mods list)')
ap.add_argument('--mods', default=DEFAULT_MODS)
ap.add_argument('--game', default=DEFAULT_GAME)
args = ap.parse_args()

t0 = time.time()
raw_bytes = open(args.dump, 'rb').read()
dump_sha = hashlib.sha256(raw_bytes).hexdigest()
D = json.loads(raw_bytes)
del raw_bytes

# ---------------------------------------------------------------- locale
def parse_cfg(path, store):
    sec = ''
    for line in open(path, encoding='utf-8-sig', errors='replace'):
        line = line.rstrip('\r\n')
        if not line or line[0] in ';#':
            continue
        if line.startswith('['):
            sec = line.strip()[1:-1]
            continue
        if '=' in line:
            k, v = line.split('=', 1)
            store[sec + '.' + k.strip()] = v

L = {}
for lang in ('en', 'ru'):
    s = {}
    roots = [os.path.join(args.game, m) for m in ('core', 'base', 'elevated-rails', 'quality')]
    roots += sorted(glob.glob(os.path.join(args.mods, '*', '')), key=lambda p: os.path.basename(p.rstrip('/\\')).lower())
    for r in roots:
        for f in sorted(glob.glob(os.path.join(r, 'locale', lang, '*.cfg'))):
            parse_cfg(f, s)
    L[lang] = s

PFX = {'ITEM': 'item-name', 'ENTITY': 'entity-name', 'FLUID': 'fluid-name', 'TILE': 'tile-name', 'RECIPE': 'recipe-name'}
def clean(t, lang):
    t = re.sub(r'__(ITEM|ENTITY|FLUID|TILE|RECIPE)__([\w\-]+)__', lambda m: L[lang].get(PFX[m.group(1)] + '.' + m.group(2), m.group(2)), t)
    t = re.sub(r'\[/?(color|font)[^\]]*\]', '', t)
    return t.replace('\\n', ' ').strip()

def res(ls, lang):
    if isinstance(ls, str):
        return L[lang].get(ls, ls)
    if not isinstance(ls, list) or not ls:
        return str(ls)
    key = ls[0]
    args_ = [res(a, lang) for a in ls[1:]]
    if key == '':
        return ''.join(args_)
    if key == '?':
        for a in ls[1:]:
            r = res(a, lang)
            if r and not (isinstance(a, list) and a and r == a[0]):
                return r
        return args_[-1] if args_ else ''
    t = L[lang].get(key)
    if t is None:
        return key
    for i, a in enumerate(args_):
        t = t.replace('__%d__' % (i + 1), str(a))
    return clean(t, lang)

ITEM_TYPES = ['item', 'tool', 'ammo', 'capsule', 'module', 'gun', 'armor', 'item-with-entity-data', 'repair-tool',
              'rail-planner', 'selection-tool', 'blueprint', 'spidertron-remote', 'item-with-tags', 'item-with-inventory',
              'copy-paste-tool', 'deconstruction-item', 'upgrade-item', 'blueprint-book']

def find(name, types):
    for t in types:
        if name in D.get(t, {}):
            return t, D[t][name]
    return None, None

def lname(typ, n, lang):
    p = D.get(typ, {}).get(n, {})
    if p.get('localised_name') is not None:
        r = res(p['localised_name'], lang)
        if r and '-name.' not in r:
            return r
    if typ in ITEM_TYPES:
        c = ['item-name.', 'entity-name.', 'equipment-name.']
    elif typ == 'fluid':
        c = ['fluid-name.']
    elif typ == 'recipe':
        c = ['recipe-name.', 'item-name.', 'fluid-name.', 'entity-name.']
    elif typ == 'technology':
        c = ['technology-name.']
    elif typ == 'quality':
        c = ['quality-name.']
    elif typ == 'tile':
        c = ['tile-name.']
    elif typ == 'achievement' or typ.endswith('achievement'):
        c = ['achievement-name.']
    else:
        c = ['entity-name.', 'item-name.', 'equipment-name.']
    for x in c:
        if x + n in L[lang]:
            return clean(L[lang][x + n], lang)
    if typ == 'technology':
        m = re.match(r'(.*)-(\d+)$', n)
        if m and 'technology-name.' + m.group(1) in L[lang]:
            return clean(L[lang]['technology-name.' + m.group(1)], lang) + ' ' + m.group(2)
    if typ == 'recipe':
        r = p.get('main_product') or ((p.get('results') or [{}])[0].get('name'))
        if r:
            for x in ['item-name.', 'fluid-name.', 'entity-name.']:
                if x + r in L[lang]:
                    return clean(L[lang][x + r], lang)
    if typ not in ITEM_TYPES and typ != 'fluid':
        # entities often share the item name
        for x in ['item-name.']:
            if x + n in L[lang]:
                return clean(L[lang][x + n], lang)
    return n

ICONS = set()
def ent(typ, n, **extra):
    """Standard record: id, type, ru/en names, icon key."""
    ICONS.add((typ, n))
    r = {'id': n, 'type': typ, 'ru': lname(typ, n, 'ru'), 'en': lname(typ, n, 'en'), 'icon': icon_key(typ, n)}
    r.update(extra)
    return r

def icon_key(typ, n):
    return re.sub(r'[^A-Za-z0-9_.-]', '_', typ + '__' + n)

def energy(s):
    """'1.8MW' -> watts or joules (float)."""
    if s is None:
        return None
    if isinstance(s, (int, float)):
        return float(s)
    m = re.match(r'^\s*([0-9.eE+-]+)\s*([kMGTPEZY]?)([WJ])\s*$', str(s))
    if not m:
        return None
    mult = {'': 1, 'k': 1e3, 'M': 1e6, 'G': 1e9, 'T': 1e12, 'P': 1e15, 'E': 1e18, 'Z': 1e21, 'Y': 1e24}[m.group(2)]
    return float(m.group(1)) * mult

vis = lambda p: not p.get('hidden')
S = {'meta': {}, 'counts': {}, 'records': {}}

# ---------------------------------------------------------------- meta
inputs = json.load(open(args.inputs, encoding='utf-8')) if args.inputs else {}
enabled = inputs.get('enabled_mods', [])
S['meta'] = {
    'generated': time.strftime('%Y-%m-%d %H:%M'),
    'dump': os.path.relpath(args.dump, WS).replace('\\', '/'),
    'dump_sha256': dump_sha,
    'engine': inputs.get('engine', {}).get('version'),
    'dlc': inputs.get('dlc_enabled_in_list'),
    'git': inputs.get('git'),
    'mods_enabled': len(enabled),
}

# ---------------------------------------------------------------- mods
LIB = re.compile(r'lib|stdlib|flib|Robot256Lib|ParanoidalLocale|graphics|reskins-library|reskins-sprite-utils|zzzcompability|settings', re.I)
info = {}
for f in glob.glob(os.path.join(args.mods, '*', 'info.json')):
    try:
        j = json.load(open(f, encoding='utf-8-sig'))
        info[j['name']] = j
    except Exception:
        pass
local_only = [n for n, j in info.items() if 'not part of the modpack' in (j.get('description') or '')]
S['counts']['mods_enabled'] = len(enabled)
S['counts']['mods_libraries'] = sum(1 for m in enabled if LIB.search(m))
S['counts']['mods_local_tweaks_excluded'] = local_only
S['counts']['mods_gameplay'] = len([m for m in enabled if not LIB.search(m) and m not in local_only])

# ---------------------------------------------------------------- prototype totals
S['counts']['prototypes_total'] = sum(len(v) for v in D.values())
S['counts']['prototype_types'] = len(D)
items_all = {(t, n): p for t in ITEM_TYPES for n, p in D.get(t, {}).items()}
S['counts']['items_total'] = len(items_all)
S['counts']['items_visible'] = sum(1 for p in items_all.values() if vis(p) and not p.get('parameter'))
S['counts']['fluids_visible'] = sum(1 for p in D['fluid'].values() if vis(p) and not p.get('parameter'))

R = D['recipe']
unlocked = set()
for tn, t in D['technology'].items():
    if not vis(t):
        continue
    for e in t.get('effects') or []:
        if e.get('type') == 'unlock-recipe':
            unlocked.add(e.get('recipe'))
def recipe_reachable(n, r):
    return vis(r) and not r.get('parameter') and (r.get('enabled', True) is not False or n in unlocked)
rec_cat = collections.Counter()
reach = {}
for n, r in R.items():
    if not recipe_reachable(n, r):
        continue
    cat = r.get('category', 'crafting')
    kind = 'recycling' if cat.startswith('recycling') or n.endswith('-recycling') else \
           'barrel' if re.search(r'(^|-)(empty|fill)-.*barrel|barrel-(empty|fill)', n) else \
           'void' if 'void' in cat or 'void' in n else 'main'
    rec_cat[kind] += 1
    reach[n] = kind
S['counts']['recipes_total_prototypes'] = len(R)
S['counts']['recipes_reachable'] = len(reach)
S['counts']['recipes_main'] = rec_cat['main']
S['counts']['recipes_recycling'] = sum(1 for r in R.values() if (r.get('category') or '').startswith('recycling'))
S['counts']['recipes_barrel'] = rec_cat['barrel']
S['counts']['recipes_void'] = rec_cat['void']
S['counts']['recipe_categories'] = len(D['recipe-category'])

T = {n: t for n, t in D['technology'].items() if vis(t)}
S['counts']['technologies_visible'] = len(T)
S['counts']['technologies_infinite'] = sum(1 for t in T.values() if t.get('max_level') == 'infinite')
S['counts']['technologies_trigger'] = sum(1 for t in T.values() if t.get('research_trigger'))

ach_types = [t for t in D if t.endswith('achievement')]
S['counts']['achievements'] = sum(len(D[t]) for t in ach_types)
S['counts']['achievement_kinds'] = len(ach_types)
S['counts']['enemy_spawners'] = len(D['unit-spawner'])
S['counts']['worms'] = sum(1 for n in D['turret'] if 'worm' in n)
S['counts']['qualities'] = sum(1 for p in D['quality'].values() if vis(p))
S['counts']['qualities_positive'] = sum(1 for n, p in D['quality'].items() if vis(p) and p.get('level', 0) > 0)
S['counts']['qualities_defect'] = sum(1 for n in D['quality'] if n.startswith('ic-defect'))
S['counts']['modules'] = sum(1 for p in D['module'].values() if vis(p))
S['counts']['trees'] = len(D['tree'])
S['counts']['tiles'] = len(D['tile'])
S['counts']['decoratives'] = len(D.get('optimized-decorative', {}))
S['counts']['locale_ru'] = len(L['ru'])
S['counts']['locale_en'] = len(L['en'])
S['counts']['item_groups'] = len(D['item-group'])
S['counts']['item_subgroups'] = len(D['item-subgroup'])
S['counts']['sounds_ambient'] = len(D.get('ambient-sound', {}))
S['counts']['tips'] = len(D['tips-and-tricks-item'])
S['counts']['shortcuts'] = len(D['shortcut'])
S['counts']['custom_inputs'] = len(D['custom-input'])

# vanilla reference (counted in game prototypes, approximate, see AGENTS-GUIDE)
S['vanilla_reference'] = {
    'note': 'Factorio 2.0 base + quality + elevated-rails without Space Age. recipes/technologies: count of type="recipe"/"technology" in the game prototypes (approx.); the rest: well-known vanilla values. Update by hand only if the vanilla game changes.',
    'recipes': 201, 'technologies': 200, 'qualities': 5, 'science_packs': 7, 'enemy_units': 2, 'spawners': 2,
    'belt_tiers': 3, 'modules': 12, 'ores': 5, 'fluids': 8, 'turrets': 4, 'boiler_efficiency': 1.0, 'labs': 1,
    'assemblers': 3, 'locomotives': 1, 'boilers': 1, 'drills': 2, 'inserters': 5, 'achievements': 59}

# ---------------------------------------------------------------- machines (visible, placeable)
def placeable(typ):
    return [n for n, p in D.get(typ, {}).items() if vis(p) and p.get('minable')]
mach = {}
for t in ['assembling-machine', 'furnace', 'mining-drill', 'lab', 'boiler', 'generator', 'burner-generator', 'reactor', 'solar-panel',
          'accumulator', 'electric-pole', 'inserter', 'transport-belt', 'underground-belt', 'splitter', 'loader-1x1', 'loader',
          'container', 'logistic-container', 'storage-tank', 'pipe', 'pipe-to-ground', 'pump', 'offshore-pump', 'roboport',
          'locomotive', 'cargo-wagon', 'fluid-wagon', 'artillery-wagon', 'car', 'spider-vehicle', 'ammo-turret', 'electric-turret',
          'fluid-turret', 'artillery-turret', 'radar', 'lamp', 'beacon', 'wall', 'gate', 'valve']:
    mach[t] = len([n for n in placeable(t) if not n.startswith('hero-turret') and '___' not in n])
S['counts']['placeable_by_type'] = mach
S['counts']['buildings_placeable'] = sum(mach.values())
S['counts']['hero_turret_ranks'] = sum(1 for t in ['ammo-turret', 'electric-turret', 'fluid-turret', 'artillery-turret'] for n in D[t] if n.startswith('hero-turret'))

# ---------------------------------------------------------------- science packs
lab_inputs = set()
for p in D['lab'].values():
    lab_inputs.update(p.get('inputs', []))
packs = [n for n in D['tool'] if n in lab_inputs and vis(D['tool'][n])]
MODULE_TOKENS = {n for n in packs if n.startswith(('bob-module', 'module-combining')) or n.endswith('-processor')}
pack_use = collections.Counter()
pack_total = collections.Counter()
for n, t in T.items():
    u = t.get('unit')
    if not u:
        continue
    cnt = u.get('count')
    if cnt is None:
        continue
    for ing in u.get('ingredients', []):
        nm = ing[0] if isinstance(ing, list) else ing.get('name')
        am = ing[1] if isinstance(ing, list) else ing.get('amount', 1)
        pack_use[nm] += 1
        pack_total[nm] += cnt * am
S['records']['science_packs'] = [ent('tool', n, techs=pack_use[n], total_for_all_finite=pack_total[n]) for n in packs]
S['counts']['science_packs'] = len(packs) - len(MODULE_TOKENS)
S['counts']['module_research_tokens'] = len(MODULE_TOKENS)
for r in S['records']['science_packs']:
    r['module_token'] = r['id'] in MODULE_TOKENS
S['counts']['science_packs_total_all_finite'] = sum(pack_total.values())

# most expensive finite technology (by total packs)
def tech_cost(t):
    u = t.get('unit') or {}
    if u.get('count') is None:
        return 0, 0, 0
    tot = 0
    for ing in u.get('ingredients', []):
        tot += u['count'] * (ing[1] if isinstance(ing, list) else ing.get('amount', 1))
    return tot, u['count'], u.get('time', 0)
exp = sorted(((tech_cost(t)[0], n) for n, t in T.items()), reverse=True)[:12]
S['records']['tech_most_expensive'] = [ent('technology', n, packs_total=c, packs_kinds=len((T[n].get('unit') or {}).get('ingredients', [])), count=tech_cost(T[n])[1], time=tech_cost(T[n])[2]) for c, n in exp]

# tech depth (longest prerequisite chain)
memo = {}
def depth(n, stack=()):
    if n in memo:
        return memo[n]
    if n in stack or n not in T:
        return 0
    pr = T[n].get('prerequisites') or []
    v = 1 + max([depth(x, stack + (n,)) for x in pr] or [0])
    memo[n] = v
    return v
deepest = sorted(((depth(n), n) for n in T), reverse=True)[:5]
S['counts']['tech_max_depth'] = deepest[0][0]
S['records']['tech_deepest'] = [ent('technology', n, depth=dp) for dp, n in deepest]
# era distribution: number of distinct pack kinds
era = collections.Counter(len((t.get('unit') or {}).get('ingredients', [])) for t in T.values() if t.get('unit'))
S['records']['tech_by_pack_kinds'] = sorted(era.items())

# ---------------------------------------------------------------- recipe records
def ings(r):
    return r.get('ingredients') or []
def results(r):
    return r.get('results') or []
main = {n: R[n] for n, k in reach.items() if k == 'main'}
most_ing = sorted(main.items(), key=lambda x: -len(ings(x[1])))[:8]
S['records']['recipe_most_ingredients'] = [ent('recipe', n, ingredients=len(ings(r)), list=[i.get('name') for i in ings(r)]) for n, r in most_ing]
longest = sorted(main.items(), key=lambda x: -(x[1].get('energy_required') or 0.5))[:8]
S['records']['recipe_longest'] = [ent('recipe', n, seconds=r.get('energy_required') or 0.5) for n, r in longest]
most_res = sorted(main.items(), key=lambda x: -len(results(x[1])))[:8]
S['records']['recipe_most_results'] = [ent('recipe', n, results=len(results(r))) for n, r in most_res]
# producers / consumers of iron plate as a "how many ways" example
def count_producers(name):
    return sum(1 for r in main.values() if any(x.get('name') == name for x in results(r)))
def count_consumers(name):
    return sum(1 for r in main.values() if any(x.get('name') == name for x in ings(r)))
ways = []
for nm in ['iron-plate', 'copper-plate', 'steel-plate', 'stone', 'water', 'angels-gas-hydrogen', 'electronic-circuit', 'sulfuric-acid', 'angels-slag', 'coal', 'wood', 'angels-plate-iron']:
    t, p = find(nm, ITEM_TYPES + ['fluid'])
    if t:
        ways.append(ent(t, nm, produced_by=count_producers(nm), used_in=count_consumers(nm)))
S['records']['ways'] = ways
# top consumed items
cons = collections.Counter()
prod = collections.Counter()
for r in main.values():
    for x in ings(r):
        cons[(x.get('type', 'item'), x.get('name'))] += 1
    for x in results(r):
        prod[(x.get('type', 'item'), x.get('name'))] += 1
def rec_for(key):
    typ, nm = key
    t, p = find(nm, ['fluid'] if typ == 'fluid' else ITEM_TYPES)
    return t or typ, nm
S['records']['top_ingredients'] = [ent(*rec_for(k), recipes=v) for k, v in cons.most_common(15)]
S['records']['top_products'] = [ent(*rec_for(k), recipes=v) for k, v in prod.most_common(15)]

# ---------------------------------------------------------------- energy
def burner_rec(typ, n, p, src_key='energy_source'):
    es = p.get(src_key) or {}
    return ent(typ, n,
               effectivity=es.get('effectivity', 1),
               source=es.get('type'),
               power_w=energy(p.get('energy_consumption') or p.get('max_power_output') or p.get('consumption')),
               pollution=(es.get('emissions_per_minute') or {}).get('pollution'),
               target_temperature=p.get('target_temperature'))
S['records']['boilers'] = [burner_rec('boiler', n, p) for n, p in D['boiler'].items() if vis(p) and p.get('minable')]
gens = []
for n, p in D['generator'].items():
    if vis(p) and p.get('minable'):
        mpo = energy(p.get('max_power_output'))
        if mpo is not None and p.get('burns_fluid'):
            mpo *= 60  # max_power_output of fluid-burning generators is J per tick
        if mpo is None:
            fc = p.get('fluid_usage_per_tick')
            mt = p.get('maximum_temperature', 165)
            if fc:
                mpo = fc * 60 * (mt - 15) * 200 * p.get('effectivity', 1)
        gens.append(ent('generator', n, effectivity=p.get('effectivity', 1), power_w=mpo, max_temperature=p.get('maximum_temperature'),
                        burns_fluid=p.get('burns_fluid'), pollution=(p.get('energy_source', {}).get('emissions_per_minute') or {}).get('pollution')))
S['records']['generators'] = gens
S['records']['burner_generators'] = [ent('burner-generator', n, effectivity=(p.get('burner') or {}).get('effectivity', 1),
                                         power_w=energy(p.get('max_power_output')),
                                         pollution=((p.get('burner') or {}).get('emissions_per_minute') or {}).get('pollution'))
                                     for n, p in D['burner-generator'].items() if vis(p) and p.get('minable')]
S['records']['reactors'] = [ent('reactor', n, effectivity=(p.get('energy_source') or {}).get('effectivity', 1), power_w=energy(p.get('consumption')),
                                fuel=(p.get('energy_source') or {}).get('fuel_categories')) for n, p in D['reactor'].items() if vis(p) and p.get('minable')]
S['records']['solar'] = [ent('solar-panel', n, power_w=energy(p.get('production'))) for n, p in D['solar-panel'].items() if vis(p) and p.get('minable')]
S['records']['accumulators'] = [ent('accumulator', n, buffer_j=energy((p.get('energy_source') or {}).get('buffer_capacity'))) for n, p in D['accumulator'].items() if vis(p) and p.get('minable')]
# vehicles with burner effectivity
S['records']['locomotives'] = [ent('locomotive', n, power_w=energy(p.get('max_power')), max_speed_kmh=round(p.get('max_speed', 0) * 216, 1),
                                   effectivity=(p.get('energy_source') or {}).get('effectivity'), fuel=(p.get('energy_source') or {}).get('fuel_categories'))
                               for n, p in D['locomotive'].items() if vis(p) and p.get('minable')]
S['records']['cars'] = [ent('car', n, power_w=energy(p.get('consumption')), health=p.get('max_health'), effectivity=p.get('effectivity'))
                        for n, p in D['car'].items() if vis(p) and p.get('minable')]
S['records']['spiders'] = [ent('spider-vehicle', n, health=p.get('max_health')) for n, p in D['spider-vehicle'].items() if vis(p) and p.get('minable')]

# fuels
fuels = []
for t in ITEM_TYPES:
    for n, p in D.get(t, {}).items():
        if p.get('fuel_value') and vis(p) and not n.endswith('barrel') and p.get('fuel_category') not in ('ic-repair-resource',):
            fuels.append(ent(t, n, category=p.get('fuel_category'), mj=energy(p['fuel_value']) / 1e6,
                             emissions=p.get('fuel_emissions_multiplier', 1), acceleration=p.get('fuel_acceleration_multiplier', 1),
                             top_speed=p.get('fuel_top_speed_multiplier', 1), stack=p.get('stack_size'),
                             burnt=p.get('burnt_result')))
S['records']['fuels_solid'] = sorted(fuels, key=lambda x: x['mj'])
ff = []
for n, p in D['fluid'].items():
    if p.get('fuel_value') and vis(p):
        ff.append(ent('fluid', n, kj=energy(p['fuel_value']) / 1e3, emissions=p.get('emissions_multiplier', 1),
                      gas=p.get('gas_temperature') is not None, base_color=p.get('base_color')))
S['records']['fuels_fluid'] = sorted(ff, key=lambda x: -x['kj'])
S['counts']['fuels_solid'] = len(fuels)
S['counts']['fuels_fluid'] = len(ff)

# ---------------------------------------------------------------- logistics
S['records']['belts'] = [ent('transport-belt', n, items_per_s=round(p['speed'] * 480, 2)) for n, p in D['transport-belt'].items() if vis(p) and p.get('minable')]
S['records']['undergrounds'] = [ent('underground-belt', n, max_distance=p.get('max_distance'), items_per_s=round(p['speed'] * 480, 2)) for n, p in D['underground-belt'].items() if vis(p) and p.get('minable')]
S['records']['inserters'] = [ent('inserter', n, rotation=p.get('rotation_speed'), source=(p.get('energy_source') or {}).get('type'), bulk=p.get('bulk')) for n, p in D['inserter'].items() if vis(p) and p.get('minable')]
S['records']['poles'] = [ent('electric-pole', n, wire=p.get('maximum_wire_distance'), supply=p.get('supply_area_distance')) for n, p in D['electric-pole'].items() if vis(p) and p.get('minable') and not n.startswith('lighted-')]
S['records']['labs'] = [ent('lab', n, power_w=energy(p.get('energy_usage')), speed=p.get('researching_speed', 1), inputs=len(p.get('inputs', [])), source=(p.get('energy_source') or {}).get('type'), tiles=[math.ceil(p['collision_box'][1][0] - p['collision_box'][0][0] - 0.01), math.ceil(p['collision_box'][1][1] - p['collision_box'][0][1] - 0.01)] if p.get('collision_box') else [3, 3]) for n, p in D['lab'].items() if vis(p) and p.get('minable')]
S['records']['drills'] = [ent('mining-drill', n, speed=p.get('mining_speed'), power_w=energy(p.get('energy_usage')), source=(p.get('energy_source') or {}).get('type'), radius=p.get('resource_searching_radius'), categories=p.get('resource_categories'))
                          for n, p in D['mining-drill'].items() if vis(p) and p.get('minable') and '___' not in n]
S['records']['offshore'] = [ent('offshore-pump', n, per_s=round(p.get('pumping_speed', 0) * 60), source=(p.get('energy_source') or {}).get('type')) for n, p in D['offshore-pump'].items() if vis(p) and p.get('minable')]
asm = []
for n, p in D['assembling-machine'].items():
    if vis(p) and p.get('minable'):
        asm.append(ent('assembling-machine', n, speed=p.get('crafting_speed'), categories=len(p.get('crafting_categories', [])), source=(p.get('energy_source') or {}).get('type'),
                       modules=p.get('module_slots', 0), power_w=energy(p.get('energy_usage'))))
S['records']['assemblers_count'] = len(asm)
S['records']['assemblers_fastest'] = sorted(asm, key=lambda x: -(x['speed'] or 0))[:10]
S['records']['burner_machines'] = [x for x in asm if x['source'] == 'burner']

# ---------------------------------------------------------------- resources
res_ = []
for n, p in D['resource'].items():
    mi = p.get('minable', {})
    mc = p.get('map_color') or {}
    if isinstance(mc, list): mc = {'r': mc[0], 'g': mc[1], 'b': mc[2]}
    if mc and max(mc.get('r', 0), mc.get('g', 0), mc.get('b', 0)) <= 1: mc = {k: v * 255 for k, v in mc.items()}
    res_.append(ent('resource', n, map_color='#%02x%02x%02x' % (int(mc.get('r', 128)), int(mc.get('g', 128)), int(mc.get('b', 128))),
                    infinite=bool(p.get('infinite')), fluid=mi.get('required_fluid'), fluid_amount=mi.get('fluid_amount'),
                    results=[r.get('name') for r in mi.get('results', [])], category=p.get('category')))
S['records']['resources'] = res_
for r in res_:
    if r['fluid']:
        ICONS.add(('fluid', r['fluid']))
        r['fluid_ru'] = lname('fluid', r['fluid'], 'ru')
        r['fluid_en'] = lname('fluid', r['fluid'], 'en')
        r['fluid_icon'] = icon_key('fluid', r['fluid'])


# ---------------------------------------------------------------- ore decoder (Angels ores -> sorting outputs by stage)
ore_dec = []
for i in range(1, 7):
    ore = 'angels-ore%d' % i
    if ore not in D['item']:
        continue
    stages = []
    for st, label in (('crushed', 'crushed'), ('chunk', 'chunk'), ('crystal', 'crystal'), ('pure', 'pure')):
        rn = '%s-%s-processing' % (ore, st)
        r = R.get(rn)
        if not r:
            continue
        inp = (r.get('ingredients') or [{}])[0]
        outs = []
        for x in r.get('results') or []:
            t, _ = find(x['name'], ITEM_TYPES)
            outs.append(ent(t or 'item', x['name'], amount=x.get('amount')))
        stages.append({'stage': st, 'input_amount': inp.get('amount'), 'input': ent('item', inp.get('name')), 'outputs': outs,
                       'machine_category': r.get('category')})
    fluid = D['resource'].get(ore, {}).get('minable', {}).get('required_fluid')
    ore_dec.append({'ore': ent('item', ore), 'mining_fluid': ent('fluid', fluid) if fluid else None, 'stages': stages,
                    'infinite_fluid': (lambda f: ent('fluid', f) if f else None)(D['resource'].get('infinite-' + ore, {}).get('minable', {}).get('required_fluid'))})
S['records']['ore_decoder'] = ore_dec
# refining chain machines
S['records']['refining_machines'] = [ent('assembling-machine', n) for n in ['angels-ore-crusher', 'angels-ore-floatation-cell', 'angels-ore-leaching-plant', 'angels-ore-refinery', 'angels-ore-sorting-facility'] if n in D['assembling-machine']]


# ---------------------------------------------------------------- hotkeys (mod custom inputs with a default key)
hk = []
for n, p in D['custom-input'].items():
    ks = p.get('key_sequence')
    if not ks or p.get('hidden') or p.get('linked_game_control') or n.startswith('lst-'):
        continue
    ru, en = L['ru'].get('controls.' + n), L['en'].get('controls.' + n)
    if not ru and not en:
        continue
    hk.append({'id': n, 'keys': ks, 'ru': clean(ru or en, 'ru'), 'en': clean(en or ru, 'en')})
S['records']['hotkeys'] = hk
S['counts']['hotkeys_mod'] = len(hk)
dup = collections.Counter(h['keys'] for h in hk)
S['records']['hotkey_conflicts'] = sorted([[k, v] for k, v in dup.items() if v > 1], key=lambda x: -x[1])

# ---------------------------------------------------------------- puffer breeding (random outputs)
puff = []
for n, r in R.items():
    if re.match(r'^angels-bio-puffer-egg-\d+$', n) and recipe_reachable(n, r):
        outs = []
        for x in r.get('results') or []:
            t = 'fluid' if x.get('type') == 'fluid' else (find(x['name'], ITEM_TYPES)[0] or 'item')
            outs.append(ent(t, x['name'], probability=x.get('probability', 1), amount=x.get('amount')))
        puff.append(ent('recipe', n, outputs=outs))
S['records']['puffer_breeding'] = puff


# ---------------------------------------------------------------- spot values for individual entities used by widgets/text
SPOT = ['aai-big-ship-wreck-1', 'salvaged-lab', 'salvaged-assembling-machine', 'salvaged-generator', 'crash-site-spaceship', 'burner-lab', 'ic-refine-workshop', 'ic-control-post',
        'memory-unit', 'fluid-memory-unit', 'factory-1', 'factory-2', 'factory-3', 'factory-4', 'texugo-wind-turbine', 'texugo-wind-turbine2', 'texugo-wind-turbine3',
        'RITEG-1', 'big-burner-generator', 'angels-burner-reactor', 'paranoidal-beta8-hyper-lab', 'paranoidal-beta8-big-lab', 'big-lab', 'yir_usl', 'hiend_loco',
        'bet-locomotive', 'rocket-silo', 'teleporter', 'bi-dart-turret', 'repair-turret', 'zcs-trash-landfill', 'warehouse-basic', 'subterranean-belt', 'nco-crane',
        'Schall-pickup-tower-R128', 'pd-fire-safety-turret', 'pd-fire-safety-turret-mk2', 'offshore-mk0-pump', 'burner-mining-drill', 'boiler', 'steam-engine']
spot = {}
for n in SPOT:
    for t, v in D.items():
        if n in v and t not in ('item', 'recipe', 'technology', 'corpse', 'explosion', 'item-with-entity-data', 'achievement', 'build-entity-achievement'):
            p = v[n]
            es = p.get('energy_source') or p.get('burner') or {}
            rec = ent(t, n, health=p.get('max_health'), crafting_speed=p.get('crafting_speed'), research_speed=p.get('researching_speed'),
                      energy_usage_w=energy(p.get('energy_usage') or p.get('consumption')), production_w=energy(p.get('energy_production') or p.get('max_power_output')),
                      buffer_j=energy(es.get('buffer_capacity')), source=es.get('type'), effectivity=es.get('effectivity'), size=p.get('collision_box'),
                      inventory=p.get('inventory_size'), range=(p.get('attack_parameters') or {}).get('range'))
            spot[n] = rec
            break
S['records']['spot'] = spot


# ---------------------------------------------------------------- machines that absorb pollution (negative emissions)
absorb = []
for t in ['assembling-machine', 'furnace', 'boiler', 'mining-drill', 'lab']:
    for n, p in D.get(t, {}).items():
        if not vis(p) or not p.get('minable'):
            continue
        es = p.get('energy_source') or {}
        pol = (es.get('emissions_per_minute') or {}).get('pollution')
        if pol is not None and pol < 0:
            absorb.append(ent(t, n, pollution=pol, speed=p.get('crafting_speed')))
S['records']['absorbers'] = sorted(absorb, key=lambda x: x['pollution'])
S['counts']['absorbers'] = len(absorb)

# ---------------------------------------------------------------- quality
Q = []
for n, p in D['quality'].items():
    if not vis(p):
        continue
    c = p.get('color')
    if isinstance(c, dict):
        c = [c.get('r', 0), c.get('g', 0), c.get('b', 0)]
    if c and max(c) <= 1:
        c = [x * 255 for x in c]
    Q.append(ent('quality', n, level=p.get('level', 0), color='#%02x%02x%02x' % tuple(int(x) for x in c[:3]) if c else None,
                 next_probability=p.get('next_probability'), defect=n.startswith('ic-defect')))
# defects first (−5..−1), then normal, then positive in chain order
chain = []
cur = 'ic-defect-5'
seen = set()
while cur and cur in D['quality'] and cur not in seen:
    seen.add(cur)
    chain.append(cur)
    cur = D['quality'][cur].get('next')
byid = {q['id']: q for q in Q}
S['records']['qualities'] = [byid[n] for n in chain if n in byid]

# ---------------------------------------------------------------- modules
S['records']['modules'] = [ent('module', n, category=p.get('category'), tier=p.get('tier'), effect={k: round(v, 3) for k, v in (p.get('effect') or {}).items()})
                           for n, p in D['module'].items() if vis(p)]
S['counts']['module_categories'] = len({m['category'] for m in S['records']['modules']})

# ---------------------------------------------------------------- enemies
U = D['unit']
def source_of(n):
    if 'rampant' in n: return 'rampant'
    if n.startswith('bm_fake_human'): return 'humans'
    if n.startswith(('biterzilla', 'bm-motherbiterzilla', 'maf-')): return 'big_monsters'
    if n.startswith('bob-') or '-from-bob-' in n: return 'bob'
    if n in ('small-biter', 'medium-biter', 'big-biter', 'behemoth-biter', 'small-spitter', 'medium-spitter', 'big-spitter', 'behemoth-spitter'): return 'vanilla'
    return 'other'
# enemy KINDS: tiers, sizes, numbered stages, champions and hour-bosses collapse into one kind;
# technical units (Rampant chunk scanners / damage dummies, Bob's player combat drones) are not enemies.
_SIZES = r'(small|medium|big|huge|giant|titan|behemoth|leviathan)'
def enemy_kind(n):
    k = re.sub(r'-(champion|hour-boss)-from-.*$', '', n)
    k = re.sub(r'-v\d+-t\d+-rampant$', '-rampant', k)
    k = re.sub(r'^bob-' + _SIZES + '-', 'bob-', k)
    k = re.sub(r'^' + _SIZES + '-', '', k)
    return re.sub(r'[_-]?\d+$', '', k)
def technical_unit(n):
    return 'chunk-scanner' in n or 'DummySetter' in n or n.startswith('bob-robot-')
kinds = collections.defaultdict(set)
src = collections.defaultdict(lambda: {'units': 0, 'hp_max': 0, 'champions': 0, 'bosses': 0})
for n, p in U.items():
    if technical_unit(n):
        continue
    ek = enemy_kind(n)
    k = 'vanilla' if ek in ('biter', 'spitter') else source_of(ek)   # vanilla-line champions/bosses stay vanilla
    kinds[k].add(ek)
    src[k]['units'] = len(kinds[k])   # number of KINDS from this source
    src[k]['hp_max'] = max(src[k]['hp_max'], p.get('max_health') or 0)
    if 'champion' in n: src[k]['champions'] += 1
    if 'boss' in n: src[k]['bosses'] += 1
S['records']['enemy_sources'] = dict(src)
S['counts']['enemy_units'] = sum(len(v) for v in kinds.values())   # enemy kinds without tiers
S['counts']['enemy_champions'] = sum(1 for n in U if 'champion' in n)
S['counts']['enemy_bosses'] = sum(1 for n in U if 'boss' in n)
S['counts']['enemy_humans'] = src['humans']['units']
S['counts']['enemy_flyers'] = sum(1 for n in U if 'flyer' in n)
top = sorted(U.items(), key=lambda x: -(x[1].get('max_health') or 0))
seen_names = set()
bosses = []
for n, p in top:
    nm = lname('unit', n, 'ru')
    if nm in seen_names:
        continue
    seen_names.add(nm)
    bosses.append(ent('unit', n, health=p.get('max_health'), speed_kmh=round((p.get('movement_speed') or 0) * 216, 1), source=source_of(n)))
    if len(bosses) >= 16:
        break
S['records']['enemy_toughest'] = bosses
# rampant factions (from hive names)
fac = sorted({re.sub(r'-(biter|spitter)-spawner.*|-super-hive.*|-hive.*', '', n) for n in D['unit-spawner'] if 'rampant' in n and 'proxy' not in n})
S['records']['rampant_factions'] = fac
S['counts']['rampant_factions'] = len(fac)
def resists(p):
    rs = p.get('resistances') or []
    if isinstance(rs, dict):
        rs = [dict(v, type=k) if isinstance(v, dict) else {'type': k} for k, v in rs.items()]
    return [r.get('type') for r in rs if isinstance(r, dict) and (r.get('percent') or 0) >= 50]
fu = []
for f in fac:
    for k in ('biter', 'spitter'):
        n = '%s-%s-v1-t10-rampant' % (f, k)
        if n in U:
            fu.append(ent('unit', n, faction=f, health=U[n].get('max_health'), resist=resists(U[n])))
            break
S['records']['rampant_faction_units'] = fu
bob_breeds = []
for b in ('', 'piercing-', 'electric-', 'acid-', 'explosive-', 'poison-', 'fire-'):
    n = 'bob-leviathan-%sbiter' % b
    if n in U:
        bob_breeds.append(ent('unit', n, health=U[n].get('max_health')))
S['records']['bob_breeds'] = bob_breeds
bm = []
for n in ['bm_fake_human_melee_1', 'bm_fake_human_sniper_5', 'bm_fake_human_nuke_rocket_10', 'bm_fake_human_boss_flamethrower_10', 'bm_fake_human_ultimate_boss_cannon_20',
          'biterzilla15', 'biterzilla25', 'biterzilla35', 'bm-motherbiterzilla5', 'maf-giant-fire-spitter5', 'maf-giant-acid-spitter5', 'maf-boss-biter-10']:
    if n in U:
        bm.append(ent('unit', n, health=U[n].get('max_health'), speed_kmh=round((U[n].get('movement_speed') or 0) * 216, 1)))
S['records']['big_monsters'] = bm
S['records']['enemy_spiders'] = [ent('spider-vehicle', n, health=p.get('max_health')) for n, p in D['spider-vehicle'].items() if n.startswith(('maf_flying_saucer_10', 'bm-spidertron_5'))]
vanilla_biters = ['small-biter', 'medium-biter', 'big-biter', 'behemoth-biter']
S['records']['vanilla_biters'] = [ent('unit', n, health=U[n].get('max_health')) for n in vanilla_biters if n in U]

# turrets (base, not hero ranks)
tur = []
for t in ['ammo-turret', 'electric-turret', 'fluid-turret', 'artillery-turret']:
    for n, p in D[t].items():
        if vis(p) and p.get('minable') and not n.startswith('hero-turret'):
            ap_ = p.get('attack_parameters') or {}
            tur.append(ent(t, n, health=p.get('max_health'), range=ap_.get('range')))
S['records']['turrets'] = tur
S['counts']['turrets'] = len(tur)
S['records']['hero_ranks'] = sorted({re.sub(r'^\s+|\s+$', '', lname('ammo-turret', n, 'ru').split('  ')[-1]) for n in D['ammo-turret'] if n.startswith('hero-turret-') and n.endswith('-for-gun-turret')})
guns = [ent('gun', n) for n, p in D['gun'].items() if vis(p)]
S['counts']['guns'] = len(guns)
S['counts']['ammo'] = sum(1 for p in D['ammo'].values() if vis(p))
S['counts']['ammo_categories'] = len(D['ammo-category'])
S['counts']['armors'] = sum(1 for p in D['armor'].values() if vis(p))
eq_types = [t for t in D if t.endswith('-equipment')]
S['counts']['equipment'] = sum(1 for t in eq_types for p in D[t].values() if vis(p))
S['counts']['capsules'] = sum(1 for p in D['capsule'].values() if vis(p))

# ---------------------------------------------------------------- achievements sample
S['records']['achievement_kinds'] = sorted(((t, len(D[t])) for t in ach_types), key=lambda x: -x[1])

# ---------------------------------------------------------------- all visible fluids (for the fluid wall)
S['records']['fluids_all'] = [ent('fluid', n, gas=p.get('gas_temperature') is not None) for n, p in D['fluid'].items() if vis(p) and not p.get('parameter')]

# ---------------------------------------------------------------- names for every rendered icon (used by {{icon:...}} in sections)
try:
    acfg = json.load(open(os.path.join(HERE, 'assets-config.json'), encoding='utf-8'))
except Exception:
    acfg = {}
for typ, n in acfg.get('icons', []):
    t, _ = find(n, ITEM_TYPES) if typ in ITEM_TYPES else (typ, None)
    ICONS.add((t or typ, n))
for n in acfg.get('technology_icons', []):
    ICONS.add(('technology', n))
names = {}
for typ, n in sorted(ICONS):
    names[icon_key(typ, n)] = {'ru': lname(typ, n, 'ru'), 'en': lname(typ, n, 'en')}
for e in acfg.get('sprites', []):
    names['sprite:' + e['key']] = {'ru': lname(e['type'], e['name'], 'ru'), 'en': lname(e['type'], e['name'], 'en')}

# ---------------------------------------------------------------- write
os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
json.dump(S, open(os.path.join(ROOT, 'data', 'stats.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(sorted(ICONS), open(os.path.join(ROOT, 'data', 'icon-requests.json'), 'w', encoding='utf-8'), indent=0)
json.dump(names, open(os.path.join(ROOT, 'data', 'names.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('stats.json written: %d counts, %d record tables, %d icons requested, %.1fs' % (len(S['counts']), len(S['records']), len(ICONS), time.time() - t0))
