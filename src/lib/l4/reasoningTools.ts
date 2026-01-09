import { tool } from 'ai';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { EvacuationDecision, UserEvacuationProfile } from '../l5/types';
import { getTransferTPI } from './algorithms/TransferPainIndex';
import { calcCascadeDelayRisk } from './algorithms/CascadeDelayRisk';
import { calcWaitValue } from './algorithms/WaitValueCoefficient';
import { evaluateEvacuationNeed } from '../l5/decisionEngine';
import { JourneyLeg, WVCInput, NearbyAmenity, CDRResult, WVCResult } from './types';
import { WeatherCondition } from './types';

// =============================================================================
// Helper: Data Fetching
// =============================================================================

async function getL1VibeTags(stationId: string): Promise<string[]> {
    const { data } = await supabaseAdmin
        .from('nodes')
        .select('tags')
        .eq('id', stationId)
        .maybeSingle();
    return data?.tags || [];
}

async function getNearbyAmenities(stationId: string): Promise<NearbyAmenity[]> {
    const { data } = await supabaseAdmin
        .from('l1_places')
        .select('*')
        .eq('station_node_id', stationId)
        .limit(10);

    if (!data) return [];

    return data.map((place: any) => ({
        type: place.type?.toLowerCase() || 'other',
        name: place.name || 'Unknown',
        nameLocalized: { ...place.name_i18n },
        walkMinutes: 5, // Mock distance if missing
        hasSeating: true, // Optimistic default
        hasWifi: place.attributes?.wifi || false,
        hasPowerOutlet: place.attributes?.power || false,
        vibeTags: place.tags || [],
        vibeMatchScore: 0.8
    }));
}

// =============================================================================
// L4/L5 Reasoning Tools
// =============================================================================

export const reasoningTools = {
    /**
     * TPI (Transfer Pain Index)
     * Calculates the difficulty of a transfer.
     */
    calculate_tpi: tool({
        description: '計算轉乘辛苦指數 (TPI)。當用戶詢問「轉乘會不會很累」、「需要走很久嗎」或涉及老人/行李時必須調用。',
        inputSchema: z.object({
            fromStationId: z.string().describe('Starting station ID'),
            toLineId: z.string().describe('Target line ID (e.g., odpt.Railway:TokyoMetro.Ginza)'),
            userContext: z.object({
                hasLuggage: z.boolean().optional(),
                isWheelchair: z.boolean().optional(),
                isStroller: z.boolean().optional(),
                isElderly: z.boolean().optional()
            }).optional()
        }),
        execute: async ({ fromStationId, toLineId, userContext }) => {
            const result = getTransferTPI(fromStationId, toLineId, {
                userHasLuggage: userContext?.hasLuggage,
                userAccessibilityNeeds: {
                    wheelchair: userContext?.isWheelchair ?? false,
                    stroller: userContext?.isStroller ?? false,
                    elderly: userContext?.isElderly ?? false,
                    visualImpairment: false
                }
            });
            return {
                score: result, // Simple score for now as getTransferTPI returns number
                // Mocking the simplified breakdown since getTransferTPI calls PRESET_TPI which returns a single number
                // For full implementation we would call calcTransferPainIndex with full topology
                recommendation: result > 60 ? '考慮替代路線' : '轉乘可行'
            };
        }
    }),

    /**
     * CDR (Cascade Delay Risk)
     * Evaluates risk of missed connections.
     */
    evaluate_delay_risk: tool({
        description: '評估延誤連鎖風險 (CDR)。當發現某條路線已有延誤，且用戶需要轉乘時調用。',
        inputSchema: z.object({
            currentLine: z.string(),
            delayMinutes: z.number(),
            nextLine: z.string(),
            transferStation: z.string()
        }),
        execute: async ({ currentLine, delayMinutes, nextLine, transferStation }) => {
            // Mock JourneyLeg creation
            const now = new Date();
            const legs: JourneyLeg[] = [
                {
                    fromStation: 'Current',
                    toStation: transferStation,
                    line: currentLine,
                    lineName: currentLine,
                    scheduledDeparture: now,
                    scheduledArrival: new Date(now.getTime() + 15 * 60000), // +15 min
                    currentDelayMinutes: delayMinutes
                },
                {
                    fromStation: transferStation,
                    toStation: 'Destination',
                    line: nextLine,
                    lineName: nextLine,
                    scheduledDeparture: new Date(now.getTime() + 25 * 60000), // +25 min (10 min transfer buffer)
                    scheduledArrival: new Date(now.getTime() + 40 * 60000),
                    currentDelayMinutes: 0
                }
            ];

            const result = calcCascadeDelayRisk(legs);
            return result;
        }
    }),

    /**
     * WVC (Wait Value Coefficient)
     * Finds good waiting spots.
     */
    find_waiting_spots: tool({
        description: '計算等待價值 (WVC) 並推薦等待場所。當需要等待超過 15 分鐘、或是因延誤/天氣無法移動時調用。',
        inputSchema: z.object({
            stationId: z.string(),
            waitTimeMinutes: z.number(),
            currentWeather: z.enum(['good', 'rainy', 'hot', 'cold']).optional()
        }),
        execute: async ({ stationId, waitTimeMinutes, currentWeather }) => {
            const amenities = await getNearbyAmenities(stationId);
            const vibeTags = await getL1VibeTags(stationId);

            const input: WVCInput = {
                destinationUrgency: 0.5, // Default medium urgency
                expectedWaitMinutes: waitTimeMinutes,
                waitEnvironment: 'outdoor', // Assume outdoor if looking for spots
                userFatigue: 0.5,
                hasLuggage: false,
                weather: (currentWeather as WeatherCondition) || 'good',
                currentTime: new Date(),
                nearbyAmenities: amenities,
                areaVibeTags: vibeTags
            };

            const result = calcWaitValue(input);
            return result;
        }
    }),

    /**
     * L5 Safety Check
     * Evaluates evacuation need.
     */
    check_safety: tool({
        description: 'L5 防災安全檢查。當用戶提及「地震」、「颱風」、「大雨」或「避難」時 **必須** 調用。',
        inputSchema: z.object({
            locationId: z.string().describe('Ward code or station ID for location context'),
            userContext: z.object({
                isWheelchair: z.boolean().optional(),
                hasInfant: z.boolean().optional(),
                isElderly: z.boolean().optional(),
                canReadJapanese: z.boolean().optional()
            }).optional()
        }),
        execute: async ({ locationId, userContext }) => {
            // 1. Fetch weather alerts from cache
            const { data: weather } = await supabaseAdmin
                .from('weather_cache')
                .select('*')
                .eq('station_id', locationId)
                .maybeSingle();

            // 2. Build JMAAlertInfo array
            const alerts: any[] = [];
            if (weather?.value?.alert) {
                alerts.push({
                    type: 'heavy_rain' as const,
                    level: 'warning' as const,
                    issuedAt: new Date(),
                    validUntil: undefined,
                    affectedAreas: [locationId, '13000'], // Include Tokyo-wide
                    headline: weather.value.alert || 'Weather Alert',
                    description: 'Alert from weather cache'
                });
            }

            // 3. Build UserEvacuationProfile (with sensible defaults)
            const userProfile: UserEvacuationProfile = {
                mobilityLevel: userContext?.isWheelchair ? 'wheelchair' : 'full',
                hasVisualImpairment: false,
                isPregnant: false,
                isElderly: userContext?.isElderly ?? false,
                hasFamilyWithInfant: userContext?.hasInfant ?? false,
                hasLargeLuggage: false,
                hasCashAvailable: true,
                batteryLevel: 50,
                canReadJapanese: userContext?.canReadJapanese ?? false,
                preferredLocale: 'zh-TW',
                priorities: userContext?.isWheelchair ? ['wheelchair'] : ['general']
            };

            // 4. Call with CORRECT signature: (wardCode, userProfile, alerts)
            const result = await evaluateEvacuationNeed(
                locationId,    // wardCode: string
                userProfile,   // userProfile: UserEvacuationProfile
                alerts         // latestAlerts: JMAAlertInfo[]
            );

            return result;
        }
    })
};
