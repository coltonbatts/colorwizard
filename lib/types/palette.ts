/**
 * Types and constants for custom paint palette management.
 */

/**
 * A color in a user's palette, referencing existing pigments from the spectral palette.
 */
export interface PaletteColor {
    /** Matches Pigment.id from spectral/palette.ts (e.g., 'titanium-white') */
    id: string;
    /** Display name (e.g., 'Titanium White') */
    displayName: string;
}

/**
 * A complete user-defined palette.
 */
export interface Palette {
    /** Unique identifier */
    id: string;
    /** User-defined palette name */
    name: string;
    /** Colors included in this palette */
    colors: PaletteColor[];
    /** Whether this palette is currently active */
    isActive: boolean;
    /** Default palette cannot be deleted */
    isDefault: boolean;
    /** Creation timestamp (Unix ms) */
    createdAt: number;
}

/**
 * All available colors that can be added to a palette.
 * Maps to the 6-paint limited palette from spectral/palette.ts
 */
export const ALL_PALETTE_COLORS: PaletteColor[] = [
    { id: 'titanium-white', displayName: 'Titanium White' },
    { id: 'ivory-black', displayName: 'Ivory Black' },
    { id: 'yellow-ochre', displayName: 'Yellow Ochre' },
    { id: 'cadmium-red', displayName: 'Cadmium Red' },
    { id: 'phthalo-green', displayName: 'Phthalo Green' },
    { id: 'phthalo-blue', displayName: 'Phthalo Blue' },
];

/**
 * Default palette containing all 6 colors.
 * This palette is non-deletable and always available.
 */
export const DEFAULT_PALETTE: Palette = {
    id: 'default',
    name: 'Full Palette',
    colors: [...ALL_PALETTE_COLORS],
    isActive: true,
    isDefault: true,
    createdAt: 0,
};

/**
 * Generate a unique ID for new palettes.
 */
export function generatePaletteId(): string {
    return `palette-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
