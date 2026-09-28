/**
 * Spectral-based paint recipe solver.
 * Uses grid search to find optimal pigment combinations.
 * 
 * Supports both:
 * - Legacy PALETTE (spectral/palette.ts) for backward compatibility
 * - New Paint Catalog (paint/catalog.ts) for brand-specific paints
 */
import {
    mixPigmentsSync,
    deltaESync,
    mixPigments,
    deltaEFromSpectral,
    PALETTE,
    isSpectralAvailable,
    getPaletteColors,
    createColor,
    registerPigments,
} from '../spectral/adapter';
import { nelderMeadRefine } from './nelderMead';
import { differenceCiede2000 } from 'culori';
import { SpectralRecipe, MixInput, getMatchQuality00, Pigment } from '../spectral/types';
import { getPaints, paintToPigment } from './catalog';
import { generatePainterlyMixingSteps } from './mixingWorkflow';
import { findPaintableParts } from './parts';

/**
 * Solver configuration.
 */
const CONFIG = {
    /** Coarse grid step (percentage points) for 2- and 3-pigment searches */
    COARSE_STEP: 2,
    /** Coarser grid for the 4-pigment search (its grid is much larger) */
    FOUR_PIGMENT_STEP: 5,
    /** Skip the 3-pigment search when 2 pigments already match this closely (hex rounding noise) */
    THREE_PIGMENT_THRESHOLD: 0.3,
    /** Largest total number of parts in a paintable recipe */
    MAX_PARTS: 16,
    /** How much ΔE-OK rounding to whole parts may add over the unrounded optimum */
    MAX_ROUNDING_COST: 1,
    /** A 4th pigment must improve on the best 3-pigment recipe by at least this much ΔE-OK */
    FOUR_PIGMENT_MIN_GAIN: 1.0,
    /** Minimum weight to include a pigment */
    MIN_WEIGHT: 0.01,
    /** Max value deviation that triggers white/black */
    VALUE_DEVIATION_THRESHOLD: 0.1,
};

const CORE_SIX_PIGMENT_IDS = new Set([
    'titanium-white',
    'ivory-black',
    'yellow-ochre',
    'cadmium-red',
    'phthalo-blue',
    'phthalo-green',
]);

/**
 * Generate all combinations of n items from array.
 */
function combinations<T>(arr: T[], n: number): T[][] {
    if (n === 1) return arr.map((x) => [x]);
    if (n === arr.length) return [arr];

    const result: T[][] = [];
    for (let i = 0; i <= arr.length - n; i++) {
        const head = arr[i];
        const tailCombos = combinations(arr.slice(i + 1), n - 1);
        for (const tail of tailCombos) {
            result.push([head, ...tail]);
        }
    }
    return result;
}

/**
 * Generate weight combinations for n pigments with given step.
 */
function weightGrid(n: number, step: number): number[][] {
    const weights: number[][] = [];
    const stepCount = Math.round(100 / step);

    function recurse(current: number[], remaining: number, depth: number) {
        if (depth === n) {
            if (remaining === 0) {
                weights.push([...current]);
            }
            return;
        }
        // Last element gets remaining
        if (depth === n - 1) {
            current.push(remaining);
            weights.push([...current]);
            current.pop();
            return;
        }
        // Try all values for this position
        for (let v = 0; v <= remaining; v++) {
            current.push(v);
            recurse(current, remaining - v, depth + 1);
            current.pop();
        }
    }

    recurse([], stepCount, 0);

    // Normalize to 0-1
    return weights.map((w) => w.map((v) => v / stepCount));
}

interface SolverCandidate {
    inputs: MixInput[];
    hex: string;
    error: number;
}

/**
 * Options for the recipe solver.
 */
export interface SolveOptions {
    /** If provided, only use these pigment IDs in the recipe (legacy mode) */
    paletteColorIds?: string[];

    /**
     * Use exactly these pigments (the user's own tubes, see palettePigments.ts).
     * Takes precedence over paletteColorIds; useCatalog takes precedence over both.
     */
    pigments?: Pigment[];

    /**
     * Use the new paint catalog instead of legacy PALETTE.
     * When true, brandId and lineId filters are used.
     */
    useCatalog?: boolean;

    /** Filter by brand ID (requires useCatalog: true) */
    brandId?: string;

    /** Filter by line ID (requires useCatalog: true) */
    lineId?: string;

    /** Only include paints with these pigment IDs (requires useCatalog: true) */
    paintIds?: string[];

    /**
     * Optional out-parameter. When provided, the solver records what it did
     * (used by the accuracy benchmark; has no effect on the result).
     */
    diagnostics?: SolveDiagnostics;
}

/** What the solver did on one call. Filled in only when SolveOptions.diagnostics is set. */
export interface SolveDiagnostics {
    /** Best error after the coarse 2-pigment grid */
    twoPigmentError?: number;
    /** True when the 2-pigment error exceeded the threshold and the 3-pigment grid ran */
    triedThreePigment?: boolean;
    /** Best 3-pigment grid error, when it ran */
    threePigmentError?: number;
    /** True when the 3-pigment result replaced the 2-pigment one */
    usedThreePigment?: boolean;
    /** Best error after the 2- and 3-pigment stages, before the 4-pigment stage */
    preRefineError?: number;
    /** True when the 4-pigment recipe replaced the 3-pigment one */
    usedFourPigment?: boolean;
}

/**
 * Grid search over every n-pigment subset of the palette.
 */
function searchPigmentsSync(
    targetColor: any, // SpectralColor
    filteredPalette: typeof PALETTE,
    n: number,
    step: number
): SolverCandidate | null {
    const pigmentCombos = combinations(filteredPalette.map((p) => p.id), n);
    const weights = weightGrid(n, step);

    let best: SolverCandidate | null = null;

    for (const ids of pigmentCombos) {
        for (const w of weights) {
            if (w.some((weight) => weight < CONFIG.MIN_WEIGHT)) continue;

            try {
                const inputs: MixInput[] = ids.map((pigmentId, i) => ({ pigmentId, weight: w[i] }));
                const result = mixPigmentsSync(inputs);
                const error = deltaESync(result.spectralColor, targetColor);

                if (!best || error < best.error) {
                    best = { inputs, hex: result.hex, error };
                }
            } catch {
                // Skip invalid combinations
            }
        }
    }

    return best;
}

/**
 * Generate mixing instructions from ingredients.
 */
function generateSteps(
    ingredients: SpectralRecipe['ingredients'],
    targetLightness: number,
    targetHex: string
): string[] {
    return generatePainterlyMixingSteps(
        ingredients.map((ingredient) => ({
            id: ingredient.pigment.id,
            name: ingredient.pigment.name,
            weight: ingredient.weight,
            label: ingredient.percentage,
            isValueAdjuster: ingredient.pigment.isValueAdjuster,
            tintingStrength: ingredient.pigment.tintingStrength,
        })),
        { targetLightness, targetHex }
    );
}

/**
 * Solve for the best paint recipe to match a target color.
 * @param targetHex - The target hex color to match
 * @param options - Optional configuration including palette filter
 */
export async function solveRecipe(
    targetHex: string,
    options?: SolveOptions
): Promise<SpectralRecipe> {
    // Validate input
    if (!targetHex || !targetHex.match(/^#[0-9A-Fa-f]{6}$/)) {
        throw new Error('Invalid target hex color');
    }

    const targetRgb = {
        r: parseInt(targetHex.slice(1, 3), 16),
        g: parseInt(targetHex.slice(3, 5), 16),
        b: parseInt(targetHex.slice(5, 7), 16),
    };
    const targetLightness =
        ((Math.max(targetRgb.r, targetRgb.g, targetRgb.b) + Math.min(targetRgb.r, targetRgb.g, targetRgb.b)) / 2 / 255) * 100;

    // Pre-warm cache for high-performance sync loops
    await getPaletteColors();
    const targetColor = await createColor(targetHex);

    // Build palette based on options
    let filteredPalette: Pigment[];

    if (options?.useCatalog) {
        // Use new paint catalog
        const catalogPaints = await getPaints({
            brandId: options.brandId,
            lineId: options.lineId,
        });

        // Filter by specific paint IDs if provided
        let paintsToUse = catalogPaints;
        if (options.paintIds && options.paintIds.length > 0) {
            paintsToUse = catalogPaints.filter(p => options.paintIds!.includes(p.id));
        }

        // Convert to Pigment format for solver compatibility
        filteredPalette = paintsToUse.map(paintToPigment);

        // Register these paints with the spectral adapter for mixing
        await registerPigments(
            paintsToUse.map(p => ({
                id: p.id,
                hex: p.hex,
                tintingStrength: p.behavior?.tintingStrength ?? 1.0,
            }))
        );
    } else if (options?.pigments) {
        filteredPalette = options.pigments;
        await registerPigments(
            filteredPalette.map((p) => ({ id: p.id, hex: p.hex, tintingStrength: p.tintingStrength }))
        );
    } else if (options?.paletteColorIds) {
        // Legacy mode: filter by pigment IDs
        filteredPalette = PALETTE.filter(p => options.paletteColorIds!.includes(p.id));
    } else {
        // Default: stay on the current six-color palette only.
        filteredPalette = PALETTE.filter(p => CORE_SIX_PIGMENT_IDS.has(p.id));
    }

    if (filteredPalette.length === 0) {
        throw new Error('Palette must contain at least one color');
    }

    const refine = (candidate: SolverCandidate) =>
        nelderMeadRefine(candidate, targetColor, { maxIterations: 100, tolerance: 0.5 });
    const diagnostics = options?.diagnostics;

    // Step 1: Coarse 2-pigment search (or single if only 1 color)
    let best = filteredPalette.length >= 2 ? searchPigmentsSync(targetColor, filteredPalette, 2, CONFIG.COARSE_STEP) : null;

    // If only 1 color in palette, create a 1-pigment "mix"
    if (!best && filteredPalette.length === 1) {
        const singlePigment = filteredPalette[0];
        const inputs: MixInput[] = [{ pigmentId: singlePigment.id, weight: 1 }];
        const result = mixPigmentsSync(inputs);
        const error = deltaESync(result.spectralColor, targetColor);
        best = { inputs, hex: result.hex, error };
    }

    if (!best) {
        throw new Error('No valid mix found with available colors');
    }
    if (diagnostics) diagnostics.twoPigmentError = best.error;

    // Step 2: Refine the 2-pigment candidate, then try 3 pigments unless it is already near-exact.
    // (Nelder-Mead refinement makes the 2-pigment gate meaningful: the grid alone overstates its error.)
    best = refine(best);
    if (best.error > CONFIG.THREE_PIGMENT_THRESHOLD && filteredPalette.length >= 3) {
        const best3 = searchPigmentsSync(targetColor, filteredPalette, 3, CONFIG.COARSE_STEP);
        if (diagnostics) {
            diagnostics.triedThreePigment = true;
            diagnostics.threePigmentError = best3?.error;
        }
        if (best3) {
            const refined3 = refine(best3);
            if (refined3.error < best.error) {
                best = refined3;
                if (diagnostics) diagnostics.usedThreePigment = true;
            }
        }
    }
    if (diagnostics) diagnostics.preRefineError = best.error;

    // Step 3: A 4th pigment only when it buys a clearly better match.
    if (best.error >= CONFIG.FOUR_PIGMENT_MIN_GAIN && filteredPalette.length >= 4) {
        const best4 = searchPigmentsSync(targetColor, filteredPalette, 4, CONFIG.FOUR_PIGMENT_STEP);
        if (best4) {
            const refined4 = refine(best4);
            if (refined4.error <= best.error - CONFIG.FOUR_PIGMENT_MIN_GAIN) {
                best = refined4;
                if (diagnostics) diagnostics.usedFourPigment = true;
            }
        }
    }

    // Step 4: Round to whole parts a painter can measure. The reported error is that of the
    // recipe as printed, not of the unrounded optimum.
    const unroundedError = best.error;
    const wholeParts = findPaintableParts(
        filteredPalette.map((pigment) => pigment.id),
        targetColor,
        unroundedError,
        { maxTotalParts: CONFIG.MAX_PARTS, maxCost: CONFIG.MAX_ROUNDING_COST }
    );
    const partsById = new Map<string, number>();
    if (wholeParts.withinBudget) {
        const inputs = wholeParts.parts.map((part) => ({ pigmentId: part.pigmentId, weight: part.parts }));
        best = { inputs, hex: mixPigmentsSync(inputs).hex, error: wholeParts.error };
        for (const part of wholeParts.parts) partsById.set(part.pigmentId, part.parts);
    }

    // Build result
    const totalWeight = best.inputs.reduce((sum, i) => sum + i.weight, 0);
    const pigmentById = new Map(filteredPalette.map((pigment) => [pigment.id, pigment]));
    const ingredients = best.inputs
        .map((input) => {
            const pigment = pigmentById.get(input.pigmentId);
            if (!pigment) {
                throw new Error(`Solved pigment missing from active palette: ${input.pigmentId}`);
            }
            const normalizedWeight = input.weight / totalWeight;
            return {
                pigment,
                weight: normalizedWeight,
                percentage: `${Math.round(normalizedWeight * 100)}%`,
                ...(partsById.has(input.pigmentId) ? { parts: partsById.get(input.pigmentId) } : {}),
            };
        })
        .filter((i) => i.weight >= CONFIG.MIN_WEIGHT)
        .sort((a, b) => b.weight - a.weight);

    const error00 = differenceCiede2000()(best.hex, targetHex);

    return {
        ingredients,
        predictedHex: best.hex,
        error: best.error,
        error00,
        paintable: wholeParts.withinBudget,
        unroundedError,
        ...(wholeParts.withinBudget ? { totalParts: wholeParts.totalParts } : {}),
        matchQuality: getMatchQuality00(error00),
        steps: generateSteps(ingredients, targetLightness, targetHex),
    };
}

/**
 * Mix arbitrary pigments interactively (for Mix Lab).
 */
export async function mixInteractive(
    inputs: MixInput[]
): Promise<{ hex: string; error?: number; targetHex?: string }> {
    const validInputs = inputs.filter((i) => i.weight > 0);
    if (validInputs.length === 0) {
        return { hex: '#808080' }; // Default gray for empty mix
    }

    const result = await mixPigments(validInputs);
    return { hex: result.hex };
}

/**
 * Mix interactive with error calculation.
 */
export async function mixInteractiveWithError(
    inputs: MixInput[],
    targetHex: string
): Promise<{ hex: string; error: number }> {
    const validInputs = inputs.filter((i) => i.weight > 0);
    if (validInputs.length === 0) {
        return { hex: '#808080', error: 100 };
    }

    const result = await mixPigments(validInputs);
    const error = await deltaEFromSpectral(result.spectralColor, targetHex);
    return { hex: result.hex, error };
}
