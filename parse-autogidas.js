// Extracts Autogidas.lt listing blocks. Each block ends with the ad URL in a
// markdown link; the spec line packs size/quantity/city with no separators.
const fs = require('fs');

const text = ['ag-recheck', 'ag-pg2', 'ag-pg3']
  .map(f => { try { return fs.readFileSync(`.firecrawl/${f}.md`, 'utf8'); } catch { return ''; } })
  .join('\n');

const RE = /\*\*([^*]+)\*\*\\*\s*\n?\\*\s*\n?([\s\S]{0,600}?)\]\((https:\/\/autogidas\.lt\/skelbimas\/([a-z0-9-]+)\.html)/g;

const seen = new Set();
const out = [];

for (const m of text.matchAll(RE)) {
  const [, rawTitle, body, url, slug] = m;
  if (seen.has(slug)) continue;

  const flat = body.replace(/\\+/g, ' ').replace(/\s+/g, ' ');

  const price = flat.match(/(\d[\d ]*) ?€/);
  const spec = flat.match(/R16Plotis (\d+)Aukštis (\d+)(?:Padangų likutis % (\d+))?Kiekis ([0-9]+|>\d+|\d+ ir daugiau)([A-ZŠŽ][a-zžšėįų]+), Lietuva/);
  if (!spec) continue;

  const [, width, height, tread, qtyRaw, city] = spec;
  if (width !== '205' || height !== '55') continue;

  seen.add(slug);
  out.push({
    slug,
    title: rawTitle.replace(/\s*Žieminės\s*$/i, '').replace(/\s+/g, ' ').trim(),
    tread: tread ? +tread : null,
    qty: /ir daugiau|^>/.test(qtyRaw) ? 5 : parseInt(qtyRaw, 10),
    qtyLabel: /ir daugiau|^>/.test(qtyRaw) ? '>5 vnt.' : `${parseInt(qtyRaw, 10)} vnt.`,
    price: price ? +price[1].replace(/ /g, '') : null,
    city,
    url,
  });
}

fs.writeFileSync('.firecrawl/autogidas-list.json', JSON.stringify(out, null, 2));
const byCity = out.reduce((m, a) => (m[a.city] = (m[a.city] || 0) + 1, m), {});
console.log('autogidas 205/55 R16 winter:', out.length, '| by city:', byCity);
for (const a of out.filter(a => a.city === 'Kaunas')) {
  console.log(` ${String(a.price).padStart(4)}€ ${a.qtyLabel.padEnd(8)} ${String(a.tread ?? '—').padStart(3)}% ${a.title.slice(0, 46)}`);
}
