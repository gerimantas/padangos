#!/usr/bin/env bash
# Scrapes Skelbiu.lt search results for 205/55 R16 winter tires in the Kaunas
# region. Skelbiu hides seller phones behind a viewer-verification wall, so only
# the listing pages are fetched (no per-ad scrape) — the ad link is the payload.
# Output: .firecrawl/skq-*.md (consumed by parse-skelbiu.js).
set -euo pipefail
cd "$(dirname "$0")/.."

# These query slugs all resolve to the same Kaunas-region result set; scraping
# several improves coverage because Skelbiu paginates unpredictably.
QUERIES=(
  "padangos-ziemines-205-55-r16-kaunas"
  "205-55-r16-ziemines-kaunas"
  "ziemines-padangos-205-55-r16-kauno-r"
)

echo "[skelbiu] scraping ${#QUERIES[@]} Kaunas search pages..."
for q in "${QUERIES[@]}"; do
  firecrawl scrape "https://www.skelbiu.lt/paieska/$q/" \
    --only-main-content --wait-for 3000 -o ".firecrawl/skq-$q.md" >/dev/null 2>&1 || true
  hits=$(grep -a -c 'R16 / 205 / 55' ".firecrawl/skq-$q.md" 2>/dev/null || echo 0)
  echo "[skelbiu]   $q -> $hits hits"
done
echo "[skelbiu] done"
