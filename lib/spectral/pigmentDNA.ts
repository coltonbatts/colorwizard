/**
 * pigmentDNA - Calculates the physical pigment ratios for the Spectral Layer Breakdown.
 */
import { getSpectralSync, mixPigmentsSync, isSpectralAvailable } from './adapter';
import { Pigment } from './types';
import { PALETTE_MAP } from './palette';

export interface PigmentRatio {
    pigmentId: string;
    name: string;
    weight: number; // 0 to 1
    hex: string;
}

export interface LayerDNA {
    layer: 'imprimatura' | 'dead-color' | 'local-color' | 'spectral-glaze';
    ratios: PigmentRatio[];
}

/**
 * For Dead Color step: Calculate the mix of Raw Umber and Titanium White
 * to match a specific grayscale value (0-255).
 */
export async function calculateDeadColorDNA(grayscaleValue: number): Promise<PigmentRatio[]> {
    if (!await isSpectralAvailable()) return [];

    const targetY = grayscaleValue / 255;
    const white = PALETTE_MAP.get('titanium-white')!;
    const umber = PALETTE_MAP.get('raw-umber')!;

    // Iterative search for the best ratio of White to Umber
    // In a dead color layer, we usually mix umber with white to get the value right.
    let bestRatio = 0.5;
    let minDiff = Infinity;

    for (let r = 0; r <= 1; r += 0.05) {
        const mix = mixPigmentsSync([
            { pigmentId: 'titanium-white', weight: r },
            { pigmentId: 'raw-umber', weight: 1 - r }
        ]);

        // Use luminance comparison
        const spectral = getSpectralSync();
        const color = new spectral.Color(mix.hex);
        const y = color.OKLab[0]; // L in OKLab is a good proxy for perceptual value

        const diff = Math.abs(y - targetY);
        if (diff < minDiff) {
            minDiff = diff;
            bestRatio = r;
        }
    }

    return [
        {
            pigmentId: 'titanium-white',
            name: 'Titanium White',
            weight: bestRatio,
            hex: white.hex
        },
        {
            pigmentId: 'raw-umber',
            name: 'Raw Umber',
            weight: 1 - bestRatio,
            hex: umber.hex
        }
    ];
}

/**
 * For Imprimatura: Suggest a thinned-down version of the dominant undertone.
 * Usually raw umber or a warm earth tone.
 */
export async function calculateImprimaturaDNA(dominantHex: string): Promise<PigmentRatio[]> {
    // For now, simpler implementation: suggest Raw Umber if warm, Ivory Black if cool?
    // User requested "dominant warm/cool undertone".
    // A better approach is matching the dominant color using the whole palette.

    // Placeholder: Return Raw Umber as the "classic" imprimatura
    const umber = PALETTE_MAP.get('raw-umber')!;
    return [
        {
            pigmentId: 'raw-umber',
            name: 'Raw Umber',
            weight: 1.0,
            hex: umber.hex
        }
    ];
}
