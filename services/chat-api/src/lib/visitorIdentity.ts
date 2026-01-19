const VISITOR_COOKIE_NAME = 'bg_vid';

function parseCookieHeader(cookieHeader: string | null) {
    if (!cookieHeader) return new Map<string, string>();
    const map = new Map<string, string>();

    const parts = cookieHeader.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const name = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!name) continue;
        map.set(name, decodeURIComponent(value));
    }

    return map;
}

export function getVisitorIdFromRequest(request: any) {
    const cookieHeader = request.headers['cookie'] || request.headers.get?.('cookie') || '';
    const cookies = parseCookieHeader(cookieHeader);
    return cookies.get(VISITOR_COOKIE_NAME) || null;
}
