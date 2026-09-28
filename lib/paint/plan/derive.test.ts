import { beforeAll, describe, expect, it } from 'vitest'
import { converter } from 'culori'
import { mixPigmentsSync } from '../../spectral/adapter'
import { resolvePalettePigments } from '../palettePigments'
import { DEFAULT_PALETTE } from '../../types/palette'
import { derivedCandidates } from './derive'
import { getLibrary, type RecipeLibrary } from './library'

const core6 = resolvePalettePigments(DEFAULT_PALETTE.colors)
const toLab = converter('lab65')

describe('derived candidates', () => {
    let lib: RecipeLibrary
    beforeAll(async () => {
        lib = await getLibrary(core6)
    })

    // 6 white + 9 yellow ochre + 1 phthalo green
    const base = () => {
        const n = core6.length
        for (let j = 0; j < lib.size; j++) {
            const row = Array.from(lib.parts.subarray(j * n, (j + 1) * n))
            if (row[0] === 6 && row[2] === 9 && row[4] === 1 && row.filter((p) => p > 0).length === 3) return j
        }
        throw new Error('base recipe not in library')
    }

    it('lists each reduced "k parts of the base + d parts of one pigment" mix once, within range', () => {
        const cands = derivedCandidates(lib, base(), { maxBaseParts: 4, maxExtraParts: 4 })
        const keys = new Set(cands.map((c) => `${c.baseParts}:${c.extraParts}:${c.pigment}`))
        expect(keys.size).toBe(cands.length)
        for (const c of cands) {
            expect(c.baseParts).toBeGreaterThanOrEqual(1)
            expect(c.baseParts).toBeLessThanOrEqual(4)
            expect(c.extraParts).toBeGreaterThanOrEqual(1)
            expect(c.extraParts).toBeLessThanOrEqual(4)
        }
        // 4×4 grid minus the non-reduced pairs (2:2, 2:4, 4:2, 4:4, 3:3, 1:… stay) = 11 reduced, times 6 pigments
        expect(cands).toHaveLength(11 * core6.length)
    })

    it('flattens to pigment weights that sum to 1 and predicts the same swatch as mixing those pigments', () => {
        const j = base()
        const n = core6.length
        const total = lib.totalParts[j]
        for (const c of derivedCandidates(lib, j).filter((_, i) => i % 17 === 0)) {
            expect(c.weights.reduce((s, w) => s + w, 0)).toBeCloseTo(1, 9)
            const expected = Array.from({ length: n }, (_, i) => (c.baseParts * lib.parts[j * n + i]) / total + (i === c.pigment ? c.extraParts : 0))
            const sum = expected.reduce((a, b) => a + b, 0)
            expected.forEach((w, i) => expect(c.weights[i]).toBeCloseTo(w / sum, 9))
            const hex = mixPigmentsSync(core6.map((p, i) => ({ pigmentId: p.id, weight: c.weights[i] })).filter((m) => m.weight > 0)).hex
            const lab = toLab(hex)!
            expect(c.lab[0]).toBeCloseTo(lab.l, 9)
        }
    })

    it('reaches a finer tint than the base allows: less phthalo green than one part in sixteen', () => {
        const j = base()
        const greenShare = (weights: Float64Array) => weights[4]
        const cands = derivedCandidates(lib, j)
        expect(Math.min(...cands.map((c) => greenShare(c.weights)))).toBeLessThan(1 / 16 / 3)
    })

    it('is cached per base', () => {
        const j = base()
        expect(derivedCandidates(lib, j)).toBe(derivedCandidates(lib, j))
    })
})
