// Enriches alio.lt Kaunas listings with phone, condition and quantity from the
// individual ad pages.
const fs = require('fs');
const path = require('path');

const SEASON = process.env.SEASON || 'winter';
const list = require(`./.firecrawl/alio-kaunas-${SEASON}.json`);
const dir = SEASON === 'all-season' ? '.firecrawl/alio-us-ads' : '.firecrawl/alio-k-ads';

const out = [];
for (const a of list) {
  const file = path.join(dir, a.id + '.md');
  if (!fs.existsSync(file)) { console.warn('missing scrape:', a.id); continue; }
  const md = fs.readFileSync(file, 'utf8');

  const phone = (md.match(/tel:(\+370\d{8})/) || [])[1] || null;
  // The condition sits in the spec table as "Būklė: Naujos/Naudotos"; the bare
  // words also appear in seller blurbs, so anchor on the labelled field first.
  // Both words occur throughout seller blurbs ("kaip nauja"), so only the
  // standalone spec-table line is trustworthy.
  const condM = md.match(/^(Naujos|Naudotos)\s*$/m);
  const cond = condM && condM[1] === 'Naujos' ? 'new' : 'used';
  const qtyM = md.match(/Kiekis[^0-9>]{0,12}(\d+|>\d+)/);
  const qty = qtyM ? (qtyM[1].startsWith('>') ? 5 : +qtyM[1]) : null;

  // Ads whose title is the site name carry the real name in the H1 instead.
  let title = a.title;
  if (!title) {
    const h1 = md.match(/^#\s+(.+)$/m);
    title = h1 ? h1[1].replace(/\s+/g, ' ').trim() : 'Žieminės padangos';
  }
  title = title
    .replace(/\\/g, '')              // drop markdown escape backslashes (205\*55)
    .replace(/\.{2,}/g, ' ')
    .replace(/["“”]/g, '')
    .replace(/\s*(Ismatavimai|Išmatavimai)\s*205\s*[\/*x\- ]\s*55[^,]*/gi, ' ')
    .replace(/\s*205\s*[\/*x\- ]\s*55\s*([\/*x\- ]?\s*R?\s*16)?\s*/gi, ' ')
    .replace(/^R\s*16\s*/i, '')
    .replace(/\s*,\s*(Kaunas|Kauno r\.|Vilnius|Klaipėda)\s*$/i, '') // trailing city
    .replace(/\s+/g, ' ')
    .replace(/[\s.,\-]+$/, '')
    .trim();

  const first = title.split(/\s+/)[0];
  const brand = /^(Parduodamos|Naudotos|Žieminės|Ziemines|-|Kitas)/i.test(first) ? null : first;

  out.push({
    title: title || 'Žieminės padangos',
    brand,
    tread: null,
    qty,
    qtyLabel: qty ? `${qty} vnt.` : null,
    price: a.price,
    phone,
    area: 'Kaunas',
    address: null,
    condition: cond,
    source: 'Alio',
    url: a.url,
  });
}

fs.writeFileSync(`.firecrawl/alio-final-${SEASON}.json`, JSON.stringify(out, null, 2));
fs.writeFileSync('.firecrawl/alio-final.json', JSON.stringify(out, null, 2));
console.log('alio kaunas:', out.length,
  '| used:', out.filter(a => a.condition === 'used').length,
  '| with phone:', out.filter(a => a.phone).length);
for (const a of out) console.log(` ${String(a.price).padStart(4)}€ ${(a.qtyLabel || '?').padEnd(7)} ${a.condition.padEnd(4)} ${a.title.slice(0, 44)}`);
