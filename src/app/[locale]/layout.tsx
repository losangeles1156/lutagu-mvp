import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { NodeDisplayProvider } from '@/providers/NodeDisplayProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'LUTAGU',
    description: 'City Emotional Navigation',
    manifest: '/manifest.json',
};

// ... imports
import Script from 'next/script';

// ...

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
                <meta name="application-name" content="LUTAGU" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="LUTAGU" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="mobile-web-app-capable" content="yes" />
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
                    <ErrorBoundary>
                        <NodeDisplayProvider>
                            {children}
                        </NodeDisplayProvider>
                    </ErrorBoundary>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}

