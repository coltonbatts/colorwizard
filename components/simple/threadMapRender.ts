/**
 * Painterly DMC Thread Map pixel renderer: draws every pixel in its assigned DMC thread's
 * catalog color (no grid lines, no counted symbols).
 *
 * Isolating a thread dims every other region toward the stage gray (#777777), reusing the
 * exact visual language of Paint Plan (`components/simple/planRender.ts`).
 * In Full Color mode, pixels > 5 ΔE00 from their thread can be hatched with diagonal ink lines.
 */

import { NO_THREAD, type ThreadMapResult } from '@/lib/dmc/map/types'

/** Bright soft neutral that non-isolated regions fade into so the active thread stands out cleanly. */
const FADE_TO: [number, number, number] = [0xd8, 0xd5, 0xce]
const DIM = 0.78
const HATCH_PERIOD = 8
const HATCH_WIDTH = 1
const HATCH_INK = 0.55

export interface ThreadMapRenderOptions {
  /** Slot index to isolate, or null for all threads. */
  selected: number | null
  /** Hatch pixels > 5 ΔE00 in Full Color mode. */
  markMisses: boolean
}

/** RGBA pixels for the painterly Thread Map repaint (`width * height * 4` bytes). */
export function renderThreadMap(
  map: ThreadMapResult,
  options: ThreadMapRenderOptions,
): Uint8ClampedArray {
  const { width, height, slot, visiblyOff, slots, mode } = map
  const out = new Uint8ClampedArray(width * height * 4)
  const hatch = options.markMisses && mode === 'full-color'

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x
      const owner = slot[p]
      if (owner === NO_THREAD || owner >= slots.length) continue
      const rgb = slots[owner].thread.rgb
      let r = rgb.r
      let g = rgb.g
      let b = rgb.b

      const dimmed = options.selected !== null && owner !== options.selected
      if (dimmed) {
        r = r * (1 - DIM) + FADE_TO[0] * DIM
        g = g * (1 - DIM) + FADE_TO[1] * DIM
        b = b * (1 - DIM) + FADE_TO[2] * DIM
      } else if (hatch && visiblyOff[p] && (x + y) % HATCH_PERIOD < HATCH_WIDTH) {
        r *= HATCH_INK
        g *= HATCH_INK
        b *= HATCH_INK
      }

      const o = p * 4
      out[o] = r
      out[o + 1] = g
      out[o + 2] = b
      out[o + 3] = 255
    }
  }
  return out
}

/** Which thread slot covers source pixel (x, y) of a `sourceWidth × sourceHeight` photo, or null. */
export function threadSlotAt(
  map: ThreadMapResult,
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
): number | null {
  const px = Math.min(map.width - 1, Math.max(0, Math.floor((x / sourceWidth) * map.width)))
  const py = Math.min(map.height - 1, Math.max(0, Math.floor((y / sourceHeight) * map.height)))
  const owner = map.slot[py * map.width + px]
  return owner === NO_THREAD || owner >= map.slots.length ? null : owner
}
