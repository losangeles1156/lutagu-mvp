import fs from 'node:fs';
import path from 'node:path';

export type RawLandmark = {
  id: string;
  name: { en?: string; ja?: string; 'zh-TW'?: string };
  aliases: string[];
  coordinates: { lat: number; lng: number };
  category: string;
  source: 'osm' | 'wikidata' | 'manual';
  source_id: string;
  last_verified: string;
};

const CATEGORY_MAP: Record<string, string> = {
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

function normalizeId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list.filter(Boolean)));
}

function normalizeName(entry: RawLandmark) {
  const en = entry.name.en || entry.name.ja || entry.name['zh-TW'] || 'Unknown';
  const ja = entry.name.ja || entry.name.en || entry.name['zh-TW'] || en;
  const zh = entry.name['zh-TW'] || entry.name.ja || entry.name.en || en;
  return { en, ja, 'zh-TW': zh };
}

function normalizeCategory(category: string): string {
  const key = category.toLowerCase();
  return CATEGORY_MAP[key] || 'landmark';
}

export function normalizeLandmarks(raw: RawLandmark[]) {
  return raw.map((item) => ({
    id: normalizeId(item.id),
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
