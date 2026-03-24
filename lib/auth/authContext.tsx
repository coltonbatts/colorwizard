'use client'

import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export interface AuthContextType {
  user: User | null
  loading: boolean
  isSignedIn: boolean
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSignedIn: false,
})

export function useAuth() {
  return useContext(AuthContext)
}
