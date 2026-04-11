const path = require('path')

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'
const isDesktopStaticBuild = process.env.COLORWIZARD_DESKTOP_BUILD === '1'
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

  // Tauri dev loads the app directly from Next's dev server, so default same-origin
  // asset URLs are the safest option there. Desktop static builds still need relative paths.
  assetPrefix: isDesktopStaticBuild
    ? '.'
    : undefined,

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
