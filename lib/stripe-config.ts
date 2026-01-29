/**
 * Stripe Product and Pricing Configuration
 * 
 * TEST MODE PRICING (Replace with production IDs when ready)
 * Monthly: $9/month (price_1ABC...)
 * Annual: $99/year = $8.25/month (price_1XYZ...)
 */

export interface StripePrice {
  id: string
  productId: string
  amount: number // in cents
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  displayAmount: number // for UI display
  displayLabel: string
}

export const STRIPE_PRICES = {
  // Monthly Pro subscription: $9/month
  monthly: {
    id: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_test_monthly',
    productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID || 'prod_test',
    amount: 900, // $9.00 in cents
    currency: 'usd',
    interval: 'month' as const,
    intervalCount: 1,
    displayAmount: 9,
    displayLabel: '$9/month',
  },
  // Annual Pro subscription: $99/year = $8.25/month
  annual: {
    id: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || 'price_test_annual',
    productId: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_ID || 'prod_test',
    amount: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'year' as const,
    intervalCount: 1,
    displayAmount: 99,
    displayLabel: '$99/year',
  },
} as const

export const ANNUAL_DISCOUNT_PERCENT = Math.round(
  ((STRIPE_PRICES.monthly.amount * 12 - STRIPE_PRICES.annual.amount) / 
   (STRIPE_PRICES.monthly.amount * 12)) * 100
)

// Annual cost per month for comparison
export const ANNUAL_MONTHLY_EQUIVALENT = (STRIPE_PRICES.annual.amount / 12 / 100).toFixed(2)
