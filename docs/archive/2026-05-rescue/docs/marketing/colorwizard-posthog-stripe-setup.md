# ColorWizard PostHog + Stripe Integration Guide
## Phase 2A Technical Setup

---

## PART 1: PostHog Setup (Free Tier)

### Step 1: Create Account

1. Go to https://app.posthog.com
2. Click "Sign Up"
3. Use your email (e.g., colton@example.com)
4. Create strong password
5. Verify email
6. Create new organization (e.g., "ColorWizard Growth")

### Step 2: Create Project

1. In PostHog dashboard, click "New Project"
2. Select "Next.js" template
3. Name: "ColorWizard"
4. Environment: Production
5. Click "Create"

### Step 3: Get Your Keys

**You'll see:**
- Project API Key (starts with `phc_`)
- Project ID (number)
- Frontend endpoint: `https://us.posthog.com`

**Save these.** You need them for the Next.js integration.

### Step 4: Install PostHog SDK

In your ColorWizard repo:

```bash
npm install posthog-js
```

### Step 5: Add PostHog to Next.js App

File: `app/layout.tsx`

Add to the top-level RootLayout:

```typescript
import { PostHogProvider } from './providers'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
```

Create new file: `app/providers.tsx`

```typescript
'use client'

import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogInit() {
  useEffect(() => {
    posthog.init('YOUR_POSTHOG_API_KEY', {
      api_host: 'https://us.posthog.com',
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug() // Enable debug logs in development
        }
      }
    })
  }, [])

  return null
}

export function PostHogProvider({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <PostHogProvider client={posthog}>
      <PostHogInit />
      {children}
    </PostHogProvider>
  )
}
```

Replace `YOUR_POSTHOG_API_KEY` with your actual key from Step 3.

### Step 6: Track Custom Events

Now you can track events anywhere in your app:

```typescript
import posthog from 'posthog-js'

// Example: Track signup
const handleSignup = async () => {
  posthog.capture('user_signup', {
    auth_method: 'firebase',
    email: user.email
  })
}

// Example: Track pro feature view
const viewProFeatures = () => {
  posthog.capture('pro_feature_view', {
    feature: 'ai_suggestions',
    location: 'app_homepage'
  })
}

// Example: Track upgrade click
const handleUpgradeClick = () => {
  posthog.capture('upgrade_clicked', {
    location: 'sidebar',
    reason: 'user_clicked_upgrade_button'
  })
}
```

### Step 7: Create Funnel in PostHog Dashboard

1. Go to PostHog → Funnels
2. Click "New Funnel"
3. Add steps:
   - Step 1: `user_signup`
   - Step 2: `pro_feature_view`
   - Step 3: `upgrade_clicked`
   - Step 4: `upgrade_success`
4. Name: "Signup → Upgrade → Payment"
5. Save

This shows drop-off at each step. Example output:
```
Step 1: 100 signups
Step 2: 58 viewed pro features (58% drop-off)
Step 3: 34 clicked upgrade (59% drop-off)
Step 4: 28 completed payment (82% conversion)

Biggest bottleneck: Between steps 2→3 (people see features but don't click upgrade)
```

---

## PART 2: Stripe Webhook Verification

### Current Status
✓ Webhook endpoint: `we_1Sv5l2KZrzdcS7aFUmP1Yz1D`  
✓ Destination: `https://colorwizard.app/api/stripe/webhook`  
✓ Events: Probably not configured yet

### Step 1: Log into Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Log in with your account
3. Toggle to **Test Mode** (top-right corner)
4. Go to **Developers** → **Webhooks**
5. You should see existing webhook with ID `we_1Sv5l2KZrzdcS7aFUmP1Yz1D`

### Step 2: Check What Events Are Enabled

Click on the webhook endpoint. You should see events like:
- `payment_intent.succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`

If empty, click "Select events" and add:
- ✓ `payment_intent.succeeded`
- ✓ `customer.subscription.created`
- ✓ `customer.subscription.deleted` (for cancellations)

### Step 3: Create API Webhook Handler (Next.js)

File: `app/api/stripe/webhook/route.ts`

```typescript
import { headers } from 'next/headers'
import Stripe from 'stripe'
import posthog from 'posthog-js'
import { db } from '@/lib/firebase'
import { doc, setDoc, updateDoc } from 'firebase/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig || '', endpointSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      console.log('Payment successful:', paymentIntent.id)

      // Get customer ID
      const customerId = paymentIntent.customer as string

      // Update Firebase: Mark user as Pro
      if (customerId) {
        const userRef = doc(db, 'users', customerId)
        await updateDoc(userRef, {
          isPro: true,
          proSince: new Date(),
          stripeCustomerId: customerId,
          lastPaymentId: paymentIntent.id
        })

        // Track in PostHog
        posthog.capture('upgrade_success', {
          stripe_customer_id: customerId,
          payment_intent_id: paymentIntent.id,
          amount: paymentIntent.amount_received,
          currency: paymentIntent.currency
        })

        console.log('User upgraded:', customerId)
      }
      break

    case 'customer.subscription.created':
      const subscription = event.data.object as Stripe.Subscription
      console.log('Subscription created:', subscription.id)

      if (subscription.customer) {
        const userRef = doc(db, 'users', subscription.customer as string)
        await updateDoc(userRef, {
          isPro: true,
          subscriptionId: subscription.id,
          stripeCustomerId: subscription.customer
        })
      }
      break

    case 'customer.subscription.deleted':
      const canceledSub = event.data.object as Stripe.Subscription
      console.log('Subscription canceled:', canceledSub.id)

      if (canceledSub.customer) {
        const userRef = doc(db, 'users', canceledSub.customer as string)
        await updateDoc(userRef, {
          isPro: false,
          subscriptionCanceledAt: new Date()
        })
      }
      break

    default:
      console.log('Unhandled event type:', event.type)
  }

  return Response.json({ received: true })
}
```

### Step 4: Add Environment Variables

File: `.env.local`

```
STRIPE_PUBLIC_KEY=pk_test_xxxxx...
STRIPE_SECRET_KEY=sk_test_xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
```

Get these from Stripe Dashboard:
- **Public Key:** Developers → API Keys → Publishable Key (test)
- **Secret Key:** Developers → API Keys → Secret Key (test)
- **Webhook Secret:** Developers → Webhooks → Click webhook → "Signing secret" at bottom

### Step 5: Test Webhook Locally

Use Stripe CLI to forward webhook events to localhost:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhook events to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Then run your Next.js app:

```bash
npm run dev
```

Make a test payment in Stripe dashboard:
1. Go to **Testing** → **Testing cards**
2. Use card: `4242 4242 4242 4242`
3. Expiry: `12/25` (any future date)
4. CVC: `123`
5. Complete the payment

You should see in terminal:
```
$ stripe listen --forward-to localhost:3000/api/stripe/webhook
> Payment intent succeeded: pi_xxxxx
> Webhook forwarded to localhost:3000/api/stripe/webhook
```

And in your app console:
```
Payment successful: pi_xxxxx
User upgraded: cus_xxxxx
```

---

## PART 3: Stripe Integration with PostHog

Once Stripe is live, connect them:

### Step 1: Get Stripe API Key

1. Go to Stripe Dashboard → **Developers** → **API Keys**
2. Copy your **Restricted API Key** (or Secret Key for full access)

### Step 2: Connect in PostHog

1. PostHog Dashboard → **Integrations**
2. Search "Stripe"
3. Click "Install"
4. Paste Stripe API key
5. Select events to sync:
   - ✓ Charges
   - ✓ Customers
   - ✓ Invoices
6. Save

Now PostHog automatically tracks:
- When users upgrade
- Revenue per user
- Churn rate
- LTV (Lifetime Value)

### Step 3: Use Stripe Data in Funnels

In PostHog Funnels, you can now segment by:
- Users who paid
- Revenue > $1
- Customers created in last 7 days

---

## PART 4: Testing Checklist

### Pre-Launch Test (Before Going Live)

- [ ] Stripe test webhook configured
- [ ] Test payment goes through (card: 4242...)
- [ ] Webhook fires and creates user record in Firebase
- [ ] Firebase user has `isPro: true` flag
- [ ] PostHog logs `upgrade_success` event
- [ ] No errors in browser console or server logs

### Production Checklist (Before Twitter Threads)

- [ ] Stripe live keys in production (.env)
- [ ] Webhook endpoint live at `https://colorwizard.app/api/stripe/webhook`
- [ ] PostHog integration live in app
- [ ] Funnel created in PostHog dashboard
- [ ] Ready for real payments

---

## TROUBLESHOOTING

### Webhook Not Firing?

1. Check Stripe Dashboard → Webhooks → Click endpoint → "Recent attempts"
2. Does it show failed requests? Check error details.
3. Are you using test keys? (Make sure webhook uses matching test keys)
4. Is endpoint signed correctly? Verify `STRIPE_WEBHOOK_SECRET` is correct.

### Firebase Update Not Working?

1. Check Firebase rules: Does app have write access to `/users/{userId}`?
2. Are you using correct user ID? (Should match Stripe customer ID)
3. Check browser console for errors

### PostHog Not Recording Events?

1. Is `posthog.capture()` in right place? (Must be in client component)
2. Check browser DevTools → Network → `api.posthog.com` — are events being sent?
3. Does posthog.init() have correct API key?
4. In development, check if `ph.debug()` is enabled

---

## NEXT STEPS

1. **Create PostHog account:** Do now (2 min)
2. **Get API keys:** Copy from PostHog + Stripe dashboards
3. **Add to .env.local:** Add PostHog key and Stripe keys
4. **Test webhook locally:** Use Stripe CLI
5. **Deploy to production:** Once verified
6. **Create funnel:** Build in PostHog dashboard
7. **Monitor real payments:** Watch Stripe + PostHog after threads go live

---

## FILES READY TO COPY-PASTE

✓ PostHog init code (app/providers.tsx)  
✓ Stripe webhook handler (app/api/stripe/webhook/route.ts)  
✓ Example event tracking code  
✓ Environment variable template  
✓ Testing checklist  

All are in this document — ready to use.

---

*Ready to implement? Let me know when you have your PostHog + Stripe keys.*
