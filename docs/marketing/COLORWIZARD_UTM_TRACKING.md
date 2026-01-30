# ColorWizard UTM Tracking Structure

## CORE URL STRUCTURE

**Base URL:** `https://colorwizard.app`

**Full URL with UTM:** 
```
https://colorwizard.app?utm_source={source}&utm_medium={medium}&utm_campaign={campaign}&utm_content={content}
```

---

## UTM PARAMETERS GUIDE

| Parameter | What It Is | When to Use | Example |
|-----------|-----------|-----------|---------|
| `utm_source` | Where the traffic comes from | Always | twitter, reddit, organic, direct, newsletter |
| `utm_medium` | How they found you | Always | organic, paid, email, social, referral |
| `utm_campaign` | Which campaign/message | Always | founder_story, ai_feature, lifetime_value, launch |
| `utm_content` | Which specific content (optional) | When you have multiple versions | thread_v1, thread_v2, tweet_1_vs_tweet_2 |

---

## PRESET CAMPAIGNS (Copy & Paste Ready)

### TWITTER

**Thread 1: Founder Story**
```
https://colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=founder_story
```

**Thread 2: Lifetime Value Prop**
```
https://colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=lifetime_value
```

**Thread 3: AI Feature Spotlight**
```
https://colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=ai_feature
```

**Thread 4: Social Proof**
```
https://colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=social_proof
```

**Replies/Quote Tweets**
```
https://colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=engagement
```

---

### REDDIT

**Founder Post (r/startups)**
```
https://colorwizard.app?utm_source=reddit&utm_medium=organic&utm_campaign=founder_story&utm_content=r_startups
```

**Product Hunt Launch**
```
https://colorwizard.app?utm_source=producthunt&utm_medium=organic&utm_campaign=launch
```

**Art/Design Communities**
```
https://colorwizard.app?utm_source=reddit&utm_medium=organic&utm_campaign=product_launch&utm_content=r_design
```

---

### NEWSLETTER

**Own Newsletter**
```
https://colorwizard.app?utm_source=newsletter&utm_medium=email&utm_campaign=launch
```

**Guest Post in Other Newsletter**
```
https://colorwizard.app?utm_source=newsletter&utm_medium=email&utm_campaign=guest_post&utm_content=newsletter_name
```

---

### BLOG / CONTENT

**Blog Post: "Why Color Tools Are Too Expensive"**
```
https://colorwizard.app?utm_source=blog&utm_medium=organic&utm_campaign=color_pricing_rant
```

**Blog Post: "How to Mix Colors Like an Oil Painter"**
```
https://colorwizard.app?utm_source=blog&utm_medium=organic&utm_campaign=paint_mixing_guide
```

---

### DIRECT / WORD OF MOUTH

**If you don't have a specific source, use direct**
```
https://colorwizard.app?utm_source=direct&utm_medium=direct&utm_campaign=launch
```

---

### PAID ADS (if doing them later)

**Google Ads**
```
https://colorwizard.app?utm_source=google&utm_medium=cpc&utm_campaign=color_tools
```

**Facebook/Instagram Ads**
```
https://colorwizard.app?utm_source=facebook&utm_medium=paid&utm_campaign=founder_story
```

---

## TRACKING IN POSTHOG

These UTM parameters are automatically captured by PostHog if configured correctly.

### How to Check

1. Go to **PostHog Dashboard**
2. Click **Product Analytics** → **Events**
3. Filter by event type: `$pageview`
4. Look at properties:
   - `utm_source`
   - `utm_medium`
   - `utm_campaign`
   - `utm_content`

### Create Insights by Campaign

1. **New Insight** → **Trend**
2. Filter: `utm_campaign = "founder_story"`
3. Measure: Count of users
4. Group by: `utm_source`

This shows: How many signups came from the founder story thread, broken down by if they came from Twitter, Reddit, etc.

---

## TRACKING IN STRIPE

When a user upgrades, capture the UTM data and store it with their order.

### Updated Stripe Webhook Handler

In `/app/api/stripe/webhook/route.ts`:

```typescript
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  // ... existing webhook code ...

  case 'payment_intent.succeeded': {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Extract UTM from customer metadata or session
    const utm_source = paymentIntent.metadata?.utm_source || 'direct';
    const utm_campaign = paymentIntent.metadata?.utm_campaign || 'unknown';
    const utm_medium = paymentIntent.metadata?.utm_medium || 'direct';
    
    // Store in database
    await db.collection('payments').add({
      stripe_payment_intent_id: paymentIntent.id,
      amount_cents: paymentIntent.amount,
      email: paymentIntent.customer_email,
      utm_source,
      utm_campaign,
      utm_medium,
      created_at: new Date(),
    });
    
    // Log to PostHog
    posthog.capture({
      distinctId: paymentIntent.customer_email,
      event: 'payment_complete',
      properties: {
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: paymentIntent.amount,
        utm_source,
        utm_campaign,
        utm_medium,
      },
    });
    
    break;
  }
```

### Capture UTM at Signup

When a user first arrives, capture their UTM params:

In `hooks/useAnalytics.ts`:

```typescript
'use client';

import { useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';

export function useAnalytics() {
  const posthog = usePostHog();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Extract UTM from URL
      const url = new URL(window.location);
      const utm_source = url.searchParams.get('utm_source') || 'direct';
      const utm_medium = url.searchParams.get('utm_medium') || 'direct';
      const utm_campaign = url.searchParams.get('utm_campaign') || 'direct';
      const utm_content = url.searchParams.get('utm_content') || null;

      // Store in user properties
      posthog?.setPersonProperties({
        utm_source,
        utm_medium,
        utm_campaign,
        ...(utm_content && { utm_content }),
      });

      // Log signup event with UTM
      posthog?.capture('signup', {
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
      });
    }
  }, [posthog]);

  return {
    // ... other methods ...
  };
}
```

---

## REPORTING: WHICH CAMPAIGN DRIVES REVENUE?

### Query: Revenue by Campaign

In PostHog, create an **Insight**:

**Setup:**
- Event: `payment_complete`
- Count: `amount_cents` (sum)
- Group by: `utm_campaign`
- Time period: Last 30 days

**Result:**
```
Campaign: founder_story       → Revenue: $50 (50 signups, 1 conversion)
Campaign: ai_feature          → Revenue: $32 (32 signups, 1 conversion)
Campaign: lifetime_value      → Revenue: $18 (18 signups, 1 conversion)
Campaign: direct              → Revenue: $0 (0 signups, 0 conversions)
```

This tells you:
- **founder_story** is your best performer (most revenue)
- **ai_feature** has good conversion rate (high signups, 1 sale)
- **direct** traffic doesn't convert (maybe bots?)

**Action:** Spend more time on founder story angle next week.

---

## DASHBOARD: CAMPAIGN PERFORMANCE

Create a dashboard in PostHog:

### Panel 1: Signups by Campaign (Last 7 Days)
```
Metric: Count of users with utm_campaign
Group by: utm_campaign
Chart: Bar chart
```

### Panel 2: Revenue by Campaign (Last 7 Days)
```
Metric: Sum of amount_cents where event = "payment_complete"
Group by: utm_campaign
Chart: Bar chart
```

### Panel 3: Conversion Rate by Campaign (Last 30 Days)
```
Metric: Signups → Payment Complete conversion %
Filter: Group by utm_campaign
```

### Panel 4: Average Revenue per Signup by Campaign
```
Metric: Sum of amount / Count of signups
Group by: utm_campaign
Shows: Which campaigns attract highest-value users
```

---

## SHORT LINKS (Optional)

If URLs get too long, use short links. Create these at bit.ly:

| Full URL | Short URL | Campaign |
|----------|-----------|----------|
| `colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=founder_story` | `bit.ly/cw-founder` | Twitter Thread 1 |
| `colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=ai_feature` | `bit.ly/cw-ai` | Twitter Thread 3 |
| `colorwizard.app?utm_source=reddit&utm_medium=organic&utm_campaign=launch` | `bit.ly/cw-reddit` | Reddit |
| `colorwizard.app?utm_source=newsletter&utm_medium=email&utm_campaign=launch` | `bit.ly/cw-launch` | Newsletter |

**Advantage:** Short links fit better in tweets (140 chars left for text)
**Disadvantage:** You lose the UTM data if using bit.ly's shortened version

**Solution:** Use bit.ly but configure it to preserve UTM params:
1. Create link with full URL: `colorwizard.app?utm_source=twitter...`
2. Shorten it at bit.ly
3. When shared, bit.ly redirects to full URL with UTM intact

---

## WEEKLY CHECKLIST

Every week (Monday morning):

- [ ] Check top 3 campaigns in PostHog (signups + revenue)
- [ ] Write down which campaign is winning
- [ ] Note any surprises (did a thread do better/worse than expected?)
- [ ] Decide: double down on winning angles? Or test new ones?
- [ ] Check for UTM tracking bugs (missing data?)

---

## COMMON MISTAKES TO AVOID

❌ **Don't use** `utm_campaign=social` for all social links
- Be specific: `founder_story`, `ai_feature`, `lifetime_value`
- Specificity = Better insights

❌ **Don't forget** utm_source if it's not obvious
- Even if posting on Twitter, include `utm_source=twitter`
- Makes cross-platform analysis easier

❌ **Don't use** CAPS in UTM params
- Use `founder_story` not `Founder_Story`
- PostHog groups them separately = messy data

❌ **Don't update** UTM structure mid-campaign
- If you start with `utm_campaign=founder_story`, keep it
- Changing it splits your data

---

## GLOSSARY

**utm_source:** The platform (twitter, reddit, newsletter, blog)  
**utm_medium:** The type of interaction (organic, paid, email, referral)  
**utm_campaign:** The specific message/thread (founder_story, ai_feature)  
**utm_content:** Optional: which version of a campaign (A/B testing)  

---

## NEXT STEPS

1. **Copy the Twitter URLs** (above) into your tweets
2. **Set up PostHog** dashboard to watch campaign performance
3. **Post threads** with UTM links
4. **Check PostHog daily** to see which campaigns drive signups
5. **Optimize:** Write more threads like the winners
