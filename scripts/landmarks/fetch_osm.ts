import fs from 'node:fs';
import path from 'node:path';

type FetchOptions = {
  city: string;
  bbox?: string; // south,west,north,east
  limit?: number;
  outFile: string;
};

const DEFAULT_BBOX: Record<string, string> = {
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

function buildOverpassQuery(bbox: string, limit?: number) {
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
  const opts: FetchOptions = {
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
  if (!bbox) {
    throw new Error(`Missing bbox for city: ${opts.city}`);
  }

  const query = buildOverpassQuery(bbox, opts.limit);
  const url = 'https://overpass-api.de/api/interpreter';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query.replace(/\(bbox\)/g, bbox))}`
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Overpass error ${res.status}: ${text.slice(0, 300)}`);
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
