/**
 * User-facing labels for color metrics.
 * Keep CIEDE2000 language for catalog/swatches; OKLab model error for spectral mixes.
 */

import { getMatchConfidence } from './colorUtils';
import { getMatchQuality, type SpectralRecipe } from './spectral/types';

const SPECTRAL_FIT_LABELS: Record<SpectralRecipe['matchQuality'], string> = {
    Excellent: 'Strong model fit',
    Good: 'Good model fit',
    Fair: 'Moderate model fit',
    Poor: 'Weak model fit',
};

/** CIEDE2000 distance for catalog, DMC, and color-name matching. */
export function formatCatalogDeltaE00(value: number): string {
    return `ΔE₀₀ ${value.toFixed(1)}`;
}

export function getCatalogMatchPresentation(deltaE00: number) {
    const { label, color, bgColor } = getMatchConfidence(deltaE00);
    return {
        label,
        metricLabel: formatCatalogDeltaE00(deltaE00),
        color,
        bgColor,
    };
}

/** OKLab error from the Kubelka–Munk spectral solver (not CIEDE2000). */
export function formatSpectralModelError(oklabError: number): string {
    return `model Δ ${oklabError.toFixed(1)}`;
}

export function getSpectralModelFitPresentation(oklabError: number) {
    const band = getMatchQuality(oklabError);
    return {
        band,
        label: SPECTRAL_FIT_LABELS[band],
        metricLabel: formatSpectralModelError(oklabError),
    };
}

export const PICKED_COLOR_DISCLAIMER =
    'Sampled from your photo or display. Paint and thread matches depend on your lighting and materials.';

export const SPECTRAL_RECIPE_DISCLAIMER =
    'Spectral mix is a Kubelka–Munk model prediction for on-screen guidance—not a guarantee of wet paint.';

export const HIGHLIGHT_TOLERANCE_NOTE =
    'Similarity overlay uses fast Lab distance on a reduced-resolution map (approximate, not CIEDE2000).';

export const VALUE_ANALYSIS_NOTE =
    'Value bands are computed from a reduced-resolution luminance map; fine detail may differ slightly from the eyedropper sample.';
