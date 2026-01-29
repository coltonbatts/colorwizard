/**
 * Hook to check feature access and show upgrade modal
 * Usage: const { hasAccess, promptUpgrade } = useFeatureAccess('aiPaletteSuggestions')
 */

'use client'

import { useState, useCallback } from 'react'
import { useUserTier } from './useUserTier'
import { isFeatureEnabled, type FeatureName } from '@/lib/featureFlags'

interface UseFeatureAccessOptions {
  featureName: FeatureName
  onAccessDenied?: () => void
}

export function useFeatureAccess(featureName: FeatureName) {
  const { tier, loading: tierLoading } = useUserTier()
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isUpgrading, setIsUpgrading] = useState(false)

  const hasAccess = useCallback(() => {
    return isFeatureEnabled(featureName, tier)
  }, [featureName, tier])

  const promptUpgrade = useCallback(() => {
    if (!hasAccess()) {
      setShowUpgradePrompt(true)
      return true
    }
    return false
  }, [hasAccess])

  const handleUpgradeClick = useCallback(
    async (billingPeriod: 'monthly' | 'annual') => {
      setIsUpgrading(true)
      try {
        const response = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            priceId: billingPeriod,
            email: '', // Optional, or get from auth context
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create checkout session')
        }

        const data = await response.json()
        
        // Redirect to Stripe Checkout
        if (data.url) {
          window.location.href = data.url
        } else if (data.error) {
          throw new Error(data.error)
        }
      } catch (error) {
        console.error('Error initiating upgrade:', error)
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        alert(`Failed to start upgrade: ${message}. Please try again.`)
      } finally {
        setIsUpgrading(false)
      }
    },
    []
  )

  return {
    hasAccess: hasAccess(),
    tier,
    tierLoading,
    showUpgradePrompt,
    setShowUpgradePrompt,
    promptUpgrade,
    handleUpgradeClick,
    isUpgrading,
  }
}
