/**
 * Pure, immutable Undo/Redo history stack for Thread Map studio controls.
 * Coalesces rapid slider drags into a single undoable step so Cmd+Z feels calm and intentional.
 * Also serves as the JSON-serializable state shape for Studio Save States.
 */

import type {
  MonochromeTone,
  ThreadMapDetail,
  ThreadMapFidelity,
  ThreadMapMode,
} from './types'

export interface ThreadMapControlSnapshot {
  mode: ThreadMapMode
  fullColorBudget: number
  monochromeBudget: number
  monochromeTone: MonochromeTone
  detail: ThreadMapDetail
  fidelity: ThreadMapFidelity
  preferBox: boolean
  lockedNumbers: string[]
  /** Full Color swap overrides (`baseLowerNumber -> replacement DMC number`). */
  swapOverrides: Record<string, string>
  /** Monochrome slot-index swap overrides (`slotIndex -> replacement DMC number`). */
  monoSwaps: Record<number, string>
  /** Global k-medoids anchor count for the monotonic progressive ladder. */
  anchorBudget: number
}

export interface ThreadMapHistory {
  past: ThreadMapControlSnapshot[]
  present: ThreadMapControlSnapshot
  future: ThreadMapControlSnapshot[]
  lastPushTag: string | null
  lastPushAt: number
}

const MAX_HISTORY = 40
const DEFAULT_COALESCE_MS = 550

export function cloneSnapshot(s: ThreadMapControlSnapshot): ThreadMapControlSnapshot {
  return {
    ...s,
    lockedNumbers: [...s.lockedNumbers],
    swapOverrides: { ...s.swapOverrides },
    monoSwaps: { ...s.monoSwaps },
  }
}

export function snapshotsEqual(a: ThreadMapControlSnapshot, b: ThreadMapControlSnapshot): boolean {
  if (
    a.mode !== b.mode
    || a.fullColorBudget !== b.fullColorBudget
    || a.monochromeBudget !== b.monochromeBudget
    || a.monochromeTone !== b.monochromeTone
    || a.detail !== b.detail
    || a.fidelity !== b.fidelity
    || a.preferBox !== b.preferBox
    || a.anchorBudget !== b.anchorBudget
    || a.lockedNumbers.length !== b.lockedNumbers.length
  ) {
    return false
  }
  for (let i = 0; i < a.lockedNumbers.length; i++) {
    if (a.lockedNumbers[i] !== b.lockedNumbers[i]) return false
  }
  const aSwaps = Object.keys(a.swapOverrides)
  const bSwaps = Object.keys(b.swapOverrides)
  if (aSwaps.length !== bSwaps.length) return false
  for (const k of aSwaps) {
    if (a.swapOverrides[k] !== b.swapOverrides[k]) return false
  }
  const aMono = Object.keys(a.monoSwaps)
  const bMono = Object.keys(b.monoSwaps)
  if (aMono.length !== bMono.length) return false
  for (const k of aMono) {
    const idx = Number(k)
    if (a.monoSwaps[idx] !== b.monoSwaps[idx]) return false
  }
  return true
}

export function createThreadMapHistory(initial: ThreadMapControlSnapshot): ThreadMapHistory {
  return {
    past: [],
    present: cloneSnapshot(initial),
    future: [],
    lastPushTag: null,
    lastPushAt: 0,
  }
}

export function pushThreadMapHistory(
  history: ThreadMapHistory,
  next: ThreadMapControlSnapshot,
  options?: { coalesceTag?: string; now?: number; coalesceMs?: number },
): ThreadMapHistory {
  if (snapshotsEqual(history.present, next)) return history
  const now = options?.now ?? Date.now()
  const tag = options?.coalesceTag ?? null
  const coalesceMs = options?.coalesceMs ?? DEFAULT_COALESCE_MS

  // Rapid ticks with the same coalesceTag (e.g. dragging the thread-count slider)
  // replace `present` in place so Undo reverts the whole drag in one step.
  if (
    tag !== null
    && tag === history.lastPushTag
    && history.past.length > 0
    && now - history.lastPushAt <= coalesceMs
  ) {
    return {
      past: history.past,
      present: cloneSnapshot(next),
      future: [],
      lastPushTag: tag,
      lastPushAt: now,
    }
  }

  const nextPast = [...history.past, history.present]
  if (nextPast.length > MAX_HISTORY) nextPast.splice(0, nextPast.length - MAX_HISTORY)
  return {
    past: nextPast,
    present: cloneSnapshot(next),
    future: [],
    lastPushTag: tag,
    lastPushAt: now,
  }
}

export function undoThreadMapHistory(history: ThreadMapHistory): ThreadMapHistory {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastPushTag: null,
    lastPushAt: 0,
  }
}

export function redoThreadMapHistory(history: ThreadMapHistory): ThreadMapHistory {
  if (history.future.length === 0) return history
  const [next, ...rest] = history.future
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
    lastPushTag: null,
    lastPushAt: 0,
  }
}
