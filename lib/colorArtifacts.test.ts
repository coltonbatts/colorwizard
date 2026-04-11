import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpectralRecipe } from './spectral/types'

const solveRecipeMock = vi.fn()

vi.mock('./paint/solveRecipe', () => ({
  solveRecipe: solveRecipeMock,
}))

vi.mock('./dmcFloss', () => ({
  findClosestDMCColors: vi.fn(async () => []),
}))

describe('colorArtifacts', () => {
  beforeEach(() => {
    solveRecipeMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('stores solver-backed ingredients and steps when solveRecipe succeeds', async () => {
    solveRecipeMock.mockResolvedValue({
      ingredients: [
        {
          pigment: {
            id: 'titanium-white',
            name: 'Titanium White',
            hex: '#FDFDFD',
            tintingStrength: 1,
            isValueAdjuster: true,
          },
          weight: 0.8,
          percentage: '80%',
        },
        {
          pigment: {
            id: 'phthalo-blue',
            name: 'Phthalo Blue',
            hex: '#0F2E53',
            tintingStrength: 10,
          },
          weight: 0.2,
          percentage: '20%',
        },
      ],
      predictedHex: '#85cde9',
      error: 1.8,
      matchQuality: 'Good',
      steps: ['Start with **Titanium White**.', 'Add **Phthalo Blue** gradually.'],
    } satisfies SpectralRecipe)

    const { createColorCard } = await import('./colorArtifacts')
    const card = await createColorCard(
      {
        hex: '#87CEEB',
        rgb: { r: 135, g: 206, b: 235 },
        hsl: { h: 197, s: 71, l: 73 },
      },
      { name: 'Sky sample' },
    )

    expect(card.recipe.spectral?.matchQuality).toBe('Good')
    expect(card.recipe.ingredients).toEqual([
      {
        name: 'Titanium White',
        amount: '80%',
        hex: '#FDFDFD',
        ratio: 80,
      },
      {
        name: 'Phthalo Blue',
        amount: '20%',
        hex: '#0F2E53',
        ratio: 20,
      },
    ])
    expect(card.recipe.steps).toEqual([
      'Start with **Titanium White**.',
      'Add **Phthalo Blue** gradually.',
    ])
    expect(card.matches.paints).toEqual([
      {
        name: 'Titanium White',
        brand: 'Core six-color mix',
        hex: '#FDFDFD',
        ratio: 80,
      },
      {
        name: 'Phthalo Blue',
        brand: 'Core six-color mix',
        hex: '#0F2E53',
        ratio: 20,
      },
    ])
  })

  it('falls back to heuristic ingredients without solver confidence when solveRecipe fails', async () => {
    solveRecipeMock.mockRejectedValue(new Error('solver offline'))

    const { createColorCard } = await import('./colorArtifacts')
    const card = await createColorCard(
      {
        hex: '#6d6258',
        rgb: { r: 109, g: 98, b: 88 },
        hsl: { h: 29, s: 11, l: 39 },
      },
      { name: 'Muted neutral' },
    )

    expect(card.recipe.spectral).toBeNull()
    expect(card.recipe.ingredients.length).toBeGreaterThan(0)
    expect(card.recipe.steps.length).toBeGreaterThan(0)
    expect(card.matches.paints.every((match) => match.brand === 'Heuristic mix')).toBe(true)
  })
})
