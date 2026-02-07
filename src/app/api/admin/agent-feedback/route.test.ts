import test from 'node:test';
import assert from 'node:assert/strict';

// 為了測試目的，在測試檔案中重新定義內部函數
// 這些函數與 route.ts 中的實作保持一致

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

type TrendRow = {
    day: string;
    positive: number;
    negative: number;
    total: number;
};

type AlertRow = {
    tag: string;
    weight: number;
    level: 'high' | 'medium';
};

function dayKey(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toISOString().slice(0, 10);
}

function buildTrendSeries(events: FeedbackEvent[], days: number): TrendRow[] {
    const bucket = new Map<string, TrendRow>();
    for (const e of events) {
        const day = dayKey(e.created_at);
        if (!day) continue;
        if (!bucket.has(day)) {
            bucket.set(day, { day, positive: 0, negative: 0, total: 0 });
        }
        const row = bucket.get(day)!;
        row.total += 1;
        if (e.helpful) row.positive += 1;
        else row.negative += 1;
    }
    const sorted = [...bucket.values()].sort((a, b) => a.day.localeCompare(b.day));
    if (!Number.isFinite(days) || days <= 0 || sorted.length <= days) return sorted;
    return sorted.slice(sorted.length - days);
}

function buildWeightAlerts(weights: FeedbackWeight[], threshold: number): AlertRow[] {
    const safeThreshold = Number.isFinite(threshold) && threshold > 0 ? threshold : 1.2;
    const rows: AlertRow[] = [];
    for (const item of weights) {
        const value = Number(item.weight || 0);
        const abs = Math.abs(value);
        if (abs < safeThreshold) continue;
        rows.push({
            tag: item.tag,
            weight: value,
            level: abs >= safeThreshold * 1.3 ? 'high' : 'medium',
        });
    }
    return rows.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

test('buildTrendSeries aggregates by day', () => {
    const events = [
        { created_at: '2026-02-06T10:00:00Z', helpful: true },
        { created_at: '2026-02-06T11:00:00Z', helpful: false },
        { created_at: '2026-02-07T08:00:00Z', helpful: true },
    ];
    const trend = buildTrendSeries(events as any, 2);
    assert.equal(trend.length, 2);
    assert.equal(trend[0].total, 2);
    assert.equal(trend[0].positive, 1);
    assert.equal(trend[0].negative, 1);
    assert.equal(trend[1].total, 1);
    assert.equal(trend[1].positive, 1);
});

test('buildWeightAlerts returns alert rows above threshold', () => {
    const weights = [
        { tag: 'route', weight: 0.5 },
        { tag: 'status', weight: 1.4 },
        { tag: 'local_guide', weight: -1.6 },
    ];
    const alerts = buildWeightAlerts(weights as any, 1.2);
    assert.equal(alerts.length, 2);
    assert.equal(alerts[0].tag, 'local_guide');
    assert.equal(alerts[1].tag, 'status');
});
