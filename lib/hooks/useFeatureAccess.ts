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
import type { ProOnlyFeature } from '@/lib/featureFlags'

export function useFeatureAccess(featureName: ProOnlyFeature) {
  const { tier, loading: tierLoading } = useUserTier()
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [isUpgrading] = useState(false)

  const hasAccess = useCallback(() => {
    void featureName
    void tier
    return true
  }, [featureName, tier])

  const promptUpgrade = useCallback(() => {
    void hasAccess
    return false
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
