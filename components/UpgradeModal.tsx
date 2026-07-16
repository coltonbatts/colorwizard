'use client'

import { useId } from 'react'
import { APP_MODE_LABEL } from '@/lib/appMode'
import OverlaySurface from '@/components/ui/Overlay'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string
  currentCount?: number
  limit?: number
}

export default function UpgradeModal({
  isOpen,
  onClose,
  featureName,
  currentCount,
  limit,
}: UpgradeModalProps) {
  void currentCount
  void limit
  const titleId = useId()

  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={onClose}
      preset="dialog"
      ariaLabelledBy={titleId}
      rootClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/35"
      panelClassName="relative w-full max-w-lg overflow-hidden rounded-xl border border-ink-hairline bg-paper-elevated shadow-[0_20px_80px_rgba(26,26,26,0.18)]"
    >
          <header className="flex items-start justify-between gap-5 border-b border-ink-hairline bg-paper-recessed px-6 py-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">ColorWizard Pro</p>
              <h2 id={titleId} className="mt-2 font-display text-[28px] font-medium leading-tight tracking-tight text-ink">Desktop License Required</h2>
            </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper hover:text-ink"
            aria-label="Close license information"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </header>

          <div className="space-y-6 p-6">
            {featureName && (
              <p className="text-sm leading-relaxed text-ink-secondary">
                {featureName} is unlocked in the licensed desktop app.
              </p>
            )}

            <section className="rounded-lg border border-linen bg-paper p-5">
              <h3 className="font-display text-xl font-medium text-ink">{APP_MODE_LABEL}</h3>
              <ul className="mt-4 grid gap-3 text-sm text-ink-secondary">
                <li>Unlimited Procreate exports</li>
                <li>AI-powered color theory suggestions</li>
                <li>Offline-first workflow with local activation</li>
                <li>No cloud account required for normal use</li>
              </ul>
            </section>

            <div className="space-y-4 border-t border-ink-hairline pt-5">
              <p className="text-sm leading-relaxed text-ink-muted">
                This preview keeps export limits in place instead of pretending the paid desktop unlock is free.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="flex min-h-11 w-full items-center justify-center rounded-md border border-ink bg-ink px-6 py-3 text-sm font-semibold text-paper-elevated transition-colors hover:bg-graphite"
              >
                Close
              </button>

              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                Licensed desktop feature
              </p>
            </div>
          </div>
    </OverlaySurface>
  )
}
