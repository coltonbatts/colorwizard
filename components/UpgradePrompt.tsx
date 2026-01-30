/**
 * UpgradePrompt Modal
 * Non-intrusive modal that appears when user tries to access a Pro feature
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STRIPE_PRICES } from '@/lib/stripe-config'
import Spinner from '@/components/ui/Spinner'

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
  const handleUpgrade = () => {
    onUpgradeClick()
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] sm:w-full max-w-md z-50"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-8 py-6 sm:py-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {featureName}
                </h2>
                <p className="text-blue-100">
                  Pro feature · Unlock now for just $1
                </p>
              </div>

              {/* Content */}
              <div className="px-4 sm:px-8 py-6 sm:py-8 space-y-6">
                {featureDescription && (
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {featureDescription}
                  </p>
                )}

                {/* Pricing Display */}
                <div className="border-2 border-blue-200 rounded-lg p-6 text-center bg-blue-50/50">
                  <div className="text-4xl font-bold text-blue-600 mb-1">
                    ${STRIPE_PRICES.lifetime.displayAmount}
                  </div>
                  <div className="text-gray-600 text-sm">
                    One-time lifetime purchase
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    No recurring charges. Unlock Pro forever.
                  </p>
                </div>

                {/* Features Included */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-sm">With Pro, you get:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">⭐</span>
                      <span>AI palette suggestions</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">⭐</span>
                      <span>Team collaboration & sharing</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600 font-bold">⭐</span>
                      <span>Advanced presets & workflows</span>
                    </li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-3 italic">
                    All exports, filters, and tools are included in free.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 px-4 sm:px-8 py-4 sm:py-6 bg-gray-50 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner size="sm" />
                      Processing...
                    </span>
                  ) : (
                    `Unlock for $1`
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
