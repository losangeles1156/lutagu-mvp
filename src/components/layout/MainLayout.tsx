'use client';

import { useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useUIStateMachine, initializeUIState, isCollapsedState, canEnterExploreMode } from '@/stores/uiStateMachine';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useUIStore } from '@/stores/uiStore';
import { Sparkles, Map as MapIcon, MessageSquare } from 'lucide-react';
import { ResizableLayout } from '@/components/layout/v2/ResizableLayout';

// Lazy load heavy UI state components to reduce TBT
const LoginPanel = dynamic(
  () => import('@/components/ui-state/LoginPanel').then(m => ({ default: m.LoginPanel })),
  { ssr: false }
);
const ChatCollapsedPanel = dynamic(
  () => import('@/components/ui-state/ChatCollapsedPanel').then(m => ({ default: m.ChatCollapsedPanel })),
  { ssr: false }
);

// 常量定義
const MOBILE_BREAKPOINT = 768;
const DESKTOP_COLLAPSED_WIDTH = '25%';
const MOBILE_COLLAPSED_HEIGHT = '30%';

interface MainLayoutProps {
  mapPanel: ReactNode;
  chatPanel: ReactNode;
  bottomBar?: ReactNode;
  header?: ReactNode;
}

export function MainLayout({ mapPanel, chatPanel, bottomBar, header }: MainLayoutProps) {
  const { deviceType, isMobile: isDeviceMobile } = useDeviceType();
  const isMobile = deviceType === 'mobile';

  const {
    uiState,
    transitionTo,
    setDeviceType,
    messages,
    pendingInput,
    setPendingInput,
    backupMessages
  } = useUIStateMachine();

  const { setIsMobile } = useUIStore();
  const tCommon = useTranslations('common');
  const tChat = useTranslations('chat');

  const desktopContainerRef = useRef<HTMLDivElement>(null);

  // 初始化狀態
  useEffect(() => {
    initializeUIState();
  }, []);

  // 同步裝置類型到 Store
  useEffect(() => {
    setDeviceType(
      deviceType === 'mobile',
      deviceType === 'tablet',
      deviceType === 'desktop'
    );
    setIsMobile(isDeviceMobile);
  }, [deviceType, isDeviceMobile, setDeviceType, setIsMobile]);

  // 根據裝置類型自動調整狀態
  useEffect(() => {
    if (uiState === 'collapsed_desktop' && isMobile) {
      transitionTo('collapsed_mobile');
    } else if (uiState === 'collapsed_mobile' && !isMobile) {
      transitionTo('collapsed_desktop');
    }
  }, [isMobile, uiState, transitionTo]);

  // 處理對話展開
  const handleChatExpand = useCallback(() => {
    transitionTo('fullscreen');
  }, [transitionTo]);

  // 處理對話關閉
  const handleChatClose = useCallback(() => {
    // 如果是從全螢幕（演示模式）關閉，清除訊息與會話以進入「全新對話」狀態
    if (uiState === 'fullscreen') {
      useUIStateMachine.setState({ messages: [] });
      useUIStore.getState().resetAgentConversation();
      useUIStore.setState({ messages: [] }); // Clear messages in uiStore too
    } else {
      backupMessages();
    }
    transitionTo(isMobile ? 'collapsed_mobile' : 'collapsed_desktop');
  }, [isMobile, transitionTo, backupMessages, uiState]);

  // 處理探索模式
  const handleExploreMode = useCallback(() => {
    transitionTo('explore');
  }, [transitionTo]);

  // 處理返回收合狀態
  const handleBackToCollapsed = useCallback(() => {
    transitionTo(isMobile ? 'collapsed_mobile' : 'collapsed_desktop');
  }, [isMobile, transitionTo]);

  // 移除早前的 return <LoginPanel />，改為 overlay 渲染
  // if (uiState === 'login') {
  //   return <LoginPanel />;
  // }


  // 渲染全螢幕對話
  if (uiState === 'fullscreen') {
    if (typeof window !== 'undefined') console.log('[MainLayout] Rendering fullscreen chatPanel');
    return (
      <div className="fixed inset-0 z-[9998] bg-white isolate pointer-events-auto">
        {chatPanel}
      </div>
    );
  }

  // 渲染探索模式
  if (uiState === 'explore') {
    return (
      <div className="flex flex-col h-screen bg-white overflow-hidden">
        {/* Header */}
        {header && (
          <div className="shrink-0 z-20">
            {header}
          </div>
        )}

        {/* Map Panel (90% height) */}
        <div className="relative z-0" style={{ height: '90%' }}>
          {mapPanel}

          {/* Floating Chat Trigger Button */}
          <button
            onClick={handleBackToCollapsed}
            className="absolute bottom-6 right-6 z-30 px-5 py-3
              bg-white text-indigo-600 rounded-2xl shadow-2xl
              flex items-center gap-2 font-bold text-sm
              active:scale-95 transition-all min-h-[56px] border border-indigo-100/50"
          >
            <MessageSquare size={20} className="text-indigo-600" />
            <span>{tChat('aiName')}</span>
          </button>
        </div>

        {/* Bottom Bar (10% height) */}
        <div className="shrink-0 z-20 relative bg-white border-t border-slate-100 flex items-center justify-center" style={{ height: '10%' }}>
          {bottomBar || (
            <div className="text-xs text-slate-400 font-medium">LUTAGU Map Explorer</div>
          )}
        </div>
      </div>
    );
  }

  // 渲染收合狀態 (桌機)
  if (!isMobile) {
    return (
      <div ref={desktopContainerRef} className="flex flex-col h-screen bg-white overflow-hidden">
        {/* Header */}
        {header && (
          <div className="shrink-0 z-20 border-b border-slate-100/50">
            {header}
          </div>
        )}

        {/* [RWD] Resizable Layout Engine */}
        <ResizableLayout
          isMobile={false}
          rightPanelVisible={isCollapsedState(uiState)}
          leftPanel={
            <div className="h-full w-full relative">
              {mapPanel}
              {/* Floating Chat Button (Only when chat is closed) */}
              {!isCollapsedState(uiState) && (
                <button
                  onClick={handleChatClose}
                  className="absolute bottom-6 right-6 z-10 px-6 py-4
                    bg-indigo-600 text-white rounded-2xl shadow-2xl
                    flex items-center gap-2 font-bold text-sm
                    active:scale-95 transition-all min-h-[56px]"
                >
                  <Sparkles size={20} />
                  <span>{tChat('aiName')}</span>
                </button>
              )}
            </div>
          }
          rightPanel={
            <div className="h-full w-full">
              <ChatCollapsedPanel
                onExpand={handleChatExpand}
                onClose={handleChatClose}
              />
            </div>
          }
        />

        {/* Bottom Bar */}
        {bottomBar && (
          <div className="shrink-0 z-20 border-t border-slate-100/50">
            {bottomBar}
          </div>
        )}
        {/* Login Overlay */}
        {uiState === 'login' && <div className="fixed inset-0 z-[100]"><LoginPanel /></div>}
      </div>
    );
  }

  // 渲染收合狀態 (手機)
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden relative">
      {/* Header */}
      {header && (
        <div className="shrink-0 z-20">
          {header}
        </div>
      )}

      {/* Map Panel */}
      <div
        className="flex-1 relative z-0"
        style={{
          paddingBottom: isCollapsedState(uiState) ? MOBILE_COLLAPSED_HEIGHT : '0px'
        }}
      >
        {mapPanel}

        {/* Floating Toggle Button */}
        {!isCollapsedState(uiState) && (
          <button
            onClick={handleChatClose}
            className="absolute bottom-6 right-6 z-10 px-6 py-4
              bg-indigo-600 text-white rounded-2xl shadow-2xl
              flex items-center gap-2 font-bold text-sm
              active:scale-95 transition-all min-h-[56px]"
          >
            <span className="text-xl">🤖</span>
            <span>{tChat('aiName')}</span>
          </button>
        )}
      </div>

      {/* Chat Collapsed Panel (Bottom Sheet) */}
      <AnimatePresence>
        {isCollapsedState(uiState) && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-30"
            style={{ height: MOBILE_COLLAPSED_HEIGHT, maxHeight: '300px' }}
          >
            <ChatCollapsedPanel
              onExpand={handleChatExpand}
              onClose={handleChatClose}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      {bottomBar && (
        <div className="shrink-0 z-40 relative bg-white border-t border-slate-100/50 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
          {bottomBar}
        </div>
      )}
      {/* Login Overlay */}
      {uiState === 'login' && <div className="fixed inset-0 z-[100]"><LoginPanel /></div>}
    </div>
  );
}

export default MainLayout;
