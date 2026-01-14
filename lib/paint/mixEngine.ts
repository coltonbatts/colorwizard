/**
 * Mixing Engine - clean API for paint mixing with multiple modes.
 * 
 * Modes:
 * - FAST: Uses spectral.js RGB→reflectance conversion (current approach)
 * - PHYSICAL: Scaffolded for future real K-M coefficients (currently same as FAST)
 * 
 * Both modes currently use spectral.js under the hood. The PHYSICAL mode
 * will diverge when we have real spectral/K-M data for paints.
 */
import type { Paint } from './types/Paint';
import { getPaint, paintToPigment } from './catalog';
import {
    mixPigments,
    mixPigmentsSync,
    deltaEOK,
    isSpectralAvailable,
    getPaletteColors,
    getSpectralSync,
    getCachedColorSync,
} from '../spectral/adapter';
import type { Color as SpectralColor } from 'spectral.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for mixing: a paint with its ratio in the mix.
 */
export interface MixInput {
    /** 
     * Paint ID - can be:
     * - Full ID: "winsor-newton/winton/titanium-white"
     * - Legacy short ID: "titanium-white" (for backward compatibility)
     */
    paintId: string;

    /** Weight/ratio in the mix (will be normalized to sum to 1) */
    ratio: number;
}

/**
 * Mixing mode.
 */
export type MixMode = 'fast' | 'physical';

/**
 * Options for mixing.
 */
export interface MixOptions {
    /** Mixing mode. Default: 'fast' */
    mode?: MixMode;

    /** 
     * Optional white amount to add (0-1).
     * 1.0 means equal parts white to total mix.
     */
    whiteAddition?: number;

    /** White paint ID to use. Default: first white in catalog. */
    whitePaintId?: string;

    /**
     * Optional medium/oil dilution (0-1).
     * For future use - affects transparency.
     */
    mediumRatio?: number;
}

/**
 * Debug information about the mix.
 */
export interface MixDebugInfo {
    /** Mode used for mixing */
    mode: MixMode;

    /** Spectral reflectance curve (380-730nm in 10nm steps) if available */
    spectralCurve?: number[];

    /** OKLab values [L, a, b] */
    oklab?: [number, number, number];

    /** Normalized input ratios (sum to 1) */
    normalizedRatios: { paintId: string; ratio: number }[];

    /** Any warnings (e.g., paint not found, using fallback) */
    warnings: string[];
}

/**
 * Result of a mix operation.
 */
export interface MixResult {
    /** Display hex color */
    hex: string;

    /** OKLab color values [L, a, b] */
    lab: [number, number, number];

    /** Debug information */
    debug: MixDebugInfo;
}

// ============================================================================
// Legacy Paint Map (for backward compatibility)
// ============================================================================

/**
 * Maps legacy short IDs to new full paint IDs.
 * This allows existing code using "titanium-white" to work.
 */
const LEGACY_ID_MAP: Record<string, string> = {
    'titanium-white': 'winsor-newton/winton/titanium-white',
    'ivory-black': 'winsor-newton/winton/ivory-black',
    'yellow-ochre': 'winsor-newton/winton/yellow-ochre',
    'cadmium-red': 'winsor-newton/winton/cadmium-red-hue',
    'phthalo-green': 'winsor-newton/winton/phthalo-green',
    'phthalo-blue': 'winsor-newton/winton/phthalo-blue',
};

/**
 * Resolve a paint ID (handles both legacy short IDs and full IDs).
 */
function resolvePaintId(id: string): string {
    return LEGACY_ID_MAP[id] ?? id;
}

// ============================================================================
// Color Cache for Performance
// ============================================================================

const paintColorCache = new Map<string, { hex: string; tintingStrength: number }>();

/**
 * Get paint hex and tinting strength, with caching.
 */
async function getPaintColorData(paintId: string): Promise<{
    hex: string;
    tintingStrength: number;
    found: boolean;
}> {
    const resolvedId = resolvePaintId(paintId);

    if (paintColorCache.has(resolvedId)) {
        return { ...paintColorCache.get(resolvedId)!, found: true };
    }

    const paint = await getPaint(resolvedId);
    if (paint) {
        const data = {
            hex: paint.hex,
            tintingStrength: paint.behavior?.tintingStrength ?? 1.0,
        };
        paintColorCache.set(resolvedId, data);
        return { ...data, found: true };
    }

    // Fallback: try legacy palette lookup
    // This handles the case where someone uses legacy IDs but catalog isn't loaded
    return { hex: '#808080', tintingStrength: 1.0, found: false };
}

// ============================================================================
// Mixing Functions
// ============================================================================

/**
 * Mix multiple paints together.
 * 
 * @param inputs - Array of paints with their ratios
 * @param options - Mixing options (mode, white addition, etc.)
 * @returns Mix result with hex, lab, and debug info
 * 
 * @example
 * ```ts
 * // Simple mix
 * const result = await mix([
 *   { paintId: 'winsor-newton/winton/phthalo-blue', ratio: 1 },
 *   { paintId: 'winsor-newton/winton/titanium-white', ratio: 3 },
 * ]);
 * console.log(result.hex); // Light blue hex
 * 
 * // With legacy IDs (backward compatible)
 * const result2 = await mix([
 *   { paintId: 'phthalo-blue', ratio: 1 },
 *   { paintId: 'titanium-white', ratio: 5 },
 * ]);
 * ```
 */
export async function mix(
    inputs: MixInput[],
    options?: MixOptions
): Promise<MixResult> {
    const mode = options?.mode ?? 'fast';
    const warnings: string[] = [];

    // Filter out zero ratios
    const validInputs = inputs.filter(i => i.ratio > 0);
    if (validInputs.length === 0) {
        return {
            hex: '#808080',
            lab: [0.5, 0, 0],
            debug: {
                mode,
                normalizedRatios: [],
                warnings: ['No valid inputs provided'],
            },
        };
    }

    // Normalize ratios
    const totalRatio = validInputs.reduce((sum, i) => sum + i.ratio, 0);
    const normalizedInputs = validInputs.map(i => ({
        paintId: resolvePaintId(i.paintId),
        ratio: i.ratio / totalRatio,
    }));

    // Handle white addition if specified
    if (options?.whiteAddition && options.whiteAddition > 0) {
        const whitePaintId = options.whitePaintId ?? 'winsor-newton/winton/titanium-white';
        const whiteRatio = options.whiteAddition;

        // Adjust existing ratios to make room for white
        const adjustedInputs = normalizedInputs.map(i => ({
            ...i,
            ratio: i.ratio * (1 - whiteRatio),
        }));

        // Add or increase white
        const existingWhiteIdx = adjustedInputs.findIndex(i => i.paintId === whitePaintId);
        if (existingWhiteIdx >= 0) {
            adjustedInputs[existingWhiteIdx].ratio += whiteRatio;
        } else {
            adjustedInputs.push({ paintId: whitePaintId, ratio: whiteRatio });
        }

        normalizedInputs.length = 0;
        normalizedInputs.push(...adjustedInputs);
    }

    // Execute based on mode
    // NOTE: Both modes currently use spectral.js. PHYSICAL mode will diverge
    // when we have real K-M data.
    if (mode === 'fast' || mode === 'physical') {
        return mixWithSpectral(normalizedInputs, mode, warnings);
    }

    // Fallback (shouldn't reach here)
    return {
        hex: '#808080',
        lab: [0.5, 0, 0],
        debug: {
            mode,
            normalizedRatios: normalizedInputs,
            warnings: ['Unknown mixing mode'],
        },
    };
}

/**
 * Mix paints using spectral.js.
 */
async function mixWithSpectral(
    inputs: { paintId: string; ratio: number }[],
    mode: MixMode,
    warnings: string[]
): Promise<MixResult> {
    // Build spectral mix inputs
    const spectralInputs: { pigmentId: string; weight: number; hex: string; tintingStrength: number }[] = [];

    for (const input of inputs) {
        const colorData = await getPaintColorData(input.paintId);

        if (!colorData.found) {
            warnings.push(`Paint not found: ${input.paintId}, using fallback gray`);
        }

        spectralInputs.push({
            pigmentId: input.paintId,
            weight: input.ratio,
            hex: colorData.hex,
            tintingStrength: colorData.tintingStrength,
        });
    }

    // Check if spectral.js is available
    const spectralAvailable = await isSpectralAvailable();
    if (!spectralAvailable) {
        warnings.push('Spectral.js not available, using fallback mixing');
        return fallbackMix(spectralInputs, mode, warnings);
    }

    try {
        // Import spectral dynamically
        const spectral = await import('spectral.js');

        // Create spectral colors for each paint
        const mixArgs: [SpectralColor, number][] = spectralInputs.map(input => {
            const color = new spectral.Color(input.hex);
            color.tintingStrength = input.tintingStrength;
            return [color, input.weight];
        });

        // Perform spectral mix
        const mixed = spectral.mix(...mixArgs);
        const hex = mixed.toString({ format: 'hex' });
        const oklab = mixed.OKLab as [number, number, number];

        return {
            hex,
            lab: oklab,
            debug: {
                mode,
                spectralCurve: mixed.R,
                oklab,
                normalizedRatios: inputs,
                warnings,
            },
        };
    } catch (error) {
        warnings.push(`Spectral mixing error: ${error}`);
        return fallbackMix(spectralInputs, mode, warnings);
    }
}

/**
 * Fallback mixing when spectral.js is unavailable.
 * Uses simple weighted RGB averaging.
 */
function fallbackMix(
    inputs: { pigmentId: string; weight: number; hex: string; tintingStrength: number }[],
    mode: MixMode,
    warnings: string[]
): MixResult {
    // Simple weighted RGB average (not accurate, but works as fallback)
    let r = 0, g = 0, b = 0;
    let totalWeight = 0;

    for (const input of inputs) {
        const hex = input.hex.replace('#', '');
        const pr = parseInt(hex.slice(0, 2), 16);
        const pg = parseInt(hex.slice(2, 4), 16);
        const pb = parseInt(hex.slice(4, 6), 16);

        // Apply tinting strength to weight
        const effectiveWeight = input.weight * input.tintingStrength;

        r += pr * effectiveWeight;
        g += pg * effectiveWeight;
        b += pb * effectiveWeight;
        totalWeight += effectiveWeight;
    }

    r = Math.round(r / totalWeight);
    g = Math.round(g / totalWeight);
    b = Math.round(b / totalWeight);

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    // Approximate OKLab (very rough)
    const l = (r + g + b) / (3 * 255);

    return {
        hex,
        lab: [l, 0, 0], // Rough approximation
        debug: {
            mode,
            normalizedRatios: inputs.map(i => ({ paintId: i.pigmentId, ratio: i.weight })),
            warnings: [...warnings, 'Using fallback RGB mixing (not accurate)'],
        },
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate perceptual color difference between two hex colors.
 * Uses OKLab Delta E.
 * 
 * @param hex1 - First hex color
 * @param hex2 - Second hex color
 * @returns Delta E value (0 = identical, higher = more different)
 */
export async function colorDifference(hex1: string, hex2: string): Promise<number> {
    return deltaEOK(hex1, hex2);
}

/**
 * Pre-warm the color cache for a set of paints.
 * Call this before intensive mixing operations.
 */
export async function prewarmCache(paintIds: string[]): Promise<void> {
    const promises = paintIds.map(id => getPaintColorData(id));
    await Promise.all(promises);
}

/**
 * Clear the paint color cache.
 */
export function clearCache(): void {
    paintColorCache.clear();
}
