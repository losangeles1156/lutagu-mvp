import { TrackFunnelPayload } from '@/lib/types/analytics';

const SESSION_COOKIE_NAME = 'lutagu_session';
const VISITOR_COOKIE_NAME = 'visitor_id';

// Helper to get cookie by name
function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

// Helper to set cookie
function setCookie(name: string, value: string, maxAge: number) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function getVisitorId(): string {
    let vid = getCookie(VISITOR_COOKIE_NAME);
    if (!vid) {
        vid = generateId();
        setCookie(VISITOR_COOKIE_NAME, vid, 365 * 24 * 60 * 60); // 1 year
    }
    return vid;
}

export function getSessionId(): string {
    let sid = getCookie(SESSION_COOKIE_NAME);
    if (!sid) {
        sid = generateId();
    }
    // Refresh expiration on access (30 mins)
    setCookie(SESSION_COOKIE_NAME, sid, 30 * 60);
    return sid;
}

export async function trackFunnelStep(
    funnelName: string,
    stepNumber: number,
    stepName: string,
    metadata?: Record<string, any>
) {
    if (typeof window === 'undefined') return;

    const payload: TrackFunnelPayload = {
        funnel_name: funnelName,
        step_number: stepNumber,
        step_name: stepName,
        session_id: getSessionId(),
        visitor_id: getVisitorId(),
        metadata
    };

    // Use sendBeacon if available for reliability
    if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/funnel/track', blob);
    } else {
        // Fallback to fetch with keepalive
        try {
            await fetch('/api/funnel/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch (e) {
            console.error('[Funnel Track Error]', e);
        }
    }
}
