/**
 * Thread Map Web Worker: builds Full Color ladders and high-resolution Thread Maps off the main thread.
 * Pixels stay in the browser and per-pixel maps are returned as transferred buffers.
 */

import { expose, transfer } from 'comlink'
import type { DMCThread } from '../types'
import { buildThreadLadder, buildThreadMap } from './engine'
import type { ThreadMapFidelity, ThreadMapOptions, ThreadMapResult } from './types'

export interface ThreadMapLadderOptions {
  maxBudget?: number
  fidelity?: ThreadMapFidelity
  preferBox?: boolean
  ownedNumbers?: readonly string[]
  lockedNumbers?: readonly string[]
  anchorBudget?: number
}

export interface ThreadMapWorkerAPI {
  buildThreadLadder: (
    rgba: Uint8ClampedArray,
    threads: DMCThread[],
    options?: ThreadMapLadderOptions,
  ) => Promise<string[]>
  buildThreadMap: (
    rgba: Uint8ClampedArray,
    width: number,
    height: number,
    threads: DMCThread[],
    options: ThreadMapOptions,
  ) => Promise<ThreadMapResult>
}

const api: ThreadMapWorkerAPI = {
  async buildThreadLadder(rgba, threads, options) {
    return buildThreadLadder(rgba, threads, options)
  },
  async buildThreadMap(rgba, width, height, threads, options) {
    const result = buildThreadMap(rgba, width, height, threads, options)
    return transfer(result, [result.slot.buffer, result.visiblyOff.buffer])
  },
}

expose(api)
