/**
 * Server-side auth utilities
 * For use in API routes and server components
 */

import { NextRequest } from 'next/server'

const FIREBASE_ADMIN_PLACEHOLDER_MESSAGE =
  'Firebase Admin verification is not configured in this repo; server auth remains placeholder logic.'
let hasWarnedAboutFirebaseAdminPlaceholder = false

function warnFirebaseAdminPlaceholder() {
  if (hasWarnedAboutFirebaseAdminPlaceholder) {
    return
  }

  hasWarnedAboutFirebaseAdminPlaceholder = true
  console.warn(FIREBASE_ADMIN_PLACEHOLDER_MESSAGE)
}

/**
 * Get user ID from Authorization header
 * Format: "Bearer <idToken>"
 * This would be sent from the client after Firebase Auth
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    // Fallback to demo user for development
    warnFirebaseAdminPlaceholder()
    console.warn('No Authorization header found, using demo user')
    return 'demo-user'
  }

  const idToken = authHeader.substring(7)
  
  // Without firebase-admin configured, this remains a passthrough placeholder.
  warnFirebaseAdminPlaceholder()
  return idToken
}

/**
 * Verify Firebase ID token.
 * This repo does not currently ship firebase-admin, so verification is disabled.
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  void idToken
  warnFirebaseAdminPlaceholder()
  return null
}
