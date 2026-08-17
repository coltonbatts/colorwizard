import { describe, expect, it } from 'vitest'
import { getLuminance, getPainterValue, getPainterValuePercent, getValueBand } from './paintingMath'

/**
 * Value is perceptual lightness, not luminance. These two quantities diverge by roughly 30
 * points through the midtones, which is the difference between telling a painter their
 * middle gray is value 5 and telling them it is value 2.
 */
describe('painter value vs luminance', () => {
    it('keeps luminance available as its own photometric quantity', () => {
        expect(getLuminance(128, 128, 128)).toBe(22)
        expect(getLuminance(255, 255, 255)).toBe(100)
        expect(getLuminance(0, 0, 0)).toBe(0)
    })

    it('reports middle gray as value 5, where a painter puts it', () => {
        expect(getPainterValuePercent(128, 128, 128)).toBeCloseTo(53.6, 1)
        expect(getPainterValue('#808080')).toBe(5)
    })

    it('anchors the ends of the scale', () => {
        expect(getPainterValue('#000000')).toBe(0)
        expect(getPainterValue('#ffffff')).toBe(10)
    })

    it('places the demo terracotta in the midtones, not the shadows', () => {
        // #C45C3E has luminance 20 but reads as a mid value on canvas.
        expect(getLuminance(196, 92, 62)).toBe(20)
        expect(getPainterValue('#C45C3E')).toBe(5)
    })

    it('increases monotonically with lightness', () => {
        const ramp = ['#000000', '#404040', '#777777', '#c0c0c0', '#ffffff']
        const values = ramp.map((hex) => getPainterValue(hex))
        for (let i = 1; i < values.length; i++) {
            expect(values[i]).toBeGreaterThan(values[i - 1])
        }
    })

    it('returns 0 for an unparseable color', () => {
        expect(getPainterValue('not-a-color')).toBe(0)
    })
})

describe('getValueBand', () => {
    it('labels the middle of the scale as a half tone', () => {
        expect(getValueBand(getPainterValuePercent(128, 128, 128))).toBe('Light half tone')
        expect(getValueBand(50)).toBe('Half tone')
    })

    it('reserves the extremes for colors that are actually there', () => {
        expect(getValueBand(getPainterValuePercent(0, 0, 0))).toBe('Near black')
        expect(getValueBand(getPainterValuePercent(255, 255, 255))).toBe('Near white')
        // A mid-dark gray is a shadow, not near black - the old luminance-fed version
        // labelled everything up to #595959 "Near black".
        expect(getValueBand(getPainterValuePercent(89, 89, 89))).toBe('Dark half tone')
    })

    it('covers every band across the scale', () => {
        const labels = new Set([5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map(getValueBand))
        expect(labels.size).toBe(10)
    })
})
