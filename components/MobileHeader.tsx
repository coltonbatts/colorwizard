'use client'

import { WordmarkCompact } from './Wordmark'

interface MobileHeaderProps {
  onOpenMenu?: () => void
}

export default function MobileHeader({
  onOpenMenu
}: MobileHeaderProps) {
  return (
    <header
      className="mobile-header z-50"
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
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 justify-center px-2">
          <WordmarkCompact className="mobile-header-title" />
        </div>

        <div className="w-11" aria-hidden="true" />
      </div>
    </header>
  )
}
