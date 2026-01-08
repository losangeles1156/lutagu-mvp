'use client';

import { useState, useEffect, useCallback } from 'react';
import { BREAKPOINTS } from '@/lib/constants/breakpoints';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface UseDeviceTypeReturn {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  windowWidth: number;
  windowHeight: number;
  orientation: 'portrait' | 'landscape';
}

/**
 * 偵測當前裝置類型的 Hook
 * 會持續監控視窗大小變化並更新狀態
 */
export function useDeviceType(): UseDeviceTypeReturn {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [windowWidth, setWindowWidth] = useState<number>(1024);
  const [windowHeight, setWindowHeight] = useState<number>(768);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');

  const updateDeviceInfo = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setWindowWidth(width);
    setWindowHeight(height);
    
    // 判斷裝置類型
    let newDeviceType: DeviceType;
    if (width <= BREAKPOINTS.MOBILE) {
      newDeviceType = 'mobile';
    } else if (width <= BREAKPOINTS.TABLET) {
      newDeviceType = 'tablet';
    } else {
      newDeviceType = 'desktop';
    }
    setDeviceType(newDeviceType);
    
    // 判斷螢幕方向
    setOrientation(width < height ? 'portrait' : 'landscape');
  }, []);

  useEffect(() => {
    // 初始化
    updateDeviceInfo();

    // 監聽視窗大小變化
    const handleResize = () => {
      updateDeviceInfo();
    };

    // 監聽螢幕方向變化 (適用於移動設備)
    const handleOrientationChange = () => {
      updateDeviceInfo();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateDeviceInfo]);

  return {
    deviceType,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    windowWidth,
    windowHeight,
    orientation,
  };
}

/**
 * 監聽特定斷點變化的 Hook
 */
export function useBreakpoint(breakpoint: number): boolean {
  const [isAbove, setIsAbove] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth > breakpoint : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsAbove(window.innerWidth > breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isAbove;
}

/**
 * 監聽行動裝置斷點 (768px)
 */
export function useMobile(): boolean {
  return useBreakpoint(BREAKPOINTS.MOBILE);
}

/**
 * 監聽平板斷點 (1024px)
 */
export function useTablet(): boolean {
  return useBreakpoint(BREAKPOINTS.TABLET);
}

/**
 * 監聽桌機斷點 (1025px)
 */
export function useDesktop(): boolean {
  return useBreakpoint(BREAKPOINTS.DESKTOP);
}
