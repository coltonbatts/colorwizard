'use client'

/** Which collections a saved color is in, and a way to start a new one. */

import { useState, type FormEvent } from 'react'
import { MAX_COLLECTION_NAME, type Collection, type SavedColor } from '@/lib/colorLibrary'
import styles from './simple.module.css'

interface CollectionPickerProps {
  color: SavedColor
  collections: Collection[]
  /** Returns whether it was stored. */
  onToggle: (collectionId: string, member: boolean) => boolean
  /** Makes the collection and puts this color in it. Returns a message if it could not. */
  onCreate: (name: string) => string | null
}

export default function CollectionPicker({ color, collections, onToggle, onCreate }: CollectionPickerProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const create = (event: FormEvent) => {
    event.preventDefault()
    const message = onCreate(name)
    setProblem(message)
    if (!message) {
      setName('')
      setAdding(false)
    }
  }

  return (
    <fieldset className={styles.collections}>
      <legend>Collections</legend>
      {collections.map((collection) => (
        <label key={collection.id}>
          <input
            type="checkbox"
            checked={color.collectionIds.includes(collection.id)}
            onChange={(event) => onToggle(collection.id, event.target.checked)}
          />
          {collection.name}
        </label>
      ))}
      {adding ? (
        <form onSubmit={create} noValidate>
          <label className={styles.srOnly} htmlFor="new-collection-name">Collection name</label>
          <input
            id="new-collection-name"
            value={name}
            maxLength={MAX_COLLECTION_NAME + 20}
            placeholder="Roof, Sunday sketches…"
            autoFocus
            autoComplete="off"
            aria-invalid={!!problem}
            onChange={(event) => { setName(event.target.value); setProblem(null) }}
            onKeyDown={(event) => { if (event.key === 'Escape') { setAdding(false); setProblem(null) } }}
          />
          <button type="submit">Create</button>
          {problem && <p role="alert" className={styles.smallNote}>{problem}</p>}
        </form>
      ) : (
        <button type="button" className={styles.linkButton} onClick={() => setAdding(true)}>New collection…</button>
      )}
    </fieldset>
  )
}
