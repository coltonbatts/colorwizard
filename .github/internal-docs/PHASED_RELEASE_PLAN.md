# ColorWizard Studio Pro - Phased Release Plan

## Overview
This is the main release engineering plan for hardening, polishing, and shipping ColorWizard Pro. The plan is organized into 4 phased milestones, each with clear deliverables, verification steps, and git checkpoints.

**Status**: Phase 1 ✅ COMPLETE (2025-01-30)

---

## Phase 1: UX Polish & Visual Consistency ✅ COMPLETE

### Goals
- Ensure premium, confident first impression
- Mobile-responsive across all breakpoints (375px, 768px, 1440px)
- Clear visual feedback for all interactions
- Add "Pro" badge visibility on home & nav
- Restore Purchase action for entitlement recovery

### Deliverables

#### 1.1 Pro Badge Enhancement (AppHeader)
- **File**: `components/AppHeader.tsx` (line 26-28)
- **Current**: Shows "✨ Pro" only when `tier === 'pro'`
- **Change**: Show badge for both `pro` and `pro_lifetime` tiers
- **Rationale**: Users need visual confirmation they've unlocked Pro
- **Effort**: 1-line logic change

#### 1.2 Pro Badge on Home Page
- **File**: `app/page.tsx` (to be added to root layout or home section)
- **Current**: No badge visible on main app view
- **Change**: Add persistent Pro badge in top-right (or nav area) when user is Pro
- **Rationale**: User should see their Pro status everywhere, not just header
- **Effort**: 5-10 lines JSX

#### 1.3 Restore Purchase Button
- **File**: `components/UpgradePrompt.tsx` and `components/PricingModal.tsx`
- **Current**: Only shows "Upgrade" button
- **Change**: Add secondary "Restore Purchase" button that re-fetches entitlement from server
- **Rationale**: If webhook missed, user can manually sync their tier
- **Effort**: New button + one API call

#### 1.4 Mobile Responsiveness - Pricing Modal
- **File**: `components/PricingModal.tsx` (line 74 onwards, grid layout)
- **Current**: Uses `md:grid-cols-2` (good), but padding/text may overflow on small screens
- **Change**: 
  - Add `max-w-lg md:max-w-4xl` for responsive max-width
  - Ensure padding scales: `px-4 sm:px-8` instead of fixed `px-8`
  - Stack feature lists vertically on mobile
  - Reduce font sizes for headers on small screens
- **Rationale**: 375px phones should show content without horizontal scroll
- **Effort**: ~5-10 Tailwind class adjustments

#### 1.5 Mobile Responsiveness - UpgradePrompt
- **File**: `components/UpgradePrompt.tsx` (line 55, modal sizing)
- **Current**: `max-w-md` may be too wide for 375px phone
- **Change**: Add responsive width `w-[90vw] sm:w-full max-w-md`
- **Rationale**: Ensure modal fits comfortably on small screens
- **Effort**: 1 Tailwind class change

#### 1.6 Mobile Responsiveness - Dashboard
- **File**: `app/dashboard/dashboard-content.tsx` (padding/spacing)
- **Current**: Uses `p-8` (32px padding) fixed
- **Change**: `p-4 sm:p-8` for responsive padding
- **Rationale**: Mobile users don't have 32px gutters
- **Effort**: ~3-4 Tailwind adjustments

#### 1.7 Loading State Feedback - Checkout Button
- **File**: `components/PricingModal.tsx` (line 41-50, handleUpgrade + button rendering)
- **Current**: Shows "Processing..." text but no visual spinner
- **Change**: Add small inline spinner (CSS or SVG) while `isUpgrading`
- **Rationale**: Users need confidence the click was registered
- **Effort**: ~5 lines JSX + minimal CSS

#### 1.8 Success State - Dashboard Message
- **File**: `app/dashboard/dashboard-content.tsx` (line 35-48, success message)
- **Current**: Green message is good, but "Return to App" button unclear
- **Change**: Clarify to "Back to Color Mixer" or "Continue" + add confetti animation (optional)
- **Rationale**: User knows exactly where they're going
- **Effort**: 1-2 line copy change + optional animation

#### 1.9 Error State - PricingModal
- **File**: `components/PricingModal.tsx` (line 44-50, catch block)
- **Current**: Shows `alert()` - jarring and unprofessional
- **Change**: Replace with inline error toast or error message div (non-blocking)
- **Rationale**: Premium apps don't use browser alerts
- **Effort**: ~10-15 lines to add toast state + render

#### 1.10 Copy Refinement - Pricing Headers
- **File**: `components/PricingModal.tsx` & `components/UpgradePrompt.tsx`
- **Current**: Copy is clear but could be more conversational
- **Change**: Test messaging like "One-time, forever" instead of "One-time lifetime purchase"
- **Rationale**: Subtle copy improvements build confidence
- **Effort**: ~5 line changes

### Verification Checklist
- [ ] Pro badge shows for `pro_lifetime` users in AppHeader
- [ ] Pro badge visible on home/dashboard
- [ ] Pricing modal responsive at 375px (no horizontal scroll)
- [ ] UpgradePrompt responsive at 375px
- [ ] Checkout button shows spinner while loading
- [ ] Error message appears as toast (not alert) if checkout fails
- [ ] "Restore Purchase" button appears in pricing/upgrade modals
- [ ] Dashboard success message clear and actionable
- [ ] All copy reads professionally

### Git Checkpoint
```bash
git commit -m "Phase 1: UX Polish - responsive modals, badges, loading states, error handling"
```

---

## Phase 2: Reliability & Entitlement Sync (High Priority)

### Goals
- Ensure users never see stale tier data after upgrade
- Add manual entitlement recovery (Restore Purchase)
- Implement tier caching to reduce API calls
- Add debug endpoint for troubleshooting

### Deliverables

#### 2.1 Restore Purchase API Handler
- **File**: New file `app/api/user/tier/restore/route.ts`
- **Purpose**: Manual entitlement re-sync endpoint (GET request only, safe for browser)
- **Logic**:
  - Get userId from auth
  - Fetch current user doc from Firestore
  - Return `{ tier, proUnlockedAt, lastCheckoutSessionId }`
  - **No mutations** - just returns status
- **Rationale**: User can click "Restore" to manually re-check their tier
- **Effort**: ~20 lines

#### 2.2 Restore Purchase Button Implementation
- **File**: `components/PricingModal.tsx` & `components/UpgradePrompt.tsx`
- **Logic**:
  - Add "Restore Purchase?" button (secondary action)
  - On click: call `/api/user/tier/restore`
  - If `tier === 'pro_lifetime'`, show success toast + refetch user tier
  - If still `free`, show message "No purchase found. Please upgrade."
- **Rationale**: Gives user agency if webhook was missed
- **Effort**: ~25 lines JSX + state

#### 2.3 Tier Caching in useUserTier Hook
- **File**: `lib/hooks/useUserTier.ts`
- **Current**: Calls `/api/user/tier` on every component mount
- **Change**:
  - Add in-memory cache with TTL (5 minute cache)
  - Return cached tier if fresh, else fetch
  - Add `isStale` boolean to hook return
- **Rationale**: Reduce API calls, faster page loads
- **Effort**: ~20 lines (simple cache object)

#### 2.4 No-Flicker Guard for Tier
- **File**: `lib/hooks/useUserTier.ts`
- **Current**: If user logs out/in, tier briefly shows as "free"
- **Change**:
  - Keep previous tier value while fetching new one
  - Only update when new fetch completes
  - Set `loading: true` flag separately
- **Rationale**: Seamless UX, no jank during auth transitions
- **Effort**: ~10 lines refactor

#### 2.5 Entitlement Status Debug Endpoint
- **File**: New file `app/api/user/entitlement-status/route.ts`
- **Purpose**: Internal debug endpoint (dev mode only, returns JSON)
- **Response**:
  ```json
  {
    "userId": "user123",
    "tier": "pro_lifetime",
    "proUnlockedAt": "2025-01-29T18:00:00Z",
    "lastCheckoutSessionId": "cs_test_abc123",
    "stripeCustomerId": "cus_test_def456"
  }
  ```
- **Security**: Add check that user is authenticated + admin/dev flag (optional)
- **Rationale**: Helps troubleshoot entitlement issues
- **Effort**: ~15 lines

#### 2.6 Webhook Idempotency Reinforcement
- **File**: `app/api/stripe/webhook/route.ts`
- **Review**: Confirm idempotency check is solid
- **Change**: Add logging of session ID check to help debug
- **Rationale**: Ensure webhook doesn't double-process
- **Effort**: ~3 lines logging

#### 2.7 Handle Webhook Retries
- **File**: `lib/db/userTier.ts` (unlockProLifetime function)
- **Review**: Current logic checks session ID. Ensure handles Stripe retries correctly.
- **Change**: If same session ID comes in twice, silently return `false` (idempotent)
- **Rationale**: Stripe may retry webhook 3+ times
- **Effort**: No change needed (already correct)

### Verification Checklist
- [ ] `/api/user/tier/restore` endpoint returns current tier
- [ ] "Restore Purchase" button works and re-fetches tier
- [ ] Tier cache active and reduces API calls
- [ ] No tier "flicker" on auth state change
- [ ] `/api/user/entitlement-status` debug endpoint works
- [ ] Webhook retries handled gracefully
- [ ] Test: Free user → upgrade → page reload → shows Pro immediately

### Git Checkpoint
```bash
git commit -m "Phase 2: Reliability - restore purchase, tier caching, no-flicker guard, debug endpoints"
```

---

## Phase 3: Logging, Error Handling, & Tests

### Goals
- Add structured logging for troubleshooting
- Improve user-facing error messages
- Implement automated tier gating tests
- Ensure build, typecheck, lint pass clean

### Deliverables

#### 3.1 Structured Dev Logs - Checkout Flow
- **File**: `app/api/stripe/create-checkout/route.ts`
- **Change**: Add structured logging (only in dev mode):
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Stripe Checkout] User: ${userId}, Price: $${STRIPE_PRICES.lifetime.displayAmount}`)
  }
  ```
- **Rationale**: Debug checkout issues without verbose logging in prod
- **Effort**: ~5 lines

#### 3.2 Structured Dev Logs - Webhook
- **File**: `app/api/stripe/webhook/route.ts`
- **Change**: Add logs for session processing:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Webhook] Session: ${session.id}, User: ${userId}, Status: processing`)
  }
  ```
- **Rationale**: Track webhook execution
- **Effort**: ~5 lines

#### 3.3 User-Friendly Error Messages
- **File**: `components/PricingModal.tsx` (handleUpgrade catch block)
- **Current**: `alert('Failed to start upgrade. Please try again.')`
- **Change**: 
  - Catch specific error types
  - Show: "Checkout failed to load. Check your internet and try again."
  - Or: "Stripe is temporarily unavailable. Please try again in a moment."
- **Rationale**: Users understand what went wrong
- **Effort**: ~15 lines

#### 3.4 Webhook Error Messages
- **File**: `app/api/stripe/webhook/route.ts`
- **Current**: `{ error: 'Webhook handler failed' }` (no context)
- **Change**: Log actual error, return meaningful status code
- **Rationale**: Stripe dashboard will show better error details
- **Effort**: ~5 lines

#### 3.5 Test: Feature Gating - Free User
- **File**: New file `lib/__tests__/featureFlags.test.ts`
- **Purpose**: Verify free users can't access pro features
- **Test cases**:
  - `hasAccessToProFeature('aiPaletteSuggestions', 'free')` returns `false`
  - `hasAccessToProFeature('aiPaletteSuggestions', 'pro_lifetime')` returns `true`
  - `hasAccessToProFeature('standardFilter', 'free')` returns `true` (free feature)
- **Framework**: vitest (already in tsconfig)
- **Effort**: ~30 lines

#### 3.6 Test: User Tier Hook
- **File**: New file `lib/hooks/__tests__/useUserTier.test.ts`
- **Purpose**: Verify useUserTier hook fetches and caches correctly
- **Test cases**:
  - Hook initializes with `tier: 'free'`
  - After fetch, `tier` updates to response value
  - Refetch works correctly
  - Error handling doesn't crash component
- **Framework**: vitest + React Testing Library (if available)
- **Effort**: ~40 lines

#### 3.7 Build Verification
- **File**: N/A (command-line verification)
- **Change**: Run and pass:
  ```bash
  npm run build
  npm run typecheck
  npm run lint
  ```
- **Rationale**: Catch TypeScript and linting issues before release
- **Effort**: 0 (already in CI setup)

### Verification Checklist
- [ ] Dev logs appear in browser console during checkout
- [ ] Webhook logs appear in server logs
- [ ] Error messages are user-friendly (not raw errors)
- [ ] Feature gating test passes: `npm test lib/featureFlags`
- [ ] useUserTier hook test passes
- [ ] `npm run build` passes with no errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No console errors in browser DevTools

### Git Checkpoint
```bash
git commit -m "Phase 3: Logging, error handling, and automated tests"
```

---

## Phase 4: Cleanup, Docs, & Release

### Goals
- Remove dead subscription code (safe deletions)
- Create comprehensive release documentation
- Prepare rollback plan
- Finalize and ship

### Deliverables

#### 4.1 Remove Dead Subscription Functions
- **File**: `lib/db/userTier.ts`
- **Functions to Delete**:
  - `upgradeToPro()` (lines ~70-85) - never called, subscription model only
  - `updateSubscriptionStatus()` (lines ~90-115) - never called
  - `cancelSubscription()` (lines ~120-130) - never called
- **Confidence**: HIGH (no callers found in codebase)
- **Effort**: Remove ~50 lines

#### 4.2 Remove Deprecated Fields from User Doc
- **File**: `lib/db/userTier.ts` (UserTierDoc interface)
- **Fields to Remove**:
  - `subscriptionId?` (line ~15)
  - `priceId?` (line ~14)
  - `subscriptionStatus?` (line ~16)
  - `nextBillingDate?` (line ~21)
  - `currentPeriodEnd?` (line ~22)
  - `currentPeriodStart?` (line ~23)
  - `canceledAt?` (line ~19)
- **Rationale**: Reduce Firestore doc size, simplify schema
- **Confidence**: HIGH (only used in deleted functions)
- **Effort**: Remove ~7 lines from interface

#### 4.3 Remove Deprecated Exports from stripe-config
- **File**: `lib/stripe-config.ts`
- **Exports to Remove**:
  - `ANNUAL_DISCOUNT_PERCENT` (line ~26)
  - `ANNUAL_MONTHLY_EQUIVALENT` (line ~27)
- **Rationale**: Only used in old subscription pricing UI
- **Confidence**: HIGH
- **Effort**: Remove 2 lines

#### 4.4 Create RELEASE_CHECKLIST.md
- **File**: `/docs/RELEASE_CHECKLIST.md`
- **Content** (provided by Docs/Release subagent):
  - Pre-flight checks (env vars, Stripe webhook config, Firestore rules)
  - Build verification steps
  - Smoke test procedures
  - Post-deployment verification
  - Go/no-go decision criteria
- **Effort**: ~100 lines (reference document)

#### 4.5 Create ROLLBACK_PLAN.md
- **File**: `/docs/ROLLBACK_PLAN.md`
- **Content** (provided by Docs/Release subagent):
  - Disable checkout button (env var or flag)
  - Revert tier changes (Firebase CLI one-liner)
  - Webhook retry strategy
  - Timeline: first 5 min, 30 min, 1 hour
- **Effort**: ~50 lines

#### 4.6 Create OPERATIONAL_NOTES.md
- **File**: `/docs/OPERATIONAL_NOTES.md`
- **Content** (provided by Docs/Release subagent):
  - How to check user tier in Firestore
  - Manually trigger webhook
  - Debugging checklist
  - Links to Stripe Dashboard + logs
- **Effort**: ~60 lines

#### 4.7 Final Type Check & Build
- **Commands**:
  ```bash
  npm run typecheck  # Must pass
  npm run lint       # Must pass
  npm run build      # Must pass
  npm test           # All tests pass
  ```
- **Rationale**: Catch any lingering issues
- **Effort**: 0 (automated)

### Verification Checklist
- [ ] Dead functions removed, no errors
- [ ] Deprecated fields removed from UserTierDoc
- [ ] Deprecated exports removed from stripe-config
- [ ] `/docs/RELEASE_CHECKLIST.md` written and complete
- [ ] `/docs/ROLLBACK_PLAN.md` written and complete
- [ ] `/docs/OPERATIONAL_NOTES.md` written and complete
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] All tests pass
- [ ] README.md updated with new features (Pro badge, Restore Purchase)

### Git Checkpoint
```bash
git commit -m "Phase 4: Cleanup, documentation, and release preparation"
```

---

## Final Release Checklist

Before merging to main and deploying:

- [ ] All 4 phases complete
- [ ] All verification checklists passed
- [ ] Manual smoke test on staging:
  - [ ] Sign up as free user
  - [ ] Visit pricing page
  - [ ] Click "Upgrade for $1"
  - [ ] Go through Stripe checkout (test mode)
  - [ ] Receive success page
  - [ ] See "Pro" badge on home screen
  - [ ] Click "Restore Purchase" to verify re-sync
- [ ] No breaking changes to existing users
- [ ] Stripe webhook configured in production
- [ ] Firestore security rules verified
- [ ] Environment variables set correctly
- [ ] Monitoring + logging tools active (Sentry, LogRocket, etc.)
- [ ] Git history clean, commits well-organized
- [ ] Merge to main branch
- [ ] Deploy to production

---

## Timeline Estimate

- **Phase 1 (UX Polish)**: ~2-3 hours
- **Phase 2 (Reliability)**: ~2-3 hours
- **Phase 3 (Logging & Tests)**: ~1-2 hours
- **Phase 4 (Cleanup & Docs)**: ~1-2 hours

**Total**: ~6-10 hours (with parallelization via subagents, can be reduced to 4-6 hours)

---

## Subagent Coordination

- **Frontend Design Subagent**: Provides detailed UI punch list for Phase 1
- **QA / Testing Subagent**: Provides test cases + framework recommendation for Phase 3
- **Docs / Release Subagent**: Provides release checklist + rollback plan + operational notes for Phase 4
- **Cleanup / Audit Subagent**: Provides dead code audit for Phase 4

All deliverables are integrated into this main plan.

---

## Notes

- **No new features**: This is polish and hardening only.
- **No subscriptions**: $1 lifetime only.
- **No secrets in code**: All env vars handled correctly.
- **Mobile-first**: All UX changes tested at 375px, 768px, 1440px.
- **Premium feel**: Consistent blue gradients, smooth animations, professional copy.

---

**Generated**: 2025-01-29
**Status**: Ready for Phase 1 execution
**Subagent Status**: Parallel work in progress
