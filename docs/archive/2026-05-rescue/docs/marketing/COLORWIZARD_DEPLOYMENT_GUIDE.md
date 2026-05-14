# ColorWizard Growth Sprint Phase 2A - DEPLOYMENT GUIDE

## OVERVIEW

This guide consolidates everything from Phase 2A and gives you a step-by-step deployment checklist to go from "no monetization" to "tracking revenue by campaign" by tomorrow morning.

**Timeline:** Today (setup) → Tomorrow (post threads + start tracking)

---

## PHASE 0: SETUP (TODAY - 2 HOURS)

### Step 1: Create Stripe Account (15 min)
If you don't have one already:

1. Go to **https://stripe.com**
2. Sign up → Enter business info
3. Activate live mode → Get live API keys
4. Save these to `.env.local`:
   ```
   STRIPE_PUBLIC_KEY=pk_live_[your_key]
   STRIPE_SECRET_KEY=sk_live_[your_key]
   ```

### Step 2: Register Webhook with Stripe (15 min)
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Click **Add endpoint** → Enter: `https://colorwizard.app/api/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `customer.subscription.deleted`
   - `charge.refunded`
4. Copy the **Signing Secret** → Add to `.env.local`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_[your_secret]
   ```

### Step 3: Create PostHog Account (30 min)
1. Go to **https://posthog.com** → Click **Start free**
2. Sign up → Create organization
3. Create new project: **"ColorWizard"** → Select **Next.js**
4. Copy:
   - Project ID
   - API Key
5. Add to `.env.local`:
   ```
   NEXT_PUBLIC_POSTHOG_KEY=phc_[your_key]
   POSTHOG_API_KEY=[your_api_key]
   POSTHOG_PROJECT_ID=[your_project_id]
   ```

### Step 4: Install Dependencies (15 min)
```bash
cd /path/to/colorwizard
npm install stripe @stripe/react-js posthog-js next-stripe
npm install -D @types/stripe
```

---

## PHASE 1: IMPLEMENT STRIPE INTEGRATION (TODAY - 1 HOUR)

### Copy Stripe Code Files

Use the templates in `COLORWIZARD_STRIPE_SETUP.md`:

1. **Create** `/app/api/stripe/webhook/route.ts` → Copy code from setup guide
2. **Create** `/app/api/stripe/checkout/route.ts` → Copy code from setup guide
3. **Create** `/components/ProUpgradeButton.tsx` → Copy code from setup guide

### Verify Implementation

```bash
npm run build  # Check for TypeScript errors
npm run dev    # Start dev server
```

Visit http://localhost:3000 → You should see the app load without errors.

---

## PHASE 2: IMPLEMENT POSTHOG TRACKING (TODAY - 30 MIN)

### Copy PostHog Code Files

Use templates from `COLORWIZARD_POSTHOG_SETUP.md`:

1. **Update** `/app/layout.tsx` → Add PostHog initialization
2. **Create** `/hooks/useAnalytics.ts` → Copy analytics hook
3. **Integrate** into components that need tracking:
   - `components/ProUpgradeButton.tsx` → Track upgrade clicks
   - `components/ImageCanvas.tsx` → Track color sampling
   - Etc.

### Test PostHog Integration

1. Start dev server: `npm run dev`
2. Open browser console → Look for PostHog logs
3. Go to PostHog dashboard → **Events** tab
4. You should see `page_view` events coming in
5. If yes: ✅ Integration working!

---

## PHASE 3: DEPLOY TO PRODUCTION (TODAY - 30 MIN)

### Push to GitHub

```bash
cd /path/to/colorwizard
git add .
git commit -m "Phase 2A: Add Stripe integration + PostHog analytics + Twitter tracking"
git push origin main
```

### Vercel Auto-Deploy

1. Go to **Vercel Dashboard**
2. Find "colorwizard" project
3. Check **Deployments** → Should see your commit deploying
4. Wait for ✅ (usually 2-3 minutes)
5. Visit **https://colorwizard.app** → Verify it loads

### Verify Production Setup

1. Check that environment variables are in Vercel:
   - Go to Vercel Project → **Settings** → **Environment Variables**
   - Add all `.env.local` keys there
2. Redeploy: **Vercel Dashboard** → Click **Redeploy** on latest commit
3. Wait for ✅

### Test Stripe Webhook (Production)

```bash
# Use Stripe CLI to test webhook delivery
stripe trigger payment_intent.succeeded --api-key $STRIPE_SECRET_KEY
```

Check Stripe Dashboard → **Developers** → **Webhooks** → See the event logged.

---

## PHASE 4: TWITTER THREADS (TOMORROW MORNING - 30 MIN)

### Prepare Threads

Use templates from `COLORWIZARD_TWITTER_THREADS.md`:

1. Copy **Thread 1** (Founder Story) into text editor
2. Copy **Thread 2** (Lifetime Value)
3. Copy **Thread 3** (AI Feature)

### Post to Twitter

For each thread:

1. **Tweet 1:** Paste first tweet → Click **Post**
2. **Tweet 2:** Click **Reply to your own post** → Paste second tweet → Click **Post**
3. Repeat for all tweets in thread
4. **Last tweet:** End with "What's your favorite color tool? 👇" (encourage replies)

### Use UTM Tracking

Make sure each thread uses the correct URL (from `COLORWIZARD_UTM_TRACKING.md`):

- Thread 1: `colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=founder_story`
- Thread 2: `colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=lifetime_value`
- Thread 3: `colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=ai_feature`

### Engage with Replies

For the next 24 hours:
- Reply to **every comment** (questions, compliments, criticism)
- If someone asks a question about the app → Answer it
- If someone points out a bug → Thank them, fix it
- If someone loves it → Ask them to retweet

---

## PHASE 5: DAILY MONITORING (TOMORROW + ONGOING)

### Check PostHog Dashboard

**Every morning:**

1. Go to **PostHog** → **Events**
2. Filter: Last 24 hours
3. Look for:
   - New `signup` events (from Twitter?)
   - New `upgrade_click` events
   - New `payment_complete` events

### Check Stripe Dashboard

**Every morning:**

1. Go to **Stripe** → **Payments**
2. Look for new successful charges
3. Check metadata for `utm_source` (is it capturing correctly?)

### Check Twitter Analytics

**Every morning:**

1. Go to **Twitter Analytics** → Your account
2. Check each thread:
   - Impressions (reach)
   - Engagements (likes + replies + retweets)
   - Clicks

### Create Weekly Report

**Every Monday:**

1. Run the dashboard auto-pull script:
   ```bash
   python colorwizard_dashboard_auto_pull.py --week 2025-02-10
   ```
2. Open the generated report
3. Fill in "What Worked / What Flopped" sections
4. Note priorities for next week
5. Save to `memory/` folder

---

## TROUBLESHOOTING

### Problem: Stripe Webhook Not Receiving Events

**Symptoms:** Payments go through, but users aren't marked as Pro.

**Fix:**
1. Check environment variables in Vercel (are they set?)
2. Check Stripe webhook endpoint logs → See if events arriving
3. Check app logs → See if POST is being received
4. If missing: Re-add environment variables → Redeploy

### Problem: PostHog Events Not Showing

**Symptoms:** No events in PostHog dashboard.

**Fix:**
1. Check browser console → See if PostHog errors?
2. Check PostHog project ID is correct (in `.env`)
3. Hard refresh browser (Cmd+Shift+R)
4. Check that `app/layout.tsx` has PostHog initialization

### Problem: URLs Not Capturing UTM Params

**Symptoms:** UTM params are empty in PostHog.

**Fix:**
1. Verify URL is structured correctly: `?utm_source=twitter&utm_medium=organic&utm_campaign=founder_story`
2. Check that PostHog is initialized in root layout
3. Check that `useAnalytics()` hook is being called

### Problem: "Stripe keys not found"

**Symptoms:** Build fails with "STRIPE_SECRET_KEY not found".

**Fix:**
1. Create `.env.local` file in project root
2. Add all Stripe keys
3. For Vercel: Also add to Vercel project settings
4. Run `npm run build` locally to verify

---

## SUCCESS CHECKLIST

After deployment, verify:

- [ ] **Stripe**: Webhook endpoint registered + receiving events
- [ ] **Stripe**: Test payment goes through + user record created
- [ ] **Stripe**: Environment variables in Vercel
- [ ] **PostHog**: Events showing up in dashboard
- [ ] **PostHog**: Can see signups, upgrades, payments by campaign
- [ ] **Twitter**: Posted 3 threads with correct UTM URLs
- [ ] **Twitter**: Getting impressions + engagement
- [ ] **UTM Tracking**: Signups showing with correct `utm_source`
- [ ] **Production**: Everything working at colorwizard.app

---

## NEXT WEEK ACTIONS

Once the above is deployed:

1. **Week 1 Focus:** Get first 10 Pro conversions (test payment + tracking works)
2. **Week 2 Focus:** Optimize threads based on engagement data
3. **Week 3 Focus:** Expand to Reddit, Product Hunt, or email newsletter
4. **Week 4 Focus:** Analyze trends, plan next growth lever

---

## KEY FILES SUMMARY

| File | Purpose | When to Use |
|------|---------|-----------|
| `COLORWIZARD_STRIPE_SETUP.md` | Stripe integration guide | When implementing payments |
| `COLORWIZARD_POSTHOG_SETUP.md` | PostHog analytics guide | When setting up tracking |
| `COLORWIZARD_TWITTER_THREADS.md` | Twitter content | When posting threads |
| `COLORWIZARD_UTM_TRACKING.md` | URL structures | When creating links |
| `COLORWIZARD_WEEKLY_DASHBOARD_TEMPLATE.md` | Report template | Every Monday |
| `colorwizard_dashboard_auto_pull.py` | Auto-pull metrics | Every Monday |

---

## FINAL NOTES

### You Don't Need to Be Perfect
- Typos in threads are fine (people are forgiving)
- First few signups might break things (that's OK, iterate)
- Conversion rate will be low at first (expected)

### Focus on Learning
- What message resonates with your audience?
- Which thread gets most engagement?
- Where do users drop off in the funnel?
- Let the data guide next week's decisions

### Don't Over-Optimize Too Early
- Post threads, watch engagement
- Don't rewrite them mid-week
- Let each run for full week
- Then iterate based on data

---

## QUESTIONS?

Refer back to the specific guide:
- **Stripe issues?** → `COLORWIZARD_STRIPE_SETUP.md`
- **Analytics questions?** → `COLORWIZARD_POSTHOG_SETUP.md`
- **Twitter content?** → `COLORWIZARD_TWITTER_THREADS.md`
- **URL tracking?** → `COLORWIZARD_UTM_TRACKING.md`
- **Weekly reporting?** → `COLORWIZARD_WEEKLY_DASHBOARD_TEMPLATE.md`

---

## DEPLOYMENT TIMELINE CHECKLIST

**TODAY (Sunday if starting on Monday):**
- [ ] Create Stripe account + save keys
- [ ] Register webhook endpoint
- [ ] Create PostHog account + save keys
- [ ] Install npm dependencies
- [ ] Implement Stripe routes
- [ ] Implement PostHog tracking
- [ ] Push to GitHub
- [ ] Verify Vercel deployment
- [ ] Test webhook in production

**TOMORROW (Monday):**
- [ ] Post Twitter Thread 1 (morning)
- [ ] Post Twitter Thread 2 (afternoon)
- [ ] Post Twitter Thread 3 (evening)
- [ ] Engage with replies (all day)
- [ ] Monitor PostHog + Stripe dashboards
- [ ] Document any issues

**THIS WEEK:**
- [ ] Get first 3-5 signups
- [ ] Get first Pro upgrade
- [ ] Verify UTM tracking works
- [ ] Analyze which thread performed best
- [ ] Plan next week based on data

You're ready. Let's go! 🚀
