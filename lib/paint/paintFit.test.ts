import { describe, expect, it } from 'vitest'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import type { SpectralRecipe } from '@/lib/spectral/types'
import { describePaintFit, formatAmount, roundingNote } from './paintFit'

const base: SpectralRecipe = {
  ingredients: [
    { pigment: { id: 'w', name: 'White', hex: '#FFFFFF', tintingStrength: 1 }, weight: 0.875, percentage: '88%', parts: 7 },
    { pigment: { id: 'b', name: 'Blue', hex: '#0000FF', tintingStrength: 1 }, weight: 0.125, percentage: '13%', parts: 1 },
  ],
  predictedHex: '#5A8FB8',
  error: 1,
  error00: 0.6,
  unroundedError00: 0.2,
  matchQuality: 'Excellent',
  paintable: true,
  totalParts: 8,
  steps: [],
}

describe('describePaintFit', () => {
  it('claims a match only for Excellent, and says how far off otherwise', () => {
    expect(describePaintFit(base, 'Your palette').label).toBe('Very close')
    expect(describePaintFit({ ...base, matchQuality: 'Fair', error00: 4.2 }, 'Your palette').detail).toContain('ΔE 4.2')
  })

  it('says the palette cannot mix a Poor color, and names the palette', () => {
    const fit = describePaintFit({ ...base, matchQuality: 'Poor', error00: 18.4 }, 'Your palette')
    expect(fit.verdict).toBe('cannot')
    expect(fit.label).toBe('Can’t match')
    expect(fit.detail).toContain('Your palette can’t mix this')
    expect(fit.detail).toContain('ΔE 18')
  })
})

describe('amounts and rounding', () => {
  it('prints parts when paintable and percentages when not', () => {
    expect(formatAmount(base, base.ingredients[0])).toBe('7 parts')
    expect(formatAmount(base, base.ingredients[1])).toBe('1 part')
    expect(formatAmount({ ...base, paintable: false }, base.ingredients[0])).toBe('88%')
  })

  it('shows the rounding cost in ΔE, or says there is no clean ratio', () => {
    expect(roundingNote(base)).toBe('8 parts in all. Rounding to whole parts adds ΔE 0.4.')
    expect(roundingNote({ ...base, unroundedError00: 0.6 })).toContain('costs nothing visible')
    expect(roundingNote({ ...base, paintable: false })).toContain('No clean ratio')
  })
})

describe('with the real solver', () => {
  it('reports a Poor recipe as unmixable for a palette without the hue', async () => {
    const recipe = await solveRecipe('#FF00FF', { paletteColorIds: ['titanium-white', 'ivory-black'] })
    expect(describePaintFit(recipe, 'Your palette').verdict).toBe('cannot')
  })
})
