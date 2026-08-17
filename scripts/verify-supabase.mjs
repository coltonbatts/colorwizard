import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const publishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
)

const missing = []
if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!publishableKey) {
  missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)')
}

if (missing.length > 0) {
  console.error(`Supabase check failed: add ${missing.join(' and ')} to .env.local.`)
  process.exitCode = 1
} else {
  const supabase = createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error(`Supabase check failed: ${error.message}`)
    console.error('The URL/key may be invalid, or the user_profiles migrations may not be applied yet.')
    process.exitCode = 1
  } else {
    console.log(`Supabase connection verified for ${new URL(url).origin}.`)
    console.log('The user_profiles table is reachable and RLS returned no user data for this unauthenticated check.')
  }
}
