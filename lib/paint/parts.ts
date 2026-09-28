/**
 * Rounds a solved recipe to whole parts a painter can measure ("3 parts white,
 * 1 part ochre"), and reports what the rounding costs in ΔE.
 *
 * Requires spectral.js to be loaded and the recipe's pigments to be cached
 * (both are true right after solveRecipe has run).
 */
import { deltaESync, getPigmentColorSync, getSpectralSync, mixPigmentsSync } from '../spectral/adapter';
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

export interface PaintablePartsOptions extends PartsOptions {
    /** Largest number of pigments in a recipe */
    maxPigments?: number;
    /** Fewest pigments in a recipe (a single tube is not a mix); default 2 when the palette has 2+ */
    minPigments?: number;
    /** Each pigment beyond the third must improve the best smaller recipe by this much ΔE-OK */
    extraPigmentGain?: number;
}

/**
 * Search whole-part recipes over the entire palette (not just the pigments of
 * an unrounded solution) and return the simplest one within `maxCost` of
 * `referenceError`. Fewer total parts wins; a 4th pigment is only used when it
 * beats the best 3-pigment recipe at the same part count by `extraPigmentGain`.
 * When nothing fits, returns the lowest-error recipe found, flagged
 * withinBudget: false.
 */
export function findPaintableParts(
    pigmentIds: string[],
    targetColor: SpectralColor,
    referenceError: number,
    options: PaintablePartsOptions = {}
): PartsRecipe {
    const { maxTotalParts = 12, maxCost = 0.5, maxPigments = 4, extraPigmentGain = 1 } = options;
    const minPigments = options.minPigments ?? (pigmentIds.length >= 2 ? 2 : 1);
    const spectral = getSpectralSync();
    const colors = new Map(pigmentIds.map((id) => [id, getPigmentColorSync(id)]));
    const [tL, ta, tb] = targetColor.OKLab;
    const errorOf = (ids: string[], split: number[]) => {
        const args: [SpectralColor, number][] = ids.map((id, i) => [colors.get(id)!, split[i]]);
        const [L, a, b] = spectral.mix(...args).OKLab;
        return Math.sqrt((L - tL) ** 2 + (a - ta) ** 2 + (b - tb) ** 2) * 100;
    };

    const bySize: string[][][] = [];
    for (let size = 1; size <= Math.min(maxPigments, pigmentIds.length); size++) bySize[size] = pigmentSubsets(pigmentIds, size);

    let fallback: PartsRecipe | null = null;
    const make = (ids: string[], split: number[], total: number, error: number): PartsRecipe => ({
        parts: ids.map((pigmentId, i) => ({ pigmentId, parts: split[i] })),
        totalParts: total,
        error,
        cost: error - referenceError,
        withinBudget: error - referenceError <= maxCost,
    });

    for (let total = 1; total <= maxTotalParts; total++) {
        let best: PartsRecipe | null = null;
        const bestPerSize: Array<PartsRecipe | null> = [];

        for (let size = minPigments; size < bySize.length && size <= total; size++) {
            let bestForSize: PartsRecipe | null = null;
            for (const ids of bySize[size]) {
                for (const split of compositions(total, size)) {
                    const error = errorOf(ids, split);
                    if (!bestForSize || error < bestForSize.error) bestForSize = make(ids, split, total, error);
                }
            }
            bestPerSize[size] = bestForSize;
        }

        // Up to 3 pigments compete on error alone; each pigment beyond 3 must earn its place.
        for (let size = minPigments; size < bestPerSize.length; size++) {
            const candidate = bestPerSize[size];
            if (!candidate) continue;
            const needed = size > 3 ? extraPigmentGain : 0;
            if (!best || candidate.error <= best.error - needed) best = candidate;
        }

        if (best?.withinBudget) return best;
        if (best && (!fallback || best.error < fallback.error)) fallback = best;
    }

    if (!fallback) throw new Error('No whole-part recipe could be built');
    return fallback;
}

function pigmentSubsets(items: string[], size: number): string[][] {
    if (size === 1) return items.map((x) => [x]);
    const out: string[][] = [];
    for (let i = 0; i <= items.length - size; i++) {
        for (const tail of pigmentSubsets(items.slice(i + 1), size - 1)) out.push([items[i], ...tail]);
    }
    return out;
}
