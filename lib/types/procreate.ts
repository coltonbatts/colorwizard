/**
 * TypeScript types for Procreate .swatches file format
 */

/**
 * Input color format - flexible to accept from various sources
 */
export interface ProcreateColor {
    /** HEX color code (e.g., '#FF5733') */
    hex?: string;
    /** Optional color name */
    name?: string;
    /** RGB values as array [r, g, b] where each is 0-255 */
    rgb?: [number, number, number];
}

/**
 * Procreate swatch format (HSB color space)
 * All values are normalized to 0-1 range
 */
export interface ProcreateSwatch {
    /** Hue: 0-1 (0=red, 0.33=green, 0.66=blue) */
    hue: number;
    /** Saturation: 0-1 (0=gray, 1=full color) */
    saturation: number;
    /** Brightness/Value: 0-1 (0=black, 1=full brightness) */
    brightness: number;
    /** Alpha/Opacity: always 1 for opaque */
    alpha: number;
    /** Color space: always 0 for HSB */
    colorSpace: number;
}

/**
 * Complete Procreate .swatches file structure
 */
export interface ProcreateSwatchesFile {
    /** Palette name (shown in Procreate) */
    name: string;
    /** Array of swatches (max 30, pad with null if fewer) */
    swatches: (ProcreateSwatch | null)[];
}

/**
 * Export options
 */
export interface ProcreateExportOptions {
    /** Palette name (defaults to "ColorWizard Palette") */
    paletteName?: string;
    /** Sort colors by value/brightness (Pro feature) */
    sortByValue?: boolean;
    /** Maximum colors allowed (enforced by tier) */
    maxColors?: number;
}
