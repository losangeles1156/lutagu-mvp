import {
  WeatherAlert,
  TerrainRisk,
  EvacuationSite,
  EvacuationResult,
  EvacuationMode,
  DisasterKind
} from './types';

/**
 * lutagu Disaster Decision Engine
 * 負責處理極端天氣下的避難決策
 */
export class DisasterDecisionEngine {

  /**
   * 核心決策邏輯：根據氣象、地形與專家知識生成避難方案
   */
  public static evaluateEvacuationStrategy(
    alerts: WeatherAlert[],
    terrain: TerrainRisk,
    userLocation: { lat: number; lng: number },
    nearbySites: EvacuationSite[],
    locale: string = 'zh'
  ): EvacuationResult {

    const primaryAlert = this.getHighestPriorityAlert(alerts);
    let mode: EvacuationMode = 'normal';
    let recommendation = '';
    const survivalKit: string[] = ['行動電源', '瓶裝水', '數位地圖離線包'];
    const mobilityOptions: Array<'walking' | 'cycling' | 'taxi' | 'luup'> = ['walking'];

    // 專家知識規則集
    if (primaryAlert) {
      // 1. 暴雨/洪水決策樹
      if (primaryAlert.kind === 'heavy_rain' || primaryAlert.kind === 'flood') {
        if (primaryAlert.level === 'special') {
          if (terrain.isLowLying) {
            mode = 'vertical_evacuation';
            recommendation = locale === 'ja'
              ? '【緊急】浸水のリスクが非常に高いです。地下施設から離れ、3階以上の頑丈な建物へ垂直避難してください。'
              : '【緊急】所在地浸水風險極高。請立即遠離地下設施，移動至 3 樓以上的堅固建築進行「垂直避難」。';
          } else {
            mode = 'evacuate_now';
            recommendation = '請立即前往最近的指定避難所。';
          }
        }
      }

      // 2. 大雪決策規則 (特別針對觀光客優化)
      if (primaryAlert.kind === 'heavy_snow') {
        mode = 'caution';
        recommendation = locale === 'zh'
          ? '大雪警報：東京交通可能全面癱瘓。外國旅客請注意，雪地行走極易滑倒傷亡，且替代交通成本極高，建議取消行程，留在室內。'
          : 'Heavy Snow Warning: Tokyo transport may be paralyzed. Tourists: walking on snow is hazardous; alternative transport costs will spike. Stay indoors.';
        survivalKit.push('暖暖包', '防滑鞋套', '72小時備用糧食');
      }

      // 3. 地震後決策
      if (primaryAlert.kind === 'earthquake') {
        mode = 'evacuate_now';
        recommendation = '地震後請避開玻璃幕牆大樓群，沿「黃金避難路徑」前往開闊地帶。';
      }
    }

    return {
      mode,
      recommendation,
      nearestSites: nearbySites.slice(0, 3), // 回傳最近的三個避難所
      survivalKitChecklist: survivalKit,
      mobilityOptions: mode === 'vertical_evacuation' ? [] : mobilityOptions
    };
  }

  private static getHighestPriorityAlert(alerts: WeatherAlert[]): WeatherAlert | null {
    if (alerts.length === 0) return null;
    const priority = { 'special': 3, 'warning': 2, 'advisory': 1 };
    return alerts.reduce((prev, curr) =>
      (priority[curr.level] > priority[prev.level]) ? curr : prev
    );
  }
}
