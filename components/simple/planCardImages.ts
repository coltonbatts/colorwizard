/**
 * The two pictures on the printable card, as data URLs so they print with the page and never
 * leave the browser. Browser only (canvas).
 *
 * The original is drawn from the picture the person opened, at most CARD_ORIGINAL_MAX px on
 * the long side (a 12 MP photo would make a heavy page for a 3.7-inch print). The repaint is
 * the plan's own pile map painted in each pile's predicted swatch, at the planning copy's
 * resolution, without hatching: the numbers under the headline carry how far off it is, and
 * the two pictures side by side show it.
 */
import type { PicturePlan } from '@/lib/paint/plan/picture'
import { renderRepaint } from './planRender'

const CARD_ORIGINAL_MAX = 1200

export interface CardImages {
  original: string
  repaint: string
}

export function renderCardImages(plan: PicturePlan, source: HTMLCanvasElement): CardImages | null {
  const repaintCanvas = document.createElement('canvas')
  repaintCanvas.width = plan.width
  repaintCanvas.height = plan.height
  const repaintCtx = repaintCanvas.getContext('2d')
  if (!repaintCtx) return null
  const image = repaintCtx.createImageData(plan.width, plan.height)
  image.data.set(renderRepaint(plan, { selected: null, markMisses: false }))
  repaintCtx.putImageData(image, 0, 0)

  // Same shape as the repaint, so the two sit side by side at one size.
  const scale = Math.min(1, CARD_ORIGINAL_MAX / Math.max(source.width, source.height))
  const originalCanvas = document.createElement('canvas')
  originalCanvas.width = Math.max(1, Math.round(source.width * scale))
  originalCanvas.height = Math.max(1, Math.round(source.height * scale))
  const originalCtx = originalCanvas.getContext('2d')
  if (!originalCtx) return null
  originalCtx.imageSmoothingQuality = 'high'
  // A picture with transparency would print black in a JPEG: lay it on white paper.
  originalCtx.fillStyle = '#ffffff'
  originalCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height)
  originalCtx.drawImage(source, 0, 0, originalCanvas.width, originalCanvas.height)

  return { original: originalCanvas.toDataURL('image/jpeg', 0.9), repaint: repaintCanvas.toDataURL('image/png') }
}
