/**
 * PricingModal Component
 * Shows tier comparison and $1 lifetime upgrade option
 */

'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { STRIPE_PRICES } from '@/lib/stripe-config'
import { FREE_FEATURES, PRO_ONLY_FEATURES } from '@/lib/featureFlags'
import { useUserTier } from '@/lib/hooks/useUserTier'
import OverlaySurface from '@/components/ui/Overlay'

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { tier } = useUserTier()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()

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

  const freeFeatures = FREE_FEATURES.map((name) => ({ name, included: true }))
  const proOnlyFeatures = PRO_ONLY_FEATURES.map((name) => ({ name, included: false }))

  return (
    <OverlaySurface
      isOpen={isOpen}
      onClose={onClose}
      preset="dialog"
      ariaLabelledBy={titleId}
      rootClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      backdropClassName="absolute inset-0 bg-black/40"
      panelClassName="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none"
    >
      {error && (
        <div
          role="status"
          aria-live="polite"
          className="border-l-4 border-red-500 bg-red-50 px-6 py-4 text-red-700"
        >
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-8 text-center sm:px-8 sm:py-12">
        <h2 id={titleId} className="mb-3 text-2xl font-bold text-white sm:text-4xl">
          Simple, Transparent Pricing
        </h2>
        <p className="text-base text-blue-100 sm:text-lg">
          Unlock Pro features with a one-time lifetime purchase
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 gap-4 px-4 py-8 sm:gap-8 sm:px-8 md:grid-cols-2">
        {/* Free Tier */}
        <div className="rounded-xl border-2 border-gray-200 p-4 sm:p-8">
          <h3 className="mb-2 text-2xl font-bold text-gray-900">Free</h3>
          <p className="mb-6 text-gray-600">For individual designers</p>
          <div className="mb-1 text-4xl font-bold text-gray-900">$0</div>
          <p className="mb-8 text-sm text-gray-600">Forever free, no credit card</p>

          <button
            type="button"
            disabled={tier === 'free'}
            className={`w-full rounded-lg py-3 font-semibold transition-colors ${
              tier === 'free'
                ? 'cursor-default bg-gray-100 text-gray-500'
                : 'border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            {tier === 'free' ? '✓ Current Plan' : 'Downgrade'}
          </button>

          <div className="mt-8 space-y-4">
            {freeFeatures.map((feature) => (
              <div key={feature.name} className="flex gap-3">
                <span className="font-bold text-green-600">✓</span>
                <span className="text-gray-900">{feature.name}</span>
              </div>
            ))}
            {proOnlyFeatures.map((feature) => (
              <div key={feature.name} className="flex gap-3">
                <span className="text-gray-300">−</span>
                <span className="text-gray-400">{feature.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro Tier */}
        <div className="relative rounded-xl border-2 border-blue-500 bg-blue-50/30 p-4 sm:p-8">
          <div className="absolute -top-4 left-8 rounded-full bg-blue-500 px-4 py-1 text-sm font-semibold text-white">
            Most Popular
          </div>

          <h3 className="mb-2 text-2xl font-bold text-gray-900">Pro</h3>
          <p className="mb-6 text-gray-600">Unlock forever</p>

          <div>
            <div className="mb-1 text-4xl font-bold text-blue-600">
              ${STRIPE_PRICES.lifetime.displayAmount}
            </div>
            <p className="mb-8 text-sm text-gray-600">One-time lifetime purchase</p>
          </div>

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={tier === 'pro' || tier === 'pro_lifetime' || isUpgrading}
            className={`w-full rounded-lg py-3 font-semibold transition-colors ${
              tier === 'pro' || tier === 'pro_lifetime'
                ? 'cursor-default bg-gray-100 text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50'
            }`}
          >
            {tier === 'pro' || tier === 'pro_lifetime'
              ? '✓ Current Plan'
              : isUpgrading
                ? 'Processing...'
                : 'Upgrade for $1'}
          </button>

          <div className="mt-8 space-y-3">
            {freeFeatures.map((feature) => (
              <div key={feature.name} className="flex gap-3">
                <span className="font-bold text-green-600">✓</span>
                <span className="text-gray-900">{feature.name}</span>
              </div>
            ))}

            <div className="mt-3 border-t border-blue-200 pt-3">
              <p className="mb-2 text-xs font-semibold text-blue-700">PRO ADDITIONS:</p>
              {PRO_ONLY_FEATURES.map((feature) => (
                <div key={feature} className="flex gap-3">
                  <span className="font-bold text-blue-600">⭐</span>
                  <span className="text-gray-900">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-8 sm:px-8 sm:py-12">
        <h3 className="mb-6 text-center text-xl font-bold text-gray-900 sm:mb-8 sm:text-2xl">
          Frequently Asked Questions
        </h3>
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:gap-8 md:grid-cols-2">
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Is this a subscription?</h4>
            <p className="text-sm text-gray-600">
              No! One-time $1 payment = Pro features for life. No recurring charges.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">What payment methods do you accept?</h4>
            <p className="text-sm text-gray-600">
              We accept all major credit and debit cards through Stripe.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Is there a free trial?</h4>
            <p className="text-sm text-gray-600">
              The free tier is unlimited! Try all free features before upgrading.
            </p>
          </div>
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">What if I&apos;m not satisfied?</h4>
            <p className="text-sm text-gray-600">
              Reach out for a refund within 7 days. We stand behind our product.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4 border-t border-gray-200 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="font-medium text-gray-600 transition-colors hover:text-gray-900"
            title="Already purchased? Click to sync your purchase status"
          >
            Restore Purchase
          </button>
          <Link
            href="/support"
            onClick={onClose}
            className="font-medium text-gray-600 transition-colors hover:text-gray-900"
            title="Get help with Pro features and billing"
          >
            Support
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="font-medium text-gray-600 transition-colors hover:text-gray-900"
        >
          Close
        </button>
      </div>
    </OverlaySurface>
  )
}
