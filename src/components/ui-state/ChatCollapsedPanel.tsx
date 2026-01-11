'use client';

import { useCallback, useRef, useEffect, useState, type MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStateMachine, type ChatMessage } from '@/stores/uiStateMachine';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useAppStore } from '@/stores/appStore';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  X,
  ChevronUp,
  Send,
  Maximize2,
  RotateCcw
} from 'lucide-react';
import { ParsedMessageContent } from '../chat/ParsedMessageContent';

const MAX_INPUT_LENGTH = 500;

interface ChatCollapsedPanelProps {
  onExpand: () => void;
  onClose: () => void;
}

export function ChatCollapsedPanel({ onExpand, onClose }: ChatCollapsedPanelProps) {
  const tChat = useTranslations('chat');
  const tCommon = useTranslations('common');

  const { deviceType } = useDeviceType();
  const isMobile = deviceType === 'mobile';

  const {
    uiState,
    messages,
    pendingInput,
    isAnimating,
    transitionTo,
    addMessage,
    updateLastMessage,
    setPendingInput,
    clearMessages,
    backupMessages
  } = useUIStateMachine();

  const {
    difyConversationId,
    setDifyConversationId,
    difyUserId,
    currentNodeId,
    userContext,
    userProfile,
  } = useAppStore();

  // 使用 'core' 作為 zone 預設值
  const zoneValue = 'core';

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDesktopCollapsed = uiState === 'collapsed_desktop';
  const isMobileCollapsed = uiState === 'collapsed_mobile';

  // 恢復待發送輸入
  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      setPendingInput('');
      inputRef.current?.focus();
    }
  }, [pendingInput, setPendingInput]);

  // 滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message to Hybrid Agent
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };
    addMessage(userMsg);
    setInput('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Prepare messages for the orchestrator (stateless)
      const clientMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content
      }));
      // Append the new message
      clientMessages.push({ role: 'user', content: text });

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: clientMessages,
          nodeId: currentNodeId || '',
          inputs: {
            locale: 'zh-TW', // Force traditional chinese or use locale from props
            user_profile: userProfile || 'general'
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = 'API Error';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || 'Unknown API Error';
        } catch (e) {
          errorMsg = await response.text();
        }
        throw new Error(errorMsg || `Server Error (${response.status})`);
      }
      if (!response.body) throw new Error('No response body');

      // Add placeholder for assistant response
      addMessage({
        role: 'assistant',
        content: '',
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedAnswer += chunk;

        // Update the last message in the store
        updateLastMessage(accumulatedAnswer);
      }

    } catch (error) {
      console.error('Chat Error', error);
      // If error occurs during stream, we might want to append error or replace content
      // For now, if we have content, keep it but append error? Or just replace if empty?
      // Simple fallback:
      addMessage({
        role: 'assistant',
        content: `⚠️ ${(error as any).message || tChat('connectionError') || '連線失敗，請稍後再試'}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, updateLastMessage, currentNodeId, userProfile, isLoading, tChat, messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
  }, [input, isLoading, sendMessage]);

  const handleRestart = useCallback(() => {
    backupMessages();
    clearMessages();
    setDifyConversationId(null);
  }, [backupMessages, clearMessages, setDifyConversationId]);

  const handleExploreMode = useCallback(() => {
    transitionTo('explore');
  }, [transitionTo]);

  // 處理進入探索模式
  const handlePanelClick = useCallback((e: MouseEvent) => {
    // 只有在點擊面板背景或標題時才觸發，避免影響輸入框和按鈕
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.panel-header')) {
      transitionTo('explore');
    }
  }, [transitionTo]);

  // 桌面版收合面板
  if (isDesktopCollapsed) {
    return (
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        onClick={handlePanelClick}
        className="h-full flex flex-col bg-white border-l border-slate-200 shadow-lg cursor-pointer"
        style={{ width: '25%', minWidth: '280px', maxWidth: '400px' }}
      >
        {/* Header */}
        <div className="panel-header shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm">
              ✨
            </div>
            <span className="font-black text-sm text-slate-900">LUTAGU AI</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestart}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={tChat('restart')}
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onExpand}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={tChat('maximize')}
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={tCommon('close')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageSquare size={32} className="mb-2 opacity-50" />
              <p className="text-sm font-medium">開始對話</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[85%] p-3 rounded-xl text-sm
                  ${msg.role === 'user'
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg'
                    : 'bg-slate-50 text-slate-800 rounded-bl-lg border border-slate-100'
                  }
                `}>
                  {msg.isLoading ? (
                    <div className="flex space-x-1 items-center h-4">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="shrink-0 p-3 border-t border-slate-100">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tChat('placeholder')}
              maxLength={MAX_INPUT_LENGTH}
              className="flex-1 px-3 py-2 bg-slate-50 border-0 rounded-lg 
                focus:ring-2 focus:ring-indigo-500 focus:bg-white
                text-sm font-medium placeholder:text-slate-400 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all active:scale-95 min-w-[44px] min-h-[44px]
                flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  // 手機版收合面板 (底部彈出)
  if (isMobileCollapsed) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={handlePanelClick}
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] rounded-t-[24px] overflow-hidden cursor-pointer"
        style={{ height: '30%', maxHeight: '300px' }}
      >
        {/* Drag Handle */}
        <div
          className="w-full h-8 flex items-center justify-center cursor-pointer"
          onClick={onExpand}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="panel-header shrink-0 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center text-white text-xs">
              ✨
            </div>
            <span className="font-bold text-sm text-slate-900">LUTAGU AI</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExploreMode}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="探索地圖"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={tCommon('close')}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2 scrollbar-hide">
          {messages.slice(-5).map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`
                max-w-[80%] px-3 py-2 rounded-xl text-xs
                ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-br-lg'
                  : 'bg-slate-50 text-slate-800 rounded-bl-lg'
                }
              `}>
                {msg.isLoading ? (
                  <div className="flex space-x-1 items-center h-3">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed line-clamp-2">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="shrink-0 p-3 border-t border-slate-50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tChat('placeholder')}
              maxLength={MAX_INPUT_LENGTH}
              className="flex-1 px-3 py-2 bg-slate-50 border-0 rounded-lg 
                focus:ring-2 focus:ring-indigo-500 focus:bg-white
                text-sm font-medium placeholder:text-slate-400 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg
                hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all active:scale-95 min-w-[44px] min-h-[44px]
                flex items-center justify-center"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      </motion.div>
    );
  }

  return null;
}

export default ChatCollapsedPanel;
