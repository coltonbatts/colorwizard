import { wcagContrast } from 'culori';

/**
 * Calculates the WCAG contrast ratio between two colors.
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(color1: string, color2: string): number {
    return wcagContrast(color1, color2);
}

/**
 * Determines whether the contrast ratio meets WCAG AA standards (4.5:1 for normal text).
 */
export function isContrastAA(ratio: number): boolean {
    return ratio >= 4.5;
}

/**
 * Determines whether the contrast ratio meets WCAG AAA standards (7:1 for normal text).
 */
export function isContrastAAA(ratio: number): boolean {
    return ratio >= 7;
}

/**
 * Returns the best contrast color (Black or White) for a given background color.
 */
export function getBestContrast(backgroundColor: string): 'white' | 'black' {
    const whiteContrast = getContrastRatio(backgroundColor, 'white');
    const blackContrast = getContrastRatio(backgroundColor, 'black');
    return whiteContrast > blackContrast ? 'white' : 'black';
}
