/**
 * Firebase user tier management
 * Handles user document creation, tier updates, and subscription tracking
 */

import { db } from '@/lib/firebase'
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
  subscriptionId?: string
  priceId?: string
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'pending' | 'trialing'
  createdAt: Timestamp
  upgradeDate?: Timestamp
  canceledAt?: Timestamp
  nextBillingDate?: Timestamp
  currentPeriodEnd?: Timestamp
  currentPeriodStart?: Timestamp
  email?: string
}

/**
 * Create a new user document with free tier
 */
export async function createUserDoc(userId: string, email?: string): Promise<UserTierDoc> {
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
  const userRef = doc(db, 'users', userId)
  const docSnap = await getDoc(userRef)
  
  if (!docSnap.exists()) {
    return null
  }
  
  return docSnap.data() as UserTierDoc
}

/**
 * Update user tier to Pro and store subscription info
 */
export async function upgradeToPro(
  userId: string,
  {
    stripeCustomerId,
    subscriptionId,
    priceId,
    subscriptionStatus = 'active',
  }: {
    stripeCustomerId: string
    subscriptionId: string
    priceId: string
    subscriptionStatus?: string
  }
): Promise<void> {
  const userRef = doc(db, 'users', userId)
  
  await updateDoc(userRef, {
    tier: 'pro',
    stripeCustomerId,
    subscriptionId,
    priceId,
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
  const userRef = doc(db, 'users', userId)
  
  await updateDoc(userRef, {
    stripeCustomerId,
  })
}
