# ColorWizard Payments QA

## Local Testing Checklist

### Prerequisites
- Stripe test account created and switched to **test mode**
- Test price ID for $1 one-time payment created
- Stripe CLI installed: `brew install stripe/stripe-cli/stripe`
- `.env.local` populated with:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...` (from `stripe listen`)
  - `NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID=price_...`
  - `NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID=prod_...`
- Firebase configured with test project

### Build & Lint
```bash
npm run typecheck    # TypeScript validation
npm run lint         # ESLint
npm run build        # Next.js build
```
**Expected:** All pass without errors.

### Start Local Dev Server
```bash
npm run dev
```
Navigate to http://localhost:3000

### Start Stripe Webhook Listener
In a separate terminal:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```
**Expected Output:**
```
Ready! You are now listening for Stripe webhooks on your endpoint...
> webhook signing secret: whsec_...
```
Copy the `whsec_` value and add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### Full Purchase Flow Test

#### Step 1: Create a Test Checkout Session
1. Navigate to http://localhost:3000/pricing
2. Click "Upgrade for $1"
3. **Expected:** Stripe Checkout page loads

#### Step 2: Complete Payment with Test Card
Use Stripe test card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- Zip: Any value
- Click "Pay"
- **Expected:** Redirected to `/dashboard?session_id=cs_...&upgrade=success`

#### Step 3: Verify Dashboard Message
- **Expected:** "🎉 Welcome to ColorWizard Pro!" message
- **Expected:** Current tier shows "pro_lifetime"

#### Step 4: Verify Webhook Processing
Check the terminal where `stripe listen` is running:
- **Expected:** Log entry: `POST /api/stripe/webhook 200`
- Check server logs for: `✅ Pro Lifetime unlocked for user: ...`

#### Step 5: Verify Firestore Update
1. Open Firebase Console → Firestore
2. Navigate to `users/{userId}` document
3. **Expected fields:**
   - `tier: "pro_lifetime"`
   - `proUnlockedAt: <server timestamp>`
   - `stripe.customerId: "cus_..."`
   - `stripe.lastCheckoutSessionId: "cs_..."`

### Idempotency Test

#### Manually Replay Webhook
```bash
stripe trigger checkout.session.completed
```
This simulates Stripe resending a webhook event.

**Expected behavior:**
- Webhook handler processes event
- Firestore is NOT modified (idempotency check catches duplicate)
- Server logs: `⚠️  Session cs_... already processed for user ...`
- No errors, HTTP 200

### Test Cancellation

#### Step 1: Navigate to Pricing While Logged In
Click "Upgrade for $1" → Cancel on Stripe Checkout page
- **Expected:** Redirected to `/pricing?upgrade=canceled`

#### Step 2: Verify No Charge
Check Stripe Dashboard → Payments
- **Expected:** No successful payment for this session

### Known Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| User doc doesn't exist before checkout | `createUserDoc` called in webhook if missing |
| Duplicate webhook processing | Idempotency check on `lastCheckoutSessionId` |
| Webhook secret not set | Signature verification fails, returns 400 |
| Stripe credentials missing | Error response from create-checkout, user-friendly message |
| Email service down | Webhook still succeeds, email optional |
| Rate limiting | Stripe handles; short test won't trigger |

### Debugging Commands

**Check Stripe Events:**
```bash
stripe events list --limit=10
```

**Get Specific Checkout Session:**
```bash
stripe checkout.sessions retrieve cs_test_...
```

**View Test Payments:**
```bash
stripe payments list
```

**Monitor Webhook Deliveries:**
```bash
stripe logs tail --filter="resource_type:checkout.session"
```

---

## Post-Testing Checklist

- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Full purchase flow completes (Steps 1-5 above)
- [ ] Webhook logs show successful processing
- [ ] Firestore updated with `pro_lifetime` tier
- [ ] Idempotency test confirms no duplicate processing
- [ ] Dashboard shows pro_lifetime status
- [ ] Feature access hook recognizes `pro_lifetime` as Pro

Once all checks pass, you're ready for production deployment.
