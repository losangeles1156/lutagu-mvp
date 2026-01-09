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

export default async function RootLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const messages = await getMessages();

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

