# ColorWizard UTM Tracking & Weekly Analytics Guide
## Attribution by Channel + Automated Reporting

---

## PART 1: UTM Parameter Structure

### UTM Format (Standard)

```
https://colorwizard.app?utm_source=SOURCE&utm_medium=MEDIUM&utm_campaign=CAMPAIGN&utm_content=CONTENT
```

**What each means:**
- `utm_source` — Where traffic comes from (twitter, email, reddit, etc.)
- `utm_medium` — How they got there (social, newsletter, organic)
- `utm_campaign` — Which campaign/launch (launch_founder, feature_spotlight, etc.)
- `utm_content` — Which specific content (thread1, email_header, mention, etc.)

---

## PART 2: Pre-Built UTM Links for Twitter Threads

### Thread 1: Founder Story

```
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_founder&utm_content=thread1
```

Short version (if using bit.ly):
```
https://bit.ly/colorwizard-founder
```

**Then add UTM to bit.ly link:**
```
https://bit.ly/colorwizard-founder?utm_source=twitter&utm_medium=social&utm_campaign=launch_founder&utm_content=thread1
```

---

### Thread 2: Value Prop

```
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_value&utm_content=thread2
```

Short version:
```
https://bit.ly/colorwizard-value
```

---

### Thread 3: Feature Spotlight

```
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=launch_feature&utm_content=thread3
```

Short version:
```
https://bit.ly/colorwizard-feature
```

---

## PART 3: Additional Channel UTMs

### Email Newsletter

```
https://colorwizard.app?utm_source=email&utm_medium=newsletter&utm_campaign=launch&utm_content=header_link
https://colorwizard.app?utm_source=email&utm_medium=newsletter&utm_campaign=launch&utm_content=cta_button
https://colorwizard.app?utm_source=email&utm_medium=newsletter&utm_campaign=launch&utm_content=signature_link
```

### Reddit Posts

```
https://colorwizard.app?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=r_indiehackers
https://colorwizard.app?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=r_colortheory
https://colorwizard.app?utm_source=reddit&utm_medium=social&utm_campaign=launch&utm_content=r_designtools
```

### LinkedIn

```
https://colorwizard.app?utm_source=linkedin&utm_medium=social&utm_campaign=launch&utm_content=post
https://colorwizard.app?utm_source=linkedin&utm_medium=social&utm_campaign=launch&utm_content=article
```

### Direct Messages / Personal Mentions

```
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=outreach&utm_content=dm
https://colorwizard.app?utm_source=twitter&utm_medium=social&utm_campaign=outreach&utm_content=mention
```

### Product Hunt

```
https://colorwizard.app?utm_source=producthunt&utm_medium=social&utm_campaign=launch&utm_content=featured
```

### Designer Communities / Slack

```
https://colorwizard.app?utm_source=slack&utm_medium=social&utm_campaign=designer_outreach&utm_content=announce
```

### Organic / Direct

```
https://colorwizard.app
(No UTM params — this is your baseline)
```

---

## PART 4: Tracking Implementation

### Firebase Tracking

When user signs up, capture the referral source:

File: `lib/firebase.ts`

```typescript
import { getURLParameter } from '@/lib/utils'

export async function createUserWithTracking(userId: string, email: string) {
  // Capture UTM parameters
  const utmParams = {
    source: getURLParameter('utm_source') || 'direct',
    medium: getURLParameter('utm_medium') || 'organic',
    campaign: getURLParameter('utm_campaign') || 'direct',
    content: getURLParameter('utm_content') || 'unknown',
    referrer: document.referrer || 'direct'
  }

  // Save to Firestore
  await setDoc(doc(db, 'users', userId), {
    email,
    createdAt: new Date(),
    signupSource: utmParams.source,
    signupMedium: utmParams.medium,
    signupCampaign: utmParams.campaign,
    signupContent: utmParams.content,
    referrer: utmParams.referrer
  })

  // Also track in PostHog
  posthog.capture('user_signup', {
    ...utmParams,
    email
  })
}
```

Helper function: `lib/utils.ts`

```typescript
export function getURLParameter(name: string): string | null {
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get(name)
}
```

---

## PART 5: Weekly Analytics Dashboard

### Template: Copy-Paste Ready

```markdown
# ColorWizard Weekly Report
**Week of:** Jan 29 - Feb 4, 2026

---

## 📊 Summary Metrics

| Metric | This Week | Last Week | Δ | % Change |
|--------|-----------|-----------|---|----------|
| Total Signups | 127 | — | +127 | — |
| Upgrades to Pro | 24 | — | +24 | — |
| Revenue (USD) | $24.00 | — | +$24 | — |
| Avg Conversion Rate | 18.9% | — | — | — |
| Avg Revenue Per User | $0.19 | — | — | — |

---

## 🔗 Signups by Channel (UTM Attribution)

| Channel | Signups | % of Total | Upgrades | Conversion | Revenue |
|---------|---------|-----------|----------|-----------|---------|
| twitter | 81 | 63.8% | 18 | 22.2% | $18.00 |
| organic | 28 | 22.0% | 4 | 14.3% | $4.00 |
| direct | 12 | 9.4% | 2 | 16.7% | $2.00 |
| email | 4 | 3.1% | 0 | 0% | $0.00 |
| reddit | 2 | 1.6% | 0 | 0% | $0.00 |

**Best performer:** Twitter (22.2% upgrade rate) — 2.4x better than average

---

## 🧵 Twitter Thread Performance

| Thread | Date Posted | Impressions | Clicks | CTR | Signups | Upgrades |
|--------|-------------|------------|--------|-----|---------|----------|
| Founder Story | Jan 29 | 8,240 | 340 | 4.1% | 81 | 18 |
| Value Prop | Jan 31 | 5,120 | 198 | 3.9% | 52 | 10 |
| Feature Spotlight | Feb 2 | 3,890 | 102 | 2.6% | 34 | 7 |

**Insights:**
- Founder story is strongest (4.1% CTR, highest signups)
- CTR declining (saturation? Audience fatigue?)
- Each thread converts ~22% to paid

---

## 📈 Funnel Analysis (PostHog)

```
Step 1: Signup
  Users: 127 (100%)

Step 2: Pro Feature View
  Users: 89 (70%)
  → 37 users dropped at signup

Step 3: Upgrade Click
  Users: 45 (35%)
  → 44 users saw features but didn't click

Step 4: Payment Completed
  Users: 24 (19%)
  → 21 users clicked but didn't complete payment
```

**Biggest bottleneck:** Feature view → Upgrade click (55% drop-off)  
**Reason:** Users may not understand why they need to upgrade  
**Action:** Add benefit callout on pro features

---

## 💰 Revenue Breakdown

```
Total Revenue: $24.00

By Thread:
- Thread 1 (Founder): $18.00 (75%)
- Thread 2 (Value): $4.00 (17%)
- Thread 3 (Feature): $2.00 (8%)

Average Revenue Per User: $0.19
Annualized (if stable): $9,880

By Channel:
- Twitter: $18.00 (75%)
- Organic: $4.00 (17%)
- Direct: $2.00 (8%)
```

---

## 🎯 Action Items (Next Week)

- [ ] **Feature Discovery:** Add tutorial overlay on first login showing pro features
- [ ] **Upgrade Copy:** Test new CTA button text ("Try Pro" vs "Get Pro Features")
- [ ] **Email:** None from email yet — send announcement to waitlist
- [ ] **Twitter:** Thread 1 is winning — consider follow-up or similar angle
- [ ] **Retention:** Check how many paid users are still active (not churning)

---

## 📋 Upcoming Priorities

1. **Email Outreach (This Week):** Announce to existing beta testers
2. **Reddit Boost (Next Week):** Post to r/indiehackers + design communities
3. **Product Hunt (Week 3):** Prep formal launch
4. **Case Studies (Week 4):** Interview early users (if any)

---

## 🔮 Forecast (If Trend Continues)

```
Week 1: 127 signups, 24 upgrades, $24 revenue
Week 2 (est): 200 signups, 38 upgrades, $38 revenue (conservative 1.5x growth)
Week 4 (est): 500+ signups, 95+ upgrades, $95+ revenue

If Twitter continues performing:
- Month 1: 800-1000 signups
- Month 1: 150-190 upgrades
- Month 1: $150-190 revenue

(Assumes no viral spike, steady organic growth)
```

---
```

### How to Generate This Weekly

**Manual (15 min):**
1. PostHog Dashboard → Funnel → Screenshot
2. Stripe Dashboard → Customers → Filter by date → Count
3. Firebase → Query users by signupSource + createdAt
4. Twitter Analytics → View each thread
5. Fill in template above
6. Commit to repo

**Automated Script (Coming next phase):**

```typescript
// scripts/generate-weekly-report.ts
import * as fs from 'fs'
import { initializeApp } from 'firebase/app'
import { getFirestore, query, where, getDocs, collection } from 'firebase/firestore'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const db = getFirestore()

async function generateWeeklyReport() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Get Firebase signups
  const q = query(
    collection(db, 'users'),
    where('createdAt', '>=', weekAgo)
  )
  const snapshot = await getDocs(q)
  const signups = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id
  }))

  // Group by channel
  const byChannel = signups.reduce((acc: any, user: any) => {
    const source = user.signupSource || 'direct'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})

  // Get Stripe revenue
  const customers = await stripe.customers.list({
    created: { gte: Math.floor(weekAgo.getTime() / 1000) }
  })
  
  const upgrades = customers.data.length
  const revenue = upgrades * 100 // $1 = 100 cents

  // Generate markdown
  const report = `# ColorWizard Weekly Report
**Week of:** ${weekAgo.toLocaleDateString()} - ${now.toLocaleDateString()}

## Summary
- Signups: ${signups.length}
- Upgrades: ${upgrades}
- Revenue: $${(revenue / 100).toFixed(2)}

## By Channel
${Object.entries(byChannel).map(([ch, count]) => `- ${ch}: ${count}`).join('\n')}
`

  fs.writeFileSync(`reports/weekly-${now.toISOString().split('T')[0]}.md`, report)
  console.log('Report generated:', report)
}

generateWeeklyReport()
```

Run weekly:
```bash
npx ts-node scripts/generate-weekly-report.ts
```

---

## PART 6: Dashboards to Monitor

### PostHog
- **URL:** https://us.posthog.com/projects/YOUR_PROJECT_ID
- **Check:** Funnel drop-offs, event counts, user cohorts
- **Frequency:** Daily (5 min)

### Stripe
- **URL:** https://dashboard.stripe.com/test/dashboard
- **Check:** Revenue, customers, payment success rate
- **Frequency:** Daily (5 min)

### Firebase Console
- **URL:** https://console.firebase.google.com/project/YOUR_PROJECT
- **Check:** User signups, `signupSource` field
- **Frequency:** Weekly (15 min)

### Twitter Analytics
- **URL:** https://twitter.com/your-handle/analytics
- **Check:** Impressions, engagement, click-through rate
- **Frequency:** Weekly (10 min)

---

## PART 7: What to Track

### Daily Checklist (5 min)
- [ ] Stripe revenue (any new customers?)
- [ ] PostHog funnel (drop-offs changing?)
- [ ] Twitter metrics (engagement on threads?)

### Weekly Checklist (30 min)
- [ ] Generate weekly report (use template above)
- [ ] Compare to previous week (trends up? down?)
- [ ] Identify biggest bottleneck (where do users drop?)
- [ ] Plan next week's actions (based on data)

### Monthly Checklist (1 hour)
- [ ] Cohort analysis (compare early users to recent)
- [ ] Retention rate (how many paid users still active?)
- [ ] CAC (Customer Acquisition Cost): Revenue / Marketing Spend
- [ ] LTV (Lifetime Value): Avg revenue per user × expected lifetime
- [ ] Decide on next channel/experiment to test

---

## PART 8: Attribution Rules

When multiple UTMs present, use this priority:
1. **Most recent click wins** (not first-click)
   - User sees Twitter, doesn't click
   - User searches Google "colorwizard" (organic)
   - User signs up via organic
   - Attribution: google (last-click) not twitter

2. **Direct = No UTM parameter**
   - User types colorwizard.app directly
   - User has no referrer
   - Attribution: direct

3. **Dark traffic = Referrer present but no UTM**
   - User clicks link in app or Discord without UTM
   - You see referrer but no utm_source
   - Attribution: referral (from app or chat platform)

---

## PART 9: Quick Links Reference

```
Production Dashboard:
- PostHog: https://us.posthog.com
- Stripe: https://dashboard.stripe.com
- Firebase: https://console.firebase.google.com
- Twitter: https://twitter.com/analytics

Reports Folder:
- Weekly reports: /reports/
- Latest: /reports/weekly-2026-02-04.md
```

---

*All UTM links, templates, and tracking code ready to use. Update weekly and watch your growth.*
