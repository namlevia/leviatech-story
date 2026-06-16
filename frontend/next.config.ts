import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? "standalone" : "export",
  devIndicators: false as any,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

if (process.env.BUILD_STANDALONE === 'true' || process.env.NODE_ENV !== 'production') {
  nextConfig.rewrites = async () => {
    const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:1997';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  };
}

export default nextConfig;
