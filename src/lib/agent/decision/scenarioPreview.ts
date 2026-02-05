import type { IntentProfile } from './types';

export interface ScenarioInput {
    intent: IntentProfile;
    toolResults: any[];
    locale: string;
}

function extractTransitStatus(toolResults: any[]) {
    const status = toolResults.find(r => r?.toolName === 'getTransitStatus')?.result;
    return status || null;
}

function extractRouteSummary(toolResults: any[]) {
    const route = toolResults.find(r => r?.toolName === 'findRoute')?.result;
    if (!route?.routes || route.routes.length === 0) return null;
    return route.routes[0];
}

export function buildScenarioPreview(params: ScenarioInput) {
    const { intent, toolResults, locale } = params;
    const isZh = locale.startsWith('zh');

    const status = extractTransitStatus(toolResults);
    const route = extractRouteSummary(toolResults);
    const stationInfo = toolResults.find(r => r?.toolName === 'getStationInfo')?.result?.station;
    const weather = toolResults.find(r => r?.toolName === 'getWeather')?.result?.weather;
    const knowledge = toolResults.find(r => r?.toolName === 'retrieveStationKnowledge')?.result?.results;

    // Default fallback
    let preview = isZh ? '接下來可能需要轉乘或等待，請預留緩衝時間。' : 'Expect a transfer or short wait; keep a time buffer.';
    let risk = isZh ? '若現場人潮較多，移動時間可能拉長。' : 'Crowd levels may increase transfer time.';
    let next = isZh ? '請依現場指標前往下一段月台/出口。' : 'Follow station signs to the next platform/exit.';

    if (intent.intent === 'status' && status) {
        const statusText = status?.status || 'unknown';
        preview = isZh ? `列車狀態為 ${statusText}，可能需要改線或等待。` : `Service status is ${statusText}; prepare to reroute or wait.`;
        risk = isZh ? '延誤可能擴大，請保留時間緩衝。' : 'Delays may expand; keep extra buffer time.';
        next = isZh ? '查看站內看板並準備替代路線。' : 'Check station boards and prepare an alternate route.';
    }

    if (intent.intent === 'route' && route) {
        const transfers = route.transfers ?? 0;
        const duration = route.totalDuration ?? null;
        preview = isZh
            ? `接下來會有 ${transfers} 次轉乘，路程約 ${duration ?? '一段時間'} 分鐘。`
            : `Expect ${transfers} transfers; total travel time around ${duration ?? 'a while'} minutes.`;
        risk = isZh ? '轉乘站可能擁擠，行走時間會增加。' : 'Transfer stations may be crowded, increasing walking time.';
        next = isZh ? '先確認下一站月台方向，避免走錯出口。' : 'Confirm the next platform direction to avoid wrong exits.';
    }

    if (weather?.condition) {
        const condition = String(weather.condition || '').toLowerCase();
        if (condition.includes('rain') || condition.includes('雨') || condition.includes('storm')) {
            risk = isZh ? '天氣不佳，地面步行可能受影響。' : 'Bad weather may slow outdoor walking.';
            next = isZh ? '優先走地下通道或有遮蔽路線。' : 'Prefer covered paths or underground passages.';
        }
    }

    if (stationInfo?.facilities) {
        const hasElevator = Boolean(stationInfo.facilities?.hasElevator);
        if ((intent.userStateTags.includes('stroller') || intent.userStateTags.includes('wheelchair')) && !hasElevator) {
            risk = isZh ? '此站電梯不足，無障礙動線可能繞行。' : 'Elevator availability is limited; accessible routes may detour.';
            next = isZh ? '請詢問站務員或改走最近的無障礙出口。' : 'Ask staff or follow the nearest accessible exit.';
        }
    }

    if (intent.userStateTags.includes('rush')) {
        preview = isZh ? `你很趕時間，轉乘可能需要快步移動。` : `You are in a rush; transfers may require brisk walking.`;
        risk = isZh ? '若遇到人潮或指標不清，可能延誤。' : 'Crowds or unclear signage may cause delays.';
        next = isZh ? '抵達後立即找最近的電扶梯/電梯。' : 'Find the nearest escalator/elevator immediately on arrival.';
    }

    if (intent.userStateTags.includes('stroller') || intent.userStateTags.includes('wheelchair')) {
        risk = isZh ? '無障礙動線可能需要繞行。' : 'Accessible routes may require detours.';
        next = isZh ? '請優先使用電梯並遵循無障礙指標。' : 'Use elevators and follow accessibility signs.';
    }

    if (Array.isArray(knowledge) && knowledge.length > 0) {
        preview = isZh ? '接下來可能遇到站內動線陷阱或擁擠區域。' : 'You may encounter a station layout trap or crowded area next.';
        risk = isZh ? '部分通道容易迷路，請留意指標。' : 'Some corridors are confusing; watch signage carefully.';
    }

    return { preview, risk, next };
}
