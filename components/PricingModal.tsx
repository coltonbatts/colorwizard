/**
 * PricingModal Component
 * Shows tier comparison and upgrade options
 */

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STRIPE_PRICES, ANNUAL_MONTHLY_EQUIVALENT, ANNUAL_DISCOUNT_PERCENT } from '@/lib/stripe-config'
import { getProOnlyFeatures } from '@/lib/featureFlags'
import { useUserTier } from '@/lib/hooks/useUserTier'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { tier, isPro } = useUserTier()
  const [isUpgrading, setIsUpgrading] = useState(false)

  const handleUpgrade = async () => {
    setIsUpgrading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      alert('Failed to start upgrade. Please try again.')
    } finally {
      setIsUpgrading(false)
    }
  }

  const features = [
    { name: 'Unlimited palette generation', proOnly: false },
    { name: 'Unlimited Procreate export (30 colors)', proOnly: true },
    { name: 'AR Tracing for your physical canvas', proOnly: true },
    { name: 'AI-power color harmony suggestions', proOnly: true },
    { name: 'Advanced exports (Figma, Adobe, Framer)', proOnly: true },
    { name: 'DMC floss matching & export', proOnly: true },
    { name: 'Zero tracking & privacy-first', proOnly: false },
  ]

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] z-50 overflow-y-auto"
          >
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 px-8 py-12 text-center relative">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
                <h2 className="text-4xl font-black text-white mb-3">
                  One-time payment.<br />Forever Pro.
                </h2>
                <p className="text-white/90 text-lg">
                  Help a solo dev build the best painter's tool
                </p>
              </div>

              {/* Pricing Content */}
              <div className="p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Features:</h3>
                    <ul className="space-y-4">
                      {features.map((feature, i) => (
                        <motion.li
                          key={feature.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="flex items-start gap-3"
                        >
                          <span className={`mt-0.5 font-bold ${feature.proOnly ? 'text-purple-500' : 'text-green-500'}`}>
                            {feature.proOnly ? '✨' : '✓'}
                          </span>
                          <span className={`text-sm ${feature.proOnly ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                            {feature.name}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-8 text-center border border-gray-100 dark:border-gray-800 shadow-inner">
                    <div className="text-sm font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-2">Lifetime Access</div>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <span className="text-2xl font-bold text-gray-500 line-through opacity-50">$5.00</span>
                      <span className="text-6xl font-black text-gray-900 dark:text-white">$1</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 font-medium">Limited Launch Offer</p>

                    <button
                      onClick={handleUpgrade}
                      disabled={isPro || isUpgrading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-xl shadow-purple-500/20 disabled:opacity-50 disabled:grayscale mb-4 flex items-center justify-center gap-2"
                    >
                      {isPro ? '✓ You Are Pro' : isUpgrading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Get Lifetime Pro Now'}
                    </button>

                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                      Secure Checkout via Stripe
                    </p>
                  </div>
                </div>

                {/* Guilt-trip / Artist section */}
                <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-xl">👨‍💻</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed">
                      "I built ColorWizard because I was fed up with tools charging $30/year for basic features. For the price of half a coffee, you're not just getting Pro features—you're supporting a fellow artist and keeping this project open-source and tracking-free. Thank you."
                      <br />
                      <span className="font-bold text-gray-900 dark:text-white not-italic mt-2 block">— Colton</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="bg-gray-50 dark:bg-gray-800/30 px-8 py-6 flex justify-center">
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-semibold text-sm transition-colors"
                >
                  Return to Studio
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
