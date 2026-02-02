/**
 * React hook for Firebase Auth
 * Manages user authentication state
 */

'use client'

import { useEffect, useState, useContext, createContext, ReactNode } from 'react'
import { getFirebaseAuth } from '@/lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  isSignedIn: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isSignedIn: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const auth = getFirebaseAuth()
      if (!auth) {
        setLoading(false)
        return
      }
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
      })

      return unsubscribe
    } catch (error) {
      // If Firebase fails to initialize (mobile Safari, network issues, etc.), 
      // gracefully degrade rather than crash the entire app
      console.warn('Firebase Auth initialization failed:', error)
      setLoading(false)
      return undefined
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSignedIn: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
