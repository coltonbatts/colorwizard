/**
 * Area-weighted k-means in OKLab with k-means++ seeding. Seeded and order-stable, so the
 * same histogram and seed always give the same clusters.
 */
import type { Histogram } from './histogram'
import { seededRandom } from './rng'

export interface KMeansOptions {
    seed?: number
    maxIterations?: number
}

export interface KMeansResult {
    /** Number of clusters actually produced (fewer than asked when the picture has fewer colors) */
    k: number
    /** OKLab centers, 3 numbers each, ordered dark to light by L */
    centers: Float64Array
    /** Pixels in each cluster */
    weight: Float64Array
    /** Cluster index of every histogram entry */
    assignment: Uint16Array
    iterations: number
}

function distance2(oklab: Float64Array, i: number, centers: Float64Array, c: number): number {
    const dL = oklab[i * 3] - centers[c * 3]
    const da = oklab[i * 3 + 1] - centers[c * 3 + 1]
    const db = oklab[i * 3 + 2] - centers[c * 3 + 2]
    return dL * dL + da * da + db * db
}

export function kmeans(hist: Histogram, requested: number, options: KMeansOptions = {}): KMeansResult {
    const { seed = 1, maxIterations = 60 } = options
    const k = Math.max(1, Math.min(requested, hist.size))
    const rand = seededRandom(seed)
    const { oklab, count, size } = hist

    const pick = (weights: Float64Array | number[], total: number) => {
        let target = rand() * total
        for (let i = 0; i < size; i++) {
            target -= weights[i]
            if (target <= 0) return i
        }
        return size - 1
    }

    // k-means++: each new center is drawn with probability ∝ area × squared distance to the nearest one
    const centers = new Float64Array(k * 3)
    const first = pick(count, hist.total)
    centers.set(oklab.subarray(first * 3, first * 3 + 3), 0)
    const nearest = new Float64Array(size)
    for (let i = 0; i < size; i++) nearest[i] = distance2(oklab, i, centers, 0)
    for (let c = 1; c < k; c++) {
        const weights = new Float64Array(size)
        let total = 0
        for (let i = 0; i < size; i++) {
            weights[i] = count[i] * nearest[i]
            total += weights[i]
        }
        if (total === 0) break
        const chosen = pick(weights, total)
        centers.set(oklab.subarray(chosen * 3, chosen * 3 + 3), c * 3)
        for (let i = 0; i < size; i++) nearest[i] = Math.min(nearest[i], distance2(oklab, i, centers, c))
    }

    const assignment = new Uint16Array(size).fill(65535)
    const weight = new Float64Array(k)
    let iterations = 0
    for (; iterations < maxIterations; iterations++) {
        let changed = false
        for (let i = 0; i < size; i++) {
            let best = 0
            let bestD = Infinity
            for (let c = 0; c < k; c++) {
                const d = distance2(oklab, i, centers, c)
                if (d < bestD) {
                    bestD = d
                    best = c
                }
            }
            if (assignment[i] !== best) {
                assignment[i] = best
                changed = true
            }
            nearest[i] = bestD
        }
        if (!changed) break

        const sums = new Float64Array(k * 3)
        weight.fill(0)
        for (let i = 0; i < size; i++) {
            const c = assignment[i]
            weight[c] += count[i]
            for (let axis = 0; axis < 3; axis++) sums[c * 3 + axis] += count[i] * oklab[i * 3 + axis]
        }
        for (let c = 0; c < k; c++) {
            if (weight[c] > 0) {
                for (let axis = 0; axis < 3; axis++) centers[c * 3 + axis] = sums[c * 3 + axis] / weight[c]
            } else {
                // An emptied cluster restarts on the worst-fitted color
                let worst = 0
                for (let i = 1; i < size; i++) if (count[i] * nearest[i] > count[worst] * nearest[worst]) worst = i
                centers.set(oklab.subarray(worst * 3, worst * 3 + 3), c * 3)
            }
        }
    }

    weight.fill(0)
    for (let i = 0; i < size; i++) weight[assignment[i]] += count[i]

    // Dark to light, so pile numbers mean something and ties cannot reorder plans
    const order = [...Array(k).keys()].sort((a, b) => centers[a * 3] - centers[b * 3] || centers[a * 3 + 1] - centers[b * 3 + 1] || centers[a * 3 + 2] - centers[b * 3 + 2])
    const rank = new Map(order.map((old, index) => [old, index]))
    const sortedCenters = new Float64Array(k * 3)
    const sortedWeight = new Float64Array(k)
    order.forEach((old, index) => {
        sortedCenters.set(centers.subarray(old * 3, old * 3 + 3), index * 3)
        sortedWeight[index] = weight[old]
    })
    for (let i = 0; i < size; i++) assignment[i] = rank.get(assignment[i])!
    return { k, centers: sortedCenters, weight: sortedWeight, assignment, iterations }
}
