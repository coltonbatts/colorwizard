'use client'

import { WordmarkCompact } from './Wordmark'

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
      <div className="mobile-header-inner">
        <button
          type="button"
          onClick={onOpenMenu}
          className="mobile-header-btn"
          aria-label="Open navigation menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 justify-center px-2">
          <WordmarkCompact className="mobile-header-title" />
        </div>

        <div className="flex w-11 justify-end">
          {hasImage && onClearImage && (
            <button
              type="button"
              onClick={onClearImage}
              className="mobile-header-btn text-ink-secondary"
              aria-label="Back to home"
              title="Back to home"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5 10.5V20h14v-9.5" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
