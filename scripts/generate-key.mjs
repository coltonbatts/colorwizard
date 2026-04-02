/**
 * License Key Generator CLI
 *
 * Usage: node scripts/generate-key.mjs customer-email@example.com
 *
 * Generates a valid ColorWizard Desktop license key.
 * Run this server-side after a Gumroad purchase to create keys for buyers.
 * Uses the same djb2 hash as the Rust validation in src/license.rs
 */

const SALT = 'colorwizard-desktop-2026'

function djb2Hash(input) {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = Math.imul(hash, 33) + input.charCodeAt(i)
    hash = hash >>> 0 // force unsigned 32-bit
  }
  return hash
}

function computeChecksum(value) {
  const hash = djb2Hash(`${SALT}${value}`)
  return (hash & 0xffff).toString(16).padStart(4, '0')
}

function generateKey(seed) {
  const random = djb2Hash(`${seed}-${Date.now()}-${Math.random()}`).toString(16).padStart(8, '0').slice(-8)

  const group1 = random.slice(0, 4)
  const group2 = random.slice(4, 8)
  const checksum = computeChecksum(`${group1}${group2}`)

  return `CW-${group1.toUpperCase()}-${group2.toUpperCase()}-${checksum.toUpperCase()}`
}

const email = process.argv[2]
if (!email) {
  console.log('ColorWizard Desktop License Key Generator')
  console.log('Usage: node scripts/generate-key.mjs <email>')
  console.log('')
  console.log('Example:')
  console.log('  node scripts/generate-key.mjs artist@example.com')
  console.log('')
  console.log('Generated keys:')
  for (let i = 0; i < 5; i++) {
    console.log(`  ${generateKey('demo-key')}`)
  }
  process.exit(0)
}

const key = generateKey(email)
console.log(key)
