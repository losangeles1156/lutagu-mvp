
import { getTrains } from '../odpt/service';

// Internal definition until we update types.ts
interface OdptTrain {
    '@id': string;
    'odpt:railway': string;
    'odpt:trainNumber': string;
    'geo:lat'?: number;
    'geo:long'?: number;
    'odpt:delay'?: number; // often in seconds
    'odpt:toStation'?: string;
    'odpt:fromStation'?: string;
    'odpt:railDirection'?: string;
}

export interface TrainTelemetry {
    id: string; // e.g. odpt.Train:JR-East.Yamanote.1234G
    lat: number;
    lon: number;
    delay: number; // Normalized to seconds
    section: {
        from?: string;
        to?: string;
    };
    railway: string;
    direction?: string;
}

export class TrainLocator {
    /**
     * Fetch live train locations, optionally filtered by railway.
     * @param railwayId (Optional) "odpt.Railway:JR-East.Yamanote"
     */
    static async getTrainLocations(railwayId?: string): Promise<TrainTelemetry[]> {
        try {
            // We fetch for ALL operators if railwayId is not specific enough to know the operator.
            // But getTrains takes "operator".
            // Optimization: If railwayId is provided, we could guess the operator.
            // For now, let's fetch all (or default to major ones) if no filter, 
            // but usually we want specific lines.

            // If railwayId is provided, try to extract operator
            let operator: string | undefined = undefined;
            if (railwayId) {
                if (railwayId.includes('JR-East')) operator = 'Toei'; // Wait, JR-East is JR-East.
                // Correction:
                if (railwayId.includes('JR-East')) operator = 'JR-East';
                else if (railwayId.includes('TokyoMetro')) operator = 'TokyoMetro';
                else if (railwayId.includes('Toei')) operator = 'Toei';
                // ... others
            }

            const rawTrains = (await getTrains(operator)) as OdptTrain[];

            const telemetry: TrainTelemetry[] = rawTrains
                .filter(t => {
                    if (railwayId && t['odpt:railway'] !== railwayId) return false;
                    // Must have location
                    return typeof t['geo:lat'] === 'number' && typeof t['geo:long'] === 'number';
                })
                .map(t => ({
                    id: t['@id'],
                    lat: t['geo:lat']!,
                    lon: t['geo:long']!,
                    delay: t['odpt:delay'] || 0,
                    section: {
                        from: t['odpt:fromStation'],
                        to: t['odpt:toStation']
                    },
                    railway: t['odpt:railway'],
                    direction: t['odpt:railDirection']
                }));

            return telemetry;
        } catch (error) {
            console.error('[TrainLocator] Failed to fetch locations:', error);
            return [];
        }
    }

    /**
     * Get aggregate stats for a line (e.g. for Context Injection)
     */
    static async getLineDisruptionStats(railwayId: string): Promise<{ avgDelay: number, trainCount: number }> {
        const trains = await this.getTrainLocations(railwayId);
        if (trains.length === 0) return { avgDelay: 0, trainCount: 0 };

        const totalDelay = trains.reduce((sum, t) => sum + t.delay, 0);
        return {
            avgDelay: totalDelay / trains.length, // Seconds
            trainCount: trains.length
        };
    }
}
