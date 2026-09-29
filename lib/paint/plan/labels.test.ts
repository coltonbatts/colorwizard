import { describe, expect, it } from 'vitest'
import { PALETTES } from './benchmark'
import { loadCorpus } from './fixtures/corpus'
import { distanceToOtherPiles, placeLabels, purityMap, type LabelOptions } from './labels'
import { planPicture, type PicturePlan } from './picture'

/** Small seeded random pile map with blobs, for comparing against brute force. */
function blobMap(width: number, height: number, count: number, seed: number): Uint8Array {
  let s = seed
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const centers = Array.from({ length: count }, () => [rnd() * width, rnd() * height])
  const map = new Uint8Array(width * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let best = 0
      let bestD = Infinity
      centers.forEach(([cx, cy], i) => {
        const d = (x - cx) ** 2 + (y - cy) ** 2
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      map[y * width + x] = best
    }
  return map
}

/** Pixels of pile `id` whose centers are within `rad` of (x, y), over all pixels within `rad`, outside the picture counting as not the pile. */
function brutePurity(pile: Uint8Array, width: number, height: number, id: number, x: number, y: number, rad: number): number {
  const reach = Math.floor(rad)
  let owned = 0
  let total = 0
  for (let dy = -reach; dy <= reach; dy++)
    for (let dx = -reach; dx <= reach; dx++) {
      if (dx * dx + dy * dy > rad * rad) continue
      total++
      const px = x + dx
      const py = y + dy
      if (px >= 0 && px < width && py >= 0 && py < height && pile[py * width + px] === id) owned++
    }
  return owned / total
}

describe('distanceToOtherPiles', () => {
  it('is the exact Euclidean distance to the nearest pixel of another pile, or the picture edge', () => {
    const w = 23
    const h = 17
    const map = blobMap(w, h, 4, 3)
    for (let id = 0; id < 4; id++) {
      const dist = distanceToOtherPiles(map, w, h, id)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (map[y * w + x] !== id) {
            expect(dist[y * w + x]).toBe(0)
            continue
          }
          let want = Infinity
          for (let qy = -1; qy <= h; qy++)
            for (let qx = -1; qx <= w; qx++) {
              const outside = qx < 0 || qy < 0 || qx >= w || qy >= h
              if (outside || map[qy * w + qx] !== id) want = Math.min(want, Math.hypot(qx - x, qy - y))
            }
          expect(dist[y * w + x]).toBeCloseTo(want, 4)
        }
    }
  })
})

describe('purityMap', () => {
  it('matches a brute-force count of the disc, including at the picture edge', () => {
    const w = 31
    const h = 22
    const map = blobMap(w, h, 5, 11)
    for (const rad of [2.5, 4, 5.6]) {
      for (let id = 0; id < 5; id++) {
        const pur = purityMap(map, w, h, id, rad)
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            if (map[y * w + x] !== id) expect(pur[y * w + x]).toBe(0)
            else expect(pur[y * w + x]).toBeCloseTo(brutePurity(map, w, h, id, x, y, rad), 5)
          }
      }
    }
  })
})

describe('placeLabels on a drawn map', () => {
  it('puts one badge in the middle of each wide stripe and reports a stripe too thin for one', () => {
    const w = 120
    const h = 60
    const map = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) map[y * w + x] = x < 50 ? 0 : x < 53 ? 1 : 2
    const { labels, unlabeled } = placeLabels(map, w, h, 3, { radius: 8 })
    expect(labels.map((l) => l.pile)).toEqual([0, 2])
    expect(unlabeled).toEqual([1])
    expect(Math.abs(labels[0].x - 24)).toBeLessThanOrEqual(3) // the middle of pile 0's stripe...
    expect(Math.abs(labels[0].y - 29)).toBeLessThanOrEqual(3) // ...and of the picture's height
  })

  it('moves a badge along its pile to keep clear of a neighbor’s, rather than let two touch', () => {
    // two tall strips 14 wide: each holds a badge, but side by side their middles are closer than two badges
    const w = 28
    const h = 120
    const map = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) map[y * w + x] = x < 14 ? 0 : 1
    const { labels, unlabeled } = placeLabels(map, w, h, 2, { radius: 8 })
    expect(unlabeled).toEqual([])
    expect(labels).toHaveLength(2)
    expect(Math.hypot(labels[0].x - labels[1].x, labels[0].y - labels[1].y)).toBeGreaterThanOrEqual(2 * 8)
  })

  it('does not label a pile that owns nothing, and does not count it as unlabeled', () => {
    const map = new Uint8Array(40 * 40) // everything is pile 0
    const { labels, unlabeled } = placeLabels(map, 40, 40, 3, { radius: 6 })
    expect(labels.map((l) => l.pile)).toEqual([0])
    expect(unlabeled).toEqual([])
  })

  it('gives a large pile a second badge far from its first, only when asked', () => {
    const map = new Uint8Array(300 * 60)
    const one = placeLabels(map, 300, 60, 1, { radius: 8 })
    const two = placeLabels(map, 300, 60, 1, { radius: 8, perPile: 2 })
    expect(one.labels).toHaveLength(1)
    expect(two.labels).toHaveLength(2)
    expect(Math.hypot(two.labels[0].x - two.labels[1].x, two.labels[0].y - two.labels[1].y)).toBeGreaterThanOrEqual(64)
  })
})

/** A busy picture: three octaves of seeded value noise across the color wheel, with speckle. Nothing in it is a large flat region. */
function busyPicture(width: number, height: number): Uint8ClampedArray {
  let s = 99
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
  const grids = [4, 9, 23].map((n) => Array.from({ length: (n + 1) * (n + 1) }, () => rnd()))
  const noise = (g: number[], n: number, x: number, y: number) => {
    const fx = (x / width) * n
    const fy = (y / height) * n
    const ix = Math.floor(fx)
    const iy = Math.floor(fy)
    const tx = fx - ix
    const ty = fy - iy
    const at = (i: number, j: number) => g[j * (n + 1) + i]
    return (at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx) * (1 - ty) + (at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx) * ty
  }
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = 0.5 * noise(grids[0], 4, x, y) + 0.3 * noise(grids[1], 9, x, y) + 0.2 * noise(grids[2], 23, x, y) + (rnd() - 0.5) * 0.12
      const hue = v * 300
      const light = 0.25 + 0.55 * noise(grids[1], 9, y, x)
      const c = (n: number) => Math.round(255 * Math.min(1, Math.max(0, light + 0.35 * Math.cos(((hue + n) * Math.PI) / 180))))
      data.set([c(0), c(120), c(240), 255], (y * width + x) * 4)
    }
  return data
}

const corpus = loadCorpus('synthetic')
const cases: Array<[string, () => Promise<PicturePlan>]> = []
for (const name of ['landscape', 'sunset', 'portrait-light', 'low-key', 'high-key']) {
  for (const budget of [5, 12]) {
    cases.push([`${name} at ${budget} piles`, () => {
      const image = corpus.find((i) => i.name === name)!
      return planPicture(image.data, image.width, image.height, budget, PALETTES.core6.pigments)
    }])
  }
}
cases.push(['a busy picture at 12 piles', () => planPicture(busyPicture(256, 192), 256, 192, 12, PALETTES.core6.pigments)])

describe('placeLabels on real plans', () => {
  const options: LabelOptions = { radius: 8, perPile: 2 }
  it.each(cases)('%s: badges sit in their own pile, do not touch, and leave no admissible spot for an unlabeled pile', async (_name, make) => {
    const p = await make()
    const count = p.plan.piles.length
    const { labels, unlabeled } = placeLabels(p.pile, p.width, p.height, count, options)
    const ringRadius = options.radius * 1.4
    const minPurity = 0.6

    for (const l of labels) {
      expect(p.pile[l.y * p.width + l.x]).toBe(l.pile) // the center is a pixel of its own pile
      expect(brutePurity(p.pile, p.width, p.height, l.pile, l.x, l.y, ringRadius)).toBeGreaterThanOrEqual(minPurity - 1e-9)
    }
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++) {
        expect(Math.hypot(labels[i].x - labels[j].x, labels[i].y - labels[j].y)).toBeGreaterThanOrEqual(2 * options.radius) // the discs do not overlap
      }
    for (let pile = 0; pile < count; pile++) expect(labels.filter((l) => l.pile === pile).length).toBeLessThanOrEqual(options.perPile!)

    // every pile that owns pixels is labeled or reported, never both, and a pile that owns nothing is neither
    const labeled = new Set(labels.map((l) => l.pile))
    for (let pile = 0; pile < count; pile++) {
      const owns = p.pile.some((v) => v === pile)
      expect(labeled.has(pile) || unlabeled.includes(pile)).toBe(owns)
      expect(labeled.has(pile) && unlabeled.includes(pile)).toBe(false)
    }
    // "unlabeled" is honest: no pixel of that pile is pure enough AND clear of every badge
    for (const pile of unlabeled) {
      const pur = purityMap(p.pile, p.width, p.height, pile, ringRadius)
      for (let i = 0; i < pur.length; i++) {
        if (pur[i] < minPurity) continue
        const x = i % p.width
        const y = (i - x) / p.width
        expect(labels.some((l) => Math.hypot(l.x - x, l.y - y) < 2.5 * options.radius)).toBe(true)
      }
    }
  })

  it('is deterministic', async () => {
    const p = await cases[0][1]()
    const a = placeLabels(p.pile, p.width, p.height, p.plan.piles.length, options)
    const b = placeLabels(p.pile, p.width, p.height, p.plan.piles.length, options)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('still numbers most of a busy picture, and says which piles it could not', async () => {
    const p = await cases[cases.length - 1][1]()
    const { labels, unlabeled } = placeLabels(p.pile, p.width, p.height, p.plan.piles.length, { radius: 8 })
    const owned = p.score.pileAreas.filter((a) => a > 0).length
    expect(labels.length / owned).toBeGreaterThanOrEqual(0.5)
    expect(labels.length + unlabeled.length).toBe(owned)
  })
})
