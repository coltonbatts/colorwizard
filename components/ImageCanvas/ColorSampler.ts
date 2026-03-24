import { rgbToHsl } from '@/lib/colorUtils'
import { getRelativeLuminance, getStepIndex, type ValueScaleResult } from '@/lib/valueScale'
import type { ColorData, CanvasCoords, ImageDrawInfo } from './types'

export type ColorValue = ColorData

export const getImageDataAt = (
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): ImageData | null => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  try {
    return ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1)
  } catch {
    return null
  }
}

export interface SampleColorOptions {
  imageDrawInfo: ImageDrawInfo | null
  zoomLevel: number
  panOffset: { x: number; y: number }
  sourceCanvas?: HTMLCanvasElement | null
  valueScaleResult?: ValueScaleResult | null
  sortedLuminances?: number[] | Float32Array | null
  canvasCoords?: CanvasCoords
}

export const sampleColor = (
  x: number,
  y: number,
  canvas: HTMLCanvasElement,
  options: SampleColorOptions
): ColorValue | null => {
  const {
    imageDrawInfo,
    zoomLevel,
    panOffset,
    sourceCanvas,
    valueScaleResult,
    sortedLuminances,
    canvasCoords,
  } = options

  const source = sourceCanvas
  let r = 0
  let g = 0
  let b = 0
  let a = 0

  if (source && imageDrawInfo) {
    const screenRelX = (x - panOffset.x) / zoomLevel
    const screenRelY = (y - panOffset.y) / zoomLevel

    const normX = (screenRelX - imageDrawInfo.x) / imageDrawInfo.width
    const normY = (screenRelY - imageDrawInfo.y) / imageDrawInfo.height

    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return null

    const sampleX = Math.floor(normX * source.width)
    const sampleY = Math.floor(normY * source.height)
    const sourceCtx = source.getContext('2d', { willReadFrequently: true })
    if (!sourceCtx) return null

    try {
      const pixel = sourceCtx.getImageData(sampleX, sampleY, 1, 1).data
      r = pixel[0]
      g = pixel[1]
      b = pixel[2]
      a = pixel[3]
    } catch {
      return null
    }
  } else {
    const pixelData = getImageDataAt(canvas, canvasCoords?.canvasX ?? x, canvasCoords?.canvasY ?? y)?.data
    if (!pixelData) return null
    r = pixelData[0]
    g = pixelData[1]
    b = pixelData[2]
    a = pixelData[3]
  }

  if (a === 0) return null

  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  const hsl = rgbToHsl(r, g, b)

  let valueMetadata: ColorData['valueMetadata']
  if (valueScaleResult) {
    const luminance = getRelativeLuminance(r, g, b)
    const stepIdx = getStepIndex(luminance, valueScaleResult.thresholds)
    const step = valueScaleResult.steps[stepIdx]

    let percentile = 0
    if (sortedLuminances) {
      let low = 0
      let high = sortedLuminances.length - 1
      while (low <= high) {
        const mid = (low + high) >> 1
        if (sortedLuminances[mid] < luminance) {
          low = mid + 1
        } else {
          high = mid - 1
        }
      }
      percentile = low / sortedLuminances.length
    }

    valueMetadata = {
      y: luminance,
      step: stepIdx + 1,
      range: [step.min, step.max] as [number, number],
      percentile,
    }
  }

  return {
    hex,
    rgb: { r, g, b },
    hsl,
    valueMetadata,
  }
}

export const clientToCanvasCoords = (
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement
): CanvasCoords => {
  const rect = canvas.getBoundingClientRect()
  const dprScaleX = rect.width > 0 ? canvas.width / rect.width : 1
  const dprScaleY = rect.height > 0 ? canvas.height / rect.height : 1
  const cssX = clientX - rect.left
  const cssY = clientY - rect.top

  return {
    cssX,
    cssY,
    canvasX: cssX * dprScaleX,
    canvasY: cssY * dprScaleY,
    dprScaleX,
    dprScaleY,
  }
}
