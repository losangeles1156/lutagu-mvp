/**
 * L1 GEM-Aligned Node Profile (3-5-8 Architecture)
 * 
 * Based on Meta GEM Philosophy:
 * - Layer 1: Core Retrieval (3-4 chars) -> Tri-gram Sweet Spot
 * - Layer 2: Intent Alignment (5-8 chars) -> Semantic Interaction
 * - Layer 3: Visual Vibe -> Multimodal Alignment
 */

export interface GemCoreTags {
    // 3-4 Chars Sweet Spot
    // e.g. "HUB", "JR", "UENO", "PARK"
    // Identity & Type
    identity: string[];
}

export interface GemIntentTags {
    // 5-8 Chars Semantic Actions
    // e.g. "LUGGAGE", "TRANSFER", "RAIN_OK", "FAMILY"
    // Capabilities & Pain Points
    capabilities: string[];
}

export interface GemVibeTags {
    // Visual / Descriptive Tokens
    // e.g. "RED_BRICK", "WIDE_GATE", "CROWDED", "MODERN"
    // For visual/multimodal alignment
    visuals: string[];
}

export interface L1NodeProfile {
    nodeId: string; // odpt:Station:...

    // 3-5-8 Architecture
    core: GemCoreTags;       // L1 Retrieval
    intent: GemIntentTags;   // L2 Alignment
    vibe: GemVibeTags;       // L3 Multimodal

    // Contextual Weights (0.0 - 1.0) - Kept for calculation
    weights: {
        transfer_ease: number;
        tourism_value: number;
        crowd_level: number;
        [key: string]: number;
    };

    // Backward compatibility for raw display if needed
    rawTags?: string[];

    // Station Personality (DNA) from L4 Expert Knowledge
    dna?: string;
}
