/**
 * Stripe Product and Pricing Configuration
 * 
 * TEST MODE PRICING (Replace with production IDs when ready)
 * Lifetime Pro: $1.00 (price_1ABC...)
 */

export interface StripePrice {
  id: string
  productId: string
  amount: number // in cents
  currency: string
  interval?: 'month' | 'year' | 'lifetime'
  intervalCount?: number
  displayAmount: number // for UI display
  displayLabel: string
}

export const STRIPE_PRICES = {
  // Lifetime Pro: $1.00 forever
  lifetime: {
    id: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID || 'price_test_lifetime',
    productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID || 'prod_test',
    amount: 100, // $1.00 in cents
    currency: 'usd',
    interval: 'lifetime' as const,
    displayAmount: 1,
    displayLabel: '$1 forever',
  },
} as const

/**
 * @deprecated Subscriptions are replaced by $1 lifetime payment
 */
export const STRIPE_PRICES_LEGACY = {
  monthly: { amount: 900, displayLabel: '$9/month' },
  annual: { amount: 9900, displayLabel: '$99/year' },
}

export const ANNUAL_DISCOUNT_PERCENT = 0 // Not applicable for lifetime
export const ANNUAL_MONTHLY_EQUIVALENT = '0.00' // Not applicable for lifetime
