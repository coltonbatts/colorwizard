/**
 * Keep the Tauri export hook explicit.
 *
 * The app currently has a single user-facing route (`/`), so there are no
 * marketing or server-only pages to strip from `out/`.
 */

import { readdirSync, statSync } from 'node:fs'

const OUT_DIR = new URL('../out', import.meta.url).pathname

if (!exists(OUT_DIR)) {
  console.log('[clean-desktop-export] out/ does not exist yet')
  process.exit(0)
}

const remaining = readdirSync(OUT_DIR)
  .filter((name) => name !== '_next' && !name.startsWith('.') && name !== '404.html' && name !== 'data')

console.log(`[clean-desktop-export] desktop export ready; remaining top-level entries: ${remaining.join(', ') || '(clean)'}`)

function exists(path) {
  try {
    statSync(path)
    return true
  } catch {
    return false
  }
}
