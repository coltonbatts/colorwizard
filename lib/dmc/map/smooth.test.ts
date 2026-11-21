import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ciede2000 } from '@/lib/paint/plan/deltaE'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import { converter } from 'culori'
import type { DMCThread } from '../types'
import { buildThreadMap, swapMapThread } from './engine'
import {
  DEFAULT_THREAD_MAP_PREFS,
  loadThreadMapPrefs,
  storeThreadMapPrefs,
  THREAD_MAP_PREFS_KEY,
} from './prefs'
import { countSlotRegions, smoothSlotMap } from './smooth'
import { NO_THREAD } from './types'

const ALL_THREADS: DMCThread[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)
const CORPUS = loadCorpus('synthetic')
const LANDSCAPE = CORPUS.find((img) => img.name === 'landscape')!
const PORTRAIT = CORPUS.find((img) => img.name === 'portrait-light')!
const toLab65 = converter('lab65')

/** Builds a noisy 96x96 two-region image with deterministic salt-and-pepper confetti specks. */
function buildNoisyTwoPlaneImage(width = 96, height = 96): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  // Deterministic LCG PRNG
  let seed = 1337
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0xffffffff
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      const leftHalf = x < width / 2
      // Base colors with mild texture + 14% single-pixel opposite-color confetti.
      const isNoise = nextRand() < 0.14
      const useLeft = isNoise ? !leftHalf : leftHalf
      const jitter = Math.round((nextRand() - 0.5) * 14)
      if (useLeft) {
        rgba[o] = Math.min(255, Math.max(0, 185 + jitter))
        rgba[o + 1] = Math.min(255, Math.max(0, 145 + jitter))
        rgba[o + 2] = Math.min(255, Math.max(0, 118 + jitter))
      } else {
        rgba[o] = Math.min(255, Math.max(0, 152 + jitter))
        rgba[o + 1] = Math.min(255, Math.max(0, 120 + jitter))
        rgba[o + 2] = Math.min(255, Math.max(0, 98 + jitter))
      }
      rgba[o + 3] = 255
    }
  }
  return rgba
}

describe('Spatial region cleanup (smoothSlotMap + buildThreadMap)', () => {
  it('is 100% deterministic across crisp, painterly, and broad detail levels', () => {
    for (const detail of ['crisp', 'painterly', 'broad'] as const) {
      const a = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
        mode: 'full-color',
        budget: 10,
        detail,
      })
      const b = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
        mode: 'full-color',
        budget: 10,
        detail,
      })
      expect(a.detail).toBe(detail)
      expect(Array.from(a.slot)).toEqual(Array.from(b.slot))
      expect(a.score).toEqual(b.score)
    }
  })

  it('eliminates pixel confetti dramatically on noisy images with monotonic simplification (crisp -> painterly -> broad)', () => {
    const w = 96
    const h = 96
    const rgba = buildNoisyTwoPlaneImage(w, h)

    // Raw unsmoothed assignment has hundreds of confetti specks.
    const crisp = buildThreadMap(rgba, w, h, ALL_THREADS, { mode: 'full-color', budget: 4, detail: 'crisp' })
    const painterly = buildThreadMap(rgba, w, h, ALL_THREADS, { mode: 'full-color', budget: 4, detail: 'painterly' })
    const broad = buildThreadMap(rgba, w, h, ALL_THREADS, { mode: 'full-color', budget: 4, detail: 'broad' })

    // Compute raw unsmoothed island count for comparison against the same threads.
    const rawSlot = new Uint8Array(w * h)
    const threads = crisp.slots.map((s) => s.thread)
    for (let i = 0; i < w * h; i++) {
      const o = i * 4
      let best = 0
      let bestD = Infinity
      for (let s = 0; s < threads.length; s++) {
        const dr = rgba[o] - threads[s].rgb.r
        const dg = rgba[o + 1] - threads[s].rgb.g
        const db = rgba[o + 2] - threads[s].rgb.b
        const d = dr * dr + dg * dg + db * db
        if (d < bestD) { bestD = d; best = s }
      }
      rawSlot[i] = best
    }

    const rawRegions = countSlotRegions(rawSlot, w, h)
    const crispRegions = countSlotRegions(crisp.slot, w, h)
    const painterlyRegions = countSlotRegions(painterly.slot, w, h)
    const broadRegions = countSlotRegions(broad.slot, w, h)

    expect(rawRegions.total).toBeGreaterThan(200)
    expect(crispRegions.total).toBeLessThan(rawRegions.total * 0.2)
    expect(painterlyRegions.total).toBeLessThanOrEqual(crispRegions.total)
    expect(broadRegions.total).toBeLessThanOrEqual(painterlyRegions.total)
    expect(painterlyRegions.tiny).toBe(0)
  })

  it('preserves sharp luminance/color boundaries and high-contrast catchlight accents', () => {
    const w = 128
    const h = 128
    const rgba = new Uint8ClampedArray(w * h * 4)

    // Sharp vertical split: bright cream left (x < 64), deep charcoal right (x >= 64),
    // plus a crisp 5x5 bright white catchlight inside the dark right half at (96..100, 60..64).
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4
        const isCatchlight = x >= 96 && x <= 100 && y >= 60 && y <= 64
        const isLight = x < 64 || isCatchlight
        rgba[o] = isLight ? 245 : 22
        rgba[o + 1] = isLight ? 242 : 22
        rgba[o + 2] = isLight ? 236 : 24
        rgba[o + 3] = 255
      }
    }

    const map = buildThreadMap(rgba, w, h, ALL_THREADS, {
      mode: 'full-color',
      budget: 4,
      detail: 'painterly',
    })

    // Step boundary at x = 63 / x = 64 must remain razor sharp across the entire middle.
    const leftSlot = map.slot[64 * w + 32]
    const rightSlot = map.slot[64 * w + 110]
    expect(leftSlot).not.toBe(rightSlot)
    for (let y = 10; y < h - 10; y++) {
      expect(map.slot[y * w + 63]).toBe(leftSlot)
      expect(map.slot[y * w + 64]).toBe(rightSlot)
    }

    // High-contrast 25px white catchlight inside the dark half must survive Painterly smoothing.
    expect(map.slot[62 * w + 98]).toBe(leftSlot)
  })

  it('keeps honest ΔE00 scoring strictly against original unsmoothed pixels (smoothing never fakes accuracy)', () => {
    const w = 64
    const h = 64
    const rgba = buildNoisyTwoPlaneImage(w, h)
    const map = buildThreadMap(rgba, w, h, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
      detail: 'broad',
    })

    // Independently recompute pixel-by-pixel CIEDE2000 from original `rgba` to `map.slots[map.slot[p]].thread`.
    const threadLabs = map.slots.map((s) => {
      const lab = toLab65({ mode: 'rgb', r: s.thread.rgb.r / 255, g: s.thread.rgb.g / 255, b: s.thread.rgb.b / 255 })!
      return [lab.l, lab.a, lab.b] as const
    })

    let sumDE = 0
    let offCount = 0
    const areaCounts = new Int32Array(map.slots.length)
    for (let p = 0; p < w * h; p++) {
      const s = map.slot[p]
      expect(s).not.toBe(NO_THREAD)
      areaCounts[s]++
      const o = p * 4
      const lab = toLab65({ mode: 'rgb', r: rgba[o] / 255, g: rgba[o + 1] / 255, b: rgba[o + 2] / 255 })!
      const [tl, ta, tb] = threadLabs[s]
      const dE = ciede2000(lab.l, lab.a, lab.b, tl, ta, tb, 1)
      sumDE += dE
      if (dE > 5) {
        offCount++
        expect(map.visiblyOff[p]).toBe(1)
      } else {
        expect(map.visiblyOff[p]).toBe(0)
      }
    }

    expect(map.score.meanDeltaE00).toBeCloseTo(sumDE / (w * h), 4)
    expect(map.score.visiblyOffArea).toBeCloseTo(offCount / (w * h), 4)
    for (let s = 0; s < map.slots.length; s++) {
      expect(map.slots[s].area).toBeCloseTo(areaCounts[s] / (w * h), 5)
    }
  })

  it('drops 0-pixel unlocked slots after smoothing in Full Color mode while keeping Monochrome ramps intact', () => {
    const w = 80
    const h = 80
    const rgba = new Uint8ClampedArray(w * h * 4)
    // Solid warm gray background with a single tiny 2px slightly lighter speck that Broad will merge away.
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = 140
      rgba[i * 4 + 1] = 135
      rgba[i * 4 + 2] = 130
      rgba[i * 4 + 3] = 255
    }
    // 2px speck of a mildly different color
    for (const p of [40 * w + 40, 40 * w + 41]) {
      rgba[p * 4] = 175
      rgba[p * 4 + 1] = 165
      rgba[p * 4 + 2] = 155
    }

    const full = buildThreadMap(rgba, w, h, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
      detail: 'broad',
    })
    for (const s of full.slots) {
      expect(s.area).toBeGreaterThan(0)
    }

    const mono = buildThreadMap(rgba, w, h, ALL_THREADS, {
      mode: 'monochrome',
      budget: 7,
      monochromeTone: 'warm-grays',
      detail: 'broad',
    })
    expect(mono.slots.length).toBe(7)
  })

  it('preserves locked DMC threads as fixed medoids when changing the thread-count slider', () => {
    const initial = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 8,
    })
    const lockedA = initial.slots[1].thread.number
    // Also lock a custom thread the stitcher swapped in (e.g. DMC 666 Bright Red).
    const lockedCustom = '666'

    for (const nextBudget of [6, 12, 16]) {
      const rebuilt = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
        mode: 'full-color',
        budget: nextBudget,
        lockedNumbers: [lockedA, lockedCustom],
      })
      const nums = rebuilt.slots.map((s) => s.thread.number)
      expect(nums).toContain(lockedA)
      expect(nums).toContain(lockedCustom)
      expect(rebuilt.slots.length).toBeLessThanOrEqual(nextBudget)
    }
  })

  it('applies active smoothing detail during live Full Color swapMapThread and preserves transparency', () => {
    const w = 48
    const h = 48
    const rgba = buildNoisyTwoPlaneImage(w, h)
    // Make bottom 4 rows transparent.
    for (let y = h - 4; y < h; y++) {
      for (let x = 0; x < w; x++) {
        rgba[(y * w + x) * 4 + 3] = 0
      }
    }
    const map = buildThreadMap(rgba, w, h, ALL_THREADS, {
      mode: 'full-color',
      budget: 4,
      detail: 'painterly',
    })
    const replacement = ALL_THREADS.find((t) => t.number === '310')!
    const swapped = swapMapThread(map, rgba, map.slots.length - 1, replacement)
    expect(swapped.detail).toBe('painterly')
    for (let y = h - 4; y < h; y++) {
      for (let x = 0; x < w; x++) {
        expect(swapped.slot[y * w + x]).toBe(NO_THREAD)
      }
    }
    // Never mutates input slot map in smoothSlotMap.
    const snap = new Uint8Array(map.slot)
    smoothSlotMap(map.slot, rgba, w, h, map.slots.map((s) => s.thread), 'broad')
    expect(Array.from(map.slot)).toEqual(Array.from(snap))
  })
})

describe('Thread Map localStorage preferences (prefs.ts)', () => {
  it('round-trips valid preferences and falls back cleanly on missing, corrupt, or blocked storage', () => {
    const mem = new Map<string, string>()
    const fakeStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
    }

    expect(loadThreadMapPrefs(fakeStorage)).toEqual(DEFAULT_THREAD_MAP_PREFS)

    const custom = {
      mode: 'monochrome' as const,
      fullColorBudget: 16,
      monochromeBudget: 9,
      monochromeTone: 'sepia-browns' as const,
      detail: 'broad' as const,
      preferBox: true,
    }
    storeThreadMapPrefs(custom, fakeStorage)
    expect(loadThreadMapPrefs(fakeStorage)).toEqual(custom)

    // Corrupt JSON and out-of-range fields fall back safely without throwing.
    mem.set(THREAD_MAP_PREFS_KEY, '{not-json')
    expect(loadThreadMapPrefs(fakeStorage)).toEqual(DEFAULT_THREAD_MAP_PREFS)

    mem.set(THREAD_MAP_PREFS_KEY, JSON.stringify({
      mode: 'bogus',
      fullColorBudget: 999,
      monochromeBudget: -3,
      monochromeTone: 'neon',
      detail: 'ultra',
      preferBox: 'yes',
    }))
    expect(loadThreadMapPrefs(fakeStorage)).toEqual(DEFAULT_THREAD_MAP_PREFS)

    // Throwing storage never throws out.
    const broken = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('quota') },
    }
    expect(() => storeThreadMapPrefs(custom, broken)).not.toThrow()
    expect(loadThreadMapPrefs(broken)).toEqual(DEFAULT_THREAD_MAP_PREFS)
  })
})
