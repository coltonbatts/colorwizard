/**
 * Tests for the mixing engine.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mix, colorDifference, clearCache, prewarmCache } from './mixEngine';
import { reloadCatalog } from './catalog';

describe('MixEngine', () => {
    beforeEach(async () => {
        clearCache();
        await reloadCatalog();
    });

    describe('mix', () => {
        it('should return gray for empty inputs', async () => {
            const result = await mix([]);

            expect(result.hex).toBe('#808080');
            expect(result.debug.warnings.length).toBeGreaterThan(0);
        });

        it('should return the same color for single paint', async () => {
            const result = await mix([
                { paintId: 'winsor-newton/winton/titanium-white', ratio: 1 },
            ]);

            expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
            // Should be very close to titanium white
            const diff = await colorDifference(result.hex, '#FDFDF9');
            expect(diff).toBeLessThan(5);
        });

        it('should handle legacy short IDs', async () => {
            const result = await mix([
                { paintId: 'titanium-white', ratio: 1 },
            ]);

            expect(result.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
            // Should work the same as full ID
            const diff = await colorDifference(result.hex, '#FDFDF9');
            expect(diff).toBeLessThan(5);
        });

        it('should mix blue and white to create light blue', async () => {
            const result = await mix([
                { paintId: 'winsor-newton/winton/phthalo-blue', ratio: 1 },
                { paintId: 'winsor-newton/winton/titanium-white', ratio: 5 },
            ]);

            const hex = result.hex.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);

            // Light blue should have moderate values with blue dominant
            expect(b).toBeGreaterThan(r);
            expect(r).toBeGreaterThan(50); // Not too dark
            expect(g).toBeGreaterThan(50);
        });

        it('should mix red and yellow to create orange-ish', async () => {
            const result = await mix([
                { paintId: 'winsor-newton/winton/cadmium-red-hue', ratio: 1 },
                { paintId: 'winsor-newton/winton/yellow-ochre', ratio: 1 },
            ]);

            const hex = result.hex.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);

            // Orange should have high red, medium green, low blue
            expect(r).toBeGreaterThan(100);
            expect(g).toBeGreaterThan(20);
            expect(b).toBeLessThan(g);
        });

        it('should normalize ratios', async () => {
            const result1 = await mix([
                { paintId: 'phthalo-blue', ratio: 1 },
                { paintId: 'titanium-white', ratio: 3 },
            ]);

            const result2 = await mix([
                { paintId: 'phthalo-blue', ratio: 0.25 },
                { paintId: 'titanium-white', ratio: 0.75 },
            ]);

            // Should produce same color
            const diff = await colorDifference(result1.hex, result2.hex);
            expect(diff).toBeLessThan(1);
        });

        it('should include debug info', async () => {
            const result = await mix([
                { paintId: 'phthalo-blue', ratio: 1 },
                { paintId: 'titanium-white', ratio: 2 },
            ]);

            expect(result.debug.mode).toBe('fast');
            expect(result.debug.normalizedRatios.length).toBe(2);
            expect(result.lab).toHaveLength(3);
        });
    });

    describe('mix with white addition', () => {
        it('should add white when whiteAddition is specified', async () => {
            const resultWithoutWhite = await mix([
                { paintId: 'phthalo-blue', ratio: 1 },
            ]);

            const resultWithWhite = await mix(
                [{ paintId: 'phthalo-blue', ratio: 1 }],
                { whiteAddition: 0.7 }
            );

            // Result with white should be lighter (higher L in OKLab)
            expect(resultWithWhite.lab[0]).toBeGreaterThan(resultWithoutWhite.lab[0]);
        });
    });

    describe('mixing monotonicity', () => {
        it('adding more white should always lighten the mix', async () => {
            const whiteAmounts = [0, 0.2, 0.4, 0.6, 0.8];
            const lightnesses: number[] = [];

            for (const white of whiteAmounts) {
                const result = await mix(
                    [{ paintId: 'phthalo-blue', ratio: 1 }],
                    { whiteAddition: white }
                );
                lightnesses.push(result.lab[0]);
            }

            // Each step should be lighter than the previous
            for (let i = 1; i < lightnesses.length; i++) {
                expect(lightnesses[i]).toBeGreaterThan(lightnesses[i - 1]);
            }
        });

        it('adding black should darken the mix', async () => {
            const pureWhite = await mix([
                { paintId: 'titanium-white', ratio: 1 },
            ]);

            const grayMix = await mix([
                { paintId: 'titanium-white', ratio: 1 },
                { paintId: 'ivory-black', ratio: 1 },
            ]);

            // Gray should be darker than white
            expect(grayMix.lab[0]).toBeLessThan(pureWhite.lab[0]);
        });
    });

    describe('colorDifference', () => {
        it('should return 0 for identical colors', async () => {
            const diff = await colorDifference('#FF0000', '#FF0000');
            expect(diff).toBe(0);
        });

        it('should return high value for very different colors', async () => {
            const diff = await colorDifference('#FF0000', '#0000FF');
            expect(diff).toBeGreaterThan(30);
        });
    });
});
