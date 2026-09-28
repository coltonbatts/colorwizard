/**
 * Picks the piles: k-medoids over a table of candidate swatches. Pure numbers in, indices
 * out, no palette or spectral code, so it is easy to test and to move to a worker.
 *
 * Objective, in mean-ΔE00 units:
 *   Σ_i weight_i · cost(i, nearest chosen)  +  α · (parts of each chosen)  +  β · (new pigments)
 * α and β are the exchange rate: how much mean ΔE00 the plan may give up to save one part
 * of measuring or one extra tube.
 */
export interface SelectInput {
    /** Fit colors */
    n: number
    /** Candidate swatches */
    m: number
    /** Area share of each fit color, summing to 1 */
    weight: Float64Array
    /** cost[i * m + c]: how bad candidate c is for fit color i (ΔE00, or a power of it) */
    cost: Float32Array
    /** Whole parts a candidate needs to measure */
    parts: Uint8Array
    /** Bit i set when the candidate uses pigment i (0 to switch the tube penalty off) */
    pigmentMask: Uint32Array
    budget: number
    /** ΔE00 mean per part of measuring (default 0) */
    alpha?: number
    /** ΔE00 mean per pigment the plan would not otherwise use (default 0) */
    beta?: number
    /** Stop adding piles when the next one would lower mean cost by less than this, before any price for parts or tubes (default 0) */
    minGain?: number
    maxIterations?: number
}

export interface Selection {
    /** Candidate index of each chosen pile */
    chosen: number[]
    /** For each fit color, its position in `chosen` */
    assignment: Uint16Array
    objective: number
    iterations: number
}

const popcount = (x: number) => {
    let c = 0
    for (let v = x >>> 0; v; v &= v - 1) c++
    return c
}

export function selectPiles(input: SelectInput): Selection {
    const { n, m, weight, cost, parts, pigmentMask, budget } = input
    const alpha = input.alpha ?? 0
    const beta = input.beta ?? 0
    const minGain = input.minGain ?? 0
    const partPenalty = new Float64Array(m)
    for (let c = 0; c < m; c++) partPenalty[c] = alpha * parts[c]

    // Greedy forward selection: each pile is the one that lowers the objective most.
    const chosen: number[] = []
    const current = new Float64Array(n).fill(Infinity)
    const gain = new Float64Array(m)
    const used = new Uint32Array(1) // pigments in use
    while (chosen.length < budget) {
        gain.fill(0)
        if (chosen.length === 0) {
            for (let i = 0; i < n; i++) {
                const w = weight[i]
                const row = i * m
                for (let c = 0; c < m; c++) gain[c] -= w * cost[row + c]
            }
        } else {
            for (let i = 0; i < n; i++) {
                const w = weight[i]
                const cur = current[i]
                const row = i * m
                for (let c = 0; c < m; c++) {
                    const d = cur - cost[row + c]
                    if (d > 0) gain[c] += w * d
                }
            }
        }
        // The price of parts and tubes decides WHICH candidate is best; only the raw gain
        // decides whether another pile is worth adding at all.
        let best = -1
        let bestValue = -Infinity
        for (let c = 0; c < m; c++) {
            if (chosen.includes(c)) continue
            const value = gain[c] - partPenalty[c] - beta * popcount(pigmentMask[c] & ~used[0])
            if (value > bestValue) {
                bestValue = value
                best = c
            }
        }
        if (best < 0) break
        if (chosen.length > 0 && gain[best] <= minGain) break
        chosen.push(best)
        used[0] |= pigmentMask[best]
        for (let i = 0; i < n; i++) current[i] = Math.min(current[i], cost[i * m + best])
    }

    // Medoid refinement: give each pile to the fit colors it serves best, then replace it with
    // the candidate that serves exactly those colors best. Each step can only lower the objective.
    const assignment = new Uint16Array(n)
    const assign = () => {
        let changed = false
        for (let i = 0; i < n; i++) {
            let bestP = 0
            let bestD = Infinity
            for (let p = 0; p < chosen.length; p++) {
                const d = cost[i * m + chosen[p]]
                if (d < bestD) {
                    bestD = d
                    bestP = p
                }
            }
            if (assignment[i] !== bestP) changed = true
            assignment[i] = bestP
            current[i] = bestD
        }
        return changed
    }
    assign()

    const maxIterations = input.maxIterations ?? 25
    let iterations = 0
    const columnCost = new Float64Array(m)
    for (; iterations < maxIterations; iterations++) {
        let replaced = false
        for (let p = 0; p < chosen.length; p++) {
            columnCost.fill(0)
            for (let i = 0; i < n; i++) {
                if (assignment[i] !== p) continue
                const w = weight[i]
                const row = i * m
                for (let c = 0; c < m; c++) columnCost[c] += w * cost[row + c]
            }
            let others = 0
            chosen.forEach((c, q) => {
                if (q !== p) others |= pigmentMask[c]
            })
            let best = chosen[p]
            let bestValue = Infinity
            for (let c = 0; c < m; c++) {
                if (c !== chosen[p] && chosen.includes(c)) continue
                const value = columnCost[c] + partPenalty[c] + beta * popcount(pigmentMask[c] & ~others)
                if (value < bestValue - 1e-12) {
                    bestValue = value
                    best = c
                }
            }
            if (best !== chosen[p]) {
                chosen[p] = best
                replaced = true
            }
        }
        const reassigned = assign()
        if (!replaced && !reassigned) break
    }

    let objective = 0
    let mask = 0
    for (let i = 0; i < n; i++) objective += weight[i] * current[i]
    for (const c of chosen) {
        objective += partPenalty[c]
        mask |= pigmentMask[c]
    }
    objective += beta * popcount(mask)
    return { chosen, assignment, objective, iterations }
}
