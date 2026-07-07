/**
 * Supabase user tier management
 * Handles user profile creation, tier updates, and subscription tracking
 */

import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { UserTier } from '@/lib/featureFlags'

export interface UserProfile {
  id: string
  tier: UserTier
  email?: string | null
  stripe_customer_id?: string | null
  pro_unlocked_at?: string | null
  created_at: string
  stripe_last_checkout_session_id?: string | null
}

function mapProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    tier: row.tier as UserTier,
    email: (row.email as string | null | undefined) ?? null,
    stripe_customer_id: (row.stripe_customer_id as string | null | undefined) ?? null,
    pro_unlocked_at: (row.pro_unlocked_at as string | null | undefined) ?? null,
    created_at: String(row.created_at),
    stripe_last_checkout_session_id:
      (row.stripe_last_checkout_session_id as string | null | undefined) ?? null,
  }
}

/** @deprecated Use UserProfile */
export type UserTierDoc = UserProfile

/**
 * Create a new user profile with free tier
 */
export async function createUserDoc(userId: string, email?: string): Promise<UserProfile> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      tier: 'free',
      email: email ?? null,
    })
    .select('*')
    .single()

  if (error) throw error
  return mapProfile(data)
}

/**
 * Get user's tier information
 */
export async function getUserTier(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) return null
  if (!data) return null
  return mapProfile(data)
}

/**
 * Link a Stripe customer to user (if signing up later)
 */
export async function linkStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('user_profiles')
    .update({ stripe_customer_id: stripeCustomerId })
    .eq('id', userId)

  if (error) throw error
}

/**
 * Unlock Pro Lifetime tier for a user (idempotent one-time purchase)
 * @returns true if newly unlocked, false if already processed
 */
export async function unlockProLifetime(
  userId: string,
  {
    checkoutSessionId,
    stripeCustomerId,
  }: {
    checkoutSessionId: string
    stripeCustomerId?: string
  },
): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const existing = await getUserTier(userId)

  if (!existing) {
    const { error } = await supabase.from('user_profiles').insert({
      id: userId,
      tier: 'pro_lifetime',
      pro_unlocked_at: new Date().toISOString(),
      stripe_customer_id: stripeCustomerId ?? null,
      stripe_last_checkout_session_id: checkoutSessionId,
    })
    if (error) throw error
    return true
  }

  if (existing.stripe_last_checkout_session_id === checkoutSessionId) {
    console.log(`Checkout session ${checkoutSessionId} already processed for user ${userId}`)
    return false
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      tier: 'pro_lifetime',
      pro_unlocked_at: new Date().toISOString(),
      stripe_customer_id: stripeCustomerId ?? existing.stripe_customer_id ?? null,
      stripe_last_checkout_session_id: checkoutSessionId,
    })
    .eq('id', userId)

  if (error) throw error
  return true
}
