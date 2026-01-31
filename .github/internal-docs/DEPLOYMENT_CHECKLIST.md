# ColorWizard Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [ ] `npm test` passes (304+ tests)
- [ ] `npm run build` succeeds with no errors
- [ ] `npm run lint` passes (or errors reviewed)
- [ ] No console errors in dev mode
- [ ] TypeScript types clean

### Environment Configuration
- [ ] Firebase API key configured in `.env.local`
- [ ] Stripe keys configured (test/prod as needed)
- [ ] Vercel environment variables set
- [ ] All secrets in `.env.local` (not in code)

### Feature Verification
- [ ] Free tier: All basic features work
- [ ] Pro tier: Upgrade flow works ($1 checkout)
- [ ] Pro badge shows for `pro` and `pro_lifetime`
- [ ] Error handling shows toasts, not alerts
- [ ] Mobile responsive at 375px, 768px, 1440px

### Performance Checklist
- [ ] Bundle size monitored
- [ ] Images optimized (WebP/AVIF)
- [ ] React optimizations applied (useShallow, memo where needed)
- [ ] No waterfalls in data fetching
- [ ] Server-side caching configured

### Deployment-Specific Issues

#### Badges & Widgets
- **Product Hunt Badge**: This is added by Vercel's infrastructure or Product Hunt widget
  - To disable: Check `vercel.json` or remove from external services
  - Current status: Active (blocking top bar)
  - Action: Contact Vercel support or disable in deployment config

- **"Built by Artist" Button**: Not found in codebase
  - Likely from: External widget or Vercel plugin
  - Status: Displaying cartoony icon (off-brand)
  - Action: Review deployment plugins, disable in `vercel.json`

- **Support Link (Broken $1 Link)**: Need to implement
  - Status: ❌ Not implemented yet
  - Action: Create support page or link handler

#### Recommended Actions
1. Create `vercel.json` config to disable external widgets:
```json
{
  "headers": [
    {
      "source": "/:path*",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        }
      ]
    }
  ]
}
```

2. Implement support page:
   - Create `/app/support/page.tsx`
   - Link from modals: "Need help? [Contact support]"
   - Add Stripe support link

3. Remove/hide Product Hunt badge:
   - Check Vercel dashboard for badge settings
   - Or modify `next.config.js` to disable

### Security
- [ ] HTTPS enforced
- [ ] Stripe webhook secret configured
- [ ] Firebase rules reviewed
- [ ] No API keys exposed in client code
- [ ] CORS configured correctly

### Mobile Testing
- [ ] iOS Safari: ✓
- [ ] Android Chrome: ✓
- [ ] Responsive layout: 375px → desktop
- [ ] Touch targets >= 48px
- [ ] No horizontal scroll

### Final Pre-Launch
- [ ] All environment variables set in Vercel
- [ ] Stripe webhook configured for production
- [ ] Firebase security rules active
- [ ] Monitoring/logging enabled (Sentry, etc.)
- [ ] Database backups configured
- [ ] Rollback plan documented

## Post-Deployment Verification

### Smoke Test
1. Visit https://color-wizard.app
2. Sign up as free user
3. Try Pro-only feature → see upgrade prompt
4. Complete $1 checkout (test mode)
5. Verify Pro badge appears
6. Check mobile at 375px

### Monitoring
- [ ] Sentry/error tracking active
- [ ] Analytics tracking (if applicable)
- [ ] Database monitoring
- [ ] Stripe webhook logs

## Issues Logged

### Current Issues
1. **Product Hunt Badge** - Blocking header, not on brand
   - Priority: HIGH
   - Fix: Disable in Vercel settings

2. **"Built by Artist" Button** - Off-brand cartoony icon
   - Priority: MEDIUM
   - Fix: Remove or rebrand

3. **Support/$1 Link Broken** - No support page yet
   - Priority: MEDIUM
   - Fix: Create support flow

## Version History
- **v1.0 (2025-01-30)**: Phase 1 UX Polish complete, ready for deployment review
