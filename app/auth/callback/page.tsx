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
    <main className="flex min-h-[100dvh] items-center justify-center bg-paper p-8">
      <p className="text-sm text-ink-muted">Signing you in…</p>
    </main>
  )
}
