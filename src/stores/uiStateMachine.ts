import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UIStateType } from '@/lib/constants/breakpoints';
import { Action } from '@/components/chat/ActionCard';

// 對話訊息類型
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: Action[];
  isLoading?: boolean;
  feedback?: { score: number; reason?: string };
  timestamp: number;
}

// UI 狀態機 Store 介面
interface UIStateMachineState {
  // 核心狀態
  uiState: UIStateType;

  // 裝置偵測 (同步 localStorage)
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // 對話相關
  messages: ChatMessage[];
  pendingInput: string;
  inputFocus: boolean;

  // 動畫控制
  isAnimating: boolean;
  animationDirection: 'forward' | 'backward' | null;

  // 持久化狀態
  lastState: UIStateType;
  sessionStartTime: number;
  lastMessagesBackup: ChatMessage[]; // 用於狀態恢復

  // Actions
  setUIState: (state: UIStateType) => void;
  transitionTo: (state: UIStateType) => void;

  setDeviceType: (isMobile: boolean, isTablet: boolean, isDesktop: boolean) => void;

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;

  setPendingInput: (input: string) => void;
  setInputFocus: (focus: boolean) => void;

  setAnimating: (isAnimating: boolean, direction?: 'forward' | 'backward') => void;

  resetSession: () => void;
  backupMessages: () => void;
  updateLastMessage: (content: string) => void;
}

// 最大保留訊息數量
const MAX_MESSAGES = 50;

// 預設狀態
const getDefaultState = (): Pick<UIStateMachineState, 'uiState' | 'lastState' | 'sessionStartTime'> => ({
  uiState: 'login',
  lastState: 'login',
  sessionStartTime: Date.now(),
});

// 狀態優先級（用於判斷動畫方向）
function getStatePriority(state: UIStateType): number {
  const priorities: Record<UIStateType, number> = {
    login: 0,
    fullscreen: 1,
    collapsed_desktop: 2,
    collapsed_mobile: 2,
    explore: 3,
  };
  return priorities[state];
}

export const useUIStateMachine = create<UIStateMachineState>()(
  persist(
    (set, get) => ({
      ...getDefaultState(),

      // 裝置偵測預設值
      isMobile: false,
      isTablet: false,
      isDesktop: true,

      // 對話狀態
      messages: [],
      pendingInput: '',
      inputFocus: false,

      // 動畫狀態
      isAnimating: false,
      animationDirection: null,

      // 訊息備份
      lastMessagesBackup: [],

      // 設置 UI 狀態
      setUIState: (state: UIStateType) => set({ uiState: state }),

      // 狀態轉換 (帶動畫標記)
      transitionTo: (state: UIStateType) => {
        const currentState = get().uiState;
        if (typeof window !== 'undefined') {
          console.log(`[uiStateMachine] transition: ${currentState} -> ${state}`);
        }
        const direction = getStatePriority(state) > getStatePriority(currentState)
          ? 'forward'
          : 'backward';

        set({
          uiState: state,
          lastState: state,
          isAnimating: true,
          animationDirection: direction,
        });

        // 動畫完成後清除標記
        setTimeout(() => {
          set({ isAnimating: false, animationDirection: null });
        }, 350);
      },

      // 設置裝置類型
      setDeviceType: (isMobile: boolean, isTablet: boolean, isDesktop: boolean) => {
        set({ isMobile, isTablet, isDesktop });

        // 如果狀態與裝置類型不符，自動調整
        const currentState = get().uiState;
        if (currentState === 'collapsed_desktop' && isMobile) {
          set({ uiState: 'collapsed_mobile' });
        } else if (currentState === 'collapsed_mobile' && isDesktop) {
          set({ uiState: 'collapsed_desktop' });
        }
      },

      // 添加訊息
      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          timestamp: Date.now(),
        };

        set((state) => ({
          messages: [...state.messages.slice(-MAX_MESSAGES), newMessage],
        }));
      },

      // 清空訊息
      clearMessages: () => set({ messages: [] }),

      // 設置訊息列表
      setMessages: (messages: ChatMessage[]) => {
        set({ messages: messages.slice(-MAX_MESSAGES) });
      },

      // 待發送輸入
      setPendingInput: (input: string) => set({ pendingInput: input }),

      // 輸入框焦點
      setInputFocus: (focus: boolean) => set({ inputFocus: focus }),

      // 動畫狀態
      setAnimating: (isAnimating: boolean, direction?: 'forward' | 'backward') =>
        set({ isAnimating, animationDirection: direction ?? null }),

      // 重置會話
      resetSession: () => {
        set({
          ...getDefaultState(),
          messages: [],
          pendingInput: '',
          inputFocus: false,
          isAnimating: false,
          animationDirection: null,
        });
      },

      // 備份訊息
      backupMessages: () => {
        set((state) => ({
          lastMessagesBackup: [...state.messages],
        }));
      },

      // 更新最後一條訊息 (用於串流)
      updateLastMessage: (content: string) => {
        set((state) => {
          const newMessages = [...state.messages];
          if (newMessages.length > 0) {
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content,
            };
          }
          return { messages: newMessages };
        });
      },
    }),
    {
      name: 'lutagu-ui-state',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      partialize: (state) => ({
        lastState: state.lastState,
        sessionStartTime: state.sessionStartTime,
        messages: state.messages.slice(-MAX_MESSAGES),
        pendingInput: state.pendingInput,
        isMobile: state.isMobile,
        // 注意：不持久化 uiState，讓它根據登入狀態動態決定
      }),
    }
  )
);
if (typeof window !== 'undefined') {
  (window as any).__LUTAGU_UI_STATE__ = useUIStateMachine;
}

// Helper function to check if in collapsed mode
export function isCollapsedState(state: UIStateType): boolean {
  return state === 'collapsed_desktop' || state === 'collapsed_mobile';
}

// Helper function to check if can transition to explore
export function canEnterExploreMode(state: UIStateType): boolean {
  return isCollapsedState(state);
}

// Helper function to get collapsed state for current device
export function getCollapsedState(isMobile: boolean): UIStateType {
  return isMobile ? 'collapsed_mobile' : 'collapsed_desktop';
}

// 初始化狀態的函數（在應用啟動時調用）
export function initializeUIState(): void {
  if (typeof window === 'undefined') return;

  const state = useUIStateMachine.getState();
  const hasMessages = state.messages.length > 0;

  if (hasMessages) {
    // 有保存的對話，恢復到收合狀態
    const targetState = state.isMobile ? 'collapsed_mobile' : 'collapsed_desktop';
    useUIStateMachine.setState({ uiState: targetState });
  } else if (state.uiState !== 'login') {
    // 如果當前狀態不是 login (例如 explore)，保持現狀，不要強行跳回登入頁
    // 這能防止多語系切換時（頁面重載）自動跳回登入頁
    return;
  } else {
    // 檢查 URL，如果是在 /map 或其他內部路徑，不應重置為 login，而是進入預設收合狀態
    if (typeof window !== 'undefined' && window.location.pathname.includes('/map')) {
      const targetState = state.isMobile ? 'collapsed_mobile' : 'collapsed_desktop';
      useUIStateMachine.setState({ uiState: targetState });
      return;
    }

    // 沒有對話且在登入頁，保持登入頁
    useUIStateMachine.setState({ uiState: 'login' });
  }
}
