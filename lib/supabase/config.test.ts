import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupabasePublicConfig, isSupabaseConfigured } from './config'

describe('Supabase public configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports every missing browser variable clearly', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    expect(isSupabaseConfigured()).toBe(false)
    expect(() => getSupabasePublicConfig()).toThrow(/\.env\.local/)
    expect(() => getSupabasePublicConfig()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
    expect(() => getSupabasePublicConfig()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('accepts the modern publishable key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co/path')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

    expect(getSupabasePublicConfig()).toEqual({
      url: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test',
    })
  })

  it('keeps compatibility with a legacy anon key', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'legacy-anon-key')

    expect(isSupabaseConfigured()).toBe(true)
    expect(getSupabasePublicConfig().publishableKey).toBe('legacy-anon-key')
  })

  it('rejects insecure remote URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')

    expect(() => getSupabasePublicConfig()).toThrow(/HTTPS/)
  })
})
