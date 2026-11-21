'use client'

/**
 * Dedicated DMC Thread Studio — built around needle painting (thread painting).
 * Works with a reference photo (value-aware matching, shading runs, side-by-side skein compare)
 * and standalone without a photo (DMC lookup, warm/neutral/cool gray browsing, substitutes,
 * visual Skein Tray with grayscale value check, and OKLab Bridge Finder).
 */

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { getColorName } from '@/lib/colorNaming'
import { colorsIn, type ColorLibrary, type SavedColor } from '@/lib/colorLibrary'
import { formatCatalogDeltaE00 } from '@/lib/colorSemantics'
import {
  analyzeValueGaps,
  BROWSE_GROUPS,
  findBridgeThreads,
  findClosestOwnedThread,
  findSubstituteThreads,
  formatThreadList,
  formatThreadTone,
  getBrowseThreads,
  searchDmcThreads,
  threadTone,
  threadValueHex,
  type BridgeCandidate,
  type BrowseGroupId,
  type GrayToneFilter,
} from '@/lib/dmc/studio'
import { closeThreads, describeThreadFit } from '@/lib/dmc/threadFit'
import type {
  ColorConfidence,
  DMCThread,
  ImageValueContext,
  RenderingSetRole,
  ScoredDMCThread,
  ThreadMatchResult,
} from '@/lib/dmc/types'
import { buildPullName } from '@/lib/dmc/map/mapFit'
import type {
  FullColorBudget,
  MonochromeBudget,
  MonochromeTone,
  ThreadMapDetail,
  ThreadMapMode,
} from '@/lib/dmc/map/types'
import { useDmcStore } from '@/lib/store/useDmcStore'
import BasisNote from './BasisNote'
import FlossImage from './FlossImage'
import { SETTLE_MS, useCopy, useDmcCatalog, useSettled, useThreadMatch } from './readoutHooks'
import type { PickedColor } from './SimpleCanvas'
import ThreadMapPanel from './ThreadMapPanel'
import type { ShownThread } from './ThreadView'
import type { ThreadMapState } from './useThreadMap'
import styles from './threadStudio.module.css'

export type StudioTab = 'match' | 'map' | 'browse' | 'tray'

export interface ThreadSavePayload {
  number: string
  name: string
  hex: string
  deltaE00: number
  colorConfidence: ColorConfidence
}

function toSavePayload(thread: DMCThread | ShownThread, deltaE00 = 0): ThreadSavePayload {
  return {
    number: thread.number,
    name: thread.name,
    hex: thread.hex,
    deltaE00: 'deltaE00' in thread ? thread.deltaE00 : deltaE00,
    colorConfidence: thread.colorConfidence,
  }
}

function roleLabel(role: RenderingSetRole): string {
  switch (role) {
    case 'highlight': return 'Lighter'
    case 'base': return 'Base'
    case 'shadow': return 'Darker'
    case 'anchor-dark': return 'Deepest'
  }
}

function contrastInk(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 135 ? '#111111' : '#fcfaf5'
}

/* ---------- Pure presentational cards (exported for server-render tests) ---------- */

export interface ThreadMatchCardProps {
  hex: string
  threads: ThreadMatchResult | null
  shown: ShownThread | null
  shownCatalogThread: DMCThread | null
  closestOwned: ScoredDMCThread | null
  stale: boolean
  failed: boolean
  copied: boolean
  savedInTray: boolean
  inBox: boolean
  canSave: boolean
  runSavedCount: number | null
  onCopy: () => void
  onSave: () => void
  onSaveRun: (run: ScoredDMCThread[]) => void
  onToggleBox: (number: string) => void
  onChoose: (thread: ShownThread) => void
  onInspectInBrowse: (number: string) => void
}

export function ThreadMatchCard({
  hex,
  threads,
  shown,
  shownCatalogThread,
  closestOwned,
  stale,
  failed,
  copied,
  savedInTray,
  inBox,
  canSave,
  runSavedCount,
  onCopy,
  onSave,
  onSaveRun,
  onToggleBox,
  onChoose,
  onInspectInBrowse,
}: ThreadMatchCardProps) {
  if (!threads || !shown) {
    return (
      <p className={styles.statusText} role={failed ? 'alert' : 'status'}>
        {failed ? 'Thread matches are unavailable right now.' : 'Matching thread…'}
      </p>
    )
  }

  const fit = describeThreadFit(shown.deltaE00, shown.colorConfidence)
  const tone = shownCatalogThread ? formatThreadTone(threadTone(shownCatalogThread)) : null
  const choices = [threads.primary, ...closeThreads(threads, 5)]
  const ladder = threads.familyLadder
  const roleOrder: Record<RenderingSetRole, number> = { highlight: 0, base: 1, shadow: 2, 'anchor-dark': 3 }
  const seenRunIds = new Set<string>()
  const run = [...threads.suggestedSet.suggestions]
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role])
    .filter((entry) => {
      if (seenRunIds.has(entry.thread.id)) return false
      seenRunIds.add(entry.thread.id)
      return true
    })
  const valueBand = threads.sampleValue.bandLabel

  return (
    <div className={`${styles.block} ${stale ? styles.stale : ''}`} aria-busy={stale}>
      <section className={styles.heroCard} aria-label="Matched thread">
        <div
          className={styles.heroCompare}
          role="img"
          aria-label={`Sampled ${hex}, DMC ${shown.number} ${shown.hex}`}
        >
          <span style={{ backgroundColor: hex }}>
            <em className={styles.heroCompareLabel}>Photo</em>
          </span>
          <span style={{ backgroundColor: shown.hex }}>
            <FlossImage hex={shown.hex} className={styles.heroSkein} />
            <em className={styles.heroCompareLabel}>Floss</em>
          </span>
        </div>

        <div className={styles.heroMeta}>
          <div className={styles.heroTitleRow}>
            <h2 className={styles.dmcNumber}>DMC {shown.number}</h2>
            <button type="button" className={styles.linkBtn} onClick={onCopy} disabled={stale}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className={styles.dmcName}>{shown.name}</p>

          <div className={styles.metaPills}>
            {tone && <span className={styles.pill}>{tone}</span>}
            <span className={styles.pill}>{valueBand} in photo</span>
            {shown.colorConfidence === 'approximate' && (
              <span
                className={`${styles.pill} ${styles.pillWarn}`}
                title="DMC’s own photo of this thread was unreliable, so this color may be visibly off."
              >
                Approximate color
              </span>
            )}
          </div>

          <p className={styles.heroFit}>
            <b>{fit.label}.</b> {fit.detail}
          </p>

          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimary} onClick={onSave} disabled={!canSave || stale}>
              {savedInTray ? 'In tray' : 'Add to tray'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              aria-pressed={inBox}
              onClick={() => onToggleBox(shown.number)}
            >
              {inBox ? 'In my box ✓' : 'I own this'}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => onInspectInBrowse(shown.number)}
            >
              Substitutes
            </button>
          </div>
        </div>
      </section>

      {threads.valueWarnings.length > 0 && (
        <ul className={styles.warningList} aria-label="Value notes">
          {threads.valueWarnings.map((warning) => (
            <li key={warning.code} className={styles.warningItem}>
              {warning.message}
            </li>
          ))}
        </ul>
      )}

      {closestOwned && closestOwned.number !== shown.number && (
        <div className={styles.boxCallout}>
          <div className={styles.boxCalloutInfo}>
            <i className={styles.swatchDot} style={{ backgroundColor: closestOwned.hex }} aria-hidden="true" />
            <div className={styles.boxCalloutText}>
              <strong>Closest in your box: DMC {closestOwned.number}</strong>
              <small>{closestOwned.name} · {formatCatalogDeltaE00(closestOwned.deltaE00)}</small>
            </div>
          </div>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSmall}`}
            onClick={() => onChoose(closestOwned)}
          >
            Compare
          </button>
        </div>
      )}

      {run.length > 1 && (
        <section className={styles.block} aria-label="Shading run">
          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>Shading run</h3>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={!canSave || stale}
              onClick={() => onSaveRun(run.map((entry) => entry.thread))}
            >
              {runSavedCount !== null ? `Added ${runSavedCount} to tray` : `Add all ${run.length} to tray`}
            </button>
          </div>
          <div className={styles.shadingRun}>
            {run.map((entry) => (
              <button
                key={`${entry.role}-${entry.thread.id}`}
                type="button"
                className={styles.shadingCard}
                aria-pressed={entry.thread.number === shown.number}
                onClick={() => onChoose(entry.thread)}
              >
                <span className={styles.shadingSwatch} style={{ backgroundColor: entry.thread.hex }} aria-hidden="true" />
                <span className={styles.shadingRole}>{roleLabel(entry.role)}</span>
                <span className={styles.shadingNum}>DMC {entry.thread.number}</span>
                <span className={styles.shadingName}>{entry.thread.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {ladder.length > 1 && (
        <section className={styles.block} aria-label="Family shade ladder">
          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{threads.primary.familyLabel} · light to dark</h3>
            <span className={styles.blockHint}>Tap to compare</span>
          </div>
          <div className={styles.ladderStrip} role="group" aria-label="Light to dark">
            {ladder.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={styles.ladderStep}
                aria-pressed={thread.number === shown.number}
                onClick={() => onChoose(thread)}
                title={`DMC ${thread.number} · ${thread.name}`}
                aria-label={`DMC ${thread.number}, ${thread.name}`}
              >
                <span className={styles.ladderBar} style={{ backgroundColor: thread.hex }} aria-hidden="true" />
                <span className={styles.ladderCode}>{thread.number}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={styles.block} aria-label="Also close">
        <div className={styles.blockHead}>
          <h3 className={styles.blockTitle}>Also close</h3>
          <span className={styles.blockHint}>Keeps your photo sample pinned</span>
        </div>
        <div className={styles.chipGrid} role="group" aria-label="Also close">
          {choices.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={styles.threadChip}
              aria-pressed={thread.number === shown.number}
              onClick={() => onChoose(thread)}
              title={`DMC ${thread.number} · ${thread.name}`}
            >
              <i style={{ backgroundColor: thread.hex }} aria-hidden="true" />
              <code>{thread.number}</code>
              <small>{formatCatalogDeltaE00(thread.deltaE00)}</small>
            </button>
          ))}
        </div>
      </section>

      <BasisNote topic="thread" />
    </div>
  )
}

export interface ThreadDetailCardProps {
  thread: DMCThread
  familyLadder: DMCThread[]
  substitutes: ScoredDMCThread[]
  closestOwned: ScoredDMCThread | null
  copied: boolean
  inTray: boolean
  inBox: boolean
  canSave: boolean
  onCopy: () => void
  onAddToTray: () => void
  onToggleBox: () => void
  onStartBridge: () => void
  onSelectThread: (thread: DMCThread) => void
}

export function ThreadDetailCard({
  thread,
  familyLadder,
  substitutes,
  closestOwned,
  copied,
  inTray,
  inBox,
  canSave,
  onCopy,
  onAddToTray,
  onToggleBox,
  onStartBridge,
  onSelectThread,
}: ThreadDetailCardProps) {
  const tone = formatThreadTone(threadTone(thread))

  return (
    <div className={styles.block}>
      <section className={`${styles.heroCard} ${styles.heroCardSingle}`} aria-label={`DMC ${thread.number} details`}>
        <FlossImage hex={thread.hex} className={styles.heroSkeinFull} />
        <div className={styles.heroMeta}>
          <div className={styles.heroTitleRow}>
            <h2 className={styles.dmcNumber}>DMC {thread.number}</h2>
            <button type="button" className={styles.linkBtn} onClick={onCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className={styles.dmcName}>{thread.name}</p>
          <div className={styles.metaPills}>
            <span className={styles.pill}>{tone}</span>
            <span className={styles.pill}>{thread.familyLabel}</span>
            {thread.colorConfidence === 'approximate' && (
              <span className={`${styles.pill} ${styles.pillWarn}`}>Approximate color</span>
            )}
          </div>
          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimary} onClick={onAddToTray} disabled={!canSave}>
              {inTray ? 'In tray ✓' : 'Add to tray'}
            </button>
            <button type="button" className={styles.btnSecondary} aria-pressed={inBox} onClick={onToggleBox}>
              {inBox ? 'In my box ✓' : 'I own this'}
            </button>
            <button type="button" className={styles.btnSecondary} onClick={onStartBridge}>
              Bridge from here
            </button>
          </div>
        </div>
      </section>

      {closestOwned && (
        <div className={styles.boxCallout}>
          <div className={styles.boxCalloutInfo}>
            <i className={styles.swatchDot} style={{ backgroundColor: closestOwned.hex }} aria-hidden="true" />
            <div className={styles.boxCalloutText}>
              <strong>Closest in your box: DMC {closestOwned.number}</strong>
              <small>{closestOwned.name} · {formatCatalogDeltaE00(closestOwned.deltaE00)}</small>
            </div>
          </div>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSmall}`}
            onClick={() => onSelectThread(closestOwned)}
          >
            View
          </button>
        </div>
      )}

      {familyLadder.length > 1 && (
        <section className={styles.block} aria-label="Color-card family">
          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>{thread.familyLabel} family · light to dark</h3>
          </div>
          <div className={styles.ladderStrip}>
            {familyLadder.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.ladderStep}
                aria-pressed={item.id === thread.id}
                onClick={() => onSelectThread(item)}
                title={`DMC ${item.number} · ${item.name}`}
                aria-label={`DMC ${item.number}, ${item.name}`}
              >
                <span className={styles.ladderBar} style={{ backgroundColor: item.hex }} aria-hidden="true" />
                <span className={styles.ladderCode}>{item.number}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {substitutes.length > 0 && (
        <section className={styles.block} aria-label="Closest DMC substitutes">
          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>Closest DMC substitutes</h3>
            <span className={styles.blockHint}>When a shade is out of stock</span>
          </div>
          <div className={styles.chipGrid}>
            {substitutes.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={styles.threadChip}
                onClick={() => onSelectThread(sub)}
                title={`DMC ${sub.number} · ${sub.name}`}
              >
                <i style={{ backgroundColor: sub.hex }} aria-hidden="true" />
                <code>{sub.number}</code>
                <small>{sub.name} · {formatCatalogDeltaE00(sub.deltaE00)}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <BasisNote topic="thread" />
    </div>
  )
}

export interface BridgeFinderCardProps {
  from: DMCThread
  to: DMCThread
  sameTone: boolean
  candidates: BridgeCandidate[]
  inTrayNumbers: Set<string>
  canSave: boolean
  onToggleSameTone: () => void
  onAddCandidate: (thread: DMCThread) => void
  onInspectCandidate: (thread: DMCThread) => void
  onClose: () => void
}

export function BridgeFinderCard({
  from,
  to,
  sameTone,
  candidates,
  inTrayNumbers,
  canSave,
  onToggleSameTone,
  onAddCandidate,
  onInspectCandidate,
  onClose,
}: BridgeFinderCardProps) {
  return (
    <section className={styles.bridgePanel} aria-label="Bridge shade finder">
      <div className={styles.blockHead}>
        <h3 className={styles.blockTitle}>Bridge finder · between two skeins</h3>
        <button type="button" className={styles.linkBtn} onClick={onClose}>Close</button>
      </div>

      <div className={styles.bridgeEndpoints}>
        <div className={styles.bridgeEndpoint}>
          <i style={{ backgroundColor: from.hex }} aria-hidden="true" />
          <strong>DMC {from.number}</strong>
        </div>
        <span className={styles.bridgeArrow} aria-hidden="true">→</span>
        <div className={styles.bridgeEndpoint}>
          <i style={{ backgroundColor: to.hex }} aria-hidden="true" />
          <strong>DMC {to.number}</strong>
        </div>
      </div>

      <div className={styles.trayControls}>
        <span className={styles.blockHint}>Smooth intermediate shades in OKLab</span>
        <button
          type="button"
          className={`${styles.btnSecondary} ${styles.btnSmall}`}
          aria-pressed={sameTone}
          onClick={onToggleSameTone}
        >
          Same tone only
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className={styles.statusText}>
          No intermediate DMC thread found with these settings.{sameTone ? ' Try turning off “Same tone only.”' : ''}
        </p>
      ) : (
        <div className={styles.block}>
          {candidates.map(({ thread }) => {
            const added = inTrayNumbers.has(thread.number)
            return (
              <div key={thread.id} className={styles.bridgeStrip}>
                <div className={styles.bridgeTrio} aria-hidden="true">
                  <i style={{ backgroundColor: from.hex }} />
                  <i style={{ backgroundColor: thread.hex }} />
                  <i style={{ backgroundColor: to.hex }} />
                </div>
                <button
                  type="button"
                  className={styles.trayMain}
                  onClick={() => onInspectCandidate(thread)}
                >
                  <span className={styles.bridgeCandidateInfo}>
                    <strong>DMC {thread.number}</strong>
                    <small>{thread.name} · {formatThreadTone(threadTone(thread))}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.btnSecondary} ${styles.btnSmall}`}
                  disabled={!canSave || added}
                  onClick={() => onAddCandidate(thread)}
                >
                  {added ? 'In tray' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

/* ---------- Main Thread Studio ---------- */

export interface ThreadMapBindings {
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
  preferBox: boolean
  onPreferBoxChange: (prefer: boolean) => void
  lockedNumbers: readonly string[]
  onToggleLock: (number: string) => void
  onReplaceLock: (oldNumber: string, newNumber: string) => void
  onClearLocks: () => void
  outlineMirror: boolean
  onOutlineMirrorChange: (mirror: boolean) => void
  outlineNumbers: boolean
  selectedSlot: number | null
  onSelectSlot: (slot: number | null) => void
  markMisses: boolean
  onMarkMissesChange: (on: boolean) => void
  onSaveMapPull: (threads: ThreadSavePayload[], pullName: string) => string | null
}

interface ThreadStudioProps {
  source: HTMLCanvasElement | null
  pictureName?: string
  imageValue: ImageValueContext | null
  color: PickedColor | null
  savedColor: SavedColor | null
  library: ColorLibrary
  canSave: boolean
  collectionFilter: string | null
  onFilterCollection: (id: string | null) => void
  onSaveThread: (
    thread: ThreadSavePayload,
    options?: { sampleHex?: string; colorName?: string; collectionId?: string | null },
  ) => 'created' | 'updated' | null
  onSaveThreadsBatch: (
    threads: ThreadSavePayload[],
    options?: { collectionId?: string | null },
  ) => number
  onRemoveColor: (entry: SavedColor) => void
  onNote: (id: string, note: string) => boolean
  onCreateCollection: (name: string) => { id: string } | string
  onDeleteCollection: (collectionId: string) => void
  onOpenSaved: (entry: SavedColor) => void
  onChoosePicture: () => void
  valueView: boolean
  onToggleValueView: () => void
  libraryTools: ReactNode
  threadMap?: ThreadMapBindings
  standalone?: boolean
  /** Controlled tab across desktop, iPad, and phone. */
  activeTab?: StudioTab
  onTabChange?: (tab: StudioTab) => void
  /** Hide the internal tab strip when the host renders its own (phone sub-bar). */
  hideSubTabs?: boolean
}

export default function ThreadStudio({
  source,
  pictureName,
  imageValue,
  color,
  savedColor,
  library,
  canSave,
  collectionFilter,
  onFilterCollection,
  onSaveThread,
  onSaveThreadsBatch,
  onRemoveColor,
  onNote,
  onCreateCollection,
  onDeleteCollection,
  onOpenSaved,
  onChoosePicture,
  valueView,
  onToggleValueView,
  libraryTools,
  threadMap,
  standalone = false,
  activeTab: controlledTab,
  onTabChange,
  hideSubTabs = false,
}: ThreadStudioProps) {
  const { catalog, failed: catalogFailed } = useDmcCatalog()
  const stash = useDmcStore((s) => s.stash)
  const toggleStash = useDmcStore((s) => s.toggleStash)
  const { copied, copy } = useCopy()

  const [internalTab, setInternalTab] = useState<StudioTab>(source || color ? 'match' : 'browse')
  const tab = controlledTab ?? internalTab
  const setTab = (next: StudioTab) => {
    setInternalTab(next)
    onTabChange?.(next)
  }

  // If the user samples a color on the canvas while on Browse/Tray, gently jump to Match.
  const prevColorHexRef = useState<{ hex: string | null }>({ hex: color?.hex ?? null })[0]
  useEffect(() => {
    if (color?.hex && color.hex !== prevColorHexRef.hex) {
      prevColorHexRef.hex = color.hex
      if (!standalone && controlledTab === undefined) setInternalTab('match')
    }
  }, [color?.hex, controlledTab, prevColorHexRef, standalone])

  // Photo match state
  const sampleHex = color?.hex ?? null
  const settledHex = useSettled(sampleHex, SETTLE_MS)
  const { threads, failed: matchFailed, latest } = useThreadMatch(sampleHex, settledHex, imageValue)
  const [chosen, setChosen] = useState<{ hex: string; thread: ShownThread } | null>(null)
  const [named, setNamed] = useState<{ hex: string; name: string } | null>(null)
  const [runSaved, setRunSaved] = useState<{ hex: string; count: number } | null>(null)

  useEffect(() => {
    if (!settledHex) return
    let cancelled = false
    getColorName(settledHex)
      .then((result) => { if (!cancelled) setNamed({ hex: settledHex, name: result.name }) })
      .catch(() => { if (!cancelled) setNamed({ hex: settledHex, name: '' }) })
    return () => { cancelled = true }
  }, [settledHex])

  // Browse & Lookup state
  const [query, setQuery] = useState('')
  const [browseGroup, setBrowseGroup] = useState<BrowseGroupId>('grays')
  const [grayTone, setGrayTone] = useState<GrayToneFilter>('all')
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null)

  // Tray & Bridge Finder state
  const [sortByValue, setSortByValue] = useState(true)
  const [trayValueMode, setTrayValueMode] = useState(false)
  const [needOnly, setNeedOnly] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [newPullOpen, setNewPullOpen] = useState(false)
  const [newPullName, setNewPullName] = useState('')
  const [newPullError, setNewPullError] = useState<string | null>(null)
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null)
  const [bridgePair, setBridgePair] = useState<{ from: string; to: string | null } | null>(null)
  const [bridgeSameTone, setBridgeSameTone] = useState(false)

  const byNumber = useMemo(() => {
    const map = new Map<string, DMCThread>()
    for (const thread of catalog?.threads ?? []) map.set(thread.number, thread)
    return map
  }, [catalog])

  // Saved colors with DMC threads attached (filtered by active collection).
  const activeCollection = library.collections.find((c) => c.id === collectionFilter) ?? null
  const savedThreadsInView = useMemo(() => {
    const raw = colorsIn(library, activeCollection?.id ?? null)
      .filter((entry): entry is SavedColor & { attachments: { thread: NonNullable<SavedColor['attachments']['thread']> } } =>
        Boolean(entry.attachments.thread),
      )
    const enriched = raw.map((entry) => {
      const catalogThread = byNumber.get(entry.attachments.thread.number) ?? null
      return { entry, thread: entry.attachments.thread, catalogThread }
    })
    const filtered = needOnly ? enriched.filter((item) => !stash.includes(item.thread.number)) : enriched
    if (!sortByValue) return filtered
    return [...filtered].sort((a, b) => {
      const la = a.catalogThread?.oklab.L ?? 0.5
      const lb = b.catalogThread?.oklab.L ?? 0.5
      return lb - la
    })
  }, [activeCollection?.id, byNumber, library, needOnly, sortByValue, stash])

  const allTrayNumbers = useMemo(() => {
    const set = new Set<string>()
    for (const entry of colorsIn(library, activeCollection?.id ?? null)) {
      if (entry.attachments.thread) set.add(entry.attachments.thread.number)
    }
    return set
  }, [activeCollection?.id, library])

  const totalTrayCount = useMemo(
    () => library.colors.filter((entry) => Boolean(entry.attachments.thread)).length,
    [library.colors],
  )

  const valueGaps = useMemo(() => {
    if (!sortByValue || savedThreadsInView.length < 2) return []
    const withOklab = savedThreadsInView.map((item) => ({
      oklab: item.catalogThread?.oklab ?? { L: 0.5, a: 0, b: 0 },
    }))
    return analyzeValueGaps(withOklab)
  }, [savedThreadsInView, sortByValue])

  // Match derived values
  const stale = !!color && !threads && !matchFailed
  const savedThread = color && savedColor?.hex === color.hex ? savedColor.attachments.thread : undefined
  const shown = color
    ? ((chosen?.hex === color.hex ? chosen.thread : null) ?? savedThread ?? latest?.primary ?? null)
    : null
  const shownCatalogThread = shown ? (byNumber.get(shown.number) ?? null) : null
  const closestOwnedForMatch = useMemo(() => {
    if (!color || !catalog || stash.length === 0) return null
    return findClosestOwnedThread(color.rgb, catalog.threads, stash)
  }, [catalog, color, stash])

  // Browse derived values
  const browseThreads = useMemo(() => {
    if (!catalog) return []
    if (query.trim()) return searchDmcThreads(catalog.threads, query, 40)
    return getBrowseThreads(catalog.threads, browseGroup, grayTone)
  }, [browseGroup, catalog, grayTone, query])

  const selectedThread = selectedNumber ? (byNumber.get(selectedNumber) ?? null) : null
  const selectedFamilyLadder = useMemo(() => {
    if (!selectedThread || !catalog) return []
    return catalog.threads
      .filter((t) => t.familyId === selectedThread.familyId)
      .sort((a, b) => a.shadeRank - b.shadeRank)
  }, [catalog, selectedThread])

  const selectedSubstitutes = useMemo(() => {
    if (!selectedThread || !catalog) return []
    return findSubstituteThreads(selectedThread, catalog.threads, 6)
  }, [catalog, selectedThread])

  const selectedClosestOwned = useMemo(() => {
    if (!selectedThread || !catalog || stash.length === 0) return null
    if (stash.includes(selectedThread.number)) return null
    return findClosestOwnedThread(selectedThread.rgb, catalog.threads, stash, selectedThread.number)
  }, [catalog, selectedThread, stash])

  // Bridge derived values
  const bridgeFrom = bridgePair ? (byNumber.get(bridgePair.from) ?? null) : null
  const bridgeTo = bridgePair?.to ? (byNumber.get(bridgePair.to) ?? null) : null
  const bridgeCandidates = useMemo(() => {
    if (!bridgeFrom || !bridgeTo || !catalog) return []
    return findBridgeThreads(bridgeFrom, bridgeTo, catalog.threads, { count: 5, sameTone: bridgeSameTone })
  }, [bridgeFrom, bridgeSameTone, bridgeTo, catalog])

  const inspectInBrowse = (number: string) => {
    setSelectedNumber(number)
    setQuery('')
    setTab('browse')
  }

  const startBridgeFrom = (number: string) => {
    if (bridgePair && !bridgePair.to && bridgePair.from !== number) {
      setBridgePair({ from: bridgePair.from, to: number })
    } else {
      setBridgePair({ from: number, to: null })
    }
    setTab('tray')
  }

  const handleCreatePull = (event: FormEvent) => {
    event.preventDefault()
    const outcome = onCreateCollection(newPullName)
    if (typeof outcome === 'string') {
      setNewPullError(outcome)
      return
    }
    setNewPullError(null)
    setNewPullName('')
    setNewPullOpen(false)
    onFilterCollection(outcome.id)
  }

  const renderMatchSection = () => {
    if (!color) {
      return (
        <div className={styles.emptyPrompt}>
          <h3>{source ? 'Click the photo to match a thread' : 'Start from a photo or a DMC number'}</h3>
          <p>
            {source
              ? 'Zoom in on a highlight, midtone, or shadow to see its closest DMC skein, shading run, and value check.'
              : 'Open a reference photo to pull DMC matches directly from it, or jump into Browse to search all 488 DMC shades.'}
          </p>
          <div className={styles.heroActions}>
            {!source && (
              <button type="button" className={styles.btnPrimary} onClick={onChoosePicture}>
                Open photo…
              </button>
            )}
            <button type="button" className={styles.btnSecondary} onClick={() => setTab('browse')}>
              Browse DMC color card
            </button>
            {source && (
              <button
                type="button"
                className={styles.btnSecondary}
                aria-pressed={valueView}
                onClick={onToggleValueView}
              >
                {valueView ? 'Showing photo values' : 'Check photo values'}
              </button>
            )}
          </div>
        </div>
      )
    }

    const ready = !stale && named?.hex === color.hex
    return (
      <ThreadMatchCard
        hex={color.hex}
        threads={matchFailed ? null : latest}
        shown={shown}
        shownCatalogThread={shownCatalogThread}
        closestOwned={closestOwnedForMatch}
        stale={stale}
        failed={matchFailed}
        copied={!!shown && copied === shown.number}
        savedInTray={!!shown && allTrayNumbers.has(shown.number)}
        inBox={!!shown && stash.includes(shown.number)}
        canSave={canSave && ready}
        runSavedCount={runSaved?.hex === color.hex ? runSaved.count : null}
        onCopy={() => { if (shown) void copy(shown.number) }}
        onSave={() => {
          if (!shown) return
          onSaveThread(toSavePayload(shown), {
            sampleHex: color.hex,
            colorName: named?.name || shown.name,
            collectionId: activeCollection?.id ?? null,
          })
        }}
        onSaveRun={(runThreads) => {
          const added = onSaveThreadsBatch(
            runThreads.map((t) => toSavePayload(t, t.deltaE00)),
            { collectionId: activeCollection?.id ?? null },
          )
          if (added > 0) setRunSaved({ hex: color.hex, count: added })
        }}
        onToggleBox={toggleStash}
        onChoose={(next) => setChosen({ hex: color.hex, thread: next })}
        onInspectInBrowse={inspectInBrowse}
      />
    )
  }

  const renderBrowseSection = () => (
    <div className={styles.block}>
      <div className={styles.searchForm}>
        <label htmlFor="dmc-search-input" className={styles.srOnly}>Search DMC thread by number or name</label>
        <input
          id="dmc-search-input"
          type="search"
          className={styles.searchInput}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search DMC number or name (310, Blanc, Beaver Gray…)"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            className={styles.searchClear}
            aria-label="Clear search"
            onClick={() => setQuery('')}
          >
            ×
          </button>
        )}
      </div>

      {!query.trim() && (
        <>
          <div className={styles.groupPills} role="group" aria-label="Color groups">
            {BROWSE_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                className={styles.groupPill}
                aria-pressed={browseGroup === group.id}
                onClick={() => setBrowseGroup(group.id)}
              >
                <i style={{ backgroundColor: group.swatch }} aria-hidden="true" />
                {group.label}
              </button>
            ))}
          </div>

          {browseGroup === 'grays' && (
            <div className={styles.trayControls}>
              <span className={styles.blockHint}>Gray tone</span>
              <div className={styles.toneFilters} role="group" aria-label="Gray warmth">
                {(['all', 'warm', 'neutral', 'cool'] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    className={styles.tonePill}
                    aria-pressed={grayTone === tone}
                    onClick={() => setGrayTone(tone)}
                  >
                    {tone === 'all' ? 'All' : tone[0].toUpperCase() + tone.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selectedThread && (
        <ThreadDetailCard
          thread={selectedThread}
          familyLadder={selectedFamilyLadder}
          substitutes={selectedSubstitutes}
          closestOwned={selectedClosestOwned}
          copied={copied === selectedThread.number}
          inTray={allTrayNumbers.has(selectedThread.number)}
          inBox={stash.includes(selectedThread.number)}
          canSave={canSave}
          onCopy={() => void copy(selectedThread.number)}
          onAddToTray={() => {
            onSaveThread(toSavePayload(selectedThread, 0), {
              sampleHex: selectedThread.hex,
              colorName: selectedThread.name,
              collectionId: activeCollection?.id ?? null,
            })
          }}
          onToggleBox={() => toggleStash(selectedThread.number)}
          onStartBridge={() => startBridgeFrom(selectedThread.number)}
          onSelectThread={(next) => setSelectedNumber(next.number)}
        />
      )}

      {catalogFailed ? (
        <p className={styles.statusText} role="alert">Couldn’t load the DMC catalog.</p>
      ) : !catalog ? (
        <p className={styles.statusText} role="status">Loading 488 DMC threads…</p>
      ) : browseThreads.length === 0 ? (
        <p className={styles.statusText}>No DMC threads match “{query.trim()}.”</p>
      ) : (
        <section className={styles.block} aria-label="DMC catalog list">
          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>
              {query.trim()
                ? `${browseThreads.length} ${browseThreads.length === 1 ? 'result' : 'results'}`
                : `${BROWSE_GROUPS.find((g) => g.id === browseGroup)?.label ?? ''} · ${browseThreads.length} shades`}
            </h3>
            <span className={styles.blockHint}>Light to dark</span>
          </div>
          <div className={styles.catalogGrid}>
            {browseThreads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={styles.catalogItem}
                aria-pressed={selectedNumber === thread.number}
                onClick={() => setSelectedNumber(thread.number)}
              >
                <span className={styles.catalogSwatch} style={{ backgroundColor: thread.hex }} aria-hidden="true" />
                <span className={styles.catalogMeta}>
                  <strong>{thread.number}</strong>
                  <small>{thread.name}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )

  const renderTraySection = () => {
    const listText = formatThreadList(
      savedThreadsInView.map((item) => ({
        number: item.thread.number,
        name: item.thread.name,
        note: item.entry.note,
        owned: stash.includes(item.thread.number),
      })),
      {
        title: activeCollection ? `DMC Pull — ${activeCollection.name}` : 'DMC Thread Pull',
        includeChecklist: stash.length > 0,
      },
    )

    return (
      <div className={styles.block}>
        {/* Project / Pull collections bar */}
        <div className={styles.blockHead}>
          <h3 className={styles.blockTitle}>Skein tray</h3>
          <button type="button" className={styles.linkBtn} onClick={() => { setNewPullOpen((v) => !v); setNewPullError(null) }}>
            {newPullOpen ? 'Cancel' : '+ New pull'}
          </button>
        </div>

        {newPullOpen && (
          <form className={styles.newPullForm} onSubmit={handleCreatePull}>
            <input
              type="text"
              className={styles.noteInput}
              value={newPullName}
              onChange={(event) => { setNewPullName(event.target.value); setNewPullError(null) }}
              placeholder="e.g. Portrait skin, Warm grays, Fur…"
              aria-label="New thread pull name"
              autoFocus
            />
            <button type="submit" className={styles.btnPrimary}>Create</button>
          </form>
        )}
        {newPullError && <p className={styles.statusText} role="alert">{newPullError}</p>}

        {library.collections.length > 0 && (
          <div className={styles.groupPills} role="group" aria-label="Filter thread pull">
            <button
              type="button"
              className={styles.tonePill}
              aria-pressed={activeCollection === null}
              onClick={() => { setConfirmDeleteCol(null); onFilterCollection(null) }}
            >
              All ({totalTrayCount})
            </button>
            {library.collections.map((collection) => {
              const count = colorsIn(library, collection.id).filter((c) => Boolean(c.attachments.thread)).length
              return (
                <button
                  key={collection.id}
                  type="button"
                  className={styles.tonePill}
                  aria-pressed={activeCollection?.id === collection.id}
                  onClick={() => { setConfirmDeleteCol(null); onFilterCollection(collection.id) }}
                >
                  {collection.name} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Value-first needle-painting toggles */}
        <div className={styles.trayControls}>
          <div className={styles.trayToggles}>
            <button
              type="button"
              className={`${styles.btnSecondary} ${styles.btnSmall}`}
              aria-pressed={sortByValue}
              onClick={() => setSortByValue((on) => !on)}
            >
              Light → Dark
            </button>
            <button
              type="button"
              className={`${styles.btnSecondary} ${styles.btnSmall}`}
              aria-pressed={trayValueMode}
              onClick={() => setTrayValueMode((on) => !on)}
              title="View your pulled threads in grayscale to check value steps"
            >
              Value check
            </button>
            {stash.length > 0 && (
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnSmall}`}
                aria-pressed={needOnly}
                onClick={() => setNeedOnly((on) => !on)}
              >
                Need to buy
              </button>
            )}
          </div>
          {savedThreadsInView.length > 0 && (
            <button
              type="button"
              className={`${styles.btnSecondary} ${styles.btnSmall}`}
              onClick={() => void copy(listText)}
            >
              {copied === listText ? 'Copied list ✓' : 'Copy list'}
            </button>
          )}
        </div>

        {/* Bridge Finder (either picking 2nd thread or showing intermediate skeins) */}
        {bridgeFrom && !bridgeTo && (
          <div className={styles.bridgePanel}>
            <div className={styles.blockHead}>
              <h3 className={styles.blockTitle}>Bridge from DMC {bridgeFrom.number}</h3>
              <button type="button" className={styles.linkBtn} onClick={() => setBridgePair(null)}>Cancel</button>
            </div>
            <p className={styles.statusText}>
              Pick a second thread below (or from Browse) to find smooth transition shades between them.
            </p>
          </div>
        )}

        {bridgeFrom && bridgeTo && (
          <BridgeFinderCard
            from={bridgeFrom}
            to={bridgeTo}
            sameTone={bridgeSameTone}
            candidates={bridgeCandidates}
            inTrayNumbers={allTrayNumbers}
            canSave={canSave}
            onToggleSameTone={() => setBridgeSameTone((on) => !on)}
            onAddCandidate={(thread) => {
              onSaveThread(toSavePayload(thread, 0), {
                sampleHex: thread.hex,
                colorName: thread.name,
                collectionId: activeCollection?.id ?? null,
              })
            }}
            onInspectCandidate={(thread) => inspectInBrowse(thread.number)}
            onClose={() => setBridgePair(null)}
          />
        )}

        {/* Visual Skein Strip */}
        {savedThreadsInView.length > 0 && (
          <div
            className={styles.pullStrip}
            role="img"
            aria-label={trayValueMode ? 'Pulled threads in grayscale value order' : 'Pulled threads side by side'}
          >
            {savedThreadsInView.map(({ entry, thread, catalogThread }) => {
              const bg = trayValueMode && catalogThread ? threadValueHex(catalogThread.rgb) : thread.hex
              return (
                <div
                  key={entry.id}
                  className={styles.pullStripCell}
                  style={{ backgroundColor: bg, color: contrastInk(bg) }}
                  title={`DMC ${thread.number} · ${thread.name}`}
                >
                  {savedThreadsInView.length <= 12 ? thread.number : ''}
                </div>
              )
            })}
          </div>
        )}

        {savedThreadsInView.length === 0 ? (
          <div className={styles.emptyPrompt}>
            <h3>{needOnly ? 'You already own every thread in this pull' : 'Your skein tray is empty'}</h3>
            <p>
              {needOnly
                ? 'Turn off “Need to buy” to see your full pull.'
                : 'Add threads from a photo match or the DMC color card to line up your palette, check grayscale values, and find bridge shades.'}
            </p>
          </div>
        ) : (
          <ul className={styles.trayList} aria-label="Pulled DMC threads">
            {savedThreadsInView.map((item, index) => {
              const { entry, thread, catalogThread } = item
              const owned = stash.includes(thread.number)
              const swatchBg = trayValueMode && catalogThread ? threadValueHex(catalogThread.rgb) : thread.hex
              const tone = catalogThread ? formatThreadTone(threadTone(catalogThread)) : null
              const gap = valueGaps[index]
              const nextItem = savedThreadsInView[index + 1]
              const pickingSecond = bridgeFrom && !bridgeTo && bridgeFrom.number !== thread.number

              return (
                <li key={entry.id} className={styles.block}>
                  <div className={`${styles.trayRow} ${savedColor?.id === entry.id ? styles.trayRowActive : ''}`}>
                    <button
                      type="button"
                      className={styles.trayMain}
                      aria-label={pickingSecond ? `Bridge DMC ${bridgeFrom.number} to DMC ${thread.number}` : `Open saved color ${entry.hex} (DMC ${thread.number}, ${thread.name})`}
                      onClick={() => {
                        if (pickingSecond) {
                          setBridgePair({ from: bridgeFrom.number, to: thread.number })
                          return
                        }
                        onOpenSaved(entry)
                      }}
                      title={pickingSecond ? `Bridge DMC ${bridgeFrom.number} to DMC ${thread.number}` : `Open DMC ${thread.number}`}
                    >
                      <span className={styles.traySwatch} style={{ backgroundColor: swatchBg }} aria-hidden="true" />
                      <span className={styles.trayText}>
                        <strong>DMC {thread.number}</strong>
                        <span>{thread.name}</span>
                        <small>
                          {[tone, entry.note, pickingSecond && 'Tap to bridge with this'].filter(Boolean).join(' · ') || 'Tap to view'}
                        </small>
                      </span>
                    </button>

                    <div className={styles.trayRowActions}>
                      <button
                        type="button"
                        className={styles.boxBtn}
                        aria-pressed={owned}
                        onClick={() => toggleStash(thread.number)}
                        title={owned ? 'In your floss box' : 'Mark as owned'}
                      >
                        {owned ? 'Have' : 'Need'}
                      </button>
                      <button
                        type="button"
                        className={styles.boxBtn}
                        onClick={() => {
                          if (editingNoteId === entry.id) {
                            setEditingNoteId(null)
                          } else {
                            setEditingNoteId(entry.id)
                            setNoteDraft(entry.note ?? '')
                          }
                        }}
                        title="Add or edit a note (e.g. cheek shadow, 2 strands)"
                      >
                        Note
                      </button>
                      <button
                        type="button"
                        className={styles.removeBtn}
                        aria-label={`Remove DMC ${thread.number} from tray`}
                        onClick={() => onRemoveColor(entry)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {editingNoteId === entry.id && (
                    <form
                      className={styles.noteEditor}
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (onNote(entry.id, noteDraft)) setEditingNoteId(null)
                      }}
                    >
                      <input
                        type="text"
                        className={styles.noteInput}
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Area or strand note (e.g. cheek shadow, 1 strand)…"
                        aria-label={`Note for DMC ${thread.number}`}
                        autoFocus
                      />
                      <div className={styles.heroActions}>
                        <button type="submit" className={styles.btnPrimary}>Save note</button>
                        <button
                          type="button"
                          className={styles.btnSecondary}
                          onClick={() => startBridgeFrom(thread.number)}
                        >
                          Bridge from DMC {thread.number}
                        </button>
                        <button type="button" className={styles.linkBtn} onClick={() => setEditingNoteId(null)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {gap && nextItem && gap.kind === 'jump' && (
                    <div className={`${styles.gapRow} ${styles.gapJump}`}>
                      <span>Wide value jump between {thread.number} and {nextItem.thread.number}</span>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => setBridgePair({ from: thread.number, to: nextItem.thread.number })}
                      >
                        Find bridge
                      </button>
                    </div>
                  )}

                  {gap && nextItem && gap.kind === 'close' && (
                    <div className={`${styles.gapRow} ${styles.gapClose}`}>
                      <span>DMC {thread.number} and {nextItem.thread.number} are very close in value</span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {activeCollection && (
          <p className={styles.statusText}>
            {confirmDeleteCol === activeCollection.id ? (
              <>
                Delete pull “{activeCollection.name}”? The saved threads stay in All.{' '}
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => { setConfirmDeleteCol(null); onDeleteCollection(activeCollection.id) }}
                >
                  Delete pull
                </button>{' '}
                <button type="button" className={styles.linkBtn} onClick={() => setConfirmDeleteCol(null)}>Keep it</button>
              </>
            ) : (
              <button type="button" className={styles.linkBtn} onClick={() => setConfirmDeleteCol(activeCollection.id)}>
                Delete “{activeCollection.name}” pull…
              </button>
            )}
          </p>
        )}

        {libraryTools}
      </div>
    )
  }

  // Standalone (no photo open): spacious 2-column atelier view with Browse on left, Skein Tray on right.
  if (standalone) {
    return (
      <div className={styles.standaloneMain}>
        <div className={styles.standaloneInner}>
          <header className={styles.standaloneHero}>
            <div>
              <h1 className={styles.standaloneTitle}>DMC Thread Studio</h1>
              <p className={styles.standaloneLead}>
                Match skeins from a reference photo, build painterly Full Color or Monochrome Thread Maps, browse all 488 DMC shades by warmth and value, check grayscale steps, and find smooth bridge threads.
              </p>
            </div>
            <button type="button" className={styles.btnPrimary} onClick={onChoosePicture}>
              Open reference photo ↗
            </button>
          </header>

          <div className={styles.standaloneGrid}>
            <section aria-label="Browse DMC catalog">{renderBrowseSection()}</section>
            <section aria-label="Skein tray">{renderTraySection()}</section>
          </div>
        </div>
      </div>
    )
  }

  const renderMapSection = () => {
    if (!threadMap) {
      return (
        <div className={styles.emptyPrompt}>
          <h3>Build a painterly Thread Map</h3>
          <p>Open a reference photo to map smooth color planes or monochrome value ramps into curated DMC skeins.</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.btnPrimary} onClick={onChoosePicture}>
              Open reference photo…
            </button>
          </div>
        </div>
      )
    }

    return (
      <ThreadMapPanel
        source={source}
        pictureName={pictureName}
        state={threadMap.state}
        mode={threadMap.mode}
        onModeChange={threadMap.onModeChange}
        fullColorBudget={threadMap.fullColorBudget}
        onFullColorBudgetChange={threadMap.onFullColorBudgetChange}
        monochromeBudget={threadMap.monochromeBudget}
        onMonochromeBudgetChange={threadMap.onMonochromeBudgetChange}
        monochromeTone={threadMap.monochromeTone}
        onMonochromeToneChange={threadMap.onMonochromeToneChange}
        detail={threadMap.detail}
        onDetailChange={threadMap.onDetailChange}
        preferBox={threadMap.preferBox}
        onPreferBoxChange={threadMap.onPreferBoxChange}
        lockedNumbers={threadMap.lockedNumbers}
        onToggleLock={threadMap.onToggleLock}
        onReplaceLock={threadMap.onReplaceLock}
        onClearLocks={threadMap.onClearLocks}
        outlineMirror={threadMap.outlineMirror}
        onOutlineMirrorChange={threadMap.onOutlineMirrorChange}
        outlineNumbers={threadMap.outlineNumbers}
        selectedSlot={threadMap.selectedSlot}
        onSelectSlot={threadMap.onSelectSlot}
        markMisses={threadMap.markMisses}
        onMarkMissesChange={threadMap.onMarkMissesChange}
        allThreads={catalog?.threads ?? []}
        stash={stash}
        onToggleStash={toggleStash}
        canSave={canSave}
        onSendPullToTray={(threadsToSave) => {
          const currentMap = threadMap.state.result
          if (!currentMap) return null
          const pullName = buildPullName(
            pictureName,
            currentMap,
            library.collections.map((c) => c.name),
          )
          const savedName = threadMap.onSaveMapPull(
            threadsToSave.map((t) => toSavePayload(t, 0)),
            pullName,
          )
          if (savedName) setTab('tray')
          return savedName
        }}
        onChoosePicture={onChoosePicture}
      />
    )
  }

  return (
    <div className={styles.studio}>
      {!hideSubTabs && (
        <div className={styles.subTabs} role="tablist" aria-label="Thread studio views">
          <button
            type="button"
            role="tab"
            className={styles.subTab}
            aria-selected={tab === 'match'}
            onClick={() => setTab('match')}
          >
            Match
          </button>
          <button
            type="button"
            role="tab"
            className={styles.subTab}
            aria-selected={tab === 'map'}
            onClick={() => setTab('map')}
          >
            Map
          </button>
          <button
            type="button"
            role="tab"
            className={styles.subTab}
            aria-selected={tab === 'browse'}
            onClick={() => setTab('browse')}
          >
            Browse
          </button>
          <button
            type="button"
            role="tab"
            className={styles.subTab}
            aria-selected={tab === 'tray'}
            onClick={() => setTab('tray')}
          >
            Tray
            {totalTrayCount > 0 && <span className={styles.tabBadge}>{totalTrayCount}</span>}
          </button>
        </div>
      )}

      <div className={styles.body}>
        {tab === 'match' && renderMatchSection()}
        {tab === 'map' && renderMapSection()}
        {tab === 'browse' && renderBrowseSection()}
        {tab === 'tray' && renderTraySection()}
      </div>
    </div>
  )
}
