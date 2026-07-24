// Extracts Skelbiu.lt search-result blocks for the Kaunas region.
// Skelbiu hides seller phones behind a viewer-verification wall, so these ads
// carry no number — the ad URL is mandatory instead.
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('.firecrawl').filter(f => f.startsWith('skq-') && f.endsWith('.md'));
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
      .replace(/\\([*_])/g, '$1')
      .replace(/[_*]/g, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean);

  const size = parts.find(p => /^R16 \/ 205 \/ 55$/.test(p));
  if (!size) continue;

  const cond = parts.find(p => /^(Naudota|Nauja)$/.test(p));
  const qtyRaw = parts.find(p => /vnt\.$/.test(p));
  const place = parts.find(p => /,\s*(prieš|\d|sausio|vasario|kovo|balandžio|gegužės|birželio|liepos|rugpjūčio|rugsėjo|spalio|lapkričio|gruodžio)/.test(p) && /^(Kaunas|Kauno r\.)/.test(p));
  if (!place) continue;

  const area = place.split(',')[0].trim();
  if (!KAUNAS.test(area)) continue;

  const posted = place.split(',').slice(1).join(',').trim();
  const priceP = parts.find(p => /^\d[\d.,]* €$/.test(p));
  const title = parts.find(p => p !== 'Rodyti' && p.length > 6 && !/€|vnt\.|^R16/.test(p)) || slug;

  // Brand line sits between condition and size; "-Kita-" means unspecified.
  const bi = parts.indexOf(cond);
  let brand = bi > 0 ? parts[bi - 1] : null;
  if (!brand || /-Kita-|^\d|€/.test(brand)) brand = null;

  // Every ad is 205/55 R16 by construction, so the size in the title is noise.
  const cleanTitle = title
    .replace(/,?\s*žiemin[ėe]s?\s*205\s*\/?\s*55\s*\/?\s*R?16.*$/i, '')
    .replace(/\s*205\s*\/\s*55\s*\/?\s*r?16\s*/i, ' ')
    .replace(/[\s,.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  seen.add(id);
  out.push({
    id,
    title: cleanTitle || title.trim(),
    brand,
    condition: cond === 'Nauja' ? 'new' : 'used',
    qty: qtyRaw ? (qtyRaw.startsWith('>') ? 5 : parseInt(qtyRaw, 10)) : null,
    qtyLabel: qtyRaw || null,
    price: priceP ? Math.round(parseFloat(priceP.replace(/[^\d.,]/g, '').replace(',', '.'))) : null,
    area,
    posted,
    url,
  });
}

fs.writeFileSync('.firecrawl/skelbiu-kaunas.json', JSON.stringify(out, null, 2));
console.log('skelbiu kaunas region:', out.length);
console.log('used:', out.filter(a => a.condition === 'used').length,
  '| new:', out.filter(a => a.condition === 'new').length);
for (const a of out) {
  console.log(` ${String(a.price ?? '?').padStart(4)}€ ${a.area.padEnd(9)} ${(a.qtyLabel || '?').padEnd(7)} ${a.condition.padEnd(4)} ${a.title.slice(0, 52)}`);
}
