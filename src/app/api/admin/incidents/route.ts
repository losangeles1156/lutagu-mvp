import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/supabaseAuth';
import fs from 'fs';
import path from 'path';

const LOCAL_INCIDENTS_PATH = path.join(process.cwd(), 'incidents.local.json');

function readLocalIncidents() {
    if (!fs.existsSync(LOCAL_INCIDENTS_PATH)) return [];
    try {
        const content = fs.readFileSync(LOCAL_INCIDENTS_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (e) {
        console.error('Failed to read local incidents:', e);
        return [];
    }
}

function writeLocalIncident(incident: any) {
    const incidents = readLocalIncidents();
    const existingIndex = incidents.findIndex((i: any) => i.issue_id === incident.issue_id);
    if (existingIndex >= 0) {
        incidents[existingIndex] = { ...incidents[existingIndex], ...incident, updated_at: new Date().toISOString() };
    } else {
        incidents.push({ ...incident, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    fs.writeFileSync(LOCAL_INCIDENTS_PATH, JSON.stringify(incidents, null, 2));
    return incident;
}

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = auth.rls
        .from('incident_tracking')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error && error.message.includes('Could not find the table')) {
        console.warn('⚠️  incident_tracking table missing, falling back to local file.');
        let localData = readLocalIncidents();
        if (status) {
            localData = localData.filter((i: any) => i.status === status);
        }
        const total = localData.length;
        const pagedData = localData.slice(offset, offset + limit);
        return NextResponse.json({
            incidents: pagedData,
            total,
            limit,
            offset,
            fallback: true
        });
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        incidents: data || [],
        total: count || 0,
        limit,
        offset
    });
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const body = await request.json();

    const requiredFields = ['issue_id', 'title', 'description', 'environment', 'operation_steps'] as const;
    const missing = requiredFields.filter((k) => !body?.[k]);
    if (missing.length > 0) {
        return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 400 });
    }

    const occurredAtMs = body.occurred_at ? new Date(body.occurred_at).getTime() : NaN;
    const occurred_at = Number.isFinite(occurredAtMs) ? new Date(occurredAtMs).toISOString() : null;

    const payload = {
        issue_id: body.issue_id,
        title: body.title,
        description: body.description,
        environment: body.environment,
        occurred_at,
        operation_steps: body.operation_steps,
        error_messages: body.error_messages ?? [],
        temporary_solution: body.temporary_solution ?? null,
        root_cause_analysis: body.root_cause_analysis ?? null,
        preventive_measures: body.preventive_measures ?? null,
        status: body.status ?? 'open'
    };

    const { data, error } = await auth.rls
        .from('incident_tracking')
        .insert(payload)
        .select('*')
        .single();

    if (error && error.message.includes('Could not find the table')) {
        console.warn('⚠️  incident_tracking table missing, falling back to local file.');
        const saved = writeLocalIncident(payload);
        return NextResponse.json({ incident: saved, fallback: true });
    }

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ incident: data });
}

export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const body = await request.json();
    const { issue_id } = body;

    if (!issue_id) {
        return NextResponse.json({ error: 'issue_id is required' }, { status: 400 });
    }

    const updates: any = {};

    if (body.status) {
        updates.status = body.status;
        if ((body.status === 'resolved' || body.status === 'closed') && !body.resolved_at) {
            updates.resolved_at = new Date().toISOString();
        }
    }

    if (body.resolved_at) {
        const resolvedAtMs = new Date(body.resolved_at).getTime();
        if (Number.isFinite(resolvedAtMs)) {
            updates.resolved_at = new Date(resolvedAtMs).toISOString();
        }
    }
    if (typeof body.temporary_solution === 'string') updates.temporary_solution = body.temporary_solution;
    if (typeof body.root_cause_analysis === 'string') updates.root_cause_analysis = body.root_cause_analysis;
    if (typeof body.preventive_measures === 'string') updates.preventive_measures = body.preventive_measures;
    if (Array.isArray(body.error_messages)) updates.error_messages = body.error_messages;

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await auth.rls
        .from('incident_tracking')
        .update(updates)
        .eq('issue_id', issue_id)
        .select('*')
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ incident: data });
}
