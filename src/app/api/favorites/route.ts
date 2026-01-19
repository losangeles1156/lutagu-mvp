import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security/supabaseAuth';

export async function GET(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const nodeId = searchParams.get('nodeId');

    let q = auth.rls.from('favorite_nodes').select('node_id').order('created_at', { ascending: false });
    if (nodeId) q = q.eq('node_id', nodeId);

    const { data, error } = await q;
    if (error) {
        console.error('Favorites GET error:', error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }

    return NextResponse.json({ items: (data || []).map((r: any) => r.node_id) });
}

export async function POST(req: NextRequest) {
    const auth = await requireUser(req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const nodeId = typeof body?.nodeId === 'string' ? body.nodeId : null;
    if (!nodeId) return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });

    const { error } = await auth.rls
        .from('favorite_nodes')
        .upsert({ user_id: auth.user.id, node_id: nodeId }, { onConflict: 'user_id,node_id' });

    if (error) {
        console.error('Favorites POST error:', error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
