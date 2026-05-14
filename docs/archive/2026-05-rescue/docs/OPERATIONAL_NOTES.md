# ColorWizard Studio Pro - Operational Notes

**Last Updated**: 2025-01-29  
**Audience**: On-call engineers, support staff, product managers  
**Purpose**: Real-world debugging, troubleshooting, and operational tasks

---

## 🔍 How to Check If a User Is Pro in Firestore

### Quick Status Check (5 seconds)

```bash
# Get user's tier directly
firebase firestore:documents:list /users/{userId} \
  --project=colorwizard-prod \
  | grep -A5 "tier"

# Expected output:
# "tier": "pro_lifetime"  ← Pro user
# "tier": "free"          ← Free user
```

### Visual Check (Firestore Console)
1. Go to https://console.firebase.google.com
2. Select project: **colorwizard-prod**
3. Navigate to **Firestore Database**
4. Click **users** collection
5. Find user by searching UID or email
6. Look at `tier` field

### Detailed Verification (Confirm Payment + Tier)

```bash
# Full user document with all payment metadata
firebase firestore:documents:list /users/{userId} \
  --project=colorwizard-prod \
  --pretty

# Look for:
{
  "uid": "user-abc123",
  "email": "user@example.com",
  "tier": "pro_lifetime",           ← This should be "pro_lifetime"
  "stripe": {
    "lastCheckoutSessionId": "cs_test_abc123",  ← Session ID (idempotency key)
    "stripeCustomerId": "cus_abc123"            ← Customer ID
  },
  "createdAt": "2025-01-29T12:34:56Z"
}
```

### Verify Payment in Stripe

```bash
# If user tier is correct, verify the Stripe charge exists
# (confirms payment actually went through)

stripe charges list \
  --api-key=$STRIPE_SECRET_KEY \
  --customer=cus_abc123 \
  --limit=10

# Or search by session ID:
stripe checkout sessions retrieve cs_test_abc123 \
  --api-key=$STRIPE_SECRET_KEY | jq '.payment_status'

# Expected: "paid" (not "unpaid" or "open")
```

---

## 🔄 How to Re-Trigger a Webhook for a Session

**Scenario**: User paid but tier wasn't updated. Need to manually re-trigger the webhook.

### Method 1: Stripe CLI (Easiest)
```bash
# Install Stripe CLI first (if not already)
# https://stripe.com/docs/stripe-cli

# List recent checkout sessions
stripe checkout sessions list \
  --api-key=$STRIPE_SECRET_KEY \
  --limit=5 \
  --created="{gte: $(date -d '-1 hour' +%s)}"

# Trigger webhook for a specific session
stripe trigger checkout.session.completed \
  --api-key=$STRIPE_SECRET_KEY

# Follow prompts to select the session ID
# Expected: Event queued and sent to webhook endpoint
```

### Method 2: Manual HTTP Request
```bash
# 1. Get session details
SESSION_ID="cs_test_abc123"
stripe checkout sessions retrieve $SESSION_ID \
  --api-key=$STRIPE_SECRET_KEY > /tmp/session.json

# 2. Extract payment details
CUSTOMER=$(jq -r '.customer' /tmp/session.json)
PAYMENT_STATUS=$(jq -r '.payment_status' /tmp/session.json)

# 3. Create webhook payload
cat > /tmp/webhook.json << EOF
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "$SESSION_ID",
      "payment_status": "$PAYMENT_STATUS",
      "customer": "$CUSTOMER",
      "metadata": {}
    }
  }
}
EOF

# 4. Send to webhook endpoint (sign the request)
# Note: This requires a valid Stripe signature
# Easier to use Stripe CLI (Method 1) or Stripe Dashboard

# Via Stripe Dashboard:
# 1. Go to Dashboard → Developers → Webhooks → your endpoint
# 2. Click "Test Webhook"
# 3. Select "checkout.session.completed"
# 4. Click "Send test webhook"
```

### Method 3: Stripe Dashboard (Safest)
1. Go to https://dashboard.stripe.com
2. Navigate to **Developers → Webhooks**
3. Click your webhook endpoint
4. Scroll to **Recent deliveries**
5. Find the session you want to re-trigger
6. Click the row to see details
7. Click **Resend** button

**⚠️ After re-triggering**, verify:
```bash
# Check user tier updated
firebase firestore:documents:list /users/{userId} \
  --project=colorwizard-prod | grep tier

# Expected: "tier": "pro_lifetime"
```

---

## 🐛 Debugging Checklist

### Symptom: User Tier Not Updating After Purchase

**Quick Diagnosis**:

```bash
# 1. Verify user exists and has the session ID
firebase firestore:documents:list /users/{userId} \
  --project=colorwizard-prod | jq '.stripe'

# Should show: { "lastCheckoutSessionId": "cs_...", "stripeCustomerId": "cus_..." }
# If missing: webhook never fired
```

**Steps to Resolve**:

1. **Check Stripe Dashboard**:
   - Go to https://dashboard.stripe.com/payments
   - Find the charge
   - Confirm `payment_status = "paid"`

2. **Check Webhook Logs**:
   ```bash
   # View webhook endpoint in Stripe Dashboard
   # Developers → Webhooks → your endpoint → Recent deliveries
   # Look for `checkout.session.completed` events
   # - If event is missing: Stripe didn't send it (rare, contact Stripe)
   # - If event status is red (failed): webhook handler had an error
   ```

3. **Check Application Logs**:
   ```bash
   # View server-side logs
   firebase functions:log --project=colorwizard-prod | grep stripe
   
   # Or in your error tracker (Sentry, LogRocket):
   # Filter: tag:stripe AND error
   # Look for: webhook processing errors, Firestore write failures
   ```

4. **Check Webhook Secret**:
   ```bash
   # If webhook events are received but marked as failed with 401/403:
   # The signature verification is failing
   
   # Verify env var matches Stripe Dashboard
   echo $STRIPE_WEBHOOK_SECRET
   
   # Compare with Stripe Dashboard:
   # Developers → Webhooks → your endpoint → Signing secret
   
   # If mismatch, update env var and redeploy:
   STRIPE_WEBHOOK_SECRET="whsec_live_abc123..." npm run deploy
   ```

5. **Manually Trigger Webhook** (last resort):
   ```bash
   # Re-trigger the event (see "How to Re-Trigger" section above)
   stripe trigger checkout.session.completed --api-key=$STRIPE_SECRET_KEY
   ```

**Possible Causes**:
| Cause | Fix |
|-------|-----|
| Webhook secret mismatch | Redeploy with correct `STRIPE_WEBHOOK_SECRET` |
| Webhook endpoint unavailable | Verify `/api/stripe/webhook` route exists and returns 200 |
| Firestore rules block writes | Check security rules allow service account to write to `users/{uid}/tier` |
| Session ID already processed | Check `stripe.lastCheckoutSessionId` matches; idempotency should prevent double-update |
| Stripe event never sent | Rare; check Stripe status or contact Stripe support |

---

### Symptom: Checkout Button Not Appearing / Checkout Fails

**Quick Diagnosis**:

```bash
# 1. Check user tier (free users see button)
firebase firestore:documents:list /users/{userId} \
  --project=colorwizard-prod | jq '.tier'

# Expected: "free"

# 2. Check Stripe price ID is configured
echo $NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID

# Expected: "price_..." (non-empty)

# 3. Check browser console for JavaScript errors
# Open DevTools (F12) → Console tab
# Look for: "Stripe initialization failed", "Cannot read property 'redirectToCheckout'"
```

**Steps to Resolve**:

1. **Verify Stripe Configuration**:
   ```bash
   # Check all required env vars
   node -e "console.log({
     STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
     NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID,
     NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID,
     NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
   })"
   
   # All should be true or have values
   ```

2. **Test Stripe Library Loading**:
   ```javascript
   // In browser console:
   console.log(window.Stripe);
   // Expected: function
   
   // If undefined: Stripe script not loaded
   // Check: Stripe script tag in _document.tsx or _app.tsx
   ```

3. **Test Checkout Creation**:
   ```bash
   # Call the checkout creation API directly
   curl -X POST https://colorwizard.com/api/stripe/create-checkout \
     -H "Authorization: Bearer {user-auth-token}" \
     -H "Content-Type: application/json" \
     -d '{"priceId": "'$NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID'"}'
   
   # Expected:
   # { "sessionId": "cs_test_abc123" }
   
   # If error:
   # { "error": "..." } → check backend logs for reason
   ```

4. **Check Network Tab**:
   - Open DevTools → Network tab
   - Click checkout button
   - Look for request to `/api/stripe/create-checkout`
   - Verify response status is 200 (not 400, 401, 500)
   - If 500: check server logs

5. **Verify Stripe Price Exists**:
   ```bash
   # In Stripe Dashboard
   # Go to Products → {Product Name} → Pricing
   # Verify price exists and amount is $1.00 USD
   # Copy the price ID and verify it matches NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID
   ```

**Possible Causes**:
| Cause | Fix |
|-------|-----|
| Price ID incorrect or missing | Update `NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID` in env |
| Stripe key invalid | Verify `STRIPE_SECRET_KEY` starts with `sk_` |
| Checkout button disabled (feature flag) | Check `NEXT_PUBLIC_STRIPE_CHECKOUT_DISABLED` env var |
| User is pro (not free) | Check `users/{uid}` tier field; pro users don't see button |
| Stripe script not loading | Check browser console for CSP/CORS errors |
| Network connectivity | Check user's network; try in private window |

---

### Symptom: Email Confirmation Not Sent

**Quick Diagnosis**:

```bash
# 1. Check if charge was actually successful
stripe charges list --api-key=$STRIPE_SECRET_KEY --customer=cus_abc123

# Expected: at least one charge with status "succeeded"

# 2. Check if email service is active
# (Depends on your email provider: SendGrid, Mailgun, etc.)
# Review logs in your email service dashboard
```

**Steps to Resolve**:

1. **Verify Charge Was Processed**:
   ```bash
   # If charge status is not "succeeded", order never went through
   stripe charges list \
     --api-key=$STRIPE_SECRET_KEY \
     --limit=10 | jq '.data[] | {id, status, customer, amount}'
   ```

2. **Check Email Service Logs**:
   - SendGrid: https://app.sendgrid.com/email_activity
   - Mailgun: https://app.mailgun.com/app/logs
   - AWS SES: https://console.aws.amazon.com/ses/

3. **Verify User Email in Firestore**:
   ```bash
   firebase firestore:documents:list /users/{userId} \
     --project=colorwizard-prod | jq '.email'
   
   # Expected: valid email address
   ```

4. **Check Email Template**:
   - Verify confirmation email template is configured in your email provider
   - Verify template includes user email and charge details

5. **Test Email Manually**:
   ```bash
   # Send test email via your email provider
   # SendGrid example:
   curl --request POST \
     --url https://api.sendgrid.com/v3/mail/send \
     --header "authorization: Bearer $SENDGRID_API_KEY" \
     --header "content-type: application/json" \
     --data '{
       "personalizations": [{"to": [{"email": "test@example.com"}]}],
       "from": {"email": "noreply@colorwizard.com"},
       "subject": "Test Email",
       "content": [{"type": "text/plain", "value": "Hello!"}]
     }'
   ```

**Possible Causes**:
| Cause | Fix |
|-------|-----|
| Email service key invalid | Verify API key in env vars |
| User email wrong/missing in Firestore | Check `users/{uid}/email` exists |
| Email template missing | Configure template in email service |
| Webhook didn't fire | See "Tier Not Updating" section |
| Email flagged as spam | Check spam folder; whitelist sender domain |

---

## 📊 Key Metrics & Dashboards

### Stripe Dashboard
- **Real-time payments**: https://dashboard.stripe.com/payments
- **Webhook logs**: https://dashboard.stripe.com/webhooks
- **Customer list**: https://dashboard.stripe.com/customers
- **Charge history**: https://dashboard.stripe.com/charges

### Firebase Console
- **Firestore Database**: https://console.firebase.google.com/firestore/data
- **Authentication**: https://console.firebase.google.com/authentication/users
- **Function Logs**: https://console.firebase.google.com/functions/list

### Application Monitoring
- **Error Tracking**: [Your Sentry/LogRocket dashboard]
- **Performance**: [Your analytics dashboard]
- **Uptime**: [Your status page]

---

## 🔧 Common One-Liners

### Bulk Update User Tiers
```bash
# Upgrade all users created in last 7 days to pro (for testing)
firebase firestore:documents:list /users \
  --project=colorwizard-prod \
  --query='createdAt >= 2025-01-22' \
  | xargs -I {} firebase firestore:documents:set /users/{} \
    '{tier: "pro_lifetime"}' --merge --project=colorwizard-prod
```

### List All Pro Users
```bash
firebase firestore:documents:list /users \
  --project=colorwizard-prod \
  --query='tier == "pro_lifetime"'
```

### Check Webhook Success Rate (Last 24h)
```bash
# In Stripe Dashboard:
# Developers → Webhooks → your endpoint
# View "Deliveries" tab → filter by success/failure
# Count: successes / total
# Expected: ≥99%
```

### Verify Idempotency (Same Session, No Duplicate Charges)
```bash
# List charges for a customer
stripe charges list \
  --api-key=$STRIPE_SECRET_KEY \
  --customer=cus_abc123 | jq '.data | length'

# Expected: 1 (only one charge per customer)
# If >1: check if user was accidentally charged twice
```

---

## 📞 Escalation & Support

### Internal Escalation
- **Stripe integration issue**: Contact [Stripe support contact]
- **Firebase issue**: Contact [Firebase support contact]
- **Application bug**: Post to #engineering Slack

### External Support
- **Stripe Documentation**: https://stripe.com/docs
- **Stripe Support**: https://support.stripe.com
- **Firebase Documentation**: https://firebase.google.com/docs
- **Status Pages**:
  - Stripe: https://status.stripe.com
  - Google Cloud: https://status.cloud.google.com

### On-Call Contacts
- **On-call engineer**: [Name & phone]
- **Engineering lead**: [Name & phone]
- **Product manager**: [Name & phone]

---

## 🔗 Related Documents
- `RELEASE_CHECKLIST.md` — Pre-deployment checklist
- `ROLLBACK_PLAN.md` — How to rollback if disaster strikes
- Architecture: `/docs/README.md`
- API Routes: `/docs/API.md`

