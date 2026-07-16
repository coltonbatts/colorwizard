/**
 * Informational modal for legacy gated feature surfaces.
 */

'use client'

import { useId } from 'react'
import { APP_MODE_DESCRIPTION, APP_MODE_LABEL } from '@/lib/appMode'
import OverlaySurface from '@/components/ui/Overlay'

interface UpgradePromptProps {
  featureName: string
  featureDescription?: string
  isOpen: boolean
  onClose: () => void
  onUpgradeClick: () => void
  isLoading?: boolean
}

export default function UpgradePrompt({
  featureName,
  featureDescription,
  isOpen,
  onClose,
  onUpgradeClick,
  isLoading = false,
}: UpgradePromptProps) {
  const titleId = useId()

  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={onClose}
      preset="dialog"
      ariaLabelledBy={titleId}
      rootClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/35"
      panelClassName="w-[90vw] max-w-md overflow-hidden rounded-xl border border-ink-hairline bg-paper-elevated shadow-[0_20px_80px_rgba(26,26,26,0.18)] sm:w-full"
    >
      <div className="border-b border-ink-hairline bg-paper-recessed px-5 py-5 sm:px-7">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Licensed Desktop Feature</p>
        <h2 id={titleId} className="font-display text-2xl font-medium tracking-tight text-ink sm:text-[28px]">
          {featureName}
        </h2>
        <p className="mt-2 text-sm text-ink-secondary">Available in an activated desktop build.</p>
      </div>

      <div className="space-y-5 px-5 py-6 sm:px-7">
        {featureDescription && <p className="text-sm leading-relaxed text-ink-secondary">{featureDescription}</p>}

        <div className="rounded-lg border border-linen bg-paper p-5">
          <div className="font-display text-xl font-medium text-ink">{APP_MODE_LABEL}</div>
          <div className="mt-1 text-sm text-ink-secondary">{APP_MODE_DESCRIPTION}</div>
          <p className="mt-3 border-t border-ink-hairline pt-3 text-xs leading-relaxed text-ink-muted">Desktop activation is local. Core workflows stay offline once unlocked.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Included</h3>
          <ul className="space-y-2 text-sm text-ink-secondary">
            <li className="border-l-2 border-subsignal pl-3">AI palette suggestions</li>
            <li className="border-l-2 border-subsignal pl-3">Unlimited exports and advanced workflows</li>
            <li className="border-l-2 border-subsignal pl-3">Local-first desktop project storage</li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">This preview keeps the paid standalone desktop model intact instead of faking an upgrade flow.</p>
        </div>
      </div>

      <div className="border-t border-ink-hairline bg-paper px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={onUpgradeClick}
          disabled={isLoading}
          className="min-h-11 w-full rounded-md border border-ink bg-ink px-4 py-2 text-sm font-semibold text-paper-elevated transition-colors hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-50"
        >
          Close
        </button>
      </div>
    </OverlaySurface>
  )
}
