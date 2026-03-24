import { beforeAll, describe, expect, it } from 'vitest'
import { getDmcFloss } from './dataCache'
import { findClosestDMCColors, DMCColor } from './dmcFloss'

describe('dmcFloss', () => {
    let dmcColors: DMCColor[] = []

    beforeAll(async () => {
        dmcColors = await getDmcFloss()
    })

    it('loads the DMC floss dataset', () => {
        expect(dmcColors.length).toBeGreaterThanOrEqual(454)
        expect(dmcColors.every((color) => {
            return typeof color.number === 'string'
                && typeof color.name === 'string'
                && typeof color.hex === 'string'
                && typeof color.rgb?.r === 'number'
                && typeof color.rgb?.g === 'number'
                && typeof color.rgb?.b === 'number'
        })).toBe(true)
    })

    it('includes core reference colors', () => {
        const black = dmcColors.find((color) => color.number === '310')
        const white = dmcColors.find((color) => color.number === 'White')

        expect(black?.name).toBe('Black')
        expect(black?.rgb).toEqual({ r: 0, g: 0, b: 0 })
        expect(white).toBeDefined()
        expect(white?.rgb.r).toBeGreaterThan(250)
        expect(white?.rgb.g).toBeGreaterThan(250)
        expect(white?.rgb.b).toBeGreaterThan(245)
    })

    it('finds exact and near matches asynchronously', async () => {
        const exact = await findClosestDMCColors({ r: 0, g: 0, b: 0 }, 1)
        const near = await findClosestDMCColors({ r: 128, g: 128, b: 128 }, 5)

        expect(exact).toHaveLength(1)
        expect(exact[0].number).toBe('310')
        expect(exact[0].distance).toBe(0)
        expect(near).toHaveLength(5)

        for (let i = 1; i < near.length; i++) {
            expect(near[i].distance).toBeGreaterThanOrEqual(near[i - 1].distance)
        }
    })

    it('caches computed Lab values on the loaded color objects', async () => {
        const target = dmcColors.find((color) => color.number === '666')
        expect(target).toBeDefined()

        if (!target) return
        delete target.lab

        await findClosestDMCColors({ r: 255, g: 0, b: 0 }, 5)

        expect(target.lab).toBeDefined()
        expect(target.lab!.mode).toBe('lab')
    })

    it('returns no matches when count is zero', async () => {
        await expect(findClosestDMCColors({ r: 255, g: 0, b: 255 }, 0)).resolves.toEqual([])
    })
})
