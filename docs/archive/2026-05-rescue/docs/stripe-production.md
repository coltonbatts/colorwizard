# ColorWizard Stripe Production Setup

## Overview
ColorWizard uses **one-time $1 lifetime purchase** model via Stripe Checkout in `mode: 'payment'`.

---

## Stripe Dashboard Configuration

### 1. Create Product
1. Go to https://dashboard.stripe.com/products
2. Click **"New"**
3. Fill in:
   - **Name:** `ColorWizard Pro Lifetime`
   - **Type:** Standard
   - **Billing Period:** Leave as is (not recurring)
4. Click **"Create Product"**
5. Note the **Product ID** (e.g., `prod_P4s5K7m9N...`)

### 2. Create Price
1. In the product detail page, scroll to **"Pricing"**
2. Click **"Add another price"**
3. Fill in:
   - **Currency:** USD
   - **Price:** $1.00
   - **Billing Period:** One-time (select from dropdown)
4. Click **"Save Price"**
5. Note the **Price ID** (e.g., `price_1P4s5K7m9N...`)

### 3. Set Up Webhook Endpoint
1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Fill in:
   - **URL:** `https://yourdomain.com/api/stripe/webhook` (replace `yourdomain.com`)
   - **Version:** Latest (should auto-select)
4. Under **"Events to send"**, select:
   - `checkout.session.completed` ✓ (required)
   - (Optional) `charge.dispute.created` for dispute handling
5. Click **"Add endpoint"**
6. You'll see the webhook signing secret: `whsec_...`
7. Copy this value for Vercel environment variables

### 4. Retrieve API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Switch to **"Live Keys"** (if you're setting up production)
3. Copy:
   - **Publishable Key:** `pk_live_...`
   - **Secret Key:** `sk_live_...`
4. Store these securely (see "Environment Variables" section below)

---

## Vercel Deployment

### 1. Set Environment Variables
In Vercel dashboard (Project Settings → Environment Variables):

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID=prod_...
NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID=price_...
```

**Important:**
- Prefix `NEXT_PUBLIC_` means it's exposed to the client (safe for keys)
- DO NOT prefix secret keys with `NEXT_PUBLIC_`
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are server-only

### 2. Deploy Code
```bash
git push origin main
```
Vercel auto-deploys. Monitor the build log.

### 3. Update Stripe Webhook Endpoint
Once deployed, update the webhook URL in Stripe Dashboard:
1. Go to https://dashboard.stripe.com/webhooks
2. Find the endpoint you created
3. Click **"Edit"** → Update URL to production domain
4. Test the endpoint:
   - Click **"Send test event"**
   - Select `checkout.session.completed`
   - Verify log shows successful delivery (200)

---

## Post-Deploy Verification

### 1. Test with Real Payment (Optional)
If you want to verify with actual money:
- Use a real card in production Stripe (not test mode)
- Make a $1 purchase
- Verify webhook fires and Firestore updates
- **Note:** You'll need to refund manually if just testing

### 2. Test with Stripe Test Card (Recommended)
Even in production, you can still use test cards:
1. In Stripe Dashboard, toggle **"Viewing test data"** at top
2. Use test card: `4242 4242 4242 4242`
3. Complete checkout flow
4. Verify webhook processing

### 3. Monitor Webhooks
```bash
stripe logs tail --filter="resource_type:checkout.session"
```
Or use Stripe Dashboard → Webhooks → Logs

### 4. Verify Firestore Updates
1. Open Firebase Console (Production project)
2. Navigate to `users/{userId}` document
3. Confirm:
   - `tier: "pro_lifetime"`
   - `proUnlockedAt: <timestamp>`
   - `stripe.customerId, lastCheckoutSessionId` populated

### 5. Test Feature Access
1. Log in as upgraded user
2. Navigate to AI Palette Suggestions (Pro-only feature)
3. Verify feature is accessible (not gated)

---

## Monitoring & Troubleshooting

### Webhook Failures
**Logs Location:** Stripe Dashboard → Webhooks → Select Endpoint → Logs

**Common Issues:**
| Issue | Fix |
|-------|-----|
| 401 Unauthorized | Check `STRIPE_SECRET_KEY` in Vercel |
| 400 Bad Request | Check `STRIPE_WEBHOOK_SECRET` matches |
| 500 Server Error | Check Firebase credentials, network |
| Timeout | Increase timeout (Stripe retries 5 times over 3 days) |

### Email Delivery
If confirmation emails fail:
- Check email service configuration (`RESEND_API_KEY` or `SENDGRID_API_KEY`)
- Webhook still succeeds (email is non-critical)
- Manually send confirmation if needed

### User Not Unlocked
**Debug Steps:**
1. Check Firestore: Is `tier: "pro_lifetime"` set?
2. Check webhook logs: Did event fire?
3. Check server logs in Vercel: Any errors?
4. Re-fetch user tier on client: `useUserTier().refetch()`

---

## Rollback Plan

If issues arise:
1. **Disable webhook:** Go to Stripe Dashboard → Webhooks → Disable endpoint
2. **Switch to test mode:** In Stripe, toggle to test keys temporarily
3. **Revert code:** `git revert <commit>` and redeploy
4. **Refund users:** Manual refunds via Stripe Dashboard if needed

---

## Security Checklist

- [ ] `STRIPE_SECRET_KEY` NOT in Git (only in Vercel secrets)
- [ ] `STRIPE_WEBHOOK_SECRET` in Vercel (not hardcoded)
- [ ] Webhook signature verification enabled (code enforces it)
- [ ] Firebase security rules restrict tier updates to server only
- [ ] No secrets logged (check `console.log` calls)
- [ ] Idempotency enforced (duplicate sessions won't double-charge)
- [ ] HTTPS only (Stripe requires it)

---

## Support

- Stripe Docs: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Firebase Docs: https://firebase.google.com/docs
