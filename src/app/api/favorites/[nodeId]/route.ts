import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security/supabaseAuth';

export async function DELETE(_req: NextRequest, { params }: { params: { nodeId: string } }) {
    const auth = await requireUser(_req);
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const nodeId = params?.nodeId;
    if (!nodeId) return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });

    const { error } = await auth.rls
        .from('favorite_nodes')
        .delete()
        .eq('user_id', auth.user.id)
        .eq('node_id', nodeId);

    if (error) {
        console.error('Favorite DELETE error:', error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
