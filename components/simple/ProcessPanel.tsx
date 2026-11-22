'use client'

/**
 * The painting-process view's panel: a slider from a toned canvas to a brunaille
 * underpainting, with what to do, mix and check at each stage. Stage frames come from
 * `lib/paint/process/stages.ts`; the words from `stageCopy.ts`.
 */

import { GROUND_VALUE, valueNumber, type ProcessStages } from '@/lib/paint/process/stages'
import { brownForValue } from '@/lib/paint/process/brown'
import { BROWN_NOTE, NEXT_STAGES_NOTE, PROCESS_CAVEAT, PROCESS_SIZE_NOTE, STAGE_COPY } from '@/lib/paint/process/stageCopy'
import { LAST_STAGE } from './useProcess'
import styles from './simple.module.css'

const hexOf = ([r, g, b]: [number, number, number]) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase()

function ValueSwatches({ values, shares }: { values: number[]; shares?: number[] }) {
  return (
    <ol className={styles.processValues} aria-label="Values, dark to light">
      {values.map((value, i) => (
        <li key={value}>
          <i className={styles.processSwatch} style={{ backgroundColor: hexOf(brownForValue(value)) }} aria-hidden="true" />
          <span>Value {valueNumber(value)}</span>
          {shares && <span className={styles.processShare}>{Math.round(shares[i] * 100)}%</span>}
        </li>
      ))}
    </ol>
  )
}

interface ProcessPanelProps {
  stages: ProcessStages | null
  position: number
  onPosition: (t: number) => void
}

export default function ProcessPanel({ stages, position, onPosition }: ProcessPanelProps) {
  const index = Math.round(position)
  const copy = STAGE_COPY[index]

  return (
    <div className={styles.plan}>
      <div className={styles.processSlider}>
        <label htmlFor="process-position" className={styles.processLabel}>Stage {index + 1} of {STAGE_COPY.length}</label>
        <input
          id="process-position"
          type="range"
          min={0}
          max={LAST_STAGE}
          step={0.01}
          value={position}
          aria-valuetext={`${copy.short}, stage ${index + 1} of ${STAGE_COPY.length}`}
          onChange={(event) => onPosition(Number(event.target.value))}
          onKeyDown={(event) => {
            // Arrow keys move a whole stage; dragging crossfades between them.
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault()
              onPosition(Math.min(LAST_STAGE, Math.floor(position + 1e-6) + 1))
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault()
              onPosition(Math.max(0, Math.ceil(position - 1e-6) - 1))
            }
          }}
        />
        <div className={styles.processStops}>
          {STAGE_COPY.map((stage, i) => (
            <button key={stage.id} type="button" aria-pressed={i === index} onClick={() => onPosition(i)}>{stage.short}</button>
          ))}
        </div>
      </div>

      <section className={styles.section} aria-labelledby="process-heading" aria-live="polite">
        <h2 id="process-heading" className={styles.planHeadline}>{copy.title}</h2>
        <p className={styles.processText}>{copy.doing}</p>
        <h3 className={styles.processSubhead}>Mix</h3>
        <p className={styles.processText}>{copy.mix}</p>
        {stages && copy.id === 'ground' && <ValueSwatches values={[GROUND_VALUE]} />}
        {stages && copy.id === 'massing' && <ValueSwatches values={stages.massingValues} />}
        {stages && copy.id === 'brunaille' && <ValueSwatches values={stages.brunailleValues} shares={stages.brunailleShares} />}
        <h3 className={styles.processSubhead}>Check</h3>
        <p className={styles.processText}>{copy.check}</p>
      </section>

      {!stages && <p role="alert" className={styles.pending}>Couldn’t read this picture.</p>}
      <p className={styles.processText}>{NEXT_STAGES_NOTE}</p>
      <p className={styles.processNote}>{PROCESS_CAVEAT}</p>
      <p className={styles.processNote}>{BROWN_NOTE}</p>
      <p className={styles.processNote}>{PROCESS_SIZE_NOTE}</p>
    </div>
  )
}
