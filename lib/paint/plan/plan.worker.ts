/**
 * Plan Web Worker: plans a picture off the main thread. The picture's pixels are copied in
 * and never leave the browser; the per-pixel maps come back as transferred buffers.
 */
import { expose, transfer } from 'comlink'
import type { Pigment } from '../../spectral/types'
import { planPicture, type PicturePlan } from './picture'
import type { PlanOptions } from './plan'

export interface PlanWorkerAPI {
    planPicture: (rgba: Uint8ClampedArray, width: number, height: number, budget: number, pigments: Pigment[], options?: PlanOptions) => Promise<PicturePlan>
}

const api: PlanWorkerAPI = {
    async planPicture(rgba, width, height, budget, pigments, options) {
        const result = await planPicture(rgba, width, height, budget, pigments, options)
        return transfer(result, [result.pile.buffer, result.miss.buffer])
    },
}

expose(api)
