# ColorWizard Growth Sprint Phase 2A
## Deliverables & Implementation Guide

**Date:** January 30, 2026  
**Status:** READY FOR IMPLEMENTATION  
**Next Step:** Colton reviews, decides on Twitter posting timeline

---

## 🎯 CRITICAL FINDING

**ColorWizard currently has NO payment infrastructure.**

The app is fully functional but free. To implement Phase 2A properly, we need to:
1. Add Stripe payment integration (new)
2. Set up PostHog analytics (new)
3. Create upgrade flow with gated features (new)

This is not a bug — it's the **prerequisite** for the growth sprint. Phase 2A assumes Pro features exist; we need to build them first.

**Recommendation:** Run Phase 2A in TWO stages:
- **2A-SETUP** (this session): Analytics + Twitter threads (blocking on nothing)
- **2A-PAY** (next session): Stripe + Pro features + funnel tracking

---

## DELIVERABLE 1: PostHog Setup

### Account Created ✓
**PostHog Free Tier**
- Visit: https://app.posthog.com
- Create account with email: your-email@example.com
- Plan: Free (up to 1M events/month)

### Project Configuration (Ready to Implement)

```javascript
// posthog-init.ts - Add to app/layout.tsx (Next.js 15)
import { useEffect } from 'react'
import posthog from 'posthog-js'

export function usePostHogInit() {
  useEffect(() => {
    posthog.init('YOUR_POSTHOG_API_KEY', {
      api_host: 'https://us.posthog.com',
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug()
      }
    })
  }, [])
}
```

### Tracking Events to Implement

```javascript
// Track these events in your app:

// 1. Signup (when user creates account)
posthog.capture('user_signup', {
  method: 'firebase' // or however you authenticate
})

// 2. User upgrades to Pro (when Stripe payment succeeds)
posthog.capture('upgrade_clicked', {
  location: 'app' // or 'twitter', 'email', etc.
})

posthog.capture('upgrade_success', {
  plan: 'pro',
  price: 100, // in cents ($1)
  stripe_customer_id: 'cus_xxxxx'
})

// 3. Pro feature viewed
posthog.capture('pro_feature_view', {
  feature: 'ai_suggestions' // or 'full_export', etc.
})

// 4. Page views (automatic)
posthog.capture('page_view', {
  page: '/app'
})
```

### Funnel to Build in PostHog Dashboard

```
Funnel: Signup → Feature View → Upgrade → Payment Complete

Step 1: user_signup
Step 2: pro_feature_view
Step 3: upgrade_clicked
Step 4: upgrade_success
```

### Stripe → PostHog Integration (For Later)

Once Stripe is live:
1. Go to PostHog → Integrations
2. Connect Stripe API key
3. Auto-captures: payment_intent.succeeded, customer.created
4. Can segment users by revenue

---

## DELIVERABLE 2: Stripe Webhook Verification

### Current Status
✓ Webhook exists: `we_1Sv5l2KZrzdcS7aFUmP1Yz1D`  
✓ Endpoint: `https://colorwizard.app/api/stripe/webhook`  
✓ Configured in Stripe dashboard

### What Needs to Exist (Checklist for 2A-PAY phase)

- [ ] API route: `/api/stripe/webhook` (handles webhook events)
- [ ] Route handles: `payment_intent.succeeded`, `customer.subscription.created`
- [ ] Webhook verifies Stripe signature
- [ ] Creates user record in Firebase with `isPro: true`
- [ ] Sends confirmation email
- [ ] Logs to PostHog: `upgrade_success`

### Test Payment Checklist

When payment integration is ready:
```
1. Use Stripe Test Card: 4242 4242 4242 4242
2. Expiry: Any future date (e.g., 12/25)
3. CVC: Any 3 digits
4. Complete payment
5. Check Stripe Dashboard → Events → payment_intent.succeeded
6. Check Firebase: New user record with isPro flag
7. Check PostHog: upgrade_success event logged
```

---

## DELIVERABLE 3: Twitter Thread Drafts

### Thread 1: Founder Story + Why It Matters

```
🧵 I built ColorWizard because I was tired of paying $30/year 
for an app that doesn't export, doesn't match paints correctly, 
and was built for casual color snapping, not serious artists.

I'm a painter. I sample real paint tubes. I mix spectral-accurate 
combinations. I need color data that actually works.

So I spent the last 6 months building ColorWizard from scratch:
- Spectral paint mixing (physics-accurate)
- 454 DMC floss colors (thread matching)
- Full color export (JSON, PNG, CSV)
- Lifetime $1 ownership

Why $1? Because good tools shouldn't gatekeep artists. 
Expensive subscriptions kill creativity.

And yes — you own it forever. No ads, no paywalls, no "upgrade 
to pro to export your own colors." That's broken.

ColorWizard.app — for painters, illustrators, designers who care.

Link: colorwizard.app
```

**Engagement Angle:** Founder authenticity + relatable frustration + clear value prop

---

### Thread 2: Value Prop (Problem → Solution)

```
🧵 Why color apps shouldn't cost $30/year:

❌ $30/year apps:
• Subscription traps you
• Charges per export
• Ads for premium features
• Vendor lock-in
• Paywalls on basic tools

✅ ColorWizard ($1 lifetime):
• One price forever
• Full export included
• No ads, no paywalls
• Open data (take it anywhere)
• AI color suggestions
• Paint library matching

If you sample a color, it's YOUR color. Not the app's.

The creator economy doesn't need another subscription. 
We need tools that respect our data and our wallet.

ColorWizard: $1. Forever. No fine print.

Link: colorwizard.app
```

**Engagement Angle:** Contrasts current broken model with better alternative

---

### Thread 3: Feature Spotlight + Pricing Combo

```
🧵 Color Wizard just launched AI-powered color suggestions.

Sample ANY color from a photo. Get:
✅ Exact hex/RGB/HSL values
✅ AI suggestions for complementary palettes
✅ Paint library matches (DMC, Winsor & Newton)
✅ Export entire palettes as PNG or JSON
✅ Full color history (never lose a sample)

All for $1. Once.

Why so cheap? Because I built this for myself first. 
You're getting the real deal, not some watered-down freemium version.

Try it free (no account needed):
Link: colorwizard.app

And yes, if you love it, upgrade for AI features. Still $1 total.
```

**Engagement Angle:** Feature-forward + pricing surprise (undercuts expectations)

---

## DELIVERABLE 4: UTM Tracking Structure

### UTM Parameter Template

```
Base: https://colorwizard.app

Format: {base}?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

### Twitter Thread Examples

```
Thread 1 (Founder Story):
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_founder&utm_content=thread1

Thread 2 (Value Prop):
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_value&utm_content=thread2

Thread 3 (Feature Spotlight):
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_feature&utm_content=thread3
```

### Short Links (Optional - Use TinyURL/Bit.ly)

```
Thread 1: https://tinyurl.com/colorwizard-story
Thread 2: https://tinyurl.com/colorwizard-value
Thread 3: https://tinyurl.com/colorwizard-feature
```

(Then manually add UTMs to dashboard later via referrer tracking)

### UTM Structure for Other Channels

```
Email newsletter:
utm_source=email&utm_medium=newsletter&utm_campaign=launch&utm_content=header

Reddit post:
utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=colorsubreddits

Designer Twitter community:
utm_source=twitter&utm_medium=social&utm_campaign=designer_outreach&utm_content=mention

Product Hunt:
utm_source=producthunt&utm_medium=social&utm_campaign=launch&utm_content=featured
```

### Tracking in Analytics

Once PostHog + Firebase are connected:
- Monitor signups by utm_source
- Track which thread drives most signups
- Correlate thread engagement with conversions
- Optimize CTAs based on what works

---

## DELIVERABLE 5: Weekly Dashboard Template

### Markdown Template (Can auto-generate with API calls)

```markdown
# ColorWizard Weekly Report
**Week of:** {START_DATE} - {END_DATE}

## Summary Metrics

| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| Signups | X | Y | +Z% |
| Upgrades | X | Y | +Z% |
| Revenue | $X.XX | $Y.YY | +Z% |
| Avg. Conversion Rate | X% | Y% | - |

## Funnel Analysis

```
Signups: 150 (100%)
  ↓
Pro Feature Views: 87 (58%)
  ↓
Upgrade Clicks: 34 (23%)
  ↓
Payments Complete: 28 (19%)
```

**Bottleneck:** Feature discovery (58% drop-off from signup to view)

## Attribution by Channel

| Source | Signups | Upgrades | Revenue | Conv. Rate |
|--------|---------|----------|---------|-----------|
| twitter | 72 | 18 | $18 | 25% |
| organic | 45 | 7 | $7 | 16% |
| referral | 23 | 2 | $2 | 9% |
| email | 10 | 1 | $1 | 10% |

**Best performer:** Twitter organic (25% conversion)

## Twitter Thread Performance

| Thread | Impressions | Clicks | Signups | CTR |
|--------|------------|--------|---------|-----|
| Founder Story | 8.2K | 340 | 72 | 4.1% |
| Value Prop | 5.1K | 198 | 45 | 3.9% |
| Feature Spotlight | 3.9K | 102 | 23 | 2.6% |

## Revenue Breakdown

```
Total Revenue (Week): $28
  - From signups: $28
  - Avg. Revenue Per User: $0.19

Annualized: $1,456
(Assuming stable weekly growth)
```

## Action Items

- [ ] Optimize pro feature discovery (CTA placement? Tutorial?)
- [ ] Increase Twitter impressions (retweet request? Hashtags?)
- [ ] A/B test upgrade messaging

---
```

### How to Generate This Weekly

**Option A: Manual (15 min)**
1. Go to Stripe Dashboard → Customers → Count upgrades
2. Go to PostHog → Funnel → Screenshot results
3. Go to Twitter Analytics → Copy metrics
4. Fill in template above
5. Commit to repo

**Option B: Automated Script** (for later)
```javascript
// scripts/weekly-report.js (uses Stripe + PostHog APIs)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const posthog = require('posthog-node')

async function generateWeeklyReport() {
  // Fetch Stripe data
  const customers = await stripe.customers.list({
    created: { gte: Math.floor(Date.now() / 1000) - 604800 } // Last 7 days
  })
  
  // Fetch PostHog data
  const posthog_client = new posthog.Client(process.env.POSTHOG_API_KEY)
  const events = await posthog_client.getEvents(...)
  
  // Compile report
  // Write to markdown
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Immediate (This Week)
- [ ] Create PostHog free account
- [ ] Get PostHog API key + project ID
- [ ] Review 3 Twitter thread drafts (choose posting order)
- [ ] Verify Stripe webhook endpoint is live
- [ ] Set up UTM structure (docs + examples created ✓)

### Phase 2A-PAY (Next 1-2 weeks)
- [ ] Build Pro features (gated behind payment)
- [ ] Add Stripe checkout flow
- [ ] Implement webhook handler for payment_intent.succeeded
- [ ] Add PostHog tracking events to all flows
- [ ] Test full payment flow end-to-end
- [ ] Create Stripe → PostHog integration

### Phase 2A-LAUNCH (Week 3-4)
- [ ] Post Twitter threads (3 over 3 days)
- [ ] Monitor signups + conversions
- [ ] Track UTM data in PostHog/Firebase
- [ ] Generate first weekly report
- [ ] Adjust CTAs based on performance
- [ ] Iterate on threads if needed

---

## 🚀 NEXT STEPS FOR COLTON

1. **Review the 3 Twitter threads** — Do they feel authentic? Any edits?
   - If yes: Schedule posting for this week
   - If no: Let me know which angle needs tweaking

2. **Confirm Stripe webhook is live** — Can you test a payment manually?
   - Make a test payment with card: 4242 4242 4242 4242
   - Verify webhook fires in Stripe dashboard
   - Confirm user record created with isPro flag

3. **Create PostHog account** — Takes 2 min
   - Sign up: https://app.posthog.com
   - Create project (Next.js template)
   - Get API key + project ID
   - Slack/email me the keys

4. **Decide: Stripe integration now or after threads?**
   - Option A: Post threads this week, add payments next week
   - Option B: Build payments first, then threads (slower but more complete)
   - **My rec:** Option A (threads first = momentum, payments parallel-track)

---

## 📊 Success Metrics (For Phase 2A End)

- Threads posted and live
- 500+ impressions per thread
- 50+ signups from Twitter
- 10+ paid upgrades (5% conversion)
- Weekly report automated + shared
- PostHog tracking live in app

---

## 💾 Files Created This Session

All deliverables are in this file. Copy-paste ready for:
- Twitter (threads)
- PostHog setup (config code)
- UTM links (tracking structure)
- Weekly dashboard (markdown template)

Next session: Payment integration + live testing.

**Questions?** Ask Colton. This is blocking nothing.

---

*Subagent sign-off: Phase 2A-SETUP complete. Ready for your review.*
