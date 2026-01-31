/**
 * Firebase user tier management
 * Handles user document creation, tier updates, and subscription tracking
 */

import { getFirestoreDb } from '@/lib/firebase'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import type { UserTier } from '@/lib/featureFlags'

export interface UserTierDoc {
  tier: UserTier
  stripeCustomerId?: string
  subscriptionId?: string // Deprecated: for subscription model only
  priceId?: string // Deprecated: for subscription model only
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'pending' | 'trialing' // Deprecated: for subscription model only
  createdAt: Timestamp
  upgradeDate?: Timestamp
  proUnlockedAt?: Timestamp // Timestamp of lifetime unlock
  canceledAt?: Timestamp
  nextBillingDate?: Timestamp // Deprecated: for subscription model only
  currentPeriodEnd?: Timestamp // Deprecated: for subscription model only
  currentPeriodStart?: Timestamp // Deprecated: for subscription model only
  email?: string
  // Lifetime purchase tracking
  stripe?: {
    customerId?: string
    lastCheckoutSessionId?: string // Idempotency: track processed sessions
    lastPaymentIntentId?: string // Alternative idempotency key
  }
}

/**
 * Create a new user document with free tier
 */
export async function createUserDoc(userId: string, email?: string): Promise<UserTierDoc> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Database not initialized')
  const userRef = doc(db, 'users', userId)
  const userData: UserTierDoc = {
    tier: 'free',
    createdAt: serverTimestamp() as Timestamp,
    email,
  }

  await setDoc(userRef, userData)
  return userData
}

/**
 * Get user's tier information
 */
export async function getUserTier(userId: string): Promise<UserTierDoc | null> {
  const db = getFirestoreDb()
  if (!db) return null
  const userRef = doc(db, 'users', userId)
  const docSnap = await getDoc(userRef)

  if (!docSnap.exists()) {
    return null
  }

  return docSnap.data() as UserTierDoc
}

/**
 * Update user tier to Pro permanently
 */
export async function upgradeToPro(
  userId: string,
  {
    stripeCustomerId,
    subscriptionId,
    priceId,
    subscriptionStatus = 'active',
  }: {
    stripeCustomerId?: string
    subscriptionId?: string
    priceId?: string
    subscriptionStatus?: string
  }
): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Database not initialized')
  const userRef = doc(db, 'users', userId)

  await updateDoc(userRef, {
    tier: 'pro',
    stripeCustomerId: stripeCustomerId || null,
    subscriptionId: subscriptionId || null,
    priceId: priceId || null,
    subscriptionStatus,
    upgradeDate: serverTimestamp(),
  })
}

/**
 * Update subscription status (called from Stripe webhook)
 */
export async function updateSubscriptionStatus(
  userId: string,
  {
    subscriptionStatus,
    nextBillingDate,
    currentPeriodEnd,
    currentPeriodStart,
  }: {
    subscriptionStatus: string
    nextBillingDate?: Date
    currentPeriodEnd?: Date
    currentPeriodStart?: Date
  }
): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Database not initialized')
  const userRef = doc(db, 'users', userId)

  const updateData: any = {
    subscriptionStatus,
  }

  if (nextBillingDate) {
    updateData.nextBillingDate = Timestamp.fromDate(nextBillingDate)
  }
  if (currentPeriodEnd) {
    updateData.currentPeriodEnd = Timestamp.fromDate(currentPeriodEnd)
  }
  if (currentPeriodStart) {
    updateData.currentPeriodStart = Timestamp.fromDate(currentPeriodStart)
  }

  await updateDoc(userRef, updateData)
}

/**
 * Cancel subscription and downgrade to free
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Database not initialized')
  const userRef = doc(db, 'users', userId)

  await updateDoc(userRef, {
    tier: 'free',
    subscriptionStatus: 'canceled',
    canceledAt: serverTimestamp(),
  })
}

/**
 * Link a Stripe customer to user (if signing up later)
 */
export async function linkStripeCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Database not initialized')
  const userRef = doc(db, 'users', userId)

  await updateDoc(userRef, {
    stripeCustomerId,
  })
}

/**
 * Unlock Pro Lifetime tier for a user (idempotent one-time purchase)
 * @param userId - Firebase user ID
 * @param checkoutSessionId - Stripe checkout session ID for idempotency
 * @param stripeCustomerId - Stripe customer ID
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
  }
): Promise<boolean> {
  const db = getFirestoreDb()
  if (!db) throw new Error('Database not initialized')
  const userRef = doc(db, 'users', userId)

  // Check if already processed
  const userDoc = await getDoc(userRef)
  if (!userDoc.exists()) {
    // User doc doesn't exist yet, create it
    await setDoc(userRef, {
      tier: 'pro_lifetime',
      createdAt: serverTimestamp(),
      proUnlockedAt: serverTimestamp(),
      stripe: {
        customerId: stripeCustomerId,
        lastCheckoutSessionId: checkoutSessionId,
      },
    })
    return true
  }

  const userData = userDoc.data() as UserTierDoc

  // Idempotency check: if we've already processed this session, do nothing
  if (userData.stripe?.lastCheckoutSessionId === checkoutSessionId) {
    console.log(`Checkout session ${checkoutSessionId} already processed for user ${userId}`)
    return false
  }

  // First-time unlock: update tier to pro_lifetime
  await updateDoc(userRef, {
    tier: 'pro_lifetime',
    proUnlockedAt: serverTimestamp(),
    stripe: {
      customerId: stripeCustomerId || userData.stripeCustomerId,
      lastCheckoutSessionId: checkoutSessionId,
    },
  })

  return true
}
