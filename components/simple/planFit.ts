/**
 * What the Plan view says about a plan. Kept free of React so the wording (the part users
 * have to be able to trust) is easy to test.
 *
 * The bands come from what the benchmark measured (docs/paint-plan-audit.md): a typical
 * plan on the Core six leaves 25–40% of a picture more than ΔE 5 from its pile at 5 to 12
 * piles, so a headline may only say "close" when very little is visibly off.
 */
import type { PicturePlan } from '@/lib/paint/plan/picture'
import type { PlanPile } from '@/lib/paint/plan/types'
import { describePaintFit, MODEL_CAVEAT, type PaintFit } from './paintFit'

export { MODEL_CAVEAT }

/** Where the numbers come from, and that the picture stays in the browser. */
export const PLAN_CAVEAT_COPY = 'Measured on a copy of your picture at most 512 px on its long side, in this browser. Nothing is uploaded.'

export const BUDGETS = [5, 8, 12] as const
export type Budget = (typeof BUDGETS)[number]

export type PlanVerdict = 'close' | 'fair' | 'rough' | 'poor'

export interface PlanSummary {
  verdict: PlanVerdict
  headline: string
  /** Sentences under the headline, most important first */
  notes: string[]
}

const pct = (share: number) => (share > 0 && share < 0.005 ? '<1%' : `${Math.round(share * 100)}%`)

/** "4.3" under 10, otherwise a whole number, matching describePaintFit. */
export function formatDeltaE(value: number): string {
  return value < 10 ? value.toFixed(1) : Math.round(value).toString()
}

export function formatShare(share: number): string {
  return pct(share)
}

const HEADLINES: Record<PlanVerdict, string> = {
  close: 'A close repaint',
  fair: 'A fair repaint',
  rough: 'A rough repaint',
  poor: 'A poor repaint',
}

export function planVerdict(visiblyOffArea: number): PlanVerdict {
  if (visiblyOffArea < 0.1) return 'close'
  if (visiblyOffArea < 0.3) return 'fair'
  if (visiblyOffArea < 0.6) return 'rough'
  return 'poor'
}

/** `paletteName` reads as "Your palette" or "The Core six". */
export function describePlan(plan: PicturePlan, budget: number, paletteName: string): PlanSummary {
  const { score } = plan
  const verdict = planVerdict(score.visiblyOffArea)
  const notes = [`${pct(score.visiblyOffArea)} of the picture is more than ΔE 5 from its pile, a visible miss. The average miss is ΔE ${formatDeltaE(score.meanDeltaE00)}.`]
  if (score.unreachableArea >= 0.05) {
    // "The Core six" and "Your palette" read "the Core six" and "your palette" mid-sentence.
    const inSentence = paletteName.replace(/^./, (first) => first.toLowerCase())
    notes.push(`${pct(score.unreachableArea)} of it sits in piles ${inSentence} can’t mix; those show the closest it gets.`)
  }
  if (plan.plan.piles.length < budget) {
    notes.push(`More piles wouldn’t improve the repaint, so it uses ${plan.plan.piles.length} of ${budget}.`)
  }
  return { verdict, headline: HEADLINES[verdict], notes }
}

export const pileName = (index: number) => `Pile ${index + 1}`

/**
 * The pile's recipe in whole parts: "6 parts Titanium White, 9 Yellow Ochre, 1 Phthalo Green"
 * or, for a pile mixed from another, "3 parts Pile 2, 1 Titanium White".
 */
export function pileRecipeText(pile: PlanPile): string {
  const unit = (n: number) => `${n} ${n === 1 ? 'part' : 'parts'}`
  if (pile.derived) {
    const items = [`${unit(pile.derived.baseParts)} ${pileName(pile.derived.base)}`, ...pile.derived.extra.map((e) => `${e.parts} ${e.name}`)]
    return items.join(', ')
  }
  const items = pile.recipe.ingredients.map((i) => `${i.parts} ${i.pigment.name}`)
  if (items.length === 0) return ''
  const [first, ...rest] = items
  const [n, ...name] = first.split(' ')
  return [`${unit(Number(n))} ${name.join(' ')}`, ...rest].join(', ')
}

/** Whole parts the painter measures for this pile as it is listed. */
export function pileParts(pile: PlanPile): number {
  if (pile.derived) return pile.derived.baseParts + pile.derived.extra.reduce((sum, e) => sum + e.parts, 0)
  return pile.recipe.totalParts ?? 0
}

export interface PileView {
  name: string
  recipe: string
  parts: number
  share: string
  fit: PaintFit
  /** Piles that others are mixed from, by pile number */
  basedOnBy: number[]
  /** True for a base that no part of the picture uses directly */
  mixOnly: boolean
}

export function describePiles(plan: PicturePlan, paletteName: string): PileView[] {
  return plan.plan.piles.map((pile, index) => ({
    name: pileName(index),
    recipe: pileRecipeText(pile),
    parts: pileParts(pile),
    share: formatShare(plan.score.pileAreas[index]),
    fit: describePaintFit(pile.recipe, paletteName),
    basedOnBy: plan.plan.piles.flatMap((other, i) => (other.derived?.base === index ? [i + 1] : [])),
    mixOnly: plan.score.pileAreas[index] === 0,
  }))
}
