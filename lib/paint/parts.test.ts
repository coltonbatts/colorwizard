import { describe, expect, it } from 'vitest';
import { createColor, getPaletteColors, mixPigmentsSync, deltaESync } from '../spectral/adapter';
import { roundToParts } from './parts';

describe('roundToParts', () => {
    it('returns whole parts that reproduce a whole-part recipe exactly', async () => {
        await getPaletteColors();
        const truth = [
            { pigmentId: 'titanium-white', weight: 3 },
            { pigmentId: 'yellow-ochre', weight: 1 },
        ];
        const target = mixPigmentsSync(truth).spectralColor;
        const unrounded = [
            { pigmentId: 'titanium-white', weight: 0.75 },
            { pigmentId: 'yellow-ochre', weight: 0.25 },
        ];
        const result = roundToParts(unrounded, target, 0);
        expect(result.totalParts).toBe(4);
        expect(result.parts).toEqual([
            { pigmentId: 'titanium-white', parts: 3 },
            { pigmentId: 'yellow-ochre', parts: 1 },
        ]);
        expect(result.error).toBeLessThan(0.01);
        expect(result.withinBudget).toBe(true);
    });

    it('only uses integer parts, at least one part each, and reports the true cost', async () => {
        await getPaletteColors();
        const target = await createColor('#87CEEB');
        const inputs = [
            { pigmentId: 'titanium-white', weight: 0.937 },
            { pigmentId: 'phthalo-blue', weight: 0.063 },
        ];
        const unrounded = deltaESync(mixPigmentsSync(inputs).spectralColor, target);
        const result = roundToParts(inputs, target, unrounded, { maxTotalParts: 20 });
        for (const { parts } of result.parts) {
            expect(Number.isInteger(parts)).toBe(true);
            expect(parts).toBeGreaterThanOrEqual(1);
        }
        expect(result.totalParts).toBe(result.parts.reduce((sum, p) => sum + p.parts, 0));
        expect(result.cost).toBeCloseTo(result.error - unrounded, 10);
    });

    it('flags a recipe it cannot round within budget instead of pretending', async () => {
        await getPaletteColors();
        const target = mixPigmentsSync([
            { pigmentId: 'titanium-white', weight: 0.99 },
            { pigmentId: 'ivory-black', weight: 0.01 },
        ]).spectralColor;
        const result = roundToParts(
            [{ pigmentId: 'titanium-white', weight: 0.99 }, { pigmentId: 'ivory-black', weight: 0.01 }],
            target,
            0,
            { maxTotalParts: 6, maxCost: 0.05 }
        );
        expect(result.withinBudget).toBe(false);
    });
});
