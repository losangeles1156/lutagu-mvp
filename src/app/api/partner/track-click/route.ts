import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { PartnerClickPayload } from '@/lib/types/analytics';

export async function POST(req: NextRequest) {
    try {
        const payload: PartnerClickPayload = await req.json();
        const { nudge_log_id, partner_id, referral_url } = payload;

        if (!nudge_log_id) {
            return NextResponse.json({ error: 'Missing nudge_log_id' }, { status: 400 });
        }

        // Update the log
        const { error } = await supabaseAdmin
            .from('nudge_logs')
            .update({
                clicked_at: new Date().toISOString(),
                conversion_status: 'clicked',
                referral_url: referral_url
            })
            .eq('id', nudge_log_id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Partner Track Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
