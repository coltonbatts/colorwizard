'use client'

/**
 * ColorWizard, the simplest version of itself.
 * Open a picture. Click any color. See what it is, how to mix it, and which thread matches.
 * Or press P to plan the whole picture: N piles of paint, and where each goes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { createSolidColorDemoImage } from '@/lib/demoColor'
import { collectionNameProblem, createCollection, deleteCollection, emptyLibrary, findByHex, loadLibrary, removeColor, saveColor, setMembership, setNote, storeLibrary, type ColorLibrary, type SavedColor } from '@/lib/colorLibrary'
import { hexToRgb } from '@/lib/color/conversions'
import { createSourceBuffer, decodeImageFile, isMemoryConstrained } from '@/lib/imagePipeline'
import { resolvePalettePigments } from '@/lib/paint/palettePigments'
import ColorEntry from './ColorEntry'
import ColorReadout, { type Arrival } from './ColorReadout'
import { usePaintPalette } from './PaintPalette'
import PlanPanel from './PlanPanel'
import SavedStrip from './SavedStrip'
import { BUDGETS, type Budget } from '@/lib/paint/plan/planFit'
import { pileAt, renderRepaint } from './planRender'
import { usePicturePlan } from './usePlan'
import type { PourOrigin } from './pour'
import SimpleCanvas, { type PickedColor, type SamplePoint } from './SimpleCanvas'
import styles from './simple.module.css'

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

export default function SimpleApp() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<HTMLCanvasElement | null>(null)
  const [pictureId, setPictureId] = useState(0)
  const [pictureName, setPictureName] = useState<string | undefined>()
  const [point, setPoint] = useState<SamplePoint | null>(null)
  const [color, setColor] = useState<PickedColor | null>(null)
  const [arrival, setArrival] = useState<Arrival | null>(null)
  const [valueView, setValueView] = useState(false)
  const [planMode, setPlanMode] = useState(false)
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

  const palette = usePaintPalette()
  const pigments = useMemo(() => resolvePalettePigments(palette.colors), [palette])
  const planState = usePicturePlan(source, planMode, budget, pigments)
  const plan = planState.result

  // A new plan (another budget, palette or picture) starts with every pile showing.
  useEffect(() => setSelectedPile(null), [plan])

  const changeBudget = useCallback((next: Budget) => {
    setBudget(next)
    storeBudget(next)
  }, [])

  // The repaint the stage shows in Plan view; the original while the peek button is held.
  const display = useMemo(() => {
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
      setSelectedPile(null)
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
    if (planMode) {
      // In the Plan view a click picks the pile that paints that spot; a deliberate click on the same pile lets go.
      if (!plan || !source) return
      const pile = pileAt(plan, nextPoint.x, nextPoint.y, source.width, source.height)
      setSelectedPile((current) => (origin && current === pile ? null : pile))
      return
    }
    setSavedColor(null)
    setPoint(nextPoint)
    setColor(picked)
    arrive(origin)
  }, [arrive, plan, planMode, source])

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

  const refreshSaved = (next: ColorLibrary) =>
    setSavedColor((current) => current ? next.colors.find((entry) => entry.id === current.id) ?? null : current)

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
        setPlanMode((on) => !on)
      } else if (event.key.toLowerCase() === 'b') {
        setPeek(true)
      } else if (event.key === 'Escape') {
        setSelectedPile(null)
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

  if (!source && !color) {
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
          <button type="button" className={styles.linkButton} onClick={() => void openDemo()}>Try demo color Terracotta</button>
          {entryOpen
            ? <ColorEntry autoFocus onSubmit={openTyped} onCancel={() => setEntryOpen(false)} />
            : <button type="button" className={styles.linkButton} onClick={() => setEntryOpen(true)}>Type a color</button>}
          <p className={styles.hint} role={error ? 'alert' : 'status'}>
            {error ?? (opening ? 'Opening picture…' : isDragging ? 'Drop your picture to begin.' : 'Or drop or paste a picture here.')}
          </p>
          <p className={styles.privacyNote}>Your picture stays on this device.</p>
          {savedList}
          {saveError && <p role="alert" className={styles.smallNote}>{saveError}</p>}
        </div>
      </main>
    )
  }

  return (
    <main id="main-content" className={`${styles.app} ${styles.workspace} ${isDragging ? styles.dragging : ''}`}>
      {fileInput}
      {source ? <SimpleCanvas
        key={pictureId}
        source={source}
        display={display}
        label={planMode ? `Your picture repainted with ${plan?.plan.piles.length ?? budget} piles. Click a part to see its pile, drag to move, scroll or pinch to zoom.` : undefined}
        valueView={valueView}
        point={planMode ? null : point}
        onSample={handleSample}
      >
        {planMode && plan && (
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
          <p>{savedColor ? 'Saved color & recipe' : 'No picture open'}</p>
          <p className={styles.smallNote}>Open a picture to sample more colors.</p>
          <button type="button" className={styles.primaryButton} onClick={choosePicture}>Open picture</button>
        </div>
      )}

      <aside className={styles.panel} aria-label={planMode ? 'Plan' : 'Color'}>
        <div className={styles.toolbar}>
          <span className={styles.wordmarkSmall}>ColorWizard</span>
          <div className={styles.toolbarButtons}>
            <button type="button" onClick={choosePicture} title="Open a picture (⌘O)">Open…</button>
            <button type="button" onClick={() => setEntryOpen((on) => !on)} aria-pressed={entryOpen} title="Type an exact color">Color…</button>
            <button type="button" onClick={() => { setPeek(false); setPlanMode((on) => !on) }} disabled={!source} aria-pressed={planMode} title="Plan the whole picture: N piles of paint and where each goes (P)">Plan</button>
            <button type="button" onClick={() => setValueView((on) => !on)} disabled={!source} aria-pressed={valueView} title="Show values only (V)">Value</button>
          </div>
        </div>

        {entryOpen && <div className={styles.entryBar}><ColorEntry autoFocus onSubmit={openTyped} onCancel={() => setEntryOpen(false)} /></div>}
        {opening && <p className={styles.notice} role="status">Opening picture…</p>}
        {error && <p className={styles.notice} role="alert">{error}</p>}
        {saveError && <p className={styles.notice} role="alert">{saveError}</p>}
        <div className={styles.panelBody}>
          {planMode ? (
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
              onSave={(result) => {
                const next = saveColor(library, { id: crypto.randomUUID(), hex: color.hex, now: Date.now(), pictureName: point ? pictureName : undefined, ...result })
                if (!updateLibrary(next.library)) return null
                setSavedColor(next.color)
                return next.updated ? 'updated' : 'created'
              }}
              onNote={(id, note) => {
                const next = setNote(library, id, note, Date.now())
                if (!updateLibrary(next)) return false
                setSavedColor((current) => current?.id === id ? next.colors.find((entry) => entry.id === id) ?? current : current)
                return true
              }}
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
                const made = createCollection(library, { id: crypto.randomUUID(), name, now: Date.now() })
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

        {!planMode && savedList}
      </aside>
    </main>
  )
}
