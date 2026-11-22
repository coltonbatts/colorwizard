import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { converter } from 'culori'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import type { DMCThread } from '../types'
import { buildThreadLadder, buildThreadMap, srgb8ToLab65, swapMapThread } from './engine'
import { buildPullName, describeThreadMap, getSwapOptions, THREAD_MAP_CAVEAT_CATALOG, THREAD_MAP_CAVEAT_COPY, THREAD_MAP_CAVEAT_REAL, THREAD_MAP_PRINT_CAVEAT } from './mapFit'
import { getMonochromePool } from './monochrome'
import { MONOCHROME_TONES, NO_THREAD, type MonochromeTone } from './types'

const ALL_THREADS: DMCThread[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)

const CORPUS = loadCorpus('synthetic')
const PORTRAIT = CORPUS.find((img) => img.name === 'portrait-light')!
const LANDSCAPE = CORPUS.find((img) => img.name === 'landscape')!

describe('buildThreadMap — Full Color mode', () => {
  it('is 100% deterministic for identical inputs and respects budgets', () => {
    const first = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 10,
    })
    const second = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 10,
    })

    expect(first.slots.map((s) => s.thread.number)).toEqual(second.slots.map((s) => s.thread.number))
    expect(Array.from(first.slot)).toEqual(Array.from(second.slot))
    expect(Array.from(first.visiblyOff)).toEqual(Array.from(second.visiblyOff))
    expect(first.slots.length).toBeGreaterThan(0)
    expect(first.slots.length).toBeLessThanOrEqual(10)

    // Lightest -> darkest by OKLab L.
    for (let i = 1; i < first.slots.length; i++) {
      expect(first.slots[i - 1].thread.oklab.L).toBeGreaterThanOrEqual(first.slots[i].thread.oklab.L)
    }

    // Distinct threads, shares sum to ~1.
    const uniqueNumbers = new Set(first.slots.map((s) => s.thread.number))
    expect(uniqueNumbers.size).toBe(first.slots.length)
    const areaSum = first.slots.reduce((acc, s) => acc + s.area, 0)
    expect(areaSum).toBeCloseTo(1, 5)
  })

  it('supports any custom thread count (e.g. 3, 11, 22) and improves mean ΔE00 as count increases', () => {
    const m3 = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, { mode: 'full-color', budget: 3 })
    const m11 = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, { mode: 'full-color', budget: 11 })
    const m22 = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, { mode: 'full-color', budget: 22 })

    expect(m3.slots.length).toBe(3)
    expect(m11.slots.length).toBe(11)
    expect(m22.slots.length).toBe(22)
    expect(m22.score.meanDeltaE00).toBeLessThan(m11.score.meanDeltaE00)
    expect(m11.score.meanDeltaE00).toBeLessThan(m3.score.meanDeltaE00)
  })

  it('keeps the thread-count slider strictly monotonic: +1 step adds at most one thread without reshuffling existing ones', () => {
    const ladder = buildThreadLadder(PORTRAIT.data, ALL_THREADS, {
      maxBudget: 20,
      fidelity: 'faithful',
    })
    expect(ladder.length).toBeGreaterThanOrEqual(16)

    let prevSet = new Set<string>()
    for (let k = 2; k <= 16; k++) {
      const m = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
        mode: 'full-color',
        budget: k,
        detail: 'crisp',
        fidelity: 'faithful',
      })
      const curSet = new Set(m.slots.map((s) => s.thread.number))
      // Every previous thread that had pixels remains in the palette; at most 1 new thread enters.
      let added = 0
      for (const num of curSet) {
        if (!prevSet.has(num)) added++
      }
      if (prevSet.size > 0) {
        expect(added).toBeLessThanOrEqual(1)
        for (const oldNum of prevSet) {
          expect(curSet.has(oldNum)).toBe(true)
        }
      }
      // Matches explicit ladder slice identically.
      const sliced = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
        mode: 'full-color',
        budget: k,
        detail: 'crisp',
        fidelity: 'faithful',
        paletteNumbers: ladder.slice(0, k),
      })
      expect(sliced.slots.map((s) => s.thread.number)).toEqual(m.slots.map((s) => s.thread.number))
      prevSet = curSet
    }
  })

  it('preserves exact palette & manual swap flags when passing paletteNumbers across detail presets', () => {
    const ladder = buildThreadLadder(LANDSCAPE.data, ALL_THREADS, { maxBudget: 12 })
    const customPalette = [...ladder.slice(0, 7), '666']
    const crisp = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 8,
      detail: 'crisp',
      paletteNumbers: customPalette,
      swappedNumbers: ['666'],
    })
    const broad = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 8,
      detail: 'broad',
      paletteNumbers: customPalette,
      swappedNumbers: ['666'],
    })
    const swappedCrisp = crisp.slots.find((s) => s.thread.number === '666')
    const swappedBroad = broad.slots.find((s) => s.thread.number === '666')
    expect(swappedCrisp?.swapped).toBe(true)
    expect(swappedBroad?.swapped).toBe(true)
  })

  it('matches culori lab65 conversion to < 1e-4 across representative colors', () => {
    const toLab65 = converter('lab65')
    const samples: Array<[number, number, number]> = [
      [0, 0, 0],
      [255, 255, 255],
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [182, 134, 108],
      [42, 95, 148],
      [214, 198, 175],
    ]
    for (const [r, g, b] of samples) {
      const fast = srgb8ToLab65(r, g, b)
      const ref = toLab65({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })!
      expect(fast[0]).toBeCloseTo(ref.l, 3)
      expect(fast[1]).toBeCloseTo(ref.a, 3)
      expect(fast[2]).toBeCloseTo(ref.b, 3)
    }
  })

  it('nudges close ties toward owned threads when preferBox is enabled without forcing poor matches', () => {
    // Find a catalog thread that has a genuine close neighbor (0.3 < ΔE00 < 1.4).
    let base: DMCThread | undefined
    let closeNeighbor: DMCThread | undefined
    for (const candidate of ALL_THREADS) {
      const hit = getSwapOptions(candidate, ALL_THREADS, []).substitutes.find(
        (t) => t.deltaE00 > 0.3 && t.deltaE00 < 1.4,
      )
      if (hit) {
        base = candidate
        closeNeighbor = hit
        break
      }
    }
    expect(base).toBeDefined()
    expect(closeNeighbor).toBeDefined()

    // Solid 16x16 patch matching `base`.
    const rgba = new Uint8ClampedArray(16 * 16 * 4)
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = base!.rgb.r
      rgba[i + 1] = base!.rgb.g
      rgba[i + 2] = base!.rgb.b
      rgba[i + 3] = 255
    }

    const withoutBox = buildThreadMap(rgba, 16, 16, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
      preferBox: false,
      ownedNumbers: [closeNeighbor!.number],
    })
    const withBox = buildThreadMap(rgba, 16, 16, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
      preferBox: true,
      ownedNumbers: [closeNeighbor!.number],
    })
    expect(withoutBox.slots[0].thread.number).toBe(base!.number)
    expect(withBox.slots[0].thread.number).toBe(closeNeighbor!.number)

    // A far-away owned thread (pure black 310 for a bright yellow patch) must NOT be forced.
    const yellow = ALL_THREADS.find((t) => t.number === '307')!
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = yellow.rgb.r
      rgba[i + 1] = yellow.rgb.g
      rgba[i + 2] = yellow.rgb.b
      rgba[i + 3] = 255
    }
    const farBox = buildThreadMap(rgba, 16, 16, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
      preferBox: true,
      ownedNumbers: ['310'],
    })
    expect(farBox.slots[0].thread.number).not.toBe('310')
  })

  it('keeps transparent pixels marked NO_THREAD (255)', () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4)
    // Top half opaque red, bottom half transparent.
    for (let i = 0; i < 8; i++) {
      rgba[i * 4] = 180
      rgba[i * 4 + 1] = 60
      rgba[i * 4 + 2] = 50
      rgba[i * 4 + 3] = 255
    }
    const map = buildThreadMap(rgba, 4, 4, ALL_THREADS, { mode: 'full-color', budget: 6 })
    for (let i = 0; i < 8; i++) expect(map.slot[i]).not.toBe(NO_THREAD)
    for (let i = 8; i < 16; i++) expect(map.slot[i]).toBe(NO_THREAD)
  })
})

describe('buildThreadMap — Monochrome / Value Ramp mode', () => {
  it.each(MONOCHROME_TONES.map((t) => t.id))('produces strictly monotonic OKLab L inside the %s pool for 5, 7, and 9 steps', (tone: MonochromeTone) => {
    const poolIds = new Set(getMonochromePool(ALL_THREADS, tone).map((t) => t.id))
    expect(poolIds.size).toBeGreaterThanOrEqual(9)

    for (const budget of [5, 7, 9] as const) {
      const map = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
        mode: 'monochrome',
        budget,
        monochromeTone: tone,
      })

      expect(map.slots.length).toBe(budget)
      expect(map.score.visiblyOffArea).toBe(0)
      for (const s of map.slots) {
        expect(poolIds.has(s.thread.id)).toBe(true)
      }
      // Strictly decreasing OKLab L (no duplicate-value clusters).
      for (let i = 1; i < map.slots.length; i++) {
        expect(map.slots[i - 1].thread.oklab.L).toBeGreaterThan(map.slots[i].thread.oklab.L + 0.01)
      }
    }
  })

  it('assigns every pixel strictly by OKLab L regardless of hue', () => {
    // Two pixels with identical lightness (roughly) or two clear bands: bright warm vs dark cool.
    const rgba = new Uint8ClampedArray(4 * 2 * 4)
    for (let i = 0; i < 4; i++) {
      rgba[i * 4] = 240; rgba[i * 4 + 1] = 235; rgba[i * 4 + 2] = 220; rgba[i * 4 + 3] = 255
    }
    for (let i = 4; i < 8; i++) {
      rgba[i * 4] = 30; rgba[i * 4 + 1] = 35; rgba[i * 4 + 2] = 45; rgba[i * 4 + 3] = 255
    }
    const map = buildThreadMap(rgba, 4, 2, ALL_THREADS, {
      mode: 'monochrome',
      budget: 5,
      monochromeTone: 'cool-grays',
    })
    // Top row is lightest slot (0), bottom row is darkest slot (4).
    for (let i = 0; i < 4; i++) expect(map.slot[i]).toBe(0)
    for (let i = 4; i < 8; i++) expect(map.slot[i]).toBe(map.slots.length - 1)
  })
})

describe('swapMapThread', () => {
  it('updates Full Color pixels, shares, and scores live', () => {
    const map = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
    })
    const targetIdx = 2
    const originalThread = map.slots[targetIdx].thread
    const replacement = getSwapOptions(originalThread, ALL_THREADS, [], map.slots.map((s) => s.thread.number)).substitutes[0]
    expect(replacement).toBeDefined()

    const swapped = swapMapThread(map, PORTRAIT.data, targetIdx, replacement)
    expect(swapped.slots[targetIdx].thread.id).toBe(replacement.id)
    expect(swapped.slots[targetIdx].swapped).toBe(true)
    expect(swapped.slots.length).toBe(map.slots.length)
    const areaSum = swapped.slots.reduce((acc, s) => acc + s.area, 0)
    expect(areaSum).toBeCloseTo(1, 5)
    expect(Number.isFinite(swapped.score.meanDeltaE00)).toBe(true)
  })

  it('preserves slot regions when swapping in Monochrome mode', () => {
    const map = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'monochrome',
      budget: 7,
      monochromeTone: 'warm-grays',
    })
    const replacement = ALL_THREADS.find((t) => t.number === '415')! // Cool Pearl Gray
    const swapped = swapMapThread(map, PORTRAIT.data, 3, replacement)

    expect(swapped.slots[3].thread.number).toBe('415')
    expect(swapped.slots[3].swapped).toBe(true)
    // Exact same pixel region assignments!
    expect(Array.from(swapped.slot)).toEqual(Array.from(map.slot))
    expect(swapped.slots[3].area).toBeCloseTo(map.slots[3].area, 6)
  })
})

describe('mapFit copy & trust guardrails', () => {
  it('never uses the word exact or claims verified in any summary or caveat', () => {
    const full = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 10,
    })
    const mono = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'monochrome',
      budget: 7,
      monochromeTone: 'sepia-browns',
    })
    const texts = [
      THREAD_MAP_CAVEAT_CATALOG,
      THREAD_MAP_CAVEAT_REAL,
      THREAD_MAP_CAVEAT_COPY,
      THREAD_MAP_PRINT_CAVEAT,
      describeThreadMap(full).headline,
      ...describeThreadMap(full).notes,
      ...describeThreadMap(full).facts.flatMap((f) => [f.label, f.value]),
      describeThreadMap(mono).headline,
      ...describeThreadMap(mono).notes,
      ...describeThreadMap(mono).facts.flatMap((f) => [f.label, f.value]),
    ].join(' ')

    expect(texts).not.toMatch(/\bexact\b/i)
    expect(texts).not.toMatch(/\bverified\b/i)
  })

  it('builds pull names within 40 chars and avoids duplicates', () => {
    const mono = buildThreadMap(PORTRAIT.data, PORTRAIT.width, PORTRAIT.height, ALL_THREADS, {
      mode: 'monochrome',
      budget: 7,
      monochromeTone: 'warm-grays',
    })
    const name1 = buildPullName('Very Long Portrait Study Photograph Name Final v2.jpg', mono, [])
    expect(name1.length).toBeLessThanOrEqual(40)
    const name2 = buildPullName('Very Long Portrait Study Photograph Name Final v2.jpg', mono, [name1])
    expect(name2.length).toBeLessThanOrEqual(40)
    expect(name2).not.toBe(name1)
  })
})
