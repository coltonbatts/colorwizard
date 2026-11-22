import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import type { DMCThread } from '../types'
import { buildThreadMapCard, THREAD_MAP_CARD } from './card'
import { buildThreadMap, swapMapThread } from './engine'

const ALL_THREADS: DMCThread[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'public/data/dmc-floss.json'), 'utf8'),
)
const CORPUS = loadCorpus('synthetic')
const LANDSCAPE = CORPUS.find((img) => img.name === 'landscape')!
const HIGH_KEY = CORPUS.find((img) => img.name === 'high-key')!

describe('buildThreadMapCard', () => {
  it('fits image geometry within the 718x980 page budget and places non-overlapping badges', () => {
    const map = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 10,
    })
    const card = buildThreadMapCard(map, {
      pictureName: 'landscape.png',
      dateText: 'November 20, 2026',
      ownedNumbers: [map.slots[0].thread.number],
    })

    expect(card.title).toBe('landscape')
    expect(card.image.width).toBeLessThanOrEqual(THREAD_MAP_CARD.imageMaxWidth)
    expect(card.image.height).toBeLessThanOrEqual(THREAD_MAP_CARD.imageMaxHeight)
    expect(card.columns.flat().length).toBe(map.slots.length)
    expect(card.columns[0][0].owned).toBe(true)

    // Every badge sits on a pixel of its own slot, and no two badges overlap.
    const minDist = 2 * card.badgeRadius
    for (let i = 0; i < card.badges.length; i++) {
      const b = card.badges[i]
      const px = Math.floor(b.x)
      const py = Math.floor(b.y)
      expect(map.slot[py * map.width + px]).toBe(b.number - 1)

      for (let j = i + 1; j < card.badges.length; j++) {
        const o = card.badges[j]
        expect(Math.hypot(b.x - o.x, b.y - o.y)).toBeGreaterThanOrEqual(minDist - 1e-6)
      }
    }

    // Labeled + unlabeled covers every slot that owns pixels.
    const labeledNums = new Set(card.badges.map((b) => b.number))
    for (const s of map.slots) {
      const num = s.index + 1
      if (s.area > 0) {
        expect(labeledNums.has(num) || card.unlabeled.includes(num)).toBe(true)
      }
    }
  })

  it('reports unlabeled threads cleanly when thin/speckled regions have no badge room', () => {
    // 1px checkerboard noise: no spot can reach 0.6 purity for a full badge.
    const w = 120
    const h = 120
    const rgba = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4
        const even = (x + y) % 2 === 0
        rgba[o] = even ? 230 : 35
        rgba[o + 1] = even ? 225 : 35
        rgba[o + 2] = even ? 215 : 40
        rgba[o + 3] = 255
      }
    }
    const map = buildThreadMap(rgba, w, h, ALL_THREADS, {
      mode: 'monochrome',
      budget: 5,
      monochromeTone: 'neutral-grays',
    })
    const card = buildThreadMapCard(map, { dateText: 'November 20, 2026' })
    expect(card.badges.length).toBe(0)
    expect(card.unlabeled.length).toBeGreaterThan(0)
    expect(card.unlabeledNote).toMatch(/no room for a number/)
  })

  it('stays deterministic and free of forbidden trust words', () => {
    const map = buildThreadMap(HIGH_KEY.data, HIGH_KEY.width, HIGH_KEY.height, ALL_THREADS, {
      mode: 'monochrome',
      budget: 7,
      monochromeTone: 'warm-grays',
    })
    const a = buildThreadMapCard(map, { pictureName: 'high-key', dateText: 'November 20, 2026' })
    const b = buildThreadMapCard(map, { pictureName: 'high-key', dateText: 'November 20, 2026' })
    expect(a).toEqual(b)

    const allCopy = [
      a.title,
      a.metaLine,
      a.headline,
      ...a.notes,
      ...a.facts.flatMap((f) => [f.label, f.value]),
      a.orderNote,
      a.unlabeledNote ?? '',
      ...a.caveats,
    ].join(' ')
    expect(allCopy).not.toMatch(/exact/i)
    expect(allCopy).not.toMatch(/verified/i)
  })

  it('builds a 1-page B&W Transfer Outline card with optional mirroring and mirrored badge coordinates', () => {
    const map = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 10,
      detail: 'painterly',
    })
    const normal = buildThreadMapCard(map, {
      variant: 'transfer-outline',
      mirror: false,
      showNumbers: true,
      pictureName: 'landscape.png',
      dateText: 'November 20, 2026',
    })
    const mirrored = buildThreadMapCard(map, {
      variant: 'transfer-outline',
      mirror: true,
      showNumbers: true,
      pictureName: 'landscape.png',
      dateText: 'November 20, 2026',
    })
    const noNums = buildThreadMapCard(map, {
      variant: 'transfer-outline',
      mirror: false,
      showNumbers: false,
      pictureName: 'landscape.png',
      dateText: 'November 20, 2026',
    })

    expect(normal.variant).toBe('transfer-outline')
    expect(normal.image.width).toBeLessThanOrEqual(THREAD_MAP_CARD.pageWidth - 2)
    expect(normal.image.width).toBeGreaterThan(THREAD_MAP_CARD.imageMaxWidth)
    expect(normal.metaLine).toContain('Transfer outline')
    expect(mirrored.metaLine).toContain('Transfer outline (mirrored)')
    expect(mirrored.badges.length).toBe(normal.badges.length)
    for (let i = 0; i < normal.badges.length; i++) {
      expect(mirrored.badges[i].number).toBe(normal.badges[i].number)
      expect(mirrored.badges[i].x).toBeCloseTo(map.width - normal.badges[i].x, 5)
      expect(mirrored.badges[i].y).toBeCloseTo(normal.badges[i].y, 5)
    }
    expect(noNums.badges.length).toBe(0)
    expect(noNums.unlabeledNote).toBeNull()
  })

  it('labels substituted and shared DMC slots clearly on the printed card without forbidden words', () => {
    const base = buildThreadMap(LANDSCAPE.data, LANDSCAPE.width, LANDSCAPE.height, ALL_THREADS, {
      mode: 'full-color',
      budget: 6,
    })
    const origNum = base.slots[1].thread.number
    const targetThread = base.slots[4].thread
    const swapped = swapMapThread(base, LANDSCAPE.data, 1, targetThread)

    const card = buildThreadMapCard(swapped, {
      pictureName: 'landscape.png',
      dateText: 'November 21, 2026',
    })
    const cells = card.columns.flat()
    expect(cells[1].dmcNumber).toBe(targetThread.number)
    expect(cells[1].swatchHex).toBe(targetThread.hex)
    expect(cells[1].detail).toContain(`Replaced ${origNum}`)
    expect(cells[1].detail).toContain('Also #5')
    expect(cells[4].detail).toContain('Also #2')
    expect(card.facts.find((f) => f.label === 'Skeins')?.value).toContain('5 (6 areas)')

    const allCopy = [
      card.headline,
      ...card.notes,
      ...card.facts.flatMap((f) => [f.label, f.value]),
      ...cells.map((c) => c.detail),
      ...card.caveats,
    ].join(' ')
    expect(allCopy).not.toMatch(/\bexact\b/i)
    expect(allCopy).not.toMatch(/\bverified\b/i)
  })
})
