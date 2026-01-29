import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Simple Supabase client for this endpoint to avoid middleware overhead if possible,
// or use the standard project client.
// Using standard process.env vars.

export async function POST(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const body = await req.json();
        const { step_name, step_number, visitor_id, session_id, path, metadata, timestamp } = body;

        if (!visitor_id || !session_id || !step_name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get the default funnel ID (we know it's 'ai_chat_to_decision')
        const { data: funnelData, error: funnelError } = await supabase
            .from('funnels')
            .select('id')
            .eq('name', 'ai_chat_to_decision')
            .single();

        if (funnelError || !funnelData) {
            console.error('Error fetching funnel:', funnelError);
            return NextResponse.json({ error: 'Funnel configuration error' }, { status: 500 });
        }

        // Prepare promises for parallel execution
        const promises: PromiseLike<any>[] = [];

        // 2. Schedule Funnel Event Insert (Critical)
        const funnelEventPromise = supabase
            .from('funnel_events')
            .insert({
                funnel_id: funnelData.id,
                visitor_id,
                session_id,
                step_name,
                step_number,
                metadata: metadata || {},
                created_at: timestamp || new Date().toISOString()
            });
        promises.push(funnelEventPromise);

        // 3. Schedule Nudge Log Insert (Non-critical, Business Conversion)
        if (step_name === 'external_link_click') {
            const partnerId = metadata?.partner_id || (metadata?.link_type === 'vacan_map' ? 'vacan' : null);

            if (partnerId) {
                const nudgeLogPromise = supabase.from('nudge_logs').insert({
                    visitor_id,
                    partner_id: partnerId,
                    nudge_type: metadata?.link_type || 'external_link',
                    content: metadata,
                    conversion_status: 'clicked',
                    clicked_at: new Date().toISOString(),
                    referral_url: metadata?.target_url,
                    created_at: new Date().toISOString()
                });
                promises.push(nudgeLogPromise);
            }
        }

        // Execute all database operations in parallel
        const results = await Promise.all(promises);

        // Check Funnel Event result (Index 0)
        const { error: insertError } = results[0];
        if (insertError) {
            console.error('Error inserting funnel event:', insertError);
            return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
        }

        // Check Nudge Log result (Index 1, if exists)
        if (results.length > 1) {
            const { error: nudgeError } = results[1];
            if (nudgeError) {
                console.error('Failed to log nudge conversion:', nudgeError);
                // Non-blocking, continue
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Funnel tracking API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
