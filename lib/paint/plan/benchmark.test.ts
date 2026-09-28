/**
 * Regression suite for whole-picture paint plans. The thresholds are ratchets set from
 * the measured baseline in docs/paint-plan-audit.md: they may only be tightened as the
 * plan algorithm improves. Run `npm run benchmark:plan` for the full report (this suite
 * is the fast subset: budgets 5 and 8 on the generated corpus, Core six).
 *
 * Everything is scored against spectral.js's forward model, on generated pictures, so it
 * measures algorithm quality and consistency, not agreement with real paint or photos.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { solveRecipe } from '../solveRecipe'
import { monotonicityViolations, PLANNERS, runBenchmark, runPlan, solverFor, summarize, type PlanRow } from './benchmark'
import { loadCorpus } from './fixtures/corpus'
import { buildHistogram } from './histogram'
import { hexToRgb, srgb8ToOklab } from './color'
import { naivePlan } from './naive'

const images = loadCorpus('synthetic')
const key = (plan: Awaited<ReturnType<typeof naivePlan>>) =>
    JSON.stringify(plan.piles.map((p) => [p.targetHex, p.recipe.predictedHex, p.recipe.ingredients.map((i) => [i.pigment.id, i.parts ?? i.weight])]))

describe('naive baseline (the reference every algorithm is measured against)', () => {
    let rows: PlanRow[] = []
    beforeAll(async () => {
        rows = await runBenchmark(images, [5, 8], PLANNERS.naive, solverFor('core6'))
    }, 120000)

    it('stays within the measured envelope at 5 and 8 piles', () => {
        const five = summarize(rows.filter((r) => r.budget === 5))
        const eight = summarize(rows.filter((r) => r.budget === 8))
        // Measured (seed 1, 9 pictures): 5 piles mean ΔE00 6.46, p95 13.04, visibly off 52.8%, unreachable 25.2%;
        // 8 piles mean 4.92, p95 9.97, visibly off 38.2%, unreachable 19.0%, 29.2% of piles with no clean ratio.
        expect(five.meanDeltaE00).toBeLessThan(6.7)
        expect(five.visiblyOffArea).toBeLessThan(0.55)
        expect(eight.meanDeltaE00).toBeLessThan(5.1)
        expect(eight.p95DeltaE00).toBeLessThan(10.3)
        expect(eight.visiblyOffArea).toBeLessThan(0.4)
        expect(eight.unreachableArea).toBeLessThan(0.21)
        expect(eight.unpaintableShare).toBeLessThan(0.31)
    })

    it('makes plans of the size asked for, dark to light, covering the whole picture', () => {
        for (const row of rows) {
            expect(row.plan.piles.length).toBeLessThanOrEqual(row.budget)
            expect(row.plan.piles.length).toBeGreaterThan(0)
            const lightness = row.plan.piles.map((p) => srgb8ToOklab(...hexToRgb(p.targetHex))[0])
            expect(lightness).toEqual([...lightness].sort((a, b) => a - b))
            expect(row.score.pileAreas.reduce((s, a) => s + a, 0)).toBeCloseTo(1, 9)
            expect(row.score.meanDeltaE00).toBeGreaterThan(0)
        }
    })

    it('never labels a pile better than its predicted swatch is', () => {
        for (const row of rows) {
            for (const pile of row.plan.piles) {
                const limit = { Excellent: 1, Good: 2.5, Fair: 5, Poor: Infinity }[pile.recipe.matchQuality]
                expect(pile.recipe.error00!).toBeLessThan(limit)
            }
        }
    })

    it('records its known weakness: more piles can look worse (2 of 9 pictures today)', () => {
        // A ratchet on a weakness: the count may only fall. Measured on 5 -> 8 piles: still-life-muted.
        expect(monotonicityViolations(rows).length).toBeLessThanOrEqual(2)
    })
})

describe('plan invariants (any algorithm)', () => {
    it('gives the identical plan for the same picture, palette and budget', async () => {
        const hist = buildHistogram(images[6].data)
        const solve = solverFor('core6')
        const a = await PLANNERS.naive(hist, 5, solve)
        // Solve something else in between: results must not depend on solver history.
        await solveRecipe('#87CEEB')
        const b = await PLANNERS.naive(hist, 5, solve)
        expect(key(a)).toBe(key(b))
    }, 30000)

    it('uses only the tubes in the palette', async () => {
        const row = await runPlan(images[6], 5, PLANNERS.naive, solverFor('zorn'))
        const allowed = new Set(['titanium-white', 'ivory-black', 'yellow-ochre', 'cadmium-red'])
        for (const pile of row.plan.piles) for (const ingredient of pile.recipe.ingredients) expect(allowed.has(ingredient.pigment.id)).toBe(true)
    }, 30000)

    it('plans a picture with fewer distinct colors than piles without failing', async () => {
        const data = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255])
        const plan = await naivePlan(buildHistogram(data), 5, solverFor('core6'))
        expect(plan.piles).toHaveLength(2)
    }, 30000)
})
