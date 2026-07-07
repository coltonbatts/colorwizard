'use client'

import { lazy, Suspense, type ReactNode } from 'react'
import { SERVER_INTEGRATIONS_ENABLED } from '@/lib/appMode'
import { AuthContext } from './authContext'
import { noopAuthAction } from './types'

export { useAuth } from './authContext'

const SupabaseAuthProvider = lazy(() => import('./SupabaseAuthProvider'))

function AuthLoadingShell({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider
      value={{
        user: null,
        loading: true,
        isSignedIn: false,
        signInWithGoogle: noopAuthAction,
        signOut: noopAuthAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const integrationsDisabledValue = {
  user: null,
  loading: false,
  isSignedIn: false,
  signInWithGoogle: noopAuthAction,
  signOut: noopAuthAction,
} as const

/**
 * Desktop ships without a required cloud account, so Supabase Auth stays disabled
 * unless server integrations are explicitly enabled again.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  if (!SERVER_INTEGRATIONS_ENABLED) {
    return (
      <AuthContext.Provider value={integrationsDisabledValue}>
        {children}
      </AuthContext.Provider>
    )
  }

  return (
    <Suspense fallback={<AuthLoadingShell>{children}</AuthLoadingShell>}>
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    </Suspense>
  )
}
