import { deltaE, hexToRgb } from '../colorUtils';
import { ColorNameMatch, ColorSource } from './types';

// Simple Euclidean distance in RGB space for fast pruning
function fastDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
    return Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2);
}

const rgbCache = new Map<string, { r: number, g: number, b: number }>();

function getRgb(hex: string) {
    let cached = rgbCache.get(hex);
    if (!cached) {
        const rgb = hexToRgb(hex);
        if (rgb) {
            cached = rgb;
            rgbCache.set(hex, rgb);
        }
    }
    return cached;
}

/**
 * Finds the nearest color name from a given dataset using Delta E distance.
 * Uses a two-pass approach for performance:
 * 1. Fast Euclidean distance to find top candidates.
 * 2. CIEDE2000 for precise perceptual matching on top candidates.
 */
export function findNearestColor(
    targetHex: string,
    dataset: Record<string, string>,
    source: ColorSource
): ColorNameMatch {
    const start = performance.now();
    const targetRgb = getRgb(targetHex);
    if (!targetRgb) {
        return { name: "Unknown", matchedHex: targetHex, distance: 100, source };
    }

    const entries = Object.entries(dataset);

    // Pass 1: Fast filtering
    let candidates: Array<{ hex: string; name: string; fastDist: number }> = [];

    for (const [hex, name] of entries) {
        const rgb = getRgb(hex);
        if (!rgb) continue;

        const fastDist = fastDistance(targetRgb.r, targetRgb.g, targetRgb.b, rgb.r, rgb.g, rgb.b);
        candidates.push({ hex, name, fastDist });
    }

    // Sort by fast distance and take top 50
    candidates.sort((a, b) => a.fastDist - b.fastDist);
    const topCandidates = candidates.slice(0, 50);

    // Pass 2: Precise matching
    let minDistance = Infinity;
    let bestMatch: ColorNameMatch = {
        name: "Unknown",
        matchedHex: targetHex,
        distance: 100,
        source
    };

    for (const cand of topCandidates) {
        const distance = deltaE(targetHex, cand.hex);

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = {
                name: cand.name,
                matchedHex: cand.hex,
                distance,
                source
            };
        }

        if (distance === 0) break;
    }

    const end = performance.now();
    console.debug(`[ColorNaming] Matched in ${(end - start).toFixed(2)}ms for ${entries.length} colors`);

    return bestMatch;
}
