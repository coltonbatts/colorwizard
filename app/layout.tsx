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
  title: 'Color Wizard 2.0',
  description: 'Professional oil paint color mixing assistant with spectral accuracy',
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Remove Product Hunt badge and "Built by Artist" button on load
              (function() {
                function removeUnwantedElements() {
                  // Remove Product Hunt link/banner
                  const phLinks = document.querySelectorAll('a[href*="producthunt.com"]');
                  phLinks.forEach(el => {
                    const parent = el.closest('div');
                    if (parent) parent.remove();
                  });
                  
                  // Remove "Built by Artist" button
                  const buttons = document.querySelectorAll('button');
                  buttons.forEach(btn => {
                    if (btn.textContent.includes('Built') && btn.textContent.includes('Artist')) {
                      btn.remove();
                    }
                  });
                }
                
                // Run immediately and on DOMContentLoaded
                removeUnwantedElements();
                document.addEventListener('DOMContentLoaded', removeUnwantedElements);
                
                // Also check periodically for dynamically injected elements
                setInterval(removeUnwantedElements, 1000);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
