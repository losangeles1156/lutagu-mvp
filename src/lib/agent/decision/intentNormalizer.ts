import { classifyQuestion, extractRouteEndpointsFromText } from '@/lib/l4/assistantEngine';
import type { SupportedLocale } from '@/lib/l4/assistantEngine';
import type { IntentProfile } from './types';

function detectUrgency(text: string): IntentProfile['urgency'] {
    const t = text.toLowerCase();
    if (/趕時間|急|急著|急忙|time is short|in a hurry|rush|急いで/.test(text)) return 'high';
    if (/快點|快速|asap|soon/.test(t)) return 'medium';
    return 'low';
}

function detectUserStateTags(text: string): string[] {
    const tags = new Set<string>();
    if (/行李|luggage|suitcase|スーツケース/.test(text)) tags.add('luggage');
    if (/嬰兒車|stroller|ベビーカー/.test(text)) tags.add('stroller');
    if (/輪椅|wheelchair|車椅子/.test(text)) tags.add('wheelchair');
    if (/趕時間|急|急いで|rush|in a hurry/.test(text)) tags.add('rush');
    if (/第一次|初めて|first time/.test(text)) tags.add('first_time');
    if (/怕迷路|不熟|anxious|不安/.test(text)) tags.add('anxiety');
    if (/轉乘多|換車多|transfer/.test(text)) tags.add('transfer_complexity');
    return Array.from(tags);
}

function detectConstraints(text: string): string[] {
    const constraints: string[] = [];
    if (/無障礙|輪椅|嬰兒車|電梯/.test(text)) constraints.push('accessibility');
    if (/少走|少走路|walking/.test(text.toLowerCase())) constraints.push('min_walk');
    if (/省錢|便宜|cheap|budget/.test(text.toLowerCase())) constraints.push('budget');
    if (/最快|最短|fastest/.test(text.toLowerCase())) constraints.push('fastest');
    return constraints;
}

function mapIntentKind(text: string, locale: SupportedLocale): IntentProfile['intent'] {
    const base = classifyQuestion(text, locale).kind;
    if (base === 'route') return 'route';
    if (base === 'status') return 'status';
    if (base === 'amenity') return 'amenity';
    if (base === 'fare') return 'fare';
    if (base === 'timetable') return 'timetable';

    if (/附近|周邊|nearby|poi|景點|美食|餐廳|shopping|shop/.test(text)) return 'poi';
    if (/攻略|陷阱|建議|tips|hacks|知識/.test(text)) return 'knowledge';
    return 'unknown';
}

export function normalizeIntent(text: string, locale: SupportedLocale): IntentProfile {
    const intent = mapIntentKind(text, locale);
    const urgency = detectUrgency(text);
    const userStateTags = detectUserStateTags(text);
    const constraints = detectConstraints(text);

    const endpoints = extractRouteEndpointsFromText(text);
    const goal = endpoints?.destinationText || undefined;

    return {
        intent,
        urgency,
        goal,
        constraints,
        userStateTags,
    };
}
