/**
 * The painting-process view's data hooks, kept apart from `ProcessPanel` so the panel's
 * code can load on first use while `SimpleApp` still calls these on every render.
 */

import { useMemo } from 'react'
import { buildStages, frameAt, STAGE_IDS, type ProcessStages } from '@/lib/paint/process/stages'
import { planningCopy } from './usePlan'

export const LAST_STAGE = STAGE_IDS.length - 1

/** The stages of the open picture, worked out once per picture while the view is open. */
export function useProcessStages(source: HTMLCanvasElement | null, enabled: boolean): ProcessStages | null {
  return useMemo(() => {
    if (!source || !enabled) return null
    const copy = planningCopy(source)
    return copy ? buildStages(copy.data, copy.width, copy.height) : null
  }, [source, enabled])
}

/** The canvas the stage shows at slider position `t`. */
export function useProcessDisplay(stages: ProcessStages | null, t: number): HTMLCanvasElement | null {
  return useMemo(() => {
    if (!stages) return null
    const canvas = document.createElement('canvas')
    canvas.width = stages.width
    canvas.height = stages.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const image = ctx.createImageData(stages.width, stages.height)
    image.data.set(frameAt(stages.frames, t))
    ctx.putImageData(image, 0, 0)
    return canvas
  }, [stages, t])
}
