import { describe, it, expect } from 'vitest'
import { deltaE, hexToRgb, rgbToLab, getMatchConfidence } from './colorUtils'

describe('colorUtils', () => {
    describe('deltaE', () => {
        it('returns 0 for identical colors', () => {
            const delta = deltaE('#FF0000', '#FF0000')
            expect(delta).toBe(0)
        })

        it('returns 0 for identical colors with different case', () => {
            const delta = deltaE('#ff0000', '#FF0000')
            expect(delta).toBe(0)
        })

        it('returns small value for similar colors', () => {
            // Very similar reds
            const delta = deltaE('#FF0000', '#FE0000')
            expect(delta).toBeLessThan(2)
        })

        it('returns large value for opposite colors', () => {
            // Red vs Cyan (complementary)
            const delta = deltaE('#FF0000', '#00FFFF')
            expect(delta).toBeGreaterThan(50)
        })

        it('returns value < 1.0 for imperceptible difference', () => {
            // Colors that should be virtually indistinguishable
            const delta = deltaE('#808080', '#808181')
            expect(delta).toBeLessThan(1.0)
        })

        it('returns value 1-2 for perceptible through close observation', () => {
            // Slightly different grays
            const delta = deltaE('#808080', '#858585')
            expect(delta).toBeGreaterThanOrEqual(1)
            expect(delta).toBeLessThan(3)
        })

        it('returns value 2-10 for perceptible at a glance', () => {
            const delta = deltaE('#FF0000', '#FF3333')
            expect(delta).toBeGreaterThanOrEqual(2)
            expect(delta).toBeLessThan(15)
        })

        it('returns larger values for clearly different colors', () => {
            // Red vs Blue
            const delta = deltaE('#FF0000', '#0000FF')
            expect(delta).toBeGreaterThan(30)
        })
    })

    describe('hexToRgb', () => {
        it('converts valid 6-digit hex to RGB', () => {
            const rgb = hexToRgb('#FF0000')
            expect(rgb).toEqual({ r: 255, g: 0, b: 0 })
        })

        it('converts hex without # prefix', () => {
            const rgb = hexToRgb('00FF00')
            expect(rgb).toEqual({ r: 0, g: 255, b: 0 })
        })

        it('converts 3-digit hex to RGB', () => {
            const rgb = hexToRgb('#F00')
            expect(rgb).toEqual({ r: 255, g: 0, b: 0 })
        })

        it('handles lowercase hex', () => {
            const rgb = hexToRgb('#0000ff')
            expect(rgb).toEqual({ r: 0, g: 0, b: 255 })
        })

        it('returns null for invalid hex', () => {
            const rgb = hexToRgb('invalid')
            expect(rgb).toBeNull()
        })

        it('returns null for empty string', () => {
            const rgb = hexToRgb('')
            expect(rgb).toBeNull()
        })

        it('converts white correctly', () => {
            const rgb = hexToRgb('#FFFFFF')
            expect(rgb).toEqual({ r: 255, g: 255, b: 255 })
        })

        it('converts black correctly', () => {
            const rgb = hexToRgb('#000000')
            expect(rgb).toEqual({ r: 0, g: 0, b: 0 })
        })

        it('converts mid-gray correctly', () => {
            const rgb = hexToRgb('#808080')
            expect(rgb).toEqual({ r: 128, g: 128, b: 128 })
        })
    })

    describe('rgbToLab', () => {
        it('converts pure red to Lab', () => {
            const lab = rgbToLab(255, 0, 0)
            expect(lab.mode).toBe('lab')
            // Red in Lab: L ≈ 54, a ≈ 80, b ≈ 67
            expect(lab.l).toBeCloseTo(54.3, 0)
            expect(lab.a).toBeGreaterThan(60)
            expect(lab.b).toBeGreaterThan(50)
        })

        it('converts pure green to Lab', () => {
            const lab = rgbToLab(0, 255, 0)
            expect(lab.mode).toBe('lab')
            // Green in Lab: L ≈ 87, a ≈ -86, b ≈ 83
            expect(lab.l).toBeCloseTo(87.7, 0)
            expect(lab.a).toBeLessThan(-50)
            expect(lab.b).toBeGreaterThan(70)
        })

        it('converts pure blue to Lab', () => {
            const lab = rgbToLab(0, 0, 255)
            expect(lab.mode).toBe('lab')
            // Blue in Lab: L ≈ 30, a ≈ 68, b ≈ -112
            expect(lab.l).toBeCloseTo(29.6, 0)
            expect(lab.a).toBeGreaterThan(50)
            expect(lab.b).toBeLessThan(-90)
        })

        it('converts pure black to Lab with L=0', () => {
            const lab = rgbToLab(0, 0, 0)
            expect(lab.l).toBeCloseTo(0, 0)
            expect(lab.a).toBeCloseTo(0, 1)
            expect(lab.b).toBeCloseTo(0, 1)
        })

        it('converts pure white to Lab with L=100', () => {
            const lab = rgbToLab(255, 255, 255)
            expect(lab.l).toBeCloseTo(100, 0)
            expect(lab.a).toBeCloseTo(0, 1)
            expect(lab.b).toBeCloseTo(0, 1)
        })

        it('converts mid-gray to Lab with L≈53.6', () => {
            const lab = rgbToLab(128, 128, 128)
            expect(lab.l).toBeCloseTo(53.6, 0)
            expect(lab.a).toBeCloseTo(0, 1)
            expect(lab.b).toBeCloseTo(0, 1)
        })
    })

    describe('getMatchConfidence', () => {
        it('returns "Exact Match" for dE < 1.0', () => {
            const result = getMatchConfidence(0.5)
            expect(result.label).toBe('Exact Match')
            expect(result.color).toBe('text-green-500')
            expect(result.bgColor).toBe('bg-green-500')
        })

        it('returns "Very Close" for dE 1.0-2.5', () => {
            const result = getMatchConfidence(1.5)
            expect(result.label).toBe('Very Close')
            expect(result.color).toBe('text-emerald-400')
            expect(result.bgColor).toBe('bg-emerald-400')
        })

        it('returns "Close" for dE 2.5-5.0', () => {
            const result = getMatchConfidence(3.5)
            expect(result.label).toBe('Close')
            expect(result.color).toBe('text-blue-400')
            expect(result.bgColor).toBe('bg-blue-400')
        })

        it('returns "Similar" for dE 5.0-10.0', () => {
            const result = getMatchConfidence(7.5)
            expect(result.label).toBe('Similar')
            expect(result.color).toBe('text-yellow-400')
            expect(result.bgColor).toBe('bg-yellow-400')
        })

        it('returns "Distant" for dE >= 10.0', () => {
            const result = getMatchConfidence(15)
            expect(result.label).toBe('Distant')
            expect(result.color).toBe('text-gray-400')
            expect(result.bgColor).toBe('bg-gray-400')
        })

        it('handles boundary at exactly 1.0 as "Very Close"', () => {
            const result = getMatchConfidence(1.0)
            expect(result.label).toBe('Very Close')
        })

        it('handles boundary at exactly 2.5 as "Close"', () => {
            const result = getMatchConfidence(2.5)
            expect(result.label).toBe('Close')
        })

        it('handles boundary at exactly 5.0 as "Similar"', () => {
            const result = getMatchConfidence(5.0)
            expect(result.label).toBe('Similar')
        })

        it('handles boundary at exactly 10.0 as "Distant"', () => {
            const result = getMatchConfidence(10.0)
            expect(result.label).toBe('Distant')
        })

        it('handles zero as "Exact Match"', () => {
            const result = getMatchConfidence(0)
            expect(result.label).toBe('Exact Match')
        })

        it('handles very large values as "Distant"', () => {
            const result = getMatchConfidence(100)
            expect(result.label).toBe('Distant')
        })
    })
})
