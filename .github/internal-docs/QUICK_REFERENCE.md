# Quick Reference: ColorWizard Monetization

## 🚀 Get Started in 5 Minutes

### 1. Set Environment
```bash
cp .env.local.example .env.local
# Add STRIPE keys
```

### 2. Start Dev Server
```bash
npm run dev
open http://localhost:3000/pricing
```

### 3. Test Feature Gate
```bash
# See /pricing page with tier comparison
# Try upgrade flow (redirects to Stripe Checkout)
```

---

## 📚 Quick Links

| Need | Go To |
|------|-------|
| **Setup & Testing** | `TESTING_GUIDE.md` |
| **Integration Examples** | `INTEGRATION_GUIDE.md` |
| **Production Deployment** | `DEPLOYMENT.md` |
| **Architecture Overview** | `MONETIZATION_README.md` |
| **Project Status** | `COMPLETION_SUMMARY.md` |

---

## 🔑 Feature Names

Use these exact strings:

```typescript
'aiPaletteSuggestions'
'exportToFigma'
'exportToAdobe'
'exportToFramer'
'colorCollaboration'
'advancedFilters'
'advancedPresets'
'prioritySupport'
```

---

## 💻 Code Snippets

### Check User Tier
```tsx
import { useUserTier } from '@/lib/hooks/useUserTier'

const { tier, isPro, loading } = useUserTier()
```

### Gate a Feature
```tsx
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'

const { hasAccess, promptUpgrade } = useFeatureAccess('aiPaletteSuggestions')

if (!hasAccess) promptUpgrade()
```

### Wrap Component
```tsx
import FeatureGate from '@/components/FeatureGate'

<FeatureGate feature="exportToFigma" showPromptOnClick>
  <ExportButton />
</FeatureGate>
```

### Check Feature
```tsx
import { isFeatureEnabled } from '@/lib/featureFlags'

if (isFeatureEnabled('exportToFigma', 'pro')) {
  // Show feature
}
```

---

## 🎯 Common Tasks

### Task: Add Pro Feature
1. Update `lib/featureFlags.ts` (add to FEATURES)
2. Wrap component with `<FeatureGate>`
3. Done!

### Task: Test Checkout
1. Go to `/pricing`
2. Click "Upgrade to Pro"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Check user tier updated in `/settings`

### Task: Deploy to Production
1. Set production Stripe keys
2. Create webhook in Stripe Dashboard
3. Deploy to Vercel (push to main)
4. Update webhook URL in Stripe
5. Test full flow

---

## 🔍 Debugging

### User Tier Not Showing
```tsx
const { tier, loading, error } = useUserTier()
console.log('Tier:', tier, 'Loading:', loading, 'Error:', error)
```

### Feature Not Gated
```tsx
import { getProOnlyFeatures } from '@/lib/featureFlags'
console.log(getProOnlyFeatures())
```

### Webhook Not Working
1. Check Stripe Dashboard → Webhooks
2. Verify endpoint URL matches your domain
3. Check webhook secret in `.env.local`
4. Look for error details in webhook event

### Stripe Checkout Fails
1. Verify price ID in `.env.local`
2. Check Stripe is in correct mode (test/production)
3. Check browser console for errors
4. Verify `NEXT_PUBLIC_APP_URL` is correct

---

## 📊 Pricing Structure

```
FREE (Forever)
- Unlimited palettes
- Basic exports (JSON, CSV)
- Standard filters

PRO ($9/month or $99/year)
- AI palette suggestions
- Advanced exports (Figma, Adobe, Framer)
- Team collaboration
- Advanced filters & presets
- Priority support

ANNUAL DISCOUNT: 18% off
```

---

## 🔐 Stripe Test Mode

**Test Card**: `4242 4242 4242 4242`
**Expiry**: Any future date
**CVC**: Any 3 digits

Create test products in Stripe Dashboard:
- Monthly: `$9/month`
- Annual: `$99/year`

Copy price IDs to `.env.local`:
```env
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...
```

---

## 📧 Email Testing

Emails log to console in test mode:

```bash
# In terminal, you'll see:
# 📧 [TEST EMAIL]
# To: user@example.com
# Subject: ...
# Body: [HTML content]
```

For production, set:
```env
RESEND_API_KEY=re_...
# or
SENDGRID_API_KEY=SG_...
```

---

## 🚢 Deployment Checklist

- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Add Stripe test keys
- [ ] Create test products in Stripe
- [ ] Run `npm run dev` and test locally
- [ ] Create Stripe webhook endpoint
- [ ] Deploy to Vercel (`git push origin main`)
- [ ] Update webhook URL in Stripe (use Vercel domain)
- [ ] Set production Stripe keys in Vercel env
- [ ] Test full checkout in production
- [ ] Set up email provider (optional)
- [ ] Configure Firebase Auth (Phase 2)

---

## 📱 Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Main app |
| `/pricing` | Pricing page |
| `/dashboard` | Success page |
| `/settings` | Account settings |
| `/api/user/tier` | Get user tier |
| `/api/stripe/create-checkout` | Create checkout |
| `/api/stripe/webhook` | Stripe webhook |

---

## 💾 Firebase Schema

User documents at `users/{userId}`:

```javascript
{
  tier: 'free' | 'pro',
  stripeCustomerId: 'cus_...',
  subscriptionId: 'sub_...',
  subscriptionStatus: 'active' | 'canceled',
  nextBillingDate: Timestamp,
  upgradeDate: Timestamp,
  currentPeriodEnd: Timestamp,
  currentPeriodStart: Timestamp,
  createdAt: Timestamp,
  email: 'user@example.com'
}
```

---

## 🎨 Component Hierarchy

```
App
├── AuthProvider
│   └── Header (shows tier + pricing button)
├── Pages
│   ├── /pricing
│   │   └── PricingModal
│   ├── /dashboard
│   │   └── Success message
│   └── /settings
│       └── Account info
└── Features
    └── FeatureGate
        ├── ProFeatureSection
        └── UpgradePrompt (modal on click)
```

---

## 🔗 API Response Examples

### GET /api/user/tier
```json
{
  "tier": "pro",
  "subscriptionStatus": "active",
  "subscriptionId": "sub_123",
  "nextBillingDate": "2025-02-28T..."
}
```

### POST /api/stripe/create-checkout
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/webhook (success)
```json
{
  "received": true
}
```

---

## 🚨 Common Errors

| Error | Fix |
|-------|-----|
| "Missing Stripe key" | Add to `.env.local` |
| "Invalid price ID" | Create product in Stripe |
| "Webhook not delivering" | Check endpoint URL in Stripe |
| "User tier not updating" | Check Firestore rules |
| "Email not sending" | Set email provider API key |

---

## 📞 Support

1. **Setup issues** → `TESTING_GUIDE.md`
2. **Integration questions** → `INTEGRATION_GUIDE.md`
3. **Deployment** → `DEPLOYMENT.md`
4. **Architecture** → `MONETIZATION_README.md`
5. **Code examples** → `components/ProFeaturesShowcase.tsx`

---

## ✅ Checklist: Before Merging PR

- [ ] Environment variables set
- [ ] Stripe products created
- [ ] Pricing page tested
- [ ] Feature gate working
- [ ] Email notifications tested
- [ ] Firebase Firestore users updated
- [ ] No console errors
- [ ] Responsive on mobile

---

**That's it! You're ready to monetize ColorWizard. 🚀**

See `COMPLETION_SUMMARY.md` for full project status.
