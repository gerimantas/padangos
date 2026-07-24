// Extracts alio.lt Kaunas listings for 205/55 R16 winter tires.
// Alio exposes seller phones on the ad page, so these are scraped individually.
const fs = require('fs');

const text = fs.readFileSync('.firecrawl/alio-k.md', 'utf8');
const RE = /!\[([^\]]*)\]\(https:\/\/s\.alio\.lt\/[^)]+\)([\s\S]*?)\]\((https:\/\/www\.alio\.lt\/skelbimai\/[^)]+\/ID(\d+)\.html)\)/g;

const seen = new Set();
const out = [];

for (const m of text.matchAll(RE)) {
  const [, alt, body, url, id] = m;
  if (seen.has(id)) continue;

  const clean = body.replace(/[\\_*]/g, ' ').replace(/\s+/g, ' ').trim();
  const title = alt.replace(/\s+/g, ' ').trim();
  const city = (clean.match(/\b(Kaunas|Vilnius|Klaipėda|Šiauliai|Panevėžys|Alytus)\b/) || [])[1];
  if (city !== 'Kaunas') continue;

  const hay = (title + ' ' + clean + ' ' + decodeURIComponent(url)).toLowerCase();

  // Must be this exact size. Titles write it as 205/55, 205*55, 205-55 or "205 / 55".
  if (!/205\s*[\/*x\- ]\s*55/.test(hay)) continue;
  // Must be a winter/all-season tire, not a summer one that merely shares the size.
  if (!/ziemin|žiemin|m\+s|winter|nord polaris|wt-21|i cept|snow|optima north|alpin/.test(hay)) continue;
  if (/vasarin|sport bluresponse|sport contact|ultra sport/.test(hay)) continue;

  const price = clean.match(/(\d[\d ]*) ?€/);
  seen.add(id);
  out.push({
    id,
    title: title === 'Alio.lt nemokami skelbimai' ? null : title,
    price: price ? +price[1].replace(/ /g, '') : null,
    city,
    url,
  });
}

fs.writeFileSync('.firecrawl/alio-kaunas.json', JSON.stringify(out, null, 2));
console.log('alio kaunas winter 205/55 R16:', out.length);
for (const a of out) console.log(` ${String(a.price ?? '?').padStart(4)}€ ${(a.title || '(be pavadinimo)').slice(0, 56)}`);
