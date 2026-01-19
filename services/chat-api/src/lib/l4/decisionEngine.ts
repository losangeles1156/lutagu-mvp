import { getJSTTime } from '@/lib/utils/timeUtils';
import {
    ExpertKnowledge,
    KnowledgeTrigger,
    MatchedStrategyCard,
    UserPreferences,
    UserStateKey,
    EvaluationContext
} from '@/types/lutagu_l4';
import { KNOWLEDGE_BASE } from '@/data/stationWisdom';
import { calcWaitValue } from './algorithms/WaitValueCoefficient';
import { WVCInput, WVCResult } from './types';

export class L4DecisionEngine {

    /**
     * Evaluates the Knowledge Base against the user's context to find relevant advice.
     */
    public evaluate(context: EvaluationContext): MatchedStrategyCard[] {
        const { stationId, lineIds = [], userPreferences, currentDate = getJSTTime().date, locale } = context;
        const matches: MatchedStrategyCard[] = [];

        // Helper to get active user state keys
        const activeUserStates = this.extractActiveUserStates(userPreferences);

        for (const rule of KNOWLEDGE_BASE) {
            // Skip if rule is marked to be excluded from cards (Chat only)
            if (rule.excludeFromCards) continue;

            if (this.checkTrigger(rule.trigger, stationId, lineIds, activeUserStates, currentDate)) {

                // Calculate Relevance Score
                let score = rule.priority;

                // [Boost 1] User Context Relevance (+20)
                if (rule.trigger.user_states && rule.trigger.user_states.length > 0) {
                    score += 20;
                }

                // [Boost 2] Station Specificity (+50)
                // Rules tied to a specific station are much more valuable than generic line rules
                if (rule.trigger.station_ids && rule.trigger.station_ids.length > 0) {
                    score += 50;
                }

                // Resolve Localization
                const title = rule.title[locale] || rule.title['en'] || '';
                const description = rule.content[locale] || rule.content['en'] || '';
                const actionLabel = rule.actionLabel ? (rule.actionLabel[locale] || rule.actionLabel['en']) : undefined;

                matches.push({
                    id: rule.id,
                    type: rule.type,
                    icon: rule.icon,
                    title,
                    description,
                    actionLabel,
                    actionUrl: rule.actionUrl,
                    priority: score,
                    knowledgeId: rule.id,
                    _debug_reason: `Matched trigger: ${JSON.stringify(rule.trigger)}`
                });
            }
        }

        // [NEW] Add dynamic WVC-based recommendations if waitMinutes is provided
        if (context.waitMinutes !== undefined && context.waitMinutes > 0) {
            const wvcCard = this.generateWVCCard(context);
            if (wvcCard) {
                matches.push(wvcCard);
            }
        }

        // Sort by priority (descending)
        return matches.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Generates a recommendation card based on Wait Value Coefficient
     */
    private generateWVCCard(context: EvaluationContext): MatchedStrategyCard | null {
        const { waitMinutes, destinationValue, userPreferences, locale } = context;
        if (waitMinutes === undefined) return null;

        const wvcInput: WVCInput = {
            destinationUrgency: (destinationValue || 5) / 10,
            expectedWaitMinutes: waitMinutes,
            waitEnvironment: 'indoor_standing', // Default for MVP
            userFatigue: userPreferences.travel_style.comfort ? 0.7 : 0.3,
            hasLuggage: userPreferences.luggage.large_luggage || userPreferences.luggage.multiple_bags,
            weather: 'good', // Default for MVP
            currentTime: new Date(),
            nearbyAmenities: [], // Empty for now
            areaVibeTags: [] // Empty for now
        };

        const wvcResult = calcWaitValue(wvcInput, locale === 'zh-TW' ? 'zh' : locale);

        // Map WVCRecommendation to icons and titles
        const recommendationMap: Record<string, { icon: string, title: string }> = {
            'wait': {
                icon: '⏳',
                title: locale === 'ja' ? '待機推奨' : locale === 'en' ? 'Wait for Train' : '建議在月台等候'
            },
            'divert': {
                icon: '🚕',
                title: locale === 'ja' ? '代替手段推奨' : locale === 'en' ? 'Alternative Recommended' : '建議考慮替代方案'
            },
            'rest_nearby': {
                icon: '☕',
                title: locale === 'ja' ? '休憩のすすめ' : locale === 'en' ? 'Take a Break' : '建議稍作休息'
            }
        };

        const { icon, title } = recommendationMap[wvcResult.recommendation] || { icon: 'ℹ️', title: 'Recommendation' };

        const card: MatchedStrategyCard = {
            id: `wvc-recommendation-${Date.now()}`,
            type: 'timing',
            icon,
            title,
            description: wvcResult.reasoningLocalized?.[locale === 'zh-TW' ? 'zh' : locale] || wvcResult.reasoning,
            priority: 85, // High priority for real-time timing advice
            _debug_reason: `WVC Score: ${wvcResult.coefficient.toFixed(2)}, Recommendation: ${wvcResult.recommendation}`
        };

        return card;
    }

    /**
     * Core Logic: Does this rule apply?
     */
    private checkTrigger(
        trigger: KnowledgeTrigger,
        stationId: string,
        lineIds: string[],
        activeUserStates: Set<UserStateKey>,
        currentDate: Date
    ): boolean {

        // 1. Station Match (If defined, MUST match)
        if (trigger.station_ids && trigger.station_ids.length > 0) {
            if (!trigger.station_ids.includes(stationId)) {
                return false;
            }
        }

        // 2. Line Match (If defined, MUST match one of the context lines)
        // Logic: If rule applies to Keiyo Line, and user is AT Tokyo Station (context),
        // strictly speaking we need to know if the user IS USING Keiyo Line.
        // For MVP, if line_ids is empty in context, we might be lenient, but V3.0 implies strict context.
        // Let's assume if rule specifies lines, text context MUST include at least one.
        if (trigger.line_ids && trigger.line_ids.length > 0) {
            const hasMatchingLine = trigger.line_ids.some(id => lineIds.includes(id));
            if (!hasMatchingLine) {
                // If context has no line info, we might skip line-specific rules to be safe
                return false;
            }
        }

        // 3. User State Match (If defined, AT LEAST ONE state must be active - OR Logic)
        // e.g. Rule targets [Wheelchair, Stroller] -> User having either one matches.
        if (trigger.user_states && trigger.user_states.length > 0) {
            const hasMatchingState = trigger.user_states.some(state => activeUserStates.has(state));
            if (!hasMatchingState) {
                return false;
            }
        }

        // 4. Time Pattern Match (If defined, current time must match)
        if (trigger.time_patterns && trigger.time_patterns.length > 0) {
            const timeMatch = trigger.time_patterns.some(pattern => this.matchesTimePattern(pattern, currentDate));
            if (!timeMatch) {
                return false;
            }
        }

        return true;
    }

    // Helper to parser MM/DD and check range even across years
    private matchesTimePattern(pattern: string, date: Date): boolean {
        // pattern example: "12/31-01/01"
        if (pattern.includes('-')) {
            const [startStr, endStr] = pattern.split('-');
            // Helper specific for MM/DD format
            const parseMMDD = (str: string, currentYear: number) => {
                const [m, d] = str.split('/').map(Number);
                // Date.UTC creates a UTC timestamp. Since our 'date' from getJSTTime() is technically a UTC-based representation of JST, this lines up.
                return new Date(Date.UTC(currentYear, m - 1, d));
            };

            const currentYear = date.getFullYear();
            const start = parseMMDD(startStr, currentYear);
            let end = parseMMDD(endStr, currentYear);

            // Handle year crossing (e.g. 12/31 to 01/01)
            // If end is before start, assume end is next year
            if (end.getTime() < start.getTime()) {
                end = parseMMDD(endStr, currentYear + 1);
            }

            // Set end to end of day
            end.setUTCHours(23, 59, 59, 999);

            // Check if 'date' is within range.
            // We need to handle the case where 'date' might be Jan 1st, but 'start' is Dec 31st (previous year).
            // If date is Jan 01, and range is 12/31-01/01.
            // With above logic: Start=2026-12-31, End=2027-01-01.
            // Date=2026-01-01. Check fails.
            // We need to check "Current Year" version AND "Last Year" version if we are in Jan.
            // OR simpler: check if date is in range (Start_Year_N, End_Year_N) OR (Start_Year_N-1, End_Year_N-1) if crossing.

            const checkRange = (s: Date, e: Date) => {
                return date.getTime() >= s.getTime() && date.getTime() <= e.getTime();
            };

            if (checkRange(start, end)) return true;

            // Special handling for New Year crossing when current date is early in the year
            if (endStr.startsWith('01/') && date.getMonth() === 0) {
                const prevStart = parseMMDD(startStr, currentYear - 1);
                const prevEnd = parseMMDD(endStr, currentYear);
                prevEnd.setUTCHours(23, 59, 59, 999);
                if (checkRange(prevStart, prevEnd)) return true;
            }

            return false;
        }
        return false;
    }

    /**
     * Helper: Flatten UserPreferences into a Set of keys for easy lookup
     */
    private extractActiveUserStates(prefs: UserPreferences): Set<UserStateKey> {
        const states = new Set<UserStateKey>();

        if (prefs.accessibility.wheelchair) states.add('accessibility.wheelchair');
        if (prefs.accessibility.stroller) states.add('accessibility.stroller');
        if (prefs.accessibility.visual_impairment) states.add('accessibility.visual_impairment');
        if (prefs.accessibility.elderly) states.add('accessibility.elderly');

        if (prefs.luggage.large_luggage) states.add('luggage.large_luggage');
        if (prefs.luggage.multiple_bags) states.add('luggage.multiple_bags');

        if (prefs.travel_style.rushing) states.add('travel_style.rushing');
        if (prefs.travel_style.budget) states.add('travel_style.budget');
        if (prefs.travel_style.comfort) states.add('travel_style.comfort');
        if (prefs.travel_style.avoid_crowd) states.add('travel_style.avoid_crowd');
        if (prefs.travel_style.avoid_rain) states.add('travel_style.avoid_rain');

        if (prefs.companions.with_children) states.add('companions.with_children');
        if (prefs.companions.family_trip) states.add('companions.family_trip');

        return states;
    }
}

// Singleton Instance
export const decisionEngine = new L4DecisionEngine();
