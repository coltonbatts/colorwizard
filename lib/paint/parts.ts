/**
 * Rounds a solved recipe to whole parts a painter can measure ("3 parts white,
 * 1 part ochre"), and reports what the rounding costs in ΔE.
 *
 * Requires spectral.js to be loaded and the recipe's pigments to be cached
 * (both are true right after solveRecipe has run).
 */
import { deltaESync, mixPigmentsSync } from '../spectral/adapter';
import type { MixInput } from '../spectral/types';
import type { Color as SpectralColor } from 'spectral.js';

export interface PartsOptions {
    /** Largest total number of parts to consider */
    maxTotalParts?: number;
    /** Extra OKLab ΔE (×100) the rounding may add over the unrounded recipe */
    maxCost?: number;
}

export interface PartsRecipe {
    parts: Array<{ pigmentId: string; parts: number }>;
    totalParts: number;
    /** OKLab ΔE (×100) of the rounded recipe against the target */
    error: number;
    /** error minus the unrounded recipe's error (can be negative) */
    cost: number;
    /** False when no rounding within maxTotalParts stayed inside maxCost */
    withinBudget: boolean;
}

/** All ways to split `total` into `slots` positive integers. */
function* compositions(total: number, slots: number): Generator<number[]> {
    if (slots === 1) {
        yield [total];
        return;
    }
    for (let first = 1; first <= total - (slots - 1); first++) {
        for (const rest of compositions(total - first, slots - 1)) {
            yield [first, ...rest];
        }
    }
}

/** Every non-empty subset of the ingredient indices, largest first. */
function subsets(count: number): number[][] {
    const out: number[][] = [];
    for (let mask = (1 << count) - 1; mask > 0; mask--) {
        const subset: number[] = [];
        for (let i = 0; i < count; i++) if (mask & (1 << i)) subset.push(i);
        out.push(subset);
    }
    return out;
}

/**
 * Find the simplest whole-part recipe that stays within `maxCost` of the
 * unrounded one. Fewer total parts wins; ties go to the lower error.
 * An ingredient may be dropped when that is what keeps the ratio simple.
 */
export function roundToParts(
    inputs: MixInput[],
    targetColor: SpectralColor,
    unroundedError: number,
    options: PartsOptions = {}
): PartsRecipe {
    const { maxTotalParts = 12, maxCost = 1 } = options;
    const ingredients = inputs.filter((input) => input.weight > 0);
    const candidateSubsets = subsets(ingredients.length);

    let fallback: PartsRecipe | null = null;

    for (let total = 1; total <= maxTotalParts; total++) {
        let bestAtTotal: PartsRecipe | null = null;

        for (const subset of candidateSubsets) {
            if (subset.length > total) continue;
            for (const split of compositions(total, subset.length)) {
                const mixInputs: MixInput[] = subset.map((index, i) => ({
                    pigmentId: ingredients[index].pigmentId,
                    weight: split[i],
                }));
                const error = deltaESync(mixPigmentsSync(mixInputs).spectralColor, targetColor);
                if (!bestAtTotal || error < bestAtTotal.error) {
                    bestAtTotal = {
                        parts: mixInputs.map((m) => ({ pigmentId: m.pigmentId, parts: m.weight })),
                        totalParts: total,
                        error,
                        cost: error - unroundedError,
                        withinBudget: error - unroundedError <= maxCost,
                    };
                }
            }
        }

        if (bestAtTotal?.withinBudget) return bestAtTotal;
        if (bestAtTotal && (!fallback || bestAtTotal.error < fallback.error)) fallback = bestAtTotal;
    }

    if (!fallback) throw new Error('No whole-part recipe could be built');
    return fallback;
}
