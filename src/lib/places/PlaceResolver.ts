import places from '@/data/places_tokyo.json';
import { DataNormalizer } from '@/lib/l4/utils/Normalization';
import { searchVectorDB } from '@/lib/api/vectorService';

export type PlaceCandidateStation = {
  stationId?: string;
  stationName?: string;
  walkMinutes: number;
  distanceMeters: number;
  complexity?: {
    turnCount: number;
    signageClarity: 1 | 2 | 3;
    exitCount: number;
    underConstruction: boolean;
  };
};

export type PlaceMatch = {
  placeId: string;
  category: 'landmark' | 'airport' | 'poi' | string;
  name: { [key: string]: string };
  coordinates?: { lat: number; lng: number };
  candidateStations: Array<PlaceCandidateStation & { stationId?: string; stationName?: string }>;
};

function normalizeText(input: string): string {
  return String(input || '').trim().toLowerCase();
}

function resolveCandidates(rawCandidates: PlaceCandidateStation[]): PlaceCandidateStation[] {
  return rawCandidates.map((c) => {
    if (c.stationId) return c;
    if (c.stationName) {
      const resolved = DataNormalizer.lookupStationId(c.stationName);
      if (resolved) return { ...c, stationId: resolved };
    }
    return c;
  });
}

export async function resolvePlace(placeQuery: string): Promise<PlaceMatch | null> {
  const query = normalizeText(placeQuery);
  if (!query) return null;

  const list = (places as any[]) || [];
  const direct = list.find((p) => {
    const nameValues = Object.values(p?.name || {}).map(normalizeText);
    const aliases = (p?.aliases || []).map(normalizeText);
    return nameValues.includes(query) || aliases.includes(query);
  });

  if (direct) {
    return {
      placeId: direct.id,
      category: direct.category || 'poi',
      name: direct.name || { default: placeQuery },
      coordinates: direct.coordinates,
      candidateStations: resolveCandidates(direct.candidateStations || []),
    };
  }

  // Vector fallback: use POI search to approximate place
  try {
    const vectorResults = await searchVectorDB(placeQuery, 3);
    const best = vectorResults[0];
    if (best?.payload?.station_id) {
      return {
        placeId: `vector:${best.id}`,
        category: 'poi',
        name: { default: best.payload.name || best.payload.content?.slice(0, 30) || placeQuery },
        coordinates: best.payload.coordinates,
        candidateStations: resolveCandidates([
          {
            stationId: best.payload.station_id,
            walkMinutes: 6,
            distanceMeters: 450,
            complexity: { turnCount: 2, signageClarity: 2, exitCount: 6, underConstruction: false }
          }
        ])
      };
    }
  } catch (error) {
    console.warn('[PlaceResolver] Vector fallback failed:', error);
  }

  return null;
}
