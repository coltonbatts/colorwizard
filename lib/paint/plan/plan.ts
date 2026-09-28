/**
 * The whole-picture paint plan: choose N piles from the palette's recipe library so the
 * repainted picture is as close to the original as those piles allow.
 *
 * How, in order:
 *  1. Merge the picture's near colors (at most `fitColors`) to fit on; the result is scored
 *     on the full picture, never on the merged one.
 *  2. For each merged color keep its `candidates` nearest library swatches (cheap CIELAB
 *     distance), then score those exactly in ΔE00.
 *  3. k-medoids over that table (select.ts): greedy forward selection, then medoid refinement,
 *     minimizing area-weighted ΔE00 to the nearest chosen swatch plus a small price per part
 *     of measuring and per extra tube.
 *  4. Give every pixel of the full picture to its nearest swatch; each pile's target is the
 *     average color of the pixels it ended up with, and its label says how well the swatch
 *     matches that.
 *
 * No randomness, no solver calls: the same picture, palette and budget give the same plan.
 * Swatches are spectral.js's prediction, not measured paint.
 */
import { converter } from 'culori'
import { getMatchQuality00, type SpectralRecipe } from '../../spectral/types'
import type { Pigment } from '../../spectral/types'
import { oklabToHex, rgbToHex, srgb8ToOklab, hexToRgb } from './color'
import { ciede2000 } from './deltaE'
import { coarsenHistogram, type Histogram } from './histogram'
import { getLibrary, type LibraryOptions, type RecipeLibrary } from './library'
import { histogramLab } from './metrics'
import { selectPiles } from './select'
import type { Plan, PlanPile } from './types'

const toLab = converter('lab65')

export interface PlanOptions {
    /** Fit on at most this many merged colors (default 600; 2400 changes ΔE00 by under 0.03 and costs 3× the time) */
    fitColors?: number
    /** Nearest library swatches kept per merged color (default 12; 48 changes ΔE00 by under 0.04) */
    candidates?: number
    /**
     * The exchange rate for measuring: mean ΔE00 a plan may give up to save one part in a pile
     * (default 0.005; at 12 piles that is about a third fewer parts for +0.08 mean ΔE00).
     */
    alpha?: number
    /** Mean ΔE00 a plan may give up to avoid one extra pigment (default 0.1: about 0.6 fewer tubes at 8 piles for +0.04) */
    beta?: number
    /** Stop adding piles when the next one would lower mean ΔE00 by less than this (default 0: fill the budget) */
    minGain?: number
    /**
     * CIEDE2000 lightness weight used to choose piles; below 1 counts value more (default 0.65:
     * about 12% less value error, same mean ΔE00 from 8 piles up, +0.1 at 5). Scoring always uses 1.
     */
    kL?: number
    library?: LibraryOptions
}

export const DEFAULT_PLAN_OPTIONS: Required<Omit<PlanOptions, 'library'>> = {
    fitColors: 600,
    candidates: 12,
    alpha: 0.005,
    beta: 0.1,
    minGain: 0,
    kL: 0.65,
}

/** Library indices nearest to each fit color by CIELAB distance, merged into one sorted set. */
function pruneCandidates(lib: RecipeLibrary, fitLab: Float64Array, n: number, per: number, kL: number): Int32Array {
    const keep = new Set<number>()
    const bestD = new Float64Array(per)
    const bestJ = new Int32Array(per)
    const libLab = lib.lab
    const inv = 1 / kL
    for (let i = 0; i < n; i++) {
        const l = fitLab[i * 3] * inv
        const a = fitLab[i * 3 + 1]
        const b = fitLab[i * 3 + 2]
        bestD.fill(Infinity)
        for (let j = 0; j < lib.size; j++) {
            const dl = l - libLab[j * 3] * inv
            const da = a - libLab[j * 3 + 1]
            const db = b - libLab[j * 3 + 2]
            const d = dl * dl + da * da + db * db
            if (d >= bestD[per - 1]) continue
            let p = per - 1
            while (p > 0 && bestD[p - 1] > d) {
                bestD[p] = bestD[p - 1]
                bestJ[p] = bestJ[p - 1]
                p--
            }
            bestD[p] = d
            bestJ[p] = j
        }
        for (let p = 0; p < per; p++) keep.add(bestJ[p])
    }
    return Int32Array.from([...keep].sort((x, y) => x - y))
}

/** A library recipe as the SpectralRecipe the rest of the app already knows how to show. */
export function recipeFromLibrary(lib: RecipeLibrary, j: number, targetHex: string): SpectralRecipe {
    const total = lib.totalParts[j]
    const n = lib.pigments.length
    const ingredients = []
    for (let i = 0; i < n; i++) {
        const parts = lib.parts[j * n + i]
        if (parts > 0) ingredients.push({ pigment: lib.pigments[i], weight: parts / total, percentage: `${Math.round((parts / total) * 100)}%`, parts })
    }
    ingredients.sort((x, y) => y.weight - x.weight)
    const predictedHex = rgbToHex(lib.rgb[j * 3], lib.rgb[j * 3 + 1], lib.rgb[j * 3 + 2])
    const [tL, ta, tb] = srgb8ToOklab(...hexToRgb(targetHex))
    const [pL, pa, pb] = srgb8ToOklab(lib.rgb[j * 3], lib.rgb[j * 3 + 1], lib.rgb[j * 3 + 2])
    const target = toLab(targetHex)!
    const error00 = ciede2000(target.l, target.a, target.b, lib.lab[j * 3], lib.lab[j * 3 + 1], lib.lab[j * 3 + 2])
    return {
        ingredients,
        predictedHex,
        error: Math.hypot(pL - tL, pa - ta, pb - tb) * 100,
        error00,
        matchQuality: getMatchQuality00(error00),
        paintable: true,
        totalParts: total,
        steps: [],
    }
}

export async function makePlan(hist: Histogram, budget: number, pigments: Pigment[], options: PlanOptions = {}): Promise<Plan> {
    const o = { ...DEFAULT_PLAN_OPTIONS, ...options }
    const lib = await getLibrary(pigments, options.library)
    const fit = coarsenHistogram(hist, o.fitColors)
    const n = fit.size
    const fitLab = histogramLab(fit)
    const weight = Float64Array.from(fit.count, (c) => c / fit.total)

    const cand = pruneCandidates(lib, fitLab, n, Math.min(o.candidates, lib.size), o.kL)
    const m = cand.length
    const cost = new Float32Array(n * m)
    for (let i = 0; i < n; i++) {
        const l = fitLab[i * 3]
        const a = fitLab[i * 3 + 1]
        const b = fitLab[i * 3 + 2]
        for (let c = 0; c < m; c++) {
            const j = cand[c]
            const d = ciede2000(l, a, b, lib.lab[j * 3], lib.lab[j * 3 + 1], lib.lab[j * 3 + 2], o.kL)
            cost[i * m + c] = d
        }
    }
    const parts = Uint8Array.from(cand, (j) => lib.totalParts[j])
    const pigmentMask = new Uint32Array(m)
    if (lib.pigments.length <= 31) {
        for (let c = 0; c < m; c++) {
            let mask = 0
            for (let i = 0; i < lib.pigments.length; i++) if (lib.parts[cand[c] * lib.pigments.length + i] > 0) mask |= 1 << i
            pigmentMask[c] = mask
        }
    }

    const picked = selectPiles({ n, m, weight, cost, parts, pigmentMask, budget, alpha: o.alpha, beta: o.beta, minGain: o.minGain })
    const chosen = picked.chosen.map((c) => cand[c])

    // Give every pixel of the FULL picture to its nearest swatch; a pile's target is the average of its pixels.
    const fullLab = histogramLab(hist)
    const area = new Float64Array(chosen.length)
    const sums = new Float64Array(chosen.length * 3)
    for (let i = 0; i < hist.size; i++) {
        let best = 0
        let bestD = Infinity
        for (let p = 0; p < chosen.length; p++) {
            const j = chosen[p]
            const d = ciede2000(fullLab[i * 3], fullLab[i * 3 + 1], fullLab[i * 3 + 2], lib.lab[j * 3], lib.lab[j * 3 + 1], lib.lab[j * 3 + 2])
            if (d < bestD) {
                bestD = d
                best = p
            }
        }
        area[best] += hist.count[i]
        for (let axis = 0; axis < 3; axis++) sums[best * 3 + axis] += hist.count[i] * hist.oklab[i * 3 + axis]
    }

    const piles: PlanPile[] = []
    chosen.forEach((j, p) => {
        if (area[p] === 0) return
        const targetHex = oklabToHex(sums[p * 3] / area[p], sums[p * 3 + 1] / area[p], sums[p * 3 + 2] / area[p])
        piles.push({ targetHex, recipe: recipeFromLibrary(lib, j, targetHex), area: area[p] / hist.total })
    })
    piles.sort((x, y) => toLab(x.recipe.predictedHex)!.l - toLab(y.recipe.predictedHex)!.l || (x.recipe.predictedHex < y.recipe.predictedHex ? -1 : 1))
    return { budget, piles }
}
