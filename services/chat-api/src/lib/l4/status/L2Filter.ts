
import { RouteOption } from '../algorithms/RoutingGraph';

function normalizeOdptRailwayId(input: string): string {
    const s = String(input || '').trim();
    if (!s) return '';
    return s
        .replace(/^odpt:Railway:/, 'odpt.Railway:')
        .replace(/^odpt\.Railway:/, 'odpt.Railway:');
}

function normalizeLineToken(input: string): string {
    return String(input || '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/line$/g, '')
        .replace(/線$/g, '')
        .replace(/^jr/, '')
        .replace(/^jreast/, '')
        .replace(/^tokyometro/, '')
        .replace(/^metro/, '')
        .replace(/^toei/, '')
        .replace(/^keikyu/, '')
        .replace(/^seibu/, '')
        .replace(/^tobu/, '')
        .replace(/^tokyu/, '')
        .replace(/^twr/, '')
        .replace(/^mir/, '')
        .replace(/[\-_.:]/g, '');
}

function mapRailwayOperatorToLineOperator(operatorToken: string): string {
    const raw = String(operatorToken || '').trim();
    if (!raw) return '';

    const token = raw
        .replace(/^odpt[.:]Operator:/i, '')
        .replace(/^operator:/i, '')
        .trim();

    const simple = token.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (
        token === 'JR' ||
        token === 'JR-East' ||
        simple === 'jr' ||
        simple === 'jreast' ||
        raw.toLowerCase().includes('jr-east') ||
        raw.includes('東日本')
    ) {
        return 'JR';
    }

    if (
        token === 'TokyoMetro' ||
        token === 'Metro' ||
        simple === 'tokyometro' ||
        simple === 'metro' ||
        raw.includes('東京メトロ')
    ) {
        return 'Metro';
    }

    if (token === 'Toei' || simple === 'toei' || raw.includes('都営')) return 'Toei';
    if (token === 'Keikyu' || simple === 'keikyu') return 'Keikyu';
    if (token === 'Seibu' || simple === 'seibu') return 'Seibu';
    if (token === 'Tobu' || simple === 'tobu') return 'Tobu';
    if (token === 'Tokyu' || simple === 'tokyu') return 'Tokyu';
    if (token === 'TWR' || simple === 'twr') return 'TWR';
    if (token === 'MIR' || simple === 'mir') return 'MIR';

    return token;
}

function extractOperatorAndLineFromRailwayId(railwayId: string): { operator: string; line: string } | null {
    const norm = normalizeOdptRailwayId(railwayId);
    const m = norm.match(/^odpt\.Railway:([^\.]+)\.(.+)$/);
    if (!m) return null;
    const op = mapRailwayOperatorToLineOperator(m[1]);
    const tail = String(m[2] || '');
    const parts = tail.split('.').filter(Boolean);
    const line = parts.length > 0 ? parts[parts.length - 1] : tail;
    return { operator: op, line };
}

function isSuspendedLineStatus(ls: any): boolean {
    const status = String(ls?.status || '').toLowerCase();
    if (status === 'suspended' || status === 'suspend') return true;
    if (status === 'stopped' || status === 'stop') return true;
    if (status === 'cancelled' || status === 'canceled') return true;
    const msg = String(ls?.message?.ja || ls?.message?.en || ls?.message?.['zh-TW'] || ls?.message?.zh || '').trim();
    const combined = `${status} ${msg}`;
    return /運転見合わせ|運休|終日運休|運転中止|運行停止|見合わせ|ストップ|停駛|停運|停電|suspend|suspended|service\s*suspended|stoppage|stopped|cancel/i.test(combined);
}

export function filterRoutesByL2Status(params: {
    routes: RouteOption[];
    l2Status: any;
}): { routes: RouteOption[]; removed: RouteOption[]; blockedRailwayIds: string[] } {
    const routes = Array.isArray(params.routes) ? params.routes : [];
    const l2 = params.l2Status;
    const lineStatus = Array.isArray(l2?.line_status) ? l2.line_status : [];

    const blockedByOperator = new Map<string, Set<string>>();
    const addBlocked = (operator: string, lineToken: string) => {
        const op = mapRailwayOperatorToLineOperator(String(operator || '')).trim().toLowerCase();
        const line = normalizeLineToken(lineToken);
        if (!op || !line) return;
        const set = blockedByOperator.get(op) || new Set<string>();
        set.add(line);
        blockedByOperator.set(op, set);
    };

    for (const ls of lineStatus) {
        if (!ls || !isSuspendedLineStatus(ls)) continue;

        const op = String(ls.operator || '').trim();
        const lineToken =
            String(ls.line || '').trim() ||
            String(ls?.name?.en || ls?.name?.ja || ls?.name?.['zh-TW'] || ls?.name?.zh || '').trim();
        if (op && lineToken) addBlocked(op, lineToken);

        const railwayId = String(ls.railway_id || ls.railwayId || '').trim();
        if (railwayId) {
            const parsed = extractOperatorAndLineFromRailwayId(railwayId);
            if (parsed) addBlocked(parsed.operator, parsed.line);
        }
    }

    if (blockedByOperator.size === 0) {
        return { routes, removed: [], blockedRailwayIds: [] };
    }

    const isLineBlocked = (operator: string, lineToken: string): boolean => {
        const op = String(operator || '').trim().toLowerCase();
        const token = normalizeLineToken(lineToken);
        if (!op || !token) return false;
        const blockedTokens = blockedByOperator.get(op);
        if (!blockedTokens || blockedTokens.size === 0) return false;
        if (blockedTokens.has(token)) return true;

        for (const b of blockedTokens) {
            if (!b) continue;
            if (token.startsWith(b) || b.startsWith(token)) {
                if (Math.min(token.length, b.length) >= 4) return true;
            }
        }
        return false;
    };

    const kept: RouteOption[] = [];
    const removed: RouteOption[] = [];
    const blockedRailwayIds = new Set<string>();

    for (const r of routes) {
        const stepRailways = (r?.steps || [])
            .map(s => (s && s.kind === 'train' ? String(s.railwayId || '').trim() : ''))
            .filter(Boolean);

        const blocked = stepRailways.some((rid) => {
            const parsed = extractOperatorAndLineFromRailwayId(rid);
            if (!parsed) return false;
            if (isLineBlocked(parsed.operator, parsed.line)) {
                blockedRailwayIds.add(normalizeOdptRailwayId(rid));
                return true;
            }
            return false;
        });

        if (blocked) removed.push(r);
        else kept.push(r);
    }

    return { routes: kept, removed, blockedRailwayIds: Array.from(blockedRailwayIds) };
}
