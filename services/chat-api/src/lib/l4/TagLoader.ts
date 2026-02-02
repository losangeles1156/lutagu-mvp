import { StationProfileGenerator } from './data/StationProfileGenerator';
/**
 * TagLoader - L1 Profile Provider (GEM Optimized)
 * 
 * Responsible for loading the 3-5-8 Profile for a given node.
 * Strict adherence to Character Length Philosophy:
 * - Core: 3-4 chars
 * - Intent: 5-8 chars
 * - Vibe: Visual descriptions
 */

import { L1NodeProfile } from './types/L1Profile';

export class TagLoader {

    /**
     * Load L1 Profile for a node.
     * Implements Hub-Spoke inheritance logic (simplified).
     */
    static async loadProfile(nodeId: string): Promise<L1NodeProfile | null> {
        // Use deterministic generator for ALL stations
        // This ensures every valid topology node has a 3-5-8 profile
        return StationProfileGenerator.generate(nodeId);
    }
}
