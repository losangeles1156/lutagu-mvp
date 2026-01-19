/**
 * 響應式設計斷點定義
 */

// 斷點數值
export const BREAKPOINTS = {
  MOBILE: 768,      // ≤768px 為手機
  TABLET: 1024,     // 769-1024px 為平板
  DESKTOP: 1025,    // >1024px 為桌機
} as const;

// 裝置類型
export const DEVICE_TYPES = {
  MOBILE: 'mobile',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

// UI 狀態機狀態類型
export type UIStateType =
  | 'login'
  | 'fullscreen'
  | 'collapsed_desktop'
  | 'collapsed_mobile'
  | 'explore';

// 面板尺寸配置
export const PANEL_SIZES = {
  COLLAPSED_DESKTOP: {
    MIN_WIDTH: 280,
    MAX_WIDTH: 400,
    DEFAULT_WIDTH_PERCENT: 25,
  },
  COLLAPSED_MOBILE: {
    MIN_HEIGHT: 200,
    MAX_HEIGHT: 400,
    DEFAULT_HEIGHT_PERCENT: 30,
  },
  EXPLORE_MAP_PERCENT: 90,
} as const;

// 動畫持續時間 (毫秒)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 450,
} as const;

// 檢查當前裝置類型
export function getDeviceType(windowWidth: number): DeviceType {
  if (windowWidth <= BREAKPOINTS.MOBILE) {
    return DEVICE_TYPES.MOBILE;
  } else if (windowWidth <= BREAKPOINTS.TABLET) {
    return DEVICE_TYPES.TABLET;
  }
  return DEVICE_TYPES.DESKTOP;
}

// 檢查是否為手機
export function isMobile(windowWidth: number): boolean {
  return windowWidth <= BREAKPOINTS.MOBILE;
}

// 檢查是否為平板
export function isTablet(windowWidth: number): boolean {
  return windowWidth > BREAKPOINTS.MOBILE && windowWidth <= BREAKPOINTS.TABLET;
}

// 檢查是否為桌機
export function isDesktop(windowWidth: number): boolean {
  return windowWidth > BREAKPOINTS.TABLET;
}

// 根據狀態和裝置類型計算對話面板尺寸
export function getChatPanelDimensions(
  uiState: UIStateType,
  isMobile: boolean
): { width: string; height: string; position: 'fixed' | 'relative' } {
  if (uiState === 'fullscreen' || uiState === 'login') {
    return {
      width: '100%',
      height: '100%',
      position: 'fixed',
    };
  }

  if (uiState === 'explore') {
    return {
      width: isMobile ? '100%' : '60px',
      height: isMobile ? '60px' : '100%',
      position: 'fixed',
    };
  }

  if (uiState === 'collapsed_desktop') {
    const width = Math.min(
      PANEL_SIZES.COLLAPSED_DESKTOP.MAX_WIDTH,
      window.innerWidth * (PANEL_SIZES.COLLAPSED_DESKTOP.DEFAULT_WIDTH_PERCENT / 100)
    );
    return {
      width: `${width}px`,
      height: '100%',
      position: 'relative',
    };
  }

  if (uiState === 'collapsed_mobile') {
    const height = Math.min(
      PANEL_SIZES.COLLAPSED_MOBILE.MAX_HEIGHT,
      window.innerHeight * (PANEL_SIZES.COLLAPSED_MOBILE.DEFAULT_HEIGHT_PERCENT / 100)
    );
    return {
      width: '100%',
      height: `${height}px`,
      position: 'relative',
    };
  }

  return {
    width: '100%',
    height: '100%',
    position: 'fixed',
  };
}
