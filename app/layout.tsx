import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/lib/auth/useAuth'
import StoreBootstrap from '@/components/StoreBootstrap'
import './globals.css'

/**
 * ColorWizard — Editorial Modernism for Tools
 *
 * Typography:
 * - Display/Wordmark: EB Garamond (Apple Garamond inspired)
 * - UI: Helvetica Neue (system fallback)
 * - Technical: JetBrains Mono
 *
 * Fonts are loaded via CSS @import in globals.css
 * for optimal control and reduced JavaScript overhead.
 */

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'ColorWizard | Color Mixing for Oil Painters',
  description: 'Upload a reference image, click a color, and get a real oil paint mixing recipe from a 6-color limited palette. Free, open source, and private.',
  keywords: ['oil painting', 'color mixing', 'paint mixing', 'limited palette', 'artist tools', 'reference photo', 'dmc thread match'],
  openGraph: {
    title: 'ColorWizard | Color Mixing for Oil Painters',
    description: 'Click a color in your reference image and get a real paint recipe you can actually use.',
    url: 'https://colorwizard.app',
    siteName: 'ColorWizard',
    images: [
      {
        url: 'https://colorwizard.app/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ColorWizard | Color Mixing for Oil Painters',
    description: 'Upload a photo, click a color, and get a paint recipe from a real limited palette.',
    creator: '@coltonbatts',
  },
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <StoreBootstrap />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
