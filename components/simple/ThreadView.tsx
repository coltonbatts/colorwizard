'use client'

/**
 * The thread on its own, for a phone held in one hand: tap the picture, read the DMC number
 * at the bottom of the screen. Nothing here needs scrolling, and the card keeps one height so the
 * picture doesn't move between samples. Trying another thread keeps the sampled color beside it.
 */

import { useEffect, useState } from 'react'
import { getColorName } from '@/lib/colorNaming'
import type { SaveInput, SavedColor } from '@/lib/colorLibrary'
import { closeThreads, describeThreadFit } from '@/lib/dmc/threadFit'
import type { ColorConfidence, ThreadMatchResult } from '@/lib/dmc/types'
import BasisNote from './BasisNote'
import FlossImage from './FlossImage'
import { SETTLE_MS, useCopy, useSettled, useThreadMatch } from './readoutHooks'
import styles from './simple.module.css'

/** A catalog match or a saved thread: what the card needs from either. */
export interface ShownThread {
  number: string
  name: string
  hex: string
  deltaE00: number
  colorConfidence: ColorConfidence
}

interface ThreadCardProps {
  /** The sampled color. */
  hex: string
  /** The match to show, held from the previous sample while the next one arrives. */
  threads: ThreadMatchResult | null
  shown: ShownThread | null
  stale: boolean
  failed: boolean
  copied: boolean
  saveLabel: string
  canSave: boolean
  onCopy: () => void
  onSave: () => void
  onChoose: (thread: ShownThread) => void
}

/** The card itself, with no lookups, so its markup can be tested. */
export function ThreadCard({ hex, threads, shown, stale, failed, copied, saveLabel, canSave, onCopy, onSave, onChoose }: ThreadCardProps) {
  if (!threads || !shown) {
    return <p className={styles.threadWaiting} role={failed ? 'alert' : 'status'}>{failed ? 'Thread matches are unavailable. Your paint recipe is still usable.' : 'Matching…'}</p>
  }

  const fit = describeThreadFit(shown.deltaE00, shown.colorConfidence)
  const choices = [threads.primary, ...closeThreads(threads)]
  const ladder = threads.familyLadder

  return (
    <section className={`${styles.threadCard} ${stale ? styles.stale : ''}`} aria-label="Thread" aria-busy={stale}>
      <div className={styles.threadTop}>
        <button type="button" className={styles.threadCopy} onClick={onCopy} disabled={stale} title="Copy DMC number">
          <span className={styles.threadCompare} role="img" aria-label={`Sampled ${hex}, DMC ${shown.number} ${shown.hex}`}>
            <i style={{ backgroundColor: hex }} />
            <i style={{ backgroundColor: shown.hex }}><FlossImage hex={shown.hex} className={styles.threadSkein} /></i>
          </span>
          <span className={styles.threadName}>
            <strong>DMC {shown.number}</strong>
            <small>
              {shown.name}
              {shown.colorConfidence === 'approximate' && ' · approximate color'}
            </small>
          </span>
          <em>{copied ? 'Copied' : 'Copy'}</em>
        </button>
        <button type="button" className={styles.threadSave} onClick={onSave} disabled={!canSave} aria-live="polite">{saveLabel}</button>
      </div>

      <p className={styles.threadFit}><b>{fit.label}.</b> {fit.detail}</p>

      <div className={styles.threadChoices} role="group" aria-label="Also close">
        {choices.map((thread) => (
          <button key={thread.id} type="button" className={styles.chip} aria-pressed={thread.number === shown.number} onClick={() => onChoose(thread)} title={`DMC ${thread.number} · ${thread.name}`}>
            <i style={{ backgroundColor: thread.hex }} aria-hidden="true" />
            {thread.number}
          </button>
        ))}
      </div>

      {ladder.length > 1 && (
        <div className={styles.threadLadder} role="group" aria-label="Light to dark">
          {ladder.map((thread) => (
            <button
              key={thread.id}
              type="button"
              aria-pressed={thread.number === shown.number}
              style={{ backgroundColor: thread.hex }}
              onClick={() => onChoose(thread)}
              title={`DMC ${thread.number} · ${thread.name}`}
              aria-label={`DMC ${thread.number}, ${thread.name}`}
            />
          ))}
        </div>
      )}

      <BasisNote topic="thread" />
    </section>
  )
}

interface ThreadViewProps {
  hex: string
  /** The saved color being viewed; its saved thread is shown first. */
  savedColor: SavedColor | null
  /** A saved color with this same hex, if any. */
  existing: SavedColor | null
  canSave: boolean
  onSave: (result: Pick<SaveInput, 'name' | 'thread'>) => unknown
}

export default function ThreadView({ hex, savedColor, existing, canSave, onSave }: ThreadViewProps) {
  const settledHex = useSettled(hex, SETTLE_MS)
  const { threads, failed, latest } = useThreadMatch(hex, settledHex)
  const { copied, copy } = useCopy()
  const [chosen, setChosen] = useState<{ hex: string; thread: ShownThread } | null>(null)
  const [named, setNamed] = useState<{ hex: string; name: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    getColorName(settledHex)
      .then((result) => { if (!cancelled) setNamed({ hex: settledHex, name: result.name }) })
      .catch(() => { if (!cancelled) setNamed({ hex: settledHex, name: '' }) })
    return () => { cancelled = true }
  }, [settledHex])

  const stale = !threads && !failed
  const savedThread = savedColor?.hex === hex ? savedColor.attachments.thread : undefined
  const shown = (chosen?.hex === hex ? chosen.thread : null) ?? savedThread ?? latest?.primary ?? null
  const alreadySaved = !!shown && existing?.attachments.thread?.number === shown.number
  const ready = !stale && named?.hex === hex

  return (
    <ThreadCard
      hex={hex}
      threads={failed ? null : latest}
      shown={shown}
      stale={stale}
      failed={failed}
      copied={!!shown && copied === shown.number}
      saveLabel={alreadySaved ? 'Saved' : existing ? 'Update' : 'Save'}
      canSave={canSave && ready && !alreadySaved}
      onCopy={() => { if (shown) void copy(shown.number) }}
      onSave={() => {
        if (!shown) return
        onSave({
          name: named?.name ?? '',
          thread: { number: shown.number, name: shown.name, hex: shown.hex, deltaE00: shown.deltaE00, colorConfidence: shown.colorConfidence },
        })
      }}
      onChoose={(thread) => setChosen({ hex, thread })}
    />
  )
}
