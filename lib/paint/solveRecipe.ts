/**
 * Spectral-based paint recipe solver.
 * Uses grid search to find optimal pigment combinations.
 */
import {
    mixPigments,
    deltaEFromSpectral,
    createColor,
    CHROMATIC_PIGMENTS,
    VALUE_ADJUSTERS,
    PALETTE,
    isSpectralAvailable,
    getPigment,
} from '../spectral/adapter';
import { SpectralRecipe, MixInput, getMatchQuality, MATCH_THRESHOLDS } from '../spectral/types';

/**
 * Solver configuration.
 */
const CONFIG = {
    /** Coarse grid step (percentage points) */
    COARSE_STEP: 2,
    /** Fine grid step for refinement */
    FINE_STEP: 0.5,
    /** Error threshold to include 3-pigment search */
    THREE_PIGMENT_THRESHOLD: 1.5,
    /** Minimum weight to include a pigment */
    MIN_WEIGHT: 0.01,
    /** Max value deviation that triggers white/black */
    VALUE_DEVIATION_THRESHOLD: 0.1,
};

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
 * Search for best 2-pigment mix.
 */
async function search2Pigments(
    targetHex: string
): Promise<SolverCandidate | null> {
    const pigmentCombos = combinations(PALETTE.map((p) => p.id), 2);
    const weights = weightGrid(2, CONFIG.COARSE_STEP);

    let best: SolverCandidate | null = null;

    for (const [p1, p2] of pigmentCombos) {
        for (const [w1, w2] of weights) {
            if (w1 < CONFIG.MIN_WEIGHT || w2 < CONFIG.MIN_WEIGHT) continue;

            try {
                const inputs: MixInput[] = [
                    { pigmentId: p1, weight: w1 },
                    { pigmentId: p2, weight: w2 },
                ];
                const result = await mixPigments(inputs);
                const error = await deltaEFromSpectral(result.spectralColor, targetHex);

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
 * Search for best 3-pigment mix.
 */
async function search3Pigments(
    targetHex: string
): Promise<SolverCandidate | null> {
    const pigmentCombos = combinations(PALETTE.map((p) => p.id), 3);
    const weights = weightGrid(3, CONFIG.COARSE_STEP);

    let best: SolverCandidate | null = null;

    for (const [p1, p2, p3] of pigmentCombos) {
        for (const [w1, w2, w3] of weights) {
            if (w1 < CONFIG.MIN_WEIGHT || w2 < CONFIG.MIN_WEIGHT || w3 < CONFIG.MIN_WEIGHT) continue;

            try {
                const inputs: MixInput[] = [
                    { pigmentId: p1, weight: w1 },
                    { pigmentId: p2, weight: w2 },
                    { pigmentId: p3, weight: w3 },
                ];
                const result = await mixPigments(inputs);
                const error = await deltaEFromSpectral(result.spectralColor, targetHex);

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
 * Refine a candidate with finer weight steps.
 */
async function refineCandidate(
    candidate: SolverCandidate,
    targetHex: string
): Promise<SolverCandidate> {
    const n = candidate.inputs.length;
    let best = candidate;

    // Generate fine grid around current weights
    const baseWeights = candidate.inputs.map((i) => i.weight);
    const fineStep = CONFIG.FINE_STEP / 100;
    const range = CONFIG.COARSE_STEP / 100;

    // Try variations
    const variations: number[][] = [];
    function generateVariations(current: number[], idx: number) {
        if (idx === n) {
            const sum = current.reduce((a, b) => a + b, 0);
            if (sum > 0.9 && sum < 1.1) {
                // Normalize and add
                variations.push(current.map((w) => w / sum));
            }
            return;
        }
        const base = baseWeights[idx];
        for (let delta = -range; delta <= range; delta += fineStep) {
            const newW = Math.max(0, base + delta);
            current.push(newW);
            generateVariations(current, idx + 1);
            current.pop();
        }
    }
    generateVariations([], 0);

    for (const weights of variations) {
        const inputs = candidate.inputs.map((i, idx) => ({
            ...i,
            weight: weights[idx],
        }));

        if (inputs.some((i) => i.weight < CONFIG.MIN_WEIGHT)) continue;

        try {
            const result = await mixPigments(inputs);
            const error = await deltaEFromSpectral(result.spectralColor, targetHex);

            if (error < best.error) {
                best = { inputs, hex: result.hex, error };
            }
        } catch {
            // Skip invalid
        }
    }

    return best;
}

/**
 * Generate mixing instructions from ingredients.
 */
function generateSteps(
    ingredients: SpectralRecipe['ingredients']
): string[] {
    const steps: string[] = [];
    const sorted = [...ingredients].sort((a, b) => b.weight - a.weight);

    // Find base color
    const base = sorted[0];
    const others = sorted.slice(1).filter((i) => i.weight >= CONFIG.MIN_WEIGHT);

    // Separate value adjusters from chromatic
    const chromatic = others.filter((i) => !i.pigment.isValueAdjuster);
    const valueAdj = others.filter((i) => i.pigment.isValueAdjuster);

    steps.push(`Start with **${base.pigment.name}** as your base (${base.percentage}).`);

    // 1. Value Adjusters first - IMPORTANT: Value First
    if (valueAdj.length > 0) {
        steps.push(`**Step 1: Lock the value.** Adjust your base to the target lightness/darkness.`);
        for (const ing of valueAdj) {
            const action = ing.pigment.id === 'titanium-white' ? 'lighten' : 'darken';
            steps.push(`Add **${ing.pigment.name}** to ${action} until you hit the value (${ing.percentage}).`);
        }
    }

    // 2. Chromatic adjustments second
    if (chromatic.length > 0) {
        steps.push(`**Step 2: Find the hue.** Now that value is locked, shift the color.`);
        for (const ing of chromatic) {
            const amount = ing.weight < 0.1 ? 'a small amount' : 'a moderate amount';
            steps.push(`Add ${amount} of **${ing.pigment.name}** (${ing.percentage}).`);
        }
    }

    steps.push('Mix thoroughly until uniform.');

    // Add warnings for strong pigments
    const strongPigments = ingredients.filter(
        (i) => ['phthalo-blue', 'phthalo-green'].includes(i.pigment.id) && i.weight > 0.05
    );
    if (strongPigments.length > 0) {
        const names = strongPigments.map((i) => i.pigment.name).join(' and ');
        steps.push(`**Tip:** ${names} is very strong—add gradually.`);
    }

    return steps;
}

/**
 * Solve for the best paint recipe to match a target color.
 */
export async function solveRecipe(targetHex: string): Promise<SpectralRecipe> {
    // Validate input
    if (!targetHex || !targetHex.match(/^#[0-9A-Fa-f]{6}$/)) {
        throw new Error('Invalid target hex color');
    }

    // Check spectral availability
    if (!(await isSpectralAvailable())) {
        throw new Error('Spectral.js not available');
    }

    // Step 1: Coarse 2-pigment search
    let best = await search2Pigments(targetHex);

    if (!best) {
        throw new Error('No valid 2-pigment mix found');
    }

    // Step 2: Try 3-pigment if error is high
    if (best.error > CONFIG.THREE_PIGMENT_THRESHOLD) {
        const best3 = await search3Pigments(targetHex);
        if (best3 && best3.error < best.error) {
            best = best3;
        }
    }

    // Step 3: Refine best candidate
    best = await refineCandidate(best, targetHex);

    // Build result
    const totalWeight = best.inputs.reduce((sum, i) => sum + i.weight, 0);
    const ingredients = best.inputs
        .map((input) => {
            const pigment = getPigment(input.pigmentId)!;
            const normalizedWeight = input.weight / totalWeight;
            return {
                pigment,
                weight: normalizedWeight,
                percentage: `${Math.round(normalizedWeight * 100)}%`,
            };
        })
        .filter((i) => i.weight >= CONFIG.MIN_WEIGHT)
        .sort((a, b) => b.weight - a.weight);

    return {
        ingredients,
        predictedHex: best.hex,
        error: best.error,
        matchQuality: getMatchQuality(best.error),
        steps: generateSteps(ingredients),
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
