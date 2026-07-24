# CONTEXT.md — padangos

Live state for session continuity. Status snapshot + next tasks only; how-to
lives in the `padangos` skill, overview in `README.md`.

## Status (as of 2026-07-25)

Fully working, deployed PWA. **https://gerimantas.github.io/padangos/**

- **Data:** two season layers, switchable via tabs.
  - Žieminės (winter): **67** ads after the quality floor.
  - Universalios (all-season / M+S): **55** ads.
  - Sources: Autoplius (phones + tread), Autogidas (some phones + tread), Alio
    (phones, thin supply), Skelbiu (no phones — link only, phone behind a
    login wall).
  - Kaunas + Kauno r. only. Seller addresses backfilled for the two main Kauno r.
    dealers (see `SELLERS` in `parse.js`).
- **Quality floor** (in `merge.js`): drops single tires (`qty < 2`) and anything
  under 20 €/vnt, both seasons.
- **Viewer:** compact single-line sticky header that stays visible on scroll;
  season tabs; collapsible mobile filter menu (burger) with active-filter badge;
  brand filter split into "Pagrindiniai" (>1 ad) + "Kiti" dropdowns; source/qty
  chips (no "Visi" chip — re-click clears); used/new split ("Naujos gera kaina").
  Phone shown as plain blue tap-to-call text + portal-name link on one line.
- **PWA:** manifest + service worker (offline via inlined data) + tire icon +
  `index.html` entry. Installable to the home screen. QR: `padangos-qr.png`.
- **Git:** all pushed to `gerimantas/padangos` (branch `main`), Pages live.
  Only `padangos-qr.png` is currently untracked (large standalone QR — commit if
  wanted).

## Next Tasks (pending / ideas — none blocking)

- **Refresh data** when listings go stale: `./scripts/run-all.sh` for winter,
  `SEASON=all-season ./scripts/run-all.sh` for universal, then bump `CACHE` in
  `sw.js`, commit, push. (Scrape scripts currently query winter by default; the
  all-season scrape used ad-hoc `-us`/`agu-`/`skqu-`/`alio-us` cache paths — see
  the skill's "Add a season layer" recipe. Consider fully parameterizing the
  `scrape-*.sh` scripts on `SEASON` so `SEASON=all-season ./scripts/run-all.sh`
  scrapes end-to-end without manual steps.)
- **Third season?** Summer (vasarinės) would slot in: add to `SEASONS` in
  `build.js`, wire the scrape/parse season branch, done.
- **Known data edge cases** (low priority): ~1 borderline cross-season ad per
  layer where a dealer lists both winter and M+S in one title; the Skelbiu title
  heuristic occasionally grabs a weak title. Both are cosmetic.
- **Optional polish:** favicon in browser tab, share-image meta (og:image) for
  link previews, a "last updated" freshness note pulled from the scrape date.

## Dead ends (do not retry)

- **Skelbiu.lt phone scraping** — numbers sit behind a viewer phone-verification
  wall, not a JS click. Not scrapeable; ads correctly carry `phone: null`.
- **Alio.lt / Autogidas.lt as used-tire sources in this size** — mostly dealer /
  new stock; real used supply is thin. Kept for coverage, not volume.
- **PWA on `file://`** — install/offline needs an HTTPS origin; local file won't
  register a service worker. Must be served (GitHub Pages).

## Archive

- **2026-07-24** — Built the winter viewer end to end: scraped 4 portals, wrote
  the parse→merge→build pipeline, designed the filter UI, created the `padangos`
  skill + README, pushed to GitHub.
- **2026-07-25** — Added the all-season layer + season tabs; quality floor;
  compact sticky header; removed "Visi" chips; PWA (manifest/SW/icon) + GitHub
  Pages deploy; QR code + share page.
