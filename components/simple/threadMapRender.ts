/**
 * Painterly DMC Thread Map pixel renderer: draws every pixel in its assigned DMC thread's
 * catalog color (no grid lines, no counted symbols).
 *
 * When a thread is isolated, every other pixel becomes a clean, bright tracing-paper ghost
 * of the original photo (soft grayscale over warm white) so stitch landmarks (eyes, contours,
 * petals) remain clear, while the isolated DMC thread shines in full color with a crisp 1px
 * boundary contour so even pale whites and tiny highlights pop unmistakably.
 */

import { NO_THREAD, type ThreadMapResult } from '@/lib/dmc/map/types'

/** Warm bright tracing-paper white for isolated context. */
const PAPER_R = 248
const PAPER_G = 247
const PAPER_B = 243
/** Share of original photo luminance kept in the ghosted tracing-paper context. */
const GHOST_LUMA_WEIGHT = 0.26

/** Fallback dim color when original pixels are not provided (e.g. unit tests). */
const FALLBACK_FADE: [number, number, number] = [0xf2, 0xf0, 0xeb]
const FALLBACK_DIM = 0.82

const HATCH_PERIOD = 8
const HATCH_WIDTH = 1
const HATCH_INK = 0.55

export interface ThreadMapRenderOptions {
  /** Slot index to isolate, or null for all threads. */
  selected: number | null
  /** Hatch pixels > 5 ΔE00 in Full Color mode. */
  markMisses: boolean
  /** Original working-copy RGBA pixels (same width × height) for crisp tracing-paper isolation context. */
  sourcePixels?: ArrayLike<number> | null
}

/** RGBA pixels for the painterly Thread Map repaint (`width * height * 4` bytes). */
export function renderThreadMap(
  map: ThreadMapResult,
  options: ThreadMapRenderOptions,
): Uint8ClampedArray {
  const { width, height, slot, visiblyOff, slots, mode } = map
  const out = new Uint8ClampedArray(width * height * 4)
  const hatch = options.markMisses && mode === 'full-color'
  const selected = options.selected
  const src = options.sourcePixels && options.sourcePixels.length >= width * height * 4
    ? options.sourcePixels
    : null

  const isSelectedLight = selected !== null && selected < slots.length
    ? slots[selected].thread.oklab.L > 0.62
    : false

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      const p = rowOffset + x
      const owner = slot[p]
      if (owner === NO_THREAD || owner >= slots.length) continue
      const o = p * 4

      if (selected !== null && owner !== selected) {
        if (src) {
          const luma = 0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2]
          out[o] = PAPER_R * (1 - GHOST_LUMA_WEIGHT) + luma * GHOST_LUMA_WEIGHT
          out[o + 1] = PAPER_G * (1 - GHOST_LUMA_WEIGHT) + luma * GHOST_LUMA_WEIGHT
          out[o + 2] = PAPER_B * (1 - GHOST_LUMA_WEIGHT) + luma * GHOST_LUMA_WEIGHT
        } else {
          const rgb = slots[owner].thread.rgb
          out[o] = rgb.r * (1 - FALLBACK_DIM) + FALLBACK_FADE[0] * FALLBACK_DIM
          out[o + 1] = rgb.g * (1 - FALLBACK_DIM) + FALLBACK_FADE[1] * FALLBACK_DIM
          out[o + 2] = rgb.b * (1 - FALLBACK_DIM) + FALLBACK_FADE[2] * FALLBACK_DIM
        }
        out[o + 3] = 255
        continue
      }

      const rgb = slots[owner].thread.rgb
      let r = rgb.r
      let g = rgb.g
      let b = rgb.b

      if (selected !== null) {
        // Draw a crisp 1px contour on the perimeter of the isolated stitch region so even
        // pure White or tiny 1% highlights stand out unmistakably against the tracing-paper photo.
        const onEdge =
          x === 0
          || x === width - 1
          || y === 0
          || y === height - 1
          || slot[p - 1] !== selected
          || slot[p + 1] !== selected
          || slot[p - width] !== selected
          || slot[p + width] !== selected

        if (onEdge) {
          if (isSelectedLight) {
            // Crisp dark-ink outline around pale/white stitches
            r = r * 0.22 + 34 * 0.78
            g = g * 0.22 + 32 * 0.78
            b = b * 0.22 + 30 * 0.78
          } else {
            // Subtle darker rim around mid/dark stitches
            r *= 0.58
            g *= 0.58
            b *= 0.58
          }
        }
      } else if (hatch && visiblyOff[p] && (x + y) % HATCH_PERIOD < HATCH_WIDTH) {
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

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Computes the tight normalized (0..1) bounding box of all pixels assigned to `slotIndex`,
 * for "Zoom to area" stitch focusing. Returns null if the thread has no pixels.
 */
export function slotBounds(map: ThreadMapResult, slotIndex: number): NormalizedRect | null {
  const { width, height, slot } = map
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (slot[row + x] === slotIndex) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (maxX < minX || maxY < minY) return null
  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  }
}
