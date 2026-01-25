import { L1NodeProfile } from './L1Profile';

export type NodeScope = 'station' | 'area' | 'route' | 'global';

export interface NodeContext {
    /**
     * The primary node ID that anchors the user's query.
     * e.g., "odpt.Station:TokyoMetro.Ginza.Ueno"
     * If null, the system operates in Global Mode (less precise).
     */
    primaryNodeId: string | null;

    /**
     * Secondary node ID, usually for route intents (Destination).
     */
    secondaryNodeId?: string | null;

    /**
     * The scope of knowledge required.
     * - 'station': Inside the station (Exits, Lockers, Platforms)
     * - 'area': Surrounding POIs, Weather, Bus stops
     * - 'route': Path between two nodes
     * - 'global': General queries (e.g., "How to buy Suica?")
     */
    scope: NodeScope;

    /**
     * The intent inferred from the query, affecting which tags are loaded.
     */
    intent: 'navigation' | 'amenity' | 'status' | 'fare' | 'timetable' | 'feature' | 'unknown';

    /**
     * [Legacy] Tags loaded for this context to filter Vector Search.
     */
    loadedTags: string[];

    /**
     * [New] 3-5-8 Structured L1 Profile
     */
    l1Profile?: L1NodeProfile | null;
}
