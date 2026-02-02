/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      'culori',
      'firebase',
    ],
  },

  // Enable image optimization with modern formats
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Enable compression for responses
  compress: true,

  // Optimize for production
  productionBrowserSourceMaps: false,

  // Enable strict mode for better error detection in development
  reactStrictMode: true,

  // Temporarily ignore ESLint during build (pre-existing warnings)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
