import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = getSupabaseAdmin();

        // Fetch all stations (nodes where type = 'station')
        // We only need id and name for the list
        const { data, error } = await supabase
            .from('nodes')
            .select('id, name')
            .eq('type', 'station')
            .order('id'); // Or order by some other logic

        if (error) throw error;

        // Process names if they are JSONB, might need to extract 'ja' or return whole object
        // The L1AuditList expects { id, name: string } but name is JSONB in DB.
        // Let's return formatted list
        const stations = (data || []).map((s: any) => ({
            id: s.id,
            name: s.name?.ja || s.name?.en || s.id
        }));

        // Sort by name for better UX
        stations.sort((a: any, b: any) => a.name.localeCompare(b.name, 'ja'));

        return NextResponse.json({ stations });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
