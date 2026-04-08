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
      backdropClassName="absolute inset-0 bg-black/30"
      panelClassName="w-[90vw] max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl outline-none sm:w-full"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-6 sm:px-8 sm:py-8">
        <h2 id={titleId} className="mb-2 text-xl font-bold text-white sm:text-2xl">
          {featureName}
        </h2>
        <p className="text-blue-100">Requires a licensed desktop build</p>
      </div>

      <div className="space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        {featureDescription && <p className="text-sm leading-relaxed text-gray-600">{featureDescription}</p>}

        <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-6 text-center">
          <div className="mb-1 text-2xl font-bold text-blue-600">{APP_MODE_LABEL}</div>
          <div className="text-sm text-gray-600">{APP_MODE_DESCRIPTION}</div>
          <p className="mt-2 text-xs text-gray-500">Desktop activation is local. Core workflows stay offline once unlocked.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Included now:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">⭐</span>
              <span>AI palette suggestions</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">⭐</span>
              <span>Unlimited exports and advanced workflows</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">⭐</span>
              <span>Local-first desktop project storage</span>
            </li>
          </ul>
          <p className="mt-3 text-xs italic text-gray-600">This preview keeps the paid standalone desktop model intact instead of faking an upgrade flow.</p>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-8 sm:py-6">
        <button
          type="button"
          onClick={onUpgradeClick}
          disabled={isLoading}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Close
        </button>
      </div>
    </OverlaySurface>
  )
}
