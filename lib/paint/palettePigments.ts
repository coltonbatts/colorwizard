/**
 * Turns a user's palette (library colors plus their own tubes) into the
 * pigments the solver mixes.
 *
 * Library colors take their hex and tinting strength from spectral/palette.ts.
 * A custom tube carries its own; the strength is relative to titanium white
 * (1.0) in spectral.js's units, and is not validated against real paint, so it
 * is the user's estimate. Default 1 is a neutral guess.
 */
import type { PaletteColor } from '../types/palette';
import { PALETTE_MAP } from '../spectral/palette';
import type { Pigment } from '../spectral/types';

export const CUSTOM_TUBE_PREFIX = 'custom-';
export const MIN_TINTING_STRENGTH = 0.1;
export const MAX_TINTING_STRENGTH = 20;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function isCustomTube(color: PaletteColor): boolean {
    return color.id.startsWith(CUSTOM_TUBE_PREFIX);
}

function clampStrength(value: number | undefined): number {
    if (value === undefined || !Number.isFinite(value)) return 1;
    return Math.min(MAX_TINTING_STRENGTH, Math.max(MIN_TINTING_STRENGTH, value));
}

/** Build a palette entry for a tube the user typed in, or null if the hex is invalid. */
export function makeCustomTube(name: string, hex: string, tintingStrength?: number): PaletteColor | null {
    const trimmed = name.trim();
    if (!trimmed || !HEX.test(hex)) return null;
    const normalized = hex.toUpperCase();
    return {
        id: `${CUSTOM_TUBE_PREFIX}${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${normalized.slice(1).toLowerCase()}`,
        displayName: trimmed,
        hex: normalized,
        tintingStrength: clampStrength(tintingStrength),
    };
}

/** Resolve palette entries to pigments; entries that match neither the library nor a valid custom tube are dropped. */
export function resolvePalettePigments(colors: PaletteColor[]): Pigment[] {
    const seen = new Set<string>();
    const out: Pigment[] = [];
    for (const color of colors) {
        if (seen.has(color.id)) continue;
        const library = PALETTE_MAP.get(color.id);
        if (library) {
            out.push(library);
        } else if (isCustomTube(color) && color.hex && HEX.test(color.hex)) {
            out.push({
                id: color.id,
                name: color.displayName,
                hex: color.hex.toUpperCase(),
                tintingStrength: clampStrength(color.tintingStrength),
                isValueAdjuster: /\b(white|black)\b/i.test(color.displayName),
            });
        } else {
            continue;
        }
        seen.add(color.id);
    }
    return out;
}

/**
 * Solver options for an active palette. The default palette returns undefined
 * (the Core 6). A palette with none of the user's own tubes keeps the plain
 * id-filter mode; one with custom tubes passes resolved pigments.
 */
export function getPaletteSolveOptions(palette: { isDefault: boolean; colors: PaletteColor[] } | undefined) {
    if (!palette || palette.isDefault) return undefined;
    if (palette.colors.some(isCustomTube)) return { pigments: resolvePalettePigments(palette.colors) };
    return { paletteColorIds: palette.colors.map((color) => color.id) };
}
