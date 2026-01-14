export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Declare global gtag function
declare global {
    interface Window {
        gtag: (command: string, targetId: string, config?: object) => void;
        dataLayer: any[];
    }
}

// Log page view
export const pageview = (url: string) => {
    if (typeof window.gtag !== 'undefined' && GA_TRACKING_ID) {
        window.gtag('config', GA_TRACKING_ID, {
            page_path: url,
        });
    }
};

// Log generic event
export const event = (action: string, params: object = {}) => {
    if (typeof window.gtag !== 'undefined' && GA_TRACKING_ID) {
        window.gtag('event', action, params);
    }
};

// Helper for core events defined in plan
export const trackCoreEvent = (
    eventName: 'chat_query' | 'ai_response_received' | 'location_selected' | 'external_link_click' | 'decision_made' | 'partner_referral',
    params: Record<string, any>
) => {
    event(eventName, params);
};
