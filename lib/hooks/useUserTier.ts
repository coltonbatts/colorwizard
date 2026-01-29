/**
 * React hook for user tier management
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import type { UserTier } from '@/lib/featureFlags'

interface UserTierData {
  tier: UserTier
  subscriptionStatus?: 'active' | 'canceled' | 'pending'
  subscriptionId?: string
  nextBillingDate?: string
  upgradeDate?: string
}

const DEFAULT_TIER: UserTierData = {
  tier: 'free',
  subscriptionStatus: undefined,
}

/**
 * Hook to get and manage user's subscription tier
 * Checks server for tier info on mount and when user changes
 */
export function useUserTier() {
  const { user } = useAuth()
  const [tierData, setTierData] = useState<UserTierData>(DEFAULT_TIER)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserTier = useCallback(async () => {
    try {
      setLoading(true)
      
      // Get ID token for authenticated request
      let idToken: string | undefined
      if (user) {
        idToken = await user.getIdToken()
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }
      if (idToken) {
        headers['Authorization'] = `Bearer ${idToken}`
      }

      const response = await fetch('/api/user/tier', { headers })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user tier: ${response.statusText}`)
      }
      
      const data = await response.json()
      setTierData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching user tier:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setTierData(DEFAULT_TIER)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch tier on mount and when user changes
  useEffect(() => {
    fetchUserTier()
  }, [fetchUserTier])

  return {
    tier: tierData.tier,
    subscriptionStatus: tierData.subscriptionStatus,
    subscriptionId: tierData.subscriptionId,
    nextBillingDate: tierData.nextBillingDate,
    upgradeDate: tierData.upgradeDate,
    loading,
    error,
    refetch: fetchUserTier,
    isPro: tierData.tier === 'pro',
  }
}
