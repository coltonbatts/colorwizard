'use client'

import { lazy, Suspense, type ReactNode } from 'react'
import { OPEN_SOURCE_MODE } from '@/lib/appMode'
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
 * In OPEN_SOURCE_MODE, Firebase Auth is not loaded (no SDK chunk, no network).
 * Paid / cloud builds use a lazy-loaded Firebase provider.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (OPEN_SOURCE_MODE) {
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
