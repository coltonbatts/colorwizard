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

    try {
      let userTierDoc = await getUserTier(userId)

      // Create user doc if it doesn't exist
      if (!userTierDoc) {
        // Only attempt to create if DB is available (handled inside createUserDoc or here)
        try {
          await createUserDoc(userId)
          userTierDoc = await getUserTier(userId)
        } catch (createError) {
          console.warn('Failed to create user doc, continuing with default', createError)
        }
      }

      return NextResponse.json({
        tier: userTierDoc?.tier || 'free',
        subscriptionStatus: userTierDoc?.subscriptionStatus,
        subscriptionId: userTierDoc?.subscriptionId,
        nextBillingDate: userTierDoc?.nextBillingDate?.toDate?.() || null,
        upgradeDate: userTierDoc?.upgradeDate?.toDate?.() || null,
        source: 'database'
      })
    } catch (dbError) {
      // Specifically handle "Database not initialized" or other Firebase failures
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);

      const isFirebaseError = typeof dbError === 'object' && dbError !== null && 'code' in dbError;
      const errorCode = isFirebaseError ? (dbError as { code: string }).code : undefined;

      if (errorMessage.includes('Database not initialized') || errorCode === 'failed-precondition') {
        console.warn('Firebase not initialized, returning fallback tier')
        return NextResponse.json({
          tier: 'free',
          source: 'fallback',
          message: 'Firebase not configured'
        })
      }
      throw dbError; // Re-throw other unexpected database errors to be caught by outer block
    }
  } catch (error) {
    console.error('Error fetching user tier:', error)
    return NextResponse.json(
      {
        tier: 'free',
        source: 'error-fallback',
        error: 'Failed to fetch user tier'
      },
      { status: 200 } // Return 200 even on error to prevent app breakage
    )
  }
}
