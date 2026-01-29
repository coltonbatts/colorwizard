/**
 * App Header
 * Shows user tier and pricing button
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUserTier } from '@/lib/hooks/useUserTier'
import { useAuth } from '@/lib/auth/useAuth'
import PricingModal from './PricingModal'

export default function AppHeader() {
  const { tier, loading: tierLoading } = useUserTier()
  const { user } = useAuth()
  const [showPricingModal, setShowPricingModal] = useState(false)

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-600">ColorWizard</h1>
            {!tierLoading && tier === 'pro' && (
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                ✨ Pro
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Pricing Button */}
            {tier === 'free' && (
              <button
                onClick={() => setShowPricingModal(true)}
                className="px-4 py-2 text-blue-600 font-semibold hover:bg-blue-50 rounded-lg transition-colors"
              >
                Upgrade to Pro
              </button>
            )}

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.displayName || user.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-500">
                    {tierLoading ? '...' : tier === 'pro' ? 'Pro Subscriber' : 'Free'}
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
