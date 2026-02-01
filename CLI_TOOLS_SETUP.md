# CLI Tools Setup Summary

## ✅ Installed Tools

All command-line tools are now installed and ready to use:

| Tool | Version | Status | Purpose |
|------|---------|--------|---------|
| **Node.js** | v22.22.0 | ✅ Installed | JavaScript runtime |
| **npm** | v10.9.4 | ✅ Installed | Package manager |
| **git** | v2.48.1 | ✅ Installed | Version control |
| **GitHub CLI** | v2.86.0 | ✅ Installed & Logged In | GitHub operations |
| **Vercel CLI** | v50.9.0 | ✅ Installed | Deployment & env vars |
| **Stripe CLI** | v1.35.0 | ✅ Installed | Webhook testing |
| **ngrok** | v3.35.0 | ✅ Installed | Local webhook tunneling |
| **Homebrew** | v5.0.12 | ✅ Installed | Package manager |

## 🔐 Authentication Required

### Vercel CLI
You need to log in to pull environment variables:

```bash
vercel login
```

After logging in, you can pull your environment variables:
```bash
vercel env pull .env.local
```

### Stripe CLI (Optional - for webhook testing)
If you want to test webhooks locally:

```bash
stripe login
```

Then use it to forward webhooks:
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

### ngrok (Optional - alternative webhook testing)
If you prefer ngrok over Stripe CLI:

```bash
# First time: sign up at https://ngrok.com and get your authtoken
ngrok config add-authtoken YOUR_TOKEN

# Then expose your local server
ngrok http 3000
```

## 🚀 Quick Start Commands

### Development
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm test             # Run tests
npm run lint         # Check code quality
```

### Git Operations
```bash
git status            # Check changes
git add .            # Stage files
git commit -m "..."   # Commit changes
git push origin main  # Push to GitHub
```

### Deployment
```bash
vercel                # Deploy to Vercel (if logged in)
vercel env pull .env.local  # Pull env vars from Vercel
```

### Webhook Testing
```bash
# Option 1: Stripe CLI
stripe listen --forward-to http://localhost:3000/api/stripe/webhook

# Option 2: ngrok
ngrok http 3000
# Then use the ngrok URL in Stripe webhook settings
```

## 📝 Next Steps

1. **Log into Vercel** to pull environment variables:
   ```bash
   vercel login
   vercel env pull .env.local
   ```

2. **Verify everything works**:
   ```bash
   npm run dev
   ```

3. **Push your workflow rules** (if not already done):
   ```bash
   git push origin main
   ```

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Firebase Console**: https://console.firebase.google.com
- **GitHub**: https://github.com/coltonbatts/colorwizard
- **ngrok Dashboard**: https://dashboard.ngrok.com
