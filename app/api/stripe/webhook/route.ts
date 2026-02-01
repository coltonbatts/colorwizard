/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for one-time lifetime purchases
 * 
 * Set up in Stripe Dashboard:
 * - Endpoint: https://yourdomain.com/api/stripe/webhook
 * - Events: checkout.session.completed, charge.dispute.created (optional)
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { unlockProLifetime } from '@/lib/db/userTier'
import { sendEmail } from '@/lib/email/service'
import { getUpgradeConfirmationEmail } from '@/lib/email/templates'
import { validateServerEnv } from '@/lib/env-validator'

export const dynamic = 'force-dynamic'

/**
 * Handle checkout.session.completed event
 * This fires after successful one-time payment
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id

  if (!userId) {
    console.error('No userId found in session metadata', { sessionId: session.id })
    return
  }

  const stripeCustomerId = session.customer as string

  // Ensure user doc exists
  try {
    const unlocked = await unlockProLifetime(userId, {
      checkoutSessionId: session.id,
      stripeCustomerId,
    })

    if (unlocked) {
      console.log(`✅ Pro Lifetime unlocked for user: ${userId} (session: ${session.id})`)

      // Send confirmation email (optional)
      if (session.customer_email) {
        const template = getUpgradeConfirmationEmail(
          session.customer_details?.name || 'there',
          'Pro Lifetime ($1)'
        )
        try {
          await sendEmail(session.customer_email, template)
        } catch (emailErr) {
          console.warn('Failed to send confirmation email:', emailErr)
          // Don't fail the webhook for email issues
        }
      }
    } else {
      console.log(`⚠️  Session ${session.id} already processed for user ${userId}`)
    }
  } catch (error) {
    console.error('Error unlocking Pro Lifetime:', error)
    throw error // Re-throw so Stripe retries webhook
  }
}

/**
 * Verify Stripe webhook signature
 */
async function verifyWebhookSignature(
  stripe: Stripe,
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || ''

  try {
    return stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`)
  }
}

export async function POST(req: NextRequest) {
  validateServerEnv()
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  try {
    const body = await req.text()
    const event = await verifyWebhookSignature(stripe, body, signature)

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}
