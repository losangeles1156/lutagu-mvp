// Node Admin API Client
import type {
    AdminNode,
    NodesListResponse,
    NodeUpdateRequest,
    NodeMergeRequest,
    NodeMergeResponse,
    WardNodeInfo,
    WardStats,
    CoreWard,
} from '@/lib/types/l1-admin';

const API_BASE = '/api/admin/nodes';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'API request failed');
    }

    return response.json();
}

// ============================================
// Nodes API
// ============================================
export const nodesApi = {
    // List nodes with filtering
    list: async (params?: {
        ward_id?: string;
        is_hub?: boolean;
        is_active?: boolean;
        parent_hub_id?: string;
        page?: number;
        limit?: number;
    }): Promise<NodesListResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.ward_id) searchParams.set('ward_id', params.ward_id);
        if (params?.is_hub !== undefined) searchParams.set('is_hub', String(params.is_hub));
        if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
        if (params?.parent_hub_id) searchParams.set('parent_hub_id', params.parent_hub_id);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));

        const query = searchParams.toString();
        const url = `${API_BASE}${query ? `?${query}` : ''}`;

        return fetchApi<NodesListResponse>(url);
    },

    // Batch update nodes
    update: async (data: NodeUpdateRequest): Promise<{ success: boolean; updated_count: number }> => {
        return fetchApi<{ success: boolean; updated_count: number }>(API_BASE, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Merge nodes to hub
    merge: async (data: NodeMergeRequest): Promise<NodeMergeResponse> => {
        return fetchApi<NodeMergeResponse>(`${API_BASE}/merge`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Merge multiple nodes to hub (shorthand)
    mergeToHub: async (
        hubNodeId: string,
        childNodeIds: string[]
    ): Promise<NodeMergeResponse> => {
        return nodesApi.merge({
            hub_node_id: hubNodeId,
            child_node_ids: childNodeIds,
            action: 'merge',
        });
    },

    // Unmerge nodes from hub (shorthand)
    unmerge: async (childNodeIds: string[]): Promise<NodeMergeResponse> => {
        return nodesApi.merge({
            hub_node_id: '',  // Not used for unmerge
            child_node_ids: childNodeIds,
            action: 'unmerge',
        });
    },

    // Deactivate nodes
    deactivate: async (nodeIds: string[]): Promise<{ success: boolean; updated_count: number }> => {
        return nodesApi.update({
            node_ids: nodeIds,
            updates: { is_active: false },
        });
    },

    // Activate nodes
    activate: async (nodeIds: string[]): Promise<{ success: boolean; updated_count: number }> => {
        return nodesApi.update({
            node_ids: nodeIds,
            updates: { is_active: true },
        });
    },
};

// ============================================
// Wards API
// ============================================
export const wardsApi = {
    // Get ward nodes
    getNodes: async (wardId: string): Promise<WardNodeInfo> => {
        return fetchApi<WardNodeInfo>(`${API_BASE}/wards/${encodeURIComponent(wardId)}`);
    },

    // Get ward stats
    getStats: async (wardId: string): Promise<WardStats> => {
        return fetchApi<WardStats>(`${API_BASE}/wards/${encodeURIComponent(wardId)}/stats`);
    },

    // Get core wards (9 wards)
    getCoreWards: async (): Promise<CoreWard[]> => {
        const response = await fetchApi<{ wards: CoreWard[] }>(`${API_BASE}/wards?core=true`);
        return response.wards;
    },
};

// ============================================
// SQL Functions helpers
// ============================================
export const nodeSqlApi = {
    // Get all hubs (via SQL function)
    getAllHubs: async (): Promise<AdminNode[]> => {
        // Direct SQL execution - for admin use only
        const response = await fetch('/api/admin/exec-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: 'SELECT * FROM get_all_hubs()',
            }),
        });
        if (!response.ok) throw new Error('Failed to execute SQL');
        return response.json();
    },

    // Get hub children
    getHubChildren: async (hubId: string): Promise<AdminNode[]> => {
        const response = await fetch('/api/admin/exec-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `SELECT * FROM get_hub_children('${hubId}')`,
            }),
        });
        if (!response.ok) throw new Error('Failed to execute SQL');
        return response.json();
    },

    // Get ward stats via SQL
    getWardStats: async (wardId: string): Promise<WardStats> => {
        const response = await fetch('/api/admin/exec-sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `SELECT * FROM get_ward_node_stats('${wardId}')`,
            }),
        });
        if (!response.ok) throw new Error('Failed to execute SQL');
        return response.json();
    },
};
