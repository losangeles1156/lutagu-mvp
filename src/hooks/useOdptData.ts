import useSWR from 'swr';
import { OdptStationTimetable, OdptRailwayFare } from '@/lib/odpt/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStationTimetable(operator: string, stationId: string) {
    // Determine type based on ID or passed operator
    // Using the proxy route
    const { data, error, isLoading } = useSWR<OdptStationTimetable[]>(
        stationId && operator
            ? `/api/odpt/proxy?type=odpt:StationTimetable&odpt:station=${stationId}&odpt:operator=${operator}`
            : null,
        fetcher
    );

    return {
        timetables: data || [],
        isLoading,
        isError: error,
    };
}

export function useRailwayFare(operator: string, fromStationId: string) {
    const { data, error, isLoading } = useSWR<OdptRailwayFare[]>(
        fromStationId && operator
            ? `/api/odpt/proxy?type=odpt:RailwayFare&odpt:fromStation=${fromStationId}&odpt:operator=${operator}`
            : null,
        fetcher
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
