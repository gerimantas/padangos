#!/usr/bin/env bash
# Scrapes Autogidas.lt for winter 205/55 R16 tires, filters to Kaunas listings,
# then scrapes each for phone + condition (only on the ad page).
# Output: .firecrawl/ag-page-*.md + .firecrawl/ag-ads/*.md
#         (consumed by parse-autogidas.js then parse-autogidas-ads.js).
set -euo pipefail
cd "$(dirname "$0")/.."

BASE='https://autogidas.lt/skelbimai/padangos/?f_433=Lengviesiems&f_435=%C5%BDiemin%C4%97s&f_76=R16&f_77=205&f_78=55'
PAGES="${1:-3}"
mkdir -p .firecrawl/ag-ads

echo "[autogidas] scraping $PAGES listing page(s)..."
firecrawl scrape "$BASE" --only-main-content --wait-for 3500 \
  -o ".firecrawl/ag-recheck.md" >/dev/null 2>&1 || true
for n in $(seq 2 "$PAGES"); do
  firecrawl scrape "$BASE&page=$n" --only-main-content --wait-for 3000 \
    -o ".firecrawl/ag-pg$n.md" >/dev/null 2>&1 || true
done

# parse-autogidas.js reads the listing pages and writes autogidas-list.json;
# run it here so we know which Kaunas ads to fetch individually.
node parse-autogidas.js

echo "[autogidas] scraping Kaunas ad pages..."
node -e "require('./.firecrawl/autogidas-list.json').filter(a=>a.city==='Kaunas').forEach(a=>console.log(a.url))" \
  > .firecrawl/ag-kaunas.txt
while read -r u; do
  s=$(basename "$u" .html)
  [ -f ".firecrawl/ag-ads/$s.md" ] && continue
  firecrawl scrape "$u" --only-main-content --wait-for 2500 \
    -o ".firecrawl/ag-ads/$s.md" >/dev/null 2>&1 || true
done < .firecrawl/ag-kaunas.txt
echo "[autogidas] done: $(wc -l < .firecrawl/ag-kaunas.txt) Kaunas ads"
