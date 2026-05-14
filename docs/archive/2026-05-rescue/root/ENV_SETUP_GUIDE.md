# Environment Variables Setup Guide

## Quick Method: Pull from Vercel (Easiest)

If you're logged into Vercel CLI:

```bash
vercel login
vercel env pull .env.local
```

This will automatically create `.env.local` with all your production environment variables.

## Manual Method: Copy from Vercel Dashboard

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your colorwizard project**
3. **Navigate to**: Settings → Environment Variables
4. **Copy each variable** and paste into `.env.local`

## Required Variables

### Firebase (6 variables)
Get these from Firebase Console → Project Settings → General → Your apps

- `NEXT_PUBLIC_FIREBASE_API_KEY` - API Key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Auth Domain (usually `your-project.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Storage Bucket (usually `your-project.appspot.com`)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Messaging Sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - App ID

### Stripe (5 variables)
Get these from Stripe Dashboard → Developers → API Keys

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Publishable Key (starts with `pk_test_` or `pk_live_`)
- `STRIPE_SECRET_KEY` - Secret Key (starts with `sk_test_` or `sk_live_`)

Get these from Stripe Dashboard → Products

- `NEXT_PUBLIC_STRIPE_LIFETIME_PRODUCT_ID` - Product ID (starts with `prod_`)
- `NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID` - Price ID (starts with `price_`)

Get this from Stripe Dashboard → Developers → Webhooks

- `STRIPE_WEBHOOK_SECRET` - Webhook Signing Secret (starts with `whsec_`)

### Email (Optional - 1 variable)
Choose one:

- `RESEND_API_KEY` - Get from https://resend.com/api-keys (starts with `re_`)
- OR `SENDGRID_API_KEY` - Get from SendGrid Dashboard (starts with `SG_`)

If neither is set, emails will log to console in development.

### App Configuration (1 variable)

- `NEXT_PUBLIC_APP_URL` - Use `http://localhost:3000` for local development

## Create .env.local File

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Then fill in all the values above.

## Verify Setup

After creating `.env.local`, test that everything works:

```bash
npm run dev
```

The app should start without errors. If you see Firebase or Stripe errors, double-check your environment variables.

## Security Notes

- ✅ `.env.local` is already in `.gitignore` - your secrets won't be committed
- ✅ Never commit `.env.local` to git
- ✅ Use test keys (`pk_test_`, `sk_test_`) for local development
- ✅ Production keys are stored securely in Vercel
