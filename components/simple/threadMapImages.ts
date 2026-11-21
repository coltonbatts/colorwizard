/**
 * Generates data URL images for the printable 1-page Studio Thread Map card
 * (standard Color Map + Original, or clean B&W Fabric Transfer Outline).
 *
 * Uses infinite-DPI vector SVGs (built from the shared watertight contour graph) for
 * both the Painterly Color Map and the B&W Fabric Transfer Outline so printed sheets
 * stay razor-sharp at any printer DPI. Everything runs locally in the browser.
 */

import { buildThreadMapColorSvg, buildThreadMapOutlineSvg } from '@/lib/dmc/map/contours'
import type { ThreadMapResult } from '@/lib/dmc/map/types'

const CARD_ORIGINAL_MAX = 1200

export interface ThreadMapImages {
  original: string
  repaint: string
  outline?: string
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function renderThreadMapImages(
  map: ThreadMapResult,
  source: HTMLCanvasElement,
): ThreadMapImages | null {
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
    repaint: svgToDataUrl(buildThreadMapColorSvg(map)),
  }
}

export function renderThreadMapOutlineImages(
  map: ThreadMapResult,
  mirror: boolean,
): ThreadMapImages | null {
  const outline = svgToDataUrl(buildThreadMapOutlineSvg(map, mirror))
  return {
    original: '',
    repaint: outline,
    outline,
  }
}
