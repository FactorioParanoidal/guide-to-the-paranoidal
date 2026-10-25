# Ideas for developing the guide

Ordered roughly by value / effort. Each item says what it needs from the workspace.

## Content

1. **“What's new in this build”** chapter generated automatically: diff two `stats.json` snapshots (keep old ones in
   `data/history/`) → added/removed items, recipes, technologies, enemies; plus the modpack `CHANGELOG`/git log titles.
   Players love patch notes; agents get a ready checklist of chapters to re-verify.
2. **Interactive tech-tree map** of all 1 342 technologies (canvas, zoom, search, era colouring, path to any tech),
   built from the dump: `prerequisites` + `unit`. Could reuse the logic of `paranoidal-tech-tree`.
3. **Recipe explorer** (mini-FNEI in the browser): search any item → producers/consumers with icons. Needs a compact
   recipe index in `stats.json` (~1–2 MB) — load it lazily from a separate file.
4. **Production chain diagrams** generated from recipes (e.g. “red science from scratch”, “steel in Paranoidal”):
   Sankey/flow charts with real ratios. Needs a small solver (like Helmod) in JS.
5. **“First 10 hours” walkthrough** with milestone screenshots taken in a sandbox save (user-made, or agent-made with
   permission): concrete layouts for the burner era, first boilers, first refining line.
6. **Bestiary pages** for each Rampant faction (resistances table, attacks, tier HP growth chart) and Big Monsters events.
7. **Blueprint library**: copyable blueprint strings for proven early builds (strings stored in `src/blueprints/`).
8. **Video/GIF loops** recorded in-game (factory buildings, tank fire, rocket explosion) — `assets/video/`, lazy `<video>`.

## Experience

9. **Reading routes**: “I'm new”, “I love logistics”, “I want to fight” — highlighted chapter subsets and a progress map.
10. **Persistent checklists**: “before the first launch”, “before green science” with localStorage ticks.
11. **Print / PDF mode** and a one-page **cheat sheet** (hotkeys, ore → fluid table, boiler ladder).
12. **Deep links to widget states** (`#kpd-calc?fuel=coal&count=10`) to share a calculation in Discord.
13. **Light theme** and a compact “reader” mode without animations.

## Integration

14. **Paranoidal Launcher** button “Open the guide” and a “What's new” toast after an update (launcher change → versioning
    rules of `paranoidal-updater/README.md`).
15. **Publish** as a static site (GitHub Pages of a separate repo) once the user decides; add an OG image, `?lang` links,
    and a `noindex` toggle for drafts.
16. **Single-file export** (`build.py --inline-assets`): icons as data URIs for sharing one HTML file in chat
    (size ~15 MB; acceptable for Discord/Telegram).
17. **Automatic freshness check**: `update.sh` writes `data/freshness.json` (dump date vs. latest commit); the page shows
    a banner “data is N commits behind” when opened from the workspace.

## Maintenance

18. Per-chapter **fact tests**: a small JSON of assertions (“boiler effectivity == 0.5”, “factions == 17”) checked by
    `check.py` against `stats.json`, so texts with hard-coded wording fail loudly when the data changes.
19. Move long chapter texts to Markdown + front-matter (`src/sections/*.md`) if editing HTML becomes a burden; keep widgets as now.
20. Crowdin-style translation file (`src/i18n/*.json`) to add a third language without touching chapter files.
