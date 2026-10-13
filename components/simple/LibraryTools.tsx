'use client'

/** Back up the saved colors to a file, and restore them from one. Restoring merges; nothing is deleted. */

import { useRef, useState } from 'react'
import type { ColorLibrary } from '@/lib/colorLibrary'
import {
  BACKUP_PROBLEM_TEXT, backupFileName, buildBackup, describeMerge, MAX_BACKUP_BYTES, mergeLibraries, nothingToImport, parseBackup,
  type MergeReport,
} from '@/lib/libraryBackup'
import styles from './simple.module.css'

interface LibraryToolsProps {
  library: ColorLibrary
  /** False when saved data can't be read here: restoring is off so it can't overwrite what is there. */
  canWrite: boolean
  /** Stores the merged library. Returns whether it was stored. */
  onImport: (merged: ColorLibrary) => boolean
}

interface Pending {
  merged: ColorLibrary
  report: MergeReport
  fileCounts: { colors: number; collections: number }
}

export default function LibraryTools({ library, canWrite, onImport }: LibraryToolsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)

  const download = () => {
    const now = Date.now()
    const name = backupFileName(now)
    const url = URL.createObjectURL(new Blob([buildBackup(library, now)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setProblem(null)
    setStatus(`Downloaded ${name}. It has ${library.colors.length} ${library.colors.length === 1 ? 'color' : 'colors'}, their notes and collections. Pictures aren’t included.`)
  }

  const choose = async (file: File | undefined) => {
    if (!file) return
    setStatus(null)
    setProblem(null)
    setPending(null)
    if (file.size > MAX_BACKUP_BYTES) return setProblem(BACKUP_PROBLEM_TEXT['too-large'])
    let text: string
    try { text = await file.text() } catch { return setProblem('Couldn’t read that file.') }
    const parsed = parseBackup(text)
    if (!parsed.ok) return setProblem(BACKUP_PROBLEM_TEXT[parsed.problem])
    const { library: merged, report } = mergeLibraries(library, parsed.library, () => crypto.randomUUID())
    if (nothingToImport(report)) return setStatus('Everything in that file is already saved here. Nothing changed.')
    setPending({ merged, report, fileCounts: { colors: parsed.library.colors.length, collections: parsed.library.collections.length } })
  }

  const confirm = () => {
    if (!pending) return
    if (onImport(pending.merged)) {
      const { added, updated, collectionsAdded } = pending.report
      setStatus(`Imported: ${added} added, ${updated} updated, ${collectionsAdded} ${collectionsAdded === 1 ? 'collection' : 'collections'} added.`)
    } else {
      setProblem('Couldn’t save the imported colors on this device, so nothing was changed. Try again.')
    }
    setPending(null)
  }

  return (
    <div className={styles.libraryTools}>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Backup file"
        onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = '' }}
      />
      <div className={styles.libraryButtons}>
        {library.colors.length > 0 && <button type="button" className={styles.linkButton} onClick={download}>Download a backup</button>}
        <button type="button" className={styles.linkButton} disabled={!canWrite} onClick={() => inputRef.current?.click()}>Restore from a backup…</button>
      </div>
      {!canWrite && <p className={styles.smallNote}>Saved colors can’t be read in this browser, so restoring is off to protect what is there.</p>}
      {pending && (
        <div className={styles.importPreview} role="group" aria-label="Import preview">
          <p>{describeMerge(pending.report, pending.fileCounts)}</p>
          <div>
            <button type="button" onClick={confirm}>Import</button>
            <button type="button" className={styles.linkButton} onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}
      <p className={styles.smallNote} role="status">{status ?? ''}</p>
      {problem && <p className={styles.smallNote} role="alert">{problem}</p>}
    </div>
  )
}
