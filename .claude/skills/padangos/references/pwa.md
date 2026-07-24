# PWA, deploy, and QR

The viewer is an installable PWA hosted on GitHub Pages:
**https://gerimantas.github.io/padangos/**. Because all listing data is inlined
into the HTML, the app works fully offline once installed.

## The moving parts

| File | Role |
|---|---|
| `manifest.webmanifest` | App metadata — name, `start_url: ./`, `display: standalone`, icons. |
| `sw.js` | Service worker. Network-first for the page (fresh listings win online), cache-first for assets, offline fallback to the cached page. |
| `pwa/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Home-screen icons (tire graphic). Source: `pwa/icon.svg`. |
| `index.html` | Install entry — `build.js` emits it alongside `padangos.html` so the app installs from the bare `/padangos/` URL. |
| `build.js` head block | Injects the manifest link, theme-color, apple-* meta, icon links, and the SW registration script. |

## Deploying a change (the full loop)

```bash
node build.js            # regenerates padangos.html + index.html
# bump the cache version in sw.js — see below, this is the one people forget
git add -A && git commit -m "…" && git push
```

GitHub Pages redeploys in ~1 min. Verify live:
`curl -s -o /dev/null -w "%{http_code}\n" https://gerimantas.github.io/padangos/`.

**Bump `CACHE` in `sw.js` on every data or page change** (anchor: `const CACHE =`).
The service worker serves the cached page to installed phones; if the cache name
is unchanged, the old worker keeps the stale copy and users never see the update.
Changing the name forces `activate` to drop old caches. Forgetting this is the
single most likely "why didn't my update show up" cause.

**Naming convention:** `padangos-<YYYY-MM-DD>` plus a trailing letter that
increments per *additional* bump on the same day — `…-25` → `…-25b` → `…-25c` …
(a session once reached `…-25m`). Read the current value and bump the letter; do
**not** reset to a bare date, or you can reuse a name already shipped that day and
the update won't propagate. New day → new date, drop the letter.

**Saved ads are NOT in the cache.** `localStorage["padangos.saved"]` lives
outside the SW `CACHE`, so bumping the cache (or a full app update) never wipes a
user's saved list — that independence is intentional. Don't try to version or
clear saved ads via the cache.

## file:// does not work

A service worker (hence install + offline) requires a secure origin. Opening the
HTML as a local `file://` silently skips registration — the registration script
guards on `location.protocol.startsWith('http')`. To test PWA behaviour locally,
serve it: `python -m http.server 8137` then load `http://localhost:8137/`.

## Regenerating the icons

Edit `pwa/icon.svg`, then rasterize to PNG. There is no `.venv`; use the global
Python + the bundled Chromium to render the SVG at each size (the maskable variant
drops the rounded corners so the OS mask has full bleed). The pattern:

```python
# render <svg> at N×N via playwright, screenshot the <svg> element with
# omit_background=True. Sizes: 192, 512, and a maskable 512.
```

(The session's `rasterize.py` in the scratchpad is the reference implementation.)

## QR code

`padangos-qr.png` (root, 900×900) and `pwa/qr.png` / `qr.svg` point at the live
URL. `qr.html` is a printable share card (QR + URL + install steps, inlined PNG).

Generate with `segno` (pure Python, no deps, deterministic — no need to decode to
verify; the encoded string is exactly what you pass):

```python
import segno
segno.make("https://gerimantas.github.io/padangos/", error='h') \
     .save("padangos-qr.png", scale=20, border=4, dark="#000000", light="#ffffff")
```

Use `error='h'` (high correction) so the code still scans when partly obscured.
Install once with `python -m pip install segno` if missing.

## Verifying installability

Serve over http, then check with playwright: manifest link resolves + parses,
`navigator.serviceWorker.getRegistration()` is truthy, `display: standalone`, and
the icon set includes a maskable entry. No console errors. (See the session's
`pwa_check.py` pattern.)
