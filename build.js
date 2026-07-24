// Builds the standalone HTML viewer with ad data inlined.
// The viewer holds one layer per season; this collects every merged-<season>.json
// that exists and inlines them as a single season-keyed object. A season with no
// data yet simply produces an empty layer the viewer shows as "coming soon".
const fs = require('fs');
const path = require('path');

// Declared order = tab order in the viewer. Winter ships first; all-season fills
// in once its scrape runs.
const SEASONS = [
  { id: 'winter', label: 'Žieminės' },
  { id: 'all-season', label: 'Universalios' },
];

const layers = {};
for (const s of SEASONS) {
  const file = path.join('.firecrawl', `merged-${s.id}.json`);
  layers[s.id] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}

const total = Object.values(layers).reduce((n, l) => n + l.length, 0);

const body = fs.readFileSync('template.html', 'utf8')
  .replace('/*__SEASONS__*/[]', JSON.stringify(SEASONS))
  .replace('/*__LAYERS__*/{}', JSON.stringify(layers))
  .replaceAll('__SCRAPED__', '2026-07-25');

// Standalone file, so it needs its own head — without the viewport meta a phone
// renders the page at desktop width and zooms out.
const html = `<!doctype html>
<html lang="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Naudotos padangos 205/55 R16 · Kaunas</title>
<!-- PWA: installable to the home screen, works offline (data is inlined). -->
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#12171b">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Padangos">
<link rel="apple-touch-icon" href="pwa/icon-192.png">
<link rel="icon" type="image/png" href="pwa/icon-192.png">
</head>
<body>
${body}
<script>
  // Register the service worker so the app is installable and works offline.
  // Only over http(s); on file:// it is unsupported and silently skipped.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
</script>
</body>
</html>
`;

fs.writeFileSync('padangos.html', html);
// Also emit index.html so GitHub Pages serves the app at the bare directory URL
// (https://…/padangos/), which is what people install to the home screen.
fs.writeFileSync('index.html', html);
const counts = SEASONS.map(s => `${s.id}=${layers[s.id].length}`).join(', ');
console.log('padangos.html + index.html written:', html.length, 'bytes |', counts, '| total', total);
