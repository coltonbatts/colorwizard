const SUPABASE_URL_ENV = 'NEXT_PUBLIC_SUPABASE_URL'
const SUPABASE_PUBLISHABLE_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
const LEGACY_SUPABASE_ANON_KEY_ENV = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

export interface SupabasePublicConfig {
  url: string
  publishableKey: string
}

function readPublicConfig(): Partial<SupabasePublicConfig> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(),
    publishableKey: (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    ),
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, publishableKey } = readPublicConfig()
  return Boolean(url && publishableKey)
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const { url, publishableKey } = readPublicConfig()
  const missing: string[] = []

  if (!url) missing.push(SUPABASE_URL_ENV)
  if (!publishableKey) {
    missing.push(`${SUPABASE_PUBLISHABLE_KEY_ENV} (or legacy ${LEGACY_SUPABASE_ANON_KEY_ENV})`)
  }

  if (missing.length > 0) {
    throw new Error(
      `Supabase is not configured. Add ${missing.join(' and ')} to .env.local and restart the app.`,
    )
  }

  // The missing-variable guard above establishes both values for TypeScript.
  const configuredUrl = url as string
  const configuredPublishableKey = publishableKey as string

  let parsedUrl: URL
  try {
    parsedUrl = new URL(configuredUrl)
  } catch {
    throw new Error(`${SUPABASE_URL_ENV} must be a valid URL.`)
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    throw new Error(`${SUPABASE_URL_ENV} must use HTTPS outside localhost.`)
  }

  return {
    url: parsedUrl.origin,
    publishableKey: configuredPublishableKey,
  }
}
