const fs = require('node:fs');
const path = require('node:path');

const STATIONS_PATH = path.resolve(process.cwd(), 'scripts/data/stations_by_ward.json');

function toRad(n) { return (n * Math.PI) / 180; }
function haversine(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}
function defaultComplexity() { return { turnCount: 3, signageClarity: 2, exitCount: 8, underConstruction: false }; }

function loadStations() {
  return JSON.parse(fs.readFileSync(STATIONS_PATH, 'utf8'));
}

function assignStations(landmark, stations) {
  const distances = stations.map((s) => ({
    stationName: s.name,
    stationId: s.id,
    distanceMeters: Math.round(haversine(landmark.coordinates, { lat: s.lat, lng: s.lng ?? s.lon }))
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

function isUnknown(value) {
  return !value || String(value).toLowerCase() === 'unknown';
}

function pickAlias(aliases, pattern) {
  return aliases.find(a => pattern.test(a));
}

async function main() {
  const filePath = path.resolve(process.cwd(), 'src/data/places_tokyo.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stations = loadStations();

  let updatedStations = 0;
  let updatedNames = 0;
  let updatedAliases = 0;

  for (const p of data) {
    const hasBadStations = !p.candidateStations || p.candidateStations.length < 3 || p.candidateStations.some(s => !Number.isFinite(s.distanceMeters) || !Number.isFinite(s.walkMinutes));
    if (hasBadStations && p.coordinates?.lat && p.coordinates?.lng) {
      p.candidateStations = assignStations(p, stations);
      updatedStations++;
    }

    const aliases = Array.isArray(p.aliases) ? p.aliases : [];
    if (!p.name) p.name = { en: '', ja: '', 'zh-TW': '' };

    if (isUnknown(p.name.en) || isUnknown(p.name.ja) || isUnknown(p.name['zh-TW'])) {
      const ja = pickAlias(aliases, /[ぁ-んァ-ン]/);
      const zh = pickAlias(aliases, /[一-龯]/);
      const en = pickAlias(aliases, /[A-Za-z]/);

      if (isUnknown(p.name.en) && en) p.name.en = en;
      if (isUnknown(p.name.ja) && ja) p.name.ja = ja;
      if (isUnknown(p.name['zh-TW']) && (zh || ja || en)) p.name['zh-TW'] = zh || ja || en;
      if (isUnknown(p.name.en) && (ja || zh)) p.name.en = ja || zh;
      if (isUnknown(p.name.ja) && (zh || en)) p.name.ja = zh || en;
      updatedNames++;
    }

    const aliasSet = new Set(aliases);
    for (const v of [p.name?.en, p.name?.ja, p.name?.['zh-TW']]) {
      if (v) aliasSet.add(v);
    }
    const finalAliases = Array.from(aliasSet).filter(Boolean);
    if (finalAliases.length !== aliases.length) {
      p.aliases = finalAliases;
      updatedAliases++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ updatedStations, updatedNames, updatedAliases }, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
