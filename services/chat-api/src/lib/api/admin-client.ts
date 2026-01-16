/**
 * Admin API Client
 * Provides typed functions for admin operations (L1 review, node management)
 */

import { NodeDatum } from './nodes';

// Types for admin operations
export interface AdminNode {
    id: string;
    name: any;
    latitude: number;
    longitude: number;
    ward_id: string | null;
    parent_hub_id: string | null;
    is_active: boolean;
    is_hub: boolean;
    hub_id: string | null;
    display_order: number;
    operator?: string;
    line_name?: string;
}

export interface AdminNodeListResponse {
    nodes: AdminNode[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface AdminUpdateRequest {
    node_ids: string[];
    updates: {
        parent_hub_id?: string | null;
        is_active?: boolean;
        display_order?: number;
    };
}

export interface L1PendingPlace {
    id: string;
    odpt_place?: string;
    name: any;
    category: string;
    ward_id: string;
    latitude: number;
    longitude: number;
    operator?: string;
    open_data_catalog_id?: string;
    source_dataset?: string;
    created_at?: string;
}

export interface L1PendingResponse {
    places: L1PendingPlace[];
    total: number;
    page: number;
    limit: number;
}

export interface BatchApprovalRequest {
    approvals: string[];  // Place IDs to approve
    rejections: string[]; // Place IDs to reject
    rejected_reason?: string;
}

export interface BatchApprovalResponse {
    approved_count: number;
    rejected_count: number;
    results: Array<{
        place_id: string;
        status: 'approved' | 'rejected' | 'error';
        error?: string;
    }>;
}

// API client functions
const API_BASE = '/api/admin';

export async function fetchNodes(params: {
    ward_id?: string;
    is_hub?: boolean;
    is_active?: boolean;
    parent_hub_id?: string;
    page?: number;
    limit?: number;
}): Promise<AdminNodeListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.ward_id) searchParams.set('ward_id', params.ward_id);
    if (params.is_hub !== undefined) searchParams.set('is_hub', String(params.is_hub));
    if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
    if (params.parent_hub_id) searchParams.set('parent_hub_id', params.parent_hub_id);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const response = await fetch(`${API_BASE}/nodes?${searchParams}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch nodes');
    }
    
    return response.json();
}

export async function updateNodes(data: AdminUpdateRequest): Promise<{
    success: boolean;
    updated_count: number;
    message: string;
}> {
    const response = await fetch(`${API_BASE}/nodes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update nodes');
    }
    
    return response.json();
}

export async function mergeNodes(params: {
    child_node_id: string;
    parent_hub_id: string;
}): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/nodes/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to merge nodes');
    }
    
    return response.json();
}

export async function unmergeNode(params: {
    node_id: string;
}): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/nodes/unmerge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unmerge node');
    }
    
    return response.json();
}

export async function fetchL1Pending(params: {
    page?: number;
    limit?: number;
    ward_id?: string;
    category?: string;
}): Promise<L1PendingResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.ward_id) searchParams.set('ward_id', params.ward_id);
    if (params.category) searchParams.set('category', params.category);

    const response = await fetch(`${API_BASE}/l1/places/pending?${searchParams}`);
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch pending L1 places');
    }
    
    return response.json();
}

export async function batchApproveL1(data: BatchApprovalRequest): Promise<BatchApprovalResponse> {
    const response = await fetch(`${API_BASE}/l1/places/pending/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to batch approve L1 places');
    }
    
    return response.json();
}

export async function approveL1Place(placeId: string): Promise<{
    success: boolean;
    node_id: string;
    message: string;
}> {
    const response = await fetch(`${API_BASE}/l1/places/pending/${placeId}/approve`, {
        method: 'POST',
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve L1 place');
    }
    
    return response.json();
}

export async function rejectL1Place(placeId: string, reason?: string): Promise<{
    success: boolean;
    message: string;
}> {
    const response = await fetch(`${API_BASE}/l1/places/pending/${placeId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject L1 place');
    }
    
    return response.json();
}

// Helper function to check if API is available
export async function checkAdminApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/nodes?limit=1`);
        return response.ok;
    } catch {
        return false;
    }
}
