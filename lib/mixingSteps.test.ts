import { describe, it, expect } from 'vitest'
import { generatePaintRecipe } from './colorMixer'
import { choosePainterBase, generatePainterlyMixingSteps } from './paint/mixingWorkflow'

describe('mixing steps refinement', () => {
    it('avoids starting with strong pigments like Phthalo Green if other options exist', () => {
        // Muted Green: Yellow Ochre (0.3), Phthalo Green (0.15), Ivory Black (0.1)
        // This corresponds roughly to a muted green hue
        const mutedGreenHsl = { h: 120, s: 15, l: 40 }
        const recipe = generatePaintRecipe(mutedGreenHsl)

        // Base should be Yellow Ochre, not Phthalo Green
        expect(recipe.steps[0]).toContain('Yellow Ochre')
        expect(recipe.steps[0]).not.toContain('Phthalo Green')

        // Phthalo Green should be held for a late adjustment
        expect(recipe.steps.some(s => s.includes('Phthalo Green') && s.includes('strong tinter last'))).toBe(true)
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

        const valueStepIdx = recipe.steps.findIndex(s => s.includes('Build the value pile') || s.includes('Lock the value'))
        const hueStepIdx = recipe.steps.findIndex(
            s => s.includes('Adjust temperature') || s.includes('Nudge the hue') || s.includes('strong tinter last')
        )

        if (valueStepIdx !== -1 && hueStepIdx !== -1) {
            expect(valueStepIdx).toBeLessThan(hueStepIdx)
        }
    })

    it('keeps warm dirty mixes on a chromatic base instead of defaulting to white', () => {
        const recipe = generatePaintRecipe({ h: 10, s: 15, l: 52 })

        expect(recipe.steps[0]).not.toContain('Titanium White')
        expect(recipe.steps[0]).toMatch(/Cadmium Red|Yellow Ochre/)
    })

    it('keeps dark chromatic mixes from defaulting to black as the starting pile', () => {
        const recipe = generatePaintRecipe({ h: 220, s: 65, l: 22 })

        expect(recipe.steps[0]).not.toContain('Ivory Black')
        expect(recipe.steps[0]).toContain('Phthalo Blue')
    })

    it('warns when a phthalo is in the mix', () => {
        const recipe = generatePaintRecipe({ h: 120, s: 80, l: 50 })

        expect(recipe.steps.some(s => s.includes('strong tinter'))).toBe(true)
        expect(recipe.steps.some(s => s.includes('Tip:') && s.toLowerCase().includes('phthalo'))).toBe(true)
    })

    it('uses white as the starting pile for white-dominant mixes with a dangerous tinter', () => {
        const base = choosePainterBase(
            [
                { id: 'titanium-white', name: 'Titanium White', weight: 0.89, tintingStrength: 1 },
                { id: 'phthalo-blue', name: 'Phthalo Blue', weight: 0.11, tintingStrength: 10 },
            ],
            68
        )

        expect(base?.name).toBe('Titanium White')
    })

    it('holds dangerous tinters for late additions even when the target is only mid-light', () => {
        const steps = generatePainterlyMixingSteps(
            [
                { id: 'titanium-white', name: 'Titanium White', weight: 0.89, tintingStrength: 1 },
                { id: 'phthalo-blue', name: 'Phthalo Blue', weight: 0.11, tintingStrength: 10 },
            ],
            { targetLightness: 68 }
        )

        expect(steps[0]).toContain('Titanium White')
        expect(steps.some(step => step.includes('strong tinter last') && step.includes('Phthalo Blue'))).toBe(true)
    })
})
