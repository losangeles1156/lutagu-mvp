import { getVisitorIdFromRequest } from '@/lib/visitorIdentity';

function getClientIp(request: any) {
    const forwardedFor = request.headers['x-forwarded-for'] || request.headers.get?.('x-forwarded-for');
    if (forwardedFor) return (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',')[0]?.trim() || null;
    return request.headers['x-real-ip'] || request.headers.get?.('x-real-ip');
}

async function sha256Hex(input: string) {
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hashWithSalt(value: string | null) {
    if (!value) return null;
    const salt = process.env.ACTIVITY_HASH_SALT || '';
    return sha256Hex(`${salt}:${value}`);
}

export async function getRequestSecurityContext(request: any) {
    const visitorId = getVisitorIdFromRequest(request);
    const ip = getClientIp(request);
    const userAgent = request.headers['user-agent'] || request.headers.get?.('user-agent') || '';
    const ipHash = await hashWithSalt(ip);
    const userAgentHash = await hashWithSalt(userAgent);
    return {
        visitorId,
        ip,
        ipHash,
        userAgent,
        userAgentHash
    };
}
