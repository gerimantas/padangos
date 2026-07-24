// Enriches the Autogidas Kaunas listings with condition and seller phone,
// both of which only appear on the individual ad page.
const fs = require('fs');
const path = require('path');

const list = require('./.firecrawl/autogidas-list.json').filter(a => a.city === 'Kaunas');
const dir = '.firecrawl/ag-ads';

const out = [];
for (const a of list) {
  const file = path.join(dir, a.slug + '.md');
  if (!fs.existsSync(file)) { console.warn('missing scrape:', a.slug); continue; }
  const md = fs.readFileSync(file, 'utf8');

  const cond = /^Naujos$/m.test(md) ? 'new' : 'used';
  const phone = (md.match(/Tel\.\s*(\+370\d{8})/) || md.match(/tel:(\+370\d{8})/) || [])[1] || null;

  // Brand is the leading word of the listing title when it is a real make.
  const first = a.title.split(/\s+/)[0];
  const brand = /^(Kitas|Žieminės|205)/i.test(first) ? null : first;

  out.push({
    title: a.title,
    brand,
    tread: a.tread,
    qty: a.qty,
    qtyLabel: a.qtyLabel,
    price: a.price,
    phone,
    area: 'Kaunas',
    address: null,
    condition: cond,
    source: 'Autogidas',
    url: a.url,
  });
}

fs.writeFileSync('.firecrawl/autogidas-kaunas.json', JSON.stringify(out, null, 2));
console.log('autogidas kaunas:', out.length,
  '| used:', out.filter(a => a.condition === 'used').length,
  '| with phone:', out.filter(a => a.phone).length);
