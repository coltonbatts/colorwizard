# ColorWizard Phase 2A Launch Checklist

**Status:** Ready to Execute  
**Start Date:** Today (January 29, 2025)  
**Launch Date:** Tomorrow (January 30, 2025)  

---

## 📋 TODAY'S CHECKLIST (3-4 Hours)

### PHASE 0: ACCOUNT SETUP (30 minutes)

- [ ] **Stripe Account**
  - [ ] Create account at stripe.com
  - [ ] Verify email
  - [ ] Complete business info
  - [ ] Activate live mode
  - [ ] Get STRIPE_PUBLIC_KEY (pk_live_...)
  - [ ] Get STRIPE_SECRET_KEY (sk_live_...)
  - [ ] Save to `.env.local`

- [ ] **PostHog Account**
  - [ ] Go to posthog.com → Start free
  - [ ] Create account
  - [ ] Create "ColorWizard" project
  - [ ] Select "Next.js" template
  - [ ] Get NEXT_PUBLIC_POSTHOG_KEY (phc_...)
  - [ ] Get POSTHOG_API_KEY
  - [ ] Get POSTHOG_PROJECT_ID
  - [ ] Save to `.env.local`

- [ ] **Stripe Webhook Registration**
  - [ ] Stripe Dashboard → Developers → Webhooks
  - [ ] Add endpoint: `https://colorwizard.app/api/stripe/webhook`
  - [ ] Select events: payment_intent.succeeded, subscription.deleted, charge.refunded
  - [ ] Get STRIPE_WEBHOOK_SECRET (whsec_...)
  - [ ] Save to `.env.local`

---

### PHASE 1: CODE IMPLEMENTATION (90 minutes)

- [ ] **Clone/Navigate to Repo**
  - [ ] Open terminal
  - [ ] `cd /path/to/colorwizard`
  - [ ] Confirm you're on `main` branch

- [ ] **Install Dependencies**
  - [ ] `npm install stripe @stripe/react-js posthog-js next-stripe`
  - [ ] `npm install -D @types/stripe`
  - [ ] Wait for installation to complete

- [ ] **Create Stripe API Routes**
  - [ ] Create `/app/api/stripe/webhook/route.ts`
  - [ ] Copy code from `COLORWIZARD_STRIPE_SETUP.md` → "API Routes" section
  - [ ] Create `/app/api/stripe/checkout/route.ts`
  - [ ] Copy code from same section

- [ ] **Create Pro Upgrade Component**
  - [ ] Create `/components/ProUpgradeButton.tsx`
  - [ ] Copy code from `COLORWIZARD_STRIPE_SETUP.md`
  - [ ] Add to your main page (`app/page.tsx`) where users will see it

- [ ] **Create Analytics Hook**
  - [ ] Create `/hooks/useAnalytics.ts`
  - [ ] Copy code from `COLORWIZARD_POSTHOG_SETUP.md` → "Custom Hook" section

- [ ] **Update Root Layout**
  - [ ] Open `app/layout.tsx`
  - [ ] Add PostHog initialization code from `COLORWIZARD_POSTHOG_SETUP.md`
  - [ ] Save file

- [ ] **Add Event Tracking to Components**
  - [ ] Open `/components/ProUpgradeButton.tsx`
  - [ ] Add: `const analytics = useAnalytics();`
  - [ ] Add: `analytics.trackUpgradeClick('feature-gate');` on button click
  - [ ] Do the same for any other key components

- [ ] **Create Environment Variables File**
  - [ ] Create or update `.env.local` in project root with:
    ```
    STRIPE_PUBLIC_KEY=pk_live_[your_key]
    STRIPE_SECRET_KEY=sk_live_[your_key]
    STRIPE_WEBHOOK_SECRET=whsec_[your_secret]
    NEXT_PUBLIC_POSTHOG_KEY=phc_[your_key]
    POSTHOG_API_KEY=[your_api_key]
    POSTHOG_PROJECT_ID=[your_project_id]
    ```

---

### PHASE 2: LOCAL TESTING (30 minutes)

- [ ] **Build & Run Locally**
  - [ ] `npm run build` (check for TypeScript errors)
  - [ ] `npm run dev` (start dev server)
  - [ ] Wait for "ready - started server on 0.0.0.0:3000"

- [ ] **Test in Browser**
  - [ ] Open http://localhost:3000
  - [ ] App loads without errors ✓
  - [ ] Can sample colors (if that's on home page) ✓
  - [ ] See Pro upgrade button ✓
  - [ ] Open browser console (F12) → No errors in console ✓

- [ ] **Test PostHog**
  - [ ] Refresh page (hard refresh: Cmd+Shift+R)
  - [ ] Check browser console for PostHog logs
  - [ ] PostHog should initialize without errors ✓

---

### PHASE 3: VERCEL DEPLOYMENT (30 minutes)

- [ ] **Add Environment Variables to Vercel**
  - [ ] Go to Vercel Dashboard
  - [ ] Find "colorwizard" project
  - [ ] Click **Settings** → **Environment Variables**
  - [ ] Add each variable from `.env.local`:
    - STRIPE_PUBLIC_KEY
    - STRIPE_SECRET_KEY
    - STRIPE_WEBHOOK_SECRET
    - NEXT_PUBLIC_POSTHOG_KEY
    - POSTHOG_API_KEY
    - POSTHOG_PROJECT_ID
  - [ ] Save

- [ ] **Deploy to Production**
  - [ ] Commit changes to git:
    ```bash
    git add .
    git commit -m "Phase 2A: Add Stripe + PostHog analytics + Twitter tracking"
    git push origin main
    ```
  - [ ] Vercel auto-deploys (watch for ✓ checkmark)
  - [ ] Wait for deployment to complete (~2-3 min)

- [ ] **Verify Production Deployment**
  - [ ] Go to https://colorwizard.app
  - [ ] App loads ✓
  - [ ] Pro button visible ✓
  - [ ] No console errors ✓

- [ ] **Test Stripe Webhook (Production)**
  - [ ] Open Stripe Dashboard
  - [ ] Go to **Developers** → **Webhooks**
  - [ ] Find your endpoint (should show "live" status)
  - [ ] Click on it → Should see recent events
  - [ ] If no events yet, that's OK (they'll start coming when users convert)

---

### PHASE 4: VERIFICATION (15 minutes)

- [ ] **Stripe Checklist**
  - [ ] API keys are in Vercel environment variables ✓
  - [ ] Webhook endpoint registered and showing live mode ✓
  - [ ] Can see endpoint in Developers dashboard ✓

- [ ] **PostHog Checklist**
  - [ ] Project created and showing in PostHog dashboard ✓
  - [ ] API key is in Vercel ✓
  - [ ] Can see Events tab in PostHog ✓

- [ ] **Deployment Checklist**
  - [ ] Latest commit deployed to Vercel (green checkmark) ✓
  - [ ] Can access https://colorwizard.app ✓
  - [ ] App is responsive and functional ✓

- [ ] **Create .env.local.example (for git)**
  - [ ] Create `.env.local.example` with keys (values masked):
    ```
    STRIPE_PUBLIC_KEY=pk_live_[ask_colton]
    STRIPE_SECRET_KEY=sk_live_[ask_colton]
    STRIPE_WEBHOOK_SECRET=whsec_[ask_colton]
    NEXT_PUBLIC_POSTHOG_KEY=phc_[ask_colton]
    POSTHOG_API_KEY=[ask_colton]
    POSTHOG_PROJECT_ID=[ask_colton]
    ```
  - [ ] Commit to git (so others know what variables are needed)

---

## 📱 TOMORROW'S CHECKLIST (30 Minutes - Morning)

### PHASE 5: TWITTER THREAD LAUNCH

- [ ] **Prepare Content**
  - [ ] Open `COLORWIZARD_TWITTER_THREADS.md`
  - [ ] Copy Thread 1 (Founder Story) to text editor
  - [ ] Copy Thread 2 (Lifetime Value) to text editor
  - [ ] Copy Thread 3 (AI Feature) to text editor

- [ ] **Post Thread 1 (9:00 AM)**
  - [ ] Open Twitter (twitter.com)
  - [ ] Copy first tweet from Thread 1 → Paste into new post
  - [ ] Click **Post**
  - [ ] Copy second tweet → Click **Reply to your own post**
  - [ ] Paste second tweet → Click **Post**
  - [ ] Repeat for tweets 3, 4 (should have 4-tweet thread)
  - [ ] Last tweet ends with CTA: "colorwizard.app?utm_source=twitter&utm_medium=organic&utm_campaign=founder_story"

- [ ] **Post Thread 2 (Afternoon, ~2 PM)**
  - [ ] Wait at least 4 hours between threads
  - [ ] Repeat process for Thread 2 (5 tweets)
  - [ ] Make sure URL has: utm_campaign=lifetime_value

- [ ] **Post Thread 3 (Evening, ~6 PM)**
  - [ ] Repeat process for Thread 3 (6 tweets)
  - [ ] Make sure URL has: utm_campaign=ai_feature

- [ ] **Engage with Replies (All Day)**
  - [ ] Check Twitter every hour
  - [ ] Reply to **every comment** (questions, compliments, criticism)
  - [ ] If someone asks about features → Answer them
  - [ ] If someone says "I'll try it" → Thank them & ask for feedback
  - [ ] If someone finds a bug → Thank them & note for next sprint

---

## 📊 WEEK 1 MONITORING CHECKLIST

### Daily (Each Morning)

- [ ] **Check PostHog Dashboard**
  - [ ] Go to posthog.com → Events tab
  - [ ] Filter: Last 24 hours
  - [ ] Look for new `signup` events
  - [ ] Look for new `upgrade_click` events
  - [ ] Look for new `payment_complete` events
  - [ ] Note: How many from each campaign?

- [ ] **Check Stripe Dashboard**
  - [ ] Go to stripe.com → Payments
  - [ ] Look for new successful charges
  - [ ] Check amount (should be $100 for $1.00)
  - [ ] Note email of upgrader (for follow-up)

- [ ] **Check Twitter Analytics**
  - [ ] Go to Twitter Analytics
  - [ ] Check each thread:
    - [ ] Impressions (total reach)
    - [ ] Engagements (likes, replies, retweets)
    - [ ] Clicks (people clicking through to site)
  - [ ] Note best performing tweet (highest clicks)

- [ ] **Engage (5-10 min)**
  - [ ] Reply to new comments on threads
  - [ ] Thank anyone who shared/retweeted
  - [ ] Answer questions about ColorWizard

### Weekly (Monday Morning)

- [ ] **Generate Dashboard Report**
  - [ ] Run: `python colorwizard_dashboard_auto_pull.py --week 2025-02-10`
  - [ ] Opens auto-generated markdown report
  - [ ] Fill in "What Worked / What Flopped" sections
  - [ ] Add priorities for next week
  - [ ] Save report

- [ ] **Analyze Campaign Performance**
  - [ ] Which thread got most signups?
  - [ ] Which thread had best conversion rate?
  - [ ] Where did users drop off in funnel?
  - [ ] Document findings in report

- [ ] **Plan Next Week**
  - [ ] Identify winner (highest converting campaign)
  - [ ] Plan 2 more threads in that style
  - [ ] Plan expansion (Reddit? Newsletter? Product Hunt?)
  - [ ] Fix any funnel drop-off points

---

## 🎯 SUCCESS CRITERIA (End of Week 1)

✅ **Technical Success:**
- [ ] Stripe webhook receiving POST requests from Stripe
- [ ] Payment goes through end-to-end (test with $1.00)
- [ ] User marked as Pro in database after payment
- [ ] PostHog showing new events
- [ ] UTM parameters captured in events
- [ ] Revenue attributed to correct campaign

✅ **Growth Success:**
- [ ] Posted 3 Twitter threads
- [ ] Getting engagement (10+ replies per thread)
- [ ] At least 5-10 clicks per thread (UTM tracking)
- [ ] At least 3-5 signups this week
- [ ] At least 1 Pro upgrade
- [ ] Can see conversion by campaign in PostHog

✅ **Process Success:**
- [ ] Weekly dashboard report generated
- [ ] Can identify best performing campaign
- [ ] Can see funnel drop-off points
- [ ] Have plan for next week based on data

---

## 🚨 TROUBLESHOOTING (If Something Goes Wrong)

### Stripe Webhook Not Receiving Events
**Symptom:** Payment goes through, but no webhook event in Stripe dashboard  
**Fix:**
1. Check environment variables in Vercel (are they ALL there?)
2. Redeploy: Vercel → Deployments → Redeploy latest
3. Test with: `stripe trigger payment_intent.succeeded --api-key sk_test_...`
4. Check webhook logs in Stripe Dashboard (should see attempt)

### PostHog Not Showing Events
**Symptom:** No events appearing in PostHog dashboard  
**Fix:**
1. Hard refresh browser: Cmd+Shift+R
2. Check browser console: Should see PostHog logs (no errors?)
3. Check project ID in code: Does it match PostHog dashboard?
4. Check `.env` variables: Are they correct?

### Vercel Deployment Failed
**Symptom:** Red X on Vercel deployment  
**Fix:**
1. Check build logs (click on failed deployment)
2. Look for error message (usually TypeScript or missing package)
3. Fix locally: `npm run build`
4. Commit + push fix: `git push origin main`

### URL UTM Parameters Not Showing
**Symptom:** PostHog showing utm_source=undefined or empty  
**Fix:**
1. Check Twitter URLs: Do they have `?utm_source=twitter...`?
2. Check PostHog code: Is it capturing URL params?
3. Hard refresh browser after URL change
4. Check network tab: What URL is being sent to server?

---

## 📞 WHEN YOU GET STUCK

1. **Read the relevant guide:**
   - Stripe issues? → `COLORWIZARD_STRIPE_SETUP.md`
   - PostHog issues? → `COLORWIZARD_POSTHOG_SETUP.md`
   - Deployment issues? → `COLORWIZARD_DEPLOYMENT_GUIDE.md`
   - Twitter content? → `COLORWIZARD_TWITTER_THREADS.md`

2. **Check troubleshooting section** in that guide

3. **If still stuck:**
   - Check build logs (Vercel)
   - Check browser console (F12)
   - Check environment variables
   - Double-check code copy-paste

---

## ✅ FINAL CHECKLIST BEFORE LAUNCH

Today (Implementation):
- [ ] Stripe account created + API keys saved
- [ ] PostHog account created + API keys saved
- [ ] Environment variables in `.env.local` AND Vercel
- [ ] All code files copied from guides
- [ ] Local build succeeds (`npm run build`)
- [ ] Local server runs without errors (`npm run dev`)
- [ ] Deployed to Vercel (green checkmark)
- [ ] Production app loads at colorwizard.app
- [ ] Stripe webhook registered and showing

Tomorrow (Launch):
- [ ] Thread 1 posted (morning)
- [ ] Thread 2 posted (afternoon)
- [ ] Thread 3 posted (evening)
- [ ] Engaging with replies all day
- [ ] Monitoring PostHog + Stripe dashboards

---

## 🏁 YOU'RE READY

Print this checklist. Check off items as you complete them.

**Today's goal:** Implement everything, deploy to production  
**Tomorrow's goal:** Post threads, start getting signups  
**This week's goal:** Get first Pro conversions, verify everything works  

**Then:** Let the data guide your next moves.

---

**Execution Timeline:** 3.5 hours today + 30 min tomorrow = You're live  
**Revenue Timeline:** Could be today, likely this week  
**Learning Timeline:** Get smarter every day from data  

**Let's go! 🚀**
