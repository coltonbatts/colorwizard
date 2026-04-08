/**
 * Environment Variable Validator
 * No-op while the app ships as a standalone desktop build with no server runtime.
 */

import { SERVER_INTEGRATIONS_ENABLED } from '@/lib/appMode'

export function validateServerEnv() {
    if (!SERVER_INTEGRATIONS_ENABLED) {
        return
    }

    const requiredVars = [
        'STRIPE_SECRET_KEY',
        'NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID',
        'STRIPE_WEBHOOK_SECRET',
        'FIREBASE_SERVICE_ACCOUNT_KEY',
    ]

    const missing = requiredVars.filter(v => !process.env[v])

    if (missing.length > 0) {
        const errorMsg = `CRITICAL CONFIG ERROR: Missing required environment variables: ${missing.join(', ')}`
        console.error(`\x1b[31m%s\x1b[0m`, errorMsg) // Red text in console
        throw new Error(errorMsg)
    }
}
