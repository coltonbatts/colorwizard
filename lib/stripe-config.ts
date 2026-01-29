/**
 * Stripe Product and Pricing Configuration
 * 
 * LIFETIME PURCHASE MODEL
 * One-time $1 purchase grants permanent "Pro" access
 */

export interface StripePrice {
  id: string
  productId: string
  amount: number // in cents
  currency: string
  displayAmount: number // for UI display
  displayLabel: string
}

export const STRIPE_PRICES = {
  // Pro Lifetime: One-time $1 payment
  lifetime: {
    id: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID || 'price_test_lifetime',
    productId: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID || 'prod_test_lifetime',
    amount: 100, // $1.00 in cents
    currency: 'usd',
    displayAmount: 1,
    displayLabel: '$1 (Lifetime)',
  },
} as const

// Deprecated: kept for type compatibility if needed
export const ANNUAL_DISCOUNT_PERCENT = 0
export const ANNUAL_MONTHLY_EQUIVALENT = '0'
