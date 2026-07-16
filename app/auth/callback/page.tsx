'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      router.replace('/')
      return
    }

    void (async () => {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('[auth] OAuth callback failed:', error.message)
        }
      }

      router.replace('/')
    })()
  }, [router])

  return (
    <main className="system-page system-page--auth">
      <div className="system-page-grid" aria-hidden="true" />
      <section className="auth-signal" aria-label="Signing you in">
        <span /><span /><span /><span /><span />
      </section>
      <p className="system-page-kicker">Connecting</p>
    </main>
  )
}
