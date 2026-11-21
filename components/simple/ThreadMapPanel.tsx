'use client'

/**
 * Interactive Painterly Thread Map & Monochrome Value Ramp panel inside DMC Thread Studio.
 * Designed to feel easy, bright, and clean: one continuous thread-count slider, vibrant
 * DMC swatch strip, immediate thread list, live swaps, Skein Tray export, and 1-page print sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatCatalogDeltaE00 } from '@/lib/colorSemantics'
import { buildThreadMapCard, type ThreadMapCardModel } from '@/lib/dmc/map/card'
import {
  describeThreadMap,
  formatThreadDeltaE,
  formatThreadMapModeLabel,
  formatThreadShare,
  formatValueStep,
  getSwapOptions,
  THREAD_MAP_CAVEAT_COPY,
  THREAD_MAP_PRINT_NOTE,
} from '@/lib/dmc/map/mapFit'
import {
  FULL_COLOR_MAX,
  FULL_COLOR_MIN,
  MONOCHROME_MAX,
  MONOCHROME_MIN,
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
  return (r * 299 + g * 587 + b * 114) / 1000 > 135 ? '#111111' : '#ffffff'
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

  useEffect(() => {
    setPrintJob(null)
    setActionStatus(null)
  }, [result])

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
          Open a reference photo to pull a bright, balanced DMC palette or a smooth warm, neutral, cool, or sepia monochrome value ramp.
        </p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.btnPrimary} onClick={onChoosePicture}>
            Open photo…
          </button>
        </div>
      </div>
    )
  }

  const isMono = mode === 'monochrome'
  const minCount = isMono ? MONOCHROME_MIN : FULL_COLOR_MIN
  const maxCount = isMono ? MONOCHROME_MAX : FULL_COLOR_MAX
  const activeCount = isMono ? monochromeBudget : fullColorBudget
  const setCount = (next: number) => {
    const clamped = Math.min(maxCount, Math.max(minCount, Math.round(next)))
    if (isMono) onMonochromeBudgetChange(clamped)
    else onFullColorBudgetChange(clamped)
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
      setActionStatus({ ok: true, text: `Saved ${result.slots.length} threads to “${pullName}” in Tray.` })
    } else {
      setActionStatus({ ok: false, text: 'Couldn’t save this pull to your Skein Tray.' })
    }
  }

  return (
    <div className={styles.mapPanel}>
      {/* Clean top control card */}
      <div className={styles.mapCard}>
        <div className={styles.mapModeSwitch} role="group" aria-label="Thread map mode">
          <button
            type="button"
            aria-pressed={!isMono}
            onClick={() => onModeChange('full-color')}
          >
            Full color
          </button>
          <button
            type="button"
            aria-pressed={isMono}
            onClick={() => onModeChange('monochrome')}
          >
            Monochrome
          </button>
        </div>

        {isMono && (
          <div className={styles.mapToneRow} role="group" aria-label="Monochrome tone preset">
            {MONOCHROME_TONES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.mapToneBtn}
                aria-pressed={monochromeTone === preset.id}
                onClick={() => onMonochromeToneChange(preset.id)}
                title={preset.description}
              >
                {preset.shortLabel}
              </button>
            ))}
          </div>
        )}

        {/* Free, continuous thread-count slider with - / + steppers */}
        <div className={styles.mapSliderBlock}>
          <div className={styles.mapSliderHead}>
            <label htmlFor="thread-map-count-slider" className={styles.mapSliderLabel}>
              {isMono ? 'Value steps' : 'Threads'}
            </label>
            <div className={styles.mapStepper}>
              <button
                type="button"
                className={styles.mapStepTiny}
                aria-label={isMono ? 'Fewer value steps' : 'Fewer threads'}
                disabled={activeCount <= minCount}
                onClick={() => setCount(activeCount - 1)}
              >
                −
              </button>
              <span className={styles.mapCountReadout}>{activeCount}</span>
              <button
                type="button"
                className={styles.mapStepTiny}
                aria-label={isMono ? 'More value steps' : 'More threads'}
                disabled={activeCount >= maxCount}
                onClick={() => setCount(activeCount + 1)}
              >
                +
              </button>
            </div>
          </div>
          <input
            id="thread-map-count-slider"
            type="range"
            className={styles.mapRange}
            min={minCount}
            max={maxCount}
            step={1}
            value={activeCount}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </div>

        {stash.length > 0 && (
          <label className={styles.mapCheck}>
            <input
              type="checkbox"
              checked={preferBox}
              onChange={(event) => onPreferBoxChange(event.target.checked)}
            />
            <span>Prefer threads in my box ({stash.length})</span>
          </label>
        )}
      </div>

      {/* Interactive color bar + quick actions */}
      {result && result.slots.length > 0 && (
        <div className={`${styles.mapPaletteBar} ${building ? styles.stale : ''}`}>
          <div
            className={styles.mapColorStrip}
            role="group"
            aria-label="Thread map palette lightest to darkest"
          >
            {result.slots.map((slot) => {
              const isolated = selectedSlot === slot.index
              return (
                <button
                  key={`${slot.index}-${slot.thread.id}`}
                  type="button"
                  className={`${styles.mapStripCell} ${isolated ? styles.mapStripActive : ''}`}
                  style={{ backgroundColor: slot.thread.hex, color: contrastInk(slot.thread.hex) }}
                  aria-pressed={isolated}
                  onClick={() => onSelectSlot(isolated ? null : slot.index)}
                  title={`#${slot.index + 1} · DMC ${slot.thread.number} ${slot.thread.name}`}
                >
                  {result.slots.length <= 16 ? slot.index + 1 : ''}
                </button>
              )
            })}
          </div>

          <div className={styles.mapActionRow}>
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={building || !canSave}
              onClick={handleSendToTray}
            >
              Save to Tray
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={building || !source}
              onClick={handlePrint}
            >
              Print map
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
          </div>

          {actionStatus && (
            <p
              role="status"
              aria-live="polite"
              className={actionStatus.ok ? styles.mapActionStatus : styles.mapActionError}
            >
              {actionStatus.text}
            </p>
          )}
        </div>
      )}

      {/* Compact single-line status (keeps the DMC list immediately visible above the fold) */}
      <section
        className={styles.mapStatusRow}
        aria-labelledby="thread-map-heading"
        aria-busy={building}
        aria-live="polite"
      >
        {status === 'error' && !result ? (
          <p id="thread-map-heading" role="alert" className={styles.statusText}>{error}</p>
        ) : !result || !summary ? (
          <h2 id="thread-map-heading" className={styles.mapStatusHeading}>Mapping DMC threads…</h2>
        ) : (
          <div className={`${styles.mapStatusInner} ${building ? styles.stale : ''}`}>
            <h2 id="thread-map-heading" className={styles.mapStatusHeading} data-verdict={summary.verdict}>
              {summary.headline}
            </h2>
            <span className={styles.mapStatusMetric}>
              {result.mode === 'monochrome'
                ? `${result.slots.length} steps · ${formatValueStep(result.score.meanDeltaL)}`
                : `${result.slots.length} threads · avg ΔE ${formatThreadDeltaE(result.score.meanDeltaE00)}`}
            </span>
          </div>
        )}
      </section>

      {/* Primary hero: bright, scannable DMC Thread List */}
      {result && (
        <section
          className={`${styles.block} ${building ? styles.stale : ''}`}
          aria-labelledby="thread-map-key-heading"
        >
          <div className={styles.blockHead}>
            <h3 id="thread-map-key-heading" className={styles.blockTitle}>
              Light to dark
            </h3>
            <span className={styles.blockHint}>
              {selectedSlot === null ? 'Tap a thread or photo area to isolate' : 'Tap again to show all'}
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
                      <span
                        className={styles.mapSwatchTile}
                        style={{ backgroundColor: slot.thread.hex, color: contrastInk(slot.thread.hex) }}
                        aria-hidden="true"
                      >
                        {slot.index + 1}
                      </span>
                      <span className={styles.mapRowText}>
                        <span className={styles.mapRowHead}>
                          <strong>DMC {slot.thread.number}</strong>
                          <span className={styles.mapShare}>{formatThreadShare(slot.area)}</span>
                        </span>
                        <span className={styles.mapThreadName}>{slot.thread.name}</span>
                        <small className={styles.mapRowMeta}>
                          {tone}
                          {slot.thread.colorConfidence === 'approximate' ? ' · Approx color' : ''}
                          {slot.swapped ? ' · Swapped' : ''}
                        </small>
                      </span>
                    </button>

                    <div className={styles.mapRowActions}>
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

      {/* Honest accuracy details, miss-hatching toggle & catalog caveats neatly tucked at bottom */}
      {result && summary && (
        <details className={styles.mapDetails}>
          <summary>Match details &amp; print info</summary>
          <div className={styles.mapDetailsBody}>
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
            <p className={styles.statusText}>{THREAD_MAP_PRINT_NOTE}</p>
            <p className={styles.statusText}>{THREAD_MAP_CAVEAT_COPY}</p>
          </div>
        </details>
      )}

      <BasisNote topic="thread" />

      {printJob && typeof document !== 'undefined' && createPortal(
        <ThreadMapCard card={printJob.card} images={printJob.images} onDone={printDone} />,
        document.body,
      )}
    </div>
  )
}
