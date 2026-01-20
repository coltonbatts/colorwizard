import { describe, it, expect } from 'vitest'
import { generatePaintRecipe } from './colorMixer'

describe('mixing steps refinement', () => {
    it('avoids starting with strong pigments like Phthalo Green if other options exist', () => {
        // Muted Green: Yellow Ochre (0.3), Phthalo Green (0.15), Ivory Black (0.1)
        // This corresponds roughly to a muted green hue
        const mutedGreenHsl = { h: 120, s: 15, l: 40 }
        const recipe = generatePaintRecipe(mutedGreenHsl)

        // Base should be Yellow Ochre, not Phthalo Green
        expect(recipe.steps[0]).toContain('Yellow Ochre')
        expect(recipe.steps[0]).not.toContain('Phthalo Green')

        // Phthalo Green should be an adjustment
        expect(recipe.steps.some(s => s.includes('Phthalo Green') && s.includes('shift the hue'))).toBe(true)
    })

    it('removes redundant steps (no color mentioned twice as an addition)', () => {
        const recipe = generatePaintRecipe({ h: 120, s: 15, l: 40 })

        const stepText = recipe.steps.join(' ')
        const colors = ['Yellow Ochre', 'Phthalo Green', 'Ivory Black', 'Titanium White']

        colors.forEach(color => {
            const occurrences = (stepText.match(new RegExp(color, 'g')) || []).length
            // Should appear at most twice: once in the main steps and once in the "Tip"
            // But notably, not twice in the additive steps.
            const additiveOccurrences = recipe.steps.filter(s => s.includes(color) && !s.includes('Tip:') && !s.includes('Note:')).length
            expect(additiveOccurrences).toBeLessThanOrEqual(1)
        })
    })

    it('follows Value First rule', () => {
        const recipe = generatePaintRecipe({ h: 120, s: 15, l: 40 })

        const valueStepIdx = recipe.steps.findIndex(s => s.includes('Adjust value') || s.includes('Lock the value'))
        const hueStepIdx = recipe.steps.findIndex(s => s.includes('shift the hue'))

        if (valueStepIdx !== -1 && hueStepIdx !== -1) {
            expect(valueStepIdx).toBeLessThan(hueStepIdx)
        }
    })
})
