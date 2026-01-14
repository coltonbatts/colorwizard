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
        const range = whitePoint - blackPoint;
        const stepSize = range / numSteps;
        for (let i = 0; i <= numSteps; i++) {
            thresholds.push(blackPoint + i * stepSize);
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
 * Converts a step index (0..N-1) to a grayscale value (0..255).
 * Uses linear interpolation across the step range.
 */
export function stepToGray(step: number, totalSteps: number): number {
    if (totalSteps <= 1) return 128;
    const t = step / (totalSteps - 1);
    return Math.round(t * 255);
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
