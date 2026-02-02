'use client'

/**
 * MobileHeader - Universal mobile header for navigation escape
 * Shows on small screens with back, home, and clear actions
 */

import Link from 'next/link'

interface MobileHeaderProps {
  hasImage?: boolean
  onClearImage?: () => void
  onOpenMenu?: () => void
}

export default function MobileHeader({
  hasImage = false,
  onClearImage,
  onOpenMenu
}: MobileHeaderProps) {
  return (
    <header
      className="mobile-header md:hidden z-50"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="mobile-header-inner h-14 px-4 bg-paper/95 backdrop-blur-md border-b border-ink-hairline">
        {/* Menu Button - Left */}
        <button
          onClick={onOpenMenu}
          className="mobile-header-btn flex items-center justify-center -ml-2 hover:bg-paper-recessed rounded-full w-10 h-10 transition-colors"
          aria-label="Open navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

        {/* Center: Brand */}
        <div className="flex-1 flex justify-center">
          <Link href="/" className="mobile-header-title text-ink font-bold tracking-tight">
            <span>ColorWizard</span>
          </Link>
        </div>

        {/* Right: Clear/New Image */}
        <div className="w-10 flex justify-end">
          {hasImage && onClearImage && (
            <button
              onClick={onClearImage}
              className="mobile-header-btn flex items-center justify-center -mr-2 hover:bg-paper-recessed rounded-full w-10 h-10 text-ink-secondary transition-colors"
              aria-label="Clear image"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
