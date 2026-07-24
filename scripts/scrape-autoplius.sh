#!/usr/bin/env bash
# Scrapes Autoplius.lt for used winter 205/55 R16 tires, then each ad page for
# phone + tread + city. Autoplius exposes seller phones directly in the page.
# Output: .firecrawl/meta.txt (one line per ad, consumed by parse.js).
set -euo pipefail
cd "$(dirname "$0")/.."

Q='https://autoplius.lt/skelbimai/padangos-ratlankiai/padangos?qt=205-55-r16-ziemines'
PAGES="${1:-5}"        # how many listing pages to walk (default 5)
mkdir -p .firecrawl/ads

echo "[autoplius] collecting listing URLs from $PAGES page(s)..."
: > .firecrawl/ap-urls.txt
for n in $(seq 1 "$PAGES"); do
  url="$Q&page_nr=$n"
  firecrawl scrape "$url" --only-main-content --wait-for 3000 \
    -o ".firecrawl/ap-page-$n.md" >/dev/null 2>&1 || true
  grep -o 'https://autoplius.lt/skelbimai/[a-z0-9-]*ziemines-205-55-r16-[0-9]*\.html' \
    ".firecrawl/ap-page-$n.md" 2>/dev/null >> .firecrawl/ap-urls.txt || true
done
sort -u .firecrawl/ap-urls.txt -o .firecrawl/ap-urls.txt
echo "[autoplius] $(wc -l < .firecrawl/ap-urls.txt) unique ads"

echo "[autoplius] scraping ad pages..."
while read -r u; do
  s=$(basename "$u" .html)
  [ -f ".firecrawl/ads/$s.md" ] && continue
  firecrawl scrape "$u" --only-main-content --wait-for 2500 \
    -o ".firecrawl/ads/$s.md" >/dev/null 2>&1 || true
done < .firecrawl/ap-urls.txt

echo "[autoplius] extracting meta lines -> .firecrawl/meta.txt"
: > .firecrawl/meta.txt
for f in .firecrawl/ads/*.md; do
  line=$(grep -m1 -a 'žieminės 205/55 R16 \\| Skersmuo' "$f" || true)
  printf '%s>>>%s\n' "$(basename "$f")" "$line" >> .firecrawl/meta.txt
done
echo "[autoplius] done: $(wc -l < .firecrawl/meta.txt) ads"
