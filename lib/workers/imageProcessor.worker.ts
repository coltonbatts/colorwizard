/**
 * Image processing Web Worker.
 * Handles heavy pixel processing operations off the main thread.
 * Uses Comlink for clean RPC-style communication.
 */
import { expose } from 'comlink';

/**
 * Convert RGB to CIE Lab color space.
 */
function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
    // Convert RGB to XYZ
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;

    rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
    gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
    bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

    const x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
    const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750;
    const z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;

    // Convert XYZ to Lab
    const fx = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    const fy = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    const fz = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    return {
        l: 116 * fy - 16,
        a: 500 * (fx - fy),
        b: 200 * (fy - fz),
    };
}

/**
 * Calculate Delta E (CIE76) between two Lab colors.
 */
function deltaE(
    lab1: { l: number; a: number; b: number },
    lab2: { l: number; a: number; b: number }
): number {
    const dL = lab1.l - lab2.l;
    const dA = lab1.a - lab2.a;
    const dB = lab1.b - lab2.b;
    return Math.sqrt(dL * dL + dA * dA + dB * dB);
}

/**
 * Get relative luminance (Y value) for value scale computation.
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;

    const rLinear = rr <= 0.03928 ? rr / 12.92 : Math.pow((rr + 0.055) / 1.055, 2.4);
    const gLinear = gg <= 0.03928 ? gg / 12.92 : Math.pow((gg + 0.055) / 1.055, 2.4);
    const bLinear = bb <= 0.03928 ? bb / 12.92 : Math.pow((bb + 0.055) / 1.055, 2.4);

    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Get step index for a luminance value given thresholds.
 */
function getStepIndex(y: number, thresholds: number[]): number {
    for (let i = 0; i < thresholds.length - 1; i++) {
        if (y >= thresholds[i] && y < thresholds[i + 1]) {
            return i;
        }
    }
    return thresholds.length - 2;
}

/**
 * Convert step index to grayscale value.
 */
function stepToGray(stepIdx: number, numSteps: number): number {
    return Math.round(255 * (stepIdx / (numSteps - 1)));
}

export interface ImageBufferResult {
    labBuffer: {
        l: Float32Array;
        a: Float32Array;
        b: Float32Array;
        width: number;
        height: number;
    };
    valueBuffer: {
        y: Float32Array;
        width: number;
        height: number;
    };
    sortedLuminances: Float32Array;
    histogram: number[];
}

/**
 * Process image data and return Lab + Value buffers.
 * This is the heavy computation we're offloading from the main thread.
 */
function processImageData(
    imageData: Uint8ClampedArray,
    width: number,
    height: number
): ImageBufferResult {
    const pixelCount = width * height;

    const lBuffer = new Float32Array(pixelCount);
    const aBuffer = new Float32Array(pixelCount);
    const bBuffer = new Float32Array(pixelCount);
    const yBuffer = new Float32Array(pixelCount);

    // Process all pixels
    for (let i = 0; i < pixelCount; i++) {
        const r = imageData[i * 4];
        const g = imageData[i * 4 + 1];
        const b = imageData[i * 4 + 2];

        const lab = rgbToLab(r, g, b);
        lBuffer[i] = lab.l;
        aBuffer[i] = lab.a;
        bBuffer[i] = lab.b;

        yBuffer[i] = getRelativeLuminance(r, g, b);
    }

    // Compute sorted luminances for percentile calculations
    const sortedLuminances = new Float32Array(yBuffer).sort();

    // Compute histogram (100 bins)
    const histogram = new Array(100).fill(0);
    for (let i = 0; i < pixelCount; i++) {
        const binIndex = Math.min(99, Math.floor(yBuffer[i] * 100));
        histogram[binIndex]++;
    }
    // Normalize histogram
    const maxBin = Math.max(...histogram);
    for (let i = 0; i < 100; i++) {
        histogram[i] = histogram[i] / maxBin;
    }

    return {
        labBuffer: { l: lBuffer, a: aBuffer, b: bBuffer, width, height },
        valueBuffer: { y: yBuffer, width, height },
        sortedLuminances,
        histogram,
    };
}

export interface ValueScaleResult {
    thresholds: number[];
    steps: Array<{ min: number; max: number; mid: number }>;
}

/**
 * Compute value scale thresholds and step boundaries.
 */
function computeValueScale(
    yBuffer: Float32Array,
    numSteps: number,
    mode: 'Even' | 'Perceptual' | 'Histogram',
    clipPercent: number
): ValueScaleResult {
    const sorted = new Float32Array(yBuffer).sort();
    const n = sorted.length;

    // Apply clipping
    const clipCount = Math.floor(n * clipPercent / 100);
    const clippedMin = sorted[clipCount] || 0;
    const clippedMax = sorted[n - 1 - clipCount] || 1;

    const thresholds: number[] = [clippedMin];

    if (mode === 'Even') {
        const stepSize = (clippedMax - clippedMin) / numSteps;
        for (let i = 1; i <= numSteps; i++) {
            thresholds.push(clippedMin + stepSize * i);
        }
    } else if (mode === 'Perceptual') {
        // Square root spacing for perceptual uniformity
        for (let i = 1; i <= numSteps; i++) {
            const t = i / numSteps;
            const val = clippedMin + (clippedMax - clippedMin) * Math.sqrt(t);
            thresholds.push(val);
        }
    } else {
        // Histogram equalization
        const step = Math.floor(n / numSteps);
        for (let i = 1; i < numSteps; i++) {
            thresholds.push(sorted[Math.min(i * step, n - 1)]);
        }
        thresholds.push(clippedMax);
    }

    const steps = [];
    for (let i = 0; i < thresholds.length - 1; i++) {
        steps.push({
            min: thresholds[i],
            max: thresholds[i + 1],
            mid: (thresholds[i] + thresholds[i + 1]) / 2,
        });
    }

    return { thresholds, steps };
}

/**
 * Generate value map overlay image data.
 * Returns Uint8ClampedArray for direct use with ImageData.
 */
function generateValueMapData(
    yBuffer: Float32Array,
    width: number,
    height: number,
    thresholds: number[]
): Uint8ClampedArray {
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);
    const numSteps = thresholds.length - 1;

    for (let i = 0; i < pixelCount; i++) {
        const y = yBuffer[i];
        const stepIdx = getStepIndex(y, thresholds);
        const val = stepToGray(stepIdx, numSteps);

        const idx = i * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
    }

    return data;
}

// Highlight overlay constants
const HIGHLIGHT_ALPHA_SOLID = 180;
const HIGHLIGHT_ALPHA_MAX = 255;

export interface LabBuffer {
    l: Float32Array;
    a: Float32Array;
    b: Float32Array;
    width: number;
    height: number;
}

/**
 * Generate highlight overlay image data.
 * Finds pixels matching the target color within tolerance and creates an overlay.
 */
function generateHighlightOverlay(
    labBuffer: LabBuffer,
    targetR: number,
    targetG: number,
    targetB: number,
    tolerance: number,
    mode: 'solid' | 'heatmap'
): Uint8ClampedArray {
    const { l: lBuffer, a: aBuffer, b: bBuffer, width, height } = labBuffer;
    const pixelCount = width * height;
    const data = new Uint8ClampedArray(pixelCount * 4);

    const targetLab = rgbToLab(targetR, targetG, targetB);

    for (let i = 0; i < pixelCount; i++) {
        const currentLab = { l: lBuffer[i], a: aBuffer[i], b: bBuffer[i] };
        const dist = deltaE(currentLab, targetLab);

        if (dist <= tolerance) {
            const idx = i * 4;
            if (mode === 'solid') {
                // Vivid pink/magenta for high visibility
                data[idx] = 255;     // R
                data[idx + 1] = 0;   // G
                data[idx + 2] = 255; // B
                data[idx + 3] = HIGHLIGHT_ALPHA_SOLID;
            } else {
                // Heatmap: Closer match = more opaque / intense
                const strength = 1 - (dist / tolerance);
                data[idx] = 255;
                data[idx + 1] = Math.floor(255 * (1 - strength));
                data[idx + 2] = 0;
                data[idx + 3] = Math.min(HIGHLIGHT_ALPHA_MAX, Math.floor(HIGHLIGHT_ALPHA_MAX * strength * 1.5));
            }
        }
        // Non-matching pixels remain transparent (default 0)
    }

    return data;
}

// Expose API to main thread via Comlink
const workerAPI = {
    processImageData,
    computeValueScale,
    generateValueMapData,
    generateHighlightOverlay,
};

export type ImageProcessorWorker = typeof workerAPI;

expose(workerAPI);
