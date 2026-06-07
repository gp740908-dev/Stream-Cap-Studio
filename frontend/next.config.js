/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Allow fetching images from the API server
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },

  // API rewrites so the frontend can call /api/* without CORS issues in dev
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || "http://api:8000/api"}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
