'use client'

/**
 * ColorWizard, the simplest version of itself.
 * Open a picture. Click any color. See what it is, how to mix it, and which thread matches.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { hexToRgb } from '@/lib/color/conversions'
import { createSourceBuffer, decodeImageFile } from '@/lib/imagePipeline'
import ColorReadout from './ColorReadout'
import SimpleCanvas, { type PickedColor, type SamplePoint } from './SimpleCanvas'
import styles from './simple.module.css'

const SAVED_KEY = 'colorwizard-simple-saved'

function loadSaved(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((hex) => typeof hex === 'string') : []
  } catch {
    return []
  }
}

function storeSaved(saved: string[]) {
  try {
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved))
  } catch {
    /* saving is a convenience; a full or blocked store should not break sampling */
  }
}

function colorFromHex(hex: string): PickedColor | null {
  const rgb = hexToRgb(hex)
  return rgb ? { hex: hex.toUpperCase(), rgb } : null
}

export default function SimpleApp() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<HTMLCanvasElement | null>(null)
  const [point, setPoint] = useState<SamplePoint | null>(null)
  const [color, setColor] = useState<PickedColor | null>(null)
  const [valueView, setValueView] = useState(false)
  const [saved, setSaved] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setSaved(loadSaved()), [])

  const openFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('That file isn’t a picture.')
      return
    }
    try {
      const image = await decodeImageFile(file)
      setSource(await createSourceBuffer(image))
      setPoint(null)
      setColor(null)
      setValueView(false)
      setError(null)
    } catch {
      setError('Couldn’t open that picture. Try a JPEG or PNG.')
    }
  }, [])

  const choosePicture = useCallback(() => fileInputRef.current?.click(), [])

  const handleSample = useCallback((nextPoint: SamplePoint, picked: PickedColor) => {
    setPoint(nextPoint)
    setColor(picked)
  }, [])

  const openColor = useCallback((hex: string) => {
    const picked = colorFromHex(hex)
    if (!picked) return
    setPoint(null)
    setColor(picked)
  }, [])

  const updateSaved = useCallback((update: (current: string[]) => string[]) => {
    setSaved((current) => {
      const next = update(current)
      storeSaved(next)
      return next
    })
  }, [])

  // Drop or paste a picture anywhere; V for values; ⌘O to open.
  useEffect(() => {
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return
      event.preventDefault()
      setIsDragging(true)
    }
    const onDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setIsDragging(false)
    }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      setIsDragging(false)
      void openFile(event.dataTransfer?.files[0])
    }
    const onPaste = (event: ClipboardEvent) => {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.type.startsWith('image/'))
      if (item) void openFile(item.getAsFile())
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        choosePicture()
      } else if (event.key.toLowerCase() === 'v' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        setValueView((on) => !on)
      }
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [choosePicture, openFile])

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(event) => {
        void openFile(event.target.files?.[0])
        event.target.value = ''
      }}
    />
  )

  if (!source) {
    return (
      <main id="main-content" className={`${styles.app} ${styles.welcome} ${isDragging ? styles.dragging : ''}`}>
        {fileInput}
        <div className={styles.welcomeBody}>
          <h1 className={styles.wordmark}>ColorWizard</h1>
          <p className={styles.tagline}>Open a picture. Click any color.</p>
          <button type="button" className={styles.primaryButton} onClick={choosePicture}>Open Picture…</button>
          <p className={styles.hint}>{error ?? 'Or drop or paste one here. It never leaves this computer.'}</p>
        </div>
      </main>
    )
  }

  const isSaved = !!color && saved.includes(color.hex)

  return (
    <main id="main-content" className={`${styles.app} ${styles.workspace} ${isDragging ? styles.dragging : ''}`}>
      {fileInput}
      <SimpleCanvas source={source} valueView={valueView} point={point} onSample={handleSample} />

      <aside className={styles.panel} aria-label="Color">
        <div className={styles.toolbar}>
          <span className={styles.wordmarkSmall}>ColorWizard</span>
          <div className={styles.toolbarButtons}>
            <button type="button" onClick={choosePicture} title="Open a picture (⌘O)">Open…</button>
            <button type="button" onClick={() => setValueView((on) => !on)} aria-pressed={valueView} title="Show values only (V)">Value</button>
          </div>
        </div>

        <div className={styles.panelBody}>
          {color ? (
            <ColorReadout
              color={color}
              isSaved={isSaved}
              onSave={() => updateSaved((current) => (current.includes(color.hex) ? current : [...current, color.hex]))}
              onOpenColor={openColor}
            />
          ) : (
            <p className={styles.emptyReadout}>Click the picture to read a color.</p>
          )}
        </div>

        {saved.length > 0 && (
          <footer className={styles.saved}>
            <span className={styles.rowLabel}>Saved</span>
            <ul>
              {saved.map((hex) => (
                <li key={hex}>
                  <button
                    type="button"
                    className={`${styles.savedChip} ${color?.hex === hex ? styles.savedChipActive : ''}`}
                    style={{ backgroundColor: hex }}
                    onClick={() => openColor(hex)}
                    title={hex}
                    aria-label={`Open saved color ${hex}`}
                  />
                  <button
                    type="button"
                    className={styles.savedRemove}
                    onClick={() => updateSaved((current) => current.filter((entry) => entry !== hex))}
                    aria-label={`Remove ${hex}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </footer>
        )}
      </aside>
    </main>
  )
}
