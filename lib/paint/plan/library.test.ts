import { beforeAll, describe, expect, it } from 'vitest'
import { converter } from 'culori'
import { mixPigmentsSync } from '../../spectral/adapter'
import { resolvePalettePigments } from '../palettePigments'
import { solveRecipe } from '../solveRecipe'
import { DEFAULT_PALETTE } from '../../types/palette'
import { ciede2000 } from './deltaE'
import { buildLibrary, getLibrary, type RecipeLibrary } from './library'

const core6 = resolvePalettePigments(DEFAULT_PALETTE.colors)
const toLab = converter('lab65')

describe('recipe library (Core six)', () => {
    let lib: RecipeLibrary
    beforeAll(async () => {
        lib = await getLibrary(core6)
    })

    it('holds only reduced whole-part recipes of at most 4 pigments and 16 parts', () => {
        const n = core6.length
        expect(lib.size).toBeGreaterThan(30000)
        const seen = new Set<string>()
        for (let j = 0; j < lib.size; j++) {
            const row = Array.from(lib.parts.subarray(j * n, (j + 1) * n))
            const used = row.filter((p) => p > 0)
            expect(used.length).toBe(lib.pigmentCount[j])
            expect(used.length).toBeLessThanOrEqual(4)
            expect(used.reduce((s, p) => s + p, 0)).toBe(lib.totalParts[j])
            expect(lib.totalParts[j]).toBeLessThanOrEqual(16)
            if (used.length > 1) expect(used.reduce((a, b) => { while (b) [a, b] = [b, a % b]; return a })).toBe(1)
            const key = row.join(',')
            expect(seen.has(key)).toBe(false)
            seen.add(key)
        }
    })

    it('predicts each swatch exactly as the solver would print it', () => {
        const n = core6.length
        for (const j of [0, 7, 1234, 9999, 20000, lib.size - 1]) {
            const inputs = core6.map((p, i) => ({ pigmentId: p.id, weight: lib.parts[j * n + i] })).filter((i) => i.weight > 0)
            const hex = mixPigmentsSync(inputs).hex
            expect('#' + [...lib.rgb.subarray(j * 3, j * 3 + 3)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()).toBe(hex.toUpperCase())
            const lab = toLab(hex)!
            expect(lib.lab[j * 3]).toBeCloseTo(lab.l, 9)
        }
    })

    it('reaches at least as close as the solver whenever the solver returns a whole-part recipe', async () => {
        for (const hex of ['#C68E62', '#8DB53F', '#6E7A86', '#DDA783', '#B85C38', '#4A6B54']) {
            const solver = await solveRecipe(hex)
            const target = toLab(hex)!
            let best = Infinity
            for (let j = 0; j < lib.size; j++) best = Math.min(best, ciede2000(target.l, target.a, target.b, lib.lab[j * 3], lib.lab[j * 3 + 1], lib.lab[j * 3 + 2]))
            if (solver.paintable) expect(best).toBeLessThanOrEqual(solver.error00! + 1e-6)
        }
    })

    it('is cached per palette and rebuilds identically', async () => {
        expect(await getLibrary(core6)).toBe(lib)
        const again = await buildLibrary(core6)
        expect(again.size).toBe(lib.size)
        expect(Buffer.from(again.rgb).equals(Buffer.from(lib.rgb))).toBe(true)
    })
})

describe('recipe library sizing', () => {
    it('keeps a four-tube palette small and a large palette within its cap', async () => {
        expect((await buildLibrary(core6.slice(0, 4))).size).toBeLessThan(6000)
        const big = resolvePalettePigments([
            ...DEFAULT_PALETTE.colors,
            { id: 'raw-umber', displayName: 'Raw Umber' },
            { id: 'custom-magenta-c2185b', displayName: 'Magenta', hex: '#C2185B', tintingStrength: 2 },
            { id: 'custom-ultramarine-2b3a8f', displayName: 'Ultramarine', hex: '#2B3A8F', tintingStrength: 4 },
            { id: 'custom-lemon-f5d90a', displayName: 'Lemon', hex: '#F5D90A', tintingStrength: 1 },
        ])
        expect(big).toHaveLength(10)
        const lib = await buildLibrary(big)
        expect(lib.size).toBeLessThan(140000)
        expect(lib.totalParts.every((t) => t <= 16)).toBe(true)
    }, 60000)
})
