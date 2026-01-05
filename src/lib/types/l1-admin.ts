// L1 Custom Places and Partners Admin Types

export type PlaceStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type PartnerStatus = 'active' | 'inactive' | 'suspended';

export interface LocaleString {
    ja?: string;
    en?: string;
    'zh-TW'?: string;
    'zh-CN'?: string;
    ko?: string;
}

export interface DiscountInfo {
    type: 'percent' | 'fixed' | 'special';
    value: number;
    description?: string;
}

export interface BusinessHours {
    [day: string]: {
        open?: string;  // e.g., "09:00"
        close?: string; // e.g., "21:00"
        closed?: boolean;
    };
}

export interface L1CustomPlace {
    id: string;
    station_id: string;
    name_i18n: LocaleString;
    description_i18n?: LocaleString;
    category: string;
    subcategory?: string;
    location: { lat: number; lng: number } | null;
    address?: string;

    // Partner fields
    is_partner: boolean;
    partner_id?: string;
    affiliate_url?: string;
    discount_info?: DiscountInfo;
    business_hours?: BusinessHours;

    // Media
    image_urls?: string[];
    logo_url?: string;

    // Status
    is_active: boolean;
    priority: number;
    expires_at?: string;

    // Approval
    status: PlaceStatus;
    approved_by?: string;
    approved_at?: string;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface L1Partner {
    id: string;
    name: string;
    name_ja?: string;
    name_en?: string;
    contact_email?: string;
    contact_phone?: string;
    website_url?: string;
    commission_rate?: number;
    affiliate_code?: string;
    status: PartnerStatus;
    created_at: string;
    updated_at: string;
}

// API Request Types
export interface CreatePlaceRequest {
    station_id: string;
    name_i18n: LocaleString;
    description_i18n?: LocaleString;
    category: string;
    subcategory?: string;
    location?: { lat: number; lng: number };
    address?: string;
    is_partner?: boolean;
    partner_id?: string;
    affiliate_url?: string;
    discount_info?: DiscountInfo;
    business_hours?: BusinessHours;
    image_urls?: string[];
    logo_url?: string;
    priority?: number;
    expires_at?: string;
    status?: PlaceStatus;
}

export interface UpdatePlaceRequest extends Partial<CreatePlaceRequest> {
    is_active?: boolean;
    status?: PlaceStatus;
}

export interface PlaceQueryParams {
    station_id?: string;
    category?: string;
    status?: PlaceStatus;
    is_partner?: boolean;
    partner_id?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
    order_by?: string;
    order_dir?: 'asc' | 'desc';
}

export interface CreatePartnerRequest {
    name: string;
    name_ja?: string;
    name_en?: string;
    contact_email?: string;
    contact_phone?: string;
    website_url?: string;
    commission_rate?: number;
    affiliate_code?: string;
    status?: PartnerStatus;
}

export interface UpdatePartnerRequest extends Partial<CreatePartnerRequest> {
    status?: PartnerStatus;
}

// API Response Types
export interface PlacesListResponse {
    places: L1CustomPlace[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface PlaceResponse {
    place: L1CustomPlace;
}

export interface PartnersListResponse {
    partners: L1Partner[];
    total: number;
}

export interface PartnerResponse {
    partner: L1Partner;
}

export interface ApiError {
    error: string;
    message?: string;
    details?: any;
}

// ============================================
// L1 OSM Places (v_l1_pending) Types
// ============================================

export interface L1PendingPlace {
    id: string;  // UUID from l1_places
    node_id: string;
    name: string;
    category: string;
    osm_id: number;
    is_approved: boolean | null;
    is_featured: boolean | null;
    notes: string | null;
}

export interface PendingPlacesResponse {
    places: L1PendingPlace[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface BatchActionRequest {
    action: 'approve' | 'reject';
    place_ids?: string[];  // Array of l1_places.id
    station_id?: string;   // For bulk by station
    category?: string;     // For bulk by category
    notes?: string;
}

export interface BatchActionResponse {
    success: boolean;
    action: string;
    updated_count: number;
    message: string;
}

export interface L1GlobalStats {
    total_places: number;
    pending: number;
    approved: number;
    approval_rate: number;
    total_stations: number;
}

export interface L1StationStats {
    node_id: string;
    total: number;
    pending: number;
    approved: number;
    approval_rate: number;
}

export interface L1ValidationResult {
    pending_count: number;
    approved_count: number;
    config_total: number;
    unmatched_l1_places: number;
    is_consistent: boolean;
}

// ============================================
// Node Admin Types
// ============================================

export interface AdminNode {
    id: string;
    name: any;  // JSONB with multilingual names
    location: { coordinates: [number, number] };
    ward_id: string | null;
    parent_hub_id: string | null;
    is_hub: boolean;
    is_active: boolean;
    display_order: number;
    type: string;
    zone: string;
}

export interface NodesListResponse {
    nodes: AdminNode[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

export interface NodeUpdateRequest {
    node_ids: string[];
    updates: {
        parent_hub_id?: string | null;
        is_active?: boolean;
        display_order?: number;
    };
}

export interface NodeMergeRequest {
    hub_node_id: string;
    child_node_ids: string[];
    action: 'merge' | 'unmerge';
}

export interface NodeMergeResponse {
    success: boolean;
    hub_node_id: string;
    action: string;
    updated_count: number;
    results: { node_id: string; status: string; message?: string }[];
}

export interface WardNodeInfo {
    id: string;
    name: string;
    code: string;
    prefecture: string;
    nodes: {
        hubs: AdminNode[];
        children: AdminNode[];
        total: number;
    };
}

export interface WardStats {
    ward_id: string;
    total: number;
    hubs: number;
    children: number;
    active: number;
}

export interface HubChildrenResponse {
    hub_id: string;
    hub_name: any;
    children: AdminNode[];
    total_count: number;
}

export interface CoreWard {
    id: string;
    name: string;
    code: string;
    prefecture: string;
    node_count: number;
    hub_count: number;
    child_count: number;
}
