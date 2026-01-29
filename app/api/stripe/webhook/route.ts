/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription updates
 * 
 * Set up in Stripe Dashboard:
 * - Endpoint: https://yourdomain.com/api/stripe/webhook
 * - Events: customer.subscription.created, customer.subscription.updated, customer.subscription.deleted
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  upgradeToPro,
  updateSubscriptionStatus,
  cancelSubscription,
  getUserTier,
  createUserDoc
} from '@/lib/db/userTier'
import { sendEmail } from '@/lib/email/service'
import {
  getUpgradeConfirmationEmail,
  getCancellationEmail,
  getInvoiceEmail,
} from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as any,
  })
  : null

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId || session.client_reference_id

  if (!userId) {
    console.error('No userId found in checkout session metadata')
    return
  }

  // Upgrade user to Pro (Lifetime)
  await upgradeToPro(userId, {
    stripeCustomerId: session.customer as string,
    priceId: session.line_items?.data[0]?.price?.id || '',
    subscriptionStatus: 'active', // For one-time, we'll just mark it active
  })

  // Send conversion details to console for tracking
  console.log(`✨ Lifetime Pro unlocked for user: ${userId}`)

  // Send upgrade confirmation email
  if (session.customer_details?.email) {
    const template = getUpgradeConfirmationEmail(
      session.customer_details.name || 'there',
      'Lifetime Pro (One-time $1)'
    )
    await sendEmail(session.customer_details.email, template)
  }
}

async function handleSubscriptionCreated(subscription: any) {
  // Keeping for backward compatibility or future use
  const userId = subscription.metadata?.userId || subscription.client_reference_id

  if (!userId) {
    console.error('No userId found in subscription metadata')
    return
  }

  const customer = subscription.customer as Stripe.Customer

  // Ensure user doc exists
  let userTier = await getUserTier(userId)
  if (!userTier) {
    await createUserDoc(userId, customer.email || undefined)
  }

  // Upgrade user to Pro
  await upgradeToPro(userId, {
    stripeCustomerId: customer.id,
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price?.id || '',
    subscriptionStatus: subscription.status as string,
  })

  // Update subscription dates
  await updateSubscriptionStatus(userId, {
    subscriptionStatus: subscription.status,
    nextBillingDate: new Date(subscription.current_period_end * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
  })

  // Send upgrade confirmation email
  if (customer.email) {
    const planName = subscription.items.data[0]?.price?.interval === 'year'
      ? 'Pro Annual ($99/year)'
      : 'Pro Monthly ($9/month)'

    const template = getUpgradeConfirmationEmail(customer.name || 'there', planName)
    await sendEmail(customer.email, template)
  }

  console.log(`✅ Subscription created for user: ${userId}`)
}

async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.userId || subscription.client_reference_id

  if (!userId) {
    console.error('No userId found in subscription metadata')
    return
  }

  await updateSubscriptionStatus(userId, {
    subscriptionStatus: subscription.status,
    nextBillingDate: new Date(subscription.current_period_end * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
  })

  console.log(`🔄 Subscription updated for user: ${userId}, status: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: any) {
  const userId = subscription.metadata?.userId || subscription.client_reference_id

  if (!userId) {
    console.error('No userId found in subscription metadata')
    return
  }

  const customer = subscription.customer as Stripe.Customer

  await cancelSubscription(userId)

  // Send cancellation email
  if (customer.email) {
    const template = getCancellationEmail(customer.name || 'there')
    await sendEmail(customer.email, template)
  }

  console.log(`❌ Subscription canceled for user: ${userId}`)
}

async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || ''

  try {
    return stripe!.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`)
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')

  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  try {
    const body = await req.text()
    const event = await verifyWebhookSignature(body, signature)

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
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
