interface MinimalNode {
    id: string;
    version?: number;
    [key: string]: any;
}

export function dedupeNodesById<T extends MinimalNode>(nodes: T[]): T[] {
    const seen = new Set<string>();
    const result: T[] = [];

    // Sort by version (descending) if available, so newer versions take precedence
    // If no version, order is preserved as per input (but often input isn't sorted)
    // To implement "newest wins", we might need to sort first or use a Map.
    // Using Map for O(n) approach:

    const nodeMap = new Map<string, T>();

    nodes.forEach(node => {
        const existing = nodeMap.get(node.id);
        if (!existing) {
            nodeMap.set(node.id, node);
        } else {
            // If existing has version and current has version, keep higher
            const existingVer = existing.version || 0;
            const currentVer = node.version || 0;
            if (currentVer > existingVer) {
                nodeMap.set(node.id, node);
            }
        }
    });

    return Array.from(nodeMap.values());
}
