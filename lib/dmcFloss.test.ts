import { beforeAll, describe, expect, it } from 'vitest'
import { getDmcFloss } from './dataCache'
import { findClosestDMCColors, DMCColor } from './dmcFloss'

describe('dmcFloss', () => {
    let dmcColors: DMCColor[] = []

    beforeAll(async () => {
        dmcColors = await getDmcFloss()
    })

    it('loads the DMC floss dataset', () => {
        expect(dmcColors.length).toBeGreaterThanOrEqual(488)
        expect(dmcColors.every((color) => {
            return typeof color.number === 'string'
                && typeof color.name === 'string'
                && typeof color.hex === 'string'
                && typeof color.rgb?.r === 'number'
                && typeof color.rgb?.g === 'number'
                && typeof color.rgb?.b === 'number'
        })).toBe(true)
    })

    it('includes core reference colors as real thread reads, not screen extremes', () => {
        const black = dmcColors.find((color) => color.number === '310')
        const white = dmcColors.find((color) => color.number === 'White')

        expect(black?.name).toBe('Black')
        expect(black?.oklab.L).toBeGreaterThan(0.1)
        expect(black?.oklab.L).toBeLessThan(0.3)
        expect(white).toBeDefined()
        expect(white?.oklab.L).toBeGreaterThan(0.9)
        expect(white?.oklab.L).toBeLessThan(1)
    })

    it('carries the threads DMC sells today', () => {
        const numbers = new Set(dmcColors.map((color) => color.number))

        for (let n = 1; n <= 35; n++) expect(numbers.has(String(n).padStart(2, '0'))).toBe(true)
        expect(numbers.has('776')).toBe(false)
        expect(dmcColors.every((color) => color.colorConfidence === 'measured' || color.colorConfidence === 'approximate')).toBe(true)
    })

    it('finds exact and near matches asynchronously', async () => {
        const black = dmcColors.find((color) => color.number === '310')!
        const exact = await findClosestDMCColors(black.rgb, 1)
        const near = await findClosestDMCColors({ r: 128, g: 128, b: 128 }, 5)

        expect(exact).toHaveLength(1)
        expect(exact[0].number).toBe('310')
        expect(exact[0].distance).toBe(0)
        expect(near).toHaveLength(5)

        for (let i = 1; i < near.length; i++) {
            expect(near[i].distance).toBeGreaterThanOrEqual(near[i - 1].distance)
        }
    })

    it('returns enriched catalog fields on matches', async () => {
        const matches = await findClosestDMCColors({ r: 255, g: 0, b: 0 }, 1)
        const match = matches[0]

        expect(match.familyId).toBeTruthy()
        expect(match.deltaE00).toBeGreaterThanOrEqual(0)
        expect(match.distance).toBe(match.deltaE00)
    })

    it('returns no matches when count is zero', async () => {
        await expect(findClosestDMCColors({ r: 255, g: 0, b: 255 }, 0)).resolves.toEqual([])
    })
})
