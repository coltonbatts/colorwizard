/**
 * Thread Map Web Worker: builds Full Color and Monochrome Thread Maps off the main thread.
 * Pixels stay in the browser and per-pixel maps are returned as transferred buffers.
 */

import { expose, transfer } from 'comlink'
import type { DMCThread } from '../types'
import { buildThreadMap } from './engine'
import type { ThreadMapOptions, ThreadMapResult } from './types'

export interface ThreadMapWorkerAPI {
  buildThreadMap: (
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    threads: DMCThread[],
    options: ThreadMapOptions,
  ) => Promise<ThreadMapResult>
}

const api: ThreadMapWorkerAPI = {
  async buildThreadMap(rgba, width, height, threads, options) {
    const result = buildThreadMap(rgba, width, height, threads, options)
    return transfer(result, [result.slot.buffer, result.visiblyOff.buffer])
  },
}

expose(api)
