/**
 * Pure, deterministic Painterly Thread Map & Monochrome Value Ramp engine.
 * Reuses Paint Plan's histogram and CIEDE2000 primitives without modifying them.
 * React-free and Web-Worker safe.
 *
 * Key properties:
 * - Zero-allocation IEC 61966-2-1 sRGB -> CIELAB (D65) for fast 1024 px assignment.
 * - Anchor-seeded monotonic progressive palette ladder: moving the thread-count slider
 *   adds or removes a single skein at a time instead of reshuffling the entire palette.
 * - Explicit `paletteNumbers` support so switching Crisp / Painterly / Broad or scrubbing
 *   the slider reuses the exact same stable palette instantaneously.
 */

import { rgbToHex } from '@/lib/paint/plan/color'
import { ciede2000 } from '@/lib/paint/plan/deltaE'
import { buildHistogram, coarsenHistogram, type Histogram } from '@/lib/paint/plan/histogram'
import type { DMCThread, ImageOklabLRange } from '../types'
import { getMonochromePool, selectMonochromeRamp } from './monochrome'
import { smoothSlotMap } from './smooth'
import {
  DEFAULT_FULL_COLOR_BUDGET,
  DEFAULT_THREAD_MAP_DETAIL,
  DEFAULT_THREAD_MAP_FIDELITY,
  FULL_COLOR_MAX,
  NO_THREAD,
  VISIBLE_THREAD_MISS,
  type ThreadMapFidelity,
  type ThreadMapOptions,
  type ThreadMapResult,
  type ThreadMapScore,
  type ThreadMapSlot,
} from './types'

/** Perceptual CIEDE2000 lightness weight (legacy export kept for tests/callers). */
export const VALUE_PRIORITY_KL = 0.9

/** Gentle CIEDE2000 preference bonus for owned DMC threads when "Prefer my box" is active. */
export const PREFER_BOX_DELTA_E_BONUS = 1.75

/** Maximum coarsened colors for Full Color palette fitting (scores always use full histogram). */
const FIT_MAX_COLORS = 720

/** Stop adding Full Color threads only when an extra skein offers virtually no improvement (e.g. solid patch). */
const MIN_MEDOID_GAIN = 0.004

const MAX_SWAP_ITERATIONS = 25

interface FidelityConfig {
  areaCompression: number
  chromaSalience: number
  kL: number
}

const FIDELITY_CONFIGS: Record<ThreadMapFidelity, FidelityConfig> = {
  // True to photo: prioritizes natural midtones, skin, skies, and balanced visual area.
  faithful: {
    areaCompression: 0.94,
    chromaSalience: 1.6,
    kL: 1.0,
  },
  // Vibrant accents: gives extra palette slots to small, vivid highlights and chromatic details.
  balanced: {
    areaCompression: 0.82,
    chromaSalience: 4.5,
    kL: 0.9,
  },
}

/* ---------- Fast, zero-allocation sRGB (0..255) -> CIELAB (D65) ---------- */

const SRGB_TO_LIN = new Float64Array(256)
for (let i = 0; i < 256; i++) {
  const c = i / 255
  SRGB_TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const LAB_EPSILON = 216 / 24389
const LAB_KAPPA = 24389 / 27
const INV_D65_X = 1 / 0.9504559270516716
const INV_D65_Z = 1 / 1.0890577507598784

function labF(t: number): number {
  return t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116
}

/** Converts 8-bit sRGB directly into CIELAB D65 `[L, a, b]` (matches culori `lab65`). */
export function srgb8ToLab65(r: number, g: number, b: number): [number, number, number] {
  const lr = SRGB_TO_LIN[r]
  const lg = SRGB_TO_LIN[g]
  const lb = SRGB_TO_LIN[b]
  const x = (0.4123907992659595 * lr + 0.357584339383878 * lg + 0.1804807884018343 * lb) * INV_D65_X
  const y = 0.21263900587151036 * lr + 0.715168678767756 * lg + 0.07219231536073371 * lb
  const z = (0.01933081871559185 * lr + 0.11919477979462599 * lg + 0.9505321522496607 * lb) * INV_D65_Z
  const fx = labF(x)
  const fy = labF(y)
  const fz = labF(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

type LabTuple = [number, number, number]

const threadLabCache = new WeakMap<DMCThread, LabTuple>()

function getThreadLab(thread: DMCThread): LabTuple {
  let cached = threadLabCache.get(thread)
  if (!cached) {
    cached = srgb8ToLab65(thread.rgb.r, thread.rgb.g, thread.rgb.b)
    threadLabCache.set(thread, cached)
  }
  return cached
}

function computeHistogramLab(hist: Histogram): Float64Array {
  const labs = new Float64Array(hist.size * 3)
  for (let i = 0; i < hist.size; i++) {
    const lr = SRGB_TO_LIN[hist.rgb[i * 3]]
    const lg = SRGB_TO_LIN[hist.rgb[i * 3 + 1]]
    const lb = SRGB_TO_LIN[hist.rgb[i * 3 + 2]]
    const fx = labF((0.4123907992659595 * lr + 0.357584339383878 * lg + 0.1804807884018343 * lb) * INV_D65_X)
    const fy = labF(0.21263900587151036 * lr + 0.715168678767756 * lg + 0.07219231536073371 * lb)
    const fz = labF((0.01933081871559185 * lr + 0.11919477979462599 * lg + 0.9505321522496607 * lb) * INV_D65_Z)
    labs[i * 3] = 116 * fy - 16
    labs[i * 3 + 1] = 500 * (fx - fy)
    labs[i * 3 + 2] = 200 * (fy - fz)
  }
  return labs
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

function sortThreadsLightToDark(threads: readonly DMCThread[]): DMCThread[] {
  return [...threads].sort((a, b) => b.oklab.L - a.oklab.L || compareDmcNumber(a.number, b.number))
}

/** Computes the 2%-clipped OKLab L range of a histogram (matches `computeImageOklabLRange`). */
export function computeHistogramOklabLRange(hist: Histogram, clipPercent = 0.02): ImageOklabLRange {
  if (hist.size === 0 || hist.total <= 0) return { min: 0, max: 1 }
  const order = Array.from({ length: hist.size }, (_, i) => i)
    .sort((a, b) => hist.oklab[a * 3] - hist.oklab[b * 3])
  const lowRank = Math.floor(hist.total * clipPercent)
  const highRank = Math.min(hist.total - 1, Math.ceil(hist.total * (1 - clipPercent)) - 1)

  let seen = 0
  let min = hist.oklab[order[0] * 3]
  let max = hist.oklab[order[order.length - 1] * 3]
  let foundMin = false

  for (const idx of order) {
    seen += hist.count[idx]
    if (!foundMin && seen > lowRank) {
      min = hist.oklab[idx * 3]
      foundMin = true
    }
    if (seen > highRank) {
      max = hist.oklab[idx * 3]
      break
    }
  }
  return { min, max }
}

/**
 * Builds a deterministic, strictly monotonic progressive DMC palette ladder (`2 .. maxBudget`):
 * 1. Globally optimizes a strong anchor palette at `anchorBudget` via deterministic k-medoids swap refinement
 *    (eliminating the "muddy average k=1" artifact while keeping locked threads fixed).
 * 2. Backward-prunes the anchor monotonically down to 1 by always removing the least-essential non-locked
 *    thread (exact O(n) 1st/2nd-nearest delta cost).
 * 3. Forward-grows monotonically from `anchorBudget` up to `maxBudget` by always adding the single skein
 *    that cuts the largest remaining perceptual error cluster.
 *
 * Result: for any `k < k'`, `ladder.slice(0, k) ⊂ ladder.slice(0, k')`, so sliding the thread-count
 * slider adds or removes exactly one thread per step with zero jarring whole-palette reshuffling.
 */
function selectFullColorLadder(
  fitHist: Histogram,
  allThreads: readonly DMCThread[],
  maxBudget: number,
  ownedSet: Set<string> | null,
  lockedNumbers: readonly string[] | undefined,
  fidelity: ThreadMapFidelity,
  anchorBudget: number,
): DMCThread[] {
  const n = fitHist.size
  const m = allThreads.length
  if (n === 0 || m === 0 || maxBudget <= 0) return []

  const cfg = FIDELITY_CONFIGS[fidelity] ?? FIDELITY_CONFIGS.faithful
  const effectiveMax = Math.min(maxBudget, m)
  const fitLabs = computeHistogramLab(fitHist)
  const threadLabs = allThreads.map(getThreadLab)

  const weight = new Float64Array(n)
  let weightSum = 0
  for (let i = 0; i < n; i++) {
    const a = fitHist.oklab[i * 3 + 1]
    const b = fitHist.oklab[i * 3 + 2]
    const chroma = Math.hypot(a, b)
    const w = Math.pow(fitHist.count[i], cfg.areaCompression) * (1 + cfg.chromaSalience * chroma)
    weight[i] = w
    weightSum += w
  }
  if (weightSum > 0) {
    for (let i = 0; i < n; i++) weight[i] /= weightSum
  }

  const hasBoxPreference = Boolean(ownedSet && ownedSet.size > 0)
  const unownedPenalty = new Float32Array(m)
  if (hasBoxPreference) {
    for (let c = 0; c < m; c++) {
      if (!ownedSet!.has(allThreads[c].number.toLowerCase())) {
        unownedPenalty[c] = PREFER_BOX_DELTA_E_BONUS
      }
    }
  }

  // Cost matrix [i * m + c]: perceptual CIEDE2000 with gentle owned-thread preference.
  const cost = new Float32Array(n * m)
  for (let i = 0; i < n; i++) {
    const l1 = fitLabs[i * 3]
    const a1 = fitLabs[i * 3 + 1]
    const b1 = fitLabs[i * 3 + 2]
    const row = i * m
    for (let c = 0; c < m; c++) {
      const [l2, a2, b2] = threadLabs[c]
      cost[row + c] = ciede2000(l1, a1, b1, l2, a2, b2, cfg.kL) + unownedPenalty[c]
    }
  }

  // 1. Seed fixed medoids for stitcher-locked DMC threads.
  const chosen: number[] = []
  const chosenFlag = new Uint8Array(m)
  const lockedFlag = new Uint8Array(m)
  const currentBest = new Float64Array(n).fill(Infinity)
  const gain = new Float64Array(m)

  if (lockedNumbers && lockedNumbers.length > 0) {
    const idxByNumber = new Map<string, number>()
    for (let c = 0; c < m; c++) {
      idxByNumber.set(allThreads[c].number.toLowerCase(), c)
    }
    for (const raw of lockedNumbers) {
      if (chosen.length >= effectiveMax) break
      const idx = idxByNumber.get(raw.trim().toLowerCase())
      if (idx === undefined || chosenFlag[idx]) continue
      chosen.push(idx)
      chosenFlag[idx] = 1
      lockedFlag[idx] = 1
      for (let i = 0; i < n; i++) {
        const d = cost[i * m + idx]
        if (d < currentBest[i]) currentBest[i] = d
      }
    }
  }

  const lockedCount = chosen.length
  const baseK = Math.min(effectiveMax, Math.max(2, anchorBudget, lockedCount))

  // Greedy forward init up to anchor size `baseK`.
  const greedyStep = (): boolean => {
    gain.fill(0)
    if (chosen.length === 0) {
      for (let i = 0; i < n; i++) {
        const w = weight[i]
        const row = i * m
        for (let c = 0; c < m; c++) gain[c] -= w * cost[row + c]
      }
    } else {
      for (let i = 0; i < n; i++) {
        const w = weight[i]
        const cur = currentBest[i]
        const row = i * m
        for (let c = 0; c < m; c++) {
          const d = cur - cost[row + c]
          if (d > 0) gain[c] += w * d
        }
      }
    }

    let best = -1
    let bestGain = -Infinity
    for (let c = 0; c < m; c++) {
      if (chosenFlag[c]) continue
      if (gain[c] > bestGain + 1e-12) {
        bestGain = gain[c]
        best = c
      }
    }
    if (best < 0) return false
    if (chosen.length > 0 && bestGain < MIN_MEDOID_GAIN) return false

    chosen.push(best)
    chosenFlag[best] = 1
    for (let i = 0; i < n; i++) {
      const d = cost[i * m + best]
      if (d < currentBest[i]) currentBest[i] = d
    }
    return true
  }

  while (chosen.length < baseK) {
    if (!greedyStep()) break
  }

  // 2. Deterministic k-medoids swap refinement on the anchor palette (locked medoids stay fixed).
  const assignment = new Uint16Array(n)
  const assignAnchor = (): boolean => {
    let changed = false
    for (let i = 0; i < n; i++) {
      let bestP = 0
      let bestD = Infinity
      const row = i * m
      for (let p = 0; p < chosen.length; p++) {
        const d = cost[row + chosen[p]]
        if (d < bestD - 1e-12) {
          bestD = d
          bestP = p
        }
      }
      if (assignment[i] !== bestP) changed = true
      assignment[i] = bestP
    }
    return changed
  }

  if (chosen.length > 0) {
    assignAnchor()
    const clusterCost = new Float64Array(m)
    for (let iter = 0; iter < MAX_SWAP_ITERATIONS; iter++) {
      let replaced = false
      for (let p = 0; p < chosen.length; p++) {
        const prevC = chosen[p]
        if (lockedFlag[prevC]) continue

        clusterCost.fill(0)
        let clusterWeight = 0
        for (let i = 0; i < n; i++) {
          if (assignment[i] !== p) continue
          const w = weight[i]
          clusterWeight += w
          const row = i * m
          for (let c = 0; c < m; c++) clusterCost[c] += w * cost[row + c]
        }
        if (clusterWeight <= 0) continue

        let bestC = prevC
        let bestVal = clusterCost[prevC]
        for (let c = 0; c < m; c++) {
          if (c !== prevC && chosenFlag[c]) continue
          if (clusterCost[c] < bestVal - 1e-10) {
            bestVal = clusterCost[c]
            bestC = c
          }
        }
        if (bestC !== prevC) {
          chosenFlag[prevC] = 0
          chosenFlag[bestC] = 1
          chosen[p] = bestC
          replaced = true
        }
      }
      const reassigned = assignAnchor()
      if (!replaced && !reassigned) break
    }
  }

  // 3. Backward monotonic pruning of the anchor set to produce an importance-ordered prefix.
  const remaining = [...chosen]
  const prunedOrder: number[] = []
  const removalPenalty = new Float64Array(remaining.length)

  while (remaining.length > Math.max(1, lockedCount)) {
    const rLen = remaining.length
    removalPenalty.fill(0, 0, rLen)

    for (let i = 0; i < n; i++) {
      const row = i * m
      let bestPos = 0
      let best1 = Infinity
      let best2 = Infinity
      for (let p = 0; p < rLen; p++) {
        const d = cost[row + remaining[p]]
        if (d < best1) {
          best2 = best1
          best1 = d
          bestPos = p
        } else if (d < best2) {
          best2 = d
        }
      }
      removalPenalty[bestPos] += weight[i] * (best2 - best1)
    }

    let worstPos = -1
    let minPenalty = Infinity
    for (let p = 0; p < rLen; p++) {
      if (lockedFlag[remaining[p]]) continue
      const pen = removalPenalty[p]
      if (pen < minPenalty - 1e-12) {
        minPenalty = pen
        worstPos = p
      }
    }
    if (worstPos < 0) break
    prunedOrder.push(remaining[worstPos])
    remaining.splice(worstPos, 1)
  }

  // Ordered anchor prefix: locked threads first, then most essential survivors, then pruned in reverse.
  const ladderIndices: number[] = [...remaining]
  for (let i = prunedOrder.length - 1; i >= 0; i--) {
    ladderIndices.push(prunedOrder[i])
  }

  // 4. Forward monotonic growth from `anchor` up to `effectiveMax`.
  if (ladderIndices.length < effectiveMax) {
    for (let i = 0; i < n; i++) {
      const row = i * m
      let bestD = Infinity
      for (let p = 0; p < chosen.length; p++) {
        const d = cost[row + chosen[p]]
        if (d < bestD) bestD = d
      }
      currentBest[i] = bestD
    }
    while (chosen.length < effectiveMax) {
      const prevLen = chosen.length
      if (!greedyStep()) break
      ladderIndices.push(chosen[prevLen])
    }
  }

  return ladderIndices.map((idx) => allThreads[idx])
}

/**
 * Computes a deterministic ordered DMC thread ladder (`2 .. maxBudget`) from canonical photo pixels.
 * Suitable for caching in a Web Worker so sliding the thread-count slider (`2..30`) or switching
 * detail presets (`Crisp / Painterly / Broad`) stays 100% monotonic and near-instant.
 */
export function buildThreadLadder(
  rgba: ArrayLike<number>,
  allThreads: readonly DMCThread[],
  options: {
    maxBudget?: number
    fidelity?: ThreadMapFidelity
    preferBox?: boolean
    ownedNumbers?: readonly string[]
    lockedNumbers?: readonly string[]
    anchorBudget?: number
  } = {},
): string[] {
  const hist = buildHistogram(rgba)
  if (hist.size === 0 || allThreads.length === 0) return []
  const fidelity = options.fidelity ?? DEFAULT_THREAD_MAP_FIDELITY
  const preferBox = Boolean(options.preferBox && options.ownedNumbers && options.ownedNumbers.length > 0)
  const ownedSet = preferBox
    ? new Set(options.ownedNumbers!.map((n) => n.trim().toLowerCase()))
    : null
  const fitHist = coarsenHistogram(hist, FIT_MAX_COLORS)
  const maxBudget = options.maxBudget ?? FULL_COLOR_MAX
  const anchorBudget = options.anchorBudget ?? DEFAULT_FULL_COLOR_BUDGET

  return selectFullColorLadder(
    fitHist,
    allThreads,
    maxBudget,
    ownedSet,
    options.lockedNumbers,
    fidelity,
    anchorBudget,
  ).map((t) => t.number)
}

interface InitialAssignment {
  slot: Uint8Array
  histSlot: Uint8Array
  histBestDE: Float32Array
}

interface ScoredAssignment {
  slots: ThreadMapSlot[]
  slot: Uint8Array
  visiblyOff: Uint8Array
  score: ThreadMapScore
}

function buildPixelHistIndex(
  rgba: ArrayLike<number>,
  pixelCount: number,
  hist: Histogram,
): Int32Array {
  const entryOf = new Map<number, number>()
  for (let i = 0; i < hist.size; i++) {
    entryOf.set(
      (hist.rgb[i * 3] << 16) | (hist.rgb[i * 3 + 1] << 8) | hist.rgb[i * 3 + 2],
      i,
    )
  }
  const pixelHistIdx = new Int32Array(pixelCount).fill(-1)
  for (let p = 0; p < pixelCount; p++) {
    if (rgba[p * 4 + 3] < 128) continue
    const hi = entryOf.get((rgba[p * 4] << 16) | (rgba[p * 4 + 1] << 8) | rgba[p * 4 + 2])
    if (hi !== undefined) pixelHistIdx[p] = hi
  }
  return pixelHistIdx
}

/**
 * Assigns every opaque pixel to its nearest thread in `threads` (unsmoothed),
 * also caching each histogram color's exact CIEDE2000 for its assigned thread so
 * subsequent scoring skips ~95% of CIEDE2000 evaluations even on 1024 px photos.
 */
function assignInitialSlots(
  pixelCount: number,
  pixelHistIdx: Int32Array,
  hist: Histogram,
  histLabs: Float64Array,
  threads: readonly DMCThread[],
  threadLabs: readonly LabTuple[],
  mode: 'full-color' | 'monochrome',
): InitialAssignment {
  const k = threads.length
  const histSlot = new Uint8Array(hist.size)
  const histBestDE = new Float32Array(hist.size).fill(-1)

  for (let i = 0; i < hist.size; i++) {
    const l = histLabs[i * 3]
    const a = histLabs[i * 3 + 1]
    const b = histLabs[i * 3 + 2]
    const okL = hist.oklab[i * 3]
    let best = 0
    let bestDist = Infinity

    if (mode === 'monochrome') {
      for (let s = 0; s < k; s++) {
        const d = Math.abs(okL - threads[s].oklab.L)
        if (d < bestDist - 1e-12) {
          bestDist = d
          best = s
        }
      }
      const [tl, ta, tb] = threadLabs[best]
      histBestDE[i] = ciede2000(l, a, b, tl, ta, tb, 1)
    } else {
      for (let s = 0; s < k; s++) {
        const [tl, ta, tb] = threadLabs[s]
        const d = ciede2000(l, a, b, tl, ta, tb, 1)
        if (d < bestDist - 1e-12) {
          bestDist = d
          best = s
        }
      }
      histBestDE[i] = bestDist
    }
    histSlot[i] = best
  }

  const slot = new Uint8Array(pixelCount).fill(NO_THREAD)
  for (let p = 0; p < pixelCount; p++) {
    const hi = pixelHistIdx[p]
    if (hi >= 0) slot[p] = histSlot[hi]
  }
  return { slot, histSlot, histBestDE }
}

export interface PreparedThreadMapPixels {
  readonly pixelCount: number
  readonly hist: Histogram
  readonly histLabs: Float64Array
  readonly pixelHistIdx: Int32Array
}

/**
 * Precomputes histogram, CIELAB values, and pixel-to-histogram lookup for an immutable RGBA buffer
 * so repeated in-place thread swaps, reverts, and Undo/Redo re-score in a few milliseconds.
 */
export function prepareThreadMapPixels(
  rgba: ArrayLike<number>,
  pixelCount = Math.floor(rgba.length / 4),
): PreparedThreadMapPixels | null {
  const hist = buildHistogram(rgba)
  if (hist.size === 0) return null
  return {
    pixelCount,
    hist,
    histLabs: computeHistogramLab(hist),
    pixelHistIdx: buildPixelHistIndex(rgba, pixelCount, hist),
  }
}

/**
 * Honestly scores a final `slot` map against the ORIGINAL unsmoothed `rgba` pixels.
 * Every metric (`meanDeltaE00`, `p95DeltaE00`, `meanDeltaL`, `visiblyOffArea`, per-slot
 * `area`, `targetHex`, and per-pixel `visiblyOff`) is measured against the true photo pixels
 * so spatial smoothing and in-place substitutions never fake accuracy.
 */
function scoreSlotMap(
  rgba: ArrayLike<number>,
  pixelCount: number,
  pixelHistIdx: Int32Array,
  hist: Histogram,
  histLabs: Float64Array,
  threads: readonly DMCThread[],
  threadLabs: readonly LabTuple[],
  slot: Uint8Array,
  mode: 'full-color' | 'monochrome',
  swappedFlags?: readonly boolean[],
  precomputed?: { histSlot: Uint8Array; histBestDE: Float32Array } | null,
  originalThreads?: readonly (DMCThread | undefined)[],
  overriddenSlots?: readonly boolean[],
): ScoredAssignment {
  const k = threads.length
  const areaCount = new Float64Array(k)
  const deltaESum = new Float64Array(k)
  const deltaLSum = new Float64Array(k)
  const rgbSumR = new Float64Array(k)
  const rgbSumG = new Float64Array(k)
  const rgbSumB = new Float64Array(k)

  let totalDeltaE = 0
  let totalDeltaL = 0
  let offCount = 0

  const visiblyOff = new Uint8Array(pixelCount)
  const pixelDeltaE = new Float32Array(hist.total)
  let opaqueIdx = 0

  // Lazy cache for CIEDE2000 per (histogramColor, slot) pair for smoothed boundary pixels & substituted slots.
  const useCache = hist.size * k <= 4_500_000
  const deCache = useCache ? new Float32Array(hist.size * k).fill(-1) : null
  const preSlot = precomputed?.histSlot ?? null
  const preDE = precomputed?.histBestDE ?? null

  for (let p = 0; p < pixelCount; p++) {
    const s = slot[p]
    if (s === NO_THREAD || s >= k) continue
    const hi = pixelHistIdx[p]
    if (hi < 0) continue
    const o = p * 4

    let dE: number
    if (preSlot && preDE && preSlot[hi] === s && preDE[hi] >= 0 && !overriddenSlots?.[s]) {
      dE = preDE[hi]
    } else if (deCache) {
      const cacheIdx = hi * k + s
      const cached = deCache[cacheIdx]
      if (cached >= 0) {
        dE = cached
      } else {
        const [tl, ta, tb] = threadLabs[s]
        dE = ciede2000(histLabs[hi * 3], histLabs[hi * 3 + 1], histLabs[hi * 3 + 2], tl, ta, tb, 1)
        deCache[cacheIdx] = dE
      }
    } else {
      const [tl, ta, tb] = threadLabs[s]
      dE = ciede2000(histLabs[hi * 3], histLabs[hi * 3 + 1], histLabs[hi * 3 + 2], tl, ta, tb, 1)
    }

    const dL = Math.abs(hist.oklab[hi * 3] - threads[s].oklab.L)

    areaCount[s] += 1
    deltaESum[s] += dE
    deltaLSum[s] += dL
    rgbSumR[s] += rgba[o]
    rgbSumG[s] += rgba[o + 1]
    rgbSumB[s] += rgba[o + 2]
    totalDeltaE += dE
    totalDeltaL += dL
    if (mode === 'full-color' && dE > VISIBLE_THREAD_MISS) {
      visiblyOff[p] = 1
      offCount += 1
    }
    if (opaqueIdx < pixelDeltaE.length) pixelDeltaE[opaqueIdx++] = dE
  }

  const activeDeltaE = opaqueIdx === pixelDeltaE.length ? pixelDeltaE : pixelDeltaE.subarray(0, opaqueIdx)
  activeDeltaE.sort()
  const p95DeltaE00 = activeDeltaE.length > 0
    ? activeDeltaE[Math.min(activeDeltaE.length - 1, Math.max(0, Math.ceil(0.95 * activeDeltaE.length) - 1))]
    : 0

  const totalOpaque = opaqueIdx > 0 ? opaqueIdx : 1
  const slots: ThreadMapSlot[] = threads.map((thread, index) => {
    const n = areaCount[index]
    const targetHex = n > 0
      ? rgbToHex(
        Math.round(rgbSumR[index] / n),
        Math.round(rgbSumG[index] / n),
        Math.round(rgbSumB[index] / n),
      )
      : thread.hex
    const orig = originalThreads?.[index]
    return {
      index,
      thread,
      area: n / totalOpaque,
      meanDeltaE00: n > 0 ? deltaESum[index] / n : NaN,
      meanDeltaL: n > 0 ? deltaLSum[index] / n : NaN,
      targetHex,
      swapped: swappedFlags?.[index] ?? false,
      ...(orig && orig.id !== thread.id ? { originalThread: orig } : {}),
    }
  })

  const approxNumbers = new Set<string>()
  for (const s of slots) {
    if (s.thread.colorConfidence === 'approximate') {
      approxNumbers.add(s.thread.number.toLowerCase())
    }
  }

  const score: ThreadMapScore = {
    threadCount: slots.length,
    meanDeltaE00: totalDeltaE / totalOpaque,
    p95DeltaE00,
    meanDeltaL: totalDeltaL / totalOpaque,
    visiblyOffArea: mode === 'full-color' ? offCount / totalOpaque : 0,
    approximateThreads: approxNumbers.size,
  }

  return { slots, slot, visiblyOff, score }
}

/**
 * Builds a complete, deterministic Painterly Thread Map from RGBA image pixels and the DMC catalog.
 */
export function buildThreadMap(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  allThreads: readonly DMCThread[],
  options: ThreadMapOptions,
): ThreadMapResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const hist = buildHistogram(rgba)
  if (hist.size === 0) throw new Error('The picture has no visible pixels')
  if (allThreads.length === 0) throw new Error('The DMC catalog is empty')

  const detail = options.detail ?? DEFAULT_THREAD_MAP_DETAIL
  const fidelity = options.fidelity ?? DEFAULT_THREAD_MAP_FIDELITY
  const imageOklabLRange = computeHistogramOklabLRange(hist, 0.02)
  const preferBox = Boolean(options.preferBox && options.ownedNumbers && options.ownedNumbers.length > 0)
  const ownedSet = preferBox
    ? new Set(options.ownedNumbers!.map((n) => n.trim().toLowerCase()))
    : null
  const lockedSet = new Set((options.lockedNumbers ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean))
  const swappedSet = new Set((options.swappedNumbers ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean))

  const overrideMap = new Map<string, string>()
  if (options.mode === 'full-color' && options.swapOverrides) {
    for (const [rawBase, rawNext] of Object.entries(options.swapOverrides)) {
      const baseKey = rawBase.trim().toLowerCase()
      const nextKey = rawNext.trim().toLowerCase()
      if (baseKey && nextKey && baseKey !== nextKey) {
        overrideMap.set(baseKey, nextKey)
      }
    }
  }

  let byNumber: Map<string, DMCThread> | null = null
  const getByNumber = (): Map<string, DMCThread> => {
    if (!byNumber) {
      byNumber = new Map<string, DMCThread>()
      for (let i = 0; i < allThreads.length; i++) {
        byNumber.set(allThreads[i].number.toLowerCase(), allThreads[i])
      }
    }
    return byNumber
  }

  let chosenThreads: DMCThread[]
  let ladderNumbers: string[] | undefined
  const monochromeTone = options.mode === 'monochrome' ? (options.monochromeTone ?? 'warm-grays') : null

  if (options.mode === 'monochrome') {
    const pool = getMonochromePool(allThreads, monochromeTone!)
    chosenThreads = selectMonochromeRamp(pool, imageOklabLRange, options.budget, {
      preferBox,
      ownedNumbers: options.ownedNumbers,
    })
  } else if (options.paletteNumbers && options.paletteNumbers.length > 0) {
    // Explicit precomputed base palette (monotonic ladder slice).
    const lookup = getByNumber()
    const resolved: DMCThread[] = []
    const seen = new Set<string>()
    for (const raw of options.paletteNumbers) {
      const key = raw.trim().toLowerCase()
      if (seen.has(key)) continue
      const thread = lookup.get(key)
      if (!thread) continue
      seen.add(key)
      resolved.push(thread)
    }
    chosenThreads = resolved.length > 0
      ? sortThreadsLightToDark(resolved)
      : sortThreadsLightToDark(
        selectFullColorLadder(
          coarsenHistogram(hist, FIT_MAX_COLORS),
          allThreads,
          Math.max(FULL_COLOR_MAX, options.budget),
          ownedSet,
          options.lockedNumbers,
          fidelity,
          options.anchorBudget ?? DEFAULT_FULL_COLOR_BUDGET,
        ).slice(0, options.budget),
      )
  } else {
    const fitHist = coarsenHistogram(hist, FIT_MAX_COLORS)
    const ladder = selectFullColorLadder(
      fitHist,
      allThreads,
      Math.max(FULL_COLOR_MAX, options.budget),
      ownedSet,
      options.lockedNumbers,
      fidelity,
      options.anchorBudget ?? DEFAULT_FULL_COLOR_BUDGET,
    )
    ladderNumbers = ladder.map((t) => t.number)
    chosenThreads = sortThreadsLightToDark(ladder.slice(0, Math.min(options.budget, ladder.length)))
  }

  const pixelCount = width * height
  const histLabs = computeHistogramLab(hist)
  const pixelHistIdx = buildPixelHistIndex(rgba, pixelCount, hist)
  let threadLabs = chosenThreads.map(getThreadLab)

  const initial = assignInitialSlots(
    pixelCount,
    pixelHistIdx,
    hist,
    histLabs,
    chosenThreads,
    threadLabs,
    options.mode,
  )
  const cleanedSlot = smoothSlotMap(initial.slot, rgba, width, height, chosenThreads, detail)
  const precomputed: { histSlot: Uint8Array; histBestDE: Float32Array } = {
    histSlot: initial.histSlot,
    histBestDE: initial.histBestDE,
  }

  // In Full Color mode, drop any unlocked/unswapped slot that ended up at 0 pixels after smoothing
  // (never drop all slots; keep Monochrome ramps and explicitly locked/swapped threads intact).
  if (options.mode === 'full-color' && chosenThreads.length > 1) {
    const counts = new Int32Array(chosenThreads.length)
    for (let i = 0; i < cleanedSlot.length; i++) {
      const s = cleanedSlot[i]
      if (s !== NO_THREAD && s < chosenThreads.length) counts[s]++
    }
    const keptIndices: number[] = []
    for (let s = 0; s < chosenThreads.length; s++) {
      const key = chosenThreads[s].number.toLowerCase()
      if (counts[s] > 0 || lockedSet.has(key) || swappedSet.has(key)) {
        keptIndices.push(s)
      }
    }
    if (keptIndices.length > 0 && keptIndices.length < chosenThreads.length) {
      const remap = new Uint8Array(chosenThreads.length).fill(NO_THREAD)
      keptIndices.forEach((oldIdx, newIdx) => { remap[oldIdx] = newIdx })
      for (let i = 0; i < cleanedSlot.length; i++) {
        const s = cleanedSlot[i]
        if (s !== NO_THREAD && s < chosenThreads.length) cleanedSlot[i] = remap[s]
      }
      for (let i = 0; i < initial.histSlot.length; i++) {
        const mapped = remap[initial.histSlot[i]]
        initial.histSlot[i] = mapped
        if (mapped === NO_THREAD) initial.histBestDE[i] = -1
      }
      chosenThreads = keptIndices.map((idx) => chosenThreads[idx])
      threadLabs = keptIndices.map((idx) => threadLabs[idx])
    }
  }

  // Apply in-place Full Color display substitutions AFTER region assignment & smoothing
  // so swapped regions preserve their exact base shapes and repaint cleanly in the chosen thread.
  const displayThreads: DMCThread[] = []
  const displayLabs: LabTuple[] = []
  const swappedFlags: boolean[] = []
  const originalThreads: Array<DMCThread | undefined> = []
  const overriddenSlots: boolean[] = []
  const lookup = overrideMap.size > 0 ? getByNumber() : null

  for (let s = 0; s < chosenThreads.length; s++) {
    const base = chosenThreads[s]
    const baseKey = base.number.toLowerCase()
    const overrideKey = lookup ? overrideMap.get(baseKey) : undefined
    const replacement = overrideKey ? lookup!.get(overrideKey) : undefined
    if (replacement && replacement.id !== base.id) {
      displayThreads.push(replacement)
      displayLabs.push(getThreadLab(replacement))
      swappedFlags.push(true)
      originalThreads.push(base)
      overriddenSlots.push(true)
    } else {
      displayThreads.push(base)
      displayLabs.push(threadLabs[s])
      swappedFlags.push(swappedSet.has(baseKey))
      originalThreads.push(undefined)
      overriddenSlots.push(false)
    }
  }

  const assigned = scoreSlotMap(
    rgba,
    pixelCount,
    pixelHistIdx,
    hist,
    histLabs,
    displayThreads,
    displayLabs,
    cleanedSlot,
    options.mode,
    swappedFlags,
    precomputed,
    originalThreads,
    overriddenSlots,
  )

  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
  return {
    mode: options.mode,
    budget: options.budget,
    monochromeTone,
    detail,
    fidelity,
    preferBox,
    width,
    height,
    slots: assigned.slots,
    slot: assigned.slot,
    visiblyOff: assigned.visiblyOff,
    score: assigned.score,
    imageOklabLRange,
    ...(ladderNumbers ? { ladder: ladderNumbers } : {}),
    ms: elapsed,
  }
}

/**
 * Live-swaps a single thread in an existing Thread Map in place.
 * Preserves every slot's exact region pixel mask in BOTH Full Color and Monochrome modes so
 * creative thread substitutions (e.g. replacing DMC 934 with DMC 310) immediately repaint
 * those exact shapes, while honestly re-scoring against the original photo pixels.
 */
export function swapMapThread(
  map: ThreadMapResult,
  rgba: ArrayLike<number>,
  slotIndex: number,
  nextThread: DMCThread,
  prepared?: PreparedThreadMapPixels | null,
): ThreadMapResult {
  if (slotIndex < 0 || slotIndex >= map.slots.length) return map
  const prevSlot = map.slots[slotIndex]
  if (prevSlot.thread.id === nextThread.id) return map

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const pixelCount = map.width * map.height
  const analysis = prepared && prepared.pixelCount === pixelCount
    ? prepared
    : prepareThreadMapPixels(rgba, pixelCount)
  if (!analysis) return map

  const baseThread = prevSlot.originalThread ?? prevSlot.thread
  const isRevert = nextThread.id === baseThread.id

  const updatedThreads = map.slots.map((s, idx) => (idx === slotIndex ? nextThread : s.thread))
  const swappedFlags = map.slots.map((s, idx) => (idx === slotIndex ? !isRevert : s.swapped))
  const originalThreads = map.slots.map((s, idx) => {
    if (idx !== slotIndex) return s.originalThread
    return isRevert ? undefined : baseThread
  })
  const threadLabs = updatedThreads.map(getThreadLab)
  const finalSlot = new Uint8Array(map.slot)

  const assigned = scoreSlotMap(
    rgba,
    pixelCount,
    analysis.pixelHistIdx,
    analysis.hist,
    analysis.histLabs,
    updatedThreads,
    threadLabs,
    finalSlot,
    map.mode,
    swappedFlags,
    null,
    originalThreads,
  )

  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
  return {
    ...map,
    slots: assigned.slots,
    slot: assigned.slot,
    visiblyOff: assigned.visiblyOff,
    score: assigned.score,
    ms: elapsed,
  }
}

export interface ApplyThreadMapSwapsOptions {
  /** Full Color in-place substitutions (`baseLowerNumber -> replacement DMC number`). */
  swapOverrides?: Readonly<Record<string, string>>
  /** Monochrome slot-index substitutions (`slotIndex -> replacement DMC number`). */
  monoSwaps?: Readonly<Record<number, string>>
  /**
   * When true, reuses `baseMap.slot` directly instead of copying it (safe for immutable React state
   * so cached vector `Path2D` geometry never re-compiles when only display colors change).
   */
  shareSlotBuffer?: boolean
}

/**
 * Applies persisted Full Color (`swapOverrides`) or Monochrome (`monoSwaps`) substitutions
 * in place onto a base `ThreadMapResult`, preserving every region's exact pixel mask while
 * honestly re-scoring against the original photo pixels.
 */
export function applyThreadMapSwaps(
  baseMap: ThreadMapResult,
  rgba: ArrayLike<number>,
  allThreads: readonly DMCThread[],
  options: ApplyThreadMapSwapsOptions,
  prepared?: PreparedThreadMapPixels | null,
): ThreadMapResult {
  const isMono = baseMap.mode === 'monochrome'
  const hasFull = !isMono && Boolean(options.swapOverrides && Object.keys(options.swapOverrides).length > 0)
  const hasMono = isMono && Boolean(options.monoSwaps && Object.keys(options.monoSwaps).length > 0)
  if (!hasFull && !hasMono) return baseMap

  const byNumber = new Map<string, DMCThread>()
  for (let i = 0; i < allThreads.length; i++) {
    byNumber.set(allThreads[i].number.toLowerCase(), allThreads[i])
  }

  const normalizedFull = new Map<string, string>()
  if (hasFull && options.swapOverrides) {
    for (const [rawBase, rawNext] of Object.entries(options.swapOverrides)) {
      const baseKey = rawBase.trim().toLowerCase()
      const nextKey = rawNext.trim().toLowerCase()
      if (baseKey && nextKey && baseKey !== nextKey) {
        normalizedFull.set(baseKey, nextKey)
      }
    }
  }

  const updatedThreads: DMCThread[] = []
  const swappedFlags: boolean[] = []
  const originalThreads: Array<DMCThread | undefined> = []
  let anyChange = false

  for (let i = 0; i < baseMap.slots.length; i++) {
    const slot = baseMap.slots[i]
    const baseThread = slot.originalThread ?? slot.thread
    let replacement: DMCThread | undefined
    if (isMono && options.monoSwaps) {
      const raw = options.monoSwaps[slot.index]
      if (raw) replacement = byNumber.get(raw.trim().toLowerCase())
    } else if (!isMono) {
      const nextKey = normalizedFull.get(baseThread.number.toLowerCase())
      if (nextKey) replacement = byNumber.get(nextKey)
    }

    if (replacement && replacement.id !== baseThread.id) {
      updatedThreads.push(replacement)
      swappedFlags.push(true)
      originalThreads.push(baseThread)
      if (replacement.id !== slot.thread.id || !slot.swapped || slot.originalThread?.id !== baseThread.id) {
        anyChange = true
      }
    } else {
      updatedThreads.push(baseThread)
      swappedFlags.push(false)
      originalThreads.push(undefined)
      if (baseThread.id !== slot.thread.id || slot.swapped || slot.originalThread !== undefined) {
        anyChange = true
      }
    }
  }

  if (!anyChange) return baseMap

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const pixelCount = baseMap.width * baseMap.height
  const analysis = prepared && prepared.pixelCount === pixelCount
    ? prepared
    : prepareThreadMapPixels(rgba, pixelCount)
  if (!analysis) return baseMap

  const threadLabs = updatedThreads.map(getThreadLab)
  const targetSlot = options.shareSlotBuffer ? baseMap.slot : new Uint8Array(baseMap.slot)

  const assigned = scoreSlotMap(
    rgba,
    pixelCount,
    analysis.pixelHistIdx,
    analysis.hist,
    analysis.histLabs,
    updatedThreads,
    threadLabs,
    targetSlot,
    baseMap.mode,
    swappedFlags,
    null,
    originalThreads,
  )

  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
  return {
    ...baseMap,
    slots: assigned.slots,
    slot: assigned.slot,
    visiblyOff: assigned.visiblyOff,
    score: assigned.score,
    ms: elapsed,
  }
}
