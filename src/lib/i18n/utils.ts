export const resolveText = (
    text: string | Record<string, string> | undefined,
    locale: string = 'en'
): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;

    // Priority: Explicit Locale -> English -> Fallback
    const val = text[locale] || text['en'] || text['zh-TW'] || Object.values(text)[0] || '';

    if (typeof val === 'string') return val;
    return '';
};
