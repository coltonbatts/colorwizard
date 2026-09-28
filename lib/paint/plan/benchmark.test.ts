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
import { contextFor, monotonicityViolations, PLANNERS, runBenchmark, runPlan, summarize, type PlanRow } from './benchmark'
import { loadCorpus } from './fixtures/corpus'
import { buildHistogram } from './histogram'
import { hexToRgb, srgb8ToOklab } from './color'
import { naivePlan } from './naive'
import { makePlan } from './plan'
import { hexLab, listedParts, scorePlan } from './metrics'
import { mixPigmentsSync } from '../../spectral/adapter'
import { resolvePalettePigments } from '../palettePigments'
import { DEFAULT_PALETTE } from '../../types/palette'
import { differenceCiede2000 } from 'culori'

const images = loadCorpus('synthetic')
const key = (plan: Awaited<ReturnType<typeof naivePlan>>) =>
    JSON.stringify(plan.piles.map((p) => [p.targetHex, p.recipe.predictedHex, p.recipe.ingredients.map((i) => [i.pigment.id, i.parts ?? i.weight])]))

describe('naive baseline (the reference every algorithm is measured against)', () => {
    let rows: PlanRow[] = []
    beforeAll(async () => {
        rows = await runBenchmark(images, [5, 8], PLANNERS.naive, contextFor('core6'))
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
        const ctx = contextFor('core6')
        const a = await PLANNERS.naive(hist, 5, ctx)
        // Solve something else in between: results must not depend on solver history.
        await solveRecipe('#87CEEB')
        const b = await PLANNERS.naive(hist, 5, ctx)
        expect(key(a)).toBe(key(b))
    }, 30000)

    it('uses only the tubes in the palette', async () => {
        const row = await runPlan(images[6], 5, PLANNERS.naive, contextFor('zorn'))
        const allowed = new Set(['titanium-white', 'ivory-black', 'yellow-ochre', 'cadmium-red'])
        for (const pile of row.plan.piles) for (const ingredient of pile.recipe.ingredients) expect(allowed.has(ingredient.pigment.id)).toBe(true)
    }, 30000)

    it('plans a picture with fewer distinct colors than piles without failing', async () => {
        const data = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255])
        const plan = await naivePlan(buildHistogram(data), 5, contextFor('core6').solve)
        expect(plan.piles).toHaveLength(2)
    }, 30000)
})

describe('library planner (the current algorithm)', () => {
    let rows: PlanRow[] = []
    let scratchRows: PlanRow[] = []
    beforeAll(async () => {
        rows = await runBenchmark(images, [5, 8], PLANNERS.library, contextFor('core6'))
        scratchRows = await runBenchmark(images, [5, 8], PLANNERS['library-scratch'], contextFor('core6'))
    }, 180000)

    it('stays within the measured envelope at 5 and 8 piles', () => {
        const five = summarize(rows.filter((r) => r.budget === 5))
        const eight = summarize(rows.filter((r) => r.budget === 8))
        // Measured (9 pictures, Core six): 5 piles mean ΔE00 5.30, visibly off 37.8%; 8 piles mean 4.32, p95 10.22,
        // visibly off 30.0%, value error 2.65, 61.9 parts, 2.1 derived piles. Naive baseline was 6.46 / 52.8% and
        // 4.92 / 9.97 / 38.2% / 2.49 / 47.3 parts (its 29% unmeasurable piles count as zero parts).
        expect(five.meanDeltaE00).toBeLessThan(5.45)
        expect(five.visiblyOffArea).toBeLessThan(0.39)
        expect(eight.meanDeltaE00).toBeLessThan(4.45)
        expect(eight.p95DeltaE00).toBeLessThan(10.5)
        expect(eight.visiblyOffArea).toBeLessThan(0.31)
        expect(eight.meanValueError).toBeLessThan(2.75)
        expect(eight.totalParts).toBeLessThan(68)
        expect(eight.derivedPiles).toBeGreaterThan(1.5)
        expect(eight.msP95).toBeLessThan(2000)
    })

    it('beats the recorded naive baseline by a margin larger than k-means seed noise (about 0.2)', () => {
        // Naive baseline, seed 1, Core six (docs/paint-plan-audit.md): 5 piles 6.46 / 52.8% visibly off, 8 piles 4.92 / 38.2%.
        const five = summarize(rows.filter((r) => r.budget === 5))
        const eight = summarize(rows.filter((r) => r.budget === 8))
        expect(five.meanDeltaE00).toBeLessThan(6.46 - 0.9)
        expect(eight.meanDeltaE00).toBeLessThan(4.92 - 0.5)
        expect(five.visiblyOffArea).toBeLessThan(0.528 - 0.13)
        expect(eight.visiblyOffArea).toBeLessThan(0.382 - 0.07)
    })

    it('knows where it is still behind the naive baseline: landscape at 5 piles (7.78 vs 7.37)', () => {
        // The library only holds recipes of at most 16 parts; landscape's yellow-greens and pale blues need a touch of a
        // strong pigment. Recorded so the gap can only close: no picture may be more than 0.5 ΔE00 behind the naive plan.
        const naive = { 'landscape@5': 7.37, 'landscape@8': 6.16, 'high-key@8': 2.01, 'fruit-saturated@5': 7.26, 'sunset@5': 10.49 }
        for (const [key, baseline] of Object.entries(naive)) {
            const [image, budget] = key.split('@')
            const row = rows.find((r) => r.image === image && r.budget === Number(budget))!
            expect(row.score.meanDeltaE00).toBeLessThan(baseline + 0.5)
        }
    })

    it('never produces a scratch pile without a clean whole-part ratio, and lists every derived pile as parts', () => {
        for (const row of rows) for (const pile of row.plan.piles) {
            expect(pile.recipe.paintable).toBe(true)
            expect(Number.isInteger(pile.recipe.totalParts)).toBe(true)
            expect(pile.recipe.totalParts).toBeLessThanOrEqual(16)
            if (!pile.derived) {
                expect(pile.recipe.ingredients.reduce((sum, i) => sum + (i.parts ?? NaN), 0)).toBe(pile.recipe.totalParts)
            } else {
                expect(pile.derived.baseParts).toBeGreaterThanOrEqual(1)
                expect(pile.derived.baseParts).toBeLessThanOrEqual(4)
                for (const extra of pile.derived.extra) {
                    expect(Number.isInteger(extra.parts)).toBe(true)
                    expect(extra.parts).toBeLessThanOrEqual(4)
                }
                expect(pile.recipe.totalParts).toBe(listedParts(pile))
            }
        }
    })

    it('derives from scratch piles only (one level), and keeps a base pile even if no pixel uses it', () => {
        for (const row of rows) {
            row.plan.piles.forEach((pile, index) => {
                if (!pile.derived) return
                expect(pile.derived.base).not.toBe(index)
                expect(pile.derived.base).toBeGreaterThanOrEqual(0)
                expect(pile.derived.base).toBeLessThan(row.plan.piles.length)
                expect(row.plan.piles[pile.derived.base].derived).toBeUndefined()
            })
            expect(row.score.derivedPiles + row.score.scratchPiles).toBe(row.plan.piles.length)
        }
    })

    it('predicts a derived swatch that matches mixing its flattened pigments', () => {
        const de = differenceCiede2000()
        for (const row of rows) for (const pile of row.plan.piles.filter((p) => p.derived)) {
            const hex = mixPigmentsSync(pile.recipe.ingredients.map((i) => ({ pigmentId: i.pigment.id, weight: i.weight }))).hex
            // ingredients under 0.5% are left out of the flattened list, so allow a hair of difference
            expect(de(hex, pile.recipe.predictedHex)).toBeLessThan(0.6)
        }
    })

    it('labels each pile by the real ΔE00 of its swatch against its target, never better', () => {
        const de = differenceCiede2000()
        for (const row of rows) for (const pile of row.plan.piles) {
            expect(pile.recipe.error00!).toBeCloseTo(de(pile.recipe.predictedHex, pile.targetHex), 6)
            const limit = { Excellent: 1, Good: 2.5, Fair: 5, Poor: Infinity }[pile.recipe.matchQuality]
            expect(pile.recipe.error00!).toBeLessThan(limit)
        }
    })

    it('makes plans no larger than the budget, dark to light, covering the whole picture', () => {
        for (const row of rows) {
            expect(row.plan.piles.length).toBeLessThanOrEqual(row.budget)
            expect(row.plan.piles.length).toBeGreaterThan(0)
            expect(row.score.pileAreas.reduce((s, a) => s + a, 0)).toBeCloseTo(1, 9)
            expect(new Set(row.plan.piles.map((p) => p.recipe.predictedHex)).size).toBe(row.plan.piles.length)
            const lightness = row.plan.piles.map((p) => hexLab(p.recipe.predictedHex).l) // CIELAB L*, what value error measures
            expect(lightness).toEqual([...lightness].sort((a, b) => a - b))
        }
    })

    it('never looks worse with more piles: exactly for scratch plans, within 0.05 ΔE00 with derived piles', () => {
        // A nearest-swatch repaint cannot get worse when piles are added, and greedy selection builds a superset: zero.
        expect(monotonicityViolations(scratchRows)).toEqual([])
        // The derivation pass is greedy, so it can give back a hair: high-key 5 -> 8 piles goes 2.09 -> 2.10.
        expect(monotonicityViolations(rows, 0.05)).toEqual([])
    })

    it('derived piles are what fixes pale tints: high-key gets clearly better than from-scratch piles', () => {
        const pick = (set: PlanRow[]) => set.find((r) => r.image === 'high-key' && r.budget === 8)!.score.meanDeltaE00
        // measured 2.62 from scratch, 2.10 with derived piles
        expect(pick(rows)).toBeLessThan(pick(scratchRows) - 0.3)
    })

    it('spends no more parts than from-scratch piles, and gets a better repaint for them', () => {
        const eight = summarize(rows.filter((r) => r.budget === 8))
        const scratch = summarize(scratchRows.filter((r) => r.budget === 8))
        expect(eight.totalParts).toBeLessThan(scratch.totalParts)
        expect(eight.meanDeltaE00).toBeLessThan(scratch.meanDeltaE00)
    })

    it('is deterministic, and independent of what was planned before', async () => {
        const hist = buildHistogram(images[6].data)
        const ctx = contextFor('core6')
        const a = await PLANNERS.library(hist, 8, ctx)
        await PLANNERS.library(buildHistogram(images[2].data), 5, ctx)
        const b = await PLANNERS.library(hist, 8, ctx)
        expect(key(a)).toBe(key(b))
        expect(JSON.stringify(a.piles.map((p) => p.derived ?? null))).toBe(JSON.stringify(b.piles.map((p) => p.derived ?? null)))
    }, 30000)

    it('uses only the tubes in the palette, including a tube the user made up', async () => {
        const hist = buildHistogram(images[8].data) // sunset
        const zorn = await PLANNERS.library(hist, 8, contextFor('zorn'))
        const allowed = new Set(['titanium-white', 'ivory-black', 'yellow-ochre', 'cadmium-red'])
        for (const pile of zorn.piles) for (const i of pile.recipe.ingredients) expect(allowed.has(i.pigment.id)).toBe(true)

        const magenta = { id: 'custom-magenta-c2185b', displayName: 'Magenta', hex: '#C2185B', tintingStrength: 2 }
        const custom = resolvePalettePigments([...DEFAULT_PALETTE.colors, magenta])
        const plan = await makePlan(hist, 8, custom)
        expect(plan.piles.some((p) => p.recipe.ingredients.some((i) => i.pigment.id === magenta.id))).toBe(true)
        const before = scorePlan(hist, zorn).meanDeltaE00
        expect(scorePlan(hist, plan).meanDeltaE00).toBeLessThan(before) // more tubes cannot make the sunset worse
    }, 60000)

    it('plans a picture with fewer distinct colors than piles without failing', async () => {
        const data = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255])
        const plan = await makePlan(buildHistogram(data), 5, contextFor('core6').pigments)
        expect(plan.piles.length).toBeLessThanOrEqual(3)
        expect(plan.piles.length).toBeGreaterThan(0)
    }, 30000)
})
