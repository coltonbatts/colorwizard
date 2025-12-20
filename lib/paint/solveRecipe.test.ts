import { describe, it, expect } from 'vitest'
import { solveRecipe, mixInteractive } from './solveRecipe'

describe('solveRecipe', () => {
    it('returns weights that sum to approximately 1', async () => {
        const recipe = await solveRecipe('#FF6B35') // Orange color

        const totalWeight = recipe.ingredients.reduce((sum, i) => sum + i.weight, 0)
        expect(totalWeight).toBeCloseTo(1, 1)
    })

    it('returns a valid hex string', async () => {
        const recipe = await solveRecipe('#3498DB') // Blue color

        expect(recipe.predictedHex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('returns a non-negative error', async () => {
        const recipe = await solveRecipe('#2ECC71') // Green color

        expect(recipe.error).toBeGreaterThanOrEqual(0)
    })

    it('returns a match quality label', async () => {
        const recipe = await solveRecipe('#E74C3C') // Red color

        expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(recipe.matchQuality)
    })

    it('generates mixing steps', async () => {
        const recipe = await solveRecipe('#9B59B6') // Purple color

        expect(recipe.steps).toBeInstanceOf(Array)
        expect(recipe.steps.length).toBeGreaterThan(0)
        expect(recipe.steps[0]).toContain('Start with')
    })

    it('has at least 2 ingredients', async () => {
        const recipe = await solveRecipe('#F39C12') // Yellow-orange

        expect(recipe.ingredients.length).toBeGreaterThanOrEqual(2)
    })

    it('each ingredient has valid pigment and weight', async () => {
        const recipe = await solveRecipe('#1ABC9C') // Teal

        for (const ing of recipe.ingredients) {
            expect(ing.pigment).toBeDefined()
            expect(ing.pigment.id).toBeTruthy()
            expect(ing.pigment.name).toBeTruthy()
            expect(ing.weight).toBeGreaterThan(0)
            expect(ing.weight).toBeLessThanOrEqual(1)
        }
    })
})

describe('mixInteractive', () => {
    it('returns gray for empty inputs', async () => {
        const result = await mixInteractive([])
        expect(result.hex).toBe('#808080')
    })

    it('returns valid hex for single pigment', async () => {
        const result = await mixInteractive([
            { pigmentId: 'phthalo-blue', weight: 1 },
        ])

        expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })

    it('returns valid hex for multiple pigments', async () => {
        const result = await mixInteractive([
            { pigmentId: 'titanium-white', weight: 0.7 },
            { pigmentId: 'phthalo-blue', weight: 0.3 },
        ])

        expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
})
