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
import type { DMCThread } from '@/lib/dmc/types'

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
  /** Live non-destructive color preview for one slot (e.g. Swap drawer hover or A/B compare). */
  previewSwap?: { slotIndex: number; thread: DMCThread } | null
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
  const preview = options.previewSwap && options.previewSwap.slotIndex >= 0 && options.previewSwap.slotIndex < slots.length
    ? options.previewSwap
    : null
  const threadFor = (slotIdx: number): DMCThread =>
    preview && preview.slotIndex === slotIdx ? preview.thread : slots[slotIdx].thread

  const isSelectedLight = selected !== null && selected < slots.length
    ? threadFor(selected).oklab.L > 0.62
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
          const rgb = threadFor(owner).rgb
          out[o] = rgb.r * (1 - FALLBACK_DIM) + FALLBACK_FADE[0] * FALLBACK_DIM
          out[o + 1] = rgb.g * (1 - FALLBACK_DIM) + FALLBACK_FADE[1] * FALLBACK_DIM
          out[o + 2] = rgb.b * (1 - FALLBACK_DIM) + FALLBACK_FADE[2] * FALLBACK_DIM
        }
        out[o + 3] = 255
        continue
      }

      const rgb = threadFor(owner).rgb
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

export interface ThreadMapOutlineOptions {
  /** Slot index to emphasize (bold dark contour; other boundaries softened), or null for all regions. */
  selected: number | null
  /** Flip horizontally for iron-on / back-of-fabric transfer. */
  mirror?: boolean
}

const OUTLINE_BG_R = 255
const OUTLINE_BG_G = 255
const OUTLINE_BG_B = 255
const OUTLINE_INK_R = 27
const OUTLINE_INK_G = 26
const OUTLINE_INK_B = 24
const OUTLINE_MUTED_R = 204
const OUTLINE_MUTED_G = 201
const OUTLINE_MUTED_B = 195
const OUTLINE_SELECTED_TINT_R = 242
const OUTLINE_SELECTED_TINT_G = 240
const OUTLINE_SELECTED_TINT_B = 234

/**
 * Renders a crisp B&W Fabric Transfer Outline of region boundaries on pure white paper.
 * Uses single-pixel right/bottom edge detection (plus transparent silhouette closure) so
 * lines stay razor-thin and clean for lightbox, window, or iron-on transfer.
 */
export function renderThreadMapOutline(
  map: ThreadMapResult,
  options: ThreadMapOutlineOptions = { selected: null, mirror: false },
): Uint8ClampedArray {
  const { width, height, slot, slots } = map
  const out = new Uint8ClampedArray(width * height * 4)
  const selected = options.selected
  const mirror = Boolean(options.mirror)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width
    for (let x = 0; x < width; x++) {
      const p = rowOffset + x
      const owner = slot[p]
      const outX = mirror ? width - 1 - x : x
      const o = (rowOffset + outX) * 4

      if (owner === NO_THREAD || owner >= slots.length) {
        out[o] = OUTLINE_BG_R
        out[o + 1] = OUTLINE_BG_G
        out[o + 2] = OUTLINE_BG_B
        out[o + 3] = 255
        continue
      }

      const rightDiff = x + 1 < width && slot[p + 1] !== owner
      const downDiff = y + 1 < height && slot[p + width] !== owner
      const leftVoid = x > 0 && slot[p - 1] === NO_THREAD
      const upVoid = y > 0 && slot[p - width] === NO_THREAD
      const isBoundary = rightDiff || downDiff || leftVoid || upVoid

      if (selected !== null) {
        const isSelectedPixel = owner === selected
        const onSelectedEdge =
          isSelectedPixel && (
            (x > 0 && slot[p - 1] !== selected)
            || (x + 1 < width && slot[p + 1] !== selected)
            || (y > 0 && slot[p - width] !== selected)
            || (y + 1 < height && slot[p + width] !== selected)
          )

        if (onSelectedEdge) {
          out[o] = 17
          out[o + 1] = 17
          out[o + 2] = 17
        } else if (isSelectedPixel) {
          out[o] = OUTLINE_SELECTED_TINT_R
          out[o + 1] = OUTLINE_SELECTED_TINT_G
          out[o + 2] = OUTLINE_SELECTED_TINT_B
        } else if (isBoundary) {
          out[o] = OUTLINE_MUTED_R
          out[o + 1] = OUTLINE_MUTED_G
          out[o + 2] = OUTLINE_MUTED_B
        } else {
          out[o] = OUTLINE_BG_R
          out[o + 1] = OUTLINE_BG_G
          out[o + 2] = OUTLINE_BG_B
        }
      } else if (isBoundary) {
        out[o] = OUTLINE_INK_R
        out[o + 1] = OUTLINE_INK_G
        out[o + 2] = OUTLINE_INK_B
      } else {
        out[o] = OUTLINE_BG_R
        out[o + 1] = OUTLINE_BG_G
        out[o + 2] = OUTLINE_BG_B
      }
      out[o + 3] = 255
    }
  }

  return out
}

export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

interface ComponentBox {
  count: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function percentileIndex(counts: Int32Array, total: number, q: number): number {
  const target = q * total
  let seen = 0
  for (let i = 0; i < counts.length; i++) {
    seen += counts[i]
    if (seen >= target) return i
  }
  return counts.length - 1
}

/**
 * Computes a cluster-aware, outlier-resistant normalized (0..1) bounding box for `slotIndex`
 * so a tiny stray speckle on the opposite side of the photo cannot hijack "Zoom in".
 *
 * - Focuses on the dominant connected component when one region holds ≥ 65% of the thread.
 * - Combines significant regions (ignoring tiny <5% outlier specks) for multi-region threads.
 * - Falls back to trimmed 5th–95th percentile bounds for finely scattered accent threads,
 *   and exact tight bounds for genuinely tiny accent highlights.
 */
export function slotBounds(map: ThreadMapResult, slotIndex: number): NormalizedRect | null {
  const { width, height, slot } = map
  const n = width * height
  if (n === 0) return null

  const colCounts = new Int32Array(width)
  const rowCounts = new Int32Array(height)
  let totalPixels = 0

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      if (slot[row + x] === slotIndex) {
        totalPixels++
        colCounts[x]++
        rowCounts[y]++
      }
    }
  }

  if (totalPixels === 0) return null

  // Extract 8-connected components for `slotIndex`.
  const visited = new Uint8Array(n)
  const queue = new Int32Array(totalPixels)
  const components: ComponentBox[] = []

  for (let start = 0; start < n; start++) {
    if (slot[start] !== slotIndex || visited[start]) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1

    const sx = start % width
    const sy = (start - sx) / width
    let minX = sx
    let maxX = sx
    let minY = sy
    let maxY = sy

    while (head < tail) {
      const p = queue[head++]
      const x = p % width
      const y = (p - x) / width
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y

      const yMin = y > 0 ? y - 1 : 0
      const yMax = y + 1 < height ? y + 1 : height - 1
      const xMin = x > 0 ? x - 1 : 0
      const xMax = x + 1 < width ? x + 1 : width - 1
      for (let ny = yMin; ny <= yMax; ny++) {
        const nRow = ny * width
        for (let nx = xMin; nx <= xMax; nx++) {
          const q = nRow + nx
          if (!visited[q] && slot[q] === slotIndex) {
            visited[q] = 1
            queue[tail++] = q
          }
        }
      }
    }

    components.push({ count: tail, minX, maxX, minY, maxY })
  }

  components.sort((a, b) => b.count - a.count || a.minY - b.minY || a.minX - b.minX)

  const largest = components[0]
  let minX = largest.minX
  let maxX = largest.maxX
  let minY = largest.minY
  let maxY = largest.maxY

  if (largest.count >= totalPixels * 0.65) {
    // Dominant primary region: zoom straight onto it, ignoring stray speckles.
  } else if (largest.count >= totalPixels * 0.25 || totalPixels < 20) {
    // Multi-region thread (e.g. pair of eyes or petals): include significant components up to 75% bulk,
    // excluding tiny outlier specks (< 5% of thread pixels and < 4px).
    let covered = largest.count
    const minSignificant = totalPixels >= 20 ? Math.max(4, totalPixels * 0.05) : 1
    for (let i = 1; i < components.length && covered < totalPixels * 0.75; i++) {
      const comp = components[i]
      if (comp.count < minSignificant) break
      if (comp.minX < minX) minX = comp.minX
      if (comp.maxX > maxX) maxX = comp.maxX
      if (comp.minY < minY) minY = comp.minY
      if (comp.maxY > maxY) maxY = comp.maxY
      covered += comp.count
    }
  } else {
    // Finely scattered dots/texture: use trimmed 5th–95th percentile bounds so far outliers can't hijack zoom.
    minX = percentileIndex(colCounts, totalPixels, 0.05)
    maxX = percentileIndex(colCounts, totalPixels, 0.95)
    minY = percentileIndex(rowCounts, totalPixels, 0.05)
    maxY = percentileIndex(rowCounts, totalPixels, 0.95)
  }

  return {
    x: minX / width,
    y: minY / height,
    width: (maxX - minX + 1) / width,
    height: (maxY - minY + 1) / height,
  }
}
