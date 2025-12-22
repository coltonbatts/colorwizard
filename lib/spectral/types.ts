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
    }>;
    /** Predicted hex color of the mix */
    predictedHex: string;
    /** Perceptual error (Delta E in OKLab) */
    error: number;
    /** Match quality label */
    matchQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    /** Step-by-step mixing instructions */
    steps: string[];
    /** True if using fallback heuristic mode */
    isFallback?: boolean;
}

/**
 * Match quality thresholds (Delta E OKLab)
 */
export const MATCH_THRESHOLDS = {
    EXCELLENT: 1.0,
    GOOD: 2.5,
    FAIR: 6.0,
} as const;

/**
 * Get match quality label from error value.
 */
export function getMatchQuality(error: number): SpectralRecipe['matchQuality'] {
    if (error < MATCH_THRESHOLDS.EXCELLENT) return 'Excellent';
    if (error < MATCH_THRESHOLDS.GOOD) return 'Good';
    if (error < MATCH_THRESHOLDS.FAIR) return 'Fair';
    return 'Poor';
}
