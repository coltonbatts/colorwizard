'use client'

import { createContext, useContext } from 'react'
import type { AuthUser } from './types'
import { noopAuthAction } from './types'

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isSignedIn: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSignedIn: false,
  signInWithGoogle: noopAuthAction,
  signOut: noopAuthAction,
})

export function useAuth() {
  return useContext(AuthContext)
}
