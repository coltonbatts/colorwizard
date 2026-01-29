# ColorWizard Monetization Testing Guide

## Setup

### 1. Environment Variables

Copy the example and fill in your Stripe test keys:

```bash
cp .env.local.example .env.local
```

Set these required variables:

```env
# Stripe Test Mode Keys (from https://dashboard.stripe.com/test/apikeys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Stripe Products (create these in Stripe Dashboard first)
NEXT_PUBLIC_STRIPE_PRODUCT_ID=prod_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_... (for $9/month)
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_... (for $99/year)

# Webhook Secret (from Stripe Webhooks settings)
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (should already be configured)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... other Firebase env vars

# Email (optional, defaults to test logging)
RESEND_API_KEY=re_... (or SENDGRID_API_KEY=SG_...)

# App URL (for Stripe redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Create Stripe Products

In Stripe Dashboard (test mode):

1. Go to **Products**
2. Click **Add Product**
3. Create "ColorWizard Pro Monthly":
   - Price: $9/month
   - Billing period: Monthly
   - Save the Price ID

4. Create "ColorWizard Pro Annual":
   - Price: $99/year
   - Billing period: Yearly
   - Save the Price ID

5. Go to **Webhooks** → Add Endpoint
   - URL: `http://localhost:3000/api/stripe/webhook` (use ngrok for local testing)
   - Events: 
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Save the Webhook Secret

### 3. Set Up Webhook Locally

For local testing, use ngrok to expose your local server:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

This gives you a public URL like `https://xxx.ngrok.io`. Use this in Stripe webhooks.

## Testing Flows

### Test 1: View Pricing Page

```
1. Go to http://localhost:3000/pricing
2. Should see tier comparison
3. Both monthly and annual options available
4. Annual shows 18% savings
```

### Test 2: Feature Gating (Demo)

Feature gates are integrated throughout the app. To test:

```
1. Go to http://localhost:3000 (main app)
2. As Free user, Pro features should be disabled/grayed out
3. Hover over Pro features to see "Unlock Pro" tooltip
4. Click to see upgrade modal
```

### Test 3: Upgrade Flow (Monthly)

```
1. Click "Upgrade to Pro" → Pricing Modal appears
2. Select "Monthly" ($9/month)
3. Click "Upgrade to Pro"
4. Redirected to Stripe Checkout
5. Use Stripe test card: 4242 4242 4242 4242 (any future date, any CVC)
6. Enter any email
7. Complete payment
8. Redirected to /dashboard?upgrade=success
9. Check Firebase Firestore → user tier should be "pro"
10. Check email (test logging in console) for confirmation
```

### Test 4: Upgrade Flow (Annual)

```
1. Go to /pricing
2. Click "Annual" toggle (shows $99/year)
3. Click "Upgrade to Pro"
4. Follow same checkout flow
5. Verify annual pricing in Firestore
```

### Test 5: Subscription Webhook

```
1. Complete upgrade (any plan)
2. Go to Stripe Dashboard → Webhooks → Select endpoint
3. Look at "Events" tab - should see "customer.subscription.created"
4. Click event → View Details
5. Should show successful webhook delivery
6. Check Firebase - user tier should be updated
7. Check email logs - confirmation email should be sent
```

### Test 6: User Tier API

```bash
# Get current user tier (with test user ID)
curl http://localhost:3000/api/user/tier \
  -H "Authorization: Bearer demo-user"

# Response should be:
{
  "tier": "pro", # or "free"
  "subscriptionStatus": "active",
  "subscriptionId": "sub_123...",
  "nextBillingDate": "2024-12-15T10:00:00.000Z"
}
```

### Test 7: Settings Page

```
1. Go to /settings
2. Should show current tier
3. If Pro: show billing details, next billing date
4. If Free: show "Upgrade to Pro" button
```

### Test 8: Cancel Subscription

```
1. Use Stripe Dashboard to cancel subscription
2. Go to Webhooks → View recent events
3. Should see "customer.subscription.deleted"
4. Check Firebase - tier should be "free"
5. Check email - cancellation email should be sent
```

## Stripe Test Cards

| Card Number | Outcome |
|---|---|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Card declined |
| 4000 0025 0000 3155 | CVC error |
| 5555 5555 5555 4444 | Visa (different card) |

## Email Testing

Emails are logged to console in test mode. To use real email:

### Option 1: Resend
```env
RESEND_API_KEY=re_...
```

### Option 2: SendGrid
```env
SENDGRID_API_KEY=SG_...
```

## Debugging

### Check Firebase User

```bash
# In Firebase Console → Firestore:
# Collection: users
# Doc ID: (user's ID from demo-user header)
# Should see:
{
  tier: "pro",
  stripeCustomerId: "cus_...",
  subscriptionId: "sub_...",
  subscriptionStatus: "active",
  upgradeDate: Timestamp(...),
  nextBillingDate: Timestamp(...)
}
```

### Check Stripe Events

1. Go to Stripe Dashboard → Webhooks
2. Select your endpoint
3. View recent events
4. Click an event to see full details (should show successful delivery)

### Check Console Logs

The API routes log important events:
- ✅ Subscription created
- 🔄 Subscription updated
- ❌ Subscription canceled
- 📧 Email sent (or error)

## Production Checklist

Before deploying to production:

- [ ] Update Stripe API keys to production keys
- [ ] Set production Stripe Product IDs
- [ ] Configure production webhook endpoint (Vercel URL)
- [ ] Set up email provider (Resend or SendGrid)
- [ ] Integrate Firebase Auth properly (currently uses demo user)
- [ ] Update `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Test full checkout flow in production mode
- [ ] Set up monitoring for webhook failures
- [ ] Configure Stripe customer portal
- [ ] Set up email templates in email provider
- [ ] Create account settings page for subscription management
- [ ] Add status page for system health

## Troubleshooting

### Webhook not delivering

1. Check ngrok is running and URL in Stripe matches
2. Check `STRIPE_WEBHOOK_SECRET` is correct
3. Check logs in Stripe Dashboard for error details
4. Verify request body signature matches

### Checkout fails

1. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is correct
2. Verify price ID exists in Stripe Dashboard
3. Check browser console for errors
4. Check API route logs

### Email not sending

1. In test mode, check console logs
2. Verify email environment variables are set
3. Check email provider dashboard for delivery status

### User tier not updating

1. Check Firebase Firestore path is correct (should be `users/{userId}`)
2. Verify Firestore rules allow writes
3. Check webhook event arrived in Stripe Dashboard
4. Check API logs for errors

## Next Steps

1. **Firebase Auth Integration**: Replace demo-user with real Firebase Auth
2. **Stripe Customer Portal**: Integrate Stripe's hosted portal for subscription management
3. **Analytics**: Track upgrade conversions and subscription metrics
4. **Payment History**: Store and display payment history
5. **Team Billing**: Implement team plans and seat management
6. **Usage Metrics**: Track feature usage per tier
