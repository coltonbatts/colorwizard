# ColorWizard Stripe Deployment Checklist

## Pre-Deployment (Local Testing)

### Code Quality
- [ ] `npm run lint` passes
- [ ] `npm run build` completes without errors
- [ ] No TypeScript errors: all types correct
- [ ] No console warnings or errors in dev

### Local Stripe Testing
- [ ] Stripe test keys configured in `.env.local`
- [ ] `stripe listen` running and webhook forwarding works
- [ ] Full purchase flow tested with test card (`4242 4242 4242 4242`)
- [ ] Dashboard shows Pro after purchase
- [ ] Firestore contains `pro_lifetime` tier
- [ ] Webhook processes without errors
- [ ] Idempotency test passed (no double-processing)

### Documentation
- [ ] `/docs/payments-qa.md` reviewed
- [ ] `/docs/stripe-production.md` reviewed
- [ ] All test procedures completed

---

## Stripe Dashboard Setup

### Stripe Product & Price
- [ ] Product "ColorWizard Pro Lifetime" created in Stripe
- [ ] Product ID noted: `prod_...`
- [ ] Price "$1 USD one-time" created under product
- [ ] Price ID noted: `price_...`
- [ ] Price type confirmed as "One-time payment" (NOT recurring)

### Webhook Endpoint
- [ ] Webhook endpoint created: `https://<your-domain>/api/stripe/webhook`
- [ ] Event `checkout.session.completed` enabled
- [ ] Webhook secret copied: `whsec_...`

### API Keys
- [ ] Live Publishable Key copied: `pk_live_...`
- [ ] Live Secret Key copied: `sk_live_...`

---

## Vercel Environment Variables

### Add to Vercel Project
Project Settings → Environment Variables, add:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID=prod_...
NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID=price_...
```

**Security:**
- [ ] `STRIPE_SECRET_KEY` is NOT prefixed with `NEXT_PUBLIC_`
- [ ] `STRIPE_WEBHOOK_SECRET` is NOT prefixed with `NEXT_PUBLIC_`
- [ ] All secrets are stored as "Encrypted" (not "Plaintext")
- [ ] No secrets committed to Git (checked `.env.local` is in `.gitignore`)

---

## Code Deployment

### Git & Vercel
- [ ] All changes committed to `main` branch
- [ ] Code pushed: `git push origin main`
- [ ] Vercel build starts automatically
- [ ] Build completes without errors
- [ ] Preview deployment successful

### Post-Deploy Checks
- [ ] Production app loads: `https://<your-domain>`
- [ ] Pricing page accessible
- [ ] No console errors in browser DevTools

---

## Post-Deployment Verification

### Webhook Endpoint Test
1. [ ] Go to Stripe Dashboard → Webhooks
2. [ ] Find your endpoint
3. [ ] Click "Test" or "Send test event"
4. [ ] Select `checkout.session.completed`
5. [ ] Verify response status is `200`
6. [ ] Check Vercel function logs for successful processing

### End-to-End Purchase Test

#### Using Test Card (Recommended for Production)
1. [ ] Navigate to `https://<your-domain>/pricing`
2. [ ] Click "Upgrade for $1"
3. [ ] Use test card: `4242 4242 4242 4242`
4. [ ] Expiry: Any future date (e.g., `12/25`)
5. [ ] CVC: Any 3 digits (e.g., `123`)
6. [ ] Complete payment
7. [ ] Verify redirect to dashboard with success message
8. [ ] Confirm Firestore updated with `pro_lifetime`
9. [ ] Verify webhook processed (check Stripe Dashboard logs)

#### Using Real Card (Optional, for Full Confidence)
- [ ] You can use your own card if preferred (real $1 charge)
- [ ] Complete same flow as test card
- [ ] Manual refund available via Stripe Dashboard if needed

### User Tier API Verification
1. [ ] Open browser DevTools → Network tab
2. [ ] Trigger user tier refresh (reload dashboard)
3. [ ] Monitor GET `/api/user/tier` response
4. [ ] Verify response includes `tier: "pro_lifetime"`

### Feature Access Verification
1. [ ] Log in as upgraded user
2. [ ] Navigate to Pro-only feature (e.g., AI Palette Suggestions)
3. [ ] Verify feature is accessible (not gated)
4. [ ] No upgrade prompt should appear

---

## Monitoring & Logs

### Vercel Function Logs
```
https://vercel.com/<project>/deployments → Recent deployment → Function logs
```
- [ ] `/api/stripe/webhook` logs show successful processing
- [ ] `/api/stripe/create-checkout` logs show sessions created
- [ ] `/api/user/tier` logs show data retrieved

### Stripe Logs
```
https://dashboard.stripe.com/webhooks → Your endpoint → Logs
```
- [ ] `checkout.session.completed` events listed
- [ ] Status shows "200" (success)
- [ ] Timestamp corresponds to test purchase

### Firebase/Firestore Logs
```
https://console.firebase.google.com → Cloud Functions → Logs (if applicable)
```
- [ ] No errors in function execution
- [ ] Document updates reflected in Firestore

---

## Rollback Plan (If Issues Arise)

### Step 1: Disable Webhook
```
Stripe Dashboard → Webhooks → Select endpoint → Disable
```
- This prevents further webhook processing during troubleshooting

### Step 2: Revert Code
```bash
git revert <commit-hash>
git push origin main
```
- Vercel automatically redeploys
- App rolls back to previous working state

### Step 3: Switch to Test Mode (Temporary)
- Stripe Dashboard: toggle to "Test Mode"
- Update Vercel env vars to test keys temporarily
- Investigate issue in test environment

### Step 4: Refund Users (If Needed)
```
Stripe Dashboard → Payments → Select payment → Refund
```
- Manual one-click refunds available
- Document refund reason for record

---

## Security Validation

### Pre-Production Checklist
- [ ] No secrets in Git history: `git log --all --oneline -- .env`
- [ ] `.env.local` is in `.gitignore`
- [ ] STRIPE_SECRET_KEY never logged to console
- [ ] Webhook signature verification enforced
- [ ] Feature gating respects server-side tier only (not client-modifiable)
- [ ] Idempotency prevents duplicate unlocking
- [ ] HTTPS enforced (Vercel default)

### Post-Production Monitoring
- [ ] Review Stripe Dashboard for suspicious activity
- [ ] Monitor Firestore for unexpected `pro_lifetime` assignments
- [ ] Check webhook failure rates (should be < 1%)
- [ ] Review Vercel function logs for errors

---

## Communication Plan

### Notify Users (Optional)
If you want to inform users of the new payment option:
- [ ] Email announcement (via SendGrid/Resend)
- [ ] In-app notification banner
- [ ] Social media post (Twitter, Discord, etc.)

### Support Response
If issues reported:
- [ ] Create ticket template for Stripe-related issues
- [ ] Document common solutions in FAQ
- [ ] Escalation path to engineering

---

## Final Confirmation

### Go/No-Go Decision
- [ ] All pre-deployment checks passed
- [ ] All Stripe setup complete
- [ ] All environment variables set in Vercel
- [ ] Code deployed and tested in production
- [ ] Post-deployment verification complete
- [ ] Monitoring configured
- [ ] Rollback plan understood

**Status: [ ] READY TO SHIP**

---

### Appendix: Quick Commands

**Check Environment Variables:**
```bash
vercel env ls
```

**View Vercel Logs:**
```bash
vercel logs --follow
```

**Test Webhook Locally:**
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

**Inspect Stripe Event:**
```bash
stripe events retrieve evt_...
```

**List Recent Charges:**
```bash
stripe charges list --limit=10
```
