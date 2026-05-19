/**
 * Image-relative OKLab lightness analysis for thread value planning.
 */
import { rgbToOklabL } from '@/lib/color/oklab'
import type { ImageValueBand, ImageValueContext, ImageOklabLRange } from './types'

export function computeImageOklabLRange(
  sortedOklabL: Float32Array,
  clipPercent: number = 0,
): ImageOklabLRange {
  const n = sortedOklabL.length
  if (n === 0) {
    return { min: 0, max: 1 }
  }

  const lowIdx = Math.floor(n * clipPercent)
  const highIdx = Math.min(n - 1, Math.ceil(n * (1 - clipPercent)) - 1)

  return {
    min: sortedOklabL[lowIdx],
    max: sortedOklabL[highIdx],
  }
}

export function buildImageValueContext(
  sortedOklabL: Float32Array | null | undefined,
  clipPercent: number = 0,
): ImageValueContext | null {
  if (!sortedOklabL || sortedOklabL.length === 0) {
    return null
  }

  return {
    oklabLRange: computeImageOklabLRange(sortedOklabL, clipPercent),
    clipPercent,
  }
}

export function normalizeOklabLInImage(
  oklabL: number,
  range: ImageOklabLRange,
): number {
  const span = range.max - range.min
  if (span <= 1e-6) {
    return 50
  }
  const t = (oklabL - range.min) / span
  return Math.round(Math.min(1, Math.max(0, t)) * 100)
}

export function oklabLToValueBand(normalizedPosition: number): ImageValueBand {
  if (normalizedPosition >= 80) return 'highlight'
  if (normalizedPosition >= 60) return 'light'
  if (normalizedPosition >= 40) return 'mid'
  if (normalizedPosition >= 20) return 'dark'
  return 'deepest-dark'
}

const BAND_LABELS: Record<ImageValueBand, string> = {
  highlight: 'Highlight',
  light: 'Light',
  mid: 'Midtone',
  dark: 'Dark',
  'deepest-dark': 'Deepest dark',
}

export function formatImageValueBand(band: ImageValueBand): string {
  return BAND_LABELS[band]
}

export function analyzeSampleImageValue(
  rgb: { r: number; g: number; b: number },
  imageValue: ImageValueContext | null | undefined,
) {
  const oklabL = rgbToOklabL(rgb)

  if (!imageValue) {
    const band = oklabLToValueBand(Math.round(oklabL * 100))
    return {
      oklabL,
      normalizedPosition: Math.round(oklabL * 100),
      band,
      bandLabel: formatImageValueBand(band),
      renderingRole: band,
    }
  }

  const normalizedPosition = normalizeOklabLInImage(oklabL, imageValue.oklabLRange)
  const band = oklabLToValueBand(normalizedPosition)

  return {
    oklabL,
    normalizedPosition,
    band,
    bandLabel: formatImageValueBand(band),
    renderingRole: band,
  }
}
