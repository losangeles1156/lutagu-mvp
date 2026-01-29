import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { NodeDisplayProvider } from '@/providers/NodeDisplayProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
    title: {
        default: 'LUTAGU - City Emotional Navigation',
        template: '%s | LUTAGU'
    },
    description: 'Real-time Tokyo transit guide with AI precision. Verified disruption alerts, airport navigation, and expert local knowledge.',
    manifest: '/manifest.json',
    openGraph: {
        title: 'LUTAGU - Tokyo Smart Transit & Knowledge',
        description: 'Verified transit alerts and expert local insights for Tokyo travelers.',
        url: 'https://lutagu.com',
        siteName: 'LUTAGU',
        images: [
            {
                url: '/images/og-image.jpg',
                width: 1200,
                height: 630,
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'LUTAGU - Tokyo Smart Transit',
        description: 'Real-time verified transit alerts and expert knowledge for Tokyo.',
        images: ['/images/og-image.jpg'],
    },
    alternates: {
        canonical: './',
        languages: {
            'en': '/en',
            'zh': '/zh',
            'zh-TW': '/zh-TW',
            'ja': '/ja',
        },
    },
};


import { OfflineDataManager } from '@/lib/offline/OfflineDataManager';
import { ResilienceManager } from '@/components/offline/ResilienceManager';
import { OfflineIndicator } from '@/components/offline/OfflineIndicator';

export default async function RootLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const messages = await getMessages();
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    const shouldLoadAnalytics = process.env.NODE_ENV === 'production' && Boolean(gaId);

    return (
        <html lang={locale}>
            <head>
                {/* Performance: Preconnect to external resources */}
                <link rel="preconnect" href="https://a.basemaps.cartocdn.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://b.basemaps.cartocdn.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://c.basemaps.cartocdn.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

                {/* LCP Optimization: Preload hero image to eliminate Load Delay */}
                <link rel="preload" href="/images/map-placeholder.jpg" as="image" fetchPriority="high" />

                <meta name="application-name" content="LUTAGU" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="LUTAGU" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="theme-color" content="#4f46e5" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
                <link rel="apple-touch-icon" href="/icons/icon-192.png" />
            </head>
            <body className={inter.className}>
                {shouldLoadAnalytics && (
                    <>
                        <Script
                            strategy="afterInteractive"
                            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                        />
                        <Script
                            id="gtag-init"
                            strategy="afterInteractive"
                            dangerouslySetInnerHTML={{
                                __html: `
                                    window.dataLayer = window.dataLayer || [];
                                    function gtag(){dataLayer.push(arguments);}
                                    gtag('js', new Date());
                                    gtag('config', '${gaId}', {
                                        page_path: window.location.pathname,
                                    });
                                `,
                            }}
                        />
                    </>
                )}
                <NextIntlClientProvider messages={messages}>
                    <ResilienceManager />
                    <OfflineIndicator />
                    <ErrorBoundary>
                        <AuthProvider>
                            <NodeDisplayProvider>
                                <ToastProvider>
                                    {children}
                                </ToastProvider>
                            </NodeDisplayProvider>
                        </AuthProvider>
                    </ErrorBoundary>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
