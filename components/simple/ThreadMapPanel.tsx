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
import { getSlotNeighbors, type ThreadMapVectorGeometry } from '@/lib/dmc/map/contours'
import {
  countUniqueThreads,
  describeThreadMap,
  findSharedSlotNumbers,
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
  THREAD_MAP_DETAILS,
  THREAD_MAP_FIDELITIES,
  type FullColorBudget,
  type MonochromeBudget,
  type MonochromeTone,
  type ThreadMapDetail,
  type ThreadMapFidelity,
  type ThreadMapMode,
} from '@/lib/dmc/map/types'
import { formatThreadTone, searchDmcThreads, threadTone } from '@/lib/dmc/studio'
import type { DMCThread } from '@/lib/dmc/types'
import BasisNote from './BasisNote'
import ThreadMapCard from './ThreadMapCard'
import type { ThreadMapSwapPreview } from './threadMapCanvas'
import {
  renderThreadMapImages,
  renderThreadMapOutlineImages,
  type ThreadMapImages,
} from './threadMapImages'
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
  detail: ThreadMapDetail
  onDetailChange: (detail: ThreadMapDetail) => void
  fidelity: ThreadMapFidelity
  onFidelityChange: (fidelity: ThreadMapFidelity) => void
  anchorBudget: number
  onReoptimize: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  preferBox: boolean
  onPreferBoxChange: (prefer: boolean) => void
  lockedNumbers: readonly string[]
  onToggleLock: (number: string) => void
  onReplaceLock?: (oldNumber: string, newNumber: string) => void
  onClearLocks: () => void
  outlineMirror: boolean
  onOutlineMirrorChange: (mirror: boolean) => void
  outlineNumbers: boolean
  selectedSlot: number | null
  onSelectSlot: (slot: number | null) => void
  geometry?: ThreadMapVectorGeometry | null
  previewSwap?: ThreadMapSwapPreview | null
  onPreviewSwap?: (preview: ThreadMapSwapPreview | null) => void
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
  detail,
  onDetailChange,
  fidelity,
  onFidelityChange,
  anchorBudget,
  onReoptimize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  preferBox,
  onPreferBoxChange,
  lockedNumbers,
  onToggleLock,
  onClearLocks,
  outlineMirror,
  onOutlineMirrorChange,
  outlineNumbers,
  selectedSlot,
  onSelectSlot,
  geometry = null,
  previewSwap = null,
  onPreviewSwap,
  markMisses,
  onMarkMissesChange,
  allThreads,
  stash,
  onToggleStash,
  canSave,
  onSendPullToTray,
  onChoosePicture,
}: ThreadMapPanelProps) {
  const { result, status, hasSwaps, error, swapThread, revertThread, resetSwaps } = state
  const building = status === 'building'
  const rowRefs = useRef<Array<HTMLLIElement | null>>([])
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null)
  const [swapQuery, setSwapQuery] = useState('')
  const [hoverPreview, setHoverPreview] = useState<ThreadMapSwapPreview | null>(null)
  const [abCompareSlot, setAbCompareSlot] = useState<number | null>(null)
  const [actionStatus, setActionStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [printJob, setPrintJob] = useState<{ card: ThreadMapCardModel; images: ThreadMapImages } | null>(null)

  const summary = useMemo(() => (result ? describeThreadMap(result) : null), [result])
  const lockedSet = useMemo(
    () => new Set(lockedNumbers.map((n) => n.trim().toLowerCase())),
    [lockedNumbers],
  )

  useEffect(() => {
    setPrintJob(null)
    setActionStatus(null)
    setAbCompareSlot((cur) => (cur !== null && result?.slots[cur]?.originalThread ? cur : null))
  }, [result])

  useEffect(() => {
    setSwapQuery('')
    setHoverPreview(null)
  }, [swappingIndex])

  useEffect(() => {
    if (!onPreviewSwap) return
    if (hoverPreview) {
      onPreviewSwap(hoverPreview)
      return
    }
    if (abCompareSlot !== null && result?.slots[abCompareSlot]?.originalThread) {
      onPreviewSwap({
        slotIndex: abCompareSlot,
        thread: result.slots[abCompareSlot].originalThread!,
      })
      return
    }
    onPreviewSwap(null)
  }, [hoverPreview, abCompareSlot, result, onPreviewSwap])

  useEffect(() => () => onPreviewSwap?.(null), [onPreviewSwap])

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

  const startPrint = (variant: 'color-map' | 'transfer-outline') => {
    // Keep print buttons enabled while a print job is active so keyboard focus never drops to <body>.
    if (!result || !source || printJob) return
    try {
      const images = variant === 'transfer-outline'
        ? renderThreadMapOutlineImages(result, outlineMirror)
        : renderThreadMapImages(result, source)
      if (!images) throw new Error('No canvas available for thread map print')
      const dateText = new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      const card = buildThreadMapCard(result, {
        variant,
        mirror: variant === 'transfer-outline' ? outlineMirror : false,
        showNumbers: variant === 'transfer-outline' ? outlineNumbers : true,
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

  const applySwap = (slotIndex: number, nextThread: DMCThread) => {
    setHoverPreview(null)
    if (abCompareSlot === slotIndex) setAbCompareSlot(null)
    swapThread(slotIndex, nextThread)
    setSwappingIndex(null)
    setSwapQuery('')
  }

  const previewHandlers = (slotIndex: number, candidate: DMCThread) => ({
    onMouseEnter: () => setHoverPreview({ slotIndex, thread: candidate }),
    onMouseLeave: () =>
      setHoverPreview((cur) => (cur?.slotIndex === slotIndex && cur.thread.id === candidate.id ? null : cur)),
    onFocus: () => setHoverPreview({ slotIndex, thread: candidate }),
    onBlur: () =>
      setHoverPreview((cur) => (cur?.slotIndex === slotIndex && cur.thread.id === candidate.id ? null : cur)),
  })

  const handleSendToTray = () => {
    if (!result || !canSave) return
    const uniqueThreads: DMCThread[] = []
    const seen = new Set<string>()
    for (const s of result.slots) {
      const key = s.thread.number.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      uniqueThreads.push(s.thread)
    }
    const pullName = onSendPullToTray(
      uniqueThreads,
      formatThreadMapModeLabel(result),
    )
    if (pullName) {
      setActionStatus({
        ok: true,
        text: `Saved ${uniqueThreads.length} ${uniqueThreads.length === 1 ? 'thread' : 'threads'} to “${pullName}” in Tray.`,
      })
    } else {
      setActionStatus({ ok: false, text: 'Couldn’t save this pull to your Skein Tray.' })
    }
  }

  return (
    <div className={styles.mapPanel}>
      {/* Clean top control card */}
      <div className={styles.mapCard}>
        <div className={styles.mapTopRow}>
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
          <div className={styles.mapHistoryBtns} role="group" aria-label="Edit history">
            <button
              type="button"
              className={styles.mapIconBtn}
              disabled={!canUndo}
              onClick={onUndo}
              aria-label="Undo (⌘Z)"
              title="Undo (⌘Z)"
            >
              ↩
            </button>
            <button
              type="button"
              className={styles.mapIconBtn}
              disabled={!canRedo}
              onClick={onRedo}
              aria-label="Redo (⇧⌘Z)"
              title="Redo (⇧⌘Z)"
            >
              ↪
            </button>
          </div>
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

        {/* Free, continuous monotonic thread-count slider with - / + steppers */}
        <div className={styles.mapSliderBlock}>
          <div className={styles.mapSliderHead}>
            <label htmlFor="thread-map-count-slider" className={styles.mapSliderLabel}>
              {isMono ? 'Value steps' : 'Threads'}
            </label>
            <div className={styles.mapStepper}>
              {!isMono && activeCount !== anchorBudget && (
                <button
                  type="button"
                  className={styles.mapReoptBtn}
                  onClick={onReoptimize}
                  title={`Globally re-optimize all ${activeCount} threads for this count`}
                >
                  Re-optimize
                </button>
              )}
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

        {/* Shape detail: spatial resolution & region cleanup level */}
        <div className={styles.mapDetailBlock}>
          <span className={styles.mapSliderLabel}>Shape detail</span>
          <div className={styles.mapDetailRow} role="group" aria-label="Shape detail">
            {THREAD_MAP_DETAILS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.mapToneBtn}
                aria-pressed={detail === preset.id}
                onClick={() => onDetailChange(preset.id)}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color fidelity balance (Full Color mode) */}
        {!isMono && (
          <div className={styles.mapDetailBlock}>
            <span className={styles.mapSliderLabel}>Color fidelity</span>
            <div className={styles.mapFidelityRow} role="group" aria-label="Color fidelity">
              {THREAD_MAP_FIDELITIES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={styles.mapToneBtn}
                  aria-pressed={fidelity === preset.id}
                  onClick={() => onFidelityChange(preset.id)}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
              const previewed = previewSwap?.slotIndex === slot.index ? previewSwap.thread : null
              const shown = previewed ?? slot.thread
              return (
                <button
                  key={`${slot.index}-${slot.thread.id}`}
                  type="button"
                  className={`${styles.mapStripCell} ${isolated ? styles.mapStripActive : ''}`}
                  style={{ backgroundColor: shown.hex, color: contrastInk(shown.hex) }}
                  aria-pressed={isolated}
                  onClick={() => onSelectSlot(isolated ? null : slot.index)}
                  title={`#${slot.index + 1} · DMC ${shown.number} ${shown.name}`}
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
              onClick={() => startPrint('color-map')}
            >
              Print map
            </button>
          </div>

          <div className={styles.mapTransferRow}>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={building || !source}
              onClick={() => startPrint('transfer-outline')}
              title="Print a clean 1-page black-and-white outline for fabric transfer"
            >
              {outlineMirror ? 'Print outline (mirrored)' : 'Print outline'}
            </button>
            <button
              type="button"
              className={styles.boxBtn}
              aria-pressed={outlineMirror}
              onClick={() => onOutlineMirrorChange(!outlineMirror)}
              title="Flip the transfer outline horizontally for iron-on or back-of-fabric tracing"
            >
              Mirror
            </button>
            {hasSwaps && (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  setHoverPreview(null)
                  setAbCompareSlot(null)
                  setSwappingIndex(null)
                  resetSwaps()
                }}
              >
                Reset swaps
              </button>
            )}
            {!isMono && lockedNumbers.length > 0 && (
              <button
                type="button"
                className={styles.linkBtn}
                onClick={onClearLocks}
              >
                Unlock all ({lockedNumbers.length})
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
              {(() => {
                const uniqueCount = countUniqueThreads(result.slots)
                if (result.mode === 'monochrome') {
                  const label = uniqueCount < result.slots.length
                    ? `${uniqueCount} skeins (${result.slots.length} steps)`
                    : `${result.slots.length} steps`
                  return `${label} · ${formatValueStep(result.score.meanDeltaL)}`
                }
                const label = uniqueCount < result.slots.length
                  ? `${uniqueCount} skeins (${result.slots.length} areas)`
                  : `${result.slots.length} threads`
                return `${label} · avg ΔE ${formatThreadDeltaE(result.score.meanDeltaE00)}`
              })()}
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
              const baseNumber = slot.originalThread?.number ?? slot.thread.number
              const locked = !isMono && lockedSet.has(baseNumber.toLowerCase())
              const swapOpen = swappingIndex === slot.index
              const previewed = previewSwap?.slotIndex === slot.index ? previewSwap.thread : null
              const tileHex = (previewed ?? slot.thread).hex
              const tone = formatThreadTone(threadTone(slot.thread))
              const sharedWith = findSharedSlotNumbers(result.slots, slot.index)
              const comparingOriginal = abCompareSlot === slot.index && Boolean(slot.originalThread)
              const otherNumbers = result.slots
                .filter((other) => other.index !== slot.index)
                .map((other) => other.thread.number)
              const otherSlotByNumber = swapOpen
                ? result.slots.reduce<Map<string, number[]>>((acc, other) => {
                  if (other.index === slot.index) return acc
                  const key = other.thread.number.toLowerCase()
                  const list = acc.get(key)
                  if (list) list.push(other.index + 1)
                  else acc.set(key, [other.index + 1])
                  return acc
                }, new Map())
                : null
              const neighbors = swapOpen && geometry
                ? getSlotNeighbors(geometry, slot.index)
                  .slice(0, 6)
                  .map((n) => result.slots[n.slotIndex])
                  .filter((neighborSlot): neighborSlot is NonNullable<typeof neighborSlot> => Boolean(neighborSlot))
                : []
              const trimmedQuery = swapOpen ? swapQuery.trim() : ''
              const searchHits = swapOpen && trimmedQuery
                ? searchDmcThreads(allThreads, trimmedQuery, 16).filter(
                  (cand) => cand.number.toLowerCase() !== slot.thread.number.toLowerCase(),
                )
                : null
              const swapOptions = swapOpen && !trimmedQuery
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
                        style={{ backgroundColor: tileHex, color: contrastInk(tileHex) }}
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
                          {slot.swapped && slot.originalThread
                            ? ` · Replaced ${slot.originalThread.number}`
                            : slot.swapped
                              ? ' · Swapped'
                              : ''}
                          {sharedWith.length > 0 ? ` · Also #${sharedWith.join(', #')}` : ''}
                          {slot.thread.colorConfidence === 'approximate' ? ' · Approx color' : ''}
                          {locked ? ' · Locked' : ''}
                        </small>
                      </span>
                    </button>

                    <div className={styles.mapRowActions}>
                      {!isMono && (
                        <button
                          type="button"
                          className={styles.boxBtn}
                          aria-pressed={locked}
                          onClick={() => onToggleLock(baseNumber)}
                          title={locked
                            ? `Unlock region #${slot.index + 1} so thread-count changes can replace it`
                            : `Lock region #${slot.index + 1} so thread-count changes keep it`}
                        >
                          {locked ? 'Locked' : 'Lock'}
                        </button>
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

                  {slot.swapped && slot.originalThread && (
                    <div className={styles.mapSwapBar} aria-label={`Substitution controls for thread ${slot.index + 1}`}>
                      <span
                        className={styles.mapSwapInfo}
                        title={`Original: DMC ${slot.originalThread.number} ${slot.originalThread.name}`}
                      >
                        <span className={styles.swapDotPair} aria-hidden="true">
                          <i style={{ backgroundColor: slot.originalThread.hex }} />
                          <i style={{ backgroundColor: slot.thread.hex }} />
                        </span>
                        <span>
                          Replaced <strong>{slot.originalThread.number}</strong>
                        </span>
                      </span>
                      <div className={styles.mapSwapBtns}>
                        <button
                          type="button"
                          className={styles.swapBarBtn}
                          aria-pressed={comparingOriginal}
                          onClick={() => {
                            setHoverPreview(null)
                            setAbCompareSlot((cur) => (cur === slot.index ? null : slot.index))
                          }}
                          title={comparingOriginal
                            ? `Showing original DMC ${slot.originalThread.number}. Click to return to DMC ${slot.thread.number}.`
                            : `Toggle map preview between original DMC ${slot.originalThread.number} and DMC ${slot.thread.number}`}
                        >
                          {comparingOriginal
                            ? `Showing ${slot.originalThread.number}`
                            : `Compare ${slot.originalThread.number}`}
                        </button>
                        <button
                          type="button"
                          className={styles.swapBarBtn}
                          onClick={() => {
                            setHoverPreview(null)
                            if (abCompareSlot === slot.index) setAbCompareSlot(null)
                            if (swappingIndex === slot.index) setSwappingIndex(null)
                            revertThread(slot.index)
                          }}
                          title={`Revert #${slot.index + 1} back to DMC ${slot.originalThread.number} ${slot.originalThread.name}`}
                        >
                          Revert
                        </button>
                      </div>
                    </div>
                  )}

                  {swapOpen && (
                    <div
                      className={styles.swapPicker}
                      aria-label={`Swap options for thread ${slot.index + 1}`}
                      onMouseLeave={() => setHoverPreview(null)}
                    >
                      <div className={styles.swapHeader}>
                        <span>
                          Replace <strong>#{slot.index + 1} DMC {slot.thread.number}</strong> ({tone})
                        </span>
                        <span className={styles.swapHeaderActions}>
                          {hoverPreview?.slotIndex === slot.index && (
                            <span className={styles.swapPreviewTag}>
                              Preview {hoverPreview.thread.number}
                            </span>
                          )}
                          <button
                            type="button"
                            className={styles.linkBtn}
                            onClick={() => setSwappingIndex(null)}
                          >
                            Close
                          </button>
                        </span>
                      </div>

                      <div className={styles.swapSearchRow}>
                        <input
                          type="search"
                          className={styles.swapSearchInput}
                          value={swapQuery}
                          onChange={(event) => setSwapQuery(event.target.value)}
                          placeholder="Search all 488 DMC by # or name…"
                          aria-label={`Search all 488 DMC threads to replace slot ${slot.index + 1}`}
                          spellCheck={false}
                        />
                        {swapQuery && (
                          <button
                            type="button"
                            className={styles.swapSearchClear}
                            aria-label="Clear swap search"
                            onClick={() => setSwapQuery('')}
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {neighbors.length > 0 && (
                        <div className={styles.swapGroup}>
                          <div className={styles.swapNeighborHead}>
                            <span className={styles.swapGroupLabel}>Neighbors on map</span>
                            <span
                              className={styles.swapHarmonyBar}
                              aria-hidden="true"
                              title="Active or previewed shade next to its bordering map threads"
                            >
                              {neighbors.slice(0, 2).map((nb) => (
                                <i key={`l-${nb.index}`} style={{ backgroundColor: nb.thread.hex }} />
                              ))}
                              <i
                                className={styles.swapHarmonyCenter}
                                style={{ backgroundColor: tileHex }}
                              />
                              {neighbors.slice(2, 4).map((nb) => (
                                <i key={`r-${nb.index}`} style={{ backgroundColor: nb.thread.hex }} />
                              ))}
                            </span>
                          </div>
                          <div className={styles.neighborChipRow}>
                            {neighbors.map((nb) => {
                              const sameThread = nb.thread.number.toLowerCase() === slot.thread.number.toLowerCase()
                              return (
                                <button
                                  key={`nb-${nb.index}`}
                                  type="button"
                                  className={styles.neighborChip}
                                  disabled={sameThread}
                                  onClick={() => applySwap(slot.index, nb.thread)}
                                  {...(sameThread ? {} : previewHandlers(slot.index, nb.thread))}
                                  title={sameThread
                                    ? `#${nb.index + 1} already uses DMC ${nb.thread.number}`
                                    : `Bordering #${nb.index + 1} · Click to paint this area in DMC ${nb.thread.number} ${nb.thread.name}`}
                                >
                                  <i style={{ backgroundColor: nb.thread.hex }} aria-hidden="true" />
                                  <code>#{nb.index + 1} {nb.thread.number}</code>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {searchHits ? (
                        <div className={styles.swapGroup}>
                          <span className={styles.swapGroupLabel}>
                            {searchHits.length > 0
                              ? `${searchHits.length} ${searchHits.length === 1 ? 'match' : 'matches'} across 488 DMC · hover to preview`
                              : 'Catalog search'}
                          </span>
                          {searchHits.length === 0 ? (
                            <p className={styles.statusText}>No DMC threads match “{trimmedQuery}.”</p>
                          ) : (
                            <div className={styles.chipGrid}>
                              {searchHits.map((cand) => {
                                const sharedSlots = otherSlotByNumber?.get(cand.number.toLowerCase())
                                const sublabel = sharedSlots && sharedSlots.length > 0
                                  ? `${cand.name} · Also #${sharedSlots.join(', #')}`
                                  : cand.name
                                return (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    className={styles.threadChip}
                                    onClick={() => applySwap(slot.index, cand)}
                                    {...previewHandlers(slot.index, cand)}
                                  >
                                    <i style={{ backgroundColor: cand.hex }} aria-hidden="true" />
                                    <code>{cand.number}</code>
                                    <small>{sublabel}</small>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : swapOptions && (
                        <>
                          {(swapOptions.lighter.length > 0 || swapOptions.darker.length > 0) && (
                            <div className={styles.swapGroup}>
                              <span className={styles.swapGroupLabel}>Family ladder ({slot.thread.familyLabel})</span>
                              <div className={styles.chipGrid}>
                                {swapOptions.lighter.map((cand) => (
                                  <button
                                    key={cand.id}
                                    type="button"
                                    className={styles.threadChip}
                                    onClick={() => applySwap(slot.index, cand)}
                                    {...previewHandlers(slot.index, cand)}
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
                                    onClick={() => applySwap(slot.index, cand)}
                                    {...previewHandlers(slot.index, cand)}
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
                                  onClick={() => applySwap(slot.index, swapOptions.closestOwned!)}
                                  {...previewHandlers(slot.index, swapOptions.closestOwned!)}
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
                                    onClick={() => applySwap(slot.index, sub)}
                                    {...previewHandlers(slot.index, sub)}
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
                        </>
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
