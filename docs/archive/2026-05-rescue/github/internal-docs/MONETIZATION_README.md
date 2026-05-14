# ColorWizard Monetization System

A complete freemium monetization system for ColorWizard powered by Stripe and Firebase.

## Overview

ColorWizard now supports two tiers:

### Free Tier
- ✓ Unlimited palette generation
- ✓ Basic color exports (JSON, CSV)
- ✓ Standard filters
- **Forever free, no credit card required**

### Pro Tier ($9/month or $99/year)
- ✓ Everything in Free, plus:
- ✓ AI palette suggestions (color harmony)
- ✓ Advanced exports (Figma, Adobe, Framer)
- ✓ Team collaboration & sharing
- ✓ Advanced filters & presets
- ✓ Priority support
- **18% annual discount** ($8.25/month when billed yearly)

## Architecture

### Feature Flags (`lib/featureFlags.ts`)
Centralized feature configuration that maps tiers to features:

```typescript
import { isFeatureEnabled } from '@/lib/featureFlags'

// Check if user has access
if (isFeatureEnabled('aiPaletteSuggestions', userTier)) {
  // Show feature
}
```

### User Tier Tracking (Firebase Firestore)
User documents stored at `users/{userId}`:

```javascript
{
  tier: 'free' | 'pro',
  stripeCustomerId: 'cus_...',
  subscriptionId: 'sub_...',
  subscriptionStatus: 'active' | 'canceled' | 'past_due',
  nextBillingDate: Timestamp,
  upgradeDate: Timestamp,
  createdAt: Timestamp,
}
```

### Stripe Integration
- **Products**: Monthly and Annual plans
- **Checkout**: Stripe Hosted Checkout (customer-friendly)
- **Webhooks**: Automatic tier updates on subscription events
- **Test Mode**: Ready for development (requires test keys)

### API Routes
```
GET  /api/user/tier              - Get current user's tier
POST /api/stripe/create-checkout - Create checkout session
POST /api/stripe/webhook         - Handle Stripe events
```

## Usage

### 1. Gating Features with FeatureGate

```tsx
import FeatureGate from '@/components/FeatureGate'

<FeatureGate feature="aiPaletteSuggestions" showPromptOnClick>
  <AIPaletteSuggestions />
</FeatureGate>
```

### 2. Using Feature Access Hook

```tsx
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'

function MyComponent() {
  const { hasAccess, promptUpgrade } = useFeatureAccess('exportToFigma')
  
  const handleClick = () => {
    if (!hasAccess) {
      promptUpgrade() // Shows upgrade modal
      return
    }
    
    // Do the thing
  }
}
```

### 3. Getting User Tier

```tsx
import { useUserTier } from '@/lib/hooks/useUserTier'

function MyComponent() {
  const { tier, isPro, loading } = useUserTier()
  
  if (loading) return <Spinner />
  
  return <div>You are a {tier} user</div>
}
```

## Pricing Pages

- **`/pricing`** - Full pricing page with tier comparison
- **`/dashboard`** - Post-upgrade success page
- **`/settings`** - Account & subscription management

## Setup Guide

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for complete setup instructions including:

- Environment variables
- Stripe test mode setup
- Creating Stripe products
- Webhook configuration
- Testing all flows
- Debugging guide

## Email Notifications

The system sends automated emails for:

1. **Welcome Email** - New user signup
2. **Upgrade Confirmation** - Successful subscription
3. **Invoice/Receipt** - Payment received
4. **Cancellation Notice** - Subscription canceled

Emails are configurable via environment:
- **Resend** (default): `RESEND_API_KEY`
- **SendGrid**: `SENDGRID_API_KEY`
- **Test Mode**: Logs to console

See `lib/email/templates.ts` for all templates.

## Implementation Checklist

- [x] Feature flag system
- [x] User tier tracking (Firestore)
- [x] Stripe products (monthly/annual)
- [x] Checkout flow (Stripe Hosted)
- [x] Webhook handling (subscriptions)
- [x] Email notifications
- [x] UI components (pricing, upgrade, gating)
- [x] API routes (tier, checkout, webhook)
- [x] Settings page
- [x] Testing guide
- [ ] Firebase Auth integration (currently uses demo user)
- [ ] Stripe customer portal
- [ ] Analytics events
- [ ] Payment history tracking
- [ ] Team plans & seats
- [ ] Usage-based billing

## Key Files

| File | Purpose |
|------|---------|
| `lib/featureFlags.ts` | Feature definitions and utilities |
| `lib/stripe-config.ts` | Stripe pricing configuration |
| `lib/hooks/useUserTier.ts` | Hook to get user tier |
| `lib/hooks/useFeatureAccess.ts` | Hook for feature access + upgrade |
| `lib/db/userTier.ts` | Firestore user tier operations |
| `lib/email/` | Email service and templates |
| `lib/auth/useAuth.ts` | Firebase Auth provider |
| `components/UpgradePrompt.tsx` | Feature unlock modal |
| `components/PricingModal.tsx` | Tier comparison modal |
| `components/FeatureGate.tsx` | Feature gating wrapper |
| `app/api/stripe/` | Stripe API routes |
| `app/api/user/` | User tier API |
| `app/pricing/page.tsx` | Pricing page |
| `app/settings/page.tsx` | Settings page |

## Development

### Local Testing

```bash
# Start dev server
npm run dev

# Open pricing page
open http://localhost:3000/pricing

# Use ngrok for webhook testing
ngrok http 3000
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for complete testing instructions.

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Stripe (get from dashboard.stripe.com/test)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PRODUCT_ID=prod_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
RESEND_API_KEY=re_...
# or
SENDGRID_API_KEY=SG_...
```

## Deployment

### Vercel

```bash
# Set environment variables in Vercel dashboard
# Then deploy
git push origin main
```

The system will automatically:
1. Deploy to your Vercel domain
2. Update Stripe webhook endpoint
3. Start processing subscriptions

### Checklist Before Production

- [ ] All Stripe keys are production keys
- [ ] Firebase project is in production mode
- [ ] Email provider is configured
- [ ] Webhook endpoint updated in Stripe
- [ ] Test full checkout flow in production
- [ ] Set up monitoring/alerts for failures
- [ ] Configure Stripe customer portal URL
- [ ] Review email templates
- [ ] Add legal pages (Terms, Privacy)

## Troubleshooting

### Webhook not updating user tier

1. Check webhook endpoint URL in Stripe
2. Verify webhook secret matches `STRIPE_WEBHOOK_SECRET`
3. Check API logs for errors
4. Verify Firestore rules allow writes

### Checkout fails

1. Verify price IDs in `.env.local`
2. Check Stripe is in correct mode (test/production)
3. Look for errors in browser console

### Email not sending

1. Verify email provider credentials
2. Check email in Stripe event details
3. Review email service logs

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for more debugging tips.

## Analytics & Monitoring

### Key Metrics to Track

- Upgrade conversion rate
- Monthly recurring revenue (MRR)
- Churn rate
- Feature usage per tier
- Payment failures/retries
- Support tickets by tier

### Integration Ready

The system is structured to easily add:
- GA4 events for conversions
- Segment for analytics
- Sentry for error tracking
- Stripe reporting webhooks

## Support

For issues or questions:

1. Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) troubleshooting
2. Review Stripe webhook logs
3. Check Firebase Firestore data
4. Review API route logs

## License

Same as ColorWizard main project.
