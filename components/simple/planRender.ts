/**
 * The repainted picture: every pixel drawn in the predicted swatch of the pile that paints
 * it. Pure pixel math (no canvas), so it is testable and cheap to redo when the selection
 * changes.
 *
 * Selecting a pile dims everything else toward the stage gray, so you see where it is used.
 * Pixels more than ΔE 5 from their pile are hatched with diagonal ink lines: the honest
 * picture of where the plan misses.
 */
import { hexToRgb } from '@/lib/paint/plan/color'
import { NO_PILE, type PicturePlan } from '@/lib/paint/plan/picture'

/** The stage gray (see simple.module.css): what the dimmed parts fade into. */
const STAGE: [number, number, number] = [0x77, 0x77, 0x77]
const DIM = 0.72 // how far dimmed pixels fade toward the stage
const HATCH_PERIOD = 8
const HATCH_WIDTH = 1
const HATCH_INK = 0.5 // hatch lines keep this much of the swatch: darker, still the pile's color

export interface RepaintOptions {
  /** Pile to show alone, or null for all piles */
  selected: number | null
  /** Hatch the visibly-off pixels */
  markMisses: boolean
}

export function swatchColors(plan: PicturePlan): Array<[number, number, number]> {
  return plan.plan.piles.map((pile) => hexToRgb(pile.recipe.predictedHex))
}

/** RGBA pixels for the repaint, `width * height * 4` bytes. */
export function renderRepaint(plan: PicturePlan, options: RepaintOptions): Uint8ClampedArray {
  const { width, height, pile, miss } = plan
  const swatches = swatchColors(plan)
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const o = p * 4
      const owner = pile[p]
      if (owner === NO_PILE) continue // transparent stays transparent
      let [r, g, b] = swatches[owner]
      const dimmed = options.selected !== null && owner !== options.selected
      if (dimmed) {
        r = r * (1 - DIM) + STAGE[0] * DIM
        g = g * (1 - DIM) + STAGE[1] * DIM
        b = b * (1 - DIM) + STAGE[2] * DIM
      } else if (options.markMisses && miss[p] && (x + y) % HATCH_PERIOD < HATCH_WIDTH) {
        r *= HATCH_INK
        g *= HATCH_INK
        b *= HATCH_INK
      }
      out[o] = r
      out[o + 1] = g
      out[o + 2] = b
      out[o + 3] = 255
    }
  }
  return out
}

/** Which pile paints the pixel at (x, y) of a picture `sourceWidth` × `sourceHeight`, or null. */
export function pileAt(plan: PicturePlan, x: number, y: number, sourceWidth: number, sourceHeight: number): number | null {
  const px = Math.min(plan.width - 1, Math.max(0, Math.floor((x / sourceWidth) * plan.width)))
  const py = Math.min(plan.height - 1, Math.max(0, Math.floor((y / sourceHeight) * plan.height)))
  const owner = plan.pile[py * plan.width + px]
  return owner === NO_PILE ? null : owner
}
