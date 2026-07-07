import type { User as SupabaseUser } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}

export function toAuthUser(user: SupabaseUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    photoURL: user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null,
  }
}

export async function noopAuthAction(): Promise<void> {
  // Desktop / integrations-disabled mode
}
