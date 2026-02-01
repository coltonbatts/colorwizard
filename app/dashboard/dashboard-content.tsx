/**
 * Dashboard Content - Client Component
 * Wrapped in Suspense to avoid useSearchParams issues
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl p-8 text-center shadow-xl relative overflow-hidden"
          >
            {/* Animated background glow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 bg-white/20 rounded-2xl"
            />
            
            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Welcome to Pro!
              </h2>
              <p className="text-white/90 mb-6 text-lg">
                Your upgrade was successful. All Pro features are now unlocked.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/')}
                className="bg-white text-emerald-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
              >
                Continue to Color Mixer
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-8">
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
                                ✓ You&apos;re a Pro member!
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
