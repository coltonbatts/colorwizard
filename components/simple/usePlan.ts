'use client'

/**
 * Plans the open picture for a pile budget and a palette, off the main thread, and keeps
 * the last finished plan on screen (marked stale) while the next one is made.
 *
 * The picture is planned from a copy of at most 512 px on the long side; nothing is
 * uploaded. If the worker is unavailable or hangs, the same code runs on the main thread.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { PicturePlan } from '@/lib/paint/plan/picture'
import type { Pigment } from '@/lib/spectral/types'
import { getPlanWorker } from '@/lib/workers'

export const PLAN_MAX_SIDE = 512
const WORKER_TIMEOUT_MS = 20000

export interface PlanState {
  status: 'idle' | 'planning' | 'ready' | 'error'
  /** The latest finished plan for this picture (from an earlier budget or palette while planning) */
  result: PicturePlan | null
  /** Budget the result was planned for */
  resultBudget: number | null
  error: string | null
}

interface Copy {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** A copy of the picture small enough to plan quickly. */
function planningCopy(source: HTMLCanvasElement): Copy | null {
  const scale = Math.min(1, PLAN_MAX_SIDE / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return { data: ctx.getImageData(0, 0, width, height).data, width, height }
}

async function plan(copy: Copy, budget: number, pigments: Pigment[]): Promise<PicturePlan> {
  try {
    const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Plan worker timed out')), WORKER_TIMEOUT_MS))
    // The worker gets its own copy of the pixels; ours stays for a fallback or the next budget.
    return await Promise.race([getPlanWorker().planPicture(new Uint8ClampedArray(copy.data), copy.width, copy.height, budget, pigments), timeout])
  } catch {
    const { planPicture } = await import('@/lib/paint/plan/picture')
    return planPicture(copy.data, copy.width, copy.height, budget, pigments)
  }
}

export function usePicturePlan(source: HTMLCanvasElement | null, enabled: boolean, budget: number, pigments: Pigment[]): PlanState {
  const [state, setState] = useState<PlanState & { source: HTMLCanvasElement | null }>({ status: 'idle', result: null, resultBudget: null, error: null, source: null })
  const copyRef = useRef<{ source: HTMLCanvasElement; copy: Copy | null } | null>(null)
  // Only re-plan when the tubes really change, not whenever the palette array is re-created.
  const pigmentsKey = useMemo(() => JSON.stringify(pigments.map((p) => [p.id, p.hex, p.tintingStrength])), [pigments])
  const stablePigments = useMemo(() => pigments, [pigmentsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!source || !enabled) return
    let cancelled = false
    if (copyRef.current?.source !== source) copyRef.current = { source, copy: planningCopy(source) }
    const copy = copyRef.current.copy
    if (!copy) {
      setState((s) => ({ ...s, status: 'error', error: 'Couldn’t read this picture to plan it.', source }))
      return
    }
    setState((s) => ({ ...s, status: 'planning', error: null, source, result: s.source === source ? s.result : null, resultBudget: s.source === source ? s.resultBudget : null }))
    plan(copy, budget, stablePigments)
      .then((result) => {
        if (!cancelled) setState({ status: 'ready', result, resultBudget: budget, error: null, source })
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, status: 'error', error: 'This paint set can’t make a plan for this picture.', source }))
      })
    return () => {
      cancelled = true
    }
  }, [source, enabled, budget, stablePigments])

  const current = state.source === source
  return { status: current ? state.status : 'idle', result: current ? state.result : null, resultBudget: current ? state.resultBudget : null, error: current ? state.error : null }
}
