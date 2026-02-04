const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LIMIT = 200;

const SPARQL_QUERY = (limit) => `
SELECT ?item ?itemLabel ?itemAltLabel ?lat ?lon ?typeLabel WHERE {
  ?item wdt:P31/wdt:P279* ?type .
  VALUES ?type { wd:Q570116 wd:Q33506 wd:Q174782 wd:Q16560 wd:Q444733 } # tourism / museum / park / garden / viewpoint
  ?item wdt:P131* wd:Q1490 .  # located in Tokyo
  ?item wdt:P625 ?coord .
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ja,zh". }
}
LIMIT ${limit}
`;

async function main() {
  const args = process.argv.slice(2);
  const opts = {
    city: 'tokyo_23wards',
    limit: DEFAULT_LIMIT,
    outFile: path.resolve(process.cwd(), 'tmp', 'wikidata_landmarks_tokyo.json')
  };

  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === '--city') opts.city = value;
    if (key === '--limit') opts.limit = Number(value);
    if (key === '--out') opts.outFile = path.resolve(process.cwd(), value);
  }

  const url = 'https://query.wikidata.org/sparql';
  const query = SPARQL_QUERY(opts.limit || DEFAULT_LIMIT);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sparql-query',
      'Accept': 'application/sparql-results+json',
      'User-Agent': 'lutagu-landmarks/1.0 (https://lutagu.app)'
    },
    body: query
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wikidata error ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  fs.mkdirSync(path.dirname(opts.outFile), { recursive: true });
  fs.writeFileSync(opts.outFile, JSON.stringify(json, null, 2));
  console.log(`Saved Wikidata results to ${opts.outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
