import { describe, expect, it } from 'vitest'
import { DEFAULT_PALETTE } from '../../types/palette'
import { resolvePalettePigments } from '../palettePigments'
import { describePaintFit } from '../paintFit'
import { PALETTES } from './benchmark'
import { describePlanForExport, mixOrderOf, type PlanExport } from './export'
import { loadCorpus } from './fixtures/corpus'
import { planPicture, type PicturePlan } from './picture'
import { DERIVED_CAVEAT, MODEL_CAVEAT, PLAN_CAVEAT_COPY, PRINT_CAVEAT, PARTS_CAVEAT, planVerdict, pileRecipeText } from './planFit'

const corpus = loadCorpus('synthetic')
const plans = new Map<string, Promise<PicturePlan>>()
function plan(name: string, budget: number, pigments = PALETTES.core6.pigments): Promise<PicturePlan> {
  const key = `${name}:${budget}:${pigments.length}`
  if (!plans.has(key)) {
    const image = corpus.find((i) => i.name === name)!
    plans.set(key, planPicture(image.data, image.width, image.height, budget, pigments))
  }
  return plans.get(key)!
}

const OPTIONS = { paletteName: 'The Core six', pictureName: 'landscape' }
const CASES: Array<[string, number]> = [['landscape', 8], ['sunset', 5], ['portrait-light', 12], ['high-key', 12]]

describe('describePlanForExport: every pile once, with the plan’s own numbers', () => {
  it.each(CASES)('%s at %i piles', async (name, budget) => {
    const p = await plan(name, budget)
    const model = describePlanForExport(p, { ...OPTIONS, pictureName: name })
    expect(model.piles).toHaveLength(p.plan.piles.length)
    expect(model.pileCount).toBe(p.plan.piles.length)
    expect(model.budget).toBe(budget)
    expect(model.piles.map((x) => x.number)).toEqual(p.plan.piles.map((_, i) => i + 1))
    for (const [i, pile] of model.piles.entries()) {
      const source = p.plan.piles[i]
      expect(pile.name).toBe(`Pile ${i + 1}`)
      expect(pile.swatchHex).toBe(source.recipe.predictedHex)
      expect(pile.targetHex).toBe(source.targetHex)
      expect(pile.area).toBe(p.score.pileAreas[i])
      expect(pile.recipe).toBe(pileRecipeText(source))
      expect(pile.derivedFrom).toBe(source.derived ? source.derived.base + 1 : null)
    }
    // dark to light: the plan's own order, untouched
    const lightness = model.piles.map((x) => Number.parseInt(x.swatchHex.slice(1, 3), 16) * 0.3 + Number.parseInt(x.swatchHex.slice(3, 5), 16) * 0.59 + Number.parseInt(x.swatchHex.slice(5, 7), 16) * 0.11)
    expect(lightness.every((l, i) => i === 0 || l >= lightness[i - 1] - 3)).toBe(true)
    expect(model.facts.map((f) => f.label)).toEqual(['Average miss', 'Visibly off', 'In piles it can’t mix', 'To measure'])
    expect(model.facts[3].value).toBe(`${p.score.totalParts} parts`)
  })

  it('uses the pixel-level share for the headline, whatever the pile labels say', async () => {
    const p = await plan('landscape', 8)
    const bad = describePlanForExport({ ...p, score: { ...p.score, visiblyOffArea: 0.65, unreachableArea: 0 } }, OPTIONS)
    expect(bad.verdict).toBe(planVerdict(0.65))
    expect(bad.headline).toBe('A poor repaint')
    const good = describePlanForExport({ ...p, score: { ...p.score, visiblyOffArea: 0.02, unreachableArea: 0.9 } }, OPTIONS)
    expect(good.headline).toBe('A close repaint')
  })

  it('names the picture, or says "Paint plan"', async () => {
    const p = await plan('landscape', 8)
    expect(describePlanForExport(p, { paletteName: 'The Core six', pictureName: '  Sunday sky ' }).title).toBe('Sunday sky')
    const anon = describePlanForExport(p, { paletteName: 'The Core six' })
    expect(anon.title).toBe('Paint plan')
    expect(anon.pictureName).toBeNull()
    expect(describePlanForExport(p, { paletteName: 'Your palette', paletteLabel: 'My paints' }).paletteLabel).toBe('My paints')
  })
})

describe('mix order', () => {
  it('never places a derived pile before its base, and lists every pile once', async () => {
    for (const [name, budget] of CASES) {
      const model = describePlanForExport(await plan(name, budget), OPTIONS)
      expect([...model.mixOrder].sort((a, b) => a - b)).toEqual(model.piles.map((x) => x.number))
      for (const pile of model.piles) {
        expect(model.mixOrder[pile.mixPosition - 1]).toBe(pile.number)
        if (pile.derivedFrom !== null) expect(pile.mixPosition).toBeGreaterThan(model.piles[pile.derivedFrom - 1].mixPosition)
      }
    }
    // the corpus must actually exercise a derived pile, or the loop above proves nothing
    const landscape = describePlanForExport(await plan('landscape', 8), OPTIONS)
    expect(landscape.piles.some((x) => x.derivedFrom !== null)).toBe(true)
  })

  it('is dark to light when nothing is derived, and moves a base only as far as it must', () => {
    expect(mixOrderOf([null, null, null, null])).toEqual([1, 2, 3, 4])
    // pile 2 is mixed from pile 5: pile 5 comes first, right where pile 2 would have been
    expect(mixOrderOf([null, 5, null, null, null])).toEqual([1, 3, 4, 5, 2])
    // pile 1 is a base for pile 3: no reordering needed
    expect(mixOrderOf([null, null, 1, null])).toEqual([1, 2, 3, 4])
    // two dependents of one late base
    expect(mixOrderOf([4, null, 4, null])).toEqual([2, 4, 1, 3])
  })

  it('holds for any one-level dependency graph, and never drops a pile on a malformed one', () => {
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    for (let trial = 0; trial < 300; trial++) {
      const n = 1 + Math.floor(rnd() * 12)
      const scratch = Array.from({ length: n }, () => rnd() < 0.6)
      const bases = scratch.flatMap((s, i) => (s ? [i + 1] : []))
      const derivedFrom = scratch.map((s) => (s || bases.length === 0 ? null : bases[Math.floor(rnd() * bases.length)]))
      const order = mixOrderOf(derivedFrom)
      expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
      derivedFrom.forEach((base, i) => {
        if (base !== null) expect(order.indexOf(i + 1)).toBeGreaterThan(order.indexOf(base))
      })
      expect(mixOrderOf(derivedFrom)).toEqual(order)
    }
    // a loop, a self-reference and a base out of range: everything still appears once
    for (const bad of [[2, 1], [1], [9, null], [0, null, 2]]) {
      expect([...mixOrderOf(bad)].sort((a, b) => a - b)).toEqual(bad.map((_, i) => i + 1))
    }
  })
})

describe('a base that no pixel uses', () => {
  it('is kept, listed as only used to mix its dependents, and has no fit verdict of its own', async () => {
    const p = await plan('landscape', 8)
    const base = p.plan.piles.findIndex((pile, i) => p.plan.piles.some((other) => other.derived?.base === i))
    expect(base).toBeGreaterThanOrEqual(0)
    const areas = p.score.pileAreas.map((a, i) => (i === base ? 0 : a))
    const mixOnly = describePlanForExport({ ...p, score: { ...p.score, pileAreas: areas, pileMeanDeltaE00: p.score.pileMeanDeltaE00.map((m, i) => (i === base ? NaN : m)) } }, OPTIONS)
    const pile = mixOnly.piles[base]
    expect(mixOnly.piles).toHaveLength(p.plan.piles.length)
    expect(pile.mixOnly).toBe(true)
    expect(pile.share).toBe('—')
    expect(pile.fit).toBeNull()
    expect(pile.cannotMatch).toBe(false)
    expect(pile.meanMiss).toBeNull()
    expect(pile.onlyUsedToMix).toMatch(/^only used to mix Pile \d/)
    // and it is mixed before what is made from it
    for (const other of mixOnly.piles.filter((x) => x.derivedFrom === base + 1)) expect(other.mixPosition).toBeGreaterThan(pile.mixPosition)
    // a normal pile keeps its verdict
    expect(mixOnly.piles.find((x) => !x.mixOnly)!.fit).not.toBeNull()
  })
})

describe('fewer piles than the budget', () => {
  it('says "N of M piles" and never pads', async () => {
    const p = await plan('high-key', 12)
    expect(p.plan.piles.length).toBeLessThan(12) // audit: high-key returns 8 of 12
    const model = describePlanForExport(p, OPTIONS)
    expect(model.pileCountLabel).toBe(`${p.plan.piles.length} of 12 piles`)
    expect(model.piles).toHaveLength(p.plan.piles.length)
    expect(model.notes.some((n) => n.includes(`uses ${p.plan.piles.length} of 12`))).toBe(true)
  })

  it('says "N piles" when the whole budget is used', async () => {
    const p = await plan('portrait-light', 12)
    expect(p.plan.piles.length).toBe(12)
    expect(describePlanForExport(p, OPTIONS).pileCountLabel).toBe('12 piles')
  })
})

describe('caveats travel with the model', () => {
  it('carries the model and measurement caveats verbatim, plus the print and parts lines', async () => {
    const model = describePlanForExport(await plan('landscape', 8), OPTIONS)
    expect(model.caveats.model).toBe(MODEL_CAVEAT)
    expect(model.caveats.model).toContain('not measured from real tubes')
    expect(model.caveats.measured).toBe(PLAN_CAVEAT_COPY)
    expect(model.caveats.print).toBe(PRINT_CAVEAT)
    expect(model.caveats.print).toMatch(/approximate/)
    expect(model.caveats.print).toMatch(/Do not match paint/)
    expect(model.caveats.parts).toBe(PARTS_CAVEAT)
    for (const line of [MODEL_CAVEAT, PLAN_CAVEAT_COPY, PRINT_CAVEAT, PARTS_CAVEAT]) expect(model.caveatLines).toContain(line)
  })

  it('adds the derived-pile caveat only when a pile is mixed from another', async () => {
    const withDerived = describePlanForExport(await plan('landscape', 8), OPTIONS)
    expect(withDerived.caveats.derived).toBe(DERIVED_CAVEAT)
    expect(withDerived.caveatLines).toContain(DERIVED_CAVEAT)
    const p = await plan('landscape', 8)
    const scratchOnly = describePlanForExport({ ...p, plan: { ...p.plan, piles: p.plan.piles.map((pile) => ({ ...pile, derived: undefined })) } }, OPTIONS)
    expect(scratchOnly.caveats.derived).toBeNull()
    expect(scratchOnly.caveatLines).not.toContain(DERIVED_CAVEAT)
  })
})

describe('a pile the palette can’t reach', () => {
  it('carries the existing "Can’t match" wording and the closest mix, never a confident recipe', async () => {
    const p = await plan('sunset', 5)
    const model = describePlanForExport(p, OPTIONS)
    const cannot = model.piles.filter((x) => x.cannotMatch)
    expect(cannot.length).toBeGreaterThan(0)
    for (const pile of cannot) {
      const expected = describePaintFit(p.plan.piles[pile.number - 1].recipe, OPTIONS.paletteName)
      expect(pile.fit).toEqual(expected)
      expect(pile.fit!.label).toBe('Can’t match')
      expect(pile.fit!.detail).toContain('The Core six can’t mix this. The closest it gets is shown')
      expect(pile.swatchHex).toBe(p.plan.piles[pile.number - 1].recipe.predictedHex) // the closest mix, as in the panel
    }
  })
})

describe('determinism and tubes', () => {
  it('gives the identical model for the same plan, and for a plan made again', async () => {
    const p = await plan('landscape', 8)
    const again = await planPicture(corpus.find((i) => i.name === 'landscape')!.data, corpus.find((i) => i.name === 'landscape')!.width, corpus.find((i) => i.name === 'landscape')!.height, 8, PALETTES.core6.pigments)
    const a = JSON.stringify(describePlanForExport(p, OPTIONS))
    expect(JSON.stringify(describePlanForExport(p, OPTIONS))).toBe(a)
    expect(JSON.stringify(describePlanForExport(again, OPTIONS))).toBe(a)
  })

  it('lists distinct tubes alphabetically, including a tube the user made up', async () => {
    const magenta = { id: 'custom-magenta-c2185b', displayName: 'Quinacridone Magenta', hex: '#C2185B', tintingStrength: 2 }
    const custom = resolvePalettePigments([...DEFAULT_PALETTE.colors, magenta])
    const model = describePlanForExport(await plan('fruit-saturated', 8, custom), OPTIONS)
    expect(new Set(model.tubes).size).toBe(model.tubes.length)
    expect([...model.tubes].sort((a, b) => a.localeCompare(b))).toEqual(model.tubes)
    const core = describePlanForExport(await plan('landscape', 8), OPTIONS)
    expect(core.tubes.every((t) => ['Titanium White', 'Ivory Black', 'Yellow Ochre', 'Cadmium Red', 'Phthalo Blue', 'Phthalo Green'].includes(t))).toBe(true)
  })
})

export type { PlanExport }
