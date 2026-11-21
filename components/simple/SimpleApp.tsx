'use client'

/**
 * ColorWizard, the simplest version of itself.
 * Open a picture. Click any color. See what it is, how to mix it, and which thread matches.
 * Or press P to plan the whole picture: N piles of paint, and where each goes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { createSolidColorDemoImage } from '@/lib/demoColor'
import { collectionNameProblem, createCollection, deleteCollection, emptyLibrary, findByHex, loadLibrary, removeColor, saveColor, setMembership, setNote, storeLibrary, type ColorLibrary, type SaveInput, type SavedColor } from '@/lib/colorLibrary'
import { hexToRgb } from '@/lib/color/conversions'
import { newId } from '@/lib/newId'
import { computeImageValueContextFromCanvas } from '@/lib/dmc/studio'
import {
  DEFAULT_FULL_COLOR_BUDGET,
  DEFAULT_MONOCHROME_BUDGET,
  type FullColorBudget,
  type MonochromeBudget,
  type MonochromeTone,
  type ThreadMapMode,
} from '@/lib/dmc/map/types'
import { useDmcStore } from '@/lib/store/useDmcStore'
import { createSourceBuffer, decodeImageFile, isMemoryConstrained } from '@/lib/imagePipeline'
import { resolvePalettePigments } from '@/lib/paint/palettePigments'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import ColorEntry from './ColorEntry'
import ColorReadout, { type Arrival } from './ColorReadout'
import { usePaintPalette } from './PaintPalette'
import LibraryTools from './LibraryTools'
import PlanPanel from './PlanPanel'
import ProcessPanel, { useProcessDisplay, useProcessStages } from './ProcessPanel'
import SavedStrip from './SavedStrip'
import { BUDGETS, type Budget } from '@/lib/paint/plan/planFit'
import { pileAt, renderRepaint } from './planRender'
import { renderThreadMap, threadSlotAt } from './threadMapRender'
import { usePicturePlan } from './usePlan'
import { useThreadMap } from './useThreadMap'
import type { PourOrigin } from './pour'
import SimpleCanvas, { type PickedColor, type SamplePoint } from './SimpleCanvas'
import ThreadStudio, { type StudioTab, type ThreadSavePayload } from './ThreadStudio'
import ThreadView from './ThreadView'
import styles from './simple.module.css'
import threadStyles from './threadStudio.module.css'

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

export interface SimpleAppProps {
  /** Opens directly in Color or Thread mode (used by `/thread`). */
  initialSection?: AppSection
}

export default function SimpleApp({ initialSection }: SimpleAppProps = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<HTMLCanvasElement | null>(null)
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
  const [threadMapMode, setThreadMapMode] = useState<ThreadMapMode>('full-color')
  const [threadFullBudget, setThreadFullBudget] = useState<FullColorBudget>(DEFAULT_FULL_COLOR_BUDGET)
  const [threadMonoBudget, setThreadMonoBudget] = useState<MonochromeBudget>(DEFAULT_MONOCHROME_BUDGET)
  const [threadMonoTone, setThreadMonoTone] = useState<MonochromeTone>('warm-grays')
  const [threadPreferBox, setThreadPreferBox] = useState(false)
  const [selectedThreadSlot, setSelectedThreadSlot] = useState<number | null>(null)
  const [markThreadMisses, setMarkThreadMisses] = useState(false)
  const dmcStash = useDmcStore((s) => s.stash)
  const isPhone = useMediaQuery('(max-width: 760px)')
  const isThreadSection = section === 'thread' && !planMode && !processMode
  const isThreadMapActive = isThreadSection && threadTab === 'map' && Boolean(source)
  const phoneThreadView = isPhone && isThreadSection
  const openRequestRef = useRef(0)

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
    if (!initialSection) setSection(loadSection())
  }, [initialSection])

  const imageValue = useMemo(() => computeImageValueContextFromCanvas(source), [source])
  const palette = usePaintPalette()
  const pigments = useMemo(() => resolvePalettePigments(palette.colors), [palette])
  const planState = usePicturePlan(source, planMode, budget, pigments)
  const plan = planState.result

  // A new plan (another budget, palette or picture) starts with every pile showing.
  useEffect(() => setSelectedPile(null), [plan])

  const threadMapBudget = threadMapMode === 'monochrome' ? threadMonoBudget : threadFullBudget
  const threadMapState = useThreadMap(
    source,
    isThreadMapActive,
    threadMapMode,
    threadMapBudget,
    threadMonoTone,
    threadPreferBox,
    dmcStash,
  )
  const threadMap = threadMapState.result

  // Reset thread isolation when switching photo, mode, tone, or budget (preserving isolation during live swaps).
  useEffect(() => {
    setSelectedThreadSlot(null)
  }, [source, threadMapMode, threadMapBudget, threadMonoTone, threadPreferBox])

  const changeBudget = useCallback((next: Budget) => {
    setBudget(next)
    storeBudget(next)
  }, [])

  const processStages = useProcessStages(source, processMode)
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

  const threadMapDisplay = useMemo(() => {
    if (!isThreadMapActive || peek || !threadMap) return null
    const canvas = document.createElement('canvas')
    canvas.width = threadMap.width
    canvas.height = threadMap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    const image = ctx.createImageData(threadMap.width, threadMap.height)
    image.data.set(renderThreadMap(threadMap, { selected: selectedThreadSlot, markMisses: markThreadMisses }))
    ctx.putImageData(image, 0, 0)
    return canvas
  }, [isThreadMapActive, peek, threadMap, selectedThreadSlot, markThreadMisses])

  const display = planMode
    ? planDisplay
    : processMode && !peek
      ? processDisplay
      : isThreadMapActive
        ? threadMapDisplay
        : null

  const openPicture = useCallback(async (decode: () => Promise<HTMLImageElement>, name: string) => {
    const request = ++openRequestRef.current
    setOpening(true)
    setError(null)
    try {
      const image = await decode()
      const buffer = await createSourceBuffer(image, isMemoryConstrained() ? MAX_DIMENSION_CONSTRAINED : MAX_DIMENSION)
      if (request !== openRequestRef.current) return
      setSource(buffer)
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
    } catch {
      if (request === openRequestRef.current) setError('Couldn’t open that picture. Try a JPEG or PNG.')
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
    await openPicture(() => decodeImageFile(file), file.name)
  }, [openPicture])

  const openDemo = () => openPicture(() => createSolidColorDemoImage('#C45C3E'), 'Terracotta demo')

  const choosePicture = useCallback(() => fileInputRef.current?.click(), [])

  const arrive = useCallback((origin: PourOrigin | undefined) => {
    setArrival(origin ? (current) => ({ id: (current?.id ?? 0) + 1, origin }) : null)
  }, [])

  const handleSample = useCallback((nextPoint: SamplePoint, picked: PickedColor, origin?: PourOrigin) => {
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
      const slot = threadSlotAt(threadMap, nextPoint.x, nextPoint.y, source.width, source.height)
      setSelectedThreadSlot((current) => (origin && current === slot ? null : slot))
      return
    }
    setSavedColor(null)
    setPoint(nextPoint)
    setColor(picked)
    setThreadTab('match')
    arrive(origin)
  }, [arrive, isThreadMapActive, plan, planMode, processMode, source, threadMap])

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
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        choosePicture()
      } else if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      } else if (event.key.toLowerCase() === 'v') {
        setValueView((on) => !on)
      } else if (event.key.toLowerCase() === 'p' && source) {
        setPeek(false)
        setProcessMode(false)
        setPlanMode((on) => !on)
      } else if (event.key.toLowerCase() === 'b') {
        setPeek(true)
      } else if (event.key === 'Escape') {
        setSelectedPile(null)
        setSelectedThreadSlot(null)
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
  }, [choosePicture, openFile, source])

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
    preferBox: threadPreferBox,
    onPreferBoxChange: setThreadPreferBox,
    selectedSlot: threadMap && selectedThreadSlot !== null && selectedThreadSlot < threadMap.slots.length ? selectedThreadSlot : null,
    onSelectSlot: setSelectedThreadSlot,
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
          <figure className={styles.pigmentStudy} aria-hidden="true">
            <Image
              src="/images/welcome-pigment-cutout.webp"
              alt=""
              width={1536}
              height={512}
              priority
              sizes="(max-width: 760px) 100vw, 740px"
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
          <button type="button" className={styles.linkButton} onClick={() => void openDemo()}>Try demo color Terracotta</button>
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
        point={planMode || processMode || isThreadMapActive ? null : point}
        onSample={handleSample}
      >
        {((planMode && plan) || (processMode && processStages) || (isThreadMapActive && threadMap)) && (
          <div className={styles.stageOverlay}>
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
          <div className={styles.toolbar}>
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
      <aside className={styles.panel} aria-label={planMode ? 'Plan' : processMode ? 'Painting process' : 'Color'}>
        <div className={styles.toolbar}>
          <span className={styles.wordmarkSmall}>ColorWizard</span>
          {!isPhone && modeSwitch}
          <div className={styles.toolbarButtons}>
            <button type="button" onClick={choosePicture} title="Open a picture (⌘O)">Open…</button>
            <button type="button" onClick={() => setEntryOpen((on) => !on)} aria-pressed={entryOpen} title="Type an exact color">Color…</button>
            <button type="button" onClick={() => { setPeek(false); setProcessMode(false); setPlanMode((on) => !on) }} disabled={!source} aria-pressed={planMode} title="Plan the whole picture: N piles of paint and where each goes (P)">Plan</button>
            <button type="button" onClick={() => { setPeek(false); setPlanMode(false); setProcessMode((on) => !on) }} disabled={!source} aria-pressed={processMode} title="Step through painting this picture, from toned canvas to underpainting">Process</button>
            <button type="button" onClick={() => setValueView((on) => !on)} disabled={!source} aria-pressed={valueView} title="Show values only (V)">Value</button>
          </div>
        </div>

        {entryOpen && <div className={styles.entryBar}><ColorEntry autoFocus onSubmit={openTyped} onCancel={() => setEntryOpen(false)} /></div>}
        {notices}
        <div className={styles.panelBody}>
          {processMode ? (
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
              pictureSource={source}
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

        {!planMode && !processMode && <>{savedList}{libraryTools}</>}
        {phoneBar}
      </aside>
      )}
    </main>
  )
}
