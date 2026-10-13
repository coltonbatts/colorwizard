'use client'

/**
 * One color, fully described: what it is, then how to make it in paint and in thread.
 * Every swatch here is itself a color you can open.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getColorName } from '@/lib/colorNaming'
import { getThreadMatchContext, type ThreadMatchResult } from '@/lib/dmcFloss'
import { getPaletteSolveOptions } from '@/lib/paint/palettePigments'
import { solveRecipe, type SolveOptions } from '@/lib/paint/solveRecipe'
import type { Collection, SaveInput, SavedColor } from '@/lib/colorLibrary'
import type { SpectralRecipe } from '@/lib/spectral/types'
import { getSolverWorker } from '@/lib/workers'
import BasisNote from './BasisNote'
import CollectionPicker from './CollectionPicker'
import ColorUnderstanding from './ColorUnderstanding'
import FlossImage from './FlossImage'
import PaintPalette, { usePaintPalette } from './PaintPalette'
import SavedNote from './SavedNote'
import { describeThreadFit } from '@/lib/dmc/threadFit'
import { describePaintFit, formatAmount, MODEL_CAVEAT, roundingNote } from '@/lib/paint/paintFit'
import { originOf, pour, type PourOrigin } from './pour'
import type { PickedColor } from './SimpleCanvas'
import styles from './simple.module.css'

export interface Arrival {
  id: number
  origin: PourOrigin
}

interface ColorReadoutProps {
  color: PickedColor
  /** Set when a color was picked on purpose (a click, not a drag), so it pours in. */
  arrival: Arrival | null
  canSave: boolean
  /** The saved color being viewed as it was saved (its recipe is restored, not recalculated). */
  savedColor: SavedColor | null
  /** A saved color with this same hex, if any: saving again updates it. */
  existing: SavedColor | null
  onSave: (result: Pick<SaveInput, 'name' | 'paint' | 'thread'>) => 'created' | 'updated' | null
  onNote: (id: string, note: string) => boolean
  collections: Collection[]
  onToggleCollection: (colorId: string, collectionId: string, member: boolean) => boolean
  onCreateCollection: (colorId: string, name: string) => string | null
  onRecalculate: () => void
  onOpenColor: (hex: string, origin?: PourOrigin) => void
}

export { originOf }

const SETTLE_MS = 120 // let a drag come to rest before running the solvers

function useSettled<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

async function solvePaint(hex: string, options?: SolveOptions): Promise<SpectralRecipe> {
  let timer: number | undefined
  try {
    const timeout = new Promise<never>((_, reject) => { timer = window.setTimeout(() => reject(new Error('Solver worker timed out')), 5000) })
    return await Promise.race([getSolverWorker().solveRecipe(hex, options), timeout])
  } catch {
    return solveRecipe(hex, options)
  } finally {
    window.clearTimeout(timer)
  }
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(text)
      window.setTimeout(() => setCopied((current) => (current === text ? null : current)), 1200)
    } catch {
      /* clipboard can be unavailable in insecure contexts; the text is still on screen */
    }
  }
  return { copied, copy }
}

export default function ColorReadout({ color, arrival, canSave, savedColor, existing, onSave, onNote, collections, onToggleCollection, onCreateCollection, onRecalculate, onOpenColor }: ColorReadoutProps) {
  const settledHex = useSettled(color.hex, SETTLE_MS)
  const palette = usePaintPalette()
  const solveOptions = useMemo(() => getPaletteSolveOptions(palette), [palette])
  const [named, setNamed] = useState<{ hex: string; name: string } | null>(null)
  const [paint, setPaint] = useState<{ key: string; recipe: SpectralRecipe | null; failed: boolean } | null>(null)
  const [threadResult, setThreadResult] = useState<{ hex: string; result: ThreadMatchResult | null } | null>(null)
  const [retry, setRetry] = useState(0)
  const paletteKey = JSON.stringify(solveOptions)
  const requestKey = `${settledHex}:${paletteKey}:${retry}`
  const currentKey = `${color.hex}:${paletteKey}:${retry}`
  const snapshot = savedColor?.attachments.paint?.recipe
  const recipe = snapshot ?? (paint?.key === currentKey ? paint.recipe : null)
  const paintFailed = !snapshot && paint?.key === currentKey && paint.failed
  const name = savedColor?.nameSnapshot || (named?.hex === color.hex ? named.name : '')
  const threads = threadResult?.hex === color.hex ? threadResult.result : null
  const threadFailed = threadResult?.hex === color.hex && !threadResult.result
  const paletteName = snapshot ? savedColor.attachments.paint!.paletteName : palette.isDefault ? 'Core six' : palette.name
  const { copied, copy } = useCopy()
  const [kept, setKept] = useState<'created' | 'updated' | null>(null)
  useEffect(() => setKept(null), [color.hex])
  const swatchRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const shownHexRef = useRef<string | null>(null)
  const pouredIdRef = useRef<number | null>(null)

  // Pour on each deliberate pick; plain color changes (dragging, first render) just appear.
  useLayoutEffect(() => {
    const previousHex = shownHexRef.current
    shownHexRef.current = color.hex
    if (!arrival || arrival.id === pouredIdRef.current) return
    pouredIdRef.current = arrival.id
    if (swatchRef.current && fillRef.current) pour(arrival.origin, color.hex, previousHex, swatchRef.current, fillRef.current)
  }, [arrival, color.hex])

  useEffect(() => {
    let cancelled = false
    const rgb = {
      r: parseInt(settledHex.slice(1, 3), 16),
      g: parseInt(settledHex.slice(3, 5), 16),
      b: parseInt(settledHex.slice(5, 7), 16),
    }
    getColorName(settledHex).then((result) => { if (!cancelled) setNamed({ hex: settledHex, name: result.name }) }).catch(() => { if (!cancelled) setNamed({ hex: settledHex, name: '' }) })
    getThreadMatchContext(rgb, { alternativeCount: 3, topMatchCount: 4 })
      .then((result) => { if (!cancelled) setThreadResult({ hex: settledHex, result }) })
      .catch(() => { if (!cancelled) setThreadResult({ hex: settledHex, result: null }) })
    return () => { cancelled = true }
  }, [settledHex])

  useEffect(() => {
    if (snapshot) return
    let cancelled = false
    solvePaint(settledHex, solveOptions)
      .then((result) => { if (!cancelled) setPaint({ key: requestKey, recipe: result, failed: false }) })
      .catch(() => { if (!cancelled) setPaint({ key: requestKey, recipe: null, failed: true }) })
    return () => { cancelled = true }
  }, [settledHex, solveOptions, requestKey, snapshot])

  const isCurrent = settledHex === color.hex

  const primary = threads?.primary
  const nearby = threads
    ? [...threads.topMatches, ...threads.alternatives]
        .filter((thread, index, all) => thread.id !== threads.primary.id && all.findIndex((t) => t.id === thread.id) === index)
        .slice(0, 4)
    : []
  const ladder = threads?.familyLadder ?? []
  const ingredients = recipe?.ingredients.filter((ingredient) => ingredient.weight >= 0.005) ?? []
  const fit = recipe ? describePaintFit(recipe, paletteName) : null
  const keptEntry = savedColor ?? existing
  const canKeep = canSave && !snapshot && isCurrent && (!!recipe || paintFailed) && (!!threads || threadFailed)
  const threadFit = primary ? describeThreadFit(primary.deltaE00, primary.colorConfidence) : null

  return (
    <div className={styles.readout}>
      <div ref={swatchRef} className={styles.swatch}>
        <div ref={fillRef} className={styles.swatchFill} style={{ backgroundColor: color.hex }} />
      </div>

      <header className={styles.identity}>
        <h2 className={styles.colorName}>{isCurrent && name ? name : ' '}</h2>
        <div className={styles.facts}>
          <button type="button" className={styles.code} onClick={() => void copy(color.hex)} title="Copy hex">
            {copied === color.hex ? 'Copied' : color.hex}
          </button>
          {isCurrent && name && <span>Closest name</span>}
        </div>
        {isCurrent && name && <BasisNote topic="name" />}
      </header>

      <section className={styles.keep} aria-label="Keep this color">
        <button
          type="button"
          className={styles.saveButton}
          disabled={!canKeep}
          onClick={() => {
            const outcome = onSave({
              name,
              paint: !snapshot && recipe && ingredients.length > 0 ? { paletteName, recipe } : undefined,
              thread: primary ? { number: primary.number, name: primary.name, hex: primary.hex, deltaE00: primary.deltaE00, colorConfidence: primary.colorConfidence } : undefined,
            })
            if (outcome) setKept(outcome)
          }}
        >
          {snapshot ? 'Saved on this device' : existing ? 'Update saved color' : 'Save color'}
        </button>
        <p className={styles.smallNote} role="status">
          {!keptEntry ? '' : kept === 'updated' ? 'Updated the saved color.' : kept === 'created' ? 'Saved. Find it under Saved on this device.' : ''}
        </p>
        <p className={styles.smallNote}>Keeps this color with the paint recipe and thread match shown here, in this browser. The picture is not saved.</p>
        {keptEntry && <SavedNote key={keptEntry.id} note={keptEntry.note ?? ''} onCommit={(note) => onNote(keptEntry.id, note)} />}
        {keptEntry && (
          <CollectionPicker
            key={keptEntry.id}
            color={keptEntry}
            collections={collections}
            onToggle={(collectionId, member) => onToggleCollection(keptEntry.id, collectionId, member)}
            onCreate={(name) => onCreateCollection(keptEntry.id, name)}
          />
        )}
      </section>

      <ColorUnderstanding hex={color.hex} onOpenColor={onOpenColor} />

      <section className={styles.section} aria-labelledby="paint-heading" aria-busy={!recipe && !paintFailed} data-recipe-target={recipe ? color.hex : undefined}>
        <div className={styles.sectionHead}>
          <h3 id="paint-heading">Paint</h3>
          {fit && <span data-verdict={fit.verdict}>{fit.label}</span>}
        </div>
        {recipe && fit && ingredients.length > 0 ? (
          <div>
            <div className={styles.compare} role="img" aria-label={`Target ${color.hex}, predicted mix ${recipe.predictedHex}`}>
              <div style={{ backgroundColor: color.hex }}><span>Target</span></div>
              <div style={{ backgroundColor: recipe.predictedHex }}><span>{fit.verdict === 'cannot' ? 'Closest' : 'Mix'}</span></div>
            </div>
            <p className={`${styles.fitNote} ${fit.verdict === 'cannot' ? styles.fitCannot : ''}`}>{fit.detail}</p>
            <div className={fit.verdict === 'cannot' ? styles.dimmed : undefined}>
              <div className={styles.mixBar} aria-hidden="true">
                {ingredients.map(({ pigment, weight }) => (
                  <i key={pigment.id} style={{ flexGrow: weight, backgroundColor: pigment.hex }} />
                ))}
              </div>
              <ul className={styles.rows}>
                {ingredients.map((ingredient) => (
                  <li key={ingredient.pigment.id}>
                    <i style={{ backgroundColor: ingredient.pigment.hex }} aria-hidden="true" />
                    <span>{ingredient.pigment.name}</span>
                    <code>{formatAmount(recipe, ingredient)}</code>
                  </li>
                ))}
              </ul>
            </div>
            {roundingNote(recipe) && <p className={styles.smallNote}>{roundingNote(recipe)}</p>}
            <p className={styles.smallNote}>Spectral model · {paletteName}. A starting point to adjust by eye.</p>
            <p className={styles.smallNote}>{MODEL_CAVEAT}</p>
          </div>
        ) : (
          <div role={paintFailed ? 'alert' : 'status'} className={styles.pending}>
            {paintFailed ? 'Couldn’t calculate a paint recipe.' : recipe ? 'This paint set can’t make a recipe.' : 'Mixing…'}
            {paintFailed && <button type="button" className={styles.linkButton} onClick={() => setRetry(value => value + 1)}>Try recipe again</button>}
          </div>
        )}
        {snapshot ? (
          <p className={styles.smallNote}>
            Saved recipe · {savedColor.source?.pictureName || 'Saved color'}. Restored as saved.
            {' '}<button type="button" className={styles.linkButton} onClick={onRecalculate}>Make a new recipe</button>
          </p>
        ) : <PaintPalette palette={palette} />}
        <BasisNote topic="paint" />
      </section>

      <section className={styles.section} aria-labelledby="thread-heading" aria-busy={!threads && !threadFailed}>
        <div className={styles.sectionHead}>
          <h3 id="thread-heading">Thread</h3>
          {threadFit && <span>{threadFit.label}</span>}
        </div>
        {primary ? (
          <div className={`${styles.threadBody} ${isCurrent ? '' : styles.stale}`}>
            <FlossImage hex={primary.hex} className={styles.floss} />
            <div className={styles.threadDetails}>
              {threadFit && <p className={`${styles.fitNote} ${styles.threadNote}`}>{threadFit.detail}</p>}
              <button type="button" className={styles.threadPrimary} onClick={() => void copy(primary.number)} title="Copy DMC number">
                <span>
                  <strong>DMC {primary.number}</strong>
                  <small>
                    {primary.name}
                    {primary.colorConfidence === 'approximate' && (
                      <span title="DMC's own photo of this thread was unreliable, so this color may be visibly off."> · approximate color</span>
                    )}
                  </small>
                </span>
                <em>{copied === primary.number ? 'Copied' : 'Copy'}</em>
              </button>

              {nearby.length > 0 && (
                <div className={styles.chipRow}>
                  <span className={styles.rowLabel}>Also close</span>
                  {nearby.map((thread) => (
                    <button key={thread.id} type="button" className={styles.chip} onClick={(event) => onOpenColor(thread.hex, originOf(event))} title={`DMC ${thread.number} · ${thread.name}`}>
                      <i style={{ backgroundColor: thread.hex }} aria-hidden="true" />
                      {thread.number}
                    </button>
                  ))}
                </div>
              )}

              {ladder.length > 1 && (
                <div className={styles.ladderRow}>
                  <span className={styles.rowLabel}>Light to dark</span>
                  <div className={styles.ladder}>
                    {ladder.map((thread) => (
                      <button
                        key={thread.id}
                        type="button"
                        className={thread.id === primary.id ? styles.ladderCurrent : undefined}
                        style={{ backgroundColor: thread.hex }}
                        onClick={(event) => onOpenColor(thread.hex, originOf(event))}
                        title={`DMC ${thread.number} · ${thread.name}`}
                        aria-label={`DMC ${thread.number}, ${thread.name}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className={styles.pending}>{threadFailed ? "Thread matches are unavailable. Your paint recipe is still usable." : "Matching…"}</p>
        )}
        {primary && savedColor?.attachments.thread && savedColor.attachments.thread.number !== primary.number && (
          <p className={styles.smallNote}>Saved with DMC {savedColor.attachments.thread.number}; the catalog now matches DMC {primary.number}.</p>
        )}
        {primary && <BasisNote topic="thread" />}
      </section>

    </div>
  )
}
