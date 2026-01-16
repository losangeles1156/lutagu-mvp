
import { supabase } from '@/lib/supabase';

export type FareInfo = {
    ticket: number;
    ic: number;
    child_ticket: number;
    child_ic: number;
};

/**
 * Get fare between two stations.
 * Returns null if no direct fare is found (requires transfer calculation or missing data).
 */
export async function getFare(fromStationId: string, toStationId: string): Promise<FareInfo | null> {
    const { data, error } = await supabase
        .from('fares')
        .select('ticket_fare, ic_card_fare, child_ticket_fare, child_ic_card_fare')
        .eq('from_station_id', fromStationId)
        .eq('to_station_id', toStationId)
        .single();

    if (error || !data) {
        return null;
    }

    return {
        ticket: data.ticket_fare,
        ic: data.ic_card_fare,
        child_ticket: data.child_ticket_fare,
        child_ic: data.child_ic_card_fare
    };
}

/**
 * Get all possible destinations and fares from a starting station.
 */
export async function getFaresFrom(fromStationId: string) {
    const { data, error } = await supabase
        .from('fares')
        .select('*')
        .eq('from_station_id', fromStationId);

    if (error) {
        console.error('Error fetching fares:', error);
        return [];
    }

    return data;
}
