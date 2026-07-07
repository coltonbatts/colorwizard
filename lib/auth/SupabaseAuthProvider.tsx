'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthContext } from './authContext'
import { toAuthUser } from './types'

export default function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReturnType<typeof toAuthUser> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      throw new Error('Supabase is not configured')
    }

    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSignedIn: !!user,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
