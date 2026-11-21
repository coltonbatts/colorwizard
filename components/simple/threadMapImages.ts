/**
 * Generates data URL images for the printable 1-page Studio Thread Map card
 * (standard Color Map + Original, or clean B&W Fabric Transfer Outline).
 * Browser only (canvas); nothing leaves the device.
 */

import type { ThreadMapResult } from '@/lib/dmc/map/types'
import { renderThreadMap, renderThreadMapOutline } from './threadMapRender'

const CARD_ORIGINAL_MAX = 1200

export interface ThreadMapImages {
  original: string
  repaint: string
  outline?: string
}

export function renderThreadMapImages(
  map: ThreadMapResult,
  source: HTMLCanvasElement,
): ThreadMapImages | null {
  const repaintCanvas = document.createElement('canvas')
  repaintCanvas.width = map.width
  repaintCanvas.height = map.height
  const repaintCtx = repaintCanvas.getContext('2d')
  if (!repaintCtx) return null
  const image = repaintCtx.createImageData(map.width, map.height)
  image.data.set(renderThreadMap(map, { selected: null, markMisses: false }))
  repaintCtx.putImageData(image, 0, 0)

  const scale = Math.min(1, CARD_ORIGINAL_MAX / Math.max(source.width, source.height))
  const originalCanvas = document.createElement('canvas')
  originalCanvas.width = Math.max(1, Math.round(source.width * scale))
  originalCanvas.height = Math.max(1, Math.round(source.height * scale))
  const originalCtx = originalCanvas.getContext('2d')
  if (!originalCtx) return null
  originalCtx.imageSmoothingQuality = 'high'
  originalCtx.fillStyle = '#ffffff'
  originalCtx.fillRect(0, 0, originalCanvas.width, originalCanvas.height)
  originalCtx.drawImage(source, 0, 0, originalCanvas.width, originalCanvas.height)

  return {
    original: originalCanvas.toDataURL('image/jpeg', 0.9),
    repaint: repaintCanvas.toDataURL('image/png'),
  }
}

export function renderThreadMapOutlineImages(
  map: ThreadMapResult,
  mirror: boolean,
): ThreadMapImages | null {
  const outlineCanvas = document.createElement('canvas')
  outlineCanvas.width = map.width
  outlineCanvas.height = map.height
  const outlineCtx = outlineCanvas.getContext('2d')
  if (!outlineCtx) return null
  const image = outlineCtx.createImageData(map.width, map.height)
  image.data.set(renderThreadMapOutline(map, { selected: null, mirror }))
  outlineCtx.putImageData(image, 0, 0)
  const outline = outlineCanvas.toDataURL('image/png')
  return {
    original: '',
    repaint: outline,
    outline,
  }
}
