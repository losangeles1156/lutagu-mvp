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

    /**
     * Enrich the static profile with real-time L2 tags.
     */
    static async enrichProfile(profile: L1NodeProfile): Promise<L1NodeProfile> {
        const enriched = JSON.parse(JSON.stringify(profile)) as L1NodeProfile;

        // resolve Line ID from Node Name using Generic Parser
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

            // Logic: Crowd based on train density
            if (stats.trainCount > 15) {
                enriched.intent.capabilities.push("CROWD_HI");
                enriched.weights.crowd_level = Math.min(enriched.weights.crowd_level * 1.3, 1.0);
            }
        }

        return enriched;
    }

    /**
     * Parse Line ID from ODPT Station ID.
     * Standard Format: odpt.Station:Operator.Line.StationName
     * @param nodeId e.g. "odpt.Station:JR-East.Yamanote.Tokyo"
     * @returns "odpt.Railway:JR-East.Yamanote"
     */
    private static detectLineId(nodeId: string): string | undefined {
        // 1. Check strict prefix
        const prefix = 'odpt.Station:';
        if (!nodeId.startsWith(prefix)) return undefined;

        // 2. Extract Operator.Line.StationName
        // e.g. "JR-East.Yamanote.Tokyo"
        const suffix = nodeId.substring(prefix.length);
        const parts = suffix.split('.');

        if (parts.length >= 2) {
            // Operator = parts[0] (e.g. JR-East)
            // Line = parts[1] (e.g. Yamanote)
            // Railway ID usually follows odpt.Railway:Operator.Line
            const operator = parts[0];
            const line = parts[1];

            // Construct Railway ID generically
            return `odpt.Railway:${operator}.${line}`;
        }

        return undefined;
    }
}
