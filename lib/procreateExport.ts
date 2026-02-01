/**
 * Procreate .swatches file export utilities
 * Generates Procreate-compatible palette files for iPad import
 */

import JSZip from 'jszip';
import { hexToHsb, hexToRgb, rgbToHsb, validateHex, validateRgb } from './colorConversion';
import type { ProcreateColor, ProcreateSwatch, ProcreateSwatchesFile, ProcreateExportOptions } from './types/procreate';

/**
 * Maximum colors supported by Procreate per palette
 */
export const MAX_PROCREATE_COLORS = 30;

/**
 * Default palette name
 */
export const DEFAULT_PALETTE_NAME = 'ColorWizard Palette';

/**
 * Convert a ProcreateColor to ProcreateSwatch format
 * @param color Input color (hex, rgb, or both)
 * @returns ProcreateSwatch or null if invalid
 */
function colorToSwatch(color: ProcreateColor): ProcreateSwatch | null {
    let hsb: { h: number; s: number; b: number } | null = null;

    // Try HEX first
    if (color.hex) {
        const validHex = validateHex(color.hex);
        if (validHex) {
            hsb = hexToHsb(validHex);
        }
    }

    // Fall back to RGB if HEX failed or not provided
    if (!hsb && color.rgb) {
        const [r, g, b] = color.rgb;
        if (validateRgb(r, g, b)) {
            hsb = rgbToHsb(r, g, b);
        }
    }

    if (!hsb) {
        console.warn('Invalid color format:', color);
        return null;
    }

    return {
        hue: hsb.h,
        saturation: hsb.s,
        brightness: hsb.b,
        alpha: 1, // Always opaque
        colorSpace: 0, // 0 = HSB
    };
}

/**
 * Generate Procreate swatches JSON structure
 * @param colors Array of colors to export
 * @param options Export options
 * @returns ProcreateSwatchesFile object
 */
export function generateSwatchesJson(
    colors: ProcreateColor[],
    options: ProcreateExportOptions = {}
): ProcreateSwatchesFile {
    const {
        paletteName = DEFAULT_PALETTE_NAME,
        sortByValue = false,
        maxColors = MAX_PROCREATE_COLORS,
    } = options;

    // Limit colors to max allowed
    const limitedColors = colors.slice(0, Math.min(colors.length, maxColors));

    // Convert to swatches
    const swatches = limitedColors
        .map(colorToSwatch)
        .filter((swatch): swatch is ProcreateSwatch => swatch !== null);

    // Sort by brightness/value if requested (Pro feature)
    if (sortByValue) {
        swatches.sort((a, b) => b.brightness - a.brightness);
    }

    // Pad with null to reach 30 swatches (Procreate expects this)
    while (swatches.length < MAX_PROCREATE_COLORS) {
        swatches.push(null as any); // Procreate uses null for empty slots
    }

    return {
        name: paletteName,
        swatches,
    };
}

/**
 * Create a .swatches file (ZIP containing Swatches.json)
 * @param colors Array of colors to export
 * @param options Export options
 * @returns Promise<Blob> ZIP file blob
 */
export async function createSwatchesFile(
    colors: ProcreateColor[],
    options: ProcreateExportOptions = {}
): Promise<Blob> {
    // Generate JSON structure
    const swatchesData = generateSwatchesJson(colors, options);

    // Create ZIP archive
    const zip = new JSZip();
    zip.file('Swatches.json', JSON.stringify(swatchesData, null, 2));

    // Generate blob
    const blob = await zip.generateAsync({ type: 'blob' });
    return blob;
}

/**
 * Trigger browser download of .swatches file
 * @param blob ZIP blob to download
 * @param filename Filename (without extension)
 */
export function downloadSwatchesFile(blob: Blob, filename: string): void {
    // Sanitize filename
    const safeName = filename
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        || 'palette';

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.swatches`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * All-in-one export function
 * @param colors Array of colors to export
 * @param options Export options
 * @returns Promise<void>
 */
export async function exportToProcreate(
    colors: ProcreateColor[],
    options: ProcreateExportOptions = {}
): Promise<void> {
    if (colors.length === 0) {
        throw new Error('No colors to export');
    }

    const blob = await createSwatchesFile(colors, options);
    const filename = options.paletteName || DEFAULT_PALETTE_NAME;
    downloadSwatchesFile(blob, filename);
}

// FUTURE ROADMAP:
// - Batch export: Export multiple palettes as separate .swatches files
// - Recipe metadata: Embed paint mixing notes in swatch metadata (if Procreate supports)
// - Custom libraries: Allow users to save/load palette presets
// - Watercolor/acrylic palettes: Extend to other paint types beyond oil
