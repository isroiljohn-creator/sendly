/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Production bundle optimization
  compiler: {
    // Remove console.log in production (keep errors/warnings)
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Image optimization — allow Telegram CDN and our domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.telegram.org' },
      { protocol: 'https', hostname: '*.telegram.org' },
      { protocol: 'https', hostname: 'sendly.uz' },
      { protocol: 'https', hostname: 'www.sendly.uz' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all non-API routes
        source: '/((?!api/).*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'sendly.uz',
          },
        ],
        destination: 'https://www.sendly.uz/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
