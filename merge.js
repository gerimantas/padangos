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

// Read the layer for the season being built; fall back to the generic alias for
// backward compatibility if the season-scoped file is absent.
const SEASON_IN = process.env.SEASON || 'winter';
const load = (base) => {
  const scoped = `./.firecrawl/${base}-${SEASON_IN}.json`;
  const generic = `./.firecrawl/${base}.json`;
  try { return require(scoped); } catch { return require(generic); }
};

const autoplius = load('ads')
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

const skelbiu = load('skelbiu-kaunas')
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

const autogidas = load('autogidas-kaunas');
const alio = load('alio-final');

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

// Drop ads whose title is obvious scrape garbage (a CAPTCHA/interstitial page
// leaked in instead of the listing). A real tire title is short and never
// contains a URL or the reCAPTCHA notice.
const isGarbage = t => !t || t.length > 70 || /recaptcha|cloud\.google|https?:\/\/|autogidas\.lt\/skelbimai/i.test(t);

// Quality floor: single tires and anything under 20 €/vnt are dropped — a lone
// tire rarely helps and sub-20 € listings are mostly worn-out or bulk clear-outs.
const MIN_PRICE = 20;
const meetsFloor = a => a.qty >= 2 && a.price != null && a.price >= MIN_PRICE;

const all = [...autoplius, ...agUnique, ...alUnique, ...skUnique]
  .filter(a => !isGarbage(a.title) && meetsFloor(a))
  .sort((a, b) => a.price - b.price);

// Normalise / backfill the brand so the filter has clean, deduplicated makes.
for (const a of all) a.brand = detectBrand(a.title, a.brand);

// The viewer stacks seasons as switchable layers, so each ad carries its season.
// SEASON env var selects which layer this run builds (default winter); the parsed
// JSON inputs are season-specific too (see run-all.sh SEASON handling).
const SEASON = process.env.SEASON || 'winter';
for (const a of all) a.season = SEASON;

fs.writeFileSync(`.firecrawl/merged-${SEASON}.json`, JSON.stringify(all, null, 2));
// Keep a stable alias so anything reading the generic name still works.
fs.writeFileSync('.firecrawl/merged.json', JSON.stringify(all, null, 2));
console.log('season:', SEASON);

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
