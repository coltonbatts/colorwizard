/**
 * Relative Luminance (Y) calculation following sRGB to Linear conversion.
 * Formula for sRGB to Linear:
 * c = c/255
 * if c <= 0.04045 then c_lin = c/12.92 else c_lin = ((c+0.055)/1.055)^2.4
 *
 * Relative luminance:
 * Y = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin
 */

export function sRGBToLinear(c: number): number {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(r: number, g: number, b: number): number {
    const rl = sRGBToLinear(r);
    const gl = sRGBToLinear(g);
    const bl = sRGBToLinear(b);
    return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/**
 * Inverse of sRGBToLinear. Linear-light channel (0..1) -> sRGB (0..1).
 * Needed whenever a luminance is written back out as a displayable gray: writing linear
 * light straight into an sRGB byte renders roughly two value steps too dark.
 */
export function linearToSRGB(c: number): number {
    const v = Math.min(1, Math.max(0, c));
    return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

const LSTAR_EPSILON = 216 / 24389;
const LSTAR_KAPPA = 24389 / 27;

/**
 * Relative luminance is a photometric quantity: it answers "how much light".
 * A painter's *value* is perceptual lightness - "how light does this look" - and the two
 * diverge sharply. Middle gray (#808080) has luminance 0.22 but value 5.4 of 10.
 * CIE L* is the standard perceptual scale, and Munsell value is approximately one tenth of it.
 */
export function luminanceToLstar(y: number): number {
    const yc = Math.min(1, Math.max(0, y));
    return yc > LSTAR_EPSILON ? 116 * Math.cbrt(yc) - 16 : yc * LSTAR_KAPPA;
}

/** CIE L* (0..100) -> relative luminance (0..1). */
export function lstarToLuminance(lStar: number): number {
    const l = Math.min(100, Math.max(0, lStar));
    return l > 8 ? Math.pow((l + 16) / 116, 3) : l / LSTAR_KAPPA;
}

/** Perceptual value in 0..1 - the basis for the painter's 0-10 scale and for value steps. */
export function luminanceToValue01(y: number): number {
    return luminanceToLstar(y) / 100;
}

/** Perceptual value (0..1) -> relative luminance (0..1). */
export function value01ToLuminance(value01: number): number {
    return lstarToLuminance(value01 * 100);
}

/** Perceptual value (0..1) of an sRGB color. */
export function getPerceptualValue(r: number, g: number, b: number): number {
    return luminanceToValue01(getRelativeLuminance(r, g, b));
}

/** The neutral gray of a given perceptual value, as an sRGB byte (0..255). */
export function value01ToGrayByte(value01: number): number {
    return Math.round(linearToSRGB(value01ToLuminance(value01)) * 255);
}

export interface ValueStep {
    index: number; // 0..N-1
    min: number;   // luminance min
    max: number;   // luminance max
    center: number; // center value for rendering
    count: number;  // pixel count
    percentage: number; // percentage of total pixels
}

export interface ValueScaleResult {
    steps: ValueStep[];
    blackPoint: number;
    whitePoint: number;
    thresholds: number[];
}

export type ValueScaleMode = 'Even' | 'Percentile';
export type ClipPercent = 0 | 0.005 | 0.01 | 0.02;

/**
 * Computes value scale thresholds and metadata.
 */
export function computeValueScale(
    luminances: Float32Array,
    numSteps: number,
    mode: ValueScaleMode,
    clipPercent: number
): ValueScaleResult {
    const pixelCount = luminances.length;
    if (pixelCount === 0) {
        return { steps: [], blackPoint: 0, whitePoint: 1, thresholds: [] };
    }

    // 1. Compute black/white points via clipping
    const sorted = new Float32Array(luminances).sort();
    const lowIdx = Math.floor(pixelCount * clipPercent);
    const highIdx = Math.min(pixelCount - 1, Math.ceil(pixelCount * (1 - clipPercent)) - 1);

    const blackPoint = sorted[lowIdx];
    const whitePoint = sorted[highIdx];

    const thresholds: number[] = [];
    const steps: ValueStep[] = [];

    if (mode === 'Even') {
        // "Even" means evenly spaced *value* steps, the way a painter's value scale is built.
        // Spacing evenly in luminance instead collapses the whole shadow family into step 1
        // (with 7 steps that first band spans L* 0-45) while giving the highlights three
        // steps. Thresholds are converted back to luminance so every consumer - the sampler,
        // the overlay, the worker's value map - keeps comparing against the luminance buffer.
        const valueLow = luminanceToValue01(blackPoint);
        const valueHigh = luminanceToValue01(whitePoint);
        const stepSize = (valueHigh - valueLow) / numSteps;
        for (let i = 0; i <= numSteps; i++) {
            thresholds.push(value01ToLuminance(valueLow + i * stepSize));
        }
    } else {
        // Percentile mode: bins with equal pixel counts
        thresholds.push(blackPoint);
        for (let i = 1; i < numSteps; i++) {
            // Find threshold so each bin has equal count between blackPoint and whitePoint
            // Actually the requirement says "each bin contains equal pixel counts"
            // Let's filter to blackPoint..whitePoint range first? 
            // No, typically you just use the whole image or the clipped range.
            // Let's use the percentile of the full image but respect clipping in the first/last bins.
            const idx = Math.floor(pixelCount * (i / numSteps));
            thresholds.push(sorted[idx]);
        }
        thresholds.push(whitePoint);
    }

    // Post-process steps to compute counts and percentages
    // This is better done in a single pass over the data elsewhere for performance,
    // but for the sake of the result object we can initialize them.
    for (let i = 0; i < numSteps; i++) {
        const min = thresholds[i];
        const max = thresholds[i + 1];
        steps.push({
            index: i,
            min,
            max,
            center: (min + max) / 2,
            count: 0,
            percentage: 0
        });
    }

    return { steps, blackPoint, whitePoint, thresholds };
}

/**
 * Assigns a luminance value to a step index 0..N-1.
 */
export function getStepIndex(y: number, thresholds: number[]): number {
    const n = thresholds.length - 1;
    if (y <= thresholds[0]) return 0;
    if (y >= thresholds[n]) return n - 1;

    // Binary search for threshold
    let low = 0;
    let high = n - 1;
    while (low <= high) {
        const mid = (low + high) >> 1;
        if (y >= thresholds[mid] && y < thresholds[mid + 1]) {
            return mid;
        }
        if (y < thresholds[mid]) {
            high = mid - 1;
        } else {
            low = mid + 1;
        }
    }
    return 0;
}

/**
 * Converts a step index (0..N-1) to the gray that step should be painted.
 * Steps are spaced evenly in perceptual value, so the rendered tone is the neutral gray of
 * that value - the tone a painter would actually mix for the band.
 */
export function stepToGray(step: number, totalSteps: number): number {
    if (totalSteps <= 1) return 128;
    return value01ToGrayByte(step / (totalSteps - 1));
}

/**
 * Compute histogram data for luminances (0-1).
 * Returns array of counts for 256 bins.
 */
export function computeHistogram(luminances: Float32Array): number[] {
    const bins = new Array(256).fill(0);
    for (let i = 0; i < luminances.length; i++) {
        const val = Math.min(255, Math.max(0, Math.round(luminances[i] * 255)));
        bins[val]++;
    }
    return bins;
}
