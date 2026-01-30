# ColorWizard Studio Pro - Release Checklist

**Release Version**: Pro-tier monetization (Stripe $1 lifetime purchase)  
**Target**: Production deployment with hardened entitlements and automated quality gates  
**Last Updated**: 2025-01-29

---

## 📋 Pre-Flight Checklist

### Environment Variables
- [ ] `STRIPE_SECRET_KEY` set and valid (non-null, starts with `sk_live_` or `sk_test_`)
- [ ] `STRIPE_WEBHOOK_SECRET` set and matches Stripe Dashboard (Webhooks > Signing secret)
- [ ] `NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID` set to correct Stripe price ID (e.g., `price_1234...`)
- [ ] `NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID` set to correct Stripe product ID (e.g., `prod_1234...`)
- [ ] `NEXT_PUBLIC_APP_URL` set to production domain (for Stripe redirect URIs)
- [ ] Firebase service account credentials configured and tested
- [ ] Auth tokens and API keys not exposed in client bundle (check `.env.local`, not committed)

**Verification Command**:
```bash
# Check env vars are loaded (should not show empty values for secret keys)
node -e "console.log({
  STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
})"
```

### Stripe Configuration
- [ ] **Webhook Endpoint Active**: Dashboard → Webhooks → endpoint active and responding with 200
- [ ] **Webhook Events Subscribed**: `checkout.session.completed` enabled
- [ ] **Webhook Signing Secret**: Regenerated and matches `STRIPE_WEBHOOK_SECRET` env var
- [ ] **Price Object Correct**: 
  - Amount: $1.00 (100 cents)
  - Currency: USD
  - Type: one-time (not recurring)
  - Product linked to $1 lifetime purchase
- [ ] **Redirect URLs Whitelisted**: 
  - Success: `https://{NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`
  - Cancel: `https://{NEXT_PUBLIC_APP_URL}/pricing`
  - (Verify in Stripe Checkout settings)

**Verification Steps**:
```bash
# Test webhook endpoint with curl
curl -X POST https://{NEXT_PUBLIC_APP_URL}/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: {test_signature}" \
  -d '{"type": "checkout.session.completed", "data": {"object": {"id": "test"}}}'

# Expected: 200 OK (not 401, 403, or 500)
```

### Firestore Security Rules
- [ ] **User Read/Write Rules**:
  - Authenticated users can read/write own `/users/{uid}` document only
  - No cross-user read/write allowed
  - Webhook service account can write to any user's `tier` field
- [ ] **No Public Access**: Collection `/users` requires authentication
- [ ] **Rules Deployed**: `firebase deploy --only firestore:rules` completed successfully
- [ ] **Rules Tested**: Test in Firestore emulator or staging environment

**Example Firestore Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only read/write their own documents
      allow read, write: if request.auth.uid == userId;
      
      // Service account (webhook) can update tier
      allow write: if request.auth.token.firebase.sign_in_provider == 'service_account'
                   && request.resource.data.tier in ['free', 'pro_lifetime'];
    }
  }
}
```

---

## 🔨 Build Verification

### Prerequisites
- [ ] Node.js version matches `.nvmrc` or `package.json` engines field
- [ ] `npm install` or `yarn install` completed without errors
- [ ] No conflicting dependencies (`npm ls --depth=0` shows no duplicates)

### Build Tests
- [ ] **Type Check Passes**:
  ```bash
  npx tsc --noEmit
  # Expected: No errors
  ```

- [ ] **Lint Passes**:
  ```bash
  npm run lint
  # Expected: No errors (warnings OK if non-blocking)
  ```

- [ ] **Build Succeeds**:
  ```bash
  npm run build
  # Expected: ✓ Compiled successfully, no failed routes
  ```

- [ ] **Build Output Clean**:
  - `.next` directory generated
  - No build warnings related to deprecated APIs
  - Stripe/Firebase imports resolve without warnings

- [ ] **Static Analysis**:
  ```bash
  # Check for dead subscription code references
  grep -r "upgradeToPro\|updateSubscriptionStatus\|cancelSubscription" app/ lib/ --include="*.ts" --include="*.tsx"
  # Expected: No matches (or only in deprecated migration files)
  ```

### Bundle Size Check
- [ ] Stripe library (`@stripe/stripe-js`) bundled correctly (not duplicated)
- [ ] Firebase SDK tree-shaken properly (only Auth + Firestore included)
- [ ] No accidental secrets in client bundle
  ```bash
  npx lighthouse --only-categories=performance --view
  # Expected: Stripe/Firebase don't inflate bundle excessively
  ```

---

## 🧪 Smoke Tests (Manual Verification)

### Test Environment: Staging (pre-production)

#### Test 1: Sign Up → Free Tier
1. [ ] Navigate to app in incognito window
2. [ ] Click "Sign Up"
3. [ ] Enter valid email (e.g., `test-free-{timestamp}@example.com`)
4. [ ] Complete auth flow
5. [ ] Verify redirected to dashboard
6. [ ] Check browser console: no auth errors
7. [ ] Verify user document in Firestore:
   ```bash
   firebase firestore:documents:list /users/{testUserId} --project=colorwizard-staging
   # Expected: { uid: "...", tier: "free", email: "..." }
   ```

#### Test 2: Free User Attempts Pro Feature
1. [ ] Log in as free user (from Test 1)
2. [ ] Click on pro-only feature (e.g., "AI Palette Suggestions" button)
3. [ ] `UpgradePrompt` modal should appear with upgrade CTA
4. [ ] Click "Upgrade Now" → redirect to `/pricing` page
5. [ ] Verify pricing page displays $1 offer clearly

#### Test 3: Checkout Flow → Pro Unlock
1. [ ] On `/pricing` page, click "$1 Upgrade" button
2. [ ] Stripe Checkout modal opens (not a redirect)
3. [ ] Fill in test card: `4242 4242 4242 4242` (Stripe test card)
4. [ ] Expiry: `12/25`, CVC: `123`
5. [ ] Complete checkout
6. [ ] Redirected to dashboard with success message
7. [ ] Verify in Firestore:
   ```bash
   firebase firestore:documents:list /users/{testUserId} --project=colorwizard-staging
   # Expected: { tier: "pro_lifetime", stripe: { lastCheckoutSessionId: "cs_..." } }
   ```

#### Test 4: Pro Feature Access
1. [ ] Logged in as pro user (from Test 3)
2. [ ] Navigate to pro-only feature
3. [ ] Feature should be fully accessible (no modal, no prompt)
4. [ ] Verify feature works end-to-end (e.g., AI suggestions generate without error)

#### Test 5: Webhook Idempotency
1. [ ] Create new free user account
2. [ ] Manually trigger Stripe test event (via Stripe CLI or dashboard):
   ```bash
   stripe trigger checkout.session.completed
   # Select session ID of completed checkout, stripe test mode enabled
   ```
3. [ ] Wait 5 seconds for webhook to process
4. [ ] Verify user tier updated to `pro_lifetime`
5. [ ] Re-trigger same session ID again
6. [ ] Verify tier remains `pro_lifetime` (not double-counted)
7. [ ] Check Firestore logs for duplicate writes

#### Test 6: Browser Cache & Session Refresh
1. [ ] Log in as pro user
2. [ ] Note tier displayed in dashboard
3. [ ] Hard refresh page (`Cmd+Shift+R` on Mac, `Ctrl+Shift+R` on Windows)
4. [ ] Verify tier still shows as pro (no flickering to "free")
5. [ ] Repeat with page close + re-open (full session restart)

#### Test 7: Mobile Responsiveness
1. [ ] Open app on mobile device or browser emulation (DevTools → Responsive)
2. [ ] Sizes tested: iPhone 12, iPhone 14 Pro Max, iPad Pro
3. [ ] Verify pricing modal displays correctly on small screens
4. [ ] Verify buttons are tap-friendly (min 44x44px)
5. [ ] Verify text is readable without horizontal scrolling

#### Test 8: Error Handling
1. [ ] Network offline: Click checkout button → Show user-friendly error ("No network connection")
2. [ ] Invalid Stripe key: Attempt checkout → Show generic error ("Payment processing failed")
3. [ ] Webhook handler error: Manually send malformed webhook → Server logs show error, user not charged

---

## ✅ Post-Deployment Verification (Staging → Production)

### Immediately After Deploy (First 15 Minutes)

- [ ] **App loads**: Visit home page, verify no 500 errors
- [ ] **Auth works**: Sign up, log in, log out flows complete
- [ ] **Dashboard renders**: Logged-in users see dashboard with tier displayed
- [ ] **Checkout button visible**: Free users see "$1 Upgrade" button
- [ ] **Stripe integration loads**: No JavaScript errors in console related to Stripe
- [ ] **Monitoring active**: Error tracking (Sentry/LogRocket) showing normal baseline
- [ ] **Webhook endpoint active**: Hit `/api/stripe/webhook` with test payload → 200 OK

### Monitoring Dashboards (First Hour)
- [ ] **Error rate normal**: <1% 5xx errors
- [ ] **Stripe webhook success rate**: ≥99% of events processed
- [ ] **User signup rate normal**: No unusual spikes or drops
- [ ] **Performance metrics normal**: Median page load <3s, P95 <8s
- [ ] **Database writes normal**: Firestore operations completing without throttling

### Checkout Flow (First Hour)
- [ ] **At least 2 test transactions**: Card charges processed successfully in staging/test mode
- [ ] **Webhooks triggered**: Each charge triggers exactly one webhook event
- [ ] **User tier updated**: Verify each test user transitioned to `pro_lifetime` in Firestore
- [ ] **Email confirmations sent**: Check confirmation emails arrive in test inbox

### Rollback Readiness
- [ ] **Previous version tagged**: Git tag `release-v{previous}` exists and is reachable
- [ ] **Rollback procedure documented**: See `ROLLBACK_PLAN.md`
- [ ] **Rollback tested in staging**: One successful manual rollback completed within last 7 days
- [ ] **Runbook accessible**: Team members can access rollback steps (shared doc, wiki, etc.)

---

## 🎯 Go/No-Go Decision Point

### Criteria for **GO** (Proceed to Production)
- ✅ All pre-flight checks completed and passed
- ✅ Build, typecheck, lint all pass without errors
- ✅ All 8 smoke tests completed successfully
- ✅ Post-deployment verification in staging shows green metrics
- ✅ Team consensus: No critical issues identified
- ✅ Runbooks (checklist, rollback, ops notes) reviewed and approved

### Criteria for **NO-GO** (Hold Release)
- ❌ Any environment variable missing or invalid
- ❌ Build fails or typecheck produces errors
- ❌ Smoke tests fail or timeout
- ❌ Firestore security rules not deployed
- ❌ Stripe webhook not responding with 200 OK
- ❌ Error rate in staging >2%
- ❌ Critical issues found in post-deployment monitoring
- ❌ Runbooks incomplete or not reviewed

### Sign-Off
**Release Engineer**: _________________ Date: _________ Time: _________

**QA Lead**: _________________ Date: _________ Time: _________

**Product/Stakeholder**: _________________ Date: _________ Time: _________

**Decision**: ☐ GO ☐ NO-GO

**Reason (if NO-GO)**: 
```
[Describe blocking issue]
```

---

## 📞 Emergency Contacts

- **Stripe Support**: https://support.stripe.com (webhook issues, payment processing)
- **Firebase Console**: https://console.firebase.google.com (database/security rules)
- **Error Tracking**: [Your Sentry/LogRocket dashboard URL]
- **On-Call Engineer**: [Name & phone]
- **Incident Channel**: #incidents (Slack)

---

## 🔗 Related Documents
- `ROLLBACK_PLAN.md` — How to revert if issues arise post-deployment
- `OPERATIONAL_NOTES.md` — How to debug and troubleshoot in production
- `README.md` — Architecture overview

