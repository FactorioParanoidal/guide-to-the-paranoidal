# Changelog — Guide to the Paranoidal

## 1.3.4 — 2026-10-27

- One-file guide `Guide_to_the_Paranoidal.html` (every picture and the font inside, works offline without `assets/`):
  built by `tools/build.py --single`, published as a GitHub Release for every new `guide_version`
  (`.github/workflows/release.yml`); the Paranoidal Launcher downloads it next to the game.
- The page carries its version in `<meta name="guide-version">`; widgets build asset paths through `G.asset()`.

## 1.3.3 — 2026-10-25

- Self-links removed automatically at build time (links to the current block, glossary terms in their own section);
  glossary terms linked from other chapters instead.
- Tank fire: real game fire and big explosion textures; the timer says it is game time, 8× faster.
- Fluid wall: named tiles in alphabetical order, first 36 + "Show all"; exotic chemistry shows real fluids with icons.
- Most used/produced materials: the note follows the selected tab.
- Hero belt: items move at the belt speed, icons load eagerly with a retry; icons rendered without more overlay badges
  (reskins tier numbers/letters, Angel's num-N, molecule badges, Mk marks, Clowns % badges).
- Spiders card uses the vanilla spidertron picture; fire safety turret note winks at water on oil.

## 1.3.2 — 2026-10-25

- EN wording: "eats power" replaced; mining chapter: unclear "two fluids" warning and "soil geology" tag removed.
- Solid fuels table: hyphenation of long names, header sticks to the top while scrolling.
- The "cleans the air" spoiler has no X-FILES stamp over the text.

## 1.3.1 — 2026-10-25

- Teasers are quiet inline text with a small lock instead of a badge.
- Accumulators: what fast / slow / large means (charge and discharge rates from the dump); emission sentence merged;
  coal crushing explained with numbers (4 MJ → 2 × 2.5 MJ).
- Fluid map labels every point that fits without overlaps; solid fuels table shows 12 rows and a "Show all" button
  instead of an inner scrollbar; scrollbars styled.

## 1.3.0 — 2026-10-25

- One design system (`src/css/60-unified.css`): one orange `#ffa020`, the Factorio GUI font everywhere, buttons made of
  Factorio GUI button tiles, one style for all pickers, warnings as callouts, chapter header band across the full width,
  mobile layout fixes; page marked as dark for Dark Reader-like extensions.
- Icons rendered without corner badges (tech level markers, Rampant tier letters); nicer icons instead of Angel's ore/fluid blobs.
- Hero: transparent animated logo, real belt tile moving with the items, quiz button goes to the quiz.
- Defects: chest batch sorted by grade with quality marks, hidden on phones; control loop with real belts and inserters;
  quality calculator picks the module count by hovering the machine slots; quality ladder taller with readable labels;
  recyclers show speed, module slots and power.
- Texts: no map preset, no VRAM note, clearer defect effects, stone fact corrected, translation note only in Russian,
  wreck names follow the language switch, capitalised labels; hotkeys in text link to the QoL keyboard.
- Repository now contains sources, tools and `AGENTS.md` (instructions for agents).

## 1.2.1 — 2026-10-25

- Lab widget rebuilt: picker with all 10 labs (icon, name, speed), the chosen lab drawn next to a regular 3×3 lab on a
  tile grid, stats with size/speed/power/packs. Lab footprints (`records.labs[].tiles`) and 6 new lab sprites added.

## 1.2.0 — 2026-10-25

- Threat board rebuilt: evolution → bug level 1–10, 17 Rampant nest types with the evolution they appear at,
  special attacks of Paranoidal only (switched-off events removed). Simpler wording in chapter 14.

## 1.1.5 — 2026-10-25

- Enemy events use Paranoidal settings (zzzparanoidal/settings-final-fixes.lua, same as the working mod-settings.dat):
  event every 100 game days, soldiers ≥20%, giants ≥40%; volcano, underground invasions and giant worms shown as off;
  “swarm” is a Big Monsters wave event. Texts in chapters 12 and 14 fixed accordingly.

## 1.1.4 — 2026-10-25

- Quality calculator and chapter 03 text show module strength as the game tooltip does (+2.04% for module 1 on normal
  ingredients, depends on ingredient quality) instead of the raw prototype “+1%”. Formula unchanged.

## 1.1.3 — 2026-10-25

- Quality calculator: modules are picked by icon buttons with “+N%” and the module name; the chosen count is shown
  as filled machine slots with the resulting machine speed; outcome rows name the target quality with its icon and colour.

## 1.1.2 — 2026-10-25

- All sliders can be dragged (press and hold); before, widget re-render broke the native drag after the first step.
  Drag is handled once in `core.js` for every `input[type=range]`.

## 1.1.1 — 2026-10-25

- Enemy count is now the number of enemy KINDS without tiers/sizes/champions/hour-bosses (84 instead of 1 649 unit prototypes);
  technical units (Rampant scanners/dummies, Bob's player drones) excluded; vanilla reference 8 → 2 kinds (biter, spitter).

## 1.1.0 — 2026-10-25

- Data refreshed from dump `test-runs/guide-dump-20261025` (Factorio 2.0.77, Quality + Elevated Rails, 189 mods,
  `pre_release_2.0` @ `b2e4443de7`, clean tree). Changes vs the previous dump: achievements 963 → 1043,
  visible items 2624 → 2646, placeable buildings 751 → 769, turrets 46 → 48, prototypes 29 807 → 29 976.
- Chapter 15: new subsection “Legendary ruins” (22 sites, sanctuary rules, spoiler with trials/citadels and rewards).
- Chapter 18: “Over a thousand achievements”, 151 scripted (80 for legendary ruins).
- New random fact. Old stats kept in `data/history/` for diffs.

## 1.0.2 — 2026-10-25

- The achievements window has a "Reset achievements" button (two-click confirmation; clears `pg-ach` from localStorage).

## 1.0.1 — 2026-10-24

- Fix: chapter achievements (toasts while scrolling and the achievements list) showed no picture; they now use the chapter icon and have a description.

## 1.0.0 — 2026-10-24

First version.

- 22 chapters (cover, 20 topic chapters, glossary), RU/EN, one page with a sticky table of contents, scrollspy,
  reading progress bar, search, glossary tooltips, random facts, reader achievements.
- 51 interactive widgets (calculators, simulators, charts, animations), all fed from `data/stats.json`.
- Data: dump `test-runs/ore-icon-remap-20261023b` (Factorio 2.0.77, Quality + Elevated Rails, 189 enabled mods,
  branch `pre_release_2.0` @ `b0d020f4b6` + local edits recorded in its `inputs.json`).
- Assets: 1 200+ icons and 70+ entity sprites rendered from the game and mod graphics; Factorio GUI font.
- Tooling: `extract_stats.py`, `collect_assets.py`, `build.py`, `check.py`, `jscheck.sh`, `shot.sh`, `update.sh`.
- Checks: `build.py --check` OK (0 errors, 0 warnings); `jscheck.sh` RU/EN: no JS errors, all widgets rendered;
  visual review of every chapter at 1440 px (RU) and selected chapters in EN and at 640 px.
