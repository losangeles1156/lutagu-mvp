
import { TransferInfo } from '../types';

/**
 * 大型樞紐站列表
 * 這些車站規模巨大，站內步行與候車時間顯著高於一般車站。
 */
export const HUB_STATIONS: Record<string, { bufferMinutes: number }> = {
  'Shinjuku': { bufferMinutes: 4 },
  'Tokyo': { bufferMinutes: 5 },
  'Shibuya': { bufferMinutes: 4 },
  'Ikebukuro': { bufferMinutes: 3 },
  'Shinagawa': { bufferMinutes: 3 },
  'Ueno': { bufferMinutes: 3 },
  'Omiya': { bufferMinutes: 3 },
  'Yokohama': { bufferMinutes: 3 },
  'Chiba': { bufferMinutes: 3 },
  'NaritaAirport': { bufferMinutes: 8 },
  'HanedaAirport': { bufferMinutes: 6 }
};

/**
 * 檢查是否為大型樞紐站並返回補償時間
 */
export function getHubBufferMinutes(stationId: string): number {
  for (const [key, value] of Object.entries(HUB_STATIONS)) {
    if (stationId.includes(key)) {
      return value.bufferMinutes;
    }
  }
  return 0;
}

/**
 * 轉乘資料庫
 * 儲存特定車站轉乘的詳細資訊，包含步行距離、垂直設施、站內/站外轉乘等。
 */
export const TRANSFER_DATABASE: Record<string, Record<string, TransferInfo>> = {
  // 都營淺草線 藏前站 (odpt.Station:Toei.Asakusa.Kuramae)
  'odpt.Station:Toei.Asakusa.Kuramae': {
    'odpt.Railway:Toei.Oedo': {
      fromStationId: 'odpt.Station:Toei.Asakusa.Kuramae',
      fromLineId: 'odpt.Railway:Toei.Asakusa',
      toStationId: 'odpt.Station:Toei.Oedo.Kuramae',
      toLineId: 'odpt.Railway:Toei.Oedo',
      walkingDistanceMeters: 270, // 站外轉乘且距離長
      floorDifference: 2,
      verticalMethod: 'mixed',
      complexity: {
        turnCount: 4,
        signageClarity: 2,
        exitCount: 4,
        underConstruction: false
      },
      baseTpi: 60,
      peakHourMultiplier: 1.2,
      expertNotes: {
        traps: ['站外轉乘，需穿過一般道路', '淺草線與大江戶線站體完全分離'],
        hacks: ['行李較多時建議避免在此轉乘']
      }
    }
  },
  // 大江戶線 藏前站 (odpt.Station:Toei.Oedo.Kuramae)
  'odpt.Station:Toei.Oedo.Kuramae': {
    'odpt.Railway:Toei.Asakusa': {
      fromStationId: 'odpt.Station:Toei.Oedo.Kuramae',
      fromLineId: 'odpt.Railway:Toei.Oedo',
      toStationId: 'odpt.Station:Toei.Asakusa.Kuramae',
      toLineId: 'odpt.Railway:Toei.Asakusa',
      walkingDistanceMeters: 270,
      floorDifference: 2,
      verticalMethod: 'mixed',
      complexity: {
        turnCount: 4,
        signageClarity: 2,
        exitCount: 4,
        underConstruction: false
      },
      baseTpi: 60,
      peakHourMultiplier: 1.2
    }
  },
  // 上野站 (JR -> Metro)
  'odpt.Station:JR-East.Yamanote.Ueno': {
    'odpt.Railway:TokyoMetro.Ginza': {
      fromStationId: 'odpt.Station:JR-East.Yamanote.Ueno',
      fromLineId: 'odpt.Railway:JR-East.Yamanote',
      toStationId: 'odpt.Station:TokyoMetro.Ginza.Ueno',
      toLineId: 'odpt.Railway:TokyoMetro.Ginza',
      walkingDistanceMeters: 180,
      floorDifference: 1,
      verticalMethod: 'escalator',
      complexity: {
        turnCount: 2,
        signageClarity: 3,
        exitCount: 12,
        underConstruction: false
      },
      baseTpi: 30,
      peakHourMultiplier: 1.1
    },
    'odpt.Railway:TokyoMetro.Hibiya': {
      fromStationId: 'odpt.Station:JR-East.Yamanote.Ueno',
      fromLineId: 'odpt.Railway:JR-East.Yamanote',
      toStationId: 'odpt.Station:TokyoMetro.Hibiya.Ueno',
      toLineId: 'odpt.Railway:TokyoMetro.Hibiya',
      walkingDistanceMeters: 250,
      floorDifference: 2,
      verticalMethod: 'mixed',
      complexity: {
        turnCount: 3,
        signageClarity: 2,
        exitCount: 12,
        underConstruction: false
      },
      baseTpi: 45,
      peakHourMultiplier: 1.1
    }
  },
  // 新宿站 (JR -> Oedo)
  'odpt.Station:JR-East.Yamanote.Shinjuku': {
    'odpt.Railway:Toei.Oedo': {
      fromStationId: 'odpt.Station:JR-East.Yamanote.Shinjuku',
      fromLineId: 'odpt.Railway:JR-East.Yamanote',
      toStationId: 'odpt.Station:Toei.Oedo.Shinjuku',
      toLineId: 'odpt.Railway:Toei.Oedo',
      walkingDistanceMeters: 350,
      floorDifference: 4,
      verticalMethod: 'escalator',
      complexity: {
        turnCount: 5,
        signageClarity: 2,
        exitCount: 30,
        underConstruction: true
      },
      baseTpi: 70,
      peakHourMultiplier: 1.3
    }
  },
  // 東京站 (JR -> Keiyo)
  'odpt.Station:JR-East.Tokaido.Tokyo': {
    'odpt.Railway:JR-East.Keiyo': {
      fromStationId: 'odpt.Station:JR-East.Tokaido.Tokyo',
      fromLineId: 'odpt.Railway:JR-East.Tokaido',
      toStationId: 'odpt.Station:JR-East.Keiyo.Tokyo',
      toLineId: 'odpt.Railway:JR-East.Keiyo',
      walkingDistanceMeters: 550,
      floorDifference: 3,
      verticalMethod: 'mixed',
      complexity: {
        turnCount: 3,
        signageClarity: 3,
        exitCount: 20,
        underConstruction: false
      },
      baseTpi: 80,
      peakHourMultiplier: 1.1
    }
  },
  // 神田站 (JR Yamanote -> JR Chuo) - 極速轉乘
  'odpt.Station:JR-East.Yamanote.Kanda': {
    'odpt.Railway:JR-East.ChuoRapid': {
      fromStationId: 'odpt.Station:JR-East.Yamanote.Kanda',
      fromLineId: 'odpt.Railway:JR-East.Yamanote',
      toStationId: 'odpt.Station:JR-East.ChuoRapid.Kanda',
      toLineId: 'odpt.Railway:JR-East.ChuoRapid',
      walkingDistanceMeters: 30, // 非常近
      floorDifference: 0,
      verticalMethod: 'escalator',
      complexity: {
        turnCount: 1,
        signageClarity: 3,
        exitCount: 4,
        underConstruction: false
      },
      baseTpi: 10,
      peakHourMultiplier: 1.0
    }
  }
};

/**
 * 判斷是否為站外轉乘
 */
export function isOutOfStationTransfer(fromStationId: string, toLineId: string): boolean {
  const stationInfo = TRANSFER_DATABASE[fromStationId];
  if (!stationInfo) return false;
  const transfer = stationInfo[toLineId];
  if (!transfer) return false;

  // 這裡簡單判斷：跨公司且距離長，或特定標註的轉乘
  if (fromStationId.includes('Kuramae')) return true;
  return transfer.walkingDistanceMeters > 200;
}

/**
 * 獲取精確轉乘距離 (公尺)
 */
export function getTransferDistance(fromStationId: string, toLineId: string): number {
  const stationInfo = TRANSFER_DATABASE[fromStationId];
  if (stationInfo && stationInfo[toLineId]) {
    return stationInfo[toLineId].walkingDistanceMeters;
  }

  // 預設值：站內轉乘約 100m，跨公司約 250m
  if (fromStationId.split('.')[2] === toLineId.split('.')[2]) {
    return 100;
  }
  return 250;
}
