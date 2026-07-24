#!/usr/bin/env bash
# Full pipeline: scrape all four portals, parse each into JSON, merge, build HTML.
# Requires: firecrawl CLI (authenticated) + node.
#
#   ./scripts/run-all.sh              # scrape everything, then build
#   ./scripts/run-all.sh --build-only # skip scraping, just re-parse + build
#
# Scraping hits the network and costs firecrawl credits; --build-only reuses the
# cached .firecrawl/ pages, which is what you want after editing a parser.
#
# SEASON selects which layer this run produces (default winter). build.js always
# reads every merged-<season>.json that exists and stacks them as tabs, so
# building one season never drops another.
#
#   SEASON=winter     ./scripts/run-all.sh            # (default) žieminės
#   SEASON=all-season ./scripts/run-all.sh            # universalios (M+S)
#
# NOTE: the scrape-*.sh scripts currently query WINTER tires. Adding the
# all-season layer means giving each scraper an all-season query and a separate
# cache dir so it can't clobber the winter pages — see the padangos skill,
# references/tasks.md "Add a season layer". Until that is wired, run all-season
# with --build-only once its parsed JSON exists.
set -euo pipefail
cd "$(dirname "$0")/.."

export SEASON="${SEASON:-winter}"
echo "=== SEASON: $SEASON ==="

if [ "${1:-}" != "--build-only" ]; then
  echo "=== SCRAPE ==="
  bash scripts/scrape-autoplius.sh
  bash scripts/scrape-skelbiu.sh
  bash scripts/scrape-autogidas.sh
  bash scripts/scrape-alio.sh
fi

echo "=== PARSE ==="
node parse.js                # autoplius  -> .firecrawl/ads.json
node parse-skelbiu.js        # skelbiu    -> .firecrawl/skelbiu-kaunas.json
node parse-autogidas.js      # autogidas  -> .firecrawl/autogidas-list.json
node parse-autogidas-ads.js  #            -> .firecrawl/autogidas-kaunas.json
node parse-alio-kaunas.js    # alio       -> .firecrawl/alio-kaunas.json
node parse-alio-ads.js       #            -> .firecrawl/alio-final.json

echo "=== MERGE + BUILD ==="
node merge.js                # -> .firecrawl/merged-$SEASON.json (SEASON env)
node build.js                # -> padangos.html (all season layers)

echo "=== DONE ==="
echo "Open padangos.html in a browser."
