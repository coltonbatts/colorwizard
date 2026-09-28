/**
 * Type definitions for spectral paint mixing.
 */

/**
 * Represents a paint pigment in the palette.
 */
export interface Pigment {
    /** Unique identifier for the pigment */
    id: string;
    /** Display name (e.g., "Titanium White") */
    name: string;
    /** Hex color representation */
    hex: string;
    /** Tinting strength (0-1). Lower = less dominant in mixes. Default 1. */
    tintingStrength: number;
    /** Whether this is a value adjuster (white/black) */
    isValueAdjuster?: boolean;
}

/**
 * Input for mixing operation - pigment with weight.
 */
export interface MixInput {
    pigmentId: string;
    /** Weight in the mix (will be normalized) */
    weight: number;
}

/**
 * Result of a solved recipe.
 */
export interface SpectralRecipe {
    /** Ordered list of pigments with their weights (normalized to sum to 1) */
    ingredients: Array<{
        pigment: Pigment;
        weight: number;
        /** Human-readable percentage */
        percentage: string;
        /** Whole parts, when the recipe is paintable (weight = parts / totalParts) */
        parts?: number;
    }>;
    /** Total whole parts across ingredients, when the recipe is paintable */
    totalParts?: number;
    /**
     * True when ingredients are whole parts (at most 12) within the rounding budget
     * of the unrounded optimum. False means only the unrounded percentages are available.
     */
    paintable?: boolean;
    /** OKLab error of the unrounded optimum, before rounding to whole parts */
    unroundedError?: number;
    /** CIEDE2000 of the unrounded optimum's swatch vs the target (error00 minus this is the rounding cost) */
    unroundedError00?: number;
    /** Predicted hex color of the mix */
    predictedHex: string;
    /** OKLab model error between predicted mix and target (not CIEDE2000) */
    error: number;
    /** CIEDE2000 between predictedHex and the target hex */
    error00?: number;
    /** Model-fit band derived from CIEDE2000 (same bands as the thread match) */
    matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    /** Step-by-step mixing instructions */
    steps: string[];
    /** True if using fallback heuristic mode */
    isFallback?: boolean;
}

/**
 * CIEDE2000 bands for a recipe's predicted color vs the target: under 1 is
 * imperceptible, under 2.5 close side by side, under 5 a visible but usable
 * miss. Matches the thread-match wording.
 */
export const MATCH_THRESHOLDS_00 = {
    EXCELLENT: 1,
    GOOD: 2.5,
    FAIR: 5,
} as const;

export function getMatchQuality00(error00: number): SpectralRecipe['matchQuality'] {
    if (error00 < MATCH_THRESHOLDS_00.EXCELLENT) return 'Excellent';
    if (error00 < MATCH_THRESHOLDS_00.GOOD) return 'Good';
    if (error00 < MATCH_THRESHOLDS_00.FAIR) return 'Fair';
    return 'Poor';
}

/**
 * Spectral model-fit thresholds on OKLab error (not CIEDE2000). Used where
 * only an OKLab error is available (Mix Lab); recipes use getMatchQuality00.
 */
export const MATCH_THRESHOLDS = {
    EXCELLENT: 1.0,
    GOOD: 2.5,
    FAIR: 6.0,
} as const;

/**
 * Get model-fit band from OKLab error value.
 */
export function getMatchQuality(error: number): SpectralRecipe['matchQuality'] {
    if (error < MATCH_THRESHOLDS.EXCELLENT) return 'Excellent';
    if (error < MATCH_THRESHOLDS.GOOD) return 'Good';
    if (error < MATCH_THRESHOLDS.FAIR) return 'Fair';
    return 'Poor';
}
