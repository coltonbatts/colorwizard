/**
 * Monochrome / Value Ramp pool selection and monotonic OKLab L ramp builder.
 * Pure, deterministic, React-free.
 */

import { isGrayOrWhiteThread, threadTone } from '../studio'
import type { DMCThread, ImageOklabLRange } from '../types'
import type { MonochromeTone } from './types'

const CHROMATIC_OUTLIER_RE = /\b(green|blue|violet|lavender|pink|rose|grn)\b/i
const SEPIA_INCLUDE_RE = /\b(brown|mocha|sepia|beige|tan|ecru|coffee|cocoa|chestnut|hazel|taupe|fawn|drab|khaki|umber|driftwood|cream|off white|winter white|black brown)\b/i
const SEPIA_EXCLUDE_RE = /\b(green|blue|violet|lavender|pink|rose|grn|salmon|peach|apricot|shrimp|blossom|garnet|mauve|olive|mustard|yellow|orange|red|gold)\b/i

/** Warm gray highlight/dark anchors that sit cleanly at the extremes of a warm grayscale piece. */
const WARM_GRAY_ANCHORS = new Set(['White', '3371', '310'])
/** Neutral gray anchors (White through Black). */
const NEUTRAL_GRAY_ANCHORS = new Set(['White', 'B5200', '310'])
/** Cool gray highlight/mid/dark anchors from DMC's Snow White / Pearl / Pewter / Tin / Black families. */
const COOL_GRAY_ANCHORS = new Set(['B5200', 'White', '762', '01', '02', '03', '169', '3799', '310'])
/** Sepia/earth highlight & deepest dark anchors. */
const SEPIA_ANCHORS = new Set(['746', '3865', 'Ecru', '712', '3371'])

const SEPIA_MAX_CHROMA = 0.085
const MIN_VALUE_STEP = 0.015
const FALLBACK_VALUE_STEP = 0.001
const OWNED_VALUE_BONUS = 0.018
const APPROXIMATE_VALUE_PENALTY = 0.008

function compareDmcNumber(a: string, b: string): number {
  const na = Number(a)
  const nb = Number(b)
  const aNum = Number.isFinite(na) && /^\d+$/.test(a)
  const bNum = Number.isFinite(nb) && /^\d+$/.test(b)
  if (aNum && bNum) return na - nb
  if (aNum !== bNum) return aNum ? 1 : -1
  return a.localeCompare(b)
}

/** Returns the curated DMC thread pool for a Monochrome tone preset, ordered lightest → darkest. */
export function getMonochromePool(allThreads: readonly DMCThread[], tone: MonochromeTone): DMCThread[] {
  let pool: DMCThread[]

  switch (tone) {
    case 'warm-grays':
      pool = allThreads.filter((thread) =>
        WARM_GRAY_ANCHORS.has(thread.number)
        || (isGrayOrWhiteThread(thread) && threadTone(thread) === 'warm'),
      )
      break

    case 'neutral-grays':
      pool = allThreads.filter((thread) => {
        if (NEUTRAL_GRAY_ANCHORS.has(thread.number)) return true
        if (!isGrayOrWhiteThread(thread)) return false
        if (CHROMATIC_OUTLIER_RE.test(thread.name)) return false
        if (thread.number === '3371') return false
        return threadTone(thread) === 'neutral'
      })
      break

    case 'cool-grays':
      pool = allThreads.filter((thread) => {
        if (COOL_GRAY_ANCHORS.has(thread.number)) return true
        if (!isGrayOrWhiteThread(thread)) return false
        if (CHROMATIC_OUTLIER_RE.test(thread.name)) return false
        return threadTone(thread) === 'cool'
      })
      break

    case 'sepia-browns':
      pool = allThreads.filter((thread) => {
        if (SEPIA_ANCHORS.has(thread.number)) return true
        if (SEPIA_EXCLUDE_RE.test(thread.name)) return false
        if (!SEPIA_INCLUDE_RE.test(thread.name)) return false
        const chroma = Math.hypot(thread.oklab.a, thread.oklab.b)
        return chroma <= SEPIA_MAX_CHROMA && thread.oklab.b >= 0.004
      })
      break
  }

  return pool.sort((a, b) => b.oklab.L - a.oklab.L || compareDmcNumber(a.number, b.number))
}

/**
 * Selects `steps` monotonically ordered (strictly decreasing OKLab L) threads from `pool`
 * that evenly span the photo's clipped OKLab L range without duplicate-value clusters.
 * Uses deterministic dynamic programming over the sorted pool.
 */
export function selectMonochromeRamp(
  pool: readonly DMCThread[],
  range: ImageOklabLRange,
  steps: number,
  options: { preferBox?: boolean; ownedNumbers?: readonly string[] } = {},
): DMCThread[] {
  if (pool.length === 0 || steps <= 0) return []
  const sorted = [...pool].sort((a, b) => b.oklab.L - a.oklab.L || compareDmcNumber(a.number, b.number))
  const count = Math.min(steps, sorted.length)
  if (count === 1) {
    const mid = (range.min + range.max) / 2
    return [sorted.reduce((best, t) =>
      Math.abs(t.oklab.L - mid) < Math.abs(best.oklab.L - mid) ? t : best,
    )]
  }

  // Clamp targets to the pool's achievable L span while honoring the photo's actual value range.
  const poolMax = sorted[0].oklab.L
  const poolMin = sorted[sorted.length - 1].oklab.L
  const hi = Math.min(poolMax, Math.max(poolMin, range.max))
  const lo = Math.min(hi, Math.max(poolMin, range.min))

  // If the photo has a very narrow value span, center targets gently so we still produce distinct steps.
  const minSpan = Math.min(poolMax - poolMin, (count - 1) * MIN_VALUE_STEP)
  let top = hi
  let bottom = lo
  if (top - bottom < minSpan) {
    const center = (hi + lo) / 2
    top = Math.min(poolMax, center + minSpan / 2)
    bottom = Math.max(poolMin, top - minSpan)
    top = Math.min(poolMax, bottom + minSpan)
  }

  const targets = Array.from({ length: count }, (_, k) =>
    top - (k / (count - 1)) * (top - bottom),
  )

  const ownedSet = options.preferBox && options.ownedNumbers?.length
    ? new Set(options.ownedNumbers.map((n) => n.trim().toLowerCase()))
    : null

  const slotCost = (thread: DMCThread, targetL: number): number => {
    const diff = Math.abs(thread.oklab.L - targetL)
    let cost = diff + diff * diff * 2.5
    if (ownedSet?.has(thread.number.toLowerCase())) cost -= OWNED_VALUE_BONUS
    if (thread.colorConfidence === 'approximate') cost += APPROXIMATE_VALUE_PENALTY
    return cost
  }

  // Try with strict MIN_VALUE_STEP first; relax to FALLBACK_VALUE_STEP only if the pool cannot fit `count` steps.
  for (const minGap of [MIN_VALUE_STEP, FALLBACK_VALUE_STEP, 0]) {
    const m = sorted.length
    const dp = Array.from({ length: count }, () => new Float64Array(m).fill(Infinity))
    const prev = Array.from({ length: count }, () => new Int32Array(m).fill(-1))

    for (let j = 0; j < m; j++) {
      dp[0][j] = slotCost(sorted[j], targets[0])
    }

    for (let k = 1; k < count; k++) {
      for (let j = k; j < m; j++) {
        const c = slotCost(sorted[j], targets[k])
        let bestPrev = -1
        let bestVal = Infinity
        for (let i = k - 1; i < j; i++) {
          if (!Number.isFinite(dp[k - 1][i])) continue
          const gap = sorted[i].oklab.L - sorted[j].oklab.L
          if (gap < minGap) continue
          const candidate = dp[k - 1][i] + c
          if (candidate < bestVal - 1e-12) {
            bestVal = candidate
            bestPrev = i
          }
        }
        if (bestPrev >= 0) {
          dp[k][j] = bestVal
          prev[k][j] = bestPrev
        }
      }
    }

    let endIdx = -1
    let bestTotal = Infinity
    for (let j = count - 1; j < m; j++) {
      if (dp[count - 1][j] < bestTotal - 1e-12) {
        bestTotal = dp[count - 1][j]
        endIdx = j
      }
    }

    if (endIdx >= 0) {
      const chosenIndices = new Array<number>(count)
      let cur = endIdx
      for (let k = count - 1; k >= 0; k--) {
        chosenIndices[k] = cur
        cur = prev[k][cur]
      }
      return chosenIndices.map((idx) => sorted[idx])
    }
  }

  return sorted.slice(0, count)
}
