// Merges Autoplius (with phones) and Skelbiu (no phones, link only) into the
// single Kaunas-region dataset the viewer renders.
const fs = require('fs');

const KAUNAS = new Set(['Kaunas', 'Kauno r.']);

// Canonical tire makes. Detection scans the title (longest name first so
// "Hi Fly" wins over a stray "Fly"), which recovers brands the source portals
// left blank. "Agi"/"BF"/"-Kita-" and generic words collapse to no brand.
const BRANDS = [
  'Bridgestone', 'Continental', 'Goodyear', 'Michelin', 'Pirelli', 'Dunlop',
  'Hankook', 'Nokian', 'Yokohama', 'Kumho', 'Toyo', 'Falken', 'Nexen',
  'Cooper', 'Barum', 'Semperit', 'Uniroyal', 'Kormoran', 'Matador', 'Debica',
  'Fulda', 'Gislaved', 'Sava', 'Viking', 'Firestone', 'Vredestein',
  'Marangoni', 'Roadstone', 'Sportiva', 'Rosava', 'Sailun', 'Nankang',
  'Winrun', 'Goodride', 'Triangle', 'Linglong', 'Roadmarch', 'Lassa',
  'Marshal', 'Kelly', 'Riken', 'Tigar', 'Hi Fly', 'Maxxis', 'Starmaxx',
  'Kenda', 'Aptany', 'Comforser', 'Neolin', 'Grenlander', 'Imperial',
  'Duraturn', 'Austone', 'Prinx', 'Fortuna', 'Maxtrek', 'Powertrac',
  'Doublestar', 'Westlake', 'BF Goodrich', 'BFGoodrich', 'Fronway', 'AGI',
].sort((a, b) => b.length - a.length);

// A couple of makes are written several ways in the wild; fold them to one label.
const BRAND_ALIASES = { 'BFGoodrich': 'BF Goodrich', 'AGI': 'AGI' };

function detectBrand(title, existing) {
  const clean = (existing || '').trim();
  if (clean && BRANDS.some(b => b.toLowerCase() === clean.toLowerCase())) {
    // Normalise casing to the canonical spelling.
    return BRANDS.find(b => b.toLowerCase() === clean.toLowerCase());
  }
  const hay = ' ' + (title || '').toLowerCase() + ' ';
  for (const b of BRANDS) {
    if (hay.includes(' ' + b.toLowerCase() + ' ') || hay.includes(' ' + b.toLowerCase())) {
      // Require a word boundary so "Sava" doesn't match inside "Savanoriu".
      const re = new RegExp('\\b' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '\\b', 'i');
      if (re.test(title)) return BRAND_ALIASES[b] || b;
    }
  }
  return null;
}

const autoplius = require('./.firecrawl/ads.json')
  .filter(a => KAUNAS.has(a.area))
  .map(a => ({
    title: a.title,
    brand: a.brand,
    tread: a.tread,
    qty: a.qty,
    qtyLabel: a.qty ? `${a.qty} vnt.` : null,
    price: a.price,
    phone: a.phone,
    area: a.area,
    address: a.address,
    condition: 'used',
    source: 'Autoplius',
    url: a.url,
  }));

const skelbiu = require('./.firecrawl/skelbiu-kaunas.json')
  .filter(a => KAUNAS.has(a.area) && a.price !== null && a.url)
  .map(a => ({
    title: a.title,
    brand: a.brand,
    tread: null,
    qty: a.qty,
    qtyLabel: a.qtyLabel,
    price: a.price,
    phone: null, // Skelbiu hides numbers behind viewer verification.
    area: a.area,
    address: null,
    condition: a.condition,
    posted: a.posted,
    source: 'Skelbiu',
    url: a.url,
  }));

const autogidas = require('./.firecrawl/autogidas-kaunas.json');
const alio = require('./.firecrawl/alio-final.json');

// The same seller sometimes cross-posts to several portals. Match on the full
// model name plus price and quantity — brand+price+qty alone collides between
// genuinely different ads (two Continentals at 30 € / 4 vnt. are not one ad).
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const key = a => `${norm(a.title)}|${a.price}|${a.qty}`;
const taken = new Set(autoplius.map(key));
const dedupe = src => src.filter(a => {
  const k = key(a);
  // Titles too short to identify a model can never be matched confidently.
  if (norm(a.title).length < 10) return true;
  if (taken.has(k)) return false;
  taken.add(k);
  return true;
});

const agUnique = dedupe(autogidas);
const alUnique = dedupe(alio);
const skUnique = dedupe(skelbiu);

const all = [...autoplius, ...agUnique, ...alUnique, ...skUnique]
  .sort((a, b) => a.price - b.price);

// Normalise / backfill the brand so the filter has clean, deduplicated makes.
for (const a of all) a.brand = detectBrand(a.title, a.brand);

fs.writeFileSync('.firecrawl/merged.json', JSON.stringify(all, null, 2));

const withBrand = all.filter(a => a.brand).length;
console.log('brand detected:', withBrand, '/', all.length,
  '| still unknown:', all.length - withBrand);

const dropped = (autogidas.length - agUnique.length)
  + (alio.length - alUnique.length) + (skelbiu.length - skUnique.length);
console.log('total:', all.length, `(${dropped} dublikatai atmesti)`);
console.log('  Autoplius:', autoplius.length, '| su tel.:', autoplius.filter(a => a.phone).length);
console.log('  Autogidas:', agUnique.length, '| su tel.:', agUnique.filter(a => a.phone).length);
console.log('  Alio:', alUnique.length, '| su tel.:', alUnique.filter(a => a.phone).length);
console.log('  Skelbiu:', skUnique.length, '| su tel.:', skUnique.filter(a => a.phone).length);
console.log('by area:', all.reduce((m, a) => (m[a.area] = (m[a.area] || 0) + 1, m), {}));
console.log('used:', all.filter(a => a.condition === 'used').length,
  '| new:', all.filter(a => a.condition === 'new').length);
console.log('missing url:', all.filter(a => !a.url).length);
