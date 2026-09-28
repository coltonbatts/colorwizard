/**
 * How good is a plan? Everything here is measured against the plan's own PREDICTED
 * swatches (recipe.predictedHex, spectral.js's forward model), not the ideal cluster
 * centers the piles were solved for, and it is area-weighted: every pixel counts once.
 *
 * Like the per-color benchmark, this scores a plan against the model. It shows how well
 * the piles repaint the picture on screen; it does NOT show that the mixed paint would
 * match the picture. There are no measured swatches in the repo.
 *
 * Pure and browser-safe: the UI shows these same numbers.
 */
import { converter } from 'culori'
import { hexToRgb, srgb8ToOklab } from './color'
import { ciede2000 } from './deltaE'
import type { Histogram } from './histogram'
import type { Plan } from './types'

const toLab = converter('lab65')

type Lab = { mode: 'lab65'; l: number; a: number; b: number }

/** ΔE00 above this is a visible miss (the "Poor" band of the match labels). */
export const VISIBLE_MISS = 5

/** A pile with less area than this is a minor pile: it spends a pile on a sliver of the picture. */
export const MINOR_AREA = 0.02

const labCache = new WeakMap<Histogram, Float64Array>()

/** CIELAB D65 of every histogram color (l, a, b per entry), computed once per histogram. */
export function histogramLab(hist: Histogram): Float64Array {
    let labs = labCache.get(hist)
    if (!labs) {
        labs = new Float64Array(hist.size * 3)
        for (let i = 0; i < hist.size; i++) {
            const lab = toLab({ mode: 'rgb', r: hist.rgb[i * 3] / 255, g: hist.rgb[i * 3 + 1] / 255, b: hist.rgb[i * 3 + 2] / 255 })!
            labs.set([lab.l, lab.a, lab.b], i * 3)
        }
        labCache.set(hist, labs)
    }
    return labs
}

export function hexLab(hex: string): Lab {
    const lab = toLab(hex)!
    return { mode: 'lab65', l: lab.l, a: lab.a, b: lab.b }
}

export function quantile(values: number[], q: number): number {
    if (values.length === 0) return NaN
    const sorted = [...values].sort((a, b) => a - b)
    const pos = (sorted.length - 1) * q
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export const mean = (values: number[]) => (values.length === 0 ? NaN : values.reduce((s, v) => s + v, 0) / values.length)

export interface Assignment {
    /** Pile index of every histogram entry */
    pile: Uint16Array
    /** ΔE00 from every histogram entry to its pile's predicted swatch */
    deltaE00: Float64Array
}

/**
 * How pixels are given to piles.
 * 'swatch' (default): each color goes to the pile whose predicted swatch is nearest in ΔE00.
 *   This is the best possible repaint with these piles, and what the app shows.
 * 'center': each color goes to the pile whose solved-for target is nearest in OKLab, which is
 *   how the naive plan's clusters were formed. Scored against the swatch all the same.
 */
export type AssignMode = 'swatch' | 'center'

export function assignPixels(hist: Histogram, plan: Plan, mode: AssignMode = 'swatch'): Assignment {
    const labs = histogramLab(hist)
    const swatches = plan.piles.map((pile) => hexLab(pile.recipe.predictedHex))
    const targets = mode === 'center' ? plan.piles.map((pile) => srgb8ToOklab(...hexToRgb(pile.targetHex))) : []
    const pile = new Uint16Array(hist.size)
    const deltaE00 = new Float64Array(hist.size)

    for (let i = 0; i < hist.size; i++) {
        const l = labs[i * 3]
        const a = labs[i * 3 + 1]
        const b = labs[i * 3 + 2]
        let best = 0
        if (mode === 'swatch') {
            let bestD = Infinity
            for (let p = 0; p < swatches.length; p++) {
                const d = ciede2000(l, a, b, swatches[p].l, swatches[p].a, swatches[p].b)
                if (d < bestD) {
                    bestD = d
                    best = p
                }
            }
        } else {
            let bestD = Infinity
            for (let p = 0; p < targets.length; p++) {
                const dL = hist.oklab[i * 3] - targets[p][0]
                const da = hist.oklab[i * 3 + 1] - targets[p][1]
                const db = hist.oklab[i * 3 + 2] - targets[p][2]
                const d = dL * dL + da * da + db * db
                if (d < bestD) {
                    bestD = d
                    best = p
                }
            }
        }
        pile[i] = best
        deltaE00[i] = ciede2000(l, a, b, swatches[best].l, swatches[best].a, swatches[best].b)
    }
    return { pile, deltaE00 }
}

function weightedQuantile(values: Float64Array, weights: Float64Array, q: number): number {
    const order = Array.from(values.keys()).sort((a, b) => values[a] - values[b])
    const total = weights.reduce((s, w) => s + w, 0)
    let seen = 0
    for (const i of order) {
        seen += weights[i]
        if (seen >= q * total) return values[i]
    }
    return values[order[order.length - 1]]
}

export interface PlanScore {
    pileCount: number
    /** Area-weighted mean ΔE00 between each pixel and the predicted swatch of its pile */
    meanDeltaE00: number
    p95DeltaE00: number
    /** Area-weighted mean |ΔL*|: how far off the plan is in value alone (painters mass by value first) */
    meanValueError: number
    /** Share of pixels whose pile is labeled Poor (its swatch is over 5 ΔE00 from what the pile was solved for) */
    unreachableArea: number
    /** Share of pixels more than 5 ΔE00 from their pile's swatch, whatever the pile's own label says */
    visiblyOffArea: number
    /**
     * Whole parts to measure across all piles: a scratch pile's parts, or for a derived pile the
     * parts of its base it uses plus its extra parts (the base is counted once, as its own pile)
     */
    totalParts: number
    /** Piles mixed from another pile, and piles mixed from scratch (shared-base score = derived / pileCount) */
    derivedPiles: number
    scratchPiles: number
    /** Piles with no clean whole-part ratio (percentages only) */
    unpaintablePiles: number
    /** Different pigments used anywhere in the plan */
    distinctPigments: number
    /** Piles that cover under 2% of the picture */
    minorPiles: number
    /** Share of the picture each pile ends up covering, in pile order */
    pileAreas: number[]
    /** Mean ΔE00 within each pile, in pile order (NaN for a pile nothing uses) */
    pileMeanDeltaE00: number[]
}

/** Parts a painter measures for this pile as the plan lists it. */
export function listedParts(pile: Plan['piles'][number]): number {
    if (pile.derived) return pile.derived.baseParts + pile.derived.extra.reduce((sum, e) => sum + e.parts, 0)
    return pile.recipe.paintable ? (pile.recipe.totalParts ?? 0) : 0
}

export function scorePlan(hist: Histogram, plan: Plan, mode: AssignMode = 'swatch'): PlanScore {
    const { pile, deltaE00 } = assignPixels(hist, plan, mode)
    const labs = histogramLab(hist)
    const swatches = plan.piles.map((p) => hexLab(p.recipe.predictedHex))

    const area = new Float64Array(plan.piles.length)
    const errorSum = new Float64Array(plan.piles.length)
    let valueSum = 0
    let off = 0
    let unreachable = 0
    let errorTotal = 0
    for (let i = 0; i < hist.size; i++) {
        const n = hist.count[i]
        const p = pile[i]
        area[p] += n
        errorSum[p] += n * deltaE00[i]
        errorTotal += n * deltaE00[i]
        valueSum += n * Math.abs(labs[i * 3] - swatches[p].l)
        if (deltaE00[i] > VISIBLE_MISS) off += n
        if (plan.piles[p].recipe.matchQuality === 'Poor') unreachable += n
    }

    const pigments = new Set<string>()
    for (const p of plan.piles) for (const ingredient of p.recipe.ingredients) pigments.add(ingredient.pigment.id)

    return {
        pileCount: plan.piles.length,
        meanDeltaE00: errorTotal / hist.total,
        p95DeltaE00: weightedQuantile(deltaE00, hist.count, 0.95),
        meanValueError: valueSum / hist.total,
        unreachableArea: unreachable / hist.total,
        visiblyOffArea: off / hist.total,
        totalParts: plan.piles.reduce((sum, p) => sum + listedParts(p), 0),
        derivedPiles: plan.piles.filter((p) => p.derived).length,
        scratchPiles: plan.piles.filter((p) => !p.derived).length,
        unpaintablePiles: plan.piles.filter((p) => p.recipe.paintable !== true).length,
        distinctPigments: pigments.size,
        minorPiles: Array.from(area).filter((a) => a / hist.total < MINOR_AREA).length,
        pileAreas: Array.from(area, (a) => a / hist.total),
        pileMeanDeltaE00: Array.from(errorSum, (sum, p) => (area[p] > 0 ? sum / area[p] : NaN)),
    }
}
