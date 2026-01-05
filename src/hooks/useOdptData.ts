import useSWR from 'swr';
import { OdptStationTimetable, OdptRailwayFare } from '@/lib/odpt/types';

async function fetchJson(url: string) {
    const res = await fetch(url);
    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(detail || `HTTP ${res.status}`);
    }
    return res.json();
}

export function useStationTimetable(operator: string, stationId: string) {
    // Keep the signature for compatibility; operator is no longer required here.
    const { data, error, isLoading } = useSWR<OdptStationTimetable[]>(
        stationId
            ? `/api/odpt/timetable?station=${encodeURIComponent(stationId)}&raw=1`
            : null,
        fetchJson
    );

    return {
        timetables: data || [],
        isLoading,
        isError: error,
    };
}

export function useRailwayFare(operator: string, fromStationId: string) {
    const { data, error, isLoading } = useSWR<OdptRailwayFare[]>(
        fromStationId
            ? `/api/odpt/fare?from=${encodeURIComponent(fromStationId)}`
            : null,
        async (url: string) => {
            const json = (await fetchJson(url)) as any;
            const fares = Array.isArray(json?.fares) ? json.fares : [];
            return fares.map((f: any, idx: number): OdptRailwayFare => {
                const operatorId = String(f?.operator || '');
                const normalizedOperator = operatorId.startsWith('odpt.Operator:') ? operatorId : `odpt.Operator:${operatorId}`;
                return {
                    '@id': `swr:fare:${json?.source || 'unknown'}:${normalizedOperator}:${String(f?.from || '')}:${String(f?.to || '')}:${idx}`,
                    '@type': 'odpt:RailwayFare',
                    'odpt:operator': normalizedOperator,
                    'odpt:fromStation': String(f?.from || ''),
                    'odpt:toStation': String(f?.to || ''),
                    'odpt:ticketFare': Number(f?.ticket || 0),
                    'odpt:icCardFare': Number(f?.ic || 0),
                };
            });
        }
    );

    return {
        fares: data || [],
        isLoading,
        isError: error,
    };
}

// Helper to guess operator from ID if not provided explicitly
export function guessOperator(id: string): string {
    if (id.includes('Toei')) return 'odpt.Operator:Toei';
    if (id.includes('TokyoMetro')) return 'odpt.Operator:TokyoMetro';
    if (id.includes('JR-East')) return 'odpt.Operator:JR-East';
    if (id.includes('MIR')) return 'odpt.Operator:MIR';
    return '';
}
