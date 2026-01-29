/**
 * Server-side auth utilities
 * For use in API routes and server components
 */

import { NextRequest } from 'next/server'

/**
 * Get user ID from Authorization header
 * Format: "Bearer <idToken>"
 * This would be sent from the client after Firebase Auth
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  
  if (!authHeader?.startsWith('Bearer ')) {
    // Fallback to demo user for development
    console.warn('No Authorization header found, using demo user')
    return 'demo-user'
  }

  const idToken = authHeader.substring(7)
  
  // In production, verify the ID token with Firebase Admin SDK
  // For now, return the token as user ID
  // TODO: Implement proper Firebase Admin SDK verification
  return idToken
}

/**
 * Verify Firebase ID token (requires firebase-admin)
 * TODO: Set up Firebase Admin SDK
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  // This would use firebase-admin
  // const decodedToken = await admin.auth().verifyIdToken(idToken)
  // return decodedToken
  
  // For now, return a placeholder
  return null
}
