import { beforeAll, describe, expect, it } from 'vitest'
import { differenceCiede2000 } from 'culori'
import { getPaletteColors, mixPigmentsSync } from './adapter'

/**
 * Logic checks on the mix function, with no paint measured anywhere.
 *
 * A recipe in "parts" is amounts of paint, and amounts add: two scoops of the same paint are
 * one double scoop. The solver feeds its parts to spectral.js as weights, and spectral.js
 * counts a weight w as w² units of colorant. These tests pin what that does to the claim
 * "parts are amounts". They say nothing about whether either law matches real paint.
 */
const de00 = differenceCiede2000()

type Entry = [id: string, weight: number]
const mix = (entries: Entry[]) => mixPigmentsSync(entries.map(([pigmentId, weight]) => ({ pigmentId, weight }))).hex

// Pairs that cover white/black, a phthalo, an earth and two chromatics
const PAIRS: Array<[string, string]> = [
  ['titanium-white', 'ivory-black'],
  ['titanium-white', 'phthalo-blue'],
  ['titanium-white', 'yellow-ochre'],
  ['cadmium-red', 'phthalo-green'],
  ['yellow-ochre', 'phthalo-blue'],
]

describe('mix function: what a recipe weight means', () => {
  beforeAll(async () => {
    await getPaletteColors()
  })

  it('only the ratio matters: scaling every weight changes nothing', () => {
    for (const [a, b] of PAIRS) {
      const base = mix([[a, 2], [b, 1]])
      for (const k of [0.5, 3, 40]) expect(de00(mix([[a, 2 * k], [b, 1 * k]]), base)).toBeLessThan(0.01)
    }
  })

  it('the order of the ingredients does not matter', () => {
    for (const [a, b] of PAIRS) expect(de00(mix([[a, 2], [b, 1]]), mix([[b, 1], [a, 2]]))).toBeLessThan(0.01)
  })

  it('weights are NOT additive amounts: a weight of 2 counts as four scoops, not two', () => {
    // As amounts, "2 parts A + 1 part B" and "1 + 1 scoops of A + 1 part B" are the same pile of paint.
    for (const [a, b] of PAIRS) {
      const asOne = mix([[a, 2], [b, 1]])
      const asTwoScoops = mix([[a, 1], [a, 1], [b, 1]])
      const asFourScoops = mix([[a, 1], [a, 1], [a, 1], [a, 1], [b, 1]])
      expect(de00(asOne, asTwoScoops)).toBeGreaterThan(2)
      expect(de00(asOne, asFourScoops)).toBeLessThan(0.01)
    }
  })

  it('the white + black case shows the size of it: well past a visible difference', () => {
    expect(de00(mix([['titanium-white', 2], ['ivory-black', 1]]), mix([['titanium-white', 1], ['titanium-white', 1], ['ivory-black', 1]]))).toBeGreaterThan(5)
  })

  it('weights of sqrt(amount) ARE additive: splitting an amount into scoops changes nothing', () => {
    // The control: if the weight is the square root of the amount, the same pile gives the same color
    // however it is split. This is the only exponent for which that holds.
    const w = (amount: number) => Math.sqrt(amount)
    for (const [a, b] of PAIRS) {
      const asOne = mix([[a, w(2)], [b, w(1)]])
      const asTwoScoops = mix([[a, w(1)], [a, w(1)], [b, w(1)]])
      // two scoops of weight sqrt(1) = 1 each count as 1 + 1 = 2 units, one scoop of sqrt(2) counts as 2
      expect(de00(asOne, asTwoScoops)).toBeLessThan(0.01)
    }
  })

  it('a split in unequal scoops is also invariant under sqrt(amount), and not under the amount itself', () => {
    const [a, b] = PAIRS[0]
    const split = (f: (amount: number) => number) => de00(mix([[a, f(3)], [b, f(1)]]), mix([[a, f(1)], [a, f(2)], [b, f(1)]]))
    expect(split(Math.sqrt)).toBeLessThan(0.01)
    expect(split((x) => x)).toBeGreaterThan(2)
  })
})
