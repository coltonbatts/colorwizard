/**
 * Settings Page
 * User account and subscription management
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { useUserTier } from '@/lib/hooks/useUserTier'
import PricingModal from '@/components/PricingModal'

export default function SettingsPage() {
  const { user } = useAuth()
  const { tier, subscriptionStatus, nextBillingDate, upgradeDate } = useUserTier()
  const [showPricingModal, setShowPricingModal] = useState(false)

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and subscription</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Account Info */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={user?.displayName || 'Not set'}
                disabled
                className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Subscription</h2>

          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                    {tier} Plan
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {subscriptionStatus || 'Not subscribed'}
                  </p>
                </div>
                {tier === 'pro' && (
                  <span className="bg-green-100 text-green-800 text-sm font-semibold px-4 py-2 rounded-full">
                    Active
                  </span>
                )}
              </div>

              {tier === 'free' && (
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Upgrade to Pro
                </button>
              )}
            </div>

            {/* Billing Details */}
            {tier === 'pro' && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Billing Details</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Next Billing Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(nextBillingDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Upgrade Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(upgradeDate)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Manage Subscription */}
            {tier === 'pro' && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Manage Subscription</h3>
                <p className="text-gray-600 text-sm mb-4">
                  To manage billing, update payment method, or cancel your subscription, visit your Stripe customer portal.
                </p>
                <button
                  onClick={() => {
                    // In production, redirect to Stripe customer portal
                    alert('Coming soon: Stripe customer portal integration')
                  }}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  View Billing Portal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Security</h2>
          <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            Change Password
          </button>
        </div>
      </div>

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  )
}
