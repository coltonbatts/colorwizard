'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createThreadMapHistory,
  pushThreadMapHistory,
  redoThreadMapHistory,
  undoThreadMapHistory,
  type ThreadMapControlSnapshot,
  type ThreadMapHistory,
} from '@/lib/dmc/map/history'
import {
  DEFAULT_THREAD_MAP_PREFS,
  loadThreadMapPrefs,
  storeThreadMapPrefs,
  type ThreadMapPrefs,
} from '@/lib/dmc/map/prefs'
import type {
  FullColorBudget,
  MonochromeBudget,
  MonochromeTone,
  ThreadMapDetail,
  ThreadMapFidelity,
  ThreadMapMode,
} from '@/lib/dmc/map/types'
import { placeLabels } from '@/lib/paint/plan/labels'
import { useDmcStore } from '@/lib/store/useDmcStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  compileThreadMapPaths,
  createThreadMapCanvasRenderer,
  createThreadMapNavigatorRenderer,
  withThreadMapVisiblyOff,
  type ThreadMapSwapPreview,
  type VellumMode,
} from './threadMapCanvas'
import { renderThreadMap, renderThreadMapOutline, slotBounds, threadSlotAt } from './threadMapRender'
import { useThreadMap } from './useThreadMap'
import type { FocusRegion } from './SimpleCanvas'
import type { StudioTab, ThreadSavePayload } from './ThreadStudio'

export const PHONE_VIEW_KEY = 'colorwizard-simple-phone-view'
export type AppSection = 'color' | 'thread'

export function loadSection(storage?: Pick<Storage, 'getItem'>): AppSection {
  try {
    const store = storage ?? window.localStorage
    return store.getItem(PHONE_VIEW_KEY) === 'thread' ? 'thread' : 'color'
  } catch {
    return 'color'
  }
}

export function storeSection(section: AppSection, storage?: Pick<Storage, 'setItem'>): void {
  try {
    const store = storage ?? window.localStorage
    store.setItem(PHONE_VIEW_KEY, section === 'thread' ? 'thread' : 'all')
  } catch {
    /* the view is a convenience; a blocked store only means choosing it again next time */
  }
}

export function snapshotFromPrefs(prefs: ThreadMapPrefs): ThreadMapControlSnapshot {
  return {
    mode: prefs.mode,
    fullColorBudget: prefs.fullColorBudget,
    monochromeBudget: prefs.monochromeBudget,
    monochromeTone: prefs.monochromeTone,
    detail: prefs.detail,
    fidelity: prefs.fidelity,
    preferBox: prefs.preferBox,
    lockedNumbers: [],
    swapOverrides: {},
    monoSwaps: {},
    anchorBudget: prefs.fullColorBudget,
  }
}

export function prefsFromSnapshot(s: ThreadMapControlSnapshot): ThreadMapPrefs {
  return {
    mode: s.mode,
    fullColorBudget: s.fullColorBudget,
    monochromeBudget: s.monochromeBudget,
    monochromeTone: s.monochromeTone,
    detail: s.detail,
    fidelity: s.fidelity,
    preferBox: s.preferBox,
  }
}

export function applyFullSwapOverride(
  swaps: Record<string, string>,
  baseNumber: string,
  nextNumber: string,
): Record<string, string> {
  const baseKey = baseNumber.trim().toLowerCase()
  const nextSwaps = { ...swaps }
  if (baseKey === nextNumber.trim().toLowerCase()) delete nextSwaps[baseKey]
  else nextSwaps[baseKey] = nextNumber
  return nextSwaps
}

export function revertFullSwapOverride(
  swaps: Record<string, string>,
  baseNumber: string,
): Record<string, string> | null {
  const baseKey = baseNumber.trim().toLowerCase()
  if (!(baseKey in swaps)) return null
  const nextSwaps = { ...swaps }
  delete nextSwaps[baseKey]
  return nextSwaps
}

export function toggleLockedThreadList(lockedNumbers: string[], number: string): string[] {
  const key = number.trim().toLowerCase()
  return lockedNumbers.some((n) => n.toLowerCase() === key)
    ? lockedNumbers.filter((n) => n.toLowerCase() !== key)
    : [...lockedNumbers, number]
}

export function replaceLockedThreadList(
  lockedNumbers: string[],
  oldNumber: string,
  newNumber: string,
): string[] | null {
  const oldKey = oldNumber.trim().toLowerCase()
  if (!lockedNumbers.some((n) => n.toLowerCase() === oldKey)) return null
  const replaced = lockedNumbers.map((n) => (n.toLowerCase() === oldKey ? newNumber : n))
  const seen = new Set<string>()
  return replaced.filter((n) => {
    const k = n.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function cycleThreadSlot(
  current: number | null,
  count: number,
  delta: 1 | -1,
): number | null {
  if (count <= 0) return null
  if (current === null) return delta > 0 ? 0 : count - 1
  return (current + delta + count) % count
}

export interface UseThreadStudioStateOptions {
  initialSection?: AppSection
  originalSource: HTMLCanvasElement | null
  planMode: boolean
  processMode: boolean
  setupOpen: boolean
  peek: boolean
  onSaveMapPull: (threads: ThreadSavePayload[], requestedName: string) => string | null
}

export function useThreadStudioState({
  initialSection,
  originalSource,
  planMode,
  processMode,
  setupOpen,
  peek,
  onSaveMapPull,
}: UseThreadStudioStateOptions) {
  const [section, setSection] = useState<AppSection>(initialSection ?? 'color')
  const [threadTab, setThreadTab] = useState<StudioTab>('match')
  const [threadMapHistory, setThreadMapHistory] = useState<ThreadMapHistory>(() =>
    createThreadMapHistory(snapshotFromPrefs(DEFAULT_THREAD_MAP_PREFS)),
  )
  const [threadMapOutline, setThreadMapOutline] = useState(false)
  const [threadMapOutlineNumbers, setThreadMapOutlineNumbers] = useState(true)
  const [threadMapOutlineMirror, setThreadMapOutlineMirror] = useState(false)
  const [selectedThreadSlot, setSelectedThreadSlot] = useState<number | null>(null)
  const [hoveredThreadSlot, setHoveredThreadSlot] = useState<number | null>(null)
  const [previewThreadSwap, setPreviewThreadSwap] = useState<ThreadMapSwapPreview | null>(null)
  const [vellumMode, setVellumMode] = useState<VellumMode>('tracing')
  const [markThreadMisses, setMarkThreadMisses] = useState(false)
  const [focusRegion, setFocusRegion] = useState<FocusRegion | null>(null)
  const focusIdRef = useRef(0)

  const dmcStash = useDmcStore((s) => s.stash)
  const isPhone = useMediaQuery('(max-width: 760px)')
  const isThreadSection = section === 'thread' && !planMode && !processMode && !setupOpen
  const isThreadMapActive = isThreadSection && threadTab === 'map' && Boolean(originalSource)
  const phoneThreadView = isPhone && isThreadSection

  const tmControls = threadMapHistory.present
  const {
    mode: threadMapMode,
    fullColorBudget: threadFullBudget,
    monochromeBudget: threadMonoBudget,
    monochromeTone: threadMonoTone,
    detail: threadMapDetail,
    fidelity: threadMapFidelity,
    preferBox: threadPreferBox,
    lockedNumbers: lockedThreadNumbers,
    swapOverrides: threadSwapOverrides,
    monoSwaps: threadMonoSwaps,
    anchorBudget: threadAnchorBudget,
  } = tmControls
  const canUndoThreadMap = threadMapHistory.past.length > 0
  const canRedoThreadMap = threadMapHistory.future.length > 0

  const commitThreadMap = useCallback(
    (
      updater: (cur: ThreadMapControlSnapshot) => ThreadMapControlSnapshot,
      coalesceTag?: string,
    ) => {
      setThreadMapHistory((prev) => {
        const next = updater(prev.present)
        storeThreadMapPrefs(prefsFromSnapshot(next))
        return pushThreadMapHistory(prev, next, coalesceTag ? { coalesceTag } : undefined)
      })
    },
    [],
  )

  const undoThreadMap = useCallback(() => {
    setThreadMapHistory((prev) => {
      const next = undoThreadMapHistory(prev)
      if (next !== prev) storeThreadMapPrefs(prefsFromSnapshot(next.present))
      return next
    })
  }, [])

  const redoThreadMap = useCallback(() => {
    setThreadMapHistory((prev) => {
      const next = redoThreadMapHistory(prev)
      if (next !== prev) storeThreadMapPrefs(prefsFromSnapshot(next.present))
      return next
    })
  }, [])

  const setThreadMapMode = useCallback(
    (mode: ThreadMapMode) => commitThreadMap((c) => ({ ...c, mode })),
    [commitThreadMap],
  )
  const setThreadFullBudget = useCallback(
    (fullColorBudget: FullColorBudget) =>
      commitThreadMap((c) => ({ ...c, fullColorBudget }), 'full-budget'),
    [commitThreadMap],
  )
  const setThreadMonoBudget = useCallback(
    (monochromeBudget: MonochromeBudget) =>
      commitThreadMap((c) => ({ ...c, monochromeBudget, monoSwaps: {} }), 'mono-budget'),
    [commitThreadMap],
  )
  const setThreadMonoTone = useCallback(
    (monochromeTone: MonochromeTone) =>
      commitThreadMap((c) => ({ ...c, monochromeTone, monoSwaps: {} })),
    [commitThreadMap],
  )
  const setThreadMapDetail = useCallback(
    (detail: ThreadMapDetail) => commitThreadMap((c) => ({ ...c, detail })),
    [commitThreadMap],
  )
  const setThreadMapFidelity = useCallback(
    (fidelity: ThreadMapFidelity) =>
      commitThreadMap((c) => ({ ...c, fidelity, swapOverrides: {} })),
    [commitThreadMap],
  )
  const setThreadPreferBox = useCallback(
    (preferBox: boolean) => commitThreadMap((c) => ({ ...c, preferBox })),
    [commitThreadMap],
  )
  const reoptimizeThreadMap = useCallback(
    () => commitThreadMap((c) => ({ ...c, anchorBudget: c.fullColorBudget, swapOverrides: {} })),
    [commitThreadMap],
  )

  const applyFullThreadSwap = useCallback(
    (baseNumber: string, nextNumber: string) => {
      commitThreadMap((c) => ({
        ...c,
        swapOverrides: applyFullSwapOverride(c.swapOverrides, baseNumber, nextNumber),
      }))
    },
    [commitThreadMap],
  )

  const revertFullThreadSwap = useCallback(
    (baseNumber: string) => {
      commitThreadMap((c) => {
        const nextSwaps = revertFullSwapOverride(c.swapOverrides, baseNumber)
        return nextSwaps ? { ...c, swapOverrides: nextSwaps } : c
      })
    },
    [commitThreadMap],
  )

  const applyMonoThreadSwap = useCallback(
    (slotIndex: number, nextNumber: string) => {
      commitThreadMap((c) => ({
        ...c,
        monoSwaps: { ...c.monoSwaps, [slotIndex]: nextNumber },
      }))
    },
    [commitThreadMap],
  )

  const revertMonoThreadSwap = useCallback(
    (slotIndex: number) => {
      commitThreadMap((c) => {
        if (!(slotIndex in c.monoSwaps)) return c
        const nextMono = { ...c.monoSwaps }
        delete nextMono[slotIndex]
        return { ...c, monoSwaps: nextMono }
      })
    },
    [commitThreadMap],
  )

  const resetThreadSwaps = useCallback(() => {
    commitThreadMap((c) => ({ ...c, swapOverrides: {}, monoSwaps: {} }))
  }, [commitThreadMap])

  const toggleLockedThread = useCallback(
    (number: string) => {
      commitThreadMap((c) => ({
        ...c,
        lockedNumbers: toggleLockedThreadList(c.lockedNumbers, number),
      }))
    },
    [commitThreadMap],
  )

  const replaceLockedThread = useCallback(
    (oldNumber: string, newNumber: string) => {
      commitThreadMap((c) => {
        const nextLocked = replaceLockedThreadList(c.lockedNumbers, oldNumber, newNumber)
        return nextLocked ? { ...c, lockedNumbers: nextLocked } : c
      })
    },
    [commitThreadMap],
  )

  const clearLockedThreads = useCallback(
    () => commitThreadMap((c) => ({ ...c, lockedNumbers: [] })),
    [commitThreadMap],
  )

  useEffect(() => {
    const loaded = loadThreadMapPrefs()
    setThreadMapHistory(createThreadMapHistory(snapshotFromPrefs(loaded)))
  }, [])

  useEffect(() => {
    if (!initialSection) setSection(loadSection())
  }, [initialSection])

  const threadMapBudget = threadMapMode === 'monochrome' ? threadMonoBudget : threadFullBudget
  const threadMapState = useThreadMap({
    source: originalSource,
    enabled: isThreadMapActive,
    mode: threadMapMode,
    budget: threadMapBudget,
    monochromeTone: threadMonoTone,
    detail: threadMapDetail,
    fidelity: threadMapFidelity,
    preferBox: threadPreferBox,
    ownedNumbers: dmcStash,
    lockedNumbers: lockedThreadNumbers,
    anchorBudget: threadAnchorBudget,
    swapOverrides: threadSwapOverrides,
    monoSwaps: threadMonoSwaps,
    onApplyFullSwap: applyFullThreadSwap,
    onRevertFullSwap: revertFullThreadSwap,
    onApplyMonoSwap: applyMonoThreadSwap,
    onRevertMonoSwap: revertMonoThreadSwap,
    onResetSwaps: resetThreadSwaps,
  })
  const threadMap = threadMapState.result

  // Reset thread isolation & live swap previews when switching photo, mode, tone, detail, fidelity, or budget.
  useEffect(() => {
    setSelectedThreadSlot(null)
    setPreviewThreadSwap(null)
  }, [
    originalSource,
    threadMapMode,
    threadMapBudget,
    threadMonoTone,
    threadMapDetail,
    threadMapFidelity,
    threadPreferBox,
  ])

  useEffect(() => {
    if (!isThreadMapActive) setPreviewThreadSwap(null)
  }, [isThreadMapActive])

  useEffect(() => {
    if (!isThreadMapActive) setHoveredThreadSlot(null)
  }, [isThreadMapActive])

  const outlineLabels = useMemo(() => {
    if (!isThreadMapActive || !threadMapOutline || !threadMapOutlineNumbers || !threadMap) return null
    const radius = Math.max(7, Math.round(Math.min(threadMap.width, threadMap.height) * 0.022))
    return {
      radius,
      placed: placeLabels(threadMap.slot, threadMap.width, threadMap.height, threadMap.slots.length, {
        radius,
        minPurity: 0.6,
        surround: 1.4,
      }),
    }
  }, [isThreadMapActive, threadMapOutline, threadMapOutlineNumbers, threadMap])

  // Compile watertight vector paths strictly from the base slot layout so in-place display
  // color swaps reuse the exact same Path2D objects with 0 ms geometry re-compilation.
  const compiledSlotPaths = useMemo(() => {
    if (!isThreadMapActive || !threadMap) return null
    return compileThreadMapPaths(threadMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `slot` buffer identity changes only when regions change
  }, [
    isThreadMapActive,
    threadMap?.slot,
    threadMap?.width,
    threadMap?.height,
    threadMap?.slots.length,
    threadMap?.detail,
  ])

  const compiledThreadMap = useMemo(() => {
    if (!compiledSlotPaths || !threadMap) return null
    return withThreadMapVisiblyOff(compiledSlotPaths, threadMap.visiblyOff, threadMap.width, threadMap.height)
  }, [compiledSlotPaths, threadMap])

  const threadMapRenderer = useMemo(() => {
    if (!isThreadMapActive || peek || !threadMap || !compiledThreadMap) return null
    return createThreadMapCanvasRenderer(threadMap, compiledThreadMap, {
      outline: threadMapOutline,
      mirror: threadMapOutlineMirror,
      showNumbers: threadMapOutlineNumbers,
      outlineLabels,
      selected: selectedThreadSlot,
      hovered: hoveredThreadSlot,
      previewSwap: previewThreadSwap,
      vellumMode,
      markMisses: markThreadMisses,
    })
  }, [
    isThreadMapActive,
    peek,
    threadMap,
    compiledThreadMap,
    threadMapOutline,
    threadMapOutlineMirror,
    threadMapOutlineNumbers,
    outlineLabels,
    selectedThreadSlot,
    hoveredThreadSlot,
    previewThreadSwap,
    vellumMode,
    markThreadMisses,
  ])

  const threadMapNavigator = useMemo(() => {
    if (!isThreadMapActive || peek || !threadMap || !compiledThreadMap) return null
    return createThreadMapNavigatorRenderer(threadMap, compiledThreadMap, {
      outline: threadMapOutline,
      mirror: threadMapOutlineMirror,
      selected: selectedThreadSlot,
      previewSwap: previewThreadSwap,
    })
  }, [
    isThreadMapActive,
    peek,
    threadMap,
    compiledThreadMap,
    threadMapOutline,
    threadMapOutlineMirror,
    selectedThreadSlot,
    previewThreadSwap,
  ])

  const threadMapFallbackDisplay = useMemo(() => {
    if (!isThreadMapActive || peek || !threadMap || compiledThreadMap) return null
    const canvas = document.createElement('canvas')
    canvas.width = threadMap.width
    canvas.height = threadMap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const image = ctx.createImageData(threadMap.width, threadMap.height)
    image.data.set(
      threadMapOutline
        ? renderThreadMapOutline(threadMap, { selected: selectedThreadSlot, mirror: threadMapOutlineMirror })
        : renderThreadMap(threadMap, {
            selected: selectedThreadSlot,
            markMisses: markThreadMisses,
            sourcePixels: threadMapState.sourcePixels,
            previewSwap: previewThreadSwap,
          }),
    )
    ctx.putImageData(image, 0, 0)
    return canvas
  }, [
    isThreadMapActive,
    peek,
    threadMap,
    compiledThreadMap,
    threadMapOutline,
    threadMapOutlineMirror,
    selectedThreadSlot,
    markThreadMisses,
    threadMapState.sourcePixels,
    previewThreadSwap,
  ])

  const handleHoverPixel = useCallback(
    (pixel: { x: number; y: number } | null) => {
      if (!isThreadMapActive || peek || !threadMap || !originalSource || !pixel) {
        setHoveredThreadSlot(null)
        return
      }
      const sampleX =
        threadMapOutline && threadMapOutlineMirror ? originalSource.width - 1 - pixel.x : pixel.x
      const slot = threadSlotAt(threadMap, sampleX, pixel.y, originalSource.width, originalSource.height)
      setHoveredThreadSlot(slot)
    },
    [isThreadMapActive, originalSource, peek, threadMap, threadMapOutline, threadMapOutlineMirror],
  )

  const selectSlotAtPoint = useCallback(
    (x: number, y: number, width: number, height: number, toggleIfSame: boolean) => {
      if (!threadMap) return
      const sampleX = threadMapOutline && threadMapOutlineMirror ? width - 1 - x : x
      const slot = threadSlotAt(threadMap, sampleX, y, width, height)
      setSelectedThreadSlot((current) => (toggleIfSame && current === slot ? null : slot))
    },
    [threadMap, threadMapOutline, threadMapOutlineMirror],
  )

  const stepSelectedSlot = useCallback(
    (delta: 1 | -1) => {
      if (!threadMap || threadMap.slots.length === 0) return
      const count = threadMap.slots.length
      setSelectedThreadSlot((current) => cycleThreadSlot(current, count, delta))
    },
    [threadMap],
  )

  const zoomToSelectedSlot = useCallback(() => {
    if (!threadMap || selectedThreadSlot === null) return
    const rect = slotBounds(threadMap, selectedThreadSlot)
    if (!rect) return
    const aligned =
      threadMapOutline && threadMapOutlineMirror
        ? { ...rect, x: 1 - rect.x - rect.width }
        : rect
    setFocusRegion({ ...aligned, id: ++focusIdRef.current })
  }, [selectedThreadSlot, threadMap, threadMapOutline, threadMapOutlineMirror])

  const selectSection = useCallback((next: AppSection) => {
    setSection(next)
    storeSection(next)
  }, [])

  const resetForNewPicture = useCallback(() => {
    setSelectedThreadSlot(null)
    setHoveredThreadSlot(null)
    setPreviewThreadSwap(null)
    setVellumMode('tracing')
    setThreadMapHistory((prev) => createThreadMapHistory(snapshotFromPrefs(prefsFromSnapshot(prev.present))))
    setThreadMapOutline(false)
    setThreadMapOutlineMirror(false)
    setFocusRegion(null)
  }, [])

  const threadMapBindings = {
    state: threadMapState,
    mode: threadMapMode,
    onModeChange: setThreadMapMode,
    fullColorBudget: threadFullBudget,
    onFullColorBudgetChange: setThreadFullBudget,
    monochromeBudget: threadMonoBudget,
    onMonochromeBudgetChange: setThreadMonoBudget,
    monochromeTone: threadMonoTone,
    onMonochromeToneChange: setThreadMonoTone,
    detail: threadMapDetail,
    onDetailChange: setThreadMapDetail,
    fidelity: threadMapFidelity,
    onFidelityChange: setThreadMapFidelity,
    anchorBudget: threadAnchorBudget,
    onReoptimize: reoptimizeThreadMap,
    canUndo: canUndoThreadMap,
    canRedo: canRedoThreadMap,
    onUndo: undoThreadMap,
    onRedo: redoThreadMap,
    preferBox: threadPreferBox,
    onPreferBoxChange: setThreadPreferBox,
    lockedNumbers: lockedThreadNumbers,
    onToggleLock: toggleLockedThread,
    onReplaceLock: replaceLockedThread,
    onClearLocks: clearLockedThreads,
    outlineMirror: threadMapOutlineMirror,
    onOutlineMirrorChange: setThreadMapOutlineMirror,
    outlineNumbers: threadMapOutlineNumbers,
    selectedSlot:
      threadMap && selectedThreadSlot !== null && selectedThreadSlot < threadMap.slots.length
        ? selectedThreadSlot
        : null,
    onSelectSlot: setSelectedThreadSlot,
    geometry: compiledThreadMap?.geometry ?? null,
    previewSwap: previewThreadSwap,
    onPreviewSwap: setPreviewThreadSwap,
    markMisses: markThreadMisses,
    onMarkMissesChange: setMarkThreadMisses,
    onSaveMapPull,
  }

  return {
    section,
    selectSection,
    threadTab,
    setThreadTab,
    isPhone,
    isThreadSection,
    isThreadMapActive,
    phoneThreadView,
    threadMap,
    threadMapBudget,
    threadMapOutline,
    setThreadMapOutline,
    threadMapOutlineNumbers,
    setThreadMapOutlineNumbers,
    threadMapOutlineMirror,
    setThreadMapOutlineMirror,
    selectedThreadSlot,
    setSelectedThreadSlot,
    hoveredThreadSlot,
    previewThreadSwap,
    vellumMode,
    setVellumMode,
    focusRegion,
    threadMapRenderer,
    threadMapNavigator,
    threadMapFallbackDisplay,
    handleHoverPixel,
    selectSlotAtPoint,
    stepSelectedSlot,
    zoomToSelectedSlot,
    undoThreadMap,
    redoThreadMap,
    resetForNewPicture,
    threadMapBindings,
  }
}
