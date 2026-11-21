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
import {
  NO_THREAD,
  VISIBLE_THREAD_MISS,
  type ThreadMapOptions,
  type ThreadMapResult,
  type ThreadMapScore,
  type ThreadMapSlot,
} from './types'

const toLab65 = converter('lab65')

/** Value-first CIEDE2000 lightness weight (matches Paint Plan's value priority). */
export const VALUE_PRIORITY_KL = 0.65

/** Gentle CIEDE2000 preference bonus for owned DMC threads when "Prefer my box" is active. */
export const PREFER_BOX_DELTA_E_BONUS = 1.75

/** Maximum coarsened colors for Full Color k-medoids fitting (scores always use full histogram). */
const FIT_MAX_COLORS = 400

/** Stop adding Full Color threads when an extra skein lowers weighted cost by less than this. */
const MIN_MEDOID_GAIN = 0.08

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

function weightedQuantile(values: Float64Array, weights: Float64Array, q: number): number {
  if (values.length === 0) return 0
  const order = Array.from({ length: values.length }, (_, i) => i)
    .sort((a, b) => values[a] - values[b])
  let total = 0
  for (let i = 0; i < weights.length; i++) total += weights[i]
  if (total <= 0) return 0
  const target = q * total
  let seen = 0
  for (const idx of order) {
    seen += weights[idx]
    if (seen >= target) return values[idx]
  }
  return values[order[order.length - 1]]
}

/**
 * Deterministic k-medoids over DMC catalog threads:
 * weighted greedy forward medoid init + Voronoi/medoid swap refinement.
 */
function selectFullColorThreads(
  fitHist: Histogram,
  allThreads: readonly DMCThread[],
  budget: number,
  ownedSet: Set<string> | null,
): DMCThread[] {
  const n = fitHist.size
  const m = allThreads.length
  if (n === 0 || m === 0 || budget <= 0) return []

  const effectiveBudget = Math.min(budget, m)
  const fitLabs = computeHistogramLab(fitHist)
  const threadLabs = allThreads.map(getThreadLab)
  const weight = new Float64Array(n)
  for (let i = 0; i < n; i++) weight[i] = fitHist.count[i] / fitHist.total

  const hasBoxPreference = Boolean(ownedSet && ownedSet.size > 0)
  const unownedPenalty = new Float32Array(m)
  if (hasBoxPreference) {
    for (let c = 0; c < m; c++) {
      if (!ownedSet!.has(allThreads[c].number.toLowerCase())) {
        unownedPenalty[c] = PREFER_BOX_DELTA_E_BONUS
      }
    }
  }

  // Cost matrix [i * m + c]: value-prioritized CIEDE2000 (kL = 0.65) with gentle owned-thread preference.
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

  // 1. Weighted greedy forward medoid initialization.
  const chosen: number[] = []
  const chosenFlag = new Uint8Array(m)
  const currentBest = new Float64Array(n).fill(Infinity)
  const gain = new Float64Array(m)

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

  // 2. Deterministic medoid swap refinement.
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

      const prevC = chosen[p]
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

/**
 * Assigns every opaque pixel to one of `threads` and computes all per-slot and overall metrics.
 * - `full-color`: nearest thread in CIEDE2000 (kL = 1).
 * - `monochrome`: nearest thread strictly by OKLab L.
 */
function assignAndScore(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  hist: Histogram,
  threads: readonly DMCThread[],
  mode: 'full-color' | 'monochrome',
  swappedFlags?: readonly boolean[],
  preservedSlotMap?: Uint8Array,
): ScoredAssignment {
  const k = threads.length
  const threadLabs = threads.map(getThreadLab)
  const histLabs = computeHistogramLab(hist)

  const areaCount = new Float64Array(k)
  const deltaESum = new Float64Array(k)
  const deltaLSum = new Float64Array(k)
  const rgbSumR = new Float64Array(k)
  const rgbSumG = new Float64Array(k)
  const rgbSumB = new Float64Array(k)

  let totalDeltaE = 0
  let totalDeltaL = 0
  let offCount = 0

  const pixelCount = width * height
  const slot = new Uint8Array(pixelCount).fill(NO_THREAD)
  const visiblyOff = new Uint8Array(pixelCount)

  // Map packed RGB -> histogram index for O(1) pixel lookup.
  const entryOf = new Map<number, number>()
  for (let i = 0; i < hist.size; i++) {
    entryOf.set(
      (hist.rgb[i * 3] << 16) | (hist.rgb[i * 3 + 1] << 8) | hist.rgb[i * 3 + 2],
      i,
    )
  }

  let entryDeltaE: Float64Array
  let entryWeights: Float64Array

  if (preservedSlotMap) {
    // Monochrome swap path: keep every pixel's exact region assignment, re-score against updated thread colors.
    slot.set(preservedSlotMap)
    const pixelDeltaE = new Float64Array(hist.total)
    let opaqueIdx = 0
    for (let p = 0; p < pixelCount; p++) {
      const s = slot[p]
      if (s === NO_THREAD || s >= k) continue
      const o = p * 4
      const r = rgba[o]
      const g = rgba[o + 1]
      const b = rgba[o + 2]
      const hi = entryOf.get((r << 16) | (g << 8) | b)
      if (hi === undefined) continue

      const l = histLabs[hi * 3]
      const a = histLabs[hi * 3 + 1]
      const bLab = histLabs[hi * 3 + 2]
      const [tl, ta, tb] = threadLabs[s]
      const dE = ciede2000(l, a, bLab, tl, ta, tb, 1)
      const dL = Math.abs(hist.oklab[hi * 3] - threads[s].oklab.L)

      areaCount[s] += 1
      deltaESum[s] += dE
      deltaLSum[s] += dL
      rgbSumR[s] += r
      rgbSumG[s] += g
      rgbSumB[s] += b
      totalDeltaE += dE
      totalDeltaL += dL
      if (mode === 'full-color' && dE > VISIBLE_THREAD_MISS) {
        visiblyOff[p] = 1
        offCount += 1
      }
      if (opaqueIdx < pixelDeltaE.length) pixelDeltaE[opaqueIdx++] = dE
    }
    entryDeltaE = opaqueIdx === pixelDeltaE.length ? pixelDeltaE : pixelDeltaE.subarray(0, opaqueIdx)
    entryWeights = new Float64Array(entryDeltaE.length).fill(1)
  } else {
    // Standard path: assign each distinct histogram color once, then broadcast to pixels.
    const histSlot = new Uint8Array(hist.size)
    entryDeltaE = new Float64Array(hist.size)
    entryWeights = hist.count

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

      const [tl, ta, tb] = threadLabs[best]
      const dE = mode === 'full-color' ? bestDist : ciede2000(l, a, b, tl, ta, tb, 1)
      const dL = Math.abs(okL - threads[best].oklab.L)
      const count = hist.count[i]

      histSlot[i] = best
      entryDeltaE[i] = dE
      areaCount[best] += count
      deltaESum[best] += count * dE
      deltaLSum[best] += count * dL
      rgbSumR[best] += count * hist.rgb[i * 3]
      rgbSumG[best] += count * hist.rgb[i * 3 + 1]
      rgbSumB[best] += count * hist.rgb[i * 3 + 2]
      totalDeltaE += count * dE
      totalDeltaL += count * dL
      if (mode === 'full-color' && dE > VISIBLE_THREAD_MISS) offCount += count
    }

    for (let p = 0; p < pixelCount; p++) {
      if (rgba[p * 4 + 3] < 128) continue
      const hi = entryOf.get((rgba[p * 4] << 16) | (rgba[p * 4 + 1] << 8) | rgba[p * 4 + 2])!
      slot[p] = histSlot[hi]
      if (mode === 'full-color' && entryDeltaE[hi] > VISIBLE_THREAD_MISS) {
        visiblyOff[p] = 1
      }
    }
  }

  const totalOpaque = hist.total > 0 ? hist.total : 1
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
    p95DeltaE00: weightedQuantile(entryDeltaE, entryWeights, 0.95),
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

  const imageOklabLRange = computeHistogramOklabLRange(hist, 0.02)
  const preferBox = Boolean(options.preferBox && options.ownedNumbers && options.ownedNumbers.length > 0)
  const ownedSet = preferBox
    ? new Set(options.ownedNumbers!.map((n) => n.trim().toLowerCase()))
    : null

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
    chosenThreads = selectFullColorThreads(fitHist, allThreads, options.budget, ownedSet)
  }

  let assigned = assignAndScore(rgba, width, height, hist, chosenThreads, options.mode)

  // In Full Color mode, drop any thread that ended up covering 0 pixels on the full histogram
  // (never drop all threads; keep Monochrome ramps intact so every tonal step stays visible).
  if (options.mode === 'full-color' && assigned.slots.length > 1) {
    const usedThreads = assigned.slots.filter((s) => s.area > 0).map((s) => s.thread)
    if (usedThreads.length > 0 && usedThreads.length < assigned.slots.length) {
      assigned = assignAndScore(rgba, width, height, hist, usedThreads, options.mode)
    }
  }

  const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0
  return {
    mode: options.mode,
    budget: options.budget,
    monochromeTone,
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
 *   and recomputes area shares, ΔE00, visibly-off mask, and scores.
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

  const updatedThreads = map.slots.map((s, idx) => (idx === slotIndex ? nextThread : s.thread))
  const swappedFlags = map.slots.map((s, idx) => (idx === slotIndex ? true : s.swapped))

  const assigned = assignAndScore(
    rgba,
    map.width,
    map.height,
    hist,
    updatedThreads,
    map.mode,
    swappedFlags,
    map.mode === 'monochrome' ? map.slot : undefined,
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
