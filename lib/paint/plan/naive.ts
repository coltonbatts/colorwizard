/**
 * The NAIVE BASELINE plan, kept unchanged as the reference every later algorithm is
 * measured against: cluster the picture in OKLab (area-weighted, k-means++, fixed seed),
 * then solve each cluster center on its own. It knows nothing about the palette when it
 * clusters, so it happily asks for colors the paints cannot make, and it never lets
 * piles share paint.
 */
import { oklabToHex } from './color'
import type { Histogram } from './histogram'
import { kmeans } from './kmeans'
import type { Plan, PlanSolver } from './types'

export async function naivePlan(hist: Histogram, budget: number, solve: PlanSolver, options: { seed?: number } = {}): Promise<Plan> {
    const clusters = kmeans(hist, budget, { seed: options.seed })
    const piles: Plan['piles'] = []
    for (let c = 0; c < clusters.k; c++) {
        const targetHex = oklabToHex(clusters.centers[c * 3], clusters.centers[c * 3 + 1], clusters.centers[c * 3 + 2])
        piles.push({ targetHex, recipe: await solve(targetHex), area: clusters.weight[c] / hist.total })
    }
    return { budget, piles }
}
