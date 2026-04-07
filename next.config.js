const path = require('path')

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const internalHost = process.env.TAURI_DEV_HOST || 'localhost'

const nextConfig = {
  // Tauri supports static exports for Next.js frontends.
  output: 'export',

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
    unoptimized: true,
  },

  // Resolve assets correctly in Tauri dev while keeping production export static.
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,

  // Enable compression for responses
  compress: true,

  // Optimize for production
  productionBrowserSourceMaps: false,

  // Enable strict mode for better error detection in development
  reactStrictMode: true,

  // Pin tracing to this repo so Next does not infer the parent folder as a workspace root.
  outputFileTracingRoot: path.join(__dirname),
}

module.exports = nextConfig
