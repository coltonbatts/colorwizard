import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let adminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secretKey) {
    throw new Error(
      'Server-side Supabase access requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).',
    )
  }

  adminClient = createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return adminClient
}

export async function verifyAccessToken(accessToken: string): Promise<{ id: string } | null> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.auth.getUser(accessToken)
    if (error || !data.user) return null
    return { id: data.user.id }
  } catch {
    return null
  }
}
