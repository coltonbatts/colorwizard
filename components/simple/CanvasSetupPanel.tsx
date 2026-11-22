'use client'

import { useEffect, useRef, useState } from 'react'
import {
  centeredCrop, DEFAULT_FACE, formatInches, GRID_INCHES, gridSegments, validFace,
  type CanvasDraft, type CanvasFace, type CanvasLandmark, type CanvasSpan, type ImageCrop, type MixTrial,
  transferMeasurements,
} from '@/lib/paint/canvasSetup'
import { getPainterValuePercent } from '@/lib/paintingMath'
import type { Palette } from '@/lib/types/palette'
import PaintPalette from './PaintPalette'
import { paintPaletteKey, trialRecipeText, type TrialRecipes } from './useTransferRecipes'
import styles from './canvasSetup.module.css'
import simple from './simple.module.css'

export type MarkTool = 'landmark' | 'trial'

interface CanvasSetupPanelProps {
  source: HTMLCanvasElement
  draft: CanvasDraft | null
  crop: ImageCrop | null
  tool: MarkTool | null
  setTool: (tool: MarkTool | null) => void
  onLock: (face: CanvasFace) => void
  onChange: (draft: CanvasDraft) => void
  onPlan: () => void
  status: string | null
  palette: Palette
  trials: TrialRecipes
}

function CropPreview({ source, crop }: { source: HTMLCanvasElement; crop: ImageCrop }) {
  const preview = useRef<HTMLCanvasElement>(null)
  const reduction = 208 / Math.max(crop.width, crop.height)
  useEffect(() => {
    const ctx = preview.current?.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, ctx.canvas.width, ctx.canvas.height)
  }, [crop, source])
  return <canvas ref={preview} width={Math.max(1, Math.round(crop.width * reduction))} height={Math.max(1, Math.round(crop.height * reduction))} role="img" aria-label="Centered crop preview" />
}

function MarkEditor({ mark, index, position, onChange, onRemove, paletteKey, trials }: {
  mark: CanvasLandmark
  index: number
  position: { x: number; y: number } | null
  onChange: (mark: CanvasLandmark) => void
  onRemove: () => void
  paletteKey: string
  trials: TrialRecipes
}) {
  const trial = mark.trial
  const recipe = trial && trials.recipes[trial.hex]
  const updateTrial = (patch: Partial<MixTrial>) => {
    if (trial) onChange({ ...mark, trial: { ...trial, acceptedPalette: null, ...patch } })
  }
  const lightness = trial ? Math.round(getPainterValuePercent(
    parseInt(trial.hex.slice(1, 3), 16), parseInt(trial.hex.slice(3, 5), 16), parseInt(trial.hex.slice(5, 7), 16),
  )) : null
  return (
    <li className={styles.mark}>
      <div className={styles.markTitle}>
        <span className={styles.badge} aria-hidden="true">{index}</span>
        <input aria-label={`Name for mark ${index}`} value={mark.name} placeholder={`Mark ${index}`} maxLength={80} onChange={(event) => onChange({ ...mark, name: event.target.value })} />
        <button type="button" className={styles.remove} onClick={onRemove} aria-label={`Remove mark ${index}`}>×</button>
      </div>
      <output className={styles.coordinates}>
        {position ? `${formatInches(position.x)}″ from left · ${formatInches(position.y)}″ from top` : 'Outside the locked crop'}
      </output>
      {trial && <div className={styles.trial}>
        <p className={styles.swatchLine}>
          <span className={styles.swatch} style={{ backgroundColor: trial.hex }} aria-hidden="true" />
          <span>Target {trial.hex} · L* {lightness}</span>
          {recipe && <span className={styles.swatch} style={{ backgroundColor: recipe.predictedHex }} title="Predicted mix" aria-label={`Predicted mix ${recipe.predictedHex}`} role="img" />}
        </p>
        <p className={simple.smallNote}>{recipe ? `Model · ${trialRecipeText(recipe)}` : trials.pending ? 'Calculating trial mix…' : 'A model mix is unavailable for this target.'}</p>
        <label>Tube names and measured volume parts
          <textarea aria-label={`Tube names and measured volume parts for ${mark.name || `mark ${index}`}`} rows={2} maxLength={500} value={trial.measured} onChange={(event) => updateTrial({ measured: event.target.value })} />
        </label>
        <label>Wet, touch-dry and repeat notes
          <textarea aria-label={`Wet, touch-dry and repeat notes for ${mark.name || `mark ${index}`}`} rows={2} maxLength={500} value={trial.correction} onChange={(event) => updateTrial({ correction: event.target.value })} />
        </label>
        <label className={simple.check}>
          <input type="checkbox" checked={trial.acceptedPalette === paletteKey} disabled={!trial.measured.trim() || !position}
            onChange={(event) => updateTrial({ acceptedPalette: event.target.checked ? paletteKey : null })} />
          Accept this mix for batching
        </label>
        {trial.acceptedPalette && trial.acceptedPalette !== paletteKey && <p className={simple.smallNote}>Review this trial with the current palette.</p>}
      </div>}
    </li>
  )
}

export default function CanvasSetupPanel({ source, draft, crop, tool, setTool, onLock, onChange, onPlan, status, palette, trials }: CanvasSetupPanelProps) {
  const [widthText, setWidthText] = useState(String(draft?.face.width ?? DEFAULT_FACE.width))
  const [heightText, setHeightText] = useState(String(draft?.face.height ?? DEFAULT_FACE.height))
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const nextFace = { width: Number(widthText), height: Number(heightText) }
  const preview = validFace(nextFace) ? centeredCrop(source, nextFace) : null
  const sameFace = nextFace.width === draft?.face.width && nextFace.height === draft?.face.height
  const measurements = draft && crop ? transferMeasurements(draft, source, crop) : null
  const inside = measurements?.landmarks.filter(({ position }) => position)
  const span: CanvasSpan = { from, to }
  const canMeasure = Boolean(from && to && from !== to && inside?.some(({ mark }) => mark.id === from)
    && inside.some(({ mark }) => mark.id === to) && !draft?.spans.some((entry) =>
      (entry.from === from && entry.to === to) || (entry.from === to && entry.to === from)))
  const paletteKey = paintPaletteKey(palette)

  return (
    <div className={styles.setup}>
      <section className={styles.section}>
        <h2>Canvas setup</h2>
        <form onSubmit={(event) => { event.preventDefault(); if (preview) onLock(nextFace) }}>
          <div className={styles.dimensions}>
            <label>Width (in) <input type="number" min="0.125" max="240" step="any" required value={widthText} onChange={(event) => setWidthText(event.target.value)} /></label>
            <label>Height (in) <input type="number" min="0.125" max="240" step="any" required value={heightText} onChange={(event) => setHeightText(event.target.value)} /></label>
          </div>
          {preview && <figure className={styles.preview}>
            <CropPreview source={source} crop={preview} />
            <figcaption>Centered crop · {Math.round(preview.width)} × {Math.round(preview.height)} px
              <br />{gridSegments(nextFace.width).length} columns × {gridSegments(nextFace.height).length} rows
            </figcaption>
          </figure>}
          <button type="submit" className={simple.planButton} disabled={!preview || sameFace}>{sameFace ? 'Crop locked' : 'Lock centered crop'}</button>
        </form>
        {status && <p className={simple.smallNote} role="status">{status}</p>}
        {draft && <label className={simple.check}>
          <input type="checkbox" checked={draft.grid} onChange={(event) => onChange({ ...draft, grid: event.target.checked })} />
          Show {GRID_INCHES}-inch transfer grid
        </label>}
      </section>

      {draft && measurements && <>
        <section className={styles.section}>
          <h3>Landmarks &amp; mix trials</h3>
          <div className={styles.actions}>
            <button type="button" className={simple.planButton} aria-pressed={tool === 'landmark'} onClick={() => setTool(tool === 'landmark' ? null : 'landmark')}>Place landmark</button>
            <button type="button" className={simple.planButton} aria-pressed={tool === 'trial'} onClick={() => setTool(tool === 'trial' ? null : 'trial')}>Sample mix trial</button>
          </div>
          <p className={simple.smallNote} role="status">{tool === 'landmark' ? 'Click or tap the reference to place the next landmark.' :
            tool === 'trial' ? 'Click or tap inside a patch to sample its average color.' : 'Use landmarks for shapes and mix trials for sampled colors.'}</p>
          <ol className={styles.markList}>
            {measurements.landmarks.map(({ mark, index, position }) => <MarkEditor key={mark.id} {...{ mark, index, position, paletteKey, trials }}
              onChange={(next) => onChange({ ...draft, landmarks: draft.landmarks.map((saved) => saved.id === next.id ? next : saved) })}
              onRemove={() => onChange({ ...draft, landmarks: draft.landmarks.filter((saved) => saved.id !== mark.id), spans: draft.spans.filter((saved) => saved.from !== mark.id && saved.to !== mark.id) })} />)}
          </ol>
        </section>
        <section className={styles.section}>
          <h3>Check a span</h3>
          <div className={styles.dimensions}>
            <label>From <select aria-label="From landmark" value={from} onChange={(event) => setFrom(event.target.value)}>
              <option value="">Choose mark</option>
              {inside?.map(({ mark, index }) => <option key={mark.id} value={mark.id}>{index}. {mark.name || `Mark ${index}`}</option>)}
            </select></label>
            <label>To <select aria-label="To landmark" value={to} onChange={(event) => setTo(event.target.value)}>
              <option value="">Choose mark</option>
              {inside?.map(({ mark, index }) => <option key={mark.id} value={mark.id}>{index}. {mark.name || `Mark ${index}`}</option>)}
            </select></label>
          </div>
          <button type="button" className={simple.planButton} disabled={!canMeasure} onClick={() => onChange({ ...draft, spans: [...draft.spans, span] })}>Save span</button>
          {measurements.spans.length > 0 && <ul className={styles.markList}>
            {measurements.spans.map((entry) => <li className={styles.span} key={`${entry.from}:${entry.to}`}>
              <span>{entry.fromName} to {entry.toName} · {entry.distance === null ? 'Outside crop' : `${formatInches(entry.distance)}″`}</span>
              <button type="button" className={styles.remove} aria-label={`Remove span from ${entry.fromName} to ${entry.toName}`} onClick={() => onChange({ ...draft, spans: draft.spans.filter((saved) => saved.from !== entry.from || saved.to !== entry.to) })}>×</button>
            </li>)}
          </ul>}
        </section>
        <section className={styles.section}>
          <label>Volume of one part <input type="text" maxLength={80} value={draft.volumeUnit} placeholder="e.g. ¼ mL" onChange={(event) => onChange({ ...draft, volumeUnit: event.target.value })} /></label>
          <button type="button" className={simple.planButton} onClick={onPlan}>Open Plan to print packet</button>
        </section>
        <PaintPalette palette={palette} />
      </>}
    </div>
  )
}
