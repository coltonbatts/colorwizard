import {
    converter,
    formatCss,
    interpolate,
    Color,
    Oklch,
    wcagContrast
} from 'culori';

// Converters
const toOklch = converter('oklch');
const toRgb = converter('rgb');

/**
 * Convert any CSS color string or object to a CSS string
 */
export function toCss(color: string | Color): string {
    return formatCss(color) || '#000000';
}

/**
 * Get Painter's Value (0-10 scale)
 * Derived from OKLCH Lightness (0-1)
 */
export function getPainterValue(color: string | Color): number {
    const c = toOklch(color);
    if (!c) return 0;
    // OKLCH L is 0-1 usually. Map to 0-10.
    // Ensure bounds.
    const l = Math.max(0, Math.min(1, c.l ?? 0));
    return Number((l * 10).toFixed(1));
}

/**
 * Get Painter's Chroma (Label + normalized value)
 * OKLCH Chroma ranges roughly 0 to 0.4 for surface colors.
 */
export function getPainterChroma(color: string | Color): { label: string; value: number } {
    const c = toOklch(color);
    if (!c) return { label: 'Unknown', value: 0 };

    const chroma = c.c ?? 0;

    // Categorize
    let label = 'Neutral';
    if (chroma < 0.05) label = 'Neutral';
    else if (chroma < 0.12) label = 'Muted';
    else if (chroma < 0.2) label = 'Moderate';
    else label = 'Vivid';

    return { label, value: chroma };
}

/**
 * Get Complementary Color
 * Rotate Hue by 180 in OKLCH
 */
export function getComplementaryColor(color: string | Color): string {
    return rotateHue(color, 180);
}

/**
 * Rotate Hue
 * @param color Input color
 * @param degrees Degrees to rotate (can be negative)
 */
export function rotateHue(color: string | Color, degrees: number): string {
    const c = toOklch(color);
    if (!c) return '#000000';

    let newHue = (c.h ?? 0) + degrees;
    // Normalize to 0-360 not strictly needed for culori but good for sanity
    // newHue = newHue % 360; 
    // if (newHue < 0) newHue += 360;

    return formatCss({ ...c, h: newHue }) || '#000000';
}

/**
 * Adjust Chroma (Saturation)
 * @param color Input color
 * @param factor 0 to 2 (1 = no change, 0 = grayscale, 2 = double saturation)
 */
export function adjustChroma(color: string | Color, factor: number): string {
    const c = toOklch(color);
    if (!c) return '#000000';

    // Chroma can go up indefinitely but usually < 0.4.
    // We just multiply existing chroma.
    const newChroma = (c.c ?? 0) * factor;

    return formatCss({ ...c, c: newChroma }) || '#000000';
}

/**
 * Mix two colors
 * @param color1 Base color
 * @param color2 Mix color
 * @param ratio 0 to 1 (amount of color2)
 */
export function mixColors(color1: string | Color, color2: string | Color, ratio: number): string {
    const mix = interpolate([color1, color2], 'oklch');
    return formatCss(mix(ratio)) || '#000000';
}

/**
 * Get text color (black/white) for best contrast against bg
 */
export function getContrastColor(bgColor: string | Color): string {
    const white = '#ffffff';
    const black = '#000000';
    const contrastWhite = wcagContrast(bgColor, white);
    const contrastBlack = wcagContrast(bgColor, black);
    return contrastWhite > contrastBlack ? white : black;
}
