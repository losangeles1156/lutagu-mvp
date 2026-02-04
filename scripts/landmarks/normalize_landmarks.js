const fs = require('node:fs');
const path = require('node:path');

const CATEGORY_MAP = {
  temple: 'landmark',
  shrine: 'landmark',
  museum: 'landmark',
  park: 'landmark',
  garden: 'landmark',
  viewpoint: 'landmark',
  market: 'landmark',
  district: 'district',
  tower: 'landmark',
  church: 'landmark'
};

function normalizeId(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function dedupe(list) {
  return Array.from(new Set((list || []).filter(Boolean)));
}

function normalizeName(entry) {
  const en = entry.name?.en || entry.name?.ja || entry.name?.['zh-TW'] || 'Unknown';
  const ja = entry.name?.ja || entry.name?.en || entry.name?.['zh-TW'] || en;
  const zh = entry.name?.['zh-TW'] || entry.name?.ja || entry.name?.en || en;
  return { en, ja, 'zh-TW': zh };
}

function normalizeCategory(category) {
  const key = String(category || '').toLowerCase();
  return CATEGORY_MAP[key] || 'landmark';
}

function normalizeLandmarks(raw) {
  return raw.map((item) => ({
    id: (() => {
      const base = normalizeId(item.id);
      if (base) return base;
      const fallback = normalizeId(item.source_id || item.name?.en || item.name?.ja || item.name?.['zh-TW']);
      return fallback || '';
    })(),
    category: normalizeCategory(item.category),
    name: normalizeName(item),
    aliases: dedupe(item.aliases || []),
    coordinates: item.coordinates,
    candidateStations: [],
    source: item.source,
    source_id: item.source_id,
    last_verified: item.last_verified
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'tmp/landmarks_raw.json';
  const outputPath = args[1] || 'tmp/landmarks_normalized.json';

  const raw = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8'));
  const normalized = normalizeLandmarks(raw);

  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), JSON.stringify(normalized, null, 2));
  console.log(`Normalized ${normalized.length} landmarks to ${outputPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
