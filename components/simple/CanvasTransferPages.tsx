import {
  formatInches, GRID_INCHES, gridSegments, transferMeasurements,
  type CanvasDraft, type ImageCrop,
} from '@/lib/paint/canvasSetup'
import { PARTS_CAVEAT, PRINT_CAVEAT } from '@/lib/paint/plan/planFit'
import type { CardCell } from '@/lib/paint/plan/card'
import { drawTransferOverlay } from './canvasTransfer'
import { trialRecipeText, type TrialRecipes } from './useTransferRecipes'
import styles from './canvasTransferPages.module.css'

export interface CanvasTransfer {
  draft: CanvasDraft
  crop: ImageCrop
  source: HTMLCanvasElement
  trials: TrialRecipes
}

export function renderTransferImage(transfer: CanvasTransfer): string {
  const { draft, crop, source } = transfer
  const scale = Math.min(440 / draft.face.width, 550 / draft.face.height)
  const result = document.createElement('canvas')
  result.width = Math.max(1, Math.round(draft.face.width * scale))
  result.height = Math.max(1, Math.round(draft.face.height * scale))
  const ctx = result.getContext('2d')
  if (!ctx) throw new Error('Canvas context unavailable for transfer print')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, result.width, result.height)
  const landmarks = transferMeasurements(draft, source, crop).landmarks.map(({ index, position, mark }) => ({
    index, position, isTrial: Boolean(mark.trial),
  }))
  drawTransferOverlay(ctx, { x: 0, y: 0, width: result.width, height: result.height }, draft.face, landmarks, true)
  return result.toDataURL('image/png')
}

export default function CanvasTransferPages({ transfer, image, piles, paletteKey }: {
  transfer: CanvasTransfer
  image: string
  piles: CardCell[]
  paletteKey: string
}) {
  const { draft, source, crop, trials } = transfer
  const { face } = draft
  const { landmarks, spans } = transferMeasurements(draft, source, crop)
  const mixTrials = landmarks.filter(({ mark }) => mark.trial)
  const faceText = `${face.width} × ${face.height} inches`
  return (
    <>
      <section className={styles.page} data-transfer-reference aria-label="Canvas transfer sheet">
        <h2>Canvas transfer · {faceText}</h2>
        <p className={styles.intro}>
          {GRID_INCHES}-inch grid · {gridSegments(face.width).length} columns × {gridSegments(face.height).length} rows.
          Measure from the top-left corner of the canvas face. Numbers on the map label the marks below.
        </p>
        <div className={styles.mapAndMeasures}>
          {/* eslint-disable-next-line @next/next/no-img-element -- print image generated in this browser */}
          <img src={image} alt="Gridded reference with numbered landmark and mix trial positions" />
          <div>
            <table className={styles.table} aria-label="Landmark measurements">
              <thead><tr><th scope="col">Mark</th><th scope="col">From left</th><th scope="col">From top</th></tr></thead>
              <tbody>
                {landmarks.map(({ index, mark, position }) => (
                  <tr key={mark.id}>
                    <th scope="row">{index}. {mark.name || `Mark ${index}`}</th>
                    {position ? <><td>{formatInches(position.x)}″</td><td>{formatInches(position.y)}″</td></>
                      : <td colSpan={2}>Outside crop</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            {landmarks.length === 0 && <p>No landmarks placed.</p>}
            {spans.length > 0 && <div className={styles.spans}>
              <h3>Span checks</h3>
              {spans.map(({ from, to, fromName, toName, distance }) =>
                <p key={`${from}:${to}`}>{fromName} to {toName} · {distance === null ? 'Outside crop' : `${formatInches(distance)}″`}</p>)}
            </div>}
          </div>
        </div>
        <p className={styles.studioCheck}>Transfer two figures as a pilot. Check selected marks within ⅛ inch per axis and confirm the spans before drawing in the other figures.</p>
      </section>
      <section className={styles.page} data-transfer-worksheet aria-label="Oil mix worksheet">
        <h2>Oil mix worksheet</h2>
        <p className={styles.intro}>Use your actual tubes and a consistent volume measure. {PARTS_CAVEAT} Review the trial swatches wet and touch-dry on your intended ground. Repeat the key mixtures from fresh paint before batching. {PRINT_CAVEAT}</p>
        <p className={styles.studioCheck}><strong>Volume of one part</strong> {draft.volumeUnit.trim() || '________________'}</p>
        <table className={styles.table} aria-label="Base pile trials">
          <thead><tr><th scope="col">Pile</th><th scope="col">Model recipe</th><th scope="col">Measured parts and adjustment</th></tr></thead>
          <tbody>{piles.map((pile) => <tr key={pile.number}><th scope="row">{pile.name}</th><td>{pile.recipe}</td><td className={styles.writeIn} /></tr>)}</tbody>
        </table>
        {mixTrials.length > 0 && <>
          <h3>Selected color trials</h3>
          <table className={styles.table} aria-label="Selected color trials">
            <thead><tr><th scope="col">Mark and target</th><th scope="col">Model starting mix</th><th scope="col">Measured parts and observations</th></tr></thead>
            <tbody>
              {mixTrials.map(({ index, mark, position }) => {
                const trial = mark.trial!
                const recipe = trials.recipes[trial.hex]
                return <tr key={mark.id}>
                  <th scope="row">{index}. {mark.name}<br />{trial.hex}{!position && <><br />Outside crop</>}</th>
                  <td>{recipe ? trialRecipeText(recipe) : 'Model mix unavailable'}</td>
                  <td className={styles.writeIn}>
                    {position && trial.acceptedPalette === paletteKey && <strong>Accepted for batching<br /></strong>}
                    {trial.acceptedPalette && trial.acceptedPalette !== paletteKey && <strong>Review with the current palette<br /></strong>}
                    {trial.measured && <p>{trial.measured}</p>}
                    {trial.correction && <p>{trial.correction}</p>}
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </>}
        <p className={styles.studioCheck}>
          <strong>Quarter-scale study · {face.width / 4} × {face.height / 4} inches.</strong> Lay in the main shapes, mass three values, and develop the brunaille. Block in with the tested mixes and check the relationships and edges together.
        </p>
      </section>
    </>
  )
}
