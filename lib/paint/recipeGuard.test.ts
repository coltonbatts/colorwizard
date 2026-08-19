import { describe, expect, it } from 'vitest'
import { getPaletteSetupState, getRecipeTrustState, MIN_RECIPE_PAINTS } from './recipeGuard'
import type { SpectralRecipe } from '@/lib/spectral/types'

const usableRecipe: SpectralRecipe = {
  ingredients: [],
  predictedHex: '#C45C3E',
  error: 1,
  matchQuality: 'Good',
  steps: [],
}

describe('recipe trust guards', () => {
  it('requires enough unique catalog paints', () => {
    expect(MIN_RECIPE_PAINTS).toBe(2)
    expect(getPaletteSetupState({ useCatalog: true, paintIds: [] })?.reason).toBe('insufficient-paints')
    expect(getPaletteSetupState({ useCatalog: true, paintIds: ['white', 'white'] })?.reason).toBe('insufficient-paints')
    expect(getPaletteSetupState({ useCatalog: true, paintIds: ['white', 'red'] })).toBeNull()
  })

  it('guards incomplete legacy palettes without rejecting the known-good Core 6 default', () => {
    expect(getPaletteSetupState({ useCatalog: false, paletteColorIds: ['titanium-white'] })?.reason).toBe('insufficient-paints')
    expect(getPaletteSetupState({ useCatalog: false })).toBeNull()
  })

  it('rejects weak and failed predictions', () => {
    expect(getRecipeTrustState({ ...usableRecipe, matchQuality: 'Poor' }, false)?.reason).toBe('weak-match')
    expect(getRecipeTrustState(null, true)?.reason).toBe('solver-failed')
    expect(getRecipeTrustState(usableRecipe, false)).toBeNull()
  })
})
