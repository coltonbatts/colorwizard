# ColorWizard Studio Pro - Rollback Plan

**Last Updated**: 2025-01-29  
**Scope**: Rolling back Stripe monetization ($1 lifetime purchase) release  
**Disaster Recovery Level**: Critical (revenue-impacting service)

---

## 🚨 Activation Triggers

Roll back immediately if any of these occur:

1. **Stripe Webhook Failure**: >5% of webhooks returning non-200 status for >10 minutes
2. **Checkout Broken**: Users unable to complete payment for >15 minutes
3. **Data Corruption**: Users charged but tier not set to `pro_lifetime` (orphaned transactions)
4. **Security Breach**: Unauthorized access to Stripe API keys or user data
5. **Critical Bug**: App crash on `/pricing` page or dashboard for pro users
6. **Revenue Leakage**: Free users able to access pro features without paying (entitlement bypass)

---

## ⏱️ Rollback Timeline

### First 5 Minutes: Stop the Bleeding

**Immediate Actions** (do these in parallel):

1. **Disable Checkout Button**:
   ```bash
   # Option A: Feature flag (if implemented)
   # Set in Firebase Realtime Database or Firestore:
   /config/features/stripe_checkout_enabled = false
   
   # Option B: Environment variable (deploy immediately)
   NEXT_PUBLIC_STRIPE_CHECKOUT_DISABLED=true
   npm run build
   npm run deploy
   
   # Expected result: Users see "Currently unavailable" message instead of "$1 Upgrade" button
   ```

2. **Disable Webhook Processing**:
   ```bash
   # Temporarily reject webhook events to prevent further tier updates
   # Edit: app/api/stripe/webhook/route.ts
   
   export async function POST(req: NextRequest) {
     // Temporary: reject all webhooks during incident
     return NextResponse.json(
       { error: 'Webhooks temporarily disabled' },
       { status: 503 }
     );
   }
   
   # Deploy immediately
   npm run build && npm run deploy
   ```

3. **Notify Stripe**:
   - Log into Stripe Dashboard: https://dashboard.stripe.com
   - Go to **Webhooks** → your endpoint
   - Review recent deliveries: check for failures
   - **Do NOT delete the endpoint** (you'll need it for re-enabling)
   - Document timestamp and error messages

4. **Notify Team**:
   - Slack: Post to #incidents channel
   - Subject: "🚨 ROLLBACK INITIATED: Stripe checkout disabled"
   - Include: Trigger reason, time started, current status

5. **Enable Error Logging**:
   ```bash
   # Ensure detailed logs are visible for debugging
   # In your log aggregator (Sentry, LogRocket, etc.):
   # - Set error level to DEBUG
   # - Enable Stripe-related logs for next 30 minutes
   ```

---

### Next 30 Minutes: Assess & Decide

**Information Gathering**:

1. **Check Webhook Logs**:
   ```bash
   # View webhook processing errors
   firebase functions:log --project=colorwizard-prod | grep stripe
   
   # Or in Stripe Dashboard:
   # Webhooks → your endpoint → "Deliveries" tab
   # Look for: response status, error messages, payload
   ```

2. **Check User Reports**:
   - Scan #incidents for user complaints
   - Check support email inbox for surge in issues
   - Search error tracker for "stripe", "checkout", "tier"

3. **Verify Firestore Integrity**:
   ```bash
   # Count users charged but not upgraded
   firebase firestore:documents:list /users \
     --order-by=stripe.lastCheckoutSessionId \
     --project=colorwizard-prod \
     --query='tier == "free" && stripe.lastCheckoutSessionId != null' \
     | wc -l
   
   # If count > 0: data corruption present → proceed to rollback
   ```

4. **Assess Stripe API Health**:
   - Visit https://status.stripe.com
   - Check if Stripe reports any outages
   - If Stripe is down, likely temporary; monitor for recovery

**Rollback Decision**:

| Scenario | Action |
|----------|--------|
| **Stripe API outage** | WAIT for recovery (disable button locally), don't rollback code |
| **Webhook signature mismatch** | VERIFY `STRIPE_WEBHOOK_SECRET` matches Dashboard; if not, redeploy with correct secret |
| **Checkout code bug** (not Stripe) | ROLLBACK to previous version |
| **Data corruption** (users charged, not upgraded) | ROLLBACK + manual remediation |
| **Recoverable within 30 min** | Monitor, attempt fix, verify with test transaction |
| **Still broken at 30 min** | Full ROLLBACK to previous release |

---

### Full Rollback: 30–60 Minutes

**If decision is ROLLBACK, execute in this order**:

#### Step 1: Revert Code to Previous Release
```bash
# Find the last stable release tag
git tag | grep -E "^v[0-9]+\.[0-9]+\.[0-9]+$" | sort -V | tail -2

# Example output:
# v1.2.1  (current, broken)
# v1.2.0  (previous, stable)

# Checkout previous version
git checkout v1.2.0

# Rebuild and deploy
npm run build
npm run deploy --project=colorwizard-prod

# Verify deployment in Vercel/Cloud Run dashboard (should show new build)
```

#### Step 2: Re-Enable Webhook (Only If Not the Problem)
```bash
# If rollback was due to checkout code bug (not webhook):
# Revert app/api/stripe/webhook/route.ts to previous version
git checkout v1.2.0 -- app/api/stripe/webhook/route.ts

# If webhook itself was broken:
# Keep it disabled for now; diagnose separately
```

#### Step 3: Verify App Works
```bash
# In production (or staging, if rolling back there):
1. Load home page → should load without errors
2. Sign up as new user → should complete, tier = "free"
3. Try to access pro feature → should show "Upgrade" button (checkout disabled)
4. Monitor error rate → should drop to <0.5%

# Expected: Checkout button hidden, app stable
```

#### Step 4: Notify Team
```
Slack #incidents:
✅ ROLLBACK COMPLETE
- Reverted to v1.2.0
- Checkout disabled (users cannot upgrade)
- Webhook processing disabled
- App stable (error rate 0.2%)
- Next: manual investigation, communication with affected users
```

---

## 🛠️ Manual Remediation

### Re-Enable Checkout (After Bug Fix)
```bash
# 1. Fix the bug in a new branch
git checkout -b fix/stripe-{issue-name}
# ... make fixes, test thoroughly ...

# 2. Merge to main
git merge fix/stripe-{issue-name}

# 3. Re-enable checkout feature flag
# Option A: Firestore
firebase firestore:documents:set /config/features \
  '{stripe_checkout_enabled: true}' \
  --project=colorwizard-prod

# Option B: Env var (next deploy)
NEXT_PUBLIC_STRIPE_CHECKOUT_DISABLED=false \
npm run build && npm run deploy

# 4. Re-enable webhook processing
git checkout main -- app/api/stripe/webhook/route.ts
npm run build && npm run deploy

# 5. Verify with test transaction (card: 4242 4242 4242 4242)
```

### Manually Set User Tier (If Data Corruption)

**Scenario**: User was charged but `tier` not updated to `pro_lifetime`.

```bash
# List affected users (those with Stripe session ID but free tier)
firebase firestore:documents:list /users \
  --query='stripe.lastCheckoutSessionId != null && tier == "free"' \
  --project=colorwizard-prod > /tmp/orphaned_users.txt

# Manually update each user's tier to pro_lifetime
# Option A: Firebase CLI (one-liner per user)
firebase firestore:documents:set /users/{userId} \
  '{tier: "pro_lifetime"}' \
  --merge \
  --project=colorwizard-prod

# Option B: Firestore Console
# 1. Go to https://console.firebase.google.com
# 2. Navigate to Firestore → Database → users collection
# 3. Find user with lastCheckoutSessionId but tier = "free"
# 4. Edit document, change tier to "pro_lifetime"
# 5. Save

# Option C: Batch script (for multiple users)
cat > fix_users.js << 'EOF'
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'colorwizard-prod'
});

const db = admin.firestore();

async function fixOrphanedUsers() {
  const snapshot = await db.collection('users')
    .where('tier', '==', 'free')
    .where('stripe.lastCheckoutSessionId', '!=', null)
    .get();

  console.log(`Found ${snapshot.size} orphaned users`);
  
  let fixed = 0;
  for (const doc of snapshot.docs) {
    await doc.ref.update({ tier: 'pro_lifetime' });
    fixed++;
    console.log(`[${fixed}/${snapshot.size}] Fixed ${doc.id}`);
  }
  
  console.log('Done!');
  process.exit(0);
}

fixOrphanedUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
EOF

node fix_users.js
```

### Manually Re-Trigger Webhook for a Session

**Scenario**: User paid, but webhook was lost (network glitch). Manually sync.

```bash
# 1. Get the checkout session ID from Stripe Dashboard
# https://dashboard.stripe.com/test/payments
# Find the session → click to view details → copy session ID

SESSION_ID="cs_test_a1b2c3d4e5f6..."

# 2. Retrieve full session details
stripe checkout sessions retrieve $SESSION_ID --api-key=$STRIPE_SECRET_KEY | jq .

# 3. Look for:
# - "payment_status": "paid"
# - "customer": "cus_1234..." (or null)
# - "metadata": { "userId": "..." }

# 4. Manually call webhook handler
# Option A: Use Stripe CLI to trigger test event
stripe trigger checkout.session.completed --api-key=$STRIPE_SECRET_KEY

# Option B: Make HTTP request to your webhook endpoint
curl -X POST https://colorwizard.com/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=abcd1234..." \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "'$SESSION_ID'",
        "payment_status": "paid",
        "customer": "cus_1234...",
        "metadata": { "userId": "user-uid-here" }
      }
    }
  }'

# 5. Verify user tier updated
firebase firestore:documents:list /users/{userId} --project=colorwizard-prod | grep tier
# Expected: "tier": "pro_lifetime"
```

---

## 🔄 Post-Rollback: Communication & Recovery

### User Communication Template

**If users were affected** (charged but not upgraded):

```
Subject: ColorWizard Pro Upgrade — Update on Your Order

Hi [User Name],

We experienced a brief issue with our Pro upgrade feature today. We've identified and fixed the problem.

If you attempted to upgrade and were charged, we sincerely apologize. Here's what we did:

✅ Your account has been manually upgraded to Pro lifetime
✅ Your $1 charge is complete and final (no subscription, no recurring charges)
✅ You now have access to all Pro features:
   - AI Palette Suggestions
   - Team Collaboration
   - Advanced Presets
   - [any others]

You're all set! Start using Pro features anytime on your dashboard.

If you have any questions, reply to this email or contact us at support@colorwizard.com.

Thanks for supporting ColorWizard! 🎨

— The ColorWizard Team
```

### Internal Post-Incident Review

```markdown
## Incident Summary
- **Date/Time**: [when it started and when it was resolved]
- **Duration**: [X minutes from detection to resolution]
- **Root Cause**: [the bug or failure]
- **Impact**: [how many users affected, money lost, etc.]

## What We Did
1. [action 1]
2. [action 2]
...

## What We'll Do To Prevent This
1. [preventive measure 1]
2. [preventive measure 2]

## Owner & Timeline
- **Owner**: [person responsible for fix]
- **Target Date**: [when fix will be deployed]
```

---

## 📋 Rollback Checklist

Quick reference for on-call engineer:

- [ ] Slack #incidents notified
- [ ] Checkout button disabled (feature flag or env var)
- [ ] Webhook processing disabled (if needed)
- [ ] Stripe Dashboard reviewed for error logs
- [ ] Decision made: wait for fix vs. full rollback
- [ ] If ROLLBACK:
  - [ ] Previous version identified (git tag)
  - [ ] Code reverted (`git checkout v1.2.0`)
  - [ ] Build successful (`npm run build`)
  - [ ] Deploy completed
  - [ ] App verification (home page, signup, error rate)
  - [ ] Team notified of completion
- [ ] If DATA CORRUPTION:
  - [ ] Orphaned users identified
  - [ ] Tiers manually corrected (Firebase CLI)
  - [ ] Users notified
- [ ] Error tracking reviewed (Sentry/LogRocket)
- [ ] Monitoring re-enabled (alert thresholds normal)

---

## 🔗 Related Documents
- `RELEASE_CHECKLIST.md` — Pre-deployment verification
- `OPERATIONAL_NOTES.md` — Debugging & troubleshooting
- Stripe API Docs: https://stripe.com/docs/api
- Firebase Docs: https://firebase.google.com/docs
- Incident Response Runbook: [your org's runbook]

