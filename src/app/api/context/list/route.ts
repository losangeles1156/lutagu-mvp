import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Use shared lazy client

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('[API] Fetching all active nodes for L1 Workflow context...');

        const { data, error } = await supabase
            .from('nodes')
            .select('*')
            .limit(100); // Safety limit, increase if needed

        if (error) {
            console.error('Supabase Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform if necessary, but returning raw is usually fine for n8n
        // Ensure location is valid
        const validNodes = data.filter(n => n.location && (typeof n.location === 'object' || typeof n.location === 'string'));

        return NextResponse.json({
            count: validNodes.length,
            nodes: validNodes
        });

    } catch (error) {
        console.error('List Context API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
