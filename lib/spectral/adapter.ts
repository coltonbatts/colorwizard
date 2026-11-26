/**
 * Spectral.js adapter module.
 * Provides caching and a clean API for paint mixing operations.
 */
import { Pigment, MixInput } from './types';
import { PALETTE, PALETTE_MAP } from './palette';
import type { Color as SpectralColor } from 'spectral.js';

type SpectralModule = typeof import('spectral.js');

// Cached spectral module and colors.
// Palette and dynamically registered pigments live in permanent maps so they are
// never evicted; arbitrary sampled hexes live in a bounded LRU map.
let spectralModule: SpectralModule | null = null;
let spectralError: Error | null = null;
export const MAX_TRANSIENT_COLOR_CACHE_SIZE = 500;
const paletteColorCache = new Map<string, SpectralColor>();
const dynamicColorCache = new Map<string, SpectralColor>();
const transientColorCache = new Map<string, SpectralColor>();

function colorCacheKey(hex: string, tintingStrength: number): string {
    return `${hex}-${tintingStrength}`;
}

function lookupColorCache(cacheKey: string): SpectralColor | undefined {
    const paletteHit = paletteColorCache.get(cacheKey);
    if (paletteHit) return paletteHit;

    const dynamicHit = dynamicColorCache.get(cacheKey);
    if (dynamicHit) return dynamicHit;

    const transientHit = transientColorCache.get(cacheKey);
    if (transientHit) {
        // Refresh LRU order on read.
        transientColorCache.delete(cacheKey);
        transientColorCache.set(cacheKey, transientHit);
        return transientHit;
    }

    return undefined;
}

function setTransientColor(cacheKey: string, color: SpectralColor): void {
    if (paletteColorCache.has(cacheKey) || dynamicColorCache.has(cacheKey)) {
        return;
    }

    if (transientColorCache.has(cacheKey)) {
        transientColorCache.delete(cacheKey);
    } else if (transientColorCache.size >= MAX_TRANSIENT_COLOR_CACHE_SIZE) {
        const oldestKey = transientColorCache.keys().next().value;
        if (oldestKey !== undefined) {
            transientColorCache.delete(oldestKey);
        }
    }

    transientColorCache.set(cacheKey, color);
}

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

async function getOrCreatePermanentColor(
    target: Map<string, SpectralColor>,
    hex: string,
    tintingStrength: number
): Promise<SpectralColor> {
    const cacheKey = colorCacheKey(hex, tintingStrength);
    const existing = target.get(cacheKey);
    if (existing) return existing;

    const cached = lookupColorCache(cacheKey);
    if (cached) {
        target.set(cacheKey, cached);
        transientColorCache.delete(cacheKey);
        return cached;
    }

    const spectral = await getSpectral();
    const color = new spectral.Color(hex);
    color.tintingStrength = tintingStrength;
    target.set(cacheKey, color);
    return color;
}

/**
 * Get or create a cached spectral Color for a hex value.
 */
async function getSpectralColor(hex: string, tintingStrength = 1): Promise<SpectralColor> {
    const cacheKey = colorCacheKey(hex, tintingStrength);
    const cached = lookupColorCache(cacheKey);
    if (cached) {
        return cached;
    }

    const spectral = await getSpectral();
    const color = new spectral.Color(hex);
    color.tintingStrength = tintingStrength;
    setTransientColor(cacheKey, color);
    return color;
}

/**
 * Get cached spectral colors for the entire palette.
 */
export async function getPaletteColors(): Promise<Map<string, SpectralColor>> {
    const paletteColors = new Map<string, SpectralColor>();

    for (const pigment of PALETTE) {
        const color = await getOrCreatePermanentColor(
            paletteColorCache,
            pigment.hex,
            pigment.tintingStrength
        );
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
        // Pre-warm permanent dynamic pigment cache so transient evictions never drop it.
        await getOrCreatePermanentColor(dynamicColorCache, p.hex, p.tintingStrength);
    }
}

/**
 * Clear dynamic pigment registry.
 */
export function clearDynamicPigments(): void {
    dynamicPigmentRegistry.clear();
    dynamicColorCache.clear();
}

/**
 * Clear transient sampled color entries while keeping permanent pigment caches intact.
 */
export function clearTransientColorCache(): void {
    transientColorCache.clear();
}

/**
 * Cache diagnostics for testing and memory checks.
 */
export function getColorCacheStats(): {
    palette: number;
    dynamic: number;
    transient: number;
    maxTransient: number;
} {
    return {
        palette: paletteColorCache.size,
        dynamic: dynamicColorCache.size,
        transient: transientColorCache.size,
        maxTransient: MAX_TRANSIENT_COLOR_CACHE_SIZE,
    };
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
    const cacheKey = colorCacheKey(hex, tintingStrength);
    const color = lookupColorCache(cacheKey);
    if (!color) throw new Error(`Color ${hex} not in cache. Pre-warm cache with getPaletteColors().`);
    return color;
}

/**
 * Resolve a registered pigment (dynamic registry first, then the legacy PALETTE) to its cached Color.
 */
export function getPigmentColorSync(pigmentId: string): SpectralColor {
    // Try dynamic registry first (for catalog paints), then legacy PALETTE_MAP
    let pigmentData = dynamicPigmentRegistry.get(pigmentId);
    if (!pigmentData) {
        const legacyPigment = PALETTE_MAP.get(pigmentId);
        if (legacyPigment) {
            pigmentData = { hex: legacyPigment.hex, tintingStrength: legacyPigment.tintingStrength };
        }
    }

    if (!pigmentData) {
        throw new Error(`Pigment ${pigmentId} not registered. Call registerPigments() first.`);
    }

    const color = lookupColorCache(colorCacheKey(pigmentData.hex, pigmentData.tintingStrength));
    if (!color) {
        throw new Error(`Color for pigment ${pigmentId} not in cache.`);
    }
    return color;
}

export function mixPigmentsSync(inputs: MixInput[]): { hex: string, spectralColor: SpectralColor } {
    const spectral = getSpectralSync();

    const validInputs = inputs.filter((i) => i.weight > 0);
    if (validInputs.length === 0) throw new Error('At least one input with positive weight required');

    const mixArgs: [SpectralColor, number][] = validInputs.map((input) => [getPigmentColorSync(input.pigmentId), input.weight]);

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
