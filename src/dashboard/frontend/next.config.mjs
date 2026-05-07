/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use static export for production (Vercel), but normal mode for local dev
  output: process.env.EXPORT ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Only include rewrites for local dev; Next.js errors if they exist during 'export'
  ...(process.env.EXPORT ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3000/api/:path*',
        },
        {
          source: '/auth/:path*',
          destination: 'http://localhost:3000/auth/:path*',
        },
        {
          source: '/socket.io/:path*',
          destination: 'http://localhost:3000/socket.io/:path*',
        },
      ];
    },
  }),
};

export default nextConfig;
