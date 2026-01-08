
'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStateMachine } from '@/stores/uiStateMachine';
import { useAppStore } from '@/stores/appStore';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, MapPin, Compass, X, Bot, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchNearbyNodes } from '@/lib/api/nodes';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export function LoginPanel() {
  const t = useTranslations('login');
  const tOnboarding = useTranslations('onboarding');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  
  const { transitionTo, setPendingInput, clearMessages, isMobile } = useUIStateMachine();
  const { 
    setDifyConversationId, 
    setMapCenter, 
    setCurrentNode, 
    setBottomSheetOpen,
    setNodeActiveTab
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);

  // 1. 最近節點邏輯
  const handleNearestNode = useCallback(async () => {
    setIsLoading(true);
    
    // 匿名登入初始化
    let difyUserId = '';
    if (typeof window !== 'undefined') {
      difyUserId = localStorage.getItem('difyUserId') || '';
      if (!difyUserId) {
        difyUserId = globalThis.crypto?.randomUUID?.() || 
          `lutagu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('difyUserId', difyUserId);
      }
    }
    useAppStore.setState({ difyUserId });
    setDifyConversationId(null);
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
          console.warn('[LoginPanel] Failed to fetch nearest node:', err);
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
  }, [transitionTo, setDifyConversationId, setPendingInput, clearMessages, isMobile, setMapCenter, setCurrentNode, setBottomSheetOpen, setNodeActiveTab]);

  // 2. 先逛逛邏輯
  const handleBrowse = useCallback(() => {
    setDifyConversationId(null);
    clearMessages();
    setPendingInput('');
    
    const targetState = isMobile ? 'collapsed_mobile' : 'collapsed_desktop';

    if (!navigator.geolocation) {
      setMapCenter({ lat: 35.7141, lon: 139.7774 }); // 預設上野
      transitionTo(targetState);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setMapCenter(center);
        transitionTo(targetState);
      },
      () => {
        setMapCenter({ lat: 35.7141, lon: 139.7774 }); // 失敗 -> 上野
        transitionTo(targetState);
      }
    );
  }, [transitionTo, setMapCenter, setDifyConversationId, clearMessages, setPendingInput, isMobile]);

  // 3. 演示範例點擊
  const handleDemoClick = useCallback((node: string, text: string) => {
    // 進入 AI 對話演示模式 (fullscreen)
    setPendingInput(text);
    transitionTo('fullscreen');
    router.push(`/${locale}/?node=${node}&sheet=1&tab=lutagu&q=${encodeURIComponent(text)}`);
  }, [transitionTo, setPendingInput, router, locale]);

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
              onClick={() => handleDemoClick(tip.node, tip.text)}
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
      </motion.div>
    </motion.div>
  );
}

export default LoginPanel;
