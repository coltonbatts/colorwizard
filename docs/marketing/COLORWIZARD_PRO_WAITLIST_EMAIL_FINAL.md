# ColorWizard Pro Waitlist Email

## Subject Line Options (test both)

**Option A:** ColorWizard Pro: Early Access (Batch Extraction + Cloud Sync)
**Option B:** Free forever. Pro optional. Here's what's coming.
**Option C:** You've sampled 50+ colors. Want batch extraction?

*Recommended: Option B* (establishes philosophy)

---

## Email Copy

### Version 1: Short & Direct (For Active Users)

---

**Subject:** ColorWizard Pro: Early Access Coming

Hi [First Name],

You've been sampling colors with ColorWizard. We're building Pro tier and want you in first.

**ColorWizard Pro ($8/month):**
- Batch palette extraction (upload image → get 5 colors in seconds)
- Cloud palette sync (access your palettes anywhere)
- Custom paint library (build your own palettes)
- Procreate plugin (sample colors directly in Procreate)

**Free tier stays free forever.** Core features—color sampling, recipes, exports—never get paywalled.

Pro is optional. It's for artists who want advanced features and want to support the work.

**[Get Early Access →](link to waitlist)**

No pressure. No spam. Just shipping what painters asked for.

—Colton

P.S. Tweet me your color stories: [@thecoltonbatts](https://twitter.com/thecoltonbatts)

---

### Version 2: Story-Driven (For Newsletter)

---

**Subject:** Free forever. Pro optional. Here's what's coming.

Hey there,

Six months ago I shipped ColorWizard because I was tired of hunting for paint recipes online.

It was free. No email required. Fast. Open source.

People used it. Painters, illustrators, game devs sampling colors for reference. It worked.

Now they're asking for more:
- "Can I extract palettes from full images?"
- "Can I access my palettes from my iPad?"
- "Does it work in Procreate?"

So we're building Pro tier.

**ColorWizard Pro ($8/month):**
- Batch extraction: upload image → 5 colors in seconds
- Cloud sync: palette access anywhere
- Custom libraries: build your own
- Procreate integration: sample directly in app

**But the core tool stays free forever.**

No paywalls for color sampling. No subscription trap. That's the deal.

If you've been using ColorWizard and want to support the work + get advanced features, Pro is for you.

If you just need to sample colors and get recipes, free forever.

**[Join the Pro waitlist →](link to waitlist)**

We're launching in February. Early access starts this week.

—Colton Batts
Founder, ColorWizard
[@thecoltonbatts](https://twitter.com/thecoltonbatts)

P.S. Interested in AI tools for creatives? I'm working on 2-3 more tools this year. Same philosophy: free core, optional Pro, radical transparency. Follow along.

---

### Version 3: Technical Founder Tone (For Dev Community)

---

**Subject:** ColorWizard Pro: Scaling Beyond Free Tier

Hi Builder,

ColorWizard hit 1000+ monthly active users. Mostly painters and illustrators. Some game devs.

Free tier is working. No BS. Core features stay free. No paywall for good stuff.

Now we're building Pro tier ($8/mo) because:
1. Users asked for batch extraction (20+ color palettes from one image)
2. iPad users need cloud sync
3. Procreate users want direct integration
4. We want to build more tools, which requires revenue

**Pro features:**
- Batch palette extraction
- Cloud sync + offline support
- Custom paint libraries
- Procreate plugin (beta)

**Free tier unchanged.**

**Architecture:** Feature flags. One codebase. Pro features flip on with `useUserTier()` hook. No bloat.

Revenue model: $8/month covers infrastructure + dev time. Goal: 100 paying users by Q2 2026. That funds 2-3 new tools.

**[Early access waitlist →](link to waitlist)**

We're shipping transparent. Showing metrics. Building in public.

Same philosophy as the original: measure, communicate, iterate.

—Colton
[@thecoltonbatts](https://twitter.com/thecoltonbatts)

P.S. Open sourcing the freemium architecture. Want to build tools with this model? Happy to share the pattern.

---

## Implementation Notes

**When to send:**
- Option 1: To active users (sampled 10+ colors in last 30 days)
- Option 2: To newsletter subscribers (1-2 weeks before launch)
- Option 3: To dev community (Hacker News, Indie Hackers, Twitter threads)

**CTA Link:** Point to landing page with:
- Pro tier details
- Feature comparison (Free vs Pro)
- Pricing + FAQ
- Early access form

**Timing:** Send 2 weeks before Pro launch to allow feedback + iterations

**Follow-up emails:**
1. "Pro launches Feb 15 — 50% off first month for early access members"
2. "Pro is live. Here's what changed (hint: core tool is the same)"
3. "One week in: 47 users signed up. Here's the data." (transparency)

---

## Email Details for CMS

**From:** Colton Batts <colton@colorwizard.app>
**Reply-to:** colton@colorwizard.app
**Segments:**
- Active users (10+ samples in 30d)
- Newsletter subscribers
- Beta testers
- GitHub stargazers

**A/B Test:** Option A vs Option B subject lines

**Send time:** Tuesday 10am CT (peak engagement)

---

## Conversion Tracking

Add to landing page (after waitlist form):
```javascript
// Track waitlist signup
gtag('event', 'colorwizard_pro_waitlist', {
  user_tier: 'free',
  entry_point: 'email'
});
```

Monitor:
- Waitlist conversion rate (target: 15% of email opens)
- User segment performance (free vs beta users)
- Feature interest (which features got clicked most?)

---

## Post-Waitlist Sequence

**Day 0:** Confirmation email + exclusive perks document
**Day 3:** "What features matter most?" survey
**Day 7:** Product update (sneak peek of Pro UI)
**Day 14:** Early access launch email
**Day 1 (Pro launch):** "You're in. First month 50% off."
**Week 2:** Transparency report (X users, X revenue, here's what's next)

---

## Why This Works

✅ **Transparent:** Free tier stays free, Pro is option, business model is honest
✅ **User-driven:** Building what painters asked for
✅ **Philosophy-led:** Every email reinforces values (privacy, ownership, transparency)
✅ **CTA-clear:** One action per email (join waitlist)
✅ **Builder energy:** Technical + honest, not salesy
✅ **Founder voice:** Personal, direct, like Colton talking to users

This isn't "buy more stuff." It's "here's what people asked for, here's how we're building it sustainably."

That's how you get credible founder energy.
