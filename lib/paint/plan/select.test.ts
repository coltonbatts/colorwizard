import { describe, expect, it } from 'vitest'
import { selectPiles } from './select'

/** Fit colors on a line; candidates are points on the same line. cost = distance. */
function line(points: number[], weights: number[], candidates: number[], parts: number[], extra: { budget: number; alpha?: number; beta?: number; minGain?: number; masks?: number[] }) {
    const n = points.length
    const m = candidates.length
    const total = weights.reduce((s, w) => s + w, 0)
    const cost = new Float32Array(n * m)
    for (let i = 0; i < n; i++) for (let c = 0; c < m; c++) cost[i * m + c] = Math.abs(points[i] - candidates[c])
    return selectPiles({
        n, m,
        weight: Float64Array.from(weights, (w) => w / total),
        cost,
        parts: Uint8Array.from(parts),
        pigmentMask: Uint32Array.from(extra.masks ?? candidates.map(() => 0)),
        budget: extra.budget,
        alpha: extra.alpha,
        beta: extra.beta,
        minGain: extra.minGain,
    })
}

describe('selectPiles', () => {
    const points = [0, 1, 2, 10, 11, 12, 30]
    const candidates = [1, 11, 30, 0, 2, 12]

    it('finds the medoid of each obvious cluster', () => {
        const result = line(points, [1, 1, 1, 1, 1, 1, 1], candidates, [4, 4, 4, 4, 4, 4], { budget: 3 })
        expect(result.chosen.map((c) => candidates[c]).sort((a, b) => a - b)).toEqual([1, 11, 30])
        expect(result.objective).toBeCloseTo((1 + 0 + 1 + 1 + 0 + 1 + 0) / 7, 6)
    })

    it('spends piles where the area is, not on a single far outlier', () => {
        const heavy = line(points, [50, 50, 50, 1, 1, 1, 1], candidates, [4, 4, 4, 4, 4, 4], { budget: 2 })
        const chosen = heavy.chosen.map((c) => candidates[c])
        expect(chosen).toContain(1)
        expect(chosen).not.toContain(30)
    })

    it('never uses more piles than the budget, and every fit color gets a pile', () => {
        const result = line(points, [1, 1, 1, 1, 1, 1, 1], candidates, [4, 4, 4, 4, 4, 4], { budget: 2 })
        expect(result.chosen).toHaveLength(2)
        expect(Math.max(...result.assignment)).toBeLessThan(2)
    })

    it('prefers the simpler recipe among near-equals when parts have a price, and only then', () => {
        // Candidates 5 and 5.05 are equally good for the point at 5; the second needs many more parts.
        const free = line([5], [1], [5.05, 5], [16, 2], { budget: 1, alpha: 0 })
        expect(free.chosen[0]).toBe(1) // exactly 5 is closer
        // Totals at α = 0.01: 5.05 with 2 parts = 0.05 + 0.02, 5.0001 with 16 parts = 0.0001 + 0.16, 5.01 with 3 parts = 0.01 + 0.03.
        const priced = line([5], [1], [5.05, 5.0001, 5.01], [2, 16, 3], { budget: 1, alpha: 0.01 })
        expect(priced.chosen[0]).toBe(2)
    })

    it('does not let the price of parts drop piles, but minGain can', () => {
        const dear = line(points, [1, 1, 1, 1, 1, 1, 1], candidates, [16, 16, 16, 16, 16, 16], { budget: 3, alpha: 0.5 })
        expect(dear.chosen).toHaveLength(3)
        const gated = line([0, 0.01], [1, 1], [0, 0.01], [1, 1], { budget: 2, minGain: 0.1 })
        expect(gated.chosen).toHaveLength(1)
    })

    it('charges for introducing a new pigment', () => {
        // Candidate 0 uses pigment A, 1 uses B, 2 uses A: with a tube price the second pile reuses A.
        const masks = [0b01, 0b10, 0b01]
        const priced = line([0, 10], [1, 1], [0, 10.4, 10], [4, 4, 4], { budget: 2, beta: 5, masks })
        expect(priced.chosen.map((c) => [0, 10.4, 10][c]).sort((a, b) => a - b)).toEqual([0, 10])
    })

    it('is deterministic', () => {
        const a = line(points, [3, 1, 4, 1, 5, 9, 2], candidates, [4, 4, 4, 4, 4, 4], { budget: 3 })
        const b = line(points, [3, 1, 4, 1, 5, 9, 2], candidates, [4, 4, 4, 4, 4, 4], { budget: 3 })
        expect(a.chosen).toEqual(b.chosen)
        expect([...a.assignment]).toEqual([...b.assignment])
    })
})
