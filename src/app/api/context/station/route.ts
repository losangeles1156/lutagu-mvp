import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { knowledgeService } from '@/lib/l4/knowledgeService';

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
    if (supabase) return supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase environment variables not configured');
        return null;
    }

    supabase = createClient(supabaseUrl, supabaseKey);
    return supabase;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get('stationId'); // e.g., 'odpt:Station:TokyoMetro.Ueno'

    if (!stationId) {
        return NextResponse.json({ error: 'Missing stationId' }, { status: 400 });
    }

    try {
        // 1. Get Supabase client (may be null if not configured)
        const client = getSupabaseClient();

        let nodeData: any = null;
        let profileData: any = null;

        if (client) {
            // 2. Get Dynamic Node Data (Basic Info & Accessibility)
            const { data: node, error: nodeError } = await client
                .from('nodes')
                .select('name, type, vibe, accessibility, metadata')
                .eq('id', stationId)
                .single();

            if (nodeError && nodeError.code !== 'PGRST116') { // Ignore "Row not found" (PGRST116)
                console.warn('Supabase Error fetching node:', nodeError.message);
            } else {
                nodeData = node;
            }

            // 3. Get Facility Profiles (L1 Tags)
            const { data: profile, error: profileError } = await client
                .from('node_facility_profiles')
                .select('category_counts, vibe_tags, dominant_category')
                .eq('node_id', stationId)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                console.warn('Supabase Error fetching profile:', profileError.message);
            } else {
                profileData = profile;
            }
        }

        // 4. Get Knowledge from SSoT (Markdown-based knowledgeService)
        const knowledgeItems = knowledgeService.getKnowledgeByStationId(stationId);

        // Filter by type for Agent consumption (simplified plain text)
        const traps = knowledgeItems
            .filter(k => k.type === 'warning')
            .map(k => `${k.section}: ${k.content.substring(0, 100)}`);
        const tips = knowledgeItems
            .filter(k => k.type === 'tip')
            .map(k => `${k.section}: ${k.content.substring(0, 100)}`);

        // 5. Calculate busy_level from metadata if available
        let busyLevel = 'unknown';
        const dailyPassengers = nodeData?.metadata?.daily_passengers;
        if (dailyPassengers) {
            if (dailyPassengers > 500000) busyLevel = 'Very Busy';
            else if (dailyPassengers > 200000) busyLevel = 'Busy';
            else if (dailyPassengers > 50000) busyLevel = 'Moderate';
            else busyLevel = 'Quiet';
        }

        // 6. Construct Token-Optimized Context Response
        const contextResponse = {
            stationId,
            name: nodeData?.name?.en || stationId,
            vibe: nodeData?.vibe || 'unknown',
            busy_level: busyLevel,
            accessibility: nodeData?.accessibility || 'unknown',
            facility_summary: profileData ? profileData.dominant_category : null,
            wisdom: (traps.length > 0 || tips.length > 0) ? { traps, tips } : null,
            _attribution: 'ODPT (Open Data Platform for Public Transportation)'
        };

        return NextResponse.json(contextResponse);

    } catch (error) {
        console.error('Context API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
