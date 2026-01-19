import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

export const CONFIG = {
    // 类别上限
    LIMITS: {
        PREMIUM: 50, // 餐飲、購物、住宿、文化
        STANDARD: 30 // 其他
    },

    // 类别定义
    CATEGORIES: {
        PREMIUM_IDS: ['dining', 'shopping', 'accommodation', 'culture'],
        NATURE: 'nature'
    },

    // 季节性关键词 (用于 Wiki 分析)
    SEASONAL_KEYWORDS: {
        SAKURA: ['桜', 'お花見', 'ソメイヨシノ', '千本桜', 'さくら', '花見'],
        AUTUMN: ['紅葉', 'カエデ', 'イチョウ', '黄葉'],
        HYDRANGEA: ['紫陽花', 'あじさい'],
        PLUM: ['梅林', '観梅', '梅まつり']
    },

    // OSM 设置
    OSM: {
        DEFAULT_RADIUS: 500, // meters
        DEDUP_RADIUS: 500 // meters for station clustering
    },

    SUPABASE: {
        URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        KEY: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    }
};
