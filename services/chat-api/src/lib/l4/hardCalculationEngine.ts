import { MatchedStrategyCard, EvaluationContext } from '@/types/lutagu_l4';
import { odptClient } from '@/lib/odpt/client';

export class L4HardCalculationEngine {

    /**
     * Evaluates the current context against hard data (Real-time API, Timetable).
     * Unlike the DecisionEngine (which uses static rules), this engine fetches live data.
     */
    async evaluate(context: EvaluationContext): Promise<MatchedStrategyCard[]> {
        const cards: MatchedStrategyCard[] = [];
        const { lineIds, currentDate, locale, stationId } = context;

        // 1. Real-time Train Status Check (Delay/Suspension)
        if (lineIds && lineIds.length > 0) {
            await this.checkTrainStatus(lineIds, locale, cards);
        }

        // 2. Last Train Check (Real ODPT Timetable)
        // Only run late at night (23:00 - 01:00) to save API calls
        const hour = currentDate.getHours();
        if (hour >= 23 || hour < 2) {
            await this.checkLastTrain(stationId, lineIds, currentDate, locale, cards);
        }

        // 3. Weather check (Open-Meteo)
        await this.checkWeatherAdvisory(stationId, locale, cards);

        return cards;
    }

    private async checkTrainStatus(lineIds: string[], locale: string, cards: MatchedStrategyCard[]) {
        try {
            const railways = lineIds.filter(id => id.startsWith('odpt.Railway:') || id.startsWith('odpt:Railway:'));
            if (railways.length > 0) {
                const targetRailway = railways[0];
                const operator = this.guessOperator(targetRailway);

                if (operator) {
                    const infoList = await odptClient.getTrainInformation(operator, targetRailway);

                    for (const info of infoList) {
                        if (info['odpt:trainInformationStatus'] && info['odpt:trainInformationStatus'] !== '平常運転' && info['odpt:trainInformationStatus'] !== '平時運行') {
                            const text = info['odpt:trainInformationText']?.[locale === 'zh-TW' ? 'ja' : (locale === 'en' ? 'en' : 'ja')] || 'Delay detected';

                            cards.push({
                                id: `odpt-delay-${info['@id']}`,
                                type: 'warning',
                                priority: 99,
                                icon: '⚠️',
                                title: locale === 'en' ? 'Train Status Alert' : '運行情報 (Live)',
                                description: text,
                                _debug_reason: `HardCalc: Detected abnormal status on ${targetRailway}`
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[HardCalc] Failed to fetch train info', e);
        }
    }

    private async checkLastTrain(stationId: string, lineIds: string[] | undefined, currentDate: Date, locale: string, cards: MatchedStrategyCard[]) {
        if (!stationId || !lineIds || lineIds.length === 0) return;

        try {
            const targetRailway = lineIds.find(id => id.startsWith('odpt:Railway:'));
            if (!targetRailway) return;

            const operator = this.guessOperator(targetRailway);
            if (!operator) return;

            // Fetch Timetable for this station
            // Note: In MVP we check the first available timetable.
            // In prod we should check the timetable specifically for the direction the user wants.
            // Since we don't know direction, we just warn if ANY last train is close.
            const timetables = await odptClient.getStationTimetable(stationId, operator);

            if (!timetables || timetables.length === 0) return;

            // Find the latest departure time among all directions
            let globalLastDepartureTime = 0;
            let lastTrainDest = '';

            for (const tt of timetables) {
                const departures = tt['odpt:stationTimetableObject'];
                if (!departures || departures.length === 0) continue;

                // Sort by time just in case, though usually sorted
                // Departure times are strings "HH:mm". We need to handle "24:xx", "25:xx"
                const lastDep = departures[departures.length - 1];
                const timeStr = lastDep['odpt:departureTime']; // "24:35"

                if (timeStr) {
                    const minutes = this.parseTimeStr(timeStr);
                    if (minutes > globalLastDepartureTime) {
                        globalLastDepartureTime = minutes;
                        lastTrainDest = lastDep['odpt:destinationStation']?.[0] || '';
                    }
                }
            }

            // Compare with current time
            const currentMinutes = currentDate.getHours() * 60 + currentDate.getMinutes();
            // Adjust current time for late night (e.g. 00:30 needs to be treated as 24:30)
            const adjustedCurrent = currentMinutes < 180 ? currentMinutes + 1440 : currentMinutes;

            const diff = globalLastDepartureTime - adjustedCurrent;

            if (diff > 0 && diff <= 45) { // Warning if within 45 mins
                const destName = lastTrainDest.split('.').pop() || '';
                const msg = locale === 'en'
                    ? `Last train to ${destName} departs in ${diff} min.`
                    : `往 ${destName} 方向的末班車將在 ${diff} 分鐘後發車。`;

                cards.push({
                    id: 'hard-calc-last-train-real',
                    type: 'warning',
                    priority: 95,
                    icon: '🌙',
                    title: locale === 'en' ? 'Last Train Imminent' : '末班車注意',
                    description: msg,
                    _debug_reason: `HardCalc: Last train at ${Math.floor(globalLastDepartureTime / 60)}:${globalLastDepartureTime % 60} (Diff: ${diff}m)`
                });
            }

        } catch (e) {
            console.error('[HardCalc] Last Train check failed', e);
        }
    }

    private async checkWeatherAdvisory(stationId: string | undefined, locale: string, cards: MatchedStrategyCard[]) {
        try {
            // 1. Get Station Coordinates dynamically
            let lat = 35.6895; // Default Tokyo
            let lon = 139.6917;
            let isMainland = true;

            if (stationId) {
                const stations = await odptClient.getStation(stationId);
                if (stations && stations.length > 0) {
                    const s = stations[0];
                    if (s['geo:lat'] && s['geo:long']) {
                        lat = s['geo:lat'];
                        lon = s['geo:long'];

                        // 2. Region Check (Mainland Only)
                        // Lat > 34.8 excludes Izu Islands (Oshima is ~34.7)
                        // This covers Tokyo (23 wards/Tama), Kanagawa, Chiba mainland.
                        if (lat < 34.8) {
                            isMainland = false;
                        }
                    }
                }
            }

            if (!isMainland) {
                // Skip weather check for islands
                return;
            }

            // 3. Fetch Weather from Open-Meteo
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code&timezone=Asia%2FTokyo`;

            const res = await fetch(url, { next: { revalidate: 300 } } as any);
            if (!res.ok) return;

            const data = await res.json();
            const code = data.current?.weather_code;

            // WMO Codes for Rain/Snow
            // 51-67: Drizzle/Rain
            // 71-77: Snow
            // 80-82: Showers
            // 95-99: Thunderstorm
            const isBadWeather = (code >= 51 && code <= 67) || (code >= 71 && code <= 99);

            if (isBadWeather) {
                cards.push({
                    id: 'hard-calc-weather-rain',
                    type: 'tip', // 'tip' implies helpful advice, secondary priority
                    priority: 75,
                    icon: '☔',
                    title: locale === 'en' ? 'Rainy Day Mode' : '雨天移動建議',
                    description: locale === 'en'
                        ? 'It looks like rain. Consider using underground passages or indoor routes.'
                        : '目前東京地區有雨。建議優先利用地下通道或百貨連通口移動，避免淋濕。',
                    _debug_reason: `HardCalc: Weather WMO code = ${code}`
                });
            }

        } catch (e) {
            console.error('[HardCalc] Weather check failed', e);
        }
    }

    private parseTimeStr(timeStr: string): number {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    }

    private guessOperator(lineId: string): string | undefined {
        if (lineId.includes('TokyoMetro')) return 'odpt:Operator:TokyoMetro';
        if (lineId.includes('Toei')) return 'odpt:Operator:Toei';
        if (lineId.includes('JR-East')) return 'odpt:Operator:JR-East';
        return undefined;
    }
}

export const hardCalculationEngine = new L4HardCalculationEngine();
