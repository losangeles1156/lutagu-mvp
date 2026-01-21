import { MetadataRoute } from 'next';

const locales = ['zh', 'en', 'ja', 'zh-TW', 'ar'];
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lutagu.com';

export default function sitemap(): MetadataRoute.Sitemap {
    return locales.map((locale) => ({
        url: `${baseUrl}/${locale}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
    }));
}
