'use client'

/**
 * One color, fully described: what it is, then how to make it in paint and in thread.
 * Every swatch here is itself a color you can open.
 */

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { getColorName } from '@/lib/colorNaming'
import { getColorTemperature } from '@/lib/colorTheory'
import { getThreadMatchContext, type ThreadMatchResult } from '@/lib/dmcFloss'
import { getPainterChroma } from '@/lib/paintingMath'
import { solveRecipe } from '@/lib/paint/solveRecipe'
import type { SpectralRecipe } from '@/lib/spectral/types'
import { getPerceptualValue } from '@/lib/valueScale'
import { getSolverWorker } from '@/lib/workers'
import FlossImage from './FlossImage'
import { pour, type PourOrigin } from './pour'
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
  isSaved: boolean
  onSave: () => void
  onOpenColor: (hex: string, origin?: PourOrigin) => void
}

/** The center of whatever was clicked, as a place for a pour to start. */
export function originOf(event: MouseEvent<HTMLElement>): PourOrigin {
  const rect = event.currentTarget.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

const SETTLE_MS = 120 // let a drag come to rest before running the solvers

const PAINT_FIT: Record<SpectralRecipe['matchQuality'], string> = {
  Excellent: 'Very close',
  Good: 'Close',
  Fair: 'Approximate',
  Poor: 'Rough',
}

function threadFit(deltaE00: number) {
  if (deltaE00 < 1) return 'Exact'
  if (deltaE00 < 2.5) return 'Very close'
  if (deltaE00 < 5) return 'Close'
  return 'Nearest'
}

function useSettled<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return settled
}

async function solvePaint(hex: string): Promise<SpectralRecipe> {
  try {
    const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Solver worker timed out')), 5000))
    return await Promise.race([getSolverWorker().solveRecipe(hex), timeout])
  } catch {
    return solveRecipe(hex)
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

export default function ColorReadout({ color, arrival, isSaved, onSave, onOpenColor }: ColorReadoutProps) {
  const settledHex = useSettled(color.hex, SETTLE_MS)
  const [name, setName] = useState('')
  const [recipe, setRecipe] = useState<SpectralRecipe | null>(null)
  const [threads, setThreads] = useState<ThreadMatchResult | null>(null)
  const { copied, copy } = useCopy()
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
    getColorName(settledHex).then((result) => { if (!cancelled) setName(result.name) }).catch(() => { if (!cancelled) setName('') })
    solvePaint(settledHex).then((result) => { if (!cancelled) setRecipe(result) }).catch(() => { if (!cancelled) setRecipe(null) })
    getThreadMatchContext(rgb, { alternativeCount: 3, topMatchCount: 4 })
      .then((result) => { if (!cancelled) setThreads(result) })
      .catch(() => { if (!cancelled) setThreads(null) })
    return () => { cancelled = true }
  }, [settledHex])

  const isCurrent = settledHex === color.hex
  const value = Math.round(getPerceptualValue(color.rgb.r, color.rgb.g, color.rgb.b) * 100) / 10
  const temperature = getColorTemperature(color.rgb)
  const chroma = getPainterChroma(color.hex).label

  const primary = threads?.primary
  const nearby = threads
    ? [...threads.topMatches, ...threads.alternatives]
        .filter((thread, index, all) => thread.id !== threads.primary.id && all.findIndex((t) => t.id === thread.id) === index)
        .slice(0, 4)
    : []
  const ladder = threads?.familyLadder ?? []
  const ingredients = recipe?.ingredients.filter((ingredient) => ingredient.weight >= 0.005) ?? []

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
          <span>Value {value.toFixed(1)}</span>
          <span className={styles.capitalize}>{temperature}</span>
          <span>{chroma}</span>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="paint-heading" aria-busy={!isCurrent || !recipe}>
        <div className={styles.sectionHead}>
          <h3 id="paint-heading">Paint</h3>
          {recipe && <span>{PAINT_FIT[recipe.matchQuality]}</span>}
        </div>
        {ingredients.length > 0 ? (
          <div className={isCurrent ? undefined : styles.stale}>
            <div className={styles.mixBar} aria-hidden="true">
              {ingredients.map(({ pigment, weight }) => (
                <i key={pigment.id} style={{ flexGrow: weight, backgroundColor: pigment.hex }} />
              ))}
            </div>
            <ul className={styles.rows}>
              {ingredients.map(({ pigment, weight }) => (
                <li key={pigment.id}>
                  <i style={{ backgroundColor: pigment.hex }} aria-hidden="true" />
                  <span>{pigment.name}</span>
                  <code>{Math.round(weight * 100)}%</code>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className={styles.pending}>Mixing…</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="thread-heading" aria-busy={!isCurrent || !threads}>
        <div className={styles.sectionHead}>
          <h3 id="thread-heading">Thread</h3>
          {primary && <span>{threadFit(primary.deltaE00)}</span>}
        </div>
        {primary ? (
          <div className={`${styles.threadBody} ${isCurrent ? '' : styles.stale}`}>
            <FlossImage hex={primary.hex} className={styles.floss} />
            <div className={styles.threadDetails}>
              <button type="button" className={styles.threadPrimary} onClick={() => void copy(primary.number)} title="Copy DMC number">
                <span>
                  <strong>DMC {primary.number}</strong>
                  <small>{primary.name}</small>
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
          <p className={styles.pending}>Matching…</p>
        )}
      </section>

      <button type="button" className={styles.saveButton} onClick={onSave} disabled={isSaved}>
        {isSaved ? 'Saved' : 'Save Color'}
      </button>
    </div>
  )
}
