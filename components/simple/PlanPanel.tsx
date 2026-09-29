'use client'

/**
 * The Plan view's panel: "mix these N piles, here is what each is, here is where each goes."
 * Numbers are measured against spectral.js's model on a small copy of the picture, so the
 * panel says what they are and are not.
 */

import { useEffect, useMemo, useRef } from 'react'
import type { Palette } from '@/lib/types/palette'
import PaintPalette from './PaintPalette'
import { BUDGETS, describePiles, describePlan, formatDeltaE, formatShare, MODEL_CAVEAT, PLAN_CAVEAT_COPY, type Budget } from './planFit'
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
}

export default function PlanPanel({ state, budget, onBudget, palette, selected, onSelect, markMisses, onMarkMisses }: PlanPanelProps) {
  const paletteName = palette.isDefault ? 'The Core six' : 'Your palette'
  const { result } = state
  const summary = useMemo(() => (result ? describePlan(result, state.resultBudget ?? budget, paletteName) : null), [result, state.resultBudget, budget, paletteName])
  const piles = useMemo(() => (result ? describePiles(result, paletteName) : []), [result, paletteName])
  const rowRefs = useRef<Array<HTMLLIElement | null>>([])
  const planning = state.status === 'planning'

  // A click in the picture selects a pile; bring its row into view.
  useEffect(() => {
    if (selected !== null) rowRefs.current[selected]?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const totalParts = result?.score.totalParts ?? 0
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
              <div><dt>Average miss</dt><dd>ΔE {formatDeltaE(result.score.meanDeltaE00)}</dd></div>
              <div><dt>Visibly off</dt><dd>{formatShare(result.score.visiblyOffArea)}</dd></div>
              <div><dt>In piles it can’t mix</dt><dd>{formatShare(result.score.unreachableArea)}</dd></div>
              <div><dt>To measure</dt><dd>{totalParts} parts</dd></div>
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
                        {view.parts} {view.parts === 1 ? 'part' : 'parts'} to measure
                        {view.mixOnly && view.basedOnBy.length > 0 ? ` · only used to mix Pile ${view.basedOnBy.join(', ')}` : ''}
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
                      {pile.derived && <p className={styles.smallNote}>Mixed from {`Pile ${pile.derived.base + 1}`}: make enough of it for both.</p>}
                      {view.basedOnBy.length > 0 && !view.mixOnly && <p className={styles.smallNote}>Pile {view.basedOnBy.join(', ')} {view.basedOnBy.length === 1 ? 'is' : 'are'} mixed from this one: make extra.</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
          {derivedCount > 0 && <p className={styles.smallNote}>A pile mixed from another counts that base as its pigments in the same proportions. That is one more model assumption, not a measurement.</p>}
        </section>
      )}

      <p className={styles.smallNote}>{MODEL_CAVEAT}</p>
      <p className={styles.smallNote}>{PLAN_CAVEAT_COPY}</p>
      <PaintPalette palette={palette} />
    </div>
  )
}
