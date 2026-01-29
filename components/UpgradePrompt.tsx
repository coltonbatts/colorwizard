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
  const handleUpgrade = () => {
    onUpgradeClick('annual' as any) // Keep internal logic consistent with previous calls if needed
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm z-50 px-4"
          >
            <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 px-8 py-10 text-center relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />

                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl">✨</div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">
                  Unlock {featureName}
                </h2>
                <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest opacity-80">
                  Join the Studio Pro Community
                </p>
              </div>

              {/* Content */}
              <div className="px-8 py-8 space-y-6">
                {featureDescription && (
                  <p className="text-gray-600 text-sm leading-relaxed font-medium text-center">
                    {featureDescription}
                  </p>
                )}

                {/* Pricing Display */}
                <div className="bg-indigo-50/50 rounded-3xl p-6 text-center border border-indigo-100/50">
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Lifetime Access</div>
                  <div className="text-5xl font-black text-gray-900 mb-1 tracking-tighter">
                    $1
                  </div>
                  <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    One-time payment • No subscriptions
                  </div>
                </div>

                {/* Features Included */}
                <div className="space-y-3">
                  <ul className="space-y-3 text-xs text-gray-600 font-bold">
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-[10px]">✓</div>
                      <span>AI Palette Suggestions</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-[10px]">✓</div>
                      <span>Unlimited Procreate Exports</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-[10px]">✓</div>
                      <span>AR Tracing Assistant</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center text-[10px]">🎨</div>
                      <span>Support Indie Development</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    'Processing...'
                  ) : (
                    <>Ready for Pro ($1)</>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
