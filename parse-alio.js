// Extracts alio.lt search-result listing blocks. Each block is an image link
// followed by title / city / price / age, terminated by the ad URL.
const fs = require('fs');

const text = ['alio-z', 'alio-z2', 'alio-z3']
  .map(f => { try { return fs.readFileSync(`.firecrawl/${f}.md`, 'utf8'); } catch { return ''; } })
  .join('\n');

// Blocks are separated by the image-link opener; capture up to the closing ad URL.
const RE = /!\[([^\]]*)\]\(https:\/\/s\.alio\.lt\/[^)]+\)([\s\S]*?)\]\((https:\/\/www\.alio\.lt\/skelbimai\/[^)]+\/ID(\d+)\.html)\)/g;

const seen = new Set();
const out = [];

for (const m of text.matchAll(RE)) {
  const [, imgAlt, body, url, id] = m;
  if (seen.has(id)) continue;

  const clean = body.replace(/[\\_*]/g, ' ').replace(/\s+/g, ' ').trim();
  const title = (imgAlt || clean.split('  ')[0] || '').replace(/[\\_*]/g, '').trim();

  // Size + season must both be present, otherwise it is a cross-linked ad.
  const hay = (title + ' ' + clean + ' ' + url).toLowerCase();
  const size = /205\s*[\/*x-]\s*55\s*[\/*x-]?\s*r?\s*16/.test(hay);
  const winter = /ziemin|žiemin|m\+s|winter|nord|blizzak|eskimo|snow/.test(hay);
  if (!size || !winter) continue;

  const price = clean.match(/(\d[\d ]*) ?€/);
  const city = clean.match(/\b(Kaunas|Vilnius|Klaipėda|Šiauliai|Panevėžys|Alytus|Marijampolė|Utena|Telšiai|Tauragė)\b/);

  seen.add(id);
  out.push({
    id,
    title,
    price: price ? +price[1].replace(/ /g, '') : null,
    city: city ? city[1] : null,
    url,
  });
}

fs.writeFileSync('.firecrawl/alio-list.json', JSON.stringify(out, null, 2));
console.log('alio winter 205/55 R16 candidates:', out.length);
console.log('with city:', out.filter(a => a.city).length, '| kaunas:', out.filter(a => a.city === 'Kaunas').length);
for (const a of out.slice(0, 40)) console.log(` ${String(a.price ?? '?').padStart(4)}€ ${(a.city || '—').padEnd(10)} ${a.title.slice(0, 62)}`);
