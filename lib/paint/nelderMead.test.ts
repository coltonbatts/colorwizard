/**
 * Tests for Nelder-Mead optimization.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { nelderMeadOptimize, nelderMeadRefine } from './nelderMead';
import { isSpectralAvailable, createColor, getPaletteColors } from '../spectral/adapter';
import type { MixInput } from '../spectral/types';

describe('Nelder-Mead Optimization', () => {
    beforeAll(async () => {
        // Pre-warm spectral cache
        await isSpectralAvailable();
        await getPaletteColors();
    });

    it('should improve error from coarse grid search result', async () => {
        const targetColor = await createColor('#87CEEB'); // Sky blue

        // Simulate a coarse grid search result
        const initialInputs: MixInput[] = [
            { pigmentId: 'titanium-white', weight: 0.85 },
            { pigmentId: 'phthalo-blue', weight: 0.15 },
        ];

        const result = nelderMeadOptimize(initialInputs, targetColor, {
            maxIterations: 50,
            tolerance: 0.5,
        });

        expect(result.error).toBeLessThan(5); // Should find a good match
        expect(result.inputs.length).toBeGreaterThan(0);
        expect(result.hex).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should refine candidate to lower error', async () => {
        const targetColor = await createColor('#808000'); // Olive

        const candidate = {
            inputs: [
                { pigmentId: 'yellow-ochre', weight: 0.6 },
                { pigmentId: 'ivory-black', weight: 0.4 },
            ],
            hex: '#888800',
            error: 5.0,
        };

        const refined = nelderMeadRefine(candidate, targetColor, {
            maxIterations: 100,
            tolerance: 0.5,
        });

        expect(refined.error).toBeLessThanOrEqual(candidate.error);
    });

    it('should maintain weight normalization', async () => {
        const targetColor = await createColor('#FF6B6B'); // Coral

        const initialInputs: MixInput[] = [
            { pigmentId: 'cadmium-red', weight: 0.5 },
            { pigmentId: 'titanium-white', weight: 0.5 },
        ];

        const result = nelderMeadOptimize(initialInputs, targetColor);

        // Weights should sum to approximately 1
        const totalWeight = result.inputs.reduce((sum, i) => sum + i.weight, 0);
        expect(totalWeight).toBeCloseTo(1.0, 1);
    });

    it('should converge for an achievable target', async () => {
        // Use a color that's achievable with the palette
        const targetColor = await createColor('#E0E0E0'); // Light gray

        const initialInputs: MixInput[] = [
            { pigmentId: 'titanium-white', weight: 0.9 },
            { pigmentId: 'ivory-black', weight: 0.1 },
        ];

        const result = nelderMeadOptimize(initialInputs, targetColor, {
            maxIterations: 100,
            tolerance: 1.0,
        });

        expect(result.error).toBeLessThan(3); // Should achieve good match for neutral
    });
});
