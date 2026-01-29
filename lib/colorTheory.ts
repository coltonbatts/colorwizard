'use client'

/**
 * Color Theory Utilities
 * 12-segment RYB color wheel with harmonies and analysis
 */

import { RGB, HSL } from './color/types';
import { rgbToHsl as colorTheoryRgbToHsl, rgbToHex as canonicalRgbToHex } from './color/conversions';

// Export types for use in other modules
export type { RGB } from './color/types'

// Re-export commonly used functions
export const rgbToHsl = colorTheoryRgbToHsl

// The 12 segments of the traditional artist's color wheel (RYB system)
export const COLOR_WHEEL_SEGMENTS = [
    { name: 'Red', type: 'primary', hue: 0, color: '#FF0000' },
    { name: 'Red-Orange', type: 'tertiary', hue: 30, color: '#FF4500' },
    { name: 'Orange', type: 'secondary', hue: 30, color: '#FF8000' },
    { name: 'Yellow-Orange', type: 'tertiary', hue: 45, color: '#FFB300' },
    { name: 'Yellow', type: 'primary', hue: 60, color: '#FFFF00' },
    { name: 'Yellow-Green', type: 'tertiary', hue: 90, color: '#9ACD32' },
    { name: 'Green', type: 'secondary', hue: 120, color: '#00FF00' },
    { name: 'Blue-Green', type: 'tertiary', hue: 160, color: '#00CED1' },
    { name: 'Blue', type: 'primary', hue: 210, color: '#0000FF' },
    { name: 'Blue-Violet', type: 'tertiary', hue: 260, color: '#8A2BE2' },
    { name: 'Violet', type: 'secondary', hue: 280, color: '#9400D3' },
    { name: 'Red-Violet', type: 'tertiary', hue: 320, color: '#C71585' },
] as const

export type ColorWheelSegment = typeof COLOR_WHEEL_SEGMENTS[number]

/**
 * Convert RGB to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return canonicalRgbToHex(r, g, b);
}

/**
 * Map HSL hue to RYB color wheel position
 * RYB wheel has different distribution than HSL
 */
function hslHueToRybPosition(hslHue: number): number {
    // HSL to RYB conversion (approximate mapping)
    // Red: 0° HSL -> 0° RYB
    // Yellow: 60° HSL -> 120° RYB (120° on 12-segment = position 4)
    // Blue: 240° HSL -> 240° RYB (240° on 12-segment = position 8)

    // Simplified mapping for 12-segment wheel
    const hue = ((hslHue % 360) + 360) % 360

    // Map HSL hue ranges to wheel segment indices (0-11)
    if (hue < 15) return 0      // Red
    if (hue < 35) return 1      // Red-Orange
    if (hue < 50) return 2      // Orange
    if (hue < 60) return 3      // Yellow-Orange
    if (hue < 80) return 4      // Yellow
    if (hue < 100) return 5     // Yellow-Green
    if (hue < 160) return 6     // Green
    if (hue < 200) return 7     // Blue-Green
    if (hue < 250) return 8     // Blue
    if (hue < 280) return 9     // Blue-Violet
    if (hue < 320) return 10    // Violet
    if (hue < 350) return 11    // Red-Violet
    return 0                     // Red (wraps around)
}

/**
 * Find the closest color wheel segment for a given RGB color
 */
export function findClosestSegment(rgb: RGB): ColorWheelSegment {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const index = hslHueToRybPosition(hsl.h)
    return COLOR_WHEEL_SEGMENTS[index]
}

/**
 * Get the segment index for a color
 */
export function getSegmentIndex(rgb: RGB): number {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    return hslHueToRybPosition(hsl.h)
}

/**
 * Determine if a color is warm or cool
 */
export function getColorTemperature(rgb: RGB): 'warm' | 'cool' | 'neutral' {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const segmentIndex = hslHueToRybPosition(hsl.h)

    // Low saturation colors are neutral
    if (hsl.s < 15) return 'neutral'

    // Warm colors: Red through Yellow-Green (indices 0-5)
    // Cool colors: Green through Red-Violet (indices 6-11)
    if (segmentIndex <= 5) return 'warm'
    return 'cool'
}

/**
 * Get complementary color (opposite on the wheel)
 */
export function getComplementary(rgb: RGB): ColorWheelSegment {
    const index = getSegmentIndex(rgb)
    const complementaryIndex = (index + 6) % 12
    return COLOR_WHEEL_SEGMENTS[complementaryIndex]
}

/**
 * Get analogous colors (adjacent on the wheel)
 */
export function getAnalogous(rgb: RGB): [ColorWheelSegment, ColorWheelSegment] {
    const index = getSegmentIndex(rgb)
    const left = (index - 1 + 12) % 12
    const right = (index + 1) % 12
    return [COLOR_WHEEL_SEGMENTS[left], COLOR_WHEEL_SEGMENTS[right]]
}

/**
 * Get triadic colors (evenly spaced by 120°)
 */
export function getTriadic(rgb: RGB): [ColorWheelSegment, ColorWheelSegment] {
    const index = getSegmentIndex(rgb)
    const first = (index + 4) % 12
    const second = (index + 8) % 12
    return [COLOR_WHEEL_SEGMENTS[first], COLOR_WHEEL_SEGMENTS[second]]
}

/**
 * Get split-complementary colors
 */
export function getSplitComplementary(rgb: RGB): [ColorWheelSegment, ColorWheelSegment] {
    const index = getSegmentIndex(rgb)
    const first = (index + 5) % 12
    const second = (index + 7) % 12
    return [COLOR_WHEEL_SEGMENTS[first], COLOR_WHEEL_SEGMENTS[second]]
}

/**
 * Get all color harmonies for a given color
 */
export function getColorHarmonies(rgb: RGB) {
    return {
        base: findClosestSegment(rgb),
        complementary: getComplementary(rgb),
        analogous: getAnalogous(rgb),
        triadic: getTriadic(rgb),
        splitComplementary: getSplitComplementary(rgb),
        temperature: getColorTemperature(rgb),
    }
}

// ============================================
// Saturation & Value Analysis for Oil Painters
// ============================================

export type ChromaLevel = 'pure' | 'vibrant' | 'moderate' | 'muted' | 'gray'
export type ValueLevel = 'white' | 'highlight' | 'light' | 'midtone' | 'shadow' | 'dark' | 'near-black'
export type TintShadeType = 'tint' | 'shade' | 'tone' | 'pure' | 'neutral'

/**
 * Get the chroma/saturation level with painter-friendly descriptions
 */
export function getChromaLevel(rgb: RGB): { level: ChromaLevel; percentage: number; description: string } {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const s = hsl.s

    if (s >= 85) {
        return { level: 'pure', percentage: s, description: 'Nearly pure pigment - maximum intensity' }
    } else if (s >= 65) {
        return { level: 'vibrant', percentage: s, description: 'High chroma - very little gray mixed in' }
    } else if (s >= 40) {
        return { level: 'moderate', percentage: s, description: 'Natural chroma - balanced saturation' }
    } else if (s >= 15) {
        return { level: 'muted', percentage: s, description: 'Low chroma - significant gray influence' }
    } else {
        return { level: 'gray', percentage: s, description: 'Nearly neutral - approaching achromatic' }
    }
}

/**
 * Get the value/lightness level with painter-friendly descriptions
 */
export function getValueLevel(rgb: RGB): { level: ValueLevel; percentage: number; description: string } {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const l = hsl.l

    if (l >= 95) {
        return { level: 'white', percentage: l, description: 'Near white - mostly Titanium White' }
    } else if (l >= 80) {
        return { level: 'highlight', percentage: l, description: 'Very light - strong white influence' }
    } else if (l >= 65) {
        return { level: 'light', percentage: l, description: 'Light value - moderate white added' }
    } else if (l >= 40) {
        return { level: 'midtone', percentage: l, description: 'Middle value - balanced light and dark' }
    } else if (l >= 25) {
        return { level: 'shadow', percentage: l, description: 'Dark value - some dark influence' }
    } else if (l >= 10) {
        return { level: 'dark', percentage: l, description: 'Very dark - strong black/complement' }
    } else {
        return { level: 'near-black', percentage: l, description: 'Near black - mostly dark pigments' }
    }
}

/**
 * Determine if a color is a tint, shade, tone, or pure hue
 */
export function getTintShadeAnalysis(rgb: RGB): {
    type: TintShadeType
    description: string
    whiteInfluence: number
    blackInfluence: number
    grayInfluence: number
} {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const { s, l } = hsl

    // Calculate influences (0-100 scale)
    const whiteInfluence = Math.max(0, (l - 50) * 2) // How much above midtone
    const blackInfluence = Math.max(0, (50 - l) * 2) // How much below midtone
    const grayInfluence = 100 - s // Inverse of saturation

    // Neutral grays
    if (s < 10) {
        return {
            type: 'neutral',
            description: 'Neutral gray - achromatic',
            whiteInfluence,
            blackInfluence,
            grayInfluence,
        }
    }

    // Pure hue - high saturation, near 50% lightness
    if (s >= 70 && l >= 40 && l <= 60) {
        return {
            type: 'pure',
            description: 'Near pure hue - maximum chroma at this value',
            whiteInfluence,
            blackInfluence,
            grayInfluence,
        }
    }

    // Tint - lightened with white
    if (l > 55 && s >= 20) {
        return {
            type: 'tint',
            description: `Tint - pure hue + white (${Math.round(whiteInfluence)}% white influence)`,
            whiteInfluence,
            blackInfluence,
            grayInfluence,
        }
    }

    // Shade - darkened with black
    if (l < 45 && s >= 20) {
        return {
            type: 'shade',
            description: `Shade - pure hue + dark (${Math.round(blackInfluence)}% dark influence)`,
            whiteInfluence,
            blackInfluence,
            grayInfluence,
        }
    }

    // Tone - mixed with gray (desaturated midtone)
    return {
        type: 'tone',
        description: `Tone - pure hue + gray (${Math.round(grayInfluence)}% gray influence)`,
        whiteInfluence,
        blackInfluence,
        grayInfluence,
    }
}

/**
 * Get practical paint mixing guidance based on saturation and value
 */
export function getMixingGuidance(rgb: RGB): {
    toLighten: string
    toDarken: string
    toDesaturate: string
    toSaturate: string
    generalTip: string
} {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
    const segment = findClosestSegment(rgb)
    const complement = getComplementary(rgb)
    const temperature = getColorTemperature(rgb)

    // Context-aware lightening advice
    let toLighten = 'Add Titanium White gradually'
    if (temperature === 'warm') {
        toLighten = 'Add Titanium White - will cool the color slightly'
    } else if (temperature === 'cool') {
        toLighten = 'Add Titanium White - maintains cool temperature'
    }

    // Context-aware darkening advice
    let toDarken = 'Add Ivory Black sparingly, or mix with complement'
    if (segment.name.includes('Yellow') || segment.name.includes('Orange')) {
        toDarken = `Avoid pure black - use ${complement.name} or Burnt Umber to darken`
    } else if (segment.name.includes('Blue') || segment.name.includes('Green')) {
        toDarken = 'Small amounts of Ivory Black work well, or add complement'
    }

    // Desaturation advice
    const toDesaturate = `Add a touch of ${complement.name}, or mix with neutral gray`

    // Saturation advice (within palette constraints)
    let toSaturate = 'Use less white/black, work from purer pigment'
    if (hsl.s < 30) {
        toSaturate = 'Start fresh with pure pigment - heavily muted colors are hard to re-saturate'
    }

    // General tip based on color characteristics
    let generalTip = ''
    if (segment.name.includes('Phthalo') || segment.type === 'primary') {
        generalTip = 'This hue range uses strong pigments - add to mixtures gradually'
    } else if (hsl.l > 70 && hsl.s < 40) {
        generalTip = 'Light, muted colors often need more paint than expected - mix generous amounts'
    } else if (hsl.l < 30) {
        generalTip = 'Dark values can look flat - consider using rich darks from complements instead of pure black'
    } else {
        generalTip = 'For subtle shifts, make changes in small increments and compare frequently'
    }

    return {
        toLighten,
        toDarken,
        toDesaturate,
        toSaturate,
        generalTip,
    }
}
