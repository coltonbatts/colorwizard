# ColorWizard Stripe Integration Setup

## CURRENT STATE: STRIPE NOT YET INTEGRATED

**Finding:** The ColorWizard codebase (as of Jan 28, 2026) does **NOT** have Stripe integration yet. This is a blocking item that needs to be built.

### Current Architecture
- ✅ Frontend: Next.js 15 with App Router
- ✅ Features: Color sampling, paint mixing, DMC matching, export
- ❌ Backend API: Missing (no `/api/` directory)
- ❌ Payment processing: Not implemented
- ❌ User authentication: Not implemented (needed for Pro tier)

---

## PHASE 1: BUILD STRIPE INTEGRATION (BLOCKING)

### Step 1: Install Dependencies
```bash
cd /tmp/colorwizard
npm install stripe next-stripe
npm install @stripe/react-js
npm install -D @types/stripe
```

### Step 2: Create Stripe API Routes

Create `/app/api/stripe/webhook/route.ts`:
```typescript
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    console.error(`Webhook Error: ${error.message}`);
    return Response.json({ error: error.message }, { status: 400 });
  }

  // Handle specific events
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment succeeded: ${paymentIntent.id}`);
      // TODO: Update user record in database → set `pro: true`
      // TODO: Log revenue event to PostHog
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`Subscription canceled: ${subscription.id}`);
      // TODO: Mark user's subscription as inactive
      break;
    }
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      console.log(`Charge refunded: ${charge.id}`);
      // TODO: Log refund event
      break;
    }
  }

  return Response.json({ received: true });
}
```

### Step 3: Create Checkout Session Route

Create `/app/api/stripe/checkout/route.ts`:
```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.json();
  const { email, successUrl, cancelUrl } = body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'ColorWizard Pro - Lifetime',
              description: 'Lifetime access to all ColorWizard Pro features',
            },
            unit_amount: 100, // $1.00 in cents
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        productName: 'colorwizard-pro-lifetime',
        version: 'lifetime-$1',
      },
    });

    return Response.json({ sessionId: session.id });
  } catch (err) {
    const error = err as Error;
    console.error('Checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}
```

### Step 4: Environment Variables

Add to `.env.local`:
```
STRIPE_PUBLIC_KEY=pk_live_your_public_key_here
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Step 5: Verify Webhook in Stripe Dashboard

**Current Webhook Configuration:**
- Endpoint: `https://colorwizard.app/api/stripe/webhook`
- Webhook ID: `we_1Sv5l2KZrzdcS7aFUmP1Yz1D`
- Status: ❌ **UNVERIFIED** (needs handler implementation)

**To test locally:**
```bash
# Use Stripe CLI to forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## PHASE 2: DATABASE SCHEMA (For User Tracking)

Add user records to store payment status. Example (Firebase):

```typescript
// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const db = getFirestore();

export interface ColorWizardUser {
  uid: string;
  email: string;
  createdAt: timestamp;
  pro: boolean;
  proActivatedAt?: timestamp;
  stripeCustomerId?: string;
  stripePaymentIntentId?: string;
  source?: string; // 'twitter', 'organic', 'direct', etc.
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
}

export async function recordUserUpgrade(
  userId: string,
  data: Partial<ColorWizardUser>
) {
  await setDoc(doc(db, 'users', userId), data, { merge: true });
}
```

---

## PHASE 3: FRONTEND CHECKOUT BUTTON

Add to `components/ProUpgradeButton.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/react-js';

export function ProUpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({
          email,
          successUrl: `${window.location.origin}/upgrade-success`,
          cancelUrl: `${window.location.origin}/`,
        }),
      });

      const { sessionId } = await res.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
      await stripe?.redirectToCheckout({ sessionId });
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded"
      />
      <button
        onClick={handleCheckout}
        disabled={loading || !email}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Upgrade to Pro - $1'}
      </button>
    </div>
  );
}
```

---

## TESTING STRIPE WEBHOOK

### Manual Test Payment Flow:
1. **Stripe Test Keys:** Use test cards (e.g., `4242 4242 4242 4242`)
2. **Verify Endpoint Receives POST:**
   ```bash
   stripe trigger payment_intent.succeeded --api-key sk_test_...
   ```
3. **Check Webhook Logs:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - View endpoint event history
   - Confirm webhook fires and returns 200

### Expected Webhook Signature:
```
POST https://colorwizard.app/api/stripe/webhook
Headers:
  stripe-signature: t=1234567890,v1=...
Body:
  {
    "id": "evt_...",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_...",
        "amount": 100,
        "status": "succeeded",
        "customer_email": "user@example.com"
      }
    }
  }
```

---

## DEPLOYMENT CHECKLIST

- [ ] Stripe keys in production environment variables
- [ ] Webhook endpoint registered and verified
- [ ] Database schema created (users, payments tables)
- [ ] Pro feature gating logic implemented
- [ ] Checkout button added to app
- [ ] Success/cancel pages created
- [ ] Webhook handler tested with test payments
- [ ] Revenue showing in Stripe dashboard
- [ ] PostHog event tracking integrated

---

## NEXT IMMEDIATE ACTIONS

1. **Clone repo to local machine** and implement Stripe setup above
2. **Test webhook** with `stripe trigger` command
3. **Deploy to production** (Vercel auto-deploys from main branch)
4. **Verify webhook** receives POST requests from Stripe dashboard
5. **Log test payment** and confirm user record created in database

**Target:** Have Stripe webhook receiving and processing payments by EOD.
