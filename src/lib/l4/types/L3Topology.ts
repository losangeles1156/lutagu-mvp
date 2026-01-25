/**
 * L3 Tagged Topology Definitions
 * 
 * Implements the "Node x Tag x Level x Weight" architecture for L3 (Station Interior).
 * Unlike standard graphs, edges here are heavily tagged with "Resistance Factors".
 */

export type L3NodeType = 'platform' | 'ticket_gate' | 'exit' | 'poi' | 'restroom' | 'elevator_hall';

export interface L3Node {
    id: string; // e.g., "Ueno.Exit.ParkGate"
    stationId: string; // "odpt.Station:..."
    type: L3NodeType;
    level: number; // Floor level (e.g., 1, -1, 2)
    tags: string[]; // e.g., ["meeting_point", "has_tactile_paving"]
    metadata?: Record<string, any>;
}

export type L3EdgeType = 'walk' | 'stairs' | 'escalator' | 'elevator' | 'slope';

export interface L3Edge {
    fromNodeId: string;
    toNodeId: string;
    type: L3EdgeType;
    distanceMeters: number;
    durationSeconds: number; // Base walking speed

    // The Core "Resistance" Tags
    tags: string[]; // ["steep", "crowded_morning", "narrow"]

    // Dynamic Weights (Base values)
    resistanceScore: number; // 0-100, higher is harder (pain index base)

    // Accessibility Metadata
    widthMeters?: number;
    isWheelchairAccessible: boolean;
    isStrollerAccessible: boolean;
}

export interface L3StationGraph {
    stationId: string;
    nodes: Map<string, L3Node>;
    edges: L3Edge[];
}
