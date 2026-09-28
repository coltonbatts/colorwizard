/**
 * Measurement code for the paint-accuracy benchmark.
 *
 * Error units: "OK" is the OKLab Euclidean distance ×100 (what the solver
 * optimizes and reports as `error`); "00" is CIEDE2000 between hex colors.
 * Everything here scores a recipe against spectral.js's forward model, so it
 * measures search quality and internal consistency, not agreement with real
 * paint (no measured swatches exist in the repo).
 */
import { differenceCiede2000 } from 'culori';
import { performance } from 'node:perf_hooks';
import { generatePaintRecipe, HEURISTIC_WEIGHT_MAP } from '../../colorMixer';
import { rgbToHsl, hexToRgb } from '../../colorUtils';
import { solveRecipe, type SolveDiagnostics } from '../solveRecipe';
import { roundToParts } from '../parts';
import {
    createColor,
    deltaESync,
    getCachedColorSync,
    getPaletteColors,
    getSpectralSync,
    mixPigmentsSync,
    PALETTE,
} from '../../spectral/adapter';
import type { MixInput } from '../../spectral/types';
import { seededRandom, type BenchmarkTarget } from './targets';

const de00 = differenceCiede2000();

export const CORE_SIX = ['titanium-white', 'ivory-black', 'yellow-ochre', 'cadmium-red', 'phthalo-blue', 'phthalo-green'];

/** Thresholds used to call a recipe unpaintable. */
export const PAINTABLE = {
    /** An ingredient below this share cannot be measured by hand */
    MIN_SHARE: 0.02,
    /** A whole-part recipe must exist within this many total parts... */
    MAX_PARTS: 16,
    /** ...and add no more than this much OKLab ΔE over the unrounded recipe */
    MAX_ROUNDING_COST: 1,
};

export function deltaE00(a: string, b: string): number {
    return de00(a, b);
}

export function quantile(values: number[], q: number): number {
    if (values.length === 0) return NaN;
    const sorted = [...values].sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface SolverRow {
    set: string;
    name: string;
    hex: string;
    ms: number;
    /** recipe.error: OKLab ×100, unrounded weights, pre-hex-quantization */
    errorOK: number;
    /** CIEDE2000 between predictedHex and the target */
    error00: number;
    matchQuality: string;
    ids: string[];
    weights: number[];
    diagnostics: SolveDiagnostics;
    /** Smallest ingredient share in the solver's raw output */
    minShare: number;
    /** OKLab ×100 of the recipe as the UI prints it (whole percents, <0.5% hidden) */
    displayedErrorOK: number;
    /** Simplest whole-part recipe within budget (or best effort) */
    partsTotal: number;
    partsCost: number;
    partsWithinBudget: boolean;
    unpaintable: boolean;
}

/** What ColorReadout shows: Math.round(weight*100)% per ingredient, ingredients under 0.5% dropped. */
function displayedInputs(ids: string[], weights: number[]): MixInput[] {
    const shown = ids
        .map((pigmentId, i) => ({ pigmentId, weight: Math.round(weights[i] * 100) / 100 }))
        .filter((_, i) => weights[i] >= 0.005)
        .filter((input) => input.weight > 0);
    return shown.length > 0 ? shown : [{ pigmentId: ids[0], weight: 1 }];
}

export async function solverRow(target: BenchmarkTarget): Promise<SolverRow> {
    const diagnostics: SolveDiagnostics = {};
    const t0 = performance.now();
    const recipe = await solveRecipe(target.hex, { diagnostics });
    const ms = performance.now() - t0;

    const ids = recipe.ingredients.map((i) => i.pigment.id);
    const weights = recipe.ingredients.map((i) => i.weight);
    const targetColor = await createColor(target.hex);

    const inputs = ids.map((pigmentId, i) => ({ pigmentId, weight: weights[i] }));
    const paintable = recipe.paintable === true;
    const displayedErrorOK = deltaESync(mixPigmentsSync(displayedInputs(ids, weights)).spectralColor, targetColor);
    // When the solver returns whole parts, the benchmark scores that recipe; otherwise it asks how
    // well the unrounded one could have been rounded.
    const parts = paintable
        ? { totalParts: recipe.totalParts!, cost: recipe.error - (recipe.unroundedError ?? recipe.error), withinBudget: true }
        : roundToParts(inputs, targetColor, recipe.error, {
              maxTotalParts: PAINTABLE.MAX_PARTS,
              maxCost: PAINTABLE.MAX_ROUNDING_COST,
          });
    const minShare = Math.min(...weights);

    return {
        set: target.set,
        name: target.name,
        hex: target.hex,
        ms,
        errorOK: recipe.error,
        error00: deltaE00(recipe.predictedHex, target.hex),
        matchQuality: recipe.matchQuality,
        ids,
        weights,
        diagnostics,
        minShare,
        displayedErrorOK,
        partsTotal: parts.totalParts,
        partsCost: parts.cost,
        partsWithinBudget: parts.withinBudget,
        unpaintable: minShare < PAINTABLE.MIN_SHARE || !parts.withinBudget,
    };
}

// ---------------------------------------------------------------------------
// Heuristic engine (lib/colorMixer.ts), scored through the same forward model
// ---------------------------------------------------------------------------

const HEURISTIC_IDS: Record<string, string> = {
    'Titanium White': 'titanium-white',
    'Ivory Black': 'ivory-black',
    'Yellow Ochre': 'yellow-ochre',
    'Cadmium Red': 'cadmium-red',
    'Phthalo Blue': 'phthalo-blue',
    'Phthalo Green': 'phthalo-green',
};

export interface HeuristicRow {
    set: string;
    name: string;
    hex: string;
    errorOK: number;
    error00: number;
    /** Amount labels the engine emitted that HEURISTIC_WEIGHT_MAP has no weight for */
    unmappedAmounts: string[];
    colors: Array<{ name: string; amount: string }>;
}

export async function heuristicRow(target: BenchmarkTarget): Promise<HeuristicRow> {
    await getPaletteColors();
    const rgb = hexToRgb(target.hex)!;
    const recipe = generatePaintRecipe(rgbToHsl(rgb.r, rgb.g, rgb.b));
    const unmappedAmounts: string[] = [];
    const inputs: MixInput[] = [];
    for (const color of recipe.colors) {
        const weight = HEURISTIC_WEIGHT_MAP[color.amount];
        if (weight === undefined) unmappedAmounts.push(color.amount);
        if (weight && weight > 0) inputs.push({ pigmentId: HEURISTIC_IDS[color.name], weight });
    }
    if (inputs.length === 0) inputs.push({ pigmentId: 'titanium-white', weight: 1 });
    const mixed = mixPigmentsSync(inputs);
    const targetColor = await createColor(target.hex);
    return {
        set: target.set,
        name: target.name,
        hex: target.hex,
        errorOK: deltaESync(mixed.spectralColor, targetColor),
        error00: deltaE00(mixed.hex, target.hex),
        unmappedAmounts,
        colors: recipe.colors,
    };
}

// ---------------------------------------------------------------------------
// Baseline: how close can ANY mix of the core six get? (independent of the solver)
// ---------------------------------------------------------------------------

export interface BaselineResult {
    errorOK: number;
    ids: string[];
    weights: number[];
}

type Mixer = (weights: number[]) => number;

/** Build a fast error function for a pigment subset, straight against spectral.js. */
function subsetError(ids: string[], targetColor: ReturnType<typeof getCachedColorSync>): Mixer {
    const spectral = getSpectralSync();
    const colors = ids.map((id) => {
        const p = PALETTE.find((x) => x.id === id)!;
        return getCachedColorSync(p.hex, p.tintingStrength);
    });
    const [tL, ta, tb] = targetColor.OKLab;
    return (weights) => {
        const args: [typeof colors[number], number][] = [];
        for (let i = 0; i < colors.length; i++) if (weights[i] > 0) args.push([colors[i], weights[i]]);
        if (args.length === 0) return Infinity;
        const [L, a, b] = spectral.mix(...args).OKLab;
        return Math.sqrt((L - tL) ** 2 + (a - ta) ** 2 + (b - tb) ** 2) * 100;
    };
}

function* gridWeights(slots: number, steps: number): Generator<number[]> {
    if (slots === 1) {
        yield [steps];
        return;
    }
    for (let first = 0; first <= steps; first++) {
        for (const rest of gridWeights(slots - 1, steps - first)) yield [first, ...rest];
    }
}

function subsetsOfSize<T>(items: T[], size: number): T[][] {
    if (size === 1) return items.map((x) => [x]);
    const out: T[][] = [];
    for (let i = 0; i <= items.length - size; i++) {
        for (const tail of subsetsOfSize(items.slice(i + 1), size - 1)) out.push([items[i], ...tail]);
    }
    return out;
}

/** Compass search on the simplex: shrinking steps, moving weight between pairs of pigments. */
function polish(error: Mixer, start: number[]): { weights: number[]; error: number } {
    let weights = start.map((w) => w / start.reduce((a, b) => a + b, 0));
    let best = error(weights);
    for (let step = 0.02; step > 1e-5; step /= 2) {
        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < weights.length; i++) {
                for (let j = 0; j < weights.length; j++) {
                    if (i === j || weights[j] < step) continue;
                    const next = [...weights];
                    next[i] += step;
                    next[j] -= step;
                    const e = error(next);
                    if (e < best - 1e-9) {
                        best = e;
                        weights = next;
                        improved = true;
                    }
                }
            }
        }
    }
    return { weights, error: best };
}

/**
 * Exhaustive-then-polished search over every subset of up to `maxPigments` (default 4) of the given
 * pigments: 1% grid for 1–3 pigments, 2% grid for 4, then a local polish of the
 * best cell in each subset size. Slow (about a second per target).
 */
export async function baselineOptimum(targetHex: string, pool: string[] = CORE_SIX, maxPigments = 4): Promise<BaselineResult> {
    await getPaletteColors();
    const targetColor = await createColor(targetHex);
    let best: BaselineResult = { errorOK: Infinity, ids: [], weights: [] };

    for (let size = 1; size <= Math.min(maxPigments, pool.length); size++) {
        const steps = size <= 3 ? 100 : 50;
        for (const ids of subsetsOfSize(pool, size)) {
            const error = subsetError(ids, targetColor);
            let cellBest = { weights: [] as number[], error: Infinity };
            for (const w of gridWeights(size, steps)) {
                const e = error(w);
                if (e < cellBest.error) cellBest = { weights: w, error: e };
            }
            const refined = polish(error, cellBest.weights);
            if (refined.error < best.errorOK) best = { errorOK: refined.error, ids, weights: refined.weights };
        }
    }
    return best;
}

// ---------------------------------------------------------------------------
// Recoverable targets: mixed forward from a known recipe
// ---------------------------------------------------------------------------

export interface KnownMix extends BenchmarkTarget {
    truth: MixInput[];
}

/** Random 2–3 pigment recipes in whole parts (total 4–10), mixed forward into a target hex. */
export async function knownMixes(count: number, seed = 1): Promise<KnownMix[]> {
    await getPaletteColors();
    const rand = seededRandom(seed);
    const out: KnownMix[] = [];
    while (out.length < count) {
        const size = rand() < 0.5 ? 2 : 3;
        const pool = [...CORE_SIX];
        const ids: string[] = [];
        while (ids.length < size) ids.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
        const parts = ids.map(() => 1 + Math.floor(rand() * 5));
        const truth = ids.map((pigmentId, i) => ({ pigmentId, weight: parts[i] }));
        const mixed = mixPigmentsSync(truth);
        out.push({ set: 'known', name: truth.map((t) => `${t.weight} ${t.pigmentId}`).join(' + '), hex: mixed.hex.toUpperCase(), truth });
    }
    return out;
}
