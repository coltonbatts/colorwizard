/**
 * Environment Variable Validator
 * No-op in open-source mode because payments are disabled.
 */

import { OPEN_SOURCE_MODE } from '@/lib/appMode'

export function validateServerEnv() {
    if (OPEN_SOURCE_MODE) {
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
