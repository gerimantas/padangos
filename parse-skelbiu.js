// Extracts Skelbiu.lt search-result blocks for the Kaunas region.
// Skelbiu hides seller phones behind a viewer-verification wall, so these ads
// carry no number — the ad URL is mandatory instead.
const fs = require('fs');
const path = require('path');

// SEASON picks the scrape files (skq-* winter, skqu-* all-season) and the season
// word stripped from titles / used for the output name.
const SEASON = process.env.SEASON || 'winter';
const PREFIX = SEASON === 'all-season' ? 'skqu-' : 'skq-';

const files = fs.readdirSync('.firecrawl').filter(f => f.startsWith(PREFIX) && f.endsWith('.md'));
const text = files.map(f => fs.readFileSync(path.join('.firecrawl', f), 'utf8')).join('\n');

// A block runs from "[Rodyti" to the closing ad URL.
const RE = /\[Rodyti([\s\S]*?)\]\((https:\/\/www\.skelbiu\.lt\/skelbimai\/([a-z0-9-]+)-(\d+)\.html)\)/g;

const KAUNAS = /^(Kaunas|Kauno r\.)$/;
const seen = new Set();
const out = [];

for (const m of text.matchAll(RE)) {
  const [, body, url, slug, id] = m;
  if (seen.has(id)) continue;

  // Fields are separated by "\\" line breaks in the scraped markdown.
  // Fields are separated by a double backslash at end of line. Single escapes
  // like \* sit inside titles, so split on the line break rather than on any
  // backslash run, then strip markdown emphasis from each field.
  // Skelbiu highlights every search term with markdown emphasis, including bare
  // letters inside words — "Bridgestone" comes back as "B _r_ idgestone". Rejoin
  // those before stripping emphasis, or the word keeps the padding spaces.
  const parts = body.split(/\\\\\s*\n?/)
    .map(s => s
      // Skelbiu emphasises matched terms, and when a term falls inside a word it
      // pads it with spaces: "Bridgestone" -> "B _r_ idgestone". Rejoin only the
      // fragment forms — a term that is a standalone word ("Žieminės _r16_
      // padangos") must keep its surrounding spaces.
      .replace(/(?<=\w)_([a-z]{1,3})_(?=\w)/gi, '$1')          // B_r_idgestone
      .replace(/(?<=\w) _([a-z]{1,3})_ (?=[a-z])/gi, '$1')     // B _r_ idgestone
      .replace(/(?<=^|[\s(])_([a-z]{1,3})_ (?=[a-z]{2})/gi, '$1') // _R_ oadstone
      // Word-final split: the emphasised fragment is the word's own tail, so it is
      // followed by a space + non-letter (digit / punctuation / end), not more
      // letters — "Padango _s_ 205" -> "Padangos 205", "Naujo _s_" -> "Naujos".
      // Restricted to 1–2 chars so it only rejoins a broken suffix, never a real
      // standalone token.
      .replace(/(?<=\p{L}) _(\p{Ll}{1,2})_(?=\s|[).,]|$)/gu, '$1')
      .replace(/\\([*_])/g, '$1')
      .replace(/[_*]/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean);

  const size = parts.find(p => /^R16 \/ 205 \/ 55$/.test(p));
  if (!size) continue;

  // Skelbiu's search mixes seasons, so filter by what the ad text actually says.
  // On the all-season layer drop anything explicitly winter/summer; on winter
  // drop explicit universal/summer. The ad's own words are the source of truth.
  const blockText = parts.join(' ').toLowerCase();
  const isWinter = /žiemin|ziemin/.test(blockText);
  const isUniversal = /universal|m\+s|all\s*season|4\s*season|quatrac|vector|crossclimate|weather/.test(blockText);
  const isSummer = /vasarin/.test(blockText);
  if (SEASON === 'all-season') {
    if (isWinter && !isUniversal) continue;
    if (isSummer && !isUniversal) continue;
  } else {
    if (isUniversal && !isWinter) continue;
    if (isSummer && !isWinter) continue;
  }

  const cond = parts.find(p => /^(Naudota|Nauja)$/.test(p));
  const qtyRaw = parts.find(p => /vnt\.$/.test(p));
  const place = parts.find(p => /,\s*(prieš|\d|sausio|vasario|kovo|balandžio|gegužės|birželio|liepos|rugpjūčio|rugsėjo|spalio|lapkričio|gruodžio)/.test(p) && /^(Kaunas|Kauno r\.)/.test(p));
  if (!place) continue;

  const area = place.split(',')[0].trim();
  if (!KAUNAS.test(area)) continue;

  const posted = place.split(',').slice(1).join(',').trim();
  const priceP = parts.find(p => /^\d[\d.,]* €$/.test(p));
  // The title is the first substantive line — skip the place/date line, the
  // price, quantity and size, which can otherwise be mistaken for it.
  const isPlaceLine = p => /^(Kaunas|Kauno r\.|Vilnius|Klaipėda)\s*,/.test(p);
  const isNoise = p => /€|vnt\.|^R16|!\[|\]\(|https?:|\.jpg|\.png|^Naudota$|^Nauja$/.test(p);
  const title = parts.find(p =>
    p !== 'Rodyti' && p.length > 6 && !isNoise(p) && !isPlaceLine(p))
    || slug.replace(/-/g, ' ');

  // Brand line sits between condition and size; "-Kita-" means unspecified.
  const bi = parts.indexOf(cond);
  let brand = bi > 0 ? parts[bi - 1] : null;
  if (!brand || /-Kita-|^\d|€/.test(brand)) brand = null;

  // Every ad is 205/55 R16 by construction, so the size + season word in the
  // title is noise. Strip both seasons' words regardless of the active layer.
  const cleanTitle = title
    .replace(/,?\s*(žiemin[ėe]s?|universali[ои]s?|vasarin[ėe]s?)\s*205\s*\/?\s*55\s*\/?\s*R?16.*$/i, '')
    .replace(/\s*205\s*\/\s*55\s*\/?\s*r?16\s*/i, ' ')
    .replace(/[\s,.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Skelbiu's own "Naudota/Nauja" field is the primary signal, but some dealers
  // list genuinely-new stock under "Naudota" while the title and URL shout
  // "naujos" (+ a recent model year). Treat those as new. "beveik naujos"
  // (almost new) is the opposite — an explicitly used tire — so it must NOT flip.
  const looksNew = (
    /\bnaujos?\b/i.test(title) && !/beveik\s+naujos?/i.test(title)
  ) || /naujos-padangos/i.test(slug);
  const condition = cond === 'Nauja' || looksNew ? 'new' : 'used';

  seen.add(id);
  out.push({
    id,
    title: cleanTitle || title.trim(),
    brand,
    condition,
    qty: qtyRaw ? (qtyRaw.startsWith('>') ? 5 : parseInt(qtyRaw, 10)) : null,
    qtyLabel: qtyRaw || null,
    price: priceP ? Math.round(parseFloat(priceP.replace(/[^\d.,]/g, '').replace(',', '.'))) : null,
    area,
    posted,
    url,
  });
}

fs.writeFileSync(`.firecrawl/skelbiu-kaunas-${SEASON}.json`, JSON.stringify(out, null, 2));
fs.writeFileSync('.firecrawl/skelbiu-kaunas.json', JSON.stringify(out, null, 2));
console.log('skelbiu kaunas region:', out.length);
console.log('used:', out.filter(a => a.condition === 'used').length,
  '| new:', out.filter(a => a.condition === 'new').length);
for (const a of out) {
  console.log(` ${String(a.price ?? '?').padStart(4)}€ ${a.area.padEnd(9)} ${(a.qtyLabel || '?').padEnd(7)} ${a.condition.padEnd(4)} ${a.title.slice(0, 52)}`);
}
