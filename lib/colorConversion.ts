/**
 * Color space conversion utilities for Procreate export
 * Pure JavaScript implementation - no external dependencies
 */

/**
 * Convert RGB (0-255) to HSB/HSV (0-1 range)
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns {h, s, b} where all values are 0-1
 */
export function rgbToHsb(r: number, g: number, b: number): { h: number; s: number; b: number } {
    // Normalize RGB to 0-1
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    // Brightness is the max value
    const brightness = max;

    // Saturation
    const saturation = max === 0 ? 0 : delta / max;

    // Hue
    let hue = 0;
    if (delta !== 0) {
        if (max === rNorm) {
            hue = ((gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)) / 6;
        } else if (max === gNorm) {
            hue = ((bNorm - rNorm) / delta + 2) / 6;
        } else {
            hue = ((rNorm - gNorm) / delta + 4) / 6;
        }
    }

    return {
        h: hue,
        s: saturation,
        b: brightness,
    };
}

/**
 * Convert HEX to HSB
 * @param hex HEX color string (e.g., '#FF5733' or 'FF5733')
 * @returns {h, s, b} where all values are 0-1
 */
export function hexToHsb(hex: string): { h: number; s: number; b: number } {
    // Remove # if present
    const cleanHex = hex.replace(/^#/, '');

    // Parse RGB values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return rgbToHsb(r, g, b);
}

/**
 * Validate and normalize HEX color
 * @param hex HEX color string
 * @returns Normalized HEX string with # prefix, or null if invalid
 */
export function validateHex(hex: string): string | null {
    const cleanHex = hex.replace(/^#/, '');

    // Check if valid hex (3 or 6 characters)
    if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex) && !/^[0-9A-Fa-f]{3}$/.test(cleanHex)) {
        return null;
    }

    // Expand 3-char hex to 6-char
    if (cleanHex.length === 3) {
        return `#${cleanHex[0]}${cleanHex[0]}${cleanHex[1]}${cleanHex[1]}${cleanHex[2]}${cleanHex[2]}`;
    }

    return `#${cleanHex}`;
}

/**
 * Validate RGB values
 * @param r Red (0-255)
 * @param g Green (0-255)
 * @param b Blue (0-255)
 * @returns true if valid
 */
export function validateRgb(r: number, g: number, b: number): boolean {
    return (
        Number.isInteger(r) && r >= 0 && r <= 255 &&
        Number.isInteger(g) && g >= 0 && g <= 255 &&
        Number.isInteger(b) && b >= 0 && b <= 255
    );
}

/**
 * Convert HEX to RGB
 * @param hex HEX color string
 * @returns [r, g, b] array or null if invalid
 */
export function hexToRgb(hex: string): [number, number, number] | null {
    const validHex = validateHex(hex);
    if (!validHex) return null;

    const cleanHex = validHex.replace(/^#/, '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return [r, g, b];
}
