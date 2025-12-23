import { describe, it, expect } from 'vitest'
import {
    getColorHarmonies,
    rgbToHex,
    getSegmentIndex,
    COLOR_WHEEL_SEGMENTS
} from './colorTheory'

describe('colorTheory.ts harmonies', () => {
    it('should calculate correct complementary for Red', () => {
        // Red is index 0
        const redRgb = { r: 255, g: 0, b: 0 }
        const harmonies = getColorHarmonies(redRgb)

        expect(harmonies.base.name).toBe('Red')
        // Complementary should be index 6 (Green)
        expect(harmonies.complementary.name).toBe('Green')
    })

    it('should calculate correct analogous colors for Red', () => {
        const redRgb = { r: 255, g: 0, b: 0 }
        const harmonies = getColorHarmonies(redRgb)

        // Analogous should be indices 11 (Red-Violet) and 1 (Red-Orange)
        expect(harmonies.analogous[0].name).toBe('Red-Violet')
        expect(harmonies.analogous[1].name).toBe('Red-Orange')
    })

    it('should calculate correct triadic colors for Yellow', () => {
        // Yellow is index 4
        const yellowRgb = { r: 255, g: 255, b: 0 }
        const harmonies = getColorHarmonies(yellowRgb)

        expect(harmonies.base.name).toBe('Yellow')
        // Triadic: (4+4)%12 = 8 (Blue), (4+8)%12 = 0 (Red)
        expect(harmonies.triadic.map(s => s.name)).toContain('Blue')
        expect(harmonies.triadic.map(s => s.name)).toContain('Red')
    })

    it('should calculate correct split-complementary for Blue', () => {
        // Blue is index 8
        const blueRgb = { r: 0, g: 0, b: 255 }
        const harmonies = getColorHarmonies(blueRgb)

        expect(harmonies.base.name).toBe('Blue')
        // Split-Complementary: (8+5)%12 = 1 (Red-Orange), (8+7)%12 = 3 (Yellow-Orange)
        expect(harmonies.splitComplementary.map(s => s.name)).toContain('Red-Orange')
        expect(harmonies.splitComplementary.map(s => s.name)).toContain('Yellow-Orange')
    })

    it('should identify temperature correctly', () => {
        expect(getColorHarmonies({ r: 255, g: 0, b: 0 }).temperature).toBe('warm') // Red
        expect(getColorHarmonies({ r: 0, g: 0, b: 255 }).temperature).toBe('cool') // Blue
        expect(getColorHarmonies({ r: 128, g: 128, b: 128 }).temperature).toBe('neutral') // Gray
    })
})
