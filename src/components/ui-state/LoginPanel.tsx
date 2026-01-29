
'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useUIStore } from '@/stores/uiStore';
import { useNodeStore } from '@/stores/nodeStore';
import { useUserStore } from '@/stores/userStore';
import { useMapStore } from '@/stores/mapStore';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, MapPin, Compass, X, Bot, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchNearbyNodes } from '@/lib/api/nodes';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { logger } from '@/lib/utils/logger';

export function LoginPanel() {
  const t = useTranslations('login');
  const tOnboarding = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const { transitionTo, setPendingInput, clearMessages, isMobile } = useUIStateMachine();
  const setAgentConversationId = useUIStore(s => s.setAgentConversationId);
  const setBottomSheetOpen = useUIStore(s => s.setBottomSheetOpen);
  const setNodeActiveTab = useUIStore(s => s.setNodeActiveTab);
  const setDemoMode = useUIStore(s => s.setDemoMode);

  const setMapCenter = useMapStore(s => s.setMapCenter);
  const setCurrentNode = useNodeStore(s => s.setCurrentNode);

  const [isLoading, setIsLoading] = useState(false);

  // 1. 最近節點邏輯
  const handleNearestNode = useCallback(async () => {
    setIsLoading(true);

    // 匿名登入初始化
    let agentUserId = '';
    if (typeof window !== 'undefined') {
      agentUserId = localStorage.getItem('agentUserId') || '';
      if (!agentUserId) {
        agentUserId = globalThis.crypto?.randomUUID?.() ||
          `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('agentUserId', agentUserId);
      }
    }
    useUserStore.setState({ agentUserId });
    setAgentConversationId(null);
    clearMessages();
    setPendingInput('');

    // 定位處理
    const targetState = isMobile ? 'collapsed_mobile' : 'collapsed_desktop';

    if (!navigator.geolocation) {
      // 降級至上野站
      setMapCenter({ lat: 35.7141, lon: 139.7774 });
      setCurrentNode('odpt.Station:TokyoMetro.Ginza.Ueno');
      setNodeActiveTab('live');
      setBottomSheetOpen(true);
      transitionTo(targetState);
      setIsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const center = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setMapCenter(center);

        try {
          // 獲取最近的節點
          const nearby = await fetchNearbyNodes(center.lat, center.lon, 1000);
          if (nearby && nearby.length > 0) {
            const nearest = nearby[0];
            setCurrentNode(nearest.id);
            setNodeActiveTab('live');
            setBottomSheetOpen(true);
          }
        } catch (err) {
          logger.warn('LoginPanel: Failed to fetch nearest node', err);
        }

        transitionTo(targetState);
        setIsLoading(false);
      },
      () => {
        // 定位失敗 -> 上野站
        setMapCenter({ lat: 35.7141, lon: 139.7774 });
        setCurrentNode('odpt.Station:TokyoMetro.Ginza.Ueno');
        setNodeActiveTab('live');
        setBottomSheetOpen(true);
        transitionTo(targetState);
        setIsLoading(false);
      }
    );
  }, [transitionTo, setAgentConversationId, setPendingInput, clearMessages, isMobile, setMapCenter, setCurrentNode, setBottomSheetOpen, setNodeActiveTab]);

  // 2. 先逛逛邏輯
  const handleBrowse = useCallback(() => {
    console.log('[LoginPanel] handleBrowse triggered');
    setAgentConversationId(null);
    clearMessages();
    setPendingInput('');

    const targetState = isMobile ? 'collapsed_mobile' : 'collapsed_desktop';

    if (!navigator.geolocation) {
      console.log('[LoginPanel] Geolocation not available, defaulting to Ueno');
      setMapCenter({ lat: 35.7141, lon: 139.7774 }); // 預設上野
      transitionTo(targetState);
      return;
    }

    console.log('[LoginPanel] Requesting geolocation...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[LoginPanel] Geolocation success');
        const center = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setMapCenter(center);
        transitionTo(targetState);
      },
      () => {
        console.log('[LoginPanel] Geolocation failed/denied, defaulting to Ueno');
        setMapCenter({ lat: 35.7141, lon: 139.7774 }); // 失敗 -> 上野
        transitionTo(targetState);
      },
      { timeout: 3000 }
    );
  }, [transitionTo, setMapCenter, setAgentConversationId, clearMessages, setPendingInput, isMobile]);

  // 3. 演示範例點擊
  const handleDemoClick = useCallback((node: string, demoId: string) => {
    // 進入 AI 對話演示模式 (fullscreen)
    setPendingInput('');
    setDemoMode(true, demoId);
    transitionTo('fullscreen');
    router.push(`/${locale}/?node=${node}&sheet=1&tab=lutagu&demo=${encodeURIComponent(demoId)}`);
  }, [transitionTo, setPendingInput, setDemoMode, router, locale]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 overflow-y-auto"
    >
      {/* Top Right UI Overlay */}
      <div className="absolute top-6 right-6 z-[60]">
        <LanguageSwitcher />
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-10"
      >
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-indigo-600 to-indigo-800 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200">
          <span className="text-3xl">🦌</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">LUTAGU</h1>
        <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Tokyo Transit AI</p>
      </motion.div>

      {/* 演示範例區域 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md mb-10 space-y-3"
      >
        <h3 className="text-[11px] font-black text-indigo-600 mb-2 uppercase tracking-wider flex items-center gap-2 px-2">
          <Sparkles size={14} className="animate-pulse" />
          {tOnboarding('askTitle')}
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'overtourism', text: tOnboarding('tips.overtourism'), node: 'odpt.Station:TokyoMetro.Ginza.Asakusa' },
            { id: 'disruption', text: tOnboarding('tips.disruption'), node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo' },
            { id: 'accessibility', text: tOnboarding('tips.accessibility'), node: 'odpt.Station:JR-East.Yamanote.Ueno' }
          ].map((tip) => (
            <button
              key={tip.id}
              onClick={() => handleDemoClick(tip.node, tip.id)}
              className="w-full text-left p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-black uppercase tracking-wider">
                  {tOnboarding(`issues.${tip.id}`)}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-700 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2">{tip.text}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 熱門樞紐區域 (新增) */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-md mb-10 space-y-3"
      >
        <h3 className="text-[11px] font-black text-slate-400 mb-2 uppercase tracking-wider px-2">
          {tOnboarding('hubTitle')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'ueno', name: tOnboarding('hubs.ueno'), node: 'odpt.Station:TokyoMetro.Ginza.Ueno', color: 'from-orange-400 to-orange-500' },
            { id: 'asakusa', name: tOnboarding('hubs.asakusa'), node: 'odpt.Station:TokyoMetro.Ginza.Asakusa', color: 'from-red-500 to-red-600' },
            { id: 'akihabara', name: tOnboarding('hubs.akihabara'), node: 'odpt.Station:TokyoMetro.Hibiya.Akihabara', color: 'from-gray-500 to-gray-600' },
            { id: 'tokyo', name: tOnboarding('hubs.tokyo'), node: 'odpt.Station:TokyoMetro.Marunouchi.Tokyo', color: 'from-red-500 to-red-600' }
          ].map((hub) => (
            <button
              key={hub.id}
              onClick={() => {
                // 直接導航至該節點，不開啟對話演示
                setMapCenter(null); // Let map auto-center on node
                setCurrentNode(hub.node);
                setNodeActiveTab('lutagu'); // Open L4 functionality tab
                setBottomSheetOpen(true);
                transitionTo(isMobile ? 'collapsed_mobile' : 'collapsed_desktop');
              }}
              className="group relative overflow-hidden p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${hub.color}`} />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors pl-2">{hub.name}</span>
                <Compass size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* 主操作按鈕 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-md grid grid-cols-2 gap-4"
      >
        <button
          onClick={handleNearestNode}
          disabled={isLoading}
          className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-900 text-white rounded-[32px] shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
        >
          <MapPin size={24} className="text-indigo-400" />
          <span className="text-sm font-black">{tOnboarding('enableLocation')}</span>
        </button>

        <button
          onClick={handleBrowse}
          data-testid="browse-first-btn"
          className="flex flex-col items-center justify-center gap-2 py-6 bg-white text-slate-600 rounded-[32px] border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
        >
          <Compass size={24} className="text-slate-400" />
          <span className="text-sm font-black">{tOnboarding('browseFirst')}</span>
        </button>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 text-center"
      >
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          LUTAGU v3.0 • Empowering Transit
        </p>
        <div className="mt-3 text-[10px] font-bold text-slate-400">
          <span>{t('privacyNote')}</span>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link href={`/${locale}/terms`} className="text-slate-500 hover:text-slate-700 underline underline-offset-2">
              Terms
            </Link>
            <Link href={`/${locale}/privacy`} className="text-slate-500 hover:text-slate-700 underline underline-offset-2">
              Privacy
            </Link>
            <Link href={`/${locale}/data-licenses`} className="text-slate-500 hover:text-slate-700 underline underline-offset-2">
              Data & Licenses
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LoginPanel;
