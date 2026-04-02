/**
 * scripts/clean-desktop-export.mjs
 *
 * After `next build` (static export), this strips marketing-only pages
 * from the `out/` directory so they are never bundled into the Tauri desktop app.
 *
 * The web deployment is unaffected — this only touches the local `out/` folder
 * used by Tauri as `frontendDist`.
 *
 * Why Next.js `output: 'export'` creates these:
 *   Static export generates a separate .html file + .txt RSC payload for every
 *   route in the app/ folder, even if the page body is just `redirect('/')`.
 *   Tauri serves files directly and does not execute Next.js server middleware,
 *   so client-side redirects in those pages cause a flash of the wrong UI.
 *
 * Kept:
 *   /            — the main tool (index.html)
 *   /404.html    — error page (Next.js convention)
 *   /data/       — static color name and DMC floss JSON data
 *
 * Removed:
 *   pricing, support, dashboard, settings, trace, color-theory
 */

import { readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUT_DIR = new URL('../out', import.meta.url).pathname

const REMOVE_PAGES = [
  'pricing',
  'support',
  'dashboard',
  'settings',
  'trace',
  'color-theory',
]

let removed = 0

for (const page of REMOVE_PAGES) {
  // Remove .html files
  const htmlFile = join(OUT_DIR, `${page}.html`)
  if (exists(htmlFile)) {
    rmSync(htmlFile, { force: true })
    console.log(`[clean-desktop-export] removed ${page}.html`)
    removed++
  }

  // Remove .txt RSC payload files
  const txtFile = join(OUT_DIR, `${page}.txt`)
  if (exists(txtFile)) {
    rmSync(txtFile, { force: true })
    console.log(`[clean-desktop-export] removed ${page}.txt`)
    removed++
  }

  // Remove directories too (in case Next.js changes output format)
  const dirPath = join(OUT_DIR, page)
  if (exists(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true })
    console.log(`[clean-desktop-export] removed ${page}/`)
    removed++
  }
}

const remaining = readdirSync(OUT_DIR)
  .filter((n) => n !== '_next' && !n.startsWith('.') && n !== '404.html' && n !== 'data')
console.log(`[clean-desktop-export] removed ${removed} files, remaining: ${remaining.join(', ') || '(clean)'}`)

function exists(p) {
  try { statSync(p); return true } catch { return false }
}
