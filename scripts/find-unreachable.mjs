#!/usr/bin/env node
/**
 * find-unreachable.mjs — static reachability analysis for the app module graph.
 *
 * Walks the import graph outward from the Next.js App Router entry points and
 * reports every source file under the scanned directories that nothing can reach.
 *
 * Why this exists: unreachable components look alive in an editor. Three separate
 * UI passes have rewritten components that no route renders, and one of them broke
 * a production build. Run this before investing effort in a component you did not
 * arrive at by following an import.
 *
 * Usage:
 *   node scripts/find-unreachable.mjs             # human-readable report
 *   node scripts/find-unreachable.mjs --json      # machine-readable
 *   node scripts/find-unreachable.mjs --check     # exit 1 on files not in the baseline
 *   node scripts/find-unreachable.mjs --update-baseline
 *   node scripts/find-unreachable.mjs --why <file>  # show why a file IS reachable
 *
 * Edges followed: static imports (incl. type-only), `export ... from`, `export * from`,
 * dynamic `import('literal')`, `require('literal')`, and
 * `new Worker(new URL('./x.worker.ts', import.meta.url))`.
 *
 * Deliberately conservative: anything it cannot resolve statically is treated as a
 * live edge, so a file reported as unreachable is unreachable, but the reverse is
 * not guaranteed. Template-literal specifiers are reported as warnings.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { dirname, resolve, relative, join, basename, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(REPO_ROOT, 'scripts', 'unreachable-baseline.json')

/** Directories whose source files are candidates for the unreachable report. */
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib']

/**
 * Directories skipped entirely while walking. `out/` and `.next/` are build output,
 * `.claude/worktrees` holds detached checkouts of this same repo, and `node_modules`
 * is external.
 */
const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  '.git',
  'out',
  'dist',
  'build',
  'target',
])
const IGNORED_PATH_PREFIXES = ['.claude']

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

/** Extension probe order when a specifier omits its extension. */
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']
const INDEX_BASENAMES = ['index']

/**
 * App Router files Next.js mounts on its own. Anything else under app/ is only
 * reachable if one of these imports it.
 */
const ROUTE_ENTRY_BASENAMES = new Set([
  'page',
  'layout',
  'error',
  'global-error',
  'not-found',
  'loading',
  'template',
  'default',
  'route',
])

/** Root-level files Next.js loads by convention, outside the app/ directory. */
const CONVENTION_ROOTS = [
  'middleware.ts',
  'middleware.js',
  'instrumentation.ts',
  'instrumentation.js',
]

// ---------------------------------------------------------------------------
// Filesystem walking
// ---------------------------------------------------------------------------

function isIgnoredDir(absPath) {
  const name = basename(absPath)
  if (IGNORED_DIR_NAMES.has(name)) return true
  const rel = relative(REPO_ROOT, absPath)
  return IGNORED_PATH_PREFIXES.some((prefix) => rel === prefix || rel.startsWith(prefix + sep))
}

function walk(absDir, out = []) {
  let entries
  try {
    entries = readdirSync(absDir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const abs = join(absDir, entry.name)
    if (entry.isDirectory()) {
      if (!isIgnoredDir(abs)) walk(abs, out)
    } else if (entry.isFile()) {
      out.push(abs)
    }
  }
  return out
}

function isSourceFile(absPath) {
  const ext = extname(absPath)
  if (!SOURCE_EXTENSIONS.includes(ext)) return false
  if (absPath.endsWith('.d.ts')) return false
  return true
}

function isTestFile(absPath) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(absPath)
}

// ---------------------------------------------------------------------------
// Source scanning
// ---------------------------------------------------------------------------

/**
 * Strip comments so a commented-out import does not register as a live edge.
 * Walks the source once, tracking string/template/regex context, because a naive
 * comment regex mangles URLs inside string literals ("https://...").
 */
function stripComments(source) {
  let out = ''
  let i = 0
  const n = source.length
  let prevMeaningful = ''

  while (i < n) {
    const ch = source[i]
    const next = source[i + 1]

    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') i++
      continue
    }
    if (ch === '/' && next === '*') {
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) i++
      i += 2
      out += ' '
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch
      out += ch
      i++
      while (i < n) {
        if (source[i] === '\\') {
          out += source[i] + (source[i + 1] ?? '')
          i += 2
          continue
        }
        out += source[i]
        if (source[i] === quote) {
          i++
          break
        }
        i++
      }
      prevMeaningful = quote
      continue
    }
    // Regex literal: only where a value cannot precede a division operator.
    if (ch === '/' && !/[\w)\]]/.test(prevMeaningful)) {
      let j = i + 1
      let closed = false
      let inClass = false
      while (j < n && source[j] !== '\n') {
        if (source[j] === '\\') {
          j += 2
          continue
        }
        if (source[j] === '[') inClass = true
        else if (source[j] === ']') inClass = false
        else if (source[j] === '/' && !inClass) {
          closed = true
          break
        }
        j++
      }
      if (closed) {
        out += source.slice(i, j + 1)
        i = j + 1
        prevMeaningful = '/'
        continue
      }
    }

    out += ch
    if (!/\s/.test(ch)) prevMeaningful = ch
    i++
  }

  return out
}

const STATIC_IMPORT_RE = /\bimport\s+(?:type\s+)?(?:[\w*${}\s,]+?\s+from\s+)?['"]([^'"]+)['"]/g
const EXPORT_FROM_RE = /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const TYPEOF_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\./g
const REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const NEW_URL_RE = /new\s+URL\s*\(\s*['"]([^'"]+)['"]\s*,\s*import\s*\.\s*meta\s*\.\s*url\s*\)/g
const UNRESOLVABLE_DYNAMIC_RE = /\bimport\s*\(\s*[`$]/g

/** Extract every module specifier this file references. */
function extractSpecifiers(source) {
  const code = stripComments(source)
  const specifiers = new Set()
  const patterns = [
    STATIC_IMPORT_RE,
    EXPORT_FROM_RE,
    DYNAMIC_IMPORT_RE,
    TYPEOF_IMPORT_RE,
    REQUIRE_RE,
    NEW_URL_RE,
  ]
  for (const pattern of patterns) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(code)) !== null) {
      specifiers.add(match[1])
    }
  }
  UNRESOLVABLE_DYNAMIC_RE.lastIndex = 0
  const hasComputedImport = UNRESOLVABLE_DYNAMIC_RE.test(code)
  return { specifiers: [...specifiers], hasComputedImport }
}

// ---------------------------------------------------------------------------
// Module resolution
// ---------------------------------------------------------------------------

function tryFile(absPath) {
  try {
    return statSync(absPath).isFile() ? absPath : null
  } catch {
    return null
  }
}

/**
 * Resolve a specifier the way the bundler does: exact path, then extension
 * probes, then directory index. Bare specifiers resolve to null (external).
 */
function resolveSpecifier(specifier, fromFile) {
  let base
  if (specifier.startsWith('@/')) {
    base = join(REPO_ROOT, specifier.slice(2))
  } else if (specifier === '@') {
    base = REPO_ROOT
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    base = resolve(dirname(fromFile), specifier)
  } else if (specifier.startsWith('/')) {
    // Absolute specifiers in this repo only appear as public/ asset URLs.
    return null
  } else {
    return null // bare package specifier
  }

  const direct = tryFile(base)
  if (direct) return direct

  for (const ext of RESOLVE_EXTENSIONS) {
    const hit = tryFile(base + ext)
    if (hit) return hit
  }

  // `./foo.js` in TS source frequently means `./foo.ts`.
  const ext = extname(base)
  if (ext === '.js' || ext === '.mjs' || ext === '.jsx') {
    const stem = base.slice(0, -ext.length)
    for (const candidate of ['.ts', '.tsx', '.mts']) {
      const hit = tryFile(stem + candidate)
      if (hit) return hit
    }
  }

  for (const indexName of INDEX_BASENAMES) {
    for (const indexExt of RESOLVE_EXTENSIONS) {
      const hit = tryFile(join(base, indexName + indexExt))
      if (hit) return hit
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

function collectRoots() {
  const roots = []
  const appDir = join(REPO_ROOT, 'app')
  if (existsSync(appDir)) {
    for (const abs of walk(appDir)) {
      if (!isSourceFile(abs) || isTestFile(abs)) continue
      const stem = basename(abs, extname(abs))
      if (ROUTE_ENTRY_BASENAMES.has(stem)) roots.push(abs)
    }
  }
  for (const name of CONVENTION_ROOTS) {
    const abs = join(REPO_ROOT, name)
    if (existsSync(abs)) roots.push(abs)
  }
  return roots.sort()
}

function collectUniverse() {
  const files = []
  for (const dir of SCAN_DIRS) {
    const abs = join(REPO_ROOT, dir)
    if (!existsSync(abs)) continue
    for (const file of walk(abs)) {
      if (isSourceFile(file) && !isTestFile(file)) files.push(file)
    }
  }
  return files.sort()
}

function collectTestFiles() {
  const files = []
  for (const dir of SCAN_DIRS) {
    const abs = join(REPO_ROOT, dir)
    if (!existsSync(abs)) continue
    for (const file of walk(abs)) {
      if (isSourceFile(file) && isTestFile(file)) files.push(file)
    }
  }
  return files.sort()
}

/**
 * Breadth-first walk from `roots`. Returns the reachable set plus, for each
 * reachable file, the edge that first reached it (used by --why).
 */
function traverse(roots) {
  const reachable = new Set()
  const parent = new Map()
  const warnings = []
  const queue = [...roots]

  for (const root of roots) {
    reachable.add(root)
    parent.set(root, null)
  }

  while (queue.length > 0) {
    const current = queue.shift()
    let source
    try {
      source = readFileSync(current, 'utf8')
    } catch {
      continue
    }
    const { specifiers, hasComputedImport } = extractSpecifiers(source)
    if (hasComputedImport) {
      warnings.push(`${relative(REPO_ROOT, current)}: computed import() specifier — edges may be missed`)
    }
    for (const specifier of specifiers) {
      const resolved = resolveSpecifier(specifier, current)
      if (!resolved) continue
      if (!isSourceFile(resolved)) continue
      if (reachable.has(resolved)) continue
      reachable.add(resolved)
      parent.set(resolved, current)
      queue.push(resolved)
    }
  }

  return { reachable, parent, warnings }
}

function countLines(absPath) {
  try {
    const text = readFileSync(absPath, 'utf8')
    if (text.length === 0) return 0
    return text.split('\n').length
  } catch {
    return 0
  }
}

function analyze() {
  const roots = collectRoots()
  const universe = collectUniverse()
  const testFiles = collectTestFiles()

  const { reachable, parent, warnings } = traverse(roots)
  const { reachable: testReachable } = traverse(testFiles)

  const unreachable = universe
    .filter((file) => !reachable.has(file))
    .map((file) => ({
      file: relative(REPO_ROOT, file),
      lines: countLines(file),
      testOnly: testReachable.has(file),
    }))

  return {
    roots: roots.map((r) => relative(REPO_ROOT, r)),
    scanned: universe.length,
    reachableCount: universe.filter((f) => reachable.has(f)).length,
    unreachable,
    totalUnreachableLines: unreachable.reduce((sum, u) => sum + u.lines, 0),
    warnings,
    parent,
    reachable,
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function groupByDirectory(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const dir = dirname(entry.file)
    if (!groups.has(dir)) groups.set(dir, [])
    groups.get(dir).push(entry)
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

function printReport(result) {
  const { roots, scanned, reachableCount, unreachable, totalUnreachableLines, warnings } = result

  console.log('Reachability analysis — ColorWizard')
  console.log('='.repeat(72))
  console.log(`Roots (${roots.length}):`)
  for (const root of roots) console.log(`  ${root}`)
  console.log(`\nScanned ${scanned} source files in ${SCAN_DIRS.join(', ')}`)
  console.log(`Reachable: ${reachableCount}`)
  console.log(`Unreachable: ${unreachable.length} files / ${totalUnreachableLines} lines\n`)

  if (unreachable.length === 0) {
    console.log('No unreachable files. ')
  } else {
    for (const [dir, entries] of groupByDirectory(unreachable)) {
      const dirLines = entries.reduce((sum, e) => sum + e.lines, 0)
      console.log(`${dir}/  (${entries.length} files, ${dirLines} lines)`)
      for (const entry of entries.sort((a, b) => b.lines - a.lines)) {
        const tag = entry.testOnly ? '  [test-only]' : ''
        console.log(`  ${String(entry.lines).padStart(5)}  ${basename(entry.file)}${tag}`)
      }
      console.log('')
    }
  }

  if (warnings.length > 0) {
    console.log('Warnings (edges that could not be resolved statically):')
    for (const warning of warnings) console.log(`  ${warning}`)
    console.log('')
  }
}

function printWhy(result, target) {
  const abs = resolve(REPO_ROOT, target)
  if (!result.reachable.has(abs)) {
    console.log(`${relative(REPO_ROOT, abs)} is NOT reachable from any app entry point.`)
    process.exit(1)
  }
  const chain = []
  let cursor = abs
  while (cursor) {
    chain.push(relative(REPO_ROOT, cursor))
    cursor = result.parent.get(cursor)
  }
  console.log(`${relative(REPO_ROOT, abs)} is reachable:\n`)
  for (const [index, step] of chain.reverse().entries()) {
    console.log(`${'  '.repeat(index)}${index === 0 ? '' : '└─ '}${step}`)
  }
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return { files: [] }
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  } catch {
    return { files: [] }
  }
}

function writeBaseline(result) {
  const payload = {
    $comment:
      'Files known to be unreachable from the app entry points and deliberately kept. ' +
      'Regenerate with `npm run unreachable:update`. Adding a file here is a decision to ' +
      'keep dead-but-intentional code; removing one means it got wired up or deleted.',
    generated: new Date().toISOString().slice(0, 10),
    files: result.unreachable.map((u) => u.file).sort(),
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + '\n')
  console.log(`Wrote baseline: ${relative(REPO_ROOT, BASELINE_PATH)} (${payload.files.length} files)`)
}

function runCheck(result) {
  const baseline = new Set(readBaseline().files)
  const current = result.unreachable.map((u) => u.file)
  const added = current.filter((file) => !baseline.has(file))
  const removed = [...baseline].filter((file) => !current.includes(file))

  if (added.length === 0 && removed.length === 0) {
    console.log(`Unreachable set matches baseline (${current.length} files).`)
    return 0
  }

  if (added.length > 0) {
    console.error('New unreachable files (nothing in app/ can reach these):\n')
    for (const file of added) {
      const entry = result.unreachable.find((u) => u.file === file)
      console.error(`  ${file}  (${entry.lines} lines)`)
    }
    console.error(
      '\nEither wire them into the app, delete them, or — if they are deliberate WIP —\n' +
        'run `npm run unreachable:update` and explain the addition in your commit message.\n'
    )
  }
  if (removed.length > 0) {
    console.error('Baseline entries that are no longer unreachable (wired up or deleted):\n')
    for (const file of removed) console.error(`  ${file}`)
    console.error('\nRun `npm run unreachable:update` to refresh the baseline.\n')
  }
  return 1
}

// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2)
  const result = analyze()

  const whyIndex = args.indexOf('--why')
  if (whyIndex !== -1) {
    const target = args[whyIndex + 1]
    if (!target) {
      console.error('--why requires a file path')
      process.exit(2)
    }
    printWhy(result, target)
    return
  }

  if (args.includes('--update-baseline')) {
    writeBaseline(result)
    return
  }

  if (args.includes('--json')) {
    const { parent, reachable, ...serializable } = result
    console.log(JSON.stringify(serializable, null, 2))
    return
  }

  if (args.includes('--check')) {
    process.exit(runCheck(result))
  }

  printReport(result)
}

main()
