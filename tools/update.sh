#!/usr/bin/env bash
# One-shot refresh of the guide after the modpack changed.
# Usage: bash tools/update.sh <run-dir-with-dump> [collect_assets.py options, e.g. --extra-mods work/dump-mods]
# Images are encoded by ../tools-external/css-ig (pingo/beeim, workspace only; AGENTS.md "Image encoding").
#   <run-dir-with-dump> = a test-runs/<RUN> folder that has write-data/script-output/data-raw-dump.json and inputs.json
#   Example: bash tools/update.sh ../test-runs/ore-icon-remap-20261023b
# Steps: extract stats -> render icons/sprites/static -> build index.html -> link/i18n check -> JS smoke test (RU, EN).
# The script never launches Factorio and never writes outside the guide folder. Getting a fresh dump is a separate,
# explicitly permitted action (see AGENTS.md §6).
set -e
cd "$(dirname "$0")/.."
RUN="${1:?give a test-runs/<RUN> directory}"
shift
DUMP="$RUN/write-data/script-output/data-raw-dump.json"
INPUTS="$RUN/inputs.json"
[ -f "$DUMP" ] || { echo "no dump: $DUMP"; exit 2; }
ARGS=(--dump "$DUMP")
[ -f "$INPUTS" ] && EXTRA=(--inputs "$INPUTS") || EXTRA=()
python -I tools/extract_stats.py "${ARGS[@]}" "${EXTRA[@]}"
python -I tools/collect_assets.py "${ARGS[@]}" "$@"
python -I tools/extract_stats.py "${ARGS[@]}" "${EXTRA[@]}"   # second pass: names.json also covers icons added by config
python -I tools/build.py --check
bash tools/jscheck.sh ru
bash tools/jscheck.sh en
echo "update OK -> index.html"
