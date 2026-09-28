'use client'

/**
 * "Your paints": the tubes the paint recipe is allowed to use. The default is the
 * Core six; a painter can switch to their own set and add tubes of their own.
 */

import { useState, type FormEvent } from 'react'
import { makeCustomTube, MAX_TINTING_STRENGTH, MIN_TINTING_STRENGTH, resolvePalettePigments } from '@/lib/paint/palettePigments'
import { PALETTE } from '@/lib/spectral/palette'
import { usePaletteStore } from '@/lib/store/usePaletteStore'
import { ALL_PALETTE_COLORS, DEFAULT_PALETTE, type Palette } from '@/lib/types/palette'
import styles from './simple.module.css'

const MIN_TUBES = 2

export function usePaintPalette(): Palette {
  const palettes = usePaletteStore((state) => state.palettes)
  return palettes.find((palette) => palette.isActive) ?? palettes.find((palette) => palette.isDefault) ?? DEFAULT_PALETTE
}

export default function PaintPalette({ palette }: { palette: Palette }) {
  const createPalette = usePaletteStore((state) => state.createPalette)
  const setActivePalette = usePaletteStore((state) => state.setActivePalette)
  const addColor = usePaletteStore((state) => state.addColorToPalette)
  const removeColor = usePaletteStore((state) => state.removeColorFromPalette)
  const palettes = usePaletteStore((state) => state.palettes)

  const [name, setName] = useState('')
  const [hex, setHex] = useState('#3b6fb6')
  const [strength, setStrength] = useState('1')
  const [error, setError] = useState<string | null>(null)

  const tubes = resolvePalettePigments(palette.colors)
  const mine = !palette.isDefault
  const spareLibrary = ALL_PALETTE_COLORS.concat(
    PALETTE.filter((pigment) => !ALL_PALETTE_COLORS.some((color) => color.id === pigment.id)).map((pigment) => ({ id: pigment.id, displayName: pigment.name })),
  ).filter((color) => !palette.colors.some((existing) => existing.id === color.id))

  const startOwn = () => {
    const existing = palettes.find((entry) => entry.id === 'simple-my-paints')
    if (existing) {
      setActivePalette(existing.id)
      return
    }
    const id = 'simple-my-paints'
    createPalette({ id, name: 'My paints', colors: [...palette.colors], isActive: false, isDefault: false, createdAt: Date.now() })
    setActivePalette(id)
  }

  const addTube = (event: FormEvent) => {
    event.preventDefault()
    const parsed = Number(strength)
    const tube = makeCustomTube(name, hex, Number.isFinite(parsed) ? parsed : undefined)
    if (!tube) {
      setError('Give the tube a name and a color.')
      return
    }
    if (palette.colors.some((color) => color.id === tube.id)) {
      setError('That tube is already here.')
      return
    }
    addColor(palette.id, tube)
    setName('')
    setError(null)
  }

  return (
    <details className={styles.paints}>
      <summary>
        Your paints <span>{mine ? palette.name : 'Core six'} · {tubes.length}</span>
      </summary>

      <ul className={styles.tubes}>
        {tubes.map((tube) => (
          <li key={tube.id}>
            <i style={{ backgroundColor: tube.hex }} aria-hidden="true" />
            <span>{tube.name}</span>
            {mine && tubes.length > MIN_TUBES && (
              <button type="button" onClick={() => removeColor(palette.id, tube.id)} aria-label={`Remove ${tube.name}`}>×</button>
            )}
          </li>
        ))}
      </ul>

      {!mine ? (
        <button type="button" className={styles.linkButton} onClick={startOwn}>Use my own paints…</button>
      ) : (
        <>
          {spareLibrary.length > 0 && (
            <div className={styles.chipRow}>
              <span className={styles.rowLabel}>Add</span>
              {spareLibrary.map((color) => (
                <button key={color.id} type="button" className={styles.chip} onClick={() => addColor(palette.id, color)}>
                  {color.displayName}
                </button>
              ))}
            </div>
          )}

          <form className={styles.tubeForm} onSubmit={addTube}>
            <span className={styles.rowLabel}>Your own tube</span>
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, e.g. Ultramarine" aria-label="Tube name" />
            <input type="color" value={hex} onChange={(event) => setHex(event.target.value)} aria-label="Tube color, as it looks squeezed out" />
            <input
              type="number"
              value={strength}
              min={MIN_TINTING_STRENGTH}
              max={MAX_TINTING_STRENGTH}
              step="0.1"
              onChange={(event) => setStrength(event.target.value)}
              aria-label="Tinting strength"
              title="Tinting strength: 1 is as strong as white. Phthalo blue is 10."
            />
            <button type="submit">Add</button>
            {error && <p role="alert">{error}</p>}
            <p>Strength is your estimate. 1 is as strong as white; phthalo blue is 10.</p>
          </form>

          <button type="button" className={styles.linkButton} onClick={() => setActivePalette(DEFAULT_PALETTE.id)}>Back to the Core six</button>
        </>
      )}
    </details>
  )
}
