
import { ITool, IToolContext } from './types';
import { AgentLevel } from '../core/types';
import { supabase } from '@/lib/supabase';
import { odptClient } from '@/lib/odpt/client';
import { getLiveWeather } from '@/lib/weather/service';
import { getTrainStatus } from '@/lib/odpt/service';

// L2 Tool: Weather Check
export class WeatherTool implements ITool {
    id = 'weather_check';
    name = 'Weather Check';
    description = 'Get current weather conditions for Tokyo';
    requiredLevel = AgentLevel.L2_LIVE;

    async execute(params: {}, context: IToolContext): Promise<any> {
        try {
            return await getLiveWeather();
        } catch (e: any) {
            console.error('WeatherTool Error:', e);
            return { error: e.message || 'Weather fetch failed' };
        }
    }
}

// L2 Tool: Train Status Check
export class TrainStatusTool implements ITool {
    id = 'train_status';
    name = 'Train Status';
    description = 'Get operation status for train lines';
    requiredLevel = AgentLevel.L2_LIVE;

    async execute(params: { operator?: string }, context: IToolContext): Promise<any> {
        try {
            const data = await getTrainStatus(params.operator);
            if (!data || data.length === 0) return { status: 'Normal', details: [] };

            // Filter for delays or issues
            const issues = data.filter((d: any) =>
                d['odpt:trainInformationText'] &&
                (d['odpt:trainInformationText'].ja?.includes('遅れ') ||
                    d['odpt:trainInformationText'].en?.includes('Delay'))
            );

            if (issues.length === 0) return { status: 'Normal', checked_lines: data.length };

            return {
                status: 'Issues Found',
                count: issues.length,
                details: issues.map((i: any) => ({
                    line: i['odpt:railway'],
                    text: i['odpt:trainInformationText']
                }))
            };
        } catch (e: any) {
            console.error('TrainStatusTool Error:', e);
            // Mock fallback for testing (if API Key is missing)
            return {
                status: 'Normal',
                note: 'Mock Data (API Key missing or error)',
                checked_lines: ['Ginza Line', 'Hibiya Line', 'JR Yamanote Line']
            };
        }
    }
}

// L2 Tool: Fare Calculator
export class FareTool implements ITool {
    id = 'fare_calculator';
    name = 'Fare Calculator';
    description = 'Calculates fare between two stations';
    requiredLevel = AgentLevel.L2_LIVE;

    async execute(params: { from: string; to: string }, context: IToolContext): Promise<any> {
        try {
            // Use ODPT API directly
            // Note: ODPT API might return many fares. We need to filter.
            const fares = await odptClient.getFares(params.from, params.to);

            if (!fares || fares.length === 0) return { error: 'Fare not found' };

            // Return first match or simplified list
            return fares.map(f => ({
                from: f['odpt:fromStation'],
                to: f['odpt:toStation'],
                ticket: f['odpt:ticketFare'],
                ic: f['odpt:icCardFare'],
                train: f['odpt:trainType']
            }));
        } catch (e: any) {
            console.error('FareTool Error:', e);
            return { error: e.message || 'Fare calculation failed' };
        }
    }
}

// L2 Tool: Timetable Search
export class TimetableTool implements ITool {
    id = 'timetable_search';
    name = 'Timetable Search';
    description = 'Get train timetable for a station';
    requiredLevel = AgentLevel.L2_LIVE;

    async execute(params: { station: string; operator?: string }, context: IToolContext): Promise<any> {
        try {
            const data = await odptClient.getStationTimetable(params.station, params.operator);
            if (!data || data.length === 0) return { error: 'Timetable not found' };

            // Limit output to avoid context overflow
            return data.slice(0, 5).map((t: any) => ({
                line: t['odpt:railway'],
                direction: t['odpt:railDirection'],
                operator: t['odpt:operator']
            }));
        } catch (e: any) {
            console.error('TimetableTool Error:', e);
            return { error: e.message || 'Timetable fetch failed' };
        }
    }
}

// L3 Tool: Facility Search
export class FacilityTool implements ITool {
    id = 'facility_search';
    name = 'Facility Search';
    description = 'Finds specific facilities (lockers, toilets, elevators) in a station';
    requiredLevel = AgentLevel.L3_FACILITY;

    async execute(params: { category?: string }, context: IToolContext): Promise<any> {
        // Query l3_facilities table
        let query = supabase
            .from('l3_facilities')
            .select('type, attributes, location_coords')
            .eq('station_id', context.nodeId);

        if (params.category) {
            query = query.eq('type', params.category);
        }

        const { data, error } = await query;

        if (error) return { error: error.message };
        if (!data || data.length === 0) return { found: false, message: 'No facilities found' };

        return {
            station: context.nodeId,
            found: true,
            count: data.length,
            facilities: data.map(f => ({
                type: f.type,
                attr: f.attributes,
                location: f.location_coords
            }))
        };
    }
}
