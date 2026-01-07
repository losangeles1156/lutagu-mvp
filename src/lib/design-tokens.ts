/**
 * LUTAGU Design Tokens - TypeScript 版本
 * 統一管理視覺設計系統
 * 
 * 用於 TypeScript 程式碼中的常數引用
 * CSS 版本請參考 src/styles/tokens.css
 */

/* ===========================================
   COLOR SYSTEM - 色彩系統
   =========================================== */

export const colors = {
    primary: {
        50: '#eef2ff',
        100: '#e0e7ff',
        200: '#c7d2fe',
        300: '#a5b4fc',
        400: '#818cf8',
        500: '#6366f1',
        600: '#4f46e5',
        700: '#4338ca',
        800: '#3730a3',
        900: '#312e81',
    },
    slate: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
        950: '#020617',
    },
    emerald: {
        50: '#ecfdf5',
        100: '#d1fae5',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
    },
    amber: {
        50: '#fffbeb',
        100: '#fef3c7',
        500: '#f59e0b',
        600: '#d97706',
    },
    rose: {
        50: '#fff1f2',
        100: '#ffe4e6',
        500: '#f43f5e',
        600: '#e11d48',
    },
    blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        500: '#3b82f6',
        600: '#2563eb',
    },
} as const;

// Semantic color aliases
export const semanticColors = {
    brand: colors.primary[600],
    brandHover: colors.primary[700],
    brandLight: colors.primary[100],
    textPrimary: colors.slate[900],
    textSecondary: colors.slate[500],
    textMuted: colors.slate[400],
    border: colors.slate[200],
    bgPage: colors.slate[50],
    bgCard: '#ffffff',
    success: colors.emerald[600],
    warning: colors.amber[600],
    error: colors.rose[600],
    info: colors.blue[600],
};

/* ===========================================
   TYPOGRAPHY - 字體系統
   =========================================== */

export const fontSize = {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
} as const;

export const fontWeight = {
    normal: 400,
    medium: 500,
    bold: 700,
    black: 900,
} as const;

export const lineHeight = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
} as const;

/* ===========================================
   SPACING - 間距系統
   =========================================== */

export const spacing = {
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
} as const;

/* ===========================================
   BORDER RADIUS - 圓角系統
   =========================================== */

export const borderRadius = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
    full: '9999px',
    // Semantic aliases
    button: '1rem',
    card: '1.5rem',
    input: '0.75rem',
    badge: '0.5rem',
} as const;

/* ===========================================
   SHADOWS - 陰影系統
   =========================================== */

export const shadows = {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    // Semantic aliases
    card: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    button: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    float: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    indigo: '0 4px 14px 0 rgb(79 70 229 / 0.15)',
} as const;

/* ===========================================
   TRANSITIONS - 過渡動畫
   =========================================== */

export const duration = {
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
} as const;

export const ease = {
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const transition = {
    fast: '150ms cubic-bezier(0, 0, 0.2, 1)',
    normal: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0, 0, 0.2, 1)',
} as const;

/* ===========================================
   TOUCH & INTERACTION - 觸控與互動
   =========================================== */

export const touch = {
    minSize: 44,
    idealSize: 48,
    focusRingColor: colors.primary[500],
    focusRingWidth: 2,
    focusRingOffset: 2,
} as const;

/* ===========================================
   Z-INDEX 層級
   =========================================== */

export const zIndex = {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
} as const;

/* ===========================================
   BREAKPOINTS - 響應式斷點
   =========================================== */

export const breakpoints = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
} as const;

/* ===========================================
   COMPONENT CLASSES - 常用元件類別
   =========================================== */

/**
 * 取得按鈕樣式的幫助函數
 */
export function getButtonStyle(variant: 'primary' | 'secondary' | 'ghost' = 'primary') {
    const base = `
        px-4 py-3 rounded-xl font-bold text-sm
        transition-all duration-200 ease-out
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        min-h-[48px]
    `;

    switch (variant) {
        case 'primary':
            return `${base} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-lg shadow-indigo-100`;
        case 'secondary':
            return `${base} bg-slate-50 text-slate-600 hover:bg-slate-100 focus:ring-slate-300`;
        case 'ghost':
            return `${base} bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 focus:ring-slate-200`;
        default:
            return base;
    }
}

/**
 * 取得卡片樣式的幫助函數
 */
export function getCardStyle(padded = true) {
    return `
        bg-white rounded-2xl shadow-xl shadow-indigo-100/50
        border border-slate-100 overflow-hidden
        ${padded ? 'p-6' : ''}
    `;
}

/**
 * 取得輸入框樣式的幫助函數
 */
export function getInputStyle() {
    return `
        w-full px-5 py-4 bg-slate-50 border border-slate-200
        rounded-2xl text-sm font-bold
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300
        focus:bg-white transition-all placeholder:text-slate-400
        min-h-[48px]
    `;
}

/**
 * 取得標籤頁樣式的幫助函數
 */
export function getTabStyle(active: boolean) {
    return `
        flex-1 h-full flex flex-col items-center justify-center gap-1.5
        rounded-[22px] transition-colors
        ${active 
            ? 'text-indigo-700' 
            : 'text-slate-400 hover:text-slate-600'
        }
        focus:outline-none focus:ring-2 focus:ring-indigo-500
    `;
}

/**
 * 取得觸控優化樣式的幫助函數
 */
export function getTouchOptimizedStyle(minHeight = 44) {
    return `
        min-h-[${minHeight}px] min-w-[${minHeight}px]
        touch-manipulation
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
    `;
}

export default {
    colors,
    semanticColors,
    fontSize,
    fontWeight,
    lineHeight,
    spacing,
    borderRadius,
    shadows,
    duration,
    ease,
    transition,
    touch,
    zIndex,
    breakpoints,
    getButtonStyle,
    getCardStyle,
    getInputStyle,
    getTabStyle,
    getTouchOptimizedStyle,
};
