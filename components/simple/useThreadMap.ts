'use client'

/**
 * Computes and manages the Painterly Thread Map off the main thread.
 *
 * Key architectural upgrades:
 * - Decouples canonical 512 px palette fitting from detail-scaled pixel assignment
 *   (`1024 px` in Crisp, `640 px` in Painterly, `512 px` in Broad) so switching detail
 *   preserves the exact DMC palette while upgrading spatial fidelity.
 * - Caches a deterministic, strictly monotonic progressive thread ladder (`2..30`) per
 *   photo & fitting settings so moving the thread-count slider adds/removes one skein
 *   at a time without reshuffling unrelated colors or wiping manual swaps.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { loadDmcCatalog } from '@/lib/dmc/catalog'
import {
  FULL_COLOR_MAX,
  THREAD_MAP_FIT_MAX_SIDE,
  THREAD_MAP_MAX_SIDE,
  type MonochromeTone,
  type ThreadMapDetail,
  type ThreadMapFidelity,
  type ThreadMapMode,
  type ThreadMapOptions,
  type ThreadMapResult,
} from '@/lib/dmc/map/types'
import type { DMCThread } from '@/lib/dmc/types'
import { getThreadMapWorker, resetThreadMapWorker, withTimeout, WorkerTimeoutError } from '@/lib/workers'

const WORKER_TIMEOUT_MS = 25000

export interface ThreadMapState {
  status: 'idle' | 'building' | 'ready' | 'error'
  /** Active Thread Map (includes any preserved swaps). */
  result: ThreadMapResult | null
  /** Working-copy RGBA pixels (same width × height as `result`). */
  sourcePixels: Uint8ClampedArray | null
  /** True when the user has swapped at least one thread from the computed map. */
  hasSwaps: boolean
  error: string | null
  /** Live-swaps a thread slot (persisted in caller's swap overrides so slider moves preserve it). */
  swapThread: (slotIndex: number, nextThread: DMCThread) => void
  /** Clears all manual swaps. */
  resetSwaps: () => void
}

interface Copy {
  data: Uint8ClampedArray
  width: number
  height: number
}

function makeScaledCopy(source: HTMLCanvasElement, maxSide: number): Copy | null {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height))
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

async function computeThreadLadder(
  fitCopy: Copy,
  threads: DMCThread[],
  options: {
    maxBudget: number
    fidelity: ThreadMapFidelity
    preferBox: boolean
    ownedNumbers: string[]
    lockedNumbers: string[]
    anchorBudget: number
  },
): Promise<string[]> {
  try {
    return await withTimeout(
      getThreadMapWorker().buildThreadLadder(
        new Uint8ClampedArray(fitCopy.data),
        threads,
        options,
      ),
      WORKER_TIMEOUT_MS,
      'Thread ladder worker',
    )
  } catch (error) {
    if (error instanceof WorkerTimeoutError) resetThreadMapWorker()
    const { buildThreadLadder } = await import('@/lib/dmc/map/engine')
    return buildThreadLadder(fitCopy.data, threads, options)
  }
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

/** Applies persisted swap overrides (`baseLowerNumber -> replacementNumber`) onto a ladder slice. */
function applyFullColorSwaps(
  baseNumbers: readonly string[],
  swapOverrides: Readonly<Record<string, string>>,
): { paletteNumbers: string[]; swappedNumbers: string[] } {
  const paletteNumbers: string[] = []
  const swappedNumbers: string[] = []
  const seen = new Set<string>()
  for (const base of baseNumbers) {
    const key = base.trim().toLowerCase()
    const override = swapOverrides[key]
    const chosen = override ?? base
    const chosenKey = chosen.trim().toLowerCase()
    if (seen.has(chosenKey)) continue
    seen.add(chosenKey)
    paletteNumbers.push(chosen)
    if (override && chosenKey !== key) swappedNumbers.push(chosen)
  }
  return { paletteNumbers, swappedNumbers }
}

export interface UseThreadMapConfig {
  source: HTMLCanvasElement | null
  enabled: boolean
  mode: ThreadMapMode
  budget: number
  monochromeTone: MonochromeTone
  detail: ThreadMapDetail
  fidelity: ThreadMapFidelity
  preferBox: boolean
  ownedNumbers: readonly string[]
  lockedNumbers: readonly string[]
  anchorBudget: number
  /** Persisted Full Color swap overrides (`baseLowerNumber -> replacement DMC number`). */
  swapOverrides: Readonly<Record<string, string>>
  /** Persisted Monochrome slot swaps (`slotIndex -> replacement DMC number`). */
  monoSwaps: Readonly<Record<number, string>>
  onApplyFullSwap: (baseNumber: string, nextNumber: string) => void
  onApplyMonoSwap: (slotIndex: number, nextNumber: string) => void
  onResetSwaps: () => void
}

export function useThreadMap({
  source,
  enabled,
  mode,
  budget,
  monochromeTone,
  detail,
  fidelity,
  preferBox,
  ownedNumbers,
  lockedNumbers,
  anchorBudget,
  swapOverrides,
  monoSwaps,
  onApplyFullSwap,
  onApplyMonoSwap,
  onResetSwaps,
}: UseThreadMapConfig): ThreadMapState {
  const [state, setState] = useState<{
    status: 'idle' | 'building' | 'ready' | 'error'
    result: ThreadMapResult | null
    error: string | null
    source: HTMLCanvasElement | null
    copyKey: number
  }>({
    status: 'idle',
    result: null,
    error: null,
    source: null,
    copyKey: THREAD_MAP_FIT_MAX_SIDE,
  })

  // Cache scaled copies per source (`512`, `640`, `1024`).
  const copiesRef = useRef<{ source: HTMLCanvasElement; byMaxSide: Map<number, Copy | null> } | null>(null)
  const getCopy = (src: HTMLCanvasElement, maxSide: number): Copy | null => {
    if (copiesRef.current?.source !== src) {
      copiesRef.current = { source: src, byMaxSide: new Map() }
    }
    const cache = copiesRef.current.byMaxSide
    if (!cache.has(maxSide)) {
      cache.set(maxSide, makeScaledCopy(src, maxSide))
    }
    return cache.get(maxSide) ?? null
  }

  // Cache monotonic Full Color ladder per (source, fitting options).
  const ladderCacheRef = useRef<{ source: HTMLCanvasElement; key: string; ladder: string[] } | null>(null)

  const activeOwnedKey = preferBox ? ownedNumbers.join('\u0000') : ''
  const activeOwned = useMemo(
    () => (preferBox ? [...ownedNumbers] : []),
    [preferBox, activeOwnedKey], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const activeLockedKey = mode === 'full-color' ? lockedNumbers.join('\u0000') : ''
  const activeLocked = useMemo(
    () => (mode === 'full-color' ? [...lockedNumbers] : []),
    [mode, activeLockedKey], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const swapOverridesKey = useMemo(() => JSON.stringify(swapOverrides), [swapOverrides])
  const monoSwapsKey = useMemo(() => JSON.stringify(monoSwaps), [monoSwaps])

  useEffect(() => {
    if (!source || !enabled) return
    let cancelled = false

    const assignMaxSide = THREAD_MAP_MAX_SIDE[detail]
    const fitCopy = getCopy(source, THREAD_MAP_FIT_MAX_SIDE)
    const assignCopy = getCopy(source, assignMaxSide)
    if (!fitCopy || !assignCopy) {
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
      result: prev.source === source ? prev.result : null,
    }))

    // Brief settle window only when scrubbing the budget slider rapidly.
    const sameNonBudgetOptions =
      state.source === source
      && state.result !== null
      && state.result.mode === mode
      && state.result.detail === detail
      && state.result.fidelity === fidelity
      && (mode !== 'monochrome' || state.result.monochromeTone === monochromeTone)
      && state.result.preferBox === (preferBox && activeOwned.length > 0)
    const delayMs = sameNonBudgetOptions ? 55 : 0

    const ladderKey = [
      fidelity,
      preferBox && activeOwned.length > 0 ? activeOwnedKey : '',
      activeLockedKey,
      String(anchorBudget),
    ].join('\u0001')

    const timer = window.setTimeout(() => {
      loadDmcCatalog()
        .then(async (catalog) => {
          if (mode === 'full-color') {
            let ladder: string[]
            if (
              ladderCacheRef.current?.source === source
              && ladderCacheRef.current.key === ladderKey
            ) {
              ladder = ladderCacheRef.current.ladder
            } else {
              ladder = await computeThreadLadder(fitCopy, catalog.threads, {
                maxBudget: FULL_COLOR_MAX,
                fidelity,
                preferBox: preferBox && activeOwned.length > 0,
                ownedNumbers: activeOwned,
                lockedNumbers: activeLocked,
                anchorBudget,
              })
              if (!cancelled) {
                ladderCacheRef.current = { source, key: ladderKey, ladder }
              }
            }

            const baseSlice = ladder.slice(0, Math.min(budget, ladder.length))
            const { paletteNumbers, swappedNumbers } = applyFullColorSwaps(baseSlice, swapOverrides)
            const next = await computeThreadMap(assignCopy, catalog.threads, {
              mode: 'full-color',
              budget,
              detail,
              fidelity,
              preferBox: preferBox && activeOwned.length > 0,
              ownedNumbers: activeOwned,
              lockedNumbers: activeLocked,
              paletteNumbers,
              swappedNumbers,
              anchorBudget,
            })
            return { ...next, ladder }
          }

          // Monochrome mode: build ramp, then replay any persisted slot swaps.
          let next = await computeThreadMap(assignCopy, catalog.threads, {
            mode: 'monochrome',
            budget,
            monochromeTone,
            detail,
            fidelity,
            preferBox: preferBox && activeOwned.length > 0,
            ownedNumbers: activeOwned,
          })
          const monoEntries = Object.entries(monoSwaps)
          if (monoEntries.length > 0) {
            const byNumber = new Map<string, DMCThread>()
            for (const t of catalog.threads) byNumber.set(t.number.toLowerCase(), t)
            const { swapMapThread } = await import('@/lib/dmc/map/engine')
            for (const [idxStr, dmcNum] of monoEntries) {
              const slotIdx = Number(idxStr)
              const thread = byNumber.get(dmcNum.trim().toLowerCase())
              if (thread && Number.isInteger(slotIdx) && slotIdx >= 0 && slotIdx < next.slots.length) {
                next = swapMapThread(next, assignCopy.data, slotIdx, thread)
              }
            }
          }
          return next
        })
        .then((next) => {
          if (!cancelled) {
            setState({
              status: 'ready',
              result: next,
              error: null,
              source,
              copyKey: assignMaxSide,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    source,
    enabled,
    mode,
    budget,
    monochromeTone,
    detail,
    fidelity,
    preferBox,
    activeOwned,
    activeLocked,
    anchorBudget,
    swapOverridesKey,
    monoSwapsKey,
  ])

  const swapThread = (slotIndex: number, nextThread: DMCThread) => {
    const active = state.source === source ? state.result : null
    if (!active || slotIndex < 0 || slotIndex >= active.slots.length) return
    const currentNumber = active.slots[slotIndex].thread.number
    if (currentNumber.toLowerCase() === nextThread.number.toLowerCase()) return

    if (mode === 'monochrome') {
      onApplyMonoSwap(slotIndex, nextThread.number)
      return
    }

    // Resolve the original base thread number (if this slot was already swapped before).
    const curLower = currentNumber.toLowerCase()
    let baseKey = curLower
    for (const [origKey, mappedNum] of Object.entries(swapOverrides)) {
      if (mappedNum.toLowerCase() === curLower) {
        baseKey = origKey
        break
      }
    }
    onApplyFullSwap(baseKey, nextThread.number)
  }

  const current = state.source === source
  const result = current ? state.result : null
  const activeCopy = current && copiesRef.current?.source === source
    ? copiesRef.current.byMaxSide.get(state.copyKey) ?? null
    : null
  const hasSwaps = Boolean(
    result && (
      result.slots.some((s) => s.swapped)
      || (mode === 'full-color' && Object.keys(swapOverrides).length > 0)
      || (mode === 'monochrome' && Object.keys(monoSwaps).length > 0)
    ),
  )

  return {
    status: current ? state.status : 'idle',
    result,
    sourcePixels: activeCopy?.data ?? null,
    hasSwaps,
    error: current ? state.error : null,
    swapThread,
    resetSwaps: onResetSwaps,
  }
}
