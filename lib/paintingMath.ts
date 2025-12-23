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
 * Converts sRGB value to linear RGB.
 */
export function sRGBToLinear(v: number): number {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Get Relative Luminance (Y) from RGB.
 * Y = 0.2126R + 0.7152G + 0.0722B
 * Returns 0-100.
 */
export function getLuminance(r: number, g: number, b: number): number {
    const rl = sRGBToLinear(r);
    const gl = sRGBToLinear(g);
    const bl = sRGBToLinear(b);
    const y = 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
    return Math.round(y * 100);
}

/**
 * Get Value Band label from ValuePercent (0-100)
 */
export function getValueBand(value: number): string {
    if (value <= 10) return 'Near black';
    if (value <= 20) return 'Deep shadow';
    if (value <= 30) return 'Shadow';
    if (value <= 40) return 'Dark half tone';
    if (value <= 50) return 'Half tone';
    if (value <= 60) return 'Light half tone';
    if (value <= 70) return 'Light';
    if (value <= 80) return 'Highlight';
    if (value <= 90) return 'Hot highlight';
    return 'Near white';
}

/**
 * Get Painter's Value (0-10 scale)
 * Derived from Relative Luminance Y.
 */
export function getPainterValue(color: string | Color): number {
    const c = toRgb(color);
    if (!c) return 0;

    const r = Math.round((c.r ?? 0) * 255);
    const g = Math.round((c.g ?? 0) * 255);
    const b = Math.round((c.b ?? 0) * 255);

    const y = getLuminance(r, g, b); // 0-100
    return Math.min(10, Math.max(0, Math.round(y / 10)));
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
