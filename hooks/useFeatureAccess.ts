/**
 * Hook to check feature access and show upgrade modal
 * 
 * PHILOSOPHY: Only gated for actual Pro features (AI, collaboration, presets).
 * Everything else is always accessible.
 * 
 * Usage: const { hasAccess, promptUpgrade } = useFeatureAccess('aiPaletteSuggestions')
 */

'use client'

import { useState, useCallback } from 'react'
import { useUserTier } from './useUserTier'
import { hasAccessToProFeature, type ProOnlyFeature } from '@/lib/featureFlags'

export function useFeatureAccess(featureName: ProOnlyFeature) {
  const { tier, loading: tierLoading } = useUserTier()
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isUpgrading] = useState(false)

  const hasAccess = useCallback(() => {
    return hasAccessToProFeature(featureName, tier)
  }, [featureName, tier])

  const promptUpgrade = useCallback(() => {
    const allowed = hasAccess()
    if (!allowed) {
      setShowUpgradePrompt(true)
    }
    return allowed
  }, [hasAccess])

  const handleUpgradeClick = useCallback(async () => {
    setShowUpgradePrompt(false)
  }, [])

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
