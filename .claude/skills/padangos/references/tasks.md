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

## Seasons — how they work, and adding a third

Two layers ship: `winter` and `all-season`. The parsers are already
`SEASON`-aware (env var, default `winter`) — each reads a season-scoped input and
writes both `*-<season>.json` and a generic alias. `merge.js` stamps `season` and
writes `merged-<season>.json`; `build.js` inlines every `merged-*.json` as a tab.
The tab list lives in the `SEASONS` array in `build.js`; the title/strip words
live in each parser's `SEASON_WORD` (parse.js / parse-autogidas.js).

**The current state is partly manual.** The `parse-*.js` layer branches on
`SEASON` cleanly, but the **scrape** step for all-season was done ad-hoc: the
universal pages were fetched into separate cache paths (`ads-allseason/`,
`agu-*`/`agu-ads/`, `skqu-*`, `alio-us-*`) and the winter `scrape-*.sh` scripts
still query winter only. So `SEASON=all-season ./scripts/run-all.sh --build-only`
re-parses/merges the already-cached universal pages, but a fresh universal scrape
needs the manual steps below (or, better, finish parameterizing the scrapers).

### To finish parameterizing the scrapers (the clean fix)

Give each `scripts/scrape-*.sh` a `SEASON` branch: winter uses the existing
query + cache dir; all-season uses the universal query + a `-$SEASON`-suffixed
cache dir/file. Universal queries found this session:
- Autoplius: `qt=205-55-r16-universalios` (URL slug `…-universalios-205-55-r16-…`).
- Skelbiu: search slugs like `universalios-205-55-r16-kaunas`.
- Autogidas: `f_435=Universalios` (the Sezoniškumas filter value).
- Alio: `205-55-r16-universalios-padangos-kaunas`.

### THE trap: never let seasons overwrite each other

Two independent failures cost real time this session — avoid both:

1. **Generic-alias fallback.** After adding season suffixes, if a season's
   `*-<season>.json` is missing, `merge.js` `load()` falls back to the alias,
   which holds whatever season ran last → silent contamination (winter dropped
   94→85). **Fix / prevention:** whenever you touch a parser, regenerate *both*
   seasons' JSON before merging — `for s in winter all-season; do SEASON=$s node
   parse.js; SEASON=$s node parse-skelbiu.js; …; done`. Confirm each
   `merged-<season>.json` has 0 wrong-season titles.
2. **Shared scrape cache.** If a universal scrape writes into the winter ad dir,
   it clobbers winter pages. Always use a `-$SEASON` cache path.

Verify after any season work:
```bash
node -e "for(const s of['winter','all-season']){const a=require('./.firecrawl/merged-'+s+'.json');
console.log(s,a.length,'winter-leak',a.filter(x=>/žiemin|ziemin/i.test(x.title)&&s=='all-season').length,
'uni-leak',a.filter(x=>/universal/i.test(x.title)&&s=='winter').length)}"
```

### Adding a third season (e.g. summer / vasarinės)

Add it to the `SEASONS` array in `build.js`, add the season word to each parser's
`SEASON_WORD` map, give the scrapers/parsers its query + cache branch, run
`SEASON=summer ./scripts/run-all.sh`. The empty-layer "coming soon" tab renders
automatically until data exists.

## Title extraction gotchas (Skelbiu / Alio)

The classifieds' markdown fights clean titles. When a title looks broken, fix the
cleanup in the parser — don't drop the ad.

- **Skelbiu wraps every search term in markdown emphasis, even mid-word:**
  `Bridgestone` comes back as `B _r_ idgestone`. `parse-skelbiu.js` rejoins the
  fragment forms before stripping emphasis. A standalone emphasized word
  (`Žieminės _r16_ padangos`) must keep its spaces — only *word-internal*
  fragments rejoin. Getting this wrong yields either `B r idgestone` (spaces left)
  or `Žieminėsr16padangos` (spaces eaten).
- **Place/date and image lines masquerade as the title.** The title picker skips
  the `Kaunas, <date>` line and any `![]`/URL/`.jpg` line; the fallback is the
  slug with dashes turned to spaces.
- **Escaped `\*` leaks into sizes** (Alio `205\*55-R16`): strip backslashes first,
  then the size, then a trailing `, Kaunas`. Otherwise the size char-class matches
  the `*` but not the leading `\`, leaving junk.
- **Garbage from CAPTCHA pages** is the last line of defense in `merge.js`
  (`isGarbage`), not the parser — a title over ~70 chars or containing a URL /
  reCAPTCHA string is dropped.

## Edit the viewer

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
