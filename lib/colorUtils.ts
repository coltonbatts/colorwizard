/**
 * Color utility functions for Perceptual Color Matching.
 * Abstractions over 'culori' for consistent usage across the app.
 */
import {
  converter,
  differenceCiede2000,
  Color,
  Lab,
  Rgb,
  Oklch
} from 'culori';
import { RGB, HSL } from './color/types';
import { hexToRgb as canonicalHexToRgb, rgbToHsl as canonicalRgbToHsl } from './color/conversions';

const toLab = converter('lab');

// Difference function factory
const ciede2000 = differenceCiede2000();

export type { Lab, Rgb, Oklch };

/**
 * Calculates the Delta E (CIEDE2000) distance between two colors.
 * This represents perceptual color difference.
 * 
 * Thresholds (approx):
 * <= 1.0: Not perceptible by human eyes.
 * 1 - 2: Perceptible through close observation.
 * 2 - 10: Perceptible at a glance.
 * 11 - 49: Colors are more similar than opposite.
 * 100: Colors are exact opposite.
 */
export function deltaE(color1: string | Color, color2: string | Color): number {
  // culori handles parsing strings -> objects internal to the difference function usually,
  // but to be safe we can ensure they are objects or let culori handle it.
  // The difference function returned by factory takes (color1, color2).
  return ciede2000(color1, color2);
}

/**
 * Converts Hex string (or any color) to RGB object {r, g, b} normalized 0-255
 */
export function hexToRgb(hex: string): RGB | null {
  return canonicalHexToRgb(hex);
}

/**
 * Converts RGB (0-255) to Lab color space.
 * returns Culori Lab object { mode: 'lab', l, a, b }
 */
export function rgbToLab(r: number, g: number, b: number): Lab {
  return toLab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 });
}

/**
 * Converts RGB (0-255) to HSL color space.
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns HSL object with h (0-360), s (0-100), l (0-100)
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  return canonicalRgbToHsl(r, g, b);
}

/**
 * Helper to get a strict match confidence label
 */
export function getMatchConfidence(dE: number): { label: string; color: string; bgColor: string } {
  if (dE < 1.0) return { label: 'Exact Match', color: 'text-green-500', bgColor: 'bg-green-500' };
  if (dE < 2.5) return { label: 'Very Close', color: 'text-emerald-400', bgColor: 'bg-emerald-400' };
  if (dE < 5.0) return { label: 'Close', color: 'text-blue-400', bgColor: 'bg-blue-400' };
  if (dE < 10.0) return { label: 'Similar', color: 'text-yellow-400', bgColor: 'bg-yellow-400' };
  return { label: 'Distant', color: 'text-gray-400', bgColor: 'bg-gray-400' };
}
