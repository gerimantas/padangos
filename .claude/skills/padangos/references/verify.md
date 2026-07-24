# Verifying the viewer

After editing `template.html` and rebuilding, render the page headless and check
the invariants instead of guessing. This project has no `.venv`; the global
Python has playwright installed. Chromium path is fixed on this machine.

Write this to the scratchpad and run it. Adjust the assertions block for whatever
you changed; the boilerplate (paths, launch, overflow check) stays.

```python
import pathlib
from playwright.sync_api import sync_playwright

CHROMIUM = r"C:\Users\retco\AppData\Local\ms-playwright\chromium-1223\chrome-win64\chrome.exe"
URL = pathlib.Path(r"c:\Users\retco\Projects\padangos\padangos.html").as_uri()

errors = []
with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROMIUM, headless=True, args=["--no-sandbox"])

    # Desktop
    page = br.new_page(viewport={"width": 1440, "height": 1000})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL); page.wait_for_load_state("networkidle")
    print("cards:", page.locator("article.card").count())
    print("cards without ad link:", page.eval_on_selector_all(
        "article.card", "els => els.filter(c=>!c.querySelector('a.view')).length"))
    print("non-Kaunas areas (expect only Kaunas/Kauno r.):", page.evaluate(
        "[...new Set([...document.querySelectorAll('.tag.area')].map(e=>e.textContent))]"))
    # tel: links must be bare +370XXXXXXXX, no spaces
    import re
    hrefs = page.eval_on_selector_all("a.call", "els=>els.map(e=>e.getAttribute('href'))")
    print("malformed tel links:", [h for h in hrefs if not re.fullmatch(r"tel:\+370\d{8}", h)] or "none")

    # Mobile — the load-bearing invariant
    m = br.new_context(**p.devices["iPhone 13"]).new_page()
    m.goto(URL); m.wait_for_load_state("networkidle")
    sw = m.evaluate("document.documentElement.scrollWidth")
    cw = m.evaluate("document.documentElement.clientWidth")
    print(f"mobile scrollWidth={sw} clientWidth={cw}", "OK" if sw == cw else "*** HORIZONTAL OVERFLOW ***")

    br.close()

print("CONSOLE ERRORS:", errors or "none")
```

Run it (force UTF-8 so Lithuanian chars in output don't crash the console):

```bash
PYTHONIOENCODING=utf-8 python <scratchpad>/verify.py
```

## What each check guards

- **cards without ad link = 0** — every ad must link out; the URL is the fallback
  CTA for phone-less (Skelbiu) ads.
- **non-Kaunas areas** — the region filter in `merge.js` should leave only
  `Kaunas` / `Kauno r.`; anything else means a merge regression.
- **malformed tel links = none** — the visible number is spaced for reading, but
  the `href` must be bare digits or some Android dialers choke.
- **mobile scrollWidth == clientWidth** — the page must not scroll sideways on a
  phone. If it does, something (usually a non-scrolling filter row or a fixed
  width) broke out; wrap it or give its container `overflow-x: auto`.

For richer checks (toggle the "Naujos" view, open a brand dropdown, assert
counts), extend the desktop block — the session history has examples of clicking
`#newToggle`, `#mainToggle`, `[data-brand="…"]` and asserting the resulting card
counts.

Interactive selectors added since the base harness, worth asserting when you
touch them: `.save` / `[data-save]` (star toggle → `localStorage["padangos.saved"]`
persists across a `page.reload()`), `#savedToggle` (cross-season saved list;
grid + `.controls` hidden while active), `#helpToggle` (swaps `#grid` for
`#helpPanel`; `.controls` hidden), `#scrollFab` with `#fabTop`/`#fabBottom`
(shown when `scrollHeight - innerHeight > 240`, each disabled at its extreme),
and the mobile filter auto-collapse (open `#filterBody`, scroll past 60, assert
it closed). All four have working reference scripts in the session history.

## Gotchas that wasted time

- **Screenshots look "huge" at DPR 2–3, but the CSS is fine.** The iPhone device
  profile renders at `device_scale_factor` 3, so a 390-CSS-px page produces a
  ~1170px image and every element looks oversized. Do NOT resize things based on
  how a screenshot looks. To judge real size, either read the computed value
  (`getComputedStyle(e).fontSize`, `getBoundingClientRect().height`) or capture at
  `device_scale_factor=1`. This misread caused "shrink the chips" churn that the
  computed values didn't support.
- **Lithuanian output crashes the Windows console** (`cp1252` can't encode `ė`,
  `ž`, `ū`). Always run verify scripts with `PYTHONIOENCODING=utf-8 python …`, or
  the script dies on a `print` of scraped text, not on a real failure.
- **Prefer computed-style assertions over eyeballing** for anything measurable —
  radius, font-size, overflow, element-on-same-line (`Math.abs(topA-topB)<6`).
  They're deterministic and don't depend on DPR or theme.

## If playwright is missing

`python -c "import playwright"` — if it fails:
`python -m pip install playwright==1.60.0` (no browser download needed; the
Chromium binary above is already present). Do NOT reinstall Chromium.
