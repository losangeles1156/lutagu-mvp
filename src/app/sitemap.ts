import { MetadataRoute } from 'next';

const locales = ['zh-TW', 'ja', 'en', 'zh', 'ar'];
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lutagu.com';

// Major Hub Station IDs for SEO visibility
const HUB_STATIONS = [
    'Tokyo', 'Shinjuku', 'Shibuya', 'Ikebukuro', 'Ueno',
    'Shinagawa', 'Yokohama', 'Haneda-Airport', 'Narita-Airport'
];

export default function sitemap(): MetadataRoute.Sitemap {
    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Home pages
    locales.forEach(locale => {
        sitemapEntries.push({
            url: `${baseUrl}/${locale}`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        });

        // Hub Stations
        HUB_STATIONS.forEach(station => {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/station/${station}`,
                lastModified: new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            });
        });
    });

    return sitemapEntries;
}

