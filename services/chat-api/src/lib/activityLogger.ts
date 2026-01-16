import { supabaseAdmin } from '@/lib/supabase';
import { getVisitorIdFromRequest } from '@/lib/visitorIdentity';

type DeviceInfo = {
    userAgent: string | null;
    acceptLanguage: string | null;
    referer: string | null;
    ipHash: string | null;
    uaHash: string | null;
};

function shouldLog() {
    return process.env.ACTIVITY_LOGGING_ENABLED !== 'false';
}

function timeout(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
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

function getClientIp(request: any) {
    const forwardedFor = request.headers['x-forwarded-for'] || request.headers.get?.('x-forwarded-for');
    if (forwardedFor) return (typeof forwardedFor === 'string' ? forwardedFor : forwardedFor[0]).split(',')[0]?.trim() || null;
    return request.headers['x-real-ip'] || request.headers.get?.('x-real-ip');
}

async function extractDeviceInfo(request: any): Promise<DeviceInfo> {
    const userAgent = request.headers['user-agent'] || request.headers.get?.('user-agent') || '';
    const acceptLanguage = request.headers['accept-language'] || request.headers.get?.('accept-language') || '';
    const referer = request.headers['referer'] || request.headers.get?.('referer') || '';

    const ip = getClientIp(request);
    const ipHash = await hashWithSalt(ip);
    const uaHash = await hashWithSalt(userAgent);

    return { userAgent, acceptLanguage, referer, ipHash, uaHash };
}

function clampText(value: unknown, max = 1000) {
    if (value === null || value === undefined) return null;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (!text) return null;
    return text.length > max ? text.slice(0, max) : text;
}

export async function logUserActivity(params: {
    request: any;
    userId?: string | null;
    activityType: string;
    queryContent?: unknown;
    metadata?: Record<string, unknown>;
    timeoutMs?: number;
}) {
    if (!shouldLog()) return;

    const {
        request,
        userId = null,
        activityType,
        queryContent = null,
        metadata = {},
        timeoutMs = 120
    } = params;

    try {
        const visitorId = getVisitorIdFromRequest(request);
        const deviceInfo = await extractDeviceInfo(request);

        const mergedMetadata = {
            ...metadata,
            visitor_id: visitorId
        };

        const insertPromise = supabaseAdmin
            .from('user_activities')
            .insert({
                user_id: userId,
                activity_type: activityType,
                query_content: clampText(queryContent, 1200),
                device_info: deviceInfo,
                metadata: mergedMetadata,
                timestamp: new Date().toISOString()
            });

        await Promise.race([insertPromise, timeout(timeoutMs)]);
    } catch {
        return;
    }
}
