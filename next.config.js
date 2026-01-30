const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // 🚀 Performance: Enable tree-shaking for Lucide icons (Modularize as fallback)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  async rewrites() {
    const cdnBase = process.env.NEXT_PUBLIC_DATA_CDN_BASE_URL;
    if (!isProd || !cdnBase) return [];
    const base = cdnBase.replace(/\/$/, '');
    return [
      {
        source: '/data/:path*',
        destination: `${base}/data/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          ...(isProd ? [{ key: 'X-Frame-Options', value: 'DENY' }] : []),
          { key: 'X-XSS-Protection', value: '0' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), microphone=(), camera=()' },
          {
            key: 'Content-Security-Policy-Report-Only',
            value:
              "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https: wss:"
          },
          {
            key: 'Strict-Transport-Security',
            value: isProd
              ? 'max-age=31536000; includeSubDomains; preload'
              : 'max-age=0'
          }
        ]
      }
    ];
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { withSentryConfig } = require("@sentry/nextjs");

let finalConfig;
if (isProd) {
  const withPWA = require('next-pwa')({
    dest: 'public',
    register: false,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development',
    buildExcludes: [/middleware-manifest\.json$/],
    runtimeCaching: [
      {
        urlPattern: /\/data\/routing_graph\.json$/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'lutagu-graph-cache',
          expiration: { maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }
        }
      },
      {
        urlPattern: /\/api\/nodes\/.+/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'lutagu-node-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }
        }
      }
    ]
  });
  finalConfig = withBundleAnalyzer(withPWA(withNextIntl(nextConfig)));
} else {
  finalConfig = withBundleAnalyzer(withNextIntl(nextConfig));
}

module.exports = withSentryConfig(
  finalConfig,
  {
    silent: true,
    org: "lutagu",
    project: "lutagu-pwa",
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
  }
);

