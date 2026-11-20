/**
 * The first stages of an indirect (brunaille) oil painting, worked out backwards from a
 * finished picture: toned ground → lay-in drawing → value massing → brunaille underpainting.
 *
 * Pure and React-free. Every frame is computed from the finished pixels, so it is a teaching
 * simulation of how such a picture could be built, not a record of how it was made.
 * The app passes a copy of at most 512 px on its long side.
 */

import { getPerceptualValue } from '@/lib/valueScale'
import { brownForValue } from './brown'

/** Perceptual value (0..1) of the toned ground: a mid-light warm earth, about 6 of 10. */
export const GROUND_VALUE = 0.6
/** Perceptual value of the lay-in line: a thin dark brown. */
export const LINE_VALUE = 0.25
const LINE_ALPHA = 0.85
export const NOTAN_STEPS = 3
export const BRUNAILLE_STEPS = 6
/** Blur radius as a share of the long side: massing sees only big shapes, the underpainting a little more. */
const NOTAN_BLUR = 1 / 40
const BRUNAILLE_BLUR = 1 / 120

export const STAGE_IDS = ['ground', 'layIn', 'massing', 'brunaille'] as const
export type StageId = (typeof STAGE_IDS)[number]

export interface ProcessStages {
  width: number
  height: number
  /** One RGBA frame per stage, in STAGE_IDS order */
  frames: Uint8ClampedArray[]
  /** Values (0..1, dark to light) of the massing's browns */
  massingValues: number[]
  /** Values (0..1, dark to light) of the underpainting's browns */
  brunailleValues: number[]
  /** Share of the picture (0..1) each underpainting value covers, same order */
  brunailleShares: number[]
}

/** Perceptual value (0..1) of every pixel. */
export function valueMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height)
  for (let i = 0; i < out.length; i++) out[i] = getPerceptualValue(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])
  return out
}

function boxPass(src: Float32Array, dst: Float32Array, width: number, height: number, radius: number, horizontal: boolean) {
  const lines = horizontal ? height : width
  const length = horizontal ? width : height
  const stride = horizontal ? 1 : width
  const span = radius * 2 + 1
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * width : line
    const at = (i: number) => src[base + Math.min(length - 1, Math.max(0, i)) * stride]
    let sum = 0
    for (let i = -radius; i <= radius; i++) sum += at(i)
    for (let i = 0; i < length; i++) {
      dst[base + i * stride] = sum / span
      sum += at(i + radius + 1) - at(i - radius)
    }
  }
}

/** Three box passes each way: close to a Gaussian, edges clamped. */
export function blur(values: Float32Array, width: number, height: number, radius: number): Float32Array {
  const r = Math.max(0, Math.round(radius))
  if (r === 0) return values.slice()
  let a = values.slice()
  let b = new Float32Array(values.length)
  for (let pass = 0; pass < 3; pass++) {
    boxPass(a, b, width, height, r, true)
    ;[a, b] = [b, a]
    boxPass(a, b, width, height, r, false)
    ;[a, b] = [b, a]
  }
  return a
}

/**
 * Groups values into at most `k` bands by 1-D k-means (on a 256-bin histogram, started at
 * the quantiles, so it is deterministic). Returns the band centers, dark to light, and each
 * pixel's band.
 */
export function valueBands(values: Float32Array, k: number): { centers: number[]; band: Uint8Array } {
  const BINS = 256
  const hist = new Float64Array(BINS)
  for (const v of values) hist[Math.min(BINS - 1, Math.max(0, Math.floor(v * BINS)))]++
  const binValue = (i: number) => (i + 0.5) / BINS
  const total = values.length
  // Start at the quantiles.
  let centers: number[] = []
  for (let j = 0; j < k; j++) {
    const target = ((j + 0.5) / k) * total
    let acc = 0
    let i = 0
    while (i < BINS - 1 && acc + hist[i] < target) acc += hist[i++]
    centers.push(binValue(i))
  }
  for (let iter = 0; iter < 50; iter++) {
    const sum = new Float64Array(k)
    const count = new Float64Array(k)
    for (let i = 0; i < BINS; i++) {
      if (!hist[i]) continue
      const j = nearest(centers, binValue(i))
      sum[j] += hist[i] * binValue(i)
      count[j] += hist[i]
    }
    const next = centers.map((c, j) => (count[j] ? sum[j] / count[j] : c))
    const moved = next.some((c, j) => Math.abs(c - centers[j]) > 1e-6)
    centers = next
    if (!moved) break
  }
  // Dark to light, and merge centers that landed on the same value (a flat picture has fewer bands).
  centers = [...new Set(centers.map((c) => Math.round(c * 1000) / 1000))].sort((x, y) => x - y)
  const band = new Uint8Array(values.length)
  for (let i = 0; i < values.length; i++) band[i] = nearest(centers, values[i])
  return { centers, band }
}

function nearest(centers: number[], v: number): number {
  let best = 0
  for (let j = 1; j < centers.length; j++) if (Math.abs(centers[j] - v) < Math.abs(centers[best] - v)) best = j
  return best
}

function fill(frame: Uint8ClampedArray, rgb: [number, number, number]) {
  for (let i = 0; i < frame.length; i += 4) {
    frame[i] = rgb[0]
    frame[i + 1] = rgb[1]
    frame[i + 2] = rgb[2]
    frame[i + 3] = 255
  }
}

function paintBands(band: Uint8Array, centers: number[]): Uint8ClampedArray {
  const browns = centers.map(brownForValue)
  const frame = new Uint8ClampedArray(band.length * 4)
  for (let i = 0; i < band.length; i++) {
    const [r, g, b] = browns[band[i]]
    frame[i * 4] = r
    frame[i * 4 + 1] = g
    frame[i * 4 + 2] = b
    frame[i * 4 + 3] = 255
  }
  return frame
}

/** Pixels on a boundary between two bands, thickened to `thickness` px. */
export function bandEdges(band: Uint8Array, width: number, height: number, thickness: number): Uint8Array {
  const edge = new Uint8Array(band.length)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x
    if ((x + 1 < width && band[i] !== band[i + 1]) || (y + 1 < height && band[i] !== band[i + width])) edge[i] = 1
  }
  const r = Math.max(0, Math.floor((thickness - 1) / 2))
  if (r === 0) return edge
  const thick = new Uint8Array(band.length)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!edge[y * width + x]) continue
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx
      const yy = y + dy
      if (xx >= 0 && yy >= 0 && xx < width && yy < height) thick[yy * width + xx] = 1
    }
  }
  return thick
}

export function buildStages(data: Uint8ClampedArray, width: number, height: number): ProcessStages {
  const side = Math.max(width, height)
  const values = valueMap(data, width, height)

  const ground = new Uint8ClampedArray(width * height * 4)
  fill(ground, brownForValue(GROUND_VALUE))

  const massing = valueBands(blur(values, width, height, side * NOTAN_BLUR), NOTAN_STEPS)

  // The lay-in draws the outlines of the big value shapes in thin brown over the ground.
  const layIn = ground.slice()
  const edges = bandEdges(massing.band, width, height, Math.max(1, Math.round(side / 300)))
  const [lr, lg, lb] = brownForValue(LINE_VALUE)
  for (let i = 0; i < edges.length; i++) {
    if (!edges[i]) continue
    layIn[i * 4] = Math.round(layIn[i * 4] * (1 - LINE_ALPHA) + lr * LINE_ALPHA)
    layIn[i * 4 + 1] = Math.round(layIn[i * 4 + 1] * (1 - LINE_ALPHA) + lg * LINE_ALPHA)
    layIn[i * 4 + 2] = Math.round(layIn[i * 4 + 2] * (1 - LINE_ALPHA) + lb * LINE_ALPHA)
  }

  const under = valueBands(blur(values, width, height, side * BRUNAILLE_BLUR), BRUNAILLE_STEPS)
  const counts = new Array(under.centers.length).fill(0)
  for (const b of under.band) counts[b]++

  return {
    width,
    height,
    frames: [ground, layIn, paintBands(massing.band, massing.centers), paintBands(under.band, under.centers)],
    massingValues: massing.centers,
    brunailleValues: under.centers,
    brunailleShares: counts.map((c) => c / values.length),
  }
}

/** The frame at slider position `t` (0 … frames − 1): a crossfade between the two stages it sits between. */
export function frameAt(frames: Uint8ClampedArray[], t: number): Uint8ClampedArray {
  const clamped = Math.min(frames.length - 1, Math.max(0, t))
  const lo = Math.floor(clamped)
  const hi = Math.min(frames.length - 1, lo + 1)
  const f = clamped - lo
  if (f === 0 || lo === hi) return frames[lo]
  const a = frames[lo]
  const b = frames[hi]
  const out = new Uint8ClampedArray(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * f
  return out
}

/** Painter's value number (0 black … 10 white) for a perceptual value 0..1, one decimal. */
export function valueNumber(value01: number): string {
  return (Math.round(value01 * 100) / 10).toFixed(1)
}
