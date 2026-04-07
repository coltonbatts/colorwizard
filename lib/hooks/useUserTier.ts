/**
 * React hook for user tier management.
 * The offline desktop build does not fetch account state from a server.
 */

'use client'

import type { UserTier } from '@/lib/featureFlags'

interface UserTierData {
  tier: UserTier
  subscriptionStatus?: 'active' | 'canceled' | 'pending'
  subscriptionId?: string
  nextBillingDate?: string
  upgradeDate?: string
}

const LOCAL_TIER: UserTierData = {
  tier: 'free',
  subscriptionStatus: undefined,
}

export function useUserTier() {
  const refetch = async () => undefined

  return {
    tier: LOCAL_TIER.tier,
    subscriptionStatus: LOCAL_TIER.subscriptionStatus,
    subscriptionId: LOCAL_TIER.subscriptionId,
    nextBillingDate: LOCAL_TIER.nextBillingDate,
    upgradeDate: LOCAL_TIER.upgradeDate,
    loading: false,
    error: null,
    refetch,
    isPro: true,
  }
}
