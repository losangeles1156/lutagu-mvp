import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const CHECK_BASE_URL = process.env.CHECK_BASE_URL || 'http://localhost:3100';
const CHECK_ENV = process.env.CHECK_ENV || 'local-dev';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase env. Require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function upsertIncident(params: {
    issue_id: string;
    title: string;
    description: string;
    environment: string;
    occurred_at: string;
    operation_steps: string;
    error_messages: string[];
    temporary_solution: string;
    root_cause_analysis: string;
    preventive_measures: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    resolved_at: string | null;
}) {
    // Check if incident_tracking table exists first
    const { error: tableCheckError } = await supabase.from('incident_tracking').select('id').limit(1);
    
    if (tableCheckError && tableCheckError.message.includes('Could not find the table')) {
        console.warn('⚠️  incident_tracking table does not exist. Incident details will be printed to console only.');
        console.log('--- Incident Details ---');
        console.log(JSON.stringify(params, null, 2));
        console.log('-------------------------');
        return;
    }

    const { data: existing, error: existingError } = await supabase
        .from('incident_tracking')
        .select('issue_id, occurred_at')
        .eq('issue_id', params.issue_id)
        .maybeSingle();

    if (existingError) {
        console.error('Failed to fetch existing incident record:', existingError.message);
    }

    const occurred_at = existing?.occurred_at || params.occurred_at;

    const { data, error } = await supabase
        .from('incident_tracking')
        .upsert({
            issue_id: params.issue_id,
            title: params.title,
            description: params.description,
            environment: params.environment,
            occurred_at,
            operation_steps: params.operation_steps,
            error_messages: params.error_messages,
            temporary_solution: params.temporary_solution,
            root_cause_analysis: params.root_cause_analysis,
            preventive_measures: params.preventive_measures,
            status: params.status,
            resolved_at: params.resolved_at,
            updated_at: new Date().toISOString()
        }, { onConflict: 'issue_id' })
        .select('issue_id, status, occurred_at, resolved_at')
        .single();

    if (error) {
        console.error('Failed to upsert incident record:', error.message);
        return;
    }

    console.log('Incident record synced:', data.issue_id, data.status);
}

async function checkUenoViewport() {
    const centerLat = 35.7141;
    const centerLon = 139.7774;
    const delta = 0.01;

    const url = new URL('/api/nodes/viewport', CHECK_BASE_URL);
    url.searchParams.set('swLat', String(centerLat - delta));
    url.searchParams.set('swLon', String(centerLon - delta));
    url.searchParams.set('neLat', String(centerLat + delta));
    url.searchParams.set('neLon', String(centerLon + delta));
    url.searchParams.set('zoom', '15');
    url.searchParams.set('hubs_only', 'true');

    console.log('Checking viewport API:', url.toString());

    let ok = false;
    const failures: string[] = [];
    try {
        const res = await fetch(url.toString());
        if (!res.ok) {
            console.error('Viewport API error status:', res.status);
            failures.push(`Viewport API HTTP ${res.status}`);
        } else {
            const json: any = await res.json();
            const nodes = Array.isArray(json?.nodes) ? json.nodes : [];
            const ueno = nodes.find((n: any) => n?.id === 'odpt:Station:JR-East.Ueno');
            const found = Boolean(ueno);
            if (!found) {
                failures.push('Ueno station not present in nodes[]');
            } else {
                const coords = ueno?.location?.coordinates;
                const lon = Array.isArray(coords) ? Number(coords[0]) : NaN;
                const lat = Array.isArray(coords) ? Number(coords[1]) : NaN;
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
                    failures.push('Ueno station has invalid coordinates');
                } else {
                    const latDiff = Math.abs(lat - centerLat);
                    const lonDiff = Math.abs(lon - centerLon);
                    const within = latDiff < 0.02 && lonDiff < 0.02;
                    if (!within) {
                        failures.push(`Ueno station coordinates out of range (lat=${lat}, lon=${lon})`);
                    }
                }
            }

            ok = failures.length === 0;
            console.log('Nodes returned:', nodes.length, 'Ueno present:', found, 'ok:', ok);
        }
    } catch (e: any) {
        console.error('Viewport API request failed:', e?.message || e);
        failures.push(`Viewport API request failed: ${e?.message || String(e)}`);
    }

    const status = ok ? ('resolved' as const) : ('open' as const);
    const incident = {
        issue_id: 'UENO_VIEWPORT_20260107',
        title: 'Ueno station missing or misplaced in viewport API',
        description: 'Regression check for Ueno station node position and presence in /api/nodes/viewport response.',
        environment: CHECK_ENV,
        occurred_at: new Date().toISOString(),
        operation_steps: 'Call /api/nodes/viewport with bounding box around Ueno (35.7141, 139.7774) and hubsOnly=true.',
        error_messages: ok ? [] : failures,
        temporary_solution: 'Seed node fallback and viewport supplementation ensure Ueno appears even if RPC misses it.',
        root_cause_analysis: 'Original issue caused by missing Supabase RPC result and coordinate handling; fixed by seed fallback injection and ID normalization.',
        preventive_measures: 'Run this script via cron/CI daily; alert if check fails and create/keep incident open.',
        status,
        resolved_at: ok ? new Date().toISOString() : null
    };

    await upsertIncident(incident);

    if (!ok) {
        console.error('Ueno viewport regression detected. Incident marked with error_messages.');
        process.exitCode = 1;
    } else {
        console.log('Ueno viewport regression check passed.');
    }
}

checkUenoViewport();
