const fs = require('node:fs');
const path = require('node:path');

const STATIONS_PATH = path.resolve(process.cwd(), 'scripts/data/stations_by_ward.json');

function toRad(n) {
  return (n * Math.PI) / 180;
}

function haversine(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

function defaultComplexity() {
  return { turnCount: 3, signageClarity: 2, exitCount: 8, underConstruction: false };
}

function loadStations() {
  return JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf8'));
}

function assignStations(landmark, stations) {
  const distances = stations.map((s) => ({
    stationName: s.name,
    stationId: s.id,
    distanceMeters: Math.round(haversine(landmark.coordinates, { lat: s.lat, lng: s.lng }))
  }));
  distances.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return distances.slice(0, 3).map((s) => ({
    stationName: s.stationName,
    stationId: s.stationId,
    distanceMeters: s.distanceMeters,
    walkMinutes: Math.max(1, Math.round(s.distanceMeters / 80)),
    complexity: defaultComplexity()
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'tmp/landmarks_normalized.json';
  const outputPath = args[1] || 'tmp/landmarks_with_stations.json';

  const landmarks = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8'));
  const stations = loadStations();

  const out = landmarks.map((l) => ({
    ...l,
    candidateStations: assignStations(l, stations)
  }));

  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outputPath)), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), outputPath), JSON.stringify(out, null, 2));
  console.log(`Assigned stations for ${out.length} landmarks -> ${outputPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
