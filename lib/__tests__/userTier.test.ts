/**
 * User Tier Management Tests - Idempotency & State Verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createUserDoc,
  getUserTier,
  unlockProLifetime,
  linkStripeCustomer,
  type UserProfile,
} from '@/lib/db/userTier'

const userProfileStore: Record<string, UserProfile> = {}

function createMockSupabase() {
  return {
    from: vi.fn((table: string) => {
      if (table !== 'user_profiles') {
        throw new Error(`Unexpected table: ${table}`)
      }

      const state: {
        filters: Record<string, unknown>
        payload: Record<string, unknown> | null
        insertPayload: Record<string, unknown> | null
        mode: 'select' | 'insert' | 'update' | null
      } = {
        filters: {},
        payload: null,
        insertPayload: null,
        mode: null,
      }

      const builder = {
        insert(payload: Record<string, unknown>) {
          state.mode = 'insert'
          state.payload = payload
          state.insertPayload = payload
          return builder
        },
        update(payload: Record<string, unknown>) {
          state.mode = 'update'
          state.payload = payload
          return builder
        },
        select() {
          if (state.mode !== 'insert' && state.mode !== 'update') {
            state.mode = 'select'
          }
          return builder
        },
        eq(column: string, value: unknown) {
          state.filters[column] = value
          return builder
        },
        async single() {
          if (state.insertPayload) {
            const id = String(state.insertPayload.id)
            const row: UserProfile = {
              id,
              tier: (state.insertPayload.tier as UserProfile['tier']) ?? 'free',
              email: (state.insertPayload.email as string | null | undefined) ?? null,
              stripe_customer_id: (state.insertPayload.stripe_customer_id as string | null | undefined) ?? null,
              pro_unlocked_at: (state.insertPayload.pro_unlocked_at as string | null | undefined) ?? null,
              created_at: new Date().toISOString(),
              stripe_last_checkout_session_id:
                (state.insertPayload.stripe_last_checkout_session_id as string | null | undefined) ?? null,
            }
            userProfileStore[id] = row
            return { data: row, error: null }
          }
          throw new Error('single() called without insert payload')
        },
        async maybeSingle() {
          const id = String(state.filters.id ?? '')
          const row = userProfileStore[id]
          return { data: row ?? null, error: null }
        },
        then(onFulfilled: (value: { error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
          if (state.mode === 'update' && state.payload) {
            const id = String(state.filters.id ?? '')
            const existing = userProfileStore[id]
            if (existing) {
              userProfileStore[id] = {
                ...existing,
                ...state.payload,
                tier: (state.payload.tier as UserProfile['tier'] | undefined) ?? existing.tier,
              }
            }
            return Promise.resolve({ error: null }).then(onFulfilled, onRejected)
          }

          if (state.mode === 'insert' && state.payload && !state.filters.id) {
            const id = String(state.payload.id)
            userProfileStore[id] = {
              id,
              tier: (state.payload.tier as UserProfile['tier']) ?? 'free',
              email: (state.payload.email as string | null | undefined) ?? null,
              stripe_customer_id: (state.payload.stripe_customer_id as string | null | undefined) ?? null,
              pro_unlocked_at: (state.payload.pro_unlocked_at as string | null | undefined) ?? null,
              created_at: new Date().toISOString(),
              stripe_last_checkout_session_id:
                (state.payload.stripe_last_checkout_session_id as string | null | undefined) ?? null,
            }
            return Promise.resolve({ error: null }).then(onFulfilled, onRejected)
          }

          return Promise.resolve({ error: null }).then(onFulfilled, onRejected)
        },
      }

      return builder
    }),
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => createMockSupabase(),
}))

describe('userTier.ts - Tier Management', () => {
  beforeEach(() => {
    Object.keys(userProfileStore).forEach((key) => delete userProfileStore[key])
    vi.clearAllMocks()
  })

  describe('createUserDoc', () => {
    it('should create user with free tier', async () => {
      const user = await createUserDoc('user-123', 'test@example.com')

      expect(user.tier).toBe('free')
      expect(user.email).toBe('test@example.com')
      expect(userProfileStore['user-123'].tier).toBe('free')
    })

    it('should create user without email', async () => {
      const user = await createUserDoc('user-456')

      expect(user.tier).toBe('free')
      expect(user.email).toBeNull()
    })
  })

  describe('getUserTier', () => {
    it('should return null for non-existent user', async () => {
      const tier = await getUserTier('missing-user')
      expect(tier).toBeNull()
    })

    it('should return existing user profile', async () => {
      await createUserDoc('user-789', 'exists@example.com')
      const tier = await getUserTier('user-789')

      expect(tier?.tier).toBe('free')
      expect(tier?.email).toBe('exists@example.com')
    })
  })

  describe('unlockProLifetime - First Time Unlock', () => {
    it('should unlock pro_lifetime for free user first time', async () => {
      await createUserDoc('user-123', 'test@example.com')

      const unlocked = await unlockProLifetime('user-123', {
        checkoutSessionId: 'cs_123',
        stripeCustomerId: 'cus_456',
      })

      expect(unlocked).toBe(true)
      expect(userProfileStore['user-123'].tier).toBe('pro_lifetime')
      expect(userProfileStore['user-123'].stripe_last_checkout_session_id).toBe('cs_123')
    })

    it('should create profile when unlocking non-existent user', async () => {
      const unlocked = await unlockProLifetime('new-user', {
        checkoutSessionId: 'cs_new',
        stripeCustomerId: 'cus_new',
      })

      expect(unlocked).toBe(true)
      expect(userProfileStore['new-user'].tier).toBe('pro_lifetime')
    })
  })

  describe('unlockProLifetime - Idempotency', () => {
    it('should not unlock twice for same checkout session', async () => {
      userProfileStore['user-123'] = {
        id: 'user-123',
        tier: 'pro_lifetime',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        stripe_last_checkout_session_id: 'cs_123',
      }

      const unlocked = await unlockProLifetime('user-123', {
        checkoutSessionId: 'cs_123',
        stripeCustomerId: 'cus_456',
      })

      expect(unlocked).toBe(false)
    })

    it('should unlock again for different checkout session', async () => {
      userProfileStore['user-123'] = {
        id: 'user-123',
        tier: 'pro_lifetime',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        stripe_last_checkout_session_id: 'cs_old',
      }

      const unlocked = await unlockProLifetime('user-123', {
        checkoutSessionId: 'cs_new',
        stripeCustomerId: 'cus_456',
      })

      expect(unlocked).toBe(true)
      expect(userProfileStore['user-123'].stripe_last_checkout_session_id).toBe('cs_new')
    })
  })

  describe('linkStripeCustomer', () => {
    it('should link stripe customer id', async () => {
      await createUserDoc('user-123')
      await linkStripeCustomer('user-123', 'cus_linked')

      expect(userProfileStore['user-123'].stripe_customer_id).toBe('cus_linked')
    })
  })
})
