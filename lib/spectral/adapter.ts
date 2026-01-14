/**
 * Spectral.js adapter module.
 * Provides caching and a clean API for paint mixing operations.
 */
import { Pigment, MixInput } from './types';
import { PALETTE, PALETTE_MAP } from './palette';
import type { Color as SpectralColor } from 'spectral.js';

type SpectralModule = typeof import('spectral.js');

// Cached spectral module and colors
let spectralModule: SpectralModule | null = null;
let spectralError: Error | null = null;
const colorCache = new Map<string, SpectralColor>();

/**
 * Lazily load and cache the spectral.js module.
 */
async function getSpectral(): Promise<SpectralModule> {
    if (spectralError) throw spectralError;
    if (spectralModule) return spectralModule;

    try {
        const spectral = await import('spectral.js');
        spectralModule = spectral;
        return spectralModule;
    } catch (err) {
        spectralError = err instanceof Error ? err : new Error('Failed to load spectral.js');
        throw spectralError;
    }
}

/**
 * Get or create a cached spectral Color for a hex value.
 */
async function getSpectralColor(hex: string, tintingStrength = 1): Promise<SpectralColor> {
    const cacheKey = `${hex}-${tintingStrength}`;
    if (colorCache.has(cacheKey)) {
        return colorCache.get(cacheKey)!;
    }

    const spectral = await getSpectral();
    const color = new spectral.Color(hex);
    color.tintingStrength = tintingStrength;
    colorCache.set(cacheKey, color);
    return color;
}

/**
 * Get cached spectral colors for the entire palette.
 */
export async function getPaletteColors(): Promise<Map<string, SpectralColor>> {
    const paletteColors = new Map<string, SpectralColor>();

    for (const pigment of PALETTE) {
        const color = await getSpectralColor(pigment.hex, pigment.tintingStrength);
        paletteColors.set(pigment.id, color);
    }

    return paletteColors;
}

/**
 * Dynamic pigment registry for catalog paints.
 * Maps pigment ID -> { hex, tintingStrength }
 */
const dynamicPigmentRegistry = new Map<string, { hex: string; tintingStrength: number }>();

/**
 * Register pigments for use in mixing.
 * Call this before mixPigmentsSync to add catalog paints.
 */
export async function registerPigments(
    pigments: Array<{ id: string; hex: string; tintingStrength: number }>
): Promise<void> {
    await isSpectralAvailable(); // Ensure spectral is loaded

    for (const p of pigments) {
        dynamicPigmentRegistry.set(p.id, { hex: p.hex, tintingStrength: p.tintingStrength });
        // Pre-warm color cache
        await getSpectralColor(p.hex, p.tintingStrength);
    }
}

/**
 * Clear dynamic pigment registry.
 */
export function clearDynamicPigments(): void {
    dynamicPigmentRegistry.clear();
}

/**
 * Mix multiple pigments using spectral mixing.
 * 
 * @param inputs Array of pigment IDs with weights
 * @returns Mixed color result
 */
export async function mixPigments(inputs: MixInput[]): Promise<{
    hex: string;
    spectralColor: SpectralColor;
}> {
    const spectral = await getSpectral();
    const paletteColors = await getPaletteColors();

    // Filter out zero weights
    const validInputs = inputs.filter((i) => i.weight > 0);
    if (validInputs.length === 0) {
        throw new Error('At least one input with positive weight required');
    }

    // Build mix arguments: [color, weight] pairs
    const mixArgs: [SpectralColor, number][] = validInputs.map((input) => {
        const color = paletteColors.get(input.pigmentId);
        if (!color) {
            throw new Error(`Unknown pigment ID: ${input.pigmentId}`);
        }
        return [color, input.weight];
    });

    // Perform spectral mix
    const mixed = spectral.mix(...mixArgs);

    return {
        hex: mixed.toString({ format: 'hex' }),
        spectralColor: mixed,
    };
}

/**
 * Calculate perceptual color difference using OKLab Delta E.
 * Lower = more similar. 0 = identical.
 */
export async function deltaEOK(
    color1Hex: string,
    color2Hex: string
): Promise<number> {
    const c1 = await getSpectralColor(color1Hex);
    const c2 = await getSpectralColor(color2Hex);

    // Calculate Euclidean distance in OKLab space
    // OKLab returns [L, a, b] array
    const [L1, a1, b1] = c1.OKLab;
    const [L2, a2, b2] = c2.OKLab;

    const dL = L1 - L2;
    const da = a1 - a2;
    const db = b1 - b2;

    // OKLab deltaE is the Euclidean distance scaled up by 100 for visual units
    return Math.sqrt(dL * dL + da * da + db * db) * 100;
}

/**
 * Calculate deltaE between a spectral color and a target hex.
 */
export async function deltaEFromSpectral(
    spectralColor: SpectralColor,
    targetHex: string
): Promise<number> {
    const target = await getSpectralColor(targetHex);

    // OKLab returns [L, a, b] array
    const [L1, a1, b1] = spectralColor.OKLab;
    const [L2, a2, b2] = target.OKLab;

    const dL = L1 - L2;
    const da = a1 - a2;
    const db = b1 - b2;

    return Math.sqrt(dL * dL + da * da + db * db) * 100;
}

/**
 * Create a spectral color from hex.
 */
export async function createColor(hex: string): Promise<SpectralColor> {
    return getSpectralColor(hex);
}

/**
 * Check if spectral.js is available.
 */
export async function isSpectralAvailable(): Promise<boolean> {
    try {
        await getSpectral();
        return true;
    } catch {
        return false;
    }
}

/**
 * Synchronous helpers for high-performance loops.
 * IMPORTANT: Only call these AFTER ensuring isSpectralAvailable() is true.
 */
export function getSpectralSync(): SpectralModule {
    if (!spectralModule) throw new Error('Spectral.js not loaded. Call isSpectralAvailable() first.');
    return spectralModule;
}

export function getCachedColorSync(hex: string, tintingStrength = 1): SpectralColor {
    const cacheKey = `${hex}-${tintingStrength}`;
    const color = colorCache.get(cacheKey);
    if (!color) throw new Error(`Color ${hex} not in cache. Pre-warm cache with getPaletteColors().`);
    return color;
}

export function mixPigmentsSync(inputs: MixInput[]): { hex: string, spectralColor: SpectralColor } {
    const spectral = getSpectralSync();

    const validInputs = inputs.filter((i) => i.weight > 0);
    if (validInputs.length === 0) throw new Error('At least one input with positive weight required');

    const mixArgs: [SpectralColor, number][] = validInputs.map((input) => {
        // Try dynamic registry first (for catalog paints), then legacy PALETTE_MAP
        let pigmentData = dynamicPigmentRegistry.get(input.pigmentId);
        if (!pigmentData) {
            const legacyPigment = PALETTE_MAP.get(input.pigmentId);
            if (legacyPigment) {
                pigmentData = { hex: legacyPigment.hex, tintingStrength: legacyPigment.tintingStrength };
            }
        }

        if (!pigmentData) {
            throw new Error(`Pigment ${input.pigmentId} not registered. Call registerPigments() first.`);
        }

        const color = colorCache.get(`${pigmentData.hex}-${pigmentData.tintingStrength}`);
        if (!color) {
            throw new Error(`Color for pigment ${input.pigmentId} not in cache.`);
        }
        return [color, input.weight];
    });

    const mixed = spectral.mix(...mixArgs);
    return {
        hex: mixed.toString({ format: 'hex' }),
        spectralColor: mixed,
    };
}

export function deltaESync(c1: SpectralColor, c2: SpectralColor): number {
    const [L1, a1, b1] = c1.OKLab;
    const [L2, a2, b2] = c2.OKLab;
    const dL = L1 - L2;
    const da = a1 - a2;
    const db = b1 - b2;
    return Math.sqrt(dL * dL + da * da + db * db) * 100;
}

/**
 * Get pigment by ID.
 */
export function getPigment(id: string): Pigment | undefined {
    return PALETTE_MAP.get(id);
}

/**
 * Re-export palette for convenience.
 */
export { PALETTE, PALETTE_MAP, CHROMATIC_PIGMENTS, VALUE_ADJUSTERS } from './palette';
