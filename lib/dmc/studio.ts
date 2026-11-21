/**
 * Needle-painting DMC studio helpers: search, color-card browsing (with warm/cool gray
 * separation), substitute lookup, OKLab bridge/blend finding, value-gap checks, and list export.
 * Pure and React-free.
 */

import { rgbToHex } from '../color/conversions'
import { rgbToOklabL } from '../color/oklab'
import { getRelativeLuminance, linearToSRGB } from '../valueScale'
import { buildImageValueContext } from './imageValue'
import { rankDmcThreadsByDeltaE } from './match'
import type {
  DMCThread,
  ImageValueContext,
  ScoredDMCThread,
  ThreadWarmth,
} from './types'

export type BrowseGroupId =
  | 'grays'
  | 'reds-pinks'
  | 'peaches-corals'
  | 'yellows'
  | 'greens'
  | 'blues'
  | 'violets'
  | 'soft-neutrals'

export type GrayToneFilter = 'all' | 'warm' | 'neutral' | 'cool'

export interface BrowseGroup {
  id: BrowseGroupId
  label: string
  swatch: string
}

export const BROWSE_GROUPS: readonly BrowseGroup[] = [
  { id: 'grays', label: 'Grays & whites', swatch: '#8E8B86' },
  { id: 'reds-pinks', label: 'Reds & pinks', swatch: '#C05A66' },
  { id: 'peaches-corals', label: 'Peaches & earth', swatch: '#C87654' },
  { id: 'yellows', label: 'Yellows & golds', swatch: '#D6AE4B' },
  { id: 'greens', label: 'Greens & olives', swatch: '#5E8259' },
  { id: 'blues', label: 'Teals & blues', swatch: '#4B7B9C' },
  { id: 'violets', label: 'Violets & plums', swatch: '#7B608E' },
  { id: 'soft-neutrals', label: 'Muted & soft', swatch: '#B5A8A3' },
]

const GRAY_NAME_RE = /\b(gray|grey|pewter|tin|slate|ash|beaver|silver|black|white|ecru)\b/i
const CHROMATIC_GRAY_EXCLUDE_RE = /\b(green|blue|violet|lavender|pink|rose|grn)\b/i
const GRAY_WARMTH_THRESHOLD = 0.008
const LOW_CHROMA_THRESHOLD = 0.045

/** Subtle warm/cool/neutral tone that stays meaningful even on grays and near-neutrals. */
export function threadTone(thread: Pick<DMCThread, 'oklab' | 'warmth'>): ThreadWarmth {
  if (thread.warmth !== 'neutral') return thread.warmth
  const chroma = Math.hypot(thread.oklab.a, thread.oklab.b)
  if (chroma < LOW_CHROMA_THRESHOLD) {
    // Muted blue-greens / celadons have strongly negative `a`; don't misread their slight +b as warm.
    if (thread.oklab.a <= -0.015) return 'cool'
    if (thread.oklab.b > GRAY_WARMTH_THRESHOLD) return 'warm'
    if (thread.oklab.b < -GRAY_WARMTH_THRESHOLD) return 'cool'
    return 'neutral'
  }
  return thread.warmth
}

export function formatThreadTone(tone: ThreadWarmth): string {
  return tone === 'warm' ? 'Warm' : tone === 'cool' ? 'Cool' : 'Neutral'
}

/** True for DMC whites, grays, blacks, and ecru used in monochrome / grayscale work. */
export function isGrayOrWhiteThread(thread: Pick<DMCThread, 'name' | 'number' | 'oklab'>): boolean {
  if (thread.number === 'White' || thread.number === 'B5200' || thread.number === 'Ecru' || thread.number === '310') {
    return true
  }
  if (GRAY_NAME_RE.test(thread.name) && !CHROMATIC_GRAY_EXCLUDE_RE.test(thread.name)) {
    return true
  }
  const chroma = Math.hypot(thread.oklab.a, thread.oklab.b)
  return chroma < 0.012
}

/** Classifies every DMC thread into one browse group so none are lost. */
export function browseGroupOf(thread: DMCThread): BrowseGroupId {
  if (isGrayOrWhiteThread(thread)) return 'grays'
  switch (thread.hueBucket) {
    case 'red':
    case 'magenta':
      return 'reds-pinks'
    case 'red-orange':
    case 'orange':
      return 'peaches-corals'
    case 'yellow':
      return 'yellows'
    case 'yellow-green':
    case 'green':
      return 'greens'
    case 'cyan':
    case 'blue':
      return 'blues'
    case 'violet':
      return 'violets'
    case 'neutral':
    default:
      return 'soft-neutrals'
  }
}

/** Threads in a browse group, ordered lightest → darkest (with optional warm/neutral/cool filter for grays). */
export function getBrowseThreads(
  threads: readonly DMCThread[],
  group: BrowseGroupId,
  grayTone: GrayToneFilter = 'all',
): DMCThread[] {
  return threads
    .filter((thread) => {
      if (browseGroupOf(thread) !== group) return false
      if (group === 'grays' && grayTone !== 'all') {
        return threadTone(thread) === grayTone
      }
      return true
    })
    .sort((a, b) => b.oklab.L - a.oklab.L || compareDmcNumber(a.number, b.number))
}

function compareDmcNumber(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  const aNum = Number.isFinite(na) && /^\d+$/.test(a)
  const bNum = Number.isFinite(nb) && /^\d+$/.test(b)
  if (aNum && bNum) return na - nb
  if (aNum !== bNum) return aNum ? 1 : -1
  return a.localeCompare(b)
}

const QUERY_ALIASES: Record<string, string> = {
  blanc: 'white',
  snow: 'b5200',
}

/**
 * Search DMC threads by number ("310", "DMC 3713", "Blanc", "02") or name ("Beaver Gray", "Salmon").
 * Exact number matches rank first, then number prefixes, then name/family matches.
 */
export function searchDmcThreads(
  threads: readonly DMCThread[],
  rawQuery: string,
  limit = 24,
): DMCThread[] {
  const cleaned = rawQuery
    .trim()
    .toLowerCase()
    .replace(/^dmc[\s#:-]*/i, '')
    .replace(/^#/, '')
    .trim()

  if (!cleaned) return []

  const aliased = QUERY_ALIASES[cleaned] ?? cleaned
  const tokens = aliased.split(/\s+/).filter(Boolean)

  const scored: Array<{ thread: DMCThread; rank: number }> = []

  for (const thread of threads) {
    const num = thread.number.toLowerCase()
    const name = thread.name.toLowerCase()
    const family = thread.familyLabel.toLowerCase()

    let rank = 0
    if (num === aliased || num === cleaned) {
      rank = 1
    } else if (num.startsWith(aliased)) {
      rank = 2
    } else if (name === aliased || family === aliased) {
      rank = 3
    } else if (name.startsWith(aliased) || family.startsWith(aliased)) {
      rank = 4
    } else if (tokens.every((token) => num.includes(token) || name.includes(token) || family.includes(token))) {
      rank = 5
    }

    if (rank > 0) scored.push({ thread, rank })
  }

  scored.sort((a, b) =>
    a.rank - b.rank
    || compareDmcNumber(a.thread.number, b.thread.number),
  )

  return scored.slice(0, limit).map((entry) => entry.thread)
}

/** Nearest DMC substitutes for a thread, ranked by CIEDE2000 (excluding the thread itself). */
export function findSubstituteThreads(
  target: DMCThread,
  allThreads: readonly DMCThread[],
  count = 6,
): ScoredDMCThread[] {
  const others = allThreads.filter((thread) => thread.id !== target.id)
  return rankDmcThreadsByDeltaE(target.rgb, others).slice(0, Math.max(0, count))
}

/** Nearest DMC thread among the ones the stitcher already owns. */
export function findClosestOwnedThread(
  rgb: { r: number; g: number; b: number },
  allThreads: readonly DMCThread[],
  ownedNumbers: readonly string[],
  excludeNumber?: string,
): ScoredDMCThread | null {
  if (ownedNumbers.length === 0) return null
  const ownedSet = new Set(ownedNumbers.map((n) => n.trim().toLowerCase()))
  const pool = allThreads.filter((thread) =>
    ownedSet.has(thread.number.toLowerCase())
    && (!excludeNumber || thread.number.toLowerCase() !== excludeNumber.toLowerCase()),
  )
  if (pool.length === 0) return null
  return rankDmcThreadsByDeltaE(rgb, pool)[0] ?? null
}

export interface BridgeCandidate {
  thread: DMCThread
  /** 0 = at `from`, 0.5 = exact midpoint, 1 = at `to`. */
  position: number
  /** Perpendicular OKLab distance off the straight line from `from` to `to`. */
  deviation: number
  /** Composite blend score (lower is smoother). */
  score: number
}

export interface BridgeOptions {
  count?: number
  /** Prefer candidates whose warm/cool/neutral tone matches `from` or `to`. */
  sameTone?: boolean
}

/**
 * Finds DMC threads that sit smoothly between `from` and `to` in OKLab space,
 * for smoothing long-and-short stitch transitions.
 */
export function findBridgeThreads(
  from: DMCThread,
  to: DMCThread,
  allThreads: readonly DMCThread[],
  options: BridgeOptions = {},
): BridgeCandidate[] {
  const count = options.count ?? 5
  const sameTone = options.sameTone ?? false
  if (from.id === to.id || count <= 0) return []

  const dL = to.oklab.L - from.oklab.L
  const da = to.oklab.a - from.oklab.a
  const db = to.oklab.b - from.oklab.b
  const segLenSq = dL * dL + da * da + db * db
  if (segLenSq < 1e-8) return []
  const segLen = Math.sqrt(segLenSq)

  const minL = Math.min(from.oklab.L, to.oklab.L)
  const maxL = Math.max(from.oklab.L, to.oklab.L)
  const enforceValueOrder = maxL - minL >= 0.04
  const allowedTones = new Set<ThreadWarmth>([threadTone(from), threadTone(to)])

  const candidates: BridgeCandidate[] = []

  for (const thread of allThreads) {
    if (thread.id === from.id || thread.id === to.id) continue
    if (sameTone && !allowedTones.has(threadTone(thread))) continue

    if (enforceValueOrder && (thread.oklab.L <= minL + 0.005 || thread.oklab.L >= maxL - 0.005)) {
      continue
    }

    const vL = thread.oklab.L - from.oklab.L
    const va = thread.oklab.a - from.oklab.a
    const vb = thread.oklab.b - from.oklab.b
    const t = (vL * dL + va * da + vb * db) / segLenSq
    if (t < 0.12 || t > 0.88) continue

    const pL = vL - t * dL
    const pa = va - t * da
    const pb = vb - t * db
    const deviation = Math.hypot(pL, pa, pb)
    const centerBias = Math.abs(t - 0.5) * segLen * 0.35
    const score = deviation + centerBias

    candidates.push({ thread, position: t, deviation, score })
  }

  candidates.sort((a, b) => a.score - b.score || compareDmcNumber(a.thread.number, b.thread.number))
  return candidates.slice(0, count)
}

/** Perceptual grayscale hex matching SimpleCanvas's Value view luminance formula. */
export function threadValueHex(rgb: { r: number; g: number; b: number }): string {
  const gray = Math.round(linearToSRGB(getRelativeLuminance(rgb.r, rgb.g, rgb.b)) * 255)
  return rgbToHex(gray, gray, gray).toUpperCase()
}

/** Sort threads lightest → darkest by OKLab L. */
export function sortThreadsByValue<T extends { oklab: { L: number }; number: string }>(threads: readonly T[]): T[] {
  return [...threads].sort((a, b) => b.oklab.L - a.oklab.L || compareDmcNumber(a.number, b.number))
}

export type ValueGapKind = 'close' | 'smooth' | 'jump'

export interface ValueGap {
  fromIndex: number
  toIndex: number
  deltaL: number
  kind: ValueGapKind
}

const GAP_CLOSE_MAX = 0.03
const GAP_JUMP_MIN = 0.13

/** Inspects value steps between consecutive threads (assumed sorted light → dark). */
export function analyzeValueGaps(threads: readonly Pick<DMCThread, 'oklab'>[]): ValueGap[] {
  const gaps: ValueGap[] = []
  for (let i = 0; i < threads.length - 1; i++) {
    const deltaL = Math.abs(threads[i].oklab.L - threads[i + 1].oklab.L)
    const kind: ValueGapKind = deltaL < GAP_CLOSE_MAX ? 'close' : deltaL >= GAP_JUMP_MIN ? 'jump' : 'smooth'
    gaps.push({ fromIndex: i, toIndex: i + 1, deltaL, kind })
  }
  return gaps
}

export interface ThreadListItem {
  number: string
  name: string
  note?: string
  owned?: boolean
}

/** Clean plain-text list for Apple Notes, messages, or the craft store aisle. */
export function formatThreadList(
  items: readonly ThreadListItem[],
  options: { title?: string; includeChecklist?: boolean } = {},
): string {
  const lines: string[] = []
  if (options.title) lines.push(options.title)
  for (const item of items) {
    const box = options.includeChecklist ? (item.owned ? '[x] ' : '[ ] ') : ''
    const note = item.note?.trim() ? ` (${item.note.trim()})` : ''
    lines.push(`${box}DMC ${item.number} — ${item.name}${note}`)
  }
  return lines.join('\n')
}

const VALUE_SAMPLE_MAX_DIM = 96

/**
 * Computes photo-relative OKLab L anchors from an HTMLCanvasElement (downscaled to ≤96px)
 * so thread matching knows whether a sample is a highlight, midtone, or shadow in this photo.
 */
export function computeImageValueContextFromCanvas(source: HTMLCanvasElement | null): ImageValueContext | null {
  if (!source || source.width === 0 || source.height === 0) return null
  const scale = Math.min(1, VALUE_SAMPLE_MAX_DIM / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const temp = document.createElement('canvas')
  temp.width = width
  temp.height = height
  const ctx = temp.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(source, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  const values = new Float32Array(width * height)
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    values[count++] = rgbToOklabL({ r: data[i], g: data[i + 1], b: data[i + 2] })
  }
  if (count === 0) return null
  const trimmed = count === values.length ? values : values.subarray(0, count)
  trimmed.sort()
  return buildImageValueContext(trimmed, 0.02)
}
