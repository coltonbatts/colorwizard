/**
 * POST /api/stripe/create-checkout
 * Creates a Stripe Checkout session for Pro tier upgrade
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { STRIPE_PRICES } from '@/lib/stripe-config'
import { getUserIdFromRequest } from '@/lib/auth/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20',
})

interface CheckoutRequest {
  priceId: string // 'monthly' or 'annual'
  email?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CheckoutRequest
    const { priceId: billingPeriod, email } = body
    const userId = await getUserIdFromRequest(req)

    // Validate billing period
    if (billingPeriod !== 'monthly' && billingPeriod !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid billing period' },
        { status: 400 }
      )
    }

    const stripePrice = STRIPE_PRICES[billingPeriod]

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePrice.id,
          quantity: 1,
        },
      ],
      customer_email: email,
      client_reference_id: userId,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard?session_id={CHECKOUT_SESSION_ID}&upgrade=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?upgrade=canceled`,
      metadata: {
        userId,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
