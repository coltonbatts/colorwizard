import { describe, it, expect } from 'vitest'
import { classifyMixPushes } from './mixingWorkflow'

describe('classifyMixPushes', () => {
  it('marks trace cadmium red on muted cool blue as neutralize', () => {
    const pushes = classifyMixPushes(
      [
        { id: 'titanium-white', name: 'Titanium White', weight: 0.82 },
        { id: 'phthalo-blue', name: 'Phthalo Blue', weight: 0.12, tintingStrength: 10 },
        { id: 'cadmium-red', name: 'Cadmium Red', weight: 0.06, tintingStrength: 1.5 },
      ],
      { targetHex: '#5A8FB8' }
    )

    const red = pushes.find((push) => push.ingredient.name === 'Cadmium Red')
    const blue = pushes.find((push) => push.ingredient.name === 'Phthalo Blue')

    expect(red?.role).toBe('neutralize')
    expect(red?.roleLabel).toBe('Mute')
    expect(blue?.role).toBe('strong_tinter')
  })
})
