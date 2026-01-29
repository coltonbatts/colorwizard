/**
 * Dashboard Content - Client Component
 * Wrapped in Suspense to avoid useSearchParams issues
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUserTier } from '@/lib/hooks/useUserTier'

export default function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { tier, refetch } = useUserTier()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  useEffect(() => {
    const upgrade = searchParams.get('upgrade')
    const sessionId = searchParams.get('session_id')

    if (upgrade === 'success' && sessionId) {
      setShowSuccessMessage(true)
      // Refetch user tier to confirm upgrade
      refetch()
      
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams, refetch])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        {showSuccessMessage && (
          <div className="mb-8 bg-green-100 border-2 border-green-500 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-green-700 mb-2">
              🎉 Welcome to ColorWizard Pro!
            </h2>
            <p className="text-green-600 mb-4">
              Your upgrade was successful. You now have access to all Pro features.
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Return to App
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
            <p className="text-gray-700">
              <strong>Current Tier:</strong>{' '}
              <span className="text-lg font-semibold text-blue-600 capitalize">
                {tier}
              </span>
            </p>
          </div>

          {tier === 'free' && (
            <div className="mt-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to unlock Pro features?
              </h2>
              <button
                onClick={() => router.push('/pricing')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          {(tier === 'pro' || tier === 'pro_lifetime') && (
            <div className="mt-8 bg-green-50 border-2 border-green-500 rounded-lg p-6">
              <h2 className="text-xl font-bold text-green-700 mb-2">
                ✓ You're a Pro member!
              </h2>
              <p className="text-green-600">
                {tier === 'pro_lifetime' 
                  ? 'Enjoy unlimited access to all Pro features. Yours forever!' 
                  : 'Enjoy unlimited access to all advanced features.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
