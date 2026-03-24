'use client'

import { calculateFit } from '@/lib/canvasRendering'
import { type BreakdownStep } from '@/components/ProcessSlider'
import { type CanvasSettings as AppCanvasSettings } from '@/lib/types/canvas'
import { type ValueScaleSettings } from '@/lib/types/valueScale'
import { type ImageDrawInfo } from './types'

export interface BreakdownBuffers {
  imprimatura?: Uint8ClampedArray | null
  deadColor?: Uint8ClampedArray | null
  localColor?: Uint8ClampedArray | null
  spectralGlaze?: Uint8ClampedArray | null
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 10
export const ZOOM_STEP = 0.1
export const ZOOM_WHEEL_SENSITIVITY = 0.001
export const DRAG_THRESHOLD = 3

export interface ReferenceTransform {
  rotation: number
  scale: number
  x: number
  y: number
}

export const clientToCanvas = (clientX: number, clientY: number, canvas: HTMLCanvasElement) => {
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

export const getClampedPan = (
  x: number,
  y: number,
  zoom: number,
  imageDrawInfo: ImageDrawInfo | null,
  canvasDimensions: { width: number; height: number }
) => {
  if (!imageDrawInfo) return { x, y }

  const { x: imgX, y: imgY, width: imgW, height: imgH } = imageDrawInfo
  const viewportW = canvasDimensions.width
  const viewportH = canvasDimensions.height

  const tw = imgW * zoom
  const th = imgH * zoom

  const limitX = Math.max(viewportW, tw) * 0.8
  const limitY = Math.max(viewportH, th) * 0.8

  return {
    x: Math.max(-limitX - imgX * zoom, Math.min(viewportW + limitX - (imgX * zoom + tw), x)),
    y: Math.max(-limitY - imgY * zoom, Math.min(viewportH + limitY - (imgY * zoom + th), y)),
  }
}

export const drawMainCanvas = (params: {
  canvas: HTMLCanvasElement | null
  canvasDimensions: { width: number; height: number }
  image: HTMLImageElement | null
  surfaceImageElement: HTMLImageElement | null
  imageDrawInfo: ImageDrawInfo | null
  zoomLevel: number
  panOffset: { x: number; y: number }
  valueScaleSettings?: ValueScaleSettings
  referenceOpacity: number
  referenceTransform: ReferenceTransform
  isGrayscale: boolean
  splitMode: boolean
  activeBreakdownStep: BreakdownStep
  breakdownBuffers: BreakdownBuffers
  gridEnabled: boolean
  gridPhysicalWidth: number
  gridPhysicalHeight: number
  gridSquareSize: number
  gridOpacity: number
  overlayCanvas: HTMLCanvasElement | null
  valueMapCanvas: HTMLCanvasElement | null
  breakdownCanvas: HTMLCanvasElement | null
  sourceBuffer: HTMLCanvasElement | null
  canvasSettings?: AppCanvasSettings
  showHighlightOverlay: boolean
}) => {
  const {
    canvas,
    canvasDimensions,
    image,
    surfaceImageElement,
    imageDrawInfo,
    zoomLevel,
    panOffset,
    valueScaleSettings,
    referenceOpacity,
    referenceTransform,
    isGrayscale,
    splitMode,
    activeBreakdownStep,
    breakdownBuffers,
    gridEnabled,
    gridPhysicalWidth,
    gridPhysicalHeight,
    gridSquareSize,
    gridOpacity,
    overlayCanvas,
    valueMapCanvas,
    breakdownCanvas,
    sourceBuffer,
    canvasSettings,
    showHighlightOverlay,
  } = params

  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rectWidth = canvasDimensions.width
  const rectHeight = canvasDimensions.height
  if (rectWidth <= 0 || rectHeight <= 0) return

  if (canvas.width !== rectWidth * dpr || canvas.height !== rectHeight * dpr) {
    canvas.width = rectWidth * dpr
    canvas.height = rectHeight * dpr
    canvas.style.width = `${rectWidth}px`
    canvas.style.height = `${rectHeight}px`
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rectWidth, rectHeight)

  if ((!image && !surfaceImageElement) || !imageDrawInfo || (image && (image.width === 0 || image.height === 0))) {
    return
  }

  ctx.save()
  ctx.translate(panOffset.x, panOffset.y)
  ctx.scale(zoomLevel, zoomLevel)

  const { x, y, width, height } = imageDrawInfo

  if (surfaceImageElement) {
    ctx.save()
    ctx.drawImage(surfaceImageElement, x, y, width, height)
    ctx.restore()
  }

  if (image && imageDrawInfo) {
    ctx.save()
    ctx.globalAlpha = referenceOpacity

    const centerX = x + width / 2
    const centerY = y + height / 2

    ctx.translate(centerX, centerY)
    ctx.rotate((referenceTransform.rotation * Math.PI) / 180)
    ctx.scale(referenceTransform.scale, referenceTransform.scale)
    ctx.translate(-centerX, -centerY)
    ctx.translate(referenceTransform.x, referenceTransform.y)
  }

  if (splitMode && valueMapCanvas) {
    const splitX = width / 2

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, splitX, height)
    ctx.clip()
    if (isGrayscale && image) ctx.filter = 'grayscale(100%)'
    if (image) ctx.drawImage(image, x, y, width, height)
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.rect(x + splitX, y, splitX, height)
    ctx.clip()
    ctx.drawImage(valueMapCanvas, x, y, width, height)
    ctx.restore()

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2 / zoomLevel
    ctx.beginPath()
    ctx.moveTo(x + splitX, y)
    ctx.lineTo(x + splitX, y + height)
    ctx.stroke()
  } else {
    if (isGrayscale && activeBreakdownStep === 'Original') ctx.filter = 'grayscale(100%)'

    const stepToBuffer: Record<string, keyof BreakdownBuffers> = {
      Imprimatura: 'imprimatura',
      'Dead Color': 'deadColor',
      'Local Color': 'localColor',
      'Spectral Glaze': 'spectralGlaze',
    }

    const currentBuffer = activeBreakdownStep !== 'Original'
      ? breakdownBuffers[stepToBuffer[activeBreakdownStep]]
      : null

    const showBaseUnderneath = activeBreakdownStep === 'Original' ||
      activeBreakdownStep === 'Spectral Glaze' ||
      !currentBuffer

    if (showBaseUnderneath) {
      const source = sourceBuffer || image
      if (source) {
        ctx.drawImage(source as CanvasImageSource, x, y, width, height)
      }
    }

    if (isGrayscale && activeBreakdownStep === 'Original') ctx.filter = 'none'

    if (activeBreakdownStep === 'Original' && valueScaleSettings?.enabled && valueMapCanvas) {
      const opacity = valueScaleSettings.opacity ?? 0.45
      ctx.globalAlpha = opacity
      ctx.drawImage(valueMapCanvas, x, y, width, height)
      ctx.globalAlpha = 1
    } else if (activeBreakdownStep !== 'Original' && breakdownCanvas) {
      ctx.drawImage(breakdownCanvas, x, y, width, height)
    }
  }

  if (overlayCanvas && showHighlightOverlay) {
    ctx.drawImage(overlayCanvas, imageDrawInfo.x, imageDrawInfo.y, imageDrawInfo.width, imageDrawInfo.height)
  }

  if (gridEnabled && image) {
    const activeWidth = (canvasSettings?.enabled && canvasSettings.width) ? canvasSettings.width : gridPhysicalWidth
    const activeHeight = (canvasSettings?.enabled && canvasSettings.height) ? canvasSettings.height : gridPhysicalHeight

    const ppiDraw = imageDrawInfo.width / activeWidth

    ctx.save()
    ctx.translate(imageDrawInfo.x, imageDrawInfo.y)

    ctx.strokeStyle = `rgba(255, 255, 255, ${gridOpacity})`
    ctx.lineWidth = 1 / zoomLevel
    ctx.setLineDash([5 / zoomLevel, 5 / zoomLevel])

    ctx.font = `${12 / zoomLevel}px monospace`
    ctx.fillStyle = `rgba(255, 255, 255, ${gridOpacity + 0.2})`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let gridX = 0; gridX <= activeWidth; gridX += gridSquareSize) {
      const xPos = gridX * ppiDraw
      ctx.beginPath()
      ctx.moveTo(xPos, 0)
      ctx.lineTo(xPos, imageDrawInfo.height)
      ctx.stroke()

      if (gridX < activeWidth) {
        const colLabel = String.fromCharCode(65 + Math.floor(gridX / gridSquareSize))
        ctx.fillText(colLabel, xPos + (gridSquareSize * ppiDraw) / 2, -10 / zoomLevel)
      }
    }

    for (let gridY = 0; gridY <= activeHeight; gridY += gridSquareSize) {
      const yPos = gridY * ppiDraw
      ctx.beginPath()
      ctx.moveTo(0, yPos)
      ctx.lineTo(imageDrawInfo.width, yPos)
      ctx.stroke()

      if (gridY < activeHeight) {
        const rowLabel = (Math.floor(gridY / gridSquareSize) + 1).toString()
        ctx.fillText(rowLabel, -15 / zoomLevel, yPos + (gridSquareSize * ppiDraw) / 2)
      }
    }

    ctx.restore()
  }

  ctx.restore()
}

export const getInitialFit = (
  canvasDimensions: { width: number; height: number },
  mainImg: { width: number; height: number }
) => calculateFit(canvasDimensions, mainImg)
