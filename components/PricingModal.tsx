/**
 * PricingModal Component
 * Shows tier comparison and $1 lifetime upgrade option
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STRIPE_PRICES } from '@/lib/stripe-config'
import { getProFeatures, FREE_FEATURES, PRO_ONLY_FEATURES } from '@/lib/featureFlags'
import { useUserTier } from '@/lib/hooks/useUserTier'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { tier } = useUserTier()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const proFeatures = getProFeatures()

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    setError(null)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error initiating upgrade:', error)
      setError('Checkout failed to load. Check your internet and try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  // All features available in free tier
  const freeFeatures = FREE_FEATURES.map(name => ({ name, included: true }))
  
  // Pro-only features
  const proOnlyFeatures = PRO_ONLY_FEATURES.map(name => ({ name, included: false }))

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
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] z-50 overflow-y-auto"
          >
            <div className="bg-white rounded-2xl shadow-2xl">
              {/* Error Toast */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-50 border-l-4 border-red-500 px-6 py-4 text-red-700"
                  >
                    <p className="font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-8 py-8 sm:py-12 text-center">
                <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3">
                  Simple, Transparent Pricing
                </h2>
                <p className="text-blue-100 text-base sm:text-lg">
                  Unlock Pro features with a one-time lifetime purchase
                </p>
              </div>

              {/* Pricing Cards */}
              <div className="px-4 sm:px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                {/* Free Tier */}
                <div className="border-2 border-gray-200 rounded-xl p-4 sm:p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Free</h3>
                  <p className="text-gray-600 mb-6">For individual designers</p>
                  <div className="text-4xl font-bold text-gray-900 mb-1">$0</div>
                  <p className="text-gray-600 text-sm mb-8">Forever free, no credit card</p>

                  <button
                    disabled={tier === 'free'}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      tier === 'free'
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : 'bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                  >
                    {tier === 'free' ? '✓ Current Plan' : 'Downgrade'}
                  </button>

                  <div className="mt-8 space-y-4">
                    {/* All free features */}
                    {freeFeatures.map((feature) => (
                      <div key={feature.name} className="flex gap-3">
                        <span className="text-green-600 font-bold">✓</span>
                        <span className="text-gray-900">{feature.name}</span>
                      </div>
                    ))}
                    {/* Grayed out pro-only features */}
                    {proOnlyFeatures.map((feature) => (
                      <div key={feature.name} className="flex gap-3">
                        <span className="text-gray-300">−</span>
                        <span className="text-gray-400">{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro Tier */}
                <div className="border-2 border-blue-500 rounded-xl p-4 sm:p-8 relative bg-blue-50/30">
                  <div className="absolute -top-4 left-8 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                  <p className="text-gray-600 mb-6">Unlock forever</p>

                  <div>
                    <div className="text-4xl font-bold text-blue-600 mb-1">
                      ${STRIPE_PRICES.lifetime.displayAmount}
                    </div>
                    <p className="text-gray-600 text-sm mb-8">One-time lifetime purchase</p>
                  </div>

                  <button
                    onClick={() => handleUpgrade()}
                    disabled={tier === 'pro' || tier === 'pro_lifetime' || isUpgrading}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      tier === 'pro' || tier === 'pro_lifetime'
                        ? 'bg-gray-100 text-gray-500 cursor-default'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {tier === 'pro' || tier === 'pro_lifetime'
                      ? '✓ Current Plan' 
                      : isUpgrading 
                      ? 'Processing...' 
                      : 'Upgrade for $1'}
                  </button>

                  <div className="mt-8 space-y-3">
                    {/* Pro tier gets everything from free */}
                    {freeFeatures.map((feature) => (
                      <div key={feature.name} className="flex gap-3">
                        <span className="text-green-600 font-bold">✓</span>
                        <span className="text-gray-900">{feature.name}</span>
                      </div>
                    ))}
                    
                    {/* Plus pro-only features */}
                    <div className="border-t border-blue-200 pt-3 mt-3">
                      <p className="text-xs font-semibold text-blue-700 mb-2">PRO ADDITIONS:</p>
                      {PRO_ONLY_FEATURES.map((feature) => (
                        <div key={feature} className="flex gap-3">
                          <span className="text-blue-600 font-bold">⭐</span>
                          <span className="text-gray-900">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-gray-50 px-4 sm:px-8 py-8 sm:py-12 border-t border-gray-200">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
                  Frequently Asked Questions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 max-w-3xl mx-auto">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Is this a subscription?</h4>
                    <p className="text-gray-600 text-sm">
                      No! One-time $1 payment = Pro features for life. No recurring charges.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h4>
                    <p className="text-gray-600 text-sm">
                      We accept all major credit and debit cards through Stripe.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h4>
                    <p className="text-gray-600 text-sm">
                      The free tier is unlimited! Try all free features before upgrading.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">What if I'm not satisfied?</h4>
                    <p className="text-gray-600 text-sm">
                      Reach out for a refund within 7 days. We stand behind our product.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-gray-200 px-8 py-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  title="Already purchased? Click to sync your purchase status"
                >
                  Restore Purchase
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
