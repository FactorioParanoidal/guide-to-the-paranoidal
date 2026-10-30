# Guide to the Paranoidal — instructions for agents

Read this file in full before you change anything. It is the only maintenance contract of the guide.
Reply to the user in **Russian**; code, comments and this file are in English.

- Live site: https://factorioparanoidal.github.io/guide-to-the-paranoidal/
- Repository: https://github.com/FactorioParanoidal/guide-to-the-paranoidal (GitHub Pages from `main`, root)
- Local folder: `<workspace>/Guide to the Paranoidal/` (= this repository; workspace = the PARANOIDAL folder).
  The modpack lives next to it in `..\ParanoidalModpack-master\` (its own Git repo and rules — `..\AGENTS.md`).

## 1. What the guide is and what “good” means

One long page (`index.html`) that makes a player who only knows vanilla Factorio want to play the Paranoidal 2.0
modpack (Quality + Elevated Rails, **no Space Age**). Priorities, in order:

1. **True facts** from primary sources: the data dump, mod code/README/changelog/locale, in-game tips,
   `docs/FAQ.md`, `docs/Recommendations.md`, user decisions in `agent-context/playthrough/`. Never from memory.
   Paranoidal changes many defaults — always check `mods/zzzparanoidal/settings-final-fixes.lua`,
   `mods/zzzparanoidal-settings/settings-final-fixes.lua` and the working `mods/mod-settings.dat`
   (read-only, `tools/modsettings_diff.py`) before quoting a mod's default.
2. **Interesting and simple**: plain words, short sentences, “in vanilla… here…”, humour/irony, no jargon walls.
   The user asked explicitly: *simpler language*, *everything must look native to a Factorio player*.
3. **Visual**: real game/mod icons and sprites, Factorio GUI look, one orange, hazard stripes.
4. **Bilingual**: every visible text in RU and EN, EN is a full translation.
5. **Wiki-like**: many internal links, glossary tooltips, search, random facts, reader achievements.
6. **Secrets**: reveal mechanics that change how you play; hide wonders behind spoilers/teasers
   (finale, enemy humans, quality summits, refugium bugs, legendary ruins details), but say that they exist.

## 2. File map

```
index.html              BUILT page (never edit by hand) — what GitHub Pages serves
dist/                   git-ignored: Guide_to_the_Paranoidal.html (one-file guide, every asset inside), release.json
.github/workflows/release.yml  CI: on push to main builds dist/ and creates GitHub Release v<guide_version> (§8)
assets/                 icons/ sprites/ static/ (fonts, gui tiles, belt tile, logos, ui icons) + manifest.json (provenance)
data/                   stats.json (all numbers), names.json (RU/EN names of icons), icon-colors.json,
                        icon-requests.json, history/ (old stats.json snapshots for diffs)
src/page.html           shell: top bar, TOC, footer; placeholders <!--@CSS--> <!--@SECTIONS--> <!--@STATS--> <!--@JS--> <!--@META-->
src/sections.json       ORDERED chapter registry: id, file, ru/en, status, sources, verified, achievement_ru/en; guide_version
src/sections/NN-id.html one chapter each; header comment lists widgets and fact sources
src/css/10..50-*.css    base tokens, layout, components, sections, widgets (older rules)
src/css/60-unified.css  THE design system, loaded last, overrides older rules (see §5)
src/js/core.js          runtime: language, TOC/scrollspy, tooltips, search, spoilers, achievements, slider drag,
                        hotkey links, widget loader (lazy; Guide.renderAll() forces all)
src/js/widgets/NN-*.js  widgets of chapter NN: Guide.widget('name', fn)
tools/extract_stats.py  dump -> data/stats.json, names.json, icon-requests.json
tools/collect_assets.py dump + game/mod graphics -> assets/ (icons, sprites, static) + manifest
tools/assets-config.json extra icons, technology icons, sprites, static files (crop / resize / keyout)
tools/build.py          src + data -> index.html (--check runs tools/check.py; --only ids -> _preview.html;
                        --single -> also dist/Guide_to_the_Paranoidal.html)
tools/check.py          dead links, duplicate ids, RU/EN pairing, missing images, widgets, glossary use, spoiler/dossier EN labels,
                        asset paths in JS only through G.asset(), guide_version = page meta = top CHANGELOG section
tools/jscheck.sh        headless Chrome: renders every widget, opens spoilers, switches language; must print ERRS:[] EMPTY:[]
                        (`jscheck.sh ru dist/Guide_to_the_Paranoidal.html` tests the one-file guide alone, also LOCAL:[])
tools/release.py        one-file guide + dist/release.json + release notes; --ci / --compare (used by the workflow)
tools/shot.sh           headless Chrome screenshots -> work/peek/<name>_N.png (LANGQ="?lang=en" for English)
tools/update.sh         full pipeline after a modpack change (extract -> assets -> build -> checks)
tools/modsettings_diff.py read-only reader/diff of mod-settings.dat
work/                   scratch, git-ignored, delete any time
```

Paths that are machine-specific: game data `C:/Games/Factorio 2.077 - QUILITY/data` (`--game`), Chrome in
`C:/Program Files/Google/Chrome/Application/chrome.exe`, mods in `../ParanoidalModpack-master/mods`, dumps in `../test-runs/`.

## 3. Section micro-syntax (expanded by tools/build.py)

| Syntax | Result |
|---|---|
| `<ru>текст</ru><en>text</en>` | `<span lang="ru">…</span><span lang="en">…</span>` |
| `<p lang="ru">…</p><p lang="en">…</p>` | block form; the `en` sibling must follow immediately (check.py) |
| `{{n:counts.items_visible}}` | number from stats.json; `{{n:#records.x}}` = list length; `{{n:records.ways.@id.field}}` = element by id |
| `{{fmt:path\|pct}}` | `pct`, `int`, `mw`, `kj`, `raw` |
| `{{icon:item/iron-plate}}`, `{{icon-lg:technology/x}}` | game icon with RU/EN tooltip (must exist in assets/icons) |
| `{{sprite:key}}`, `{{sprite:key\|md}}` | entity picture from assets/sprites |

Game numbers must come through `{{n:}}`/`{{fmt:}}` or `G.data` so they update with the dump. Numbers that are not in the
dump (mod settings, scripts) may be hard-coded — name the source in the chapter header comment.
`class="ru-only"` hides a paragraph in English (facts about the Russian translation only).

## 4. Widgets

```js
(function (G) {
  G.widget('my-widget', function (el) {
    function render() { el.innerHTML = '…' + G.t('ру', 'en') + '…'; /* bind handlers here */ }
    render(); G.onLang(render);
  });
})(window.Guide);
```
HTML: `<div class="panel" data-widget="my-widget"></div>`. API: `G.data`, `G.t`, `G.bi` (both spans, no re-render needed),
`G.nm(record)`, `G.fmt`, `G.asset(path)`, `G.icon(key)`, `G.iconImg(rec)`, `G.qColor(q)`, `G.esc`, `G.achieve(id, ru, en, icon, dru, den)`
(build.py collects these calls into the achievements list — keep the literal call form), `G.toast`, `G.tip`.
Tooltips: `data-tip-ru/-en` or `img[data-ru][data-en]`. Sliders may be re-rendered freely: core.js drives the drag.
No libraries, no CDN, works from `file://`. One widget = one CSS block with a comment.
**Every asset path in JS goes through `G.asset('assets/...')` (or `G.icon(key)`)**: the one-file guide has no `assets/`
folder and resolves the paths from its embedded table; check.py fails on a bare `'assets/...'` literal or
`src="assets/..."` in JS. Static `src`/`href`/`data-icon` in sections and CSS `url()` are converted by build.py.

Formulas and their sources (keep in sync when mods change):
- `defect-sim` — `ic-more-qualities/scripts/defects/model.lua` `M.distribution`; chests sorted by grade, hidden on phones.
- `quality-calc` — in-game tooltip value = module effect × 10 × `next_probability` of the ingredient quality
  (module 1 on normal = +2.04%); modes 1/3/10 rolls (tip `zzz-quality-modes`); slots chosen by hover/tap, 1–8.
- `workshop-sim` — tip `zzz-defects-workshop`. `qc-loop` — real belt tile + inserter icons, illustrative.
- `kpd-calc`, `boiler-ladder` — dump effectivity/power/pollution. `wind-sim` — Wind-Turbines-Reforged README formula.
- `season-dial` — NightBrightness `season.lua` (`parameters`: cos phase, tilt ±0.15, solar, min brightness); season steps of wind
  (`Wind-Turbines-Reforged/control.lua` `SEASON_MULTIPLIERS`) and wire losses (`ElectricResistance2/seasons.lua`).
- `memory-calc` — deep-storage-unit README. `evolution-calc` — `research_evolution_factor/parameters.lua`.
- `threat-board` — Rampant nest types: `RampantFixed/libs/Constants.lua` `acceptRate[1]` → `libs/BaseUtils.lua`
  `evoToTierMapping`; bug levels: `prototypes/SwarmUtils.lua` `unitSetToProbabilityTable` (tierEnd 10);
  special attacks: Big Monsters with Paranoidal defaults (every 100 game days, soldiers 20%, giants 40%,
  spidertrons/saucers 80%; volcano/invasion/worms have chance 0 and are NOT shown); flyers ≥10% (ПР-063).
- `hero-ranks` — HeroTurretRedux PARANOIDAL-CHANGES.md. `rocket-launch` — RocketExplosions2. `xp-curve` — PMRPGsystem.
- Enemy count = enemy **kinds**: tiers, sizes, numbered stages, champions, hour-bosses collapsed; Rampant scanners/dummies
  and Bob's player drones excluded (`extract_stats.py`, `enemy_kind`). Never show the raw 1 649 unit prototypes.
- `lab-scale` — `records.labs[].tiles` from collision boxes.
Illustrative widgets must say so on the page (season curve, smog damage threshold, ruins map, survey shapes, factory zoom).

## 5. Design system (src/css/60-unified.css) — user-approved rules

- **One orange**: `--orange: #ffa020` (same as the Paranoidal launcher). Titles `--title: #ffe6c0`. No other accent oranges.
- **One font**: Lilittium (Factorio GUI font) everywhere; `--mono` is an alias of it. Only `<code>` uses `--code`.
  Labels/tags/badges: same height and weight as normal text, tabular digits.
- **Buttons** = Factorio button tiles (`assets/static/gui/*.png`, cropped from `__core__/graphics/gui-new.png`
  by `assets-config.json`, 9-slice 8px): `.fbtn` grey → orange on hover, `.go` green, `.danger` red, black text.
- **Choice tiles** in widgets (wf-item, od-ore, pb-b, me-c, qm-btn, ls-card, qz-b): dark slot, orange inner frame when selected.
  New pickers reuse these classes — do not invent new button looks.
- **Warnings**: use `.callout.warn/.tip/.hint/.fuel`. `.dossier` with a stamp only for secrets (“CLASSIFIED”), not for warnings.
- **Icons without corner badges**: `collect_assets.py` drops floating layers, tech level markers, `constants` badges and
  Rampant tier letters. Prefer vanilla-looking icons over Angel's ore/fluid “blob” icons (the user finds them ugly).
- **Chapter header** hazard band spans the whole content column; content width ~1132 px (`--gut`).
- **Effects from game textures**: fire = `assets/static/fx/fire-flame.webp` (base fire-flame-01, 90 frames, 1.5 s),
  explosion = `fx/big-explosion.webp` (47 frames); both are sprite sheets converted to strips by `assets-config.json`
  `strip: [w, h, cols, frames]` and animated with CSS `steps()`. Prefer such textures over drawn CSS effects.
- **Hero**: transparent animated logo (`paranoidal-animated-alpha.webp`, `keyout` in assets-config), real belt tile moving left
  in the same direction as the items; items ride exactly at the belt speed (duration computed in `hero-belt`). Capitalise the first letter of every label/option.
- **Dark mode**: `<meta name="color-scheme" content="dark">` + `<meta name="darkreader-lock">` so Dark Reader-like extensions
  leave the page alone. Keep both.
- Hotkeys in text (`<kbd>`) link to the keyboard in “Quality of life” (`#qol-keys`) automatically (core.js).
- **Same animations for everybody** (user, 2026-10-28): no `prefers-reduced-motion` overrides. A rule setting animations
  to 0.01 ms kept them `infinite` and made the cover spin ~100 000 times per second where Windows animations are off.
- Mobile (≤640 px) overrides live at the end of 60-unified.css; check every new widget at 500 px width.

## 6. Content rules learned from the user's review

- Do not write about the map preset, VRAM, or “almost certainly” when something certainly breaks.
- No self-links: `build.py` unwraps links to the same h3 block / own chapter and glossary links whose term is the topic
  of the block (stem of the glossary term found in the h3 title); it prints `self-links unwrapped: N`. Every glossary term
  still needs a link from another chapter (check.py warns otherwise).
- No meaningless tag rows: a chip/tag must name a real thing (prefer an in-game icon + its locale name).
- A timer must say what time it shows (game time vs real time) and any speed-up.
- Wording in EN: avoid literal calques (“eats power” → “consumes power”).
- Names exactly as in the modpack locale (`data/names.json`): «Стальная балка», «фугу», «Божественное», etc.
  Both languages follow the switch — never hard-code one language in a widget (`G.nm` inside `render`, or `G.bi`).
- There are no stone or iron ore deposits; stone comes from rocks and crushed-ore gravel. Check such claims in the dump.
- Explain *differences* when showing a family (recyclers: speed / slots / power), not just four identical pictures.

## 7. Updating after a modpack change

1. **Dump.** Reuse the newest dump of the shared 2.0 profile (`../test-runs/<RUN>/write-data/script-output/data-raw-dump.json`,
   its `inputs.json`: profile `_profile-2.0`, no `--enable/--disable`, DLC quality + elevated-rails, `git.head` = current
   `pre_release_2.0`). `yuoki-*` stands are not the modpack. A new dump **launches the game**: only with the user's
   permission, via `python -I ../test-runs/_tools/factorio_check.py sync` then `… dump <RUN>` (limit 180 s, isolated profile,
   working saves/settings untouched; see `../agent-context/procedures/TESTING.md`). Do not touch a running game of the user.
2. Save the old numbers: `cp data/stats.json data/history/stats-<oldrun>.json`.
3. `bash tools/update.sh ../test-runs/<RUN>` (≈10 min, mostly icons; extra arguments go to `collect_assets.py`, e.g.
   `--extra-mods work/dump-mods`, see «Image encoding» below). It ends with build --check and jscheck RU/EN.
4. Diff old/new `stats.json` (counts and record lengths) and fix texts whose wording depends on numbers
   (“almost a thousand”, “from 5%”…). Re-read changed mods' changelogs (`git log <old>..HEAD` in the modpack).
5. Set `verified` of touched chapters in `sections.json` to the new dump; bump `guide_version`; add a CHANGELOG entry
   (`## x.y.z — YYYY-MM-DD`, check.py requires it to match).
6. Screenshots of changed chapters (RU, EN, 500 px), then publish (§8).

New icon? Add `[type, name]` to `assets-config.json` `icons` (or `technology_icons`, `sprites`, `static`), run
`collect_assets.py --only icons|sprites|static` and `extract_stats.py` (names). build.py reports missing icons.

**Image encoding** (since guide 1.3.5). `collect_assets.py` renders every image losslessly into `work/assets-src/` and
encodes it once with the workspace tools (`../tools-external/css-ig/`, pingo + beeim; method and numbers in its
README): per file the smallest WebP whose PSNR at the size the page shows it is ≥ `encoding.min_psnr` of
`assets-config.json` (32 dB; scales: icons 0.75, sprites 0.8 = 2K monitors, static 1.0; user decision 2026-10-28;
an entry may set `web_scale`). PNG outputs get `pingo -s4 -lossless` (pixels checked unchanged). The animated logo and
lossy WebP/JPEG sources are not re-encoded. `manifest.json` records the encoding of every file (`B60 33.0 dB at scale
0.75`: beeim lossy q60; `L`: lossless; `N100`: near-lossless; `P`: pingo auto). Full run ≈3.5 min.
- Never re-compress files in `assets/` themselves (they are already lossy) and never run pingo over finished WebPs
  (it turns the lossless pixel-art files lossy): always regenerate from the dump.
- pingo/beeim must never enter this repository or CI (licence: private use, only the images are published). A PC
  without them: `--no-optimize` (Pillow WebP q90, worse per byte) — do not publish such a build without saying so.
- Mods that the dump used but the working build no longer has (2026-10-28: `zzzparanoidal-shipwreck`, removed for the
  BnL start): `git -C ../ParanoidalModpack-master archive <dump git.head> mods/<mod> | tar -x -C work/dump-mods --strip-components=1`
  and pass `--extra-mods work/dump-mods`. Without it such icons are reported missing and the old files stay
  (`collect_assets.py` never writes an icon none of whose layer files was found).
- Any change of the images is a page change: new `guide_version` (§8).

## 8. Checks and publishing

Before every handover: `python -I tools/release.py` (build --check --single) → `RESULT: OK` with 0 warnings;
`bash tools/jscheck.sh ru` and `en` → `ERRS:[] EMPTY:[]`; `bash tools/jscheck.sh ru dist/Guide_to_the_Paranoidal.html`
→ also `LOCAL:[]`; screenshots of what changed.

**Versions and the one-file release.** Any change of the built page (text, data, CSS, JS, assets) = a new
`guide_version` in `src/sections.json` (patch for fixes, minor for new chapters/widgets) + a CHANGELOG section on top.
On every push to `main`, `.github/workflows/release.yml` rebuilds the page from the sources and:
- fails if the committed `index.html` is stale (rebuild and commit it);
- creates GitHub Release `v<guide_version>` with `Guide_to_the_Paranoidal.html` + `release.json` (marked latest) when
  that version has no release yet;
- fails if the release exists but the page changed (`digest` in release.json): raise `guide_version`.
README/tools-only commits pass without a release. The Paranoidal Launcher (`../paranoidal-updater`) reads
`releases/latest/download/release.json`, downloads the file next to the game and offers it with the build update:
the file name, the release asset names and `<meta name="guide-version">` in the first 4 KB are its contract — do not
rename them. After a push, check the Actions run and the release (`gh run list`, `gh release view`). Report in Russian: what changed, what was checked, what was not
(real phone, in-game behaviour).

Publishing (only when the user asks; the user approved this repository):
- Commit in **small logical commits**, titles in Russian, third-person verb, no trailing period (“Исправляет …”),
  no AI mentions, list only checks actually done. Author = GitHub noreply address
  (`git -c user.name=ExpertLove -c user.email=32990223+ExpertLove@users.noreply.github.com commit …`).
- Never `git add .` blindly: `work/`, `_preview.html`, `_jscheck.html` are ignored; check `git status` first.
- Push `main` to `origin` (FactorioParanoidal). Credentials come from Git Credential Manager; for the GitHub API use
  `GH_TOKEN="$(printf 'protocol=https\nhost=github.com\nusername=ExpertLove\n\n' | git credential fill | sed -n 's/^password=//p')" gh …`
  and never print the token. Pages rebuild takes ~1 min; verify with `curl` (HTTP 200, page title, one asset).
- Graphics are © Wube Software and mod authors; the guide is non-commercial (footer says so). Keep it that way.

## 9. Gotchas

- Bash heredocs with apostrophes/Cyrillic break easily: write Python scripts to `work/` with the write tool, run `python -I`.
  `mkdir -p work` first — the folder may be deleted. Console output of Cyrillic needs `PYTHONIOENCODING=utf-8`.
- A file just written may return ENOENT once on read — retry.
- Widgets render lazily; screenshots and checks use `Guide.renderAll()` (already in jscheck/beforeprint).
- `node --check file.js` after hand edits of widgets; an unclosed `/* */` header comment once broke a whole file.
- Headless Chrome cannot go below ~500 px; real-phone layout is not verified.
