import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['zh', 'en', 'ja', 'zh-TW', 'ar'];

export default getRequestConfig(async (params) => {
    // Validate that the incoming `locale` parameter is valid
    const locale = await params.requestLocale;
    if (!locales.includes(locale as any)) notFound();

    let messages;
    try {
        if (locale === 'zh-TW') {
            messages = (await import('../messages/zh-TW.json')).default;
        } else if (locale === 'zh') {
            // Use zh-TW.json for both zh and zh-TW (both should display Traditional Chinese)
            messages = (await import('../messages/zh-TW.json')).default;
        } else if (locale === 'ja') {
            messages = (await import('../messages/ja.json')).default;
        } else if (locale === 'ar') {
            messages = (await import('../messages/ar.json')).default;
        } else {
            messages = (await import('../messages/en.json')).default;
        }
    } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        messages = (await import('../messages/en.json')).default;
    }

    return {
        locale,
        messages,
        onError(error) {
            if ((error as any)?.code === 'MISSING_MESSAGE') {
                console.warn('[i18n] Missing message:', (error as any)?.message);
                return;
            }
            console.error('[i18n] Intl error:', error);
        },
        getMessageFallback({ namespace, key }) {
            const fullKey = namespace ? `${namespace}.${key}` : key;
            const parts = fullKey.split('.');
            const last = parts[parts.length - 1] || fullKey;
            return last.replace(/_/g, ' ');
        }
    };
});
