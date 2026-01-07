// Allowed Operators Configuration
// Defines which railway operators and specific stations to display on the map

/**
 * Operators whose ALL stations should be shown
 */
export const ALLOWED_OPERATORS = [
    'TokyoMetro',
    'Toei',
    'JR-East',
    'Keikyu',
    'TokyoMonorail',
    'Airport', // Custom operator for Airport Hubs
] as const;

/**
 * Operators with only specific stations allowed (whitelist)
 * Key: Operator prefix in node ID
 * Value: Array of allowed station name patterns
 */
export const STATION_WHITELIST: Record<string, string[]> = {
    'Tobu': ['Asakusa'],
    'Keisei': ['Ueno', 'Nippori', 'Oshiage', 'Narita', 'Haneda'], // Whitelist airport stations
};

/**
 * Check if a node should be displayed based on operator filtering rules
 * @param nodeId - The node ID (e.g., "odpt:Station:TokyoMetro.Ginza.Ueno")
 * @returns true if the node should be shown
 */
export function isNodeAllowed(nodeId: string): boolean {
    if (!nodeId) return false;

    // Extract operator from node ID pattern: "odpt:Station:{Operator}.{Line}.{Station}"
    const parts = nodeId.split(':');
    if (parts.length < 3) return true; // Unknown format, allow by default

    const stationPart = parts[2]; // e.g., "TokyoMetro.Ginza.Ueno"
    const operatorMatch = stationPart.split('.')[0]; // e.g., "TokyoMetro"

    // Check if operator is in the fully allowed list
    if (ALLOWED_OPERATORS.some(op => stationPart.startsWith(op))) {
        return true;
    }

    // Check if operator is in whitelist with specific stations
    for (const [operator, allowedStations] of Object.entries(STATION_WHITELIST)) {
        if (stationPart.startsWith(operator)) {
            // Check if station name matches any in whitelist
            return allowedStations.some(station =>
                stationPart.toLowerCase().includes(station.toLowerCase())
            );
        }
    }

    // Default: hide nodes from unknown operators
    return false;
}
