import { decodeImage } from '@/lib/imagePipeline'
import { rgbToHex, rgbToHsl } from '@/lib/color/conversions'

export const DEMO_COLOR_SWATCHES = [
  { hex: '#C45C3E', label: 'Terracotta' },
  { hex: '#3D6B8C', label: 'Slate blue' },
  { hex: '#5E7A4F', label: 'Moss green' },
] as const

/** PNG data URL of a solid swatch (for desktop referenceImage). */
export function createSolidColorDemoDataUrl(hex: string): string {
  if (typeof document === 'undefined') {
    throw new Error('createSolidColorDemoDataUrl requires a browser')
  }
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d unavailable')
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** Build a solid-color reference image for splash demo chips. */
export async function createSolidColorDemoImage(hex: string): Promise<HTMLImageElement> {
  if (typeof document === 'undefined') {
    throw new Error('createSolidColorDemoImage requires a browser')
  }

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d unavailable')

  ctx.fillStyle = hex
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const dataUrl = canvas.toDataURL('image/png')
  return decodeImage(dataUrl)
}

export function hexToSampleColor(hex: string) {
  const normalized = hex.startsWith('#') ? hex : `#${hex}`
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  const rgb = { r, g, b }
  return {
    hex: rgbToHex(r, g, b),
    rgb,
    hsl: rgbToHsl(r, g, b),
  }
}
