/**
 * Transfer Pain Index (TPI) Calculator with Tag Awareness
 * 
 * CORE L3 REASONING ENGINE
 * 
 * Calculates the "Pain Cost" of traversing an L3 edge.
 * It reads the "Resistance Tags" defined in Phase 3.1 and applies weights based on user profile.
 * 
 * Formula:
 * Cost = (Duration * TimeWeight) + (ResistanceScore * UserMultiplier)
 */

import { L3Edge } from './types/L3Topology';
import { RequestContext } from './HybridEngine'; // Assuming context is available here

export class TPICalculator {

    /**
     * Calculate the cost of an edge for a specific user context.
     */
    static calculateEdgeCost(edge: L3Edge, profile?: any): number {
        const baseCost = edge.resistanceScore;

        let multiplier = 1.0;

        // 1. Accessibility Multipliers from GEM Profile
        const caps = profile?.intent?.capabilities || [];
        const needsWheelchair = caps.includes('WHEELCHAIR');
        const hasStroller = caps.includes('STROLLER');
        const hasLuggage = caps.includes('LUGGAGE');

        if (needsWheelchair) {
            if (!edge.isWheelchairAccessible) return Infinity; // Hard block
            if (edge.tags.includes('elevator')) multiplier = 0.1; // Prefer elevators heavily
        }

        if (hasStroller) {
            if (!edge.isStrollerAccessible) return 1000; // Soft block (dangerous)
            if (edge.tags.includes('escalator_up_only')) return 500; // Hard with stroller
        }

        if (hasLuggage) {
            if (edge.tags.includes('stairs')) multiplier = 5.0; // Avoid stairs
            if (edge.tags.includes('escalator')) multiplier = 0.5; // Prefer escalator
            if (edge.tags.includes('elevator')) multiplier = 0.2; // Best
        }

        // 2. Crowd Multiplier (Dynamic)
        // If edge has 'crowded' tag -> increase cost
        if (edge.tags.includes('crowded') || edge.tags.includes('CROWDED_PEAK')) {
            multiplier *= 1.5;
        }

        // 3. Visual / Psychological Resistance (GEM Multimodal)
        // "NARROW" -> Claustrophobic / Hard to pass -> Increase cost
        if (edge.tags.includes('NARROW')) multiplier *= 1.2;

        // "CLEAR_SIGNAGE" -> Less mental load -> Decrease cost
        if (edge.tags.includes('CLEAR_SIGNAGE')) multiplier *= 0.9;

        // "MODERN_FLOOR" -> Smooth rolling -> Good for luggage
        if (edge.tags.includes('MODERN_FLOOR') && hasLuggage) multiplier *= 0.8;

        return (edge.durationSeconds * 0.5) + (baseCost * multiplier);
    }
}
