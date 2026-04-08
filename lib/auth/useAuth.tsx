'use client'

import { lazy, Suspense, type ReactNode } from 'react'
import { SERVER_INTEGRATIONS_ENABLED } from '@/lib/appMode'
import { AuthContext } from './authContext'

export { useAuth } from './authContext'

const FirebaseAuthProvider = lazy(() => import('./FirebaseAuthProvider'))

function AuthLoadingShell({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null, loading: true, isSignedIn: false }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Desktop ships without a required cloud account, so Firebase Auth stays disabled
 * unless server integrations are explicitly enabled again.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!SERVER_INTEGRATIONS_ENABLED) {
    return (
      <AuthContext.Provider value={{ user: null, loading: false, isSignedIn: false }}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <Suspense fallback={<AuthLoadingShell>{children}</AuthLoadingShell>}>
      <FirebaseAuthProvider>{children}</FirebaseAuthProvider>
    </Suspense>
  )
}
