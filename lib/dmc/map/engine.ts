/**
 * Pure, deterministic Painterly Thread Map & Monochrome Value Ramp engine.
 * Reuses Paint Plan's histogram and CIEDE2000 primitives without modifying them.
 * React-free and Web-Worker safe.
 */

import { converter } from 'culori'
import { rgbToHex } from '@/lib/paint/plan/color'
import { ciede2000 } from '@/lib/paint/plan/deltaE'
import { buildHistogram, coarsenHistogram, type Histogram } from '@/lib/paint/plan/histogram'
import type { DMCThread, ImageOklabLRange } from '../types'
import { getMonochromePool, selectMonochromeRamp } from './monochrome'
import { smoothSlotMap } from './smooth'
import {
  DEFAULT_THREAD_MAP_DETAIL,
  NO_THREAD,
  VISIBLE_THREAD_MISS,
  type ThreadMapOptions,
  type ThreadMapResult,
  type ThreadMapScore,
  type ThreadMapSlot,
} from './types'

const toLab65 = converter('lab65')

/** Perceptual CIEDE2000 lightness weight — respects value without desaturating colorful areas. */
export const VALUE_PRIORITY_KL = 0.9

/** Gentle CIEDE2000 preference bonus for owned DMC threads when "Prefer my box" is active. */
export const PREFER_BOX_DELTA_E_BONUS = 1.75

/** Maximum coarsened colors for Full Color k-medoids fitting (scores always use full histogram). */
const FIT_MAX_COLORS = 400

/** Stop adding Full Color threads only when an extra skein offers virtually no improvement (e.g. solid patch). */
const MIN_MEDOID_GAIN = 0.004

/** Chroma salience factor so vibrant accents (lips, petals, bright details) keep their color instead of washing into muted backgrounds. */
const CHROMA_SALIENCE = 4.5
const AREA_COMPRESSION = 0.82

const MAX_SWAP_ITERATIONS = 25

type LabTuple = [number, number, number]

const threadLabCache = new WeakMap<DMCThread, LabTuple>()

function getThreadLab(thread: DMCThread): LabTuple {
  let cached = threadLabCache.get(thread)
  if (!cached) {
    const lab = toLab65({
      mode: 'rgb',
      r: thread.rgb.r / 255,
      g: thread.rgb.g / 255,
      b: thread.rgb.b / 255,
    })!
    cached = [lab.l, lab.a, lab.b]
    threadLabCache.set(thread, cached)
  }
  return cached
}

function computeHistogramLab(hist: Histogram): Float64Array {
  const labs = new Float64Array(hist.size * 3)
  for (let i = 0; i < hist.size; i++) {
    const lab = toLab65({
      mode: 'rgb',
      r: hist.rgb[i * 3] / 255,
      g: hist.rgb[i * 3 + 1] / 255,
      b: hist.rgb[i * 3 + 2] / 255,
    })!
    labs[i * 3] = lab.l
    labs[i * 3 + 1] = lab.a
    labs[i * 3 + 2] = lab.b
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
 * Deterministic k-medoids over DMC catalog threads:
 * optional locked seed medoids + weighted greedy forward medoid init + Voronoi/medoid swap refinement.
 */
function selectFullColorThreads(
  fitHist: Histogram,
  allThreads: readonly DMCThread[],
  budget: number,
  ownedSet: Set<string> | null,
  lockedNumbers?: readonly string[],
): DMCThread[] {
  const n = fitHist.size
  const m = allThreads.length
  if (n === 0 || m === 0 || budget <= 0) return []

  const effectiveBudget = Math.min(budget, m)
  const fitLabs = computeHistogramLab(fitHist)
  const threadLabs = allThreads.map(getThreadLab)
  const weight = new Float64Array(n)
  let weightSum = 0
  for (let i = 0; i < n; i++) {
    const a = fitHist.oklab[i * 3 + 1]
    const b = fitHist.oklab[i * 3 + 2]
    const chroma = Math.hypot(a, b)
    const w = Math.pow(fitHist.count[i], AREA_COMPRESSION) * (1 + CHROMA_SALIENCE * chroma)
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

  // Cost matrix [i * m + c]: value-prioritized CIEDE2000 with gentle owned-thread preference.
  // Adding the bonus as a small offset on unowned threads keeps every cost >= 0 so close ties
  // cleanly favor owned skeins without clamping or spawning duplicate slots.
  const cost = new Float32Array(n * m)
  for (let i = 0; i < n; i++) {
    const l1 = fitLabs[i * 3]
    const a1 = fitLabs[i * 3 + 1]
    const b1 = fitLabs[i * 3 + 2]
    const row = i * m
    for (let c = 0; c < m; c++) {
      const [l2, a2, b2] = threadLabs[c]
      cost[row + c] = ciede2000(l1, a1, b1, l2, a2, b2, VALUE_PRIORITY_KL) + unownedPenalty[c]
    }
  }

  // 1. Seed fixed medoids for any stitcher-locked DMC threads, then weighted greedy forward init.
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
      if (chosen.length >= effectiveBudget) break
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

  while (chosen.length < effectiveBudget) {
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
    if (best < 0) break
    if (chosen.length > 0 && bestGain < MIN_MEDOID_GAIN) break

    chosen.push(best)
    chosenFlag[best] = 1
    for (let i = 0; i < n; i++) {
      const d = cost[i * m + best]
      if (d < currentBest[i]) currentBest[i] = d
    }
  }

  // 2. Deterministic medoid swap refinement (locked medoids are never replaced).
  const assignment = new Uint16Array(n)
  const assign = (): boolean => {
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

  assign()

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
    const reassigned = assign()
    if (!replaced && !reassigned) break
  }

  // Sort lightest → darkest by OKLab L (deterministic tie-break by DMC number).
  return chosen
    .map((idx) => allThreads[idx])
    .sort((a, b) => b.oklab.L - a.oklab.L || compareDmcNumber(a.number, b.number))
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
 * Assigns every opaque pixel to its nearest thread in `threads` (unsmoothed):
 * - `full-color`: nearest thread in CIEDE2000 (kL = 1).
 * - `monochrome`: nearest thread strictly by OKLab L.
 */
function assignInitialSlots(
  pixelCount: number,
  pixelHistIdx: Int32Array,
  hist: Histogram,
  histLabs: Float64Array,
  threads: readonly DMCThread[],
  threadLabs: readonly LabTuple[],
  mode: 'full-color' | 'monochrome',
): Uint8Array {
  const k = threads.length
  const histSlot = new Uint8Array(hist.size)

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
    } else {
      for (let s = 0; s < k; s++) {
        const [tl, ta, tb] = threadLabs[s]
        const d = ciede2000(l, a, b, tl, ta, tb, 1)
        if (d < bestDist - 1e-12) {
          bestDist = d
          best = s
        }
      }
    }
    histSlot[i] = best
  }

  const slot = new Uint8Array(pixelCount).fill(NO_THREAD)
  for (let p = 0; p < pixelCount; p++) {
    const hi = pixelHistIdx[p]
    if (hi >= 0) slot[p] = histSlot[hi]
  }
  return slot
}

/**
 * Honestly scores a final `slot` map against the ORIGINAL unsmoothed `rgba` pixels.
 * Every metric (`meanDeltaE00`, `p95DeltaE00`, `meanDeltaL`, `visiblyOffArea`, per-slot
 * `area`, `targetHex`, and per-pixel `visiblyOff`) is measured against the true photo pixels
 * so spatial smoothing never fakes accuracy.
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

  // Lazy cache for CIEDE2000 per (histogramColor, slot) pair so 512x512 images stay fast.
  const useCache = hist.size * k <= 2_500_000
  const deCache = useCache ? new Float32Array(hist.size * k).fill(-1) : null

  for (let p = 0; p < pixelCount; p++) {
    const s = slot[p]
    if (s === NO_THREAD || s >= k) continue
    const hi = pixelHistIdx[p]
    if (hi < 0) continue
    const o = p * 4

    let dE: number
    if (deCache) {
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
    return {
      index,
      thread,
      area: n / totalOpaque,
      meanDeltaE00: n > 0 ? deltaESum[index] / n : NaN,
      meanDeltaL: n > 0 ? deltaLSum[index] / n : NaN,
      targetHex,
      swapped: swappedFlags?.[index] ?? false,
    }
  })

  const score: ThreadMapScore = {
    threadCount: slots.length,
    meanDeltaE00: totalDeltaE / totalOpaque,
    p95DeltaE00,
    meanDeltaL: totalDeltaL / totalOpaque,
    visiblyOffArea: mode === 'full-color' ? offCount / totalOpaque : 0,
    approximateThreads: slots.filter((s) => s.thread.colorConfidence === 'approximate').length,
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
  const imageOklabLRange = computeHistogramOklabLRange(hist, 0.02)
  const preferBox = Boolean(options.preferBox && options.ownedNumbers && options.ownedNumbers.length > 0)
  const ownedSet = preferBox
    ? new Set(options.ownedNumbers!.map((n) => n.trim().toLowerCase()))
    : null
  const lockedSet = new Set((options.lockedNumbers ?? []).map((n) => n.trim().toLowerCase()).filter(Boolean))

  let chosenThreads: DMCThread[]
  const monochromeTone = options.mode === 'monochrome' ? (options.monochromeTone ?? 'warm-grays') : null

  if (options.mode === 'monochrome') {
    const pool = getMonochromePool(allThreads, monochromeTone!)
    chosenThreads = selectMonochromeRamp(pool, imageOklabLRange, options.budget, {
      preferBox,
      ownedNumbers: options.ownedNumbers,
    })
  } else {
    const fitHist = coarsenHistogram(hist, FIT_MAX_COLORS)
    chosenThreads = selectFullColorThreads(fitHist, allThreads, options.budget, ownedSet, options.lockedNumbers)
  }

  const pixelCount = width * height
  const histLabs = computeHistogramLab(hist)
  const pixelHistIdx = buildPixelHistIndex(rgba, pixelCount, hist)
  let threadLabs = chosenThreads.map(getThreadLab)

  const initialSlot = assignInitialSlots(
    pixelCount,
    pixelHistIdx,
    hist,
    histLabs,
    chosenThreads,
    threadLabs,
    options.mode,
  )
  const cleanedSlot = smoothSlotMap(initialSlot, rgba, width, height, chosenThreads, detail)

  // In Full Color mode, drop any unlocked slot that ended up at 0 pixels after smoothing
  // (never drop all slots; keep Monochrome ramps and explicitly locked threads intact).
  if (options.mode === 'full-color' && chosenThreads.length > 1) {
    const counts = new Int32Array(chosenThreads.length)
    for (let i = 0; i < cleanedSlot.length; i++) {
      const s = cleanedSlot[i]
      if (s !== NO_THREAD && s < chosenThreads.length) counts[s]++
    }
    const keptIndices: number[] = []
    for (let s = 0; s < chosenThreads.length; s++) {
      if (counts[s] > 0 || lockedSet.has(chosenThreads[s].number.toLowerCase())) {
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
      chosenThreads = keptIndices.map((idx) => chosenThreads[idx])
      threadLabs = keptIndices.map((idx) => threadLabs[idx])
    }
  }

  const assigned = scoreSlotMap(
    rgba,
    pixelCount,
    pixelHistIdx,
    hist,
    histLabs,
    chosenThreads,
    threadLabs,
    cleanedSlot,
    options.mode,
  )

  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
  return {
    mode: options.mode,
    budget: options.budget,
    monochromeTone,
    detail,
    preferBox,
    width,
    height,
    slots: assigned.slots,
    slot: assigned.slot,
    visiblyOff: assigned.visiblyOff,
    score: assigned.score,
    imageOklabLRange,
    ms: elapsed,
  }
}

/**
 * Live-swaps a single thread in an existing Thread Map.
 * - Full Color mode: replaces the thread at `slotIndex`, re-assigns pixels by nearest CIEDE2000,
 *   applies the active spatial cleanup detail level, and honestly re-scores against original pixels.
 * - Monochrome mode: replaces the thread at `slotIndex` while preserving every slot's exact region
 *   so sculptural portrait planes stay steady while the stitcher tests a warmer/cooler or owned skein.
 */
export function swapMapThread(
  map: ThreadMapResult,
  rgba: ArrayLike<number>,
  slotIndex: number,
  nextThread: DMCThread,
): ThreadMapResult {
  if (slotIndex < 0 || slotIndex >= map.slots.length) return map
  if (map.slots[slotIndex].thread.id === nextThread.id) return map

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const hist = buildHistogram(rgba)
  if (hist.size === 0) return map

  const pixelCount = map.width * map.height
  const updatedThreads = map.slots.map((s, idx) => (idx === slotIndex ? nextThread : s.thread))
  const swappedFlags = map.slots.map((s, idx) => (idx === slotIndex ? true : s.swapped))
  const histLabs = computeHistogramLab(hist)
  const pixelHistIdx = buildPixelHistIndex(rgba, pixelCount, hist)
  const threadLabs = updatedThreads.map(getThreadLab)

  let finalSlot: Uint8Array
  if (map.mode === 'monochrome') {
    finalSlot = new Uint8Array(map.slot)
  } else {
    const initialSlot = assignInitialSlots(
      pixelCount,
      pixelHistIdx,
      hist,
      histLabs,
      updatedThreads,
      threadLabs,
      'full-color',
    )
    finalSlot = smoothSlotMap(initialSlot, rgba, map.width, map.height, updatedThreads, map.detail)
  }

  const assigned = scoreSlotMap(
    rgba,
    pixelCount,
    pixelHistIdx,
    hist,
    histLabs,
    updatedThreads,
    threadLabs,
    finalSlot,
    map.mode,
    swappedFlags,
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
