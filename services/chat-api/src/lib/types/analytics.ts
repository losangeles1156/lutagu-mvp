// Analytics Types

export type AnalyticsEventName =
    | 'page_view'
    | 'chat_query'
    | 'ai_response_received'
    | 'location_selected'
    | 'facility_viewed'
    | 'external_link_click'
    | 'decision_made'
    | 'partner_referral'
    | 'funnel_step';

export interface FunnelDefinition {
    id: string;
    name: string;
    steps: Array<{ step: number; name: string }>;
}

export interface TrackFunnelPayload {
    funnel_name: string;
    step_number: number;
    step_name: string;
    session_id: string;
    visitor_id?: string; // Optional, handled by backend if missing
    metadata?: Record<string, any>;
}

export interface PartnerClickPayload {
    nudge_log_id: string;
    partner_id: string;
    referral_url: string;
}
