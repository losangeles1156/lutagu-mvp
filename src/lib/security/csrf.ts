function getCookieValue(request: Request, name: string) {
    const cookie = request.headers.get('cookie');
    if (!cookie) return null;
    const parts = cookie.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith(name + '=')) continue;
        return decodeURIComponent(trimmed.slice(name.length + 1));
    }
    return null;
}

export function enforceCsrfIfCookieBasedAuth(request: Request) {
    const hasAuthorization = Boolean(request.headers.get('authorization'));
    if (hasAuthorization) return { ok: true };

    const csrfCookie = getCookieValue(request, 'bg_csrf');
    const csrfHeader = request.headers.get('x-csrf-token');
    if (!csrfCookie || !csrfHeader) return { ok: false, reason: 'missing' };
    if (csrfCookie !== csrfHeader) return { ok: false, reason: 'mismatch' };
    return { ok: true };
}
