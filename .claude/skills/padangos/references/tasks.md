# Task recipes

Step-by-step for the common edits. Line numbers drift as files change — grep for
the anchor string, don't trust the number. After any edit that isn't network
data, finish with `./scripts/run-all.sh --build-only` (or `node build.js` for
template-only changes) and the verify harness in `verify.md`.

## Add or change a seller address

Autoplius (and some others) tag only the nearest city. Real Kaunas-region
addresses are hardcoded in a phone→address map so a "Kaunas" ad can be correctly
shown as Kauno r.

1. Find the seller's phone in the data:
   `node -e "require('./.firecrawl/merged.json').filter(a=>a.address).forEach(a=>console.log(a.phone,a.address))"`
2. Edit `SELLERS` in `parse.js` (anchor: `const SELLERS = {`). Each entry:
   ```js
   '+37060000000': { area: 'Kauno r.', address: 'Street 1, Town, Kauno r.' },
   ```
   `area` must be `"Kaunas"` or `"Kauno r."` (only these survive the region
   filter in `merge.js`). For a multi-city dealer, use `{ address: null }` to keep
   the per-ad city tag instead of forcing one area.
3. `./scripts/run-all.sh --build-only`

## Fix or add a brand

Brands are detected from the ad title against a canonical list, because the
portals often leave the brand field blank.

1. Edit `BRANDS` in `merge.js` (anchor: `const BRANDS = [`). Add the make. For a
   multi-word make, list it and add an alias in `BRAND_ALIASES` if it appears
   spelled several ways (e.g. `BFGoodrich` → `BF Goodrich`).
2. Detection uses a word-boundary regex, so short names risk matching inside
   other words — check after: `node merge.js` prints `still unknown: N`.
3. Inspect what stayed unknown:
   `node -e "require('./.firecrawl/merged.json').filter(a=>!a.brand).forEach(a=>console.log(a.source,a.title))"`
   Genuinely generic titles ("Padangos") correctly stay null → shown as "Kita".
4. `./scripts/run-all.sh --build-only`

## Cross-post duplicate handling

The same seller often posts identical tires on several portals. `merge.js` keeps
the copy with a phone (Autoplius first, since it also has tread).

- Dedupe key (anchor: `const key = a =>`) is `title|price|qty`, normalised. If two
  *different* ads collapse into one, the key is too loose — make it stricter.
- If a real duplicate slips through, the key is too strict (e.g. one title has a
  size suffix the other lacks) — normalise the title more in the parser.
- Verify what was dropped:
  `node merge.js` prints `N dublikatai atmesti`; add a debug log in the `dedupe`
  filter to print each drop if you need to see them.

## Add a new portal

1. `scripts/scrape-<portal>.sh` — mirror an existing one. Scrape the search
   page(s) with `firecrawl scrape … --only-main-content --wait-for 3000`, then
   each ad page if the phone/condition is only there. Write raw `.md` to
   `.firecrawl/`.
2. `parse-<portal>.js` — read those `.md`, emit `.firecrawl/<portal>-kaunas.json`
   with the full data-model shape (see SKILL.md). Set `source: "<Portal>"`.
3. `merge.js` — `require` the new JSON, run it through `dedupe`, add to the `all`
   array, and it flows into brand detection automatically.
4. `scripts/run-all.sh` — add the scrape call in the SCRAPE block and the parse
   call in the PARSE block.
5. First check whether the portal even exposes phones before investing — scrape
   one ad and grep for `tel:` / `+370`. If it hides them (like Skelbiu), the
   portal still adds value via links; set `phone: null`.

## Change the search size

The size lives in each scraper's query URL, not in the parsers. To switch from
205/55 R16:

- `scrape-autoplius.sh`: `qt=205-55-r16-ziemines`
- `scrape-skelbiu.sh`: the `QUERIES` slugs
- `scrape-autogidas.sh`: `f_76=R16&f_77=205&f_78=55`
- `scrape-alio.sh`: the search slug

The parsers also assert the size (e.g. `parse-skelbiu.js` matches
`R16 / 205 / 55`) to reject cross-linked ads — update those guards too, then do a
full `./scripts/run-all.sh` since the cached pages are for the old size.

## Add a season layer (e.g. all-season / universalios)

The viewer already supports multiple seasons; adding one is a data task. Each
season is an independent scrape → parse → merge run whose output is
`.firecrawl/merged-<season>.json`. The winter and all-season scrapes must NOT
share cache files, or the second overwrites the first.

1. Give each `scripts/scrape-*.sh` an all-season query and a season-scoped cache
   path. The cleanest approach: read `SEASON` at the top of each scraper and
   branch the query + output dir:
   - Autoplius: `qt=205-55-r16-ziemines` → for all-season use the M+S/universal
     filter (`…-universalios` or the season param the portal uses); write ad
     pages to `.firecrawl/ads-$SEASON/` and meta to `.firecrawl/meta-$SEASON.txt`.
   - Skelbiu: swap the `QUERIES` slugs to the universal ones.
   - Autogidas: change `f_435` (Sezoniškumas) from Žieminės to the all-season value.
   - Alio: swap the search slug.
2. Make each `parse-*.js` read the season-scoped input (the `SEASON` env var) and
   keep writing the same per-portal JSON — `merge.js` already stamps `season` from
   `SEASON` and writes `merged-$SEASON.json`.
3. Run it: `SEASON=all-season ./scripts/run-all.sh`. `build.js` picks up the new
   `merged-all-season.json` automatically and fills the Universalios tab.
4. Verify the tab shows the right count and the winter tab is unchanged (its
   `merged-winter.json` is untouched).

Until the scrapers are season-parameterised, the all-season tab renders as an
empty "coming soon" layer — which is the current intended state.

The season list + tab order live in `build.js` (`SEASONS` array) and the label
words in `template.html` (`SEASON_WORD`). Add a season to both if you introduce a
third (e.g. summer / vasarinės).

## Edit the viewer

All UI lives in `template.html`; `build.js` inlines the data (anchor:
`__ADS__`) and wraps it in the `<head>`/viewport skeleton. CSS is organised into
labelled regions — grep for the comment:

- `/* ---------- header ---------- */` — title + subline
- `/* ---------- filters ---------- */` — chips, brand dropdowns, sort
- `/* ---------- cards ---------- */` — ad card + tread meter + call/link
- The `@media (max-width: 720px)` block — the entire phone layout

JS state is one object (anchor: `state = {`): `qty, source, brand, sort, view`.
`view` is `"used"` (default) vs `"new"` (the "Naujos gera kaina" toggle).
`render()` → `renderChips()` + `renderGrid()`; filter matchers are
`condMatches / sourceMatches / brandMatches` + the `QTY_FILTERS` array.

After editing: `node build.js`, then run `verify.md`.
