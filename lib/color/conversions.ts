/**
 * Canonical Color Conversions
 * consolidated to prevent logic drift across the application.
 */

import { converter, formatHex, Color } from 'culori';
import { RGB, HSL } from './types';

const toRgb = converter('rgb');
const toHsl = converter('hsl');

/**
 * Converts any color format to RGB (0-255)
 */
export function colorsToRgb(color: string | Color): RGB | null {
    const rgb = toRgb(color);
    if (!rgb) return null;
    return {
        r: Math.round(rgb.r * 255),
        g: Math.round(rgb.g * 255),
        b: Math.round(rgb.b * 255)
    };
}

/**
 * Converts RGB (0-255) to Hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return formatHex({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 }) || '#000000';
}

/**
 * Converts RGB (0-255) to HSL (0-360, 0-100, 0-100)
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
    const hsl = toHsl({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
    return {
        h: Math.round((hsl?.h ?? 0)),
        s: Math.round((hsl?.s ?? 0) * 100),
        l: Math.round((hsl?.l ?? 0) * 100)
    };
}

/**
 * Converts Hex string to RGB (0-255)
 */
export function hexToRgb(hex: string): RGB | null {
    return colorsToRgb(hex);
}

/**
 * Safe conversion from any color to HSL
 */
export function colorToHsl(color: string | Color): HSL {
    const hsl = toHsl(color);
    return {
        h: Math.round(hsl?.h ?? 0),
        s: Math.round((hsl?.s ?? 0) * 100),
        l: Math.round((hsl?.l ?? 0) * 100)
    };
}
