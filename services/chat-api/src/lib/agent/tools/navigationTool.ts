import type { ToolResult } from '../tools';
import { NavigationService, NavigationGraphResult } from '@/lib/navigation/NavigationService';
import { AgentLevel } from '../core/types';
import { ITool, IToolContext } from './types';

/**
 * Get Navigation Graph Tool
 * 
 * Allows the Agent to retrieve the pedestrian navigation graph for a specific area.
 * This is used for pathfinding, accessibility analysis, and identifying nearby facilities.
 */
export const get_navigation_graph = {
    name: 'get_navigation_graph',
    description: '取得指定座標附近的行人導航路徑圖 (Nodes & Edges)。用於規劃無障礙路徑或分析周邊可達性。',
    inputSchema: {
        type: 'object',
        properties: {
            lat: { type: 'number', description: 'Latitude' },
            lon: { type: 'number', description: 'Longitude' },
            radius: { type: 'number', description: 'Search radius in meters (default 500)' },
            userProfile: { 
                type: 'string', 
                enum: ['general', 'wheelchair', 'stroller'],
                description: 'User profile for filtering (e.g., exclude stairs for wheelchair)' 
            },
            weather: {
                type: 'string',
                enum: ['clear', 'rain', 'snow'],
                description: 'Current weather condition'
            }
        },
        required: ['lat', 'lon']
    },
    execute: async (params: { 
        lat: number; 
        lon: number; 
        radius?: number; 
        userProfile?: string; 
        weather?: string; 
    }): Promise<ToolResult<NavigationGraphResult>> => {
        try {
            const radius = params.radius || 500;
            const userProfile = params.userProfile || 'general';
            const weather = params.weather || 'clear';

            const result = await NavigationService.getPedestrianGraph(
                params.lat, 
                params.lon, 
                radius, 
                userProfile, 
                weather
            );

            return {
                success: true,
                data: result
            };
        } catch (e: any) {
            return {
                success: false,
                error: e.message || String(e)
            };
        }
    }
};

export class NavigationTool implements ITool {
    id = 'navigation_graph';
    name = 'Navigation Graph';
    description = 'Get pedestrian navigation graph near coordinates. Input: { lat, lon, radius?, userProfile?, weather? }';
    requiredLevel = AgentLevel.L3_FACILITY;

    async execute(
        params: { lat: number; lon: number; radius?: number; userProfile?: string; weather?: string },
        context: IToolContext
    ): Promise<NavigationGraphResult | { error: string }> {
        try {
            const radius = params.radius || 500;
            const userProfile = params.userProfile || 'general';
            const weather = params.weather || 'clear';

            return await NavigationService.getPedestrianGraph(params.lat, params.lon, radius, userProfile, weather);
        } catch (e: any) {
            console.error('NavigationTool Error:', e);
            return { error: e?.message || String(e) };
        }
    }
}
