#!/usr/bin/env bash
# Full pipeline: scrape all four portals, parse each into JSON, merge, build HTML.
# Requires: firecrawl CLI (authenticated) + node.
#
#   ./scripts/run-all.sh              # scrape everything, then build
#   ./scripts/run-all.sh --build-only # skip scraping, just re-parse + build
#
# Scraping hits the network and costs firecrawl credits; --build-only reuses the
# cached .firecrawl/ pages, which is what you want after editing a parser.
set -euo pipefail
cd "$(dirname "$0")/.."

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
node merge.js                # -> .firecrawl/merged.json
node build.js                # -> padangos.html

echo "=== DONE ==="
echo "Open padangos.html in a browser."
