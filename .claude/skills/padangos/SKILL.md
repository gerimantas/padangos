---
name: padangos
description: Operate the padangos used-tire search project (c:\Users\retco\Projects\padangos) — a self-contained padangos.html viewer of used winter 205/55 R16 tire listings scraped from four Lithuanian classifieds portals (Autoplius, Autogidas, Alio, Skelbiu), filtered to the Kaunas region. Use this skill whenever the user wants to refresh/re-scrape the listings, add or change a portal or search size, edit the viewer's filters/layout/styles, fix the scrape→parse→merge→build pipeline, add seller addresses, tune brand detection or cross-post dedupe, or troubleshoot why an ad, phone, price, or brand is wrong or missing. Trigger on: "atnaujink padangas/skelbimus", "perscrapink", "pataisyk padangos.html", "pridek portala/gamintoja/filtra", "kodel skelbimo/telefono/kainos nera", "padangos", "run-all", or any work inside the padangos project. Also trigger when the user opens padangos.html, template.html, or any parse-*.js / merge.js / build.js in this project and asks to change it.
---

# Padangos — used tire search project

A pipeline that scrapes used winter tire listings (205/55 R16, Kaunas region)
from four LT classifieds portals and renders them into a single self-contained
`padangos.html` file. Project root: `c:\Users\retco\Projects\padangos`.

**Always work from the project root.** All scripts assume it as the cwd.

## The pipeline

```
scrape (firecrawl CLI)  →  parse (node)  →  merge (node)  →  build (node)
   .firecrawl/*.md          *.json           merged.json      padangos.html
```

`scripts/run-all.sh` is the single source of truth for what runs in what order.
`README.md` is the human-facing overview — read it first if unsure.

## Choosing what to run

The golden rule: **scraping costs firecrawl credits and hits the network; parsing/building is free and instant.** Pick the smallest step that covers the change.

| The user wants to… | Run |
|---|---|
| Fresh listings (new ads, updated prices) | `./scripts/run-all.sh` |
| Re-parse after editing a parser / merge / brand list / seller map | `./scripts/run-all.sh --build-only` |
| Only change the viewer (HTML/CSS/JS) | edit `template.html`, then `node build.js` |
| Re-scrape one portal only | `bash scripts/scrape-<portal>.sh`, then `./scripts/run-all.sh --build-only` |

`--build-only` reuses the cached `.firecrawl/` pages, so it never scrapes. Prefer
it for every change that isn't "get newer data". After any run, tell the user to
open `padangos.html`.

Requirements: `firecrawl` CLI authenticated (`firecrawl login --browser`) and Node.

## Verifying a change

There is a playwright check harness pattern used throughout this project's
history. After editing `template.html`, verify with a headless render rather than
guessing — see `references/verify.md` for the ready-to-run script. It checks:
page renders, no console errors, no horizontal overflow on mobile (390px),
`tel:` links well-formed, filter counts consistent. Run it before reporting done.

The invariant that matters most: **the page must never scroll horizontally on a
phone** (`scrollWidth === clientWidth === 390`). Filter chip rows scroll inside
themselves; the body does not.

## How the four portals differ

This asymmetry drives most of the code — keep it in mind before touching a parser.

| Portal | Phone in scrape? | Tread %? | Notes |
|---|---|---|---|
| Autoplius | ✅ full | ✅ | Richest. City tag is *nearest city* — real address can be Kauno r. |
| Autogidas | ⚠️ some ads | ✅ | Condition + phone only on the ad page, not the listing. |
| Alio | ✅ | ❌ | Thin used supply in this size; mostly dealer/new. |
| Skelbiu | ❌ never | ❌ | Phone behind a viewer-verification wall. Link only. |

Skelbiu ads legitimately have `phone: null` and show "tel. tik portale" — that is
correct, not a bug. Do not try to scrape Skelbiu phone numbers; it is a login
wall, not a JS click.

## Data model

Every ad in `.firecrawl/merged.json` (and inlined into the HTML) is:

```js
{
  title, brand,        // brand may be null → shown under "Kita"
  tread,               // % or null (only Autoplius/Autogidas report it)
  qty, qtyLabel,       // 4, "4 vnt." — qtyLabel preserves ">5 vnt."
  price,               // €/vnt (per single tire, never per set)
  phone,               // "+370…" or null (Skelbiu + some Autogidas)
  area,                // "Kaunas" | "Kauno r." (only these two survive merge)
  address,             // seller street address or null
  condition,           // "used" | "new"
  source,              // "Autoplius" | "Autogidas" | "Alio" | "Skelbiu"
  url,                 // ad link — ALWAYS present, it is the fallback CTA
}
```

Prices are per single tire. "Komplekto kaina" = `price × qty`. Every ad also has
`season` (`"winter"` | `"all-season"`).

## Seasons (switchable layers)

The viewer stacks one layer per season as tabs at the top (Žieminės /
Universalios). `build.js` reads **every** `.firecrawl/merged-<season>.json` that
exists and inlines them as a season-keyed object; a season with no file yet shows
as an empty "coming soon" tab. `SEASON` env var (default `winter`) selects which
layer a `merge.js`/`run-all.sh` run produces — building one season never drops
another. To add the all-season data layer, see references/tasks.md "Add a season
layer" — it needs season-specific scrape queries and a separate cache dir so the
two seasons don't overwrite each other's pages.

## Common edits

For anything beyond a quick tweak, read the matching section of
`references/tasks.md` — it has step-by-step recipes with the exact files and
line-level anchors for:

- **Add / change seller address** → edit `SELLERS` map in `parse.js`
- **Fix / add a brand** → edit `BRANDS` list in `merge.js` (brand detection)
- **Cross-post duplicate wrongly dropped/kept** → `dedupe` key in `merge.js`
- **Add a new portal** → new `scrape-*.sh` + `parse-*.js` + wire into `merge.js` + `run-all.sh`
- **Change the search size (e.g. 205/55 R16 → other)** → the URL query in each `scrape-*.sh`
- **Edit the viewer** (filters, header, cards, mobile) → `template.html` regions

## What NOT to do

- Never edit `padangos.html` directly — it is generated. Edit `template.html` and
  rebuild. (`build.js` wraps `template.html` in the `<head>`/viewport skeleton.)
- Never hand-edit files under `.firecrawl/` — they are scrape output/intermediate
  and gitignored. Regenerate via the pipeline.
- Never invent phone numbers or addresses. If a portal doesn't expose one, the ad
  keeps `null` and the viewer shows the link instead.
