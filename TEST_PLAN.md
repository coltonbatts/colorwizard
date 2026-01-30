# ColorWizard Studio Pro - Test Plan

**Created**: January 29, 2025  
**Scope**: Tier gating verification and entitlement system validation  
**Target Release**: Public release with $1 lifetime purchase model

---

## 📋 Overview

This test plan ensures that:
1. **Free users** cannot access Pro features (tier gating works)
2. **Pro lifetime users** can access Pro features (entitlements persist)
3. **Free features** remain accessible to all users
4. **Upgrade flow** works end-to-end (checkout → webhook → tier update)

We focus on **entitlement system verification**, not full end-to-end UI testing. Firebase + Stripe are mocked to keep tests fast and isolated.

---

## 🧪 Test Framework & Setup

### Framework: Vitest
- **Why**: Already configured in project (`vitest.config.ts`)
- **Environment**: Node (no DOM needed for tier logic tests)
- **Pattern**: Existing test files use vitest (see `lib/*.test.ts` examples)

### Dependencies Already Available
- `vitest` ^3.2.4
- TypeScript ^5
- No additional mocking libraries needed (use native modules + manual mocks)

### Test File Structure
```
lib/__tests__/
  └── featureFlags.test.ts       # Feature gating logic
  └── userTier.test.ts           # Tier management functions
```

---

## ✅ Smoke Test Checklist (Manual, Pre-Release)

Before shipping, manually verify in a staging environment:

### Authentication & Tier Assignment
- [ ] New user (fresh signup) → Assigned `tier: 'free'` in Firestore
- [ ] New user can sign in → `useUserTier()` hook returns `tier: 'free'`
- [ ] Auth state persists across page reloads

### Free User Experience
- [ ] Free user → All free features visible (palette gen, exports, analysis tools)
- [ ] Free user → Pro features have `UpgradePrompt` modal
- [ ] Free user → Can navigate to `/pricing` page
- [ ] Free user → See pricing comparison (free vs pro columns)

### Pro User Experience (Post-Purchase)
- [ ] Free user clicks "Upgrade" → Redirected to Stripe checkout
- [ ] Checkout succeeds → Redirected to `/dashboard?success=true`
- [ ] Post-purchase → `useUserTier()` returns `tier: 'pro_lifetime'`
- [ ] Pro user → All pro features visible (no upgrade prompts)
- [ ] Pro user → `UpgradePrompt` modal hidden for pro features
- [ ] Pro features work:
  - [ ] AI palette suggestions available
  - [ ] Team collaboration UI visible
  - [ ] Advanced presets menu available

### Edge Cases
- [ ] Browser devtools: Check Firestore user doc has `tier: 'pro_lifetime'`
- [ ] Browser devtools: Check Stripe webhook was received (logs in Firebase)
- [ ] Refresh page after purchase → Tier persists
- [ ] Sign out → Sign back in → Tier persists
- [ ] Webhook miss scenario: Manual "Restore Purchase" button (future work)

---

## 🚀 Automated Test Cases

### Test Suite 1: Feature Gating Logic
**File**: `lib/__tests__/featureFlags.test.ts`

#### Case 1.1: Free User Cannot Access Pro Features
```gherkin
Given: user tier is 'free'
When: checking access to 'aiPaletteSuggestions'
Then: hasAccessToProFeature() returns false
And: isProOnlyFeature() returns true
```

#### Case 1.2: Free User Can Access Free Features
```gherkin
Given: user tier is 'free'
When: checking access to any free feature
Then: hasAccessToProFeature() returns true
```

#### Case 1.3: Pro Lifetime User Can Access Pro Features
```gherkin
Given: user tier is 'pro_lifetime'
When: checking access to 'aiPaletteSuggestions', 'teamCollaboration', 'advancedPresets'
Then: hasAccessToProFeature() returns true for all
```

#### Case 1.4: Pro Subscription User Can Access Pro Features
```gherkin
Given: user tier is 'pro' (subscription)
When: checking access to pro features
Then: hasAccessToProFeature() returns true
```

#### Case 1.5: All Pro-Only Features Are Identified
```gherkin
When: calling getProFeatures()
Then: returns array with 3 items: aiPaletteSuggestions, teamCollaboration, advancedPresets
And: all have label, description, category
```

---

### Test Suite 2: Tier Management (Idempotency & State)
**File**: `lib/__tests__/userTier.test.ts`

#### Case 2.1: New User Created with Free Tier
```gherkin
Given: no user doc exists
When: createUserDoc('user123', 'test@example.com')
Then: user doc created with tier: 'free'
And: createdAt is set to server timestamp
And: email is stored
```

#### Case 2.2: Get User Tier Returns Correct Value
```gherkin
Given: user doc with tier: 'free' exists
When: calling getUserTier('user123')
Then: returns UserTierDoc with tier: 'free'
```

#### Case 2.3: Unlock Pro Lifetime First Time
```gherkin
Given: free user with id 'user123'
When: unlockProLifetime('user123', { checkoutSessionId: 'cs_123', stripeCustomerId: 'cus_456' })
Then: returns true (newly unlocked)
And: user doc tier updated to 'pro_lifetime'
And: stripe.lastCheckoutSessionId set to 'cs_123'
And: proUnlockedAt timestamp is set
```

#### Case 2.4: Unlock Pro Lifetime Idempotency (Webhook Retry)
```gherkin
Given: user already unlocked with checkoutSessionId 'cs_123'
When: unlockProLifetime again with same checkoutSessionId 'cs_123'
Then: returns false (already processed)
And: user doc NOT updated
And: tier remains 'pro_lifetime'
```

#### Case 2.5: Unlock Pro Lifetime with Different Session (Edge Case)
```gherkin
Given: user unlocked with checkoutSessionId 'cs_123'
When: unlockProLifetime with different checkoutSessionId 'cs_789'
Then: returns true (new session, process it)
And: stripe.lastCheckoutSessionId updated to 'cs_789'
And: tier remains 'pro_lifetime'
```

#### Case 2.6: Link Stripe Customer to User
```gherkin
Given: user exists with no stripeCustomerId
When: linkStripeCustomer('user123', 'cus_xyz')
Then: user doc stripe.customerId updated to 'cus_xyz'
```

---

## 📊 Coverage Goals

### Must Have (Minimum)
- ✅ Free user cannot access pro feature (assertion: `hasAccessToProFeature` returns false)
- ✅ Pro lifetime user can access pro feature (assertion: `hasAccessToProFeature` returns true)
- ✅ Tier gating function identifies pro-only features correctly
- ✅ Unlock pro lifetime is idempotent (webhook retry safety)

### Should Have (High Priority)
- ✅ All pro features enumerated correctly
- ✅ Feature flags config validated
- ✅ User tier doc creation works
- ✅ Tier fetching works

### Nice to Have (Future)
- E2E checkout flow (requires Firebase emulator + Stripe test mode)
- React hook `useUserTier` in isolation (requires complex mocking)
- API route tests for `/api/user/tier` (requires Next.js test setup)

---

## 🛠️ Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test -- lib/__tests__/featureFlags.test.ts
npm test -- lib/__tests__/userTier.test.ts
```

### Run Tests in Watch Mode (Development)
```bash
npm test -- --watch
```

### Run with Coverage
```bash
npm test -- --coverage
```

---

## 🔌 Integrating into CI/CD

### GitHub Actions Example
Add to `.github/workflows/test.yml`:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      - run: npm run build
```

### Pre-Commit Hook (Local)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
npm test || exit 1
npm run lint || exit 1
```

### Release Gate
Before merging to `main`:
1. All tests passing ✅
2. Type checking passes (`tsc --noEmit`)
3. Linting clean (`eslint .`)
4. Build succeeds (`next build`)

---

## 📝 Notes for Test Maintainers

### Mocking Strategy
- **Firebase**: Use manual mocks in test files (no external library needed)
- **API calls**: Mock with vitest `vi.mock()` or `vi.spyOn()`
- **Auth state**: Mock user object and tier response directly

### Don't Mock (Keep Real)
- Feature flag functions (`hasAccessToProFeature`, `isProOnlyFeature`)
- Tier constants and configuration (`PRO_FEATURES`, `FREE_FEATURES`)
- TypeScript types and interfaces

### Test Data / Fixtures
Use consistent test user IDs and tier values across all tests:
```typescript
const TEST_USER_ID = 'test-user-123'
const TEST_STRIPE_CUSTOMER_ID = 'cus-test-456'
const TEST_CHECKOUT_SESSION_ID = 'cs-test-789'
```

### Assertions to Avoid
- ❌ Comparing Timestamp objects directly (use `.toMillis()` or `.toDate()`)
- ❌ Testing Firebase client library internals (mock at boundaries)
- ❌ Testing Stripe API responses (those are Stripe's responsibility)

### When Tests Fail
1. Check if feature names match exactly in `PRO_FEATURES` constant
2. Verify user tier values are exactly `'free'`, `'pro'`, or `'pro_lifetime'`
3. Check Firebase mock returns correct structure (`UserTierDoc` interface)
4. Debug with `console.log()` in test before running

---

## 🚨 Known Limitations

### Not Covered by These Tests
1. **Stripe webhook verification** (requires Stripe test environment)
2. **Firebase Admin SDK calls** (requires Firebase emulator or real project)
3. **React component rendering** (requires DOM test environment)
4. **API route handlers** (requires HTTP mock framework like MSW)
5. **E2E checkout flow** (requires Playwright + real services)

### Why These Exclusions?
- Tests are meant to be fast (no external services)
- We're gating on logic, not infrastructure
- Once gating logic is verified, integration testing handles the rest
- API route tests would be added in Phase 3 if needed

---

## ✨ Success Criteria

Tests are considered **PASSING** when:
1. ✅ All test cases in `featureFlags.test.ts` pass (free/pro access rules)
2. ✅ All test cases in `userTier.test.ts` pass (idempotency, tier management)
3. ✅ Test coverage ≥ 80% for gating logic files
4. ✅ Manual smoke tests pass on staging environment
5. ✅ No console errors or warnings during test run

Tests are considered **READY FOR RELEASE** when:
1. ✅ All above criteria met
2. ✅ Type checking passes (`npx tsc --noEmit`)
3. ✅ Linting passes (`npm run lint`)
4. ✅ Build succeeds (`npm run build`)
5. ✅ At least one release engineer has reviewed the test plan

---

## 🔄 Maintenance Schedule

| When | What | Owner |
|------|------|-------|
| Every commit | Run `npm test` locally | Developer |
| Every PR | Run CI tests | GitHub Actions |
| Weekly | Review test coverage | QA |
| Before release | Manual smoke tests | Release Engineer |
| Monthly | Update test data + fixtures | QA |

---

## 📞 Questions & Escalations

- **Tests failing?** Check the test output for specific assertion message
- **Mocking issues?** Review existing test patterns in `lib/*.test.ts`
- **Tier logic unclear?** Reference `lib/featureFlags.ts` and `lib/db/userTier.ts`
- **Firebase/Stripe questions?** See `RELEASE_ENGINEERING_STATE_MAP.md`

---

**Status**: ✅ Ready for implementation  
**Next Step**: Review test code in `lib/__tests__/featureFlags.test.ts` and `lib/__tests__/userTier.test.ts`
