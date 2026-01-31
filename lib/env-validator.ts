/**
 * Environment Variable Validator
 * 
 * Ensures critical server-side environment variables are present.
 * Throws a loud error if any are missing.
 */

export function validateServerEnv() {
    const requiredVars = [
        'STRIPE_SECRET_KEY',
        'NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID'
    ]

    const missing = requiredVars.filter(v => !process.env[v])

    if (missing.length > 0) {
        const errorMsg = `CRITICAL CONFIG ERROR: Missing required environment variables: ${missing.join(', ')}`
        console.error(`\x1b[31m%s\x1b[0m`, errorMsg) // Red text in console
        throw new Error(errorMsg)
    }
}
