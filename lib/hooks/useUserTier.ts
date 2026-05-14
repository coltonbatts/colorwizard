/**
 * React hook for user tier management.
 * Desktop unlocks locally via license key, so no server fetch is required.
 */

'use client'

import type { UserTier } from '@/lib/featureFlags'
import { isDesktopApp } from '@/lib/desktop/detect'

export function useUserTier() {
  const tier: UserTier = isDesktopApp() ? 'licensed' : 'free'
  const refetch = async () => undefined

  return {
    tier,
    loading: false,
    error: null,
    refetch,
    isPro: tier !== 'free',
  }
}
