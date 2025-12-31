import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security/supabaseAuth';

function isSchemaCacheMissingColumnError(error: any) {
    const msg = (error as any)?.message || String(error);
    return msg.includes('Could not find the') && msg.includes('column') && msg.includes('schema cache');
}

async function fetchMemberProfile(rls: any, userId: string) {
    const attempts: Array<{ key: 'user_id' | 'id'; select: string }> = [
        { key: 'user_id', select: 'user_id, display_name, role, created_at, updated_at, deleted_at' },
        { key: 'user_id', select: 'user_id, role, created_at, updated_at, deleted_at' },
        { key: 'user_id', select: 'user_id, created_at, updated_at, deleted_at' },
        { key: 'user_id', select: 'user_id' },
        { key: 'id', select: 'id, display_name, role, created_at, updated_at, deleted_at' },
        { key: 'id', select: 'id, role, created_at, updated_at, deleted_at' },
        { key: 'id', select: 'id, created_at, updated_at, deleted_at' },
        { key: 'id', select: 'id' }
    ];

    let last: any = null;
    for (const attempt of attempts) {
        const res = await rls.from('member_profiles').select(attempt.select).eq(attempt.key, userId).maybeSingle();
        if (!res.error) {
            last = res;
            if (res.data) return res;
            continue;
        }

        if (!isSchemaCacheMissingColumnError(res.error)) return res;
        last = res;
    }

    return last;
}

function pickDisplayName(params: { email: string | null; userMetadata: any }) {
    const { email, userMetadata } = params;
    const fromMeta =
        (typeof userMetadata?.full_name === 'string' && userMetadata.full_name) ||
        (typeof userMetadata?.name === 'string' && userMetadata.name) ||
        (typeof userMetadata?.preferred_username === 'string' && userMetadata.preferred_username) ||
        (typeof userMetadata?.user_name === 'string' && userMetadata.user_name) ||
        null;

    const raw = (fromMeta || email || '').trim();
    if (!raw) return null;
    return raw.length > 120 ? raw.slice(0, 120) : raw;
}

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const { data: profile, error } = await fetchMemberProfile(auth.rls, auth.user.id);

    if (error) {
        console.error('[api/me] member_profiles select error', error);
        return NextResponse.json({ error: 'Database Error', details: error.message || String(error) }, { status: 500 });
    }

    const safeProfile = profile && !(profile as any).deleted_at ? profile : null;
    const computedDisplayName = pickDisplayName({ email: auth.user.email || null, userMetadata: auth.user.user_metadata });
    const withComputedName = safeProfile ? { ...safeProfile, display_name: (safeProfile as any).display_name ?? computedDisplayName } : null;

    return NextResponse.json({
        user: {
            id: auth.user.id,
            email: auth.user.email || null
        },
        profile: withComputedName
    });
}

export async function POST(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const displayName = pickDisplayName({ email: auth.user.email || null, userMetadata: auth.user.user_metadata });

    const { data: existingProfile, error: existingError } = await fetchMemberProfile(auth.rls, auth.user.id);
    if (existingError) {
        console.error('[api/me] member_profiles select error', existingError);
        return NextResponse.json({ error: 'Database Error', details: existingError.message || String(existingError) }, { status: 500 });
    }

    if (!existingProfile) {
        const insertAttempts: Array<Record<string, any>> = [
            { user_id: auth.user.id },
            { id: auth.user.id },
            { id: auth.user.id, user_id: auth.user.id },
            { user_id: auth.user.id, role: 'member' },
            { id: auth.user.id, role: 'member' },
            { id: auth.user.id, user_id: auth.user.id, role: 'member' },
            { user_id: auth.user.id, display_name: displayName },
            { id: auth.user.id, user_id: auth.user.id, display_name: displayName },
            { user_id: auth.user.id, display_name: displayName, role: 'member' },
            { id: auth.user.id, user_id: auth.user.id, display_name: displayName, role: 'member' }
        ];

        let lastError: any = null;
        for (const payload of insertAttempts) {
            const { error } = await auth.rls.from('member_profiles').insert(payload);
            if (!error) {
                lastError = null;
                break;
            }
            lastError = error;
        }

        if (lastError) {
            console.error('[api/me] member_profiles insert failed', { userId: auth.user.id, error: lastError });
            return NextResponse.json({ error: 'Database Error', details: lastError.message || String(lastError) }, { status: 500 });
        }
    }

    const { data: profile, error: profileError } = await fetchMemberProfile(auth.rls, auth.user.id);

    if (profileError) {
        return NextResponse.json({ error: 'Database Error', details: profileError.message || String(profileError) }, { status: 500 });
    }

    const safeProfile = profile && !(profile as any).deleted_at ? profile : null;
    const computedDisplayName = pickDisplayName({ email: auth.user.email || null, userMetadata: auth.user.user_metadata });
    const withComputedName = safeProfile ? { ...safeProfile, display_name: (safeProfile as any).display_name ?? computedDisplayName } : null;

    return NextResponse.json({
        ok: true,
        user: {
            id: auth.user.id,
            email: auth.user.email || null
        },
        profile: withComputedName
    });
}
