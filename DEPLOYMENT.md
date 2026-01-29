# Deployment Guide

## Pre-Deployment Checklist

### 1. Stripe Setup

- [ ] Create Stripe account (https://stripe.com)
- [ ] Get production API keys
- [ ] Create Pro Monthly product ($9/month)
- [ ] Create Pro Annual product ($99/year)
- [ ] Copy production key IDs to environment

### 2. Firebase Setup

- [ ] Verify Firebase project is active
- [ ] Enable Firestore Database
- [ ] Enable Authentication (Google/GitHub OAuth recommended)
- [ ] Set Firestore rules to allow user reads/writes

### 3. Email Service

- [ ] Sign up for Resend (https://resend.com) OR SendGrid
- [ ] Get API key
- [ ] Add to environment variables
- [ ] Test email delivery

### 4. Environment Variables

Update `.env.local` with production values:

```env
# Stripe Production Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PRODUCT_ID=prod_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_... (production endpoint webhook)

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... all other Firebase env vars

# Email
RESEND_API_KEY=re_... (or SENDGRID_API_KEY)

# App
NEXT_PUBLIC_APP_URL=https://color-wizard.app
```

## Vercel Deployment

### 1. Connect Repository

```bash
# Push to main branch
git push origin main

# In Vercel dashboard:
# 1. Click "New Project"
# 2. Select colorwizard repo
# 3. Click "Import"
```

### 2. Set Environment Variables

In Vercel dashboard → Settings → Environment Variables:

Add all variables from `.env.local` (except ones starting with `NEXT_PUBLIC_`):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
```

The `NEXT_PUBLIC_*` variables are already in `.env.local` and will be built in.

### 3. Deploy

```
npm run build
npm run start
```

Vercel will automatically:
- Run build
- Detect it's a Next.js app
- Deploy to production URL

### 4. Update Stripe Webhook

In Stripe Dashboard → Developers → Webhooks:

1. Click your test endpoint
2. Add new production endpoint with URL:
   ```
   https://your-vercel-domain.vercel.app/api/stripe/webhook
   ```
3. Select same events as test:
   - customer.subscription.created
   - customer.subscription.updated  
   - customer.subscription.deleted
4. Copy the new webhook secret
5. Update `STRIPE_WEBHOOK_SECRET` in Vercel env vars

## Self-Hosted Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t colorwizard .
docker run -p 3000:3000 -e STRIPE_SECRET_KEY=... colorwizard
```

### Environment Variables (Self-Hosted)

Create `.env.local`:

```env
# All production Stripe keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PRODUCT_ID=prod_...
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Email
RESEND_API_KEY=re_...

# App
NEXT_PUBLIC_APP_URL=https://color-wizard.app
```

## Database Migration

### Firestore Setup

The system automatically creates user documents on first tier fetch, but you can pre-populate users:

```javascript
// In Firestore Console
// Create collection: users
// Create document with ID = user's UID:
{
  tier: "free",
  createdAt: now(),
  email: "user@example.com"
}
```

### Firestore Security Rules

Update your Firestore rules to allow authenticated users to read/write their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own document
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Webhook and server can write
    match /users/{userId} {
      allow write: if request.auth.token.firebase.sign_in_provider == "service_account"
        || request.headers["authorization"] == resource.data.serverSecret;
    }
  }
}
```

## Testing in Production

### 1. Test Pricing Page

```
https://your-domain.com/pricing
```

Should show full pricing modal with correct tiers.

### 2. Test Upgrade Flow

- [ ] Click "Upgrade to Pro"
- [ ] Select monthly or annual
- [ ] Redirected to Stripe Checkout
- [ ] Can complete payment (use test card in test mode)

### 3. Test Webhook

- [ ] Complete a subscription in Stripe
- [ ] Check webhook delivery in Stripe Dashboard
- [ ] Verify Firebase user tier updated
- [ ] Check email was sent

### 4. Test Tier Gating

- [ ] Create free account, verify features are gated
- [ ] Upgrade to Pro, refresh page
- [ ] Verify features are now accessible

## Monitoring

### Stripe Dashboard

Monitor:
- Customers → View active subscriptions
- Payments → Track successful charges
- Disputes → Handle chargebacks
- Webhooks → Check delivery status

### Firebase Console

Monitor:
- Firestore → Users collection size
- Authentication → User count
- Logs → Errors and warnings

### Vercel Dashboard

Monitor:
- Deployments → Build status
- Analytics → Traffic and errors
- Logs → API route errors

## Common Issues

### Webhook Not Updating User Tier

1. Check webhook endpoint URL matches your domain
2. Verify webhook secret in Stripe matches `STRIPE_WEBHOOK_SECRET`
3. Check Vercel logs for API errors
4. Verify Firestore rules allow writes

### Checkout Fails

1. Verify all Stripe product IDs are correct
2. Check Stripe is in production mode (not test)
3. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is production key
4. Check browser console for errors

### Email Not Sending

1. Verify email provider API key is correct
2. Check email service status/dashboard
3. Verify email addresses are valid
4. Check API route logs for errors

### Users Can't Upgrade

1. Verify `NEXT_PUBLIC_APP_URL` matches your domain
2. Check Stripe checkout redirect URLs
3. Verify user authentication is working
4. Check browser console for errors

## Rollback

If something goes wrong:

### Vercel

```bash
# In Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click "Redeploy"
```

### Manual Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Vercel will auto-redeploy
```

## Scaling

As you grow:

1. **Database**: Firestore handles millions of documents
2. **Stripe**: No additional config needed
3. **Email**: May need higher Resend/SendGrid quota
4. **Vercel**: Auto-scales, upgrade plan if needed
5. **API Routes**: Serverless functions scale automatically

## Security Checklist

- [ ] Use HTTPS only (Vercel provides free SSL)
- [ ] Never commit real API keys (use .env.local)
- [ ] Rotate webhook secret quarterly
- [ ] Enable 2FA on Stripe account
- [ ] Enable 2FA on Firebase project
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Monitor for security advisories
- [ ] Don't log sensitive data (API keys, passwords)
- [ ] Use environment variables for all secrets

## Post-Launch

### First Week

- [ ] Monitor webhook delivery rate
- [ ] Check for support tickets
- [ ] Verify email delivery
- [ ] Monitor Stripe for disputes
- [ ] Check analytics for conversion rate

### Monthly

- [ ] Review Stripe reporting
- [ ] Check Firebase usage
- [ ] Review error logs
- [ ] Plan feature releases
- [ ] Check customer feedback

## Support

For issues:

1. Check [TESTING_GUIDE.md](./TESTING_GUIDE.md) troubleshooting
2. Review [MONETIZATION_README.md](./MONETIZATION_README.md)
3. Check Stripe webhook logs
4. Check Vercel deployment logs
5. Review Firebase rules and data

## Next Steps

After launch:

1. **Analytics**: Set up GA4 conversion tracking
2. **Metrics**: Create dashboard for MRR and churn
3. **Support**: Set up email support for Pro customers
4. **Feedback**: Collect user feedback on pricing
5. **Features**: Release more Pro features based on demand
6. **Marketing**: Promote Pro tier benefits
7. **Optimize**: A/B test pricing and messaging

---

**You're ready to launch! 🚀**
