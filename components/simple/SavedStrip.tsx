'use client'

/** Saved on this device: every saved color, filtered by collection when there are any. */

import { useState } from 'react'
import { colorsIn, type ColorLibrary, type SavedColor } from '@/lib/colorLibrary'
import { originOf, type PourOrigin } from './pour'
import styles from './simple.module.css'

interface SavedStripProps {
  library: ColorLibrary
  /** The saved color being viewed. */
  activeId: string | null
  filter: string | null
  onFilter: (collectionId: string | null) => void
  onOpen: (entry: SavedColor, origin: PourOrigin) => void
  onRemove: (entry: SavedColor) => void
  onDeleteCollection: (collectionId: string) => void
}

export default function SavedStrip({ library, activeId, filter, onFilter, onOpen, onRemove, onDeleteCollection }: SavedStripProps) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const active = library.collections.find((collection) => collection.id === filter) ?? null
  const shown = colorsIn(library, active?.id ?? null)

  return (
    <footer className={styles.saved} aria-label="Saved colors">
      <span className={styles.rowLabel}>Saved on this device</span>
      {library.collections.length > 0 && (
        <div className={styles.filters} role="group" aria-label="Show collection">
          {[{ id: null, name: 'All', count: library.colors.length }, ...library.collections.map((collection) => ({ id: collection.id, name: collection.name, count: colorsIn(library, collection.id).length }))].map((item) => (
            <button
              key={item.id ?? 'all'}
              type="button"
              aria-pressed={(active?.id ?? null) === item.id}
              onClick={() => { setConfirming(null); onFilter(item.id) }}
            >
              {item.name} <span>{item.count}</span>
            </button>
          ))}
        </div>
      )}
      <ul>
        {shown.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={`${styles.savedChip} ${activeId === entry.id ? styles.savedChipActive : ''}`}
              style={{ backgroundColor: entry.hex }}
              onClick={(event) => onOpen(entry, originOf(event))}
              title={[entry.hex, entry.attachments.paint ? entry.attachments.paint.paletteName : 'Color only — make a recipe', entry.attachments.thread && `DMC ${entry.attachments.thread.number}`, entry.note && 'has a note'].filter(Boolean).join(' · ')}
              aria-label={`Open saved color ${entry.hex}`}
            />
            <button type="button" className={styles.savedRemove} aria-label={`Remove saved color ${entry.hex}`} onClick={() => onRemove(entry)}>×</button>
          </li>
        ))}
      </ul>
      {active && shown.length === 0 && <p className={styles.smallNote}>Nothing in {active.name} yet. Open a saved color and tick {active.name} under Collections.</p>}
      {active && (
        <p className={styles.smallNote}>
          {confirming === active.id ? (
            <>
              Delete the collection {active.name}? The colors stay saved.{' '}
              <button type="button" className={styles.linkButton} onClick={() => { setConfirming(null); onDeleteCollection(active.id) }}>Delete collection</button>{' '}
              <button type="button" className={styles.linkButton} onClick={() => setConfirming(null)}>Keep it</button>
            </>
          ) : (
            <button type="button" className={styles.linkButton} onClick={() => setConfirming(active.id)}>Delete this collection…</button>
          )}
        </p>
      )}
    </footer>
  )
}
