/**
 * UpgradePrompt Modal
 * Non-intrusive modal that appears when user tries to access a Pro feature
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STRIPE_PRICES, ANNUAL_MONTHLY_EQUIVALENT } from '@/lib/stripe-config'

interface UpgradePromptProps {
  featureName: string
  featureDescription?: string
  isOpen: boolean
  onClose: () => void
  onUpgradeClick: (billingPeriod: 'monthly' | 'annual') => void
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
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<'monthly' | 'annual'>('annual')

  const handleUpgrade = () => {
    onUpgradeClick(selectedBillingPeriod)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Unlock {featureName}
                </h2>
                <p className="text-blue-100">
                  Upgrade to Pro for advanced features
                </p>
              </div>

              {/* Content */}
              <div className="px-8 py-8 space-y-6">
                {featureDescription && (
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {featureDescription}
                  </p>
                )}

                {/* Billing Toggle */}
                <div className="bg-gray-50 rounded-lg p-1 flex gap-1">
                  <button
                    onClick={() => setSelectedBillingPeriod('monthly')}
                    className={`flex-1 py-2 px-4 rounded font-medium transition-all ${
                      selectedBillingPeriod === 'monthly'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setSelectedBillingPeriod('annual')}
                    className={`flex-1 py-2 px-4 rounded font-medium transition-all relative ${
                      selectedBillingPeriod === 'annual'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Annual
                    <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-1 absolute -top-2 -right-2">
                      Save 18%
                    </span>
                  </button>
                </div>

                {/* Pricing Display */}
                <div className="border-2 border-blue-200 rounded-lg p-6 text-center bg-blue-50/50">
                  {selectedBillingPeriod === 'monthly' ? (
                    <>
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        {STRIPE_PRICES.monthly.displayAmount}
                      </div>
                      <div className="text-gray-600">
                        per month, cancel anytime
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        {STRIPE_PRICES.annual.displayAmount}
                      </div>
                      <div className="text-gray-600 mb-2">
                        per year
                      </div>
                      <div className="text-sm text-green-600 font-medium">
                        ${ANNUAL_MONTHLY_EQUIVALENT}/month billed annually
                      </div>
                    </>
                  )}
                </div>

                {/* Features Included */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Unlock all Pro features:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>AI palette suggestions</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Advanced exports (Figma, Adobe, Framer)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Team collaboration & sharing</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Advanced filters & presets</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 px-8 py-6 bg-gray-50 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    `Upgrade to Pro`
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
