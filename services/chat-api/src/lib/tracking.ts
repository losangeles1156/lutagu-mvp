import { v4 as uuidv4 } from 'uuid';

export const VISITOR_COOKIE_NAME = 'bg_vid';
export const SESSION_COOKIE_NAME = 'bg_sid'; // New session cookie
const SESSION_EXPIRY_MINUTES = 30;

// === Client Side Helpers ===

export function getVisitorId(): string | null {
    return null;
}

export function getSessionId(): string | null {
    return null;
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
    // No-op for backend
    return;
}
