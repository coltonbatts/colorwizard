import type { SpectralRecipe } from '@/lib/spectral/types'

export const MIN_RECIPE_PAINTS = 2

export type RecipeSetupReason = 'insufficient-paints' | 'solver-failed' | 'weak-match'

export interface RecipeSetupState {
  reason: RecipeSetupReason
  title: string
  description: string
}

function uniqueCount(values: readonly string[] | undefined): number {
  return new Set((values ?? []).filter(Boolean)).size
}

export function getPaletteSetupState(options: {
  useCatalog: boolean
  paintIds?: readonly string[]
  paletteColorIds?: readonly string[]
}): RecipeSetupState | null {
  const configuredCount = options.useCatalog
    ? uniqueCount(options.paintIds)
    : options.paletteColorIds === undefined
      ? null
      : uniqueCount(options.paletteColorIds)

  if (configuredCount !== null && configuredCount < MIN_RECIPE_PAINTS) {
    return {
      reason: 'insufficient-paints',
      title: 'Choose More Paints',
      description: `A dependable recipe needs at least ${MIN_RECIPE_PAINTS} available paints.`,
    }
  }

  return null
}

export function getRecipeTrustState(
  recipe: SpectralRecipe | null,
  solverFailed: boolean,
): RecipeSetupState | null {
  if (solverFailed || !recipe) {
    return {
      reason: 'solver-failed',
      title: 'Recipe Unavailable',
      description: 'This paint set could not produce a dependable prediction. Choose a broader paint set and try again.',
    }
  }

  if (recipe.matchQuality === 'Poor') {
    return {
      reason: 'weak-match',
      title: 'Paint Set Too Limited',
      description: 'The predicted match is too weak to use as a practical recipe. Choose paints with a wider hue and value range.',
    }
  }

  return null
}
