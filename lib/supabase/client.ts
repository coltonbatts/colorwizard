import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig, isSupabaseConfigured } from './config'
import type { Database } from './database.types'

export type ColorWizardSupabaseClient = SupabaseClient<Database>

let browserClient: ColorWizardSupabaseClient | null = null

export function getSupabaseBrowserClient(): ColorWizardSupabaseClient {
  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicConfig()
    browserClient = createBrowserClient<Database>(url, publishableKey)
  }
  return browserClient
}

/**
 * Keeps ColorWizard's local-first shell usable when cloud integrations are not
 * configured. Feature code that requires Supabase should use the strict getter.
 */
export function getOptionalSupabaseBrowserClient(): ColorWizardSupabaseClient | null {
  return isSupabaseConfigured() ? getSupabaseBrowserClient() : null
}
