/**
 * App Header — Editorial Modernism
 */

'use client'

import { APP_MODE_LABEL, OPEN_SOURCE_MODE } from '@/lib/appMode'
import { useUserTier } from '@/lib/hooks/useUserTier'
import { useAuth } from '@/lib/auth/useAuth'
import { WordmarkCompact } from './Wordmark'

export default function AppHeader() {
  const { tier, loading: tierLoading } = useUserTier()
  const { user } = useAuth()
  const isPaidTier = tier === 'pro' || tier === 'pro_lifetime'

  return (
    <header className="sticky top-0 z-30 border-b border-ink-hairline bg-paper-elevated">
      {(OPEN_SOURCE_MODE || isPaidTier) && <div className="h-[2px] bg-signal" aria-hidden="true" />}

      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 sm:flex-row sm:gap-0 lg:px-8">
        <div className="flex items-center gap-4">
          <WordmarkCompact />

          {tierLoading ? (
            <div className="h-5 w-12 animate-pulse rounded bg-paper-recessed" />
          ) : OPEN_SOURCE_MODE ? (
            <span className="font-mono text-xs uppercase tracking-wide text-signal">Free</span>
          ) : isPaidTier ? (
            <span className="font-mono text-xs uppercase tracking-wide text-subsignal">Pro</span>
          ) : null}
        </div>

        <div className="flex w-full items-center gap-4 sm:w-auto">
          {OPEN_SOURCE_MODE && (
            <span className="flex-1 rounded-md bg-signal-muted px-4 py-2 text-sm font-medium text-signal sm:flex-none">
              {APP_MODE_LABEL}
            </span>
          )}

          {user && (
            <div className="flex items-center gap-3 border-l border-ink-hairline pl-4">
              <div className="text-right">
                <p className="text-sm font-medium text-ink">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="font-mono text-xs text-ink-muted">
                  {tierLoading ? '...' : OPEN_SOURCE_MODE ? 'Local' : isPaidTier ? 'Pro' : 'Free'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
