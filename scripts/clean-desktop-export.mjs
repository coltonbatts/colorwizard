/**
 * scripts/clean-desktop-export.mjs
 *
 * After `next build` (static export), this removes marketing-only HTML pages
 * from the `out/` directory so they are never bundled into the Tauri desktop app.
 *
 * The web version is unaffected — this only touches the local `out/` folder
 * used by Tauri as `frontendDist`.
 *
 * Kept pages:
 *   /            — the main tool (index.html)
 *   /404.html    — error page (Next.js convention, safe to keep)
 *
 * Removed pages:
 *   /pricing, /support, /dashboard, /settings, /trace, /color-theory,
 *   and any other non-root HTML files that aren't core tool pages.
 */

import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = new URL('../out', import.meta.url).pathname

const REMOVE = [
  'pricing.html',
  'support.html',
  'dashboard.html',
  'settings.html',
  'trace.html',
  'color-theory.html',
  'pricing',     // Next.js may also output /pricing/index.html
  'support',
  'dashboard',
  'settings',
  'trace',
  'color-theory',
]

const KEEP = ['index.html', '404.html']

for (const name of REMOVE) {
  const fullPath = join(OUT_DIR, name)
  if (!exists(fullPath)) continue
  rmSync(fullPath, { recursive: true, force: true })
  console.log(`[clean-desktop-export] removed ${name}`)
}

// List what remains for visibility
const remaining = readdirSync(OUT_DIR).filter(
  (n) => n !== '_next' && !n.startsWith('.'),
)
console.log(`[clean-desktop-export] keeping: ${KEEP.join(', ')}`)
console.log(`[clean-desktop-export] other: ${remaining.filter((n) => !KEEP.includes(n)).join(', ') || '(none)'}`)

function exists(p) {
  try { statSync(p); return true } catch { return false }
}
