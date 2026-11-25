'use client'

/**
 * ColorWizard, the simplest version of itself.
 * Open a picture. Click any color. See what it is, how to mix it, and which thread matches.
 * Or press P to plan the whole picture: N piles of paint, and where each goes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { averageColorAt, DEMO_PICTURE, firstSamplePixel } from '@/lib/demoPicture'
import { WelcomeWordmark } from './WelcomeWordmark'
import { collectionNameProblem, createCollection, deleteCollection, emptyLibrary, findByHex, loadLibrary, removeColor, saveColor, setMembership, setNote, storeLibrary, type ColorLibrary, type SaveInput, type SavedColor } from '@/lib/colorLibrary'
import { hexToRgb, rgbToHex } from '@/lib/color/conversions'
import { newId } from '@/lib/newId'
import { computeImageValueContextFromCanvas } from '@/lib/dmc/studio'
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
import {
  canvasPictureKey, centeredCrop, loadCanvasDraft, newCanvasDraft, referencePoint, storeCanvasDraft, transferMeasurements,
  type CanvasDraft, type CanvasFace, type CanvasLandmark, type ImageCrop,
} from '@/lib/paint/canvasSetup'
import { cropCanvas, drawTransferOverlay } from './canvasTransfer'
import { useTransferRecipes } from './useTransferRecipes'
import type { MarkTool } from './CanvasSetupPanel'
import { useDmcStore } from '@/lib/store/useDmcStore'
import { createSourceBuffer, decodeImage, decodeImageFile, isMemoryConstrained } from '@/lib/imagePipeline'
import { resolvePalettePigments } from '@/lib/paint/palettePigments'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import ColorEntry from './ColorEntry'
import type { Arrival } from './ColorReadout'
import { usePaintPalette } from './PaintPalette'
import LibraryTools from './LibraryTools'
import { useProcessDisplay, useProcessStages } from './useProcess'
import SavedStrip from './SavedStrip'
import { BUDGETS, type Budget } from '@/lib/paint/plan/planFit'
import { pileAt, renderRepaint } from './planRender'
import {
  compileThreadMapPaths,
  createThreadMapCanvasRenderer,
  createThreadMapNavigatorRenderer,
  withThreadMapVisiblyOff,
  type ThreadMapSwapPreview,
  type VellumMode,
} from './threadMapCanvas'
import { renderThreadMap, renderThreadMapOutline, slotBounds, threadSlotAt } from './threadMapRender'
import { formatThreadShare } from '@/lib/dmc/map/mapFit'
import { usePicturePlan } from './usePlan'
import { useThreadMap } from './useThreadMap'
import type { PourOrigin } from './pour'
import type { FocusRegion, PickedColor, SamplePoint } from './SimpleCanvas'
import type { StudioTab, ThreadSavePayload } from './ThreadStudio'
import styles from './simple.module.css'
import threadStyles from './threadStudio.module.css'

// Views that are not on the first screen load on first use, so the welcome paints sooner.
// `loadCanvas` and `loadReadout` are also warmed up once the page is idle (see SimpleApp).
const loadCanvas = () => import('./SimpleCanvas')
const loadReadout = () => import('./ColorReadout')
const SimpleCanvas = dynamic(loadCanvas)
const ColorReadout = dynamic(loadReadout)
const PlanPanel = dynamic(() => import('./PlanPanel'))
const ProcessPanel = dynamic(() => import('./ProcessPanel'))
const CanvasSetupPanel = dynamic(() => import('./CanvasSetupPanel'))
const ThreadStudio = dynamic(() => import('./ThreadStudio'))
const ThreadView = dynamic(() => import('./ThreadView'))

const BUDGET_KEY = 'colorwizard-simple-plan-budget'
const DEFAULT_BUDGET: Budget = 8
const PHONE_VIEW_KEY = 'colorwizard-simple-phone-view'
export type AppSection = 'color' | 'thread'
// Keep detail for zooming in: 4096 holds a whole 12 MP phone photo. iOS canvas memory is tighter, so it gets less.
const MAX_DIMENSION = 4096
const MAX_DIMENSION_CONSTRAINED = 3072

function loadBudget(): Budget {
  try {
    const stored = Number(window.localStorage.getItem(BUDGET_KEY))
    return (BUDGETS as readonly number[]).includes(stored) ? (stored as Budget) : DEFAULT_BUDGET
  } catch {
    return DEFAULT_BUDGET
  }
}

function storeBudget(budget: Budget) {
  try {
    window.localStorage.setItem(BUDGET_KEY, String(budget))
  } catch {
    /* the budget is a convenience; a blocked store should not break planning */
  }
}

function loadSection(): AppSection {
  try {
    return window.localStorage.getItem(PHONE_VIEW_KEY) === 'thread' ? 'thread' : 'color'
  } catch {
    return 'color'
  }
}

function storeSection(section: AppSection) {
  try {
    window.localStorage.setItem(PHONE_VIEW_KEY, section === 'thread' ? 'thread' : 'all')
  } catch {
    /* the view is a convenience; a blocked store only means choosing it again next time */
  }
}

function colorFromHex(hex: string): PickedColor | null {
  const rgb = hexToRgb(hex)
  return rgb ? { hex: hex.toUpperCase(), rgb } : null
}

function snapshotFromPrefs(prefs: ThreadMapPrefs): ThreadMapControlSnapshot {
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

function prefsFromSnapshot(s: ThreadMapControlSnapshot): ThreadMapPrefs {
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

export interface SimpleAppProps {
  /** Opens directly in Color or Thread mode (used by `/thread`). */
  initialSection?: AppSection
}

export default function SimpleApp({ initialSection }: SimpleAppProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [originalSource, setOriginalSource] = useState<HTMLCanvasElement | null>(null)
  const [draftKey, setDraftKey] = useState<string | null>(null)
  const [canvasDraft, setCanvasDraft] = useState<CanvasDraft | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [markTool, setMarkTool] = useState<MarkTool | null>(null)
  const [draftStatus, setDraftStatus] = useState<string | null>(null)
  const [pictureId, setPictureId] = useState(0)
  const [pictureName, setPictureName] = useState<string | undefined>()
  const [point, setPoint] = useState<SamplePoint | null>(null)
  const [color, setColor] = useState<PickedColor | null>(null)
  const [arrival, setArrival] = useState<Arrival | null>(null)
  const [valueView, setValueView] = useState(false)
  const [planMode, setPlanMode] = useState(false)
  const [processMode, setProcessMode] = useState(false)
  const [processPosition, setProcessPosition] = useState(0)
  const [budget, setBudget] = useState<Budget>(DEFAULT_BUDGET)
  const [selectedPile, setSelectedPile] = useState<number | null>(null)
  const [markMisses, setMarkMisses] = useState(true)
  const [peek, setPeek] = useState(false)
  const [library, setLibrary] = useState<ColorLibrary>(emptyLibrary)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [savedColor, setSavedColor] = useState<SavedColor | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedReadable, setSavedReadable] = useState(false)
  const [opening, setOpening] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null)
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
  const [compareSplit, setCompareSplit] = useState<number | null>(null)
  const [vellumMode, setVellumMode] = useState<VellumMode>('tracing')
  const [markThreadMisses, setMarkThreadMisses] = useState(false)
  const [focusRegion, setFocusRegion] = useState<FocusRegion | null>(null)
  const focusIdRef = useRef(0)
  const dmcStash = useDmcStore((s) => s.stash)
  const isPhone = useMediaQuery('(max-width: 760px)')
  const isThreadSection = section === 'thread' && !planMode && !processMode && !setupOpen
  const lockedFace = canvasDraft?.face
  const crop = useMemo(() => originalSource && lockedFace ? centeredCrop(originalSource, lockedFace) : null, [originalSource, lockedFace])
  const paintingSource = useMemo(() => originalSource && crop ? cropCanvas(originalSource, crop) : originalSource, [originalSource, crop])
  const source = isThreadSection ? originalSource : paintingSource
  const isThreadMapActive = isThreadSection && threadTab === 'map' && Boolean(source)
  const phoneThreadView = isPhone && isThreadSection
  const openRequestRef = useRef(0)

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

  const commitThreadMap = useCallback((
    updater: (cur: ThreadMapControlSnapshot) => ThreadMapControlSnapshot,
    coalesceTag?: string,
  ) => {
    setThreadMapHistory((prev) => {
      const next = updater(prev.present)
      storeThreadMapPrefs(prefsFromSnapshot(next))
      return pushThreadMapHistory(prev, next, coalesceTag ? { coalesceTag } : undefined)
    })
  }, [])

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

  const setThreadMapMode = useCallback((mode: ThreadMapMode) => commitThreadMap((c) => ({ ...c, mode })), [commitThreadMap])
  const setThreadFullBudget = useCallback((fullColorBudget: FullColorBudget) => commitThreadMap((c) => ({ ...c, fullColorBudget }), 'full-budget'), [commitThreadMap])
  const setThreadMonoBudget = useCallback((monochromeBudget: MonochromeBudget) => commitThreadMap((c) => ({ ...c, monochromeBudget, monoSwaps: {} }), 'mono-budget'), [commitThreadMap])
  const setThreadMonoTone = useCallback((monochromeTone: MonochromeTone) => commitThreadMap((c) => ({ ...c, monochromeTone, monoSwaps: {} })), [commitThreadMap])
  const setThreadMapDetail = useCallback((detail: ThreadMapDetail) => commitThreadMap((c) => ({ ...c, detail })), [commitThreadMap])
  const setThreadMapFidelity = useCallback((fidelity: ThreadMapFidelity) => commitThreadMap((c) => ({ ...c, fidelity, swapOverrides: {} })), [commitThreadMap])
  const setThreadPreferBox = useCallback((preferBox: boolean) => commitThreadMap((c) => ({ ...c, preferBox })), [commitThreadMap])
  const reoptimizeThreadMap = useCallback(() => commitThreadMap((c) => ({ ...c, anchorBudget: c.fullColorBudget, swapOverrides: {} })), [commitThreadMap])

  const applyFullThreadSwap = useCallback((baseNumber: string, nextNumber: string) => {
    const baseKey = baseNumber.trim().toLowerCase()
    commitThreadMap((c) => {
      const nextSwaps = { ...c.swapOverrides }
      if (baseKey === nextNumber.trim().toLowerCase()) delete nextSwaps[baseKey]
      else nextSwaps[baseKey] = nextNumber
      return { ...c, swapOverrides: nextSwaps }
    })
  }, [commitThreadMap])

  const revertFullThreadSwap = useCallback((baseNumber: string) => {
    const baseKey = baseNumber.trim().toLowerCase()
    commitThreadMap((c) => {
      if (!(baseKey in c.swapOverrides)) return c
      const nextSwaps = { ...c.swapOverrides }
      delete nextSwaps[baseKey]
      return { ...c, swapOverrides: nextSwaps }
    })
  }, [commitThreadMap])

  const applyMonoThreadSwap = useCallback((slotIndex: number, nextNumber: string) => {
    commitThreadMap((c) => ({
      ...c,
      monoSwaps: { ...c.monoSwaps, [slotIndex]: nextNumber },
    }))
  }, [commitThreadMap])

  const revertMonoThreadSwap = useCallback((slotIndex: number) => {
    commitThreadMap((c) => {
      if (!(slotIndex in c.monoSwaps)) return c
      const nextMono = { ...c.monoSwaps }
      delete nextMono[slotIndex]
      return { ...c, monoSwaps: nextMono }
    })
  }, [commitThreadMap])

  const resetThreadSwaps = useCallback(() => {
    commitThreadMap((c) => ({ ...c, swapOverrides: {}, monoSwaps: {} }))
  }, [commitThreadMap])

  const toggleLockedThread = useCallback((number: string) => {
    const key = number.trim().toLowerCase()
    commitThreadMap((c) => ({
      ...c,
      lockedNumbers: c.lockedNumbers.some((n) => n.toLowerCase() === key)
        ? c.lockedNumbers.filter((n) => n.toLowerCase() !== key)
        : [...c.lockedNumbers, number],
    }))
  }, [commitThreadMap])

  const replaceLockedThread = useCallback((oldNumber: string, newNumber: string) => {
    const oldKey = oldNumber.trim().toLowerCase()
    commitThreadMap((c) => {
      if (!c.lockedNumbers.some((n) => n.toLowerCase() === oldKey)) return c
      const replaced = c.lockedNumbers.map((n) => (n.toLowerCase() === oldKey ? newNumber : n))
      const seen = new Set<string>()
      return {
        ...c,
        lockedNumbers: replaced.filter((n) => {
          const k = n.toLowerCase()
          if (seen.has(k)) return false
          seen.add(k)
          return true
        }),
      }
    })
  }, [commitThreadMap])

  const clearLockedThreads = useCallback(() => commitThreadMap((c) => ({ ...c, lockedNumbers: [] })), [commitThreadMap])

  useEffect(() => {
    try {
      setLibrary(loadLibrary(window.localStorage))
      setSavedReadable(true)
    } catch {
      setSaveError('Saved colors couldn’t be read. Saving is unavailable; existing data has been kept. Try allowing browser storage and reload.')
    }
  }, [])
  useEffect(() => setBudget(loadBudget()), [])
  useEffect(() => {
    const loaded = loadThreadMapPrefs()
    setThreadMapHistory(createThreadMapHistory(snapshotFromPrefs(loaded)))
  }, [])
  useEffect(() => {
    if (!initialSection) setSection(loadSection())
  }, [initialSection])
  // Fetch the canvas and the color readout once the page has loaded and is idle, so the
  // first picture and the first click do not wait on a download, and the welcome image
  // does not share the network with them.
  useEffect(() => {
    let idleId: number | undefined
    let timerId: number | undefined
    const warm = () => { void loadCanvas(); void loadReadout() }
    const schedule = () => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(warm, { timeout: 3000 })
      else timerId = window.setTimeout(warm, 500)
    }
    if (document.readyState === 'complete') schedule()
    else window.addEventListener('load', schedule, { once: true })
    return () => {
      window.removeEventListener('load', schedule)
      if (idleId !== undefined) window.cancelIdleCallback(idleId)
      if (timerId !== undefined) window.clearTimeout(timerId)
    }
  }, [])

  const imageValue = useMemo(() => computeImageValueContextFromCanvas(source), [source])
  const palette = usePaintPalette()
  const pigments = useMemo(() => resolvePalettePigments(palette.colors), [palette])
  const trialRecipes = useTransferRecipes(canvasDraft?.landmarks, palette)
  const planState = usePicturePlan(paintingSource, planMode, budget, pigments)
  const plan = planState.result

  // A new plan (another budget, palette or picture) starts with every pile showing.
  useEffect(() => setSelectedPile(null), [plan])

  const threadMapBudget = threadMapMode === 'monochrome' ? threadMonoBudget : threadFullBudget
  const threadMapState = useThreadMap({
    source,
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
  }, [source, threadMapMode, threadMapBudget, threadMonoTone, threadMapDetail, threadMapFidelity, threadPreferBox])

  useEffect(() => {
    if (!isThreadMapActive) setPreviewThreadSwap(null)
  }, [isThreadMapActive])

  const changeBudget = useCallback((next: Budget) => {
    setBudget(next)
    storeBudget(next)
  }, [])

  const processStages = useProcessStages(paintingSource, processMode)
  const processDisplay = useProcessDisplay(processStages, processPosition)

  // The repaint the stage shows in Plan view; the original while the peek button is held.
  const planDisplay = useMemo(() => {
    if (!planMode || peek || !plan) return null
    const canvas = document.createElement('canvas')
    canvas.width = plan.width
    canvas.height = plan.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const image = ctx.createImageData(plan.width, plan.height)
    image.data.set(renderRepaint(plan, { selected: selectedPile, markMisses }))
    ctx.putImageData(image, 0, 0)
    return canvas
  }, [planMode, peek, plan, selectedPile, markMisses])

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

  const renderDisplay = !planMode && !processMode && isThreadMapActive ? threadMapRenderer : null
  const display = planMode
    ? planDisplay
    : processMode && !peek
      ? processDisplay
      : isThreadMapActive
        ? threadMapFallbackDisplay
        : null

  const handleHoverPixel = useCallback((pixel: { x: number; y: number } | null) => {
    if (!isThreadMapActive || peek || !threadMap || !source || !pixel) {
      setHoveredThreadSlot(null)
      return
    }
    const sampleX = threadMapOutline && threadMapOutlineMirror ? source.width - 1 - pixel.x : pixel.x
    const slot = threadSlotAt(threadMap, sampleX, pixel.y, source.width, source.height)
    setHoveredThreadSlot(slot)
  }, [isThreadMapActive, peek, source, threadMap, threadMapOutline, threadMapOutlineMirror])

  useEffect(() => {
    if (!isThreadMapActive) setHoveredThreadSlot(null)
  }, [isThreadMapActive])

  /** Opens a picture; resolves to its pixel buffer, or null if it failed or a newer choice won. */
  const openPicture = useCallback(async (
    decode: () => Promise<HTMLImageElement>,
    name: string,
    key?: () => Promise<string | null>,
  ): Promise<HTMLCanvasElement | null> => {
    const request = ++openRequestRef.current
    setOpening(true)
    setError(null)
    try {
      const [image, pictureKey] = await Promise.all([decode(), key?.() ?? null])
      const buffer = await createSourceBuffer(image, isMemoryConstrained() ? MAX_DIMENSION_CONSTRAINED : MAX_DIMENSION)
      if (request !== openRequestRef.current) return null
      let restoredDraft: CanvasDraft | null = null
      try {
        restoredDraft = pictureKey ? loadCanvasDraft(window.localStorage, pictureKey) : null
      } catch {
        // The picture can still be opened if local storage is blocked or a draft was damaged.
      }
      setOriginalSource(buffer)
      setDraftKey(pictureKey)
      setCanvasDraft(restoredDraft)
      setSetupOpen(restoredDraft !== null)
      setMarkTool(null)
      setDraftStatus(restoredDraft ? 'Canvas draft restored.' : null)
      setPictureId((id) => id + 1)
      setPictureName(name)
      setPoint(null)
      setColor(null)
      setSavedColor(null)
      setValueView(false)
      setPlanMode(false)
      setProcessMode(false)
      setProcessPosition(0)
      setSelectedPile(null)
      setSelectedThreadSlot(null)
      setHoveredThreadSlot(null)
      setPreviewThreadSwap(null)
      setCompareSplit(null)
      setVellumMode('tracing')
      setThreadMapHistory((prev) => createThreadMapHistory(snapshotFromPrefs(prefsFromSnapshot(prev.present))))
      setThreadMapOutline(false)
      setThreadMapOutlineMirror(false)
      setFocusRegion(null)
      return buffer
    } catch {
      if (request === openRequestRef.current) setError('Couldn’t open that picture. Try a JPEG or PNG.')
      return null
    } finally {
      if (request === openRequestRef.current) setOpening(false)
    }
  }, [])

  const openFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      ++openRequestRef.current
      setOpening(false)
      setError('That file isn’t a picture.')
      return
    }
    await openPicture(() => decodeImageFile(file), file.name, () => canvasPictureKey(file))
  }, [openPicture])

  // The demo opens a real picture with a first sample already taken, as if it had been clicked.
  const openDemo = async () => {
    const buffer = await openPicture(() => decodeImage(DEMO_PICTURE.src), DEMO_PICTURE.name, async () => DEMO_PICTURE.src)
    const ctx = buffer?.getContext('2d', { willReadFrequently: true })
    if (!buffer || !ctx) return
    const { x, y } = firstSamplePixel(buffer.width, buffer.height)
    const radius = DEMO_PICTURE.sampleRadius
    const left = Math.max(0, x - radius), top = Math.max(0, y - radius)
    const area = ctx.getImageData(left, top, Math.min(buffer.width - left, 2 * radius + 1), Math.min(buffer.height - top, 2 * radius + 1))
    const rgb = averageColorAt(area.data, area.width, area.height, x - left, y - top, radius)
    setPoint({ x, y, radius })
    setColor({ rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase() })
    setThreadTab('match')
  }

  const choosePicture = useCallback(() => fileInputRef.current?.click(), [])

  const arrive = useCallback((origin: PourOrigin | undefined) => {
    setArrival(origin ? (current) => ({ id: (current?.id ?? 0) + 1, origin }) : null)
  }, [])

  const updateCanvasDraft = useCallback((draft: CanvasDraft) => {
    setCanvasDraft(draft)
    try {
      if (!draftKey) throw new Error('No reference key')
      storeCanvasDraft(window.localStorage, draftKey, draft)
      setDraftStatus('Canvas draft saved on this device.')
    } catch {
      setDraftStatus('Couldn’t save this draft on this device. Print the packet to keep a copy.')
    }
  }, [draftKey])

  const lockCanvas = (face: CanvasFace) => {
    updateCanvasDraft(canvasDraft ? { ...canvasDraft, face } : newCanvasDraft(face))
    setPoint(null)
    setColor(null)
    setSelectedPile(null)
    setCompareSplit(null)
  }

  const toggleCanvasSetup = () => {
    setSetupOpen(!setupOpen)
    setMarkTool(null)
    setPeek(false)
    setPlanMode(false)
    setProcessMode(false)
    setValueView(false)
    setEntryOpen(false)
  }

  const showCanvasPlan = () => {
    setSetupOpen(false)
    setMarkTool(null)
    setProcessMode(false)
    setPeek(false)
    setPlanMode(true)
  }

  const guideMarks = useMemo(() => canvasDraft && originalSource && crop
    ? transferMeasurements(canvasDraft, originalSource, crop).landmarks.map(({ index, position, mark }) => ({
      index, position, isTrial: Boolean(mark.trial),
    }))
    : [], [canvasDraft, crop, originalSource])
  const drawGuide = useCallback((ctx: CanvasRenderingContext2D, image: ImageCrop) => {
    if (canvasDraft) drawTransferOverlay(ctx, image, canvasDraft.face, guideMarks, canvasDraft.grid)
  }, [canvasDraft, guideMarks])

  const handleSample = useCallback((nextPoint: SamplePoint, picked: PickedColor, origin?: PourOrigin) => {
    if (setupOpen && markTool && canvasDraft && originalSource && crop && source) {
      if (!origin) return
      const sourcePoint = referencePoint({ x: (nextPoint.x + 0.5) / source.width, y: (nextPoint.y + 0.5) / source.height }, originalSource, crop)
      const index = canvasDraft.landmarks.length + 1
      const landmark: CanvasLandmark = { ...sourcePoint, id: newId(), name: `Mark ${index}` }
      if (markTool === 'trial') {
        const ctx = source.getContext('2d')
        if (!ctx) return
        const radius = Math.max(1, Math.round(Math.min(source.width, source.height) / 240))
        const left = Math.max(0, nextPoint.x - radius)
        const top = Math.max(0, nextPoint.y - radius)
        const area = ctx.getImageData(left, top, Math.min(source.width - left, nextPoint.x + radius + 1 - left), Math.min(source.height - top, nextPoint.y + radius + 1 - top))
        const rgb = averageColorAt(area.data, area.width, area.height, nextPoint.x - left, nextPoint.y - top, radius)
        landmark.trial = { hex: rgbToHex(rgb.r, rgb.g, rgb.b).toUpperCase(), measured: '', correction: '', acceptedPalette: null }
        landmark.name = `Mix trial ${index}`
      }
      updateCanvasDraft({ ...canvasDraft, landmarks: [...canvasDraft.landmarks, landmark] })
      return
    }

    // The process view shows a calculated stage, not the picture: there is no color to read on it.
    if (processMode) return
    if (planMode) {
      // In the Plan view a click picks the pile that paints that spot; a deliberate click on the same pile lets go.
      if (!plan || !source) return
      const pile = pileAt(plan, nextPoint.x, nextPoint.y, source.width, source.height)
      setSelectedPile((current) => (origin && current === pile ? null : pile))
      return
    }
    if (isThreadMapActive) {
      // In Thread Map a click isolates that DMC thread on the canvas; clicking it again shows all threads.
      if (!threadMap || !source) return
      const sampleX = threadMapOutline && threadMapOutlineMirror ? source.width - 1 - nextPoint.x : nextPoint.x
      const slot = threadSlotAt(threadMap, sampleX, nextPoint.y, source.width, source.height)
      setSelectedThreadSlot((current) => (origin && current === slot ? null : slot))
      return
    }
    setSavedColor(null)
    setPoint(nextPoint)
    setColor(picked)
    setThreadTab('match')
    arrive(origin)
  }, [arrive, canvasDraft, crop, isThreadMapActive, markTool, originalSource, plan, planMode, processMode, setupOpen, source, threadMap, threadMapOutline, threadMapOutlineMirror, updateCanvasDraft])

  const openColor = useCallback((hex: string, origin?: PourOrigin) => {
    const picked = colorFromHex(hex)
    if (!picked) return
    setSavedColor(null)
    setPoint(null)
    setColor(picked)
    arrive(origin)
  }, [arrive])

  const openTyped = useCallback((hex: string) => {
    setEntryOpen(false)
    setPlanMode(false)
    setProcessMode(false)
    openColor(hex)
  }, [openColor])

  const updateLibrary = (next: ColorLibrary) => {
    if (!savedReadable) return false
    try {
      storeLibrary(window.localStorage, next)
      setLibrary(next)
      setSaveError(null)
      return true
    } catch {
      setSaveError('Couldn’t save changes on this device. Browser storage may be full or blocked. Your recipe is still here; try saving again.')
      return false
    }
  }

  const saveCurrent = (result: Pick<SaveInput, 'name' | 'paint' | 'thread'>) => {
    if (!color) return null
    const next = saveColor(library, { id: newId(), hex: color.hex, now: Date.now(), pictureName: point ? pictureName : undefined, ...result })
    if (!updateLibrary(next.library)) return null
    setSavedColor(next.color)
    return next.updated ? 'updated' as const : 'created' as const
  }

  const saveThreadDirect = (
    thread: ThreadSavePayload,
    options?: { sampleHex?: string; colorName?: string; collectionId?: string | null },
  ) => {
    const hex = (options?.sampleHex ?? thread.hex).toUpperCase()
    const now = Date.now()
    const saved = saveColor(library, {
      id: newId(),
      hex,
      name: options?.colorName || thread.name,
      now,
      pictureName: point && options?.sampleHex ? pictureName : undefined,
      thread,
    })
    const finalLibrary = options?.collectionId
      ? setMembership(saved.library, saved.color.id, options.collectionId, true, now)
      : saved.library
    if (!updateLibrary(finalLibrary)) return null
    if (color?.hex === hex) setSavedColor(finalLibrary.colors.find((entry) => entry.id === saved.color.id) ?? saved.color)
    return saved.updated ? 'updated' as const : 'created' as const
  }

  const saveThreadsBatch = (
    threadsToSave: ThreadSavePayload[],
    options?: { collectionId?: string | null },
  ) => {
    if (threadsToSave.length === 0) return 0
    const now = Date.now()
    let working = library
    let count = 0
    for (const thread of threadsToSave) {
      const saved = saveColor(working, {
        id: newId(),
        hex: thread.hex.toUpperCase(),
        name: thread.name,
        now,
        thread,
      })
      working = options?.collectionId
        ? setMembership(saved.library, saved.color.id, options.collectionId, true, now)
        : saved.library
      count++
    }
    if (!updateLibrary(working)) return 0
    refreshSaved(working)
    return count
  }

  const saveThreadMapPull = (threadsToSave: ThreadSavePayload[], requestedName: string) => {
    if (threadsToSave.length === 0) return null
    const now = Date.now()
    const made = createCollection(library, { id: newId(), name: requestedName, now })
    let working = made.library
    const collectionId = made.collection?.id ?? null
    for (const thread of threadsToSave) {
      const saved = saveColor(working, {
        id: newId(),
        hex: thread.hex.toUpperCase(),
        name: thread.name,
        now,
        pictureName,
        thread,
      })
      working = collectionId
        ? setMembership(saved.library, saved.color.id, collectionId, true, now)
        : saved.library
    }
    if (!updateLibrary(working)) return null
    refreshSaved(working)
    if (collectionId) setCollectionFilter(collectionId)
    return made.collection?.name ?? 'All'
  }

  const createNamedCollection = (name: string) => {
    const problem = collectionNameProblem(library, name)
    if (problem) return problem
    const made = createCollection(library, { id: newId(), name, now: Date.now() })
    if (!made.collection || !updateLibrary(made.library)) return 'Couldn’t save the pull on this device. Try again.'
    return { id: made.collection.id }
  }

  const changeSection = (next: AppSection) => {
    setSection(next)
    setSetupOpen(false)
    setMarkTool(null)
    storeSection(next)
    if (next === 'thread') {
      setPeek(false)
      setPlanMode(false)
      setProcessMode(false)
      setEntryOpen(false)
    }
  }

  const refreshSaved = (next: ColorLibrary) =>
    setSavedColor((current) => current ? next.colors.find((entry) => entry.id === current.id) ?? null : current)

  const libraryTools = (
    <LibraryTools
      library={library}
      canWrite={savedReadable}
      onImport={(merged) => {
        if (!updateLibrary(merged)) return false
        refreshSaved(merged)
        setCollectionFilter(null)
        return true
      }}
    />
  )

  const savedList = library.colors.length > 0 && (
    <SavedStrip
      library={library}
      activeId={savedColor?.id ?? null}
      filter={collectionFilter}
      onFilter={setCollectionFilter}
      onOpen={(entry, origin) => {
        openColor(entry.hex, origin)
        setSavedColor(entry)
        setPlanMode(false)
        setProcessMode(false)
      }}
      onRemove={(entry) => {
        if (updateLibrary(removeColor(library, entry.id)) && savedColor?.id === entry.id) setSavedColor(null)
      }}
      onDeleteCollection={(collectionId) => {
        const next = deleteCollection(library, collectionId)
        if (!updateLibrary(next)) return
        setCollectionFilter(null)
        refreshSaved(next)
      }}
    />
  )

  // Drop or paste a picture anywhere; V for values; P for the plan; hold B for the original; ⌘O to open.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
      setIsDragging(true)
    }
    const onDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setIsDragging(false)
    }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      setIsDragging(false)
      void openFile(event.dataTransfer?.files[0])
    }
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith('image/'))
      if (item) void openFile(item.getAsFile())
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.isContentEditable
        || target.getAttribute('role') === 'slider'
      ) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        choosePicture()
      } else if ((event.metaKey || event.ctrlKey) && isThreadMapActive && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoThreadMap()
        else undoThreadMap()
      } else if ((event.metaKey || event.ctrlKey) && isThreadMapActive && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redoThreadMap()
      } else if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      } else if (event.key.toLowerCase() === 'v') {
        setValueView((on) => !on)
      } else if (event.key.toLowerCase() === 'p' && source) {
        setSetupOpen(false)
        setMarkTool(null)
        setPeek(false)
        setProcessMode(false)
        setPlanMode((on) => !on)
      } else if (event.key.toLowerCase() === 's' && (isThreadMapActive || planMode)) {
        setCompareSplit((cur) => (cur === null ? 0.5 : null))
      } else if (event.key.toLowerCase() === 'b') {
        setPeek(true)
      } else if (event.key === 'Escape') {
        setMarkTool(null)
        setSelectedPile(null)
        setSelectedThreadSlot((cur) => {
          if (cur === null) setCompareSplit(null)
          return null
        })
      } else if (isThreadMapActive && threadMap && threadMap.slots.length > 0 && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault()
        const count = threadMap.slots.length
        const delta = event.key === 'ArrowRight' ? 1 : -1
        setSelectedThreadSlot((current) => {
          if (current === null) return delta > 0 ? 0 : count - 1
          return (current + delta + count) % count
        })
      }
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'b') setPeek(false)
    }
    const onBlur = () => setPeek(false)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [choosePicture, isThreadMapActive, openFile, planMode, redoThreadMap, source, threadMap, undoThreadMap])

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(event) => {
        void openFile(event.target.files?.[0])
        event.target.value = ''
      }}
    />
  )

  const handleNote = (id: string, note: string) => {
    const next = setNote(library, id, note, Date.now())
    if (!updateLibrary(next)) return false
    setSavedColor((current) => current?.id === id ? next.colors.find((entry) => entry.id === id) ?? current : current)
    return true
  }

  const handleRemoveColor = (entry: SavedColor) => {
    if (updateLibrary(removeColor(library, entry.id)) && savedColor?.id === entry.id) setSavedColor(null)
  }

  const handleDeleteCollection = (collectionId: string) => {
    const next = deleteCollection(library, collectionId)
    if (!updateLibrary(next)) return
    setCollectionFilter(null)
    refreshSaved(next)
  }

  const handleOpenSaved = (entry: SavedColor, origin?: PourOrigin) => {
    openColor(entry.hex, origin)
    setSavedColor(entry)
    setPlanMode(false)
    setProcessMode(false)
    setThreadTab('match')
  }

  const modeSwitch = (
    <div className={threadStyles.modeSwitch} role="group" aria-label="Section">
      <button type="button" aria-pressed={!isThreadSection} onClick={() => changeSection('color')}>Color</button>
      <button type="button" aria-pressed={isThreadSection} onClick={() => changeSection('thread')}>Thread</button>
    </div>
  )

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
    selectedSlot: threadMap && selectedThreadSlot !== null && selectedThreadSlot < threadMap.slots.length ? selectedThreadSlot : null,
    onSelectSlot: setSelectedThreadSlot,
    geometry: compiledThreadMap?.geometry ?? null,
    previewSwap: previewThreadSwap,
    onPreviewSwap: setPreviewThreadSwap,
    markMisses: markThreadMisses,
    onMarkMissesChange: setMarkThreadMisses,
    onSaveMapPull: saveThreadMapPull,
  }

  const threadStudioProps = {
    source,
    pictureName,
    imageValue,
    color,
    savedColor,
    library,
    canSave: savedReadable,
    collectionFilter,
    onFilterCollection: setCollectionFilter,
    onSaveThread: saveThreadDirect,
    onSaveThreadsBatch: saveThreadsBatch,
    onRemoveColor: handleRemoveColor,
    onNote: handleNote,
    onCreateCollection: createNamedCollection,
    onDeleteCollection: handleDeleteCollection,
    onOpenSaved: (entry: SavedColor) => handleOpenSaved(entry),
    onChoosePicture: choosePicture,
    valueView,
    onToggleValueView: () => setValueView((on) => !on),
    libraryTools,
    threadMap: threadMapBindings,
  }

  const notices = (
    <>
      {opening && <p className={styles.notice} role="status">Opening picture…</p>}
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {saveError && <p className={styles.notice} role="alert">{saveError}</p>}
    </>
  )

  // Within reach of the thumb. The full readout and the Thread view are one tap apart, and the choice is remembered.
  const phoneBar = isPhone && (
    <div className={styles.phoneBar}>
      {phoneThreadView && <button type="button" className={styles.phoneOpen} onClick={choosePicture}>Open…</button>}
      <div className={styles.viewSwitch} role="group" aria-label="What to show">
        <button type="button" aria-pressed={!phoneThreadView} onClick={() => changeSection('color')}>All details</button>
        <button type="button" aria-pressed={phoneThreadView} onClick={() => changeSection('thread')}>Thread</button>
      </div>
    </div>
  )

  if (!source && !color) {
    if (isThreadSection) {
      return (
        <main id="main-content" className={`${styles.app} ${threadStyles.standaloneApp} ${isDragging ? styles.dragging : ''}`}>
          {fileInput}
          <header className={threadStyles.standaloneHeader}>
            <div className={threadStyles.standaloneBrand}>
              <span className={styles.wordmarkSmall}>ColorWizard</span>
              {modeSwitch}
            </div>
            <div className={threadStyles.standaloneActions}>
              <button type="button" className={threadStyles.btnSecondary} onClick={choosePicture}>
                {opening ? 'Opening…' : 'Open photo…'}
              </button>
            </div>
          </header>
          {notices}
          <ThreadStudio {...threadStudioProps} standalone />
        </main>
      )
    }

    return (
      <main id="main-content" className={`${styles.app} ${styles.welcome} ${isDragging ? styles.dragging : ''}`}>
        {fileInput}
        <div className={styles.welcomeBody}>
          <div className={styles.pigmentStudy} aria-hidden="true">
            <WelcomeWordmark />
          </div>
          <h1 className={styles.srOnly}>ColorWizard</h1>
          <p className={styles.tagline}>Open a picture. Click any color.</p>
          <button type="button" className={styles.primaryButton} onClick={choosePicture}>
            {opening ? 'Opening…' : 'Open picture'} <span aria-hidden="true">↗</span>
          </button>
          <button type="button" className={styles.linkButton} onClick={() => changeSection('thread')}>
            Open DMC Thread Studio →
          </button>
          <button type="button" className={styles.linkButton} onClick={() => void openDemo()}>Try a demo picture</button>
          {entryOpen
            ? <ColorEntry autoFocus onSubmit={openTyped} onCancel={() => setEntryOpen(false)} />
            : <button type="button" className={styles.linkButton} onClick={() => setEntryOpen(true)}>Type a color</button>}
          <p className={styles.hint} role={error ? 'alert' : 'status'}>
            {error ?? (opening ? 'Opening picture…' : isDragging ? 'Drop your picture to begin.' : 'Or drop or paste a picture here.')}
          </p>
          <p className={styles.privacyNote}>Your picture stays on this device.</p>
          {savedList}
          {libraryTools}
          {saveError && <p role="alert" className={styles.smallNote}>{saveError}</p>}
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className={`${styles.app} ${styles.workspace} ${phoneThreadView ? styles.threadWorkspace : ''} ${isDragging ? styles.dragging : ''}`}>
      {fileInput}
      {source ? <SimpleCanvas
        key={pictureId}
        source={source}
        display={display}
        renderDisplay={renderDisplay}
        drawGuide={canvasDraft && !isThreadSection ? drawGuide : undefined}
        renderNavigator={threadMapNavigator}
        showNavigator
        compareSplit={!peek && (isThreadMapActive || planMode) ? compareSplit : null}
        onCompareSplitChange={setCompareSplit}
        compareLabels={isThreadMapActive ? ['Original', threadMapOutline ? 'Outline' : 'Map'] : ['Original', 'Plan']}
        label={
          planMode
            ? `Your picture repainted with ${plan?.plan.piles.length ?? budget} piles. Click a part to see its pile, drag to move, scroll or pinch to zoom.`
            : processMode
              ? 'A calculated stage of painting your picture. Drag to move, scroll or pinch to zoom.'
              : isThreadMapActive
                ? `Your photo mapped to ${threadMap?.slots.length ?? threadMapBudget} DMC threads. Click a part to isolate its thread, drag to move, scroll or pinch to zoom.`
                : undefined
        }
        valueView={valueView}
        lightStage={isThreadSection}
        focusRegion={focusRegion}
        point={setupOpen || planMode || processMode || isThreadMapActive ? null : point}
        onSample={handleSample}
        onHoverPixel={isThreadMapActive ? handleHoverPixel : undefined}
      >
        {isThreadMapActive && threadMap && selectedThreadSlot !== null && threadMap.slots[selectedThreadSlot] && (() => {
          const activeSlot = threadMap.slots[selectedThreadSlot]
          const previewingActive = previewThreadSwap?.slotIndex === selectedThreadSlot ? previewThreadSwap.thread : null
          const shownThread = previewingActive ?? activeSlot.thread
          const count = threadMap.slots.length
          const hex = shownThread.hex
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          const ink = (r * 299 + g * 587 + b * 114) / 1000 > 135 ? '#111111' : '#ffffff'
          const nextVellum: VellumMode = vellumMode === 'tracing' ? 'photo' : vellumMode === 'photo' ? 'paper' : 'tracing'
          const vellumLabel = vellumMode === 'tracing' ? 'Tracing' : vellumMode === 'photo' ? 'Photo' : 'Paper'
          return (
            <div className={threadStyles.stitchFocusBar} role="region" aria-label="Isolated thread">
              <span
                className={threadStyles.stitchFocusSwatch}
                style={{ backgroundColor: hex, color: ink }}
                aria-hidden="true"
              >
                {activeSlot.index + 1}
              </span>
              <div className={threadStyles.stitchFocusInfo}>
                <strong>
                  DMC {shownThread.number} · {formatThreadShare(activeSlot.area)}
                  {previewingActive ? ' · Preview' : ''}
                </strong>
                <span>{shownThread.name}</span>
              </div>
              <div className={threadStyles.stitchFocusNav}>
                <button
                  type="button"
                  className={threadStyles.stitchFocusBtn}
                  aria-label="Previous thread"
                  title="Previous thread (←)"
                  onClick={() => setSelectedThreadSlot((selectedThreadSlot - 1 + count) % count)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={threadStyles.stitchFocusBtn}
                  aria-label="Next thread"
                  title="Next thread (→)"
                  onClick={() => setSelectedThreadSlot((selectedThreadSlot + 1) % count)}
                >
                  ›
                </button>
                {!threadMapOutline && (
                  <button
                    type="button"
                    className={threadStyles.stitchFocusBtn}
                    title={`Background reference: ${vellumLabel}. Click to cycle Tracing / Photo / Paper.`}
                    onClick={() => setVellumMode(nextVellum)}
                  >
                    {vellumLabel}
                  </button>
                )}
                <button
                  type="button"
                  className={`${threadStyles.stitchFocusBtn} ${threadStyles.stitchFocusBtnPrimary}`}
                  title="Zoom in on where this thread goes"
                  onClick={() => {
                    const rect = slotBounds(threadMap, selectedThreadSlot)
                    if (rect) {
                      const aligned = threadMapOutline && threadMapOutlineMirror
                        ? { ...rect, x: 1 - rect.x - rect.width }
                        : rect
                      setFocusRegion({ ...aligned, id: ++focusIdRef.current })
                    }
                  }}
                >
                  Zoom in
                </button>
                <button
                  type="button"
                  className={threadStyles.stitchFocusBtn}
                  title="Show all threads (Esc)"
                  onClick={() => setSelectedThreadSlot(null)}
                >
                  All
                </button>
              </div>
            </div>
          )
        })()}
        {isThreadMapActive && !peek && !threadMapOutline && threadMap && previewThreadSwap && threadMap.slots[previewThreadSwap.slotIndex] ? (() => {
          const slot = threadMap.slots[previewThreadSwap.slotIndex]
          const prev = previewThreadSwap.thread
          const isOriginalPeek = Boolean(slot.originalThread && slot.originalThread.id === prev.id)
          return (
            <div className={threadStyles.hoverThreadPill} role="status" aria-live="polite">
              <span className={threadStyles.previewPair} aria-hidden="true">
                <i style={{ backgroundColor: slot.thread.hex }} />
                <i style={{ backgroundColor: prev.hex }} />
              </span>
              <strong>
                {isOriginalPeek
                  ? `Original #${slot.index + 1} · DMC ${prev.number}`
                  : `Preview #${slot.index + 1} · DMC ${prev.number}`}
              </strong>
              <span className={threadStyles.hoverThreadName}>{prev.name}</span>
            </div>
          )
        })() : isThreadMapActive && !peek && threadMap && hoveredThreadSlot !== null && hoveredThreadSlot !== selectedThreadSlot && threadMap.slots[hoveredThreadSlot] && (() => {
          const hoveredSlot = threadMap.slots[hoveredThreadSlot]
          const hex = hoveredSlot.thread.hex
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          const ink = (r * 299 + g * 587 + b * 114) / 1000 > 135 ? '#111111' : '#ffffff'
          return (
            <div className={threadStyles.hoverThreadPill} aria-hidden="true">
              <span
                className={threadStyles.hoverThreadDot}
                style={{ backgroundColor: hex, color: ink }}
              >
                {hoveredSlot.index + 1}
              </span>
              <strong>DMC {hoveredSlot.thread.number}</strong>
              <span className={threadStyles.hoverThreadName}>{hoveredSlot.thread.name}</span>
              <span className={threadStyles.hoverThreadShare}>{formatThreadShare(hoveredSlot.area)}</span>
            </div>
          )
        })()}
        {((planMode && plan) || (processMode && processStages) || (isThreadMapActive && threadMap)) && (
          <div className={styles.stageOverlay}>
            {isThreadMapActive && threadMap && (
              <div className={threadStyles.stageViewBar} role="group" aria-label="Thread map display">
                <button
                  type="button"
                  className={threadStyles.stagePillBtn}
                  aria-pressed={!threadMapOutline}
                  onClick={() => setThreadMapOutline(false)}
                >
                  Map
                </button>
                <button
                  type="button"
                  className={threadStyles.stagePillBtn}
                  aria-pressed={threadMapOutline}
                  onClick={() => setThreadMapOutline(true)}
                  title="Clean black-and-white region outline for fabric transfer"
                >
                  Outline
                </button>
                {threadMapOutline && (
                  <>
                    <span className={threadStyles.stageDivider} aria-hidden="true" />
                    <button
                      type="button"
                      className={threadStyles.stagePillBtn}
                      aria-pressed={threadMapOutlineNumbers}
                      onClick={() => setThreadMapOutlineNumbers((on) => !on)}
                      title="Show subtle thread slot numbers inside regions"
                    >
                      Numbers
                    </button>
                    <button
                      type="button"
                      className={threadStyles.stagePillBtn}
                      aria-pressed={threadMapOutlineMirror}
                      onClick={() => {
                        setThreadMapOutlineMirror((on) => {
                          if (!on) setCompareSplit(null)
                          return !on
                        })
                      }}
                      title="Mirror outline horizontally for iron-on or back-of-fabric transfer"
                    >
                      Mirror
                    </button>
                  </>
                )}
                <span className={threadStyles.stageDivider} aria-hidden="true" />
                <button
                  type="button"
                  className={threadStyles.stagePillBtn}
                  aria-pressed={compareSplit !== null}
                  onClick={() => {
                    setCompareSplit((cur) => {
                      if (cur === null) {
                        setThreadMapOutlineMirror(false)
                        return 0.5
                      }
                      return null
                    })
                  }}
                  title="Drag a split curtain between original photo and map (S)"
                >
                  Split
                </button>
              </div>
            )}
            <button
              type="button"
              className={styles.peekButton}
              aria-pressed={peek}
              title="Hold to see the original picture (B)"
              onPointerDown={(event) => {
                try {
                  event.currentTarget.setPointerCapture(event.pointerId)
                } catch {
                  /* capture only keeps the release inside the button; the hold works without it */
                }
                setPeek(true)
              }}
              onPointerUp={() => setPeek(false)}
              onPointerCancel={() => setPeek(false)}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.preventDefault()
                  setPeek(true)
                }
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') setPeek(false)
              }}
              onBlur={() => setPeek(false)}
            >
              {peek ? 'Original' : 'Hold for original'}
            </button>
          </div>
        )}
      </SimpleCanvas> : (
        <div className={styles.recoveredStage}>
          <p>{savedColor ? (isThreadSection ? 'Saved DMC thread' : 'Saved color & recipe') : 'No picture open'}</p>
          <p className={styles.smallNote}>Open a picture to sample more colors.</p>
          <button type="button" className={styles.primaryButton} onClick={choosePicture}>Open picture</button>
        </div>
      )}

      {phoneThreadView ? (
        <aside className={`${styles.panel} ${styles.threadPanel}`} aria-label="Thread">
          <div className={threadStyles.phoneSubBar} role="tablist" aria-label="Thread studio views">
            <button type="button" role="tab" aria-selected={threadTab === 'match'} onClick={() => setThreadTab('match')}>Match</button>
            <button type="button" role="tab" aria-selected={threadTab === 'map'} onClick={() => setThreadTab('map')}>Map</button>
            <button type="button" role="tab" aria-selected={threadTab === 'browse'} onClick={() => setThreadTab('browse')}>Browse</button>
            <button type="button" role="tab" aria-selected={threadTab === 'tray'} onClick={() => setThreadTab('tray')}>Tray</button>
            <span className={threadStyles.phoneSubSpacer} />
            {source && (
              <button type="button" aria-pressed={valueView} onClick={() => setValueView((on) => !on)} title="Show values only">
                Value
              </button>
            )}
          </div>
          {notices}
          <div className={styles.threadScroll}>
            {threadTab === 'match' ? (
              <>
                {color
                  ? <ThreadView hex={color.hex} savedColor={savedColor} existing={findByHex(library, color.hex) ?? null} canSave={savedReadable} onSave={saveCurrent} />
                  : <p className={styles.threadEmpty}>Tap the picture to find a thread.<small>Hold and slide to aim with the loupe.</small></p>}
                {savedList}
              </>
            ) : (
              <ThreadStudio {...threadStudioProps} activeTab={threadTab} onTabChange={setThreadTab} hideSubTabs />
            )}
          </div>
          {phoneBar}
        </aside>
      ) : isThreadSection ? (
        <aside className={styles.panel} aria-label="Thread">
          <div className={`${styles.toolbar} ${threadStyles.brightToolbar}`}>
            <span className={styles.wordmarkSmall}>ColorWizard</span>
            {modeSwitch}
            <div className={styles.toolbarButtons}>
              <button type="button" onClick={choosePicture} title="Open a picture (⌘O)">Open…</button>
              <button type="button" onClick={() => setValueView((on) => !on)} disabled={!source} aria-pressed={valueView} title="Show values only (V)">Value</button>
            </div>
          </div>
          {notices}
          <ThreadStudio {...threadStudioProps} activeTab={threadTab} onTabChange={setThreadTab} />
        </aside>
      ) : (
      <aside className={styles.panel} aria-label={setupOpen ? 'Canvas setup' : planMode ? 'Plan' : processMode ? 'Painting process' : 'Color'}>
        <div className={styles.toolbar}>
          <span className={styles.wordmarkSmall}>ColorWizard</span>
          {!isPhone && modeSwitch}
          <div className={styles.toolbarButtons}>
            <button type="button" onClick={choosePicture} title="Open a picture (⌘O)">Open…</button>
            <button type="button" onClick={() => { setSetupOpen(false); setMarkTool(null); setEntryOpen((on) => !on) }} aria-pressed={entryOpen} title="Type an exact color">Color…</button>
            <button type="button" onClick={() => { setSetupOpen(false); setMarkTool(null); setPeek(false); setProcessMode(false); setPlanMode((on) => !on) }} disabled={!source} aria-pressed={planMode} title="Plan the whole picture: N piles of paint and where each goes (P)">Plan</button>
            <button type="button" onClick={() => { setSetupOpen(false); setMarkTool(null); setPeek(false); setPlanMode(false); setProcessMode((on) => !on) }} disabled={!source} aria-pressed={processMode} title="Step through painting this picture, from toned canvas to underpainting">Process</button>
            <button type="button" onClick={() => setValueView((on) => !on)} disabled={!source} aria-pressed={valueView} title="Show values only (V)">Value</button>
            <button type="button" onClick={toggleCanvasSetup} disabled={!source} aria-pressed={setupOpen}>Canvas setup</button>
          </div>
        </div>

        {entryOpen && <div className={styles.entryBar}><ColorEntry autoFocus onSubmit={openTyped} onCancel={() => setEntryOpen(false)} /></div>}
        {notices}
        <div className={styles.panelBody}>
          {setupOpen && originalSource ? (
            <CanvasSetupPanel key={pictureId} source={originalSource} draft={canvasDraft} crop={crop} tool={markTool} setTool={setMarkTool}
              onLock={lockCanvas} onChange={updateCanvasDraft} onPlan={showCanvasPlan} status={draftStatus} palette={palette} trials={trialRecipes} />
          ) : processMode ? (
            <ProcessPanel stages={processStages} position={processPosition} onPosition={setProcessPosition} />
          ) : planMode ? (
            <PlanPanel
              state={planState}
              budget={budget}
              onBudget={changeBudget}
              palette={palette}
              selected={plan && selectedPile !== null && selectedPile < plan.plan.piles.length ? selectedPile : null}
              onSelect={setSelectedPile}
              markMisses={markMisses}
              onMarkMisses={setMarkMisses}
              pictureName={pictureName}
              pictureSource={paintingSource}
              canvasTransfer={canvasDraft && crop && originalSource ? { draft: canvasDraft, crop, source: originalSource, trials: trialRecipes } : undefined}
            />
          ) : color ? (
            <ColorReadout
              color={color}
              arrival={arrival}
              canSave={savedReadable}
              savedColor={savedColor}
              existing={findByHex(library, color.hex) ?? null}
              onSave={saveCurrent}
              onNote={handleNote}
              collections={library.collections}
              onToggleCollection={(colorId, collectionId, member) => {
                const next = setMembership(library, colorId, collectionId, member, Date.now())
                if (!updateLibrary(next)) return false
                refreshSaved(next)
                return true
              }}
              onCreateCollection={(colorId, name) => {
                const problem = collectionNameProblem(library, name)
                if (problem) return problem
                const made = createCollection(library, { id: newId(), name, now: Date.now() })
                const next = setMembership(made.library, colorId, made.collection!.id, true, Date.now())
                if (!updateLibrary(next)) return 'Couldn’t save the collection on this device. Try again.'
                refreshSaved(next)
                return null
              }}
              onRecalculate={() => setSavedColor(null)}
              onOpenColor={openColor}
            />
          ) : (
            <p className={styles.emptyReadout}>Click the picture to read a color.</p>
          )}
        </div>

        {!setupOpen && !planMode && !processMode && <>{savedList}{libraryTools}</>}
        {phoneBar}
      </aside>
      )}
    </main>
  )
}
