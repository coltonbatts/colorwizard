/**
 * UpgradePrompt Modal
 * Non-intrusive modal that appears when user tries to access a Pro feature
 */

'use client'

import { useId } from 'react'
import Link from 'next/link'
import { STRIPE_PRICES } from '@/lib/stripe-config'
import Spinner from '@/components/ui/Spinner'
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-6 sm:px-8 sm:py-8">
        <h2 id={titleId} className="mb-2 text-xl font-bold text-white sm:text-2xl">
          {featureName}
        </h2>
        <p className="text-blue-100">
          Pro feature · Unlock now for just $1
        </p>
      </div>

      {/* Content */}
      <div className="space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        {featureDescription && (
          <p className="text-sm leading-relaxed text-gray-600">
            {featureDescription}
          </p>
        )}

        <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-6 text-center">
          <div className="mb-1 text-4xl font-bold text-blue-600">
            ${STRIPE_PRICES.lifetime.displayAmount}
          </div>
          <div className="text-sm text-gray-600">
            One-time lifetime purchase
          </div>
          <p className="mt-2 text-xs text-gray-500">
            No recurring charges. Unlock Pro forever.
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">With Pro, you get:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">⭐</span>
              <span>AI palette suggestions</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">⭐</span>
              <span>Team collaboration & sharing</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">⭐</span>
              <span>Advanced presets & workflows</span>
            </li>
          </ul>
          <p className="mt-3 text-xs italic text-gray-600">
            All exports, filters, and tools are included in free.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 border-t border-gray-100 bg-gray-50 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
            disabled={isLoading}
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={onUpgradeClick}
            disabled={isLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                Processing...
              </span>
            ) : (
              'Unlock for $1'
            )}
          </button>
        </div>
        <Link
          href="/support"
          onClick={onClose}
          className="block w-full px-4 py-2 text-center text-sm text-gray-600 transition-colors hover:text-gray-900"
        >
          Get help with Pro features
        </Link>
      </div>
    </OverlaySurface>
  )
}
