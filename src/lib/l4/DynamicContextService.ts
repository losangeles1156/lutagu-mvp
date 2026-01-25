/**
 * Dynamic Context Service (L2 Intent Alignment)
 * 
 * Responsible for injecting Real-Time L2 Tags into the static L1 Profile.
 * Aligns with GEM "Intent Layer" (5-8 chars) philosophy.
 * 
 * Example:
 * Static: "TRANSFER"
 * L2 Event: "Delay > 15min"
 * Dynamic Tag: "DELAY_15" -> "URGENT" -> "ALT_ROUTE"
 */

import { L1NodeProfile } from './types/L1Profile';
import { TrainLocator } from '../services/TrainLocator';

export class DynamicContextService {

    // Map Node (Station Name) to Line ID for MVP
    // In production, this relations is in the DB (stations_static table)
    private static readonly STATION_LINE_MAP: Record<string, string> = {
        'Ueno': 'odpt.Railway:JR-East.Yamanote',
        'Shinjuku': 'odpt.Railway:JR-East.Yamanote',
        'Tokyo': 'odpt.Railway:JR-East.Yamanote',
        'Shibuya': 'odpt.Railway:JR-East.Yamanote',
        'Ikebukuro': 'odpt.Railway:JR-East.Yamanote'
    };

    /**
     * Enrich the static profile with real-time L2 tags.
     */
    static async enrichProfile(profile: L1NodeProfile): Promise<L1NodeProfile> {
        const enriched = JSON.parse(JSON.stringify(profile)) as L1NodeProfile;

        // resolve Line ID from Node Name
        const lineId = this.detectLineId(profile.nodeId);

        if (lineId) {
            // Fetch Real-time Stats
            const stats = await TrainLocator.getLineDisruptionStats(lineId);

            // Logic: Inject Tags based on Thresholds
            if (stats.avgDelay > 15 * 60) { // 15 mins
                enriched.intent.capabilities.push("DELAY_15");
                enriched.weights.transfer_ease *= 0.5; // Serious disruption
                enriched.weights.crowd_level = Math.min(enriched.weights.crowd_level * 1.5, 1.0);
            } else if (stats.avgDelay > 5 * 60) { // 5 mins
                enriched.intent.capabilities.push("DELAY_05");
                enriched.weights.transfer_ease *= 0.8;
                enriched.weights.crowd_level = Math.min(enriched.weights.crowd_level * 1.2, 1.0);
            }

            // Logic: Crowd based on train density (mock heuristic)
            // If more than 15 trains active on line, it's peak.
            if (stats.trainCount > 15) {
                enriched.intent.capabilities.push("CROWD_HI");
                // Crowd penalty
                enriched.weights.crowd_level = Math.min(enriched.weights.crowd_level * 1.3, 1.0);
            }
        }

        return enriched;
    }

    private static detectLineId(nodeId: string): string | undefined {
        // Simple fuzzy match for MVP
        const key = Object.keys(this.STATION_LINE_MAP).find(k => nodeId.includes(k));
        return key ? this.STATION_LINE_MAP[key] : undefined;
    }
}
