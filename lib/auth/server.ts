/**
 * Server-side auth utilities
 * For use in API routes and server components
 */

import { NextRequest } from 'next/server'

let adminApp: import('firebase-admin/app').App | null = null

async function getAdminApp() {
  if (adminApp) return adminApp

  const { initializeApp, getApps, cert } = await import('firebase-admin/app')

  if (getApps().length > 0) {
    adminApp = getApps()[0]
    return adminApp
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set')
  }

  const serviceAccount = JSON.parse(serviceAccountKey)
  adminApp = initializeApp({ credential: cert(serviceAccount) })
  return adminApp
}

/**
 * Verify a Firebase ID token using the Admin SDK.
 * Returns the decoded token (with uid) or null if invalid.
 */
export async function verifyIdToken(idToken: string): Promise<{ uid: string } | null> {
  try {
    const app = await getAdminApp()
    const { getAuth } = await import('firebase-admin/auth')
    const decoded = await getAuth(app).verifyIdToken(idToken)
    return { uid: decoded.uid }
  } catch {
    return null
  }
}

/**
 * Get verified user ID from Authorization header.
 * Format: "Bearer <idToken>"
 * Returns null if no valid token is present.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const idToken = authHeader.substring(7)
  const decoded = await verifyIdToken(idToken)
  return decoded?.uid ?? null
}
