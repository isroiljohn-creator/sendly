/** @type {import('next').NextConfig} */
const nextConfig = {
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
