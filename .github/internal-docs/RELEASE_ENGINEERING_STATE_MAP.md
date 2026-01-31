# ColorWizard Studio Pro - Release Engineering State Map

## Overview
ColorWizard is a Next.js app with Stripe $1 lifetime purchase integration. Target: clean public release with hardened entitlements, premium UX, and automated quality gates.

## Core Architecture

### Monetization Model
- **Single Tier**: $1 one-time lifetime purchase (no subscriptions)
- **Payment Method**: Stripe Checkout (one-time payment, not subscription)
- **Entitlement**: Pro-tier flag in Firestore (`tier: 'pro_lifetime'`)
- **Idempotency**: Tracked via `stripe.lastCheckoutSessionId` in user doc

---

## Critical Files & Responsibilities

### API Routes
| File | Purpose | Status |
|------|---------|--------|
| `app/api/stripe/create-checkout/route.ts` | Creates Stripe Checkout session for $1 purchase | ✅ Implemented |
| `app/api/stripe/webhook/route.ts` | Handles `checkout.session.completed` event, unlocks `pro_lifetime` | ✅ Implemented |
| `app/api/user/tier/route.ts` | Returns current user's tier (`free` or `pro_lifetime`) | ✅ Implemented, needs enhancement |

### Database Layer
| File | Purpose | Status |
|------|---------|--------|
| `lib/db/userTier.ts` | Core tier management: `createUserDoc`, `getUserTier`, `unlockProLifetime` | ✅ Implemented, idempotent |

### Feature Gating
| File | Purpose | Status |
|------|---------|--------|
| `lib/featureFlags.ts` | Pro-only features: `aiPaletteSuggestions`, `teamCollaboration`, `advancedPresets` | ✅ Implemented |
| `lib/hooks/useUserTier.ts` | React hook: fetches tier, refetch support, no flickering logic | ⚠️ Needs caching/no-flicker guarantee |

### UI Components
| File | Purpose | Status |
|------|---------|--------|
| `components/PricingModal.tsx` | Tier comparison, $1 upgrade button, success states | ✅ Implemented |
| `components/UpgradePrompt.tsx` | Non-intrusive pro-feature upgrade prompt | ✅ Implemented |
| `app/pricing/page.tsx` | Standalone pricing page (full-screen modal) | ✅ Implemented |
| `app/dashboard/dashboard-content.tsx` | Post-purchase success page, tier display, refetch logic | ⚠️ Needs polish |

### Configuration
| File | Purpose | Status |
|------|---------|--------|
| `lib/stripe-config.ts` | Price IDs, amount, display settings | ✅ Implemented |
| `.env.local.example` | Expected env vars (secrets not checked in) | ✅ Present |

---

## Known Issues & Gaps

### 🟡 UX Polish
1. **Post-purchase badge/indicator**: Dashboard shows tier, but no visual "pro" badge on home screen or nav
2. **Restore Purchase action**: No way for user to manually re-sync entitlement if webhook missed
3. **Free tier exhaustion**: No messaging when free features are maxed out (if any limits exist)
4. **Mobile responsiveness**: Pricing modal may not be fully optimized for small screens
5. **Loading states**: Checkout button doesn't have clear loading feedback

### 🟡 Reliability
1. **No "entitlement status" debug endpoint**: Hard to troubleshoot if user tier is stale
2. **No tier cache**: Every page load calls `/api/user/tier` (minor perf issue, but adds latency)
3. **No flickering guard**: If auth state changes during render, tier could briefly show as "free"
4. **Webhook idempotency**: Relies on session ID, but no safeguard if Stripe retries and session ID changes
5. **Subscription legacy code**: Old `upgradeToPro`, `updateSubscriptionStatus`, `cancelSubscription` functions still present (dead code)

### 🟡 Logging & Errors
1. **No structured dev logs**: Hard to debug checkout flow in production
2. **No user-friendly errors**: Failed checkout creation shows raw error message
3. **Webhook errors**: Generic "webhook handler failed" gives no context to Stripe

### 🟡 Tests & Verification
1. **No automated tests**: No test asserting `free` users can't access pro features
2. **No gating test**: No verification that pro-lifetime users always see pro features
3. **No build/typecheck CI**: Unclear if code passes linting and type checks before release
4. **No smoke test plan**: No documented steps for manual pre-release verification

### 🟡 Cleanup
1. **Dead subscription code**: Functions like `upgradeToPro`, `updateSubscriptionStatus`, `cancelSubscription` in `userTier.ts` are never called
2. **Deprecated fields**: `subscriptionId`, `subscriptionStatus`, `nextBillingDate`, etc. cluttering user doc

---

## Feature Gating Logic

### Free Features (No Gating)
- Unlimited palette generation
- All export formats (JSON, CSV, CSS, SVG)
- Figma/Adobe/Framer export
- Color analysis tools
- Oil paint color mixing
- DMC floss matching
- Custom calibration

### Pro-Only Features (Gated)
- `aiPaletteSuggestions`: AI color harmony suggestions
- `teamCollaboration`: Real-time team sharing (not yet implemented)
- `advancedPresets`: Curated color workflows

**Gating Function**: `hasAccessToProFeature(featureName, tier)` in `featureFlags.ts`

---

## Stripe Webhook Idempotency

### Current Implementation
1. User pays → Stripe fires `checkout.session.completed` event
2. Webhook handler calls `unlockProLifetime(userId, { checkoutSessionId, stripeCustomerId })`
3. `unlockProLifetime` checks if `stripe.lastCheckoutSessionId === checkoutSessionId`
4. If match → skip (already processed); if mismatch or new → update to `pro_lifetime`
5. **Assumption**: Stripe always sends the same `session.id` on retries ✅ (true)

---

## Entry Points to Release

### Primary User Flows
1. **Unauthenticated** → Sign up → Free tier
2. **Free user** → Tries pro feature → `UpgradePrompt` modal → `/pricing` → Stripe checkout → Success page → `pro_lifetime`
3. **Pro user** → Sees pro features available → Can continue using app
4. **Webhook miss** → Manual "Restore Purchase" (not yet implemented) → Re-syncs entitlement

---

## Release Readiness Checklist (To Do)

- [ ] UX Polish: Pro badge on home screen
- [ ] UX Polish: Restore Purchase action
- [ ] UX Polish: Mobile-responsive pricing modal
- [ ] Reliability: Add entitlement status endpoint
- [ ] Reliability: No-flicker tier cache + SSR consideration
- [ ] Reliability: Error messages user-friendly
- [ ] Logging: Structured logs (dev only) for checkout flow
- [ ] Tests: Automated test asserting tier gating works
- [ ] Tests: Build, typecheck, lint pass clean
- [ ] Cleanup: Remove dead subscription functions
- [ ] Cleanup: Remove deprecated fields from user doc
- [ ] Docs: Release checklist with preflight, smoke tests, rollback
- [ ] Docs: Entitlement status endpoint documented

---

## Environment Variables Required

```
STRIPE_SECRET_KEY                        # Server-only
NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID    # Public (Stripe price ID for $1 product)
NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID  # Public (Stripe product ID)
NEXT_PUBLIC_APP_URL                     # Public (for redirect URLs in checkout)
STRIPE_WEBHOOK_SECRET                   # Server-only
# Firebase + Auth credentials (not detailed here)
```

---

## Next Steps (From Release Engineer)

1. **Scan complete**. Files mapped, flow understood.
2. **Spawn subagents** for parallel work:
   - Frontend Design: UI punch list + component-level polish
   - QA/Testing: Test plan + gating test
   - Docs/Release: Checklist, smoke tests, rollback plan
   - Cleanup/Audit: Identify dead code + unsafe deletions
3. **Execute phased plan** in 4 phases:
   - Phase 1: UX Polish
   - Phase 2: Reliability + Restore Purchase
   - Phase 3: Logging + Error Handling + Tests
   - Phase 4: Docs + Cleanup
4. **Verify**: Build, typecheck, lint, manual smoke test after each phase.
5. **Ship**: Git commits by phase, then merge to main.

---

**Generated**: 2025-01-29
**Status**: Ready for subagent handoff
