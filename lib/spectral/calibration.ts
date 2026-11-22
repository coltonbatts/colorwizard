/**
 * Fit tinting strengths to photographed swatches.
 *
 * The solver treats a recipe's parts as spectral.js "factors", where each
 * pigment's concentration is (factor × tintingStrength)² × luminance. Two
 * things in that model are hand-set and unvalidated: the per-pigment tinting
 * strengths, and whether parts (measured by volume) should be used directly as
 * factors. This module fits both against measured mixes:
 *
 *   factor = parts ^ exponent      exponent 1 = the current behavior (parts are factors)
 *                                  exponent 0.5 = concentration linear in volume
 *
 * Pure functions; the caller supplies the loaded spectral.js module.
 */
import { differenceCiede2000 } from 'culori';
import type * as SpectralModule from 'spectral.js';

type Spectral = typeof SpectralModule;

export interface Mix {
    /** Whole parts by volume per pigment id, e.g. { 'titanium-white': 9, 'ivory-black': 1 } */
    parts: Record<string, number>;
    /** Measured color of the dried or wet swatch, sRGB hex */
    hex: string;
    /** Kept out of the fit and used only to check it */
    holdout?: boolean;
    note?: string;
}

export interface SwatchData {
    /** Measured masstone (the tube straight, thick) per pigment id; used as the pigment's hex */
    masstones: Record<string, string>;
    mixes: Mix[];
}

export interface FitOptions {
    /** Pigment whose tinting strength is fixed at 1 (the reference) */
    reference?: string;
    /** Starting strengths (default 1 each) */
    initial?: Record<string, number>;
    /** Coordinate-search passes */
    passes?: number;
}

export interface FitResult {
    exponent: number;
    strengths: Record<string, number>;
    /** ΔE00 between predicted and measured hex */
    train: ErrorStats;
    holdout: ErrorStats | null;
    perMix: Array<{ note: string; measured: string; predicted: string; deltaE00: number; holdout: boolean }>;
}

export interface ErrorStats {
    n: number;
    mean: number;
    rms: number;
    max: number;
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const de00 = differenceCiede2000();
const MIN_STRENGTH = 0.05;
const MAX_STRENGTH = 50;

export function validateSwatchData(data: SwatchData): string[] {
    const problems: string[] = [];
    for (const [id, hex] of Object.entries(data.masstones)) {
        if (hex && !HEX.test(hex)) problems.push(`masstone ${id}: "${hex}" is not #RRGGBB`);
    }
    data.mixes.forEach((mix, i) => {
        if (mix.hex && !HEX.test(mix.hex)) problems.push(`mix ${i} (${mix.note ?? ''}): "${mix.hex}" is not #RRGGBB`);
        for (const [id, parts] of Object.entries(mix.parts)) {
            if (!(parts > 0)) problems.push(`mix ${i}: parts for ${id} must be positive`);
            if (!data.masstones[id] || !HEX.test(data.masstones[id])) problems.push(`mix ${i}: ${id} has no measured masstone`);
        }
    });
    return problems;
}

/** Drop template rows that have not been measured yet. */
export function measuredOnly(data: SwatchData): SwatchData {
    return {
        masstones: Object.fromEntries(Object.entries(data.masstones).filter(([, hex]) => HEX.test(hex))),
        mixes: data.mixes.filter((mix) => HEX.test(mix.hex)),
    };
}

export function predictHex(spectral: Spectral, data: SwatchData, mix: Mix, strengths: Record<string, number>, exponent: number): string {
    const args = Object.entries(mix.parts).map(([id, parts]) => {
        const color = new spectral.Color(data.masstones[id]);
        color.tintingStrength = strengths[id] ?? 1;
        return [color, parts ** exponent] as [InstanceType<Spectral['Color']>, number];
    });
    return spectral.mix(...args).toString({ format: 'hex' });
}

function stats(errors: number[]): ErrorStats {
    if (errors.length === 0) return { n: 0, mean: NaN, rms: NaN, max: NaN };
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    return { n: errors.length, mean, rms: Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length), max: Math.max(...errors) };
}

export function evaluate(spectral: Spectral, data: SwatchData, strengths: Record<string, number>, exponent: number): FitResult {
    const rows = data.mixes.map((mix) => {
        const predicted = predictHex(spectral, data, mix, strengths, exponent);
        return { note: mix.note ?? '', measured: mix.hex, predicted, deltaE00: de00(predicted, mix.hex), holdout: !!mix.holdout };
    });
    return {
        exponent,
        strengths,
        train: stats(rows.filter((r) => !r.holdout).map((r) => r.deltaE00)),
        holdout: rows.some((r) => r.holdout) ? stats(rows.filter((r) => r.holdout).map((r) => r.deltaE00)) : null,
        perMix: rows,
    };
}

/**
 * Fit strengths for a fixed exponent by coordinate search on log-strength,
 * minimizing the RMS ΔE00 of the non-holdout mixes.
 */
export function fitStrengths(spectral: Spectral, data: SwatchData, exponent: number, options: FitOptions = {}): FitResult {
    const { reference = 'titanium-white', passes = 6 } = options;
    const ids = Array.from(new Set(data.mixes.flatMap((mix) => Object.keys(mix.parts)))).filter((id) => id !== reference);
    const strengths: Record<string, number> = { [reference]: 1 };
    for (const id of ids) strengths[id] = options.initial?.[id] ?? 1;

    const train = data.mixes.filter((mix) => !mix.holdout);
    const objective = () => {
        let sum = 0;
        for (const mix of train) sum += de00(predictHex(spectral, data, mix, strengths, exponent), mix.hex) ** 2;
        return sum / Math.max(1, train.length);
    };

    for (let pass = 0; pass < passes; pass++) {
        for (const id of ids) {
            // golden-section search over log strength, others held fixed
            let lo = Math.log(MIN_STRENGTH);
            let hi = Math.log(MAX_STRENGTH);
            const phi = (Math.sqrt(5) - 1) / 2;
            const at = (x: number) => {
                strengths[id] = Math.exp(x);
                return objective();
            };
            let x1 = hi - phi * (hi - lo);
            let x2 = lo + phi * (hi - lo);
            let f1 = at(x1);
            let f2 = at(x2);
            for (let i = 0; i < 40; i++) {
                if (f1 < f2) {
                    hi = x2;
                    x2 = x1;
                    f2 = f1;
                    x1 = hi - phi * (hi - lo);
                    f1 = at(x1);
                } else {
                    lo = x1;
                    x1 = x2;
                    f1 = f2;
                    x2 = lo + phi * (hi - lo);
                    f2 = at(x2);
                }
            }
            strengths[id] = Math.exp((lo + hi) / 2);
        }
    }
    return evaluate(spectral, data, { ...strengths }, exponent);
}
