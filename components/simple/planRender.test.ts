import { describe, expect, it } from 'vitest'
import { hexToRgb } from '@/lib/paint/plan/color'
import { NO_PILE, type PicturePlan } from '@/lib/paint/plan/picture'
import { pileAt, renderRepaint } from './planRender'

/** An 18×6 picture: three piles side by side (6 columns each), with the middle pile's pixels marked as misses. */
function fake(): PicturePlan {
  const hexes = ['#204060', '#A06040', '#F0E0C0']
  const pile = new Uint8Array(18 * 6)
  const miss = new Uint8Array(18 * 6)
  for (let y = 0; y < 6; y++) for (let x = 0; x < 18; x++) {
    pile[y * 18 + x] = Math.floor(x / 6)
    if (Math.floor(x / 6) === 1) miss[y * 18 + x] = 1
  }
  return {
    width: 18,
    height: 6,
    pile,
    miss,
    ms: 0,
    score: {} as PicturePlan['score'],
    plan: { budget: 3, piles: hexes.map((hex) => ({ targetHex: hex, area: 1 / 3, recipe: { predictedHex: hex } as never })) },
  }
}

const px = (data: Uint8ClampedArray, width: number, x: number, y: number) => Array.from(data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4))

describe('renderRepaint', () => {
  it('paints each pixel in its pile’s swatch, unhatched when misses are not marked', () => {
    const plan = fake()
    const data = renderRepaint(plan, { selected: null, markMisses: false })
    for (let x = 0; x < 18; x++) expect(px(data, 18, x, 0)).toEqual([...hexToRgb(plan.plan.piles[Math.floor(x / 6)].recipe.predictedHex), 255])
  })

  it('hatches only the missed pixels, in a darker shade of the pile’s own color', () => {
    const plan = fake()
    const marked = renderRepaint(plan, { selected: null, markMisses: true })
    const plain = renderRepaint(plan, { selected: null, markMisses: false })
    let hatched = 0
    for (let y = 0; y < 6; y++) for (let x = 0; x < 18; x++) {
      const same = px(marked, 18, x, y).join() === px(plain, 18, x, y).join()
      if (Math.floor(x / 6) !== 1) expect(same).toBe(true) // no miss, no hatch
      else if (!same) {
        hatched++
        expect(px(marked, 18, x, y)[0]).toBeLessThan(px(plain, 18, x, y)[0])
      }
    }
    expect(hatched).toBeGreaterThan(0)
  })

  it('dims every pile but the selected one toward the stage gray, and hatches only what is shown', () => {
    const plan = fake()
    const data = renderRepaint(plan, { selected: 2, markMisses: true })
    expect(px(data, 18, 14, 0)).toEqual([...hexToRgb('#F0E0C0'), 255]) // the selected pile is untouched
    const dimmed = px(data, 18, 0, 0)
    expect(dimmed[0]).toBeGreaterThan(0x20)
    expect(Math.abs(dimmed[0] - 0x77)).toBeLessThan(Math.abs(0x20 - 0x77)) // moved toward the gray
    // the middle pile has misses, but it is dimmed, so its hatch is not drawn
    const plain = renderRepaint(plan, { selected: 2, markMisses: false })
    for (let y = 0; y < 6; y++) for (let x = 6; x < 12; x++) expect(px(data, 18, x, y).join()).toBe(px(plain, 18, x, y).join())
  })

  it('leaves pixels that belong to no pile transparent', () => {
    const plan = fake()
    plan.pile[0] = NO_PILE
    expect(px(renderRepaint(plan, { selected: null, markMisses: false }), 18, 0, 0)).toEqual([0, 0, 0, 0])
  })
})

describe('pileAt', () => {
  it('maps a point in a bigger source picture to the pile under it, and clamps to the edges', () => {
    const plan = fake()
    expect(pileAt(plan, 0, 0, 600, 200)).toBe(0)
    expect(pileAt(plan, 300, 100, 600, 200)).toBe(1)
    expect(pileAt(plan, 599, 199, 600, 200)).toBe(2)
    expect(pileAt(plan, 999, 999, 600, 200)).toBe(2)
    expect(pileAt(plan, -5, -5, 600, 200)).toBe(0)
  })
  it('returns null for a transparent pixel', () => {
    const plan = fake()
    plan.pile[0] = NO_PILE
    expect(pileAt(plan, 0, 0, 18, 6)).toBeNull()
  })
})
