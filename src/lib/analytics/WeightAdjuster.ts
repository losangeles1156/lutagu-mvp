/**
 * WeightAdjuster Service (Reinforcement Learning Lite)
 * 
 * Responsible for dynamically tuning L1 Profile weights based on user interaction signals.
 * Implements a simple feedback loop:
 * - Positive Signal (e.g. Route Selected) -> Boost Weights
 * - Negative Signal (e.g. Bounce/Reject) -> Dampen Weights
 * 
 * For MVP, this operates on in-memory or transient profiles.
 * In production, this would emit events to an async worker to update the DB.
 */

import { L1NodeProfile } from '../l4/types/L1Profile';

export type SignalType = 'positive' | 'negative';

export class WeightAdjuster {

    // Configurable learning rates
    private static readonly LEARNING_RATE_BOOST = 1.1; // +10%
    private static readonly LEARNING_RATE_DAMPEN = 0.9; // -10%
    private static readonly MAX_WEIGHT = 2.0;
    private static readonly MIN_WEIGHT = 0.1;

    /**
     * Adjust weights based on user interaction signal.
     * 
     * @param profile The profile used for the decision
     * @param signal The outcome of the user interaction
     * @param relevantContextKeys Optional keys to focus learning on (e.g. 'luggage', 'transfer')
     * @returns A new profile with adjusted weights
     */
    static adjustWeights(
        profile: L1NodeProfile,
        signal: SignalType,
        relevantContextKeys?: string[]
    ): L1NodeProfile {
        const newProfile = JSON.parse(JSON.stringify(profile)) as L1NodeProfile;
        const multiplier = signal === 'positive'
            ? this.LEARNING_RATE_BOOST
            : this.LEARNING_RATE_DAMPEN;

        // If specific context keys are provided, we try to map them to specific weights.
        // For MVP, if no keys are provided (general signal), we tune the general heuristic weights.

        // General Heuristic Weights commonly used in decisions
        const heuristicWeights = [
            'transfer_ease',
            'tourism_value',
            'crowd_level',
            'weather_resilience',
            'accessibility' // Hypothetical weight if it exists
        ];

        // Specific Mapping Logic (Simplistic RL)
        // If context was "Luggage", we care about transfer_ease.
        // If context was "Weekend", we care about crowd_level.

        const weightsToTune = new Set<string>();

        if (relevantContextKeys && relevantContextKeys.length > 0) {
            if (relevantContextKeys.includes('luggage') || relevantContextKeys.includes('stroller')) {
                weightsToTune.add('transfer_ease');
            }
            if (relevantContextKeys.includes('holiday') || relevantContextKeys.includes('weekend')) {
                weightsToTune.add('crowd_level');
            }
        }

        // If no specific context, or mapping failed, tune general weights slightly?
        // Actually, blindly tuning everything is dangerous. 
        // Let's default to 'transfer_ease' as it's the most critical UX factor if nothing else is known.
        if (weightsToTune.size === 0) {
            weightsToTune.add('transfer_ease');
        }

        // Apply adjustments
        for (const weightKey of Array.from(weightsToTune)) {
            if (newProfile.weights && typeof newProfile.weights[weightKey] === 'number') {
                let current = newProfile.weights[weightKey];

                // For 'crowd_level', 'negative' signal (user rejected crowded route) means we should INCREASE penalty?
                // Or if it's a "goodness" score?
                // In L1Profile, weights are usually "Goodness" multipliers (higher = better) or "Cost" multipliers?
                // Let's assume standard normalization: usually Weights in L1 are "Multipliers for Suitability".
                // So Higher is PRO, Lower is CON.
                // UNLESS it's explicitly cost. 
                // Let's check L1Profile definition... assumed Suitability.

                // Exception: 'crowd_level' might be a penalty multiplier?
                // If profiles usually have "transfer_ease: 0.8" (High ease), boosting it makes it 0.88 (Easier).

                let actualMultiplier = multiplier;

                // Reverse logic for penalty-like names if they exist?
                // Assuming all weights are "Score Contributions" for now.

                let newValue = current * actualMultiplier;

                // Clamp
                newValue = Math.max(this.MIN_WEIGHT, Math.min(this.MAX_WEIGHT, newValue));

                newProfile.weights[weightKey] = Number(newValue.toFixed(3));

                console.log(`[WeightAdjuster] Adjusted ${weightKey}: ${current} -> ${newProfile.weights[weightKey]} (${signal})`);
            }
        }

        return newProfile;
    }
}
