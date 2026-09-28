/**
 * What the paint section says about a recipe. Kept free of React so the wording
 * (the part users have to be able to trust) is easy to test.
 */
import type { SpectralRecipe } from '@/lib/spectral/types'

export type PaintVerdict = 'match' | 'close' | 'approximate' | 'cannot'

export interface PaintFit {
  verdict: PaintVerdict
  /** Short label for the section header */
  label: string
  /** One sentence under the swatches */
  detail: string
}

const LABELS: Record<SpectralRecipe['matchQuality'], [PaintVerdict, string]> = {
  Excellent: ['match', 'Very close'],
  Good: ['close', 'Close'],
  Fair: ['approximate', 'Approximate'],
  Poor: ['cannot', 'Can’t match'],
}

export const MODEL_CAVEAT = 'Predicted on screen from swatch colors, not measured from real tubes.'

function deltaE(recipe: SpectralRecipe): string {
  const value = recipe.error00 ?? 0
  return value < 10 ? value.toFixed(1) : Math.round(value).toString()
}

/** `paletteName` reads as "your palette" or "Core six". */
export function describePaintFit(recipe: SpectralRecipe, paletteName: string): PaintFit {
  const [verdict, label] = LABELS[recipe.matchQuality]
  const de = deltaE(recipe)
  const detail = {
    match: `The mix should look the same as this color (ΔE ${de}).`,
    close: `Close side by side (ΔE ${de}).`,
    approximate: `A visible miss (ΔE ${de}). Adjust by eye.`,
    cannot: `${paletteName} can’t mix this. The closest it gets is shown, ΔE ${de} away.`,
  }[verdict]
  return { verdict, label, detail }
}

/** "7 parts" for a whole-part recipe, otherwise the plain percentage. */
export function formatAmount(recipe: SpectralRecipe, ingredient: SpectralRecipe['ingredients'][number]): string {
  if (recipe.paintable && ingredient.parts !== undefined) {
    return `${ingredient.parts} ${ingredient.parts === 1 ? 'part' : 'parts'}`
  }
  return `${Math.round(ingredient.weight * 100)}%`
}

/** The rounding cost line, or null when there is nothing to say. */
export function roundingNote(recipe: SpectralRecipe): string | null {
  if (recipe.paintable === false) return 'No clean ratio for this one. Percentages are approximate.'
  if (!recipe.paintable || recipe.totalParts === undefined || recipe.unroundedError00 === undefined || recipe.error00 === undefined) return null
  const cost = Math.max(0, recipe.error00 - recipe.unroundedError00)
  return cost < 0.05
    ? `${recipe.totalParts} parts in all. Rounding costs nothing visible.`
    : `${recipe.totalParts} parts in all. Rounding to whole parts adds ΔE ${cost.toFixed(1)}.`
}
