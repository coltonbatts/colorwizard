/**
 * Plan a picture end to end: pixels in, a plan and a per-pixel map of which pile paints
 * each pixel out. Pure and browser-safe; the app runs it in a worker.
 *
 * Numbers are measured on the pixels given (the app passes a copy of at most 512 px on the
 * long side), against spectral.js's forward model: they show how well the piles repaint the
 * picture on screen, not that mixed paint would match.
 */
import { buildHistogram } from './histogram'
import { assignPixels, scorePlan, VISIBLE_MISS, type PlanScore } from './metrics'
import { makePlan, type PlanOptions } from './plan'
import type { Plan } from './types'
import type { Pigment } from '../../spectral/types'

/** `pile` value for a pixel that is transparent and belongs to no pile. */
export const NO_PILE = 255

export interface PicturePlan {
    plan: Plan
    score: PlanScore
    width: number
    height: number
    /** Pile index (into plan.piles) of every pixel, row by row; NO_PILE for transparent pixels */
    pile: Uint8Array
    /** 1 where a pixel is more than 5 ΔE00 from the swatch of its pile */
    miss: Uint8Array
    /** How long planning took, in ms */
    ms: number
}

/** `rgba` is 4 bytes per pixel, as ImageData.data. */
export async function planPicture(
    rgba: ArrayLike<number>,
    width: number,
    height: number,
    budget: number,
    pigments: Pigment[],
    options?: PlanOptions,
): Promise<PicturePlan> {
    const t0 = performance.now()
    const hist = buildHistogram(rgba)
    if (hist.size === 0) throw new Error('The picture has no visible pixels')
    const plan = await makePlan(hist, budget, pigments, options)
    const assignment = assignPixels(hist, plan)
    const score = scorePlan(hist, plan, 'swatch', assignment)

    // Histogram entries are in ascending packed-RGB order; look each pixel's color up.
    const entryOf = new Map<number, number>()
    for (let i = 0; i < hist.size; i++) entryOf.set((hist.rgb[i * 3] << 16) | (hist.rgb[i * 3 + 1] << 8) | hist.rgb[i * 3 + 2], i)

    const pile = new Uint8Array(width * height).fill(NO_PILE)
    const miss = new Uint8Array(width * height)
    for (let p = 0; p < width * height; p++) {
        if (rgba[p * 4 + 3] < 128) continue
        const entry = entryOf.get((rgba[p * 4] << 16) | (rgba[p * 4 + 1] << 8) | rgba[p * 4 + 2])!
        pile[p] = assignment.pile[entry]
        miss[p] = assignment.deltaE00[entry] > VISIBLE_MISS ? 1 : 0
    }
    return { plan, score, width, height, pile, miss, ms: performance.now() - t0 }
}

