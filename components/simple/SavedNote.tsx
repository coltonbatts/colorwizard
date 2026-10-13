'use client'

/** A note on a saved color. Saved when you leave the field. */

import { useState } from 'react'
import { MAX_NOTE_LENGTH } from '@/lib/colorLibrary'
import styles from './simple.module.css'

interface SavedNoteProps {
  note: string
  /** Returns whether the note was stored. */
  onCommit: (note: string) => boolean
}

export default function SavedNote({ note, onCommit }: SavedNoteProps) {
  const [text, setText] = useState(note)
  const [status, setStatus] = useState<'saved' | 'failed' | null>(null)

  const commit = () => {
    if (text.trim() === note.trim()) return
    setStatus(onCommit(text) ? 'saved' : 'failed')
  }

  return (
    <div className={styles.noteField}>
      <label htmlFor="saved-note">Note</label>
      <textarea
        id="saved-note"
        value={text}
        rows={2}
        maxLength={MAX_NOTE_LENGTH}
        placeholder="Where you’ll use it, what it’s for…"
        onChange={(event) => { setText(event.target.value); setStatus(null) }}
        onBlur={commit}
      />
      <p className={styles.smallNote} role="status">
        {status === 'saved' ? 'Note saved.' : status === 'failed' ? 'Couldn’t save the note. It is still in the box; try again.' : ''}
      </p>
    </div>
  )
}
