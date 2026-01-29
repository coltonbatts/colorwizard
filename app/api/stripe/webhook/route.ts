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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20',
})

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
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

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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
    return stripe.webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`)
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  
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
