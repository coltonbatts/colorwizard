'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { getFirebaseAuth } from '@/lib/firebase'
import { AuthContext } from './authContext'

export default function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const auth = getFirebaseAuth()
      if (!auth) {
        setLoading(false)
        return
      }
      const unsubscribe = onAuthStateChanged(auth, (next) => {
        setUser(next)
        setLoading(false)
      })
      return unsubscribe
    } catch (error) {
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
