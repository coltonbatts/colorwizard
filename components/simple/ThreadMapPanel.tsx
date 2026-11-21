'use client'

/**
 * Interactive Painterly Thread Map & Monochrome Value Ramp panel inside DMC Thread Studio.
 * Lets needle painters map a whole photo into curated DMC skeins (Full Color or Monochrome),
 * click any thread (or canvas region) to isolate it, swap threads live, send the pull to
 * Skein Tray, or print a 1-page studio reference sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCatalogDeltaE00 } from '@/lib/colorSemantics'
import { buildThreadMapCard, type ThreadMapCardModel } from '@/lib/dmc/map/card'
import {
  describeSlotMeta,
  describeThreadMap,
  formatThreadMapModeLabel,
  formatThreadShare,
  getSwapOptions,
  THREAD_MAP_CAVEAT_COPY,
  THREAD_MAP_PRINT_NOTE,
} from '@/lib/dmc/map/mapFit'
import {
  FULL_COLOR_BUDGETS,
  MONOCHROME_BUDGETS,
  MONOCHROME_TONES,
  type FullColorBudget,
  type MonochromeBudget,
  type MonochromeTone,
  type ThreadMapMode,
} from '@/lib/dmc/map/types'
import { formatThreadTone, threadTone } from '@/lib/dmc/studio'
import type { DMCThread } from '@/lib/dmc/types'
import BasisNote from './BasisNote'
import ThreadMapCard from './ThreadMapCard'
import { renderThreadMapImages, type ThreadMapImages } from './threadMapImages'
import type { ThreadMapState } from './useThreadMap'
import styles from './threadStudio.module.css'

function contrastInk(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 135 ? '#111111' : '#fcfaf5'
}

export interface ThreadMapPanelProps {
  source: HTMLCanvasElement | null
  pictureName?: string
  state: ThreadMapState
  mode: ThreadMapMode
  onModeChange: (mode: ThreadMapMode) => void
  fullColorBudget: FullColorBudget
  onFullColorBudgetChange: (budget: FullColorBudget) => void
  monochromeBudget: MonochromeBudget
  onMonochromeBudgetChange: (budget: MonochromeBudget) => void
  monochromeTone: MonochromeTone
  onMonochromeToneChange: (tone: MonochromeTone) => void
  preferBox: boolean
  onPreferBoxChange: (prefer: boolean) => void
  selectedSlot: number | null
  onSelectSlot: (slot: number | null) => void
  markMisses: boolean
  onMarkMissesChange: (on: boolean) => void
  allThreads: readonly DMCThread[]
  stash: readonly string[]
  onToggleStash: (number: string) => void
  canSave: boolean
  onSendPullToTray: (threads: DMCThread[], modeLabel: string) => string | null
  onChoosePicture: () => void
}

export default function ThreadMapPanel({
  source,
  pictureName,
  state,
  mode,
  onModeChange,
  fullColorBudget,
  onFullColorBudgetChange,
  monochromeBudget,
  onMonochromeBudgetChange,
  monochromeTone,
  onMonochromeToneChange,
  preferBox,
  onPreferBoxChange,
  selectedSlot,
  onSelectSlot,
  markMisses,
  onMarkMissesChange,
  allThreads,
  stash,
  onToggleStash,
  canSave,
  onSendPullToTray,
  onChoosePicture,
}: ThreadMapPanelProps) {
  const { result, status, hasSwaps, error, swapThread, resetSwaps } = state
  const building = status === 'building'
  const rowRefs = useRef<Array<HTMLLIElement | null>>([])
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null)
  const [actionStatus, setActionStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [printJob, setPrintJob] = useState<{ card: ThreadMapCardModel; images: ThreadMapImages } | null>(null)

  const summary = useMemo(() => (result ? describeThreadMap(result) : null), [result])

  // Clear stale print jobs and open swap pickers when a fresh map arrives.
  useEffect(() => {
    setPrintJob(null)
    setActionStatus(null)
  }, [result])

  // Bring the isolated row into view when the stitcher clicks directly on the stage photo.
  useEffect(() => {
    if (selectedSlot !== null) {
      rowRefs.current[selectedSlot]?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedSlot])

  const printDone = useCallback(() => setPrintJob(null), [])

  if (!source) {
    return (
      <div className={styles.emptyPrompt}>
        <h3>Build a painterly Thread Map</h3>
        <p>
          Open a reference photo to map smooth color planes into curated DMC skeins, or create a warm, neutral, cool, or sepia monochrome value ramp for tonal portraiture.
        </p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.btnPrimary} onClick={onChoosePicture}>
            Open reference photo…
          </button>
        </div>
      </div>
    )
  }

  const handlePrint = () => {
    // Keep the Print button enabled while a print job is active so keyboard focus never drops to <body>.
    if (!result || !source || printJob) return
    try {
      const images = renderThreadMapImages(result, source)
      if (!images) throw new Error('No canvas available for thread map print')
      const dateText = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const card = buildThreadMapCard(result, {
        pictureName,
        modeLabel: formatThreadMapModeLabel(result),
        dateText,
        ownedNumbers: stash,
      })
      setPrintJob({ card, images })
    } catch (err) {
      console.error('Building Thread Map card failed', err)
      setActionStatus({ ok: false, text: 'Couldn’t prepare the printable Thread Map.' })
    }
  }

  const handleSendToTray = () => {
    if (!result || !canSave) return
    const pullName = onSendPullToTray(
      result.slots.map((s) => s.thread),
      formatThreadMapModeLabel(result),
    )
    if (pullName) {
      setActionStatus({ ok: true, text: `Sent ${result.slots.length} threads to “${pullName}” in Tray.` })
    } else {
      setActionStatus({ ok: false, text: 'Couldn’t save this pull to your Skein Tray.' })
    }
  }

  const activeToneInfo = MONOCHROME_TONES.find((t) => t.id === monochromeTone)

  return (
    <div className={styles.mapPanel}>
      {/* Mode switch: Full color | Monochrome */}
      <div className={styles.mapControlGroup}>
        <div className={styles.mapModeSwitch} role="group" aria-label="Thread map mode">
          <button
            type="button"
            aria-pressed={mode === 'full-color'}
            onClick={() => onModeChange('full-color')}
          >
            Full color
          </button>
          <button
            type="button"
            aria-pressed={mode === 'monochrome'}
            onClick={() => onModeChange('monochrome')}
          >
            Monochrome
          </button>
        </div>
      </div>

      {/* Budget & tone controls */}
      {mode === 'full-color' ? (
        <fieldset className={styles.mapFieldset}>
          <legend className={styles.blockTitle}>DMC threads</legend>
          <div className={styles.mapPillRow}>
            {FULL_COLOR_BUDGETS.map((count) => (
              <button
                key={count}
                type="button"
                className={styles.mapStepBtn}
                aria-pressed={fullColorBudget === count}
                onClick={() => onFullColorBudgetChange(count)}
              >
                {count}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className={styles.mapMonoControls}>
          <fieldset className={styles.mapFieldset}>
            <legend className={styles.blockTitle}>Monochrome tone</legend>
            <div className={styles.groupPills} role="group" aria-label="Monochrome tone preset">
              {MONOCHROME_TONES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={styles.tonePill}
                  aria-pressed={monochromeTone === preset.id}
                  onClick={() => onMonochromeToneChange(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {activeToneInfo && <p className={styles.statusText}>{activeToneInfo.description}</p>}
          </fieldset>

          <fieldset className={styles.mapFieldset}>
            <legend className={styles.blockTitle}>Value steps</legend>
            <div className={styles.mapPillRow}>
              {MONOCHROME_BUDGETS.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={styles.mapStepBtn}
                  aria-pressed={monochromeBudget === count}
                  onClick={() => onMonochromeBudgetChange(count)}
                >
                  {count} skeins
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {stash.length > 0 && (
        <label className={styles.mapCheck}>
          <input
            type="checkbox"
            checked={preferBox}
            onChange={(event) => onPreferBoxChange(event.target.checked)}
          />
          <span>Prefer my box ({stash.length} owned)</span>
        </label>
      )}

      {/* Summary & stats */}
      <section
        className={styles.mapSummary}
        aria-labelledby="thread-map-heading"
        aria-busy={building}
        aria-live="polite"
      >
        {status === 'error' && !result ? (
          <p role="alert" className={styles.statusText}>{error}</p>
        ) : !result || !summary ? (
          <h2 id="thread-map-heading" className={styles.mapHeadline}>Mapping DMC threads…</h2>
        ) : (
          <div className={building ? styles.stale : undefined}>
            <h2 id="thread-map-heading" className={styles.mapHeadline} data-verdict={summary.verdict}>
              {summary.headline}
            </h2>
            {summary.notes.map((note) => (
              <p key={note} className={styles.mapNote}>{note}</p>
            ))}
            <dl className={styles.mapFacts}>
              {summary.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
            {result.mode === 'full-color' && (
              <label className={styles.mapCheck}>
                <input
                  type="checkbox"
                  checked={markMisses}
                  onChange={(event) => onMarkMissesChange(event.target.checked)}
                />
                <i className={styles.mapHatchKey} aria-hidden="true" />
                <span>Hatch what’s visibly off (&gt; ΔE 5)</span>
              </label>
            )}
          </div>
        )}
      </section>

      {/* Light -> Dark value strip */}
      {result && result.slots.length > 0 && (
        <div
          className={`${styles.pullStrip} ${building ? styles.stale : ''}`}
          role="group"
          aria-label="Thread map palette lightest to darkest"
        >
          {result.slots.map((slot) => {
            const isolated = selectedSlot === slot.index
            return (
              <button
                key={`${slot.index}-${slot.thread.id}`}
                type="button"
                className={`${styles.pullStripCell} ${styles.mapStripBtn} ${isolated ? styles.mapStripActive : ''}`}
                style={{ backgroundColor: slot.thread.hex, color: contrastInk(slot.thread.hex) }}
                aria-pressed={isolated}
                onClick={() => onSelectSlot(isolated ? null : slot.index)}
                title={`#${slot.index + 1} · DMC ${slot.thread.number} ${slot.thread.name}`}
              >
                {slot.index + 1}
              </button>
            )
          })}
        </div>
      )}

      {/* Action bar */}
      {result && (
        <section className={styles.mapActions} aria-label="Thread map actions">
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={building || !canSave}
            onClick={handleSendToTray}
          >
            Send pull to Skein Tray
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={building || !source}
            onClick={handlePrint}
          >
            Print Thread Map
          </button>
          {hasSwaps && (
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => {
                setSwappingIndex(null)
                resetSwaps()
              }}
            >
              Reset swaps
            </button>
          )}
          {actionStatus && (
            <p
              role="status"
              aria-live="polite"
              className={actionStatus.ok ? styles.mapActionStatus : styles.mapActionError}
            >
              {actionStatus.text}
            </p>
          )}
          <p className={styles.statusText}>{THREAD_MAP_PRINT_NOTE}</p>
        </section>
      )}

      {/* Ordered 1..N Thread Key */}
      {result && (
        <section
          className={`${styles.block} ${building ? styles.stale : ''}`}
          aria-labelledby="thread-map-key-heading"
        >
          <div className={styles.blockHead}>
            <h3 id="thread-map-key-heading" className={styles.blockTitle}>
              Thread key · light to dark
            </h3>
            <span className={styles.blockHint}>
              {selectedSlot === null ? 'Click a row or photo area to isolate' : 'Click again to show all'}
            </span>
          </div>

          <ol className={styles.mapList}>
            {result.slots.map((slot) => {
              const isolated = selectedSlot === slot.index
              const owned = stash.includes(slot.thread.number)
              const swapOpen = swappingIndex === slot.index
              const tone = formatThreadTone(threadTone(slot.thread))
              const otherNumbers = result.slots
                .filter((other) => other.index !== slot.index)
                .map((other) => other.thread.number)
              const swapOptions = swapOpen
                ? getSwapOptions(slot.thread, allThreads, stash, otherNumbers)
                : null

              return (
                <li
                  key={slot.index}
                  ref={(node) => { rowRefs.current[slot.index] = node }}
                  className={styles.mapItem}
                >
                  <div className={`${styles.mapRow} ${isolated ? styles.mapRowActive : ''}`}>
                    <button
                      type="button"
                      className={styles.mapRowMain}
                      aria-pressed={isolated}
                      onClick={() => onSelectSlot(isolated ? null : slot.index)}
                    >
                      <span className={styles.mapBadge} aria-hidden="true">{slot.index + 1}</span>
                      <span
                        className={styles.mapSwatch}
                        style={{ backgroundColor: slot.thread.hex }}
                        aria-hidden="true"
                      />
                      <span className={styles.mapRowText}>
                        <span className={styles.mapRowHead}>
                          <strong>DMC {slot.thread.number}</strong>
                          <span className={styles.mapShare}>{formatThreadShare(slot.area)}</span>
                        </span>
                        <span className={styles.mapThreadName}>{slot.thread.name}</span>
                        <small className={styles.mapRowMeta}>
                          {describeSlotMeta(slot, result.mode)}
                          {slot.swapped ? ' · Swapped' : ''}
                        </small>
                      </span>
                    </button>

                    <div className={styles.mapRowActions}>
                      {slot.thread.colorConfidence === 'approximate' && (
                        <span
                          className={`${styles.pill} ${styles.pillWarn}`}
                          title="DMC’s catalog photo for this thread was unreliable, so this color may be visibly off."
                        >
                          Approx
                        </span>
                      )}
                      <button
                        type="button"
                        className={styles.boxBtn}
                        aria-pressed={owned}
                        onClick={() => onToggleStash(slot.thread.number)}
                        title={owned ? 'In your floss box' : 'Mark as owned'}
                      >
                        {owned ? 'Have' : 'Need'}
                      </button>
                      <button
                        type="button"
                        className={styles.boxBtn}
                        aria-expanded={swapOpen}
                        onClick={() => setSwappingIndex(swapOpen ? null : slot.index)}
                        title={`Swap DMC ${slot.thread.number} for another shade`}
                      >
                        {swapOpen ? 'Done' : 'Swap'}
                      </button>
                    </div>
                  </div>

                  {swapOpen && swapOptions && (
                    <div className={styles.swapPicker} aria-label={`Swap options for thread ${slot.index + 1}`}>
                      <div className={styles.swapHeader}>
                        <span>
                          Replace <strong>#{slot.index + 1} DMC {slot.thread.number}</strong> ({tone})
                        </span>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => setSwappingIndex(null)}
                        >
                          Close
                        </button>
                      </div>

                      {(swapOptions.lighter.length > 0 || swapOptions.darker.length > 0) && (
                        <div className={styles.swapGroup}>
                          <span className={styles.swapGroupLabel}>Family ladder ({slot.thread.familyLabel})</span>
                          <div className={styles.chipGrid}>
                            {swapOptions.lighter.map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                className={styles.threadChip}
                                onClick={() => {
                                  swapThread(slot.index, cand)
                                  setSwappingIndex(null)
                                }}
                              >
                                <i style={{ backgroundColor: cand.hex }} aria-hidden="true" />
                                <code>{cand.number}</code>
                                <small>Lighter</small>
                              </button>
                            ))}
                            {swapOptions.darker.map((cand) => (
                              <button
                                key={cand.id}
                                type="button"
                                className={styles.threadChip}
                                onClick={() => {
                                  swapThread(slot.index, cand)
                                  setSwappingIndex(null)
                                }}
                              >
                                <i style={{ backgroundColor: cand.hex }} aria-hidden="true" />
                                <code>{cand.number}</code>
                                <small>Darker</small>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {swapOptions.closestOwned && (
                        <div className={styles.swapGroup}>
                          <span className={styles.swapGroupLabel}>Closest in your box</span>
                          <div className={styles.chipGrid}>
                            <button
                              type="button"
                              className={styles.threadChip}
                              onClick={() => {
                                swapThread(slot.index, swapOptions.closestOwned!)
                                setSwappingIndex(null)
                              }}
                            >
                              <i style={{ backgroundColor: swapOptions.closestOwned.hex }} aria-hidden="true" />
                              <code>{swapOptions.closestOwned.number}</code>
                              <small>
                                {swapOptions.closestOwned.name} · {formatCatalogDeltaE00(swapOptions.closestOwned.deltaE00)}
                              </small>
                            </button>
                          </div>
                        </div>
                      )}

                      {swapOptions.substitutes.length > 0 && (
                        <div className={styles.swapGroup}>
                          <span className={styles.swapGroupLabel}>Closest DMC substitutes</span>
                          <div className={styles.chipGrid}>
                            {swapOptions.substitutes.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                className={styles.threadChip}
                                onClick={() => {
                                  swapThread(slot.index, sub)
                                  setSwappingIndex(null)
                                }}
                              >
                                <i style={{ backgroundColor: sub.hex }} aria-hidden="true" />
                                <code>{sub.number}</code>
                                <small>
                                  {formatThreadTone(threadTone(sub))} · {formatCatalogDeltaE00(sub.deltaE00)}
                                </small>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <BasisNote topic="thread" />
      <p className={styles.statusText}>{THREAD_MAP_CAVEAT_COPY}</p>

      {printJob && typeof document !== 'undefined' && createPortal(
        <ThreadMapCard card={printJob.card} images={printJob.images} onDone={printDone} />,
        document.body,
      )}
    </div>
  )
}
