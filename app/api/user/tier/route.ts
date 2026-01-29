/**
 * GET /api/user/tier
 * Returns the current user's tier and subscription information
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserTier, createUserDoc } from '@/lib/db/userTier'
import { getUserIdFromRequest } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    let userTierDoc = await getUserTier(userId)
    
    // Create user doc if it doesn't exist
    if (!userTierDoc) {
      await createUserDoc(userId)
      userTierDoc = await getUserTier(userId)
    }

    return NextResponse.json({
      tier: userTierDoc?.tier || 'free',
      subscriptionStatus: userTierDoc?.subscriptionStatus,
      subscriptionId: userTierDoc?.subscriptionId,
      nextBillingDate: userTierDoc?.nextBillingDate?.toDate?.() || null,
      upgradeDate: userTierDoc?.upgradeDate?.toDate?.() || null,
    })
  } catch (error) {
    console.error('Error fetching user tier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user tier' },
      { status: 500 }
    )
  }
}
