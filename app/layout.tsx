import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { AuthProvider } from '@/lib/auth/useAuth'
import StoreBootstrap from '@/components/StoreBootstrap'
import DesktopRuntimeMount from '@/components/desktop/DesktopRuntimeMount'
import TauriAppShell from '@/components/desktop/TauriAppShell'
import '@fontsource/eb-garamond/latin-400.css'
import '@fontsource/eb-garamond/latin-400-italic.css'
import '@fontsource/eb-garamond/latin-500.css'
import '@fontsource/eb-garamond/latin-600.css'
import '@fontsource/eb-garamond/latin-ext-400.css'
import '@fontsource/eb-garamond/latin-ext-400-italic.css'
import '@fontsource/eb-garamond/latin-ext-500.css'
import '@fontsource/eb-garamond/latin-ext-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '@fontsource/jetbrains-mono/latin-600.css'
import '@fontsource/jetbrains-mono/latin-ext-400.css'
import '@fontsource/jetbrains-mono/latin-ext-500.css'
import '@fontsource/jetbrains-mono/latin-ext-600.css'
import './globals.css'

/**
 * ColorWizard — Editorial Modernism for Tools
 *
 * Typography:
 * - Display/Wordmark: EB Garamond (Apple Garamond inspired)
 * - UI: Helvetica Neue (system fallback)
 * - Technical: JetBrains Mono
 *
 * Fonts are self-hosted (@fontsource, imported here) so first paint works offline.
 */

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'ColorWizard | Color Mixing for Oil Painters',
  description: 'Upload a reference image, click a color, and get a real oil paint mixing recipe from a 6-color limited palette. Offline-first and private.',
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
    <html lang="en" data-runtime="boot" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Script id="runtime-detect" strategy="beforeInteractive">
          {`(() => {
            try {
              const w = window;
              const isDesktop =
                !!(w.__TAURI__ && w.__TAURI__.core && w.__TAURI__.core.invoke) ||
                !!(w.__TAURI_INTERNALS__ && w.__TAURI_INTERNALS__.invoke);
              document.documentElement.dataset.runtime = isDesktop ? 'desktop' : 'web';
            } catch {
              document.documentElement.dataset.runtime = 'web';
            }
          })();`}
        </Script>

        <div className="desktop-boot-splash" aria-hidden="true">
          <div className="desktop-boot-splash__panel">
            <p className="desktop-boot-splash__eyebrow">ColorWizard Pro</p>
            <h1 className="desktop-boot-splash__title">Opening studio…</h1>
            <p className="desktop-boot-splash__subtitle">Loading your workspace, library, and last session.</p>
          </div>
        </div>

        <div className="runtime-app-root">
          <DesktopRuntimeMount />
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <StoreBootstrap />
          <TauriAppShell>
            <AuthProvider>{children}</AuthProvider>
          </TauriAppShell>
        </div>
      </body>
    </html>
  )
}
