/**
 * App Header — Editorial Modernism
 *
 * A calm, minimal header that shows user tier and pricing.
 * Uses structural color bars for state indication.
 */

'use client'

import { useState } from 'react'
import { useUserTier } from '@/lib/hooks/useUserTier'
import { useAuth } from '@/lib/auth/useAuth'
import PricingModal from './PricingModal'
import { WordmarkCompact } from './Wordmark'

export default function AppHeader() {
  const { tier, loading: tierLoading } = useUserTier()
  const { user } = useAuth()
  const [showPricingModal, setShowPricingModal] = useState(false)

  const isPro = tier === 'pro' || tier === 'pro_lifetime'

  return (
    <>
      <header className="bg-paper-elevated border-b border-ink-hairline sticky top-0 z-30">
        {/* Color bar indicator - structural, not decorative */}
        {isPro && (
          <div className="h-[2px] bg-signal" aria-hidden="true" />
        )}

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
          <div className="flex items-center gap-4">
            <WordmarkCompact />

            {tierLoading ? (
              <div className="h-5 w-12 bg-paper-recessed rounded animate-pulse" />
            ) : isPro && (
              <span className="text-xs font-mono tracking-wide text-subsignal uppercase">
                Pro
              </span>
            )}
          </div>

          <div className="w-full sm:w-auto flex items-center gap-4">
            {/* Upgrade button - uses signal sparingly */}
            {tier === 'free' && (
              <button
                onClick={() => setShowPricingModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 text-signal font-medium text-sm hover:bg-signal-muted rounded-md transition-colors"
              >
                Upgrade to Pro
              </button>
            )}

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3 pl-4 border-l border-ink-hairline">
                <div className="text-right">
                  <p className="text-sm font-medium text-ink">
                    {user.displayName || user.email?.split('@')[0]}
                  </p>
                  <p className="text-xs text-ink-muted font-mono">
                    {tierLoading ? '...' : isPro ? 'Pro' : 'Free'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </>
  )
}
