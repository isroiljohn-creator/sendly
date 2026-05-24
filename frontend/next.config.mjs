/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
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
