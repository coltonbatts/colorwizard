import { describe, expect, it, vi } from 'vitest'
import { parseSavedColors, SIMPLE_SAVED_KEY, storeSavedColors, type SavedPaintColor } from './simpleSavedColors'

const saved: SavedPaintColor = {
  id: 'sample-1', hex: '#397DA8', name: 'Blue', savedAt: 123,
  pictureName: 'reference.png', paletteName: 'My paints',
  recipe: {
    ingredients: [{ pigment: { id: 'my-blue', name: 'My blue', hex: '#397DA8', tintingStrength: 2 }, weight: 1, percentage: '100%', parts: 1 }],
    totalParts: 1, paintable: true, predictedHex: '#397DA8', error: 0, error00: 0,
    matchQuality: 'Excellent', steps: ['Start with My blue.'],
  },
}

describe('saved painting results', () => {
  it('recovers recipe amounts, tube identity, model prediction and source after serialization', () => {
    const setItem = vi.fn()
    storeSavedColors({ setItem }, [saved])
    expect(setItem.mock.calls[0][0]).toBe(SIMPLE_SAVED_KEY)
    const recovered = parseSavedColors(setItem.mock.calls[0][1])
    expect(recovered).toEqual([saved])
    saved.recipe!.ingredients[0].pigment.tintingStrength = 4
    expect(recovered[0].recipe!.ingredients[0].pigment.tintingStrength).toBe(2)
    saved.recipe!.ingredients[0].pigment.tintingStrength = 2
  })

  it('retains valid legacy hex saves without inventing a saved recipe', () => {
    expect(parseSavedColors('["#aabbcc", "bad", null, "#AABBCC"]')).toEqual([
      { id: 'legacy-#AABBCC', hex: '#AABBCC', name: '', savedAt: 0 },
    ])
  })

  it('does not swallow quota or blocked-storage failures', () => {
    const setItem = () => { throw new Error('quota exceeded') }
    expect(() => storeSavedColors({ setItem }, [saved])).toThrow('quota exceeded')
  })

  it.each([
    '{broken',
    JSON.stringify({ version: 2, colors: [saved] }),
    JSON.stringify({ version: 1, colors: [{ ...saved, recipe: { ...saved.recipe, ingredients: [] } }] }),
    JSON.stringify({ version: 1, colors: [{ ...saved, recipe: { ...saved.recipe, error: null } }] }),
    JSON.stringify({ version: 1, colors: [{ ...saved, recipe: { ...saved.recipe, isFallback: true } }] }),
    JSON.stringify({ version: 1, colors: [saved, saved] }),
  ])('rejects unreadable data so callers can preserve it instead of overwriting it', raw => {
    expect(() => parseSavedColors(raw)).toThrow()
  })
})
