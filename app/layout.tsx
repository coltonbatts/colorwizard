import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import { AuthProvider } from '@/lib/auth/useAuth'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ColorWizard | Professional Color Mixing for Artists',
  description: 'The spectral color mixing assistant for oil painters. $1 Lifetime Pro. Traditional color theory meeting modern AI.',
  keywords: ['oil painting', 'color mixing', 'color theory', 'artist tools', 'spectral color', 'palette generator', 'procreate export'],
  openGraph: {
    title: 'ColorWizard | Built for Artists',
    description: 'Stop guessing your mixes. $1 Lifetime Pro access now live.',
    url: 'https://colorwizard.app',
    siteName: 'ColorWizard',
    images: [
      {
        url: 'https://colorwizard.app/og-image.png', // User will need to provide this
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ColorWizard | Built for Artists',
    description: 'The definitive tool for modern oil painters. $1 Forever.',
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${outfit.variable}`}>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
