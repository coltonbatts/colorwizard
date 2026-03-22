/**
 * Informational modal shown anywhere the old pricing UI still surfaces.
 */

'use client'

import { useId } from 'react'
import { APP_MODE_DESCRIPTION, APP_MODE_LABEL } from '@/lib/appMode'
import OverlaySurface from '@/components/ui/Overlay'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const titleId = useId()

  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={onClose}
      preset="dialog"
      ariaLabelledBy={titleId}
      rootClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/40"
      panelClassName="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none"
    >
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-8 text-center sm:px-8 sm:py-12">
        <h2 id={titleId} className="mb-3 text-2xl font-bold text-white sm:text-4xl">
          {APP_MODE_LABEL}
        </h2>
        <p className="text-base text-blue-100 sm:text-lg">{APP_MODE_DESCRIPTION}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-4 py-8 sm:gap-8 sm:px-8 md:grid-cols-2">
        <div className="rounded-xl border-2 border-gray-200 p-6">
          <h3 className="mb-2 text-xl font-bold text-gray-900">What Changed</h3>
          <p className="text-sm leading-6 text-gray-600">
            Stripe checkout and account-tier prompts are disabled. The app is aligned around a
            local-first workflow instead of paid unlocks.
          </p>
        </div>

        <div className="rounded-xl border-2 border-blue-500 bg-blue-50/30 p-6">
          <h3 className="mb-2 text-xl font-bold text-gray-900">What You Keep</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Unlimited Procreate exports</li>
            <li>AI color suggestions</li>
            <li>Oil paint mixing tools</li>
            <li>DMC thread matching</li>
            <li>No account or payment setup</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-4 py-8 sm:px-8 sm:py-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Paid tier?</h4>
            <p className="text-sm text-gray-600">No. Payments are disabled.</p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Advanced tools locked?</h4>
            <p className="text-sm text-gray-600">No. Local features are available by default.</p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Need an account?</h4>
            <p className="text-sm text-gray-600">No. The local app flow does not depend on auth.</p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Why keep this modal?</h4>
            <p className="text-sm text-gray-600">
              It gives any leftover pricing entry point a truthful explanation instead of a broken checkout.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-8 py-6">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </OverlaySurface>
  )
}
