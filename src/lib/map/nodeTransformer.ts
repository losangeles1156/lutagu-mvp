import { NodeDatum } from '@/lib/api/nodes';
import { getLocaleString } from '@/lib/utils/localeUtils';

/**
 * Pure Geo-Naming Transformer
 * 
 * Enforces "Pro Max" naming standard:
 * 1. Tier 1 & 2 Nodes (Hubs): Strip "Station", "駅", "站", "Subway" suffixes.
 *    Result: "Shinjuku Station" -> "Shinjuku", "新宿駅" -> "新宿"
 * 2. Tier 3-5 Nodes: Keep full name for clarity.
 * 
 * @param nameObj - The multilingual name object from DB
 * @param displayTier - The calculated or DB-assigned display tier (1-5)
 * @param locale - Current UI locale
 * @returns Cleaned or original string
 */
export function transformToGeoName(nameObj: any, displayTier: number, locale: string = 'en'): string {
    const rawName = getLocaleString(nameObj, locale);

    // Only apply transformation to Super & Major Hubs (Tier 1 & 2)
    if (displayTier > 2) {
        return rawName;
    }

    let cleanName = rawName;

    // Suffix Removal Logic
    // Japanese
    cleanName = cleanName.replace(/駅$/, '');

    // Traditional Chinese
    cleanName = cleanName.replace(/站$/, '');

    // English
    // Remove " Station", " Subway Station", etc.
    // Order matters: Remove longer suffixes first
    cleanName = cleanName.replace(/\s+Subway\s+Station$/i, '');
    cleanName = cleanName.replace(/\s+Railway\s+Station$/i, '');
    cleanName = cleanName.replace(/\s+Airport\s+Terminal\s+\d+$/i, ''); // "Haneda Airport Terminal 1" -> "Haneda"
    cleanName = cleanName.replace(/\s+Airport$/i, '');
    cleanName = cleanName.replace(/\s+Station$/i, '');

    return cleanName.trim();
}

/**
 * Batch transformer for nodes
 */
export function applyGeoNaming(nodes: NodeDatum[], locale: string): NodeDatum[] {
    return nodes.map(node => {
        // Assume default tier 5 if missing
        const tier = (node as any).display_tier || 5;

        // We don't mutate the original DB name object, 
        // but we might attach a 'displayName' property if the type supported it.
        // However, NodeDatum structure is strict.
        // For ProMaxNode usage, we should probably output a new derived field.
        // Here we just return the node, but this helper is for the hook to use.
        return node;
    });
}
