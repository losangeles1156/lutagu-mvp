
import { RouteOption } from './types/RoutingTypes';
import { L1NodeProfile } from './types/L1Profile';
import { L3StationGraph } from './types/L3Topology';
import { L3GraphBuilder } from './L3GraphBuilder';

/**
 * Route Synthesizer (The "Experience Layer")
 * 
 * Bridges the gap between L4 Physical Routes (Rails) and L3 User Experience (Pain).
 */
export class RouteSynthesizer {

    private static isUenoStep(step?: { stationId?: string; text?: string } | null): boolean {
        if (!step) return false;
        const stationId = String(step.stationId || '');
        if (stationId.includes('Ueno')) return true;
        const text = String(step.text || '');
        return /Ueno|上野|上野駅/i.test(text);
    }

    static async synthesize(routes: RouteOption[], profile: L1NodeProfile, isHoliday: boolean = false, locale: string = 'en'): Promise<RouteOption[]> {
        // console.log(`[RouteSynthesizer] Analyzing ${routes.length} routes. Holiday: ${isHoliday}, Intent: ${profile.intent.capabilities.join(', ')}`);

        // Phase 6 Optimization: Batch Load Graphs
        const stationsToLoad = new Set<string>();

        // Dynamic Scan: Find all transfer stations in all routes
        routes.forEach(route => {
            for (let i = 0; i < route.steps.length - 1; i++) {
                const step = route.steps[i];
                if (step.kind === 'transfer') {
                    const prevStep = route.steps[i - 1];
                    const nextStep = route.steps[i + 1];
                    const isUenoTransfer = this.isUenoStep(step) || this.isUenoStep(prevStep) || this.isUenoStep(nextStep);
                    if (isUenoTransfer) {
                        stationsToLoad.add("odpt.Station:JR-East.Yamanote.Ueno");
                    }
                }
            }
        });

        // Load Graphs Map
        const graphMap = new Map<string, L3StationGraph>();
        for (const stationId of stationsToLoad) {
            if (stationId.includes("Ueno")) {
                graphMap.set(stationId, L3GraphBuilder.buildUenoGraph());
            }
        }

        const synthesized = await Promise.all(routes.map(async (route) => {
            let totalPainScore = 0;
            const transfers: any[] = [];

            // 1. Scan for Transfers
            for (let i = 0; i < route.steps.length - 1; i++) {
                const step = route.steps[i];

                if (step.kind === 'transfer') {
                    const prevTrain = route.steps[i - 1];
                    const nextTrain = route.steps[i + 1];

                    if (prevTrain?.kind === 'train' && nextTrain?.kind === 'train') {
                        const isUenoTransfer = (
                            this.isUenoStep(step) ||
                            this.isUenoStep(prevTrain) ||
                            this.isUenoStep(nextTrain)
                        );

                        if (isUenoTransfer) {
                            const graph = graphMap.get("odpt.Station:JR-East.Yamanote.Ueno");
                            if (graph) {
                                const painCheck = this.calculateTransferPain(graph, profile, isHoliday);
                                totalPainScore += painCheck.score;
                                transfers.push({ station: 'Ueno', score: painCheck.score, notes: painCheck.reasons });
                            }
                        }
                    }
                }
            }

            // 3. Score Fusion
            const timeScore = route.duration || 0;
            const finalScore = timeScore + totalPainScore;

            // [Phase 8.2] Semantic Reasoning Insights (Localized)
            const insights: Array<{ type: 'pro' | 'con' | 'warning', text: string, icon?: string }> = [];

            // Helper for simple translation
            const t = (key: string) => {
                const map: any = {
                    'avoided_crowd': { en: 'Avoided High Traffic', ja: '混雑回避', "zh-TW": '避開人潮' },
                    'luggage_friendly': { en: 'Luggage Friendly', ja: '荷物に優しい', "zh-TW": '適合攜帶行李' },
                    'stairs_warning': { en: 'Contains Stairs', ja: '階段あり', "zh-TW": '途經樓梯' },
                    'diff_transfer': { en: 'Difficult Transfer', ja: '乗り換え困難', "zh-TW": '轉乘複雜' }
                };
                return map[key]?.[locale] || map[key]?.['en'] || key;
            };

            // Insight: Crowd Avoidance
            if (totalPainScore < 10 && profile.intent.capabilities.includes('CROWD_HI')) {
                insights.push({ type: 'pro', text: t('avoided_crowd'), icon: 'UserCheck' });
            }

            // Insight: Luggage Friendly
            if (profile.intent.capabilities.includes('LUGGAGE')) {
                if (totalPainScore < 20) {
                    insights.push({ type: 'pro', text: t('luggage_friendly'), icon: 'Briefcase' });
                } else {
                    insights.push({ type: 'warning', text: t('stairs_warning'), icon: 'AlertTriangle' });
                }
            }

            // Insight: Transfers
            transfers.forEach(tItem => {
                if (tItem.score > 15) {
                    insights.push({ type: 'con', text: `${t('diff_transfer')} (${tItem.station})`, icon: 'GitGraph' });
                }
            });

            return {
                ...route,
                _score: finalScore,
                _debug_pain: totalPainScore,
                _debug_notes: transfers,
                insights
            };
        }));

        // 4. Re-rank
        return synthesized.sort((a: any, b: any) => a._score - b._score);
    }

    /**
     * Calculate Pain Index for a transfer using L3 Graph.
     */
    private static calculateTransferPain(graph: L3StationGraph, profile: L1NodeProfile, isHoliday: boolean): { score: number, reasons: string[] } {
        let pain = 0;
        const reasons: string[] = [];

        const hasLuggage = profile.intent.capabilities.includes('LUGGAGE');
        const hasStroller = profile.intent.capabilities.includes('STROLLER');

        if (isHoliday && (graph.stationId.includes("Ueno") || graph.stationId.includes("Tokyo"))) {
            pain += 15;
            reasons.push('Holiday Crowds (High)');
        }

        graph.edges.forEach(edge => {
            // Logic restored
            if (edge.tags.includes('stairs')) {
                let cost = 10;
                if (hasLuggage) {
                    cost *= 3.0; // Huge penalty
                    reasons.push('Avoid Stairs (Luggage)');
                } else if (hasStroller) {
                    cost *= 5.0; // Blocker
                    reasons.push('Avoid Stairs (Stroller)');
                }
                if (hasLuggage || hasStroller) {
                    pain += cost;
                }
                // No need to call `t` here as these are internal debug reasons effectively, 
                // BUT insights (user facing) are generated in synthesize() based on Score/Profile.
            }

            if (edge.tags.includes('NARROW')) {
                if (hasLuggage) {
                    pain += 20;
                    reasons.push('Narrow Corridor');
                }
            }

        });

        if (hasLuggage && reasons.length > 0) {
            pain += 30; // Global penalty if any issues found
        }

        return { score: pain, reasons: [...new Set(reasons)] };
    }
}
