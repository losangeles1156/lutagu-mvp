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
        // Normalize
        const id = nodeId.replace('odpt:Station:', 'odpt.Station:');

        // MVP: Mock Ueno Hub Persona
        if (id.includes('Ueno')) {
            return {
                nodeId: id,
                core: {
                    // Tri-gram Sweet Spot (3-4 chars)
                    identity: ["HUB", "JR", "GINZ", "PARK"]
                },
                intent: {
                    // Semantic Interaction (5-8 chars)
                    capabilities: ["LUGGAGE", "TOURISM", "EXPRESS", "MUSEUM"]
                },
                vibe: {
                    // Visual Alignment
                    visuals: ["WIDE_CONCOURSE", "HIGH_CEILING", "CROWDED_GATES", "PARK_EXIT_GREEN"]
                },
                weights: {
                    transfer_ease: 0.9,
                    tourism_value: 0.95,
                    crowd_level: 0.85
                }
            };
        }

        // MVP: Mock Shinjuku Hub Persona
        if (id.includes('Shinjuku')) {
            return {
                nodeId: id,
                core: {
                    identity: ["HUB", "JR", "BUSY", "MAZE"]
                },
                intent: {
                    capabilities: ["COMMUTE", "SHOPPING", "NIGHT", "DINING"]
                },
                vibe: {
                    visuals: ["NEON_LIGHTS", "SKYSCRAPER", "UNDERGROUND_MAZE"]
                },
                weights: {
                    transfer_ease: 0.7,
                    tourism_value: 0.7,
                    crowd_level: 1.0
                }
            };
        }

        return null; // Remote/Unknown node
    }
}
