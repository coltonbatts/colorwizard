/**
 * Regression suite for paint recipe accuracy. The thresholds are ratchets set
 * from the measured baseline in docs/paint-accuracy-audit.md: they may only be
 * tightened as the solver improves. Run `npm run benchmark:paint` for the full
 * report (this suite is the fast subset).
 */
import { describe, expect, it } from 'vitest';
import { createColor, deltaESync, getPaletteColors, mixPigmentsSync } from '../../spectral/adapter';
import { solveRecipe } from '../solveRecipe';
import { baselineOptimum, deltaE00, knownMixes, quantile, solverRow } from './metrics';
import { CURATED, gamutSweep } from './targets';

describe('benchmark harness', () => {
    it('measures ΔE00 as zero for identical colors and large for different ones', () => {
        expect(deltaE00('#87CEEB', '#87CEEB')).toBe(0);
        expect(deltaE00('#87CEEB', '#808000')).toBeGreaterThan(30);
    });

    it('has a brute-force baseline that is never worse than the solver', async () => {
        for (const hex of ['#87CEEB', '#C45C3E', '#57655C', '#DDA783']) {
            const solver = await solveRecipe(hex);
            const baseline = await baselineOptimum(hex);
            expect(baseline.errorOK).toBeLessThanOrEqual(solver.error + 1e-6);
        }
    }, 30000);

    it('sweeps the whole gamut with a fixed, deduplicated grid', () => {
        const sweep = gamutSweep();
        expect(sweep).toHaveLength(216);
        expect(new Set(sweep.map((t) => t.hex)).size).toBe(216);
    });
});

describe('solver output invariants', () => {
    it('returns normalized weights whose re-mix reproduces the reported error', async () => {
        await getPaletteColors();
        for (const target of CURATED.filter((_, i) => i % 7 === 0)) {
            const recipe = await solveRecipe(target.hex);
            const sum = recipe.ingredients.reduce((s, i) => s + i.weight, 0);
            expect(sum).toBeCloseTo(1, 6);
            const remix = mixPigmentsSync(recipe.ingredients.map((i) => ({ pigmentId: i.pigment.id, weight: i.weight })));
            const error = deltaESync(remix.spectralColor, await createColor(target.hex));
            expect(error).toBeCloseTo(recipe.error, 6);
        }
    });

    it('returns whole parts within budget, and says so when it cannot', async () => {
        for (const target of CURATED.filter((_, i) => i % 5 === 0)) {
            const recipe = await solveRecipe(target.hex);
            if (recipe.paintable) {
                expect(recipe.totalParts).toBeLessThanOrEqual(16);
                expect(recipe.ingredients.reduce((s, i) => s + (i.parts ?? NaN), 0)).toBe(recipe.totalParts);
                for (const i of recipe.ingredients) {
                    expect(Number.isInteger(i.parts)).toBe(true);
                    expect(i.weight).toBeCloseTo(i.parts! / recipe.totalParts!, 9);
                }
                expect(recipe.error - recipe.unroundedError!).toBeLessThanOrEqual(1 + 1e-9);
            } else {
                expect(recipe.totalParts).toBeUndefined();
                expect(recipe.ingredients.every((i) => i.parts === undefined)).toBe(true);
            }
        }
    });

    it('is deterministic when other targets are solved in between', async () => {
        const first = await solveRecipe('#87CEEB');
        await solveRecipe('#C45C3E');
        const again = await solveRecipe('#87CEEB');
        expect(again.ingredients.map((i) => [i.pigment.id, i.weight])).toEqual(first.ingredients.map((i) => [i.pigment.id, i.weight]));
        expect(again.error).toBe(first.error);
    });
});

describe('accuracy ratchets (Core 6, default options)', () => {
    it('keeps curated real-world colors within the measured envelope', async () => {
        const rows = [];
        for (const target of CURATED) rows.push(await solverRow(target));
        const errors = rows.map((r) => r.errorOK);
        // Measured (64 targets, error of the whole-part recipe as printed): p50 1.11, p95 3.54, max 5.31,
        // 23.4% without a clean <=16-part recipe. Was 1.05 / 3.81 / 5.31 unrounded, 40.6% unpaintable.
        expect(quantile(errors, 0.5)).toBeLessThan(1.3);
        expect(quantile(errors, 0.95)).toBeLessThan(3.7);
        expect(rows.filter((r) => r.unpaintable).length / rows.length).toBeLessThan(0.27);
        expect(Math.max(...errors)).toBeLessThan(5.6);
        expect(rows.filter((r) => r.matchQuality === 'Poor')).toHaveLength(0);
    }, 60000);

    it('recovers colors that are exactly mixable from a known recipe', async () => {
        const rows = [];
        for (const target of await knownMixes(30, 1)) rows.push(await solverRow(target));
        const errors = rows.map((r) => r.errorOK);
        // Measured: p95 1.06, max 1.20 as printed in whole parts (unrounded 0.26 / 0.38; the truth scores ~0.2).
        expect(quantile(errors, 0.95)).toBeLessThan(1.2);
        expect(Math.max(...errors)).toBeLessThan(1.4);
        expect(rows.every((r) => !r.unpaintable)).toBe(true);
    }, 60000);
});
