import { v4 as uuidv4 } from 'uuid';
import Cookies from 'js-cookie';

export const VISITOR_COOKIE_NAME = 'bg_vid';
export const SESSION_COOKIE_NAME = 'bg_sid'; // New session cookie
const SESSION_EXPIRY_MINUTES = 30;

// === Client Side Helpers ===

export function getVisitorId(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get(VISITOR_COOKIE_NAME) || null;
}

export function getSessionId(): string | null {
    if (typeof window === 'undefined') return null;

    // Check for existing session
    let sid = Cookies.get(SESSION_COOKIE_NAME);

    // If no session, generate one (this is a client-side fallback/refresh)
    // Ideally middleware handles this, but for client-only flows:
    if (!sid) {
        sid = uuidv4();
        Cookies.set(SESSION_COOKIE_NAME, sid, {
            expires: SESSION_EXPIRY_MINUTES / (24 * 60), // Convert minutes to days 
            sameSite: 'Lax'
        });
    } else {
        // Extend session on activity
        Cookies.set(SESSION_COOKIE_NAME, sid, {
            expires: SESSION_EXPIRY_MINUTES / (24 * 60),
            sameSite: 'Lax'
        });
    }

    return sid;
}

interface FunnelEvent {
    step_name: string;
    step_number: number;
    visitor_id?: string;
    session_id?: string;
    path: string;
    metadata?: Record<string, any>;
}

export async function trackFunnelEvent(event: Omit<FunnelEvent, 'visitor_id' | 'session_id'>) {
    if (typeof window === 'undefined') return;

    const visitor_id = getVisitorId();
    const session_id = getSessionId();

    if (!visitor_id || !session_id) {
        console.warn('Tracking skipped: Missing visitor_id or session_id');
        return;
    }

    try {
        await fetch('/api/tracking/funnel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...event,
                visitor_id,
                session_id,
                timestamp: new Date().toISOString(),
            }),
        });
    } catch (error) {
        console.error('Failed to track funnel event:', error);
    }
}
