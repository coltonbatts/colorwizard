'use client'

/**
 * MobileHeader - Universal mobile header for navigation escape
 * Shows on small screens with back, home, and clear actions
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface MobileHeaderProps {
  hasImage?: boolean
  onClearImage?: () => void
}

export default function MobileHeader({ hasImage = false, onClearImage }: MobileHeaderProps) {
  const router = useRouter()

  return (
    <header
      className="mobile-header md:hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="mobile-header-inner">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mobile-header-btn"
          aria-label="Go back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Logo / Title - clickable to home */}
        <Link href="/" className="mobile-header-title">
          ColorWizard
        </Link>

        {/* Right Actions */}
        <div className="mobile-header-actions">
          {/* Clear/New Image - only when image is loaded */}
          {hasImage && onClearImage && (
            <button
              onClick={onClearImage}
              className="mobile-header-btn mobile-header-btn-clear"
              aria-label="Clear image"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          )}

          {/* Home Button */}
          <Link href="/" className="mobile-header-btn" aria-label="Go home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
