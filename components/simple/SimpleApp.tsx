'use client'

/**
 * ColorWizard, the simplest version of itself.
 * Open a picture. Click any color. See what it is, how to mix it, and which thread matches.
 * Or press P to plan the whole picture: N piles of paint, and where each goes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { averageColorAt, DEMO_PICTURE, firstSamplePixel } from '@/lib/demoPicture'
import { hexToRgb, rgbToHex } from '@/lib/color/conversions'
import { computeImageValueContextFromCanvas } from '@/lib/dmc/studio'
import { canvasPictureKey, type CanvasFace } from '@/lib/paint/canvasSetup'
import type { SavedColor } from '@/lib/colorLibrary'
import { createSourceBuffer, decodeImage, decodeImageFile, isMemoryConstrained } from '@/lib/imagePipeline'
import { resolvePalettePigments } from '@/lib/paint/palettePigments'
import { BUDGETS, type Budget } from '@/lib/paint/plan/planFit'
import { formatThreadShare } from '@/lib/dmc/map/mapFit'
import ColorEntry from './ColorEntry'
import type { Arrival } from './ColorReadout'
import { usePaintPalette } from './PaintPalette'
import LibraryTools from './LibraryTools'
import { useProcessDisplay, useProcessStages } from './useProcess'
import SavedStrip from './SavedStrip'
import { pileAt, renderRepaint } from './planRender'
import type { VellumMode } from './threadMapCanvas'
import { usePicturePlan } from './usePlan'
import type { PourOrigin } from './pour'
import type { PickedColor, SamplePoint } from './SimpleCanvas'
import { useSimpleLibrary } from './useSimpleLibrary'
import { useCanvasSetupState } from './useCanvasSetupState'
import { useThreadStudioState, type AppSection } from './useThreadStudioState'
import styles from './simple.module.css'
import threadStyles from './threadStudio.module.css'

export type { AppSection }

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

function colorFromHex(hex: string): PickedColor | null {
  const rgb = hexToRgb(hex)
  return rgb ? { hex: hex.toUpperCase(), rgb } : null
}

export interface SimpleAppProps {
  /** Opens directly in Color or Thread mode (used by `/thread`). */
  initialSection?: AppSection
}

export default function SimpleApp({ initialSection }: SimpleAppProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [originalSource, setOriginalSource] = useState<HTMLCanvasElement | null>(null)
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
  const [compareSplit, setCompareSplit] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [entryOpen, setEntryOpen] = useState(false)
  const openRequestRef = useRef(0)

  const palette = usePaintPalette()
  const pigments = useMemo(() => resolvePalettePigments(palette.colors), [palette])

  const lib = useSimpleLibrary({ color, point, pictureName })
  const canvasSetup = useCanvasSetupState({ originalSource, palette })
  const thread = useThreadStudioState({
    initialSection,
    originalSource,
    planMode,
    processMode,
    setupOpen: canvasSetup.setupOpen,
    peek,
    onSaveMapPull: lib.saveThreadMapPull,
  })

  const source = thread.isThreadSection ? originalSource : canvasSetup.paintingSource

  useEffect(() => setBudget(loadBudget()), [])

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
  const planState = usePicturePlan(canvasSetup.paintingSource, planMode, budget, pigments)
  const plan = planState.result

  // A new plan (another budget, palette or picture) starts with every pile showing.
  useEffect(() => setSelectedPile(null), [plan])

  const changeBudget = useCallback((next: Budget) => {
    setBudget(next)
    storeBudget(next)
  }, [])

  const processStages = useProcessStages(canvasSetup.paintingSource, processMode)
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

  const renderDisplay = !planMode && !processMode && thread.isThreadMapActive ? thread.threadMapRenderer : null
  const display = planMode
    ? planDisplay
    : processMode && !peek
      ? processDisplay
      : thread.isThreadMapActive
        ? thread.threadMapFallbackDisplay
        : null

  const {
    restoreForPicture,
    closeSetup,
    setMarkTool,
    setupOpen,
    markTool,
    canvasDraft,
    crop,
    placeMarkAt,
  } = canvasSetup
  const { setSavedColor } = lib
  const {
    resetForNewPicture,
    undoThreadMap,
    redoThreadMap,
    stepSelectedSlot,
    setSelectedThreadSlot,
    selectSlotAtPoint,
    setThreadTab,
  } = thread

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
      setOriginalSource(buffer)
      restoreForPicture(pictureKey)
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
      setCompareSplit(null)
      resetForNewPicture()
      return buffer
    } catch {
      if (request === openRequestRef.current) setError('Couldn’t open that picture. Try a JPEG or PNG.')
      return null
    } finally {
      if (request === openRequestRef.current) setOpening(false)
    }
  }, [resetForNewPicture, restoreForPicture, setSavedColor])

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

  const lockCanvas = (face: CanvasFace) => {
    canvasSetup.lockCanvasFace(face)
    setPoint(null)
    setColor(null)
    setSelectedPile(null)
    setCompareSplit(null)
  }

  const toggleCanvasSetup = () => {
    canvasSetup.setSetupOpen(!canvasSetup.setupOpen)
    canvasSetup.setMarkTool(null)
    setPeek(false)
    setPlanMode(false)
    setProcessMode(false)
    setValueView(false)
    setEntryOpen(false)
  }

  const showCanvasPlan = () => {
    canvasSetup.closeSetup()
    setProcessMode(false)
    setPeek(false)
    setPlanMode(true)
  }

  const handleSample = useCallback((nextPoint: SamplePoint, picked: PickedColor, origin?: PourOrigin) => {
    if (setupOpen && markTool && canvasDraft && originalSource && crop && source) {
      if (!origin) return
      placeMarkAt(nextPoint, source)
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
    if (thread.isThreadMapActive) {
      // In Thread Map a click isolates that DMC thread on the canvas; clicking it again shows all threads.
      if (!thread.threadMap || !source) return
      selectSlotAtPoint(nextPoint.x, nextPoint.y, source.width, source.height, Boolean(origin))
      return
    }
    setSavedColor(null)
    setPoint(nextPoint)
    setColor(picked)
    setThreadTab('match')
    arrive(origin)
  }, [
    arrive,
    canvasDraft,
    crop,
    markTool,
    originalSource,
    placeMarkAt,
    plan,
    planMode,
    processMode,
    selectSlotAtPoint,
    setSavedColor,
    setThreadTab,
    setupOpen,
    source,
    thread.isThreadMapActive,
    thread.threadMap,
  ])

  const openColor = useCallback((hex: string, origin?: PourOrigin) => {
    const picked = colorFromHex(hex)
    if (!picked) return
    setSavedColor(null)
    setPoint(null)
    setColor(picked)
    arrive(origin)
  }, [arrive, setSavedColor])

  const openTyped = useCallback((hex: string) => {
    setEntryOpen(false)
    setPlanMode(false)
    setProcessMode(false)
    openColor(hex)
  }, [openColor])

  const changeSection = (next: AppSection) => {
    thread.selectSection(next)
    canvasSetup.closeSetup()
    if (next === 'thread') {
      setPeek(false)
      setPlanMode(false)
      setProcessMode(false)
      setEntryOpen(false)
    }
  }

  const handleOpenSaved = (entry: SavedColor, origin?: PourOrigin) => {
    openColor(entry.hex, origin)
    lib.setSavedColor(entry)
    setPlanMode(false)
    setProcessMode(false)
    thread.setThreadTab('match')
  }

  const libraryTools = (
    <LibraryTools
      library={lib.library}
      canWrite={lib.savedReadable}
      onImport={lib.importBackup}
    />
  )

  const savedList = lib.library.colors.length > 0 && (
    <SavedStrip
      library={lib.library}
      activeId={lib.savedColor?.id ?? null}
      filter={lib.collectionFilter}
      onFilter={lib.setCollectionFilter}
      onOpen={(entry, origin) => {
        openColor(entry.hex, origin)
        lib.setSavedColor(entry)
        setPlanMode(false)
        setProcessMode(false)
      }}
      onRemove={lib.handleRemoveColor}
      onDeleteCollection={lib.handleDeleteCollection}
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
      } else if ((event.metaKey || event.ctrlKey) && thread.isThreadMapActive && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoThreadMap()
        else undoThreadMap()
      } else if ((event.metaKey || event.ctrlKey) && thread.isThreadMapActive && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redoThreadMap()
      } else if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      } else if (event.key.toLowerCase() === 'v') {
        setValueView((on) => !on)
      } else if (event.key.toLowerCase() === 'p' && source) {
        closeSetup()
        setPeek(false)
        setProcessMode(false)
        setPlanMode((on) => !on)
      } else if (event.key.toLowerCase() === 's' && (thread.isThreadMapActive || planMode)) {
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
      } else if (
        thread.isThreadMapActive
        && thread.threadMap
        && thread.threadMap.slots.length > 0
        && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')
      ) {
        event.preventDefault()
        stepSelectedSlot(event.key === 'ArrowRight' ? 1 : -1)
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
  }, [
    choosePicture,
    closeSetup,
    openFile,
    planMode,
    redoThreadMap,
    setMarkTool,
    setSelectedThreadSlot,
    source,
    stepSelectedSlot,
    thread.isThreadMapActive,
    thread.threadMap,
    undoThreadMap,
  ])

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

  const modeSwitch = (
    <div className={threadStyles.modeSwitch} role="group" aria-label="Section">
      <button type="button" aria-pressed={!thread.isThreadSection} onClick={() => changeSection('color')}>Color</button>
      <button type="button" aria-pressed={thread.isThreadSection} onClick={() => changeSection('thread')}>Thread</button>
    </div>
  )

  const threadStudioProps = {
    source,
    pictureName,
    imageValue,
    color,
    savedColor: lib.savedColor,
    library: lib.library,
    canSave: lib.savedReadable,
    collectionFilter: lib.collectionFilter,
    onFilterCollection: lib.setCollectionFilter,
    onSaveThread: lib.saveThreadDirect,
    onSaveThreadsBatch: lib.saveThreadsBatch,
    onRemoveColor: lib.handleRemoveColor,
    onNote: lib.handleNote,
    onCreateCollection: lib.createNamedCollection,
    onDeleteCollection: lib.handleDeleteCollection,
    onOpenSaved: (entry: SavedColor) => handleOpenSaved(entry),
    onChoosePicture: choosePicture,
    valueView,
    onToggleValueView: () => setValueView((on) => !on),
    libraryTools,
    threadMap: thread.threadMapBindings,
  }

  const notices = (
    <>
      {opening && <p className={styles.notice} role="status">Opening picture…</p>}
      {error && <p className={styles.notice} role="alert">{error}</p>}
      {lib.saveError && <p className={styles.notice} role="alert">{lib.saveError}</p>}
    </>
  )

  // Within reach of the thumb. The full readout and the Thread view are one tap apart, and the choice is remembered.
  const phoneBar = thread.isPhone && (
    <div className={styles.phoneBar}>
      {thread.phoneThreadView && <button type="button" className={styles.phoneOpen} onClick={choosePicture}>Open…</button>}
      <div className={styles.viewSwitch} role="group" aria-label="What to show">
        <button type="button" aria-pressed={!thread.phoneThreadView} onClick={() => changeSection('color')}>All details</button>
        <button type="button" aria-pressed={thread.phoneThreadView} onClick={() => changeSection('thread')}>Thread</button>
      </div>
    </div>
  )

  if (!source && !color) {
    if (thread.isThreadSection) {
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
          <figure className={styles.pigmentStudy} aria-hidden="true">
            {/* A plain <img> so phones get the 768 px file: next/image writes no srcset with `images.unoptimized`. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/welcome-pigment-cutout.webp"
              srcSet="/images/welcome-pigment-cutout-768.webp 768w, /images/welcome-pigment-cutout.webp 1536w"
              sizes="(max-width: 760px) 100vw, 740px"
              alt=""
              width={1536}
              height={512}
              fetchPriority="high"
              decoding="async"
              className={styles.pigmentImage}
            />
            <figcaption className={styles.studyCaption}>A study in color</figcaption>
          </figure>
          <h1 className={styles.wordmark}>ColorWizard</h1>
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
          {lib.saveError && <p role="alert" className={styles.smallNote}>{lib.saveError}</p>}
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className={`${styles.app} ${styles.workspace} ${thread.phoneThreadView ? styles.threadWorkspace : ''} ${isDragging ? styles.dragging : ''}`}>
      {fileInput}
      {source ? <SimpleCanvas
        key={pictureId}
        source={source}
        display={display}
        renderDisplay={renderDisplay}
        drawGuide={canvasSetup.canvasDraft && !thread.isThreadSection ? canvasSetup.drawGuide : undefined}
        renderNavigator={thread.threadMapNavigator}
        showNavigator
        compareSplit={!peek && (thread.isThreadMapActive || planMode) ? compareSplit : null}
        onCompareSplitChange={setCompareSplit}
        compareLabels={thread.isThreadMapActive ? ['Original', thread.threadMapOutline ? 'Outline' : 'Map'] : ['Original', 'Plan']}
        label={
          planMode
            ? `Your picture repainted with ${plan?.plan.piles.length ?? budget} piles. Click a part to see its pile, drag to move, scroll or pinch to zoom.`
            : processMode
              ? 'A calculated stage of painting your picture. Drag to move, scroll or pinch to zoom.'
              : thread.isThreadMapActive
                ? `Your photo mapped to ${thread.threadMap?.slots.length ?? thread.threadMapBudget} DMC threads. Click a part to isolate its thread, drag to move, scroll or pinch to zoom.`
                : undefined
        }
        valueView={valueView}
        lightStage={thread.isThreadSection}
        focusRegion={thread.focusRegion}
        point={canvasSetup.setupOpen || planMode || processMode || thread.isThreadMapActive ? null : point}
        onSample={handleSample}
        onHoverPixel={thread.isThreadMapActive ? thread.handleHoverPixel : undefined}
      >
        {thread.isThreadMapActive && thread.threadMap && thread.selectedThreadSlot !== null && thread.threadMap.slots[thread.selectedThreadSlot] && (() => {
          const activeSlot = thread.threadMap.slots[thread.selectedThreadSlot]
          const previewingActive = thread.previewThreadSwap?.slotIndex === thread.selectedThreadSlot ? thread.previewThreadSwap.thread : null
          const shownThread = previewingActive ?? activeSlot.thread
          const count = thread.threadMap.slots.length
          const hex = shownThread.hex
          const r = parseInt(hex.slice(1, 3), 16)
          const g = parseInt(hex.slice(3, 5), 16)
          const b = parseInt(hex.slice(5, 7), 16)
          const ink = (r * 299 + g * 587 + b * 114) / 1000 > 135 ? '#111111' : '#ffffff'
          const nextVellum: VellumMode = thread.vellumMode === 'tracing' ? 'photo' : thread.vellumMode === 'photo' ? 'paper' : 'tracing'
          const vellumLabel = thread.vellumMode === 'tracing' ? 'Tracing' : thread.vellumMode === 'photo' ? 'Photo' : 'Paper'
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
                  onClick={() => thread.setSelectedThreadSlot((thread.selectedThreadSlot! - 1 + count) % count)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={threadStyles.stitchFocusBtn}
                  aria-label="Next thread"
                  title="Next thread (→)"
                  onClick={() => thread.setSelectedThreadSlot((thread.selectedThreadSlot! + 1) % count)}
                >
                  ›
                </button>
                {!thread.threadMapOutline && (
                  <button
                    type="button"
                    className={threadStyles.stitchFocusBtn}
                    title={`Background reference: ${vellumLabel}. Click to cycle Tracing / Photo / Paper.`}
                    onClick={() => thread.setVellumMode(nextVellum)}
                  >
                    {vellumLabel}
                  </button>
                )}
                <button
                  type="button"
                  className={`${threadStyles.stitchFocusBtn} ${threadStyles.stitchFocusBtnPrimary}`}
                  title="Zoom in on where this thread goes"
                  onClick={thread.zoomToSelectedSlot}
                >
                  Zoom in
                </button>
                <button
                  type="button"
                  className={threadStyles.stitchFocusBtn}
                  title="Show all threads (Esc)"
                  onClick={() => thread.setSelectedThreadSlot(null)}
                >
                  All
                </button>
              </div>
            </div>
          )
        })()}
        {thread.isThreadMapActive && !peek && !thread.threadMapOutline && thread.threadMap && thread.previewThreadSwap && thread.threadMap.slots[thread.previewThreadSwap.slotIndex] ? (() => {
          const slot = thread.threadMap.slots[thread.previewThreadSwap.slotIndex]
          const prev = thread.previewThreadSwap.thread
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
        })() : thread.isThreadMapActive && !peek && thread.threadMap && thread.hoveredThreadSlot !== null && thread.hoveredThreadSlot !== thread.selectedThreadSlot && thread.threadMap.slots[thread.hoveredThreadSlot] && (() => {
          const hoveredSlot = thread.threadMap.slots[thread.hoveredThreadSlot]
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
        {((planMode && plan) || (processMode && processStages) || (thread.isThreadMapActive && thread.threadMap)) && (
          <div className={styles.stageOverlay}>
            {thread.isThreadMapActive && thread.threadMap && (
              <div className={threadStyles.stageViewBar} role="group" aria-label="Thread map display">
                <button
                  type="button"
                  className={threadStyles.stagePillBtn}
                  aria-pressed={!thread.threadMapOutline}
                  onClick={() => thread.setThreadMapOutline(false)}
                >
                  Map
                </button>
                <button
                  type="button"
                  className={threadStyles.stagePillBtn}
                  aria-pressed={thread.threadMapOutline}
                  onClick={() => thread.setThreadMapOutline(true)}
                  title="Clean black-and-white region outline for fabric transfer"
                >
                  Outline
                </button>
                {thread.threadMapOutline && (
                  <>
                    <span className={threadStyles.stageDivider} aria-hidden="true" />
                    <button
                      type="button"
                      className={threadStyles.stagePillBtn}
                      aria-pressed={thread.threadMapOutlineNumbers}
                      onClick={() => thread.setThreadMapOutlineNumbers((on) => !on)}
                      title="Show subtle thread slot numbers inside regions"
                    >
                      Numbers
                    </button>
                    <button
                      type="button"
                      className={threadStyles.stagePillBtn}
                      aria-pressed={thread.threadMapOutlineMirror}
                      onClick={() => {
                        thread.setThreadMapOutlineMirror((on) => {
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
                        thread.setThreadMapOutlineMirror(false)
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
          <p>{lib.savedColor ? (thread.isThreadSection ? 'Saved DMC thread' : 'Saved color & recipe') : 'No picture open'}</p>
          <p className={styles.smallNote}>Open a picture to sample more colors.</p>
          <button type="button" className={styles.primaryButton} onClick={choosePicture}>Open picture</button>
        </div>
      )}

      {thread.phoneThreadView ? (
        <aside className={`${styles.panel} ${styles.threadPanel}`} aria-label="Thread">
          <div className={threadStyles.phoneSubBar} role="tablist" aria-label="Thread studio views">
            <button type="button" role="tab" aria-selected={thread.threadTab === 'match'} onClick={() => thread.setThreadTab('match')}>Match</button>
            <button type="button" role="tab" aria-selected={thread.threadTab === 'map'} onClick={() => thread.setThreadTab('map')}>Map</button>
            <button type="button" role="tab" aria-selected={thread.threadTab === 'browse'} onClick={() => thread.setThreadTab('browse')}>Browse</button>
            <button type="button" role="tab" aria-selected={thread.threadTab === 'tray'} onClick={() => thread.setThreadTab('tray')}>Tray</button>
            <span className={threadStyles.phoneSubSpacer} />
            {source && (
              <button type="button" aria-pressed={valueView} onClick={() => setValueView((on) => !on)} title="Show values only">
                Value
              </button>
            )}
          </div>
          {notices}
          <div className={styles.threadScroll}>
            {thread.threadTab === 'match' ? (
              <>
                {color
                  ? <ThreadView hex={color.hex} savedColor={lib.savedColor} existing={lib.findExistingByHex(color.hex)} canSave={lib.savedReadable} onSave={lib.saveCurrent} />
                  : <p className={styles.threadEmpty}>Tap the picture to find a thread.<small>Hold and slide to aim with the loupe.</small></p>}
                {savedList}
              </>
            ) : (
              <ThreadStudio {...threadStudioProps} activeTab={thread.threadTab} onTabChange={thread.setThreadTab} hideSubTabs />
            )}
          </div>
          {phoneBar}
        </aside>
      ) : thread.isThreadSection ? (
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
          <ThreadStudio {...threadStudioProps} activeTab={thread.threadTab} onTabChange={thread.setThreadTab} />
        </aside>
      ) : (
      <aside className={styles.panel} aria-label={canvasSetup.setupOpen ? 'Canvas setup' : planMode ? 'Plan' : processMode ? 'Painting process' : 'Color'}>
        <div className={styles.toolbar}>
          <span className={styles.wordmarkSmall}>ColorWizard</span>
          {!thread.isPhone && modeSwitch}
          <div className={styles.toolbarButtons}>
            <button type="button" onClick={choosePicture} title="Open a picture (⌘O)">Open…</button>
            <button type="button" onClick={() => { canvasSetup.closeSetup(); setEntryOpen((on) => !on) }} aria-pressed={entryOpen} title="Type an exact color">Color…</button>
            <button type="button" onClick={() => { canvasSetup.closeSetup(); setPeek(false); setProcessMode(false); setPlanMode((on) => !on) }} disabled={!source} aria-pressed={planMode} title="Plan the whole picture: N piles of paint and where each goes (P)">Plan</button>
            <button type="button" onClick={() => { canvasSetup.closeSetup(); setPeek(false); setPlanMode(false); setProcessMode((on) => !on) }} disabled={!source} aria-pressed={processMode} title="Step through painting this picture, from toned canvas to underpainting">Process</button>
            <button type="button" onClick={() => setValueView((on) => !on)} disabled={!source} aria-pressed={valueView} title="Show values only (V)">Value</button>
            <button type="button" onClick={toggleCanvasSetup} disabled={!source} aria-pressed={canvasSetup.setupOpen}>Canvas setup</button>
          </div>
        </div>

        {entryOpen && <div className={styles.entryBar}><ColorEntry autoFocus onSubmit={openTyped} onCancel={() => setEntryOpen(false)} /></div>}
        {notices}
        <div className={styles.panelBody}>
          {canvasSetup.setupOpen && originalSource ? (
            <CanvasSetupPanel
              key={pictureId}
              source={originalSource}
              draft={canvasSetup.canvasDraft}
              crop={canvasSetup.crop}
              tool={canvasSetup.markTool}
              setTool={canvasSetup.setMarkTool}
              onLock={lockCanvas}
              onChange={canvasSetup.updateCanvasDraft}
              onPlan={showCanvasPlan}
              status={canvasSetup.draftStatus}
              palette={palette}
              trials={canvasSetup.trialRecipes}
            />
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
              pictureSource={canvasSetup.paintingSource}
              canvasTransfer={canvasSetup.canvasDraft && canvasSetup.crop && originalSource ? { draft: canvasSetup.canvasDraft, crop: canvasSetup.crop, source: originalSource, trials: canvasSetup.trialRecipes } : undefined}
            />
          ) : color ? (
            <ColorReadout
              color={color}
              arrival={arrival}
              canSave={lib.savedReadable}
              savedColor={lib.savedColor}
              existing={lib.findExistingByHex(color.hex)}
              onSave={lib.saveCurrent}
              onNote={lib.handleNote}
              collections={lib.library.collections}
              onToggleCollection={lib.toggleCollection}
              onCreateCollection={lib.createAndAssignCollection}
              onRecalculate={() => lib.setSavedColor(null)}
              onOpenColor={openColor}
            />
          ) : (
            <p className={styles.emptyReadout}>Click the picture to read a color.</p>
          )}
        </div>

        {!canvasSetup.setupOpen && !planMode && !processMode && <>{savedList}{libraryTools}</>}
        {phoneBar}
      </aside>
      )}
    </main>
  )
}
