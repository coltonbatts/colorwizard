import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/lib/auth/useAuth'
import Script from 'next/script'
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
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'ColorWizard. | Perceptual Color for Artists',
  description: 'A professional color tool for artists. Spectral color mixing, perceptual analysis, and paint recipe generation. Built with precision, designed to recede.',
  keywords: ['oil painting', 'color mixing', 'color theory', 'artist tools', 'spectral color', 'palette generator', 'perceptual color'],
  openGraph: {
    title: 'ColorWizard. | Perceptual Color for Artists',
    description: 'The professional color tool for oil painters. Let the art lead.',
    url: 'https://colorwizard.app',
    siteName: 'ColorWizard.',
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
    title: 'ColorWizard. | Perceptual Color for Artists',
    description: 'The professional color tool for oil painters.',
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
        <Script src="https://cdn.jsdelivr.net/npm/eruda" strategy="beforeInteractive" />
        <Script id="eruda-init" strategy="afterInteractive">
          {`if (typeof window !== 'undefined') { eruda.init(); }`}
        </Script>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
