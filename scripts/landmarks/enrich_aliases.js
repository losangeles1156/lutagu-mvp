const fs = require('node:fs');
const path = require('node:path');

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter'
];

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function dedupe(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

async function fetchOverpassNode(osmId) {
  const query = `[out:json][timeout:25];node(${osmId});out body;`;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });
      if (!res.ok) continue;
      const json = await res.json();
      return json?.elements?.[0] || null;
    } catch (err) {
      continue;
    }
  }
  return null;
}

async function fetchWikidataAliases(qid) {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    ids: qid,
    props: 'labels|aliases',
    languages: 'en|ja|zh-hant',
    format: 'json'
  });
  const res = await fetch(`${WIKIDATA_API}?${params.toString()}`, {
    headers: { 'User-Agent': 'lutagu-landmarks/1.0 (https://lutagu.app)' }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.entities?.[qid] || null;
}

function extractOsmAliases(tags) {
  const alias = [
    tags?.name,
    tags?.['name:en'],
    tags?.['name:ja'],
    tags?.['name:zh'],
    tags?.['name:zh-Hant'],
    tags?.['alt_name'],
    tags?.['short_name']
  ];
  return dedupe(alias);
}

function extractWikidataAliases(entity) {
  const labels = entity?.labels || {};
  const aliases = entity?.aliases || {};
  const list = [];
  for (const k of ['en','ja','zh-hant']) {
    if (labels[k]?.value) list.push(labels[k].value);
    const arr = aliases[k] || [];
    for (const a of arr) {
      if (a?.value) list.push(a.value);
    }
  }
  return dedupe(list);
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const offsetArg = args.find(a => a.startsWith('--offset='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
  const offset = offsetArg ? Number(offsetArg.split('=')[1]) : 0;

  const filePath = path.resolve(process.cwd(), 'src/data/places_tokyo.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const now = new Date().toISOString();

  const allTargets = data.filter(p => !p.aliases || p.aliases.length < 2);
  const targets = limit ? allTargets.slice(offset, offset + limit) : allTargets.slice(offset);
  console.log(`Targets: ${allTargets.length}, processing: ${targets.length} (offset ${offset})`);

  for (const item of targets) {
    const sourceId = item.source_id || '';
    let newAliases = [];

    if (sourceId.startsWith('osm:')) {
      const osmId = sourceId.replace('osm:', '');
      const node = await fetchOverpassNode(osmId);
      if (node?.tags) newAliases = extractOsmAliases(node.tags);
    } else if (sourceId.startsWith('wikidata:')) {
      const qid = sourceId.replace('wikidata:', '');
      const entity = await fetchWikidataAliases(qid);
      if (entity) newAliases = extractWikidataAliases(entity);
    }

    if (newAliases.length > 0) {
      item.aliases = dedupe([...(item.aliases || []), ...newAliases]);
      item.last_verified = now;
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    await sleep(200); // gentle pacing
  }

  console.log('Alias enrichment done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
