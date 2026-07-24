// Parses scraped autoplius ad meta lines into structured JSON for the viewer.
const fs = require('fs');

// Seller addresses, read out of the ad bodies. Autoplius shows only the nearest
// city, so a "Kaunas" ad can actually sit in Kauno r. — that distinction matters
// when deciding whether it is worth the drive.
const SELLERS = {
  '+37067099383': { area: 'Kauno r.', address: 'Tauro g. 17, Šakiai, Domeikavos sen., Kauno r.' },
  '+37062831199': { area: 'Kauno r.', address: 'Technikos g. 10, Ilgakiemis, Kauno r.' },
  '+37064993333': { area: 'Vilnius', address: 'Verkių g. 37, Vilnius' },
  '+37062415798': { area: 'Vilnius', address: 'Verkių g. 37, Vilnius' },
  '+37063075868': { area: 'Vilniaus r.', address: 'V. Sirokomlės g. 34, Nemėžis, Vilniaus r.' },
  '+37064511280': { area: 'Kaunas', address: 'Elektrėnų g. 1D (Urmas), Kaunas' },
  // Multi-branch dealer: ads span several cities, so the per-ad city tag is kept.
  '+37067193165': { address: null },
};

const raw = fs.readFileSync('.firecrawl/meta.txt', 'utf8').split('\n').filter(Boolean);
const ads = [];

for (const row of raw) {
  const [file, meta] = row.split('>>>');
  if (!meta) { console.error('NO META:', file); continue; }

  const slug = file.replace(/\.md$/, '');
  const parts = meta.split('\\|').map(s => s.trim());

  const title = parts[0].replace(/,\s*žieminės 205\/55 R16$/, '');
  const get = re => { for (const p of parts) { const m = p.match(re); if (m) return m[1]; } return null; };

  const tread = get(/^Likutis:\s*(\d+)%/);
  const qty = get(/^(\d+)\s*vnt/);
  const price = get(/^(\d+(?:[.,]\d+)?)\s*€/);
  const phone = get(/\*\*\+?(370\d{8})\*\*/);

  const CITIES = ['Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys', 'Alytus', 'Marijampolė', 'Utena', 'Telšiai', 'Tauragė'];
  let city = null;
  for (const p of parts) if (CITIES.includes(p)) { city = p; break; }

  const ph = phone ? '+' + phone : null;
  const seller = SELLERS[ph] || {};

  ads.push({
    slug,
    title,
    brand: title.split(' ')[0],
    tread: tread ? +tread : null,
    qty: qty ? +qty : null,
    price: price ? +price.replace(',', '.') : null,
    phone: ph,
    city: city || 'Nenurodyta',
    // Autoplius tags the nearest city; the seller's real address can be in the district.
    area: seller.area || (city || 'Nenurodyta'),
    address: seller.address || null,
    url: `https://autoplius.lt/skelbimai/${slug}.html`,
  });
}

ads.sort((a, b) => (a.price ?? 1e9) - (b.price ?? 1e9));
fs.writeFileSync('.firecrawl/ads.json', JSON.stringify(ads, null, 2));

const byArea = {};
for (const a of ads) byArea[a.area] = (byArea[a.area] || 0) + 1;
console.log('total:', ads.length);
console.log('by area:', byArea);
console.log('missing phone:', ads.filter(a => !a.phone).length,
  '| missing price:', ads.filter(a => !a.price).length,
  '| with address:', ads.filter(a => a.address).length);
