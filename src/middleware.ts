import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    // A list of all locales that are supported
    locales: ['zh-TW', 'en', 'ja'],

    // Used when no locale matches
    defaultLocale: 'zh-TW',
    localePrefix: 'as-needed'
});

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(zh-TW|en|ja)/:path*']
};
