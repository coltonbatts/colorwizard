'use client'

/**
 * The Plan view's panel: "mix these N piles, here is what each is, here is where each goes."
 * Numbers are measured against spectral.js's model on a small copy of the picture, so the
 * panel says what they are and are not.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Palette } from '@/lib/types/palette'
import { buildCard, PRINT_NOTE, type CardModel } from '@/lib/paint/plan/card'
import { describePlanForExport } from '@/lib/paint/plan/export'
import { PROCREATE_NOTE, savePlanAsProcreatePalette } from '@/lib/paint/plan/procreatePalette'
import PaintPalette from './PaintPalette'
import PlanCard from './PlanCard'
import { renderCardImages, type CardImages } from './planCardImages'
import { BUDGETS, DERIVED_CAVEAT, describePiles, describePlan, describePlanFacts, formatDeltaE, MODEL_CAVEAT, PLAN_CAVEAT_COPY, type Budget } from '@/lib/paint/plan/planFit'
import type { PlanState } from './usePlan'
import styles from './simple.module.css'

interface PlanPanelProps {
  state: PlanState
  budget: Budget
  onBudget: (budget: Budget) => void
  palette: Palette
  selected: number | null
  onSelect: (pile: number | null) => void
  markMisses: boolean
  onMarkMisses: (on: boolean) => void
  /** The picture's name without extension, when known: it names the exports */
  pictureName?: string
  /** The picture that was opened: the card prints it beside the repaint */
  pictureSource?: HTMLCanvasElement | null
}

export default function PlanPanel({ state, budget, onBudget, palette, selected, onSelect, markMisses, onMarkMisses, pictureName, pictureSource }: PlanPanelProps) {
  const paletteName = palette.isDefault ? 'The Core six' : 'Your palette'
  const { result } = state
  const summary = useMemo(() => (result ? describePlan(result, state.resultBudget ?? budget, paletteName) : null), [result, state.resultBudget, budget, paletteName])
  const piles = useMemo(() => (result ? describePiles(result, paletteName) : []), [result, paletteName])
  const rowRefs = useRef<Array<HTMLLIElement | null>>([])
  const planning = state.status === 'planning'
  const exportModel = useMemo(
    () => (result ? describePlanForExport(result, { paletteName, paletteLabel: palette.isDefault ? undefined : palette.name, pictureName }) : null),
    [result, paletteName, palette.isDefault, palette.name, pictureName],
  )
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; text: string } | null>(null)
  // The card being printed, if any: it is drawn off screen and handed to the browser's print.
  const [printJob, setPrintJob] = useState<{ card: CardModel; images: CardImages } | null>(null)
  // A message about one plan's file must not outlive that plan.
  useEffect(() => {
    setSaveStatus(null)
    setPrintJob(null)
  }, [result])
  const printDone = useCallback(() => setPrintJob(null), [])

  const printCard = () => {
    // The button stays enabled while a card is open: disabling a focused button drops keyboard focus to <body>.
    if (!result || !exportModel || !pictureSource || printJob) return
    try {
      const images = renderCardImages(result, pictureSource)
      if (!images) throw new Error('No canvas to draw the card pictures on')
      const dateText = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      setPrintJob({ card: buildCard(result, exportModel, { dateText }), images })
    } catch (error) {
      console.error('Making the card failed', error)
      setSaveStatus({ ok: false, text: 'Couldn’t make the card.' })
    }
  }

  const saveProcreate = async () => {
    if (!exportModel) return
    try {
      const saved = await savePlanAsProcreatePalette(exportModel)
      const left = saved.omitted > 0 ? ` ${saved.omitted} more didn’t fit: Procreate holds ${saved.count}.` : ''
      setSaveStatus({ ok: true, text: `Saved ${saved.filename} (${saved.count} ${saved.count === 1 ? 'color' : 'colors'}).${left}` })
    } catch (error) {
      console.error('Saving the Procreate palette failed', error)
      setSaveStatus({ ok: false, text: 'Couldn’t save the palette.' })
    }
  }

  // A click in the picture selects a pile; bring its row into view.
  useEffect(() => {
    if (selected !== null) rowRefs.current[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const facts = useMemo(() => (result ? describePlanFacts(result) : []), [result])
  const derivedCount = result?.plan.piles.filter((pile) => pile.derived).length ?? 0

  return (
    <div className={styles.plan}>
      <fieldset className={styles.budget}>
        <legend>Piles</legend>
        {BUDGETS.map((count) => (
          <label key={count}>
            <input type="radio" name="plan-budget" value={count} checked={budget === count} onChange={() => onBudget(count)} />
            <span>{count}</span>
          </label>
        ))}
      </fieldset>
      <p className={styles.planHint}>How many separate mixes you’re willing to make. Fewer piles means a rougher repaint.</p>

      <section className={styles.planSummary} aria-labelledby="plan-heading" aria-busy={planning} aria-live="polite">
        {state.status === 'error' && !result ? (
          <p role="alert" className={styles.pending}>{state.error}</p>
        ) : !result || !summary ? (
          <h2 id="plan-heading" className={styles.planHeadline}>Planning…</h2>
        ) : (
          <div className={planning ? styles.stale : undefined}>
            <h2 id="plan-heading" className={styles.planHeadline} data-verdict={summary.verdict}>{summary.headline}</h2>
            {summary.notes.map((note) => <p key={note} className={styles.planNote}>{note}</p>)}
            <dl className={styles.planFacts}>
              {facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
            </dl>
            <label className={styles.check}>
              <input type="checkbox" checked={markMisses} onChange={(event) => onMarkMisses(event.target.checked)} />
              <i className={styles.hatchKey} aria-hidden="true" />
              Hatch what’s visibly off
            </label>
          </div>
        )}
      </section>

      {result && (
        <section className={`${styles.section} ${planning ? styles.stale : ''}`} aria-labelledby="piles-heading">
          <div className={styles.sectionHead}>
            <h3 id="piles-heading">Piles</h3>
            <span>{selected === null ? 'Click one to see where it goes' : 'Click again to see them all'}</span>
          </div>
          <ol className={styles.piles}>
            {piles.map((view, index) => {
              const pile = result.plan.piles[index]
              const open = selected === index
              const cannot = view.fit.verdict === 'cannot'
              return (
                <li key={index} ref={(node) => { rowRefs.current[index] = node }}>
                  <button type="button" className={styles.pile} aria-pressed={open} onClick={() => onSelect(open ? null : index)}>
                    <i className={styles.pileSwatch} style={{ backgroundColor: pile.recipe.predictedHex }} aria-hidden="true" />
                    <span className={styles.pileText}>
                      <span className={styles.pileHead}>
                        <strong>{view.name}</strong>
                        <span data-verdict={view.fit.verdict}>{view.fit.label}</span>
                      </span>
                      <span className={cannot ? styles.dimmed : undefined}>{view.recipe}</span>
                      <small>
                        {view.partsText} to measure
                        {view.onlyUsedToMix ? ` · ${view.onlyUsedToMix}` : ''}
                      </small>
                    </span>
                    <span className={styles.pileShare}>{view.mixOnly ? '—' : view.share}</span>
                  </button>
                  {open && (
                    <div className={styles.pileDetail}>
                      <div className={styles.compare} role="img" aria-label={`Average color of this part of the picture ${pile.targetHex}, predicted mix ${pile.recipe.predictedHex}`}>
                        <div style={{ backgroundColor: pile.targetHex }}><span>This part</span></div>
                        <div style={{ backgroundColor: pile.recipe.predictedHex }}><span>{cannot ? 'Closest' : 'Mix'}</span></div>
                      </div>
                      <p className={`${styles.fitNote} ${cannot ? styles.fitCannot : ''}`}>{view.fit.detail}</p>
                      {!view.mixOnly && <p className={styles.smallNote}>Across the pixels it paints, the average miss is ΔE {formatDeltaE(result.score.pileMeanDeltaE00[index])}.</p>}
                      {view.mixNotes.map((note) => <p key={note} className={styles.smallNote}>{note}</p>)}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {derivedCount > 0 && <p className={styles.smallNote}>{DERIVED_CAVEAT}</p>}
        </section>
      )}

      <section className={styles.planActions} aria-label="Take the plan with you">
        <button type="button" className={styles.planButton} disabled={planning || !exportModel} onClick={() => void saveProcreate()}>
          Save Procreate palette
        </button>
        <button type="button" className={styles.planButton} disabled={planning || !exportModel || !pictureSource} onClick={printCard}>
          Print card
        </button>
        <p role="status" aria-live="polite" className={saveStatus && !saveStatus.ok ? styles.planStatusFailed : styles.planStatus}>{saveStatus?.text ?? ''}</p>
        <p className={styles.smallNote}>{PROCREATE_NOTE}</p>
        <p className={styles.smallNote}>{PRINT_NOTE}</p>
      </section>
      {printJob && createPortal(<PlanCard card={printJob.card} images={printJob.images} onDone={printDone} />, document.body)}

      <p className={styles.smallNote}>{MODEL_CAVEAT}</p>
      <p className={styles.smallNote}>{PLAN_CAVEAT_COPY}</p>
      <PaintPalette palette={palette} />
    </div>
  )
}
