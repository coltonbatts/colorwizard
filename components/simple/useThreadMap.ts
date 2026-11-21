'use client'

/**
 * Computes and manages the Painterly Thread Map off the main thread on a ≤512 px copy of
 * the open photo. Keeps the last finished map visible (marked stale) while the next one builds,
 * and supports instant live thread swaps with one-click reset.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadDmcCatalog } from '@/lib/dmc/catalog'
import { swapMapThread } from '@/lib/dmc/map/engine'
import type { MonochromeTone, ThreadMapMode, ThreadMapOptions, ThreadMapResult } from '@/lib/dmc/map/types'
import type { DMCThread } from '@/lib/dmc/types'
import { getThreadMapWorker, resetThreadMapWorker, withTimeout, WorkerTimeoutError } from '@/lib/workers'
import { planningCopy } from './usePlan'

const WORKER_TIMEOUT_MS = 20000

export interface ThreadMapState {
  status: 'idle' | 'building' | 'ready' | 'error'
  /** Active Thread Map (includes any live swaps). */
  result: ThreadMapResult | null
  /** Working-copy RGBA pixels (same width × height as `result`) for tracing-paper isolation context. */
  sourcePixels: Uint8ClampedArray | null
  /** True when the user has swapped at least one thread from the computed map. */
  hasSwaps: boolean
  error: string | null
  swapThread: (slotIndex: number, nextThread: DMCThread) => void
  resetSwaps: () => void
}

interface Copy {
  data: Uint8ClampedArray
  width: number
  height: number
}

async function computeThreadMap(
  copy: Copy,
  threads: DMCThread[],
  options: ThreadMapOptions,
): Promise<ThreadMapResult> {
  try {
    return await withTimeout(
      getThreadMapWorker().buildThreadMap(
        new Uint8ClampedArray(copy.data),
        copy.width,
        copy.height,
        threads,
        options,
      ),
      WORKER_TIMEOUT_MS,
      'Thread map worker',
    )
  } catch (error) {
    if (error instanceof WorkerTimeoutError) resetThreadMapWorker()
    const { buildThreadMap } = await import('@/lib/dmc/map/engine')
    return buildThreadMap(copy.data, copy.width, copy.height, threads, options)
  }
}

export function useThreadMap(
  source: HTMLCanvasElement | null,
  enabled: boolean,
  mode: ThreadMapMode,
  budget: number,
  monochromeTone: MonochromeTone,
  preferBox: boolean,
  ownedNumbers: readonly string[],
): ThreadMapState {
  const [state, setState] = useState<{
    status: 'idle' | 'building' | 'ready' | 'error'
    baseResult: ThreadMapResult | null
    result: ThreadMapResult | null
    error: string | null
    source: HTMLCanvasElement | null
  }>({
    status: 'idle',
    baseResult: null,
    result: null,
    error: null,
    source: null,
  })

  const copyRef = useRef<{ source: HTMLCanvasElement; copy: Copy | null } | null>(null)
  // Only re-run when owned numbers change if `preferBox` is actually turned on.
  const activeOwnedKey = preferBox ? ownedNumbers.join('\u0000') : ''
  const activeOwned = useMemo(
    () => (preferBox ? [...ownedNumbers] : []),
    [preferBox, activeOwnedKey], // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    if (!source || !enabled) return
    let cancelled = false

    if (copyRef.current?.source !== source) {
      copyRef.current = { source, copy: planningCopy(source) }
    }
    const copy = copyRef.current.copy
    if (!copy) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: 'Couldn’t read this photo to build a thread map.',
        source,
      }))
      return
    }

    setState((prev) => ({
      ...prev,
      status: 'building',
      error: null,
      source,
      baseResult: prev.source === source ? prev.baseResult : null,
      result: prev.source === source ? prev.result : null,
    }))

    // Brief settle window ONLY when scrubbing the thread-count slider (mode/tone switches stay instant).
    const sameModeAndTone =
      state.source === source
      && state.result !== null
      && state.result.mode === mode
      && (mode !== 'monochrome' || state.result.monochromeTone === monochromeTone)
      && state.result.preferBox === (preferBox && activeOwned.length > 0)
    const delayMs = sameModeAndTone ? 65 : 0
    const timer = window.setTimeout(() => {
      loadDmcCatalog()
        .then((catalog) =>
          computeThreadMap(copy, catalog.threads, {
            mode,
            budget,
            monochromeTone: mode === 'monochrome' ? monochromeTone : undefined,
            preferBox: preferBox && activeOwned.length > 0,
            ownedNumbers: activeOwned,
          }),
        )
        .then((next) => {
          if (!cancelled) {
            setState({
              status: 'ready',
              baseResult: next,
              result: next,
              error: null,
              source,
            })
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState((prev) => ({
              ...prev,
              status: 'error',
              error: 'Couldn’t build a thread map for this photo right now.',
              source,
            }))
          }
        })
    }, delayMs)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [source, enabled, mode, budget, monochromeTone, preferBox, activeOwned]) // eslint-disable-line react-hooks/exhaustive-deps

  const swapThread = useCallback((slotIndex: number, nextThread: DMCThread) => {
    setState((prev) => {
      if (!prev.result || !prev.source) return prev
      const copy = copyRef.current?.source === prev.source ? copyRef.current.copy : null
      if (!copy) return prev
      const next = swapMapThread(prev.result, copy.data, slotIndex, nextThread)
      return { ...prev, result: next }
    })
  }, [])

  const resetSwaps = useCallback(() => {
    setState((prev) => (prev.baseResult ? { ...prev, result: prev.baseResult } : prev))
  }, [])

  const current = state.source === source
  const result = current ? state.result : null
  const sourcePixels = current && copyRef.current?.source === source
    ? copyRef.current.copy?.data ?? null
    : null
  const hasSwaps = Boolean(result && result.slots.some((s) => s.swapped))

  return {
    status: current ? state.status : 'idle',
    result,
    sourcePixels,
    hasSwaps,
    error: current ? state.error : null,
    swapThread,
    resetSwaps,
  }
}
