import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

type FeedbackWeight = {
    tag: string;
    weight: number;
    updated_at: string;
};

type FeedbackEvent = {
    id: string;
    trace_id: string | null;
    user_id: string | null;
    session_id: string | null;
    locale: string | null;
    query: string | null;
    response: string | null;
    helpful: boolean;
    intent_tags: string[] | null;
    node_id: string | null;
    created_at: string;
};

function summarize(weights: FeedbackWeight[], events: FeedbackEvent[]) {
    const positiveCount = events.filter((e) => e.helpful).length;
    const negativeCount = events.length - positiveCount;
    const avgWeight =
        weights.length > 0
            ? weights.reduce((sum, w) => sum + Number(w.weight || 0), 0) / weights.length
            : 0;
    return {
        totalEvents: events.length,
        positiveCount,
        negativeCount,
        totalTags: weights.length,
        avgWeight: Number(avgWeight.toFixed(4)),
        topPositive: [...weights].sort((a, b) => b.weight - a.weight).slice(0, 5),
        topNegative: [...weights].sort((a, b) => a.weight - b.weight).slice(0, 5),
    };
}

function toCsv(weights: FeedbackWeight[]): string {
    const header = 'tag,weight,updated_at';
    const rows = weights.map((w) => {
        const tag = `"${String(w.tag || '').replace(/"/g, '""')}"`;
        const weight = Number(w.weight || 0).toString();
        const updatedAt = `"${String(w.updated_at || '').replace(/"/g, '""')}"`;
        return `${tag},${weight},${updatedAt}`;
    });
    return [header, ...rows].join('\n');
}

function toMarkdown(weights: FeedbackWeight[], events: FeedbackEvent[]) {
    const s = summarize(weights, events);
    const lines: string[] = [];
    lines.push('# Agent Feedback Weights Report');
    lines.push('');
    lines.push(`- Generated At: ${new Date().toISOString()}`);
    lines.push(`- Total Events: ${s.totalEvents}`);
    lines.push(`- Positive: ${s.positiveCount}`);
    lines.push(`- Negative: ${s.negativeCount}`);
    lines.push(`- Total Tags: ${s.totalTags}`);
    lines.push(`- Average Weight: ${s.avgWeight}`);
    lines.push('');
    lines.push('## Top Positive Tags');
    for (const item of s.topPositive) {
        lines.push(`- ${item.tag}: ${Number(item.weight).toFixed(4)}`);
    }
    lines.push('');
    lines.push('## Top Negative Tags');
    for (const item of s.topNegative) {
        lines.push(`- ${item.tag}: ${Number(item.weight).toFixed(4)}`);
    }
    lines.push('');
    lines.push('## Weights Snapshot');
    lines.push('| Tag | Weight | Updated At |');
    lines.push('| --- | ---: | --- |');
    for (const w of weights) {
        lines.push(`| ${w.tag} | ${Number(w.weight).toFixed(4)} | ${w.updated_at || ''} |`);
    }
    return lines.join('\n');
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const format = (url.searchParams.get('format') || 'json').toLowerCase();
        const eventLimit = Number(url.searchParams.get('limit') || '100');

        const [{ data: weightsData, error: weightsError }, { data: eventsData, error: eventsError }] =
            await Promise.all([
                supabaseAdmin
                    .from('agent_feedback_weights')
                    .select('tag,weight,updated_at')
                    .order('weight', { ascending: false }),
                supabaseAdmin
                    .from('agent_feedback_events')
                    .select('id,trace_id,user_id,session_id,locale,query,response,helpful,intent_tags,node_id,created_at')
                    .order('created_at', { ascending: false })
                    .limit(Number.isFinite(eventLimit) ? Math.max(1, Math.min(500, eventLimit)) : 100),
            ]);

        if (weightsError || eventsError) {
            return NextResponse.json(
                {
                    error: 'Failed to fetch agent feedback data',
                    weightsError: weightsError?.message || null,
                    eventsError: eventsError?.message || null,
                },
                { status: 500 }
            );
        }

        const weights = (weightsData || []) as FeedbackWeight[];
        const events = (eventsData || []) as FeedbackEvent[];
        const summary = summarize(weights, events);

        if (format === 'csv') {
            return new NextResponse(toCsv(weights), {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="agent-feedback-weights-${new Date().toISOString().slice(0, 10)}.csv"`,
                },
            });
        }

        if (format === 'md' || format === 'markdown') {
            return new NextResponse(toMarkdown(weights, events), {
                status: 200,
                headers: {
                    'Content-Type': 'text/markdown; charset=utf-8',
                    'Content-Disposition': `attachment; filename="agent-feedback-report-${new Date().toISOString().slice(0, 10)}.md"`,
                },
            });
        }

        return NextResponse.json({
            summary,
            weights,
            events,
            generatedAt: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

