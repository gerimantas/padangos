# CONTEXT.md — padangos

Live state for session continuity. Status snapshot + next tasks only; how-to
lives in the `padangos` skill, overview in `README.md`.

## Status (as of 2026-07-25, S3)

Deployed PWA, big viewer + data-quality session. **https://gerimantas.github.io/padangos/**
Data unchanged in count (winter **67**, all-season **55**), CACHE now
`padangos-2026-07-25m`.

This session added, in order: **saved ads** (localStorage `padangos.saved`, star
per card + cross-season `★ Išsaugoti` tab); **per-season card colours** (winter
blue / all-season green border+glow, per-card via `seasonVars`); **"tel. tik
portale" → portal link** with ↗; **filters auto-collapse on scroll**; **↑/↓
scroll FAB** (always shown when scrollable); **header stabilised** (no scroll
jump) + subline one muted colour + centered muted title; **scrape date now
auto-derived** from newest `.firecrawl/*.md` mtime (`lastScrapeDate()` in
`build.js`, was hardcoded); **help "?" tab** — red-circled toggle that swaps the
listing for `#helpPanel` (the old `<footer>` is gone), tabs evenly distributed;
help text expanded (phone→dialer, link→ad page, "Naujos gera kaina" filter).

**Data fix:** Skelbiu dealers listing new stock under "Naudota" now reclassified
`new` (`looksNew` in `parse-skelbiu.js`) — "beveik naujos" stays used. 3 all-season
ads moved used→new.

**Skill + automation:** evolved the `padangos` skill to match all of the above
(traps, viewer regions, scrape-date, CACHE convention). Added a **Stop hook**
(`.claude/hooks/skill-freshness.sh`) that reminds to evolve the skill when source
commits outpace the skill's last commit. ⚠️ Hook needs `/hooks` opened once (or a
restart) to activate — settings watcher didn't see `.claude/settings.json` at this
session's start.

## Next Tasks (pending / ideas — none blocking)

- **Refresh data** when listings go stale: `./scripts/run-all.sh` for winter,
  `SEASON=all-season ./scripts/run-all.sh` for universal, then bump `CACHE`
  (letter-suffix, next is `…-25n`), commit, push. Consider parameterizing
  `scrape-*.sh` on `SEASON` so all-season scrapes end-to-end without manual cache
  paths — see skill "Add a season layer".
- **Third season?** Summer (vasarinės): add to `SEASONS` in `build.js`, wire the
  scrape/parse season branch, give it a colour pair.
- **Optional polish:** favicon in browser tab, share-image meta (og:image) for
  link previews.
- **Known data edge cases** (low priority, cosmetic): ~1 borderline cross-season
  dealer ad per layer; Skelbiu title heuristic occasionally grabs a weak title.

## Done Log (recent)

- **S3 (2026-07-25):** saved ads, per-season colours, scroll FAB, header
  stabilise, auto-derived scrape date, help "?" tab (footer removed), Skelbiu
  new-vs-used reclassify, skill evolution + Stop freshness hook.
- **S2 (2026-07-25):** all-season layer + season tabs, quality floor, compact
  sticky header, removed "Visi" chips, PWA + Pages deploy, QR + share page.

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
- **2026-07-25 (S2)** — Added the all-season layer + season tabs; quality floor;
  compact sticky header; removed "Visi" chips; PWA (manifest/SW/icon) + GitHub
  Pages deploy; QR code + share page.
- **2026-07-25 (S3)** — Saved ads (localStorage), per-season card colours, scroll
  FAB, header stabilisation, auto-derived scrape date, help "?" tab (footer
  removed), Skelbiu new-vs-used reclassify; evolved the skill + added a Stop hook
  that flags when source outpaces the skill docs.
