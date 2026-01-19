import { NextRequest, NextResponse } from 'next/server';
import { logUserActivity } from '@/lib/activityLogger';
import { rateLimit } from '@/lib/security/rateLimit';
import { writeSecurityEvent } from '@/lib/security/audit';

const ALLOWED_ACTIVITY_TYPES = new Set([
    'external_link_click',
    'facility_open'
]);

function clampString(value: unknown, max = 500) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || '';
    const rl = rateLimit({ key: `activity:${ip}`, capacity: 120, refillPerSecond: 2 });
    if (!rl.allowed) {
        await writeSecurityEvent(req, {
            type: 'rate_limit',
            severity: 'low',
            actorUserId: null,
            metadata: { endpoint: 'POST /api/activity' }
        });
        return NextResponse.json(
            { error: 'Too Many Requests' },
            { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } as any }
        );
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const activityType = clampString(body?.activityType, 64);
    if (!activityType || !ALLOWED_ACTIVITY_TYPES.has(activityType)) {
        return NextResponse.json({ error: 'Invalid activityType' }, { status: 400 });
    }

    const nodeId = clampString(body?.nodeId, 200);
    const trackingId = clampString(body?.trackingId, 200);
    const url = clampString(body?.url, 1200);
    const title = clampString(body?.title, 200);
    const facilityType = clampString(body?.facilityType, 64);
    const facilityId = clampString(body?.facilityId, 200);

    await logUserActivity({
        request: req,
        activityType,
        queryContent: {
            nodeId,
            trackingId,
            url,
            title,
            facilityType,
            facilityId
        },
        metadata: {
            feature: 'client_event'
        }
    });

    return NextResponse.json({ ok: true });
}
