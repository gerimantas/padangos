#!/usr/bin/env bash
# Scrapes Alio.lt Kaunas search for 205/55 R16 winter tires, then each ad for
# phone + condition + quantity. Alio exposes seller phones on the ad page.
# Output: .firecrawl/alio-k.md + .firecrawl/alio-k-ads/*.md
#         (consumed by parse-alio-kaunas.js then parse-alio-ads.js).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .firecrawl/alio-k-ads

echo "[alio] scraping Kaunas search page..."
firecrawl scrape "https://www.alio.lt/paieska/205-55-r16-ziemines-padangos-kaunas/" \
  --only-main-content --wait-for 3500 -o ".firecrawl/alio-k.md" >/dev/null 2>&1 || true

# parse-alio-kaunas.js reads alio-k.md and writes alio-kaunas.json (id + url).
node parse-alio-kaunas.js

echo "[alio] scraping ad pages..."
node -e "require('./.firecrawl/alio-kaunas.json').forEach(a=>console.log(a.id+' '+a.url))" \
| while read -r id u; do
  [ -f ".firecrawl/alio-k-ads/$id.md" ] && continue
  firecrawl scrape "$u" --only-main-content --wait-for 2500 \
    -o ".firecrawl/alio-k-ads/$id.md" >/dev/null 2>&1 || true
done
echo "[alio] done"
