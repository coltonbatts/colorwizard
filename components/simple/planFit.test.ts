import { describe, expect, it } from 'vitest'
import { PALETTES } from '@/lib/paint/plan/benchmark'
import { loadCorpus } from '@/lib/paint/plan/fixtures/corpus'
import { planPicture, type PicturePlan } from '@/lib/paint/plan/picture'
import { describePiles, describePlan, formatDeltaE, formatShare, MODEL_CAVEAT, pileParts, pileRecipeText, planVerdict } from './planFit'

const image = loadCorpus('synthetic').find((i) => i.name === 'landscape')!
let cached: PicturePlan | null = null
async function plan() {
  cached ??= await planPicture(image.data, image.width, image.height, 8, PALETTES.core6.pigments)
  return cached
}

describe('planVerdict', () => {
  it('only says close when very little is visibly off, and never more than the numbers allow', () => {
    expect(planVerdict(0.02)).toBe('close')
    expect(planVerdict(0.1)).toBe('fair')
    expect(planVerdict(0.29)).toBe('fair')
    expect(planVerdict(0.3)).toBe('rough')
    expect(planVerdict(0.59)).toBe('rough')
    expect(planVerdict(0.6)).toBe('poor')
  })
})

describe('formatting', () => {
  it('shows small shares as under 1% rather than a confident 0%', () => {
    expect(formatShare(0)).toBe('0%')
    expect(formatShare(0.002)).toBe('<1%')
    expect(formatShare(0.124)).toBe('12%')
  })
  it('writes ΔE like the paint fit does', () => {
    expect(formatDeltaE(4.26)).toBe('4.3')
    expect(formatDeltaE(12.4)).toBe('12')
  })
})

describe('describePlan', () => {
  it('states the visible-miss share and the average, whatever the headline', async () => {
    const summary = describePlan(await plan(), 8, 'The Core six')
    const off = Math.round((await plan()).score.visiblyOffArea * 100)
    expect(summary.notes[0]).toContain(`${off}% of the picture is more than ΔE 5`)
    expect(summary.notes[0]).toContain(`ΔE ${formatDeltaE((await plan()).score.meanDeltaE00)}`)
  })

  it('names the palette when part of the picture sits in piles it cannot mix', async () => {
    const p = await plan()
    const summary = describePlan({ ...p, score: { ...p.score, unreachableArea: 0.3 } }, 8, 'Your palette')
    expect(summary.notes.some((n) => n.includes('30% of it sits in piles your palette can’t mix'))).toBe(true)
    const core = describePlan({ ...p, score: { ...p.score, unreachableArea: 0.3 } }, 8, 'The Core six')
    expect(core.notes.some((n) => n.includes('in piles the Core six can’t mix'))).toBe(true)
    const quiet = describePlan({ ...p, score: { ...p.score, unreachableArea: 0.01 } }, 8, 'Your palette')
    expect(quiet.notes.some((n) => n.includes('can’t mix'))).toBe(false)
  })

  it('says so when fewer piles than the budget are used', async () => {
    const p = await plan()
    const fewer = describePlan({ ...p, plan: { ...p.plan, piles: p.plan.piles.slice(0, 6) } }, 8, 'The Core six')
    expect(fewer.notes.some((n) => n.includes('uses 6 of 8'))).toBe(true)
    expect(describePlan(p, p.plan.piles.length, 'The Core six').notes.some((n) => n.includes('More piles wouldn’t improve'))).toBe(false)
  })
})

describe('piles', () => {
  it('writes every scratch recipe in whole parts that add up to the total', async () => {
    const p = await plan()
    for (const pile of p.plan.piles.filter((x) => !x.derived)) {
      const text = pileRecipeText(pile)
      expect(text).toMatch(/^\d+ parts? /)
      const sum = text.split(', ').reduce((s, item) => s + Number(item.split(' ')[0]), 0)
      expect(sum).toBe(pile.recipe.totalParts)
      expect(pileParts(pile)).toBe(pile.recipe.totalParts)
    }
  })

  it('writes a derived pile as parts of its base pile, and marks what a pile is a base for', async () => {
    const p = await plan()
    const views = describePiles(p, 'The Core six')
    const derivedIndex = p.plan.piles.findIndex((x) => x.derived)
    expect(derivedIndex).toBeGreaterThanOrEqual(0)
    const derived = p.plan.piles[derivedIndex]
    expect(views[derivedIndex].recipe).toMatch(new RegExp(`^\\d+ parts? Pile ${derived.derived!.base + 1}, `))
    expect(views[derived.derived!.base].basedOnBy).toContain(derivedIndex + 1)
  })

  it('labels each pile with the existing paint-fit wording, including can’t-match', async () => {
    const p = await plan()
    const views = describePiles(p, 'Your palette')
    for (const [i, view] of views.entries()) {
      expect(view.name).toBe(`Pile ${i + 1}`)
      expect(['match', 'close', 'approximate', 'cannot']).toContain(view.fit.verdict)
      if (view.fit.verdict === 'cannot') expect(view.fit.detail).toContain('Your palette can’t mix this')
    }
    expect(views.some((v) => v.fit.verdict === 'cannot')).toBe(true) // landscape has yellow-greens this palette can't reach
  })

  it('keeps the model caveat available for the panel', () => {
    expect(MODEL_CAVEAT).toContain('not measured from real tubes')
  })
})
