const fs = require('node:fs');
const path = require('node:path');

function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = `${it.source}:${it.source_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

function mapOsm(osmJson) {
  const elements = osmJson?.elements || [];
  return elements.map((el) => {
    const tags = el.tags || {};
    const nameEn = tags['name:en'];
    const nameJa = tags['name:ja'];
    const nameZh = tags['name:zh'] || tags['name:zh-Hant'];
    const name = tags.name || nameEn || nameJa || nameZh || `osm_${el.id}`;
    const category = tags.tourism || tags.amenity || tags.leisure || tags.historic || tags.man_made || tags.shop || tags.place || 'landmark';

    const aliases = [tags.name, nameEn, nameJa, nameZh].filter(Boolean);

    return {
      id: String(name),
      name: {
        en: nameEn,
        ja: nameJa,
        'zh-TW': nameZh
      },
      aliases,
      coordinates: { lat: el.lat, lng: el.lon },
      category,
      source: 'osm',
      source_id: `osm:${el.id}`,
      last_verified: new Date().toISOString()
    };
  });
}

function mapWikidata(wdJson) {
  const bindings = wdJson?.results?.bindings || [];
  return bindings.map((b) => {
    const uri = b.item?.value || '';
    const qid = uri.split('/').pop() || uri;
    const name = b.itemLabel?.value || `wd_${qid}`;
    const alt = b.itemAltLabel?.value || '';
    const altList = alt ? alt.split(',').map(s => s.trim()) : [];

    return {
      id: String(name),
      name: {
        en: b.itemLabel?.value,
        ja: b.itemLabel?.value,
        'zh-TW': b.itemLabel?.value
      },
      aliases: [name, ...altList],
      coordinates: { lat: Number(b.lat?.value), lng: Number(b.lon?.value) },
      category: b.typeLabel?.value || 'landmark',
      source: 'wikidata',
      source_id: `wikidata:${qid}`,
      last_verified: new Date().toISOString()
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  const osmPath = args[0] || 'tmp/osm_landmarks_tokyo.json';
  const wdPath = args[1] || 'tmp/wikidata_landmarks_tokyo.json';
  const outPath = args[2] || 'tmp/landmarks_raw.json';

  const osm = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), osmPath), 'utf8'));
  const wd = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), wdPath), 'utf8'));

  const merged = dedupe([...mapOsm(osm), ...mapWikidata(wd)]);
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(merged, null, 2));
  console.log(`Merged raw landmarks: ${merged.length} -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
