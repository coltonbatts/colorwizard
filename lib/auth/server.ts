/**
 * Server-side auth utilities
 * For use in API routes and server components
 */

import { NextRequest } from 'next/server'
import { verifyAccessToken } from '@/lib/supabase/server'

/**
 * Verify a Supabase access token.
 * Returns the user id or null if invalid.
 */
export async function verifyIdToken(accessToken: string): Promise<{ uid: string } | null> {
  const verified = await verifyAccessToken(accessToken)
  if (!verified) return null
  return { uid: verified.id }
}

/**
 * Get verified user ID from Authorization header.
 * Format: "Bearer <accessToken>"
 * Returns null if no valid token is present.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const accessToken = authHeader.substring(7)
  const decoded = await verifyIdToken(accessToken)
  return decoded?.uid ?? null
}
