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
  const { tier, isPro, subscriptionStatus, nextBillingDate, upgradeDate } = useUserTier()
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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Access & Membership</h2>

          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-2xl p-6 border border-purple-100 dark:border-purple-800/30">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {isPro ? 'Lifetime Pro' : 'Free Member'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {isPro ? 'Forever access to all features' : 'Basic features enabled'}
                  </p>
                </div>
                {isPro && (
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-purple-500/20">
                    LIFETIME
                  </span>
                )}
              </div>

              {!isPro && (
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-500 hover:to-pink-500 transition-all shadow-md shadow-purple-500/10"
                >
                  Get Lifetime Pro for $1
                </button>
              )}
            </div>

            {/* Billing Details */}
            {isPro && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Status</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">Permanently Active</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Unlocked On</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatDate(upgradeDate)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-700 dark:text-blue-400 flex gap-3">
                  <span className="text-lg">ℹ️</span>
                  <p>
                    You have permanent access to all Pro features. Since this is a one-time payment, there are no recurring subscriptions to manage or cancel. Your membership is linked to your account forever.
                  </p>
                </div>
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
