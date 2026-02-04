const fs = require('node:fs');
const path = require('node:path');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), p), 'utf8'));
}

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'tmp/landmarks_with_stations.json';
  const targetPath = args[1] || 'src/data/places_tokyo.json';
  const outPath = args[2] || 'tmp/landmarks_batch.json';
  const limit = Number(args[3] || 30);

  const incoming = loadJson(inputPath);
  const existing = new Set(loadJson(targetPath).map(p => p.id));

  const batch = [];
  for (const item of incoming) {
    if (batch.length >= limit) break;
    if (!item.id) continue;
    if (existing.has(item.id)) continue;
    if (!item.coordinates?.lat || !item.coordinates?.lng) continue;
    if (!item.aliases || item.aliases.length === 0) continue;
    if (!item.candidateStations || item.candidateStations.length < 3) continue;
    batch.push(item);
  }

  fs.writeFileSync(path.resolve(process.cwd(), outPath), JSON.stringify(batch, null, 2));
  console.log(`Selected ${batch.length} items -> ${outPath}`);
}

main();
