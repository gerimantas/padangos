# Padangos — used winter tire search (205/55 R16, Kaunas region)

A self-contained HTML viewer of used winter tire listings scraped from four
Lithuanian classifieds portals, filtered to the Kaunas region.

Open **`padangos.html`** in any browser. It has no dependencies — data is inlined.

## Pipeline

```
scrape (firecrawl)  ->  parse (node)  ->  merge (node)  ->  build (node)
   .firecrawl/*.md       *.json            merged.json       padangos.html
```

### Re-run everything

```bash
./scripts/run-all.sh              # scrape all portals, then build (uses credits)
./scripts/run-all.sh --build-only # skip scraping, re-parse cached pages + build
```

Use `--build-only` after editing a parser or the template — it reuses the cached
`.firecrawl/` pages and never touches the network.

Requirements: [`firecrawl`](https://firecrawl.dev) CLI (authenticated:
`firecrawl login --browser`) and Node.js.

## Sources

| Portal    | Phone in scrape?         | Notes                                    |
|-----------|--------------------------|------------------------------------------|
| Autoplius | ✅ yes                    | Richest source; also reports tread %.    |
| Autogidas | ⚠️ some                  | Condition + phone only on the ad page.   |
| Alio      | ✅ yes                    | Thin used supply in this size.           |
| Skelbiu   | ❌ no (verification wall) | Link only — number shown after login.    |

## Scripts

**Scrape** (`scripts/`, bash + firecrawl):
- `scrape-autoplius.sh [pages]` — listing walk + per-ad pages → `.firecrawl/meta.txt`
- `scrape-skelbiu.sh` — Kaunas search pages (no per-ad, phone is walled)
- `scrape-autogidas.sh [pages]` — listings + Kaunas ad pages
- `scrape-alio.sh` — Kaunas search + ad pages
- `run-all.sh` — orchestrates scrape → parse → merge → build

**Parse** (project root, node — each reads `.firecrawl/…` and writes JSON):
- `parse.js` — Autoplius `meta.txt` → `ads.json` (holds the seller address map)
- `parse-skelbiu.js` — `skq-*.md` → `skelbiu-kaunas.json`
- `parse-autogidas.js` — listing pages → `autogidas-list.json`
- `parse-autogidas-ads.js` — ad pages → `autogidas-kaunas.json`
- `parse-alio-kaunas.js` — `alio-k.md` → `alio-kaunas.json`
- `parse-alio-ads.js` — ad pages → `alio-final.json`

**Merge + build** (project root, node):
- `merge.js` — dedupes cross-posts, normalises/backfills brands → `merged.json`
- `build.js` — inlines data into `template.html` → `padangos.html`

The one-off search helpers (`parse-alio.js`) are exploratory and not part of the
pipeline; `run-all.sh` is the source of truth for what runs.

## Editing

- **Viewer UI / styles** → edit `template.html`, then `node build.js`.
- **Seller addresses / brand list / dedupe** → edit `parse.js` / `merge.js`,
  then `./scripts/run-all.sh --build-only`.
- **Fresh data** → `./scripts/run-all.sh`.

`.firecrawl/` (scraped pages + intermediate JSON) is gitignored.
