const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_BBOX = {
  tokyo_23wards: '35.528,139.562,35.898,139.917'
};

const TOURISM_FILTER = `
  node["tourism"~"attraction|museum|viewpoint|zoo|gallery|artwork|theme_park"](bbox);
  node["amenity"~"place_of_worship"](bbox);
  node["leisure"~"park|garden"](bbox);
  node["historic"~"castle|monument|memorial|archaeological_site"](bbox);
  node["man_made"~"tower"](bbox);
  node["shop"~"mall"](bbox);
  node["place"~"square"](bbox);
`;

function buildOverpassQuery(bbox, limit) {
  const limitClause = limit ? `out body ${limit};` : 'out body;';
  return `
  [out:json][timeout:60];
  (
    ${TOURISM_FILTER}
  );
  ${limitClause}
  `;
}

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    city: 'tokyo_23wards',
    limit: 200,
    outFile: path.resolve(process.cwd(), 'tmp', 'osm_landmarks_tokyo.json')
  };

  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === '--city') opts.city = value;
    if (key === '--bbox') opts.bbox = value;
    if (key === '--limit') opts.limit = Number(value);
    if (key === '--out') opts.outFile = path.resolve(process.cwd(), value);
  }

  const bbox = opts.bbox || DEFAULT_BBOX[opts.city];
  if (!bbox) throw new Error(`Missing bbox for city: ${opts.city}`);

  const query = buildOverpassQuery(bbox, opts.limit);
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.nchc.org.tw/api/interpreter'
  ];

  let res = null;
  let lastError = null;
  for (const url of endpoints) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query.replace(/\(bbox\)/g, `(${bbox})`))}`
      });
      if (res.ok) break;
      lastError = new Error(`Overpass error ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }

  if (!res || !res.ok) {
    const text = res ? await res.text() : String(lastError || '');
    throw new Error(`Overpass error ${res ? res.status : 'n/a'}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
  fs.writeFileSync(opts.outFile, JSON.stringify(json, null, 2));
  console.log(`Saved OSM results to ${opts.outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
