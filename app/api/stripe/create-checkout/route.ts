/**
 * POST /api/stripe/create-checkout
 * Creates a Stripe Checkout session for $1 lifetime Pro purchase
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { STRIPE_PRICES } from '@/lib/stripe-config'
import { getUserIdFromRequest } from '@/lib/auth/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

interface CheckoutRequest {
  email?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequest
    const { email } = body
    const userId = await getUserIdFromRequest(req)

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      )
    }

    const lifetimePrice = STRIPE_PRICES.lifetime

    if (!lifetimePrice.id || lifetimePrice.id.startsWith('price_test')) {
      return NextResponse.json(
        { 
          error: 'Stripe product not configured. Please set NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID in environment variables.',
          details: 'Missing lifetime price ID'
        },
        { status: 500 }
      )
    }

    // Create one-time payment checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', // One-time payment, not subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price: lifetimePrice.id,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      client_reference_id: userId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?upgrade=canceled`,
      metadata: {
        userId,
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to create checkout session: ${message}` },
      { status: 500 }
    )
  }
}
