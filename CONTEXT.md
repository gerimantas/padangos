# CONTEXT.md — padangos

Live state for session continuity. Status snapshot + next tasks only; how-to
lives in the `padangos` skill, overview in `README.md`.

## Status (as of 2026-07-25, S4)

Deployed PWA, live at **https://gerimantas.github.io/padangos/**. Data unchanged
in count (winter **67**, all-season **55**), CACHE now `padangos-2026-07-25o`.
Three shipped changes this session:

- **Production year (best-effort).** New `year` field parsed from the ad title in
  `merge.js` (`yearFromTitle`, ~16% of ads carry it). Card badge `2021 m.` + new
  **"Su metais"** filter chip (a QTY_FILTERS entry). Help panel documents it.
- **Skelbiu "Padango s" fix.** Word-final emphasis split (`Padango _s_ 205`) now
  rejoined in `parse-skelbiu.js` (4th rejoin rule) → clean "Padangos".
- **Sort dropdown labels shortened** (Pigiausios / Brangiausios / Protektorius /
  Komplektas) so the OS-rendered `<option>` list isn't oversized on desktop.

**Non-code learnings:** (1) Facebook Marketplace is NOT scrapeable — firecrawl
explicitly refuses FB ("we do not support this site"); would need Apify/auth-cookie
+ breaks FB ToS. Not worth it. (2) WhatsApp linkifies any emoji adjacent to a URL
**even with a space between**, appending it to the link → 404. Rule: no emoji on
the same line as a shared URL.

Skill evolved to match: `year` in data model + trap, word-final-split trap.

Prior status (S3): saved ads (localStorage), per-season card colours, scroll FAB,
header stabilise, auto-derived scrape date, help "?" tab (footer removed), Skelbiu
new-vs-used reclassify; evolved skill + Stop freshness hook.

## Next Tasks (pending / ideas — none blocking)

- **Refresh data** when listings go stale: `./scripts/run-all.sh` for winter,
  `SEASON=all-season ./scripts/run-all.sh` for universal, then bump `CACHE`
  (letter-suffix, next is `…-25p`), commit, push. Consider parameterizing
  `scrape-*.sh` on `SEASON` — see skill "Add a season layer".
- **Third season?** Summer (vasarinės): add to `SEASONS` in `build.js`, wire the
  scrape/parse season branch, give it a colour pair.
- **Sort dropdown size** (cosmetic, deferred by user): native `<select>` option
  list is OS-rendered and ignores CSS font-size. Only a custom JS dropdown (or
  segmented chips) would fix desktop oversizing. User chose to leave as-is.
- **Optional polish:** favicon in browser tab, share-image meta (og:image).

## Done Log (recent)

- **S4 (2026-07-25):** production-year field + "Su metais" filter + card badge,
  Skelbiu word-final title-split fix ("Padango s"→"Padangos"), sort labels
  shortened; skill evolved (year, word-final trap). FB-scrape + WhatsApp-emoji
  learnings recorded.
- **S3 (2026-07-25):** saved ads, per-season colours, scroll FAB, header
  stabilise, auto-derived scrape date, help "?" tab (footer removed), Skelbiu
  new-vs-used reclassify, skill evolution + Stop freshness hook.

## Dead ends (do not retry)

- **Facebook Marketplace scraping** — firecrawl refuses FB outright ("we do not
  support this site"); no public search URL, login-walled, breaks FB ToS. Would
  need Apify/auth-cookie. Out of scope.
- **Skelbiu.lt phone scraping** — numbers sit behind a viewer phone-verification
  wall, not a JS click. Not scrapeable; ads correctly carry `phone: null`.
- **CSS control of native `<select>` open-list font** — OS-rendered, CSS
  `font-size` on the control (and mostly on `option`) is ignored. Shorten labels
  or build a custom dropdown; don't chase it with CSS.
- **Alio.lt / Autogidas.lt as used-tire sources in this size** — mostly dealer /
  new stock; real used supply is thin. Kept for coverage, not volume.
- **PWA on `file://`** — install/offline needs an HTTPS origin; local file won't
  register a service worker. Must be served (GitHub Pages).

## Archive

- **2026-07-25 (S2)** — Added the all-season layer + season tabs; quality floor;
  compact sticky header; removed "Visi" chips; PWA (manifest/SW/icon) + GitHub
  Pages deploy; QR code + share page.
- **2026-07-25 (S3)** — Saved ads (localStorage), per-season card colours, scroll
  FAB, header stabilisation, auto-derived scrape date, help "?" tab (footer
  removed), Skelbiu new-vs-used reclassify; evolved the skill + added a Stop hook
  that flags when source outpaces the skill docs.
- **2026-07-25 (S4)** — Production-year field ("Su metais" filter + `2021 m.`
  badge), Skelbiu word-final title-split fix, sort-dropdown labels shortened;
  skill evolved. Confirmed FB Marketplace unscrapeable; WhatsApp emoji-adjacent-
  URL breaks links.
