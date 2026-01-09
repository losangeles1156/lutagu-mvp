/**
 * Wait Value Coefficient (WVC) Calculator
 *
 * 等待價值係數計算器
 * 決定用戶應該繼續等待、附近休息、還是改變計畫
 *
 * WVC = (目的地價值 × 時間敏感度) / (等待成本)
 */

import {
  WVCInput,
  WVCResult,
  WVCRecommendation,
  NearbyAmenity,
  WaitEnvironment,
  WeatherCondition,
  DEFAULT_REASONING_CONFIG
} from '../types';

const ENV_MULTIPLIERS: Record<WaitEnvironment, number> = {
  outdoor: 1.5,          // 戶外最辛苦
  indoor_standing: 1.2,  // 室內站著
  indoor_seated: 0.8,    // 室內有座位
  cafe: 0.5              // 咖啡廳最舒適
};

const WEATHER_MULTIPLIERS: Record<WeatherCondition, number> = {
  good: 1.0,
  hot: 1.3,
  cold: 1.3,
  rainy: 1.5
};

function calcDestinationValue(input: WVCInput): number {
  let value = input.destinationUrgency * 100;

  if (input.destinationOpenHours) {
    const now = input.currentTime.getTime();
    const closes = input.destinationOpenHours.closes.getTime();
    const minutesUntilClose = (closes - now) / 60000;

    const estimatedArrivalTime = input.expectedWaitMinutes + 30;

    if (estimatedArrivalTime > minutesUntilClose) {
      value *= 0.1;
    } else if (estimatedArrivalTime > minutesUntilClose - 30) {
      value *= 0.5;
    } else if (estimatedArrivalTime > minutesUntilClose - 60) {
      value *= 0.8;
    }
  }

  return value;
}

function calcWaitCost(input: WVCInput): number {
  let cost = input.expectedWaitMinutes * 2;
  cost *= ENV_MULTIPLIERS[input.waitEnvironment];
  cost *= WEATHER_MULTIPLIERS[input.weather];
  if (input.hasLuggage) {
    cost *= 1.4;
  }
  cost *= (1 + input.userFatigue * 0.5);
  return cost;
}

function findBestAmenity(
  amenities: NearbyAmenity[],
  maxWalkMinutes: number = 5
): NearbyAmenity | null {
  const eligible = amenities.filter(a => a.walkMinutes <= maxWalkMinutes);
  if (eligible.length === 0) return null;

  return eligible.sort((a, b) => {
    if (a.hasSeating !== b.hasSeating) {
      return a.hasSeating ? -1 : 1;
    }
    return b.vibeMatchScore - a.vibeMatchScore;
  })[0];
}

function enrichWithAreaDNA(
  recommendation: WVCRecommendation,
  reasoning: string,
  areaVibeTags: string[],
  locale: string = 'zh'
): { reasoning: string; comfortMessage?: string } {
  let enrichedReasoning = reasoning;
  let comfortMessage: string | undefined;

  const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';

  if (recommendation === 'rest_nearby') {
    if (areaVibeTags.includes('CAFE') || areaVibeTags.includes('CAFE_CULTURE')) {
      const additions: Record<string, string> = {
        zh: '。這一帶咖啡廳很多，正好可以體驗一下在地氛圍',
        ja: '。この辺りはカフェが多いので、地元の雰囲気を楽しめます',
        en: '. This area has many cafes, perfect for experiencing local atmosphere'
      };
      enrichedReasoning += additions[lang];
    } else if (areaVibeTags.includes('SHOPPING') || areaVibeTags.includes('RETRO_SHOPPING')) {
      const additions: Record<string, string> = {
        zh: '。可以逛逛附近的商店街，說不定有意外收穫',
        ja: '。近くの商店街を散策してみてください。思わぬ発見があるかも',
        en: '. Browse the nearby shopping streets, you might find something unexpected'
      };
      enrichedReasoning += additions[lang];
    } else if (areaVibeTags.includes('BUSINESS') || areaVibeTags.includes('OFFICE')) {
      const additions: Record<string, string> = {
        zh: '。商業區的便利商店設備齊全，可以先休息充電',
        ja: '。ビジネス街のコンビニは設備が整っています。休憩・充電にどうぞ',
        en: '. Business district convenience stores are well-equipped for rest and charging'
      };
      enrichedReasoning += additions[lang];
    }
  }

  if (recommendation === 'divert') {
    if (areaVibeTags.includes('FOOD') || areaVibeTags.includes('GOURMET') || areaVibeTags.includes('RAMEN')) {
      const messages: Record<string, string> = {
        zh: '既然來了，不如就在這附近吃個飯吧——這裡可是美食激戰區！',
        ja: 'せっかくですから、この辺でご飯はいかがですか？グルメ激戦区ですよ！',
        en: 'Since you\'re here, why not grab a meal? This is a foodie hotspot!'
      };
      comfortMessage = messages[lang];
    } else if (areaVibeTags.includes('NIGHTLIFE') || areaVibeTags.includes('ENTERTAINMENT')) {
      const messages: Record<string, string> = {
        zh: '這一帶夜生活豐富，不妨改變計畫探索一下？',
        ja: 'この辺りはナイトライフが充実しています。予定を変えて探索してみては？',
        en: 'This area has vibrant nightlife. Why not change plans and explore?'
      };
      comfortMessage = messages[lang];
    } else if (areaVibeTags.includes('CULTURE') || areaVibeTags.includes('TEMPLE') || areaVibeTags.includes('HISTORY')) {
      const messages: Record<string, string> = {
        zh: '這個區域充滿歷史文化，何不趁機走走看看？',
        ja: 'この辺りは歴史と文化に溢れています。この機会に散策してみては？',
        en: 'This area is rich in history and culture. Take the opportunity to explore!'
      };
      comfortMessage = messages[lang];
    }
  }

  return { reasoning: enrichedReasoning, comfortMessage };
}

export function calcWaitValue(
  input: WVCInput,
  locale: string = 'zh'
): WVCResult {
  const destinationValue = calcDestinationValue(input);
  const waitCost = calcWaitCost(input);
  const coefficient = destinationValue / Math.max(waitCost, 1);

  let recommendation: WVCRecommendation;
  let reasoning: string;
  let suggestedAction: WVCResult['suggestedAction'] | undefined;

  const thresholds = DEFAULT_REASONING_CONFIG.wvcThresholds;
  const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';

  if (coefficient >= thresholds.waitRecommended) {
    recommendation = 'wait';
    const reasons: Record<string, string> = {
      zh: '目的地價值高，建議耐心等待',
      ja: '目的地の価値が高いです。辛抱強くお待ちください',
      en: 'Destination value is high, recommend waiting patiently'
    };
    reasoning = reasons[lang];
  } else if (coefficient >= thresholds.restNearbyRange[0]) {
    const bestAmenity = findBestAmenity(input.nearbyAmenities);

    if (bestAmenity) {
      recommendation = 'rest_nearby';
      const reasons: Record<string, string> = {
        zh: `等待時間較長，建議先到 ${bestAmenity.name} 休息`,
        ja: `待ち時間が長いです。先に ${bestAmenity.name} で休憩してはいかがですか`,
        en: `Wait time is long, consider resting at ${bestAmenity.name} first`
      };
      reasoning = reasons[lang];
      suggestedAction = {
        type: bestAmenity.type,
        location: bestAmenity.name,
        duration: Math.max(input.expectedWaitMinutes - 10, 15)
      };
    } else {
      recommendation = 'wait';
      const reasons: Record<string, string> = {
        zh: '建議在站內等待，但可考慮到便利商店補給',
        ja: '駅内でおお待ちいただき、コンビニで補給するのもお勧めです',
        en: 'Recommend waiting at station, consider restocking at convenience store'
      };
      reasoning = reasons[lang];
    }
  } else {
    recommendation = 'divert';
    const reasons: Record<string, string> = {
      zh: '等待成本過高，建議改變計畫或搭乘計程車',
      ja: '待つコストが高すぎます。計画変更またはタクシーをお勧めします',
      en: 'Wait cost too high, recommend changing plans or taking taxi'
    };
    reasoning = reasons[lang];
    suggestedAction = {
      type: 'taxi',
      deepLink: 'https://go.mo-t.com/'
    };
  }

  const { reasoning: enrichedReasoning, comfortMessage } = enrichWithAreaDNA(
    recommendation,
    reasoning,
    input.areaVibeTags,
    locale
  );

  return {
    coefficient: Math.round(coefficient * 100) / 100,
    recommendation,
    reasoning: enrichedReasoning,
    suggestedAction,
    comfortMessage
  };
}

export function shouldAdviseToRest(
  waitMinutes: number,
  weather: WeatherCondition,
  hasLuggage: boolean,
  fatigue: number
): boolean {
  let cost = waitMinutes * 2;
  cost *= WEATHER_MULTIPLIERS[weather];
  if (hasLuggage) cost *= 1.4;
  cost *= (1 + fatigue * 0.5);
  return cost > 60;
}

export function generateCoffeeBreakSuggestion(
  stationId: string,
  waitMinutes: number,
  nearbyAmenities: NearbyAmenity[],
  areaVibeTags: string[],
  locale: string = 'zh'
): {
  shouldSuggest: boolean;
  message: string;
  amenity?: NearbyAmenity;
} {
  const lang = locale.startsWith('ja') ? 'ja' : locale.startsWith('en') ? 'en' : 'zh';

  if (waitMinutes < 15) {
    return { shouldSuggest: false, message: '' };
  }

  const cafe = nearbyAmenities.find(a =>
    a.type === 'cafe' && a.walkMinutes <= 5 && a.hasSeating
  );

  if (!cafe) {
    const alternative = findBestAmenity(nearbyAmenities);
    if (alternative) {
      const messages: Record<string, string> = {
        zh: `等待約 ${waitMinutes} 分鐘，不如先到 ${alternative.name} 坐一下？`,
        ja: `約${waitMinutes}分的待ち時間です。${alternative.name}で一休みしてはいかがですか？`,
        en: `About ${waitMinutes} min wait. How about resting at ${alternative.name}?`
      };
      return {
        shouldSuggest: true,
        message: messages[lang],
        amenity: alternative
      };
    }
    return { shouldSuggest: false, message: '' };
  }

  let message: string;

  if (areaVibeTags.includes('CAFE') || areaVibeTags.includes('CAFE_CULTURE')) {
    const messages: Record<string, string> = {
      zh: `🕐 等待約 ${waitMinutes} 分鐘。這裡可是咖啡激戰區，不如去 ${cafe.name} 品嚐一杯？`,
      ja: `🕐 約${waitMinutes}分待ちです。ここはカフェ激戦区！${cafe.name}で一杯いかがですか？`,
      en: `🕐 About ${waitMinutes} min wait. This is a cafe hotspot! How about a cup at ${cafe.name}?`
    };
    message = messages[lang];
  } else {
    const messages: Record<string, string> = {
      zh: `🕐 等待約 ${waitMinutes} 分鐘，建議先到 ${cafe.name} 休息一下`,
      ja: `🕐 約${waitMinutes}分待ちです。先に${cafe.name}で休憩してはいかがですか`,
      en: `🕐 About ${waitMinutes} min wait. Consider resting at ${cafe.name} first`
    };
    message = messages[lang];
  }

  return {
    shouldSuggest: true,
    message,
    amenity: cafe
  };
}
