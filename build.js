// Builds the standalone HTML viewer with ad data inlined.
const fs = require('fs');
const ads = require('./.firecrawl/merged.json');

const body = fs.readFileSync('template.html', 'utf8')
  .replace('/*__ADS__*/[]', JSON.stringify(ads))
  .replaceAll('__SCRAPED__', '2026-07-24');

// Standalone file, so it needs its own head — without the viewport meta a phone
// renders the page at desktop width and zooms out.
const html = `<!doctype html>
<html lang="lt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
</head>
<body>
${body}
</body>
</html>
`;

fs.writeFileSync('padangos.html', html);
console.log('padangos.html written:', html.length, 'bytes,', ads.length, 'ads');
