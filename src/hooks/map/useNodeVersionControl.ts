import { useMemo } from 'react';
import type { NodeDatum } from '@/lib/api/nodes';
import { dedupeNodesById } from '@/lib/utils/map/deduplication';

interface NodeVersionState {
    nodes: NodeDatum[];
    minVersion: number;
    maxVersion: number;
}

/**
 * useNodeVersionControl
 * 
 * Manages node deduplication and version tracking.
 * - Deduplicates nodes by ID, keeping the latest version
 * - Calculates min/max versions for cache validation
 * - Memoizes results to prevent unnecessary re-computations
 */
export function useNodeVersionControl(nodes: NodeDatum[]): NodeVersionState {
    return useMemo(() => {
        // [OPTIMIZATION] Deduplicate nodes first
        const deduplicated = dedupeNodesById(nodes);

        if (deduplicated.length === 0) {
            return {
                nodes: [],
                minVersion: 0,
                maxVersion: 0
            };
        }

        // [OPTIMIZATION] Calculate version range in a single pass if possible,
        // or using Math.min/max (cleaner readability)
        const versions = deduplicated.map(n => n.version ?? 0);
        const minVersion = Math.min(...versions);
        const maxVersion = Math.max(...versions);

        return {
            nodes: deduplicated,
            minVersion,
            maxVersion
        };
    }, [nodes]);
}
