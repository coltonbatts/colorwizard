# ColorWizard PostHog Analytics Setup

## QUICK START: CREATE FREE POSTHOG ACCOUNT

1. Go to **https://posthog.com**
2. Click "Start free" → Sign up with email
3. Create project → Select "Next.js"
4. Copy your **Project ID** and **API Key**

---

## POSTHOG PROJECT CONFIG

**Project Name:** ColorWizard  
**Environment:** Production  
**Data Retention:** 1 year (free tier default)

### Project Credentials (Save These!)
```
Project ID: [to be generated after signup]
API Key: [to be generated after signup]
Public Key: phc_[auto-generated]
```

---

## INSTALLATION STEPS

### Step 1: Install PostHog SDK

```bash
npm install posthog-js
```

### Step 2: Initialize in Root Layout

Create/update `app/layout.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Initialize PostHog (only once on client side)
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: 'https://us.posthog.com', // or EU at https://eu.posthog.com
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug();
        },
      });
    }
  }, []);

  return (
    <PostHogProvider client={posthog}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </PostHogProvider>
  );
}
```

### Step 3: Add Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
```

---

## EVENT TRACKING IMPLEMENTATION

### Custom Hook for PostHog Events

Create `hooks/useAnalytics.ts`:

```typescript
'use client';

import { usePostHog } from 'posthog-js/react';

export function useAnalytics() {
  const posthog = usePostHog();

  return {
    // Page/Session events
    trackPageView: (page: string) => {
      posthog?.capture('page_view', { page });
    },

    // Feature usage
    trackColorSampled: (hex: string, mode: 'inspect' | 'sample') => {
      posthog?.capture('color_sampled', { hex, mode });
    },

    trackProFeatureView: (feature: string) => {
      posthog?.capture('pro_feature_view', { feature });
    },

    trackUpgradeClick: (source: 'banner' | 'settings' | 'feature-gate') => {
      posthog?.capture('upgrade_click', { source });
    },

    trackUpgradeSuccess: (amount: number, source: string) => {
      posthog?.capture('upgrade_success', {
        amount_cents: amount,
        source,
      });
    },

    trackPaymentComplete: (
      stripePaymentIntentId: string,
      amount: number,
      email: string
    ) => {
      posthog?.capture('payment_complete', {
        stripe_payment_intent_id: stripePaymentIntentId,
        amount_cents: amount,
        email,
      });
    },

    // Feature interactions
    trackPaintRecipeGenerated: (pigmentCount: number, quality: string) => {
      posthog?.capture('paint_recipe_generated', {
        pigment_count: pigmentCount,
        quality, // 'spectral', 'traditional'
      });
    },

    trackExportGenerated: (format: string) => {
      posthog?.capture('export_generated', { format });
    },

    // User properties (for segmentation)
    setUserProperties: (userId: string, properties: Record<string, any>) => {
      posthog?.identify(userId, properties);
    },
  };
}
```

### Usage in Components

Example in `components/ProUpgradeButton.tsx`:

```typescript
'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export function ProUpgradeButton() {
  const analytics = useAnalytics();

  const handleUpgradeClick = () => {
    analytics.trackUpgradeClick('feature-gate');
    // ... proceed to checkout
  };

  return (
    <button onClick={handleUpgradeClick}>
      Unlock Pro Features - $1 Lifetime
    </button>
  );
}
```

### Webhook Integration (Server-Side)

In `/app/api/stripe/webhook/route.ts`:

```typescript
import { stripe } from '@/lib/stripe';
import posthog from 'posthog-node';

const posthogClient = new posthog.PostHog(
  process.env.POSTHOG_API_KEY!,
  {
    host: 'https://us.posthog.com',
  }
);

// Inside webhook handler, after payment_intent.succeeded:
case 'payment_intent.succeeded': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  
  posthogClient.capture({
    distinctId: paymentIntent.customer_email || 'anonymous',
    event: 'payment_complete',
    properties: {
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: 'succeeded',
    },
  });
  
  break;
}
```

---

## KEY EVENTS TO TRACK

| Event | Trigger | Properties |
|-------|---------|-----------|
| `signup` | User creates account | `source`, `utm_campaign` |
| `page_view` | User visits page | `page`, `referrer` |
| `color_sampled` | User clicks to sample color | `hex`, `mode` |
| `pro_feature_view` | User sees Pro feature gate | `feature_name` |
| `upgrade_click` | User clicks upgrade button | `source` (banner/feature/settings) |
| `upgrade_success` | Checkout session created | `amount_cents` |
| `payment_complete` | Stripe confirms payment | `stripe_payment_intent_id`, `amount_cents`, `email` |
| `paint_recipe_generated` | User generates recipe | `pigment_count`, `quality` (spectral/traditional) |
| `export_generated` | User exports colors | `format` (png/jpg/svg/pdf) |
| `feature_used` | Pro feature accessed | `feature_name` |

---

## FUNNELS TO BUILD

### Funnel 1: Free → Pro Conversion
```
signup → page_view (home) → pro_feature_view → upgrade_click → payment_complete
```

**Goal:** Track drop-off at each stage. Find where users abandon.

### Funnel 2: Feature Engagement
```
color_sampled → paint_recipe_generated → export_generated
```

**Goal:** Measure engagement depth (are users completing workflows?).

### Funnel 3: Upgrade Motivation
```
pro_feature_view → upgrade_click → payment_complete
```

**Goal:** Find which features drive conversions.

---

## DASHBOARDS TO CREATE

### Dashboard 1: Growth Overview
- **Top metric:** Daily signups (trend graph)
- **Secondary:** Daily active users
- **Revenue:** Total revenue + daily revenue
- **Conversion:** Free → Pro conversion rate (%)
- **Average time to upgrade:** Days from signup to payment

### Dashboard 2: Channel Attribution
- **Breakdown by:** `utm_source` (twitter, organic, direct)
- **For each channel:**
  - Signups
  - Pro upgrades
  - Revenue
  - Conversion %
  - Avg. customer value

### Dashboard 3: Feature Adoption
- **Top features used:** `paint_recipe_generated`, `export_generated`
- **Pro feature views vs. upgrades:** % of viewers who upgrade
- **Export formats:** Which export types are most popular

### Dashboard 4: Funnel Performance
- **Free → Pro funnel** (see drop-off points)
- **Feature engagement funnel** (sampling → recipe → export)
- **Upgrade motivation** (feature view → click → payment)

---

## STRIPE INTEGRATION (AUTO-PULL REVENUE DATA)

### Enable Stripe Sync in PostHog

1. Go to **PostHog Dashboard** → **Integrations**
2. Search for "Stripe"
3. Click **Connect**
4. Authorize PostHog to access your Stripe account
5. Select events to sync:
   - `charge.succeeded`
   - `payment_intent.succeeded`
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`

This automatically imports revenue data into PostHog, so you can:
- Segment users by payment status
- Track revenue per campaign
- See MRR trends

---

## USER SEGMENTATION

After setting up Stripe sync, create segments:

### Segment 1: "Pro Users"
```
Property: stripe_subscription_status = "active"
Or: stripe_payment_intent_status = "succeeded"
```

### Segment 2: "High-Value Users"
```
Property: stripe_total_spent >= 100 (or 1.00 if lifetime)
```

### Segment 3: "Twitter Users"
```
Property: utm_source = "twitter"
```

### Segment 4: "Recent Signups"
```
Time: Last 7 days
Property: signup event exists
```

---

## NEXT.JS IMPLEMENTATION CHECKLIST

- [ ] Install PostHog SDK: `npm install posthog-js`
- [ ] Add environment variable: `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] Initialize PostHog in root layout
- [ ] Create `hooks/useAnalytics.ts`
- [ ] Add event tracking to key components (upgrade button, export, etc.)
- [ ] Integrate Stripe webhook with PostHog events
- [ ] Enable Stripe sync in PostHog dashboard
- [ ] Create funnels: signup → pro conversion, feature engagement
- [ ] Create dashboards: growth, channels, features, funnels
- [ ] Test: Generate sample event, verify in PostHog dashboard

---

## MONITORING POST-LAUNCH

**Check PostHog daily:**
1. New signups (should see Twitter traffic spike when posted)
2. Upgrade click rate (% clicking the $1 offer)
3. Payment completion rate (% of clicks → actual payments)
4. Funnel drop-off (where are users leaving?)
5. Channel performance (Twitter vs. organic vs. direct)

**Red flags to watch:**
- ❌ High feature-view → upgrade-click drop (feature gate not compelling)
- ❌ High upgrade-click → payment-complete drop (checkout friction)
- ❌ Zero Twitter traffic (thread underperforming)
- ❌ One channel driving 90%+ of traffic (not diversified)

---

## HELPFUL LINKS

- **PostHog Docs:** https://posthog.com/docs
- **Next.js Integration:** https://posthog.com/docs/frameworks/next-js
- **Event Examples:** https://posthog.com/docs/product-analytics/events
- **Funnels Guide:** https://posthog.com/docs/product-analytics/funnels
- **Stripe Integration:** https://posthog.com/docs/apps/stripe-import
