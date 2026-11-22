import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THREAD_MAP_DETAIL, DEFAULT_THREAD_MAP_FIDELITY, NO_THREAD, type ThreadMapResult } from '@/lib/dmc/map/types'
import type { DMCThread } from '@/lib/dmc/types'
import {
  renderThreadMap,
  renderThreadMapOutline,
  slotBounds,
  threadSlotAt,
} from './threadMapRender'

const ALL_THREADS: DMCThread[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)
const WHITE = ALL_THREADS.find((t) => t.number === 'White')!
const RED = ALL_THREADS.find((t) => t.number === '666')!
const BLACK = ALL_THREADS.find((t) => t.number === '310')!

function makeSyntheticMap(
  width: number,
  height: number,
  threads: DMCThread[],
  slot: Uint8Array,
): ThreadMapResult {
  return {
    mode: 'full-color',
    budget: threads.length,
    monochromeTone: null,
    detail: DEFAULT_THREAD_MAP_DETAIL,
    fidelity: DEFAULT_THREAD_MAP_FIDELITY,
    preferBox: false,
    width,
    height,
    slots: threads.map((thread, index) => ({
      index,
      thread,
      area: 1 / threads.length,
      meanDeltaE00: 1,
      meanDeltaL: 0.01,
      targetHex: thread.hex,
      swapped: false,
    })),
    slot,
    visiblyOff: new Uint8Array(width * height),
    score: {
      threadCount: threads.length,
      meanDeltaE00: 1,
      p95DeltaE00: 2,
      meanDeltaL: 0.01,
      visiblyOffArea: 0,
      approximateThreads: 0,
    },
    imageOklabLRange: { min: 0.1, max: 0.95 },
    ms: 1,
  }
}

describe('renderThreadMap — tracing-paper isolation & boundary contours', () => {
  it('ghosts non-selected pixels using original photo luminance and draws crisp 1px dark contour on light threads', () => {
    const w = 10
    const h = 10
    const slot = new Uint8Array(w * h).fill(1) // background = BLACK (slot 1)
    // 4x4 block of WHITE (slot 0) in the center at x=3..6, y=3..6.
    for (let y = 3; y <= 6; y++) {
      for (let x = 3; x <= 6; x++) slot[y * w + x] = 0
    }
    const map = makeSyntheticMap(w, h, [WHITE, BLACK], slot)

    // Source photo: top half dark (20), bottom half bright (220).
    const src = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      const v = y < 5 ? 20 : 220
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4
        src[o] = v; src[o + 1] = v; src[o + 2] = v; src[o + 3] = 255
      }
    }

    const out = renderThreadMap(map, { selected: 0, markMisses: false, sourcePixels: src })

    // Ghosted non-selected pixels reflect source photo luminance (bright bottom > dark top) over warm white.
    const topGhostO = (1 * w + 1) * 4
    const bottomGhostO = (8 * w + 1) * 4
    expect(out[topGhostO]).toBeGreaterThan(175)
    expect(out[bottomGhostO]).toBeGreaterThan(out[topGhostO] + 40)

    // Interior pixel of isolated WHITE (4, 4) keeps its bright thread color.
    const interiorO = (4 * w + 4) * 4
    expect(out[interiorO]).toBe(WHITE.rgb.r)

    // Perimeter pixel of isolated WHITE (3, 4) gets crisp dark-ink contour so white pops on tracing paper.
    const edgeO = (4 * w + 3) * 4
    expect(out[edgeO]).toBeLessThan(110)
  })

  it('draws a darker rim on mid/dark isolated threads and falls back cleanly without sourcePixels', () => {
    const w = 10
    const h = 10
    const slot = new Uint8Array(w * h).fill(1)
    for (let y = 3; y <= 6; y++) {
      for (let x = 3; x <= 6; x++) slot[y * w + x] = 0
    }
    const map = makeSyntheticMap(w, h, [RED, WHITE], slot)
    const out = renderThreadMap(map, { selected: 0, markMisses: false })

    const interiorO = (4 * w + 4) * 4
    const edgeO = (4 * w + 3) * 4
    expect(out[interiorO]).toBe(RED.rgb.r)
    expect(out[edgeO]).toBeLessThan(RED.rgb.r * 0.7)
    // Non-selected pixel faded cleanly toward warm light gray.
    const bgO = (0 * w + 0) * 4
    expect(out[bgO]).toBeGreaterThan(220)
  })

  it('live-previews a substitute color on only the targeted slot without mutating the map', () => {
    const w = 6
    const h = 4
    const slot = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) slot[y * w + x] = x < 3 ? 0 : 1
    }
    const map = makeSyntheticMap(w, h, [WHITE, RED], slot)
    const out = renderThreadMap(map, {
      selected: null,
      markMisses: false,
      previewSwap: { slotIndex: 0, thread: BLACK },
    })

    // Slot 0 pixels repaint in BLACK; slot 1 pixels stay RED; map.slots[0] stays WHITE.
    expect(out[(1 * w + 1) * 4]).toBe(BLACK.rgb.r)
    expect(out[(1 * w + 1) * 4 + 1]).toBe(BLACK.rgb.g)
    expect(out[(1 * w + 1) * 4 + 2]).toBe(BLACK.rgb.b)
    expect(out[(1 * w + 4) * 4]).toBe(RED.rgb.r)
    expect(map.slots[0].thread.id).toBe(WHITE.id)
  })
})

describe('renderThreadMapOutline — Fabric Transfer Outline & Mirror', () => {
  it('draws crisp single-pixel dark boundary lines on pure white and flips horizontally when mirrored', () => {
    const w = 20
    const h = 10
    const slot = new Uint8Array(w * h).fill(1)
    // Left region x = 0..5 belongs to slot 0; boundary lies along x = 5.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x <= 5; x++) slot[y * w + x] = 0
    }
    const map = makeSyntheticMap(w, h, [WHITE, RED], slot)

    const normal = renderThreadMapOutline(map, { selected: null, mirror: false })
    // Interior pixels are pure white (#FFFFFF).
    expect(normal[(5 * w + 2) * 4]).toBe(255)
    expect(normal[(5 * w + 12) * 4]).toBe(255)
    // Boundary at x = 5 is dark ink, and adjacent x = 6 stays white (clean 1px single line).
    expect(normal[(5 * w + 5) * 4]).toBeLessThan(40)
    expect(normal[(5 * w + 6) * 4]).toBe(255)

    const mirrored = renderThreadMapOutline(map, { selected: null, mirror: true })
    // Mirrored boundary moves to x = width - 1 - 5 = 14.
    expect(mirrored[(5 * w + 14) * 4]).toBeLessThan(40)
    expect(mirrored[(5 * w + 5) * 4]).toBe(255)
  })

  it('emphasizes the isolated slot contour and softens unrelated region boundaries', () => {
    const w = 30
    const h = 10
    const slot = new Uint8Array(w * h).fill(2)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < 10; x++) slot[y * w + x] = 0
      for (let x = 10; x < 20; x++) slot[y * w + x] = 1
    }
    const map = makeSyntheticMap(w, h, [WHITE, RED, BLACK], slot)
    const out = renderThreadMapOutline(map, { selected: 0, mirror: false })

    // Selected boundary at x = 9 is deep black (#111).
    expect(out[(5 * w + 9) * 4]).toBe(17)
    // Unrelated boundary between slot 1 and slot 2 at x = 19 is softened light gray (~204).
    expect(out[(5 * w + 19) * 4]).toBeGreaterThan(180)
    expect(out[(5 * w + 19) * 4]).toBeLessThan(230)
  })
})

describe('slotBounds — cluster-aware, outlier-resistant Zoom in', () => {
  it('focuses tightly on the primary dense region and ignores a stray opposite-corner speckle', () => {
    const w = 100
    const h = 100
    const slot = new Uint8Array(w * h).fill(1)
    // Primary 20x20 patch (400 px) at x=10..29, y=10..29.
    for (let y = 10; y < 30; y++) {
      for (let x = 10; x < 30; x++) slot[y * w + x] = 0
    }
    // Tiny stray 2x2 speckle (4 px) at opposite corner (95..96, 95..96).
    slot[95 * w + 95] = 0
    slot[95 * w + 96] = 0
    slot[96 * w + 95] = 0
    slot[96 * w + 96] = 0

    const map = makeSyntheticMap(w, h, [RED, WHITE], slot)
    const rect = slotBounds(map, 0)!
    expect(rect).not.toBeNull()
    expect(rect.x).toBeCloseTo(0.1, 4)
    expect(rect.y).toBeCloseTo(0.1, 4)
    expect(rect.width).toBeCloseTo(0.2, 4)
    expect(rect.height).toBeCloseTo(0.2, 4)
  })

  it('covers two significant regions (e.g. a pair of eyes) while ignoring a stray far-away speck', () => {
    const w = 100
    const h = 100
    const slot = new Uint8Array(w * h).fill(1)
    // Two 10x10 eyes (100 px each) at (20..29, 20..29) and (45..54, 20..29).
    for (let y = 20; y < 30; y++) {
      for (let x = 20; x < 30; x++) slot[y * w + x] = 0
      for (let x = 45; x < 55; x++) slot[y * w + x] = 0
    }
    // Stray 3px speckle at bottom-right (97..99, 98).
    slot[98 * w + 97] = 0
    slot[98 * w + 98] = 0
    slot[98 * w + 99] = 0

    const map = makeSyntheticMap(w, h, [BLACK, WHITE], slot)
    const rect = slotBounds(map, 0)!
    expect(rect.x).toBeCloseTo(0.2, 4)
    expect(rect.y).toBeCloseTo(0.2, 4)
    expect(rect.width).toBeCloseTo(0.35, 4)
    expect(rect.height).toBeCloseTo(0.1, 4)
  })

  it('uses trimmed percentile bounds for finely scattered accent dots so far outliers cannot hijack zoom', () => {
    const w = 100
    const h = 100
    const slot = new Uint8Array(w * h).fill(1)
    // 25 tiny 1px dots clustered inside x=10..30, y=10..30.
    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        slot[(10 + dy * 5) * w + (10 + dx * 5)] = 0
      }
    }
    // 1 stray outlier dot at (99, 99).
    slot[99 * w + 99] = 0

    const map = makeSyntheticMap(w, h, [RED, WHITE], slot)
    const rect = slotBounds(map, 0)!
    expect(rect.x + rect.width).toBeLessThan(0.4)
    expect(rect.y + rect.height).toBeLessThan(0.4)
  })

  it('falls back cleanly for genuinely tiny accent threads and returns null for empty slots', () => {
    const w = 50
    const h = 50
    const slot = new Uint8Array(w * h).fill(NO_THREAD)
    // Single 4px catchlight at (24..25, 18..19).
    slot[18 * w + 24] = 0
    slot[18 * w + 25] = 0
    slot[19 * w + 24] = 0
    slot[19 * w + 25] = 0

    const map = makeSyntheticMap(w, h, [WHITE, BLACK], slot)
    const rect = slotBounds(map, 0)!
    expect(rect.x).toBeCloseTo(24 / 50, 4)
    expect(rect.y).toBeCloseTo(18 / 50, 4)
    expect(rect.width).toBeCloseTo(2 / 50, 4)
    expect(rect.height).toBeCloseTo(2 / 50, 4)
    expect(slotBounds(map, 1)).toBeNull()
    expect(threadSlotAt(map, 24, 18, 50, 50)).toBe(0)
    expect(threadSlotAt(map, 0, 0, 50, 50)).toBeNull()
  })
})
