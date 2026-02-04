const fs = require('node:fs');
const path = require('node:path');

function uniqueById(list) {
  const map = new Map();
  for (const item of list) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'tmp/landmarks_with_stations.json';
  const targetPath = args[1] || 'src/data/places_tokyo.json';

  const incoming = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8'));
  const existing = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), targetPath), 'utf8'));

  const merged = uniqueById([...existing, ...incoming]);

  fs.writeFileSync(path.resolve(process.cwd(), targetPath), JSON.stringify(merged, null, 2));
  console.log(`Merged ${incoming.length} into ${targetPath}. Total: ${merged.length}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
