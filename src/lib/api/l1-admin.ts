// L1 Admin API Client
import type {
    L1CustomPlace,
    L1Partner,
    CreatePlaceRequest,
    UpdatePlaceRequest,
    PlaceQueryParams,
    PlacesListResponse,
    PlaceResponse,
    PartnersListResponse,
    PartnerResponse,
    CreatePartnerRequest,
    UpdatePartnerRequest,
    L1PendingPlace,
    PendingPlacesResponse,
    BatchActionRequest,
    BatchActionResponse,
} from '@/lib/types/l1-admin';

const API_BASE = '/api/admin/l1';

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

// Places API
export const placesApi = {
    // List places with filtering
    list: async (params?: PlaceQueryParams): Promise<PlacesListResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.station_id) searchParams.set('station_id', params.station_id);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.status) searchParams.set('status', params.status);
        if (params?.is_partner !== undefined) searchParams.set('is_partner', String(params.is_partner));
        if (params?.partner_id) searchParams.set('partner_id', params.partner_id);
        if (params?.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.order_by) searchParams.set('order_by', params.order_by);
        if (params?.order_dir) searchParams.set('order_dir', params.order_dir);

        const query = searchParams.toString();
        const url = `${API_BASE}/places${query ? `?${query}` : ''}`;

        return fetchApi<PlacesListResponse>(url);
    },

    // Get a single place
    get: async (id: string): Promise<PlaceResponse> => {
        return fetchApi<PlaceResponse>(`${API_BASE}/places/${id}`);
    },

    // Create a new place
    create: async (data: CreatePlaceRequest): Promise<PlaceResponse> => {
        return fetchApi<PlaceResponse>(`${API_BASE}/places`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update a place
    update: async (id: string, data: UpdatePlaceRequest): Promise<PlaceResponse> => {
        return fetchApi<PlaceResponse>(`${API_BASE}/places/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    // Delete (soft delete) a place
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        return fetchApi<{ success: boolean; message: string }>(`${API_BASE}/places/${id}`, {
            method: 'DELETE',
        });
    },

    // Approve a place
    approve: async (id: string): Promise<{ success: boolean; message: string; place: L1CustomPlace }> => {
        return fetchApi<{ success: boolean; message: string; place: L1CustomPlace }>(`${API_BASE}/places/${id}/approve`, {
            method: 'PUT',
        });
    },

    // Reject a place
    reject: async (id: string, reason?: string): Promise<{ success: boolean; message: string; place: L1CustomPlace }> => {
        return fetchApi<{ success: boolean; message: string; place: L1CustomPlace }>(`${API_BASE}/places/${id}/reject`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        });
    },
};

// Partners API
export const partnersApi = {
    // List partners
    list: async (params?: { status?: string; search?: string }): Promise<PartnersListResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.status) searchParams.set('status', params.status);
        if (params?.search) searchParams.set('search', params.search);

        const query = searchParams.toString();
        const url = `${API_BASE}/partners${query ? `?${query}` : ''}`;

        return fetchApi<PartnersListResponse>(url);
    },

    // Get a single partner
    get: async (id: string): Promise<PartnerResponse> => {
        return fetchApi<PartnerResponse>(`${API_BASE}/partners/${id}`);
    },

    // Create a new partner
    create: async (data: CreatePartnerRequest): Promise<PartnerResponse> => {
        return fetchApi<PartnerResponse>(`${API_BASE}/partners`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Update a partner
    update: async (id: string, data: UpdatePartnerRequest): Promise<PartnerResponse> => {
        return fetchApi<PartnerResponse>(`${API_BASE}/partners?id=${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    // Delete a partner
    delete: async (id: string): Promise<{ success: boolean; message: string }> => {
        return fetchApi<{ success: boolean; message: string }>(`${API_BASE}/partners?id=${id}`, {
            method: 'DELETE',
        });
    },
};

// ============================================
// Pending L1 Places (OSM) API
// ============================================

export const pendingPlacesApi = {
    // List pending places with filtering
    list: async (params?: {
        station_id?: string;
        category?: string;
        page?: number;
        limit?: number;
    }): Promise<PendingPlacesResponse> => {
        const searchParams = new URLSearchParams();
        if (params?.station_id) searchParams.set('station_id', params.station_id);
        if (params?.category) searchParams.set('category', params.category);
        if (params?.page) searchParams.set('page', String(params.page));
        if (params?.limit) searchParams.set('limit', String(params.limit));

        const query = searchParams.toString();
        const url = `${API_BASE}/places/pending${query ? `?${query}` : ''}`;

        return fetchApi<PendingPlacesResponse>(url);
    },

    // Batch approve or reject places
    batch: async (data: BatchActionRequest): Promise<BatchActionResponse> => {
        return fetchApi<BatchActionResponse>(`${API_BASE}/places/pending/batch`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Approve multiple places by ID
    approveMultiple: async (placeIds: string[], notes?: string): Promise<BatchActionResponse> => {
        return pendingPlacesApi.batch({
            action: 'approve',
            place_ids: placeIds,
            notes,
        });
    },

    // Reject multiple places by ID
    rejectMultiple: async (placeIds: string[], notes?: string): Promise<BatchActionResponse> => {
        return pendingPlacesApi.batch({
            action: 'reject',
            place_ids: placeIds,
            notes,
        });
    },

    // Approve all places for a station and category
    approveByStationCategory: async (
        stationId: string,
        category: string,
        notes?: string
    ): Promise<BatchActionResponse> => {
        return pendingPlacesApi.batch({
            action: 'approve',
            station_id: stationId,
            category,
            notes,
        });
    },

    // Approve all places for a station
    approveByStation: async (stationId: string, notes?: string): Promise<BatchActionResponse> => {
        return pendingPlacesApi.batch({
            action: 'approve',
            station_id: stationId,
            notes,
        });
    },
};
